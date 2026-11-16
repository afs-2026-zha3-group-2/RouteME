# P1 意图与提案记录 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **能力：** `trip-companions`（MODIFIED）+ `trip-plans`（MODIFIED）｜ **需求：** REQ-013
- **阶段：** P1（Intent & proposal）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把「确认集合和安排，出行不靠猜」收敛为可判定的提案：聊天页范围、准入与退出语义、集合时间字段、集合维护权限与可编辑状态，并明确与既有活规格的冲突裁决。

## 2. 需求与故事

| 项 | 来源 | 结论 |
|---|---|---|
| 需求 | `requirement-workspace/requirements/REQ-013-trip-chat-meeting.md` | 六字段 + Ready 25 场景；blocking OQ 0；DoR BLOCKER 0 |
| 意图 | `requirement-workspace/intents/REQ-013-trip-chat-meeting.md` | 用户原话 + 追加确认表 |
| 故事 | `requirement-workspace/stories/refine-trip-chat.story.md`（S12-1～S12-4） | 4 条垂直切片 |
| 影响面 | `requirement-workspace/impact-brief.md` §13 | 逐资产 delta + blast radius + 风险 |
| 原型 | `docs/prototype/ui.js` `chat()`、`styles.css` `.chat-*`、`main.js` 3 秒轮询 | 视觉与交互基准 |
| 上游 | `add-trip-companions`（聊天与退出）、`add-trip-publish`（发布与集合区域）、`add-user-profiles`（资料弹窗） | 已落地，可复用 |
| 下游 | 无 | 本 change 自闭环 |

## 3. 范围

**In scope**

- 聊天页按原型两栏重构（会话列表 / 主区 / 头部动作 / 安全条 / 输入交互 / 空态 / 拒绝说明 / 3 秒轮询）。
- 聊天准入改为「发布者或曾接受（含已退出）」；退出同行改为可追溯状态且不关闭聊天。
- 集合时间字段（选填、日期 + 时间、日期部分 ≤ 结束日期）与三处展示。
- 发布者维护集合区域与集合时间（仅两字段、招募中 / 已满员可编辑）。
- 原型先行、契约 `0.9.0`、迁移 `V13`、测试与 E2E。

**Out of scope**

- 实时推送 / 已读回执 / 推送 / 图片 / 文件 / 语音。
- 消息编辑、撤回、删除、搜索、分页。
- 完整行程编辑（标题、目的地、日期、途经点、人数、预算、标签、说明）。
- 集合提醒、日程冲突、地图标记、群聊、举报处置闭环。
- 统计口径与「我的旅行」分组口径调整。

## 4. 影响面

| 位置 | 影响 |
|---|---|
| `openapi.yaml` | 新增 `meeting_time`、集合更新端点、申请状态 `left`；版本 `0.8.0` → `0.9.0` |
| 数据库 | `V13` 新增 `meeting_time`（可空） |
| 后端 | `ChatServiceImpl`（准入）、`ApplicationServiceImpl`（退出状态）、`TripPlanServiceImpl` / `TripController`（集合字段与更新）、`TripPlan` / 实体 / `TripPlanMapper.xml` |
| 前端 | `ChatPage` 与 `chat/` 子组件、`MyTripsPage`、`TripDetailPage`、`TripCreatePage`、`tripForm`、`api`、`types`、`tripMessages`、`styles.css` |
| 原型 | `docs/prototype/` 增集合时间与集合编辑入口 |
| 测试 | `ChatControllerTest`、新增集合与编辑 API 测试、`e2e/tests/companions.spec.ts` 扩用例并改写 leave 断言 |

## 5. 关键裁定（提案阶段）

| 裁定 | 内容 | 理由 |
|---|---|---|
| 集合区域 | 不新增字段 | 已存在（V4 + 发布页 + 详情 + 契约） |
| 集合时间 | 本地日期时间、可空、日期部分 ≤ 结束日期 | 与行程日期同为无时区语义 |
| 集合编辑 | 仅发布者、仅两字段、仅招募中与已满员 | 覆盖「计划有变」且范围最小 |
| 退出语义 | 新增「已退出」状态，聊天准入放开到曾接受 | 用户裁决；与「未匹配不可进入」仍一致 |
| 轮询 | 3 秒，仅会话页开启 | 用户要求短轮询，原型即 3 秒 |
| 冲突裁决 | 用户指示优先，MODIFIED 活规格两条需求 | `@rule:rule-precedence` 第 1 层；已在需求条目 §5/§8 与提案记录 |
| 双 capability | 归档前需 SA 具名追认 | 与 `add-destination-area-filters` / `add-user-profile` 处理一致 |

## 6. 阶段产出

| 工件 | 路径 |
|---|---|
| 意图 | [`requirement-workspace/intents/REQ-013-trip-chat-meeting.md`](../../../requirement-workspace/intents/REQ-013-trip-chat-meeting.md) |
| Ready 条目 | [`requirement-workspace/requirements/REQ-013-trip-chat-meeting.md`](../../../requirement-workspace/requirements/REQ-013-trip-chat-meeting.md) |
| 故事 | [`requirement-workspace/stories/refine-trip-chat.story.md`](../../../requirement-workspace/stories/refine-trip-chat.story.md) |
| 影响面 | [`requirement-workspace/impact-brief.md`](../../../requirement-workspace/impact-brief.md) §13 |
| 提案 | [`openspec/changes/refine-trip-chat/proposal.md`](../../../openspec/changes/refine-trip-chat/proposal.md) |
| 提案评审 | [`docs/reviews/20261116-refine-trip-chat-proposal-review.md`](../../reviews/20261116-refine-trip-chat-proposal-review.md) |
| 质量报告 | `docs/ai4se-plugins/<ts>-quality-checklist-report.md`（P1，见报告） |

## 7. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | 待提交（`docs(p0): refine-trip-chat baseline stage and sign-off`） |
| P1 | 本条提交 |

> 按 `@rule:git-commit-conventions` 一个 spec 只允许 verify / archive 两次提交；本仓库 `docs/sdd/README.md` 把阶段留痕扩展为 `p0`–`p4` 前缀，两处冲突按「项目规则优先」处理，提交动作待用户确认后再执行。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 排期与故事归属：S12-1～S12-4 同批交付，不拆 PR | 2026-11-16 |
| IO | Wanye | 需求来源 REQ-013 与用户裁决一致 | 2026-11-16 |
| SA | Jacky | 接受六项关键裁定，同意进入 P2 | 2026-11-16 |
| AO | Jay | 影响面与工作量判断（M）；承担实现与验证 | 2026-11-16 |

**阶段结论：Pass**（待 proposal 评审批准后生效）

## 9. 准入 P2 的条件

- Delta Spec 覆盖 REQ-013 的 25 条场景，且逐条映射到 `trip-companions` / `trip-plans`。
- MODIFIED 块写清旧行为与新行为差异，尤其是退出语义。
- AC / DoV 复核无 BLOCKER；G1 由 SA（Jacky）与 IO（Wanye）签署。
