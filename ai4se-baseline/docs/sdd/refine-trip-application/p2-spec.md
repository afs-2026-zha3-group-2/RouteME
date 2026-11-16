# P2 规格记录 — refine-trip-application

- **Change：** `refine-trip-application`（REQ-009 / S08 提交同行申请）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支：** `feature/refine-trip-application`（独立 worktree，基于 `origin/main@b93f45b`）

## 1. 阶段目标

把 P1 的 Delta 草稿复核为可签署的增量规格：确认范围与 proposal 一致、8 个场景可验证、Living Spec 5 个基线场景不丢失，并记录 G1 结论。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/trip-companions/spec.md`](../../openspec/changes/refine-trip-application/specs/trip-companions/spec.md) | MODIFIED「提交与取消同行申请」，1 Requirement / 8 Scenario |
| AC / DoV 复核 | [`dov-ac-review.md`](../../openspec/changes/refine-trip-application/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、REQ-009 映射 8/8、Living Spec 基线保留 5/5 |
| 一致性检查 | [`consistency-lint.md`](../../openspec/changes/refine-trip-application/consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 5 |
| G1 决策 | [`g1-decision.md`](../../openspec/changes/refine-trip-application/g1-decision.md) | Pass；IO Wanye / SA Jacky；条件 8 项（含 owner 与时机） |
| P2 质量报告 | [`docs/ai4se-plugins/20261116-115630-quality-checklist-report.md`](../../ai4se-plugins/20261116-115630-quality-checklist-report.md) | P2-1/P2-2/P2-3/P2-4 Pass；Overall Pass |

## 3. 关键裁决

- **MODIFIED 而非 ADDED：** `add-trip-companions` 已归档，Living Spec「提交与取消同行申请」是唯一基线；Delta 保留 5 个既有场景，并补充入口、待处理、文案与恢复表单断言。
- **说明保持选填：** 用户裁决 D1；不改后端校验、契约与迁移。
- **待处理态按原型：** 用户裁决 D2 覆盖 S08 字面「按钮变为已申请，待处理」；实现为「申请已提交，等待 {昵称} 回应」+「撤回申请」。
- **重复申请文案：** `DUPLICATE_APPLICATION` →「已申请，请等待回应」；原型 mock 的「已申请，等待回应」相差一个「请」字，以用户 AC 为准。
- **错误码优先级：** 后端顺序为「本人 → 重复 → 非 recruiting」；满员时若已有有效申请，返回 `DUPLICATE_APPLICATION` 而非 `TRIP_NOT_OPEN`，两种都视为拒绝并展示可读原因。
- **入口范围：** 只在行程详情页；不做卡片入口；不改后端、`openapi.yaml` 0.7.0 与数据库。

## 4. 校验

- `openspec validate refine-trip-application --strict` → `Change 'refine-trip-application' is valid`。
- AC/DoV：`dov-ac-review.md` 无 Blocking gaps，G1-ready。
- 一致性 lint：Pass；4 条 SUGGESTION 均不阻塞。
- P2 质量检查：Overall Pass（P2-3 在 G1 签署后补记 Pass）。

## 5. 签署（G1）

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与范围覆盖（S08 / REQ-009） | 2026-11-16 |
| SA | Jacky | Delta 与 Living Spec 基线保留、场景可验证 | 2026-11-16 |
| AO | Jay | 承接 P3–P4 | 2026-11-16 |
| VL | Neal | P4 独立验证（未到） | — |
| SM | Lewis | 阶段准入与排期 | 2026-11-16 |

**G1 结论：Pass**（`g1-decision.md`，2026-11-16T12:10+0800）。

## 6. G1 条件与后续

| 条件 | Owner | 时机 |
|---|---|---|
| 详情页内联申请区（非弹窗），说明选填 ≤120、提交按钮、聊天说明；入口仅对可申请行程展示 | AO | P3 / P4 |
| 待处理态等待提示 + 撤回；刷新保持；不使用字面「已申请，待处理」按钮 | AO | P3 / P4 |
| 重复 / 满员 / 结束的可读错误映射；两种 409 错误码都处理 | AO | P3 / P4 |
| 测试矩阵覆盖本人、重复、满员两种错误码、已结束、撤回恢复、页面停留期间状态变化 | AO | P3 `tasks.md` / P4 |
| Living Spec 合并收口任务（8 场景 + 5 基线语义） | AO + SA | P3 `tasks.md` / G3 前 |
| P5 `summary.md` 记录 D2 覆盖 S08 字面按钮 AC | BA / AO | P5 |
| 后端与契约不变；`ApplicationServiceTest` 回归保留 | AO | P4 |
| 宿主规则投影缺锚点（`prototype-ui-alignment` / `rule-precedence`）另立 rules-govern | Rules-govern | 后续 |

## 7. 阶段结论与提交

- **阶段结论：Pass**，进入 P3（`/sdd:atdd-design` → `/sdd:task-plan`）。
- **阶段提交：** 按用户当次要求，每阶段一次本地提交；P4 完成后先 `git pull` 再 push。本阶段提交信息为 `docs(p2): refine-trip-application add delta review consistency lint and G1`。
- **偏离：** 阶段性提交偏离 `@rule:git-commit-conventions`（verify / archive 两次提交），以用户当次显式指示为准，已在 `proposal.md` / `handoff.md` 记录。
