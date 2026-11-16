# G1 decision — add-destination-area-filters

- **Gate：** G1（Align）
- **Change：** `add-destination-area-filters`（REQ-007；`trip-plans` MODIFIED、`trip-experiences` MODIFIED）
- **Timestamp：** 2026-11-16T11:10+0800
- **Recorded by：** Jay（AO），依据用户 2026-11-16 会话确认（Decision=Conditional；IO/SA 签署人沿用）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | Why / What Changes / In-Out scope / Self-Upstream-Downstream 影响面 / 验收信号齐全 |
| Delta Spec — `trip-plans` | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 3 Requirement（ADDED ×3 + REMOVED ×1）/ 20 Scenario；`openspec validate --strict` valid |
| Delta Spec — `trip-experiences` | [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | 1 Requirement（MODIFIED）/ 13 Scenario；`openspec validate --strict` valid |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 5/5 Pass；DoV 4 Pass + 1 Partial（外部依赖，无阻塞） |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Partial；BLOCKER 0 / WARNING 4 / SUGGESTION 1 |
| Requirements | `requirement-workspace/requirements/REQ-007-destination-area-filters.md` | §4 17 场景；§8 blocking 10/10 resolved；DoR BLOCKER 0 |
| Impact brief | `requirement-workspace/impact-brief.md` §11 | as-is→delta、blast radius、风险、归档顺序 |
| Deep-dive | `requirement-workspace/deep-dive.md`（REQ-007 段） | ①–④ 四表 + A0 ⑨–⑫ 全过 |
| Story | `requirement-workspace/stories.md` REQ-007 段、`stories/REQ-007-destination-area-filters.story.md` | S1–S4；1:1 追溯 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 本 change 只覆盖两个首页视图的筛选 + 数据底座/展示；发布页目的地字段明确归 `add-trip-publish` 目的地修订 | `proposal.md` §范围 / §Self-Upstream-Downstream；`dov-ac-review.md` DoV-1 |
| Ambiguity | 目的地代码/名称/省名、必须选到市、港澳台细分、搜索移除、体验卡无日期、V10/0.7.0 均已裁定并写入 Delta | `REQ-007 §8`；`dov-ac-review.md` §规格解释裁决 |
| Conflict | `refine-inspiration-home` 同改两 requirement 且未归档；`add-trip-publish` 目的地修订未实现、其 G1/G2 基于修订前范围；Living Spec 仍有"关键词"术语漂移 | `consistency-lint.md` L-02/L-03/L-04 |
| Traceability | REQ-007 §4 17 条场景全部有落点；#7/#8 归 A，其余归本 change | `dov-ac-review.md` §需求映射 |
| Residual risk | refine 搜索测试、A 目的地修订、V10 外键、匹配 code 回归、v5 数据时效 | `dov-ac-review.md` §残余风险 |

## Decision

**Conditional**

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | `refine-inspiration-home` 的 owner 把搜索空态 E2E 改为目的地/日期筛选，并先归档 | AO / BA | 本 change 归档前 |
| C2 | `add-trip-publish` 目的地修订的 5 条待完成任务在 B 数据底座合入后执行；A 的 G1/G2 重评；A 在本 change 之后归档 | AO / SA | P4 / 归档前 |
| C3 | V10 迁移与 `trip_experiences` 外键处理在 P3 设计中验证，保证体验数据不丢 | Dev | P3 design |
| C4 | 匹配打分从名称比较改为 code 比较，补 `add-match-reason` 回归 | Dev | P3/P4 |
| C5 | Living Spec「筛选变化重置分页」中的"关键词"在本 change/refine 归档合并时收敛 | AO / BA | 归档合并 |
| C6 | 契约升 0.7.0、三接口删除 `q`、响应新增 code/province 字段，在 P3 任务中先行 | Dev | P3 tasks |

**Conditional 已列 remediation 与 owner；无未决 blocking 歧义。**

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | WANYE |
| SA | JACKY、KARENA |
| AO（当前开发） | JAY |
| VL | NEAL |
| SM | LEWIS |

签署来源：用户 2026-11-16 会话确认沿用该名单；与远程 `docs/sdd/README.md`、`add-trip-publish` / `add-match-reason` G1 记录一致。

## Next

- Decision = Conditional → 可进入 P3（`/sdd:atdd-design` → `/sdd:task-plan`），C1–C6 作为条件跟踪。
- 本 change 归档前必须满足 C1/C2；本 change 不归档其它 change。
- 本记录不是 G2/G3 结论。
