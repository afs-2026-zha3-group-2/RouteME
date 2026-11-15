# 设计：add-trip-companions

- **Change:** `add-trip-companions`（`trip-companions`，REQ-003）｜ **依据：** [`spec.md`](specs/trip-companions/spec.md)、[`atdd-design.md`](atdd-design.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`

## 1. 关键取舍

### 匹配归 companions，读取行程经 trip-plans 仓储

- `MatchService` 在 `trip-companions` 内，依赖 `TripPlanRepository` 与 `UserRepository` 读取行程与用户；不修改 `trip-plans` 的 `/trips` 契约。
- 新增 `GET /matches`（同参筛选 + 匹配信息，默认按分数排序）与 `GET /matches/{tripId}`（详情页单条匹配信息）。
- 方向保持 companions → plans（下游依赖上游），不反向注入。

### 「已接受申请」即同行关系，不新建 companions 表

- 同行者 = 发布者 + 该行程 `ACCEPTED` 的申请者；`participants` 由查询聚合。
- `trip_plans.joined_count` 仍是唯一人数权威；接受/退出由 companions 调用 `TripPlanService.addCompanion/removeCompanion`（`@Transactional`，单一写入方），状态投影自动在「招募中 / 已满员」之间切换。
- 被否决：单独 `companions` 表——会与 accepted application 双写，且退出/重进容易不一致。

### 申请状态机

```text
PENDING ──accept──> ACCEPTED ──leave──> CANCELLED
   ├─────reject──> REJECTED
   └─────cancel──> CANCELLED
```

- 只有 PENDING 可 cancel；只有 ACCEPTED 可 leave；REJECTED/CANCELLED 为终态。
- 同一用户对同一行程最多一条 PENDING 或 ACCEPTED（数据库唯一索引 + 服务端校验）。

### 聊天

- `chat_messages` 只追加；`GET` 按 `sent_at` 升序；前端打开聊天页每 5 秒轮询，另有「刷新消息」。
- 权限：双方都必须是该行程参与者且不是同一人；PENDING 申请者无权。
- 行程 `completed` 后允许读、拒绝写（409 `CHAT_READ_ONLY`）。
- 内容 trim 后非空且 ≤500 字。
- 被否决：WebSocket/已读回执/推送——MVP 明确不做。

### 我的旅行

- `GET /me/trips` 返回四组摘要 + `pending_application_count`：
  - published：我发布且未取消
  - applied：我提交的申请（含状态与行程摘要）
  - matched：我是参与者、非我发布、未结束
  - completed：我是参与者且已结束
- 可分享体验分组属 REQ-004，不在本接口。

### 举报

- `reports` 表：`target_type`（trip/user）、`target_id`、`reporter_id`、`reason`（固定枚举：harassment / fake / safety / other）、`note`（≤200）、`created_at`。
- 提交返回 201 与 `{received: true}`；不做处置后台。

## 2. 数据模型

```text
trip_applications
  id INTEGER PRIMARY KEY
  trip_id INTEGER NOT NULL            -- FK trip_plans.id
  applicant_id INTEGER NOT NULL       -- FK app_users.id
  message VARCHAR(120)
  status VARCHAR(20) NOT NULL         -- PENDING / ACCEPTED / REJECTED / CANCELLED
  created_at VARCHAR(40) NOT NULL
  decided_at VARCHAR(40)

chat_messages
  id INTEGER PRIMARY KEY
  trip_id INTEGER NOT NULL
  sender_id INTEGER NOT NULL
  receiver_id INTEGER NOT NULL
  content VARCHAR(500) NOT NULL
  sent_at VARCHAR(40) NOT NULL

reports
  id INTEGER PRIMARY KEY
  target_type VARCHAR(10) NOT NULL    -- trip / user
  target_id INTEGER NOT NULL
  reporter_id INTEGER NOT NULL
  reason VARCHAR(20) NOT NULL
  note VARCHAR(200)
  created_at VARCHAR(40) NOT NULL
```

- 迁移：`V5__create_trip_applications.sql`、`V6__create_chat_messages.sql`、`V7__create_reports.sql`；`V8` 起留给 REQ-004。
- V5 种子必须与 V4 的 `joined_count` 一致：为已满/已结束行程补 ACCEPTED 申请，为招募中行程补 PENDING 申请（trip 3 → 用户 1 PENDING；trip 5 → 用户 3 PENDING；trip 1/2/4/6 按既有计数补 ACCEPTED）。种子不修改 `joined_count`。
- 唯一约束：`(trip_id, applicant_id)` 在 PENDING/ACCEPTED 状态下的唯一性用服务端校验 + 查询保证（SQLite/H2 不支持部分唯一索引的通用写法）。

## 3. 接口面（`openapi.yaml` 为权威）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/matches` | 候选行程 + `match{score, percentage, reasons[], basis}`；默认分数倒序 |
| GET | `/matches/{tripId}` | 单条行程的匹配信息 |
| POST | `/trips/{tripId}/applications` | 提交申请（message 选填 ≤120） |
| GET | `/trips/{tripId}/applications` | 发布者查看申请列表 |
| GET | `/me/applications` | 我的申请（含行程摘要） |
| POST | `/applications/{id}/cancel` | 申请者取消 PENDING |
| POST | `/applications/{id}/accept` | 发布者接受 |
| POST | `/applications/{id}/reject` | 发布者拒绝 |
| POST | `/trips/{tripId}/leave` | 已接受同行者退出 |
| GET | `/trips/{tripId}/messages?with={userId}` | 消息列表（升序） |
| POST | `/trips/{tripId}/messages` | 发送消息 `{receiver_id, content}` |
| GET | `/me/chat-partners` | 聊天对象列表（含最后一条消息） |
| GET | `/me/trips` | 我的旅行四组 + 待处理数 |
| POST | `/reports` | 举报 `{target_type, target_id, reason, note?}` |

新增错误码：`APPLICATION_NOT_FOUND`(404)、`APPLICATION_NOT_PENDING`(409)、`DUPLICATE_APPLICATION`(409)、`CHAT_NOT_ALLOWED`(403)、`CHAT_READ_ONLY`(409)、`INVALID_INPUT`(400) 复用。

## 4. 后端结构

```text
routeme/
├── controller/  MatchController、ApplicationController、ChatController、MyTripsController、ReportController
├── service/     MatchService、ApplicationService、ChatService、MyTripsService、ReportService
├── dao/         TripApplicationRepository、ChatMessageRepository、ReportRepository（+ 行对象）
├── model/       TripApplication、ApplicationStatus、ChatMessage、Report、TripMatch
└── dto/         MatchResponse、ApplicationResponse、ApplicationSummary、ChatMessageResponse、MyTripsResponse、ReportRequest
```

- `MatchService` 的计分与理由为纯函数（`TripMatch.score`），UT 覆盖。
- `ApplicationService` 在事务内先校验资格，再调用 `TripPlanService.addCompanion/removeCompanion`；失败回滚。
- `TripPlanService` 新增 `addCompanion(tripId)` / `removeCompanion(tripId)`：校验存在、未结束、人数边界，更新 `joined_count` 与 `updated_at`。
- 列表过滤仍用 `TripPlanQueryService`，`/matches` 在其结果上追加匹配信息后按分数排序。

## 5. 前端结构

```text
src/
├── route.ts               新增 #/mine、#/chat/{tripId}/{userId}、#/trips/{id}/applications
├── trips/
│   ├── HomePage.tsx        改用 /matches，排序新增「按匹配度」并默认选中
│   ├── TripDetailPage.tsx  申请入口/状态、退出、举报、安全提示
│   ├── ApplicationForm.tsx 申请说明（选填，≤120）弹窗
│   └── ApplicationsPage.tsx 发布者处理列表
├── mine/MyTripsPage.tsx    四个 tab + 待处理提醒
├── chat/ChatPage.tsx       消息列表、发送、刷新、5s 轮询、只读态
└── safety/                 安全提示与举报弹窗
```

- 页面只做渲染与事件；匹配文案、申请资格、聊天权限均以后端返回为准，前端只做入口可见性。
- 举报原因选项与 `Report` 枚举一致。

## 6. 被否决的方案

| 方案 | 否决原因 |
|---|---|
| 单独 companions 表 | 与 accepted application 双写，退出/重进不一致 |
| 在 `/trips` 响应里加 match 字段 | 需要 plans 反向依赖 companions，违反依赖方向 |
| WebSocket 实时聊天 | MVP 明确不做；5s 轮询足够 |
| 人数由 applications 聚合、不存 `joined_count` | 跨能力查询耦合；plans 已有权威计数 |
| 批量接受/拒绝 | 原型增强，场景未要求，先不做 |

## 7. 风险

- 计数一致性：接受/退出必须与 `joined_count` 同事务；测试覆盖满员、退出回退、重复接受。
- 并发接受：SQLite 写事务串行；服务层在事务内重新校验人数。
- 聊天轮询：页面卸载必须清理定时器；已结束只读。
- E2E 数据累积：唯一标题 + 断言按标题过滤。
- 首页默认排序变化：由 `/matches` 承担；`/trips` 保持原默认，避免破坏已归档契约。