# 变更提案：add-admin-console

- **需求来源：** 用户 2026-11-17 提供的 6 条管理后台 User Story（含验收标准、Given/When/Then 场景与「一条故事 = 一个页面 + 一份接口契约 + 一次核心操作」的垂直切片口径）｜ **编号登记：** `requirement-workspace/registry.md` REQ-018
- **故事：** S19–S24，管理后台迭代 1–3，P0，合计 22 点（3 + 3 + 3 + 5 + 3 + 5）；落点见「故事映射」
- **能力：** `admin-console`（ADDED 9 Requirement）+ `customer-service`（ADDED 4 Requirement）+ `user-auth`（MODIFIED「注册账号」）
- **规模：** L（3 个迭代、6 个页面/视图、5 份接口分组、V19 迁移、管理员种子账号、跨页面状态联动）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:artifact-review-gate`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`、`@rule:git-branching-and-pr`
- **基线：** `main@c948b1b`（本地与 `origin/main` 同步）
- **归档顺序：** ① `add-user-profile`（未归档，已 MODIFIED 同一份 `user-auth`「注册账号」）MUST 先于本 change 归档，否则本 change 的邮箱增量会被覆盖；② `refine-safety-report`（P4 已通过、未归档）先于本 change 归档；其 `trip-companions` 增量仍写「MVP 不要求处置闭环」，本 change 交付处置闭环后需在 P5 于该句补一条「处置闭环见 `admin-console`」，不阻塞 P1/P2；③ `add-ai-itinerary`（P1）预留契约 0.12.0 / V18，本 change 使用 0.13.0 / V19，互不覆盖。

## Why

RouteMe 目前只有面向普通用户的行程、申请、聊天、体验与举报**提交**能力，平台侧完全没有运营与治理手段（源码证据：全仓 `admin` / `banned` / `suspended` 零命中；`reports` 表只有 `target_type / target_id / reporter_id / reason / note / created_at`，无状态与处置字段；`app_users` 无 `role`、`status`、`email`）：

- **没有管理员身份。** `X-User-Id` 对所有人等价，任何账号都能调用任何业务端点；没有「仅管理员可访问」的后台入口与服务端校验。
- **没有用户治理。** 账号只有「存在 / 不存在」两态；无法暂停、封禁或恢复；`ChatNotAllowedException` 等拒绝理由都只针对行程状态，不针对账号状态。
- **举报只记录、不处置。** `POST /api/reports` 返回 `received=true` 后即结束，`reports` 无 `PENDING / PROCESSING / RESOLVED / REJECTED`，没有队列、详情、处理结果与处置动作；这与本需求「成立→暂停/封禁；不成立→驳回」直接冲突。
- **没有申诉与结果回看。** 举报人提交后永远只看到「已收到」，看不到是否受理、是否处理完成。
- **没有人工客服。** 现有聊天是「已匹配同行者 × 行程」的一对一；用户遇到账号、举报、平台使用问题时没有任何入口，平台也没有会话队列、接入、结束与历史消息。
- **没有邮箱字段。** 用户管理的「按邮箱搜索 / 展示邮箱」在现有 `app_users` 上无法实现。
- **开发库已有 369 个账号 / 110 条行程**，当前处置只能手改 SQLite；不可审计、不可回滚，也无法阻止被处罚账号继续发布或发消息。

## What Changes

- `admin-console`（ADDED「管理员身份与后台访问控制」）：`app_users` 增加 `role`（`USER` / `ADMIN`，默认 `USER`）；V19 种一个 `admin` 账号；所有 `/api/admin/**` 端点 MUST 在服务端校验 `role=ADMIN`，非管理员一律 403 `ADMIN_REQUIRED`；前端只在管理员身份下展示「管理后台」入口，并拒绝非管理员直接输入 `#/admin/**`。
- `admin-console`（ADDED「用户列表与搜索」）：`#/admin/users` 分页展示全部注册用户的 ID、头像、昵称、邮箱、注册时间、账号状态；支持按用户 ID（精确）、昵称（包含）、邮箱（包含）搜索，按状态筛选；空查询返回全部。
- `admin-console`（ADDED「用户详情与关联内容」）：`#/admin/users/{userId}` 汇总个人资料、账号状态与处罚记录、该用户发布的旅行计划、发表的旅行体验、作为举报人或被举报人的举报记录；每条内容可跳到对应详情。
- `admin-console`（ADDED「账号状态迁移与处罚」）：支持 `ACTIVE → SUSPENDED`（暂停）、`ACTIVE / SUSPENDED → BANNED`（封禁，8 项封禁理由之一 + 解封时间 + 可选备注）、`SUSPENDED → ACTIVE`（恢复）；暂停 / 封禁 MUST 二次确认并填写处理原因；非法迁移 409 `INVALID_STATUS_TRANSITION`；封禁到期按读取时惰性恢复为 `ACTIVE`；管理员 MUST NOT 处罚自己；**MVP 不提供永久删除账号或内容的能力**。
- `admin-console`（ADDED「受限账号的功能边界」）：`SUSPENDED` MUST NOT 发布行程、申请同行、发送聊天消息、发布旅行体验（四个写入口服务端拒绝，403 `ACCOUNT_SUSPENDED`；浏览、读取聊天、联系人工客服仍可用）；`BANNED` MUST NOT 执行任何业务写操作（403 `ACCOUNT_BANNED`），但保留登录与只读浏览，以便看到自己的封禁信息；处罚 MUST NOT 删除既有行程、体验、聊天或举报记录。
- `admin-console`（ADDED「封禁信息展示」）：用户个人资料页 MUST 展示当前封禁理由与解封时间；账号恢复 `ACTIVE` 后 MUST NOT 再展示封禁内容。
- `admin-console`（ADDED「举报队列与筛选」）：`#/admin/reports` 展示举报编号（`R-{id}`）、举报人、被举报用户、举报对象、举报类型、举报时间、处理状态；新举报默认 `PENDING`；支持按 `PENDING / PROCESSING / RESOLVED / REJECTED` 筛选；列表按时间倒序。
- `admin-console`（ADDED「举报详情与处理」）：`#/admin/reports/{reportId}` 展示举报原因、举报人、被举报用户与被举报内容，并可跳转到用户 / 行程 / 体验详情；管理员点击「开始处理」后 `PENDING → PROCESSING`；处理时 MUST 填写处理结果/备注；成立时 MUST 选择暂停或封禁并事务内执行处罚，随后置 `RESOLVED`；不成立置 `REJECTED`；`RESOLVED` / `REJECTED` 记录保留、不删除；举报人可看到「已受理」与最终状态。
- `customer-service`（ADDED「帮助与反馈入口与我的举报状态」）：新增 `#/help`，提供「联系人工客服」与「我的举报」两块；「我的举报」列出当前用户提交的举报编号、对象、时间、状态，让举报人看到 `PENDING / PROCESSING / RESOLVED / REJECTED`。
- `customer-service`（ADDED「人工客服会话生命周期」）：用户发起会话后状态为 `WAITING`；同一用户同时只能有一个 `WAITING / HANDLING` 会话，重复发起返回既有会话；管理员（客服）接入后 `WAITING → HANDLING`；客服结束会话 `HANDLING → CLOSED`；`CLOSED` 后用户可再次发起新会话；`CLOSED` 会话保留全部历史且双方只读。
- `customer-service`（ADDED「客服消息与短轮询」）：双方可发送 1–500 字文本；用户页与客服工作台均以 3s 短轮询刷新（复用 `CHAT_POLL_INTERVAL_MS`），`CLOSED` 后停止轮询；空白或超长消息被拒绝。客服消息 MUST 落在独立表、与行程聊天隔离，`CLOSED` 后历史仍可读。
- `customer-service`（ADDED「客服工作台」）：`#/admin/service` 展示 `WAITING / HANDLING / CLOSED` 三类会话；`#/admin/service/{sessionId}` 展示当前用户基础账号信息（昵称、ID、头像、邮箱、账号状态、注册时间）、与该用户相关的举报记录、当前会话完整历史；客服可接入 `WAITING` 会话、双向对话、主动结束 `HANDLING` 会话。
- `user-auth`（MODIFIED「注册账号」）：注册增加**选填**邮箱（格式校验、去空白转小写后唯一）；未填写时允许注册；新账号 `role` MUST 由服务端固定为 `USER`，客户端不得指定角色或初始状态。
- 契约 `openapi.yaml` 升 **0.13.0**：新增 `/api/admin/**`（用户、举报、客服工作台）与 `/api/service/**`（用户侧客服、我的举报）两组端点；`OpenApiTest` 同步断言。
- 前端：新增 `AdminShell` / `AdminUsersPage` / `AdminUserDetailPage` / `AdminReportsPage` / `AdminReportDetailPage` / `AdminServicePage` / `HelpPage`；`route.ts` / `App.tsx` 增加路由；`styles.css` 末尾追加管理后台样式（含 390 / 768 / 1440 三档）。
- 测试：后端状态迁移、权限、举报生命周期、客服会话单测与控制器测试；前端状态徽标 / 搜索 / 二次确认 / 只读态单测；E2E 新增 `admin.spec.ts`、`customer-service.spec.ts`。

## 故事映射

| Story | 标题 | 迭代 | 点 | 落点页面 | 垂直切片（页面 + 契约 + 一次核心操作） |
|---|---|---|---|---|---|
| S19 | 查看并查询平台所有注册用户 | 1 | 3 | 用户管理页 `#/admin/users` | 列表页 + `GET /api/admin/users` + 一次分页 / 搜索查询 |
| S20 | 暂停、封禁或恢复用户账号 | 1 | 3 | 用户详情页 `#/admin/users/{userId}` | 详情页 + `POST /api/admin/users/{userId}/status` + 一次状态迁移 |
| S21 | 查看并筛选平台举报 | 2 | 3 | 举报管理页 `#/admin/reports` | 列表页 + `GET /api/admin/reports` + 一次状态筛选查询 |
| S22 | 人工审核并处理举报 | 2 | 5 | 举报详情页 `#/admin/reports/{reportId}` | 详情页 + `POST /api/admin/reports/{reportId}/start` / `resolve` + `PENDING → PROCESSING → RESOLVED / REJECTED` |
| S23 | 联系人工客服 | 3 | 3 | 帮助与反馈 / 客服会话页 `#/help` | 会话页 + `POST /api/service/sessions` + 一次状态创建（无会话 → `WAITING`） |
| S24 | 接入并回复用户会话 | 3 | 5 | 客户服务页 `#/admin/service` | 工作台 + `POST /api/admin/service/sessions/{id}/join` / `close` + `WAITING → HANDLING → CLOSED` |

> 6 条故事属于同一个管理后台闭环，按用户指示合并为一个 change；P3 `tasks.md` 按迭代 1 / 2 / 3 分组，允许分三次交付。

## 范围

**In scope**

1. 管理员角色、种子 admin 账号、后台入口与服务端权限校验。
2. 用户列表：ID、头像、昵称、邮箱、注册时间、状态；按 ID / 昵称 / 邮箱搜索；状态筛选；分页。
3. 用户详情：个人资料、账号状态与处罚、发布的行程、发表的体验、相关举报；内容跳转。
4. 账号状态迁移：`ACTIVE → SUSPENDED`、`ACTIVE / SUSPENDED → BANNED`、`SUSPENDED → ACTIVE`；二次确认 + 处理原因；8 项封禁理由 + 解封时间；到期惰性恢复。
5. 受限账号边界：`SUSPENDED` 四类写操作拒绝；`BANNED` 全部业务写操作拒绝、只读可用；数据保留、无永久删除。
6. 封禁信息在用户个人资料页同步展示。
7. 举报队列：编号、举报人、被举报用户、对象、类型、时间、状态；状态筛选；详情。
8. 举报处理：开始处理、查看上下文、成立→处罚→`RESOLVED`、不成立→`REJECTED`、备注必填、记录保留、举报人可见状态。
9. 用户侧「帮助与反馈」：人工客服入口 + 我的举报状态。
10. 客服会话：`WAITING / HANDLING / CLOSED` 生命周期、双向文本、3s 短轮询、历史保留、只读、可再次发起。
11. 客服工作台：三类队列、接入、用户基础信息、相关举报、完整历史、主动结束。
12. 契约 0.13.0、V19 迁移、`OpenApiTest`、单测 / 控制器测试 / E2E。

**Out of scope**

- 真实的管理员 SSO / 二次认证 / 操作审计流水；业务端点从 `X-User-Id` 迁移到 Bearer token（沿用 `user-auth` 的既有边界，见「残余风险」）。
- 处罚历史表、申诉流程、处罚通知（站内信 / 邮件）、永久删除账号或内容。
- 举报原因词表扩容：举报原因仍为现有四类；本需求新增的 8 项是**封禁理由**，与举报原因不是同一枚举。
- 内容级下架 / 隐藏 / 删除；「暂停发布行程」作为独立处罚类型（本需求按 S20 口径归入 `SUSPENDED`）。
- 客服工单分类、满意度评价、快捷回复库、附件 / 图片 / 语音、WebSocket 推送（沿用 3s 短轮询）。
- 管理员之间的工单分配、转交、并发抢单锁；`PROCESSING` 状态下任一管理员都可继续处理。
- 用户侧独立的「我的举报」详情页（只在帮助与反馈内列表展示状态）。
- 邮箱验证 / 找回密码 / 邮箱登录。
- 现有行程、申请、聊天、体验业务规则的状态机变更（只增加账号状态前置守卫）。

## 影响面

| 层次 | 位置 | 改动 |
|---|---|---|
| 自身（本 change） | `openspec/changes/add-admin-console/`、`docs/sdd/add-admin-console/`、`docs/reviews/20261117-add-admin-console-*-review.md`、三份 Delta Spec | P1 已交付提案 / Delta / 评审；P2 交付 AC/DoV、consistency-lint 与 G1 记录；P3 交付 design / atdd / tasks |
| 上游（需求与故事） | `requirement-workspace/{requirements,intents}/REQ-018-admin-console.md`、`stories/add-admin-console.story.md`、`registry.md`、`stories.md` | 需求六字段、S19–S24 故事、登记行与故事清单；本 change 不改 `docs/prototype/` |
| 下游（Living / 归档 / 其他 change） | `openspec/specs/{admin-console,customer-service,user-auth}/spec.md`；`openspec/changes/{add-user-profile,refine-safety-report,add-ai-itinerary}/` | P5 新建两个能力、更新 `user-auth`；归档顺序受 `add-user-profile`（同一 `user-auth`）与 `refine-safety-report`（`trip-companions` 处置闭环句）约束；契约 / 迁移编号避让 `add-ai-itinerary` |

**逐文件改动：**

| 位置 | 改动 |
|---|---|
| `RouteME/backend/src/main/resources/db/migration/V19__admin_console.sql` | `app_users` 加 `email / role / status / status_reason / status_updated_at / status_updated_by / banned_until / ban_reason_code / ban_reason_note` + 邮箱唯一索引；既有用户回填 `role='USER'` / `status='ACTIVE'` / `email=NULL`；`reports` 加 `status / processed_by / processing_at / resolved_at / resolution_note / resolution_action`，既有 13 条举报回填 `status='PENDING'`；新表 `customer_service_sessions`、`customer_service_messages`；种子 `admin` 账号 |
| `RouteME/openapi.yaml` | 0.13.0；`/api/admin/users`、`/api/admin/users/{userId}`、`/api/admin/users/{userId}/status`、`/api/admin/reports`、`/api/admin/reports/{reportId}`、`.../start`、`.../resolve`、`/api/admin/service/sessions`、`.../{sessionId}`、`.../join`、`.../close`、`/api/service/sessions`、`/api/service/sessions/current`、`/api/service/sessions/{sessionId}/messages`、`/api/help/reports` |
| `backend/.../enums/AccountStatusEnum.java`、`AccountRoleEnum.java`、`BanReasonEnum.java`、`ReportStatusEnum.java`、`ServiceSessionStatusEnum.java` | 状态 / 角色 / 8 项封禁理由 / 举报状态 / 客服会话状态的唯一真源 |
| `backend/.../entity/UserEntity.java`、`ReportEntity.java`、`CustomerServiceSessionEntity.java`、`CustomerServiceMessageEntity.java` | 新列与两张新表的映射 |
| `backend/.../controller/AdminUserController.java`、`AdminReportController.java`、`AdminServiceController.java`、`ServiceController.java`、`HelpController.java` | 管理端与用户端端点；权限与错误码 |
| `backend/.../service/AccountStatusService.java`、`AdminUserService.java`、`AdminReportService.java`、`CustomerService.java` | 状态迁移合法性、封禁到期惰性恢复、举报生命周期、会话生命周期、跨表事务 |
| `backend/.../guard/AccountStatusGuard.java`（拦截器或服务前置校验） | `SUSPENDED` / `BANNED` 写操作拒绝；MUST NOT 只靠前端隐藏 |
| `backend/.../service/impl/` 既有 `TripPlanServiceImpl`、`ApplicationServiceImpl`、`ChatServiceImpl`、`ExperienceServiceImpl`、`ReportServiceImpl` | 写入口接入账号状态守卫；不改各自业务规则 |
| `backend/.../service/impl/AuthServiceImpl`、`request/AuthRegisterRequest` | 选填邮箱；角色固定 `USER` |
| `frontend/src/route.ts`、`App.tsx` | `#/admin/users`、`#/admin/users/{id}`、`#/admin/reports`、`#/admin/reports/{id}`、`#/admin/service`、`#/admin/service/{id}`、`#/help` |
| `frontend/src/admin/*`、`frontend/src/help/*`、`frontend/src/i18n/adminMessages.ts` | 7 个页面/视图、状态徽标、二次确认、封禁理由选择、只读态、空态 |
| `frontend/src/shell/AppShell.tsx`、`styles.css` | 仅管理员可见「管理后台」入口；后台样式末尾追加（390 / 768 / 1440） |
| `frontend/src/**/*.test.ts(x)`、`e2e/tests/admin.spec.ts`、`e2e/tests/customer-service.spec.ts` | 搜索、状态迁移、举报处理、客服生命周期、只读态 |
| `openspec/specs/` | P5 归档时合并 `admin-console`、`customer-service` 新能力，并更新 `user-auth` |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 管理员身份 | `app_users.role`（`USER` / `ADMIN`）+ V19 种子 `admin` 账号 | 用户已确认；改动面最小，与现有账号体系一致 |
| 权限校验位置 | 所有 `/api/admin/**` 服务端校验 `role=ADMIN`；前端只做入口隐藏 | 「仅管理员可访问」必须是服务端约束，不能只靠路由 |
| 管理员 / 客服关系 | MVP 中 `ADMIN` 即客服，不单设 `STAFF` 角色 | 后台只有一类运营人员；减少角色矩阵 |
| 邮箱 | `user-auth` 注册选填，去空白转小写后唯一；既有账号为 `NULL`，列表显示「未填写」 | 故事要求展示 / 搜索邮箱；MVP 不做邮箱验证 |
| 暂停口径 | `SUSPENDED` 精确对应 S20 的四类写操作；读取、浏览、联系客服仍可用 | S20 列出的限制就是这四项；保留申诉通道 |
| 封禁口径 | `BANNED` 保留登录与只读，拒绝全部业务写操作，并在个人资料页展示封禁原因与解封时间；封禁期不开放客服消息（发起人 2026-11-17 裁决） | S1 要求「个人信息页面同步展示封禁内容」；只读才能让用户看到处罚；MVP 无申诉流程，封禁期求助通道缺席已登记为残余风险 |
| 解封 | 到达 `banned_until` 后按读取惰性恢复 `ACTIVE`；MVP 不提供手动解封 | S1 只给出「解封时间」，未给手动解封；惰性恢复不改写历史列 |
| 「暂停发布行程」 | 归入 `SUSPENDED`，不单设处罚类型 | S1 与 S20 的动作集合一致；避免两套近似状态 |
| 封禁理由 | 8 项枚举：`HARASSMENT` / `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` / `OTHER`；选 `OTHER` 时补充说明必填 | 用户给出的 7 类具体理由 + 「其他原因」；与举报原因（4 类）分离；`OTHER` 必须说明具体缘由 |
| 举报开始处理 | 详情页显式点击「开始处理」，打开页面本身不改状态 | 「打开即处理」会让误点产生状态副作用；显式动作可观察、可测试 |
| 举报成立 | MUST 在暂停与封禁之间选择处置；处罚与 `RESOLVED` 同一事务。被举报用户为 `ACTIVE` 时必须选其一，为 `SUSPENDED` 时可维持或升级，为 `BANNED` 时只更新封禁信息 | 故事要求「对违规账号采取措施」；避免「成立但无处置」的悬空状态，也避免对已封禁用户产生非法迁移 |
| 举报处理人 | 不建工单分配；任一管理员可处理，`processed_by` 记录最近开始处理人 | MVP 无并发运营团队；避免引入抢单 / 转交模型 |
| 举报人可见范围 | 仅状态与时间；不展示处理备注与被举报人处罚细节 | 保护举报人与被举报人隐私 |
| 客服实时性 | 复用现有 3s 短轮询（`CHAT_POLL_INTERVAL_MS`），不引入 WebSocket | 与现有聊天一致；MVP 成本最低，`CLOSED` 后停止轮询 |
| 会话并发 | 每用户最多一个 `WAITING / HANDLING` 会话；重复发起返回既有会话 | 避免队列里出现同一用户的多个并发会话 |
| 举报编号 | 展示为 `R-{id}`，`id` 仍为自增主键 | 不加新编号列；展示层派生，稳定且可跳转 |
| 数据保留 | 处罚只改账号状态字段；不删除行程、体验、聊天、举报 | S20 明确要求；MVP 无硬删除端点 |
| 契约 / 迁移编号 | 0.13.0 / V19 | `add-ai-itinerary` 已预留 0.12.0 / V18；后到者顺延 |
| 页面承载 | 同一 SPA 内 `#/admin/**` + `AdminShell`；用户侧 `#/help` | 复用现有路由与身份门，不新建应用 |

## 验收信号

1. 管理员登录后能看到「管理后台」入口；普通用户看不到入口，直接访问 `#/admin/users` 得到 403 页面，直接调用 `/api/admin/users` 得到 403 `ADMIN_REQUIRED`。
2. `#/admin/users` 展示全部注册用户的 ID、头像、昵称、邮箱、注册时间、状态；输入 ID / 昵称 / 邮箱可筛出对应用户；清空查询回到全量；分页可用。
3. 点击用户进入 `#/admin/users/{userId}`，可看到个人资料、账号状态、旅行计划、旅行体验与相关举报，并可跳到对应内容。
4. 对 `ACTIVE` 用户执行「暂停」：二次确认 + 填写原因后状态变为 `SUSPENDED`；该用户发布行程、申请同行、发送聊天、发布体验均被服务端拒绝。
5. 对 `ACTIVE` 或 `SUSPENDED` 用户执行「封禁」：必须选择 8 项理由之一并给出未来解封时间；状态变为 `BANNED`；该用户所有业务写操作被拒绝，仍可登录只读查看个人资料上的封禁理由与解封时间。
6. 对 `SUSPENDED` 用户执行「恢复」后状态回到 `ACTIVE`，四类写操作恢复；`BANNED → ACTIVE` 只能由解封时间到期触发。
7. 非法迁移（如 `BANNED → SUSPENDED`、`ACTIVE → ACTIVE`、`BANNED` 手动恢复）返回 409 `INVALID_STATUS_TRANSITION`；管理员不能处罚自己。
8. 处罚后原行程、体验、聊天、举报仍在；系统没有任何永久删除入口。
9. 用户提交举报后，`#/admin/reports` 立即出现 `PENDING` 记录，字段与编号 `R-{id}` 完整；按状态筛选正确。
10. 管理员打开举报详情并点击「开始处理」后状态变为 `PROCESSING`；填写备注并确认成立（选择暂停或封禁）后状态变为 `RESOLVED`，且被举报用户状态同步变化；确认不成立后状态变为 `REJECTED`；两种结果都保留记录，举报人在 `#/help`「我的举报」看到最终状态。
11. 用户从 `#/help` 发起人工客服后生成 `WAITING` 会话并可发送消息；客服在工作台接入后变为 `HANDLING`，双方 3s 内看到对方消息；客服结束后变为 `CLOSED`，双方只读且用户可再次发起新会话。
12. **静态校验：** `npx openspec validate add-admin-console --strict` 通过且 `deltaCount: 14`；`openapi.yaml` 升级 0.13.0 后 lint 0 error。
13. **动态验证：** 后端 `mvnw test`、前端 `typecheck` / `build` / `npm test` 全绿；`admin.spec.ts` 断言非管理员 403 `ADMIN_REQUIRED`、搜索命中、暂停 / 封禁后四类写操作 403、举报 `PENDING → PROCESSING → RESOLVED`；`customer-service.spec.ts` 断言 `WAITING → HANDLING → CLOSED`、3s 内双向可见与 `CLOSED` 只读。

## 残余风险

| 风险 | 处理 |
|---|---|
| 业务端点仍以 `X-User-Id` 识别身份，可被伪造；管理员权限建立在同一套演示身份上 | 已在 `user-auth` 中记录为既有边界；本 change 只保证「服务端校验 role」。真实上线前必须迁移到 Bearer token 鉴权（另开需求）；由当前开发者在 P4 验证记录与 G2 决策中显式登记该边界，操作审计流水同样另开需求 |
| `add-user-profile` 未归档且已 MODIFIED `user-auth`「注册账号」 | 提案「归档顺序」已声明 `add-user-profile` 先归档；本 change 的 `user-auth` 增量以「加邮箱 + 角色服务端固定」为最小差异，P5 合并时核对两份增量 |
| `refine-safety-report` 未归档，其 `trip-companions` 增量写「MVP 不要求处置闭环」 | 本 change 在 `admin-console` 交付闭环；P5 在 `trip-companions` 该句补「处置闭环见 `admin-console`」，不改举报原因四值 |
| 封禁到期只在读取时按 `ACTIVE` 放行，持久化状态延后落库 | 不写定时任务；P4 用固定 `Clock` 测试「到期前 / 到期后」两个时刻；到期后的下一次状态变更或写操作把 `status` 落为 `ACTIVE` |
| 管理员误封自己导致后台不可用 | 服务端拒绝 `userId == currentAdminId` 的暂停 / 封禁（409 `CANNOT_TARGET_SELF`）；恢复不受限 |
| 邮箱选填导致大量既有账号为空，按邮箱搜索价值有限 | 列表显示「未填写」；P5 可另开数据补齐需求；不做邮箱验证 |
| 举报处置与账号处罚跨表，事务边界复杂 | `resolve` 在单事务内写 `reports` 与 `app_users`；失败整体回滚，不出现「举报已处理但账号未处罚」 |
| 客服会话与行程聊天共用 `chat_messages` 会污染现有聊天查询 | 新建独立 `customer_service_messages` 表，不复用 `chat_messages` |
| 举报人身份泄露给被举报人 | 管理端可见举报人；用户端只展示「我的举报」，不展示举报人；被举报人无举报查询入口 |
| `BANNED` 用户封禁期内无法联系客服，也没有申诉流程 | 发起人 2026-11-17 裁决维持「拒绝全部业务写操作」；解封时间到期自动恢复，另开需求再补申诉通道；P4 在验证记录登记该边界 |
| 后台页面与 390 / 768 / 1440 三档布局 | P3 设计稿按三档出图；P4 逐档走查，列表在窄屏切换为卡片 |
| E2E 未纳入 CI | 与既有 change 一致：本地执行两个新 spec；CI 以构建与单测为准 |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。Delta Spec 与 AC/DoV 复核属 P2；`design.md`、`atdd-design.md`、`tasks.md` 属 P3；代码、迁移、契约与验证属 P4；Living Spec 合并与归档属 P5。