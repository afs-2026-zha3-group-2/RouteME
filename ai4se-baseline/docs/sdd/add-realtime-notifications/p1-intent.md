# P1 意图记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-023 / 实时通知与未读计数）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Karena（当前开发者，已向发起人确认）
- **分支 / 基点：** `feature/add-realtime-notifications`（直接基于 `main@1189b65`）

## 1. 阶段目标

把「申请到达 / 申请被裁决 / 收到新消息时没有任何提示，也没有未读数」这一观察收敛为可判定的 REQ-023、影响面与 OpenSpec 提案；明确通知的归属（新能力 `notifications`，不改既有 Delta）、传输方式（SSE + REST 补偿）、未读口径（`read_at IS NULL`）与四类事件的收件人，避免改动申请状态机与聊天准入。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 基线 | [`p0-baseline.md`](p0-baseline.md) | 后端 434 / 前端 344 全绿；无通知表 / 推送通道 / 徽标；聊天仅对当前会话 3 秒轮询；G-01 ~ G-06 |
| 意图捕获 | [`intents/REQ-023-realtime-notifications.md`](../../../requirement-workspace/intents/REQ-023-realtime-notifications.md) | 原始观察、约束、OQ-1 ~ OQ-5 与建议方向；Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-023-realtime-notifications.md`](../../../requirement-workspace/requirements/REQ-023-realtime-notifications.md) | 六字段 + 26 场景（S23-1 ~ S23-26）+ OQ 5 条（全 resolved）+ DoR（BLOCKER 0） |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md) REQ-023 段；[`stories/add-realtime-notifications.story.md`](../../../requirement-workspace/stories/add-realtime-notifications.story.md) | S23-1 ~ S23-5 与追溯矩阵 |
| Deep-dive | [`deep-dive.md`「REQ-023 增补」](../../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §23](../../../requirement-workspace/impact-brief.md) | as-is → delta、blast radius、风险、拆分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/add-realtime-notifications/proposal.md) | 问题 / 范围 / 影响面 / D1–D14 / 10 条验收信号 / 残余风险 |
| 提案评审 | [`20261117-add-realtime-notifications-proposal-review.md`](../../reviews/20261117-add-realtime-notifications-proposal-review.md) | 见该报告结论 |
| 阶段记录 | 本文件 | 决策、校验、签署 |

## 3. 关键决策

- **D1 能力归属：** 新增 `notifications`（ADDED）；**不 MODIFY** `trip-companions`——它的 Delta（`refine-trip-chat` / `refine-trip-application` / `refine-safety-report`）尚未归档，追加 Requirement 会在归档时冲突。
- **D2 传输：** SSE（`SseEmitter`）+ 原生 `EventSource` 自动重连；不引入 WebSocket，不新增依赖。
- **D3 补偿：** 每次 `open` 重新拉 REST 列表；REST 是真相，推送只是延迟优化，掉线不丢事件。
- **D4 持久化：** 每事件一行；未读 = `read_at IS NULL`，不另设计数器。
- **D5 拒信也通知：** 发起人只点名「被接受」，但静默拒绝是更差的失败模式。
- **D6 失败隔离：** 通知写入失败只记日志，不回滚申请 / 裁决 / 发消息。
- **D7 收件人：** 发布者收 `application_received`；申请者收裁决；接收方收 `message`；永不通知自己（自消息需显式守卫）。
- **D8 指示器：** 顶栏铃铛 = 未读总数 + 面板；侧栏 / 移动 tab 聊天入口 = 消息未读数；会话列表 = 分会话未读数。
- **D9 已读范围：** 单条、全部、或单个会话（`trip_id` + 对方 id）。
- **D10 保留轮询：** 3 秒轮询留作兜底；新增推送追加与打开即读。
- **D11 流身份：** `user_id` 查询参数（`EventSource` 不能带 `X-User-Id`）；与既有用户端点同等信任级别。
- **D12 编号：** 契约 0.18.0、迁移 `V24`（当前最大 0.17.0 / `V23`），仅在 P3 排他确认。
- **D13 保留：** 列表取最新 50 条，不做清理任务。
- **D14 提示噪声：** 申请类总是提示；消息只在对应会话未打开时提示。

**不改：** 申请状态机、容量与裁决权限、聊天准入与只读规则、行程状态规则、既有 3 秒轮询、`routeme/mq/`（保持为空）、邮件 / 短信 / OS 推送。

## 4. 校验

- 基线：后端 `mvnw.cmd test` → 434 tests / 60 reports / 0 失败；前端 `npm test` → 344 tests 全绿（P0 记录）。
- 本阶段无代码变更，因此不重跑后端 / 前端测试；契约与迁移在 P3 才落笔。
- 需求条目 DoR：blocking OQ 0、DoR BLOCKER 0；26 条场景与 S23-1 ~ S23-5 逐条可追溯（每一条场景至少落在一个故事下）。
- Delta 尚未起草（P2 产出 `specs/notifications/spec.md`：ADDED 6 Requirement / 26 Scenario），本阶段不做 `openspec validate`。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | 待确认 | P1 范围与排期确认（单 change、5 点、迭代 3） | 待签 |
| IO | WAYNE | 需求来源与能力归属确认（`notifications` ADDED；不改 `trip-companions`） | 待签 |
| AO | Karena | 承接 P2–P4 | 2026-11-17 |

**阶段结论：待签署**（`proposal.md` 由 WAYNE 签；本评审报告由 WAYNE + Karena 签）。

## 6. 提交与偏离记录

- **阶段提交：** 按本仓库约定，P1 一次提交：意图 / 需求 / 故事 / deep-dive / 影响面 / 提案 / 评审报告 / 本记录 + registry / handoff / stories / docs/sdd 索引更新。
- **偏离：** 阶段提交使用 `p1` stage 位，属 `@rule:git-commit-conventions` 的本地扩展（见 `docs/sdd/README.md`「提交约定」）。
- **语言：** `@rule:document-conventions` 要求「正文中文」，`AGENTS.md` 要求英文文档；本阶段的 SDD 工件按既有语料的中文正文 + 英文标识符口径书写，差异已在评审报告记录，供签核人裁定。