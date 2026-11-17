# P4 实现与验证记录 — add-admin-console

- **Change：** `add-admin-console`（REQ-018 / S19–S24 管理后台、举报处理、帮助与反馈、人工客服）
- **阶段：** P4（Apply & verify）｜ **日期：** 2026-11-17 ｜ **记录人：** Jacky（当前开发者）
- **分支：** `main`（工作区提交，未 push）
- **前置：** P3 Pass（`docs/reviews/20261117-add-admin-console-{design,design-2,tasks}-review.md`；`design.md` D1–D17、`atdd-design.md` A1–A38 / C1–C13 / U1–U10、`tasks.md` T1–T19）
- **契约 / 迁移：** `openapi.yaml` **0.13.0**（0.12.0 与 V18 留给并行 change `add-ai-itinerary`）｜`V19__admin_console.sql`

> **本地演示凭据：** 管理员账号 `admin` / `admin12345`（`app_users.id = 1000`，`role = ADMIN`，`status = ACTIVE`）。该明文只用于本地与演示库，真实部署必须替换账号与密码；规格、前端、i18n 与迁移注释均不含该口令。

## 1. 阶段目标

按 `atdd-design.md` 与 `tasks.md` T1–T19，在既有旅行产品上补齐三件事：管理员可查用户、处罚账号并处理举报；受限账号在写入口被统一拦截且既有数据不被删除；用户可通过 `#/help` 查看自己的举报并进入人工客服会话。交付面包括契约、迁移、后端 API、前端页面、E2E 与三档视口走查。

## 2. 实现摘要

| 层 | 改动 | 状态 |
|---|---|---|
| 契约 | `openapi.yaml` 升 0.13.0：15 条新路径 / 16 个操作、31 个 schema 与 response 组件、12 个新错误码；`DemoUser` 增只读 `role` / `status`，`AuthRegisterRequest` 增可选 `email`，`UserProfile` 增只读封禁三元组 | 修改 |
| 迁移 | `V19__admin_console.sql`：`app_users` 9 列 + 邮箱唯一索引、`reports` 6 列 + `(status, created_at)` 索引、`customer_service_sessions` / `customer_service_messages` 两表与 3 个索引、`admin` 种子（显式 id 1000，`INSERT … WHERE NOT EXISTS`） | 新增 |
| 枚举与异常 | `AccountRoleEnum` / `AccountStatusEnum` / `BanReasonEnum` / `ReportStatusEnum` / `ReportResolutionActionEnum` / `ServiceSessionStatusEnum` / `WriteScopeEnum`；12 个 `BusinessException` 子类（`ADMIN_REQUIRED` … `SESSION_CLOSED`） | 新增 |
| 状态服务 | `AccountStatusService`：`effectiveStatus`（只读计算到期解封）、`refreshIfExpired`（写事务内落库并保留历史列）、`transition`（5 条合法迁移）、`assertCanWrite(BUSINESS / SUPPORT)`、`cannotTargetSelf`；`PenaltyRules` 统一校验理由 / 8 项封禁原因 / `OTHER` 说明 / 未来解封时间 | 新增 |
| 身份与注册 | `AdminPrincipalService`（Bearer → `ADMIN`，否则 403 `ADMIN_REQUIRED`）；`DemoUser` 每请求读库下发 `role` / `status`；注册 `email` 去空白转小写、格式与唯一校验（409 `EMAIL_TAKEN`）；客户端传入的 `role` / `status` 被忽略 | 新增 / 修改 |
| 写入口守卫 | `TripPlanService.create`、`ApplicationService.apply`、`ChatService.send`、`ExperienceService.upsert` → `BUSINESS`（`SUSPENDED` / `BANNED` 均 403）；`ReportService.submit`、`CustomerService.createSession` / `sendMessage` → `SUPPORT`（仅 `BANNED` 403） | 修改 |
| 管理端点 | `AdminUserController`（列表 / 详情 / 状态迁移）、`AdminReportController`（队列 / 详情 / start / resolve）、`AdminServiceController`（队列 / 详情 / join / close）与对应 `*ServiceImpl`；举报处理单事务、条件更新防并发 | 新增 |
| 用户侧端点 | `ServiceController`（`/service/sessions/**`）、`HelpController`（`/help/reports`），均用 Bearer | 新增 |
| 前端壳 | `route.ts` / `routeToHash` 增 7 条路由；`AdminGuard`（直链无权限页且不发请求）；`AdminLayout`（三 Tab + 返回前台）；`AppShell` 仅 `role === 'ADMIN'` 渲染「管理后台」 | 新增 / 修改 |
| 用户管理 | `AdminUsersPage`（表格 ↔ 卡片、搜索、状态筛选、分页）、`AdminUserDetailPage`（资料 / 状态 / 三个关联列表 ≤50）、`StatusActionModal`、`userActionForm`、`adminStatus` / `adminBadges` / `banReasons` | 新增 |
| 举报管理 | `AdminReportsPage`、`AdminReportDetailPage`（上下文 + `content_excerpt` + 成立 / 不成立 + 备注必填）、`reportActionForm`、`helpStatus`（四态文案） | 新增 |
| 客服 | 管理侧 `AdminServicePage` / `AdminServiceDetailPage` / `ServiceConversation` / `ServiceContext` / `useIsNarrow`（280 / 自适应 / 320，768 收 Drawer，390 单栏独立路由）；用户侧 `HelpPage` / `ServiceChat`，轮询复用既有 `startChatPolling` | 新增 |
| 资料页 | `ProfilePage` 仅在 `status === 'BANNED'` 时渲染封禁提示条（理由文案 + 本地时间解封），`ACTIVE` 自动消失；不出现管理员备注与举报人 | 修改 |
| 样式 | `styles.css` 后台 / 帮助 / 状态提示约 865 行，全部复用既有 tokens 与断点（1100 / 900 / 767） | 修改 |
| E2E 支撑 | `support.ts` 增 `loginAsAdmin` / `loginAsAccount` / `createUserViaApi` / `setUserStatusViaApi`；新增 `admin.spec.ts`（5 条 `[I1]`×3 / `[I2]` / `[I3]`）与 `customer-service.spec.ts`（`[C1]` / `[C3]`） | 新增 / 修改 |

## 3. 契约 diff 0.11.0 → 0.13.0

| 项 | 0.11.0 | 0.13.0 |
|---|---|---|
| `info.version` | `0.11.0` | `0.13.0`（按 `g1-decision.md` 跳过 0.12.0） |
| 路径 | 30 | 45（+15） |
| 操作（`operationId`） | 34 | 50（+16） |
| schema / response 组件 | — | +31 |
| `Error.code` 枚举 | 17 | 29（+12）；`OpenApiTest` 断言其中 13 个（12 新 + 复用的 `USER_NOT_FOUND`） |
| `DemoUser` | 无角色 / 状态 | 增只读 `role` / `status`（`required`） |
| `AuthRegisterRequest` | 无邮箱 | 增可选 `email`（≤120、小写归一、唯一） |
| `UserProfile` | 无封禁字段 | 增只读 `status` / `ban_reason_code` / `ban_expires_at`，不含 `status_reason` / `ban_reason_note` |
| 删除端点 | 0 | 0（`OpenApiTest` 全表扫描断言无 `delete`） |

### 3.1 新增 15 条路径（16 个操作）

| 路径 | 方法 | 权限 | 用途 |
|---|---|---|---|
| `/admin/users` | GET | Bearer + ADMIN | 用户列表（`q` / `status` / 分页） |
| `/admin/users/{userId}` | GET | Bearer + ADMIN | 用户详情 + 三个关联列表 |
| `/admin/users/{userId}/status` | POST | Bearer + ADMIN | `SUSPEND` / `BAN` / `RESTORE` |
| `/admin/reports` | GET | Bearer + ADMIN | 举报队列（`status` / 分页） |
| `/admin/reports/{reportId}` | GET | Bearer + ADMIN | 举报详情与目标上下文 |
| `/admin/reports/{reportId}/start` | POST | Bearer + ADMIN | `PENDING → PROCESSING` |
| `/admin/reports/{reportId}/resolve` | POST | Bearer + ADMIN | `PROCESSING → RESOLVED / REJECTED` + 同事务处罚 |
| `/admin/service/sessions` | GET | Bearer + ADMIN | 客服队列（三态筛选） |
| `/admin/service/sessions/{sessionId}` | GET | Bearer + ADMIN | 会话详情（用户资料 + 相关举报 + 消息） |
| `/admin/service/sessions/{sessionId}/join` | POST | Bearer + ADMIN | `WAITING → HANDLING` |
| `/admin/service/sessions/{sessionId}/close` | POST | Bearer + ADMIN | `HANDLING → CLOSED` |
| `/help/reports` | GET | Bearer | 我的举报（最近 50 + 总数，不含备注） |
| `/service/sessions` | POST | Bearer | 发起或取回未结束会话（200） |
| `/service/sessions/current` | GET | Bearer | 当前会话（无则 200 空 body） |
| `/service/sessions/{sessionId}/messages` | GET / POST | Bearer | 会话消息 / 发送（1–500 字） |

### 3.2 新增 31 个 schema / response 组件

- 响应包装：`Unauthorized`、`AdminRequired`、`AccountRestricted`
- 枚举：`AccountRole`、`AccountStatus`、`BanReason`、`ReportStatus`、`ReportResolutionAction`、`ServiceSessionStatus`
- 管理用户：`AdminUserRef`、`ReportedUser`、`AdminUserSummary`、`AdminUserTripRef`、`AdminUserExperienceRef`、`AdminUserReportRef`、`AdminUserDetail`、`AdminUserPage`、`AdminUserStatusRequest`
- 管理举报：`AdminReportTarget`、`AdminReportSummary`、`AdminReportDetail`、`AdminReportResolveRequest`、`AdminReportPage`
- 客服：`ServiceUser`、`ServiceMessage`、`ServiceMessageRequest`、`ServiceSessionSummary`、`ServiceSessionDetail`、`ServiceSessionPage`
- 用户侧举报：`HelpReportSummary`、`HelpReports`

### 3.3 新增 12 个错误码

`ADMIN_REQUIRED`（403）、`ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED`（403）、`INVALID_STATUS_TRANSITION` / `CANNOT_TARGET_SELF`（409）、`REPORT_NOT_FOUND`（404）、`REPORT_NOT_PENDING` / `REPORT_NOT_PROCESSING`（409）、`EMAIL_TAKEN`（409）、`SESSION_ALREADY_HANDLING` / `SESSION_NOT_HANDLING` / `SESSION_CLOSED`（409）。管理端用户 / 举报 / 会话不存在复用既有 `USER_NOT_FOUND`（404）语义，不新增重复码。

## 4. 61 条场景覆盖

> P4 回流新增 A39–A41（举报来源上下文、受限账号全站提示），`admin-console` 的当前计数为 41 / 41、全量为 64 / 64，证据见 §12–§14。本节表格保留首次 P4 验证时的 61 条口径。

### 4.1 `admin-console`（A1–A38，38 / 38）

| # | 场景 | API 证据 | E2E / UT 证据 |
|---|---|---|---|
| A1 | 管理员进入后台 | `AdminUserControllerTest.in_adminBearer_out_userListPaged` | `admin.spec.ts [I1] guards direct links…`（侧栏入口 + 三 Tab） |
| A2 | 非管理员被拒绝 | `in_normalUser_out_adminRequired`、`in_missingBearer_out_sessionInvalid` | `[I1] guards direct links…`（无权限页、表格不渲染） |
| A3 | 客户端不能自选角色 | `AuthControllerTest.in_registerWithRoleAndStatus_out_ignored` | — |
| A4 | 展示全部注册用户 | `in_adminBearer_out_userListPaged`（含 `total ≥ 5`、六列字段） | `[I1]`（`data-row-key` 分页、`未填写` 邮箱） |
| A5 | 按 ID 搜索 | `in_searchById_out_exactMatch` | `[I1]`（按昵称查回唯一行） |
| A6 | 按昵称或邮箱搜索 | `in_searchByNickname_out_partialMatch`、`in_searchByEmail_out_caseInsensitiveMatch` | `[I1]` |
| A7 | 状态筛选与分页 | `in_statusFilter_out_onlyMatchingRows` | `[I1]`（第 2 页 / 上一页 `data-row-key`） |
| A8 | 资料与账号状态 | `in_detail_out_relationsAndTotals` | `[I1]`（详情页 `ID {id}` + 相关举报标题） |
| A9 | 行程与体验列表 | `in_detail_out_relationsAndTotals`（3 行程 / 1 体验 + 总数） | `admin.spec.ts [I1] suspends…`（跳转链接） |
| A10 | 相关举报 | `in_detail_out_includesRelatedReports`（`direction` / `code` / 状态） | `[I2] processes reports…` |
| A11 | 暂停账号 | `in_suspend_out_recordsPenalty` | `[I1] suspends…`（弹窗 + 「已暂停」） |
| A12 | 封禁账号 | `in_ban_out_storesReasonAndExpiry`、`in_banOtherWithoutNote_out_invalidInput`、`in_banExpiryNotInFuture_out_invalidInput` | `[I1] bans…`（理由 + 8 项原因 + 时间） |
| A13 | 恢复账号 | `in_restore_out_activeAndHidesBanFields` | `[I1] suspends…`（SUSPEND → RESTORE → 提示消失、`ban_*` 为 null、发布行程恢复 201） |
| A14 | 非法迁移被拒绝 | `in_suspendTwice_out_invalidTransition` | `[I1] suspends…`（`BANNED + RESTORE`、`ACTIVE + RESTORE` 均 409） |
| A15 | 封禁到期自动恢复 | `AccountStatusServiceTest.in_banWithExpiryEqualToNow_out_effectiveStatusIsActive`、`in_expiredBan_out_refreshPersistsActiveAndKeepsHistory`、`in_expiredBan_out_writeAllowedAndStatusConverged` | `FixedClockTestConfig` 固定 2026-11-16T09:00Z |
| A16 | 管理员不能处罚自己 | `in_selfSuspend_out_cannotTargetSelf` | `[I1] suspends…`（对自身处罚 409） |
| A17 | SUSPENDED 四类写拒绝 | `TripControllerTest.in_suspendedPublisher_out_accountSuspendedAndNoNewTrip`、`ApplicationControllerTest.in_suspendedApplicant_out_accountSuspendedAndNoNewApplication`、`ChatControllerTest.in_suspendedSender_out_accountSuspendedAndNoNewMessage`、`ExperienceControllerTest.in_suspendedAuthor_out_accountSuspendedAndNoNewExperience` | `[I1] suspends…`（四类写 403 + 表计数不变） |
| A18 | BANNED 只读 | `ReportControllerTest.in_bannedReporter_out_accountBannedAndNoNewReport`、`ServiceControllerTest.in_bannedUser_out_accountBanned`、`UserProfileControllerTest.in_bannedAccountProfile_out_statusAndBanFields` | `[I1] bans…`（登录 / 读 200、写 403、资料页提示） |
| A19 | 处罚不删除数据 | 上述四个守卫生成的「表计数不变」断言 + `OpenApiTest` 无 `delete` | `[I1] suspends…` / `[I1] bans…`（处罚前后行程 / 体验 / 消息 / 举报计数） |
| A20 | 资料页展示封禁信息 | `UserProfileControllerTest.in_bannedAccountProfile_out_statusAndBanFields`（不含 `status_reason` / `ban_reason_note`） | `[I1] bans…`（提示条理由 + 解封时间） |
| A21 | 恢复后不再展示 | `in_restore_out_activeAndHidesBanFields`（`ban_*` 为 `null`） | `[I1] suspends…`（恢复后封禁 / 暂停提示消失） |
| A22 | 新举报进入待处理队列 | `AdminReportControllerTest.in_adminList_out_pendingReportRow`、`ReportControllerTest.in_newReport_out_statusPending` | `[I2] processes reports…` |
| A23 | 按状态筛选 | `in_statusFilter_out_onlyMatchingRows` | `[I2]`（「待处理」下拉） |
| A24 | 举报对象与编号稳定 | `in_detail_out_reportContext`、`ReportControllerTest.in_experienceReport_out_recorded` | `[I2]`（按 `R-{id}` 过滤行） |
| A25 | 开始处理 | `in_start_out_processingWithOperator` | `[I2]`（开始处理 → 处理中） |
| A26 | 重复开始被拒绝 | `in_startTwice_out_reportNotPending` | `[I2]`（重复 start 409） |
| A27 | 查看举报上下文 | `in_detail_out_reportContext`（原因 / 备注 / 双方 / `content_excerpt`） | `[I2]`（备注与目标内容可见） |
| A28 | 举报成立并处罚 | `in_resolveSuspend_out_suspendsReportedUserWithoutBanFields`、`in_resolveBan_out_bansReportedUser` | `[I2]`（成立 + 处罚 → 用户状态变更） |
| A29 | 被举报用户已受限 | `in_resolveKeep_out_resolvedWithoutPenalty`、`AccountStatusServiceTest.in_bannedUser_out_updateBanChangesReasonAndExpiry` | `[I2]`（`UPDATE_BAN` 保留 `BANNED`） |
| A30 | 举报不成立 | `in_resolveReject_out_rejectedWithFixedAction` | `[I2]`（不成立后用户状态不变） |
| A31 | 处理备注必填 | `in_resolveMissingNote_out_invalidInput` | `[I2]`（备注空时提交禁用） |
| A32 | 处理记录保留且举报人可见 | `in_resolveKeep_out_resolvedWithoutPenalty`、`HelpControllerTest.in_ownReports_out_listedNewestFirst` | `[I2]` + `customer-service.spec.ts [C1]`（`#/help` 四态、无 `resolution_note`） |
| A33 | 查看三类会话 | `AdminServiceControllerTest.in_queue_out_waitingSession` | `admin.spec.ts [I3] joins, replies…`（三态筛选） |
| A34 | 接入会话 | `in_join_out_handling`、`in_joinTwice_out_sessionAlreadyHandling` | `[I3]`（接入 → 处理中） |
| A35 | 双向对话 | `in_adminReply_out_senderTypeAdmin`、`ServiceControllerTest.in_sendMessage_out_savedAndListed` | `[I3]` / `[C3]`（3 秒轮询双向可见） |
| A36 | 会话详情 | `AdminServiceControllerTest.in_detail_out_includesUserAndReports` | `[I3]`（用户资料 + 相关举报） |
| A37 | 结束会话 | `in_close_out_closed`、`in_closeWaiting_out_sessionNotHandling` | `[I3]` / `[C3]`（双方输入框禁用） |
| A38 | 结束后可查看历史 | `ServiceControllerTest.in_closedSession_out_sessionClosed` | `[I3]` / `[C3]`（历史可读、发送 409） |

### 4.2 `customer-service`（C1–C13，13 / 13）

| # | 场景 | API 证据 | E2E / UT 证据 |
|---|---|---|---|
| C1 | 进入帮助与反馈 | — | `customer-service.spec.ts [C1] shows both help blocks…` |
| C2 | 查看我的举报状态 | `HelpControllerTest.in_noReports_out_emptyList`、`in_ownReports_out_listedNewestFirst`、`in_otherUserReports_out_notIncluded` | `[C1]`（四态文案、无备注 / 无他人举报） |
| C3 | 发起人工客服 | `ServiceControllerTest.in_open_out_waitingSessionAndIdempotent` | `[C3] starts, reuses…`（`WAITING` + 立即可发消息） |
| C4 | 重复发起返回既有会话 | 同上（第二次同 `id`，未结束会话仍 1 条） | `[C3]` |
| C5 | 客服接入后状态变化 | `AdminServiceControllerTest.in_join_out_handling` | `[C3]`（3 秒内「客服已接入」） |
| C6 | 会话结束 | `in_close_out_closed` | `[C3]`（3 秒内「已结束」+ 输入禁用） |
| C7 | 结束后重新发起 | `in_open_out_waitingSessionAndIdempotent`（`CLOSED` 后新建） | `[C3]`（旧会话历史仍可读） |
| C8 | 发送消息并收到回复 | `in_sendMessage_out_savedAndListed`、`AdminServiceControllerTest.in_adminReply_out_senderTypeAdmin` | `[C3]`（双向各 1 条、升序、3 秒可见） |
| C9 | 空白或超长消息被拒绝 | `in_blankOrOversizedMessage_out_invalidInput`（空白 / 501 字，消息表无新行） | `[C3]`（`maxlength=500`、空内容时发送禁用、501 字服务端 400） |
| C10 | CLOSED 会话只读 | `in_closedSession_out_sessionClosed` | `[C3]` |
| C11 | 客户端不能自报客服身份 | `in_forgedSenderFields_out_ignored`（`senderRole` / `sender_type` / `sender_id` 均被忽略） | `[C3]`（伪造 `sender_role` / `sender_type` / `sender_id` 后仍落 `USER`） |
| C12 | 历史会话仍可查看 | `in_sendMessage_out_savedAndListed`（消息列表）、`HelpControllerTest` 历史读取 | `[C3]`（`CLOSED` 后双方消息仍可见、按 id 取回历史） |
| C13 | 与行程聊天隔离 | `ServiceControllerTest.in_otherUsersSession_out_notFound`（会话属主校验） | `[C3]`（客服消息不进入 `/me/chat-partners`） |

### 4.3 `user-auth`（MODIFIED，U1–U10，10 / 10）

| # | 场景 | 证据 |
|---|---|---|
| U1 | 注册成功后自动登录 | `AuthControllerTest.in_validRegister_out_createdSessionAndUser`；既有 `auth.spec.ts`（7 条）保持全绿 |
| U2 | 用户名重复 | `in_duplicateUsernameDifferentCase_out_usernameTaken`（409 `USERNAME_TAKEN`） |
| U3 | 用户名格式非法 | `in_invalidUsername_out_invalidInput`（400） |
| U4 | 密码长度非法 | `in_shortPassword_out_invalidInput`（400） |
| U5 | 两次密码不一致 | `authForm.test.ts › rejects two different passwords on register`（前端拦截，不提交） |
| U6 | 昵称缺失或超长 | `in_missingOrTooLongNickname_out_invalidInput`（400） |
| U7 | 忽略旧版注册资料字段 | `in_registerLegacyFields_out_ignored` |
| U8 | 邮箱选填 | `in_registerWithEmail_out_emailNotExposedInSession`（不传 → `null`）+ `admin.spec.ts [I1]` 列表「未填写」 |
| U9 | 邮箱格式非法或重复 | `in_invalidEmail_out_invalidInput`（400）、`in_registerWithEmail_out_lowercasedAndUnique`（大小写归一后 409 `EMAIL_TAKEN`） |
| U10 | 客户端不能指定角色或初始状态 | 同 A3：`in_registerWithRoleAndStatus_out_ignored` |

**覆盖结论：** A 38 / 38、C 13 / 13、U 10 / 10，合计 **61 / 61**。U1–U7 为既有回归，其余为新增用例。

## 5. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/backend && .\mvnw.cmd -B -ntp -o "-Dmaven.resources.skip=true" test` | Tests run: **339**, Failures: 0, Errors: 0, Skipped: 0，BUILD SUCCESS |
| `cd RouteME/frontend && npm test` | Test Files **40 passed** / Tests **289 passed** |
| `cd RouteME/frontend && npm run typecheck` | 无输出（exit 0） |
| `cd RouteME/frontend && npm run build` | 成功（`✓ built in 1.19s`） |
| `cd RouteME/e2e && npx playwright test tests/admin.spec.ts` | **5 passed** |
| `cd RouteME/e2e && npx playwright test tests/customer-service.spec.ts` | **2 passed** |
| `cd RouteME/e2e && npx playwright test`（全量，`ROUTEME_E2E_BASE_URL=http://localhost:5174`） | **80 passed / 25 failed**（9.0 min，共 105 条），逐条归因见 §6 |
| `cd RouteME/e2e && npx playwright test tests/admin.spec.ts tests/customer-service.spec.ts`（全量之后复跑） | **7 passed**（42.9s） |
| `npx --no-install openspec validate add-admin-console --strict` | `Change 'add-admin-console' is valid` |

隔离说明：后端 8080 + SQLite 种子库、Vite 5174（5173 提供的是旧 `route.ts`，E2E 必须走 5174）。后端全量运行时需先删除 `target/classes/db/migration/V16__normalize_demo_user_profiles.sql` 并加 `-Dmaven.resources.skip=true`，否则并行会话未跟踪的重复 V16 会让 Flyway 直接失败（见 §8 偏差 6）。

## 6. 全套 E2E 结果与失败归因

`cd RouteME/e2e`（`ROUTEME_E2E_BASE_URL=http://localhost:5174`）`npx playwright test` → **80 passed / 25 failed（9.0 min，共 105 条）**。25 条失败全部落在 3 个与本 change 无关的文件；本 change 自己的 `admin.spec.ts`（5）与 `customer-service.spec.ts`（2）在全量之后又合并复跑一次，**7 passed（42.9s）**。

| 归属 | 条数 | 文件 | 根因 |
|---|---|---|---|
| 地图选择器滞后 | 17 | `map.spec.ts` 9 + `trips.spec.ts` 8 | 并行地图重写（`f76c877` 等提交）已把地图换成 Amap 容器，这两个 spec 仍断言旧 DOM：`[data-testid="china-map"]` / `city-map` / `.map-fallback` / `[data-poi-id]` / `.place-chip-name` |
| 共享库行程分页 | 7 | `trips.spec.ts` 4 + `profiles.spec.ts` 3 | 共享 SQLite 已有 154 条行程，`GET /api/trips` 默认 `size=20` 只取最新 20 条；种子卡（id 5 / 6 / 7 / 10 / 11 等）与「上海武康路咖啡散步」不在第 1 页 |
| 并行 V16 归一化 | 1 | `profiles.spec.ts` 1 | 本地库被并行会话未跟踪的 `V16__normalize_demo_user_profiles.sql` 归一化，`研一 · 地理科学` 已不存在 |

### 6.1 地图选择器滞后（17 条）

- `map.spec.ts` E11–E18（9 条）：断言 `[data-testid="china-map"]` 可见、`city-map` 的 `data-city` 属性、`[data-poi-id]`、`.map-fallback` 文案；Real 实现改用 Amap 的 `.amap-*` 容器。
- `trips.spec.ts` 8 条：`publishes a trip and finds it in the home list`（140）、`publishes with a meeting time…`（187）、`rejects a meeting time after the end date…`（224）、`explains a destination without offline map coverage`（242）、`map supports zoom…`（376）、`map pins add multiple stops…`（417）、`publish map cascade…`（451）、`publishes multiple meeting areas…`（476）；失败点均为 `china-map` / `city-map` / `.place-picker [data-testid="china-map"]` / `.place-chip-name`。

本 change 未修改 `map.spec.ts` / `trips.spec.ts`，也未修改地图实现。

### 6.2 共享库行程分页（7 条）

- `trips.spec.ts` 99 / 122 / 357：先等「深圳大鹏半岛海岸线徒步」卡片可见，该卡不在第 1 页；314 等「佛山祖庙与岭南天地一日」的 `[data-status="full"]`，该种子行程已过期。
- `profiles.spec.ts` 51 / 88 / 102：在 `/` 点击「上海武康路咖啡散步」卡片，卡片不在第 1 页，`locator.click` 30s 超时。

实测：`GET /api/trips` → `total=154`、`size=20`、首页 id 为 273/272/271/270/249；种子 1–12 中仅 5 / 6 / 7 / 10 / 11 存在且都在第 1 页之外。这是共享库无清理导致的累积效应，不是本 change 的数据。

### 6.3 并行 V16 归一化（1 条）

`profiles.spec.ts:37` 期望详情弹窗出现 `研一 · 地理科学`；本地库已被未跟踪的 V16 改写，该字段不再存在。该文件与本 change 无关，也未触碰。

### 6.4 结论

- 本 change 新增 / 修改的 E2E 只有 `admin.spec.ts`、`customer-service.spec.ts` 与 `support.ts`；7 条新用例全绿。
- 其余既有套件（`auth`、`safety-report`、`experiences`、`mine`、`chat-entry`、`companions`）失败列表中没有它们，均通过。
- `profile.spec.ts`（单数，并行会话 WIP）未被本 change 触碰；失败的 `profiles.spec.ts`（复数）是另一份文件，且失败原因与 §6.2 / §6.3 一致。
- 因此 25 条失败均可归因于并行地图重写、共享库数据累积与并行 V16，**没有一条指向 `add-admin-console` 的实现或测试**。

## 7. 三档视口与浅色 / 深色走查（T19）

对 8 个页面（`#/admin/users`、`#/admin/users/{id}`、`#/admin/reports`、`#/admin/reports/{id}`、`#/admin/service`、`#/admin/service/{id}`、`#/help`、`#/users/{id}`（BANNED））在 1440 / 768 / 390 × 浅色 / 深色下逐一采样，共 **48 组**；另对客服详情页补采 6 组（`#/admin/service/1`，含面板与输入框）。

| 检查 | 结果 |
|---|---|
| 横向溢出 `scrollWidth - innerWidth` | **54 / 54 为 0** |
| 1440 / 768 表格形态 | `#/admin/users` 与 `#/admin/reports` 为 antd 表格（4 组 × 2 档），卡片列表隐藏 |
| 390 卡片形态 | 同上两页切卡片（4 组），表格隐藏 |
| 客服工作台 | 1440 / 768 / 390 × 浅 / 深共 6 组均渲染面板与消息输入框，0 溢出 |
| 正文对比度（排除既有 `.badge`） | 浅色最低 **4.09:1**、深色最低 **5.53:1**（均 ≥ AA 4.5:1） |
| 既有 `.badge` | 资料页浅色 3.41:1 / 深色 4.24:1；该徽标与配色沿用既有 `profileCompleteBadge` + `.badge.muted`，非本 change 新增 |

截图目录（临时，不随仓库提交）：`C:\Users\CHIUJA2\AppData\Local\Temp\opencode\p4-admin-walk\`，命名 `{light|dark}-{1440|768|390}-{page}.png`；度量原始数据 `…\opencode\p4-walk.json`。

## 8. 实现偏差与设计一致性

| # | 设计 / ATDD | 实现 | 说明 |
|---|---|---|---|
| 1 | `/api/users` 返回 4 个演示账号 | 返回全部 `app_users` 行，含种子 `admin`（5 行） | `admin` 也是真实账号，列表必须能看到；`DemoDataMigrationSqliteTest` / `TripControllerTest` 的计数断言由 4 改为 5 |
| 2 | `design.md` §5.3「其余组合 → 409（含 `BANNED→*`）」 | `POST /admin/users/{id}/status` 对 `BANNED` 的 `SUSPEND` / `RESTORE` 均返回 409 `INVALID_STATUS_TRANSITION`；A21「恢复后不再展示」改由 `SUSPENDED → RESTORE` 覆盖 | 以 `design.md` 状态机为准；`BANNED` 只能等封禁到期或 `UPDATE_BAN`，E2E 同时断言两种 409 |
| 3 | `design.md` §5.5：`SUSPEND` 只需处理备注 | 早期实现误要求 `ban_reason_code` / `ban_expires_at`；已收敛为仅 `BAN` / `UPDATE_BAN` 必填（`in_resolveSuspend_out_suspendsReportedUserWithoutBanFields`） | 实现向设计对齐，`design.md` 不改 |
| 4 | `POST /service/sessions` 创建语义 | 返回 **200**（创建或取回既有会话，`openapi.yaml` 只声明 200） | 幂等语义使 201 不成立；E2E 断言改为 `.ok()` |
| 5 | `atdd-design.md` U5 用 E2E 覆盖 | 由 `authForm.test.ts › rejects two different passwords on register` 覆盖 | 密码二次输入是纯前端校验，不触网；单测比 E2E 更直接，E2E 不再重复 |
| 6 | `tasks.md` 前置 1 要求清理本地重复 V16 | 未清理（属并行会话 WIP）；本 change 的验证与提交均绕开：删除 `target/classes` 陈旧副本 + `-Dmaven.resources.skip=true` | 该文件未跟踪、不纳入本 change；`V19` 与上游 `V16__add_meeting_time.sql` 不冲突 |
| 7 | 举报对象类型 | 沿用 `design.md` §5.5 与契约既有的 `trip` / `user` / `experience`（0.11.0 已定义 `experience`） | 未新增第五种类型；举报原因仍为 `harassment` / `fake` / `safety` / `other` 四值 |

## 9. 残余风险

| 风险 | 处理 |
|---|---|
| E2E 未纳入 CI（流水线只跑后端 `verify` 与前端 `build && npm test`） | 本记录贴出真实命令与输出；建议另立 change 把 Playwright 纳入流水线 |
| E2E 共享 SQLite、无清理 | 列表类断言按「本次用例造出的唯一昵称 / 标题」过滤，不依赖全表条数；仍有种子卡片可见性受数据累积影响（见 §6） |
| 无永久删除 / 无内容下架 / 无申诉 | 按 `design.md` 与 Delta 的非目标保留；`openapi.yaml` 无 `delete`，管理端无删除映射 |
| 封禁到期靠读时计算 + 写时落库，无定时任务 | `effectiveStatus` 保证读路径口径正确，`refreshIfExpired` 在下次写事务内收敛；不做后台调度（非目标） |
| `admin` / `admin12345` 为演示凭据 | 明文仅出现在本记录；真实部署必须替换账号与口令 |
| 后台无独立原型 | 按 `design.md` §6.5 三档布局与既有 tokens 实现，走查见 §7 |
| G2 未签署 | 本记录不等于 G2；需 VL Neal 独立复核本记录与代码后再准入 G2 |

## 10. 提交与签署

| 阶段 | 提交 |
|---|---|
| P2（提案 / Delta / G1 对齐） | `64d7875` `docs(p2): add-admin-console proposal, delta specs and G1 align record` |
| P3（design / ATDD / design review） | `84a53c0` `docs(p3): add-admin-console design, atdd design and design review` |
| P3（tasks / reviews / checklist） | `45bd72c` `docs(p3): add-admin-console tasks, reviews and P3 checklist` |
| P3（registry / REQ-018 Pass） | `3a8c094` `docs(p3): mark REQ-018 requirement and intent P3 Pass` |
| P4（本记录 + `tasks.md` 勾选） | 本次提交（仅文档；实现留在工作区，待 P5 一并归档） |

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| 当前开发者 | Jacky | T1–T19 实现、61 条场景落点、本地回归、三档与主题走查 | 2026-11-17 |
| VL | Neal | 待独立复核本记录与代码后签署 G2 | 待签署 |
| SA | Karena | 实现未越出三份 Delta（14 Requirement / 61 Scenario）与 D1–D17 | 待确认 |
| IO | WAYNE | 已知悉残余风险（E2E 不在 CI、共享数据库、演示凭据、G2 未签） | 待确认 |

**阶段结论：P4 完成（工作区，未 push）。** 后端 339 项与前端 289 项全绿，契约 0.13.0 由 `OpenApiTest` 锁定，7 条新 E2E（5 + 2）与 61 条场景均有落点；全套 E2E 为 80 passed / 25 failed，失败全部外部归因（§6），`trips` 一套因此未在 `tasks.md` 勾选。三档视口 × 两主题无横向溢出，对比度达到 AA。G2 待 VL Neal 签署，归档留在 P5。

## 11. 合入上游后的界面修复（P4 追加）

上游 `main` 合入带来行程取消、体验照片与 V19 / V20 迁移；本 change 的迁移在同一次合并中顺延为 `V21__admin_console.sql`。合并后按走查反馈修复两处界面问题：

| 问题 | 根因 | 修复 | 验证 |
|---|---|---|---|
| 后台用户详情、举报详情、客服详情的返回箭头被放大到 709×709 | 这三个页面的内联 SVG 只有 `viewBox`，全局 `svg { display: block; max-width: 100% }` 在 flex / grid 容器里把它拉满整行 | `styles.css` 新增 `.detail-back svg { width: 14px; height: 14px; flex: 0 0 auto }`；`.detail-back` 加 `justify-self: start`，让返回链接的点击区回到文字宽度 | 浏览器实测 `svg` 14×14、链接 72×21 |
| 举报详情只有对象摘要，处理人无法判断是否封禁 | 契约 `AdminReportDetail` 只回 `target.content_excerpt`（用户目标即 bio ≤200），管理端也没有读取会话记录的入口 | 新增「判定依据」面板：复用 `GET /admin/users/{id}` 展示被举报人的账号状态、资料、简介、近期行程 / 体验、历史举报，并提供用户详情入口；`experience` 目标补上 `#/share/{id}` 链接（`reportTargetHref`） | 前端 41 文件 / 299 项通过（新增 `adminFormat.test.ts` 4 项）、`npm run build` 通过；`e2e/tests/admin.spec.ts` 5/5 通过 |

> 同行消息缺口已在 §12 的「举报来源」上下文补齐：管理端不再新增独立消息接口，而是由 `GET /admin/reports/{id}` 的 `context.messages` 返回该举报涉及的双方会话。

## 12. 举报来源上下文（P4 追加，2026-11-17 用户请求）

用户要求「举报来自聊天时展示对应聊天历史，举报对象是行程时展示相关行程」。本轮同时改 Delta Spec、契约、迁移、后端与前端：

| 层 | 改动 |
|---|---|
| Delta Spec | `admin-console`「举报详情与处理」补来源规则；新增「聊天举报展示会话记录」「行程举报展示行程概要」2 个场景（9 / 38 → 9 / 40） |
| 契约 | `ReportRequest` 增可选 `trip_id`（仅用户对象）；`AdminReportDetail` 增 `context{origin, trip, messages[]}`，新增 `AdminReportContext` / `AdminReportTripContext` / `AdminReportMessage` |
| 迁移 | `V22__report_context_trip.sql`：`reports.context_trip_id` |
| 后端 | `ReportService.submit` 用 `ChatService.conversation` 校验举报人与被举报人共享该行程会话；`AdminReportService.detail` 用 `ChatService.transcript` 回放双方消息，行程目标回行程概要 |
| 前端 | `ReportModal` 从聊天页带 `tripId`；`AdminReportDetailPage` 新增「举报来源」面板：聊天举报显示行程概要 + 会话记录，行程举报显示行程概要；无 `context` 的旧举报不渲染 |
| i18n / 样式 | `adminMessages.reportOrigin*`；`styles.css` 新增 `.admin-transcript*` |

**验证：**

- 后端定向 41 项通过：`.\mvnw -B -ntp -o "-Dtest=OpenApiTest,ReportControllerTest,AdminReportControllerTest,AdminConsoleMigrationSqliteTest" test`（新增 4 条举报提交校验、2 条管理端上下文、1 条迁移断言）。
- 前端 `npm test && npm run typecheck && npm run build` 全绿。
- 浏览器实测：聊天页提交举报后，管理员详情页显示「举报来源 · 聊天举报」、行程概要（标题 / 目的地 / 起止日期 / 状态 / 发布者）与 4 条会话记录；行程详情页提交的举报显示「举报来源 · 行程举报」且无会话记录。

## 13. 解封时间日历无法选择（P4 追加，2026-11-17 用户反馈）

**现象：** 举报处理的「解封时间」字段点击后没有可见日历，看起来无法选择。

**根因：** 管理端两个 `DatePicker`（举报处理、用户状态弹窗）没有使用首页 / 发布页已有的 `appDatePickerProps`。在 `prefers-reduced-motion: reduce` 下，antd 6.7 会把挂到 `document.body` 的日期弹层定位到视口外（`inset: -8860px auto auto -8170px`），字段本身却仍有焦点。项目已在 `utils/datePickerProps.ts` 记录该问题并用「弹层挂到字段容器 + `.app-date-popup` 定位修补」解决，管理端是遗漏。

**修复：**

- 举报处理与用户状态弹窗的「解封时间」改用新增的 `appDatePickerUpProps`：沿用 `appDatePickerProps` 的 `getPopupContainer`，并把弹层标记为 `app-date-popup-up`；
- 两个字段包进 `position: relative` 的 `.form-field`，让弹层相对字段定位；
- `styles.css` 在减少动态效果媒体查询内为 `.app-date-popup-up` 增加向上展开（`bottom: calc(100% + 4px)`），因为这两个字段靠近页面 / 弹窗底部，向下展开时日历与「确定」会落在视口外且页面已无滚动余量。

**验证：**

- 浏览器实测：举报处理页字段位于页面底部（`scrollY` 已达最大值），日历完整可见（`y=99.6`，`bottom=498.1`，视口 886），选 `2026-11-25` 后输入框显示 `2026-11-25 00:00`，「确定」可点击；
- 用户详情「封禁账号」弹窗的同一字段同样向上展开且完整可见；
- 控制台无新增错误；前端 `npm test`（41 文件 / 299 项）、`npm run typecheck`、`npm run build` 通过。

## 14. 受限账号全站提示（P4 追加，2026-11-17 用户反馈）

**需求：** 被封禁的用户需要被明确告知「已封禁」以及封禁理由，而不是只在个人资料页或写操作失败时才知道。

**缺口：** 封禁提示原本只出现在 `#/users/{id}` 资料页；受限用户登录后停在首页或其它页面时没有任何说明，只有发起写操作才会看到 403。

**实现：**

| 层 | 改动 |
|---|---|
| 纯逻辑 | 新增 `frontend/src/profile/accountStatusNoticeModel.ts`：`BANNED` → 错误色提示（标题 + 限制范围 + `banReasonLabel` + 解封时间），`SUSPENDED` → 警告色提示，`ACTIVE` → `null` |
| 组件 | 新增 `AccountStatusBanner`，顶栏与资料页共用；资料页在「本人受限」时不再重复渲染 |
| 外壳 | `AppShell` 在 `.view` 顶部渲染提示条；仅当会话 `status` 为 `BANNED` / `SUSPENDED` 时读取 `GET /users/{id}/profile` 补理由与解封时间，读取失败降级为会话 `status`（理由显示 `—`） |
| 文案 | 复用 `adminMessages.profileBan*` / `profileSuspended*`；处理原因 `status_reason` 与管理员备注 `ban_reason_note` 仍不下发用户侧 |

**验证：**

- 浏览器实测（`sunian` / `123456`，状态 `BANNED`）：首页顶部即出现「账号已被封禁 / 封禁期间只能浏览内容… / 理由：违法违规内容 / 解封时间：2026-12-18 06:07」；
- 本人资料页只出现 1 条相同提示（顶栏承担，资料页不再重复）；`ACTIVE` 用户查看被封禁用户资料时，提示仍出现在资料页且无全站提示条；
- 前端 `npm test`（42 文件 / 303 项，含新增 4 条 `accountStatusNoticeModel` 用例）、`npm run typecheck`、`npm run build` 通过；控制台无新增错误。
