# proposal 评审报告 — add-admin-dashboard

- **工件：** `openspec/changes/add-admin-dashboard/proposal.md`（rev1）
- **change-id：** `add-admin-dashboard`
- **需求条目：** `requirement-workspace/requirements/REQ-023-admin-dashboard.md`（REQ-023 / S25）
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`、`@rule:git-branching-and-pr`；基线 `main@b50e416`，与 `origin/main` 同步）
- **评审输入：** 提案正文；`requirement-workspace/requirements/REQ-023-admin-dashboard.md`、`intents/REQ-023-admin-dashboard.md`、`stories/add-admin-dashboard.story.md`、`stories.md`、`registry.md`；Delta `openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md`；既有能力 `openspec/changes/add-admin-console/specs/admin-console/spec.md`（未归档）；源码 `RouteME/backend/.../controller/Admin{User,Report,Service}Controller.java`、`service/{AdminPrincipalService,AccountStatusService}.java`、`pojo/TripPlan.java`、`entity/TripPlanEntity.java`、`enums/{TripStatusEnum,ApplicationStatusEnum,AccountStatusEnum,AccountRoleEnum}.java`、`db/migration/{V3,V4,V5,V7,V8,V21,V24}*.sql`；前端 `RouteME/frontend/src/{route.ts,App.tsx,shell/AppShell.tsx,admin/AdminLayout.tsx,admin/AdminGuard.tsx,i18n/adminMessages.ts}`；`RouteME/openapi.yaml` 0.17.0（`BearerToken` 参数、`/admin/**` 响应）
- **工具校验：** `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`（无 WARNING）；`openspec show add-admin-dashboard --json --deltas-only` → `deltaCount: 5`；`git status` 确认本 change 只新增 `openspec/changes/add-admin-dashboard/`、`docs/sdd/add-admin-dashboard/`、`docs/reviews/` 与需求 / 故事 / 登记文件，未新增迁移或实现代码

## 评审结论

**Pass**（BLOCKER 0 / WARNING 3（全部当场修正）/ SUGGESTION 2（1 修正、1 保留说明））

提案六段完整：Why 用后台入口、路由、导航与控制器四处源码证据说明「能处理但不能看见」；What Changes 按六组指标逐条落点，并附「六组指标口径」表把总数与分桶关系写成可核对约束；故事映射给出「页面 + 契约 + 一次聚合」的垂直切片；影响面覆盖契约、控制器、服务、响应 DTO、四个前端文件与测试，并明确「无迁移」；16 项决策全部给出选择与理由；12 条验收信号把静态校验与动态验证分开；11 项残余风险逐条配处理方式；归档顺序声明 `add-admin-console` 必须先归档。capability 类型与 Delta 实际结构一致（`admin-dashboard` ADDED 5，合计 5 = `deltaCount`）。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| P1-01 | WARNING | `@rule:api-contract` | 影响面·逐文件改动 `openapi.yaml` 行 | 初稿写「`X-User-Id` + 管理员校验」，但既有 `/admin/**` 已统一使用 `Authorization: Bearer`（`BearerToken` 参数）与 `AdminPrincipalService`；照初稿实现会新增一套与既有后台不一致的鉴权写法 | 改为「复用 `BearerToken` 参数与管理员权限校验」，并补 `generatedAt` | `openapi.yaml:1623-1690`、`:2222-2228`；`AdminPrincipalService.java:30-43` | **已修** |
| P1-02 | WARNING | `@rule:api-contract` | 残余风险第 6 行 | 初稿沿用旧结论「管理员身份建立在可伪造的 `X-User-Id` 上」，与现状不符：管理端已解析 Bearer 会话、按请求读库校验 `role` 与账号状态 | 改为「沿用既有登录会话；缺 MFA / 二次认证 / 操作审计」，并说明只读端点的泄露面 | `AdminPrincipalService.java:13-16`、`:30-43`；`AuthController.java:36-57` | **已修** |
| P1-03 | WARNING | `@rule:sdd-artifacts` | 「六组指标口径」表·举报 / 客服会话 | 初稿这两组只有 `byStatus`，但 Delta「总数与分桶自洽」要求「举报与会话的总数各自等于分桶之和」；响应里没有 `total` 就无法断言 | 两组各补 `total` 行，并把「四态之和 / 三态之和等于 `total`」写进口径 | Delta `admin-dashboard`「概览计数结构与零填充」「概览统计的账号与行程口径」 | **已修**（提案表与 Delta 同步） |
| P1-04 | SUGGESTION | `@rule:web-testing` | 验收信号 11–12 | 初稿把 `openspec validate`、`openapi` lint 与后端 / 前端测试压成一条，执行时容易只跑 validate 就宣布达标 | 拆为「静态校验」（validate + deltaCount + lint）与「动态验证」（后端、前端、E2E 与关键断言） | 既有 `add-admin-console` 评审 P1-03 的同类修正 | **已修** |
| P1-05 | SUGGESTION | `@rule:sdd-artifacts` | 影响面·`AdminDashboardResponse` 行；`openapi.yaml` 行 | 页面要求展示「最近更新时间」，但初稿只写响应 DTO「六组嵌套计数」，未点名时间字段 | 在响应 DTO 与 schema 两处标明 `generatedAt`；Delta 同步 | Delta「概览计数结构与零填充」 | **已修** |

**Counts：** BLOCKER 0 / WARNING 3（全部已修）/ SUGGESTION 2（1 已修、1 保留说明）→ **Pass**

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| 六段是否齐全（问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险） | Pass：六段齐全，另有故事映射、六组指标口径与交付边界 |
| capability 名称与类型是否与 Delta 一致 | Pass：`admin-dashboard`（ADDED 5 Requirement），合计 5 = `deltaCount: 5` |
| 是否越界定义实现细节 | Pass：只写端点、响应组、状态桶与页面落点；未写类方法签名或 SQL；控制器 / 服务文件名标注「P4 规划」，仓库内未创建 |
| 是否与 Living Spec 冲突 | Pass：本 change 不 MODIFIED 任何既有能力；`admin-console` 尚未归档，提案把「先归档」写成显式前置条件 |
| 依赖与归档顺序是否可执行 | Pass：`add-admin-console` 提供 `role` / `status` / Bearer 管理员校验 / `AdminGuard` / `AdminLayout`；本 change 只读复用 |
| 契约 / 迁移编号是否冲突 | Pass：现仓 0.17.0，本 change 预约 0.18.0；0.14.0 / 0.15.0 / 0.16.0 为在途 change 声明，不冲突；无迁移，不占用 V25，也不触碰 V20–V24 |
| 是否落在服务端权限 | Pass：端点复用服务端 `role=ADMIN` + 账号状态校验；前端只做入口隐藏与不发请求，不作为安全边界 |
| 隐私边界 | Pass：响应只有计数；明确禁止昵称、邮箱、头像；页面只展示聚合数字，`@rule:pii-scrubbing` 无新增暴露面 |
| 故事覆盖 | Pass：S25 的 13 条 AC 全部映射到 Delta 的 13 个场景；「页面 + 契约 + 一次聚合」垂直切片成立 |
| 指标口径是否自洽 | Pass：用户 / 行程 / 申请 / 举报 / 会话均有 `total` 与分桶求和约束；新增只给用户 / 行程 / 体验，与用户裁决一致 |
| 时间与状态口径是否可判定 | Pass：封禁到期按有效状态、行程复用既有推导、窗口按 Asia/Shanghai 自然日含当天；均有对应场景 |
| 是否与 `@rule:web-testing` 一致 | Pass：后端聚合单测 + 控制器权限测试、前端单测 + 1 个 E2E spec；未把验证降级为手工走查 |
| 是否触碰并行会话 WIP | Pass：未修改 `profile.spec.ts`、`App.tsx`、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx` 的在途改动（其中三处已列为 P4 需重新取基线的文件） |

## 残余风险

- **`docs/sdd/README.md` 变更索引有历史缺行。** `add-admin-console`、`refine-trip-chat`、`add-user-profiles` 未出现在索引表中（早于本次）。本 change 只补自己的行，未擅自改动他 change 的记录；建议由索引维护者另行补齐。
- **有效状态与持久化状态可能短暂不一致。** 封禁到期只在读取时按 `ACTIVE` 计，库内仍为 `BANNED`；概览是只读的，不会写回。P4 需用固定 `Clock` 覆盖到期前 / 后，并在验证记录登记「概览与治理页同口径」。
- **六组聚合随数据增长变慢。** 当前为演示规模；提案已声明不缓存。P3 需给出查询条数上限，真实增长后另开需求做快照 / 缓存。
- **时间窗口依赖字符串 `created_at`。** 六表均为 ISO-8601 `Z` 字符串；P3 需明确解析与截断方式，P4 覆盖 00:00 边界。
- **`add-admin-console` 未归档。** 若它先被修改，本 change 的权限与布局假设需要复核；归档顺序已写入提案。
- **E2E 未纳入 CI。** 与既有 change 一致，本地执行 `admin-dashboard.spec.ts`；CI 以构建与单测为准。

## 下一步（非 Gate）

- 收集 `proposal.md` 的 WAYNE 签署与本报告的两处签署（WAYNE + Jacky）。
- 签齐后进入 P2：AC/DoV 复核、`consistency-lint` 与 G1 记录。
- P3：`design.md` 落聚合查询边界、时区/`Clock` 策略、卡片与三档布局；`atdd-design.md` + `tasks.md`。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `proposal.md` | 工件 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（SA） | 2026-11-17 | 已批准 |

> 按 `@rule:artifact-review-gate`，`proposal` 由 WAYNE 签署，评审报告由 WAYNE + 当前开发者（Jacky）签署；三处于 2026-11-17 按发起人确认签齐，P2 解锁。