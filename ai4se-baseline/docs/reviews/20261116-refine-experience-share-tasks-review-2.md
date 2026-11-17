# tasks 评审报告（第 2 次 / R2） — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/tasks.md`「R2 任务」
- **change-id：** `refine-experience-share`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:web-testing`、`@rule:git-commit-conventions`）
- **重评原因：** R2 新增 6 条任务（T8–T13），另出本报告，不覆盖 `tasks-review.md`
- **评审输入：** `tasks.md`「R2」；`design.md` §10；`atdd-design.md` §7；Delta 的「分享页布局与原型一致」

## 评审结论

**Pass**

T8–T13 分层清晰（日期格式 / 图标 / 页面重构 / 样式 / E2E / 文档），每条有验证命令与覆盖场景；无契约任务；与既有 T1–T7 不重叠。无 BLOCKER；2 条 SUGGESTION 在 P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| R2-T-01 | SUGGESTION | `@rule:web-testing` | T12 | 未说明既有 `shares an experience…` 用例需从 `.share-note` 改到 `.publish-side` | P4 同批改选择器，并在验证报告列出改动 | `e2e/tests/experiences.spec.ts` |
| R2-T-02 | SUGGESTION | `@rule:git-commit-conventions` | R2 全表 | 未写阶段提交信息 | P4 提交用 `feat(p4): refine-experience-share align the share page with the prototype` | `docs/sdd/README.md` |

## 一致性检查

| 检查 | 结论 |
|---|---|
| 每条 R2 约束至少 1 任务 | 双栏/分组 → T10；卡片 → T10/T11；图标 → T9；日期 → T8；断点 → T11/T12 |
| 一任务一层 | 通过（frontend ×4、e2e ×1、docs ×1） |
| 与 ATDD 对应 | T8→U5–U7；T9→E17；T10→E13–E16；T11→E13/E14；T12→E13–E17 |
| 是否含 out-of-scope | 否 |
| 是否有验证命令 | 全部有 |

## 残余风险

- T10 的页面重构会改动既有 E2E 的定位器，需同批更新。
- T8 抽取日期格式会同时影响行程卡，`trips.spec.ts` 需回归。

## 批准记录

- **批准人：** Neal（VL，审批）＋ Jay（AO，作者确认）
- **批准时间：** 2026-11-16T21:04+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 R2 design 与 tasks」
- **批准范围：** 批准 R2 任务进入 P4 实现；R2-T-01 / R2-T-02 留待 P4 收口。