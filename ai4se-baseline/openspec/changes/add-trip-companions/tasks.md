# 任务：add-trip-companions

- **依据：** [`spec.md`](specs/trip-companions/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；契约先行；内部两阶段：**A**（T1–T7、T11–T12：匹配 + 申请 + 联动 + 我的旅行）与 **B**（T8–T10、T13：聊天 + 退出后的安全能力）。两阶段同属一个 change。

## 任务清单

### T1 [contract] 契约先行

- [x] `openapi.yaml` 新增 `/matches`、`/matches/{tripId}`、`/trips/{tripId}/applications`（GET/POST）、`/me/applications`、`/applications/{id}/cancel|accept|reject`、`/trips/{tripId}/leave`、`/trips/{tripId}/messages`（GET/POST）、`/me/chat-partners`、`/me/trips`、`/reports`，以及 `Match`、`Application`、`ChatMessage`、`MyTrips`、`Report` schema 与错误码（v0.3.0）。
- [x] `OpenApiTest` 断言新路径、必填与状态枚举；Redocly 0 error。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml`（0 error）；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`（3 tests）
**覆盖：** 全部需求的字段与状态码

### T2 [backend] 迁移与种子

- [x] `V5__create_trip_applications.sql`（含与 V4 `joined_count` 一致的 5 条 ACCEPTED + 2 条 PENDING）、`V6__create_chat_messages.sql`（4 条会话种子）、`V7__create_reports.sql`（空表）。
- [x] `CompanionDataMigrationSqliteTest` 用临时 SQLite 跑迁移，断言申请状态分布、消息条数与 `joined_count` 一致。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=CompanionDataMigrationSqliteTest test`
**覆盖：** R2/R3/R5 的数据前提

### T3 [backend] 申请领域与仓储

- [x] `TripApplication`、`ApplicationStatus`、`TripApplicationRepository` 与行对象：按行程/申请人查询、唯一性校验、状态更新。
- [x] 状态机校验（PENDING 才能 cancel/decide；ACCEPTED 才能 leave）由领域方法与服务层守卫。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=DatabaseTripApplicationRepositoryTest,ApplicationStatusTest test`
**覆盖：** R2/R3/R4 的状态与权限

### T4 [backend] 匹配服务与接口

- [x] `TripMatch` 纯函数：参照行程（最近未结束发布）或兴趣 + 筛选；计分 50/30/20/兴趣 10 上限 20；理由文案与百分比。
- [x] `GET /matches`（默认分数排序）与 `GET /matches/{tripId}`。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=TripMatchTest,MatchControllerTest test`
**覆盖：** R1 的 4 个场景

### T5 [backend] 提交与取消申请

- [ ] `POST /trips/{tripId}/applications`：说明选填 ≤120、自己/重复/满员/结束拒绝。
- [ ] `POST /applications/{id}/cancel`：仅申请者、仅 PENDING。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ApplicationControllerTest#apply*+cancel* test`
**覆盖：** R2 的 5 个场景

### T6 [backend] 处理申请与人数联动

- [ ] `GET /trips/{tripId}/applications`（仅发布者）、`accept`、`reject`。
- [ ] `TripPlanService.addCompanion/removeCompanion`（事务内更新 `joined_count`，状态投影自动满员/回退）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ApplicationControllerTest,TripPlanServiceTest test`
**覆盖：** R3 的 4 个场景

### T7 [backend] 退出同行

- [ ] `POST /trips/{tripId}/leave`：仅 ACCEPTED 同行者、发布者 403；人数 -1、申请转 CANCELLED。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ApplicationControllerTest#leave* test`
**覆盖：** R4 的 3 个场景

### T8 [backend] 一对一聊天

- [ ] `GET/POST /trips/{tripId}/messages`、`GET /me/chat-partners`；参与者校验、空白/超长 400、已完成只读 409、升序。
- [ ] `ChatMessageRepository` 与行对象。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ChatControllerTest test`
**覆盖：** R5 的 4 个场景

### T9 [backend] 我的旅行聚合

- [ ] `GET /me/trips`：published / applied / matched / completed + `pending_application_count`。
- [ ] 与详情/申请状态一致（接受、取消后刷新同步）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=MyTripsControllerTest test`
**覆盖：** R6 的分区与提醒

### T10 [backend] 举报

- [ ] `POST /reports`：target trip/user、原因枚举、说明 ≤200、返回 `{received: true}`。
- [ ] `ReportRepository`；不提供处置接口。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ReportControllerTest test`
**覆盖：** R6 的举报场景

### T11 [frontend] 匹配展示与首页默认排序

- [ ] `api.ts`/`types.ts`/`route.ts` 增加 companions 端点与路由。
- [ ] 首页改用 `/matches`，新增「按匹配度」排序并默认选中；卡片展示理由与百分比。
- [ ] 详情页展示单条匹配理由。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R1 的 4 个场景

### T12 [frontend] 申请与发布者处理

- [ ] 详情页申请弹窗（说明选填 ≤120）、状态展示、取消；发布者申请列表页 accept/reject。
- [ ] 接受后人数与状态立即刷新。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R2/R3 的 9 个场景

### T13 [frontend] 我的旅行、聊天与安全

- [ ] `MyTripsPage` 四个 tab + 待处理提醒；`ChatPage` 列表/发送/刷新/5s 轮询/只读；安全提示与举报弹窗。
- [ ] 退出同行二次确认（仅同行者）。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R4/R5/R6 的界面场景

### T14 [e2e] 端到端验收

- [ ] 首页匹配理由与默认排序 → 申请 → 发布者接受 → 双方聊天 → 退出 → 我的旅行同步。
- [ ] 反向：自己行程无申请入口、PENDING 不能进聊天、已结束聊天只读、无批量/已读/推送。
- [ ] 唯一标题/筛选，不假设顺序。

**验证：** 前后端启动后 `cd RouteME/e2e; npx playwright test`
**覆盖：** R1–R6 的用户路径与 Non-goals

### T15 [docs] 知识库与登记

- [ ] `docs/knowledge/domain`、`interfaces`、`architecture` 补同行能力（申请状态机、聊天、我的旅行、举报）。
- [ ] `requirement-workspace/registry.md` 更新 REQ-003 状态。

**验证：** 相对链接 0 断链；术语与 spec 一致
**覆盖：** 文档交付

### T16 [verify] 全量验证与报告

- [ ] Redocly、`.\mvnw.cmd -B verify`、`npm run build`、`npm test`、`npx playwright test` 全绿。
- [ ] 写 `docs/ai4se-plugins/<ts>-local-verify-report.md`。

**验证：** 上述命令全绿
**覆盖：** 全部验收场景

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | 结果 | 证据 |
|---|---|---|
| 每条 Requirement 都有任务覆盖 | Pass | R1→T4/T11；R2→T3/T5/T12；R3→T3/T6/T12；R4→T3/T7/T13；R5→T8/T13；R6→T9/T10/T13 |
| Design 约束可落地 | Pass | 状态机 T3；计数联动 T6；`/matches` T4/T11；聊天只读 T8；举报枚举 T10 |
| ATDD 的 API/E2E 层都有任务 | Pass | API→T3–T10；E2E→T14；UT 推迟到 apply（T4/T8 等） |
| 一条任务只落一层 | Pass | `[contract]/[backend]/[frontend]/[e2e]/[docs]/[verify]` |
| 契约任务先于实现 | Pass | T1 在 T2–T13 之前 |
| 未回退规格或设计 | Pass | 未新增 spec/design 之外的能力；批量、WS、保存筛选留在 Out of scope |

**自检结论：Pass**。可进入 `/sdd:quality-checklist`（P3）与 `/sdd:atdd-apply`（P4）。