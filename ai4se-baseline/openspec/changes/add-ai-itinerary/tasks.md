# 任务：add-ai-itinerary

- **依据：** [`specs/ai-itinerary/spec.md`](specs/ai-itinerary/spec.md) + [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** Jay（AO）｜ **协助：** Neal（VL）在 P4 独立验证（G2）；WAYNE（IO）复核需求口径
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8；T1 先写失败验收（red），再进入实现（`@rule:tdd-cycle`）。T9 属 P5 前动作，本次按发起人指示不执行、不归档。
- **契约：** openapi 0.12.0（`POST /api/ai/itineraries/generate`、`GET /api/weather/forecast`、`POST /api/ai/itineraries`、`GET /api/ai/itineraries/{id}`、`ai_itinerary_id` 可空字段）；`OpenApiTest` 是门禁；既有发布 / 详情 / 状态机不变。
- **安全：** 真实 key 只写 `backend/ai-local.yml`（gitignore）；`application.yaml` 只留环境变量占位（`@rule:no-hardcoded-secrets`）。
- **并行会话：** 提交只 stage 本 change 路径；提交前核对分支 `feature/add-ai-itinerary`；push 前 `git pull --no-rebase --autostash origin main`（P2 偏离③口径）。

## 任务清单

### T1 [tests] 先补失败验收

- [x] 新增 `RouteME/e2e/tests/ai-planner.spec.ts`：A1–A12 与替身夹具（atdd §2.2 / §5；Marker 档 `test.skip` 守卫）。
- [x] 新增 `RouteME/frontend/src/ai/plannerForm.test.ts` / `budgetMath.test.ts` / `poiResolve.test.ts` / `itineraryEdit.test.ts` / `snapshot.test.ts`（U1–U5，先 red）。
- [x] 增补 `RouteME/frontend/src/map/amap/AmapService.test.ts`（U6 transit）与 `route.test.ts`（U7 ai 参数），先 red。
- [x] 新增后端 `AiItineraryControllerTest` / `WeatherControllerTest` / `AiItinerarySnapshotTest` / `WeatherTextTest` 与替身控制器（B1–B12，先 red）；`TripControllerTest` / `OpenApiTest` 增补断言。
- [x] 运行 `npm test` 与 `.\mvnw.cmd -B -ntp test` 记录预期失败；`npx playwright test tests/ai-planner.spec.ts` 记录 red。

**验证：** `cd RouteME/frontend; npm test`；`cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** E1–E41 的验收骨架、U1–U7、B1–B12、A1–A12

### T2 [contract] 契约 0.12.0 + V18 迁移

- [x] `RouteME/openapi.yaml`：version 0.12.0；四个新接口与 schema（GenerateRequest / AiPlan / WeatherSummary / AiItinerarySnapshot）；`TripCreateRequest` / `TripSummary` / `TripDetail` 增 `ai_itinerary_id`（nullable，不入 required）；错误码枚举补 `AI_NOT_CONFIGURED` / `AI_UPSTREAM_ERROR` / `AI_INVALID_OUTPUT` / `WEATHER_UPSTREAM_ERROR`。
- [x] 新增 `backend/src/main/resources/db/migration/V18__ai_itineraries.sql`（design §3.4：新表 + `trip_plans.ai_itinerary_id` 列）。
- [x] `OpenApiTest` 断言版本与新 schema（B11）；Redocly lint 0 error。

**验证：** `npx @redocly/cli lint RouteME/openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** `@rule:api-contract`、B11、E33–E38 契约基础

### T3 [backend] 天气代理

- [x] `WeatherProperties` + `WeatherConfig`（RestClient bean，base-url 可覆盖）；`application.yaml` 增 `routeme.weather.*` 占位。
- [x] `WeatherService` / impl：Open-Meteo daily 调用、字段归一、WMO 文案纯函数、日期窗口校验（今天 ≤ date ≤ 今天+15，超窗 `InvalidInputException`）、上游失败 `WeatherUpstreamException`。
- [x] `WeatherController`：`GET /api/weather/forecast`（需登录）。
- [x] B5 / B6 / B12 转绿。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** E12 / E16 / E30、B5 / B6 / B12

### T4 [backend] AI 生成代理

- [x] `AiProperties` + `AiConfig`；`application.yaml` 增 `routeme.ai.*` 占位 + `spring.config.import` 追加 `optional:file:./ai-local.yml`；`backend/.gitignore` 增 `ai-local.yml`。
- [x] 异常类：`AiNotConfiguredException`（503）/ `AiUpstreamException`（502）/ `AiInvalidOutputException`（502）。
- [x] `AiItineraryService` / impl：generate 内自取天气（复用 WeatherService）→ 提示词组装（天气行为规则 / 预算约束 / reduce_budget / 时长档位 / 禁止地图与天气数值输出）→ DeepSeek `chat/completions` 调用 → JSON 校验（围栏剥离 / 必需字段 / stops ≥2 / total 重算）；非法不自动重试（L-03）。
- [x] `AiItineraryController`：`POST /api/ai/itineraries/generate`。
- [x] B1–B4 转绿；本地真实 key 冒烟一次（key 写 `ai-local.yml`，不提交）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** E7 / E9 / E10 / E11 / E26 / E29 / E32、B1–B4、L-02 / L-03

### T5 [backend] 快照保存与行程链接

- [x] `AiItineraryEntity` / mapper / pojo；`POST /api/ai/itineraries`（resolved ≥2 与坐标校验，归属会话用户）+ `GET /api/ai/itineraries/{id}`（存在 + 归属，否则 400）。
- [x] `TripPlanEntity` / `TripPlan` / `TripPlanMapper.xml` 增 `ai_itinerary_id`；`TripCreateRequest` 增字段；`TripPlanServiceImpl` 发布时校验链接（存在 + 归属）；summary / detail 透传。
- [x] B7–B10 转绿。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp verify`
**覆盖：** E33–E38 / E41、B7–B10、L-01

### T6 [frontend] 纯逻辑与地图扩展

- [x] 新增 `frontend/src/ai/plannerForm.ts` / `budgetMath.ts` / `poiResolve.ts` / `itineraryEdit.ts` / `snapshot.ts` / `aiMessages.ts`（design §4.2）；U1–U5 转绿。
- [x] `AmapService.ts`：`TravelMode` 增 `transit`；`ROUTE_PATHS` + `parseTransitLeg` + transit 请求带 city；既有模式行为不变；U6 转绿。
- [x] `route.ts` / `route.test.ts`：`create` 增 `aiItineraryId`（`?ai=` 解析，ai 优先于 from）；U7 转绿。
- [x] `types.ts` / `api.ts`：generate / forecast / 快照读写 / `ai_itinerary_id` 类型与请求函数。
- [x] `npm run typecheck` 通过。

**验证：** `cd RouteME/frontend; npm test; npm run typecheck`
**覆盖：** E6 / E11 / E17–E27 纯逻辑、U1–U7

### T7 [frontend] AI 规划页与保存闭环

- [x] 新增 `pages/AiPlannerPage.tsx`：三栏结构（design §4.1）、条件表单（三种选点 + 定位失败内联错误）、门控生成、Loading / Error / Retry 分服务状态。
- [x] 地图接线：AmapContainer + RouteLayer + 编号 Marker（列表顺序号）；POI 解析失败「未定位」+ 更换；编辑后重算；地图加载失败降级面板（流程不依赖地图实例）。
- [x] 右栏：天气卡（预览 → generate 响应权威切换，L-02）、Tips / 装备、预算卡（恒标「AI 估算」+ 超预算差额 + 降预算）、时间轴（删除 / 更换 / 上移 / 下移）、统计行（距离 / 时间取自高德 + 「预计」）、[重新生成] [保存行程]。
- [x] 保存闭环：快照 POST → `#/trips/new?ai={id}`；`TripCreatePage` 预填（标题 / destinationCode / 日期 / stops / tags / 预算 / banner）+ `toCreateRequest` 携 id；失败保留快照可重试（L-01）。
- [x] `TripDetailPage`：`ai_itinerary_id` 非空 → 「AI 推荐」徽标 + 天气 / 预算摘要（加性渲染，失败只隐藏摘要，L-05）。
- [x] `App.tsx` / `AppShell`：`#/ai-planner` 路由与 rail 入口；发布页「试试 AI 推荐路线」引导。
- [x] `styles.css` 末尾追加 `.ai-planner-*`（浅 / 深令牌；≤1100px / ≤768px 降级）；不新增硬编码色值。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** E1–E31 / E37 / E39、A1–A11、L-01 / L-02 / L-05

### T8 [tests] 全量验证与人工走查（P4 收口）

- [x] fresh SQLite 重建；后端 `.\mvnw.cmd -B -ntp verify` 全绿；前端 `npm test` / `npm run typecheck` / `npm run build` 全绿。
- [x] `npx playwright test`（全量）：验收口径 = ai-planner 12/12＋其余非地图测试全绿；map/trips 21 红为既有偏差（发起人裁决：记录偏差、不修旧 spec，verify report §2.2 附 git 证据）；Marker 档按 JS Key 分级记录。
- [x] 真实 key 档走查：真实 DeepSeek / Open-Meteo / 高德生成质量、POI 解析失败率、transit 路线、点击选点；记录失败口径。
- [x] 1440 / 768 / 390 × 浅 / 深 走查截图存 `docs/preview/add-ai-itinerary/`；无溢出 / 重叠 / 对比度问题。
- [x] `openspec validate add-ai-itinerary --strict` valid；Redocly lint 0 error。
- [x] `docs/ai4se-plugins/<timestamp>-local-verify-report.md` 记录命令、结果与偏差；`g2-decision.md`（VL Neal）；`docs/sdd/add-ai-itinerary/p4-verify.md`。

**验证：** 上述命令
**覆盖：** E1–E41、DoD、`@rule:web-testing` / `@rule:tdd-cycle`

### T9 [docs] P5 归档前收口（本次不执行、不归档）

- [ ] `ai-itinerary` 新能力整目录合并入 Living Spec；`trip-plans` ADDED 块追加（与 `refine-trip-map` 核对合并顺序，不覆盖既有 Requirement）。
- [ ] 回写 `docs/knowledge/architecture/README.md` / `operations/README.md` / `_LOG.md` 的 AI / 天气 / 外部服务小节。
- [ ] 更新 `docs/sdd/README.md` 索引与 `requirement-workspace/registry.md` 状态。

**覆盖：** G3 / `@rule:sdd-artifacts`（发起人指示暂不执行）

## 对齐自检（vs Delta Spec）

| Delta Requirement | 任务 |
|---|---|
| 旅行条件输入与地点选择（6 场景） | T1 / T6 / T7 |
| AI 行程生成与重新生成（5 场景） | T1 / T4 / T7 |
| 真实天气参与推荐（5 场景） | T1 / T3 / T4 / T7 |
| 地图验证与路线同步（4 场景） | T1 / T6 / T7 |
| 行程编辑（4 场景） | T1 / T6 / T7 |
| 预算估算与超预算反馈（3 场景） | T1 / T6 / T7 |
| 外部服务失败状态（5 场景） | T1 / T3 / T4 / T7 |
| AI 行程快照保存（4 场景） | T1 / T2 / T5 / T7 |
| trip-plans：AI 行程保存为旅行计划（5 场景） | T1 / T2 / T5 / T7 / T8 |

- 无静默扩张：任务只覆盖 Delta 场景；同行匹配 / 邀请 / 分享 / 实时价格 / 跨城 / 独立管理页不在任务中。
- 无遗漏场景：41 条场景全部有任务落点（atdd §1 E1–E41 逐条映射）。
- G1 跟踪项：L-01（T5/T7）、L-02（T4/T7）、L-03（T4）、L-04（T1/T8）、L-05（T7/T8）全部收口。