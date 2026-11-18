# P0 基线 — add-realtime-notifications

- **Change：** `add-realtime-notifications`
- **能力：** `notifications`（ADDED）
- **基线提交：** `main@1189b65`（分支 `feature/add-realtime-notifications` 由此创建）；P3 前合流 `main@357f5e2`（壳层移除主题切换）
- **记录日期：** 2026-11-17 ｜ **扩围复核：** 2026-11-18
- **记录人：** Karena（当前开发者，已向发起人确认）

## 1. 仓库基线

| 项 | 值 | 证据 |
|---|---|---|
| 后端栈 | Spring Boot 4.1.2、Java 21、MyBatis-Plus 3.5.18、SQLite + Flyway | `backend/pom.xml` |
| 前端栈 | React 19、Vite 8、antd 6、vitest（node 环境，无 jsdom） | `frontend/package.json`、`frontend/vite.config.ts` |
| 契约 | 起点 `openapi.yaml` 0.17.0；合流后 0.24.0 | `openapi.yaml` 的 `info.version` |
| 迁移 | 起点 `V1` … `V23__add_travel_mode.sql`；合流后 `V29__credit_exit_application.sql` | `backend/src/main/resources/db/migration/` |
| 后端测试 | 起点 434 tests / 60 surefire reports / 0 失败 | `mvnw.cmd test`（2026-11-17 16:26） |
| 前端测试 | 起点 344 tests / 46 files 全绿 | `npm test` |
| 身份模型 | 客户端用 `X-User-Id`；仅后台 / 帮助 / 客服端点要求 bearer token | `api.ts`、`AdminGuard`、`openapi.yaml` |
| 壳层主题 | 合流 `main@357f5e2` 后移除明暗切换，只保留浅色 | `AppShell.tsx`、`styles.css` |

## 2. 与本变更相关的现状

### 2.1 聊天

- `ChatPage` 先用 `GET /api/me/chat-partners` 取会话，再用 `GET /api/trips/{tripId}/messages?with=` 取当前会话。
- 当前会话所属行程不是 `completed` / `cancelled` 时，`startChatPolling` 每 3 秒只重取**当前会话**（`CHAT_POLL_INTERVAL_MS = 3000`）。
- 未打开的会话从不刷新；`ChatList` 只渲染 `last_message` 与 `message_count`，没有未读概念。
- 发消息只写行并重载会话列表；接收方只有自己打开该会话（或已在其中，等下一次轮询）才知道。

### 2.2 申请与行程

- `POST /api/trips/{tripId}/applications` 创建 `pending` 申请。
- `POST /api/applications/{applicationId}/accept|reject` 把申请改为 `accepted` / `rejected`。
- 发布者只有打开 `#/trips/{id}/applications`，或 `MyTripsPage` 恰好重新加载时由 `GET /api/me/trips` 的 `pending_applications` 数字才发现新申请。
- 申请者只有重开 `#/mine` 才发现裁决。
- 行程状态 `ONGOING` / `COMPLETED` 由时间推导；满员由 `joined_count >= capacity` 判定；取消 / 完成在服务内产生领域事件（`TripCancelledEvent` / `TripCompletedEvent`），但没有任何外部可见的提示。

### 2.3 其余业务域

| 域 | 现状 | 缺口 |
|---|---|---|
| 信用 | `CreditService.book` 记账并发 `CreditChangedEvent`；分数、原因码、恢复规则都已存在 | 变动只体现在信用页，用户不会被告知 |
| 举报 | 用户提交后进入 `PENDING`；管理端改为 `PROCESSING` / `RESOLVED` / `REJECTED` | 举报人只能反复打开详情页看进度 |
| 账号 | `AccountStatusService` 写 `ACTIVE` / `SUSPENDED` / `BANNED`，带原因码、备注与到期时间 | 受限用户不会被告知受限内容与恢复时间 |
| 客服 | `customer_service_session` 有 `WAITING` / `HANDLING` / `CLOSED` 与回复消息 | 用户需停留在客服页才能看到接入与回复 |
| 资料 | `ProfileRules.complete` 判定资料是否完整 | 认证通过没有结果通知 |

### 2.4 壳层

- `AppShell` 顶栏只有品牌与账号入口（主题切换已由 `main@357f5e2` 移除）；侧栏有导航分组、账号菜单，≤900 px 有底部 tab。
- 壳层内没有任何徽标、圆点、铃铛、提示条或通知面板，也没有通知中心页面。
- antd 的 `Notification` / `message` 已用于临时反馈，说明提示通道无需新增依赖。

### 2.5 传输与契约

- 无 WebSocket starter，无 `@EnableScheduling`；`routeme/mq/` 只有 `.gitkeep`。
- 唯一的「准实时」行为是上述 3 秒聊天轮询。
- 开发期 `GET /api/...` 经 Vite `/api` 代理（普通 HTTP，未配置缓冲）。
- `openapi.yaml` 由 `OpenApiTest` 校验，断言契约版本与关键 schema 字段；无任何通知路径。

## 3. 缺口

| id | 缺口 | 后果 |
|---|---|---|
| G-01 | 八类业务事件都不产生通知记录 | 用户不在对应页面时事件不留任何痕迹，也没有可回看的历史 |
| G-02 | 没有未读模型 | 没有可显示的数字，也没有「读」的口径；无法区分「看过」与「没看过」 |
| G-03 | 没有推送通道 | 申请 / 裁决 / 举报 / 账号等必须手动刷新；消息延迟最多 3 秒且仅限于已打开会话 |
| G-04 | 没有跨页指示 | 用户在 `#/`、`#/map`、`#/trips/new` 时无法知道有事需要处理 |
| G-05 | 没有会话级未读 | `ChatList` 无法区分「已读」与「有新消息」 |
| G-06 | 没有从提示到目标的直达 | 即使有提示，用户仍要自己去找行程、申请、会话或举报 |
| G-07 | 没有类型分组 | 申请、消息、信用、举报等混在同一个沉默列表里，无法按需查看 |
| G-08 | 没有通知中心 | 没有「全部通知」页，没有类型筛选，没有一键全部已读 |

## 4. 基线带来的约束

- 用户端点未做鉴权；SSE 流不能自定义请求头，因此用户 id 必须放在查询串。这与既有 `X-User-Id` 同等信任级别，不扩大暴露面。
- 八类事件的生产方分散在 `ApplicationServiceImpl`、`TripController`、`ChatServiceImpl`、`CreditChangedEvent` 监听、`ReportServiceImpl` / `AdminReportServiceImpl`、`AccountStatusService`、`CustomerServiceImpl`、`UserProfileServiceImpl`；它们各自是 `@Transactional`，且已判定谁可写。
- `AccountStatusService` 被多个服务依赖；通知服务若反向依赖它会产生循环，基线要求用延迟取依赖或 mapper 判定。
- `openapi.yaml` 由 `OpenApiTest` 校验，契约版本与 schema 必须同批更新。
- 迁移必须同时能在 SQLite 与 H2 上执行（测试套件在 H2 上从空库迁移）。
- 前端测试跑在 node 环境：只能单测纯逻辑，UI 行为由 Playwright E2E 覆盖。
- 壳层已无主题切换，走查证据只保留浅色三档宽度。

## 5. 不在本基线内

- 生产级鉴权、浏览器关闭时的推送、邮件 / 短信、队列基础设施（`routeme/mq/`）均不在范围。
- 申请状态机、聊天准入、信用记账、举报处理、账号状态、客服分配与资料规则的任何改动都不在范围。
- 通知偏好、搜索、保留 / 清理任务、历史分页不在范围。
- 深色主题证据：壳层已移除主题切换，不再产出。