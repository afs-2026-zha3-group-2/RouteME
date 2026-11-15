# 任务：add-trip-plans

- **依据：** [`spec.md`](specs/trip-plans/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；契约任务先于两端；每条任务给出验证命令与覆盖场景编号（对应 `spec.md` 需求顺序）。

## 任务清单

### T1 [contract] 契约先行

- [ ] 在 `RouteME/openapi.yaml` 新增 `/users`、`/trips`、`/trips/{id}`、`/trips/{id}/complete`，以及 `DemoUser`、`TripPlan`、`TripCreateRequest`、`TripSummary`、`TripDetail`、`Error` 错误码；写成功与拒绝两个 example。
- [ ] `OpenApiTest` 断言新路径存在、必填字段在 `required`、状态枚举为小写。

**验证：** `npm run lint:api`；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`
**覆盖：** 全部需求的输入/输出字段来源

### T2 [backend] 迁移与演示数据

- [ ] `V3__create_demo_users.sql`：3 个演示账户（显式 id 1..3）。
- [ ] `V4__seed_demo_trips.sql`：6 条行程（2 条 `completed_at` 非空、3 条招募中、1 条已满员），覆盖 8 个目的地中的 4 个与多组标签。
- [ ] `DatabaseTripPlanRepositorySqliteTest` 用临时 SQLite 文件库跑同一组迁移，断言种子数量与状态投影。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=DatabaseTripPlanRepositorySqliteTest test`
**覆盖：** R2 默认列表、R5 状态展示、R6 已结束

### T3 [backend] 模型、仓储与查询

- [ ] `TripPlan` / `DemoUser` 领域 record，`status` 按 `completed_at` / `joined_count` / `capacity` 投影。
- [ ] `TripPlanRepository`、`UserRepository` 与行对象（行对象不出 `dao`）。
- [ ] `TripQuery` 与筛选/排序：`q` 跨标题/目的地/途经点/标签/发布者昵称、`destination` 精确、日期交集、`tags` 任一命中、`sort=date|new`。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=TripPlanRepositoryTest,TripQueryServiceTest test`
**覆盖：** R2 浏览、R3 搜索/筛选/排序

### T4 [backend] 发布与校验

- [ ] `TripCreateRequest` + `TripPlan.create` 工厂校验：标题 ≤ 40、途经点 ≥ 2、人数 2–12、结束不早于出发、预算下限 ≤ 上限、标签 ≤ 5。
- [ ] `POST /trips` 返回 201 与详情；`joined_count` 初始为 1；缺失/非法返回 400 `INVALID_INPUT`。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=TripControllerTest test`
**覆盖：** R4 的 8 个场景

### T5 [backend] 列表、详情与身份解析

- [ ] `GET /users` 返回 3 个演示账户。
- [ ] `GET /trips` 只返回未结束行程，应用 T3 的筛选/排序；`X-User-Id` 缺失/未知返回 401 `DEMO_USER_REQUIRED`。
- [ ] `GET /trips/{id}` 返回行程 + 发布者 + 当前同行者（MVP 仅发布者）；不存在返回 404。
- [ ] 统一异常处理器映射 400/401/403/404/409。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=TripControllerTest,DemoUserControllerTest test`
**覆盖：** R1 身份、R2 卡片数据、R5 详情与状态

### T6 [backend] 结束行程

- [ ] `POST /trips/{id}/complete`：发布者写 `completed_at`，返回 200；非发布者 403 `FORBIDDEN`；已结束 409 `TRIP_NOT_OPEN`；不存在 404。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=TripControllerTest#complete* test`
**覆盖：** R6 的 3 个场景

### T7 [frontend] 契约类型、请求层、路由与身份门

- [ ] `types.ts` 增加契约类型（字段保持 snake_case）；`api.ts` 增加 5 个请求函数，错误按 `code` 原值抛出。
- [ ] `route.ts` 纯函数解析 `#/`、`#/trips/new`、`#/trips/{id}`；单元测试覆盖未知路由回退。
- [ ] `IdentityGate` 展示 3 个账户；选择后写 localStorage，请求带 `X-User-Id`；顶栏可切换。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** R1 的 2 个场景

### T8 [frontend] 首页列表、筛选与空状态

- [ ] 卡片渲染 8 个字段，状态用文字 + 颜色。
- [ ] `tripFilters.ts` 纯函数实现搜索/目的地/日期区间/标签/排序，Vitest 覆盖边界。
- [ ] 筛选栏含清除入口；无结果空状态保留条件并给「去发布行程」引导；加载中骨架。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R2 浏览、R3 搜索/筛选/排序

### T9 [frontend] 发布表单

- [ ] 字段级校验与 `spec.md` §发布约束一致；必填/日期/途经点/人数/预算错误就地提示。
- [ ] 提交成功后跳转详情；失败按契约 `code` 提示。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R4 的 8 个场景

### T10 [frontend] 详情、状态与入口可见性

- [ ] 详情展示途经点、日期、人数、发布者资料与兴趣、当前同行者、状态徽标。
- [ ] 申请入口仅在招募中且未满员且非本人时可用（提交行为不实现）。
- [ ] 已结束行程展示游后分享区占位；发布者可见「标记为已结束」入口。

**验证：** `cd RouteME/frontend; npm test; npm run build`
**覆盖：** R5 的 4 个场景、R6 标记入口

### T11 [e2e] 端到端验收

- [ ] 身份门 → 首页筛选 → 详情；发布 → 首页出现 → 详情；发布者结束行程 → 列表消失。
- [ ] 反向：无编辑/删除/取消入口、无注册入口、非发布者无结束入口、默认列表无已结束。
- [ ] 新记录用唯一标题前缀并按标题筛选，不假设列表顺序。

**验证：** 后端已启动后 `npx playwright test`
**覆盖：** R1/R2/R5/R6 的用户路径与 Non-goals 反向检查

### T12 [docs] 知识库与文档

- [ ] `docs/knowledge/architecture`、`interfaces`、`domain` 补 RouteME 的行程能力、接口与术语（替换仍以 staffing 为主的描述）。
- [ ] `requirement-workspace/registry.md` 更新 REQ-002 状态与 change 进度。

**验证：** 相对链接可点开、术语与 `spec.md` 一致
**覆盖：** 文档交付

### T13 [verify] 全量验证与报告

- [ ] 跑完 `npm run lint:api`、`.\mvnw.cmd -B verify`、`npm run build`、`npm test`、`npx playwright test`。
- [ ] 写验证报告（真实命令 + 输出摘要），贴入 PR/变更摘要。

**验证：** 上述命令全绿
**覆盖：** 全部验收场景

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | 结果 | 证据 |
|---|---|---|
| 每条 Requirement 都有任务覆盖 | Pass | R1→T7/T11；R2→T5/T8；R3→T3/T8；R4→T1/T4/T9；R5→T5/T10；R6→T6/T10/T11 |
| Design 的约束都能被任务实现 | Pass | 状态投影→T3；校验约束→T4；错误码→T5/T6；路由→T7；迁移编号→T2 |
| ATDD 的 API / E2E 层都有任务 | Pass | API→T3–T6；E2E→T11；UT 推迟到 apply，对应 T3/T8/T9 的单元测试 |
| 一条任务只落一层 | Pass | 每条形如 `[contract]` / `[backend]` / `[frontend]` / `[e2e]` / `[docs]` |
| 契约任务先于两端 | Pass | T1 在 T2–T10 之前 |
| 任务不回退规格或设计 | Pass | 未新增未在 spec/design 出现的能力；原型额外项留在 Out of scope |

**自检结论：Pass**。可进入 `/sdd:quality-checklist`（P3）与 `/sdd:atdd-apply`（P4）。