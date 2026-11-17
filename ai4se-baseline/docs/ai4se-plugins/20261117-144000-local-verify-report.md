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