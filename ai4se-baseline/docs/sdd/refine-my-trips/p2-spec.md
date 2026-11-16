# P2 规格记录 — refine-my-trips

- **Change：** `refine-my-trips`（REQ-013 / S11 我的旅行）｜ **阶段：** P2（Delta Spec & G1）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-my-trips`（P1 提交 `17480b1`，已 rebase 到 `origin/main@588ef9e`）

## 1. 阶段目标

把 P1 的提案收敛为可实现的增量规格，并用 AC / DoV、一致性与 G1 三个检查确认：范围无静默扩张、基线场景不丢、每条场景都可观察。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-my-trips/specs/trip-companions/spec.md) | MODIFIED「我的旅行聚合与最低安全能力」，1 Requirement / 11 Scenario；保留 4 条基线场景名 |
| AC / DoV 评审 | [`dov-ac-review.md`](../../../openspec/changes/refine-my-trips/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、REQ-013 映射 12/12、基线保留 4/4 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/refine-my-trips/consistency-lint.md) | Pass；0 BLOCKER / 0 WARNING / 4 SUGGESTION / N/A 5 |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/refine-my-trips/g1-decision.md) | **Pass**；IO = WAYNE，SA = Neal |
| 规格评审 | [`20261116-refine-my-trips-spec-review.md`](../../reviews/20261116-refine-my-trips-spec-review.md) | Pass；0 BLOCKER / 0 WARNING / 2 SUGGESTION |
| 质量报告 | [`20261116-173500-quality-checklist-report.md`](../../ai4se-plugins/20261116-173500-quality-checklist-report.md) | P2-1 ~ P2-3 Pass；P2-4 Pass；Overall Pass |

## 3. 关键收敛

- **提醒目标可判定。** 从「固定第一条已发布行程」改为「存在待处理申请的那条行程」；后端负责给按行程计数，前端不再推断。
- **动作集合收敛到已交付能力。** 编辑 / 删除 / 参考发布移出范围，避免 Delta 与实现能力不一致。
- **同步写成事件。** 「重新可见」= `visibilitychange → visible` 或 `window focus`；「页内动作后」= 结束 / 撤回 / 退出成功后重取；分组切换不请求。
- **基线零丢失。** 4 条既有场景名逐字保留，安全段落文字未改写；新增 7 条覆盖结构、动作、提醒、同步、空态与窄屏。
- **契约兼容。** `pending_applications` 为可选数组（无待处理时为空数组），`required` 仍为原 5 项；`openapi.yaml` 次版本递增。

## 4. 校验

- `openspec validate refine-my-trips --strict` → `Change 'refine-my-trips' is valid`。
- `openspec show refine-my-trips --json --deltas-only` → `deltaCount: 1`、`spec: trip-companions`、`operation: MODIFIED`。
- `openspec status --change refine-my-trips` → `proposal` / `specs` 完成（2/4），`design` / `tasks` 属 P3。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta 归属 `trip-companions`、基线 4 场景保留、契约只增可选字段 | 2026-11-16 |
| SA | Neal | 场景可判定、窄屏与同步口径可验证 | 2026-11-16 |
| AO | Jay | 承接 P3–P4 | 2026-11-16 |

**阶段结论：Pass（G1 Pass）**

## 6. 提交与原计划差异

- 阶段提交：`docs(p2): refine-my-trips align delta spec and record G1`；push 前 `git pull --rebase origin main`。
- **与原计划的差异：** P1 推送时本地分支已 rebase 到新的 `origin/main`，远端 `feature/refine-my-trips` 仍是旧基点，因此本次推送使用 `--force-with-lease`（仅本 change 自己的两个提交，无他人提交被覆盖）。
- 范围差异：无。