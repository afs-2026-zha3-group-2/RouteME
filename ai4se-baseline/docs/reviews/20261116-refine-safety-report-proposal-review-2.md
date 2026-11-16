# proposal 评审报告（rev2）— refine-safety-report

- **工件：** `openspec/changes/refine-safety-report/proposal.md`（rev2）
- **change-id：** `refine-safety-report`
- **需求条目：** `requirement-workspace/requirements/REQ-012-safety-report.md`（REQ-012 / S14，rev2）
- **评审日期：** 2026-11-16
- **评审轮次：** 第 2 次（同日）。rev1 报告见 [`20261116-refine-safety-report-proposal-review.md`](20261116-refine-safety-report-proposal-review.md)，其 Pass 结论只覆盖 rev1 的「三条提示 + 举报」口径，**不适用于 rev2**。
- **触发原因：** 用户裁决 D5 —— 详情页三条安全提示与聊天页一行提示全部移除，举报入口移到页头右上（B）。该裁决推翻了 rev1 的范围前提，属实质性变更，按 `@rule:artifact-review-gate`「只改错字、链接或格式且不改变语义的修订，可复用上一份 Pass 报告」的反面，必须重新评审并重新批准。
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:pii-scrubbing`）
- **评审输入：** 提案正文（rev2）；`requirement-workspace/requirements/REQ-012-safety-report.md`（rev2）；`requirement-workspace/intents/REQ-012-safety-report.md`（rev2）；`docs/prototype/stories.html` S14 rev2「举报入口与回执」；`openspec/changes/refine-safety-report/preview/safety-report.html`（B · 页头右上）；Living Spec `openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」；`frontend/src/safety/{SafetyNote.tsx,ReportModal.tsx}`、`trips/TripDetailPage.tsx`、`chat/ChatPage.tsx`、`experiences/ShareExperiencePage.tsx`、`i18n/tripMessages.ts`；`backend` `ReportController` / `ReportServiceImpl`；`openapi.yaml` 0.8.1；`e2e/tests/companions.spec.ts`、`profiles.spec.ts`
- **工具校验：** `openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`；`openspec show refine-safety-report --json` → `deltaCount: 2`

## 评审结论

**Pass**

rev2 把范围从「提示 + 举报」正确收敛为「两个页头入口 + 弹窗」，并明确记录了撤回动作：`In scope` 重编为 ①–⑧、③ 专门写「不渲染提示」、`Out of scope` 增列「重新引入安全提示」、`Living Spec` 行改为 REMOVED + ADDED 口径。六段结构（问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险）齐全，capability 类型与 Delta 实际结构一致，验收信号可观察，无 BLOCKER。4 条 SUGGESTION 建议在 P3 / P4 收口，不阻断。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| P2-01 | SUGGESTION | `@rule:spec-first` | 「验收信号」第 8 条 | 把 `openspec validate` 与「前端构建 / 单测 / 后端回归 / E2E 全绿」压成一条信号，且未点明 `companions.spec.ts` L136 的旧回执断言必须同批更新才算通过；执行时容易只跑 validate 就宣布达标 | 拆成两条：8a = `validate --strict` 通过且 `deltaCount: 2`；8b = 前端 / 后端测试全绿，含 E2E 回执文案与页头入口断言 | 提案「验收信号」8；`e2e/tests/companions.spec.ts:136` |
| P2-02 | SUGGESTION | `@rule:sdd-artifacts` | 「影响面」表 | 表内未列本次实际改动的 `docs/prototype/stories.html` S14、`requirement-workspace/{intents,stories.md,deep-dive.md,impact-brief.md,registry.md,handoff.md}`；读者按表会以为只改代码与能力规格，归档时容易漏同步上游文档 | 补两行：Story = S14 rev2 三条 AC 改写；上游分析 = intent / stories / deep-dive / impact-brief / registry / handoff 同步 | 本 change 已实际修改上述文件；`docs/prototype/stories.html` S14 |
| P2-03 | SUGGESTION | `@rule:artifact-review-gate` | 头部「修订记录」 | 只写 rev2 内容变化，未记录「rev1 的 G1 Pass 已作废、rev2 待具名重签」这一流程事实；单看提案会误判门禁已过 | 在「修订记录」补一句：rev1 G1 Pass 不覆盖 D5，rev2 需 IO / SA 重签 | `g1-decision.md`「Revision 2 — G1 重开」 |
| P2-04 | SUGGESTION | `@rule:sdd-artifacts` | 「残余风险」表「提示移除后学生缺少边界提醒」行 | 该风险为「接受型」，但没写接受人与复评触发点，后续无法判断是遗漏还是已决断 | 注明由 SA（Karena）在 G1 rev2 接受；如需补回，另开需求并在 REQ-012 §8 追溯 | 提案「残余风险」；REQ-012 rev2 §8 non-blocking 行 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| proposal 是否同时给出问题、范围、影响面、决策、验收信号、残余风险 | 是（六段齐全，rev2 已重写） |
| 是否声明 capability 与 REMOVED / ADDED / MODIFIED 类型 | 是：`trip-companions`（REMOVED + ADDED），与 `openspec show` 的 `deltaCount: 2` 一致 |
| 是否越界定义后端 / 契约 / 迁移变更 | 否：明确不改 `openapi.yaml` 0.8.1、`/reports` 与 `reports` 表 |
| 是否与 Living Spec 冲突 | 否：REMOVED 旧块 + ADDED 新块，保留 3 个基线场景；「安全提示常驻」的删除已在 Reason / Migration 写明 |
| 是否与 REQ-009 / `add-user-profiles` 的举报边界冲突 | 否：资料弹窗仍不含举报按钮，列为 out of scope |
| 是否覆盖故事 rev2 的 3 条 AC（页头入口 / 回执 / 非颜色图标） | 是：验收信号 1–2 对应入口（详情 / 聊天）、4 对应回执、1–3 含「不只靠颜色或图标」与无提示区断言 |
| 是否残留 rev1 的提示范围 | 否：`In scope` ①–⑧ 无提示条目，③ 明确「不再渲染」，`Out of scope` 增列「重新引入安全提示」 |

## 残余风险

- 回执文案变更会打破 `e2e/tests/companions.spec.ts:136` 的旧断言；L137 依赖 `.ant-modal-footer .ant-btn-primary`，回执态唯一按钮是否为 primary 尚未确认，需 P4 同批核对。E2E 未纳入 CI，回归依赖本地执行。
- 提示全部移除是本 change 最大的产品取舍（D5）。提案已记为接受型风险，但接受人尚未具名落到 G1 rev2 签署里。
- 页头入口在 390 窄屏与长标题下的换行形态只有预览验证，尚无自动化断言。
- 举报原因按目标类型分表（原型形态）仍是后续候选，当前以用户裁决 D2 的四类为准。

## 批准记录

- **批准人：** Jacky（AO）
- **批准时间：** 2026-11-16T16:35+08:00
- **批准范围：** 批准本 proposal（rev2）并进入下一步；P2-01 / P2-02 / P2-03 / P2-04 四条 SUGGESTION 留待 P3 / P4 收口，不阻断。
- **说明：** 本批准只覆盖工件评审，不等于 G1 通过。G1 rev2 仍需 IO Wanye / SA Karena 就 D5 具名重签（见 `g1-decision.md`「Revision 2」）。