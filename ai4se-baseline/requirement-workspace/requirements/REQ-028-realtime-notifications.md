# REQ-028 — 实时通知中心与未读计数（Ready 需求草稿）

- **能力：** `notifications`（ADDED）
- **对应 OpenSpec change：** `add-realtime-notifications`
- **草稿日期：** 2026-11-17 ｜ **扩围日期：** 2026-11-18 ｜ **状态：** P4 verified（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** 发起人 2026-11-17 对 `#/chat` 的观察；2026-11-18 要求扩展为八类业务事件的完整通知中心
- **证据：** `requirement-workspace/intents/REQ-028-realtime-notifications.md`；`docs/sdd/add-realtime-notifications/p0-baseline.md`（G-01 ~ G-08）；`RouteME/openapi.yaml` 0.25.0；迁移 `V30__add_notifications.sql`；`RouteME/backend/src/main/java/routeme/service/impl/NotificationServiceImpl.java`、`NotificationLifecycleService.java`、`NotificationEventListener.java`；`RouteME/frontend/src/notifications/*`

## Discovery Decision

**Go（light intake，2026-11-17；扩围复核 2026-11-18）。** 候选能力可一句话表述——「任何需要用户知道或行动的业务事件发生时，相关方在几秒内、在任何页面都能看到一条持久化通知与一个数字未读计数，并可从通知中心一键到位」。八类事件均有既有业务写入口，通知只做旁路记录，不改变业务规则；无阻塞问题。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-028 |
| statement | 当八类业务事件（行程、申请、聊天、信用、举报、账号、客服、系统）之一成功发生时，系统 MUST 为目标收件人创建一条持久化通知，并按 `(recipient, dedupe_key)` 保证同一业务事件只留一条。通知 MUST 记录类型、事件、标题、正文、优先级、创建时间、已读时间与关联对象。系统 MUST 提供八类拆分且零值不省略的未读计数（总数 + `by_type`），并 MUST 在壳层的通知入口与聊天入口显示数字徽标。用户打开一条通知 MUST 把它变为已读；READ 永不重新计入未读；「全部已读」MUST 清除该用户的所有 UNREAD。通知 MUST 提供一键跳转；关联对象不可访问时 MUST 保留正文并提示「相关内容当前不可查看」，且 MUST NOT 跳转。通知的创建、标读与保留 MUST NOT 改变任何业务状态，业务状态变化也 MUST NOT 删除既有通知。 |
| actors | 行程发布者与同行者；申请者；聊天双方；信用发生变动的用户；举报人；被暂停 / 封禁 / 恢复的账号本人；客服会话用户；全体用户（系统通知）；系统（持久化、推送、计数、标读）。 |
| rationale | 产品请用户行动或让用户安心的时刻分散在八个业务域，应用在页面加载之间是沉默的；统一通知中心让用户不必记住每个业务入口。 |
| acceptance hints | §4 场景 S29-1 ~ S29-36（八类记录、去重、保留、计数、标读、跳转、不可用、实时、失败隔离）。 |
| links to evidence | 上述路径 + P0 缺口 G-01 ~ G-08 + `docs/sdd/add-realtime-notifications/p4-implementation.md`。 |

## 1. 意图

一句话：有事发生时，铃铛与通知中心入口出现数字，弹出一条说明发生了什么；打开通知中心可看到八类通知、按类型筛选、一键全部已读，一次点击直达仍存在的目标。

## 2. 角色

| 角色 | 边界 |
|---|---|
| 行程发布者 | 收 `APPLICATION/application_received`、`TRIP/trip_full`、`TRIP/trip_ongoing`、`SYSTEM/safety_reminder`。 |
| 同行者 | 收 `APPLICATION/application_accepted`、`TRIP/trip_full`、`TRIP/trip_ongoing`、`TRIP/trip_cancelled`、`TRIP/trip_completed`、`SYSTEM/safety_reminder`、`CHAT/message`。 |
| 申请者 | 收 `APPLICATION/application_accepted`、`application_rejected`、`application_closed`。 |
| 信用变动用户 | 收 `CREDIT/credit_changed` 或 `CREDIT/credit_recovered`。 |
| 举报人 | 收 `REPORT/report_submitted`、`report_processing`、`report_resolved`。 |
| 受限账号本人 | 收 `ACCOUNT/account_suspended`、`account_banned`、`account_restored`。 |
| 客服用户 | 收 `SERVICE/service_joined`、`service_reply`、`service_closed`。 |
| 系统 | 在生产方事务内写一条通知，经实时流推送，计算未读计数，标读；绝不为用户自己造成的事件创建通知。 |

## 3. In / Out scope

**In scope**

- 八类通知：`TRIP` / `APPLICATION` / `CHAT` / `CREDIT` / `REPORT` / `ACCOUNT` / `SERVICE` / `SYSTEM`，共 22 个事件。
- 持久化：每事件一行，含收件人、类型、事件、标题、正文、优先级、动作人、行程 / 申请 / 消息 / 举报 / 客服会话关联、创建时间、已读时间、去重键。
- 读取 API：最新 50 条 + 未读计数（总数 + 八类 `by_type`）。
- 标读：单条、全部、某会话的全部聊天类。
- 实时推送：按用户的 SSE，重连后 REST 对账。
- 通知中心页 `#/notifications`：八类筛选（带数字）、全部已读、类型标签、重要标记、不可用提示。
- 壳层指示：铃铛（总数）、侧栏「通知中心」入口与账号菜单入口（总数）、侧栏 / 移动 tab 聊天入口与会话列表（`CHAT`）。
- 按目标跳转：行程详情、申请处理页、聊天会话、信用记录、举报详情、本人主页、客服、身份资料页。
- 契约：新增路径与 schema，`openapi.yaml` 次版本递增到 **0.25.0**。
- 迁移：1 张新表（`V30__add_notifications.sql`）。

**Out of scope**

- 邮件、短信、OS 推送、Service Worker、浏览器关闭时的通知。
- 通知偏好、保留策略、搜索、分页加载更早历史。
- WebSocket 与任何消息队列（`routeme/mq/` 保持为空）。
- 改动申请、聊天、信用、举报、账号、客服或行程状态规则。
- 流的真实鉴权；沿用既有 demo 身份模型。
- 移除既有 3 秒聊天轮询。

## 4. 场景与 AC 提示（SHALL 风格，可观察）

### A. 记录、类型与生命周期

1. **S29-1 八类与两态** — Given 任一通知记录，Then `type` ∈ 八类大写枚举、`event` 为 snake_case 业务事件、`status` ∈ `UNREAD` / `READ` 且由 `read_at` 派生。
2. **S29-2 字段完整** — Given 任一条目，Then 必须带类型、事件、标题、正文、优先级、状态、创建时间、已读时间、动作人摘要（可空）、关联 id 与 `target` / `related_available`。
3. **S29-3 同一事件只一行** — Given 同一业务事件被重复触发（重试、重复提交、重复读取），When 写入通知，Then 同一收件人对同一 `dedupe_key` 只有一条记录，计数不重复增加。
4. **S29-4 只增不删** — Given 通知已存在，When 行程取消 / 结束、举报处理完成、账号恢复、用户标读，Then 既有通知仍保留，正文不变；标读不改变业务状态。

### B. 事件与收件人

5. **S29-5 行程满员** — Given 接受后行程人数达到容量，Then 除接受动作本人外的参与者各收到 1 条 `TRIP/trip_full`。
6. **S29-6 行程开始与安全提醒** — Given 行程进入 `ONGOING` 且用户读取详情，Then 发布者与已接受同行者各收到 1 条 `TRIP/trip_ongoing` 与 1 条 `SYSTEM/safety_reminder`，重复读取不重复生成。
7. **S29-7 行程取消** — Given 行程被取消，Then 已接受同行者收到 `TRIP/trip_cancelled`，正文含取消原因；待处理申请者收到 `APPLICATION/application_closed`。
8. **S29-8 行程结束** — Given 行程完成，Then 已接受同行者收到 `TRIP/trip_completed`；待处理申请被关闭且不产生完成通知。
9. **S29-9 申请到达** — Given B 申请 A 的开放行程，When 创建成功，Then A 恰好 1 条 `APPLICATION/application_received`，动作人为 B、关联行程与申请，目标为申请处理页。
10. **S29-10 申请通过** — Given A 接受 B 的 pending 申请，Then B 恰好 1 条 `APPLICATION/application_accepted`，动作人为 A，目标为行程详情。
11. **S29-11 申请被拒** — Given A 拒绝 B 的 pending 申请，Then B 恰好 1 条 `APPLICATION/application_rejected`，动作人为 A，目标为行程详情。
12. **S29-12 申请关闭** — Given 行程取消导致 pending 申请关闭，Then 该申请者恰好 1 条 `APPLICATION/application_closed`，正文含取消原因。
13. **S29-13 聊天消息** — Given A 向 B 发送消息并落库，Then B 恰好 1 条 `CHAT/message`，关联行程、发送方与消息；自己给自己发消息不产生通知。
14. **S29-14 信用变动** — Given 信用分发生变化，Then 用户收到 1 条 `CREDIT/credit_changed`，正文含变化量、原因与变动后分数；分数 < 60 时 `priority=HIGH`。
15. **S29-15 信用恢复** — Given 用户完成安全学习使分数恢复到阈值以上，Then 收到 1 条 `CREDIT/credit_recovered`，正文说明限制已解除，且标记为重要。
16. **S29-16 举报全流程** — Given 用户提交举报 / 管理员开始处理 / 管理员处理完成，Then 举报人依次收到 `REPORT/report_submitted`、`report_processing`、`report_resolved`，正文只含举报编号与处理结论。
17. **S29-17 账号状态** — Given 账号被暂停 / 封禁 / 恢复，Then 本人收到对应 `ACCOUNT` 通知；暂停与封禁 MUST 说明受限内容与恢复时间；MUST NOT 含管理员备注或其他用户数据。
18. **S29-18 客服会话** — Given 人工客服接入 / 回复 / 结束会话，Then 用户收到 `SERVICE/service_joined`、`service_reply`、`service_closed`，目标为客服页。
19. **S29-19 系统安全提醒** — Given 行程进入 `ONGOING`，Then 发布者与同行者收到 `SYSTEM/safety_reminder`，目标为行程详情。
20. **S29-20 身份认证** — Given 用户资料首次变为完整，Then 该用户收到 1 条 `SYSTEM/identity_verified`，目标为身份资料页；重复补全不重复生成。

### C. 通知中心与跳转

21. **S29-21 行程类跳转** — Given 一条 `TRIP` 通知，When 激活，Then 打开对应行程详情。
22. **S29-22 申请类跳转** — Given `application_received`，Then 打开申请处理页；Given 其它 `APPLICATION` 事件，Then 打开行程详情。
23. **S29-23 其它类型跳转** — Given `CHAT` / `CREDIT` / `REPORT` / `ACCOUNT` / `SERVICE` / `SYSTEM`，Then 分别打开会话、信用记录、举报详情、本人主页、客服页、身份资料页；`safety_reminder` 打开行程详情。
24. **S29-24 目标不可用** — Given 关联对象已不可访问，When 用户激活，Then 内容仍完整展示、条目标记「相关内容当前不可查看」、不跳转、不报错，且该条仍变为已读。

### D. 计数与标读

25. **S29-25 八类计数** — Given 用户有若干未读，Then 响应 `total` 等于各类型之和，`by_type` MUST 含八类键且零值不省略。
26. **S29-26 徽标口径** — Given 有未读，Then 铃铛、侧栏「通知中心」与账号菜单入口显示 `total`；侧栏 / 移动 tab 聊天入口与会话列表显示 `CHAT` 数；为 0 时不显示徽标。
27. **S29-27 读一条** — Given 一条未读，When 用户打开它，Then 该条变已读且 `total` 与所属类型各减 1。
28. **S29-28 全部已读** — Given 多条未读，When 用户选择「全部已读」，Then 该用户所有 UNREAD 变 READ，`total` 与各类型计数均为 0。
29. **S29-29 幂等** — Given 已读条目，When 再次标读，Then 计数不变。
30. **S29-30 按用户隔离** — Given A 标读，Then B 的计数不变；A 标读 B 的通知 MUST 返回 404。
31. **S29-31 会话范围** — Given 同一会话多条未读聊天，When 用户打开该会话，Then 只有该会话的 `CHAT` 变已读，其它会话与其它类型保持未读。
32. **S29-32 计数不回弹** — Given READ 已落库，When 页面刷新或在途快照落地，Then 该条不再计入未读。

### E. 实时与失败隔离

33. **S29-33 三秒内只推收件人** — Given 收件人已连接，When 通知创建，Then 3 秒内收到且无需刷新；其他用户不收到。
34. **S29-34 重连对账** — Given 断线期间发生过事件，When 客户端重连，Then 重新读取 REST 列表，计数收敛到持久化状态且无重复。
35. **S29-35 通道失败可控** — Given 推送通道无法建立，Then 其余功能照常可用，最后一次已知计数保留，不出现阻塞式弹窗。
36. **S29-36 失败隔离** — Given 通知写入或推送失败，Then 申请 / 裁决 / 发消息 / 信用 / 举报 / 账号 / 客服动作仍成功，失败被记录。

## 5. 约束（只陈述事实）

- 通知的生产方分散在行程、申请、聊天、信用、举报、账号、客服与资料八个服务；它们各自是事务性的，并且已经判断了谁可写。
- 面向用户的端点用 `X-User-Id` 识别调用者；`EventSource` 不能发送自定义头。
- `openapi.yaml` 由 `OpenApiTest` 断言版本与关键 schema；迁移必须同时能在 SQLite 与 H2 上执行。
- 前端单测跑在 node 环境（无 DOM）；UI 行为由 Playwright E2E 覆盖。
- 壳层在 `main` 已移除主题切换，本 change 的走查证据只保留浅色三档宽度。
- 这是 demo：单进程、内存态推送可接受。

## 6. Open Questions（全部已定）

| id | 问题 | 结论 |
|---|---|---|
| OQ-1 | 推送方式？ | SSE（`SseEmitter`）+ REST 对账 |
| OQ-2 | 计数从哪来？ | 持久化行的 `read_at`；计数由未读行派生 |
| OQ-3 | 拒绝也通知？ | 是 |
| OQ-4 | 徽标口径？ | 通知入口 = `total`；聊天入口与会话列表 = `CHAT` |
| OQ-5 | 打开会话是否清未读？ | 是，按 `trip_id` + 对方 id 限定 |
| OQ-6 | 是否做完整通知中心？ | 是，八类筛选 + 全部已读 |
| OQ-7 | 目标失效？ | 保留正文、提示不可查看、不跳转、仍标读 |
| OQ-8 | 去重？ | `(recipient_id, dedupe_key)` 唯一，先查后插 + 唯一索引兜底 |

## 7. DoR

| 检查 | 结论 |
|---|---|
| 故事与验收标准可追溯 | Pass（36 条场景 S29-1 ~ S29-36，映射到 8 个故事） |
| 能力归属与边界清楚 | Pass（`notifications` ADDED；八类生产方规则不变） |
| 无阻塞开放问题 | Pass（OQ 0） |
| 依赖与风险已记录 | Pass（SSE 代理、H2 可移植性、demo 身份、契约 / 迁移编号、通知噪声） |
| 验收可观察 | Pass（行数、`by_type`、3 秒窗口、恰好减一、徽标、跳转 URL、不可用提示） |

**DoR BLOCKER：0。**