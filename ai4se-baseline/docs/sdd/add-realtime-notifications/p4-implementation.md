# P4 实现与验证记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-023 / 实时通知与未读计数）｜ **能力：** `notifications`（ADDED，6 Requirement / 26 Scenario）
- **阶段：** P4（Apply & verify / G2）｜ **日期：** 2026-11-17 ｜ **记录人：** Karena（当前开发者）
- **分支：** `feature/add-realtime-notifications`（worktree `teamRepo/RouteME-notifications`，基线 `1189b65`）
- **任务清单：** [`tasks.md`](../../../openspec/changes/add-realtime-notifications/tasks.md)（T1–T14 全部 `[x]`）
- **前置：** P3 设计 / ATDD / 任务与评审已签（[`p3-design.md`](./p3-design.md)）

## 1. 阶段目标

按 `design.md`、`atdd-design.md` 与 `tasks.md` 以 Red → Green 落地「三类业务事件的通知 + 数字未读徽标 + SSE 实时推送 + 3 秒轮询兜底」，跑通后端 / 前端 / 契约 / E2E 四层验证，产出 1440 / 768 / 390 × 浅 / 深色走查证据，交 G2 由 VL 签署。

范围外（P1 已确认）：邮件 / 短信 / OS 推送、完整通知中心、申请与聊天规则变更。

## 2. 代码产出

### 2.1 后端

| 任务 | 落点 | 结果 |
|---|---|---|
| T1 契约 | `openapi.yaml` 0.17.0 → **0.18.0**：`GET /notifications`、`GET /notifications/stream`、`POST /notifications/{notificationId}/read`、`POST /notifications/read`；6 个 schema（`NotificationType` / `Notification` / `NotificationCounts` / `NotificationList` / `NotificationReadRequest` / `NotificationEvent`）；错误码 `NOTIFICATION_NOT_FOUND` | Pass |
| T2 持久化 | `V24__add_notifications.sql`（`notifications` 表 + 按收件人倒序、按收件人未读两条索引，仅 `INTEGER` / `VARCHAR` / `CREATE INDEX`，SQLite + H2 双引擎）；`NotificationEntity` + `NotificationMapper`；`NotificationMigration*Test` | Pass |
| T3 纯函数 | `NotificationTypeEnum`（4 个 wire 值）、`NotificationTextUtils`（三类文案，含自消息守卫）、`Notification` / `NotificationEntity` 往返 | Pass |
| T4 通知服务 | `NotificationServiceImpl`：`list` 最新 50 条 + 三项计数（`total` / `application` / `message`，未读 = `read_at IS NULL`）；`markRead`（越权一律 404）/ `markAllRead` / `markConversationRead`（`trip_id` + 对方 `user_id`）；写入加入调用方事务，`afterCommit` 才推送 | Pass |
| T5 生产方钩子 | `ApplicationServiceImpl`：申请 → 发布者 `application_received`；裁决 → 申请者 `application_accepted` / `application_rejected`；`ChatServiceImpl`：发消息 → 接收方 `message`（携带 `ChatMessage` 供前端直接追加） | Pass |
| T6 失败隔离 | `notify*` 四个方法内部 `try/catch` + `log.warn`，不向外抛；自消息直接返回 | Pass |
| T7 流与接口 | `NotificationStreamServiceImpl`：按 `user_id` 注册 `SseEmitter`、20 s 心跳、单 emitter 失败隔离、断开清理；`NotificationController` 四端点（`Cache-Control: no-cache`、`X-Accel-Buffering: no`） | Pass |

### 2.2 前端

| 任务 | 落点 | 结果 |
|---|---|---|
| T8 纯函数与请求 | `notifications/notificationModel.ts`（`badgeLabel` 上限 99+、`notificationHref` 跳转目标、`applySnapshot` 归约、`lastReadSeq` 护栏）、`types.ts` 通知模型、`api.ts` 4 个请求（列表 / 单条标读 / 范围标读 / SSE URL） | Pass |
| T9 叶子迁移 | `formatChatTime` 由 `chat/chatTime.ts` 迁至 `utils/chatTime.ts`，4 处 import 同步（`ChatList`、`ChatMain`、`chatMeeting`、`admin/service/ServiceConversation`），断开 `chat → notifications` 依赖环 | Pass |
| T10 壳层 | `NotificationProvider`（`EventSource` + `onopen` 触发 REST 对账 + `activeConversation`）、`NotificationBell`（click 展开，Escape 关闭并把焦点还给按钮）、`NotificationPanel`（最新 50 条、全部已读、空态 / 失败态）、`NotificationBadge`（数字即文本）、`notificationMessages.ts`；`App.tsx` 挂 Provider；`AppShell` 铃铛置于明暗切换旁 + 侧栏 / 移动 tab 消息徽标；`styles.css` 明暗适配 | Pass |
| T11 聊天整合 | `ChatPage`：进入会话先标读再加载、推送消息直接追加（不重复请求）、离开后 3 秒轮询收敛；`ChatList` 分会话未读徽标 | Pass |

### 2.3 E2E 与文档

| 任务 | 落点 | 结果 |
|---|---|---|
| T12 功能 E2E | `e2e/tests/notifications.spec.ts` M1–M10：3 秒内到达、接受 / 拒绝双向、聊天外消息点亮、计数分型 + 自消息拒绝、单条 / 重复标读 / 全部标读不反弹、分会话标读、刷新不重复、打开会话即时更新且不提示、T0→T1 预算、窄屏徽标与面板 | Pass（10/10） |
| T14 走查 E2E | `e2e/tests/notifications-walkthrough.spec.ts` V1–V4：3 视口 × 2 主题共 6 张截图 + 横向溢出与面板边界断言、焦点 / Escape、路由中断后计数保留与恢复对账、双标签页同用户多 emitter | Pass（4/4） |
| T13 文档 | `docs/knowledge/interfaces/README.md` 通知 4 端点与字段；`docs/knowledge/_LOG.md` 追加 `kb.routeme.notifications`；`requirement-workspace/registry.md` REQ-023 → `p4-pass`；本文件 | Pass |

## 3. 验证证据

| 层 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `backend/mvnw.cmd -q test` | **472 tests / 0 failures / 0 errors**（69 个 surefire 报告，基线 434 → +38） |
| 契约版本与端点（C1） | `mvnw.cmd -B -ntp test -Dtest=OpenApiTest` | Pass：`Tests run: 12, Failures: 0, Errors: 0` |
| 前端类型 | `frontend/npm run typecheck` | Pass（`tsc --noEmit`，无输出） |
| 前端构建 | `frontend/npm run build` | Pass：`index.js` 1,608.08 kB / gzip 504.30 kB、`index.css` 115.90 kB / gzip 21.39 kB；仅有既有 chunk 体积 warning（基线 `1189b65`：1,599.28 kB / 501.10 kB、113.64 kB / 20.98 kB，即 +8.8 kB / +2.26 kB） |
| 前端单测 | `frontend/npm test` | **47 files / 369 tests Pass**（基线 344 → +25） |
| 通知功能 E2E | `npx playwright test tests/notifications.spec.ts`（Vite 5174 → 后端 8081） | M1–M10 **10 passed** |
| 走查 E2E | `npx playwright test tests/notifications-walkthrough.spec.ts` | V1–V4 **4 passed** |
| E2E 全量（C6） | `npx playwright test`（148 条） | 114 passed / 34 failed；27 条硬失败与基线 `1189b65` 逐条一致，基线全量为 106 passed / 32 failed（138 条），详见 §4 |
| 截图证据 | `docs/preview/notifications-{1440,768,390}-{light,dark}.png` | 6 张，见 §4.4 |
| 规格校验 | `openspec validate add-realtime-notifications --strict` | `Change 'add-realtime-notifications' is valid` |

## 4. E2E 全量：114 passed / 34 failed 的归因

### 4.1 现象

本 worktree 全量 E2E（148 条，含本 change 新增 14 条）为 **114 passed / 34 failed**，通知相关 14 条全绿。34 条失败在两次独立全量运行中**用例名完全一致**。

### 4.2 27 条稳定失败 = 基线既有债务（非本 change 回归）

| 文件 | 条数 | 直接原因 |
|---|---|---|
| `auth.spec.ts` | 7 | 断言旧「演示身份切换」菜单（`.id-switch-label` / `账号菜单：`），当前 UI 是账号菜单弹层，`1189b65` 与 `b50e416` 都不含这些选择器 |
| `map.spec.ts` | 9 | 断言 SVG `[data-testid="china-map"]`，而 `/map` 自 AMap 重构后渲染 `MapExplorerPage`（`ChinaMap` 只被 `PlacePicker` 使用） |
| `trips.spec.ts` | 8 | 发布页目的地级联依赖同一个 `.place-picker [data-testid="china-map"]` |
| `credit.spec.ts` | 1 | 期望匿名 `/api/admin/users` 返回 404，实际为 401（`SessionInvalidException`）；`AdminPrincipalService` / `AdminUserController` / `credit.spec.ts` 与 `b50e416` 逐字节一致 |
| `profile.spec.ts` / `profiles.spec.ts` | 2 | 同旧身份门 / 只读查看器断言 |

### 4.3 顺序相关失败（隔离运行即通过）

本 worktree 的 7 条顺序相关失败分布在 `profiles.spec.ts`（4）、`trips.spec.ts`（1）、`companions.spec.ts`（1）、`mine.spec.ts`（1）；同一批文件**单文件隔离运行**时全部通过，属既有测试间数据耦合（共享 `e2e-green.db` 累积账号 / 行程）。基线全量同样出现 5 条同类失败（`profiles` 4 + `trips` 1），说明该现象与通知代码无关，只是每次运行的具体条数随累积数据浮动。

### 4.4 基线对照：`1189b65` 纯净 worktree 复现同一失败集

为排除「新代码引入回归」，另建 detached worktree（`teamRepo/RouteME-baseline` @ `1189b65`，后端 8082 / Vite 5175 / `baseline.db`，零通知代码），对失败文件与全量各跑一次：

| 运行 | 总用例 | 结果 | 硬失败（旧规格 / 旧 UI） | 顺序相关 |
|---|---|---|---|---|
| 本 worktree（`feature/add-realtime-notifications`）全量 | 148（含通知 10） | 114 passed / **34 failed** | **27** | 7（profiles 4、trips 1、companions 1、mine 1） |
| 基线 worktree（`1189b65`）全量 | 138（无通知用例） | 106 passed / **32 failed** | **27**（用例名逐条一致） | 5（profiles 4、trips 1） |

**结论：**

1. **27 条硬失败在两侧完全一致**（同一文件、同一用例名、同一断言失败点），即 `1189b65` 自带的地图 / 身份 / 管理端契约债务，与本 change 无关。
2. 顺序相关失败两侧都有（基线 5、本 worktree 7），差异来自各自 SQLite 累积数据不同（本 worktree 的 `e2e-green.db` 已跑过多轮全量）；这 7 条在本 worktree 单文件隔离运行全部通过。
3. 通知 14 条（M1–M10、V1–V4）全绿，且 34 条失败中**没有一条**触及通知、徽标、聊天追加或 SSE。
4. 全量门禁口径因此定为「通知 14 条全绿 + 失败集与基线同构（27 条硬失败逐条一致）」，而不是「全量 0 失败」。该类基线债务不在本 change 范围内修复（修复需重写地图与身份相关规格，属独立 change）。

## 5. 与 P3 设计的偏差与实现补充

| # | 类型 | 内容 | 处置 |
|---|---|---|---|
| D-1 | 测试口径澄清（D6） | 失败隔离落在 `NotificationServiceImpl.notify*` 内部（`try/catch` + `log.warn`），生产方**没有** `try/catch`；`NotificationFailureIsolationTest` 用 `@Primary` 子类 stub 让 `save` 抛异常，验证 apply / decide / send 仍返回成功。生产方不加捕获可避免重复告警与掩盖真实异常 | 与 `design.md` §5.1 / D6 一致，只是测试观察点写在服务内 |
| D-2 | 设计补充（§6.1） | `NotificationState` 增 `lastReadSeq`；标读响应应用时记录当时的请求序号，`applySnapshot(state, list, seq)` 若发现快照发起早于最近一次标读响应，则**只合并条目、不采用计数**，避免在途快照复活已读计数 | 已回写 `design.md` §6.1 / R-9 |
| D-3 | 视觉缺陷修复（390 px） | 首轮走查发现：antd 弹层右对齐到铃铛（右侧还有主题按钮），360 px 面板 + 24 px 容器内边距在 390 px 视口左侧溢出 24 px。改为 `@media (max-width: 680px)` 下弹层 `left/right: 8px`、宽度 `calc(100vw - 16px)` 的整行 sheet，面板 `width: 100%`；E2E 断言从「无横向滚动」加严为「面板左右边界都在视口内」（V1 与 M10 双点覆盖） | 已修复并复跑：V1–V4 4/4、M1–M10 10/10；6 张截图重拍 |
| D-4 | 运行时日志噪声 | 浏览器关闭 SSE 连接时，Spring 会向 `GlobalExceptionHandler` 抛 `AsyncRequestNotUsableException` / `HttpMessageNotWritableException: No converter for ErrorResponse with preset Content-Type 'text/event-stream'`，按 ERROR + 栈打印 | 非致命（连接已断，无副作用），本 change 不修；后续可给 SSE 端点加专用异常处理或忽略该异常类型 |
| D-5 | 客户端追加消息 | 推送 payload 的 `NotificationEvent` 内嵌 `message`（`ChatMessageResponse`），前端 `ChatPage` 直接追加，不再二次拉取；同时用 `unreadRef` 让 3 秒轮询与推送收敛 | 与 D14 / §6.5 一致 |
| D-6 | 证据目录共用 | `weather-walkthrough.spec.ts` 与通知走查都写 `docs/preview/`；跑全量会重写天气截图 | 提交前已 `git checkout` 还原天气截图，只提交 6 张通知截图 |
| D-7 | G2 后缺陷修复（铃铛点开无反应） | 走查反馈：点铃铛看不到面板。定位结果：面板 DOM 已挂载、`role=dialog` 可访问，但 antd `Popover` 的容器停在 `ant-zoom-big-appear-prepare`（`opacity: 0`），且计算盒子落在视口外（`top ≈ -6988`）；原因是入场动画依赖 rAF，后台 / 被遮挡标签页里 rAF 被节流，动画永不推进。左下角账号菜单不受影响，因为它用 portal + `position: fixed` 自算坐标、没有入场动画。改为同一套做法：`createPortal` 挂 body，按铃铛的 `getBoundingClientRect()` 算 `left/top/bottom/maxHeight`，下方空间不足时向上展开，宽度 384 px（≤680 px 时 `视口 - 16`），resize / scroll 时重算；关闭路径为 `mousedown` 外部点击（不抢焦点）与 Escape（焦点交还铃铛）。同时按「不只靠颜色」补上条目类型标签（同行申请 / 申请通过 / 申请未通过 / 聊天消息），并删除 `@media (max-width: 680px)` 下针对 `.ant-popover` 的 `!important` 覆盖 | 已修复并复跑：`npm run typecheck` 干净、`npm test` 47 文件 / 369 用例、`npm run build` 通过（`index.js` 1,609.35 kB / gzip 504.67 kB，`index.css` 116.67 kB / gzip 21.45 kB）、通知 E2E 14/14（V1–V4 + M1–M10）、6 张 `docs/preview/notifications-*.png` 重拍；另用四类事件（申请 / 通过 / 拒绝 / 消息）演示面板全部可辨。打开时**不**把焦点移入面板，保持 V2「面板打开时新事件只更新列表，不移动焦点」的断言不变 |

## 6. 残余风险

- **E2E 门禁口径：** 全量 34 条失败为基线债务（27 条硬失败 + 7 条顺序相关），不等于本 change 通过全量门禁；本 change 的门禁口径为「通知 14 条全绿 + 失败集与基线一致」。
- **数据卫生：** 全量 E2E 复用 `SqlLite/e2e-green.db`，账号 / 行程持续累积；严格可重复需每轮重建库（既有问题，不在本 change 范围）。
- **推送拓扑：** `NotificationStreamServiceImpl` 的 emitter 注册表在进程内存，仅适用单实例；多实例部署需改为共享通道（Redis pub/sub 或等价机制），本 change 未涉及。
- **未覆盖：** 并发压测、真实网络抖动下的事件丢失统计（V3 用路由中断模拟，未做弱网长跑）。
- **既有构建 warning：** 单包 > 500 kB 的 chunk 体积提示自基线存在。
- **未执行：** PR / CI / P5 归档（G2 已于 2026-11-18T08:38+0800 签署）。

## 7. G2 签署

| 角色 | 批准人 | 确认内容 | 批准时间 |
|---|---|---|---|
| 开发者 | Karena | 实现与记录真实、范围未超出 P1 提案 | 2026-11-18T08:38+0800 |
| 独立复核（IO） | WAYNE | 四层验证证据（后端 472 / 前端 369 / 通知 E2E 14 / 全量 114+34 且失败集与基线 `1189b65` 同构）、偏差记录 D-1…D-6、残余风险 | 2026-11-18T08:38+0800 |
| 参与复核 | Jay | 走查截图与交互（click 展开、Escape 关闭并交还焦点、390 px 面板不越界、明暗两套样式）符合 P3 约定 | 2026-11-18T08:38+0800 |

**G2 结论：Pass**。E2E 门禁口径经签署确认：以「通知 14 条全绿 + 失败集与基线同构（27 条硬失败逐条同名）」判定，不要求全量 0 失败。

**G2 后补充（D-7）：** 签署后走查发现铃铛点击无可见面板（antd 弹层动画在后台标签页被 rAF 节流卡在 `opacity: 0`）。已按账号菜单同构的 portal + `position: fixed` 方案重写面板定位，并补上类型标签；复跑证据见 §3 与 D-7。该改动为纯前端定位/可读性修复，不改接口、不改计数语义、不改已完成签署的门禁口径，PR 评审时需一并确认。

## 8. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | 见 `p0-baseline.md` 记录 |
| P1 / P2 / P3 | 已推送（P3 签署提交 `b986a3e`） |
| P4 后端（T1–T7） | `2d07748` feat(notifications): persist events and stream them over SSE |
| P4 前端（T8–T11） | `345ac5f` feat(notifications): add the bell, panel and numeric unread badges |
| P4 E2E 与走查（T12、T14） | `a96b3fe` test(notifications): cover the three second budget and narrow screens |
| P4 文档与登记（T13） | `f30e95c` docs(notifications): record the P4 verification and walkthrough evidence |
| P4 G2 签署 | 本文件（`docs(p4)` 提交） |
| P4 修正（G2 后，D-7） | 本提交 `fix(notifications): anchor the bell panel like the account menu` |

## 9. 下一步

1. ~~G2 签署~~ — 已过（本文件 §7，2026-11-18T08:38+0800）。
2. `/sdd:pr-submit` 起 PR → `phase=ci`。
3. P5 归档：`living-merge` + change summary，把 `notifications` 能力并入 `openspec/specs/`。