# proposal 评审报告 — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/proposal.md`
- **change-id：** `refine-experience-share`
- **需求条目：** `requirement-workspace/requirements/REQ-004-trip-experiences.md`（REQ-004 / S16，issue #18）
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:pii-scrubbing`；基线 `main@25b60f7`，分支 `feature/refine-experience-share`）
- **评审输入：** 提案正文；`requirement-workspace/requirements/REQ-004-trip-experiences.md`；Living Spec `openspec/specs/trip-experiences/spec.md`；原型 `docs/prototype/ui.js` `share()` / `expCard()`；`frontend/src/experiences/ShareExperiencePage.tsx`、`ExperienceCard.tsx`、`i18n/tripMessages.ts`、`styles.css`；`backend` `ExperienceController` / `ExperienceServiceImpl` / `pojo/TripExperience`；`openapi.yaml` 0.8.1；`e2e/tests/experiences.spec.ts`

## 评审结论

**Pass**

提案把 S16 的现状（`add-trip-experiences` 已交付主干）与本次四处缺口（分享页结构、体验卡封面、资格提示不可区分、AC 缺 E2E 证据）分开了，范围与「不改后端 / 契约 / 迁移」的边界一致，验收信号可观察，残余风险与既有测试债务对应。无 BLOCKER，4 条 SUGGESTION 建议在 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| P-01 | SUGGESTION | `@rule:sdd-artifacts` | 「影响面」`ShareExperiencePage.tsx` 行 | 未写明 hero 的「同行人数」取哪个字段，P3 容易在 `participants.length`（含发布者）与 `joined_count`（不含发布者）之间摇摆 | 在 P3 `design.md` 固定为 `trip.participants.length`（与原型 `S.count()` 同口径），并在验收信号 1 注明 | `docs/prototype/ui.js` `share()`：`S.count(t.id) + ' 人同行'`；`ShareExperiencePage` 已有 `trip.participants` |
| P-02 | SUGGESTION | `@rule:web-coding-style`（文案与国际化） | 「影响面」`tripMessages.ts` 行 | 只写「移除被替代的单段文案」，未说明 `experienceGoesTo` / `experiencePrivacy` 是删除还是保留为列表项文本 | P3 明确两键改为数组（去向 3 条 / 边界 2 条），组件只 map 渲染，不新造第二来源 | `tripMessages.ts:184-185` |
| P-03 | SUGGESTION | `@rule:web-testing` | 「验收信号」3 与 6 | 两条信号没有对应测试层级（组件测试 / E2E 各断言哪一句），P4 容易只做人工走查 | P3 `atdd-design.md` 给资格提示组件测试与 E2E 断言矩阵（未结束 / 未参加 / 重复提交） | `e2e/tests/experiences.spec.ts:97-109` 现只断言单句不可用文案 |
| P-04 | SUGGESTION | `@rule:web-coding-style`（样式） | 「决策」体验卡封面 | 未说明封面高度与栅格影响，首页「旅行体验」的骨架与分页断言依赖卡片高度 | P3 固定封面高度（建议 64–72px）并说明 `e2e` 的 `.exp-card` 断言不变 | `e2e/tests/experiences.spec.ts:150-179`（骨架与卡片计数） |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| proposal 是否同时给出问题、范围、影响面、决策、验收信号、残余风险 | 是（六段齐全，另有 `## Why` / `## What Changes`） |
| 是否声明 capability 与 MODIFIED / ADDED 类型 | 是：`trip-experiences`（MODIFIED + ADDED） |
| 是否越界定义后端 / 契约 / 迁移变更 | 否：明确不改端点、`EXPERIENCE_NOT_ALLOWED`、`openapi.yaml` 0.8.1 与 `trip_experiences` 表 |
| 是否与 Living Spec 冲突 | 否：MODIFIED 只收敛 2 条既有 Requirement，既有场景名保留；新增分享页说明 Requirement 与原「对已结束且参加过的行程发布游后体验」不重叠 |
| 是否与已归档 `add-trip-experiences` 冲突 | 否：不重复定义资格、字数口径、两处展示与参考发布；只补展示层缺口 |
| 是否覆盖故事 4 条 AC | 是：AC1（入口隐藏 + 后端拒绝）→ 验收信号 3/4；AC2（两处展示）→ 验收信号 5；AC3（重复发布）→ 决策「重复提交」+ 验收信号 6；AC4（纯文字 + 内置封面）→ 验收信号 5 |
| PII 红线 | 是：分享边界只提醒不采集；验收信号 8 显式禁止电话 / 证件 / 精确住址 |

## 残余风险

- 体验卡加封面会改变首页体验视图的卡片高度，`experiences.spec.ts` 的骨架与计数断言需同批复验；E2E 未纳入 CI，回归依赖本地执行。
- 资格提示拆分需同步既有 E2E 的单句断言（`只有已结束、并且你实际参加过的行程才能发表体验`），漏改会红。
- 与未归档的 `refine-inspiration-home` / `add-destination-area-filters` 同改 `trip-experiences` 展示面，归档顺序需串行；本 change 只加封面条，不改筛选与分页。
- 行程状态已由 `add-trip-completion` 扩为四态，「未结束」文案必须覆盖 `ongoing`，否则旅行中的行程会显示成「招募中」。

## 批准记录

- **批准人：** WAYNE（IO/SA）
- **批准时间：** 2026-11-16T16:29+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 proposal」并授权进入 Delta Spec 收口
- **批准范围：** 批准本 proposal 并进入 Delta Spec 收口；SUGGESTION 项 P-01 / P-02 / P-03 / P-04 留待 P3 / P4 收口，不阻断。