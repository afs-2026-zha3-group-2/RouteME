# 任务：add-trip-experiences

- **依据：** [`spec.md`](specs/trip-experiences/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；契约先行；提交按「规划 / 实现+验证 / 归档」三笔（见文末「提交计划」）。

## 任务清单

### T1 [contract] 契约先行

- [x] `openapi.yaml` 新增 `GET /experiences`、`GET/POST /trips/{tripId}/experiences`、`GET /me/experiences`，以及 `Experience`、`ExperienceWriteRequest` schema 与 `EXPERIENCE_NOT_ALLOWED` 错误码（v0.4.0）。
- [x] `OpenApiTest` 断言新路径、`intensity` 枚举与 400/403；Redocly 0 error。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`
**覆盖：** 全部需求的字段与状态码

### T2 [backend] 迁移与种子

- [x] `V8__create_trip_experiences.sql`：唯一约束 `(trip_id, author_id)`，2 条种子对齐原型（trip 1 → user 2 `MODERATE`，trip 2 → user 3 `TIRING`）。
- [x] `ExperienceDataMigrationSqliteTest` 用临时 SQLite 跑迁移，断言条数、唯一约束与作者资格一致。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ExperienceDataMigrationSqliteTest test`
**覆盖：** R1/R3 的数据前提

### T3 [backend] 体验领域

- [x] `ExperienceIntensity`（relaxed/moderate/tiring + 中文标签）与 `TripExperience`（trim、感受 10–400、建议 1–120、`withContent` 更新）。
- [x] 非法内容抛 `InvalidInput`；边界值 10/400/120 通过。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=TripExperienceTest test`
**覆盖：** R2 的全部内容口径场景

### T4 [backend] 体验仓储

- [x] `TripExperienceRepository` 与行对象：`findByTrip`、`findByAuthor`、`findByTripAndAuthor`、`findAll`、`nextId`、`insert`、`update`。
- [x] `DatabaseTripExperienceRepositoryTest` 覆盖查询与唯一性冲突。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=DatabaseTripExperienceRepositoryTest test`
**覆盖：** R1/R3/R4 的读取

### T5 [backend] 体验服务

- [x] `ExperienceService`：资格（已完成 + `participants` 含当前用户）、upsert、按行程/我的/首页列表、关键词/目的地/标签筛选、`updated_at` 倒序。
- [x] `ExperienceServiceTest` 覆盖发布者与同行者资格、非参加者 403、未结束 403、重复提交更新、筛选与排序。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ExperienceServiceTest test`
**覆盖：** R1/R2/R4

### T6 [backend] 体验接口

- [x] `ExperienceController` 四个端点；首次 201、更新 200、空列表 200。
- [x] `ExperienceControllerTest` 覆盖成功、非法内容、无资格、未结束、未知行程、缺少身份。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ExperienceControllerTest test`
**覆盖：** R1/R2/R3

### T7 [frontend] 请求层与路由

- [x] `types.ts`/`api.ts` 增加体验类型与 5 个请求函数；`route.ts` 增加 `#/share/{tripId}`，`#/trips/new` 支持 `?from=`。
- [x] 路由与请求层单测更新。

**验证：** `cd RouteME/frontend; npm test`
**覆盖：** 全部前端场景的入口

### T8 [frontend] 游后分享页

- [x] `ShareExperiencePage`：感受（10–400）、强度三选一、建议（≤120）、隐私提示、发布/保存修改、无资格提示。
- [x] `experienceForm.ts` 纯函数校验 + 单测（边界与强度文案）。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R1/R2/R6 的界面场景

### T9 [frontend] 首页旅行体验视图

- [x] 首页视图切换（旅行计划 / 旅行体验）+ 体验数量；体验卡展示内置封面、强度、摘要与建议。
- [x] 关键词/目的地/兴趣筛选接入体验列表，空态提示；体验卡提供「参考此行程发布」。

**验证：** `cd RouteME/frontend; npm run build`
**覆盖：** R4

### T10 [frontend] 详情体验区与参考发布预填

- [x] 详情页游后体验区：作者、强度、感受、建议、空态、发表/修改入口。
- [x] `TripCreatePage` 读取 `?from=` 预填目的地/途经点/标签，清空标题/日期/人数/集合/说明，并提示需重填。

**验证：** `cd RouteME/frontend; npm run build`
**覆盖：** R3/R5

### T11 [frontend] 我的旅行分享入口

- [x] 已完成分组显示已分享标记与「发表/修改体验」入口；复用 `/me/experiences`。

**验证：** `cd RouteME/frontend; npm run build`
**覆盖：** R6

### T12 [e2e] 端到端验收

- [x] 已完成行程发表体验 → 详情区可见 → 首页「旅行体验」可见 → 参考发布预填 → 必填字段为空。
- [x] 反向：未结束/未参加无入口、无图片上传、无评论点赞。
- [x] 唯一标题/筛选，不假设顺序。

**验证：** 前后端启动后 `cd RouteME/e2e; npx playwright test`
**覆盖：** R1–R6 用户路径与 Non-goals

### T13 [docs] 知识库与登记

- [x] `docs/knowledge/domain`、`interfaces`、`architecture` 补体验能力（口径、展示位、参考发布、隐私边界）。
- [x] `requirement-workspace/registry.md` 更新 REQ-004 状态。

**验证：** 相对链接 0 断链；术语与 spec 一致
**覆盖：** 文档交付

### T14 [verify] 全量验证与报告

- [x] Redocly、`.\mvnw.cmd -B verify`、`npm run build`、`npm test`、`npx playwright test` 全绿。
- [x] 写 `docs/ai4se-plugins/<ts>-local-verify-report.md`。

**验证：** 上述命令全绿
**覆盖：** 全部验收场景

## 提交计划

| # | 内容 | 说明 |
|---|---|---|
| 1 | P2 规划工件（proposal/spec/DoV/G1/ATDD/design/tasks） | 文档提交 |
| 2 | T1–T14 实现、测试、知识库与验证报告 | 功能提交（已推送历史不改写；延续 plans/companions 的分步例外） |
| 3 | G2/G3 + `openspec archive` + registry verified | 归档提交 |

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | 结果 | 证据 |
|---|---|---|
| 每条 Requirement 都有任务覆盖 | Pass | R1→T2/T3/T5/T6/T8；R2→T3/T5/T6/T8；R3→T5/T6/T10；R4→T4/T5/T9；R5→T10/T12；R6→T8/T11 |
| Design 约束可落地 | Pass | upsert T5；资格复用 participants T5；预填清空 T10；纯文字封面 T8/T9 |
| ATDD 的 API/E2E 层都有任务 | Pass | API→T3–T6；E2E→T12；UT→T3/T7/T8 |
| 非目标已排除 | Pass | 图片上传、评论、审核后台、copy 接口均无任务 |