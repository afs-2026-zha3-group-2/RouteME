# proposal 评审报告 — add-admin-console

- **工件：** `openspec/changes/add-admin-console/proposal.md`（rev1）
- **change-id：** `add-admin-console`
- **需求条目：** `requirement-workspace/requirements/REQ-018-admin-console.md`（REQ-018 / S19–S24）
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`、`@rule:git-branching-and-pr`；基线 `main@c948b1b`，与 `origin/main` 同步）
- **评审输入：** 提案正文；`requirement-workspace/requirements/REQ-018-admin-console.md`；`requirement-workspace/intents/REQ-018-admin-console.md`；`requirement-workspace/stories/add-admin-console.story.md`、`stories.md`、`registry.md`；Living Spec `openspec/specs/{user-auth,trip-companions,trip-plans,trip-experiences,design-system}/spec.md`；未归档增量 `openspec/changes/{add-user-profile,refine-safety-report}/specs/*`；`openspec/changes/add-ai-itinerary/proposal.md`（契约 0.12.0 / V18 预留）；源码 `backend/.../entity/{UserEntity,ReportEntity,ChatThreadEntity}.java`、`controller/{ReportController,AuthController}.java`、`request/AuthRegisterRequest.java`、`service/impl/{ReportServiceImpl,DemoUserServiceImpl}.java`、`db/migration/{V3,V6,V7,V9,V17}*.sql`、`test/.../OpenApiTest.java`；`frontend/src/{route.ts,App.tsx,api.ts,chat/ChatPage.tsx,chat/chatPolling.ts,shell/AppShell.tsx,mine/MyTripsPage.tsx}`；`openapi.yaml` 0.11.0；`e2e/tests/*.spec.ts`；`SqlLite/routeme.db`
- **工具校验：** `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`（无 WARNING）；`openspec show add-admin-console --json` → `deltaCount: 14`；`git status` 确认本 change 只新增 `openspec/changes/add-admin-console/`、`docs/sdd/add-admin-console/`、`requirements/intents/stories` 记录，未创建 V19 迁移或任何实现代码

## 评审结论

**Pass**（BLOCKER 0 / WARNING 2（全部收口：1 已修、1 经发起人裁决维持现状）/ SUGGESTION 2（均已修））

提案六段完整：Why 用全仓零命中与两份实体/迁移证据说明「没有管理员、没有账号状态、举报不处置」；What Changes 按 6 条故事逐能力落点；影响面覆盖迁移、契约、枚举、控制器、服务、守卫、前端 7 个页面与测试；19 项决策全部给出选择与理由；12 条验收信号可观察；残余风险逐条配处理方式；归档顺序声明了 `add-user-profile`、`refine-safety-report` 与 `add-ai-itinerary` 三处前置/避让关系。capability 类型与 Delta 实际结构一致（`admin-console` ADDED 9、`customer-service` ADDED 4、`user-auth` MODIFIED 1，共 14 = `deltaCount`）。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| P1-01 | WARNING | `@rule:sdd-artifacts` | 影响面表 V19 行 | 只写「加列 + 建表 + 种子账号」，未写既有数据回填。`app_users` 现有 369 行、`reports` 现有 13 行；新增 `role / status` 为 `NOT NULL` 或按状态筛选时，缺省回填会让存量用户状态为空、存量举报不出现在任何状态筛选里 | 在 V19 行补：既有用户回填 `role='USER'` / `status='ACTIVE'` / `email=NULL`；既有 13 条举报回填 `status='PENDING'` | `SqlLite/routeme.db`（369/110/13/6/13）；`V3__create_demo_users.sql`、`V7__create_reports.sql` | **已修**（影响面行已补回填口径） |
| P1-02 | WARNING | `@rule:spec-first` | 决策表「封禁口径」「客服会话」；残余风险 | `BANNED` 被定义为「拒绝全部业务写操作（含举报与客服消息）」，同时「不提供申诉流程」。结果是被封禁用户没有任何求助/申诉通道，只能等到解封时间；而 S23 的立故事由恰好是「遇到账号问题找人工客服」 | 已请发起人裁决：维持「拒绝全部业务写操作」，并把该缺口登记为残余风险 + P4 验证记录边界，另开需求再补申诉通道 | 提案「决策·封禁口径」「Out of scope·申诉流程」；Delta `admin-console`「受限账号的功能边界」 | **已裁决**（发起人 2026-11-17 选择维持现状；提案决策表与残余风险已写入） |
| P1-03 | SUGGESTION | `@rule:spec-first` | 验收信号第 12 条 | 把 `openspec validate`、`openapi` lint、`mvnw test`、前端 `typecheck` / `build` / `npm test`、两个新 E2E 压成一条，执行时容易只跑 validate 就宣布达标；且未点名 E2E 必须断言 `403 ADMIN_REQUIRED`、四类写操作 403 与客服 3s 轮询 | 拆为「静态校验」与「动态验证」两条，并列出 E2E 关键断言 | 提案「验收信号」12；`e2e/tests/` 现有 10 个 spec + `support.ts` | **已修**（验收信号拆为第 12、13 条，并点名关键断言） |
| P1-04 | SUGGESTION | `@rule:artifact-review-gate` | 「影响面」/「残余风险」 | 提案声明 `ADMIN` 即客服、且不做操作审计流水；但未写明「谁在 P4 验证记录中登记该边界」，日后回溯无法区分「有意接受」与「漏做」 | 在残余风险「业务端点仍以 `X-User-Id` 识别身份」行末尾补一句：由当前开发者在 P4 验证记录与 G2 决策中显式登记；审计流水另开需求 | 提案「残余风险」第 1 行；`docs/sdd/README.md#角色名册` | **已修**（残余风险第 1 行已补登记责任） |

**Counts：** BLOCKER 0 / WARNING 2（全部收口：1 已修、1 经发起人裁决维持现状）/ SUGGESTION 2（均已修）→ **Pass**

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| 六段是否齐全（问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险） | Pass：六段齐全，另有故事映射与交付边界 |
| capability 名称与类型是否与 Delta 一致 | Pass：`admin-console`（ADDED 9）、`customer-service`（ADDED 4）、`user-auth`（MODIFIED 1），合计 14 = `deltaCount: 14` |
| 是否越界定义实现细节 | Pass：只写端点分组、枚举、守卫与页面落点，未写类方法签名或 SQL 语句；V19 / 0.13.0 只作规划，仓库内未创建文件 |
| 是否与 Living Spec 冲突 | Pass：不 MODIFIED `trip-plans` / `trip-companions` / `trip-experiences`；`user-auth` 增量以 `add-user-profile`（未归档）的「注册账号」为前置文本，只追加选填邮箱与角色固定，基线 7 个场景全部保留 |
| 归档顺序是否可执行 | Pass：① `add-user-profile`（同一 `user-auth` 需求）；② `refine-safety-report`（`trip-companions` 仍写「MVP 不要求处置闭环」）；③ `add-ai-itinerary` 的 0.12.0 / V18 避让，本 change 用 0.13.0 / V19 |
| 契约 / 迁移编号是否冲突 | Pass：现仓 `openapi.yaml` 0.11.0、Flyway head V17；0.12.0 / V18 已被 `add-ai-itinerary` 提案占用；V19 顺延无冲突 |
| 「仅管理员可访问」是否落在服务端 | Pass：决策表与 What Changes 均写明 `/api/admin/**` 服务端校验、非管理员 403 `ADMIN_REQUIRED`、前端只做入口隐藏；残余风险未把权限寄托在前端 |
| 处罚与数据保留是否自洽 | Pass：明确只改状态、无删除端点、MVP 无永久删除；与 S20 AC 逐条对应 |
| 隐私边界 | Pass：举报人只看自己的举报状态；被举报人无举报查询入口；管理员备注不下发用户端；邮箱仅管理端列表 / 详情展示 |
| 故事覆盖 | Pass：S19–S24 逐条给出「页面 + 契约 + 一次核心操作」，22 点与迭代 1/2/3 一致；6 条故事合并为一个 change 的理由（共享账号状态、举报与客服数据）成立 |
| 是否与 `@rule:web-testing` 一致 | Pass：计划含后端单测 / 控制器测试、前端单测与两个 E2E spec，未把验证降级为手工走查 |
| 是否触碰并行会话 WIP | Pass：本 change 未修改 `profile.spec.ts`、`safety-report.spec.ts`、`ReportModal.tsx`、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx`，也未使用未跟踪的 `V16__normalize_demo_user_profiles.sql` |

## 残余风险

- **本地迁移链不干净（环境，不属本 change）。** 工作区同时存在上游 `V16__add_meeting_time.sql` 与未跟踪的 `V16__normalize_demo_user_profiles.sql`，`SqlLite/routeme.db` 的 `flyway_schema_history` 已把 V16 记为后者，P4 本地启动会报 `Found more than one migration with version 16`。在 P4 开跑前必须由该 WIP 的负责人处理；本 change 的 V19 不受影响。
- **管理员身份建立在演示身份之上。** `X-User-Id` 可伪造，`role=ADMIN` 的校验只解决「谁能进后台」的授权分支，不解决身份真实性；提案已声明为既有边界，需另开需求迁移到 Bearer token。
- **客服与行程聊天共用轮询。** 复用 `CHAT_POLL_INTERVAL_MS = 3000`（`chatPolling.test.ts` 已断言 3s），后台与用户页都会有常驻定时器；`CLOSED` 停止轮询已写进 Delta，P4 需用假定时器覆盖。
- **邮箱选填的长期价值有限。** 既有 369 个账号邮箱为空，按邮箱搜索只对新注册账号有效；提案已把邮箱验证 / 找回密码列为 out of scope。
- **`BANNED` 封禁期无求助通道（已接受）。** 发起人 2026-11-17 裁决维持「拒绝全部业务写操作（含客服消息）」，且 MVP 不做申诉流程；被封禁用户只能等到解封时间。提案已把该缺口写入残余风险，P4 需在验证记录登记；若后续要补，另开需求放行客服通道，不改本 change 的状态机。
- **`refine-safety-report` 的 Living Spec 文本滞后。** 该未归档增量的 `trip-companions` 仍写「MVP 不要求举报处置闭环」；本 change 交付闭环后，P5 必须在该句补「处置闭环见 `admin-console`」，否则两份规格互相矛盾。

## 下一步（非 Gate）

- P2：按 `@rule:spec-first` 做 AC/DoV 复核与 `consistency-lint`，并把 P1-02 的裁决结果写回 Delta 与验收信号。
- P3：`design.md` 落状态机、错误码表、事务边界与三档布局；`atdd-design.md` + `tasks.md` 按迭代 1 / 2 / 3 分组。
- P4：V19 迁移与回填、账号状态守卫、举报事务、客服会话、契约 0.13.0、E2E 两个 spec；在验证记录中登记演示身份边界。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `proposal.md` | 工件 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（SA） | 2026-11-17 | 已批准 |

> 按 `@rule:artifact-review-gate`，本报告与 `proposal.md` 均已签齐（2026-11-17，发起人确认）；P2 解锁。