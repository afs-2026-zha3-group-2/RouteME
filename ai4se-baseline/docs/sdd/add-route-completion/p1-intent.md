# P1 意图记录 — add-route-completion

- **Change：** `add-route-completion`（REQ-030 / S31 路线完成度，issue #45）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-18 ｜ **记录人：** Neal（当前开发者）
- **分支 / 基点：** `.worktrees/add-route-completion`，分支 `feature/add-route-completion`，基线 `origin/main@aa320dc`
- **编号说明：** 起草时按顺位为 REQ-029 / S30；同日发现并行 `add-growth-level`（issue #44）已在独立 worktree 登记同号，按用户裁决改为 **REQ-030 / S31**，全部产物同步改号并重跑 P1 质量检查

## 1. 阶段目标

把 GitHub issue #45「路线完成度」收敛为一个可判定的 REQ-030、影响面与 OpenSpec 提案：为 `GET /users/{userId}/profile` 预留只读完成度字段与信誉状态码，在个人主页展示「路线完成度」一行；当前版本无人工打卡数据源，所有用户返回「暂无足够完成记录」，但阈值派生、四档状态与展示入口先落地，未来打卡上线后直接接线。本 change **无表、无迁移、无新端点、无管理端**。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-030-route-completion.md`](../../../requirement-workspace/intents/REQ-030-route-completion.md) | 原始诉求、现状差距 6 项、用户裁决 D1–D8、排除项与残余风险 |
| Ready 需求 | [`requirements/REQ-030-route-completion.md`](../../../requirement-workspace/requirements/REQ-030-route-completion.md) | 六字段 + 19 场景（S31-1 ~ S31-19）+ 12 项 DoR（BLOCKER 0） |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md) | S31，迭代 3，P1，3 点；个人主页；无独立故事文件（由 Ready + proposal + Delta 承接） |
| 共享分析 | [`deep-dive.md`](../../../requirement-workspace/deep-dive.md)「REQ-030 增补」、[`impact-brief.md`](../../../requirement-workspace/impact-brief.md) §30 | ①–④ 四表 + 探针记录；as-is 清单、逐资产 delta、blast radius、risks、split boundaries |
| 登记 | [`registry.md`](../../../requirement-workspace/registry.md)（REQ-030）、[`handoff.md`](../../../requirement-workspace/handoff.md) | P1 映射与状态 |
| 提案 | [`proposal.md`](../../openspec/changes/add-route-completion/proposal.md) | Why / What Changes / Out of Scope / Impact / 决策 D1–D8 / 10 条验收信号 / 8 项残余风险 / 交付边界 |
| Delta | [`specs/route-completion/spec.md`](../../openspec/changes/add-route-completion/specs/route-completion/spec.md) | ADDED 6 Requirement / 18 Scenario（P2 更正计数；REQ 的 S31-3 与 S31-15 在 Delta 合并为同一场景） |
| 工件评审 | [`proposal-review`](../../reviews/20261118-add-route-completion-proposal-review.md)、[`spec-review`](../../reviews/20261118-add-route-completion-spec-review.md) | 2026-11-18，均 Pass（0 BLOCKER / 0 WARNING / 5 SUGGESTION） |
| P1 质量检查 | [`20261118-133154-quality-checklist-report.md`](../ai4se-plugins/20261118-133154-quality-checklist-report.md)、[`checkpoints`](../ai4se-plugins/20261118-133129-quality-checklist-checkpoints.md) | Overall Pass（P1-1 ~ P1-4 全 Pass；P1-5 / P1-6 Skipped） |

## 3. 关键决策（D1–D8）

- **D1 数据口径：** 仅预留 + 数据不足；所有用户 `route_completion_rate = null`、`route_completion_state = insufficient`；不造假数据、不做临时计算；后端仍实现阈值派生。
- **D2 数据阈值：** ≥1 条已结束行程且存在有效完成度数值；少于 1 条直接数据不足。
- **D3 展示面：** 仅个人主页 `ProfilePage`；推荐列表 / 资料弹窗 / 行程卡 / 行程详情本期不做（推荐引擎已于 `c516d76` 移除）。
- **D4 编号 / 命名：** REQ-030 / S31；change `add-route-completion`；capability `route-completion`。
- **D5 展示形态：** 标签 + 百分比；`insufficient` 只显示「暂无足够完成记录」；`neutral` 只显示百分比。
- **D6 统计范围（未来）：** 发布者 + `ACCEPTED` 同行者参与的 `completed` 行程；进行中 / 未开始 / 已取消不计入。
- **D7 字段落点：** 仅接口字段；不落库、不新增迁移、无写入端点。
- **D8 本人 / 他人口径：** 同口径；后端返回英文状态码，前端 i18n 字典映射（沿用 `credit_level`）。

## 4. 校验

- `openspec validate add-route-completion --strict` → `Change 'add-route-completion' is valid`。
- `openspec show add-route-completion --json` → 6 个 Delta 条目，均为 `route-completion`；合计 6 Requirement / 18 Scenario（P2 更正：起草时误记为 19；REQ 的 S31-3 与 S31-15 在 Delta 合并为同一场景）。
- 基线核实：`openapi.yaml` `info.version: 0.25.0`；迁移头 `V30`；本 change 无迁移；`UserProfileResponse` 无完成度字段；`ProfilePage` 已有 `.profile-credit` 行；`c516d76` 已移除推荐引擎。
- 未运行后端 / 前端测试：P1 尚无实现，按 `all-specs-review` 记 N/A；契约 lint 与 E2E 属 P4。
- P1 质量检查：`docs/ai4se-plugins/20261118-133154-quality-checklist-report.md`（Overall Pass）。

## 5. 签署

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `proposal.md` | 1 / 1 | WAYNE（IO） | 2026-11-18 | 已批准 |
| `proposal` 评审报告 | 1 / 2 | WAYNE（IO） | 2026-11-18 | 已批准 |
| `proposal` 评审报告 | 2 / 2 | Neal（当前开发者） | 2026-11-18 | 已批准 |
| Delta Spec | 1 / 1 | WAYNE（IO） | 2026-11-18 | 已批准 |
| `spec` 评审报告 | 1 / 2 | WAYNE（IO） | 2026-11-18 | 已批准 |
| `spec` 评审报告 | 2 / 2 | Neal（当前开发者） | 2026-11-18 | 已批准 |

> 当前开发者已由发起人于 2026-11-18 确认为 Neal。按 `@rule:artifact-review-gate`，`proposal` 与 Delta Spec 由 WAYNE 签署；两份评审报告由 WAYNE + Neal 签署；六处已于 2026-11-18 按发起人确认签齐，P2 解锁。

## 6. 提交与偏离记录

- 编号偏离：起草时为 REQ-029 / S30；因并行 `add-growth-level`（issue #44）已登记同号，按用户裁决改为 **REQ-030 / S31**，并在需求 / registry / handoff / stories / deep-dive / impact / proposal / 评审报告同步；P1 质量检查已重跑。
- 评审技能缺口：仓库未安装 `all-specs-review` 技能（`vendor` 与 `.qoder/skills` 均无），本次按既有评审报告格式手工完成 proposal / spec 评审并落盘；结论仅为评审建议，不构成 G1。
- 未触碰代码、`openapi.yaml` 或迁移；本 change 只新增文档 / 规格文件。
- 提交：P1 产物随本阶段一次提交（`docs(p1): add-route-completion ...`），未 push。

## 7. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | 不适用（未触及代码，基线 `origin/main@aa320dc`） |
| P1 | 本条提交（`docs(p1): add-route-completion add REQ-030 S31 intent proposal and delta`） |
