# ATDD 设计 — add-admin-console

- **Change：** `add-admin-console`（REQ-018 / S19–S24）
- **输入：** 三份 Delta Spec（14 Requirement / 61 Scenario）、[`design.md`](design.md)（D1–D14）、现有 `e2e/tests/{auth,support,trips,chat-entry,safety-report}.ts`、后端 `*ControllerTest` + `OpenApiTest`
- **日期：** 2026-11-17
- **NFR 测试：** 本轮**不纳入**（发起人 2026-11-17 决定）；3 秒可见性作为功能断言，见 §1 的 E2E 行

## 1. 结论

| 层 | 用在哪 | 场景数（61 总计） |
|---|---|---|
| **API** | 权限、状态迁移、守卫、举报生命周期、会话生命周期、搜索 / 排序 / 分页、注册邮箱 | 56 条含 API 断言：23 条仅 API + 33 条 API & E2E |
| **E2E** | 页面可达性、入口可见性、四态文案、3s 轮询可见、`CLOSED` 只读、处罚后数据仍在 | 38 条含 E2E 断言：5 条仅 E2E + 33 条 API & E2E |
| **Defer UT**（`/sdd:atdd-apply`） | `effectiveStatus` 到期判定、四态文案映射、表单校验、路由解析、查询参数拼装 | 6 组（不对应场景编号） |

分层依据：一条场景若只需一个端点即可判定 → API；若 THEN 断言页面状态、跨页可见性或「数据必须不存在」→ E2E；纯函数（状态推导、文案、校验）→ Defer UT。同一场景可同时挂 API 与 E2E（例如状态迁移 API + 页面徽标刷新）。

## 2. 场景 → 验收映射

### 2.1 `admin-console`

| # | Scenario | 层 | 断言要点 |
|---|---|---|---|
| A1 | 管理员进入后台 | API + E2E | `GET /admin/users` 200；侧栏出现「管理后台」；三个后台 Tab 可打开 |
| A2 | 非管理员被拒绝 | API + E2E | 管理员 `GET /admin/users` 200；普通用户同一请求 403 `ADMIN_REQUIRED`；`#/admin/users` 渲染无权限页且不渲染表格 |
| A3 | 客户端不能自选管理员角色 | API | 注册带 `role=ADMIN` / `status=BANNED` → 新账号仍 `USER` / `ACTIVE` |
| A4 | 展示全部注册用户 | API + E2E | 三种状态都返回；页面六列齐全 |
| A5 | 按用户 ID 搜索 | API | `q=206` 精确命中 1 条 |
| A6 | 按昵称或邮箱搜索 | API | 昵称片段命中；邮箱片段忽略大小写命中 |
| A7 | 按状态筛选与分页 | API + E2E | `status=BANNED&page=2` 只含 `BANNED`；`total` 与页数一致 |
| A8 | 查看个人资料与账号状态 | API + E2E | 详情字段齐全；被处罚用户带理由 / 封禁信息 / 解封时间；三个关联列表各 ≤50 条且带总数 |
| A9 | 查看旅行计划与旅行体验 | API + E2E | 两组列表按用户过滤；`AdminUserTripRef` 跳 `#/trips/{id}`、`AdminUserExperienceRef` 跳 `#/share/{trip_id}`；各 ≤50 条 |
| A10 | 查看相关举报 | API + E2E | `reports[].direction` 区分 `REPORTER` / `REPORTED`；`code` 与举报队列一致；可跳 `#/admin/reports/{id}` |
| A11 | 暂停账号 | API + E2E | `action=SUSPEND` → `SUSPENDED`；记录原因 / 操作人 / 时间；行程数不变 |
| A12 | 封禁账号 | API + E2E | `action=BAN` → `BANNED`；缺理由 / 缺原因 / 过期时间 / `OTHER` 无说明 → 400 `INVALID_INPUT` |
| A13 | 恢复账号 | API + E2E | `SUSPENDED` + `RESTORE` → `ACTIVE`；四类写操作恢复 2xx |
| A14 | 非法迁移被拒绝 | API | `BANNED + RESTORE`、`ACTIVE + RESTORE`、`BANNED + SUSPEND` → 409 `INVALID_STATUS_TRANSITION`，状态不变 |
| A15 | 封禁到期自动恢复 | API | 固定 `Clock`：`ban_expires_at < now` → 读接口状态 `ACTIVE`、资料页无封禁信息、写操作不再 403；写一次后库中 `status='ACTIVE'` |
| A16 | 管理员不能处罚自己 | API | 对自身 `SUSPEND` / `BAN` → 409 `CANNOT_TARGET_SELF`；`RESTORE` 不受限 |
| A17 | SUSPENDED 用户四类写操作被拒绝 | API | 发布 / 申请 / 聊天 / 体验逐个 403 `ACCOUNT_SUSPENDED`；四张表无新行；GET 仍 200 |
| A18 | BANNED 用户只读 | API + E2E | 登录 / 浏览 / 读自己数据 200；任意写（含举报、客服消息）403 `ACCOUNT_BANNED`；资料页展示封禁信息 |
| A19 | 处罚不删除既有数据 | API + E2E | 处罚前后行程 / 体验 / 消息 / 举报计数一致；`openapi.yaml` 无删除端点 |
| A20 | 用户资料页展示封禁信息 | API + E2E | `GET /users/{id}/profile` 返回 `status=BANNED` + `ban_reason_code` + `ban_expires_at`；资料页提示条显示理由文案与解封时间；响应与页面都不出现 `status_reason` / `ban_reason_note` / 举报人 |
| A21 | 恢复后不再展示 | E2E | `RESTORE` 后同一端点 `ban_*` 为 `null`，资料页无封禁区块 |
| A22 | 新举报进入待处理队列 | API + E2E | 提交后列表出现 `R-{id}`、`PENDING`，字段齐全 |
| A23 | 按状态筛选 | API | 四种状态各筛一次；「全部」返回全量 |
| A24 | 举报对象与编号稳定 | API + E2E | 用户 / 行程 / 体验三类对象推导出正确被举报用户；`R-{id}` 在列表与详情一致 |
| A25 | 开始处理 | API + E2E | `PENDING + start` → `PROCESSING`，记录 `processed_by` / `processing_at`；另一管理员仍可处理 |
| A26 | 重复开始处理被拒绝 | API | 非 `PENDING + start` → 409 `REPORT_NOT_PENDING`，状态不变 |
| A27 | 查看举报上下文 | API + E2E | 详情含原因 / 备注 / 举报人 / 被举报人 / 目标与 `content_excerpt`；可跳转用户与内容 |
| A28 | 举报成立并处罚 | API | `PROCESSING + resolve(RESOLVED, action=SUSPEND|BAN)` → 用户状态迁移 + 举报 `RESOLVED`；两表同事务 |
| A29 | 被举报用户已处于受限状态 | API | `SUSPENDED` → 维持或升级；`BANNED` → 只更新封禁信息且状态仍 `BANNED`；均 `RESOLVED` |
| A30 | 举报不成立 | API + E2E | `resolve(REJECTED)` → `REJECTED`，用户状态不变，记录保留 |
| A31 | 处理备注必填 | API + E2E | `note` 空 → 400 `INVALID_INPUT`；前端提交按钮禁用 |
| A32 | 处理记录保留且举报人可见 | API + E2E | 处理后列表仍在；`#/help` 显示最终状态；响应中无 `resolution_note` |
| A33 | 查看三类会话 | API + E2E | 三种状态可筛选；`WAITING` 带创建时间 |
| A34 | 接入会话 | API | `join` → `HANDLING`，记录客服与时间 |
| A35 | 双向对话 | API + E2E | 双向消息持久化、升序；3 秒内另一侧可见 |
| A36 | 查看用户资料与相关举报 | API + E2E | 会话详情含用户基础信息 / 状态 / 相关举报 / 完整消息 |
| A37 | 结束会话 | API + E2E | `close` → `CLOSED`；双方输入框禁用 |
| A38 | 结束后可查看历史 | API + E2E | `CLOSED` 会话消息仍可读；发送 → 409 `SESSION_CLOSED` |

### 2.2 `customer-service`

| # | Scenario | 层 | 断言要点 |
|---|---|---|---|
| C1 | 进入帮助与反馈 | E2E | `#/help` 两个区块可见 |
| C2 | 查看我的举报状态 | API + E2E | 只返回本人举报；四态文案固定；无备注 / 无他人举报 |
| C3 | 发起人工客服 | API + E2E | `POST /service/sessions` → `WAITING`；可立即发消息；显示「等待客服接入」 |
| C4 | 重复发起返回既有会话 | API | 第二次 `POST` 返回同一 `id`，库中未结束会话仍为 1 条 |
| C5 | 客服接入后状态变化 | E2E | 3 秒轮询内用户侧由「等待接入」变为「客服已接入」，输入框可用 |
| C6 | 会话结束 | E2E | 客服结束后用户侧 3 秒内变「已结束」，输入框禁用 |
| C7 | 结束后重新发起 | API + E2E | `CLOSED` 后再 `POST` 创建新会话；旧会话历史仍可读 |
| C8 | 发送消息并收到回复 | API + E2E | 双向各 1 条，升序；双方 3 秒内可见 |
| C9 | 空白或超长消息被拒绝 | API + E2E | 空白 / 501 字 → 400 `INVALID_INPUT`；消息表无新行 |
| C10 | CLOSED 会话只读 | API + E2E | 发送 → 409 `SESSION_CLOSED`；消息仍可读 |
| C11 | 客户端不能自报客服身份 | API | 带 `senderRole=STAFF` / 伪造 `sender_id` → 落库为 `USER` + 当前用户 id |
| C12 | 历史会话仍可查看 | API + E2E | 双方都可读完整历史 |
| C13 | 与行程聊天隔离 | API + E2E | 客服消息不出现在 `/me/chat-partners` 与 `/trips/{id}/messages`；行程聊天不出现在客服会话 |

### 2.3 `user-auth`（MODIFIED）

| # | Scenario | 层 | 断言要点 |
|---|---|---|---|
| U1 | 注册成功后自动登录 | API + E2E | 既有回归：`auth.spec.ts` + `AuthControllerTest` 保持全绿 |
| U2 | 用户名重复 | API | 回归：409 `USERNAME_TAKEN` |
| U3 | 用户名格式非法 | API | 回归：400 `INVALID_INPUT` |
| U4 | 密码长度非法 | API | 回归：400 `INVALID_INPUT` |
| U5 | 两次输入的密码不一致 | E2E | 回归：前端提示不提交 |
| U6 | 昵称缺失或超长 | API | 回归：400 `INVALID_INPUT` |
| U7 | 忽略旧版注册资料字段 | API | 回归：多余字段被忽略 |
| U8 | 邮箱选填 | API | 不传 `email` → 201 且 `email` 为 `null`；列表显示「未填写」 |
| U9 | 邮箱格式非法或重复 | API | 非法格式 400；重复 409 `EMAIL_TAKEN`；大小写归一后判重 |
| U10 | 客户端不能指定角色或初始状态 | API | 与 A3 同一断言，避免重复实现 |

> U1–U7 是既有回归，不新写用例；U8–U10 新增。

## 3. 先于生产代码写的内容

按 `@rule:api-contract` 的顺序，**契约先改，再写失败验收**：

1. **契约：** `openapi.yaml` 升 0.13.0（16 个端点、13 个错误码、§4.2 的 schema 增量、`DemoUser.role/status`、`AuthRegisterRequest.email`）；`OpenApiTest` 先加失败断言（版本、路径、必填、错误码枚举）。
2. **失败 API 验收：** 新增 `AdminUserControllerTest`、`AdminReportControllerTest`、`AdminServiceControllerTest`、`ServiceControllerTest`、`HelpControllerTest`，先按上表 A1–A38 / C2–C13 / U8–U10 写红；`AuthControllerTest` 补邮箱三例。
3. **失败 E2E：** 新增 `e2e/tests/admin.spec.ts`（A1/A2/A4/A7/A8/A11/A12/A13/A18–A24/A27/A30–A32/A33/A35–A38）与 `e2e/tests/customer-service.spec.ts`（C1–C10/C12/C13）先跑红；`auth.spec.ts` 只加邮箱一例。
4. **Defer UT：** `adminStatus.test.ts`（有效状态、可执行动作）、`helpStatus.test.ts`（四态文案）、`userActionForm.test.ts` / `reportActionForm.test.ts`（理由、`OTHER`、时间、备注）、`route.test.ts`（7 条新路由往返）——随实现同批 red→green。

## 4. 本地 vs CI 门禁

| 层 | 本地命令 | CI |
|---|---|---|
| 契约 | `cd RouteME/backend && .\mvnw.cmd -B -ntp -Dtest=OpenApiTest test` | 同左（`mvnw test` 全量） |
| 后端 API | `cd RouteME/backend && .\mvnw.cmd -B -ntp test` | 同左 |
| 前端 | `cd RouteME/frontend && npm test && npm run typecheck && npm run build` | 同左 |
| E2E | `cd RouteME/e2e && npx playwright test tests/admin.spec.ts tests/customer-service.spec.ts` | 现有 pipeline 跑全量 `playwright test` |
| 规格 | `npx --no-install openspec validate add-admin-console --strict` | 同左 |

不在本 change 引入第二套 CI 语义；E2E 依赖本地 / CI 已启动的前后端与 SQLite 种子库。

## 5. Fixtures 策略

| 需要的数据 | 造法 | 清理 |
|---|---|---|
| 管理员身份 | V19 种子 `admin`（`role=ADMIN`）；E2E 用 `POST /auth/login` 拿 Bearer，账号密码走 `support.ts` 常量 | 不清理（种子） |
| 普通用户（`ACTIVE` / `SUSPENDED` / `BANNED`） | 注册 + `POST /admin/users/{id}/status` 由用例自己造；`#/help` 与客服用例同时写入该用户的 Bearer | 不删（无删除能力）；用户名 / 昵称带时间戳前缀避免与种子冲突 |
| 举报 | `POST /reports`（`X-User-Id`，既有端点不变）指向用例自己造的行程 / 体验 / 用户 | 不删 |
| 客服会话 | `POST /service/sessions` + 消息（Bearer） | 不删；`CLOSED` 后自然退出活跃集合 |
| 固定时间 | 后端测试 `@Import(FixedClockTestConfig.class)`（2026-11-16T09:00Z）；到期用例把 `ban_expires_at` 设为 `NOW ± 1h` | — |

`support.ts` 只加三个 helper：`loginAsAdmin(page)`（登录后写 `routeme.authToken` + `routeme.currentUserId`）、`createUserViaApi(page, nickname)`（返回 `{id, token}`，需要用户侧 Bearer 的用例自己写入）、`setUserStatusViaApi(page, adminToken, userId, body)`。E2E 断言一律按本次用例造出的唯一昵称 / 标题过滤，不依赖全表条数。

## 6. NFR 测试

**本轮不做**（发起人 2026-11-17 决定）。理由：无 SLA / QPS 指标；唯一的时效要求「3 秒内可见」已由 `CHAT_POLL_INTERVAL_MS` 常量的功能断言与 E2E 轮询覆盖，不另设性能压测。

## 7. Non-goals 与反向验证

| Out-of-scope / Non-goal | 反向用例 | 层 |
|---|---|---|
| 无永久删除 | `grep` 类检查：`openapi.yaml` 无 `DELETE` 端点；`admin` 控制器无删除映射；A19 处罚后计数不变 | API + 静态 |
| 无管理员 SSO / 二次认证 | 登录只需用户名密码 + Bearer；无 `/admin/auth/**` 端点 | 静态 |
| 无操作审计流水 | 无 `audit_log` 表 / 端点；`status_updated_by` 只是最近一次 | 静态 |
| 无申诉流程 | 用户侧无申诉入口；`#/help` 只有客服与我的举报 | E2E |
| 无 WebSocket / SSE | 前端只 import `startChatPolling`；无 `EventSource` / `WebSocket` | 静态 |
| 无内容下架 / 隐藏 | 无内容状态列或下架端点；举报处理只改账号与举报状态 | API |
| 举报原因不扩容 | `ReportRequest.reason` 仍为 4 值；8 项封禁理由只出现在 `BanReasonEnum` | API |
| `BANNED` 封禁期无求助通道 | `POST /service/sessions` 对 `BANNED` 返回 403 `ACCOUNT_BANNED`；`#/help` 客服区显示不可用说明 | API + E2E |
| 不删除既有数据 | A17 / A18 / A19 计数断言 | API |
| 邮箱验证 / 找回密码 | 无验证邮件端点、无重置端点 | 静态 |

## 8. 完成定义（DoD）

- §2 的 API 行全部有对应后端测试方法（红→绿），§2 的 E2E 行全部进两个新 spec 文件。
- `OpenApiTest` 断言 0.13.0、16 个端点、13 个错误码。
- 前端纯逻辑单测覆盖有效状态、四态文案、两类表单校验、7 条路由。
- 三套回归（`auth` / `safety-report` / `trips`）保持全绿；`profile.spec.ts` 的并行会话 WIP 不被本 change 触碰。
- 人工走查 3 档视口 × 2 主题，截图记 P4 报告。