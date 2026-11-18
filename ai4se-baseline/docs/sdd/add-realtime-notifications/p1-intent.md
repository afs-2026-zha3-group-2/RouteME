# P1 意图记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-028 / 实时通知中心与未读计数）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17（首版）；2026-11-18（八类扩围） ｜ **记录人：** Karena（当前开发者，已向发起人确认）
- **分支 / 基点：** `feature/add-realtime-notifications`（直接基于 `main@1189b65`；P3 前合流 `main@357f5e2`）

## 1. 阶段目标

把「申请到达 / 申请被裁决 / 收到新消息时没有任何提示，也没有未读数」这一观察收敛为可判定的需求、影响面与 OpenSpec 提案。首版只覆盖三类事件；2026-11-18 发起人要求扩围为**八类业务事件的完整通知中心**，本阶段据此改写需求、故事、提案与决策集合，同时保持：

- 通知归属新能力 `notifications`，不改既有 Delta；
- 传输方式 SSE + REST 补偿；
- 未读口径 `read_at IS NULL`；
- 八类事件的收件人由既有业务规则决定，通知只做旁路记录；
- 申请、聊天、信用、举报、账号、客服、行程与资料规则一律不改。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 基线 | [`p0-baseline.md`](p0-baseline.md) | 起点后端 434 / 前端 344 全绿；无通知表 / 推送通道 / 徽标 / 通知中心；聊天仅对当前会话 3 秒轮询；G-01 ~ G-08 |
| 意图捕获 | [`intents/REQ-028-realtime-notifications.md`](../../../requirement-workspace/intents/REQ-028-realtime-notifications.md) | 原始观察、八类扩围、约束、OQ-1 ~ OQ-8 与结论；Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-028-realtime-notifications.md`](../../../requirement-workspace/requirements/REQ-028-realtime-notifications.md) | 六字段 + 36 场景（S29-1 ~ S29-36）+ OQ 8 条（全 resolved）+ DoR（BLOCKER 0） |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md) REQ-028 段；[`stories/add-realtime-notifications.story.md`](../../../requirement-workspace/stories/add-realtime-notifications.story.md) | S29-1 ~ S29-8 与追溯矩阵 |
| Deep-dive | [`deep-dive.md`「REQ-028 增补」](../../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §28](../../../requirement-workspace/impact-brief.md) | as-is → delta、blast radius、风险、拆分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/add-realtime-notifications/proposal.md) | 问题 / 范围 / 影响面 / D1–D18 / 12 条验收信号 / 残余风险 |
| 提案评审 | [`20261117-add-realtime-notifications-proposal-review.md`](../../reviews/20261117-add-realtime-notifications-proposal-review.md) | 首版评审结论 |
| 扩围复核 | [`20261118-add-realtime-notifications-expansion-review.md`](../../reviews/20261118-add-realtime-notifications-expansion-review.md) | 八类扩围后的规格与一致性复核 |
| 阶段记录 | 本文件 | 决策、校验、签署 |

## 3. 关键决策

- **D1 能力归属：** 新增 `notifications`（ADDED）；**不 MODIFY** `trip-companions`——它的 Delta（`refine-trip-chat` / `refine-trip-application` / `refine-safety-report`）尚未归档，追加 Requirement 会在归档时冲突。
- **D2 传输：** SSE（`SseEmitter`）+ 原生 `EventSource` 自动重连；不引入 WebSocket，不新增依赖。
- **D3 补偿：** 每次 `open` 重新拉 REST 列表；REST 是真相，推送只是延迟优化，掉线不丢事件。
- **D4 持久化：** 每事件一行；未读 = `read_at IS NULL`，`status` 派生，不另设计数器。
- **D5 拒信也通知：** 发起人只点名「被接受」，但静默拒绝是更差的失败模式。
- **D6 失败隔离：** 通知写入失败只记日志，不回滚任何业务动作。
- **D7 收件人：** 事件相关方各收自己的一份；永不通知动作人自己（发布者不会因自己的接受收到「满员」）。
- **D8 指示器：** 铃铛 / 侧栏通知中心 / 账号菜单 = 未读总数；侧栏与移动 tab 聊天入口、会话列表 = `CHAT` 未读数。
- **D9 已读范围：** 单条、全部、或单个会话（`trip_id` + 对方 id）。
- **D10 保留轮询：** 3 秒轮询留作兜底；新增推送追加与打开即读。
- **D11 流身份：** `user_id` 查询参数（`EventSource` 不能带 `X-User-Id`）；与既有用户端点同等信任级别。
- **D12 编号：** 契约 0.25.0、迁移 `V30__add_notifications.sql`（合流后最大 0.24.0 / `V29`），P3 排他确认。
- **D13 保留：** 列表取最新 50 条，不做清理任务；ONGOING 与安全提醒在读取时惰性物化。
- **D14 提示噪声：** 聊天类只在对应会话未打开时提示；其它类型恒提示。
- **D15 跳转：** 后端下发 `target.kind`，前端只组装路由；未知目标回通知中心。
- **D16 可用性：** 后端计算 `related_available`；不可用时保留正文、提示、不跳转，仍标读。
- **D17 优先级：** `NORMAL` / `HIGH`；信用分低于 60 与恢复通知为 `HIGH`。
- **D18 去重：** `(recipient_id, dedupe_key)` 唯一 + 先查后插 + 唯一冲突兜底。

**扩围决策（2026-11-18）：** 按发起人指示，把三类事件扩为八类（`TRIP` / `APPLICATION` / `CHAT` / `CREDIT` / `REPORT` / `ACCOUNT` / `SERVICE` / `SYSTEM`，共 22 事件），新增通知中心页、目标跳转与不可用提示；**在同一 PR #40 内交付，不另开 change**。

**不改：** 申请状态机、容量与裁决权限、聊天准入与只读规则、行程状态规则、信用记账与恢复、举报处理、账号状态、客服分配、资料规则、既有 3 秒轮询、`routeme/mq/`（保持为空）、邮件 / 短信 / OS 推送。

## 4. 校验

- 基线：后端 `mvnw.cmd test` → 434 tests / 60 reports / 0 失败；前端 `npm test` → 344 tests 全绿（P0 记录）。
- 本阶段无代码变更，因此不重跑后端 / 前端测试；契约与迁移在 P3 才落笔。
- 需求条目 DoR：blocking OQ 0、DoR BLOCKER 0；36 条场景与 S29-1 ~ S29-8 逐条可追溯。
- Delta 在 P2 起草（ADDED 8 Requirement / 36 Scenario），P2 结束时执行 `openspec validate --strict`。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | P1 范围与排期确认（单 change、8 点、迭代 3） | 2026-11-18 |
| IO | WAYNE | 需求来源与能力归属确认（`notifications` ADDED；不改 `trip-companions`；扩围到八类） | 2026-11-17 / 2026-11-18 |
| AO | Karena | 承接 P2–P4 | 2026-11-17 |

**阶段结论：Pass**（首版 `proposal` 由 WAYNE 签，评审报告由 WAYNE + Karena 签；扩围由发起人直接指示并经 `20261118-...-expansion-review.md` 复核）。

## 6. 提交与偏离记录

- **阶段提交：** 按本仓库约定，P1 一次提交：意图 / 需求 / 故事 / deep-dive / 影响面 / 提案 / 评审报告 / 本记录 + registry / handoff / stories / docs/sdd 索引更新。
- **偏离：** 阶段提交使用 `p1` stage 位，属 `@rule:git-commit-conventions` 的本地扩展（见 `docs/sdd/README.md`「提交约定」）。
- **扩围偏离：** 首版工件按 6 Requirement / 26 Scenario 出具；2026-11-18 在同一 change 内改写为 8 / 36，未新开 change 或 PR，原因见提案「变更历史」。