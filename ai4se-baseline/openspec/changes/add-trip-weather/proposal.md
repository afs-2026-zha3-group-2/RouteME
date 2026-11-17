# 变更提案：add-trip-weather

- **触发：** 发起人 2026-11-17 用户故事「选择目的地和旅行日期后查看当地天气及对应的出行提醒」（优先级 P1 ｜ 迭代 2 ｜ 故事点 3 ｜ 落点：路线创建页 / 行程详情页）＋ 范围与坐标口径裁决 D1–D4
- **需求条目：** `requirement-workspace/requirements/REQ-022-trip-weather.md`
- **意图捕获：** `requirement-workspace/intents/REQ-022-trip-weather.md`
- **能力：** `trip-weather`（ADDED）
- **规模：** S/M（后端天气代理 + 坐标解析 + 提醒推导；前端一个共享天气组件挂两页）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:java-testing`、`@rule:sdd-artifacts`、`@rule:no-hardcoded-secrets`
- **基线：** `origin/main@225eb0e`（worktree `RouteME-weather`，分支 `feature/add-trip-weather`）
- **阶段记录：** `docs/sdd/add-trip-weather/p0-baseline.md`

## Why

用户在发布行程或查看行程时，**看不到任何天气信息**。全仓 `backend/src/main` + `frontend/src` 对 `open-meteo` / `weather` 的检索只命中「天气或不可抗力原因」这条取消原因文案；`TripCreatePage` 的侧栏只有预览卡与安全提示，`TripDetailPage` 只有标题、状态、日期、路线、集合与同行。

结果是：用户要判断「这天适不适合去、要不要带伞、要不要防晒」，只能退出应用另开天气 App，再把结论手工带回来；同行者也无法在详情页提前准备。天气与行程决策被拆成两件事。

`add-ai-itinerary`（REQ-017）把天气放在「AI 推荐」内部，只服务 AI 规划页，既覆盖不到发布页与详情页，也不产出「按真实天气给基础提醒」这种与 AI 无关的稳定能力。本 change 把天气沉淀为独立能力：**目的地 + 日期 → 真实天气 → 基础出行提醒**，供两处页面与后续 AI 推荐复用。

## What Changes

- **`trip-weather`（ADDED，6 Requirement / 18 Scenario）：**
  1. 按目的地与日期获取真实天气（Open-Meteo 归一：天气状态、最高 / 最低温、降雨概率、降水量、风速、UV 可用时）。
  2. 目的地坐标解析与复用（优先请求携带的高德选点坐标；否则按区划码解析城市中心坐标并缓存；不要求用户输入城市）。
  3. 基于真实天气的出行提醒（降雨→雨具 / 户外提示；高温与 UV→防晒补水；低温与温差→外套；强风→防风安全；全部未命中→平稳提示）。
  4. 路线创建页的天气展示（加载 / 成功 / 未就绪 / 失败可重试；改目的地或日期后刷新；晚到旧响应不覆盖）。
  5. 行程详情页的天气展示（使用行程已保存的目的地与首日；不要求输入；失败不影响行程其余信息）。
  6. 预报窗口与不可用状态（今天 ~ 今天+15；越界明确「暂无该日期天气预报」；不得用当前天气替代）。
- **后端：** 新增 `GET /api/weather/forecast`（`destination_code` + `date`，可选 `lng` / `lat`）；Open-Meteo 客户端与字段归一；目的地坐标解析与进程内缓存；提醒纯函数；上游失败与越界分别归一为可识别状态。
- **前端：** 新增共享 `WeatherCard`（含加载、失败重试、越界、未就绪四态）；发布页挂到侧栏，详情页挂到信息区；目的地 / 日期变化后重新请求，请求带序号防竞态。
- **契约：** `openapi.yaml` 0.13.0 → **0.16.0**（0.14.0 / 0.15.0 已被在途 `add-credit-account` / `add-ai-itinerary` 预约），新增天气路径与三个 schema。
- **数据：** **无迁移**（不新增列；坐标读时解析 + 缓存）。

## 问题（现状差距）

1. **无天气端点。** 后端没有任何 Open-Meteo 调用或天气配置。
2. **发布页无天气。** `TripCreatePage` 侧栏只有预览与安全提示（G-02）。
3. **详情页无天气。** `TripDetailPage` 信息区不含天气（G-03）。
4. **无目的地坐标。** `trip_plans` 只有 `destination_code` / `destination`；`TripPlan`、`TripCreateRequest`、`TripDetailResponse` 与前端 `TripSummary` 均无经纬度（G-04）。
5. **无提醒规则。** 仓库没有「按天气生成提醒」的阈值或文案（G-05）。
6. **无异步状态口径。** 两个页面都没有天气请求，也就没有加载 / 失败 / 重试约定（G-06）。
7. **无窗口口径。** 发布页日期选择无上限，而 Open-Meteo 预报窗口约 16 天（G-07）。
8. **无回归锚点。** 无天气单测、契约断言或 E2E（G-08）。

## 范围

**In scope**

- 后端天气代理与归一（含 UV 可空）。
- 目的地坐标解析（区划码 → 城市中心坐标，进程内缓存）+ 请求坐标覆盖。
- 后端出行的提醒推导（固定阈值，纯函数，可单测）。
- 发布页与详情页的天气卡（四态 + 重试 + 刷新）。
- 契约新增路径与 schema。
- 测试：后端上游替身 + 提醒规则 + 契约；前端纯函数；E2E 用 `page.route` 拦截。

**Out of scope**

- AI 生成 / 调整路线、AI 选景点、天气注入 AI 提示词（属 `add-ai-itinerary`）。
- 多日逐天 / 逐小时 / 历史天气 / 空气质量 / 台风路径。
- 天气数据落库、历史归档、跨行程统计。
- 天气预警推送与站外通知。
- 改变目的地选择方式（不新增地图选目的地）。
- 天气影响匹配、排序或行程状态。

## 关键决策（摘要）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 后端能力归属 | 本 change 自持 `GET /api/weather/forecast` 与提醒推导，成为天气能力权威；`add-ai-itinerary` 后续复用（用户裁决） |
| D2 | 目的地坐标 | 区划码 → 城市中心坐标（进程内缓存）；请求携带 `lng` / `lat` 时优先（高德选点结果）；**不新增坐标列** |
| D3 | 落地位置 | 路线创建页侧栏 + 行程详情页信息区，共用同一组件 |
| D4 | 日期口径 | 展示旅行**首日**天气并标注日期；多日逐天不做 |
| D5 | 越界表达 | 200 + `available: false` + `reason: OUT_OF_RANGE`；越界是正常业务状态，不是调用错误 |
| D6 | 提醒计算位置 | 后端纯函数，两处页面共用同一口径，可单测 |
| D7 | 编号 | REQ-022 / `add-trip-weather` / `trip-weather`（ADDED）；契约 0.16.0；无迁移 |

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-weather/spec.md` | 归档时新增该能力（6 Requirement / 18 Scenario） |
| `openspec/specs/trip-plans/spec.md` | 不改写；发布与详情既有行为不变，只增天气区块 |
| `RouteME/backend/.../config/WeatherProperties.java`、`WeatherConfig.java` | Open-Meteo 基础地址与带超时的 `RestClient` |
| `RouteME/backend/.../controller/WeatherController.java` | `GET /api/weather/forecast` |
| `RouteME/backend/.../service/WeatherService.java`、`impl/WeatherServiceImpl.java` | 窗口校验、坐标解析、上游调用、字段归一 |
| `RouteME/backend/.../service/WeatherReminder.java`、`WeatherText.java` | 提醒阈值规则与 WMO 文案（纯函数） |
| `RouteME/backend/.../pojo/WeatherForecast.java`、`WeatherReminderItem.java` | 响应模型 |
| `RouteME/backend/.../exception/WeatherUpstreamException.java` | 上游失败错误码 |
| `RouteME/backend/.../resources/application.yaml` | `routeme.weather.base-url`（环境变量可覆盖） |
| `RouteME/frontend/src/api.ts`、`types.ts` | `fetchWeatherForecast` 与响应类型 |
| `RouteME/frontend/src/weather/WeatherCard.tsx`、`useWeather.ts`、`weather.ts` | 共享组件、请求与防竞态、展示映射 |
| `RouteME/frontend/src/trips/TripCreatePage.tsx` | 侧栏挂载天气卡；目的地 / 首日变化刷新 |
| `RouteME/frontend/src/trips/TripDetailPage.tsx` | 信息区挂载天气卡 |
| `RouteME/openapi.yaml` | 天气路径 + `WeatherForecast` / `WeatherDaily` / `WeatherReminder`；版本 0.16.0 |
| 测试 | 后端上游替身 + 提醒规则 + 契约；前端纯函数；E2E `weather.spec.ts` |

## 需求与证据

- 故事来源：发起人 2026-11-17 用户故事与 14 条验收标准（迭代 2 / P1 / 3 点）。
- 现状证据：见 P0 §5 的 G-01 ~ G-08。
- 上游证据：Open-Meteo `v1/forecast` 文档（daily 变量、`timezone` 必填、`forecast_days` 0–16、错误 400 + `reason`）。
- 用户裁决：D1–D4（后端归属、坐标口径、落地位置、当前开发者 Jay）。

## Effort / size

- **相对规模：** S/M。后端是标准的「外部服务 + 归一 + 纯函数规则」，无状态机、无迁移；前端一个共享组件挂两处。
- **建议实施顺序：** ① 契约 → ② 后端上游替身 Red → ③ 坐标解析与窗口 → ④ 提醒规则 → ⑤ 前端组件与两页挂载 → ⑥ E2E 与走查。

## Spec ID

`add-trip-weather`，业务增量规格见 `specs/trip-weather/spec.md`。

## 残余风险与偏离记录

1. **与在途 `add-ai-itinerary` 的重叠。** 该 change 的 P4 工作区（未提交）含 `WeatherService` / `WeatherController` / `WeatherForecast`。本 change 按 D1 成为权威实现；两者合并时以本 change 的路径与签名为主，AI 侧改为复用。合并顺序需在 PR 时显式核对，避免出现两个天气代理。
2. **坐标口径与 P1 前讨论的差异。** 提问时曾选择「发布时存坐标 + 兜底解析」；P0 核对发现目的地是 375 城市的区划码、坐标是城市属性且随区划确定，落库需要迁移并与在途 V20 / V21 号段排队，收益仅为省一次缓存命中。按「最简实现」原则（`AGENTS.md` 四条开发原则之二）改为**读时解析 + 进程内缓存**，并保留 `lng` / `lat` 覆盖以复用高德选点坐标。如后续需要精确到点位，另开 change 加列。
3. **城市中心坐标的精度。** 用城市中心代表目的地，对「城市级」判断（是否下雨、是否高温）足够，对山区 / 海岛等微气候不足；属已知限制，Delta Spec 不承诺点位级精度。
4. **Open-Meteo 非商业额度。** 免 Key 版本每日调用上限约 1 万次；当前为演示项目，未做配额保护，若上量需换商业端点。
5. **部署网络。** CI 不依赖真实上游；E2E 用 `page.route` 拦截，真实走查需外网。