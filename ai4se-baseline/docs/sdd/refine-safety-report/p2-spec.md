# P2 规格记录 — refine-safety-report（rev2）

- **Change：** `refine-safety-report`（REQ-012 / S14 同行举报入口与回执）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）｜ **修订：** rev2（裁决 D5）
- **分支 / 基点：** 主工作区 `main`（本地 HEAD = P2 rev1 提交 `ad6c48f`，未推送）
- **阶段结论：** rev1 Pass（已签署）→ rev2 **Pass**（G1 已于 2026-11-16T16:38+0800 由 IO WAYNE / SA Karena 具名重签）

## 1. 阶段目标

把 Delta 草稿复核为可签署的增量规格：确认范围与 proposal 一致、场景可验证、Living Spec 迁移路径明确，并记录 G1 结论。rev2 的目标是在裁决 D5 后重建规格：把「提示 + 举报」收敛为「两个页头入口 + 弹窗」，并保证删除动作在归档 diff 中可见。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-safety-report/specs/trip-companions/spec.md) | rev2：REMOVED 1（我的旅行聚合与最低安全能力，含 Reason / Migration）+ ADDED 1（同行举报入口与回执，9 Scenario） |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/refine-safety-report/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、REQ-012 rev2 §4 映射 7/7；基线 3 保留 / 1 移除 / 6 新增；Verdict = Conditional Pass（待具名重签） |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/refine-safety-report/consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4（2 条当场收口） / N/A 7 |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/refine-safety-report/g1-decision.md) | rev1 Pass（IO WAYNE / SA Karena）**已被 rev2 取代**；rev2 Status = **Pass**（2026-11-16T16:38+0800，具名重签） |
| 工件评审 rev2 | [`proposal-review-2`](../../reviews/20261116-refine-safety-report-proposal-review-2.md)、[`spec-review-2`](../../reviews/20261116-refine-safety-report-spec-review-2.md) | 均 Pass，Jacky（AO）2026-11-16T16:35 批准；rev1 报告保留并标注作废 |
| 提案 rev2 | [`proposal.md`](../../../openspec/changes/refine-safety-report/proposal.md) | In scope ①–⑧；影响面与决策表按 D5 更新 |
| 设计预览 | [`preview/safety-report.html`](../../../openspec/changes/refine-safety-report/preview/safety-report.html) | A / B / C 三种入口位置；用户选定 B · 页头右上；Lighthouse Accessibility 1.0 |
| P2 质量报告 | [`docs/ai4se-plugins/20261116-160000-quality-checklist-report.md`](../../ai4se-plugins/20261116-160000-quality-checklist-report.md) | rev1：P2 required 3/3 Pass；Overall Pass（rev2 待复核） |

## 3. 关键裁决与修订

- **REMOVED + ADDED，而非 MODIFIED（rev2 核心）：** `openspec` 的校验器禁止 MODIFIED 块丢弃既有场景名（`specs-apply.js`：`current spec contains scenario(s) not present in the modified block`）。rev1 只能靠「名称保留、内容改写」绕过；D5 需要真正删掉 `安全提示常驻` 与 `聊天页展示安全提示`，因此改为移除旧需求块、新增「同行举报入口与回执」。旧块的 Reason / Migration 写明迁移去向。
- **提示下线（D5）：** 详情页三条文本列表、聊天页一行提示、两套集合区域回退文案全部移除；`meeting_area` 仍在既有「集合」事实行展示。
- **入口位置（D5）：** 详情页页头右上（状态标签同行）、聊天页页头右上（头像对侧）；窄屏换行不隐藏；文本按钮，不只靠颜色 / 图标。
- **本人行程（D3 + D5）：** 不出现举报入口，页面同时不展示安全提示。
- **故事与需求同步：** `docs/prototype/stories.html` S14 三条 AC 改写为「页头入口 / 回执 / 非颜色图标」，标题改为「举报入口与回执」；REQ-012 rev2 的 Intention、§2–§9 与 DoR 自检同步更新。
- **提案 schema 与措辞（rev1 遗留）：** `## Why` / `## What Changes` 已存在且在 rev2 重写；L-01 / L-02 / L-04 的措辞修正随 rev2 正文一并重写，不再单独追记。
- **回执与隐私口径不变：** 回执「已收到，我们会处理」由前端 `tripMessages` 决定；四类原因、`note ≤200`、`POST /api/reports` 与 `openapi.yaml` 0.8.1 均不改。

## 4. 校验

- `openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`。
- `openspec show refine-safety-report --json` → `deltaCount: 2`（`trip-companions` ADDED + REMOVED）；ADDED 需求 9 场景。
- AC/DoV：`dov-ac-review.md` 无 BLOCKER，Verdict = Pass（G1 rev2 已具名重签）。
- 一致性 lint：Pass；4 条 SUGGESTION 中 2 条当场收口，2 条留 P3 / P4。
- 预览：无 console 错误、无横向溢出、Lighthouse Accessibility 1.0 / Best Practices 1.0。

## 5. 签署（G1）

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | rev1：`trip-companions`（MODIFIED）替换已归档能力的相应 Requirement，`trip-plans` 仅只读 `meeting_area`。**rev2 已重签（2026-11-16）：REMOVED + ADDED 重建，`trip-plans` 仍只读** | 2026-11-16（rev1 / rev2） |
| SA | Karena | rev1：三条提示、两处回退字面量、举报入口边界、回执文案。**rev2 已重签（2026-11-16）：D5 移除提示、入口置于页头右上** | 2026-11-16（rev1 / rev2） |
| AO | Jacky | 承接 rev2 的 P3–P4 与 follow-up 收口 | 2026-11-16 |
| VL | Neal | P4 独立验证（未到） | — |
| SM | Lewis | 阶段准入与排期（P1 范围确认） | 2026-11-16 |

**G1 结论：rev1 Pass（`g1-decision.md`，2026-11-16T15:58+0800）→ rev2 Pass（2026-11-16T16:38+0800）。** rev1 的 WAYNE / Karena 签署建立在「提示常驻」的规格上，不覆盖 D5；rev2 已就 D5 具名重签，P3 解锁。

## 6. G1 后续项（非条件，不阻断）

| 项 | Owner | 时机 |
|---|---|---|
| `received=true` → 回执态的映射与单测断言 | AO（Jacky） | P3 `atdd-design.md` / P4 |
| 明确 `SafetyNote` 去留；体验发布页「发布前提醒」不得回归 | AO（Jacky） | P3 `design.md` / P4 diff |
| 四类原因中文标签 ↔ 枚举值映射表 + 单测断言四值 | AO（Jacky） | P3 `design.md` / P4 |
| 隐私黑名单断言扩到举报弹窗 | AO（Jacky） | P3 / P4 测试矩阵 |
| 同步 `companions.spec.ts` L136 旧回执断言，并确认回执态唯一按钮为 primary | AO（Jacky） | P4 同批提交 |
| 页头入口在 390 / 768 / 1440 三档不溢出、不退回纯图标 | AO（Jacky） | P3 / P4 |
| 收敛 `## Why` 与「问题」的重复叙述 | AO（Jacky） | P5 归档前 |
| 归档说明写明「安全提示常驻」按 D5 有意移除 | AO（Jacky） + SA（Karena） | P5 / G3 |
| 后端与契约不变；`ReportControllerTest` 回归保留 | AO（Jacky） | P4 验证 |

## 7. 阶段结论与提交

- **阶段结论：** rev1 Pass 且已提交；rev2 **Pass**，G1 已具名重签，P3 解锁。
- **阶段提交：** 按用户指示每阶段一次本地提交、暂不 push；rev2 的提交为 `docs(p2): refine-safety-report rebase spec on report-entry-only design`，G1 rev2 签署随同一次提交记录。
- **偏离：** 阶段提交偏离 `@rule:git-commit-conventions` 的 verify / archive 两次边界，以用户显式指示为准；本地 `main` 仍含并行会话未推送提交，发布时机由该会话决定。已在 `p1-intent.md` §6 与本文件记录。
- **rev1 历史（保留供追溯）：** rev1 采用 MODIFIED，1 Requirement / 9 Scenario，4 个基线场景名全保留（其中 2 个内容收敛），G1 Pass。该版本已被 D5 取代，不再作为实现依据。