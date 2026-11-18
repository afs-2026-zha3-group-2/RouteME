> ⚠️ **已作废 / OBSOLETE（2026-11-15）** — 本文接口契约（projects / demands / candidates / recommendations / notifications 端点、候选池分页导入导出、人员统计、邮件通知契约）针对**已移除的 "staffing" 应用**，与当前唯一应用 **RouteME 路觅** 无关。RouteME 的接口契约（属 dev P2）尚未编写。
> 保留仅作历史参考，**不得作为 RouteME 的接口证据**。`_LOG.md` 与 `rules/` 不受影响。

# Interfaces knowledge

API、事件与集成契约。字段一律 snake_case；时间字段为 RFC3339 UTC；错误响应只返回 `code`。

## RouteME 行程、同行与体验接口（2026-11-15，`trip-plans` + `trip-companions` + `trip-experiences`）

契约源：`RouteME/openapi.yaml`（v0.7.0）。校验：`cd RouteME; npx @redocly/cli lint openapi.yaml`（配置见 `RouteME/redocly.yaml`），或 `cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/users` | 3 个演示账户（身份门） |
| GET | `/trips` | 未结束行程分页列表；`destination_code`（6 位国标码等值）、`date_from`、`date_to`、`tags`（逗号分隔，任一命中）、`sort=date\|new`、`page`、`size` |
| GET | `/trips/{id}` | 行程详情 + 发布者 + 当前同行者（发布者在前，其后为已接受同行者） |
| POST | `/trips` | 发布行程（201） |
| POST | `/trips/{id}/complete` | 发布者标记已结束 |
| GET | `/matches` | 候选行程 + `match{score, percentage, reasons[], basis}`；筛选同 `/trips`（`destination_code`/日期/标签）；`sort=match`（默认）\|`date`\|`new`；`page`、`size` |
| GET | `/matches/{tripId}` | 单条行程相对我的匹配信息 |
| GET | `/trips/{tripId}/recommendations` | 同行者推荐：以该行程目的地 / 出发日期与我的兴趣为参照，返回 `reference` + `items[{user, trip, score, reasons[], breakdown[], shared_interests[]}]`；排除本人、已取消 / 已结束与 0 分候选；同发布者只保留最高分行程 |
| POST | `/trips/{tripId}/applications` | 提交同行申请（`message` 选填 ≤120，201） |
| GET | `/trips/{tripId}/applications` | 发布者查看该行程申请 |
| GET | `/me/applications` | 我的申请（含状态与行程摘要） |
| POST | `/applications/{id}/cancel` | 申请者取消待处理申请 |
| POST | `/applications/{id}/accept` | 发布者接受（人数 +1，满员自动转 `full`） |
| POST | `/applications/{id}/reject` | 发布者拒绝 |
| POST | `/trips/{tripId}/leave` | 已接受同行者退出（204；人数 -1，聊天关闭） |
| GET | `/trips/{tripId}/messages?with={userId}` | 与某位同行者的消息，按时间升序 |
| POST | `/trips/{tripId}/messages` | 发送消息 `{receiver_id, content}`（201；≤500 字） |
| GET | `/me/chat-partners` | 聊天对象列表（含最后一条消息与条数） |
| GET | `/me/trips` | 我的旅行四组（published/applied/matched/completed）+ `pending_application_count` |
| POST | `/reports` | 举报行程或用户 `{target_type, target_id, reason, note?}`，返回 `{received: true}` |
| GET | `/experiences` | 旅行体验分页列表；`destination_code`、`date_from`、`date_to`、`tags`、`page`、`size`，按最近保存时间倒序；按关联行程日期区间求交集 |
| GET | `/me/experiences` | 我的体验（我的旅行「已完成」入口用） |
| GET | `/trips/{tripId}/experiences` | 某行程的体验，按首次发布时间升序 |
| POST | `/trips/{tripId}/experiences` | 发布或修改我的体验；首次 201、更新 200 ；`{content, intensity, advice}` |
| POST | `/experiences/{experienceId}/likes` | 点赞他人体验；首次 201、已赞 200，返回 `{experience_id, like_count, is_liked}`；自赞 403、体验不存在 404 |
| DELETE | `/experiences/{experienceId}/likes` | 取消点赞；未赞也幂等 204；体验不存在 404 |
| GET | `/weather/forecast` | 目的地单日天气（Open-Meteo，公开只读）；`destination_code` 与可选 `lng`/`lat` 至少一组 + `date` ；越界 200 + `available=false`（`OUT_OF_RANGE`），上游失败 502 `WEATHER_UPSTREAM_ERROR`；主用 `api.open-meteo.com` 连接层失败时自动切到同一数据源的集合接口 `ensemble-api.open-meteo.com`（`source` 仍为 `open-meteo`，不提供降雨概率时为 null） |
- 所有 `/trips*`、`/matches*`、`/me/*`、`/applications/*`、`/reports` 请求要求 `X-User-Id`（`app_users.id`）；缺失或未知返回 401 `DEMO_USER_REQUIRED`。
- 列表只返回未结束行程；`sort` 非法返回 400。
- 分页：`/trips`、`/matches`、`/experiences` 返回 `{items, page, size, total, total_pages}`；`page` 从 1 起、`size` 默认 20 且上限 50，越界返回 400 `INVALID_INPUT`。`/me/*` 与 `/trips/{id}/experiences` 仍返回数组。
- 同行关系 = 发布者 + 该行程 `ACCEPTED` 的申请者；`joined_count` 仍由 `trip-plans` 单一写入，接受/退出经服务方法联动。
- 聊天仅对已匹配双方开放；行程 `completed` 后可读不可写；只有 `PENDING` 申请不能进入。
- 体验仅对「已结束且参加过（发布者或已接受同行者）」开放；每人每行程一条，再次提交即更新；`content` 10–400 字、`intensity` ∈ relaxed/moderate/tiring、`advice` 必填 ≤120 字。
- 体验读取响应（`/experiences`、`/me/experiences`、`/trips/{id}/experiences`）均含只读 `like_count` 与 `is_liked`（当前 `X-User-Id` 视角，自己的体验恒为 false）；列表侧一次批量取数，不逐条查询。
- 获赞加分只写服务端账本（原因码 `EXPERIENCE_LIKE`，关联 `TRIP`）；不新增任何信用明细 / 历史 / 通知接口。契约版本随 `openapi.yaml` 0.18.0 提供。
- 错误码：`INVALID_INPUT`(400)、`DEMO_USER_REQUIRED`(401)、`FORBIDDEN`/`CHAT_NOT_ALLOWED`/`EXPERIENCE_NOT_ALLOWED`(403)、`TRIP_NOT_FOUND`/`APPLICATION_NOT_FOUND`/`EXPERIENCE_NOT_FOUND`(404)、`TRIP_NOT_OPEN`/`APPLICATION_NOT_PENDING`/`DUPLICATE_APPLICATION`/`CHAT_READ_ONLY`(409)、`WEATHER_UPSTREAM_ERROR`(502)、`INTERNAL_ERROR`(500)。
- 状态由 `completed_at` 与人数推导，不是独立写入的字段；映射与字段约束以 `openapi.yaml` 为准。

## RouteME 信用分展示（2026-11-17，`user-credit` / REQ-019）

契约源：`RouteME/openapi.yaml`（v0.12.0）。校验：`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`。

- `GET /users/{userId}/profile` 的 `UserProfile` 新增两个只读必填字段：
  - `credit_score`：integer，0–100；本人与他人视角均返回，任意存量 / 新注册账号都非空。
  - `credit_level`：string，enum `excellent` / `good` / `fair` / `low` / `risk`；由分数实时派生（90 / 80 / 60 / 30 四道阈值，左闭右开）。
- 初始分为 80；存量账号由迁移 `V18` 回填；**不存在面向客户端的写分端点**，资料保存请求携带 `credit_score` 会被忽略。
- 加 / 扣分明细、原因、历史与变更记录只在服务端账本（`credit_ledger`）留存，不对外返回；管理端能力尚未交付。
- 详情（阈值、账本字段、越界裁断、零变化留痕）以 `openapi.yaml` 与 `openspec/specs/user-credit/spec.md`（归档后）为准。

## RouteME 通知中心与未读计数（2026-11-18，`notifications` / REQ-029）

契约源：`RouteME/openapi.yaml`（v0.26.0）。校验：`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/notifications` | 最新 50 条通知 + 未读计数（`total` + 八类 `by_type`，零值不省略） |
| GET | `/notifications/stream?user_id={id}` | SSE 通道；事件名固定 `notification`，约 20 s 一次 `: ping` 心跳，不下发 `id:` |
| POST | `/notifications/{notificationId}/read` | 单条标读；返回最新计数，重复标读幂等 |
| POST | `/notifications/read` | `{scope:"all"}` 全部标读；`{scope:"conversation",trip_id,other_user_id}` 只清该会话 |
| GET | `/reports/mine` | 举报人自查（举报编号 + 当前状态），承接 `REPORT` 类跳转 |

- 八类通知：`TRIP` / `APPLICATION` / `CHAT` / `CREDIT` / `REPORT` / `ACCOUNT` / `SERVICE` / `SYSTEM`；`event` 为 snake_case 具体事件（22 个，契约枚举即事实来源）。
- 每条事件一行持久化记录，未读定义为 `read_at IS NULL`，`status` 由它派生为 `UNREAD` / `READ`；`(recipient_id, dedupe_key)` 唯一，重复触发不增加行数与计数。
- `Notification` 字段：`type` / `event` / `title` / `content` / `priority`（`NORMAL` / `HIGH`）/ `status` / `created_at` / `read_at` / `actor`（可空）/ 关联 id（`trip_id` / `application_id` / `message_id` / `report_id` / `session_id`）/ `target`（`kind` + 定位字段）/ `related_available`。
- 标题与正文由后端 `NotificationTextUtils` 统一生成，前端直接展示；账号受限只写受限内容与恢复时间，举报只写编号与结论，不含管理员备注或他人数据。
- 优先级：信用分变动后低于 60 与安全学习恢复通知为 `HIGH`，其余 `NORMAL`。
- 计数：`total` = 八类未读之和；`by_type` 八个键恒出现。列表按 `created_at DESC, id DESC`，最多 50 条，不含消息正文。
- 跳转：`target.kind` ∈ `trip` / `applications` / `chat` / `credit` / `report` / `account` / `support` / `identity`，前端据此组装路由；`related_available=false` 时保留正文、提示「相关内容当前不可查看」、不跳转，仍标读。
- 权限：REST 端点要求 `X-User-Id`；SSE 因 `EventSource` 无法带请求头，改用 `user_id` 查询参数（与 `X-User-Id` 同级的演示身份信任）。单条标读只允许本人记录，越权与不存在统一 404 `NOTIFICATION_NOT_FOUND`。
- `scope=conversation` 缺 `trip_id` 或 `other_user_id`、`scope` 非法返回 400 `INVALID_INPUT`。
- SSE 响应头固定 `Cache-Control: no-cache` 与 `X-Accel-Buffering: no`；重连正确性由客户端 REST 对账保证，不依赖 Last-Event-ID。
- 通知写入与业务同事务，推送在 `afterCommit` 后发出；通知写入失败只记日志、不回滚申请 / 裁决 / 发消息 / 信用 / 举报 / 账号 / 客服动作；动作人即收件人时直接丢弃（自消息、发布者自己的接受动作不通知本人）。
- 生产方：行程满员 / 开始 / 取消 / 完成、申请到达 / 通过 / 拒绝 / 关闭、聊天消息、信用变动 / 恢复、举报提交 / 处理中 / 完成、账号暂停 / 封禁 / 恢复、客服接入 / 回复 / 结束、资料首次完整（身份认证）。
- 前端徽标口径：顶栏铃铛、侧栏「通知中心」入口、账号菜单入口 = `total`；侧栏 / 移动 tab 的聊天入口与会话列表 = `CHAT`；数字为唯一信息载体（不截断为 `99+`），颜色只作强调，0 时不渲染。

## RouteME 管理后台概览（2026-11-17，`add-admin-dashboard` / REQ-026）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/dashboard` | 仅管理员可读的即时统计快照；六组计数 + `generated_at`，响应头 `Cache-Control: no-store` |

- 认证：`Authorization: Bearer <token>`；非 `ADMIN` 返回 403 `ADMIN_REQUIRED`，无会话返回 401；受限管理员沿用既有 403 错误码。
- 响应固定六组：`users`、`trips`、`applications`、`experiences`、`reports`、`service_sessions`；每组含 `total` 与约定状态键，空值零填充，`total` 与分桶同源。
- 状态口径：账号取 `AccountStatusService.effectiveStatus`（已到期封禁计入 `ACTIVE`）；行程取 `TripPlan.status(now)` 五态；键名保持既有 wire 大小写。
- 新增窗口：`new_last_7_days` / `new_last_30_days`（仅 users / trips / experiences），按 `Asia/Shanghai` 自然日、以 `created_at` 计算，解析失败的记录不计入新增但保留在 `total`。
- 每次请求即时聚合，不缓存、不物化、不写库；不含昵称、邮箱、头像等明细。前端只在进入页面与手动刷新时请求，不自动轮询。

## RouteME 旅行保障（2026-11-18，`travel-finance` / REQ-028）

契约源：`RouteME/openapi.yaml`（v0.25.0）。校验：`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/trips/{tripId}/finance` | 行程维度保障页：资格、钱包、保险摘要、本行程借款 |
| POST | `/trips/{tripId}/insurance/purchase` | 返回第三方投保地址（附 `trip_id`）；不扣款、不写记录 |
| POST | `/trips/{tripId}/insurance/confirm` | 演示 / 第三方确认后回写状态；幂等，每 (user, trip) 1 条 |
| POST | `/trips/{tripId}/loans` | 申请借款（本金整元 100–2,000，期限 7 / 14 / 30 天） |
| GET | `/me/finance` | 账号聚合页：钱包、全部流水、保险记录与借款 |
| POST | `/loans/{loanId}/repay` | 手动还款（本金 + 利息 + 截至还款时刻的逾期罚息） |

- 金额一律为整数分（`*_cents`）；借款 5% 从本金扣除后发放净额；利息 = 本金 × 0.05%/日 × 期限天数，应还 = 本金 + 利息；逾期另按本金 0.1%/日加收罚息，还款时一并结清；保险不出现金额字段。
- 保险由第三方提供方承保与定价，提供方名称与投保 / 保单 / 理赔 / 求助地址来自 `routeme.insurance.*` 配置；保障期取行程起止日，`EXPIRED` 在读取时派生；不保存保单号 / 证件 / 银行卡 / 保费 / 保额。
- 资格：行程发布者或 `ACCEPTED` 同行者，且行程 `recruiting` / `full` / `ongoing`；投保入口 / 回写 / 借款要求账号 `ACTIVE`，还款不因账号状态阻断。
- 演示钱包每用户 1 个（初始 10,000 元）；同一用户至多 1 笔进行中借款。
- 业务拒绝返回 409：`INSUFFICIENT_BALANCE`、`ACTIVE_LOAN_EXISTS`、`LOAN_NOT_ACTIVE`、`TRIP_NOT_OPEN`。
- 详情以 `openapi.yaml` 与 Delta（`openspec/changes/add-travel-finance/specs/travel-finance/spec.md`）为准。

## REST 面

机器可读契约以 `openapi.yaml` 为准，`npm run lint:api` 必须通过。按能力分组：

| 能力 | 端点 |
|---|---|
| 身份 / 字典 | `GET /me`、`GET /enums`、`GET /health` |
| 项目与需求 | `GET/POST /projects`、`GET/POST /demands`、`GET/PATCH /demands/{id}`、`POST /demands/{id}/publish`、`POST /demands/{id}/close` |
| 名单与计数 | `GET /demands/{id}/summary`、`GET /demands/{id}/roster`（分页）、`GET /demands/{id}/roster/export` |
| 候选池 | `GET /candidates`（分页）、`POST /candidates`、`PUT /candidates/{id}`、`POST /candidates/{id}/deactivate`、`POST /candidates/{id}/restore`、`POST /candidates/{id}/travel-review`、`GET /candidates/import-template`、`POST /candidates/import`、`GET /candidates/export` |
| 人员统计 | `GET /reports/headcount`（只读） |
| 筛选与答复 | `GET /demands/{id}/screening`、`POST /demands/{id}/answers` |
| 推荐与终审 | `GET/POST /recommendations`、`POST /recommendations/{id}/confirm`、`POST /recommendations/{id}/reject`、`POST /recommendations/{id}/withdraw`、`POST /recommendations/{id}/release-request`、`POST /recommendations/{id}/release` |
| 通知 | `GET /notifications`、`POST /notifications/{id}/retry`、`POST /notifications/review-reminders/scan` |

身份当前为 `X-User-Id` 演示桩，生产环境必须替换为真实认证；权限判定在服务层，UI 只做隐藏。

## 候选池分页与导入导出契约

- 分页：`GET /candidates` 与 `GET /demands/{id}/roster` 返回 `{items, total, page, size}`。`page` 从 1 开始；`size` 只允许 20 / 50 / 100（默认 20）；非法参数返回 400 `INVALID_INPUT`。
- 筛选：`name`（去空白后大小写不敏感包含）、`role`（wire value）、`include_inactive`（默认 false）。响应不再返回裸数组。
- 导入：`GET /candidates/import-template?format=csv|xlsx` 下载模板（CSV 带 UTF-8 BOM，XLSX 单 sheet）；`POST /candidates/import`（multipart `file`）按人员编号 upsert，返回 `{created, updated, failed, failures[{row_number, column, reason}]}`。文件级校验失败返回 422，整份拒绝且不写入。
- 导出：`GET /candidates/export?format=csv|xlsx&name&role&include_inactive`，跟随筛选并覆盖全部命中行；列与导入模板同源，无命中时仅表头；资源协调员与项目负责人均可调用。
- 名单导出：`GET /demands/{id}/roster/export?format=csv|xlsx`，按当前需求范围与现有可见范围导出全部已确认行；列为姓名、岗位角色、职级、技能摘要、到岗时间与确认时间，无名单时仅表头；越权返回 403 `NOT_PROJECT_OWNER`。
- 人员编号：新建必填、去空白后全库唯一、保存后不可改；导入保留原编号，更新不改变档案状态与复审日期（导入忽略档案状态列）。
- 导入 / 导出不触发邮件通知；名单（roster）不提供导入或增删端点。

## 人员统计契约

- `GET /reports/headcount` 返回 `{total, by_role[{key, count, percentage}], by_level[{key, count, percentage}]}`；`key` 为岗位角色或职级的 wire value。
- 统计总体为候选池 `status = active` 的候选人；停用人员不计入；响应不含姓名、手机、邮箱等 PII。
- `percentage` = 人数 / 在职总数 × 100，保留一位小数（`HALF_UP`）；人数为 0 的类别不返回；`total = 0` 时两个列表为空。
- 资源协调员与项目负责人均可只读访问；端点无写方法，页面无导入 / 导出 / 编辑入口。

## 邮件通知契约

邮件由事务内的 Outbox（`notifications` 表）驱动，业务操作与发送结果解耦。

| 类型 | 触发 | 收件人 | 必含 payload |
|---|---|---|---|
| `recommendation_submitted` | 提交推荐 | 项目负责人 | `project`、`role`、`candidate`、`submittedBy`、`link`；跨角色时加 `crossRole` |
| `rejected` | 驳回推荐 | 负责协调员 | `project`、`role`、`candidate`、`rejectionReason`、`decidedBy` |
| `demand_changed` | 发布后编辑需求 | 负责协调员 | `project`、`role`、`summary` |
| `confirmed` | 终审确认 | 负责协调员 | `project`、`role`、`candidate`、`decidedBy` |
| `release_requested` | 协调员发起释放 | 项目负责人 | `project`、`role`、`candidate`、`requestedBy`；可选 `reason` |
| `released` | 负责人确认释放 | 负责协调员 | `project`、`role`、`candidate`、`releasedBy` |
| `review_reminder` | 复审到期前 30 天 | 全体资源协调员 | `candidate`、`dueDate`、`note` |

- 评分只存在于筛选结果与推荐/终审详情；邮件 payload **不得**出现 `score`、`threshold`、`breakdown` 等评分字段。
- 状态只有 `sent` 与 `failed`；失败时写入 `error` 摘要，不阻断业务，可在通知页重试。
- 通知内容只做摘要，完整业务以接口读取为准；幂等键为“事件 + 业务对象”。
