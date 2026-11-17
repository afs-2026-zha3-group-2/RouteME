# Delta Spec 评审报告 — add-admin-console

- **工件：**
  - `openspec/changes/add-admin-console/specs/admin-console/spec.md`（ADDED 9 Requirement / 38 Scenario）
  - `openspec/changes/add-admin-console/specs/customer-service/spec.md`（ADDED 4 Requirement / 13 Scenario）
  - `openspec/changes/add-admin-console/specs/user-auth/spec.md`（MODIFIED「注册账号」1 Requirement / 10 Scenario）
- **change-id：** `add-admin-console` ｜ **需求条目：** `requirement-workspace/requirements/REQ-018-admin-console.md`（REQ-018 / S19–S24）
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:web-testing`、`@rule:pii-scrubbing`；基线 `main@c948b1b`）
- **评审输入：** 三份 Delta 全文；`proposal.md`；`requirements/REQ-018-admin-console.md`；`stories/add-admin-console.story.md`；Living Spec `openspec/specs/user-auth/spec.md`（4 Requirement / 13 Scenario）；未归档增量 `openspec/changes/add-user-profile/specs/user-auth/spec.md`；`openspec/changes/refine-safety-report/specs/trip-companions/spec.md`；`openspec/changes/add-ai-itinerary/specs/*`；源码 `backend/.../exception/*.java`（错误码风格）、`db/migration/V7__create_reports.sql`、`V6__create_chat_messages.sql`、`V3`/`V9`（`app_users` 列）、`frontend/src/chat/chatPolling.ts` 与 `chatPolling.test.ts`（3s）、`openapi.yaml` 0.11.0、`backend/.../OpenApiTest.java`
- **工具校验：** `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`（无 WARNING）；`openspec show add-admin-console --json` → `deltaCount: 14`；结构核对 14 Requirement / 61 Scenario（9/38 + 4/13 + 1/10），每个 Requirement ≥ 1 Scenario

## 评审结论

**Pass**（BLOCKER 0 / WARNING 3（全部已修）/ SUGGESTION 5（2 已修、3 待 P2/P3））

三份 Delta 的边界划分正确：管理端读模型与账号状态机归 `admin-console`；用户侧客服与「我的举报」归 `customer-service`；注册邮箱与角色固定归 `user-auth`。状态机、错误码、权限、事务、只读与隐私边界都可观察断言；`user-auth` MODIFIED 是 `add-user-profile` 增量的严格超集（7 个基线场景名称与语义全部保留，新增 3 个场景），无场景改名或删除。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| S-01 | WARNING | `@rule:spec-first` | `admin-console`「账号状态迁移与处罚」/「举报详情与处理」 | 原文要求「举报成立时 MUST 选择暂停或封禁之一」，但被举报用户可能已被处罚：对 `BANNED` 用户再封禁会撞上 `INVALID_STATUS_TRANSITION`，实现层无合法路径；现库已有 13 条举报，处置时必然遇到 | 补规则与场景：`ACTIVE` 选暂停或封禁，`SUSPENDED` 维持或升级，`BANNED` 只更新封禁理由与解封时间；处罚与 `RESOLVED` 仍同事务 | `V7__create_reports.sql`（13 行现存举报）；`admin-console` 状态迁移段 | **已修**（新增「被举报用户已处于受限状态」场景 + 规则；REQ-018 §4 增 S22-7） |
| S-02 | WARNING | `@rule:spec-first` | `admin-console`「账号状态迁移与处罚」 | 「封禁到达解封时间后，系统 MUST 在读取时把有效状态恢复为 `ACTIVE`」把「有效状态」与「持久化状态」混在一句：GET 是否写库、并发读取是否互相覆盖都不可判定 | 改为：读取时按 `ACTIVE` 放行；下一次状态变更或写操作时落库为 `ACTIVE`；场景断言到期后的写操作不再返回 `ACCOUNT_BANNED` | 提案「残余风险」；`admin-console` 场景「封禁到期自动恢复」 | **已修**（规则与场景同步） |
| S-03 | WARNING | `@rule:api-contract` | `admin-console`「管理员身份与后台访问控制」 | 要求只校验 `role=ADMIN`，但场景 Given 又要求 `status=ACTIVE`；管理员被暂停 / 封禁后能否继续进后台不可判定，也与「受限账号的功能边界」冲突 | 补一句：管理员被暂停或封禁时同样适用受限账号边界，不得因 `role=ADMIN` 绕过账号状态限制 | `admin-console` 首段与「管理员进入后台」场景 | **已修** |
| S-04 | SUGGESTION | `@rule:sdd-artifacts` | `admin-console`「账号状态迁移与处罚」 | 8 项封禁理由中的「其他原因」（`OTHER`）允许不填补充说明，等于把 7 类具体理由之外的情形变成无信息量的 `OTHER`，后台与举报人回看都得不到缘由 | 规定选择 `OTHER` 时补充说明必填，其余理由选填；场景加一条负向断言 | 提案「决策·封禁理由」；故事 S1 第 8 项「其他原因」 | **已修** |
| S-05 | SUGGESTION | `@rule:api-contract` | `admin-console`「客服工作台」 | 只定义并发接入的 409 `SESSION_ALREADY_HANDLING`，未定义「结束一条 `WAITING` 会话」的拒绝码；实现容易自行发明或直接静默关闭 | 补 409 `SESSION_NOT_HANDLING`，与既有 `APPLICATION_NOT_PENDING` / `REPORT_NOT_PENDING` 命名风格一致 | `backend/.../exception/ApplicationNotPendingException.java` 的 `CODE + HttpStatus` 风格 | **已修** |
| S-06 | SUGGESTION | `@rule:spec-first` | `customer-service`「帮助与反馈入口与我的举报状态」 | 「举报人看到已受理」未区分 `PENDING`（尚未开始）与 `PROCESSING`（处理中）的文案；两种状态都叫「已受理」会让举报人误以为已有人在看 | P2 在 design 中给出四态文案映射表（`PENDING` 待处理 / `PROCESSING` 处理中 / `RESOLVED` 已处理 / `REJECTED` 举报不成立），Delta 不加新场景 | `customer-service` 场景「查看我的举报状态」 | **待 P2** |
| S-07 | SUGGESTION | `@rule:api-contract` | 三份 Delta 的错误码 | 全文出现 12 个错误码（`ADMIN_REQUIRED`、`ACCOUNT_SUSPENDED`、`ACCOUNT_BANNED`、`INVALID_STATUS_TRANSITION`、`CANNOT_TARGET_SELF`、`USER_NOT_FOUND`、`REPORT_NOT_PENDING`、`REPORT_NOT_PROCESSING`、`EMAIL_TAKEN`、`SESSION_ALREADY_HANDLING`、`SESSION_NOT_HANDLING`、`SESSION_CLOSED`），分散在场景里，未集中成表；契约 0.13.0 与 `OpenApiTest` 需要单一真源 | P3 在 `design.md` 收敛为「端点 × 错误码 × HTTP 状态」表，并让 `OpenApiTest` 断言该表 | `openapi.yaml` 0.11.0；`OpenApiTest.java` | **待 P3** |
| S-08 | SUGGESTION | `@rule:sdd-artifacts` | `admin-console` 三处 MUST | 3 条 MUST 无对应场景：用户不存在返回 404 `USER_NOT_FOUND`；列表默认按注册时间倒序、ID 倒序；邮箱为空显示「未填写」 | P2 补 1 个场景覆盖 404 与空列表态，或在 design 明确为纯展示细节并给出断言方式 | `admin-console`「用户列表与搜索」「用户详情与关联内容」 | **待 P2** |

**Counts：** BLOCKER 0 / WARNING 3（已修）/ SUGGESTION 5（2 已修、3 待 P2/P3）→ **Pass**

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| Delta 结构（ADDED / MODIFIED 头 + Requirement + ≥1 Scenario） | Pass：`admin-console` / `customer-service` 用 `## ADDED Requirements`，`user-auth` 用 `## MODIFIED Requirements`；9/4/1 Requirement 全部带场景 |
| 状态机封闭性 | Pass：只允许 `ACTIVE → SUSPENDED`、`ACTIVE / SUSPENDED → BANNED`、`SUSPENDED → ACTIVE`；其余 409 `INVALID_STATUS_TRANSITION`；`BANNED → ACTIVE` 只由解封时间触发；禁止对自己暂停 / 封禁 |
| 错误码与既有风格一致 | Pass：沿用 `ApplicationNotPendingException` 一类的「大写下划线 code + HttpStatus」；新增码语义与状态机一一对应 |
| 权限是否服务端 | Pass：`ADMIN_REQUIRED` / `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` 都是服务端 403；场景明确「不只依赖前端隐藏按钮」；客户端自选 `role` / `status` / `senderRole` 一律忽略 |
| 数据保留 / 删除边界 | Pass：处罚只改状态；`RESOLVED` / `REJECTED` 举报保留；`CLOSED` 会话保留；全文无删除端点或「删除内容」措辞 |
| 举报与客服数据隔离 | Pass：客服消息落独立 `customer_service_messages`，Delta 有「与行程聊天隔离」场景；不复用 `chat_messages` |
| 隐私边界 | Pass：举报人只看自己的举报状态，看不到管理员备注与其他用户举报；被举报人无举报查询入口；邮箱只在管理端出现 |
| 3s 轮询可验证 | Pass：复用 `CHAT_POLL_INTERVAL_MS = 3000`（`chatPolling.test.ts` 已断言 3s），场景写明「3 秒内看到」，`CLOSED` 后停止轮询 |
| `user-auth` 基线保留 | Pass：以未归档 `add-user-profile` 的「注册账号」为前置，7 个场景名称与语义逐条保留（机器比对 missing = 0），新增「邮箱选填」「邮箱格式非法或重复」「客户端不能指定角色或初始状态」3 个场景 |
| 与未归档 change 的冲突 | Pass（有登记）：不 MODIFIED `trip-plans` / `trip-companions` / `trip-experiences`；`refine-safety-report` 的 `trip-companions` 仍写「MVP 不要求处置闭环」，与本 change 的交付相反，已由提案声明「P5 补一句处置闭环见 `admin-console`」，不阻塞 P1 |
| 契约 / 迁移编号 | Pass：`openapi.yaml` 0.11.0、Flyway head V17；0.12.0 / V18 属 `add-ai-itinerary`；本 change 0.13.0 / V19 |
| 场景可判定性 | Pass：`403 ADMIN_REQUIRED`、`409 INVALID_STATUS_TRANSITION` / `CANNOT_TARGET_SELF` / `REPORT_NOT_PENDING` / `REPORT_NOT_PROCESSING` / `SESSION_ALREADY_HANDLING` / `SESSION_CLOSED`、`R-{id}`、字段清单、排序、分页、忽略大小写、3s、只读态都可断言 |
| 与故事 AC 的覆盖 | Pass：S19–S24 的 AC 逐条落到 Requirement（列表 / 搜索 / 详情 / 状态迁移 / 四类写限制 / 举报队列 / 处置 / 帮助入口 / 会话生命周期 / 工作台），无孤儿 AC |
| 是否触碰并行会话 WIP | Pass：本 change 的 Delta 未引用或修改并行会话在途的 `profile.spec.ts`、`safety-report.spec.ts`、`ReportModal.tsx`、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx` |

## 残余风险

- **`user-auth` 的合并顺序是硬约束。** 本 Delta 的 MODIFIED 文本以未归档的 `add-user-profile` 为前置；若先归档本 change，归档器会把「注册后进入资料完善页」等 7 个场景回退成 Living 基线版本。P5 必须按提案的归档顺序执行，并在归档后复核 `openspec/specs/user-auth/spec.md`。
- **`refine-safety-report` 的对话文本滞后。** 其未归档 `trip-companions` 增量仍写「MVP 不要求举报处置闭环」；本 change 交付闭环后，P5 需在该句补交叉引用，否则两份规格对同一能力给出相反结论。
- **`BANNED` 无求助通道（已裁决）。** 发起人 2026-11-17 选择维持「拒绝全部业务写操作（含客服消息）」；本报告 S-01～S-05 的结论不受影响，Delta 与验收信号无需改动。若后续要补客服通道，另开需求，同时改「受限账号的功能边界」与验收信号 5/11。
- **封禁到期依赖系统时钟。** 有效状态由读取时计算，P4 必须以固定 `Clock` 覆盖「到期前 / 到期后」；否则测试会随真实时间抖动。
- **本地迁移链不干净（环境）。** 工作区存在两个 V16 迁移（上游 `V16__add_meeting_time.sql` 与未跟踪的 `V16__normalize_demo_user_profiles.sql`），P4 启动前端 / 后端前需由该 WIP 的负责人清理，否则 Flyway 直接失败；与本 change 的 V19 无关。

## 下一步（非 Gate）

- P2：按 S-06 / S-08 补文案映射与 3 条无场景 MUST 的断言；跑 `consistency-lint` 与 AC/DoV 复核。
- P3：按 S-07 收敛错误码表；`design.md` 写状态机、事务边界与三档布局；`tasks.md` 按迭代 1 / 2 / 3 分组。
- P4：V19 迁移与回填、账号状态守卫、举报单事务、客服会话与 3s 轮询、契约 0.13.0、两个 E2E spec。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| 3 份 Delta Spec（`admin-console` / `customer-service` / `user-auth`） | 工件 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（SA） | 2026-11-17 | 已批准 |

> 按 `@rule:artifact-review-gate`，Delta Spec 与本文均已签齐（2026-11-17，发起人确认）；P2 解锁。P2 期间仅对 `user-auth` 的 3 个既有场景补 `Given` 行（不加新行为），属格式类修订，按 gate 的「格式修订可复用 Pass 报告」条款沿用本结论，记录见 `openspec/changes/add-admin-console/consistency-lint.md` L-02。