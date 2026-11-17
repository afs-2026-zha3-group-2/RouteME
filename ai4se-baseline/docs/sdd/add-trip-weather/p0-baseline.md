# P0 基线记录 — add-trip-weather

- **Change：** `add-trip-weather`（候选能力 `trip-weather` ADDED）｜ **故事：** REQ-022 目的地天气与出行提醒（迭代 2 / P1 / 3 点）
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-17
- **记录人：** Jay（AO）
- **分支：** `feature/add-trip-weather`（独立 worktree `D:\software\training\TATP\RouteMe\RouteME-weather`，从 `origin/main@225eb0e` 切出）
- **落点页面：** 路线创建页（发布行程）／行程详情页

## 1. 阶段目标

确认「选择目的地与旅行日期后查看当地天气及出行提醒」这件事在基线上可开工：能力归属、长期规格权威、可复用的地图与区划底座、外部服务接入条件、规则载体、知识库槽位与验证链路都在仓库里可查；把「用户故事有、实现没有」的差距固定成可判定缺口，供 P1 提案使用。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`：`design-system`、`hello-world`、`trip-companions`、`trip-experiences`、`trip-plans`、`user-auth`；`openspec/changes/` 15 个在途 change；`openspec/templates/`；`openspec/config.yaml`（`schema: spec-driven`） | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-plans/spec.md`（发布 / 浏览 / 详情）；`design-system/spec.md`（布局完整性与对齐） | 本 change 以 `trip-plans` 为落地页面的既有约束，天气本身为新能力 |
| 天气能力现状 | 全仓 `backend/src/main` + `frontend/src` 无 Open-Meteo 调用、无天气端点、无天气卡（`git grep -i "open-meteo\|weather"` 仅命中取消原因的「天气或不可抗力原因」文案） | **天气能力完全缺失**；`add-ai-itinerary`（REQ-017）在其它分支的工作区里有未提交的天气代理草稿，尚未进入 `main`，不能作为本 change 的基线 |
| 目的地选择底座 | `frontend/src/trips/TripCreatePage.tsx`（`AreaCascader` 选省/市，`AmapPlacePicker` 选途经点/集合点）；`frontend/src/area/*`；`backend/src/main/resources/area/area-codes.json`（34 省级 / **375 城市**） | 目的地是 **6 位区划码**，不携带坐标；发布链路不要求用户输入城市名 |
| 地图与地理编码底座 | `backend/.../controller/AmapProxyController.java`（白名单含 `v3/geocode/geo`、`v3/place/text`，后端持 Web 服务 Key + `jscode`）；`backend/.../config/AmapConfig.java`（连接 4s / 读取 8s 超时）；`frontend/src/map/amap/*`（JS API 选点、Marker、路线） | 后端已有高德 Web 服务出口与凭据，可复用做「区划码 → 经纬度」；前端已有选点结果可复用的坐标 |
| 行程数据模型 | `backend/.../pojo/TripPlan.java`、`entity/TripPlanEntity.java`、`response/TripDetailResponse.java`、`request/TripCreateRequest.java`；`trip_plans` 迁移 `V11__add_destination_area_code.sql` | 行程只存 `destination_code` / `destination`，**无经纬度列**；本 change 需明确坐标口径 |
| 契约 | `RouteME/openapi.yaml` 0.13.0（行程 CRUD / 申请 / 聊天 / 体验 / 认证 / 资料）；`requirement-workspace/registry.md` 已登记 `add-credit-account` 0.14.0 + V20、`add-ai-itinerary` 0.15.0 + V21 的在途占用 | 无天气路径与 schema；本 change 按号段顺延取 0.16.0 |
| 迁移号段 | `backend/src/main/resources/db/migration/` 最新 `V19__trip_cancellation.sql`；V20 / V21 已被在途 change 预约 | 本 change 优先不新增列；若必需则顺延取 `V22` |
| 既有测试 | 后端 `routeme/controller/*Test`（含 `TripControllerTest`、`OpenApiTest`、`AmapProxyControllerTest`）、`routeme/pojo/*Test`；前端 Vitest 纯函数与派生逻辑为主；E2E `e2e/tests/*.spec.ts`（Playwright，含 `page.route` 拦截范例） | 天气需要新增后端上游替身测试、契约断言、前端纯函数测试与 E2E 断言锚点 |
| 外部服务 | Open-Meteo 免 Key：`https://api.open-meteo.com/v1/forecast`；daily 变量 `temperature_2m_max`、`temperature_2m_min`、`precipitation_probability_max`、`precipitation_sum`、`weather_code`、`wind_speed_10m_max`、`uv_index_max`；`daily` 必须带 `timezone`；`forecast_days` 上限 16；错误以 400 + `{"error":true,"reason":…}` 返回；UV 属 daily 变量，缺省时为 `null` | 可直接接入；预报窗口约 16 天（含今天） |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`；本次触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`api-contract`、`web-coding-style`、`web-testing`、`java-testing`、`no-hardcoded-secrets` | 覆盖分支、提交、工件评审、契约、样式、测试与密钥 |
| 知识库 | `docs/knowledge/_INDEX.md`、`docs/knowledge/_LOG.md`、`docs/knowledge/interfaces/README.md` | 槽位可写；新接口需同批登记 |
| 协作约定 | `ai4se-baseline/AGENTS.md`（四原则、SDD 工件门禁）、`docs/sdd/README.md`（P0–P5 与阶段提交格式） | 存在 |
| CI / CD | `.github/workflows/ci.yml`（后端 `./mvnw -B -ntp verify`、前端 `npm run build && npm test`、JDK 21 / Node 22）、`cd.yml` | 存在；天气链路的测试不得依赖真实上游 |
| 工具链 | `openspec` 可用；JDK 21；Node ≥ 22；Maven Wrapper；Playwright | 满足 `pom.xml` 与 `frontend/package.json` |
| 原型 | `docs/prototype/ui.js`、`styles.css` | 原型**没有**天气卡；本 change 属新增界面，按 antd 与既有令牌实现，不引入第二套视觉 |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate add-trip-weather --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest` | `openapi.yaml` 与 schema 断言 |
| 后端 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 含天气上游替身、提醒规则、契约回归 |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run build` | `tsc --noEmit` + vite build |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/weather.spec.ts` | `page.route` 拦截天气接口，不依赖真实上游 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色 | 卡片不溢出、不遮挡表单；失败态可重试且不阻断编辑 |

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`docs/sdd/`、`AGENTS.md` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 见规则载体行 |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` 均 ready；`all-specs-review` 评审流程按 `docs/sdd/README.md` 执行 |
| P0-4 | pack 隔离违规 | Skipped | 本 change 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | 沿用 `main` 的 CI/CD 工作流 |

## 5. 缺口基线（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | **无天气能力。** 后端无 Open-Meteo 调用、无天气端点；`application.yaml` 无天气配置；前端无天气组件与请求 | `git grep -i "open-meteo\|weather"` 在 `backend/src/main` + `frontend/src` 只命中「天气或不可抗力原因」文案；`RouteME/openapi.yaml` 0.13.0 无天气路径 | 验收标准的 14 条全部无承接 |
| G-02 | **发布页看不到天气。** `TripCreatePage` 只有目的地级联、日期、途经点、集合点、预算与标签；侧栏只有预览卡与安全提示 | `frontend/src/trips/TripCreatePage.tsx` 的 `publish-side` | 用户选完目的地与日期后无法判断天气是否适合出发 |
| G-03 | **详情页看不到天气。** `TripDetailPage` 只展示标题、状态、日期、路线、集合与同行信息 | `frontend/src/trips/TripDetailPage.tsx` | 已发布行程的浏览者与同行者无法提前准备雨具 / 防晒 / 外套 |
| G-04 | **行程无目的地坐标。** `trip_plans` 只有 `destination_code` / `destination`（`V11`），`TripPlan` / `TripCreateRequest` / `TripDetailResponse` 均无经纬度 | `backend/.../pojo/TripPlan.java`、`resource/db/migration/V11__add_destination_area_code.sql`；前端 `types.ts` `TripSummary` 无坐标字段 | 天气需要坐标；必须定义「区划码 → 坐标」的解析与缓存口径，且不能要求用户二次输入城市 |
| G-05 | **无出行提醒规则。** 仓库里没有任何「按天气生成 tips」的规则、阈值或文案 | 全仓无相关代码 / 文案 | 验收标准要求基于真实数据给雨伞、防晒、外套、强风提醒，不能用图标代替 |
| G-06 | **无 Loading / Error / Retry 口径。** 现有页面没有异步天气状态机 | `TripCreatePage` / `TripDetailPage` 均无天气请求 | 验收标准要求加载态、失败提示 + 重试，且失败不能影响继续编辑 |
| G-07 | **无「超出预报窗口」口径。** Open-Meteo 预报上限约 16 天，而发布表单可选任意未来日期（`minDate={dayjs()}`，无上限） | `TripCreatePage` 的 `DatePicker`；Open-Meteo 文档 `forecast_days` 0–16 | 超出窗口的日期必须明确提示「暂无该日期天气预报」，不能拿当前天气冒充 |
| G-08 | **无回归锚点。** 天气相关 E2E、单测、契约断言均不存在 | `e2e/tests/` 无 weather 用例；`OpenApiTest` 无天气路径 | 14 条验收标准没有可执行证据 |

## 6. 关键基线事实（供 P1 / P3 决策）

1. **目的地是区划码，不是坐标。** 支持 375 个城市；用户已在发布页选过城市，天气不得再要求输入城市名。
2. **坐标只能来自高德。** 可复用两条路：后端 `v3/geocode/geo`（已有 Key 与白名单）或前端 JS API 选点结果；不得引入第三方地理编码，也不得用离线估算坐标伪造位置。
3. **Open-Meteo 免 Key**，但预报窗口约 16 天；`uv_index_max` 属 daily 变量，缺省时必须显示为「不展示」而不是 0。
4. **行程详情页是只读消费方**：它拿到的是行程的区划码与日期，没有选点过程；天气必须对「没有坐标的历史行程」同样可用。
5. **失败隔离：** 天气是辅助信息，任何上游失败都不得阻断发布或浏览；失败区域必须可重试。

## 7. 阶段产出

- 本记录：`docs/sdd/add-trip-weather/p0-baseline.md`
- 分支：`feature/add-trip-weather`（worktree `D:\software\training\TATP\RouteMe\RouteME-weather`）
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-17 |
| SM | Lewis | 准入 P1；迭代 2 排期确认 | 2026-11-17 |
| IO | WAYNE | REQ-022 为需求来源；能力归属待 P1 定稿 | 2026-11-17 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。** 下一步 P1：意图 / 需求 / 提案。

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：只做「目的地 + 日期 → 天气 → 基础出行提醒」，不做 AI 自动改路线、不做 AI 选景点、不做预算联动。
- 明确天气后端的归属：本 change 自持 `GET /api/weather/forecast`（Open-Meteo 代理）与提醒推导，成为天气能力的权威实现；`add-ai-itinerary`（REQ-017）后续复用，不重复造第二个天气代理。
- 明确坐标口径：区划码 → 坐标的解析方式、缓存与失败口径；请求携带高德选点坐标时优先使用。
- 明确窗口口径：今天 ≤ date ≤ 今天 + 15；超出时返回「暂无该日期天气预报」的可用状态，不伪造数据。
- 明确提醒规则阈值与文案在 Delta Spec 里可判定（降雨、高温 / 高 UV、低温 / 温差、强风）。