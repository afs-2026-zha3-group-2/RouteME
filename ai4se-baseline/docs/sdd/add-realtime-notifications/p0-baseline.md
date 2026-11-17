# P0 基线 — add-realtime-notifications

- **Change：** `add-realtime-notifications`
- **能力：** `notifications`（ADDED）
- **基线提交：** `main@1189b65`（分支 `feature/add-realtime-notifications` 由此创建）
- **记录日期：** 2026-11-17
- **记录人：** Karena（当前开发者，已向发起人确认）

## 1. 仓库基线

| 项 | 值 | 证据 |
|---|---|---|
| 后端栈 | Spring Boot 4.1.2、Java 21、MyBatis-Plus 3.5.18、SQLite + Flyway | `backend/pom.xml` |
| 前端栈 | React 19、Vite 8、antd 6、vitest（node 环境，无 jsdom） | `frontend/package.json`、`frontend/vite.config.ts` |
| 契约 | `openapi.yaml` 0.17.0 | `openapi.yaml` 的 `info.version` |
| 迁移 | `V1` … `V23__add_travel_mode.sql`；空库与 `V19` / `V17` 起点均可迁移到最新 | `backend/src/main/resources/db/migration/` |
| 后端测试 | 434 tests / 60 surefire reports / 0 失败 | `mvnw.cmd test`（2026-11-17 16:26） |
| 前端测试 | 344 tests / 46 files 全绿 | `npm test` |
| 身份模型 | 客户端用 `X-User-Id`；仅后台 / 帮助 / 客服端点要求 bearer token | `api.ts`、`AdminGuard`、`openapi.yaml` |

## 2. 与本变更相关的现状

### 2.1 聊天

- `ChatPage` 先用 `GET /api/me/chat-partners` 取会话，再用 `GET /api/trips/{tripId}/messages?with=` 取当前会话。
- 当前会话所属行程不是 `completed` / `cancelled` 时，`startChatPolling` 每 3 秒只重取**当前会话**（`CHAT_POLL_INTERVAL_MS = 3000`）。
- 未打开的会话从不刷新；`ChatList` 只渲染 `last_message` 与 `message_count`，没有未读概念。
- 发消息只写行并重载会话列表；接收方只有自己打开该会话（或已在其中，等下一次轮询）才知道。

### 2.2 申请

- `POST /api/trips/{tripId}/applications` 创建 `pending` 申请。
- `POST /api/applications/{applicationId}/accept|reject` 把申请改为 `accepted` / `rejected`。
- 发布者只有打开 `#/trips/{id}/applications`，或 `MyTripsPage` 恰好重新加载时由 `GET /api/me/trips` 的 `pending_applications` 数字才发现新申请。
- 申请者只有重开 `#/mine` 才发现裁决。

### 2.3 壳层

- `AppShell` 顶栏只有品牌与主题切换；侧栏有导航分组、账号入口，≤900 px 有底部 tab。
- 壳层内没有任何徽标、圆点、铃铛、提示条或通知面板。
- antd 的 `Notification` / `message` 已用于临时反馈，说明提示通道无需新增依赖。

### 2.4 传输

- 无 WebSocket starter，无 `@EnableScheduling`；`routeme/mq/` 只有 `.gitkeep`。
- 唯一的「准实时」行为是上述 3 秒聊天轮询。
- 开发期 `GET /api/...` 经 Vite `/api` 代理（普通 HTTP，未配置缓冲）。

## 3. 缺口

| id | 缺口 | 后果 |
|---|---|---|
| G-01 | 申请 / 裁决 / 消息事件都不产生通知记录 | 用户不在对应页面时事件不留任何痕迹 |
| G-02 | 没有未读模型 | 没有可显示的数字，也没有清除口径 |
| G-03 | 没有推送通道 | 申请类必须手动刷新；消息延迟最多 3 秒且仅限于已打开会话 |
| G-04 | 没有跨页指示 | 用户在 `#/`、`#/map`、`#/trips/new` 时无法知道有事需要处理 |
| G-05 | 没有会话级未读 | `ChatList` 无法区分「已读」与「有新消息」 |
| G-06 | 没有从提示到目标的直达 | 即使有提示，用户仍要自己去找行程 / 会话 |

## 4. 基线带来的约束

- 用户端点未做鉴权；SSE 流不能自定义请求头，因此用户 id 必须放在查询串。这与既有 `X-User-Id` 同等信任级别，不扩大暴露面。
- `ApplicationService` 与 `ChatService` 是唯一产生这三类事件的地方；两者都是 `@Transactional`，且先调用 `AccountStatusService`。
- `openapi.yaml` 由 `OpenApiTest` 校验，断言契约版本与关键 schema 字段。
- 迁移必须同时能在 SQLite 与 H2 上执行（测试套件在 H2 上从空库迁移）。
- 前端测试跑在 node 环境：只能单测纯逻辑，UI 行为由 Playwright E2E 覆盖。

## 5. 不在本基线内

- 生产级鉴权、浏览器关闭时的推送、邮件 / 短信、队列基础设施（`routeme/mq/`）均不在范围。
- 申请状态机与聊天准入规则的任何改动都不在范围。