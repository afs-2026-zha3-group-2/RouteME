# G1 decision — refine-inspiration-home

- **Gate:** G1（Align）
- **Change:** `refine-inspiration-home`（`trip-plans` MODIFIED、`trip-experiences` MODIFIED，REQ-005 / S03）
- **Timestamp:** 2026-11-16T09:57+0800
- **Recorded by:** Jay（AO / current developer）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、决策与验收信号齐全 |
| Delta Spec — `trip-plans` | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 1 Requirement / 8 Scenario；MODIFIED |
| Delta Spec — `trip-experiences` | [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | 1 Requirement / 7 Scenario；MODIFIED |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4 Pass + 1 Partial；DoV 4 Pass + 1 Partial；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Partial（手工检查上限）；BLOCKER 0 / WARNING 2 / SUGGESTION 3 |
| Requirements | `requirement-workspace/requirements/REQ-005-inspiration-home.md` | §4 十条场景；§8 blocking OQ = 0 |
| Impact brief | `requirement-workspace/impact-brief.md` §9 | 影响面、风险与拆分边界 |
| Story | `requirement-workspace/stories/refine-inspiration-home.story.md` | S03 / P0 / 迭代 1 / 3 点；页面级垂直切片 |
| Living Specs | `openspec/specs/trip-plans/spec.md`、`openspec/specs/trip-experiences/spec.md` | 被 MODIFIED 的基线 |
| Implementation evidence | `frontend/src/home/HomePage.tsx`、`trips/TripCard.tsx`、`experiences/ExperienceCard.tsx`、`i18n/tripMessages.ts`、`V4__seed_demo_trips.sql`、`V8__create_trip_experiences.sql` | 四项缺口的现状证据与 6 条种子数据 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-005 一致：默认视图命名、卡片字段、状态非颜色信号、体验卡「已结束」标识、双视图空 / 加载态；无新端点、无迁移、无状态机 | `proposal.md` §范围 / §影响面；`dov-ac-review.md` DoV-1 |
| Ambiguity | 无未决歧义：非颜色信号按「文字 + 第二信号」双条件解释；体验空态 CTA 指向新建行程页；视图切换为客户端状态且不做深链 | `dov-ac-review.md` §规格解释裁决 1–7 |
| Conflict | 两项治理性告警：① 一个 change 修改两个 capability（`@rule:sdd-artifacts`，阻断点为归档前）；② 「已取消」状态在枚举中不存在（既有文档漂移）。两者均不影响本 change 的验收口径 | `consistency-lint.md` L-01 / L-02 |
| Traceability | REQ-005 §4 十条场景 10/10 有 Delta 落点；每条 Requirement 可回溯到 proposal §范围 | `dov-ac-review.md` §需求映射 |
| Residual risk | 非颜色信号实现退化、默认视图标签尚无测试锁定、E2E 选择器 `.experience-card` 与 `.exp-card` 漂移、体验视图筛选缺口（out of scope） | `dov-ac-review.md` §残余风险；`consistency-lint.md` L-04 |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞项：

| 项 | Owner | 处理时机 |
|---|---|---|
| P3 设计固定一种 DOM 可断言的第二非颜色信号（图标 / 形状 / 进度满格等），不得只用颜色深浅 | AO（Jay） | P3 `design.md` / ATDD design |
| 在 `e2e/tests/{trips,experiences}.spec.ts` 补默认视图标签、双空态 CTA、已结束标识与非颜色信号断言（现有测试未锁定默认标签） | AO（Jay） | Apply |
| 修复体验视图 E2E 选择器 `.experience-card` → 组件实际类名 | AO（Jay） | P3 任务 / Apply |
| SA 追认「同一页面垂直切片」的双 capability 例外，或归档前拆分 change | SA | 归档前（G3） |
| 归档合并时收敛「已取消」表述，使规格与 `TripStatus` 枚举一致 | AO + SA | 归档合并 |
| 体验视图日期 / 排序筛选保持 out of scope，不纳入本 change 回归断言 | BA | 已记录，无需动作 |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | WAYNE |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：沿用 2026-11-15 归档 G1 记录中用户提供的角色名单；用户于 2026-11-16 指示继续执行 `/sdd:p2`（包含 G1）。若角色名单发生变更，以变更后的具名签署为准并在本文件更新。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- L-01 / L-02 作为归档前治理项跟踪，不阻塞 P3。