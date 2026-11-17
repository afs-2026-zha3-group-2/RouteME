# 变更提案：add-realtime-notifications

- **需求来源：** REQ-023 — 发起人 2026-11-17 的观察「`#/chat` 里申请到达 / 申请被接受 / 收到新消息都没有实时提示，也没有显示收到几条通知的红点」（P0 / 迭代 3 / 5 点 / 落点：全局壳层、聊天页、行程详情、我的旅行）｜ **需求条目：** `requirement-workspace/requirements/REQ-023-realtime-notifications.md`
- **能力：** `notifications`（ADDED）。事件产生方仍留在 `trip-companions` / 聊天内，但其 Requirement 正文不改（见 D1）。
- **规模：** M–L（1 张表 + 1 个服务 + 1 个流注册表 + 1 个控制器 + 2 处生产方钩子 + 1 个前端提供者 + 1 个面板 + 3 处徽标；无新页面、无新路由）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:no-circular-dependency`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:sdd-artifacts`

## Why

RouteMe 已经交付了行程中最要紧的三个时刻——有人申请、发布者裁决、双方沟通——但它们全部是**静默**的。`docs/sdd/add-realtime-notifications/p0-baseline.md` 记录的缺口是：

- 申请写入 `pending` 行后没有任何人被告知；发布者只有打开 `#/trips/{id}/applications`，或碰巧 `#/mine` 重新加载时才发现。
- 接受 / 拒绝改的是申请者那一行的状态；申请者只有重新打开 `#/mine` 才看得到。
- 消息只是行记录；只有**当前已打开**的会话每 3 秒刷新一次，会话列表完全没有未读状态。
- 壳层里没有任何东西提示「有别的事需要你处理」，用户停在任何其它页面都不会被提醒。

结果正是发起人描述的现象：用户必须反复刷新页面才能发现状态变化，产品里也没有任何「你有 N 件事要看」的计数。

## What Changes

- **`notifications`（ADDED，6 Requirement / 26 Scenario）：**
  1. 申请类通知（发布者收申请；申请者收接受 / 拒绝；失败请求不产生通知）。
  2. 消息通知（每条消息一条，接收方持有会话与消息上下文，自消息不通知）。
  3. 未读计数与列表（最新 50 条；总数 / 申请类 / 消息类拆分；刷新与重连后不变）。
  4. 标读范围（单条、单个会话、全部；幂等且按用户隔离）。
  5. 实时投递（按用户的 SSE；只推给收件人；心跳；重连时 REST 对账；流失败不影响其它功能）。
  6. 壳层指示器（顶栏铃铛数字 + 面板；侧栏 / 移动 tab 消息数；会话列表分会话未读数；当前会话即时追加）。
- **后端：** 新增 `NotificationService`（写入 / 列表 / 计数 / 标读）、`NotificationBroker`（按用户 `SseEmitter` 注册表 + 心跳）、`NotificationController`；`ApplicationServiceImpl` 与 `ChatServiceImpl` 在既有成功路径末尾各追加一次通知调用，失败只记日志。
- **前端：** 新增 `notifications/`（纯模型 + 提供者 + `EventSource` 生命周期 + 铃铛 + 面板）；`AppShell` 接入铃铛与聊天入口徽标；`ChatPage` / `ChatList` 打开即读、推送追加、分会话未读；样式沿用既有 token，明暗两套。
- **契约：** `openapi.yaml` 0.17.0 → **0.18.0**，新增 4 条路径与对应 schema。
- **数据：** 新增 `notifications` 表（迁移 `V24`），索引 `(recipient_id, read_at)`。

## 范围

**In scope**

- `notifications`（ADDED）：四类事件（`application_received`、`application_accepted`、`application_rejected`、`message`），每事件一条持久化记录，带收件人、动作人、行程、申请 / 消息、创建时间与已读时间。
- 生产方：`ApplicationServiceImpl.apply` 通知发布者；`decide` 在接受**和**拒绝时通知申请者；`ChatServiceImpl.send` 通知接收方。通知与事件同事务写入，但通知失败绝不使事件失败（D6）。
- 读取 API：最新 50 条 + 未读计数（总数 / 申请类 / 消息类）；单条已读、按会话已读、全部已读。
- 实时投递：每用户一条 SSE 流，带心跳、客户端自动重连，以及每次（重）连后的 REST 对账，保证事件不丢（D2、D3）。
- 壳层指示器：顶栏铃铛显示未读总数并可展开面板；侧栏与移动 tab 的聊天入口显示消息未读数；会话列表显示分会话未读数；对当前不可见的事件给短提示（D8、D14）。
- 当前会话内的即时行为：推送到达即追加，不刷新，且该会话未读数保持 0（D10）。
- 契约：4 条新路径与对应 schema；`openapi.yaml` 次版本递增。
- 数据：1 次迁移新增 1 张表。
- 记录：`stories.md` S23、`registry.md`、`handoff.md`、`deep-dive.md`、`impact-brief.md` §23。

**Out of scope**

- 邮件、短信、OS 推送、Service Worker，以及浏览器关闭时的通知。
- 通知中心历史页、筛选、分组、搜索、按类型偏好、保留 / 清理任务。
- WebSocket 与任何消息队列；`routeme/mq/` 保持为空。
- 改动申请状态机、聊天准入、行程状态、容量或裁决权限。
- 其它域（行程、信用、体验、天气、后台）的实时更新。
- 替换既有 3 秒聊天轮询；它保留为兜底（D10）。
- 流鉴权；沿用 demo 的 `X-User-Id` 信任模型，并把该局限记入残余风险。
- 通知音效、桌面通知、浏览器标签页标题上的计数。

## 影响面

| 位置 | 变更 |
|---|---|
| `backend/src/main/resources/db/migration/V*__add_notifications.sql`（新增） | 建 `notifications` 表：收件人、类型、动作人、行程、申请、消息、`created_at`、`read_at`；索引 `(recipient_id, read_at)` |
| 后端 `enums/`、`entity/`、`mapper/`、`pojo/`（新增） | `NotificationTypeEnum`、`NotificationEntity`、`NotificationMapper`、`Notification` |
| 后端 `service/NotificationService.java` + `service/impl/NotificationServiceImpl.java`（新增） | 写入、列表、计数、已读范围 |
| 后端 `service/NotificationBroker.java`（新增） | 按用户的内存 `SseEmitter` 注册表、心跳、发布 |
| 后端 `controller/NotificationController.java`（新增） | 列表、流、单条已读、范围已读 |
| 后端 `response/`、`request/`（新增） | `NotificationResponse`、`NotificationListResponse`、`NotificationCounts`、`NotificationReadRequest` |
| `service/impl/ApplicationServiceImpl.java` | 申请时通知发布者；接受 / 拒绝时通知申请者 |
| `service/impl/ChatServiceImpl.java` | 发送时通知接收方（自消息不通知） |
| `RouteME/openapi.yaml` | 次版本递增；新增路径与 schema |
| `frontend/src/types.ts`、`api.ts` | `AppNotification`、`NotificationList`、`NotificationCounts`；列表 / 已读 / 流地址辅助函数 |
| `frontend/src/notifications/`（新增） | 纯模型（`notificationModel.ts`）、提供者 + `EventSource` 生命周期、铃铛 + 面板 |
| `frontend/src/shell/AppShell.tsx` | 挂载提供者；顶栏铃铛；侧栏 / tab 聊天入口的数字徽标 |
| `frontend/src/chat/ChatPage.tsx`、`ChatList.tsx` | 打开会话即标读；追加推送消息；分会话未读数 |
| `frontend/src/styles.css` | 徽标、铃铛、面板、提示条样式，沿用既有 token，明暗两套 |
| 测试 | 后端：服务 + 生产方 + 契约 + 流单测。前端：纯模型单测。E2E：`notifications.spec.ts` |
| `openspec/changes/add-realtime-notifications/specs/notifications/spec.md` | ADDED：6 Requirement / 26 Scenario（`S23-1` ~ `S23-26`） |
| Living Spec | 归档时生成 `openspec/specs/notifications/spec.md` |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 能力归属（D1） | 新增 `notifications`；**不** MODIFY `trip-companions` | `trip-companions` 仍有未归档 Delta（`refine-trip-chat` / `refine-trip-application` / `refine-safety-report`），追加 Requirement 会在归档时冲突；新能力持有通知语义，生产方只调用 |
| 传输（D2） | SSE（`SseEmitter`）+ REST 补偿；不用 WebSocket、不加依赖 | Spring MVC 自带 `SseEmitter`；浏览器 `EventSource` 自带重连；无需握手 / 分帧代码，也无需新增 starter |
| 重连（D3） | 每次流 `open` 都重新拉 REST 列表；REST 是真相，流只是延迟优化 | 掉线绝不能丢事件或留下过期计数；推送层因此无状态、可重启 |
| 持久化（D4） | 每事件一行；未读 = `read_at IS NULL` | 计数与历史同源；刷新后数字不变；没有会漂移的独立计数器 |
| 拒绝（D5） | 拒绝与接受一样通知 | 发起人只点名「被接受」；裁决就是裁决，静默拒绝是更差的失败模式 |
| 失败隔离（D6） | 通知写入在生产方事务内尝试；失败只记日志，不让申请 / 裁决 / 发消息失败 | 通知是业务的附属动作，不是前置条件 |
| 收件人（D7） | 发布者收申请；申请者收裁决；接收方收消息；永不通知自己 | 前三类在既有规则下本就不可能自致；只有自消息需要显式守卫 |
| 指示器（D8） | 顶栏铃铛 = 未读总数（数字 + 面板）；侧栏 / tab 聊天入口 = 消息未读数；会话列表 = 分会话未读数 | 一个「任何页面都在」的全局入口，加上最可能触发行动的子集 |
| 已读范围（D9） | 单条、全部、单会话（`trip_id` + 对方 id） | 打开会话是消息最自然的已读动作；申请类没有会话，必须保留「全部已读」 |
| 聊天兜底（D10） | 保留 3 秒轮询；新增推送追加与打开即读 | 消除「不实时」的抱怨，又不删掉可用的安全网、不重写聊天加载 |
| 流的身份（D11） | `user_id` 查询参数 | `EventSource` 不能带 `X-User-Id`；与既有用户端点同等信任级别。真实鉴权不在范围内，记为风险 |
| 契约与迁移编号（D12） | `openapi.yaml` 0.18.0；迁移 `V24` | 当前最大值为 0.17.0 与 `V23`；编号仅在 P3 排他确认 |
| 保留（D13） | 列表返回最新 50 条，行不删除 | 满足故事不需要清理任务，也不引入只与迁移相关的复杂度 |
| 提示噪声（D14） | 申请类总是提示；消息只在对应会话未打开时提示 | 避免对已经出现在当前会话里的消息重复提示 |

## 验收信号

1. B 申请 A 的行程；A 停在 `#/`，约 2 秒内铃铛从 0 变 1（不刷新），面板显示「B 申请了 <行程>」。
2. A 接受 B 的申请；B 约 2 秒内看到总数 +1，并有一条「申请已被接受」。
3. A 拒绝 B 的申请；B 看到对应的拒绝条目，且计入未读总数。
4. A 发消息时 B 在地图页；B 的聊天入口徽标 +1 并出现提示条；一次点击打开会话，该会话计数归零。
5. 2 条未读申请 + 3 条未读消息时，响应报告 total 5 / application 2 / message 3；铃铛显示 5、聊天入口显示 3。
6. 读一条只让总数减 1；「全部已读」归 0；重复读已读条目数字不变。
7. 打开一个会话只清该会话的消息；另一会话的计数与所有申请类条目保持不变。
8. 刷新页面得到同样的持久化计数；重启后端后客户端重连并对账，无重复条目。
9. 重复申请 / 非 pending / 行程已关闭的请求不产生通知；自消息也不产生。
10. 契约 0.18.0 校验通过；既有后端与前端测试保持全绿；新增 E2E 覆盖信号 1–7。

## 残余风险

| 风险 | 处理 |
|---|---|
| SSE 被代理缓冲（开发用 Vite 代理，生产可能 nginx） | 控制器返回 `X-Accel-Buffering: no` 与 `Cache-Control: no-cache`；约 20 秒心跳；E2E 断言延迟，P4 经 dev proxy 实测 |
| 后端重启丢失内存中的 emitter | 单进程 demo 可接受；重连时 REST 对账恢复真相（D3） |
| demo 环境大量空闲连接 | 每个打开标签 1 个 emitter；心跳清理死连接；不占线程（servlet async） |
| 业务回滚却留下通知 | 通知只在状态变更成功后、同一事务内写入；D6 只覆盖通知自身失败，具体顺序由 P3 定义 |
| 为「接收方已无权访问的行程」写通知 | 消息只能在既有准入规则下发出；条目仍指向会话，打开时由既有权限提示承接 |
| 查询参数身份可伪造 | 与今天的 `X-User-Id` 同等级暴露；明确不在范围内，留给真实鉴权 change |
| 契约 / 迁移号与并行 change 冲突（当前为 0.17.0 / `V23`） | P3 排他确认，并在 `design.md` 复述 |
| 铃铛 / 侧栏 / tab / 会话行四处计数漂移 | 全部从同一前端 store、同一响应 / 事件载荷派生；reducer 有纯函数单测 |
| 拒绝通知不在发起人原话内 | 记为 D5 并给出理由；Delta 将其写成显式场景 |
| 面板打开时新事件的可见性 | 面板从同一 store 重渲染；P3 定义焦点行为，推送不得抢焦点 |

## 交付边界

本提案是 P1 工件，回答「为什么改、改哪个能力、什么在内什么在外、验收怎么观察」。Delta Spec、`design.md`、`atdd-design.md`、`tasks.md`、迁移、契约、代码与验证属 P2–P4；Living Spec 合并属 P5。