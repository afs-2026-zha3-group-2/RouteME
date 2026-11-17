# proposal 评审报告（第 2 次） — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/proposal.md`
- **change-id：** `refine-experience-share`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（重评；规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`）
- **重评原因：** P2 一致性检查（`consistency-lint.md` L-01）发现原「ADDED 1 条 Requirement」与 Living Spec 既有「我的旅行分享入口与分享边界」重叠，Delta 改为 3 条 MODIFIED；proposal 的「能力」「What Changes」「影响面」「决策」四处随之收敛，属语义变更，按 `@rule:artifact-review-gate` 不得复用第 1 次 Pass，另出本报告（不覆盖 `docs/reviews/20261116-refine-experience-share-proposal-review.md`）
- **评审输入：** 修订后的 proposal；第 1 次评审报告；`consistency-lint.md`；`dov-ac-review.md`；Living Spec `openspec/specs/trip-experiences/spec.md`

## 修订对照

| 位置 | 第 1 次 | 第 2 次 |
|---|---|---|
| 能力 | `trip-experiences`（MODIFIED + ADDED） | `trip-experiences`（MODIFIED） |
| What Changes 第 1 条 | 2 条 Requirement + ADDED 1 条 | 3 条既有 Requirement 收敛（发布资格与不可用提示 / 内容口径与内置封面 / 我的旅行分享入口与分享边界） |
| 范围 | 写「MODIFIED 2 + ADDED 1」 | 写「MODIFIED 3 条」 |
| 影响面 Living Spec 行 | 替换 2 条 + 追加 1 条 | 替换 3 条，既有场景名全保留（「分享页面提示隐私边界」内容扩充） |
| 决策 capability 行 | MODIFIED + ADDED | MODIFIED，3 条 Requirement，不新增平行权威 |

## 评审结论

**Pass**

修订把「分享页说明」并入既有 Requirement，消除了平行权威；`## Why` / `## What Changes` / 范围 / 影响面 / 决策 / 验收信号之间自洽，验收信号 1–8 仍逐条可观察，未新增或删减交付面。第 1 次的 4 条 SUGGESTION 仍有效，留待 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| P-01 | SUGGESTION | `@rule:sdd-artifacts` | 「范围」In scope 第 5 条 | 仍写「为 `trip-experiences` 写 MODIFIED … 保留 Living Spec 既有场景名」，未点明「我的旅行分享入口与分享边界」的「分享页面提示隐私边界」场景内容会扩充 | 保持现文案；在 P3 `design.md` 与 P5 归档说明中写明该场景名称保留、内容扩充 | `openspec/specs/trip-experiences/spec.md:160`；Delta 同场景 |
| P-02 | SUGGESTION | `@rule:web-coding-style` | 「残余风险」资格提示行 | 只写「旧断言失效需同批改为两套文案」，未指出 E2E 中具体断言位置 | P4 提交说明里点出 `e2e/tests/experiences.spec.ts` 的 `keeps experience entry points honest` 用例 | `e2e/tests/experiences.spec.ts:97-109` |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| proposal 六段 + `## Why` / `## What Changes` | 齐全 |
| capability 与操作类型 | `trip-experiences`（MODIFIED，3 条），与 Delta `deltaCount: 3` 一致 |
| 是否越界定义后端 / 契约 / 迁移 | 否 |
| 是否与 Living Spec 冲突 | 否（由 ADDED 改为 MODIFIED 后） |
| 是否覆盖故事 4 条 AC | 是（AC1→3/4、AC2→5、AC3→决策+6、AC4→5） |

## 残余风险

- 两套不可用文案与既有 E2E 单句断言冲突，漏改即红。
- 体验卡封面改变首页卡片高度，需同批复验骨架与计数断言。
- 与 `refine-inspiration-home` / `add-destination-area-filters` / `add-trip-completion` 同触 `trip-experiences` 或状态口径，归档需串行。

## 批准记录

- **批准人：** WAYNE（IO/SA）
- **批准时间：** 2026-11-16T16:35+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准修订后的 proposal」并授权进入 G1
- **批准范围：** 批准修订后的 proposal 并进入 G1 签署。