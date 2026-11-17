# 设计 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（REQ-017 / AI 智能行程推荐）
- **输入：** Delta Spec `specs/ai-itinerary/spec.md`（8 Requirement / 36 Scenario）+ `specs/trip-plans/spec.md`（1 Requirement / 5 Scenario）、`dov-ac-review.md`（8 条裁决）、`consistency-lint.md`（L-01~L-05）、`g1-decision.md`（Pass）、`proposal.md`
- **日期：** 2026-11-17
- **as-is 证据：** `AmapProxyController`（白名单同源代理 + 503/502 口径）、`AmapProperties` / `AmapConfig`（配置 record + RestClient bean 模式）、`application.yaml`（`optional:file:./amap-local.yml`）、`BusinessException` + `GlobalExceptionHandler`（错误码 → `ErrorResponse`）、`AmapService.ts`（`searchPlaces` / `geocodePlace` / `planRoute` / `formatDistance` / `formatDuration`）、`savedRoutes.ts`（本机快照形状）、`TripCreateRequest`（`destinationCode` 6 位码）、`TripCreatePage`（`?from=` 参考预填）、`route.ts`（hash + query 解析）、`loader.ts`（无 JS Key → `MISSING_JS_KEY`）

## 1. 设计目标

把「输入旅行条件 → AI 推荐 → 地图/天气验证 → 编辑确认 → 保存为 RouteMe 行程」做成三栏闭环页 `#/ai-planner`。分工铁律：**AI 只产出名称 / 顺序 / 理由 / 时间 / 估算；坐标 / 路线 / 距离 / 交通时间全部来自高德；天气全部来自 Open-Meteo 且由后端在 generate 内自取注入**。失败分服务 Loading / Error / Retry，任何失败不产出伪造数据。控件只用 antd 与既有令牌，不引入第二套视觉。

## 2. G1 跟踪项收口（L-01~L-05）

| id | 决策 |
|---|---|
| L-01 保存失败语义 | 两段式非事务（dov 裁决 4）：`POST /api/ai/itineraries` 成功即快照为用户资产；跳发布页后 `POST /api/trips` 失败时快照保留，发布页显示错误并允许直接重试提交（快照 id 仍在 URL）；不做跨接口事务、不做孤儿清理 |
| L-02 天气权威路径 | generate 响应内的 `weather` 为权威：生成成功后右栏天气卡切换到响应天气；`GET /api/weather/forecast` 仅供生成前预览与天气卡单独 Retry；两者不一致时以 generate 响应为准 |
| L-03 AI 非法输出重试 | **不自动重试**：后端结构校验失败即 `AI_INVALID_OUTPUT`（502）并记 warn 日志（不含 key）；由前端 Retry 按钮驱动重新请求，避免放大上游配额消耗 |
| L-04 E2E 替身口径 | 见 `atdd-design.md` §2：后端测试用 base-url 指向测试替身控制器；E2E 用 `page.route` 拦截 AI / 天气 / 高德 REST 代理；CI 无 key 可跑，地图 Marker 断言按 JS Key 有无分级 |
| L-05 详情加性渲染 | 详情页只新增「AI 推荐」徽标与天气 / 预算摘要块（`ai_itinerary_id` 非空才渲染）；既有字段、状态徽标、地图、动作一律不变；P4 跑 `trips.spec.ts` 回归 |

## 3. 后端设计

### 3.1 配置与客户端（沿用 AMap 模式）

```java
@ConfigurationProperties(prefix = "routeme.ai")
public record AiProperties(String baseUrl, String apiKey, String model, Integer timeoutSeconds) {
    // baseUrl 默认 https://api.deepseek.com；model 默认 deepseek-chat；timeout 默认 60
    public boolean hasApiKey() { /* 空白视为未配置 */ }
}

@ConfigurationProperties(prefix = "routeme.weather")
public record WeatherProperties(String baseUrl) { /* 默认 https://api.open-meteo.com */ }
```

- `AiConfig` 提供 `RestClient aiRestClient` / `RestClient weatherRestClient`（builder 模式同 `AmapConfig`）；base-url 可被测试替身覆盖。
- `application.yaml`：`routeme.ai.base-url/api-key/model/timeout-seconds` 与 `routeme.weather.base-url` 全部环境变量占位（`DEEPSEEK_API_KEY` 等，默认空）；`spring.config.import` 追加 `optional:file:./ai-local.yml`（与 amap-local 并列）。
- `backend/.gitignore` 增 `ai-local.yml`；真实 key 只写本地文件（P4 执行），`application.yaml` 不出现真实 key（`@rule:no-hardcoded-secrets`）。

### 3.2 错误码（BusinessException 子类，GlobalExceptionHandler 统一映射）

| 异常 | code | HTTP | 触发 |
|---|---|---|---|
| `AiNotConfiguredException` | `AI_NOT_CONFIGURED` | 503 | `routeme.ai.api-key` 空白 |
| `AiUpstreamException` | `AI_UPSTREAM_ERROR` | 502 | DeepSeek 网络失败 / 非 2xx / 超时 |
| `AiInvalidOutputException` | `AI_INVALID_OUTPUT` | 502 | 输出非 JSON / schema 校验失败 / POI <2（不自动重试，L-03） |
| `WeatherUpstreamException` | `WEATHER_UPSTREAM_ERROR` | 502 | Open-Meteo 网络失败 / 非 2xx / 无该日数据 |
| `InvalidInputException`（既有） | `INVALID_INPUT` | 400 | 缺必填 / 日期超预报窗口 / 坐标非法 / 快照链接不存在或非本人 |

### 3.3 接口契约（openapi 0.12.0）

**`POST /api/ai/itineraries/generate`**（需登录）

```jsonc
// request
{
  "origin": { "name": "广州南站", "lng": 113.269, "lat": 22.989 },
  "destination": { "name": "广州市", "lng": 113.264, "lat": 23.129 },
  "date": "2026-11-21",
  "duration": "one_day",            // half_day | one_day | two_day
  "budget_cents": 50000,             // 可空
  "travel_mode": "transit",         // transit | walking | driving
  "interests": ["美食", "摄影", "City Walk"],
  "pace": "moderate",               // relaxed | moderate | compact
  "reduce_budget": false             // 「AI 帮我降低预算」时为 true
}
// response 200
{
  "plan": {
    "title": "广州 1 日游",
    "days": [ { "day": 1, "stops": [ {
      "name": "广州塔", "reason": "…", "arrival": "09:00",
      "stay_minutes": 120, "indoor": false
    } ] } ],
    "tips": ["当天紫外线较强…"],
    "packing": ["防晒霜", "帽子", "饮用水"],
    "budget": { "transport_cents": 8000, "tickets_cents": 15000,
                "food_cents": 18000, "other_cents": 5000, "total_cents": 46000 }
  },
  "weather": { /* 同 GET /api/weather/forecast 响应，本次生成实际使用的摘要 */ }
}
```

- `plan` 内 **MUST NOT** 出现经纬度 / 路线 / 距离 / 交通时间字段（技术边界）；后端 schema 校验拒绝多余地图字段不做——只校验必需字段形状，地图数据由前端从高德获取，AI 即使输出坐标也不被采用（前端只取 `name`）。
- 提示词组装（`AiItineraryServiceImpl`）：system 约束「只输出 JSON；POI 必须真实存在、高德可搜；不得输出坐标/路线/距离/交通时间/天气数值/真实价格；费用为估算」+ 用户条件 + **后端自取的真实天气摘要**（温度 / 降雨概率 / 天气状态 / 风速 / UV）+ 天气行为规则（雨天优先室内、高温减少中午户外、低温提醒温差）+ 预算约束（`reduce_budget=true` 时要求合计 ≤ 预算）+ 时长档位数量口径（半天 2–3 / 1 天 3–5 / 2 天每天 3–4，E2E 只断言 ≥2）。
- 校验：JSON 解析（容忍 markdown 围栏剥离）→ 必需字段 → `stops` 合计 ≥2 → 时间格式 `HH:mm` → 预算四项非负且 total = 四项和（不等则后端重算 total）。失败 → `AI_INVALID_OUTPUT`。

**`GET /api/weather/forecast?lng=&lat=&date=`**（需登录）

```jsonc
{ "date": "2026-11-21", "temp_max_c": 24, "temp_min_c": 17,
  "precipitation_probability_pct": 20, "precipitation_mm": 0.0,
  "weather_code": 1, "weather_text": "多云", "wind_speed_kmh": 12.5,
  "uv_index": 6.0, "source": "open-meteo" }
```

- Open-Meteo `v1/forecast?latitude=&longitude=&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code,wind_speed_10m_max,uv_index_max&timezone=auto&start_date=&end_date=`；`uv_index_max` 不可用时置 null（前端不展示 UV 行）。
- 日期窗口：今天 ≤ date ≤ 今天+15（Open-Meteo 约 16 天预报），超窗 `INVALID_INPUT` 400 可读文案；不伪造天气。
- `weather_code` → 中文文案映射为后端纯函数（WMO 码表子集），单测覆盖。

**`POST /api/ai/itineraries`**（需登录）→ `201 { "id": 12 }`

- 请求体 = 完整快照：`origin` / `destination`（name+lng+lat）/ `date` / `duration` / `travel_mode` / `interests` / `pace` / `budget_cents` / `stops`（name / lng / lat / order / reason / arrival / stay_minutes / indoor / resolved）/ `route`（mode / distance_meters / duration_seconds / legs）/ `weather` / `tips` / `packing` / `ai_budget`。
- 校验：已解析（`resolved=true`）stops ≥2，否则 `INVALID_INPUT`；stops 坐标必须为数值（前端只从高德结果填充）。
- 落库 `ai_itineraries`：`id / user_id / snapshot(TEXT JSON) / created_at`；归属当前用户（会话拦截器既有口径）。

**`GET /api/ai/itineraries/{id}`**（需登录）→ 快照原样返回；不存在或他人 → `INVALID_INPUT` 400（与发布链接校验同口径）。供发布页预填与详情页摘要。

**`trip_plans` 链接**：`TripCreateRequest` / `TripSummary` / `TripDetail` 增可空 `ai_itinerary_id`；发布时非空则校验快照存在且归属当前用户，否则 `INVALID_INPUT`；详情 / 摘要透传。既有发布校验与状态机不变。

### 3.4 V18 迁移

```sql
CREATE TABLE ai_itineraries (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);
ALTER TABLE trip_plans ADD COLUMN ai_itinerary_id INTEGER REFERENCES ai_itineraries (id);
```

- `TripPlanEntity` / `TripPlan` pojo / `TripPlanMapper.xml` 增列映射；既有查询不受影响（可空列）。

## 4. 前端设计

### 4.1 页面结构（`pages/AiPlannerPage.tsx` + `ai/*`）

```text
main.ai-planner-page
├─ section.page-head（h1「AI 智能规划」+ page-sub + 返回）
└─ div.ai-planner-grid（左 320px / 中 1fr / 右 360px；≤1100px 两栏；≤768px 纵向堆叠）
   ├─ aside.ai-form（Card）
   │  ├─ 出发地 / 目的地：PlaceSearchBox + 「定位」按钮 + 「地图选点」开关
   │  ├─ DatePicker（今天起 16 天内）/ 时长 Segmented（半天/1天/2天）
   │  ├─ 预算 InputNumber（元，选填）/ 出行方式 Select（公共交通+步行/步行/驾车）
   │  ├─ 兴趣 Select multiple（美食/摄影/City Walk/自然/历史/购物/艺术）
   │  ├─ 节奏 Segmented（宽松/适中/紧凑）
   │  └─ Button.primary「✨ AI 推荐路线」（必填门控）
   ├─ section.ai-map（AmapContainer + RouteLayer + 编号 Marker；失败 → Error+Retry 面板）
   └─ aside.ai-result
      ├─ 天气卡（温度/降雨概率/天气状态/风速/UV + 来源标注；预览/权威切换见 L-02）
      ├─ AI Tips 卡（tips + packing 列表）
      ├─ 预算卡（四项 + 合计，恒标「AI 估算」；超预算差额 + 「AI 帮我降低预算」）
      ├─ 行程时间轴（按天分组；编号 chip + 到达时间 + 名称 + 理由 + 停留；
      │   行内动作：删除 / 更换（搜索替换）/ 上移 / 下移；未定位标「未定位」+ 更换）
      ├─ 统计行（总距离 / 预计交通时间 / 预计总时长——距离时间取自高德）
      └─ 动作区：[重新生成] [保存行程]（resolved <2 时禁用保存并提示补齐）
```

### 4.2 模块与纯逻辑（`frontend/src/ai/`）

| 模块 | 职责 | 不做 |
|---|---|---|
| `plannerForm.ts` | 门控 `canGenerate`、条件 → generate 请求体、预算元 ↔ 分换算 | 不发请求 |
| `budgetMath.ts` | 四项合计、超预算差额文案数据、「AI 估算」恒标口径 | 不读 DOM |
| `poiResolve.ts` | `resolveStops(names, city)`：逐个 `geocodePlace`，产出 `{…stop, lng?, lat?, resolved}`；失败不伪造坐标 | 不渲染 |
| `itineraryEdit.ts` | 删除 / 更换 / 上移 / 下移（纯数组操作，保留 order 重排）；`resolvedCount` | 不发请求 |
| `snapshot.ts` | 页面状态 → `POST /api/ai/itineraries` 请求体（字段对齐 §3.3）；→ 发布预填值 | 不读 DOM |
| `aiMessages.ts` | 本页全部文案集中（含错误文案映射） | 组件不拼句子 |
| `AiPlannerPage.tsx` | 取数、状态机、三栏渲染、保存闭环 | 不写纯逻辑 |

### 4.3 地图接线（复用为主，最小扩展）

- `AmapService.ts`：`TravelMode` 增 `'transit'`；`ROUTE_PATHS` 增 `transit: 'v3/direction/transit/integrated'`（代理白名单已含）；transit 请求带 `city`（目的地城市名）与 `strategy=0`；新增 `parseTransitLeg`（`route.transits[].distance/cost.duration`，path 取 walking/bus 分段 polyline 拼接），`parseRouteLeg` 按响应形状分流。既有 walking/driving/bicycling 行为不变（`AmapService.test.ts` 回归）。
- 编号 Marker：复用 `RouteLayer` / `AmapTripMap` 的编号 pin 口径——**编号 = 列表顺序号**（dov 裁决 8）；未定位 POI 不渲染 Marker 但保留列表序号，已渲染编号与列表一一对应不重排。
- 地图点击选点：复用 `AmapPlacePicker` / `aroundPlaces` 口径（点击 → 附近 POI 候选 → 用户确认），目标槽位由左栏「选点目标：出发地/目的地」开关决定。
- 当前定位：`navigator.geolocation` → 成功取坐标 + `regeo` 名称；失败 → 表单内联错误「定位失败，请搜索或地图选点」，不阻塞其它输入（AC1 负例）。
- 景点变化（删除/更换/调序/重新生成）→ 对已解析子集重跑 `planRoute`；resolved <2 → 统计行显示「至少 2 个可定位景点才能计算路线」，不伪造。
- 地图加载失败（`MISSING_JS_KEY` / `SCRIPT_LOAD_FAILED`）→ 中栏 Error + Retry 面板；**表单 / 生成 / 列表 / 预算 / 保存流程不依赖地图实例**，POI 解析与路线计算走 REST 代理仍可完成（无 JS Key 时保存仍可用，快照 route 为 REST 结果）。

### 4.4 保存闭环（两段式，L-01）

1. 「保存行程」→ 校验 resolved ≥2 → `POST /api/ai/itineraries` → 成功得 `id` → `window.location.hash = '#/trips/new?ai={id}'`。
2. `route.ts`：`create` 路由增 `aiItineraryId?: number`（解析 `?ai=`，与 `?from=` 并存互斥，`ai` 优先）；`routeToHash` 同步。
3. `TripCreatePage`：`aiItineraryId` 存在 → `GET /api/ai/itineraries/{id}` → 预填标题（`{destination.name} {duration标签} · AI 推荐`，≤40 字截断）、`destinationCode`（`gazetteerCity` 按目的地名解析；解析失败留空由用户用 AreaCascader 手选，banner 提示）、日期（start=end=date）、stops（POI 名称，≤MAX_STOPS）、tags（interests ∩ 既有标签字典，≤MAX_TAGS）、预算（`budgetMinCents=budgetMaxCents=ai_budget.total_cents`，note 追加「预算为 AI 估算」）、banner「来自 AI 推荐方案，可修改后发布」。
4. `toCreateRequest` 携 `aiItineraryId`；提交失败 → 既有 `submitError` 展示，快照保留可重试（URL 仍带 `?ai=`）。
5. 详情页：`ai_itinerary_id` 非空 → 标题旁「AI 推荐」徽标 + `GET /api/ai/itineraries/{id}` 渲染天气摘要（温度/降雨概率/天气状态）与预算摘要（合计 + 「AI 估算」）；请求失败只隐藏摘要块，不影响详情主体（加性渲染，L-05）。

### 4.5 入口与路由

- `route.ts` / `App.tsx`：`#/ai-planner` → `AiPlannerPage`（需登录，沿用既有守卫）。
- `AppShell` rail「规划」组增「AI 规划」入口；`TripCreatePage` 页头增「试试 AI 推荐路线」链接（`#/ai-planner`）。
- `savedRoutes.ts` 不改语义（`MapExplorerPage` 本机保存保留）；AI 页保存走后端快照，不复用 localStorage 通道。

### 4.6 样式与文案

- `styles.css` **末尾追加** `.ai-planner-*` 令牌与样式：三栏网格、卡片、时间轴编号 chip、天气/预算卡、失败面板；浅 / 深两套只引用既有令牌（`--surface` / `--ink` / `--line` / `--r-lg` / `--sh-1` 等），不新增硬编码色值、不改全局令牌。
- 响应式：≤1100px 右栏移到地图下方；≤768px 纵向堆叠（表单 → 地图 → 结果），地图最小高度 320px 始终可见。
- 文案全部出自 `aiMessages.ts`；错误映射：`AI_NOT_CONFIGURED` → 「AI 服务尚未配置…」、`AI_UPSTREAM_ERROR` / `AI_INVALID_OUTPUT` → 「AI 生成失败，请重试」、`WEATHER_UPSTREAM_ERROR` → 「天气获取失败…」、高德沿用 `amapErrorMessage`。

### 4.7 可访问性

- 表单控件全部 label 关联；门控按钮 disabled 时 `aria-disabled` 与提示文案说明缺项。
- 时间轴调序用 button（上移/下移）+ `aria-label="上移 {name}"`，不只靠拖拽；编号 chip 文本可见（不只靠颜色）。
- 天气 / 预算 / 失败状态均为文本 + 图标双通道；Loading 用 antd Spin + 文案；Retry 为可聚焦 button。

## 5. 测试设计（详见 atdd-design.md）

| 层 | 落点 |
|---|---|
| 后端单测 | AI 生成（替身）/ 天气归一与窗口 / 快照保存与归属 / 链接校验 / 错误码表 / OpenApiTest 0.12.0 |
| 前端单测 | plannerForm / budgetMath / poiResolve / itineraryEdit / snapshot / parseTransitLeg / route ai 参数 |
| E2E | `ai-planner.spec.ts`（替身拦截，CI 无 key）+ `trips.spec.ts` 回归 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深；真实 key 环境补地图 Marker 与真实天气一档 |

## 6. 已知偏离与风险

| id | 内容 | 处理 |
|---|---|---|
| R1 | transit 响应形状与 walking/driving 不同 | `parseTransitLeg` 独立解析 + 单测；失败按高德 Error+Retry，不伪造 |
| R2 | AI 给出高德搜不到的 POI | 提示词约束 + 逐点「未定位」更换交互；解析失败率走查记录，不伪造坐标 |
| R3 | 无 JS Key 环境地图不可渲染 | 流程不依赖地图实例（§4.3）；E2E Marker 断言分级（atdd §2） |
| R4 | 并行会话同改 styles / openapi / 详情页 | 样式只末尾追加；契约只增可选字段；提交只 stage 本 change 路径；push 前 pull（merge 式，P2 偏离③） |
| R5 | DeepSeek 真实输出质量波动 | schema 校验兜底 + 不自动重试；真实服务走查一档，失败口径可复现 |
| R6 | 目的地名 → destinationCode 解析失败 | 发布页留空 + banner 提示手选，不阻断保存闭环 |