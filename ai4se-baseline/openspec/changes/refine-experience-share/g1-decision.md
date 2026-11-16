# G1 decision — refine-experience-share

- **Gate:** G1（Align）
- **Change:** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16，issue #18）
- **Timestamp:** 2026-11-16T16:35+0800
- **Recorded by:** Jay（AO），按用户在 2026-11-16 会话中给出的签署人（IO=Wanye、SA=Wanye）与决策结论（Pass）记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题 / In-Out scope / 影响面 / 决策（6 行）/ 验收信号（8 条）/ 残余风险齐全；能力 `trip-experiences`（MODIFIED，3 条 Requirement）；后端 / 契约 / 迁移不变 |
| Delta Spec — `trip-experiences` | [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | 3 Requirement / 12 Scenario；全部 MODIFIED；`openspec validate refine-experience-share --strict` valid；`openspec show --json --deltas-only` → `deltaCount: 3` |
| Living Spec baseline | `openspec/specs/trip-experiences/spec.md`（7 Requirement / 22 Scenario） | 被替换的 3 条 Requirement 的既有场景名 10/10 保留 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ-004 §4 映射 8/8；Living Spec 基线 10/10；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4（L-01、L-02 已在 P2 收口）/ N/A 6 |
| P2 quality report | `docs/ai4se-plugins/20261116-165500-quality-checklist-report.md` | P2 required 3/3 Pass；P2-4 Pass；Overall Pass |
| Requirements | `requirement-workspace/requirements/REQ-004-trip-experiences.md` | 六字段 + 8 场景；blocking OQ 0 |
| Story | `requirement-workspace/stories.md`「REQ-004（S16）」 | S16 / 迭代 3 / P1 / 3 点 / 游后分享页 |
| Artifact reviews | `docs/reviews/20261116-refine-experience-share-{proposal,spec}-review.md`（第 1 次）与 `-review-2.md`（重评） | 第 1 次均 Pass；P2 修订（ADDED → MODIFIED）后重评均 Pass，Wanye 批准 2026-11-16T16:35+08:00 |
| Baseline change | `openspec/changes/archive/2026-11-15-add-trip-experiences/` | 已归档；资格校验、发布 / 修改、两处展示已存在，本 change 只改展示口径 |
| Implementation evidence | `RouteME/frontend/src/experiences/{ShareExperiencePage.tsx,ExperienceCard.tsx}`、`i18n/tripMessages.ts`、`styles.css` | 分享页只有返回链接 + 状态行 + 两段 `Alert`；`ExperienceCard` 无封面；`!canShare` 只有一句提示——与 proposal「问题」1–3 逐条对应 |
| Contract / backend evidence | `RouteME/openapi.yaml` 0.8.1；`ExperienceController` / `ExperienceServiceImpl` / `pojo/TripExperience` | `EXPERIENCE_NOT_ALLOWED`（403）、10–400 / ≤120 校验、upsert 语义已存在；无需改契约 |
| Prototype evidence | `docs/prototype/ui.js` `share()` / `expCard()`；`stories.html` S16 | 分享页 hero、去向三条、边界两条；S16 四条 AC |
| Lifecycle dependency | `add-trip-completion`（P4，`main@25b60f7`） | 行程四态；体验资格用 `status(clock.instant())`，未结束含 `ongoing` |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-004 / S16 一致：分享页 hero + 去向三条 + 边界两条、体验卡内置封面、两种不可用提示、重复提交即修改的 E2E 证据；无图片上传、无双栏布局、无 S17、无后端 / 契约 / 迁移 | `proposal.md` §范围 / §Out of scope；`dov-ac-review.md` DoV-1 |
| Ambiguity | 无未决阻塞：布局取单列、封面色调复用 `cover-*`、拒绝职责在服务端、重复提交维持 upsert 均已写入「决策」；同行人数与断言载体留 P3（L-03 / L-04） | `proposal.md`「决策」表；`consistency-lint.md` L-03 / L-04 |
| Conflict | 无阻塞冲突。① 初稿的 ADDED 与 Living Spec 既有 Requirement 重叠，P2 已改为 MODIFIED；② 与 `add-trip-completion` 的四态兼容（未结束含 `ongoing`）；③ 与 `refine-inspiration-home` / `add-destination-area-filters` 同触体验展示面，归档串行 | `consistency-lint.md` L-01 / X-2 / C5 |
| Traceability | REQ-004 §4 8/8 有落点（3 条由 Living Spec 既有 Requirement 承接）；被修改的 3 条 Requirement 既有场景名 10/10 保留；proposal 验收信号 1–8 均有对应场景或测试层 | `dov-ac-review.md` §REQ-004 §4 → Delta / Living Spec、§Living Spec 基线保留核对 |
| Residual risk | 两套不可用文案与既有 E2E 单句断言冲突；体验卡封面改变首页卡片高度；3 条 Requirement 同批替换需串行归档；封面是否满足「内置封面」口径需 P3 设计预览确认 | `dov-ac-review.md` §Residual risk；`consistency-lint.md` §Residual risks |

## Decision

**Pass**

## Conditions + owners

无整改条件。

## Follow-ups（非条件项，不阻断 G1）

| 项 | 来源 | Owner | 处理时机 |
|---|---|---|---|
| hero「同行人数」固定为 `trip.participants.length` 并写进设计 | lint L-03 | Jay（AO） | P3 `design.md` |
| 「体验条数不变」的断言载体（详情 `.experience-list li` / 首页 `.exp-card`） | lint L-04 | Jay（AO） | P3 `atdd-design.md` / P4 |
| 未结束提示的状态文案统一取 `statusLabel()`（含 `ongoing` → 旅行中） | spec 评审 2 S-03 | Jay（AO） | P3 / P4 |
| 「分享页面提示隐私边界」名称保留、内容扩充，归档说明写明 | proposal 评审 2 P-01、spec 评审 2 §残余风险 | Jay（AO）+ Wanye（SA） | P5 / G3 |
| 同步 `e2e/tests/experiences.spec.ts` 的 `keeps experience entry points honest` 用例 | proposal 评审 2 P-02 | Jay（AO） | P4 同批提交 |
| 服务端 `EXPERIENCE_NOT_ALLOWED` 与 `ExperienceControllerTest` / `ExperienceServiceTest` 回归保留 | 提案「决策 / 后端不变」 | Jay（AO） | P4 验证 |
| 分享页视觉走查（1440 / 768 / 390 × 浅 / 深色）与截图证据 | spec 评审 2 S-02、第 1 次 spec 评审 S-02 | Jay（AO） | P4 |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与跨能力影响：`trip-experiences`（MODIFIED，3 条）替换已归档能力的相应 Requirement，`trip-plans` 只读四态与目的地 / 日期 / 人数 | 2026-11-16 |
| SA | Wanye | 规格与验收口径：分享页 hero、去向三条、边界两条、两种不可用提示、体验卡内置封面、隐私红线 | 2026-11-16 |
| AO（当前开发） | Jay | 承接 P3–P4 实现与本地验证；follow-up 按上表收口 | 2026-11-16 |

签署来源：用户在 2026-11-16 会话中就 G1 签署人明确回答 **IO=Wanye、SA=Wanye**，并就决策结论选择 **Pass**。本 change 的 AO 为 Jay。

## Next

- Decision = Pass → P3（`atdd-design` → `task-plan` → 质量检查）。
- 7 条 follow-up 分别落入 P3 设计 / 任务、P4 测试矩阵与验证、P5 归档说明；无阻塞项。