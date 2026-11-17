# 任务：add-admin-console

- **依据：** [`specs/admin-console/spec.md`](specs/admin-console/spec.md)（9 Requirement / 41 Scenario）、[`specs/customer-service/spec.md`](specs/customer-service/spec.md)（4 / 13）、[`specs/user-auth/spec.md`](specs/user-auth/spec.md)（MODIFIED 1 / 10）、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **Owner：** Jacky（AO，当前开发）｜ **协助：** Neal（VL）在 P4 独立验证；WAYNE（IO）在 G2 前复核 Living Spec 收口
- **顺序：** 契约（T1）与迁移（T2）先行 → 迭代 1（T3–T10）→ 迭代 2（T11–T13）→ 迭代 3（T14–T18）→ 收口（T19）；每片先写失败验收（red）再实现
- **契约：** `openapi.yaml` **0.13.0**（16 个端点、13 个错误码）；迁移 **`V19__admin_console.sql`**；`OpenApiTest` 与各 `*ControllerTest` 是门禁
- **视觉基准：** 无后台原型；按 `design.md` §6.5 三档布局与 `frontend/src/styles.css` 既有 tokens 实现，不改原型文件
- **不做：** NFR 压测（见 `atdd-design.md` §6）、SSO / 审计流水 / 申诉 / 永久删除 / 内容下架 / WebSocket / 附件 / 满意度 / 邮箱验证

## 前置（P4 开始前，非本 change 代码）

- [ ] 清理本地重复 V16：未跟踪的 `V16__normalize_demo_user_profiles.sql` 与上游 `V16__add_meeting_time.sql` 并存会让 Flyway 直接失败（由该 WIP 负责人处理，不纳入本 change 提交）。
- [x] 重启 8080 后端：当前实例仍是 0.11.0 契约（`meeting_area`、无 `meeting_areas` / `meeting_time`），不能用于新契约联调。
- [x] `admin / admin12345` 明文只写进 P4 交付说明 `docs/sdd/add-admin-console/p4-verify.md`，不进规格、前端、i18n、迁移注释。

## 迭代 1 — S19 用户管理页 / S20 用户详情页

### T1 [contract] 契约升到 0.13.0 并先写失败断言

- [x] `openapi.yaml` `info.version` 改 `0.13.0`；新增 16 个路径（§4.1）、schema 增量（§4.2）、13 个错误码枚举（§4.3）。
- [x] `DemoUser` 增只读 `role` / `status`；`AuthRegisterRequest` 增可选 `email`；`UserProfile` 增只读 `status` / `ban_reason_code` / `ban_expires_at`。
- [x] `OpenApiTest` 断言：版本、16 条路径、`AdminUserDetail` / `AdminReportDetail` / `ServiceSessionSummary` 必填字段、6 组枚举取值、13 个错误码、全表无 `DELETE`。
- [x] 运行后先 red（路径与版本未实现），T6 / T11 / T14 / T15 逐条转绿；契约面覆盖三个迭代，PR 说明「迭代 1 只实现 T6 的 3 个用户端点，其余按迭代交付」。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=OpenApiTest test`
**覆盖：** A1–A38、C1–C13、U8–U10 的契约面；Non-goals 的 `DELETE` 静态检查

### T2 [db] V19 迁移、回填与 admin 种子

- [x] `app_users` 9 列 + 邮箱唯一索引；`reports` 6 列 + `(status, created_at)` 索引；两张客服表与索引（`design.md` §2.1–§2.3）。
- [x] 回填：既有用户 `role='USER'` / `status='ACTIVE'`；既有 13 条举报 `status='PENDING'`。
- [x] 种子 `admin`（显式 id `1000`，`INSERT … WHERE NOT EXISTS`，`role='ADMIN'` / `status='ACTIVE'`），PBKDF2 散列格式与 `PasswordUtils` 一致。
- [x] 新增 `AdminConsoleMigrationSqliteTest`：空库跑全链，断言列 / 索引 / 表 / 回填计数 / 种子可登录（`PasswordUtils.matches`）。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=AdminConsoleMigrationSqliteTest test`
**覆盖：** A3（默认值）、A11 / A12 / A15 / A22 / A24 / A33 的数据前提

### T3 [backend] 枚举、12 个业务异常与账号状态服务

- [x] `AccountRoleEnum` / `AccountStatusEnum` / `BanReasonEnum` / `ReportStatusEnum` / `ReportResolutionActionEnum` / `ServiceSessionStatusEnum`（线上值大写，`code()` / `of()`）。
- [x] 12 个异常类（`ADMIN_REQUIRED` … `SESSION_CLOSED`），各声明 code + `HttpStatus`，继承 `BusinessException`；`GlobalExceptionHandler` 不改。
- [x] `AccountStatusService`：`effectiveStatus`（到期按 `ACTIVE`）、`refreshIfExpired`（写事务内落库、保留历史列）、`transition`（五条合法迁移）、`assertCanWrite(scope)`、`cannotTargetSelf`。
- [x] 新增 `AccountStatusServiceTest`：`@Import(FixedClockTestConfig.class)` 覆盖到期前 / 后、`ACTIVE→ACTIVE`、`BANNED→*`、`SUSPENDED` 三档 scope。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=AccountStatusServiceTest test`
**覆盖：** A14（迁移合法性）、A15（到期）、A17 / A18（scope 判定）

### T4 [backend] 管理员身份、`DemoUser.role/status` 与注册邮箱

- [x] `AdminPrincipalService.requireAdmin(Authorization)`：缺 Bearer → 401 `SESSION_INVALID`；非 `ADMIN` → 403 `ADMIN_REQUIRED`；管理员 `BANNED` / `SUSPENDED` → 403 `ACCOUNT_*`；`role` 每请求读库。
- [x] `/auth/me` 与 `/users` 的 `DemoUser` 返回 `role` / `status`（不含邮箱）；客户端传入的 `role` / `status` 一律忽略。
- [x] 注册 `email`：去空白转小写、正则校验、唯一冲突 409 `EMAIL_TAKEN`、空值存 `NULL`。
- [x] 新增 `DemoUserControllerTest`（role/status 只读）；`AuthControllerTest` 补「邮箱选填」「格式非法」「重复（大小写归一）」「忽略 role/status」四例。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=AuthControllerTest,DemoUserControllerTest test`
**覆盖：** A1 / A2（后端判定）、A3、U8 / U9 / U10

### T5 [backend] 受限账号守卫接入六个写入口

- [x] `TripPlanService.create`、`ApplicationService.apply`、`ChatService.send`、`ExperienceService.upsert` → `BUSINESS`（`SUSPENDED` / `BANNED` 均 403）。
- [x] `ReportService.submit`、`CustomerService.createSession` / `sendMessage` → `SUPPORT`（仅 `BANNED` 403）。
- [x] 守卫顺序：身份 401 → 账号状态 403 → 业务 404 / 409 / 400；读路径与登录不变。
- [x] 既有 `TripControllerTest` / `ApplicationControllerTest` / `ChatControllerTest` / `ExperienceControllerTest` / `ReportControllerTest` 补 403 与「四张表无新行」断言。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=TripControllerTest,ApplicationControllerTest,ChatControllerTest,ExperienceControllerTest,ReportControllerTest test`
**覆盖：** A17、A18、A19

### T6 [backend] 用户列表 / 详情 / 状态迁移端点

- [x] `AdminUserService`：`q`（ID 精确 / 昵称包含 / 邮箱包含忽略大小写）+ `status` + 分页，默认 `created_at DESC, id DESC`；邮箱为空的可检索但不命中空串。
- [x] `AdminUserDetail`：资料 + 状态/处罚 + `AdminUserTripRef` / `AdminUserExperienceRef` / `AdminUserReportRef`（`direction`）各 ≤50 + 三个总数。
- [x] `POST /admin/users/{id}/status`：`SUSPEND` / `BAN` / `RESTORE` 三态迁移、`reason` 条件必填、`OTHER` 必填说明、`ban_expires_at` 未来校验、自罚 409、非法迁移 409。
- [x] `UserProfile` 下发 `status` / `ban_reason_code` / `ban_expires_at`，不含 `status_reason` / `ban_reason_note`。
- [x] 新增 `AdminUserControllerTest`（A4–A16、A20 的 API 面），`UserProfileControllerTest` 补封禁字段与恢复后置空。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=AdminUserControllerTest,UserProfileControllerTest test`
**覆盖：** A4–A16、A20（API）

### T7 [frontend] 路由、后台壳、入口可见性与状态映射

- [x] `route.ts` / `routeToHash` 增 7 条路由（`adminUsers` … `help`），`route.test.ts` 往返断言；`notFound` 不变。
- [x] `AppShell` 仅在 `currentUser.role === 'ADMIN'` 渲染「管理后台」入口；`AdminGuard` 对 `#/admin/**` 直链渲染无权限页且不发请求。
- [x] `AdminLayout`（标题 + 三 Tab + 返回前台）、`adminMessages.ts`、`adminStatus.ts`（状态 → 文案 / 徽标 / 可执行动作）+ `adminStatus.test.ts`。

**验证：** `cd RouteME/frontend && npx vitest run src/route.test.ts src/admin/adminStatus.test.ts && npm run typecheck`
**覆盖：** A1 / A2（页面可达性）、A13 / A14（动作可用性）

### T8 [frontend] 用户管理页

- [x] 表格列（ID / 头像 / 昵称 / 邮箱 / 注册时间 / 状态）+ 搜索框（ID / 昵称 / 邮箱）+ 状态筛选 + 分页；邮箱空显示「未填写」。
- [x] `<768px` 切卡片列表，无横向滚动；空态与加载失败可重试。
- [x] 查询参数在页面内组装（不新增纯逻辑文件），行为由 E2E A5–A7 覆盖；点击行进入 `#/admin/users/{id}`。

**验证：** `cd RouteME/frontend && npm run typecheck && npm run build`
**覆盖：** A4–A7

### T9 [frontend] 用户详情、处罚弹窗与资料页封禁提示

- [x] 详情页资料卡 + 状态卡（处理原因 / 最近操作时间 / 封禁理由 / 解封时间）+ 三个关联列表（含「仅显示最近 50 条」与跳转）。
- [x] `StatusActionModal`：暂停 / 封禁 / 恢复，二次确认 + 理由 + 8 项理由 + `OTHER` 说明 + 解封时间；`userActionForm.ts` 纯函数单测覆盖必填 / 时间 / 条件必填。
- [x] `ProfilePage.tsx` 增仅 `status=BANNED` 渲染的封禁提示条（`banReasonLabel` + 解封时间），`ACTIVE` 自动消失；不展示管理员备注与举报人。
- [x] 错误映射：`INVALID_STATUS_TRANSITION` / `CANNOT_TARGET_SELF` → warning + 刷新；`ADMIN_REQUIRED` → 403 页。

**验证：** `cd RouteME/frontend && npx vitest run src/admin/users/userActionForm.test.ts && npm run typecheck`
**覆盖：** A8–A13、A16、A20 / A21（UI）

### T10 [e2e] 迭代 1 验收（red → green）

- [x] `support.ts` 增 `loginAsAdmin(page)`（写 `routeme.authToken` + `routeme.currentUserId`）、`createUserViaApi`（返回 `{id, token}`）、`setUserStatusViaApi`。
- [x] 新增 `e2e/tests/admin.spec.ts`，`[I1]` 用例覆盖：入口可见 / 403、列表与搜索、筛选分页、详情与跳转、暂停 / 封禁 / 恢复、非法迁移、自罚、四类写 403、BANNED 只读、处罚后计数不变、资料页封禁提示与恢复后消失。
- [x] 断言按本用例造出的唯一昵称 / 标题过滤，不依赖全表条数。

**验证：** `cd RouteME/e2e && npx playwright test tests/admin.spec.ts -g "I1"`
**覆盖：** A1–A21 的 E2E 行

## 迭代 2 — S21 举报管理页 / S22 举报详情页

### T11 [backend] 举报队列、详情与处理事务

- [x] `AdminReportService`：队列（`status` 筛选、`created_at DESC`、分页）、详情（原因 / 备注 / 举报人 / 被举报人 / `target.content_excerpt` / 处置历史）。
- [x] `reported_user` 推导三型 + 列表与详情共用一处；`AdminUserReportRef.direction` 与队列 `code` 一致。
- [x] `start`：条件更新 `PENDING → PROCESSING`，记录 `processed_by` / `processing_at`，非 `PENDING` 409 `REPORT_NOT_PENDING`。
- [x] `resolve`：`UPDATE … WHERE status='PROCESSING'` + 同事务处罚（`SUSPEND` / `BAN` / `KEEP` / `UPDATE_BAN`），非法组合 409 且整体回滚；`REJECTED` 不碰 `app_users`；`note` 必填。
- [x] 新增 `AdminReportControllerTest`：A22–A32 的 API 面，含并发重复处理与「举报不成立后用户状态不变」。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=AdminReportControllerTest test`
**覆盖：** A22–A32（API）、A19（举报计数）

### T12 [frontend] 举报管理页、举报详情页与四态文案

- [x] 举报列表：编号 `R-{id}`、举报人、被举报用户、对象、类型、时间、状态 + 状态筛选 + 分页。
- [x] 举报详情：上下文（含 `content_excerpt`）+ 跳转 + 「开始处理」+ 成立 / 不成立 + 备注必填 + 处罚选择。
- [x] 举报来源（T20）：聊天举报回放双方会话，行程举报显示行程概要；无 `context` 的旧举报不渲染该面板。
- [x] `reportActionForm.ts`（备注必填、成立时动作必填）与 `helpStatus.ts`（`reporterStatusLabel` / `adminStatusLabel` / `statusTone`）单测锁定四态文案。

**验证：** `cd RouteME/frontend && npx vitest run src/admin/reports/reportActionForm.test.ts src/help/helpStatus.test.ts && npm run typecheck`
**覆盖：** A22–A32（UI）

### T13 [e2e] 迭代 2 验收

- [x] `admin.spec.ts` 增 `[I2]`：新举报入队、按状态筛选、详情上下文、开始处理、重复开始被拒、成立并处罚、已受限用户处置、不成立、备注必填、处理后举报人看到最终状态。
- [x] 校验 `#/help` 该用例只看到自己的举报与状态，看不到备注。

**验证：** `cd RouteME/e2e && npx playwright test tests/admin.spec.ts -g "I2"`
**覆盖：** A22–A32 的 E2E 行

## 迭代 3 — S23 帮助与反馈 / S24 客户服务页

### T14 [backend] 客服会话生命周期、用户侧消息与我的举报读取

- [x] `CustomerService`：`createSession`（事务内查未结束会话，存在即返回）、`current`、`messages`（本人校验）、`sendMessage`（1–500 字、`CLOSED` 409、`sender_type` 由服务端判定）。
- [x] `ServiceController`（`/service/sessions/**`，Bearer，D17）+ `HelpController`（`/help/reports` → `ReportService.listMine`：本人、`created_at DESC`、最近 50 + `total`，不含备注 / 处理人 / 处罚）。
- [x] 新增 `ServiceControllerTest`、`HelpControllerTest`：C1–C13 的 API 面，含重复发起、`CLOSED` 只读、伪造 `senderRole` / `sender_id` 被忽略、与 `/me/chat-partners`、`/trips/{id}/messages` 隔离。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=ServiceControllerTest,HelpControllerTest test`
**覆盖：** C1–C13（API）、A32（用户侧读取）

### T15 [backend] 客服工作台端点

- [x] `AdminServiceController`：列表（三态筛选，`WAITING` 升序其余倒序）、详情（用户资料含注册时间 + 相关举报 + 完整消息）、`join`（条件更新 `WAITING → HANDLING`）、`close`（条件更新 `HANDLING → CLOSED`）。
- [x] 并发 `join` 只有首个成功，其余 409 `SESSION_ALREADY_HANDLING`；非 `HANDLING` 结束 409 `SESSION_NOT_HANDLING`。
- [x] 新增 `AdminServiceControllerTest`：A33–A38 的 API 面。

**验证：** `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=AdminServiceControllerTest test`
**覆盖：** A33–A38（API）、C4 / C7（会话唯一性）

### T16 [frontend] 帮助与反馈页、用户侧客服会话

- [x] `#/help` 两个区块：「联系人工客服」与「我的举报」（编号、对象、时间、四态文案，无备注）。
- [x] `ServiceChat`：发起 / 发送 / 等待接入 / 已接入 / 已结束只读；3s 轮询复用 `startChatPolling`，`CLOSED` 与卸载停止，`document.hidden` 跳过。
- [x] 空白 / 超长消息前端拦截；`ACCOUNT_BANNED` 显示不可用说明。
- [x] `helpStatus.test.ts` 断言用户侧四态文案；轮询复用既有 `startChatPolling`（单测已覆盖 3s 与清理），`CLOSED` 停止由 E2E C6 断言。

**验证：** `cd RouteME/frontend && npx vitest run src/help/helpStatus.test.ts && npm run typecheck`
**覆盖：** C1–C10、C12、C13（UI）、A32（`#/help`）

### T17 [frontend] 客服工作台三栏与窄屏

- [x] `AdminServicePage`：队列（280）/ 会话（自适应）/ 上下文（320）；768 收进 Drawer；390 单栏且详情独立路由。
- [x] `ServiceConversation`：消息升序、发送、只读态；接入 / 结束动作 + 错误映射（`SESSION_ALREADY_HANDLING` / `SESSION_NOT_HANDLING`）。
- [x] 3s 轮询同 T16；`CLOSED` 停止。

**验证：** `cd RouteME/frontend && npm run build`
**覆盖：** A33–A38（UI）、C5 / C6（3 秒内状态变化）

### T18 [e2e] 迭代 3 验收

- [x] 新增 `e2e/tests/customer-service.spec.ts`：进入帮助页、我的举报四态、发起会话、重复发起复用、客服接入 / 结束、结束后重开、双向消息 3 秒内可见、空白与超长被拒、`CLOSED` 只读、不能自报客服身份、历史可读、与行程聊天隔离。
- [x] `admin.spec.ts` 增 `[I3]`：三类会话筛选、接入、双向、用户资料与举报、结束、历史。

**验证：** `cd RouteME/e2e && npx playwright test tests/customer-service.spec.ts` 与 `cd RouteME/e2e && npx playwright test tests/admin.spec.ts -g "I3"`
**覆盖：** C1–C13、A33–A38 的 E2E 行

## 收口

### T19 [verify] 全量回归、视觉走查与交付说明

- [x] 后端全量 `.\mvnw.cmd -B -ntp test`（含 `OpenApiTest`、迁移测试、五个新控制器测试）。
- [x] 前端 `npm test && npm run typecheck && npm run build`。
- [ ] E2E 全量 `npx playwright test`；重点确认 `auth` / `safety-report` / `trips` 三套既有用例全绿，且 `profile.spec.ts` 的并行会话 WIP 未被本 change 触碰。
  - 2026-11-17 实测：全量 **80 passed / 25 failed**（105 条）。`auth`、`safety-report` 全绿；`trips.spec.ts` 的 12 条失败来自并行地图重写（8 条旧选择器）与共享库分页（4 条种子卡不在第 1 页），非本 change 引入，故本项不勾选。逐条归因见 [`docs/sdd/add-admin-console/p4-verify.md`](../../../docs/sdd/add-admin-console/p4-verify.md) §6。
- [x] 3 档视口（1440 / 768 / 390）× 2 主题人工走查，截图与结论记 `docs/sdd/add-admin-console/p4-verify.md`；同文件登记 `admin` 初始凭据与「仅本地演示」提示。
- [x] PR / 交付说明贴契约 diff（0.11.0 → 0.13.0）与 64 条场景覆盖表。

**验证：** 上述四条命令全绿 + 走查截图齐全（E2E 一项因并行地图 / 共享库环境失败保留未勾选，见上方说明）
**覆盖：** U1–U7（既有注册回归）、A19（处罚前后计数）、全部 64 条场景的最终验收

### T20 [p4-refine] 举报来源上下文（聊天会话 / 行程概要）

- [x] 契约：`ReportRequest` 增可选 `trip_id`；`AdminReportDetail` 增 `context{origin,trip,messages[]}`；`OpenApiTest` 断言新 schema 与枚举。
- [x] 迁移 `V22__report_context_trip.sql`：`reports.context_trip_id`；`AdminConsoleMigrationSqliteTest` 断言列与历史版本。
- [x] 后端：`ReportService.submit` 校验 `trip_id` 属于举报人与被举报人的共享会话；`AdminReportService.detail` 回放会话 / 行程概要；新增 4 条 `ReportControllerTest` 与 2 条 `AdminReportControllerTest`。
- [x] 前端：`ReportModal` 从聊天页带上 `tripId`；`AdminReportDetailPage` 新增「举报来源」面板（会话记录 / 行程概要）。

**验证：** `\.\mvnw.cmd -B -ntp -Dtest=OpenApiTest,ReportControllerTest,AdminReportControllerTest,AdminConsoleMigrationSqliteTest test`；前端 `npm test && npm run typecheck && npm run build`
**覆盖：** A39–A40

### T21 [p4-refine] 受限账号全站提示条（封禁理由 / 解封时间）

- [x] 抽出 `AccountStatusBanner` + 纯函数 `accountStatusNoticeModel`：`BANNED` 展示理由与解封时间，`SUSPENDED` 只说明限制范围，`ACTIVE` 返回空。
- [x] `AppShell` 在 `.view` 顶部渲染提示条；仅当 `status` 为 `BANNED` / `SUSPENDED` 时读取本人资料（`GET /users/{id}/profile`），读不到时降级用会话 `status`。
- [x] `ProfilePage` 本人受限时不再重复渲染同一条提示；他人查看受限资料时仍展示。
- [x] 单测 `accountStatusNoticeModel.test.ts` 覆盖 `ACTIVE` / `BANNED`（含理由缺失）/ `SUSPENDED` 四类。

**验证：** 前端 `npm test && npm run typecheck && npm run build`；浏览器实测受限账号在首页与资料页各只出现一条提示
**覆盖：** A20–A21、A41

## 估算

| 任务 | 估算 | 任务 | 估算 |
|---|---|---|---|
| T1 契约 | 2h | T11 举报后端 | 2h |
| T2 迁移 | 2h | T12 举报前端 | 2h |
| T3 状态服务 | 2h | T13 迭代 2 E2E | 2h |
| T4 身份与邮箱 | 2h | T14 客服服务层 | 2h |
| T5 守卫 | 2h | T15 客服后台端点 | 2h |
| T6 用户端点 | 2h | T16 帮助页 | 2h |
| T7 前端壳 | 2h | T17 客服工作台 | 1.5h |
| T8 用户列表 | 2h | T18 迭代 3 E2E | 2h |
| T9 用户详情 | 2h | T19 收口 | 2h |
| T10 迭代 1 E2E | 2h | **合计** | **37.5h** |

## 对齐自检（Spec / Design / ATDD → Tasks）

### 1. Requirement → 任务 → 场景

| Requirement | 任务 | 场景 |
|---|---|---|
| `admin-console` 管理员身份与后台访问控制 | T1 / T3 / T4 / T6 / T7 / T10 | A1–A3 |
| 用户列表与搜索 | T1 / T2 / T6 / T8 / T10 | A4–A7 |
| 用户详情与关联内容 | T1 / T6 / T9 / T10 | A8–A10 |
| 账号状态迁移与处罚 | T2 / T3 / T6 / T9 / T10 | A11–A16 |
| 受限账号的功能边界 | T3 / T5 / T10 | A17–A19 |
| 封禁信息展示 | T1 / T6 / T9 / T10 | A20–A21 |
| 举报队列与筛选 | T2 / T11 / T12 / T13 | A22–A24 |
| 举报详情与处理 | T11 / T12 / T13 / T20 | A25–A32、A39–A40 |
| 客服工作台 | T15 / T17 / T18 | A33–A38 |
| `customer-service` 帮助与反馈入口与我的举报状态 | T14 / T16 / T18 | C1–C2 |
| 人工客服会话生命周期 | T14 / T15 / T16 / T18 | C3–C7 |
| 客服消息与短轮询 | T14 / T16 / T17 / T18 | C8–C11 |
| 客服会话历史保留 | T14 / T15 / T18 | C12–C13 |
| `user-auth` 注册账号（邮箱 / 角色固定） | T1 / T2 / T4 / T19 | U1–U10 |

### 2. 场景覆盖计数

| Delta | 场景 | 任务落点 | 计数 |
|---|---|---|---|
| `admin-console` | A1–A41 | T6–T18、T20、T21 | 41 / 41 |
| `customer-service` | C1–C13 | T14–T18 | 13 / 13 |
| `user-auth` | U1–U10 | T4（U8–U10）、T19（U1–U7 回归） | 10 / 10 |
| **合计** | 64 | — | **64 / 64** |

> U1–U7 是既有回归，不新写用例；T19 以 `auth.spec.ts` + `AuthControllerTest` 全绿作为验收。

### 3. Deferred UT（交 `/sdd:atdd-apply`）

| 组 | 落点 | 任务 |
|---|---|---|
| `effectiveStatus` / 迁移合法性 / scope 判定 | `AccountStatusServiceTest` | T3 |
| 7 条路由往返 | `route.test.ts` | T7 |
| 账号状态动作可用性 | `adminStatus.test.ts` | T7 |
| 处罚表单（理由 / `OTHER` / 时间） | `userActionForm.test.ts` | T9 |
| 举报处理表单（备注 / 动作） | `reportActionForm.test.ts` | T12 |
| 四态文案映射 | `helpStatus.test.ts` | T12 / T16 |

### 4. 范围与约束核对

- 无超范围任务：21 条任务全部指向三份 Delta 的 Requirement；`design.md` 的 D1–D17、`atdd-design.md` 的 A/C/U 映射均有用例落点。
- 无孤儿场景：64 条全部在 §1 或 §2 有任务；无孤儿 Requirement（14/14 命中）。
- 任务可执行：每条有小标题、勾选项、**验证命令**与**覆盖场景**；单条估算 ≤2h（含同批测试）。
- 门禁一致：本地命令与 `atdd-design.md` §4 完全相同，不引入第二套 CI 语义。
- 不触碰并行 WIP：任务清单不含 `profile.spec.ts`（底部 hunk）、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx` 的未提交改动与未跟踪的 `V16__normalize_demo_user_profiles.sql`；T9 只改 `ProfilePage.tsx`（未在 WIP 列表内）。

## 风险与依赖

- **T1 必须先落。** 契约 0.13.0 是 T6 / T11 / T14 / T15 的门禁；先写后端会让 `OpenApiTest` 长期红。
- **T2 依赖干净迁移链。** 前置未清理 V16 时 T2 与 T19 都无法启动；这是环境问题，不是本 change 代码问题。
- **P4 时间估计。** 22 点是故事口径；本清单含测试与联调约 37h，按迭代交付（6 / 8 / 8 点）可与产品对齐。
- **T19 是唯一允许动交付说明的任务。** `admin / admin12345` 只在 `docs/sdd/add-admin-console/p4-verify.md` 出现。