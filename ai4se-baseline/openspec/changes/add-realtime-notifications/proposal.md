# 变更提案：add-realtime-notifications

- **需求来源：** REQ-029 — 发起人 2026-11-17 的观察「`#/chat` 里申请到达 / 申请被接受 / 收到新消息都没有实时提示，也没有显示收到几条通知的红点」；2026-11-18 追加要求扩展为覆盖八类业务事件的完整通知中心｜ **需求条目：** `requirement-workspace/requirements/REQ-029-realtime-notifications.md`
- **能力：** `notifications`（ADDED）。事件产生方仍留在 `trip-companions` / 聊天 / 信用 / 举报 / 账号 / 客服 / 资料各域内，其 Requirement 正文不改（见 D1）。
- **规模：** L（1 张表 + 1 个写入服务 + 1 个生命周期服务 + 1 个流注册表 + 1 个控制器 + 10 处生产方钩子 + 1 个前端提供者 + 铃铛 / 面板 + 1 个通知中心页 + 6 处徽标）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:no-circular-dependency`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:sdd-artifacts`

## Why

RouteMe 把用户需要「知道」或「行动」的时刻分散在八个业务域里，但它们全部是**静默**的。`docs/sdd/add-realtime-notifications/p0-baseline.md` 记录的缺口是：

- 申请写入 `pending` 行后没有任何人被告知；发布者只有打开 `#/trips/{id}/applications`，或碰巧 `#/mine` 重新加载时才发现。
- 接受 / 拒绝改的是申请者那一行的状态；申请者只有重新打开 `#/mine` 才看得到。
- 消息只是行记录；只有**当前已打开**的会话每 3 秒刷新一次，会话列表完全没有未读状态。
- 行程满员、开始、取消、结束，信用扣分与恢复，举报处理进度，账号被限制与恢复时间，客服回复，身份认证结果——这些都只写进各自的表，用户不会被告知。
- 壳层里没有任何东西提示「有别的事需要你处理」，用户停在任何其它页面都不会被提醒。

结果正是发起人描述的现象：用户必须反复刷新页面才能发现状态变化，产品里也没有任何「你有 N 件事要看」的计数；而当事件种类变多时，用户还需要记住每个域的入口。

## What Changes

- **`notifications`（ADDED，8 Requirement / 36 Scenario）：**
  1. 通知记录、类型与生命周期（八类枚举 + snake_case 事件、`read_at` 为已读真相、去重、只增不删）。
  2. 行程生命周期事件（满员、开始 + 安全提醒、取消、结束）。
  3. 申请与裁决事件（到达、通过、被拒、因行程取消而关闭）。
  4. 聊天、信用、举报与账号事件（消息、信用变动 / 恢复、举报三段、账号三态）。
  5. 客服与系统事件（接入 / 回复 / 结束、安全提醒、身份认证）。
  6. 通知中心与跳转（八类筛选、全部已读、按目标直达、目标失效提示）。
  7. 未读计数与标读规则（`total` + 八类 `by_type`、徽标口径、单条 / 全部 / 单会话、幂等、按用户隔离）。
  8. 实时投递与失败隔离（按用户推送、3 秒内到达、重连对账、通道降级、失败不回滚业务）。
- **后端：** 新增 `NotificationService`（写入 / 列表 / 计数 / 标读 / 去重 / 目标解析）、`NotificationLifecycleService`（ONGOING 与安全提醒的惰性物化）、`NotificationStreamService`（按用户 `SseEmitter` 注册表 + 心跳）、`NotificationController`；八个业务域在既有成功路径末尾各追加通知调用，失败只记日志。
- **前端：** 新增 `notifications/`（纯模型 + 提供者 + `EventSource` 生命周期 + 铃铛 + 面板 + 通知中心页）；`AppShell` 接入铃铛、账号菜单入口与侧栏四处按功能分摊的徽标；`ChatPage` / `ChatList` 打开即读、推送追加、分会话未读；新增信用记录页与举报详情页承接跳转。
- **契约：** `openapi.yaml` 0.24.0 → **0.26.0**，新增 4 条路径、`GET /reports/mine` 与 8 个通知 schema。
- **数据：** 新增 `notifications` 表（迁移 `V31__add_notifications.sql`），索引 `(recipient_id, read_at)` 与唯一索引 `(recipient_id, dedupe_key)`。

## 范围

**In scope**

- `notifications`（ADDED）：八类事件 / 22 个事件值，每事件一条持久化记录，带收件人、类型、事件、标题、正文、优先级、动作人、行程 / 申请 / 消息 / 举报 / 客服会话、创建时间、已读时间与去重键。
- 生产方：行程（满员 / ONGOING / 取消 / 完成）、申请（到达 / 接受 / 拒绝 / 关闭）、聊天、信用变动、举报（提交 / 处理中 / 完成）、账号（暂停 / 封禁 / 恢复）、客服（接入 / 回复 / 结束）、资料（首次完整）。通知与事件同事务写入，但通知失败绝不使事件失败（D6）。
- 读取 API：最新 50 条 + 未读计数（总数 / 八类拆分，零值不省略）；单条已读、按会话已读、全部已读。
- 实时投递：每用户一条 SSE 流，带心跳、客户端自动重连，以及每次（重）连后的 REST 对账，保证事件不丢（D2、D3）。
- 通知中心 `#/notifications`：八类筛选（带数字）+ 全部已读 + 类型标签 + 重要标记 + 未读 / 已读文字 + 不可用提示。
- 壳层指示器：铃铛显示未读总数并可展开面板；账号菜单入口显示总数；侧栏不再单列通知中心入口，改由「我的旅行 / 同行消息 / 联系客服 / 账号」四个功能入口分摊八类未读，四项之和恒等于总数；移动 tab 的聊天入口与会话列表显示 `CHAT` 未读数（D8、D19）。
- 按目标跳转：由后端下发 `target.kind`，前端组装路由；目标失效时保留正文并提示，不跳转（D15）。
- 契约：4 条新路径 + `/reports/mine` 与对应 schema；`openapi.yaml` 次版本递增到 0.26.0。
- 数据：1 次迁移新增 1 张表。
- 记录：`stories.md` S30、`registry.md`、`handoff.md`、`deep-dive.md`、`impact-brief.md` §28。

**Out of scope**

- 邮件、短信、OS 推送、Service Worker，以及浏览器关闭时的通知。
- 通知历史分页加载更早记录、搜索、按类型偏好、保留 / 清理任务。
- WebSocket 与任何消息队列；`routeme/mq/` 保持为空。
- 改动申请状态机、聊天准入、行程状态、容量、裁决权限、信用记账、举报处理、账号状态、客服分配或资料规则。
- 推送通道的真实鉴权；沿用 demo 的 `X-User-Id` 信任模型，并把该局限记入残余风险。
- 替换既有 3 秒聊天轮询；它保留为兜底（D10）。
- 通知音效、桌面通知、浏览器标签页标题上的计数。
- 深色主题走查：壳层主题切换已由 `main` 移除，本 change 只保留浅色三档宽度证据。

## 影响面

| 位置 | 变更 |
|---|---|
| `backend/src/main/resources/db/migration/V31__add_notifications.sql`（新增） | 建 `notifications` 表与两个索引 |
| 后端 `enums/`、`entity/`、`mapper/`、`pojo/`（新增） | `NotificationTypeEnum`、`NotificationEventEnum`、`NotificationPriorityEnum`、`NotificationStatusEnum`、`NotificationTargetKindEnum`、`NotificationEntity`、`NotificationMapper`、`Notification` |
| 后端 `service/NotificationService.java` + `service/impl/NotificationServiceImpl.java`（新增） | 写入、去重、列表、计数、目标解析、可用性判定、标读范围 |
| 后端 `service/impl/NotificationLifecycleService.java`（新增） | ONGOING 与安全提醒的惰性物化 |
| 后端 `service/impl/NotificationEventListener.java`（新增） | 监听 `CreditChangedEvent` 生成信用通知 |
| 后端 `service/NotificationStreamService.java` + `impl`（新增） | 按用户的 `SseEmitter` 注册表、心跳、发布 |
| 后端 `controller/NotificationController.java`（新增） | 列表、流、单条已读、范围已读 |
| 后端 `response/`、`request/`（新增） | `NotificationResponse`、`NotificationListResponse`、`NotificationCountsResponse`、`NotificationTargetResponse`、`NotificationEventResponse`、`NotificationReadRequest`、`MyReportResponse` |
| `service/impl/ApplicationServiceImpl.java` | 申请 / 接受 / 拒绝 / 关闭 + 行程取消 / 完成事件监听 |
| `service/impl/ChatServiceImpl.java` | 发送时通知接收方（自消息不通知） |
| `service/AccountStatusService.java` | 暂停 / 封禁 / 恢复后通知本人（`ObjectProvider` 避免循环依赖） |
| `service/impl/ReportServiceImpl.java`、`AdminReportServiceImpl.java` | 提交 / 处理中 / 处理完成三段通知 |
| `service/impl/CustomerServiceImpl.java` | 客服接入 / 回复 / 结束 |
| `service/impl/UserProfileServiceImpl.java` | 资料首次完整时的身份认证通知 |
| `controller/TripController.java` | 读取详情时惰性物化 ONGOING 与安全提醒 |
| `RouteME/openapi.yaml` | 0.26.0；新增路径与 schema |
| `frontend/src/types.ts`、`api.ts` | 通知类型、计数、目标、事件；列表 / 已读 / 流地址辅助函数 |
| `frontend/src/notifications/`（新增） | `notificationModel.ts`、`NotificationContext.tsx`、`NotificationBadge.tsx`、`NotificationBell.tsx`、`NotificationPanel.tsx`、`NotificationCenterPage.tsx` |
| `frontend/src/shell/AppShell.tsx`、`route.ts` | 铃铛、账号菜单入口、侧栏四处分摊徽标；`#/notifications` 路由 |
| `frontend/src/chat/ChatPage.tsx`、`ChatList.tsx` | 打开会话即标读；追加推送消息；分会话未读数 |
| `frontend/src/credit/CreditRecordsPage.tsx`、`frontend/src/reports/ReportDetailPage.tsx`（新增） | 承接信用与举报跳转 |
| `frontend/src/i18n/notificationMessages.ts`、`frontend/src/styles.css` | 文案与徽标 / 面板 / 通知中心样式 |
| 测试 | 后端 10 个通知相关测试文件（48 条）；前端 `notificationModel.test.ts`；E2E `notifications.spec.ts`（13 条）与 `notifications-walkthrough.spec.ts`（4 条） |
| `openspec/changes/add-realtime-notifications/specs/notifications/spec.md` | ADDED：8 Requirement / 36 Scenario（`S30-1` ~ `S30-36`） |
| Living Spec | 归档时生成 `openspec/specs/notifications/spec.md` |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 能力归属（D1） | 新增 `notifications`；**不** MODIFY `trip-companions` | `trip-companions` 仍有未归档 Delta（`refine-trip-chat` / `refine-trip-application` / `refine-safety-report`），追加 Requirement 会在归档时冲突；新能力持有通知语义，生产方只调用 |
| 传输（D2） | SSE（`SseEmitter`）+ REST 补偿；不用 WebSocket、不加依赖 | Spring MVC 自带 `SseEmitter`；浏览器 `EventSource` 自带重连；无需握手 / 分帧代码，也无需新增 starter |
| 重连（D3） | 每次流 `open` 都重新拉 REST 列表；REST 是真相，流只是延迟优化 | 掉线绝不能丢事件或留下过期计数；推送层因此无状态、可重启 |
| 持久化（D4） | 每事件一行；未读 = `read_at IS NULL`；`status` 由它派生 | 计数与历史同源；刷新后数字不变；没有会漂移的独立计数器 |
| 拒绝（D5） | 拒绝与接受一样通知 | 发起人只点名「被接受」；裁决就是裁决，静默拒绝是更差的失败模式 |
| 失败隔离（D6） | 通知写入在生产方事务内尝试；失败只记日志，不让业务动作失败 | 通知是业务的附属动作，不是前置条件 |
| 收件人（D7） | 事件相关方各收自己的一份；永不通知动作人自己 | 避免「我为自己的操作收到通知」的噪声；各类事件的具体收件人由 Delta 场景固定 |
| 指示器（D8） | 铃铛 / 账号菜单 = 未读总数；侧栏四入口按类型分摊且和为总数；聊天入口与会话列表 = `CHAT` 未读数 | 一个「任何页面都在」的全局入口，加上最可能触发行动的子集；两组数字同源 |
| 已读范围（D9） | 单条、全部、单会话（`trip_id` + 对方 id） | 打开会话是消息最自然的已读动作；其它类型没有会话，必须保留「全部已读」 |
| 聊天兜底（D10） | 保留 3 秒轮询；新增推送追加与打开即读 | 消除「不实时」的抱怨，又不删掉可用的安全网、不重写聊天加载 |
| 流的身份（D11） | `user_id` 查询参数 | `EventSource` 不能带 `X-User-Id`；与既有用户端点同等信任级别。真实鉴权不在范围内，记为风险 |
| 契约与迁移编号（D12） | `openapi.yaml` 0.26.0；迁移 `V31__add_notifications.sql` | 合并 `main` 后当前最大值为 0.24.0 与 `V29`；P3 排他确认 |
| 保留（D13） | 列表返回最新 50 条，行不删除 | 满足故事不需要清理任务，也不引入只与迁移相关的复杂度 |
| 提示噪声（D14） | 聊天类只在对应会话未打开时提示；其它类型恒提示 | 避免对已经出现在当前会话里的消息重复提示 |
| 跳转（D15） | 后端下发 `target.kind`，前端只组装路由 | 目标规则集中在一处；新增类型不必改前端的判断分支 |
| 可用性（D16） | 后端计算 `related_available`；前端不可用时只提示不跳转，并仍标读 | 避免死链与错误页；「打不开」不等于「没发生」 |
| 优先级（D17） | `NORMAL` / `HIGH`；信用分低于 60 与恢复通知为 `HIGH` | 让需要立即关注的条目在列表中可辨 |
| 去重（D18） | 唯一索引 + 先查后插 + 唯一冲突兜底 | 重复触发、重试与并发都不会产生第二行 |
| 侧栏徽标（D19） | 侧栏不设通知中心入口；八类未读按功能分摊到「我的旅行（`TRIP`+`APPLICATION`）/ 同行消息（`CHAT`）/ 联系客服（`SERVICE`）/ 账号（其余四类）」，四项之和恒等于总数 | 发起人要求左栏数字之和等于铃铛；每个类型只落一个入口，既覆盖全部通知又不重复计数 |

## 验收信号

1. B 申请 A 的行程；A 停在 `#/`，约 2 秒内铃铛从 0 变 1（不刷新），面板显示「B 申请了 <行程>」。
2. A 接受 B 的申请；B 约 2 秒内看到总数 +1，并有一条「申请已通过」；容量满时同行者收到「行程已满员」。
3. A 拒绝 B 的申请；B 看到对应的拒绝条目，且计入未读总数。
4. A 发消息时 B 在地图页；B 的聊天入口徽标 +1 并出现提示条；一次点击打开会话，该会话计数归零。
5. 2 条未读申请 + 3 条未读消息时，响应报告 total 5 / 八类中 `APPLICATION`=2 / `CHAT`=3，其余为 0；铃铛显示 5、「我的旅行」显示 2、「同行消息」显示 3，侧栏四项之和为 5。
6. 读一条只让总数与所属类型各减 1；「全部已读」归 0；重复读已读条目数字不变。
7. 打开一个会话只清该会话的消息；另一会话的计数与所有其它类型条目保持不变。
8. 刷新页面得到同样的持久化计数；重启后端后客户端重连并对账，无重复条目。
9. 重复申请 / 非 pending / 行程已关闭的请求不产生通知；自消息也不产生；同一业务事件重复触发不产生第二行。
10. 打开一条目标已失效的通知：正文仍在、提示「相关内容当前不可查看」、页面不跳转、该条变为已读。
11. 账号被暂停：本人收到说明受限内容与恢复时间的通知，且不含管理员备注。
12. 契约 0.26.0 校验通过；后端 671、前端 533、通知 E2E 13、走查 E2E 4 全绿。

## 残余风险

| 风险 | 处理 |
|---|---|
| SSE 被代理缓冲（开发用 Vite 代理，生产可能 nginx） | 控制器返回 `X-Accel-Buffering: no` 与 `Cache-Control: no-cache`；约 20 秒心跳；E2E 断言延迟，P4 经 dev proxy 实测 |
| 后端重启丢失内存中的 emitter | 单进程 demo 可接受；重连时 REST 对账恢复真相（D3） |
| demo 环境大量空闲连接 | 每个打开标签 1 个 emitter；心跳清理死连接；不占线程（servlet async） |
| 业务回滚却留下通知 | 通知只在状态变更成功后、同一事务内写入；D6 只覆盖通知自身失败 |
| 为「接收方已无权访问的行程」写通知 | 消息只能在既有准入规则下发出；条目仍指向会话，打开时由既有权限提示承接 |
| 查询参数身份可伪造 | 与今天的 `X-User-Id` 同等级暴露；明确不在范围内，留给真实鉴权 change |
| 契约 / 迁移号与并行 change 冲突（合并 `main` 后为 0.24.0 / `V29`） | P3 排他确认并取 0.26.0 / `V30`，在 `design.md` 复述 |
| 多处计数漂移 | 全部从同一前端 store、同一响应 / 事件载荷派生；侧栏四项按类型分区、和恒等于 `total`；reducer 有纯函数单测 |
| 拒绝通知不在发起人原话内 | 记为 D5 并给出理由；Delta 将其写成显式场景 |
| 面板打开时新事件的可见性 | 面板从同一 store 重渲染；P3 定义焦点行为，推送不得抢焦点 |
| 八类通知变成噪声 | 去重键 + 自事件抑制 + 只对事件相关方发送；D14 抑制当前会话的消息提示 |
| 管理员自由文本进入通知 | 文案只使用结构化事实（状态、原因码标签、恢复时间）；不拼接管理员备注 |
| ONGOING 没有显式写入动作 | 读取行程详情时惰性物化，去重键保证只生成一次（D13 / §5.2） |

## 交付边界

本提案是 P1 工件，回答「为什么改、改哪个能力、什么在内什么在外、验收怎么观察」。Delta Spec、`design.md`、`atdd-design.md`、`tasks.md`、迁移、契约、代码与验证属 P2–P4；Living Spec 合并属 P5。

> **变更历史：** 2026-11-17 首版为四类事件 / 六 Requirement 的通知提示（REQ-023）；2026-11-18 发起人要求扩展为覆盖八类业务事件的完整通知中心，本提案随之改写为 REQ-029 / 8 Requirement / 36 Scenario，并按发起人指示在**同一 PR #40** 内交付，不另开 change。同日合流 `origin/main` 时 `add-travel-finance`（PR #42）已占用 REQ-028 / S29 / 契约 0.25.0 / `V30`，本 change 按「后到者顺延」改为 **REQ-029 / S30 / 0.26.0 / `V31__add_notifications.sql`**，工件与阶段记录同步改号。2026-11-18 发起人要求「左栏不要通知中心入口，且左栏各功能数字之和等于铃铛」：侧栏入口移除，改为按功能分摊的四项徽标（D19 / S30-26 / M4）。