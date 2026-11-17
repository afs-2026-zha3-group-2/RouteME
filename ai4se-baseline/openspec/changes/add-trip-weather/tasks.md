# 任务：add-trip-weather

- **Change：** `add-trip-weather`（REQ-022）｜ **Owner：** Jay（AO）
- **顺序原则：** 契约先行 → 后端纯函数 Red → 后端接口 → 前端纯函数 → 组件与挂载 → E2E → 回归。
- **验证命令统一在 §2**，每条任务只列本条最相关的命令。

## 1. 任务清单

| id | 任务 | 落点 | 依赖 | 验收 | 验证 |
|---|---|---|---|---|---|
| T1 | 契约：`openapi.yaml` 0.16.0，新增 `GET /weather/forecast`、`WeatherForecast` / `WeatherDaily` / `WeatherReminder`；`OpenApiTest` 断言版本与必需字段 | contract | — | `OpenApiTest` Red → Green；Redocly 0 error | C1 |
| T2 | 后端纯函数 Red：`WeatherTextUtils`（WMO 文案）与 `WeatherReminderRules`（7 类阈值、顺序、UV null、平稳态） | backend | T1 | U1–U7 全绿；先见 Red | C2 |
| T3 | 配置与异常：`WeatherProperties`（forecast / geocoding 两个地址）、`WeatherConfig`（4s / 8s 超时 `RestClient`）、`WeatherUpstreamException`（502）、`application.yaml` 配置项 | backend | — | 应用可启动；`WEATHER_UPSTREAM_ERROR` 可被 `GlobalExceptionHandler` 映射 | C2 |
| T4 | 坐标解析：`DestinationLocator`（区划码 → 城市名 → Open-Meteo geocoding，去后缀重试，进程内缓存，只缓存成功） | backend | T3 | B2 / B3 / B7 绿 | C2 |
| T5 | 天气服务：`WeatherService` / `WeatherServiceImpl` / `WeatherQuery`，窗口判定（`Asia/Shanghai`，注入 `Clock`）、上游调用、daily 对齐、字段归一、提醒组装 | backend | T2 / T3 / T4 | B1–B6 绿 | C2 |
| T6 | 控制器：`WeatherController` 参数校验与响应（缺参 / 非法码 / 越界 / 半对坐标） | backend | T5 | B1–B7 绿 | C2 |
| T7 | 前端纯函数 Red：`weather/weather.ts`（`toCardState` / `temperatureLabel` / `dateLabel` / `reminderTone`）与 `weather/messages.ts` | frontend | T1 | F1–F4 全绿；先见 Red | C3 |
| T8 | 前端请求与组件：`api.fetchWeatherForecast`、`types.ts` 类型、`useWeather`（token 防竞态、重试、idle）、`WeatherCard`（五态 + 探针）+ `styles.css` 天气样式 | frontend | T7 | 组件可渲染五态；390px 无溢出 | C3 / C4 |
| T9 | 挂载：`TripCreatePage` 侧栏（预览卡之后、安全提示之前）、`TripDetailPage` 信息区（日期之后） | frontend | T8 | 两页可见；改目的地 / 日期后刷新 | C3 |
| T10 | E2E：`e2e/tests/weather.spec.ts`（M1–M7，`page.route` 注入） | e2e | T9 | 7 条全绿 | C4 |
| T11 | 一致性收口：`docs/knowledge/interfaces/README.md` 登记天气接口；`_LOG.md` 追加；PR 描述记录与 `add-ai-itinerary` 的合并顺序 | docs | T6 / T9 | 文档链接可点开；接口表含新行 | C5 |
| T12 | 回归与走查：后端全量、前端 build + 单测、E2E 全量、1440 / 768 / 390 × 浅 / 深色 | verify | T10 / T11 | 全绿；截图 6 张 | C6 |

## 2. 验证命令

| 代号 | 命令 | 判据 |
|---|---|---|
| C1 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest`；`npx @redocly/cli lint openapi.yaml` | 测试通过；0 error |
| C2 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 全绿；新增用例数与 atdd §2–§3 一致 |
| C3 | `cd ai4se-baseline/RouteME/frontend; npm run build; npm test` | 构建通过；单测全绿 |
| C4 | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/weather.spec.ts` | 7/7 |
| C5 | `cd ai4se-baseline; openspec validate add-trip-weather --strict`；`node scripts/portability.test.mjs`（若在 CI 链路） | valid |
| C6 | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 与基线对比，无新增失败 |

## 3. 对齐自检（Delta → Design → Tasks → ATDD）

| Delta Scenario | Design | Tasks | ATDD |
|---|---|---|---|
| 查询当日天气 | §4.3 | T1 / T5 / T6 | E1 / B1 |
| UV 可用时返回 | §4.3、§5.3 | T5 / T8 | E2 / B1 |
| UV 不可用时置空 | §4.3、§5.3 | T2 / T5 / T8 | E3 / U4 / F1 |
| 上游失败不伪造天气 | §4.3、§4.5 | T3 / T5 | E4 / B6 |
| 携带坐标时直接使用 | §4.2 | T4 / T5 | E5 / B1 |
| 未携带坐标时按区划解析 | §4.2 | T4 | E6 / B2 / B3 |
| 坐标不可解析 | §4.1 / §4.2 | T4 / T6 | E7 / B7 |
| 不使用途经点坐标代替目的地 | §4.2 | T4 | E8 / B2 |
| 降雨提醒与户外提示 | §4.4 | T2 | E9 / U2 / U7 |
| 高降雨风险加强提示 | §4.4 | T2 | E10 / U2 |
| 高温与紫外线提醒 | §4.4 | T2 | E11 / U3 |
| 紫外线缺失不产生防晒指数提醒 | §4.4 | T2 | E12 / U4 |
| 低温与昼夜温差提醒 | §4.4 | T2 | E13 / U5 |
| 强风提醒 | §4.4 | T2 | E14 / U6 |
| 天气平稳提示 | §4.4 | T2 | E15 / U7 |
| 天气不可用时无提醒 | §4.4 / §5.1 | T5 / T8 | E16 / B4 |
| 选择目的地与日期后展示天气 | §5.1–§5.3 | T8 / T9 | E17 / M1 |
| 修改目的地后刷新 | §5.2 | T9 | E18 / M2 |
| 修改日期后刷新 | §5.2 | T9 | E19 / M2 |
| 未选择完整时显示未就绪 | §5.1 | T8 | E20 / M5 |
| 加载中显示加载状态 | §5.1 / §5.2 | T8 | E21 / M1 |
| 失败可重试且不阻断发布 | §5.1 / §5.2 | T8 | E22 / M4 |
| 打开详情页展示天气 | §5.3 | T9 | E23 / M6 |
| 详情页天气失败不影响行程 | §5.3 | T9 | E24 / M7 |
| 详情页天气超出窗口 | §5.1 / §5.3 | T8 / T9 | E25 / M3 |
| 日期超出窗口 | §4.1 / §4.5 | T5 / T6 | E26 / B4 |
| 日期早于今天 | §4.1 / §4.5 | T5 / T6 | E27 / B4 |
| 窗口边界 | §4.5 | T5 | E28 / B5 |

- **无遗漏：** 28/28 场景均有设计、任务与验收落点。
- **无静默扩张：** 任务中没有多日预报、AI 提示词、天气落库、预警推送、目的地选择改造。
- **阈值单点：** 只有 T2 定义阈值；前端任务（T7 / T8）不出现阈值判断。
- **契约先行：** T1 在两端实现之前完成（`@rule:spec-first` P3 要求）。

## 4. 风险与回退

| 风险 | 回退 |
|---|---|
| geocoding 对个别城市不命中 | 明确 502 + 可重试；不猜坐标；在残余风险中记录 |
| 契约号段被占用 | 顺延次版本号并同步 `OpenApiTest` |
| `add-ai-itinerary` 先合并 | 按设计 §8 rebase 并删除 AI 侧天气代理 |
| E2E 与既有用例争用端口 | 沿用隔离端口与独立 SQLite |