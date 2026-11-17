# Local verify report — add-ai-itinerary（P4 / G2 输入）

- **Change:** `add-ai-itinerary`（REQ-017，AI 智能行程推荐：地点 × 预算 × 天气生成游玩路线）
- **Branch:** `feature/add-ai-itinerary`（P3 提交 `9bb41b0`，merge `3f70ae5` 已推送）
- **日期:** 2026-11-17 ｜ **记录人:** Jay（AO）
- **Environment:** Windows 11；Node v24.18.0；Liberica JDK 21；SQLite `RouteME/SqlLite/routeme.db`（Flyway V1–V18 重建）；后端 `localhost:8080`（**沙箱外**运行，真实 Key 经 `backend/application-local.yml` 注入，不入库）；前端 dev `localhost:5173`；Playwright Chromium。
- **外部服务:** 高德 JS API 2.0（JS Key + securityJsCode 经 `/_AMapService` 同源代理）；Open-Meteo（后端自取注入）；DeepSeek（OpenAI 兼容，后端代理）。

## 1. 命令与结果

| 层 | 命令（工作目录） | 结果 |
|---|---|---|
| 规格 | `npx -y openspec validate add-ai-itinerary --strict`（ai4se-baseline/） | **valid**（deltaCount 9） |
| 契约 | `npx -y @redocly/cli lint openapi.yaml`（RouteME/） | **0 error** / 15 warnings（既有口径延续）；契约 0.12.0 |
| 后端 | `.\mvnw.cmd -B -ntp verify`（backend/） | **288 tests / 0 failures / 0 errors / 0 skipped**，BUILD SUCCESS（含本轮新增 proxy JSONP 2 用例） |
| 前端类型 | `npm run typecheck`（frontend/） | 0 errors |
| 前端单测 | `npm test`（frontend/） | **40 files / 298 tests passed**（含本轮新增 transit 三结构 8 用例） |
| 前端构建 | `npm run build`（frontend/） | 成功（plans 修复后终复跑 11.1s）；仅既有主 chunk >500 kB 警告 |
| E2E | `npx playwright test`（e2e/，fresh SQLite + 8080/5173） | **88 passed / 21 failed**（终跑 run3，22.2m）；21 红全在 §2.2 既有偏差集；ai-planner 12/12；**plans 修复后代码 fresh DB 终复跑 ai-planner 12/12（2.7m，`e2e-t8-ai-final2.log`）** |
| 走查 | `node walkthrough-ai-itinerary.mjs`（真实 Key 全链路） | **完整闭环成功**（run5）；9 张截图 + `walkthrough-report.json` 入 `docs/preview/add-ai-itinerary/`；控制台 0 error |

## 2. E2E 覆盖与既有偏差裁决

### 2.1 本 change 验收口径

- `ai-planner.spec.ts` **A1–A12 全数 Pass（12/12）**：条件输入三方式（搜索 / 定位 / 地图点击）、生成 ≥2 POI、编号 Marker 与列表同步、天气参与推荐（雨天室内优先 + 装备建议）、预算「AI 估算」与超预算降预算、删除 / 替换 / 排序后路线重算、重新生成、保存闭环（快照 → 预填 → 发布 → 详情徽标）、分服务 Loading / Error / Retry、非本人快照 400。
- AI / 天气 / 高德在 E2E 中用 `page.route` + `window.AMap` 替身（CI 无 JS Key 恒跑，Marker 断言不分级）；快照保存 / 发布 / 详情走真实后端 fresh SQLite。
- 其余非地图套件（auth / chat / companions / experiences / home / mine / profile / safety-report 等）全绿，无回归。

### 2.2 既有偏差（用户裁决：记录偏差，不修旧 spec）

全量终跑中 `map.spec.ts` 9 例（E11–E18 档）与 `trips.spec.ts` 12 例失败，**全部为 `refine-trip-map` 并行工作既有破坏，非本 change 回归**：

- **git 证据:** AMap SDK 化提交 `cf8a00a` / `b9e4f42` 均为本 change P0 基线切点（`b9e4f42`）内祖先（`git merge-base --is-ancestor` 验证）；即旧地图 spec 在 P0 基线时已红。
- **裁决记录:** 发起人经 AskUserQuestion 选择「记录偏差，不修旧 spec」；旧地图 spec 留给 `refine-trip-map` 自己更新；本 change G2 验收口径 = ai-planner 12/12 + 其余非地图测试全绿。
- 明细见 `e2e/e2e-t8-run3.log`（本地证据，不入库）。

## 3. 真实 Key 走查（1440 / 768 / 390 × 浅 / 深）

走查 run5（2026-11-17 15:01，真实 DeepSeek / Open-Meteo / 高德 JS SDK，后端沙箱外）：

- **条件输入**：广州南站 → 广州市（真实搜索精确匹配），2026-11-21，1 天，预算 500，美食 / 摄影，公共交通，适中。
- **生成**：6s；5 POI（广州塔 / 花城广场 / 广东省博物馆[室内] / 北京路步行街 / 沙面岛），**POI 解析率 5/5**，无伪造坐标。
- **transit 真实路线（AC7）**：预计距离 **17 公里**、预计交通时间 **1 小时 54 分钟**、预计总时长 9 小时 54 分钟，标注「距离与时间来自高德地图」；地图编号 Marker 1–5 与列表同步＋真实换乘折线（768 深档截图可见）。
- **天气（AC9–AC11）**：OPEN-METEO 真实预报 10.8–22.2°C 阴、降雨 2%、风 8.4 km/h、UV 5.25；AI Tips 引用真实天气（阴天散射光适合摄影 / 早晚温差带薄外套 / UV 偏高防晒 / 博物馆室内预约）；建议携带 chips（薄外套 / 防晒霜 / 帽子 / 饮用水 / 舒适步行鞋 / 相机或手机广角镜头 / 充电宝）。
- **预算（AC12–AC13）**：AI 估算 交通 30 / 门票 70 / 餐饮 150 / 其他 30 = 280 元 vs 我的预算 500 元；恒标「无真实价格来源，全部为 AI 估算」。
- **地图点击选点（AC1/AC2）**：切目的地槽位 → 点击地图 → 真实 around 候选面板出现。
- **保存闭环（AC17）**：快照 → `#/trips/new?ai=` 预填 banner → 发布 → `#/trips/43` 详情「AI 推荐」徽标＋天气 / 预算 / Tips 摘要。
- **截图矩阵**：`ai-planner-{1440,768,390}-{light,dark}.png`＋`ai-prefill-1440-light.png`＋`ai-detail-1440-{light,dark}.png` 共 9 张；目检无溢出 / 重叠 / 白底残留，深色令牌整套衍生，390 堆叠可读。
- **控制台**：0 error / 0 pageerror（JSONP 修复后 SyntaxError 噪音消除）。
- 失败口径记录：run1 天气被企业防火墙拦截（502，产品正确终止不伪造）；run2/run3 transit 解析缺陷（§4-1，已修）；run4 同缺陷复现留证；run5 全绿。污染库上 ai-planner 复跑 A11 同名行程 strict mode 冲突＝债务 1 数据污染（fresh DB 复跑 12/12）。

## 4. 验证期发现与修复（均在本 change 内闭环）

| # | 发现 | 修复 |
|---|---|---|
| 1 | **transit 真实结构解析缺陷（D-02 评审风险兑现）**：真实 SDK 2.0 Transfer 回调交付规范化 `plans[]`（方案自带完整 `path` LngLat[]、时长在 `time`、`cost` 为数值票价），而非旧版 `routes[0].transits`；另有 REST 原生 `route.transits`（polyline 字符串 + 顶层 duration）需降级兼容 → 前端 `ROUTE_NOT_FOUND`（上游实际 200 OK）。**诊断方法**：`Transfer.prototype.search` 回调拦截抓真实交付（证据 `t8-transfer-cb.json`）+ 代理响应体 dump（`t8-transit-raw2.json`）+ node 模拟解析对照 | `AmapService.ts`：`firstTransit` 三结构兼容（plans[0] 优先）；`parseTransitLeg` 优先 plan.path，分段 transit.path / walking steps / bus polyline 回退；时长 cost.duration（对象）→ duration → time 回退，票价不误读；`appendStepPath` 统一 path 对象数组 / polyline 字符串。+8 单测（SDK 2.0 plan / segment path / raw REST / firstTransit×4 / toRouteLeg 字符串）先 red 后 green |
| 2 | transit 换乘搜索 city 参数用 POI 级目的地名（如「广州塔」）不稳 | `poiResolve.ts` 保留高德解析出的 `city`；`AiPlannerPage` 优先用解析城市名回退目的地名（快照契约不受影响，`buildSnapshot` 显式挑字段） |
| 3 | `/_AMapService/v3/log/init` 代理回纯 JSON，SDK 期望 JSONP → 控制台 `SyntaxError: Unexpected token ':'` 噪音 | `AmapProxyController`：`callback` 参数经 `[A-Za-z0-9_.]+` 校验后以 `application/javascript` 包裹返回；非法 / 缺省回 JSON。+2 单测 |
| 4 | E2E A1/A9 超时：antd v6.7 Select 无 `.ant-select-selector` DOM | 测试机制适配 `getByRole('combobox')`（非削弱验收） |
| 5 | E2E A12 用户切换失效：`loginAs` 仅 addInitScript，hash 导航不 reload | 改 `goto` + `switchUser`（support.ts 既有机制）；`pickPlace` 改 `getByRole('textbox')` 避免 aria-label 子串 strict mode 冲突 |
| 6 | 走查脚本子串匹配选中「广州市人民政府」→ 预填 destinationCode 空 → 发布校验阻断（**产品正确行为**） | 脚本精确匹配 `.amap-search-name` + AreaCascader 补选 fallback |
| 7 | **企业网络间歇拦截**：`api.open-meteo.com` 单子域被防火墙间歇性 TCP timeout / TLS reset（对照实验：open-meteo 主站 / DeepSeek / restapi.amap 恒可达） | 后端必须沙箱外运行；走查安排在放行窗口执行（探测循环记录 `t8-weather-probe2.log`）；产品侧天气失败即终止生成不伪造（L-02 口径验证） |

## 5. 真实 Key 冒烟（沙箱外后端，证据 `t8-backend-smoke.log` / `t8-smoke-generate.json`，本地不入库）

- `GET /api/weather/forecast`（广州，2026-11-21）→ 200 真实 Open-Meteo：22.2 / 10.8°C、降雨 2%、weather_code 3、风 8.4 km/h、UV 5.25–5.65。
- `POST /api/ai/itineraries/generate` → 200（约 5s）：5 真实 POI（陈家祠 / 永庆坊 / 沙面岛 / 上下九 / 珠江夜游），tips 引用真实天气，预算 410 元（AI 估算）。
- `reduce_budget=true` → 200：220 元方案。
- `POST /api/ai/itineraries`（快照）→ 201 id=1；`GET` → 200 stops=5；他人快照 → 400 `INVALID_INPUT`「AI 行程不存在或不属于当前用户」。
- `/_AMapService/v3/log/init?callback=jsonp_123_` → 200 `application/javascript` JSONP 包裹（修复 #3 验证）。

## 6. 数据卫生

- 终跑前 fresh SQLite：备份 `routeme-dev-backup-20261117-t8-walk.db` 后删库，Flyway V1–V18 重建；走查后再次 fresh（备份 `routeme-dev-backup-20261117-t8-final.db`）供修复后代码 ai-planner 复跑。
- 旧备份（`routeme-dev-backup-20261117-t8-smoke.db` 等）保留于 SqlLite/（gitignore，不入库）。
- 走查 / 诊断临时脚本（`walkthrough-ai-itinerary.mjs` / `diag-transit.mjs`）用毕删除（沿用 r2 `tmp-r2-shots.mjs` 先例）；截图与 `walkthrough-report.json` 入 `docs/preview/add-ai-itinerary/`。
- 真实 Key 仅在 `backend/application-local.yml` 与 `frontend/.env.local`（均 gitignore）；冒烟证据 json/log 不入库。

## 7. 债务与观察

- 债务 1（延续）：E2E 向开发库累积行程，本地全量需 fresh DB；CI 用 H2 不受影响。
- 债务 2（延续）：E2E 不在 CI 流水线（既有 WARNING）。
- 偏差债务（本轮裁决）：map/trips 21 例旧 spec 红归 `refine-trip-map` 更新（§2.2 git 证据）；本 change 不修旧 spec。
- 观察项：企业防火墙对 `api.open-meteo.com` 间歇拦截为环境因素，非产品缺陷；产品侧已按 L-02 天气失败终止生成、明确 Error/Retry，不伪造数据。
- MVP 限制（产品口径）：预算无真实价格来源恒标「AI 估算」；POI 解析失败标「未定位」不伪造坐标；AI 不产出经纬度 / 路线 / 距离 / 时间（全部高德实测）。

## 8. 合并集成 addendum（push 前 pull 触发 main 合并，2026-11-17 17:1x）

P4 提交 `2e552fc` 后按发起人指令 `git pull --no-rebase --autostash --no-edit origin main`，触发与 main（`0979e916`，契约 0.16.0）的大规模合并：main已落地 `add-trip-weather` / `add-experience-photos` / `add-trip-cancel` / `add-credit-account` / `refine-detail-companions` / `refine-safety-report`，与本 change 的天气功能 / 地图 SDK 化 / 契约 / 迁移产生 28 文件冲突。**发起人裁决（AskUserQuestion 选项 A）：采用 main 天气为唯一权威，并集解决其余冲突，全量重验后提交推送，在 p4-verify/g2 记录契约偏离。**

### 8.1 契约偏离（天气改由 add-trip-weather 提供）

- **天气权威转移：** 本 change 原自带天气代理（flat `WeatherForecast` + `WeatherText` WMO 文案）与 main `add-trip-weather` 重复。裁决后**删除重复天气类**（`WeatherText.java` / `WeatherTextTest.java`），`AiItineraryServiceImpl` 重构为消费 main `WeatherService.forecast(WeatherQuery)`；天气形状改为 main **嵌套** `WeatherForecast{date,destination_code,city,lng,lat,available,reason,weather:WeatherDaily|null,reminders:WeatherReminder[],source}`。
- **前端适配：** `fetchWeatherForecast` 改 main 新签名 `(destinationCode, date, point?)`（AiPlannerPage 以目的地坐标 point + 空 code 调用，后端 `DestinationLocator` 支持仅 point 解析）；`AiPlannerPage` 天气卡 / `snapshot.ts` buildSnapshot / `TripDetailPage` AI 摘要均改嵌套字段访问（`weather.weather.weather_text/temp_min_c/temp_max_c/precipitation_probability_pct`）+ `available`/out-of-range 分支；E2E `ai-planner.spec.ts` weatherFixture 改嵌套。
- **契约版本：** `openapi.yaml` 以 main 0.16.0 为基叠加 AI 四接口 → **0.17.0**；`OpenApiTest` 拆两方法（天气断言改 main 嵌套形状 + AI 接口版本门禁）。
- **迁移版本碰撞：** main V18(photos)/V19(cancel)/V20(credit) 占用 V18–V20；本 change `V18__ai_itineraries.sql` 经 `git mv` 重命名 **`V21__ai_itineraries.sql`**（fresh DB Flyway V1–V21 干净重建验证）。

### 8.2 地图并集（main 栅格架构为权威 + transit 加性 port）

- main 地图为**栅格瓦片底图**（`createRasterMap`/`rasterMap.css`/`geoDatum.wgs84ToGcj02`）+ **SVG overlay/portal**（`map.project/overlay/onChange/fitBounds`）+ 名称相关性 + 离线地名库，取代本 change HEAD 的 `AMap.Marker` 矢量方案（高德矢量引擎在本仓库网络环境无法初始化）。`AmapService.ts` 取 main 干净基（1043 行）+ port 本 change transit 附加（`TravelMode='transit'`/`firstTransit`/`parseTransitLeg`/`appendStepPath`/`MODE_SPEED_MPS.transit`/`ROUTE_SERVICES.Transfer`/`planRoute(mode,waypoints,city?)`/`loadSdk` window 检查）→ 1072 行；`AmapService.test.ts` 并集（main 纯函数 + transit 8 用例）。
- `RouteLayer.tsx` 取 main SVG overlay + 接线本 change `numbers` 编号（`number = numbers?.[index] ?? index+1`，AC8 编号与 AI 列表一致）；`AmapContainer.tsx` imports 并集（resetProxyProbe + wgs84ToGcj02 + createRasterMap + rasterMap.css）。
- `styles.css` 字节安全并集（main 完整 7082 行 + 本 change `.ai-planner-*` AI 块 617 行 EOF 追加 = 7699 行，LF/UTF-8 无 BOM）；`TripDetailPage.tsx` 并集（AI 徽标摘要嵌套天气 + main cancel/credit/photos/companions）。

### 8.3 合并期发现与修复

| # | 发现 | 修复 |
|---|---|---|
| 8-1 | **快照保存 400（AiItinerarySnapshotTest 2 例）**：`AiItineraryServiceImpl` 独立 `new ObjectMapper()` 无 SNAKE_CASE 策略，main 天气 POJO 用 camelCase 组件（`tempMaxC` 等）依赖应用级 `spring.jackson.property-naming-strategy=SNAKE_CASE`，独立 MAPPER 缺策略 → snake_case JSON 绑定失败 → unknown-property 400 | 独立 MAPPER 配置 `PropertyNamingStrategies.SNAKE_CASE`（AiPlan/AiItinerarySnapshot 组件本为字面 snake_case，加策略安全）；AI 两类复跑 8/8 + 14/14 绿 |
| 8-2 | **E2E A1 地图点击候选面板失效**：main 栅格地图经 `.amap-canvas-host` 的 `pointerup` DOM 监听触发 `onClick`，本 change 旧 `__amapClick` 测试钩子驱动已废弃的 `AMap.Map` 矢量 stub | `rasterMap.ts` 在 host 暴露栅格实例（中性调试钩子）；`ai-planner.spec.ts` `__amapClick` 重写为按投影像素 dispatch 真实 pointer 事件；A1 复跑绿，ai-planner 12/12 |

### 8.4 合并后全量重验（fresh DB，沙箱外后端）

| 层 | 命令 | 结果 |
|---|---|---|
| 后端 | `.\mvnw.cmd -B -ntp verify`（backend/） | **364 tests / 0 failures / 0 errors**，BUILD SUCCESS（main 合并新增 credit/photos/cancel/weather 测试 + 本 change AI 测试并集） |
| 前端单测 | `npm test`（frontend/） | **45 files / 363 tests passed**（含合并 AmapService 40 用例 + main weather/credit/companions 纯逻辑） |
| 前端类型/构建 | `npm run build`（frontend/，含 tsc --noEmit） | 0 errors + 构建成功（rasterMap.ts 钩子改动后复验，仅既有主 chunk >500 kB 警告） |
| E2E 全量 | `npx playwright test`（e2e/，fresh `routeme-merge-final.db` + 8080/5173） | **143 tests：121 passed / 22 failed**（10.8m，`e2e-merge-final.log`）；**ai-planner A1–A12 12/12**（首跑 pristine）；main 新增 credit/detail-companions/experience-photos/weather/weather-walkthrough 全绿 |
| E2E 隔离证污染 | `npx playwright test profiles.spec.ts`（fresh `routeme-merge-profiles.db`） | **8/8 passed（18.6s）** |
| 真实天气 | `GET /api/weather/forecast?destination_code=440100&date=2026-11-21` | **200** 真实 Open-Meteo 嵌套形状（weather_code 3 / 22.1–11.3°C / 降雨 2% / 风 8.4 / UV 4.x），合并后权威天气链路验证 |

### 8.5 22 红分类（无本 change 回归）

- **map.spec 9 + trips.spec 9 = 18 例 refine-trip-map 偏差：** 纯地图（offline coverage / zoom / pins / click-to-add）+ 发布表单依赖 main `china-map` 三级级联（`[data-testid="china-map"]` 不可见 → 发布/会议时间/会议地点用例连锁失败）。git 证据延续 §2.2（AMap SDK 化提交为 P0 切点祖先）；trips 红数由 run3 的 12 降为 9 因 main 合并更新了 trips.spec。**裁决延续：记录偏差，不修旧 spec，留 refine-trip-map 更新。**
- **profiles.spec 4 例 = 债务 1 数据污染（非回归，已隔离证实）：** 全量共享 fresh DB 下，前序 ai-planner/companions/credit 等用例累积行程 → 首页种子卡「上海武康路咖啡散步」被挤出分页（profiles:51/88/102 等卡片超时）+ 发布者「参与同行」统计被前序加入行程污染（profiles:13 期望 0 实得 4）。**fresh DB 隔离复跑 profiles.spec 8/8 全绿**，确证为测试顺序状态污染而非合并代码回归。
- **验收口径达成：** ai-planner 12/12 + 其余非地图套件隔离全绿（profiles 8/8 证实）；map/trips 18 红归 refine-trip-map，profiles 4 红归债务 1，均非本 change 回归。

### 8.6 数据卫生与提交

- 合并重验用 fresh DB（`routeme-merge-final.db` 全量 / `routeme-merge-profiles.db` 隔离），均 gitignore 不入库；旧 `routeme-merge-e2e.db`（污染）保留本地。后端日志 `backend-merge-*.log` / E2E `e2e-merge-final.log` 为本地证据不入库。
- 排除项延续：工作区根 `.vscode/tasks.json`（本地 IDE 微调，unstaged 不入合并提交）、`t8-*.json` 冒烟证据（untracked 不入库）、preview 图片删除（并行会话未触碰）。
- 合并提交：`git commit --no-edit`（merge，保留默认 merge message）→ push（pull 已先做）。

## 9. 第二波合并 addendum（第一波 merge 提交后 push 前再 pull，2026-11-17 晚）

第一波 merge 提交 `c5b4e93` 落库后，按发起人指令 push 前先 `git pull --no-rebase --no-edit origin main`，发现 main 已推进到 **`b50e416`**（新增 `add-admin-console` / `trip-publish-options`（travel-mode + 单集合点）/ UI refresh / destination covers / experience thumbnails / help sidebar / map raster fix / V22+ 迁移），触发 **9 文件新冲突**。沿用第一波 standing ruling（main 共享功能权威 + AI 特定并集 + 全量重验 + 提交推送）自主解决。

### 9.1 冲突解决（9 文件并集）

- **后端行程链：** `TripPlan.java`（4 冲突 union：record 组件同时含 `travelMode` + `aiItineraryId`，withId/withMeetingInfo/create 构造调用并集）、`TripCreateRequest.java`（javadoc union）、`TripPlanServiceImpl.java`（构造器 5 参 union：demoUserService/aiItineraryService/clock/events/accountStatusService；create 内 main `assertCanWrite` + 本 change `requireOwnedSnapshot` 并存）、`TripPlanStatusTest.java`（4 处构造调用 union）。
- **契约门禁：** `OpenApiTest.java` 重构保留**两个完整 @Test 方法**（`in_openApiFile_out_aiItineraryContractDeclared` + `in_openApiFile_out_adminConsoleContractDeclared`），版本断言 0.17.0 → **0.18.0**（main admin console 也占了 0.17.0）。
- **openapi.yaml：** main 0.17.0 基 + AI 接口并集 → **0.18.0**（info.version + description + Error 枚举 union）。
- **前端：** `api.ts` import union（Admin* 6 类型 + Ai* 4 类型）；`AppShell.tsx` NavKey/NAV_GROUPS union（main UI refresh + admin/help rail + 本 change AI rail）。
- **registry.md：** REQ 条目 union（main admin/travel-mode 行 + 本 change REQ-017 p4-pass 行）。
- **迁移版本再碰撞：** main V21(admin_console)/V22(report_context_trip)/V23(add_travel_mode) 占用 → 本 change `V21__ai_itineraries.sql` 经 `git mv` 再重命名 **`V24__ai_itineraries.sql`**（fresh DB Flyway V1–V24 干净重建验证，2.4s 启动）。

### 9.2 合并期发现与修复（main 既有客观缺陷，门禁阻断，最小修复）

| # | 发现 | 证据与修复 |
|---|---|---|
| 9-1 | **openapi.yaml 重复映射键（parse 失败）**：`/admin/reports/{reportId}` GET 的 responses 被体验图片响应片段穿插，`description` 与 `'404'` 各重复一次（redocly duplicated mapping key @1785；SnakeYAML 容忍故 OpenApiTest 曾通过） | `git show MERGE_HEAD:...openapi.yaml` 证实 **main b50e416 自身即有此损坏**（HEAD 无 admin paths，auto-merge 原样取 main 块）。修复为正确的 AdminReportDetail 200 形状（application/json $ref），与第一波 MAPPER 修复同口径（合并期最小修复，不改语义） |
| 9-2 | **6 处 `nullable-type-sibling` error**：main admin schemas（status_updated_by / trip / publisher / reported_user / context / processed_by）用 `allOf:[$ref] + nullable:true` 无 `type`，OAS 3.0 下 nullable 被忽略，redocly recommended 报 error | 对 main 自身副本（修 9-1 后）lint 复现同样 6 error，证实既有债务。最小样例实证规则要求 nullable 必须伴随 type；修复为 `type: object + nullable: true + allOf:[$ref]`（保留 null 语义，OpenApiTest 仅断言键存在/required/enums 不受影响）。复跑 OpenApiTest EXIT=0 |
| 9-3 | **后端 verify 首跑 EXIT=1（环境非代码）**：复用 shell 残留 `SPRING_DATASOURCE_URL=jdbc:sqlite:...`（E2E 后端启动注入）经 Spring relaxed binding 覆盖测试 H2 数据源（`org.h2.Driver claims to not accept jdbcUrl`） | 显式清空环境变量后重跑 `mvnw verify` EXIT=0；教训：测试命令前须清 `SPRING_DATASOURCE_URL` |

### 9.3 第二波合并后全量重验（fresh DB V1–V24，沙箱外后端）

| 层 | 命令 | 结果 |
|---|---|---|
| 后端 | `.\mvnw.cmd verify`（清 SPRING_DATASOURCE_URL） | **464 tests / 0 failures / 0 errors** EXIT=0（main admin/travel-mode 测试 + 本 change AI 测试并集，较第一波 364 增长） |
| 前端单测 | `npm test` | **394/394 passed** |
| 前端类型/构建 | `npm run build`（含 tsc --noEmit） | 0 errors + 构建成功 |
| E2E 全量 | `npx playwright test`（fresh DB + 8080/5173） | **150 tests：119 passed / 31 failed**；**ai-planner A1–A12 12/12**；main 新增 **admin.spec 5/5** 及其余新 spec 全绿 |
| E2E 隔离证污染 | `npx playwright test profiles.spec.ts`（再 fresh DB） | **8/8 passed** |
| 契约门禁 | `openspec validate add-ai-itinerary --strict` / `redocly lint` | **valid** / **0 error / 21 warnings**（修复 9-1/9-2 后；warnings 为 main 既有口径） |

### 9.4 31 红分类（无本 change 回归）

- **map.spec 9 + trips.spec 8 = 17 例 refine-trip-map 偏差**（延续原裁决：china-map 级联依赖 + 旧地图 spec，不修旧 spec；trips 红数 9→8 因 main 再更新 trips.spec）。
- **auth.spec 7 + profile.spec 2 + credit.spec 1 = 10 例 main UI refresh / admin console 既有 E2E 偏差（git 证据）：** auth.spec/profile.spec 在 HEAD==main **字节相同**，但 main UI refresh 删除了 `AppShell` 的 `.id-switch-label`/`账号菜单：` 触发器（HEAD 有、main 无）与 `mine/MyTripsPage.tsx` 的 `.mine-profile-card`（HEAD 有、main 无），spec 未同步；credit.spec 期望 admin 面 404 而 main 已落 admin console（404→401）。E2E 不在 CI（债务 2），main 自身即红，非本 change 回归。
- **profiles.spec 4 例 = 债务 1 数据污染**（fresh DB 隔离 8/8 证实，延续第一波口径）。
- **验收口径达成：** ai-planner 12/12 + admin 5/5 + 非地图套件隔离全绿；31 红均非本 change 回归（17 refine-trip-map + 10 main E2E 债务 + 4 污染）。

### 9.5 提交

- 9 冲突文件全解决 staged + V24 重命名 staged + openapi 9-1/9-2 修复 re-stage + 三报告 addendum staged；排除项延续（`.vscode/tasks.json` unstaged / t8-*.json untracked / preview 删除不动）。
- `git commit --no-edit`（第二波 merge）→ push 前再 pull 核对 main 无新推进 → push。

## 10. 第三波合并 addendum（第二波 merge 提交后 push 前再 pull，2026-11-17 19:xx）

第二波 merge 提交 `49b4436` 后 push 前再 pull，main 又推进到 **`3db5b14`**（`add-experience-like-credit` REQ-023：体验点赞 + 阶梯信用，V24__add_experience_likes，契约也占 0.18.0）。仅 **1 文件冲突**（openapi.yaml Error 枚举），其余 auto-merge；沿用 standing ruling 解决。

### 10.1 冲突解决与版本再演进

- **openapi.yaml Error 枚举 union：** main 新增 `EXPERIENCE_NOT_FOUND` + 本 change AI 三码（AI_NOT_CONFIGURED/AI_UPSTREAM_ERROR/AI_INVALID_OUTPUT）并存；契约 **0.18.0 → 0.19.0**（main like-credit 也占 0.18.0）；`OpenApiTest` 3 处版本断言同步 0.19.0（auto-merge 后 13 个门禁方法完整：main 新增 experienceLike/userCredit + 本 change AI + admin 均保留）。
- **迁移版本三碰撞：** main `V24__add_experience_likes` 占用 V24 → 本 change `V24__ai_itineraries.sql` 经 `git mv` 再重命名 **`V25__ai_itineraries.sql`**（fresh DB Flyway V1–V25 干净重建验证）。
- **auto-merge 语义核对：** TripPlan/TripPlanEntity（travelMode + aiItineraryId 并存）、api.ts（Ai* + likeExperience/unlikeExperience）、styles.css/TripDetailPage/types.ts 均正确并集；ai-planner.spec.ts 合并零改动（git diff 空）。

### 10.2 合并期发现与修复

| # | 发现 | 修复 |
|---|---|---|
| 10-1 | **后端 verify 首跑「Found more than one migration with version 24」**：git mv 后 `target/classes/db/migration/` 残留旧 `V24__ai_itineraries.sql` 编译产物，与 main V24 及新 V25 并存 | 删除 target 陈旧产物后重跑 EXIT=0（构建卫生非代码缺陷；教训：迁移重命名后需清 target 残留） |
| 10-2 | 真实天气 502（WEATHER_UPSTREAM_ERROR）：企业防火墙对 Open-Meteo 拦截窗口（G2 观察项延续） | 产品行为正确：失败即终止不伪造；E2E 用 weather stub 不受影响 |

### 10.3 第三波合并后全量重验（fresh DB V1–V25，沙箱外后端）

| 层 | 命令 | 结果 |
|---|---|---|
| 后端 | `.\mvnw.cmd verify`（清 SPRING_DATASOURCE_URL + 清 target 残留） | **495 tests / 0 failures / 0 errors** EXIT=0（main like/credit 测试并入，较第二波 464 增长） |
| 前端单测 | `npm test` | **52 files / 401 tests passed** |
| 前端类型/构建 | `npm run build`（含 tsc --noEmit） | 0 errors + 构建成功 |
| E2E 全量 | `npx playwright test`（fresh `routeme-m3-final.db`） | **154 tests：123 passed / 31 failed**（15.7m，`e2e-m3.log`）；**ai-planner A1–A12 12/12**；main 新增 **experience-likes 3/3** + admin 5/5 + **credit 9/9** 全绿（第二波 credit 1 红已被 main like-credit 提交修复） |
| E2E 隔离证污染 | `npx playwright test profiles.spec.ts`（fresh `routeme-m3-profiles.db`） | **8/8 passed（25.2s）** |
| 契约门禁 | `openspec validate add-ai-itinerary --strict` / `redocly lint` | **valid** / **0 error / 21 warnings**（0.19.0） |

### 10.4 31 红分类（无本 change 回归）

- **map.spec 9 + trips.spec 9 = 18 例 refine-trip-map 偏差**（trips 8→9：trips:476 单集合点用例在第二波切点即存在（main travel-mode 提交 ad42fbf），失败点为 pickPlace 级联 helper `.place-chip-name` 同类 china-map 依赖；延续不修旧 spec 裁决）。
- **auth.spec 7 + profile.spec 2 = 9 例 main UI refresh 既有 E2E 偏差**（延续 §9.4 git 证据：spec 字节相同而 main 删 DOM）。
- **profiles.spec 4 例 = 债务 1 数据污染**（fresh DB 隔离 8/8 证实）。
- **验收口径达成：** ai-planner 12/12 + experience-likes/admin/credit 全绿 + 非地图套件隔离全绿；31 红均非本 change 回归（18 refine-trip-map + 9 main E2E 债务 + 4 污染）。

### 10.5 提交

- openapi 冲突解决 + 0.19.0 + OpenApiTest 断言 + V25 重命名 staged；三报告 addendum staged；排除项延续。
- `git commit --no-edit`（第三波 merge）→ push 前再 pull 核对 → push。

## 11. 第四波合并 addendum（第三波 merge 提交后 push 前再 pull，2026-11-17 19:5x）

第三波 merge 提交 `8edd99b` 后 push 前再 pull，main 又推进到 **`91f9bce`**（`add-traveler-recommendation`：可解释同行者推荐 + 分值，契约也占 0.19.0，无新迁移）。仅 **styles.css 1 文件冲突**（2 区均为 EOF 追加块碰撞），其余 auto-merge；沿用 standing ruling。

### 11.1 冲突解决与版本再演进

- **styles.css 字节安全并集：** node 直取 `:2`/`:3` 两父本字节，公共前缀 8445 行 + HEAD `.ai-planner-*` 完整块 + main `.recommendation-*` 完整块顺序拼接（9139 行，LF/UTF-8 无 BOM，0 冲突标记）。
- **契约版本：** main traveler-recommendation 也占 0.19.0 → 合并后 **0.20.0**；`OpenApiTest` 4 处版本断言同步（auto-merge 后 14 门禁方法完整：main 新增 travelerRecommendation + 本 change AI + admin 均保留）。
- **迁移：** main 无新迁移，`V25__ai_itineraries` 无碰撞（fresh DB Flyway V1–V25 验证）。

### 11.2 合并期发现与修复（auto-merge fallout）

| # | 发现 | 修复 |
|---|---|---|
| 11-1 | **main 新测试构造调用缺尾参（testCompile 3 处）**：main traveler-recommendation 测试基于无 `aiItineraryId` 的旧 record 编写，auto-merge 后与并集 record（TripPlan 24 参 / TripCreateRequest 14 参）不匹配 | `RecommendationControllerTest`（TripCreateRequest 补 null）、`TravelerMatchTest`/`TravelerRecommendationRankerTest`（TripPlan 补尾 null）各 1 处；复跑 verify EXIT=0（同第一/二波 TripPlanStatusTest union 口径） |

### 11.3 第四波合并后全量重验（fresh DB V1–V25，沙箱外后端）

| 层 | 命令 | 结果 |
|---|---|---|
| 后端 | `.\mvnw.cmd verify`（清 SPRING_DATASOURCE_URL） | **514 tests / 0 failures / 0 errors** EXIT=0（main traveler-recommendation 测试并入 + 11-1 修复，较第三波 495 增长） |
| 前端单测 | `npm test` | **53 files / 406 tests passed** |
| 前端类型/构建 | `npm run build`（含 tsc --noEmit） | 0 errors + 构建成功（styles.css 并集后） |
| E2E 全量 | `npx playwright test`（fresh `routeme-m4-final.db`） | **161 tests：129 passed / 32 failed**（15.9m，`e2e-m4.log`）；**ai-planner A1–A12 12/12**；main 新增 **traveler-recommendation 7/7** + admin/credit/experience-likes 全绿 |
| E2E 隔离 | `npx playwright test profiles.spec.ts`（fresh `routeme-m4-profiles.db`，两次） | **7/8**：4 例污染转绿，**:37 隔离仍红 = main 新偏差**（见 11.4） |
| 契约门禁 | `openspec validate add-ai-itinerary --strict` / `redocly lint` | **valid** / **0 error / 21 warnings**（0.20.0） |

### 11.4 32 红分类（无本 change 回归）

- **map.spec 9 + trips.spec 9 = 18 例 refine-trip-map 偏差**（延续原裁决）。
- **auth.spec 7 + profile.spec 2 = 9 例 main UI refresh 既有 E2E 偏差**（延续 §9.4 git 证据）。
- **profiles.spec:37 = 1 例 main traveler-recommendation 新偏差（本轮新发现，git 证据）：** profiles.spec 在第三波切点 `8edd99b` == main `91f9bce` **字节相同**（hash 比对），但 main 详情页新增 recommendation 块使 `查看 阿岚 的资料` 按钮双元素（publisher-row + recommendation-user）→ spec `getByRole` strict mode violation；**fresh DB 隔离两次复跑均红**，非污染非本 change 回归（本 change 未动详情页 publisher 按钮，AI 摘要为加性块）。E2E 不在 CI（债务 2），main 自身即红。
- **profiles.spec 其余 4 例 = 债务 1 数据污染**（隔离 fresh DB 转绿证实）。
- **验收口径达成：** ai-planner 12/12 + traveler-recommendation 7/7 + 非地图套件隔离全绿（除 main 自身 :37 偏差）；32 红均非本 change 回归（18 refine-trip-map + 10 main E2E 债务 + 4 污染）。

### 11.5 提交

- styles.css 并集 + 0.20.0 + OpenApiTest 断言 + 3 测试构造修复 staged；三报告 addendum staged；排除项延续。
- `git commit --no-edit`（第四波 merge）→ push 前再 pull 核对 → push。

## 12. 第五波合并 addendum（第四波 merge 提交后 push 前再 pull，2026-11-17 20:3x）

第四波 merge 提交 `7b7706a` 后 push 前再 pull，main 又推进到 **`8fdb4e4`**（`add-credit-exit-restriction` REQ-025：退出信用惩罚 + 低信用限制，契约也占 0.20.0，新增 `V25__credit_enforcement`）。**6 文件 16 冲突区**（TripPlanServiceImpl 4 + App.tsx 1 + TripCreatePage 2 + TripDetailPage 2 + openapi 6 + styles.css 1），其余 auto-merge；沿用 standing ruling（main 共享权威 + AI 特定并集 + 全量重验）。

### 12.1 冲突解决与版本再演进

- **TripPlanServiceImpl（4 区）：** `AiItineraryService` + `CreditRestrictionGuard` 并存（构造器 6 参）；`create` 三守卫 `assertCanWrite` + `requireNotRestricted`（main）+ `requireOwnedSnapshot`（本 change AI 链接校验）。
- **App.tsx（1 区）：** main `CreditProvider` 包裹 + 本 change `aiPlanner` 路由 + `TripCreatePage` 携 `aiItineraryId` prop 并集。
- **TripCreatePage（2 区）：** imports（ApiError/loadAiItinerary/aiMessages/toTripPrefill + CreditRestrictedNotice/useMyCredit）与签名（`aiItineraryId` + `const { restricted } = useMyCredit()`）并集。
- **TripDetailPage（2 区）：** import 取 main 已移除的 unused `leaveTrip`（`TripLeaveModal` 内部自调 API）之删除 + 保留本 change `loadAiItinerary`；body `aiSummary` 摘要块 + main `CreditRestrictedNotice` 并集。
- **openapi（6 区）：** 均为第二波 nullable-type-sibling 修复的**键序碰撞**——ours 已把 `type:object/nullable:true` 置于 `allOf` 之前（冲突区外 auto-merge），theirs 想在 `allOf` 之后再追加一份 → 取 ours（删冲突块）避免重复键；6 处 admin schema（status_updated_by/trip/publisher/reported_user/context/processed_by）。
- **styles.css（1 区）：** node 字节并集——公共前缀 8445 行 + HEAD `.ai-planner-*` 615 行 + **补 `}` 闭合 `@media(768px)`** + main credit 块 77 行 + 共享 `}`（闭合 `.rail-link.is-disabled:hover`）+ 公共后缀 `.recommendation-*` 79 行 = **9218 行**；`.recommendation-*` 仅一份（公共后缀，不重复）；括号平衡 **1321/1321**，0 冲突标记。
- **契约版本：** main credit-exit 也占 0.20.0 → 合并后 **0.21.0**；`OpenApiTest` 4 处版本断言同步（14 门禁方法完整）。
- **迁移：** main `V25__credit_enforcement` 碰撞 → 本 change `V25__ai_itineraries` 经 `git mv` 重命名 **`V26__ai_itineraries`**（fresh DB Flyway **V1–V26** 干净重建验证；target/classes 已同步无 stale V25 残留）。

### 12.2 合并期发现与修复（auto-merge fallout）

| # | 发现 | 修复 |
|---|---|---|
| 12-1 | **main credit-exit 新测试构造调用缺尾参（testCompile 2 处）**：基于无 `aiItineraryId` 的旧 record 编写，auto-merge 后与并集 record（TripPlan 24 参 / TripCreateRequest 14 参）不匹配 | `CreditExitCalculatorTest`（TripPlan 23→24 补尾 null）、`CreditExitApiTest`（TripCreateRequest 13→14 补 null）各 1 处；复跑 verify EXIT=0（同第一/二/四波 union 口径） |

### 12.3 第五波合并后全量重验（fresh DB V1–V26，沙箱外后端）

| 层 | 命令 | 结果 |
|---|---|---|
| 后端 | `.\mvnw.cmd verify`（清 SPRING_DATASOURCE_URL） | **540 tests / 0 failures / 0 errors** EXIT=0（main credit-exit 测试并入 + 12-1 修复，较第四波 514 增长） |
| 前端单测 | `npm test` | **53 files / 406 tests passed** |
| 前端类型/构建 | `npm run build`（含 tsc --noEmit） | 0 errors + 构建成功（styles.css 并集后） |
| E2E 全量 | `npx playwright test`（fresh `routeme-m5-final.db`） | **168 tests：134 passed / 34 failed**（16.6m，`e2e-m5.log`）；**ai-planner A1–A12 12/12**；main 新增 **credit-exit 4/4 + credit-restriction 2/2 + credit-cancel-reason 1/1 = 7/7** + **traveler-recommendation 7/7** 全绿 |
| E2E 隔离 | `npx playwright test profiles.spec.ts`（fresh `routeme-m5-profiles2.db`，单跑） | **7/8**：仅 **:37** main 债务仍红，13/51/88/102 全转绿 |
| 契约门禁 | `openspec validate add-ai-itinerary --strict` / `redocly lint` | **valid** / **0 error / 23 warnings**（0.21.0；main credit-exit 新增 2 warnings） |

### 12.4 34 红分类（无本 change 回归）

- **map.spec 9 + trips.spec 9 = 18 例 refine-trip-map 偏差**（延续原裁决，不修旧 spec）。
- **auth.spec 7 + profile.spec 2 = 9 例 main UI refresh 既有 E2E 偏差**（延续 §9.4 git 证据）。
- **profiles.spec:37 = 1 例 main traveler-recommendation 稳定债务**（单跑 fresh DB 仍红：`查看 阿岚 的资料` 按钮双元素 publisher-row + recommendation-user → strict mode violation；延续 §11.4 git 证据，本 change 未动详情页 publisher 按钮）。
- **污染 6 例（隔离均转绿）：** profiles 13/51/88/102（4，profiles 单跑 7/8 证实）+ **detail-companions:122**（1，隔离转绿；全量运行内累积数据触发推荐引擎把已加入同行者再推荐 → `查看 林见夏 的资料` 双按钮，同 :37 根因但数据依赖）+ **safety-report:148**（1，隔离转绿；chat 气泡计数 `messagesBefore` 受运行内聊天污染）。
- **验收口径达成：** ai-planner 12/12 + credit-exit/restriction/cancel-reason 7/7 + traveler-recommendation 7/7 + 非地图套件隔离全绿（除 main 自身 :37）；**34 红均非本 change 回归**（18 refine-trip-map + 10 main E2E 债务 + 6 污染）。main credit-exit 新功能 E2E 7/7 全绿证合并未破坏共享功能。

### 12.5 提交

- 6 文件冲突解决 + 0.21.0 + OpenApiTest 断言 + V26 重命名 + 2 测试构造修复 staged；三报告 addendum staged；排除项延续（t8-*.json / 日志 / fresh DB 均 gitignored 或不入库）。
- `git commit --no-edit`（第五波 merge）→ push 前再 pull 核对 → push。