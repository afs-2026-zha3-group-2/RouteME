# REQ-023 — 实时通知与未读计数（Ready 需求草稿）

- **能力：** `notifications`（ADDED）
- **对应 OpenSpec change：** `add-realtime-notifications`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** 发起人 2026-11-17 的观察（优先级 P0 / 迭代 3 / 5 点 / 落点页面：全局壳层、聊天页、行程详情、我的旅行）
- **证据：** `requirement-workspace/intents/REQ-023-realtime-notifications.md`；`docs/sdd/add-realtime-notifications/p0-baseline.md`（G-01 ~ G-06）；`RouteME/frontend/src/chat/ChatPage.tsx`、`chat/chatPolling.ts`、`chat/ChatList.tsx`、`shell/AppShell.tsx`；`RouteME/backend/.../service/impl/ApplicationServiceImpl.java`、`ChatServiceImpl.java`；`RouteME/openapi.yaml` 0.17.0；迁移 `V1`–`V23`

## Discovery Decision

**Go（light intake，2026-11-17）。** 候选能力可一句话表述——「申请、裁决或消息发生时，相关方在几秒内、在任何页面都能看到一条持久化通知与一个未读数字」。发起人明确点名了三类事件；该能力与既有 spec 无重叠；无阻塞问题。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-023 |
| statement | 当用户提交申请、发布者接受或拒绝申请、或有人发送聊天消息时，系统 MUST 为收件人创建一条持久化通知，并在数秒内推送到该用户已打开的会话。收件人 MUST 在壳层看到未读数字（顶栏铃铛与聊天入口），并在会话列表看到分会话未读数；计数 MUST 在刷新后保持不变，且每条通知被读取时 MUST 恰好减一。读取 MUST 支持单条、单个会话、全部三种范围。每条通知 MUST 携带足够上下文，一次点击即可打开目标（行程或会话）。通知的创建 MUST NOT 阻塞或回滚导致它的申请 / 聊天操作。 |
| actors | 行程发布者（收申请）；申请者（收裁决）；会话双方（收消息）；系统（持久化、推送、计数、标读）。 |
| rationale | 这三类事件是产品请用户行动的时刻，但应用在页面加载之间是沉默的：发布者错过申请者，申请者错过接受，消息只有在会话已打开时才被看到。 |
| acceptance hints | §4 场景 S23-1 ~ S23-26（创建、收件人、不通知自己、计数、推送延迟、重连对账、已读范围、徽标渲染、移动 tab、失败隔离）。 |
| links to evidence | 上述路径 + P0 缺口 G-01 ~ G-06。 |

## 1. 意图

一句话：当有需要用户回应的事情发生时，铃铛与聊天入口上出现数字，弹出一条说明发生了什么，一次点击直达行程或会话。

## 2. 角色

| 角色 | 边界 |
|---|---|
| 行程发布者 | 为自己的行程收 `application_received`；可接受或拒绝。 |
| 申请者 | 为自己的申请收 `application_accepted` / `application_rejected`。 |
| 聊天参与者 | 在可访问的会话中收发给自己的 `message`。 |
| 系统 | 在生产方事务内写一条通知，经实时流推送，计算未读计数，标读，且绝不为用户自己造成的事件创建通知。 |

## 3. In / Out scope

**In scope**

- 四类事件的通知记录：`application_received`、`application_accepted`、`application_rejected`、`message`。
- 持久化：每事件一行，含收件人、动作人、行程、关联申请 / 消息、创建时间、已读时间。
- 读取 API：列表（最新 50 条）+ 未读计数（总数、申请类、消息类）。
- 标读：单条、全部、某会话的全部消息类。
- 实时推送：按用户的 SSE，重连后 REST 对账。
- 壳层指示：顶栏铃铛带数字总数；侧栏 / 移动 tab 聊天入口带消息数；会话列表带分会话未读数。
- 对当前不可见事件的临时提示，可一键跳转。
- 当前打开会话的即时追加与标读。
- 契约：新增路径与 schema，`openapi.yaml` 次版本递增。
- 迁移：1 张新表。

**Out of scope**

- 邮件、短信、OS 推送、Service Worker、浏览器关闭时的通知。
- 通知历史页、筛选、分组、搜索、按类型偏好、保留策略。
- WebSocket 与任何消息队列（`routeme/mq/` 保持为空）。
- 改动申请规则、聊天准入规则或行程状态规则。
- 四类事件之外的实时更新（例如行程、信用、体验）。
- 流的真实鉴权；沿用既有 demo 身份模型。
- 移除既有 3 秒聊天轮询。

## 4. 场景与 AC 提示（SHALL 风格，可观察）

### A. 通知创建

1. **S23-1 申请到达** — Given 用户 B 申请 A 发布的行程，When 申请创建成功，Then A 恰好有 1 条 `application_received`，动作人为 B、关联该行程。
2. **S23-2 申请被接受** — Given A 接受 B 的 pending 申请，When 裁决成功，Then B 恰好有 1 条 `application_accepted`，动作人为 A、关联该行程。
3. **S23-3 申请被拒绝** — Given A 拒绝 B 的 pending 申请，When 裁决成功，Then B 恰好有 1 条 `application_rejected`，动作人为 A、关联该行程。
4. **S23-4 失败不产生通知** — Given 既有状态机拒绝该请求（重复申请、非 pending、行程未开放），When 请求失败，Then 不创建任何通知。
5. **S23-5 不通知自己** — Given 用户给自己发消息，Then 不创建 `message` 通知；其余三类在既有规则下不可能自致。
6. **S23-6 每条消息一行** — Given 一条消息被发送，When 落库成功，Then 接收方恰好有 1 条 `message`，关联该会话与该消息。

### B. 未读计数与列表

7. **S23-7 计数持久** — Given 有 N 条未读，When 用户刷新页面或重连，Then 总数仍为 N。
8. **S23-8 计数可拆分** — Given 2 条未读申请 + 3 条未读消息，Then 响应报告 total 5、application 2、message 3。
9. **S23-9 最新在前** — Given 多条通知，When 请求列表，Then 按创建时间倒序且只返回最新 50 条。
10. **S23-10 上下文完整** — Given 任一条目，Then 必须带动作人摘要、行程 id 与标题、可读文案、创建时间、是否已读。

### C. 实时推送

11. **S23-11 只推给收件人** — Given A 与 B 都打开着会话，When 事件与 A 有关，Then 只有 A 的流收到。
12. **S23-12 推送延迟** — Given 收件人已连接，When 事件创建，Then 客户端 3 秒内反映，无需刷新。
13. **S23-13 重连对账** — Given 断线期间发生过事件，When 客户端重连，Then 重新读取 REST 列表，计数收敛到持久化状态且无重复。
14. **S23-14 心跳** — Given 连接空闲，Then 服务端以周期心跳保持，客户端离开时丢弃连接。
15. **S23-15 流失败可控** — Given 流无法建立，Then 其余功能照常可用，最后一次已知计数保留显示。

### D. 标读

16. **S23-16 读一条** — Given 一条未读，When 用户打开它，Then 该条变已读且总数恰好减 1。
17. **S23-17 全部已读** — Given 多条未读，When 用户选择「全部已读」，Then 总数为 0 且每条都已读。
18. **S23-18 读一个会话** — Given 同一会话的多条未读消息，When 用户打开该会话，Then 只有该会话的消息类变已读；其它会话与申请类保持未读。
19. **S23-19 幂等** — Given 已读条目，When 再次标读，Then 计数不变。
20. **S23-20 按用户隔离** — Given A 标读，Then B 的计数不变。

### E. 界面

21. **S23-21 数字徽标** — Given 有未读，Then 铃铛上显示数字（不能只有颜色），聊天入口显示消息数；为 0 时不显示徽标。
22. **S23-22 面板内容** — Given 用户打开铃铛，Then 面板列出最新通知（动作人、文案、时间、未读标记），并提供「全部已读」。
23. **S23-23 一键直达** — Given 一条通知，When 用户激活，Then 打开行程页（申请类）或该会话（消息类），并把自己标为已读。
24. **S23-24 打开会话即时可见** — Given 用户正在查看某会话且该会话来了消息，Then 消息无需手动刷新即可出现，且该会话未读保持 0。
25. **S23-25 窄屏** — Given 视口 ≤900 px，Then 聊天 tab 显示同样的消息数，铃铛仍可触达。
26. **S23-26 失败隔离** — Given 通知持久化或推送失败，Then 申请 / 裁决 / 发消息请求仍然成功，且失败被记录。

## 5. 约束（只陈述事实，不给技术方案）

- 壳层今天没有任何通知界面；顶栏只有品牌与主题切换。
- 聊天页只在行程未结束时对**当前打开会话**每 3 秒轮询。
- `ApplicationService` 与 `ChatService` 是事务性的，并且已经判断了谁可写；它们是唯一知道裁决 / 消息结果的地方。
- 面向用户的端点用 `X-User-Id` 识别调用者；`EventSource` 不能发送自定义头。
- `openapi.yaml` 为 0.17.0 且由 `OpenApiTest` 断言；迁移止于 `V23`。
- 测试套件用内存 H2 从空库迁移，因此新迁移必须两库通用。
- 前端单测没有 DOM；UI 行为由 Playwright E2E 覆盖。
- 这是 demo：单进程、内存态推送可接受。

## 6. Open Questions（全部已定）

| id | 问题 | 结论 |
|---|---|---|
| OQ-1 | 推送方式？ | SSE（`SseEmitter`）+ REST 对账（D2 / D3） |
| OQ-2 | 计数从哪来？ | 持久化行的 `read_at`；计数由未读行派生（D4） |
| OQ-3 | 拒绝也通知？ | 是（D5） |
| OQ-4 | 顶栏徽标是否含消息？ | 是，总数 = 申请类 + 消息类（D8） |
| OQ-5 | 打开会话是否清未读消息？ | 是，按行程 + 对方 id 限定（D9） |

## 7. DoR

| 检查 | 结论 |
|---|---|
| 故事与验收标准可追溯 | Pass（26 条场景 S23-1 ~ S23-26） |
| 能力归属与边界清楚 | Pass（`notifications` ADDED；生产方各自规则不变） |
| 无阻塞开放问题 | Pass（OQ 0） |
| 依赖与风险已记录 | Pass（dev proxy 下的 SSE、H2 可移植性、demo 身份、契约 / 迁移编号） |
| 验收可观察 | Pass（行数、计数、延迟、重连、已读范围、徽标、隔离） |

**DoR BLOCKER：0。**