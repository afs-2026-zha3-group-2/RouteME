# G1 decision — refine-safety-report

- **Gate:** G1（Align）
- **Change:** `refine-safety-report`（`trip-companions` MODIFIED，REQ-012 / S14）
- **Timestamp:** 2026-11-16T15:58+0800
- **Recorded by:** Qoder（AI agent），按用户在 2026-11-16 会话中给出的签署人姓名（IO=Wanye、SA=Karena）与决策结论（Pass）记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、决策（8 行）、验收信号（8 条）、残余风险齐全；能力记为 `trip-companions`（MODIFIED）；后端 / 契约 / 迁移不变 |
| Delta Spec — `trip-companions` | [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md) | 1 Requirement / 9 Scenario；MODIFIED；`openspec validate refine-safety-report --strict` valid；`openspec show --json --deltas-only` → `deltaCount: 1` |
| Living Spec baseline | `openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」 | 同名 Requirement 存在（4 场景）；delta 保留全部 4 个基线场景名 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ-012 §4 映射 7/7；Living Spec 基线保留 4/4；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 5（3 条已在 P2 收口） / N/A 7 |
| P2 quality report | `docs/ai4se-plugins/20261116-160000-quality-checklist-report.md` | P2 required 3/3 Pass；P2-4 Pass；Overall Pass |
| Requirements | `requirement-workspace/requirements/REQ-012-safety-report.md` | 六字段 + 7 场景；blocking OQ 0；DoR BLOCKER 0 |
| Intent | `requirement-workspace/intents/REQ-012-safety-report.md` | 用户裁决 D1–D4；Discovery Decision `Go` |
| Impact brief / deep-dive | `requirement-workspace/impact-brief.md` §15、`deep-dive.md`「REQ-012 增补」 | as-is→delta、blast radius、artifact impact；①–④ 四表 |
| Artifact reviews | `docs/reviews/20261116-refine-safety-report-{proposal,spec}-review.md` | 均 Pass，Jacky 批准（2026-11-16T15:44+08:00）；P2 的 schema 补齐与措辞修正已按 `@rule:artifact-review-gate` 追加「变更摘要」，结论未变 |
| Baseline change | `openspec/changes/archive/2026-11-15-add-trip-companions/` | 已归档；安全提示、举报提交与后端拒绝已存在，本 change 只改展示口径 |
| Implementation evidence | `RouteME/frontend/src/safety/{SafetyNote.tsx,ReportModal.tsx}`、`trips/TripDetailPage.tsx`、`chat/ChatPage.tsx`、`i18n/tripMessages.ts` | 单段 `safetyBody`、旧回执「举报已收到，我们会记录处理。」、弹窗缺身份保密与紧急求助说明、本人行程仍渲染举报按钮——与 REQ-012「问题」逐条对应 |
| Contract evidence | `RouteME/openapi.yaml` 0.8.1 `ReportRequest` / `ReportReceipt` | 四值 `reason`、`note ≤200`、`target_type ∈ {trip,user}` 已定义；`received` 为回执信号；无需改契约 |
| Prototype evidence | `docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()`；`stories.html` S14 | 三条安全事实、聊天一行提示、举报弹窗形态；S14 三条 AC |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-012 一致：详情页三条文本提示（含集合区域与空值回退）、聊天页一行提示（含只读聊天）、详情页举报仅非本人、聊天页举报常驻、弹窗对象 + 四类原因 + ≤200 说明 + 身份保密 + 紧急求助、回执「已收到，我们会处理」、失败可读可重试、隐私红线；无后台工单、无原因词表扩容、无契约 / 后端 / 迁移变更 | `proposal.md` §范围 / §Out of scope；`dov-ac-review.md` DoV-1；`consistency-lint.md` Q-1 |
| Ambiguity | 无未决歧义：三条提示的字面量、两处回退文案、回执文案、四类原因中文标签、本人行程隐藏入口均由用户裁决 D1–D4 定稿并写入 Requirement 与 Delta | `REQ-012` §4 / §5；`dov-ac-review.md` DoV-2；`proposal.md`「决策」表 |
| Conflict | 无阻塞冲突。① 与 S15 的 REQ-011 撞号已按「后到者顺延」改为 REQ-012 并全链同步；② 与 `add-trip-companions` 的 Living Spec 关系是 MODIFIED 替换而非平行权威；③ 与 REQ-009 资料弹窗的举报边界无冲突（列为 out of scope）；④ `trip-plans` 仅只读 `meeting_area`，未重定义字段或状态推导 | `openspec/specs/trip-companions/spec.md:144-171`；`proposal.md` §影响面；`consistency-lint.md` X-1 / X-2 |
| Traceability | REQ-012 §4 七条场景 7/7 有 Delta 落点；Living Spec 4 个既有场景名 4/4 保留（其中 2 个内容收敛）；proposal In scope ①–⑦ 均有对应 Scenario；无孤儿 Requirement / 孤儿场景 | `dov-ac-review.md` §REQ-012 §4 → Delta Scenario / §Living Spec 基线保留；`consistency-lint.md` Q-5 |
| Residual risk | 回执文案变更会打破 `e2e/tests/companions.spec.ts` 约 L130 旧断言，需与 `tripMessages` 同批更新；E2E 未纳入 CI；集合区域依赖 `meeting_area` 填充率；「安全提示常驻」名称保留但内容收敛（归档需一句说明）；无障碍断言需 P4 有可执行验证手段 | `dov-ac-review.md` §Residual risk；`consistency-lint.md` §Residual risks；`docs/reviews/20261116-refine-safety-report-spec-review.md` S-01 |

## Decision

**Pass**

## Conditions + owners

无（Decision = Pass，无整改条件）。

## Follow-ups（非条件项，不阻断 G1）

| 项 | 来源 | Owner | 处理时机 |
|---|---|---|---|
| `received=true` → 回执态的映射写入设计与单测断言（当前只断言 UI 文案） | lint L-05 | AO（Jacky） | P3 `atdd-design.md` / P4 |
| 收敛 `## Why` 与「问题」的重复叙述 | lint L-03 | AO（Jacky） | P5 归档前 |
| 归档说明写明「安全提示常驻」「提交举报并收到回执」为名称保留、内容收敛 | spec 评审 S-01 | AO（Jacky） + SA（Karena） | P5 / G3 |
| 中英文映射：四类原因中文标签 ↔ `harassment`/`fake`/`safety`/`other` | spec 评审 S-03 | AO（Jacky） | P3 `design.md` / P4 |
| 隐私黑名单断言（`电话：` / `身份证` / `门牌`）扩到详情 / 聊天安全区与举报弹窗 | proposal 评审 P-02、spec 评审 S-02 | AO（Jacky） | P3 / P4 测试矩阵 |
| `SafetyNote` 保留 `ShareExperiencePage` 无举报按钮的简化形态 | proposal 评审 P-01 | AO（Jacky） | P3 `design.md` / P4 diff 核对 |
| 同步 `companions.spec.ts` 旧回执断言 | proposal 评审 P-04、残余风险 | AO（Jacky） | P4 同批提交 |
| 后端 `ReportController` / `ReportServiceImpl` / `openapi.yaml` 保持不变；`ReportControllerTest` 作为回归保留 | 提案「决策 / 后端不变」 | AO（Jacky） | P4 验证 |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与跨能力影响：`trip-companions`（MODIFIED）替换已归档能力的相应 Requirement，`trip-plans` 仅只读 `meeting_area` | 2026-11-16 |
| SA | Karena | 规格与验收口径：三条安全提示、两处回退字面量、举报入口边界、回执文案、隐私红线与无障碍要求 | 2026-11-16 |
| AO（当前开发） | Jacky | 承接 P3–P4 实现与本地验证；Follow-ups 按上表收口 | 2026-11-16 |

签署来源：用户在 2026-11-16 会话中就「G1 签署人」明确回答 **IO=Wanye、SA=Karena**，并就决策结论选择 **Pass**。本次 change 的 AO 为 Jacky（P1 记录人），故 SA 由 Karena 签署，避免 AO 自签 SA。VL（Neal）在 G2 / P4 独立验证签署，SM（Lewis）在 P1 范围确认；两者不属 G1 签署人。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- 上述 8 条 Follow-ups 分别落入 P3 设计与任务、P4 测试矩阵与验证、P5 归档说明；无阻塞项。