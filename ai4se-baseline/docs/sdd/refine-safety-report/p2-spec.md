# P2 规格记录 — refine-safety-report

- **Change：** `refine-safety-report`（REQ-012 / S14 同行安全提示与举报）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main`（本地 HEAD = P1 提交 `30085eb`，未推送）

## 1. 阶段目标

把 P1 的 Delta 草稿复核为可签署的增量规格：确认范围与 proposal 一致、9 个场景可验证、Living Spec 4 个基线场景不丢失，修复提案的 schema 缺口，并记录 G1 结论。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-safety-report/specs/trip-companions/spec.md) | MODIFIED「我的旅行聚合与最低安全能力」，1 Requirement / 9 Scenario |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/refine-safety-report/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、REQ-012 §4 映射 7/7、Living Spec 基线保留 4/4 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/refine-safety-report/consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 5（3 条当场收口） / N/A 7 |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/refine-safety-report/g1-decision.md) | Pass；IO Wanye / SA Karena；无整改条件；8 项非阻断 follow-up（含 owner 与时机） |
| P2 质量报告 | [`docs/ai4se-plugins/20261116-160000-quality-checklist-report.md`](../../ai4se-plugins/20261116-160000-quality-checklist-report.md) | P2 required 3/3 Pass；P2-4 Pass；Overall Pass |
| 评审报告补记 | [`proposal-review`](../../reviews/20261116-refine-safety-report-proposal-review.md)、[`spec-review`](../../reviews/20261116-refine-safety-report-spec-review.md) | 各追加「变更摘要」：schema 补齐、措辞修正、场景勘误；Pass 结论与批准仍有效 |

## 3. 关键裁决与修订

- **MODIFIED 而非 ADDED：** `add-trip-companions` 已归档，Living Spec「我的旅行聚合与最低安全能力」是唯一基线；Delta 保留 4 个既有场景名（2 个原样、2 个内容收敛），新增 5 个。
- **提案 schema 缺口（P2 发现）：** `openspec show refine-safety-report --json` 报 `Change must have a Why section`——`validate --strict` 不校验该段，`show` / 归档会。已在「编号说明」后补 `## Why` / `## What Changes`（`add-trip-completion` 同构），内容为「问题 / 变化范围」的浓缩复述；复验 `deltaCount: 1` 且 `validate --strict` valid。按 `@rule:artifact-review-gate` 复用 P1 的 `Pass` 报告并追加「变更摘要」，未另出报告。
- **提案措辞修正（lint L-01 / L-02 / L-04）：** ①「保留『我的旅行』两个场景」改为「保留 4 个既有场景名，其中 2 个内容收敛」；②「统一回退文案（两套字面量）」改为「按页面语境分别定义，统一放 `tripMessages`」；③「用户当次要求完成 P1 即可提交推送」改为「P1 只本地提交、不 push」。均不改变范围、决策表与验收信号。
- **spec 评审勘误：** 报告「评审结论」段的场景计数写错（三个基线名 / 新增 6），已改为四个基线名 / 新增 5，与 Delta 场景清点一致；结论不变。
- **两道 P1 记录勘误：** `handoff.md` 与 `p1-intent.md` 的「保留 3 个基线场景名 + 新增 6」改为「保留 4 个 + 新增 5」。
- **回执与隐私口径不变：** 回执「已收到，我们会处理」由前端 `tripMessages` 决定；四类原因、`note ≤200`、`POST /api/reports` 与 `openapi.yaml` 0.8.1 均不改。

## 4. 校验

- `openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`。
- `openspec show refine-safety-report --json --deltas-only` → `deltaCount: 1`，`spec=trip-companions`，`operation=MODIFIED`。
- AC/DoV：`dov-ac-review.md` 无 blocking gap，G1-ready。
- 一致性 lint：Pass；5 条 SUGGESTION 中 3 条当场收口，2 条留 P3 / P5。
- P2 质量检查：Overall Pass。

## 5. 签署（G1）

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与跨能力影响：`trip-companions`（MODIFIED）替换已归档能力的相应 Requirement，`trip-plans` 仅只读 `meeting_area` | 2026-11-16 |
| SA | Karena | 规格与验收口径：三条安全提示、两处回退字面量、举报入口边界、回执文案、隐私红线与无障碍要求 | 2026-11-16 |
| AO | Jacky | 承接 P3–P4 与 follow-up 收口 | 2026-11-16 |
| VL | Neal | P4 独立验证（未到） | — |
| SM | Lewis | 阶段准入与排期（P1 范围确认） | 2026-11-16 |

**G1 结论：Pass**（`g1-decision.md`，2026-11-16T15:58+0800）。签署来源：用户在 2026-11-16 会话中给出 IO=Wanye、SA=Karena 并选定 Pass。

## 6. G1 后续项（非条件，不阻断）

| 项 | Owner | 时机 |
|---|---|---|
| `received=true` → 回执态的映射与单测断言 | AO（Jacky） | P3 `atdd-design.md` / P4 |
| 四类原因中文标签 ↔ 枚举值映射表 + 单测断言四值 | AO（Jacky） | P3 `design.md` / P4 |
| 隐私黑名单断言扩到详情 / 聊天安全区与举报弹窗 | AO（Jacky） | P3 / P4 测试矩阵 |
| `SafetyNote` 保留 `ShareExperiencePage` 无举报按钮的简化形态 | AO（Jacky） | P3 `design.md` / P4 diff |
| 同步 `companions.spec.ts` 旧回执断言为「已收到，我们会处理」 | AO（Jacky） | P4 同批提交 |
| 收敛 `## Why` 与「问题」的重复叙述 | AO（Jacky） | P5 归档前 |
| 归档说明写明「安全提示常驻」「提交举报并收到回执」名称保留、内容收敛 | AO（Jacky） + SA（Karena） | P5 / G3 |
| 后端与契约不变；`ReportControllerTest` 回归保留 | AO（Jacky） | P4 验证 |

## 7. 阶段结论与提交

- **阶段结论：Pass**，进入 P3（`/sdd:atdd-design` → `/sdd:task-plan`）。
- **阶段提交：** 按用户指示每阶段一次本地提交、暂不 push；本阶段提交信息为 `docs(p2): refine-safety-report align delta spec and record G1`。
- **偏离：** 阶段提交偏离 `@rule:git-commit-conventions` 的 verify / archive 两次边界，以用户显式指示为准；本地 `main` 仍含并行会话未推送提交，发布时机由该会话决定。已在 `p1-intent.md` §6 与本文件记录。