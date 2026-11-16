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
| POST | `/trips/{tripId}/experiences` | 发布或修改我的体验；首次 201、更新 200；`{content, intensity, advice}` |

- 所有 `/trips*`、`/matches*`、`/me/*`、`/applications/*`、`/reports` 请求要求 `X-User-Id`（`app_users.id`）；缺失或未知返回 401 `DEMO_USER_REQUIRED`。
- 列表只返回未结束行程；`sort` 非法返回 400。
- 分页：`/trips`、`/matches`、`/experiences` 返回 `{items, page, size, total, total_pages}`；`page` 从 1 起、`size` 默认 20 且上限 50，越界返回 400 `INVALID_INPUT`。`/me/*` 与 `/trips/{id}/experiences` 仍返回数组。
- 同行关系 = 发布者 + 该行程 `ACCEPTED` 的申请者；`joined_count` 仍由 `trip-plans` 单一写入，接受/退出经服务方法联动。
- 聊天仅对已匹配双方开放；行程 `completed` 后可读不可写；只有 `PENDING` 申请不能进入。
- 体验仅对「已结束且参加过（发布者或已接受同行者）」开放；每人每行程一条，再次提交即更新；`content` 10–400 字、`intensity` ∈ relaxed/moderate/tiring、`advice` 必填 ≤120 字。
- 错误码：`INVALID_INPUT`(400)、`DEMO_USER_REQUIRED`(401)、`FORBIDDEN`/`CHAT_NOT_ALLOWED`/`EXPERIENCE_NOT_ALLOWED`(403)、`TRIP_NOT_FOUND`/`APPLICATION_NOT_FOUND`(404)、`TRIP_NOT_OPEN`/`APPLICATION_NOT_PENDING`/`DUPLICATE_APPLICATION`/`CHAT_READ_ONLY`(409)、`INTERNAL_ERROR`(500)。
- 状态由 `completed_at` 与人数推导，不是独立写入的字段；映射与字段约束以 `openapi.yaml` 为准。

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
