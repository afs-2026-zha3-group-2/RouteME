# P4 实现与验证记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-028 / 实时通知中心与未读计数）｜ **能力：** `notifications`（ADDED，8 Requirement / 36 Scenario）
- **阶段：** P4（Apply & verify / G2）｜ **日期：** 2026-11-17（首版四类）｜ **扩围：** 2026-11-18（八类通知中心，同一 PR #40）｜ **记录人：** Karena（当前开发者）
- **分支：** `feature/add-realtime-notifications`（worktree `teamRepo/RouteME-notifications`；P3 前合流 `main@357f5e2` 后继续同步 `origin/main`）
- **任务清单：** [`tasks.md`](../../../openspec/changes/add-realtime-notifications/tasks.md)（T1–T16 全部 `[x]`）
- **前置：** P3 设计 / ATDD / 任务与评审已签（[`p3-design.md`](./p3-design.md)）；扩围复核见 [`20261118-add-realtime-notifications-expansion-review.md`](../../reviews/20261118-add-realtime-notifications-expansion-review.md)

## 1. 阶段目标

按 `design.md`、`atdd-design.md` 与 `tasks.md` 以 Red → Green 落地一条完整垂直切片：**八类业务事件 → 持久化通知 → 按用户 SSE 推送 → 未读计数（总数 + 八类）→ 通知中心与按目标跳转 → 聊天会话级未读**，并用后端 / 前端 / 契约 / E2E 四层证据与浅色三档走查收口 G2。

首版（2026-11-17）只覆盖申请到达 / 裁决 / 聊天消息三类事件；2026-11-18 发起人要求扩展为覆盖八类业务事件的完整通知中心，按指示在**同一 change、同一 PR #40** 内完成，不另开 change。需求编号随之由 REQ-023 顺延为 **REQ-028 / S29**（`main` 上 REQ-023 已被 `add-experience-like-credit` 占用）。

范围外（P1 已确认）：邮件 / 短信 / OS 推送、通知历史分页、搜索、通知偏好、保留 / 清理任务、WebSocket 与消息队列；申请、聊天、行程、信用、举报、账号、客服、资料规则一律不改。

## 2. 代码产出

### 2.1 后端

| 任务 | 落点 | 结果 |
|---|---|---|
| T1 契约 | `openapi.yaml` 0.24.0 → **0.25.0**：`GET /notifications`、`GET /notifications/stream`、`POST /notifications/{notificationId}/read`、`POST /notifications/read`、`GET /reports/mine`；`NotificationType`（8）/ `NotificationEventName`（22）/ `NotificationPriority` / `NotificationStatus` / `NotificationTargetKind`（8）等 schema；错误码 `NOTIFICATION_NOT_FOUND` | Pass |
| T2 持久化 | `V30__add_notifications.sql`：`notifications` 表（收件人、类型、事件、标题、正文、优先级、动作人、行程 / 申请 / 消息 / 举报 / 客服关联、去重键、创建 / 已读时间）；唯一索引 `(recipient_id, dedupe_key)`、查询索引 `(recipient_id, read_at)`；仅 `INTEGER` / `VARCHAR` / `CREATE INDEX`，SQLite + H2 双引擎；`NotificationEntity` + `NotificationMapper` | Pass |
| T3 纯函数 | `NotificationTypeEnum`（8 值）、`NotificationEventEnum`（22 事件 + 所属类型）、`NotificationPriorityEnum`、`NotificationStatusEnum`、`NotificationTargetKindEnum`；`NotificationTextUtils` 22 段中文标题 / 正文（含原因码回退、账号受限只写结构化事实）；`Notification` record 与实体往返 | Pass |
| T4 通知服务 | `NotificationServiceImpl`：`write()` 自事件抑制（`actorId == recipientId` 直接丢弃）→ 先查 `(recipient_id, dedupe_key)` → 插入 → `DuplicateKeyException` 视为已去重 → 其它异常 `log.warn` 吞掉；`list` 最新 50 条 + `describe()` 补动作人、行程标题、`target`、`related_available`；`counts` 八类零填充；单条 / 全部 / 单会话三种标读（`read_at IS NULL` 条件，天然幂等，越权 404） | Pass |
| T5 申请与行程钩子 | `ApplicationServiceImpl`：申请 → 发布者 `application_received`（目标 `applications`）；裁决 → 申请者 `application_accepted` / `application_rejected`（目标 `trip`）；接受致满员 → 除动作人外已接受参与者 `trip_full`；`onTripCancelled` → 同行者 `trip_cancelled`（含原因）+ 待处理申请者 `application_closed`；`onTripCompleted` → 同行者 `trip_completed` | Pass |
| T6 其余域钩子 | `NotificationLifecycleService`（`TripController.detail` 读取时惰性物化 `trip_ongoing` 与 `safety_reminder`，去重键 `trip_ongoing:{tripId}` / `system_safety:{tripId}`）；`ChatServiceImpl.send`；`NotificationEventListener`（`CreditChangedEvent` → `credit_changed`，< 60 为 `HIGH`；安全学习恢复 → `credit_recovered` + `HIGH`）；`ReportServiceImpl` / `AdminReportServiceImpl`（提交 / 处理中 / 完成三段）；`AccountStatusService`（暂停 / 封禁 / 恢复，`ObjectProvider<NotificationService>` 断循环）；`CustomerServiceImpl`（接入 / 回复 / 结束）；`UserProfileServiceImpl`（资料首次完整 → `identity_verified`） | Pass |
| T7 失败隔离 | `write()` 内部捕获 `RuntimeException` 并记录；生产方不加 `try/catch`；`NotificationFailureIsolationTest` 以 `@Primary` 桩让写入抛错，验证申请 / 裁决 / 发消息等动作仍成功 | Pass |
| T8 流与接口 | `NotificationStreamServiceImpl`：按 `user_id` 分桶的 `SseEmitter` 注册表、同用户多连接、20 s 心跳、`afterCommit` 发布、单连接失败只清理自身；`NotificationController` 四端点（`text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`）；`ReportController` 增 `GET /reports/mine` + `MyReportResponse` | Pass |

### 2.2 前端

| 任务 | 落点 | 结果 |
|---|---|---|
| T9 纯函数与请求 | `notifications/notificationModel.ts`：`emptyCounts` / `typeCount` / `isUnread` / `conversationKey` / `applySnapshot`（`lastReadSeq` 护栏、50 条截断、计数逐项取大）/ `applyCounts` / `applyEvent`（活动会话即时标读）/ 三个标读归约 / `unreadByConversation` / `notificationHref`（八种 `kind`）/ `notificationAvailable` / `shouldToast` / `badgeLabel`（0 为空、不截断 `99+`）；`types.ts`、`api.ts` | Pass |
| T10 叶子迁移 | `formatChatTime` 由 `chat/chatTime.ts` 迁至 `utils/chatTime.ts`，同步 4 处 import，断开 `notifications → chat` 反向依赖；测试断言未改 | Pass |
| T11 壳层 | `NotificationContext`（REST 快照 → `EventSource` → `onopen` 对账、活动会话、提示条、切换用户清理）、`NotificationBadge`、`NotificationBell`（click 展开，Escape 关闭并归还焦点）、`NotificationPanel`（`createPortal` + `position: fixed` 自算定位，最新 50 条、全部已读、查看全部通知）、`notificationMessages.ts`；`App.tsx` 挂 Provider；`AppShell` 铃铛 + 侧栏「通知中心」入口 + 账号菜单入口（`total`）+ 侧栏 / 移动 tab 聊天入口（`CHAT`）；`route.ts` 增 `#/notifications` | Pass |
| T12 通知中心与跳转页 | `NotificationCenterPage`（八类筛选 `notification-filter-<TYPE>` 带数字 +「全部」、全部已读、类型标签、重要标记、未读 / 已读文字、空态、不可用提示）；`CreditRecordsPage`（承接 `credit`）；`ReportDetailPage`（承接 `report`，数据来自 `GET /reports/mine`） | Pass |
| T13 聊天整合 | `ChatPage` 打开会话即按 `(trip_id, other_user_id)` 标读、活动会话推送直接追加、保留 3 s 轮询兜底；`ChatList` 分会话未读徽标（`chat-unread-badge`） | Pass |

### 2.3 E2E 与文档

| 任务 | 落点 | 结果 |
|---|---|---|
| T14 功能 E2E | `e2e/tests/notifications.spec.ts` **13 条**：M1 三秒内到达；M2 接受 / 拒绝 + 满员；M3 聊天外消息点亮聊天徽标与提示条；M4 计数分型 + 自消息拒绝；M5 读一条 / 重复标读 / 全部已读 / 刷新不回弹；M6 分会话标读；M7 刷新不重复；M8 当前会话即时与提示抑制；M9 T0→T1 三秒预算；M10 窄屏 tab 徽标与面板；N1 通知中心八类筛选 + 全部已读；N2 类型跳转；N3 目标不可用 | Pass（13/13） |
| T14 走查 E2E | `e2e/tests/notifications-walkthrough.spec.ts` **4 条**：V1 1440 / 768 / 390 浅色截图与溢出断言；V2 焦点 / Escape；V3 通道中断保留计数与恢复对账；V4 双标签页同用户多 emitter | Pass（4/4） |
| T15 文档 | `docs/knowledge/interfaces/README.md` 通知中心小节（八类计数、22 事件、`/reports/mine`、跳转与徽标口径）；`docs/knowledge/_LOG.md` 追加扩围条目；`requirement-workspace/*`（REQ-028 / S29、registry、handoff、deep-dive、impact-brief §28、stories）与 `docs/sdd/p0`–`p4` 同步 | Pass |
| T16 回归与走查 | 后端全量、前端 typecheck / build / 单测、通知 E2E、浅色三档截图、停后端重连、双标签页 | Pass（见 §3） |

## 3. 验证证据

| 层 | 命令 | 结果 |
|---|---|---|
| 后端全量（C2） | `backend/mvnw.cmd -B -ntp test` | **625 tests / 0 failures / 0 errors**（94 个 surefire 报告；2026-11-18 11:51 全量复跑） |
| 通知相关后端测试 | `target/surefire-reports/*Notification*.txt` | **10 个文件 / 48 条**：Controller 9、Service 10、Producer 6、Hook 3、FailureIsolation 3、Stream 3、TextUtils 7、TypeEnum 4、Entity 2、Migration 1 |
| 契约与接口子集 | `mvnw.cmd -B -ntp test -Dtest=OpenApiTest,NotificationControllerTest,ReportControllerTest` | **40/40**（`OpenApiTest` 含 0.25.0、4 条通知路径、`/reports/mine`、枚举与 `maxItems=50` 断言） |
| 前端类型（C3） | `frontend/npm run typecheck` | Pass（`tsc --noEmit`，无输出） |
| 前端单测（C3） | `frontend/npm test` | **491 tests / 59 files Pass**（新增 `notificationModel.test.ts`） |
| 前端构建（C3） | `frontend/npm run build` | Pass：`dist/assets/index-*.js` 1,749.54 kB / gzip 544.24 kB、`index-*.css` 178.99 kB / gzip 31.23 kB；仅有既有 chunk 体积 warning |
| 通知功能 E2E（C4） | `npx playwright test tests/notifications.spec.ts --workers=1` | **13 passed**（M1–M10 + N1–N3） |
| 走查 E2E（C5） | `npx playwright test tests/notifications-walkthrough.spec.ts --workers=1` | **4 passed**（V1–V4，约 30 s） |
| 截图证据 | `docs/preview/notifications-{1440,768,390}-light.png` | 3 张浅色；深色 3 张已随 `main` 移除主题切换一并删除 |
| 规格校验（C6） | `openspec validate add-realtime-notifications --strict` | `Change 'add-realtime-notifications' is valid` |

## 4. E2E 门禁口径

- 本 change 的门禁口径为「**通知 13 条全绿 + 走查 4 条全绿**」，不以仓库全量 E2E 0 失败为准。
- 全量 E2E 存在基线债务：27 条硬失败（`auth.spec.ts` 7 条断言旧演示身份切换、`map.spec.ts` 9 条断言已重构的地图测试点、`trips.spec.ts` 8 条复用同一地图选择器、`credit.spec.ts` 1 条 404/401 期望、`profile*.spec.ts` 2 条旧身份门），在首版 P4 时已用 `1189b65` 纯净 worktree 逐条复现同名失败，与本 change 无关。
- 另有若干顺序相关失败（共享 `SqlLite/e2e-green.db` 累积数据导致），单文件隔离运行即通过；属既有测试数据卫生问题。
- 八类扩围没有新增或触碰上述失败文件；扩围只新增通知中心页、信用记录页、举报详情页与跳转逻辑，其覆盖全部在 `notifications.spec.ts` 与 `notifications-walkthrough.spec.ts` 内。
- 因此本轮不重跑全量并重新归因；基线债务不在本 change 范围内修复（需重写地图与身份相关规格，属独立 change）。

## 5. 与 P3 设计的偏差与实现补充

| # | 类型 | 内容 | 处置 |
|---|---|---|---|
| D-1 | 测试口径澄清（D6） | 失败隔离落在 `NotificationServiceImpl.write/notify*` 内部（`try/catch` + `log.warn`），生产方**没有** `try/catch`；`NotificationFailureIsolationTest` 用 `@Primary` 子类 stub 让 `save` 抛异常，验证申请 / 裁决 / 发消息等仍返回成功。生产方不加捕获可避免重复告警与掩盖真实异常 | 与 `design.md` §5.2 / D6 一致 |
| D-2 | 设计补充（§6.1） | `NotificationState` 增 `lastReadSeq`；标读响应记录请求序号，早于最近一次标读的快照只合并条目、不采用计数，避免在途快照复活已读计数 | 已回写 `design.md` §6.1 / R-9 |
| D-3 | 视觉缺陷修复（390 px） | 首轮走查发现弹层在 390 px 视口左侧溢出 24 px；改为 `@media (max-width: 680px)` 下整行 sheet，E2E 断言从「无横向滚动」加严为「面板左右边界都在视口内」（V1 与 M10 双点覆盖） | 已修复并复跑 |
| D-4 | 运行时日志噪声 | 浏览器关闭 SSE 连接时 Spring 打印 `AsyncRequestNotUsableException` / `HttpMessageNotWritableException`（`text/event-stream` 上写错误响应） | 非致命（连接已断），本 change 不修；已知噪声，后续可加专用异常处理 |
| D-5 | 客户端追加消息 | 推送 payload 的 `NotificationEvent` 内嵌 `message`（`ChatMessageResponse`），`ChatPage` 直接追加；`unreadRef` 让轮询与推送收敛 | 与 D14 / §6.5 一致 |
| D-6 | 证据目录共用 | `weather-walkthrough.spec.ts` 与通知走查都写 `docs/preview/`；跑全量会重写天气截图 | 提交前已还原天气截图，只提交通知截图 |
| D-7 | 面板定位（G2 后修复） | antd `Popover` 入场动画在后台标签页被 rAF 节流，停在 `opacity: 0` 且盒子落到视口外；改为与账号菜单同构的 `createPortal` + `position: fixed` 自算坐标（下方不足时向上展开），关闭走外部 `mousedown` 与 Escape；同时补条目类型标签，不以颜色为唯一信息 | 已修复并复跑；打开时不抢焦点，V2 断言不变 |
| D-8 | 范围扩围 | 2026-11-18 发起人要求由四类事件扩为八类完整通知中心；需求编号由 REQ-023 顺延为 **REQ-028 / S29**，Delta 由 6 / 26 改写为 **8 / 36**；按指示在**同一 PR #40** 内交付，不另开 change | `proposal.md`「变更历史」、`dov-ac-review.md` AC-6、expansion review |
| D-9 | ONGOING 物化 | `ONGOING` 与安全提醒没有显式写入动作（状态由时间推导），改为 `TripController.detail` 读取时经 `NotificationLifecycleService` 惰性物化；去重键保证重复读取不重复生成 | 与 `design.md` §5.3 / D13 一致 |
| D-10 | 自事件抑制 | `write()` 对 `actorId == recipientId` 直接丢弃；容量 2 的行程被接受时，发布者只收到 `application_received`，同行者收到 `application_accepted` + `trip_full` | 与 D7 一致；`NotificationHookTest` 3/3 覆盖 |
| D-11 | 依赖方向 | `AccountStatusService` 用 `ObjectProvider<NotificationService>` 延迟取依赖，`NotificationServiceImpl` 用 mapper 判定举报 / 客服可用性，避免「账号 → 通知 → 账号」与「通知 → 业务服务」循环 | 与 `design.md` §5.1 / R-11 一致 |
| D-12 | 走查证据收敛 | `main` 已移除壳层主题切换；本 change 只保留浅色 1440 / 768 / 390 三张截图，删除三张深色 PNG，并在 `proposal.md` / `design.md` / `tasks.md` 同步 | V1 只断言浅色三档 |
| D-13 | 跳转承接页 | `CREDIT` 与 `REPORT` 在基线没有可落地页面；新增 `CreditRecordsPage` 与 `ReportDetailPage`，并补 `GET /reports/mine` 让举报详情只读本人数据 | 与 D15 / D16 一致；E2E N2 / N3 覆盖 |
| D-14 | 徽标数字 | `badgeLabel` 返回原始数字（0 为空串），不做 `99+` 截断；数字是唯一计数信息载体，颜色只作强调 | 与 S29-26 一致 |
| D-15 | 身份认证只发一次 | `identity_verified` 只在资料首次变为完整时产生；去重键 `system_identity:{userId}` 兜底，后续修改资料不重复通知 | 与 S29-20 一致 |

## 6. 残余风险

- **E2E 门禁口径：** 全量仍带基线债务（27 条硬失败 + 顺序相关失败），不等于全量通过；本 change 以「通知 13 + 走查 4」为门禁。
- **数据卫生：** 全量 E2E 复用 `SqlLite/e2e-green.db`，账号 / 行程持续累积；严格可重复需每轮重建库（既有问题，不在本 change 范围）。
- **推送拓扑：** `NotificationStreamServiceImpl` 的 emitter 注册表在进程内存，仅适用单实例；多实例部署需改为共享通道（Redis pub/sub 或等价机制）。
- **显示上限：** 列表最多 50 条，分会话徽标由这 50 条派生；通知入口的总数以服务端计数为准，长尾会话可能少计（`design.md` R-6）。
- **ONGOING 依赖读取：** 若无人打开行程详情，`trip_ongoing` 与 `safety_reminder` 不会生成；这是「无显式写入动作」的自觉取舍。
- **八类接入点分散：** 每个业务域一条钩子，新增第九类时必须同步枚举、文案、目标与筛选 UI；当前由钩子用例与 E2E 交叉覆盖。
- **身份模型：** SSE 用 `user_id` 查询参数，与既有 `X-User-Id` 同级信任；真实鉴权另开 change。
- **未覆盖：** 并发压测、弱网长跑下的事件丢失统计（V3 用路由中断模拟）。
- **既有构建 warning：** 单包 > 500 kB 的 chunk 体积提示自基线存在。
- **未执行：** 全量 E2E 重跑归因、PR CI、P5 归档（G2 见 §7）。

## 7. G2 签署

首版（四类事件）G2：

| 角色 | 批准人 | 确认内容 | 批准时间 |
|---|---|---|---|
| 开发者 | Karena | 实现与记录真实、范围未超出 P1 提案 | 2026-11-18T08:38+0800 |
| 独立复核（IO） | WAYNE | 四层验证证据（后端 472 / 前端 369 / 通知 E2E 14 / 全量失败集与基线同构）、偏差记录、残余风险 | 2026-11-18T08:38+0800 |
| 参与复核 | Jay | 走查截图与交互（click 展开、Escape 关闭并交还焦点、390 px 面板不越界）符合 P3 约定 | 2026-11-18T08:38+0800 |

八类扩围后复核：

| 角色 | 批准人 | 确认内容 | 批准时间 |
|---|---|---|---|
| 发起人 / IO | WAYNE | 扩围范围（八类 / 22 事件 / 通知中心 / 目标跳转）、规格与一致性复核 0 BLOCKER | 2026-11-18T10:20+0800 |
| 开发者 / SA | Karena | 扩围实现与四层证据（后端 625 / 前端 491 / E2E 13 + 4 / 浅色三档）、偏差 D-8…D-15 | 2026-11-18（扩围） |

**G2 结论：Pass**。门禁口径经签署确认：以「通知 E2E 13 条全绿 + 走查 4 条全绿 + 失败集与基线同构」判定，不要求全量 0 失败。

## 8. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | 见 `p0-baseline.md` 记录 |
| P1 / P2 / P3 | 已推送（P3 签署提交 `b986a3e`） |
| P4 后端（T1–T7） | `2d07748` feat(notifications): persist events and stream them over SSE |
| P4 前端（T8–T11） | `345ac5f` feat(notifications): add the bell, panel and numeric unread badges |
| P4 E2E 与走查（T12、T14） | `a96b3fe` test(notifications): cover the three second budget and narrow screens |
| P4 文档与登记（T13） | `f30e95c` docs(notifications): record the P4 verification and walkthrough evidence |
| G2 签署 | `29e811b` docs(p4): sign off G2 and mark REQ-023 p4-pass |
| G2 后修正（D-7） | `0f9b4de` fix(notifications): anchor the bell panel like the account menu |
| 八类扩围（D-8…D-15） | 本提交 `feat(notifications): expand to the eight-type notification centre`（含 REQ-028 / S29 工件、契约 0.25.0、前端通知中心与跳转页、E2E 13 + 4、浅色三档截图） |

## 9. 下一步

1. ~~G2 签署~~ — 首版已过（§7），扩围复核已签。
2. 推送分支并刷新 PR #40 描述，确认 `MERGEABLE` / `CLEAN`；等 CI。
3. P5 归档：`living-merge` + change summary，把 `notifications` 能力并入 `openspec/specs/`。