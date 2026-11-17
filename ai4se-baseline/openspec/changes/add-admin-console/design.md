# 技术设计 — add-admin-console

- **Change：** `add-admin-console`（REQ-018 / S19–S24：用户管理、账号暂停封禁、举报处置、人工客服）
- **输入：** 三份 Delta Spec（14 Requirement / 61 Scenario）、`proposal.md`（19 项决策）、`dov-ac-review.md`、`g1-decision.md`（Pass，2026-11-17）、现有 `openapi.yaml` 0.11.0、`V17__meeting_areas.sql`、`AuthServiceImpl` / `DemoUserServiceImpl` / `ReportServiceImpl` / `ChatServiceImpl`、`frontend/src/{App,route,api,types}.ts`、`AppShell.tsx`
- **日期：** 2026-11-17
- **契约 / 迁移：** `openapi.yaml` **0.13.0**；`V19__admin_console.sql`（避开 `add-ai-itinerary` 的 0.12.0 / V18）
- **口径：** 本文件只做技术设计，不含实现代码；任务拆分见 `tasks.md`，验收分层见 `atdd-design.md`

## 1. 目标与边界

一次交付三个后台能力与两个用户侧入口，全部落在既有 SPA 与既有后端分层内：

```text
用户侧                        管理端（role=ADMIN）            数据
#/help ── 联系人工客服 ──┐
        └ 我的举报 ─────┼── GET /help/reports ───────────► reports
                        │
                        └── /service/sessions/** ───────► customer_service_sessions
                                                          customer_service_messages
                                                               ▲
#/admin/users      ── /admin/users/**      ──┐                 │
#/admin/users/{id} ── /admin/users/{id}/status ──► app_users（status / ban_*）
#/admin/reports    ── /admin/reports/**    ──┘   reports（status / resolution_*）
#/admin/service/** ── /admin/service/sessions/** ─┘
```

不做：SSO / 二次认证 / 操作审计流水 / 申诉 / 处罚通知 / 内容下架 / 永久删除 / WebSocket / 附件 / 满意度 / 邮箱验证。

## 2. 数据模型（V19）

### 2.1 `app_users` 新增列

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `email` | `VARCHAR(120)` | 可空；`CREATE UNIQUE INDEX ux_app_users_email ON app_users(email)` | 注册选填；写入前去空白转小写；既有账号为 `NULL` |
| `role` | `VARCHAR(10)` | `NOT NULL DEFAULT 'USER'` | `USER` / `ADMIN` |
| `status` | `VARCHAR(12)` | `NOT NULL DEFAULT 'ACTIVE'` | `ACTIVE` / `SUSPENDED` / `BANNED` |
| `status_reason` | `VARCHAR(200)` | 可空 | 最近一次处罚 / 恢复的处理原因 |
| `status_updated_at` | `VARCHAR(40)` | 可空 | ISO-8601 字符串，与既有时间列一致 |
| `status_updated_by` | `INTEGER` | 可空 | 操作管理员 `id`，不建外键（避免删除阻塞） |
| `ban_expires_at` | `VARCHAR(40)` | 可空 | 解封时间；仅 `BANNED` 有值 |
| `ban_reason_code` | `VARCHAR(24)` | 可空 | 8 项枚举 |
| `ban_reason_note` | `VARCHAR(200)` | 可空 | `OTHER` 必填；其余可选补充 |

回填：`UPDATE app_users SET role='USER', status='ACTIVE' WHERE role IS NULL OR status IS NULL;`（列默认值已覆盖，仍需显式回填以防旧行被 NULL 覆盖）。

### 2.2 `reports` 新增列

| 列 | 类型 | 说明 |
|---|---|---|
| `status` | `VARCHAR(12) NOT NULL DEFAULT 'PENDING'` | `PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED` |
| `processed_by` | `INTEGER` | 开始处理的管理员；任一管理员可继续处理，此列只记最近一次 |
| `processing_at` | `VARCHAR(40)` | 开始处理时间 |
| `resolved_at` | `VARCHAR(40)` | 处理完成时间 |
| `resolution_note` | `VARCHAR(500)` | 处理备注（必填） |
| `resolution_action` | `VARCHAR(16)` | `SUSPEND` / `BAN` / `KEEP` / `UPDATE_BAN` / `REJECT` |

回填：既有 13 条举报置 `status='PENDING'`。索引：`CREATE INDEX ix_reports_status_created ON reports(status, created_at);`

### 2.3 新表

```sql
CREATE TABLE customer_service_sessions (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(12) NOT NULL,          -- WAITING / HANDLING / CLOSED
    created_at VARCHAR(40) NOT NULL,
    joined_at VARCHAR(40),
    joined_by INTEGER,
    closed_at VARCHAR(40),
    closed_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);
CREATE INDEX ix_service_sessions_user ON customer_service_sessions(user_id, status);
CREATE INDEX ix_service_sessions_status ON customer_service_sessions(status, created_at);

CREATE TABLE customer_service_messages (
    id INTEGER NOT NULL PRIMARY KEY,
    session_id INTEGER NOT NULL,
    sender_type VARCHAR(8) NOT NULL,      -- USER / ADMIN
    sender_id INTEGER NOT NULL,
    content VARCHAR(500) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (session_id) REFERENCES customer_service_sessions (id)
);
CREATE INDEX ix_service_messages_session ON customer_service_messages(session_id, id);
```

客服消息与 `chat_messages` **物理隔离**：两条查询链互不引用，`/me/chat-partners`、`/trips/{id}/messages` 不会读到客服数据。

### 2.4 种子 `admin`

`INSERT INTO app_users (id, username, password_hash, nickname, avatar_initial, school, bio, interests, created_at, email, role, status) VALUES (…, 'admin', 'pbkdf2$120000$…', '平台管理员', '管', '', '', '[]', …, NULL, 'ADMIN', 'ACTIVE');`

- 密码明文 **`admin12345`**（发起人 2026-11-17 选定），只写进 P4 交付说明与 `docs/sdd/add-admin-console/p4-verify.md`，**不写进规格、前端、i18n**。
- 散列用与 `PasswordUtils.hash` 一致的格式（`pbkdf2$120000$salt$hash`，PBKDF2-HMAC-SHA256、16 字节盐、32 字节密钥、Base64URL 无填充），P4 用一次性命令生成后粘进迁移。
- `id` 取 `MAX(id)+1` 的固定值不现实（迁移在空库与存量库都要跑），改用显式 id `1000` 并 `INSERT … WHERE NOT EXISTS` 保证幂等；若未来冲突，迁移测试会先失败。

## 3. 枚举（唯一真源）

| 枚举 | 值 | 使用处 |
|---|---|---|
| `AccountRoleEnum` | `USER` / `ADMIN` | 权限判定、种子、契约 `role` |
| `AccountStatusEnum` | `ACTIVE` / `SUSPENDED` / `BANNED` | 状态机、守卫、列表筛选 |
| `BanReasonEnum` | `HARASSMENT` / `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` / `OTHER` | 封禁表单、用户资料页 |
| `ReportStatusEnum` | `PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED` | 举报队列、`#/help` |
| `ReportResolutionActionEnum` | `SUSPEND` / `BAN` / `KEEP` / `UPDATE_BAN` / `REJECT` | `reports.resolution_action` |
| `ServiceSessionStatusEnum` | `WAITING` / `HANDLING` / `CLOSED` | 客服工作台、用户页 |

Java 侧沿用现有风格（`ApplicationStatusEnum`）：`enum` + `code()` + `of(String)`；非法值抛 `InvalidInputException`（400 `INVALID_INPUT`）。**线上值统一大写**（与已签 Delta 一致），与 `@rule:api-contract` 的小写约定偏离的原因见 D16。

## 4. 契约 0.13.0

### 4.1 端点

| 方法 | 路径 | 身份 | 说明 |
|---|---|---|---|
| GET | `/admin/users` | Bearer + ADMIN | 分页 + `q`（ID 精确 / 昵称包含 / 邮箱包含，忽略大小写）+ `status` 筛选；默认 `created_at DESC, id DESC` |
| GET | `/admin/users/{userId}` | Bearer + ADMIN | 资料 + 状态/处罚 + 行程 + 体验 + 相关举报；不存在 404 `USER_NOT_FOUND` |
| POST | `/admin/users/{userId}/status` | Bearer + ADMIN | `action ∈ {SUSPEND, BAN, RESTORE}`；非法迁移 409 `INVALID_STATUS_TRANSITION`；自罚 409 `CANNOT_TARGET_SELF` |
| GET | `/admin/reports` | Bearer + ADMIN | 分页 + `status` 筛选；`created_at DESC` |
| GET | `/admin/reports/{reportId}` | Bearer + ADMIN | 举报上下文 + 处置历史；不存在 404 `REPORT_NOT_FOUND` |
| POST | `/admin/reports/{reportId}/start` | Bearer + ADMIN | `PENDING → PROCESSING`；非 `PENDING` 409 `REPORT_NOT_PENDING` |
| POST | `/admin/reports/{reportId}/resolve` | Bearer + ADMIN | `PROCESSING → RESOLVED / REJECTED` + 同事务处罚；非 `PROCESSING` 409 `REPORT_NOT_PROCESSING` |
| GET | `/admin/service/sessions` | Bearer + ADMIN | 分页 + `status` 筛选；`WAITING` 按 `created_at ASC`，其余 `DESC` |
| GET | `/admin/service/sessions/{sessionId}` | Bearer + ADMIN | 会话 + 用户资料 + 相关举报 + 完整消息 |
| POST | `/admin/service/sessions/{sessionId}/join` | Bearer + ADMIN | `WAITING → HANDLING`；并发失败 409 `SESSION_ALREADY_HANDLING` |
| POST | `/admin/service/sessions/{sessionId}/close` | Bearer + ADMIN | `HANDLING → CLOSED`；非 `HANDLING` 409 `SESSION_NOT_HANDLING` |
| GET | `/help/reports` | Bearer | 当前用户自己的举报（编号、对象、类型、时间、状态），不含备注与被举报人处罚 |
| GET | `/service/sessions/current` | Bearer | 当前 `WAITING / HANDLING` 会话 + 消息；无则 `null` |
| POST | `/service/sessions` | Bearer | 创建或返回既有未结束会话；`BANNED` 403 `ACCOUNT_BANNED` |
| GET | `/service/sessions/{sessionId}/messages` | Bearer | 本人会话的消息（升序）；非本人 404 |
| POST | `/service/sessions/{sessionId}/messages` | Bearer | 1–500 字；`CLOSED` 409 `SESSION_CLOSED` |

用户侧 `/help/**` 与 `/service/**` 一律用 Bearer 识别身份（见 D17）：举报归属与客服消息发送者都不能建立在可伪造的 `X-User-Id` 上。

`POST /api/auth/register` 增可选 `email`：去空白转小写，`^[^@\s]+@[^@\s]+\.[^@\s]+$` 校验，唯一冲突 409 `EMAIL_TAKEN`；`role` / `status` 字段被客户端携带时**忽略**。

### 4.2 Schema 增量

| Schema | 变更 |
|---|---|
| `DemoUser` | 增只读 `role`、`status`（`/auth/me`、`/users` 用于前端入口与只读态；不含 `email`） |
| `AuthRegisterRequest` | 增可选 `email` |
| `AdminUserSummary` | `id / nickname / avatar_initial / avatar_url / email / role / status / created_at` |
| `AdminUserDetail` | summary + `school / city / major / job / bio / interests[] / status_reason / status_updated_at / status_updated_by{id,nickname} / ban_expires_at / ban_reason_code / ban_reason_note / trips[] / experiences[] / reports[] / trip_total / experience_total / report_total`；三个列表各取最近 50 条（`trip_total` 等为全量计数），超出时前端显示「仅显示最近 50 条」 |
| `AdminUserStatusRequest` | `action`（`SUSPEND` / `BAN` / `RESTORE`）、`reason`（`SUSPEND` / `BAN` 必填，`RESTORE` 可选，≤200）、`ban_reason_code`、`ban_reason_note`（`OTHER` 必填）、`ban_expires_at`（仅 `BAN` / `UPDATE_BAN` 必填，须晚于当前时间） |
| `AdminReportSummary` | `id / code / target_type / target_id / target_label / reporter{id,nickname} / reported_user{id,nickname,status} / reason / created_at / status` |
| `AdminReportDetail` | summary + `note / target{type,id,label,exists,content_excerpt} / processed_by{id,nickname} / processing_at / resolved_at / resolution_note / resolution_action` |
| `AdminReportResolveRequest` | `outcome ∈ {RESOLVED, REJECTED}`、`note`（必填，≤500）、`action`（`outcome=RESOLVED` 必填：`SUSPEND` / `BAN` / `KEEP` / `UPDATE_BAN`；`outcome=REJECTED` 时忽略并固定 `REJECT`）、`ban_reason_code`、`ban_reason_note`、`ban_expires_at` |
| `ServiceSessionSummary` | `id / user{id,nickname,avatar_initial,email,status,created_at} / status / created_at / joined_at / closed_at / last_message_at / message_count` |
| `ServiceSessionDetail` | summary + `messages[]` |
| `ServiceMessage` | `id / session_id / sender_type / sender_id / sender_nickname / content / created_at` |
| `HelpReportSummary` | `id / code / target_type / target_id / target_label / reason / created_at / status`；`GET /help/reports` 按 `created_at DESC` 返回，`total` 为本人举报总数，超过 50 条只返回最近 50 条 |
| `ServiceSessionPage` / `AdminUserPage` / `AdminReportPage` | 沿用 `PageResponse` 语义（`page` 从 1 起、`size` 默认 20 上限 50） |

`target_label`：用户对象为该用户昵称；行程对象为行程标题；体验对象为体验标题。`target.content_excerpt` 给管理员判断「被举报内容」的上下文：行程取「标题 + 目的地 + 出发日期」摘要，体验取正文前 200 字，用户取简介前 200 字；`target.exists=false` 时 `content_excerpt` 为 `null`，前端显示「内容已不可用」且不提供跳转。详情页同时提供到 `#/users/{id}`、`#/trips/{id}`、`#/share/{id}` 的跳转。

### 4.3 错误码（L-04 收口）

| 错误码 | HTTP | 触发 | 实现 |
|---|---|---|---|
| `ADMIN_REQUIRED` | 403 | 已登录但 `role != ADMIN` | `AdminRequiredException` |
| `ACCOUNT_SUSPENDED` | 403 | `SUSPENDED` 执行四类写操作 | `AccountSuspendedException` |
| `ACCOUNT_BANNED` | 403 | `BANNED` 执行任意业务写操作（含举报、客服消息） | `AccountBannedException` |
| `INVALID_STATUS_TRANSITION` | 409 | 非法账号状态迁移（含 `ACTIVE → ACTIVE`、`BANNED → 任意`） | `InvalidStatusTransitionException` |
| `CANNOT_TARGET_SELF` | 409 | 管理员暂停 / 封禁自己（恢复不受限） | `CannotTargetSelfException` |
| `USER_NOT_FOUND` | 404 | 后台用户详情 / 状态迁移目标不存在 | `UserNotFoundException`（复用并补状态码） |
| `REPORT_NOT_FOUND` | 404 | 后台举报详情 / 处理目标不存在 | `ReportNotFoundException`（新增） |
| `REPORT_NOT_PENDING` | 409 | 对非 `PENDING` 举报执行开始处理 | `ReportNotPendingException` |
| `REPORT_NOT_PROCESSING` | 409 | 对非 `PROCESSING` 举报执行处理 | `ReportNotProcessingException` |
| `EMAIL_TAKEN` | 409 | 注册邮箱与既有账号冲突 | `EmailTakenException` |
| `SESSION_ALREADY_HANDLING` | 409 | 并发接入已被接走的 `WAITING` 会话 | `SessionAlreadyHandlingException` |
| `SESSION_NOT_HANDLING` | 409 | 对非 `HANDLING` 会话执行结束 | `SessionNotHandlingException` |
| `SESSION_CLOSED` | 409 | 对 `CLOSED` 会话发送消息 | `SessionClosedException` |

沿用既有：`INVALID_INPUT` 400、`SESSION_INVALID` 401、`DEMO_USER_REQUIRED` 401、`EMAIL_TAKEN` 之外的唯一冲突、`INTERNAL_ERROR` 500。业务拒绝统一 409（与 `@rule:api-contract` 的 422 约定偏离，见 D15）。所有错误码进 P4 的 `OpenApiTest` 断言（端点 × 错误码 × 状态）。

## 5. 后端设计

### 5.1 分层与新增类

```text
controller/AdminUserController        /api/admin/users/**
controller/AdminReportController      /api/admin/reports/**
controller/AdminServiceController     /api/admin/service/sessions/**
controller/ServiceController          /api/service/sessions/**
controller/HelpController             /api/help/reports
service/AdminPrincipalService         Bearer → DemoUser + role=ADMIN 校验（共用）
service/AccountStatusService          迁移合法性、有效状态、惰性解封、写操作守卫
service/AdminUserService              列表 / 详情 / 状态迁移
service/AdminReportService            队列 / 详情 / start / resolve（跨表事务）
service/CustomerService               会话生命周期 + 消息
service/impl/*ServiceImpl             与既有 AbstractServiceImpl 一致
entity/CustomerServiceSessionEntity   新表映射
entity/CustomerServiceMessageEntity
response/Admin*、Service*、HelpReportSummary
request/AdminUserStatusRequest、AdminReportResolveRequest、ServiceMessageRequest
exception/上述 12 个业务异常（各声明 code + HttpStatus）
enums/AccountRoleEnum、AccountStatusEnum、BanReasonEnum、ReportStatusEnum、
      ReportResolutionActionEnum、ServiceSessionStatusEnum
```

`GlobalExceptionHandler` 不改：12 个异常均继承 `BusinessException`，自动映射。

### 5.2 管理端鉴权

```text
AdminPrincipalService.requireAdmin(authorization):
  token = bearer(authorization)            // 缺失 / 空 → 401 SESSION_INVALID
  user  = authService.requireUser(token)   // 既有实现：会话有效 + 账号存在
  status = accountStatusService.effective(user.id())
  if (user.role() != ADMIN)                → 403 ADMIN_REQUIRED
  if (status == BANNED)                    → 403 ACCOUNT_BANNED     // 管理员同样受状态约束
  if (status == SUSPENDED)                 → 403 ACCOUNT_SUSPENDED
  return principal(user.id())
```

- `role` 从 `app_users` 每请求读取，不放进会话快照，避免降权后仍可访问。
- 前端只负责隐藏入口；`#/admin/**` 直链由页面自身以 403 态兜底，**不**成为安全边界。

### 5.3 账号状态机与惰性解封

```text
ACTIVE    --SUSPEND--> SUSPENDED     （reason 必填）
ACTIVE    --BAN------> BANNED        （reason + ban_reason_code + ban_expires_at > now）
SUSPENDED --BAN------> BANNED
SUSPENDED --RESTORE--> ACTIVE
其余组合 → 409 INVALID_STATUS_TRANSITION（含 ACTIVE→ACTIVE、BANNED→*）
```

```text
effectiveStatus(row, now):
  if row.status == BANNED && row.ban_expires_at != null && !ban_expires_at.isAfter(now):
      return ACTIVE                    // 读路径只计算，不写库
  return row.status

refreshIfExpired(row):
  // 只在写事务内调用：把到期的 BANNED 落库为 ACTIVE；
  // ban_reason_code / ban_expires_at / status_reason 保留为历史，不清空。
```

- **字段保留策略：** 到期后只改 `status`，`ban_reason_code` / `ban_expires_at` / `status_reason` 保留为历史；封禁信息展示以 `effectiveStatus == BANNED` 为唯一开关（满足「恢复后不再展示」）。
- `status_updated_by` 记录操作管理员；`status_updated_at` 用注入的 `Clock` 取 `Instant` 字符串，P4 可用固定 `Clock` 覆盖到期前 / 后。
- `RESTORE` 的 `reason` 可选：填写则写入 `status_reason`，留空则写固定文案「管理员恢复账号」并记录操作人，保证后台「最近操作」始终有值。

### 5.4 受限账号守卫

守卫放在**服务层写入口第一行**，不依赖拦截器（同一端点可能读多写一，且身份来源不同）：

| 写入口 | `SUSPENDED` | `BANNED` |
|---|---|---|
| `TripPlanService.create` | 403 `ACCOUNT_SUSPENDED` | 403 `ACCOUNT_BANNED` |
| `ApplicationService.apply` | 403 `ACCOUNT_SUSPENDED` | 403 `ACCOUNT_BANNED` |
| `ChatService.send` | 403 `ACCOUNT_SUSPENDED` | 403 `ACCOUNT_BANNED` |
| `ExperienceService.upsert` | 403 `ACCOUNT_SUSPENDED` | 403 `ACCOUNT_BANNED` |
| `ReportService.submit` | 允许 | 403 `ACCOUNT_BANNED` |
| `CustomerService.sendMessage` | 允许 | 403 `ACCOUNT_BANNED` |
| `CustomerService.createSession` | 允许 | 403 `ACCOUNT_BANNED` |

- 守卫实现：`accountStatusService.assertCanWrite(userId, WriteScope.BUSINESS | REPORT | SUPPORT)`；`SUSPENDED` 只拦 `BUSINESS`。
- 校验顺序：先身份（401）→ 再账号状态（403）→ 再业务校验（404 / 409 / 400），保证「受限用户拿不到业务细节」。
- 读路径不改：`SUSPENDED` / `BANNED` 仍可登录、浏览、读自己的数据。
- 守卫在事务内调用 `refreshIfExpired`，到期用户的下一次写操作顺带落库为 `ACTIVE`。

### 5.5 举报生命周期与事务

```text
PENDING --start--> PROCESSING --resolve(RESOLVED)--> RESOLVED   [+ 同事务处罚]
                              --resolve(REJECTED)--> REJECTED
打开详情不改状态；start 对非 PENDING → 409；resolve 对非 PROCESSING → 409
```

`AdminReportService.resolve` 单事务：

1. 条件更新：`UPDATE reports SET status='RESOLVED', … WHERE id=? AND status='PROCESSING'`；影响行数 0 → 409 `REPORT_NOT_PROCESSING`（防并发重复处理）。
2. `outcome=RESOLVED` 时按 `action` 调 `AccountStatusService`：
   - `SUSPEND`：被举报用户必须为 `ACTIVE` 或 `SUSPENDED`（`SUSPENDED` 视为幂等续期，不报错）；
   - `BAN`：`ACTIVE` / `SUSPENDED` → `BANNED`；
   - `KEEP`：被举报用户为 `SUSPENDED` 时维持暂停；
   - `UPDATE_BAN`：被举报用户必须为 `BANNED`，只更新 `ban_reason_code` / `ban_reason_note` / `ban_expires_at`。
   非法组合 → 409 `INVALID_STATUS_TRANSITION`，整个事务回滚（举报不会变成 `RESOLVED`）。
3. `outcome=REJECTED`：不碰 `app_users`，`resolution_action='REJECT'`。

`reported_user` 推导（列表与详情共用一处）：`target_type=user → target_id`；`trip → trip_plans.publisher_id`；`experience → trip_experiences.author_id`。目标被删（当前无删除能力）时 `reported_user` 为 `null`、`target.exists=false`。

### 5.6 客服会话

```text
POST /service/sessions:
  guard(SUPPORT, user)                 // BANNED → 403
  open = findFirst(user, status in (WAITING, HANDLING))
  if open != null → return open        // 幂等，不新建
  insert WAITING (created_at=now)
  return detail

POST /admin/service/sessions/{id}/join:
  UPDATE ... SET status='HANDLING', joined_by=admin, joined_at=now
   WHERE id=? AND status='WAITING'
  影响 0 行 → 409 SESSION_ALREADY_HANDLING   // 并发只有第一个成功

POST /admin/service/sessions/{id}/close:
  UPDATE ... SET status='CLOSED', closed_by=admin, closed_at=now
   WHERE id=? AND status='HANDLING'
  影响 0 行 → 409 SESSION_NOT_HANDLING

POST /service/sessions/{id}/messages | 管理端回复：
  会话属于当前用户（用户侧）或存在（管理端）
  status == CLOSED → 409 SESSION_CLOSED
  content trim 后 1–500 字，否则 400 INVALID_INPUT
  sender_type 由服务端判定（role=ADMIN → ADMIN），客户端 `senderRole` 一律忽略
```

- 单活跃会话用「事务内查询 + 插入」保证；不加部分唯一索引（H2 兼容性差、迁移测试面更大）。
- 管理端消息落库同样走 `customer_service_messages`，`sender_type='ADMIN'`。
- 3s 轮询：管理端轮询 `GET /admin/service/sessions/{id}`（含消息）；用户端轮询 `GET /service/sessions/current`。`CLOSED` 后前端停止轮询。

## 6. 前端设计

### 6.1 路由与入口

`route.ts` 新增：

| 路由 | Route | 页面 |
|---|---|---|
| `#/admin/users` | `adminUsers` | `AdminUsersPage` |
| `#/admin/users/{id}` | `adminUserDetail` | `AdminUserDetailPage` |
| `#/admin/reports` | `adminReports` | `AdminReportsPage` |
| `#/admin/reports/{id}` | `adminReportDetail` | `AdminReportDetailPage` |
| `#/admin/service` | `adminService` | `AdminServicePage` |
| `#/admin/service/{id}` | `adminServiceDetail` | `AdminServiceDetailPage` |
| `#/help` | `help` | `HelpPage` |

- 管理入口：`AppShell` 侧栏 / 底部导航在 `currentUser.role === 'ADMIN'` 时多一项「管理后台」（`#/admin/users`）。普通用户不渲染该节点。
- `route.ts` 的解析与 `routeToHash` 补 7 条，均可用纯函数单测；`notFound` 行为不变。
- 直链兜底：`AdminGuard`（前端组件，不是安全边界）在 `role !== 'ADMIN'` 时渲染无权限页并显示「返回首页」，不发起任何 `/api/admin/**` 请求。
- 后台页面**不修改** `AppShell` 的既有导航语义：使用页面内 `AdminLayout`（标题 + 三个 Tab：用户管理 / 举报管理 / 客户服务 + 「返回前台」），不新建第二套全局壳。

### 6.2 页面与组件

```text
frontend/src/admin/
  AdminLayout.tsx        后台页头 + Tab + 面包屑
  AdminGuard.tsx         角色兜底 + 403 态
  adminStatus.ts         状态 → 文案 / 徽标色 / 可执行动作（纯函数）
  adminStatus.test.ts
  users/AdminUsersPage.tsx        搜索（ID/昵称/邮箱）+ 状态筛选 + 分页表格
  users/AdminUserDetailPage.tsx   资料卡 + 状态卡 + 关联内容 + 处罚弹窗
  users/StatusActionModal.tsx     暂停 / 封禁 / 恢复，二次确认 + 理由 + 8 项理由 + 解封时间
  users/userActionForm.ts         表单校验纯函数（理由必填、OTHER 必填说明、时间必须晚于现在）
  reports/AdminReportsPage.tsx    队列 + 状态筛选 + 分页
  reports/AdminReportDetailPage.tsx 上下文 + 开始处理 + 成立/不成立 + 备注必填
  reports/reportActionForm.ts     处理表单校验纯函数
  service/AdminServicePage.tsx    三栏工作台：队列 / 会话 / 用户与举报
  service/AdminServiceDetailPage.tsx 窄屏时独立详情
  service/ServiceConversation.tsx 消息列表 + 输入框 + 只读态

frontend/src/help/
  HelpPage.tsx            两个区块：联系人工客服 / 我的举报
  ServiceChat.tsx         用户侧会话（发起、发送、等待接入、已结束只读）
  helpStatus.ts           四态文案映射（与后台共用一份映射表）
```

- 表格用 antd `Table`（`size="middle"`、`rowKey="id"`）；窄屏（`<768px`）切卡片列表（`.admin-card-list`），不出现横向滚动。
- 状态徽标复用 `StatusBadge` 的配色令牌，不新增硬编码色值。
- 全部文案进 `frontend/src/i18n/adminMessages.ts`（含 `#/help`），不散落中文字面量；纯逻辑文件不 import React，便于单测。

### 6.3 状态与轮询

- 列表页：筛选 / 分页状态放组件 `useState`，不走 URL（与现有 `MyTripsPage` 一致）；`reload()` 统一封装 `api.ts` 调用与错误映射。
- 详情页：动作成功后 `reload()` 并回写列表缓存（返回列表时重新拉取，不做全局 store）。
- 错误映射：`ADMIN_REQUIRED` → 403 页；`ACCOUNT_*` → 顶部 Alert；`INVALID_STATUS_TRANSITION` / `CANNOT_TARGET_SELF` → `message.warning` + 刷新详情。
- 轮询：复用 `startChatPolling` 与 `CHAT_POLL_INTERVAL_MS`；`CLOSED` 或组件卸载即停止；页面不可见（`document.hidden`）时跳过本次 tick，不额外引入可见性库。

### 6.4 文案映射（L-03 收口）

| 状态 | 用户侧「我的举报」 | 管理端列表 / 详情 |
|---|---|---|
| `PENDING` | 待处理 | 待处理 |
| `PROCESSING` | 已受理，正在处理 | 处理中 |
| `RESOLVED` | 已处理 | 已处理 |
| `REJECTED` | 举报不成立 | 举报不成立 |

单一映射表在 `helpStatus.ts` 导出（`reporterStatusLabel` / `adminStatusLabel` / `statusTone`），后台页与 `#/help` 都引用它，P4 单测断言四个键各返回固定字符串。

### 6.5 三档布局

| 视口 | 用户管理 / 举报 | 客服工作台 | 用户侧帮助 |
|---|---|---|---|
| 1440 | 表格 6+ 列，详情双列 | 三栏（队列 280 / 会话自适应 / 上下文 320） | 左右两列 |
| 768 | 表格隐藏次要列（头像并到昵称列） | 两栏，上下文收进 Drawer | 上下堆叠 |
| 390 | 卡片列表，状态与操作同一行换行 | 单栏：队列 → 会话，详情独立路由 | 单列，输入框贴底 |

## 7. 决策记录

### D1 管理端身份用 Bearer 会话 + `role` 校验

- **Context：** 业务端点用 `X-User-Id`（可伪造），管理员权限必须服务端可信。
- **选择：** 管理端统一要求 `Authorization: Bearer <token>`，再查 `role=ADMIN`；与 `PUT /users/me/profile` 的既有做法一致。
- **拒绝：** ① 沿用 `X-User-Id` 判角色——伪造即可提权；② 改造全部业务端点为 Bearer——超出本 change 范围（提案 Out of scope 已登记）。

### D2 后台页面复用现有 `AppShell`，页内 `AdminLayout`

- **Context：** 提案写的是 `AdminShell`；但现有壳已含顶栏、侧栏、移动 Tab 与主题。
- **选择：** 后台作为 `AppShell` 的子页面，加页内 Tab 导航；移动端沿用现有底部 Tab。
- **拒绝：** ① 独立 `AdminShell`——两套导航、两套主题与断点，维护成本翻倍且跳转丢失身份面板；② 直接把后台塞进前台导航——普通用户会看到不可用入口。

### D3 状态迁移用单端点 + `action` 枚举

- **Context：** 三条迁移 + 二次确认 + 理由 + 8 项理由 + 解封时间。
- **选择：** `POST /admin/users/{userId}/status`，`action ∈ {SUSPEND, BAN, RESTORE}`；服务端按当前状态判定合法性。
- **拒绝：** ① `/suspend`、`/ban`、`/restore` 三端点——错误码与校验重复三份；② `PATCH /admin/users/{userId}` 传完整资料——会把处罚与资料编辑混在同一 DTO。

### D4 封禁到期惰性恢复：读时计算、写时落库

- **Context：** 无定时任务；`ban_expires_at` 到期后应按 `ACTIVE` 放行。
- **选择：** `effectiveStatus` 纯函数在读取时计算；写事务内 `refreshIfExpired` 把 `status` 落为 `ACTIVE` 并保留历史列。
- **拒绝：** ① 定时任务——MVP 不引入调度；② 读接口写库——GET 带副作用、并发写冲突；③ 到期即清空 `ban_*`——丢失审计线索。

### D5 账号守卫用服务层显式调用，不用拦截器 / AOP

- **Context：** 六个写入口，身份来源不同（`X-User-Id` vs Bearer），读接口必须放行。
- **选择：** `AccountStatusService.assertCanWrite(userId, scope)` 在各 `XxxServiceImpl` 写方法首行调用；范围枚举区分业务 / 举报 / 客服。
- **拒绝：** ① `HandlerInterceptor` 按路径匹配——同一路径的 GET 必须放行、POST 必须拦截，规则脆弱；② 自定义注解 + AOP——隐式、难在测试中定位，且与现有「无 AOP 业务切面」的风格不符。

### D6 举报处理用条件更新 + 单事务

- **Context：** 并发管理员可能同时处理同一条举报；处罚跨 `reports` 与 `app_users` 两张表。
- **选择：** `resolve` 在 `@Transactional` 内先 `UPDATE … WHERE status='PROCESSING'`，影响 0 行即 409；再执行账号处罚；任一失败整体回滚。
- **拒绝：** ① 先查后改（TOCTOU）——并发下会重复处理；② 举报与处罚分两次提交——会出现「举报已处理但账号未处罚」。

### D7 客服消息独立表

- **Context：** 既有 `chat_messages` 绑定 `(trip_id, sender, receiver)`，并入客服会话会污染「同行消息」。
- **选择：** 新建 `customer_service_sessions` + `customer_service_messages`，与行程聊天零共享。
- **拒绝：** ① 复用 `chat_messages` 加 `kind='SERVICE'`——现有查询全部要加过滤条件，回归面大；② 把客服会话建成「系统行程」——语义扭曲，且会出现在我的旅行里。

### D8 客服实时性复用 3s 短轮询

- **Context：** 现有聊天已用 `CHAT_POLL_INTERVAL_MS = 3000` 并有单测。
- **选择：** 复用同一常量与 `startChatPolling`；`CLOSED` 与卸载时清理。
- **拒绝：** ① WebSocket / SSE——提案 Out of scope，且要改部署与代理；② 无刷新（手动刷新）——不满足「3 秒内看到」。

### D9 单活跃会话：事务内查询 + 插入

- **Context：** 同一用户不得同时有多个 `WAITING / HANDLING`；SQLite 与 H2 都要跑迁移测试。
- **选择：** `POST /service/sessions` 在事务内先查未结束会话，存在即返回，否则插入。
- **拒绝：** ① 部分唯一索引 `WHERE status IN (...)`——SQLite 支持但 H2 / 迁移测试兼容性差；② 应用层锁（`synchronized`）——多实例失效且掩盖数据问题。

### D10 邮箱选填、唯一、无验证

- **Context：** 故事要求列表展示与搜索邮箱；既有账号没有邮箱。
- **选择：** 注册可选 `email`，去空白转小写后唯一；冲突 409 `EMAIL_TAKEN`；既有账号 `NULL`，列表显示「未填写」。
- **拒绝：** ① 必填——存量 369 个账号无法补齐；② 不唯一——列表搜索与身份识别会歧义；③ 邮箱验证 / 找回密码——Out of scope。

### D11 不引入 `STAFF` 角色

- **Context：** 客服工作台需要「客服」身份，但 MVP 只有一类运营人员。
- **选择：** `ADMIN` 即客服；`sender_type` 由 `role` 推导。
- **拒绝：** ① 新增 `STAFF` 角色——角色矩阵与授权端点翻倍；② 用配置白名单——与 `app_users.role` 形成第二真源。

### D12 列表分页沿用 `PageResponse` 语义

- **Context：** 三张后台列表都要分页，现有 `PageResponse`（`page` 1 起、`size` 默认 20 上限 50）已被前端 `Pager` 消费。
- **选择：** 后台列表复用同一响应结构与参数校验。
- **拒绝：** ① 游标分页——前端与契约要新增一套协议；② 一次性返回全部用户——369 个账号已明显超出一屏。

### D13 后台表格用 antd `Table` + 窄屏卡片

- **Context：** 现有前台列表是自定义行式布局；后台需要排序、分页、列对齐与空态。
- **选择：** antd `Table`（`size="middle"`）承载 1440 / 768；`<768px` 渲染卡片列表；两套共用同一份数据与文案。
- **拒绝：** ① 全部自研表格——分页、空态、可访问性重复实现；② 只做卡片——1440 下信息密度不足。

### D14 四态文案集中映射

- **Context：** L-03 指出 `PENDING` 与 `PROCESSING` 可能被写成同一个词。
- **选择：** `helpStatus.ts` 导出 `reporterStatusLabel` / `adminStatusLabel` / `statusTone`，两侧共用；P4 单测锁定四个键。
- **拒绝：** 各页面内联中文——改文案要改多处，且无法用单测锁定。

### D15 业务规则拒绝统一 409（与 `api-contract` 规则文本的已知偏离）

- **Context：** `@rule:api-contract` 把「业务规则拒绝」定为 422，但仓库既有的业务异常（`ApplicationNotPendingException`、`TripNotOpenException`、`DuplicateApplicationException` 等 6 个）全部返回 409；已签 Delta 的 12 个错误码也写的是 409。
- **选择：** 新端点沿用 409；`INVALID_INPUT`（400）只用于格式 / 长度 / 枚举值非法。
- **拒绝：** ① 新端点改 422——同一仓库出现两套业务拒绝语义，前端要按端点分支处理；② 全仓改 422——超出本 change 范围，且要重开已签 Delta 与既有测试。
- **收口：** 发起人 2026-11-17 确认「保持与已签 Delta 一致」；规则文本与代码的统一另开 change，登记在 `docs/reviews/20261117-add-admin-console-design-review.md` 的 residual risk。

### D16 枚举线上值用大写（与「枚举小写」规则文本的已知偏离）

- **Context：** 规则写「枚举 = 小写字符串」，现有 `TripStatusEnum` 用 `recruiting` / `completed`；用户需求与已签 Delta 明确写 `ACTIVE` / `SUSPENDED` / `BANNED`、`PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED`、`WAITING` / `HANDLING` / `CLOSED`。
- **选择：** 新枚举线上值大写，Java 枚举常量同名；`openapi.yaml` 用 `enum: [ACTIVE, SUSPENDED, BANNED]` 显式声明。
- **拒绝：** ① 改小写——要改已签 Delta 的全部场景与错误码断言，并与用户原话不一致；② 大小写混用——前端无法用单一比较。
- **收口：** 发起人 2026-11-17 确认「保持已签 Delta」；与 `TripStatusEnum` 的风格差异作为 residual risk 登记。

### D17 用户侧 `/help/**` 与 `/service/**` 用 Bearer

- **Context：** 既有业务读接口广泛使用 `X-User-Id`（可伪造）。「我的举报」必须只返回本人数据，客服消息发送者必须是可验证的本人；这两处若沿用 `X-User-Id`，改一个请求头即可读别人的举报、冒充他人发客服消息。
- **选择：** 用户侧 `/help/reports`、`/service/sessions/**` 一律要求 `Authorization: Bearer <token>`，身份由 `AuthService` 校验会话后取得；`X-User-Id` 在这些端点上被忽略。
- **拒绝：** ① 沿用 `X-User-Id`——私信与举报归属直接可越权读取（安全基线不可接受）；② 双头并存（无 Bearer 时回落 `X-User-Id`）——回落分支相当于保留漏洞，等于没修；③ 顺手把全部业务端点改 Bearer——超出本 change 范围（提案 Out of scope 已登记）。
- **收口：** 与 D1 同一条安全理由；前端 `api.ts` 新增 Bearer 请求封装，`HelpPage` / `ServiceChat` 只走新封装。BANNED 用户仍可登录并读自己的举报，只是不能发新消息 / 新会话。

## 8. 追溯

| Requirement | 设计落点 |
|---|---|
| `admin-console` 管理员身份与后台访问控制 | §5.2、§6.1、D1 |
| 用户列表与搜索 | §4.1、§4.2、§6.2、D12 / D13 |
| 用户详情与关联内容 | §4.2、§5.1、§6.2 |
| 账号状态迁移与处罚 | §5.3、§4.3、D3 / D4 / D6 |
| 受限账号的功能边界 | §5.4、D5 |
| 封禁信息展示 | §5.3 字段保留策略、§6.2 状态卡 |
| 举报队列与筛选 | §4.1、§5.5、D6 |
| 举报详情与处理 | §5.5、§6.2、D6 |
| 客服工作台 | §5.6、§6.2、D7 / D11 |
| `customer-service` 帮助与反馈入口与我的举报状态 | §4.1、§6.1、§6.2、§6.4、D14 / D17 |
| 人工客服会话生命周期 | §5.6、§6.3、D9 / D17 |
| 客服消息与短轮询 | §5.6、§6.3、D8 / D17 |
| 客服会话历史保留 | §2.3、§5.6、D7 |
| `user-auth` 注册账号（邮箱 / 角色固定） | §4.1、§5.2、D10 |

## 9. 风险与遗留

- **身份伪造边界：** 业务端点仍用 `X-User-Id`；管理端与用户侧新增的 `/help/**`、`/service/**` 已改 Bearer（D1 / D17），但行程、申请、聊天、体验、举报提交等既有写路径仍基于可伪造的身份。已在 `proposal.md` 残余风险登记，P4 / G2 需显式复核。
- **本地 V16 重复迁移：** 未跟踪的 `V16__normalize_demo_user_profiles.sql` 与 `V16__add_meeting_time.sql` 并存会让 Flyway 直接失败；P4 启动前必须清理，与本 change 的 V19 无关。
- **邮箱唯一索引与既有 NULL：** SQLite 允许多个 NULL，符合预期；若未来补邮箱数据，需先处理重复。
- **admin 种子密码：** `admin12345` 仅用于本地 / 演示；真实部署必须换密码并迁移到正式鉴权（另开需求）。
- **`ban_expires_at` 为字符串时间：** 与既有 `created_at` 一致用 ISO-8601 字符串；比较在 Java 侧进行，不依赖数据库时间函数（SQLite / H2 行为一致）。
- **举报目标不可用：** 当前无删除能力，`target.exists` 恒为 `true`；保留该字段是为了未来内容下架时的兼容，不额外造删除路径。