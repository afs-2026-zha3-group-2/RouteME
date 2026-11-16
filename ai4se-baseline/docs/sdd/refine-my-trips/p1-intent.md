# P1 意图记录 — refine-my-trips

- **Change：** `refine-my-trips`（REQ-015 / S11 我的旅行）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-my-trips`（独立 worktree，基于 `origin/main@f6da5da`）

## 1. 阶段目标

把「我的旅行页要按原型重排并补齐状态同步」收敛为可判定的 REQ-015、影响面与 OpenSpec 提案；明确既有四组聚合中「已存在」与「需补齐」的边界，避免重复实现后端分组规则。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-015-my-trips.md`](../../../requirement-workspace/intents/REQ-015-my-trips.md) | 原始指令 / issue #13、现状核对、排除项、Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-015-my-trips.md`](../../../requirement-workspace/requirements/REQ-015-my-trips.md) | 六字段 + 12 场景 + OQ 5 条（全 resolved）+ DoR（BLOCKER 0） |
| 故事 | [`stories/refine-my-trips.story.md`](../../../requirement-workspace/stories/refine-my-trips.story.md)、[`stories.md`](../../../requirement-workspace/stories.md) REQ-015 段 | S11 的 11 条 AC 映射 |
| Deep-dive | [`deep-dive.md`「REQ-015 增补」](../../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §16](../../../requirement-workspace/impact-brief.md) | as-is→delta、blast radius、风险、拆分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/refine-my-trips/proposal.md) | Why / What Changes / 问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-my-trips/specs/trip-companions/spec.md) | MODIFIED「我的旅行聚合与最低安全能力」，1 Requirement / 11 Scenario（保留 4 条基线场景名） |
| 提案评审 | [`20261116-refine-my-trips-proposal-review.md`](../../reviews/20261116-refine-my-trips-proposal-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION |
| 质量报告 | [`20261116-172000-quality-checklist-report.md`](../../ai4se-plugins/20261116-172000-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 Pass；P1-6 Skipped；Overall Pass |

## 3. 关键决策

- **页面骨架（D1）：** `page-head`（标题 + 待处理摘要 + 「发布新行程」）+ 带计数分段 + `.mine-row`（84px 封面 + 标题/状态 + 元信息 + 备注 + 右侧动作列）；资料卡保留。
- **控件（D2）：** antd `Segmented`（规则「组件选型」），复用 `styles.css` 既有胶囊样式；E2E 角色断言同批由 `tab` 改为 `radio`。
- **动作范围（D3）：** 只落地已交付能力——查看 / 处理申请 / 结束行程 / 撤回 / 沟通 / 退出 / 写体验；编辑、删除、参考发布不做。
- **待处理计数（D4）：** 后端新增只读 `pending_applications: [{trip_id, count}]`，保留总数；提醒与行内入口据此定位；无迁移。
- **同步（D5）：** `visibilitychange`（可见）+ `focus` 重取；页内动作成功后重取；不引入轮询。
- **保留项（D6）：** `.mine-profile-card` 与完成组体验入口属既有规格，不回退。
- **不改：** 四组分组规则、申请状态机、行程四态、体验资格、`ApplicationsPage`；契约只增可选字段。

## 4. 校验

- `openspec validate refine-my-trips --strict` → `Change 'refine-my-trips' is valid`。
- `openspec show refine-my-trips --json --deltas-only` → `deltaCount: 1`、`spec: trip-companions`、`operation: MODIFIED`。
- P1 质量检查 Overall Pass（required 4/4；optional P1-5 Pass）。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | P1 范围与排期确认（单 change、2 点、迭代 2） | 2026-11-16 |
| IO | WAYNE | 需求来源与跨能力影响确认（仅 `trip-companions` MODIFIED，`design-system` 约束只读） | 2026-11-16 |
| AO | Jay | 承接 P2–P4 | 2026-11-16 |

**阶段结论：Pass**

## 6. 提交与偏离记录

- **阶段提交：** 用户当次要求「每个阶段提交一次，git push 之前先做 git pull」。P0 提交 `4c47383`（push 前已 `git pull --rebase origin main`）；P1 同批提交提案、Delta 草稿、评审、质量报告与本记录。
- **偏离：** 阶段提交偏离 Critical 规则 `@rule:git-commit-conventions`（一个 spec 只允许 verify / archive 两次提交）。以用户当次显式指示为准，偏离已在 `proposal.md`「提交与偏离」与本节记录。
- **范围偏离：** 无。原型中的编辑 / 删除 / 参考发布已显式排除，并写入 REQ-015 §3 与 proposal 的 Out of scope。