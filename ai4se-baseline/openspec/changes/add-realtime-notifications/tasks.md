# 任务：add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-023 / 实时通知与未读计数）｜ **Owner：** Karena（AO）
- **顺序原则：** 契约先行 → 迁移 → 后端纯函数 Red → 服务与生产方 → 失败隔离 → 流服务与接口 → 前端纯函数 → 叶子模块迁移 → 壳层 → 聊天整合 → E2E → 文档 → 回归与走查。
- **验证命令统一在 §2**，每条任务只列本条最相关的命令；每个 Red 必须先运行并记录「因未实现而失败」。

## 1. 任务清单

| id | 任务 | Requirement | 落点 | 依赖 | 验收（ATDD） | 验证 |
|---|---|---|---|---|---|---|
| T1 | 契约：`openapi.yaml` 0.17.0 → 0.18.0，新增 `GET /notifications`、`GET /notifications/stream`、`POST /notifications/{id}/read`、`POST /notifications/read` 与 `NotificationType` / `Notification` / `NotificationCounts` / `NotificationList` / `NotificationReadRequest` / `NotificationEvent`；`OpenApiTest` 两处版本断言同步，并加契约断言 | R1–R6（契约） | `RouteME/openapi.yaml`、`OpenApiTest` | — | D1 / B7；4 路径、枚举、`maxItems=50`、`NOTIFICATION_NOT_FOUND` | C1 |
| T2 | 迁移与持久化：`V30__add_notifications.sql`（双引擎）、`NotificationEntity`（`Instant` ↔ 字符串）、`NotificationMapper`（`@Mapper`，无自定义 SQL）、`NotificationMigrationTest` | R1 / R3 | `db/migration`、`entity`、`mapper`、`src/test` | T1 | D2 / B8；表与索引存在，插入 / 查询 / 标读可用 | C2 |
| T3 | 后端纯函数：`NotificationTypeEnum`（4 个 wire 值）、`NotificationTextUtils`（4 类文案 + 未知回退）、`NotificationEntity.from` / `toNotification` 往返 | R1 / R2 | `enums`、`utils`、`entity` | T2 | D3 / U1–U4；文案与 wire 值稳定 | C2 |
| T4 | 通知服务：`Notification`（record）、`NotificationService` / `impl`（写入、最新 50 条、三项计数、单条 / 全部 / 会话标读、幂等、按用户隔离）、`NotificationNotFoundException`、四个 response / 一个 request | R1 / R2 / R3 / R5 | `service`、`service/impl`、`pojo`、`response`、`request`、`exception` | T3 | D4 / D7 / S1、S7–S11、B1–B5 | C2 |
| T5 | 生产方钩子：`ApplicationServiceImpl.apply`（发布者，带 `applicationId`）、`decide`（申请者，按 `next` 取 accepted / rejected）、`ChatServiceImpl.send`（接收方，带 `messageId`）；只放在既有成功路径末尾 | R1 / R2 | `service/impl` | T4 | D4–D6 / S1–S6；被拒绝的请求 0 行 | C2 |
| T6 | 失败隔离与自消息：`notify*` 整体 `try/catch(RuntimeException)` + `log.warn`；不加 `@Transactional`；`receiverId == actorId` 直接返回；`NotificationFailureIsolationTest`（`@Primary` 桩 + 匿名子类覆盖 `save` 抛错） | R1 / R2 | `service/impl`、`src/test` | T5 | D8 / S6、S12；`accept` / `send` 仍成功 | C2 |
| T7 | 流服务与接口：`NotificationStreamService` / `impl`（注册表、`afterCommit` 发布、20 s 心跳、清理、单 emitter 失败隔离）、`NotificationController`（4 端点，SSE 头 `text/event-stream` / `no-cache` / `X-Accel-Buffering: no`）、`NotificationControllerTest`、`NotificationStreamServiceTest` | R4（+R1 / R2 投递） | `service`、`service/impl`、`controller`、`src/test` | T4 | D9 / S13、B1–B6；`asyncStarted` 与响应头 | C2 |
| T8 | 前端纯函数与请求：`notificationModel.ts`（`emptyCounts` / `applySnapshot`（含 `seq` 护栏与 `read` 单调）/ `applyEvent` / 三个标读归约 / `unreadByConversation` / `notificationHref` / `shouldToast` / `badgeLabel`）、`notificationModel.test.ts`、`types.ts` 类型、`api.ts` 四个请求 | R3 / R5 / R6 | `frontend/src/notifications`、`types.ts`、`api.ts` | T1 | D10 / F1–F8 | C3 |
| T9 | 叶子模块迁移：`formatChatTime` 从 `chat/chatTime.ts` 移到 `utils/chatTime.ts`，改 4 处 import（`ChatList`、`ChatMain`、`chatMeeting`、`admin/service/ServiceConversation`），测试文件同步迁移且断言不改 | R6（时间展示） | `frontend/src/utils`、`chat`、`admin` | T8 | D10b / F1；4 条断言原样通过 | C3 |
| T10 | 前端壳层：`NotificationProvider`（快照 → `EventSource` → `onopen` 对账、`activeConversation`、提示条）、`NotificationBadge`、`NotificationBell`（click 展开）、`NotificationPanel`（最新 50、全部已读、直达）、`notificationMessages.ts`、`App.tsx` 挂载、`AppShell` 顶栏铃铛 + 侧栏 / tab 消息徽标、明暗样式 | R4 / R6 | `frontend/src/notifications`、`i18n`、`App.tsx`、`AppShell.tsx`、`styles.css` | T8 / T9 | D11 / F5–F7、M1 / M4 / M5 | C3 |
| T11 | 聊天整合：`ChatPage` 登记活动会话、打开会话标读、活动会话推送追加、3 秒轮询兜底；`ChatList` 分会话徽标 | R5 / R6 | `ChatPage.tsx`、`ChatList.tsx` | T10 | D12 / F2、F4、M6 / M8 | C3 |
| T12 | E2E：`e2e/tests/notifications.spec.ts`（双上下文，M1–M10；记录 T0 并断言 3000 ms） | R1–R6 | `RouteME/e2e/tests` | T11 | M1–M10 | C4 |
| T13 | 文档一致性：`docs/knowledge/interfaces/README.md` 登记 4 条通知接口，`docs/knowledge/_LOG.md` 追加，`docs/sdd/add-realtime-notifications/p3-design.md` 记录本阶段；`requirement-workspace/registry.md` 在 T14 通过后更新到 P4 状态 | — | `docs/knowledge`、`requirement-workspace`、`docs/sdd` | T7 / T12 | 链接可点开；接口表含新行 | C5 |
| T14 | 回归与走查：后端全量、前端 typecheck / build / 单测、E2E 全量、1440 / 768 / 390 × 浅 / 深色、停后端重连 | R1–R6 | 全仓 | T13 | V1–V4；与基线对比无新增失败 | C2 / C3 / C6 |

## 2. 验证命令

| 代号 | 命令 | 判据 |
|---|---|---|
| C1 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest` | 通过；0.18.0、4 路径与 schema 必需字段在位 |
| C2 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 全绿；新增用例数与 ATDD §3–§4 一致 |
| C3 | `cd ai4se-baseline/RouteME/frontend; npm run typecheck; npm test; npm run build` | 类型、单测、构建全绿 |
| C4 | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/notifications.spec.ts` | 10/10 |
| C5 | `cd ai4se-baseline; openspec validate add-realtime-notifications --strict` | `valid` |
| C6 | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 与基线对比，无新增失败 |

## 3. 对齐自检（Delta → Design → Tasks → ATDD）

| # | Scenario（REQ-023 §4） | Design | Tasks | ATDD |
|---|---|---|---|---|
| S23-1 | 申请到达时为发布者创建一条通知 | §5.1 / §5.2 | T4 / T5 / T12 | S1 / M1 |
| S23-2 | 接受时为申请者创建一条通知 | §5.1 | T5 / T12 | S2 / M2 |
| S23-3 | 拒绝时为申请者创建一条通知 | §5.1 | T5 / T12 | S3 / M2 |
| S23-4 | 被既有规则拒绝的请求不产生通知 | §5.1 | T5 | S4 |
| S23-5 | 自己给自己发消息不产生通知 | §5.1 / §5.2 | T4 / T6 | S6 |
| S23-6 | 每条消息一条通知 | §5.1 | T5 / T12 | S5 / M3 |
| S23-7 | 刷新或重连后计数不变 | §5.3 / §6.2 | T4 / T10 / T12 | S7 / M7 |
| S23-8 | 计数按类型拆分 | §5.3 | T4 / T10 / T12 | S8 / B1 / M4 |
| S23-9 | 列表按时间倒序且最多 50 条 | §5.3 | T4 | S11 / B1 |
| S23-10 | 列表条目上下文完整 | §5.3 | T4 / T10 | B1 / M5 |
| S23-11 | 只推送给收件人 | §5.5 | T7 | S13 / M1 |
| S23-12 | 通知在 3 秒内到达 | §5.7 / §6.2 | T7 / T10 / T12 | M9 |
| S23-13 | 重连对账不丢不重 | §6.2 | T10 / T12 | M7 |
| S23-14 | 空闲连接由心跳保持并在断开后释放 | §5.5 | T7 | S13 |
| S23-15 | 推送通道失败不影响其它功能 | §6.2 | T7 / T10 | S13 / V3 |
| S23-16 | 读一条只减一 | §5.4 | T4 / T8 / T12 | S7 / B2 / F3 / M5 |
| S23-17 | 全部已读归零 | §5.4 | T4 / T8 / T10 / T12 | S8 / B3 / F3 / M5 |
| S23-18 | 打开会话只清该会话的消息 | §5.4 / §6.6 | T4 / T11 / T12 | S9 / B4 / F3 / M6 |
| S23-19 | 重复标读不改变计数 | §5.4 | T4 / T8 | S7 / B2 / F3 |
| S23-20 | 标读按用户隔离 | §5.4 | T4 | S10 / B2 |
| S23-21 | 数字徽标随未读数出现与消失 | §6.4 | T10 / T12 | F7 / M1 / M4 |
| S23-22 | 面板列出最新通知并可全部已读 | §6.5 | T10 / T12 | M5 |
| S23-23 | 激活通知直达目标并标读 | §6.5 | T8 / T10 / T12 | F5 / M5 |
| S23-24 | 当前会话的消息即时出现且不累计未读 | §6.6 | T11 / T12 | F2 / M8 |
| S23-25 | 窄屏下计数口径一致 | §6.4 / §6.7 | T10 / T12 / T14 | M10 / V1 |
| S23-26 | 通知失败不回滚裁决 | §5.1 | T5 / T6 | S12 / V3 |

- **无遗漏：** 26/26 场景均有 Design、Task 与至少一个自动化验收层。
- **无静默扩张：** 任务中没有通知历史页、筛选、偏好、清理任务、WebSocket、消息队列、邮件 / OS 推送，也没有申请 / 聊天规则改动。
- **阈值与文案单点：** 文案只在 T3 的 `NotificationTextUtils`；未读规则只在 T4 的 `WHERE read_at IS NULL`；前端 T8 不重新推导服务端计数。
- **契约先行：** T1 在两端实现之前完成；T2 使用的 `V30` 与 T1 的 0.18.0 在开工前再各 `grep` 一次排他性。
- **入口交互：** T10 的铃铛按 click 展开（签署确认，不改 hover）。

## 4. 风险与回退

| 风险 | 回退 |
|---|---|
| 契约次版本或迁移号被其它 change 先占用 | 顺延次版本号 / `V25`，同步 `OpenApiTest`、`design.md` §3 与本表，再开工 |
| SSE 经 Vite / nginx 被缓冲 | 先验响应头，再调 `proxy_buffering off`；E2E 失败保留 trace 定位 |
| 50 条上限导致分会话徽标少计（R-6） | 接受为展示边界；总徽标以服务端计数为准；不扩范围做全量分会话计数 |
| 在途快照复活已读计数（R-9） | F1 的 `seq` 护栏 + `read` 单调；M5 增加「标读后立即刷新不回弹」 |
| `chatTime` 迁移破坏既有引用 | T9 先跑一次前端全量单测作为基线，迁移后再跑；4 条断言不改 |
| E2E 依赖种子行号 | 数据全部经 API 现场创建，断言用相对计数 |
| 后端重启丢内存连接 | 设计已接受（R-2）；`onopen` REST 对账把丢事件降级为延迟 |

## 5. 执行清单（openspec 任务追踪）

- [x] **T1 契约：`openapi.yaml` 0.18.0 + 4 路径与 6 个 schema**
- [x] **T2 迁移与持久化：`V30` + entity / mapper + 迁移测试**
- [x] **T3 后端纯函数：类型枚举、通知文案、实体往返**
- [x] **T4 通知服务：写入、列表、三项计数、三种标读**
- [x] **T5 生产方钩子：申请、裁决、发消息**
- [x] **T6 失败隔离与自消息：`notify*` 内部捕获 + 守卫**
- [x] **T7 流服务与接口：注册表、心跳、4 个端点、SSE 头**
- [x] **T8 前端纯函数与请求：`notificationModel` + 类型 + API**
- [x] **T9 叶子模块迁移：`formatChatTime` → `utils/`**
- [x] **T10 前端壳层：Provider、铃铛、面板、四处徽标、明暗样式**
- [x] **T11 聊天整合：活动会话、标读、追加、分会话徽标**
- [x] **T12 E2E：`notifications.spec.ts` M1–M10**
- [x] **T13 文档一致性：接口表、变更日志、registry、P3 记录**
- [x] **T14 回归与走查：后端全量、前端 typecheck / build / 单测、E2E 全量、1440/768/390 × 浅/深**