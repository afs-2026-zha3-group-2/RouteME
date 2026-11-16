# proposal 评审报告 — refine-safety-report

- **工件：** `openspec/changes/refine-safety-report/proposal.md`
- **change-id：** `refine-safety-report`
- **需求条目：** `requirement-workspace/requirements/REQ-012-safety-report.md`（REQ-012 / S14）
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:pii-scrubbing`；基线 `origin/main` + 工作区 `HEAD@294f487`）
- **评审输入：** 提案正文；`requirement-workspace/requirements/REQ-012-safety-report.md`；Living Spec `openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」；原型 `docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()`；`frontend/src/safety/SafetyNote.tsx`、`ReportModal.tsx`、`trips/TripDetailPage.tsx`、`chat/ChatPage.tsx`、`i18n/tripMessages.ts`；`backend` `ReportController` / `ReportServiceImpl`；`openapi.yaml` 0.8.1；`e2e/tests/companions.spec.ts`、`profiles.spec.ts`

## 评审结论

**Pass**

提案把 S14 的展示缺口（单段提示 → 三条文本、回执文案、本人行程举报入口、身份保密与紧急求助说明）与「不改后端 / 契约 / 迁移」的边界写清楚了，范围与需求条目 §3 一致，验收信号可观察，风险项与现存测试债务对应。无 BLOCKER，4 条 SUGGESTION 建议在 P2 / P3 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| P-01 | SUGGESTION | `@rule:sdd-artifacts` | 「影响面」`SafetyNote.tsx` 行 | 提案只在该行写「保留无 `onReport` 的简化调用」，未点明体验发布页是当前第二调用点；P4 重构列表结构时容易把该页一起改成三条或误删按钮形态 | 在该行补充「`ShareExperiencePage` 继续渲染无举报按钮的简化提示」，与「Out of scope」呼应 | `frontend/src/experiences/ShareExperiencePage.tsx:142`（`<SafetyNote />` 无 `onReport`） |
| P-02 | SUGGESTION | `@rule:pii-scrubbing` | 验收信号 7 | 隐私红线只写成「不出现电话、证件、精确住址」，没有给验证手段，P4 可能只做人工走查 | P3 复用 `profiles.spec.ts` 的词表黑名单（`电话：` / `身份证` / `门牌`）扩到详情 / 聊天安全区，并对举报弹窗补断言 | `e2e/tests/profiles.spec.ts:81` 已有同类黑名单断言 |
| P-03 | SUGGESTION | `@rule:spec-first` | 范围第一条 / 第二条 | 详情页回退文案「尚未填写，出发前请在聊天中确认」与聊天页「待确认」是两套字面，提案未说明这是有意差异，P4 容易统一成一句而丢掉页面语境 | 在「决策」表补一行：两处回退文案按页面语境分别定义，统一放 `tripMessages` 单一来源 | 提案「In scope」①与②；原型 `ui.js` `safetyPanel()` / `chat-safety` |
| P-04 | SUGGESTION | `@rule:git-commit-conventions` | 「残余风险」最后一行 | 已记录阶段提交偏离，但未写 P1 提交信息形式，后续容易与仓库约定脱节 | P1 提交用 `docs(p1): refine-safety-report <description>`（`docs/sdd/README.md` 阶段提交约定） | `docs/sdd/README.md` 阶段提交小节；既有 `docs(p1): refine-trip-application ...` 先例 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| proposal 是否同时给出问题、范围、影响面、决策、验收信号、残余风险 | 是（六段齐全） |
| 是否声明 capability 与 MODIFIED / ADDED 类型 | 是：`trip-companions`（MODIFIED） |
| 是否越界定义后端 / 契约 / 迁移变更 | 否：明确不改 `openapi.yaml` 0.8.1、`/reports` 与 `reports` 表 |
| 是否与 Living Spec 冲突 | 否：只替换「我的旅行聚合与最低安全能力」块，保留「我的旅行」两个场景 |
| 是否与 REQ-009 / `add-user-profiles` 的举报边界冲突 | 否：资料弹窗仍不含举报按钮，列为 out of scope |
| 是否覆盖故事 3 条 AC（三条提示 / 举报回执 / 非颜色图标表达） | 是：验收信号 1–4 逐条对应 |

## 残余风险

- 回执文案变更会打破 `e2e/tests/companions.spec.ts:130` 的旧断言，需与实现同批更新；E2E 未纳入 CI，回归依赖本地执行。
- 举报原因按目标类型分表（原型形态）仍是后续候选，当前以用户裁决 D2 的四类为准，存在「原型比产品更细」的认知差。
- 安全提示依赖 `trip-plans.meeting_area` 的填充质量；空值回退只是显示层兜底，不改变行程数据完整性。

## 批准记录

- **批准人：** Jacky（AO）
- **批准时间：** 2026-11-16T15:44+08:00
- **批准范围：** 批准本 proposal 并进入下一份工件（Delta Spec）与 P1 收口；SUGGESTION 项 P-01 / P-02 / P-03 / P-04 留待 P3 / P4 收口，不阻断。