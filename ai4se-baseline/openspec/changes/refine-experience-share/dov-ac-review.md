# AC / DoV review — refine-experience-share

- **Change:** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16，issue #18）
- **Reviewed artifact:** [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)（MODIFIED 3 Requirement / 12 Scenario）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-004-trip-experiences.md`、`requirement-workspace/stories.md`「REQ-004（S16）」、`openspec/specs/trip-experiences/spec.md`（Living Spec 基线，7 Requirement / 22 Scenario）、`docs/prototype/ui.js` `share()` / `expCard()`、`docs/prototype/stories.html` S16、`RouteME/frontend/src/experiences/{ShareExperiencePage.tsx,ExperienceCard.tsx}`、`RouteME/frontend/src/i18n/tripMessages.ts`、`RouteME/backend/src/main/java/routeme/service/impl/ExperienceServiceImpl.java`、`e2e/tests/experiences.spec.ts`
- **Timestamp:** 2026-11-16T16:45+0800
- **Reviewer:** Jay（AO）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate refine-experience-share --strict` → valid；`openspec show refine-experience-share --json --deltas-only` → `deltaCount: 3`（均 `MODIFIED`，`spec=trip-experiences`）

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | 3 条 Requirement 分别有 5 / 3 / 4 个 Scenario | 资格、内容口径、分享页说明均有独立场景 |
| AC-2 ACs are observable | Pass | 场景断言为可见文本或状态：两种不可用提示的字面量、体验条数不变、封面条 + 目的地名、hero 五项信息、去向三条、边界两条 | 无「正常工作 / 友好」类空泛表述 |
| AC-3 Negative / edge cases called out | Pass | 「行程未结束时拒绝分享」覆盖 `recruiting` / `full` / `ongoing`；「未参加行程时拒绝分享」；「内容不满足口径时拒绝」；「分享页面提示隐私边界」 | 两个拒绝原因各有场景，且都要求「不渲染表单」 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只约束展示内容与可观察结果；未规定组件拆分、CSS 类名或状态库 | 「不只用颜色或图标」来自原型 / Living Spec 既有约束，属无障碍要求 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches the change proposal | Pass | proposal「In scope」6 条 ↔ Delta 12 场景；「Out of scope」的图片上传、双栏布局、S17 预填、后端 / 契约 / 迁移在 Delta 中无对应场景 | 无静默扩张：`trip-plans` 仍只读 |
| DoV-2 Ambiguities listed or resolved | Pass | 「同行人数」口径、`experienceGoesTo` / `experiencePrivacy` 是否数组化、拒绝职责边界均已在 proposal「决策」与评审建议中给出方向，P3 收敛为设计条目 | 无阻塞歧义 |
| DoV-3 Role concerns noted (IO / SA) for residual risk | Pass | 见「Residual risk」；G1 需 IO + SA 具名签署（本次均为 WAYNE） | IO：`trip-experiences` MODIFIED 与已归档 `add-trip-experiences` 的替换边界；SA：展示口径与验收措辞 |
| DoV-4 No business implementation claimed as done | Pass | Delta 全为 SHALL / MUST 句式；本 change 未改生产代码（`git status` 只有文档与 openspec 工件） | 实现在 P4 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 见下两表：REQ-004 §4 8/8 有落点；Living Spec 3 条被修改的 Requirement 既有场景名 10/10 保留 | 无孤儿场景 |

## REQ-004 §4 → Delta / Living Spec 落点

| REQ-004 §4 | 落点 | 状态 |
|---|---|---|
| #1 分享资格（已结束且参加过） | Delta「具备资格时发布体验」 | 覆盖 |
| #2 无资格不可分享 | Delta「行程未结束时拒绝分享」+「未参加行程时拒绝分享」 | 覆盖（两种原因分别可观察） |
| #3 发布体验内容 | Delta「具备资格时发布体验」+「内容不满足口径时拒绝」 | 覆盖 |
| #4 详情页展示分享 | Living Spec「游后体验在原计划详情页展示」（本次不改） | 保留 |
| #5 首页展示分享 | Living Spec「灵感首页的旅行体验视图」（不改）+ Delta「无图片也能发布并展示内置封面」（补封面） | 覆盖 |
| #6 参考此行程发布（预填） | Living Spec「参考此行程发布以产生新灵感」（不改） | 保留 |
| #7 参考发布必填重填 | 同上 | 保留 |
| #8 图片增强项降级 | Delta「无图片也能发布并展示内置封面」 | 覆盖 |

**映射结论：8/8 有落点**（其中 3 条由 Living Spec 既有 Requirement 承接、不在本 delta 内）。

## Living Spec 基线保留核对

| 被修改的 Living Spec Requirement | 基线场景 | Delta 是否保留 |
|---|---|---|
| 对已结束且参加过的行程发布游后体验 | 具备资格时发布体验 / 行程未结束时拒绝分享 / 未参加行程时拒绝分享 / 发布者也可以分享 / 再次提交即修改 | 5/5 名称保留，内容收敛 |
| 游后体验的内容口径与纯文字降级 | 内容不满足口径时拒绝 / 以三档强度表达体感 / 无图片也能发布并展示内置封面 | 3/3 名称保留，「内置封面」写实 |
| 我的旅行分享入口与分享边界 | 已完成分组区分已分享与未分享 / 分享页面提示隐私边界 | 2/2 名称保留，「分享页面提示隐私边界」补第二条边界 |

**基线保留：10/10。** 新增 2 个场景（分享页展示行程概览、分享页说明体验去向），Delta 合计 12。

## Residual risk

- **IO：** Delta 替换 `trip-experiences` 3 条 Requirement；`refine-inspiration-home` / `add-destination-area-filters` 也改同一能力的首页视图，归档需串行，避免 living spec 合并顺序冲突。
- **SA：** 「未结束」口径依赖四态（`add-trip-completion` P4 已交付）；若状态机再扩，两套提示文案需复查。封面条是否算「内置封面」的验收口径需在 P3 设计预览中确认。
- **实施侧：** 既有 E2E 断言单句「只有已结束、并且你实际参加过的行程才能发表体验」，拆分为两套文案后必须同批更新，否则回归变红。
- **测试侧：** 「重复提交即修改」需要能观测体验条数（首页卡片计数或详情列表长度），P3 需指定断言载体，避免只断言文案。

## Verdict

**Pass** — AC 4/4、DoV 5/5、REQ-004 §4 8/8、Living Spec 基线 10/10。无 BLOCKER；P2 一致性检查发现并修复了「ADDED 与既有 Requirement 重复」的问题（见 `consistency-lint.md` L-01）。
## R2（2026-11-16 20:55）：布局与原型对齐

- **Reviewer:** Jay（AO）｜ **依据:** proposal.md「R2」、p0-baseline.md §9、原型 share() / styles.css
- **Delta 变更:** MODIFIED「我的旅行分享入口与分享边界」补布局与控件形态约束，新增场景「分享页布局与原型一致」（Delta 场景 12 → 13）。

| 项 | 结论 | 证据 |
|---|---|---|
| AC-1 每条 Requirement 有可测 AC | Pass | 新场景断言双栏 / 单列、三卡片、读屏单选语义 |
| AC-2 可观察 | Pass | 1440 双栏、≤900 单列、选中卡片底色、ole=radio |
| AC-3 负向 / 边界 | Pass | 窄屏不横向滚动；卡片仍可键盘切换 |
| AC-4 不夹带实现细节 | Pass | 页面只用「分组 / 卡片 / 单列」等可观察结构，不写类名或组件名 |
| DoV-1 与提案范围一致 | Pass | 与 proposal「R2 In scope」逐条对应；Out of scope（行为、契约、迁移）无场景 |
| DoV-2 歧义已消解 | Pass | 网格复用、卡片单选、图标来源、日期格式均在提案「决策」定稿 |
| DoV-3 角色关注点 | Pass | IO：无新增能力面；SA：布局约束与既有行为不冲突 |
| DoV-4 未宣称业务已实现 | Pass | Delta 全 SHALL/MUST；实现属 P4 |
| DoV-5 可追溯到提案 / 需求 | Pass | 布局要求源自原型 share() 与用户评审意见；行为要求沿用 P1 的 REQ-004 |

**R2 结论：Pass**（新增 1 场景；既有 12 场景未删改）。