# 任务：add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-029 / 实时通知中心与未读计数）｜ **Owner：** Karena（AO）
- **顺序原则：** 契约先行 → 迁移 → 后端纯函数 Red → 服务 → 申请 / 裁决钩子 → 其余七域钩子 → 失败隔离 → 流服务与接口 → 前端纯函数 → 叶子模块迁移 → 壳层 → 通知中心与跳转页 → 聊天整合 → E2E → 文档 → 回归与走查。
- **验证命令统一在 §2**，每条任务只列本条最相关的命令；每个 Red 必须先运行并记录「因未实现而失败」。

## 1. 任务清单

| id | 任务 | Requirement | 落点 | 依赖 | 验收（ATDD） | 验证 |
|---|---|---|---|---|---|---|
| T1 | 契约：`openapi.yaml` 0.24.0 → 0.26.0，新增 `GET /notifications`、`GET /notifications/stream`、`POST /notifications/{id}/read`、`POST /notifications/read`、`GET /reports/mine` 与 10 个 schema（类型 / 事件 / 优先级 / 状态 / 目标种类 / 目标 / 通知 / 计数 / 列表 / 标读请求 / 事件）；`OpenApiTest` 版本断言同步 | R1–R8（契约） | `RouteME/openapi.yaml`、`OpenApiTest` | — | D1 / B7；4 路径 + `/reports/mine`、8 类 / 22 事件 / 8 目标枚举、`maxItems=50`、`NOTIFICATION_NOT_FOUND` | C1 |
| T2 | 迁移与持久化：`V31__add_notifications.sql`（双引擎、唯一索引 `(recipient_id, dedupe_key)`、索引 `(recipient_id, read_at)`）、`NotificationEntity`（`Instant` ↔ 字符串）、`NotificationMapper`、`NotificationMigrationSqliteTest` | R1 | `db/migration`、`entity`、`mapper`、`src/test` | T1 | D2 / B9 | C2 |
| T3 | 后端纯函数：`NotificationTypeEnum`（8 值）、`NotificationEventEnum`（22 值 + 所属类型）、`NotificationPriorityEnum`、`NotificationStatusEnum`、`NotificationTargetKindEnum`、`NotificationTextUtils`（22 段文案 + 回退）、实体往返 | R1 / R2 / R4 / R5 | `enums`、`utils`、`entity` | T2 | D3 / U1–U6 | C2 |
| T4 | 通知服务：`Notification` record、`NotificationService` / `impl`（写入、自事件抑制、去重、50 条列表、八类计数、目标解析、可用性判定、单条 / 全部 / 会话标读、幂等、按用户隔离）、`NotificationNotFoundException`、5 个 response / 1 个 request | R1 / R6 / R7 | `service`、`service/impl`、`pojo`、`response`、`request`、`exception` | T3 | D4 / D5 / S1–S11、B1–B5 | C2 |
| T5 | 申请与裁决钩子：`apply`（发布者，带申请）、`decide`（申请者，按裁决结果）、容量满时通知除动作人外的参与者；`TripCancelledEvent` / `TripCompletedEvent` 监听（取消 / 完成 / 关闭待处理申请） | R2 / R3 | `service/impl/ApplicationServiceImpl.java` | T4 | D7 / H1–H5 | C2 |
| T6 | 其余域钩子：`NotificationLifecycleService`（ONGOING + 安全提醒，`TripController.detail` 调用）、`ChatServiceImpl.send`、`NotificationEventListener`（信用）、`ReportServiceImpl` / `AdminReportServiceImpl`（三段）、`AccountStatusService`（三态，`ObjectProvider`）、`CustomerServiceImpl`（三段）、`UserProfileServiceImpl`（首次完整） | R4 / R5 | 各 `service/impl`、`controller/TripController.java` | T4 | D8 / H6–H12 | C2 |
| T7 | 失败隔离：`write()` 整体 `try/catch(RuntimeException)` + `log.warn`；唯一冲突单独捕获；生产者不加 `try/catch`；`NotificationFailureIsolationTest`（`@Primary` 桩） | R8 | `service/impl`、`src/test` | T5 / T6 | D9 / S-失败隔离 | C2 |
| T8 | 流服务与接口：`NotificationStreamService` / `impl`（注册表、多连接、`afterCommit` 发布、20 s 心跳、清理、单连接失败隔离）、`NotificationController`（4 端点，SSE 头）、`NotificationControllerTest`、`NotificationStreamServiceTest`、`/reports/mine` + `MyReportResponse` | R8 / R6 | `service`、`service/impl`、`controller`、`src/test` | T4 | D10 / B1–B8 | C2 |
| T9 | 前端纯函数与请求：`notificationModel.ts`（`emptyCounts` / `typeCount` / `isUnread` / `conversationKey` / `applySnapshot` / `applyCounts` / `applyEvent` / 三个标读归约 / `unreadByConversation` / `notificationHref` / `notificationAvailable` / `shouldToast` / `badgeLabel`）、`notificationModel.test.ts`、`types.ts` 类型、`api.ts` 请求 | R6 / R7 | `frontend/src/notifications`、`types.ts`、`api.ts` | T1 | D11 / F1–F9 | C3 |
| T10 | 叶子模块迁移：`formatChatTime` 从 `chat/chatTime.ts` 移到 `utils/chatTime.ts`，改 4 处 import，测试文件同步迁移且断言不改 | R6（时间展示） | `frontend/src/utils`、`chat`、`admin` | T9 | D12 / F1 | C3 |
| T11 | 前端壳层：`NotificationContext`（快照 → `EventSource` → `onopen` 对账、活动会话、提示条）、`NotificationBadge`、`NotificationBell`、`NotificationPanel`、`notificationMessages.ts`、`App.tsx` 挂载、`AppShell` 铃铛 / 账号菜单入口 / 侧栏四处按功能分摊的徽标、`route.ts` 增加 `#/notifications` | R6 / R7 / R8 | `frontend/src/notifications`、`i18n`、`App.tsx`、`AppShell.tsx`、`route.ts`、`styles.css` | T9 / T10 | D13 / F5–F8、M1 / M3 / M4 / M5 | C3 |
| T12 | 通知中心与跳转页：`NotificationCenterPage`（八类筛选 + 全部已读 + 空态 + 不可用提示）、`CreditRecordsPage`、`ReportDetailPage`、路由接入 | R6 | `frontend/src/notifications`、`credit`、`reports`、`route.ts` | T11 | D14 / F5–F7、N1–N3 | C3 |
| T13 | 聊天整合：`ChatPage` 登记活动会话、打开会话标读、活动会话推送追加、3 秒轮询兜底；`ChatList` 分会话徽标 | R4 / R7 | `ChatPage.tsx`、`ChatList.tsx` | T11 | M6 / M8 | C3 |
| T14 | E2E：`e2e/tests/notifications.spec.ts`（M1–M10 + N1–N3，多上下文，记录 T0 并断言 3000 ms）与 `notifications-walkthrough.spec.ts`（V1–V4，浅色三档截图） | R1–R8 | `RouteME/e2e/tests` | T12 / T13 | D13–D15 / M1–M10、N1–N3、V1–V4 | C4 / C5 |
| T15 | 文档一致性：`docs/knowledge/interfaces/README.md` 更新通知接口行（八类计数、`/reports/mine`），`docs/knowledge/_LOG.md` 追加，`docs/sdd/add-realtime-notifications/p0`–`p4` 与 `stories.md` / `deep-dive.md` / `impact-brief.md` / `handoff.md` / `registry.md` 同步到 REQ-029 | — | `docs/knowledge`、`requirement-workspace`、`docs/sdd` | T8 / T14 | 链接可点开；接口表与实现一致 | C6 |
| T16 | 回归与走查：后端全量、前端 typecheck / build / 单测、E2E 全量、浅色 1440 / 768 / 390、停后端重连、多标签页 | R1–R8 | 全仓 | T15 | V1–V4；与基线对比无新增失败 | C2 / C3 / C7 |

## 2. 验证命令

| 代号 | 命令 | 判据 |
|---|---|---|
| C1 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest` | 通过；0.26.0、路径与 schema 必需字段在位 |
| C2 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 全绿 671/671（合流后 `clean test`）；通知相关 10 个文件 48 条 |
| C3 | `cd ai4se-baseline/RouteME/frontend; npm run typecheck; npm test; npm run build` | 类型通过；533/533（63 文件）；构建成功 |
| C4 | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/notifications.spec.ts` | 13/13（M1–M10 + N1–N3） |
| C5 | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/notifications-walkthrough.spec.ts` | 4/4（V1–V4） |
| C6 | `cd ai4se-baseline; openspec validate add-realtime-notifications --strict` | `valid` |
| C7 | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 与基线对比，无新增失败（基线既有失败不计入） |

## 3. 对齐自检（Delta → Design → Tasks → ATDD）

| # | Scenario（REQ-029 §4） | Design | Tasks | ATDD |
|---|---|---|---|---|
| S30-1 | 八类与两态 | §3 / §5.2 | T2 / T3 / T4 | U4–U6 / S1 / N1 |
| S30-2 | 字段完整 | §4.2 / §5.4 | T1 / T4 | S1 / B1 / F1 |
| S30-3 | 同一事件只一行 | §5.2 | T2 / T4 | S2 / M7 |
| S30-4 | 只增不删 | §5.2 / §5.5 | T4 / T6 | S1 / H4 / H5 |
| S30-5 | 行程满员 | §5.1 | T5 | H3 / M2 |
| S30-6 | 行程开始与安全提醒 | §5.3 | T6 | H6 |
| S30-7 | 行程取消 | §5.1 | T5 | H4 |
| S30-8 | 行程结束 | §5.1 | T5 | H5 |
| S30-9 | 申请到达 | §5.1 | T5 / T14 | H1 / M1 |
| S30-10 | 申请通过 | §5.1 | T5 / T14 | H2 / M2 |
| S30-11 | 申请被拒 | §5.1 | T5 / T14 | H2 / M2 |
| S30-12 | 申请关闭 | §5.1 | T5 | H4 / N1 |
| S30-13 | 聊天消息 | §5.1 / §6.5 | T6 / T13 | H7 / M3 / M4 / M8 |
| S30-14 | 信用变动 | §5.1 | T3 / T6 | U1 / H8 / N1 |
| S30-15 | 信用恢复 | §5.1 | T3 / T6 | U1 / H8 |
| S30-16 | 举报全流程 | §5.1 | T6 / T8 | H9 / B8 / N1 / N2 |
| S30-17 | 账号状态 | §5.1 | T3 / T6 | U3 / H10 / N1 |
| S30-18 | 客服会话 | §5.1 | T6 | H11 / N1 |
| S30-19 | 系统安全提醒 | §5.1 / §5.3 | T6 | H6 / N1 |
| S30-20 | 身份认证 | §5.1 | T6 | H12 / N1 |
| S30-21 | 行程类跳转 | §5.4 / §6.4 | T9 / T12 | F5 / N2 |
| S30-22 | 申请类跳转 | §5.4 / §6.4 | T9 / T12 | F5 / N2 |
| S30-23 | 其它类型跳转 | §5.4 / §6.4 | T9 / T12 | F5 / N2 |
| S30-24 | 目标不可用 | §5.4 / §6.4 | T4 / T9 / T12 | S11 / F6 / N3 |
| S30-25 | 八类计数 | §5.4 | T4 / T9 / T14 | S4 / F8 / B1 / N1 |
| S30-26 | 徽标口径 | §6.3 | T11 / T13 / T14 | F8 / M4 / M10 |
| S30-27 | 读一条 | §5.5 | T4 / T9 / T14 | S5 / B2 / F3 / M5 / N1 |
| S30-28 | 全部已读 | §5.5 | T4 / T9 / T11 / T14 | S6 / B3 / F3 / M5 / N1 |
| S30-29 | 幂等 | §5.5 | T4 / T9 | S5 / B2 / F3 / M5 |
| S30-30 | 按用户隔离 | §5.5 | T4 | S8 / B2 |
| S30-31 | 会话范围 | §5.5 / §6.5 | T4 / T13 / T14 | S7 / B4 / F3 / M6 |
| S30-32 | 计数不回弹 | §6.1 / §6.2 | T9 / T11 / T14 | F1 / M5 / M7 |
| S30-33 | 三秒内只推收件人 | §5.6 / §5.7 | T8 / T11 / T14 | D10 / M1 / M9 |
| S30-34 | 重连对账 | §6.2 | T11 / T14 | F1 / M7 / V3 |
| S30-35 | 通道失败可控 | §6.2 | T8 / T11 | S-流失败 / V3 |
| S30-36 | 失败隔离 | §5.2 | T7 | D9 / 失败隔离用例 |

- **无遗漏：** 36/36 场景均有 Design、Task 与至少一个自动化验收层。
- **无静默扩张：** 任务中没有通知历史分页、搜索、偏好、清理任务、WebSocket、消息队列、邮件 / OS 推送，也没有任何业务规则改动。
- **阈值与文案单点：** 文案只在 T3 的 `NotificationTextUtils`；未读规则只在 T4 的 `read_at IS NULL`；去重只在 T2 的唯一索引 + T4 的先查后插；前端 T9 不重新推导服务端计数。
- **契约先行：** T1 在两端实现之前完成；T2 的 `V31__add_notifications.sql` 与 T1 的 0.26.0 在开工前各 `grep` 一次排他性。

## 4. 风险与回退

| 风险 | 回退 |
|---|---|
| 契约次版本或迁移号被其它 change 先占用 | 顺延次版本号 / 迁移号，同步 `OpenApiTest`、`design.md` §3 与本表，再开工 |
| SSE 经 Vite / nginx 被缓冲 | 先验响应头，再调 `proxy_buffering off`；E2E 失败保留 trace 定位 |
| 50 条上限导致分会话徽标少计（R-6） | 接受为展示边界；通知入口以服务端计数为准 |
| 在途快照复活已读计数（R-9） | F1 的 `lastReadSeq` 护栏 + 状态单调；M5 断言「标读后立即刷新不回弹」 |
| `chatTime` 迁移破坏既有引用 | T10 先跑一次前端全量单测作为基线，迁移后再跑；4 条断言不改 |
| 账号服务与通知服务循环依赖 | 用 `ObjectProvider` 延迟取依赖；可用性判断走 mapper |
| ONGOING 通知重复生成 | 去重键 `trip_ongoing:{tripId}` / `system_safety:{tripId}` + 先查后插 |
| E2E 依赖种子行号 | 数据全部经 API 现场创建，断言用相对计数 |
| 后端重启丢内存连接 | 设计已接受（R-2）；`onopen` REST 对账把丢事件降级为延迟 |
| 八类通知变噪声 | 去重 + 自事件抑制 + 只发相关方 + 当前会话不提示 |

## 5. 执行清单（openspec 任务追踪）

- [x] **T1 契约：`openapi.yaml` 0.26.0 + 4 条通知路径 + `/reports/mine` + schema**
- [x] **T2 迁移与持久化：`V31__add_notifications.sql` + entity / mapper + 迁移测试**
- [x] **T3 后端纯函数：5 个枚举、22 段文案、实体往返**
- [x] **T4 通知服务：写入、去重、列表、八类计数、三种标读、目标解析**
- [x] **T5 申请与裁决钩子：到达 / 接受 / 拒绝 / 满员 / 取消 / 完成 / 关闭**
- [x] **T6 其余域钩子：行程物化、聊天、信用、举报、账号、客服、身份**
- [x] **T7 失败隔离：`write()` 内部捕获 + 唯一冲突兜底**
- [x] **T8 流服务与接口：注册表、心跳、4 个端点、SSE 头、举报自查**
- [x] **T9 前端纯函数与请求：`notificationModel` + 类型 + API**
- [x] **T10 叶子模块迁移：`formatChatTime` → `utils/`**
- [x] **T11 前端壳层：Provider、铃铛、面板、侧栏四处分摊徽标 + 账号菜单、浅色样式**
- [x] **T12 通知中心与跳转页：八类筛选、全部已读、信用记录、举报详情**
- [x] **T13 聊天整合：活动会话、标读、追加、分会话徽标**
- [x] **T14 E2E：`notifications.spec.ts` 13 条 + `notifications-walkthrough.spec.ts` 4 条**
- [x] **T15 文档一致性：知识库、registry、SDD 阶段记录、工作区文档**
- [x] **T16 回归与走查：后端 671、前端 533、E2E 13 + 4、浅色三档截图**