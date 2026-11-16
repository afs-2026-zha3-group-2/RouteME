# Impact brief — REQ-002 / 003 / 004（MVP 业务能力集）

- **Workdir：** `requirement-workspace/`
- **日期：** 2026-11-15 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（能力 / 页面 / 集成边界），非代码设计

## 1. Requirement set

| id | 能力 | change | 条目路径 |
|---|---|---|---|
| REQ-002 | `trip-plans` | `add-trip-plans` | `requirement-workspace/requirements/REQ-002-trip-plans.md` |
| REQ-003 | `trip-companions` | `add-trip-companions` | `requirement-workspace/requirements/REQ-003-trip-companions.md` |
| REQ-004 | `trip-experiences` | `add-trip-experiences` | `requirement-workspace/requirements/REQ-004-trip-experiences.md` |

意图捕获：`requirement-workspace/intents/REQ-00{2,3,4}-*.md`；deep-dive：`requirement-workspace/deep-dive.md`。

## 2. As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec 树 | `openspec/specs/hello-world/spec.md` | 仅 `hello-world`（脚手架验收：首页展示数据库问候语 + CI 独立验证），无业务能力 |
| 已归档 SDD 资产 | `openspec/changes/archive/2026-11-15-bootstrap-hello-world/` | REQ-001 bootstrap 已归档（proposal/design/tasks/spec delta） |
| 进行中的 change | `openspec/changes/add-trip-plans/proposal.md` | 空壳（仅占位，待本次 P1 回填业务提案） |
| 知识库 | `docs/knowledge/`（architecture/domain/interfaces/operations/rules） | 含 RouteME 应用拓扑与本地启动说明、规则治理；domain 目前为 shared 占位 |
| P0 基线日志 | `docs/ai4se-plugins/20261115-*` | repo-understand / bootstrap / rules-govern / quality-checklist(p0) 记录齐全 |
| 业务素材 | `records/discussion/2026-11-13/RouteMe_MVP_完整闭环_中文.md`（+ EN/产品意图） | MVP 权威来源，范围已冻结 |
| 需求工作区 | `requirement-workspace/{README,handoff,registry}.md` | registry 仅登记 REQ-001；intents/requirements 本次重建 |

无缺失的权威树；未新造竞争性 authority root。

## 3. As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/`（Living Spec） | 只有 `hello-world` | 三个 change 落地后将新增 `trip-plans`/`trip-companions`/`trip-experiences` 三条 living capability（归档时生成，P1 阶段仅产出 change delta，不直接写 living spec） |
| `openspec/changes/add-trip-plans/` | proposal.md 空壳 | 回填业务提案 + `specs/trip-plans/spec.md`（ADDED 业务场景） |
| `openspec/changes/add-trip-companions/` | 不存在 | 新建 change：proposal + `specs/trip-companions/spec.md`（ADDED） |
| `openspec/changes/add-trip-experiences/` | 不存在 | 新建 change：proposal + `specs/trip-experiences/spec.md`（ADDED） |
| `hello-world`（Living Spec） | 首页展示问候语 | checked, no direct impact —— 首页语义演进为灵感首页属 `trip-plans` 变更；`hello-world` 脚手架验收能力保留不动 |
| `requirement-workspace/registry.md` | 仅 REQ-001 | 新增 REQ-002/003/004 登记行（status=drafted，映射三个 change） |
| `requirement-workspace/handoff.md` | 通用说明 | 补 REQ→change 映射行 |
| `TODO.md` | 仅 REQ-001 业务描述 | 补 REQ-002/003/004 业务清单（业务语言，不含开发任务） |
| `docs/knowledge/domain/` | shared 占位 | checked, no impact at P1 —— 领域知识回写属实现/归档阶段（dev/archive），BA P1 不改 KB |

## 4. Blast radius（应用架构）

- **新增能力（3）：** `trip-plans`、`trip-companions`、`trip-experiences`。
- **受影响页面（业务）：** 演示用户选择页、旅行灵感首页、发布行程页、行程详情页、同行申请页、我的旅行页、聊天页、游后分享页（闭环文档 §6 的 8 页面全部落在本需求集内）。
- **跨能力集成边界：**
  - `trip-companions` 消费 `trip-plans` 的行程/状态/兴趣标签，并**回写**行程状态（招募中 → 已满员）。
  - `trip-experiences` 消费 `trip-plans` 展示位（详情页/首页）与 `trip-companions` 的「已结束 + 参加过」判定；「参考此行程发布」回流到 `trip-plans` 发布表单。
- **依赖上游：** 全部建立在 REQ-001 `hello-world` 已验证的端到端骨架之上（无骨架改动）。
- **数据所有权：** 行程归 `trip-plans`；申请/同行关系/消息归 `trip-companions`；体验归 `trip-experiences`（deep-dive ① / ③）。

## 5. Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | 新增 3 份 `openspec/changes/add-trip-*/specs/<capability>/spec.md`（业务场景，Given/When/Then 纯业务语言） |
| Proposal | 回填/新增 3 份 `proposal.md`（业务语言，引用 REQ id 与 impact 要点、含 effort/size 注记） |
| Living Spec | 归档阶段生成 `openspec/specs/trip-plans|trip-companions|trip-experiences/spec.md`（非 P1 产物） |
| Registry / handoff / TODO | 登记 REQ-002/003/004，恢复业务清单 |
| Tests / 代码 / 契约 / 迁移 / design.md / tasks.md | **不在 BA P1 范围** —— 交 dev（P2 起：delta-craft/design/task-plan/apply）；本 brief 不产出这些 |
| KB (`docs/knowledge/`) | P1 不改；领域/接口回写属 dev 实现与归档阶段 |

## 6. Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 三个 change 一对一三个 capability，满足「一个 change 只改一个 capability」铁律；proposal + delta spec 已足以进入 `/sdd:delta-craft`（P2）。
- **Agile 轨（可选并行）：** 若团队走故事拆分，US-01~US-06（闭环文档 §7）天然映射：US-01/02/03→REQ-002，US-04/05→REQ-003，US-06→REQ-004；`/sdd:story-split` 可直接消费本需求条目。
- 两轨共用同一 requirement 条目与 impact brief，无需重复作者化。

## 7. Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | REQ-003 场景数 >6（17 条），单 change 偏大 | 保持一个 capability change（避免水平技术切片），在 §8 给出内部两阶段（匹配+申请 / 沟通+安全）供 dev 排期；不影响 P1 通过 |
| Risk | 多处降级路径（匹配百分比、聊天→留言区、图片、参考发布后端） | 降级边界已在 deep-dive ② 枚举为 in-scope 分支，spec 以「不阻断主价值」表述，dev 可按 §13 削减顺序取舍 |
| Risk | 跨能力状态回写（trip-companions 改 trip-plans 状态） | 已在 deep-dive ③ 指定 anchor=REQ-002，状态机单一权威，避免双写歧义 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0、A0 ⑨–⑫ 全过；无使需求失效的未知依赖 |

## 8. Suggested split boundaries（供 proposal-split / story-split）

- **一 REQ 一 change 一 capability（已定）：**
  - `add-trip-plans` ← REQ-002（迭代 1：灵感与发布）
  - `add-trip-companions` ← REQ-003（迭代 2–3：发现与连接 + 沟通）
  - `add-trip-experiences` ← REQ-004（迭代 3：分享与参考发布）
- **依赖 / 阶段排序（轻 DAG）：** REQ-002 → REQ-003 → REQ-004（线性依赖：行程池 → 同行连接 → 游后分享回流）。REQ-002 为 Phase 1 起点，无并行上游。
- **REQ-003 内部阶段建议（不拆 change）：** 阶段 A「匹配 + 申请 + 人数联动 + 我的旅行」；阶段 B「聊天 + 退出/举报/安全提示」。两阶段同属 `trip-companions`，可增量交付。
- **共享契约优先：** 行程状态机与「参加过」判定由 anchor REQ 冻结（REQ-002 / REQ-003），下游仅消费，避免返工。
- **质量自检（split-heuristics）：** 三个 change 均为垂直切片、端到端可验证（演示脚本 §11 逐步覆盖）、可独立运行、capability 名真实、无依赖环。

---

# Impact brief 增补 — REQ-005（浏览者查看发布者公开资料）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ = 0，DoR BLOCKER = 0）
- **粒度：** 应用架构（能力 / 页面 / 集成边界），非代码设计

## 1. Requirement set

| id | 能力 | change（候选） | 条目路径 |
|---|---|---|---|
| REQ-005 | `user-profiles`（ADDED） | `add-user-profiles` | `requirement-workspace/requirements/REQ-005-publisher-profile.md` |

意图捕获：`requirement-workspace/intents/REQ-005-publisher-profile.md`。

## 2. As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec 树 | `openspec/specs/{trip-plans,trip-companions,trip-experiences,design-system}/spec.md` | 已有四业务能力；**无 `user-profiles`**；`user-auth` 仍为活动 change（未归档）。`trip-plans` 定义详情页展示发布者资料与兴趣，`trip-companions` 定义隐私红线与举报回执，`trip-experiences` 展示体验作者昵称 |
| 已归档 SDD 资产 | `openspec/changes/archive/2026-11-15-add-trip-*/`、`2026-11-16-add-paged-lists-mybatis-plus/`、`2026-11-16-apply-prototype-visual-design/` | 已归档 change 的 proposal/design/tasks/spec delta 齐全；可参考其「展示触点由新能力 spec 拥有」的先例 |
| 知识库-架构 | `docs/knowledge/architecture/README.md`（RouteME 应用拓扑 2026-11-13 起） | RouteME 分层、包结构、`X-User-Id` 演示身份与注册/登录、前端目录与设计令牌；文件顶部对 staffing 的作废声明不适用于 RouteME 段 |
| 知识库-接口 | `docs/knowledge/interfaces/README.md`（RouteME 段） | 现有 `GET /users` 返回全部账户，`GET /users/demo` 仅演示账户；已有 `/auth/*`；无单用户资料/统计接口 |
| 知识库-安全 | `docs/knowledge/rules/security/rules.md#pii-scrubbing` | 隐私字段红线（电话/证件/精确住址） |
| 契约 | `RouteME/openapi.yaml`（`info.version: 0.6.0`） | `DemoUser` 字段为 id/nickname/avatar_initial/school/bio/interests；`GET /users` 返回全部账户，`GET /users/demo` 仅演示账户；已有 `/auth/register|login|me|logout`；无 profile 端点 |
| 后端用户 | `RouteME/backend/.../DemoUserController.java`、`DemoUserResponse.java`、`UserEntity.java`、`V3__create_demo_users.sql`、`V9__add_user_credentials.sql`、`AuthServiceImpl.java` | `GET /users` 返回全部账户、`/users/demo` 仅演示账户；`app_users` 含 `created_at` 与 `username`/`password_hash`；注册账户由 `AuthServiceImpl` 创建并写入 `created_at`；`school` 当前值形如「大三 · 视觉传达」 |
| 后端聚合先例 | `RouteME/backend/.../MyTripsServiceImpl.java` | 纯聚合服务（不拥有表）消费 `TripPlanService`/`ApplicationService`，可作为统计聚合的实现参照 |
| 前端行程展示 | `RouteME/frontend/src/trips/TripCard.tsx`、`TripDetailPage.tsx`、`types.ts`、`api.ts` | 卡片展示发布者昵称/头像；详情页展示发布者简介与兴趣；均无资料弹窗；`TripCard` 整体是 `<a>` |
| 前端壳层 | `RouteME/frontend/src/shell/`、`styles.css`、`theme.ts` | 已有 Avatar、主题令牌、Ant Design `ConfigProvider`；无通用 Modal 组件（现有 `safety/ReportModal` 可参考） |
| 测试 | `backend/.../migration/DemoDataMigrationSqliteTest.java`、`AuthMigrationSqliteTest.java`；`e2e/tests/trips.spec.ts`；前端 `identity/authForm.test.ts` | 两个迁移测试均硬编码「3 个用户」（DemoData 还固定「6 条行程」）；E2E 身份门用例标题为「three demo accounts」，且断言不出现注册/找回密码入口 |

无缺失的权威树；未新造竞争性 authority root。

## 3. As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/`（Living Spec） | 无 `user-profiles` | change 归档后新增 `openspec/specs/user-profiles/spec.md`；P1/P2 阶段只产出 change delta，不直接写 Living Spec |
| `openspec/changes/add-user-profiles/` | 不存在 | 新建 change：`proposal.md` + `specs/user-profiles/spec.md`（ADDED） |
| `trip-plans`（Living Spec） | 详情页展示发布者资料；卡片展示发布者昵称 | **不新增 trip-plans delta**：资料弹窗与双入口属新能力 `user-profiles` 的展示约定；行程业务规则与接口契约不变（沿用 REQ-004「展示触点由新能力 spec 拥有」先例） |
| `trip-companions` / `trip-experiences` | 已定义隐私红线与作者展示 | checked, no direct impact —— 仅作为统计口径的只读数据源；规则不变 |
| `openapi.yaml` | 0.6.0；有 `GET /users`、`GET /users/demo` 与 `/auth/*` | 0.7.0：新增 `GET /users/{id}/profile` 与 `UserProfile` schema（公开资料 + 四项统计 + joined_at）；`DemoUser` 保持兼容不改；响应 MUST NOT 含 username/password_hash |
| 后端 | `DemoUserController` 仅账户列表；已有 `user-auth` 登录/注册；无统计聚合 | 新增单用户公开资料读取端点与只读聚合服务（参照 `MyTripsService` 不拥有表）；复用 `UserMapper` 与现有行程/申请/体验查询；MUST 同时支持演示账户与注册账户，且不返回账户凭据 |
| 数据库 | V1–V9（V9 = 用户凭证与 auth_sessions）；3 个演示用户、6 条行程 | 追加 V10（只增不改，V9 已被 user-auth 占用）：新增 1 个非学生演示用户（「上班族 · 互联网行业 · INFP」，username/password_hash 为 NULL）与 1 条由其发布的招募中行程（用于从卡片/详情入口验收非学生资料） |
| 前端 | 卡片/详情无资料弹窗；身份门已含演示身份与注册/登录面板 | 新增资料弹窗组件与加载 hook；`TripCard` 发布者区域可点击且不触发卡片跳转；`TripDetailPage` 发布者卡片可点击；文案与样式按原型 S02 + 现有令牌；弹窗对演示会话与注册会话一致 |
| 测试 | 迁移测试固定人数/行程数；E2E 身份门标题为 three | 同步更新 `DemoDataMigrationSqliteTest` 与 `AuthMigrationSqliteTest` 的计数；E2E 身份门标题与断言补第 4 个用户；新增资料弹窗 API/组件/E2E 用例 |
| `requirement-workspace/registry.md` | 仅 REQ-001–004 | 新增 REQ-005 登记行（drafted → verified 按 Gate 推进） |
| `requirement-workspace/handoff.md` | REQ-002–004 映射 | 补 REQ-005 → `add-user-profiles` 映射 |
| `TODO.md` | 已有 REQ-001–004 业务清单 | 补 REQ-005 业务描述（业务语言，不含开发任务） |
| `docs/knowledge/` | RouteME 架构/接口段落后于新端点 | P1 不改；归档阶段回写 `interfaces/README.md` 与 `architecture/README.md` |

## 4. Blast radius（应用架构）

- **新增能力：** `user-profiles`（只读：单用户公开资料 + 四项统计）。
- **受影响页面：** 旅行灵感首页（卡片发布者区域）、行程详情页（发布者卡片）、我的旅行（复用 `TripCard` 的发布者区域）、资料弹窗（新）。
- **跨能力集成边界：** 只读消费 `trip-plans`（发布/结束行程）、`trip-companions`（已接受申请）、`trip-experiences`（作者体验），以及 `user-auth` 提供的演示/注册身份；不写任何业务状态。
- **数据所有权不变：** 用户资料与账户凭据仍归 `app_users` / `user-auth`；行程/申请/体验归各自能力；`user-profiles` 只聚合公开字段。
- **演示数据副作用：** 新增第 4 个用户与其行程会进入身份门、首页列表与匹配候选，属预期演示变更。
- **身份边界：** 沿用现有进入方式（演示 `X-User-Id` 或注册账户登录会话）；资料读取为只读，不新增权限体系。

## 5. Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | 新增 `openspec/changes/add-user-profiles/specs/user-profiles/spec.md`（双入口、展示字段、共同兴趣、统计口径、隐私边界、自我查看、异常） |
| Proposal | 新增 `proposal.md`（引用 REQ-005 与本次 impact 要点；含 effort/size 注记） |
| 契约 | `openapi.yaml` 版本 0.6.0 → 0.7.0；新增 profile 端点与 schema；`redocly lint`/`OpenApiTest` 需通过 |
| 后端 | 新增 controller 方法/response/只读聚合 service；V10 迁移；单元/控制器/迁移测试 |
| 前端 | 新增资料弹窗组件、api/types、i18n 文案、样式；卡片与详情页入口改造；组件/纯函数测试 |
| E2E | 新增卡片入口、详情入口、隐私字段缺席、自我查看用例；更新身份门标题与断言 |
| 文档 | P1 仅本 brief 与需求条目；`docs/knowledge/` 与 `interfaces/README.md` 归档阶段回写 |

## 6. Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 一个 change 只改一个能力 `user-profiles`；卡片/详情入口的展示约定写在该能力的 delta spec 中，不拆 trip-plans delta。
- **Agile 轨（可选）：** 可作为单条故事「浏览者查看发布者公开资料」；若需拆分，建议按入口（卡片 / 详情）拆两条，但共用同一弹窗与接口，不建议拆成前后端水平切片。
- 两轨共用 REQ-005 与本节 impact。

## 7. Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 新增演示用户/行程会改变种子数据计数 | `DemoDataMigrationSqliteTest`、`AuthMigrationSqliteTest` 与 E2E 身份门标题需同批更新；避免只改迁移导致 CI 红 |
| Risk | 公开资料容易误带账户凭据 | 响应与弹窗均只使用公开字段；`username`/`password_hash`/会话令牌不得出现在 profile 契约与 UI 中 |
| Risk | 身份模式已分叉为演示账户与注册账户 | 资料读取沿用现有身份进入方式，不新增权限体系；后端需同时支持 `X-User-Id` 与登录会话，验收覆盖两类账户 |
| Risk | `TripCard` 整体是 `<a>`，发布者区域内嵌交互元素 | 需重构卡片点击结构，避免嵌套 `<a>/<button>`；发布者点击必须阻止卡片跳转，并保留键盘可达性 |
| Risk | 统计为请求时实时聚合 | MVP 数据量小可接受；不引入缓存，避免与行程/申请/体验状态不一致 |
| Risk | 隐私文案与原型原文不一致 | 已确认按实际展示字段调整；验收时以调整后的文案为准，原型原文不作为实现依据 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0；无使需求失效的未知依赖 |

## 8. Suggested split boundaries（供 proposal-split / story-split）

- **一 REQ 一 change 一 capability：** `add-user-profiles` ← REQ-005（`user-profiles`）。
- **依赖 / 阶段排序：** 无上游新依赖；与后续 change 的共享文件冲突点是 `TripCard.tsx` 与 `styles.css`，排期时避免并行修改同一文件。
- **契约优先：** 先冻结 `GET /users/{id}/profile` 响应形状（公开字段 + 四项统计 + joined_at），再并行后端聚合与前端弹窗。
- **质量自检（split-heuristics）：** 垂直切片、端到端可验证（卡片入口 → 弹窗 → 关闭）、可独立运行、capability 名真实、无依赖环。
