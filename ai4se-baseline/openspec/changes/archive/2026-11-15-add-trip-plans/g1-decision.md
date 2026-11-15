# G1 decision — add-trip-plans

- **Gate:** G1（Align）
- **Change:** `add-trip-plans`（capability `trip-plans`，REQ-002）
- **Timestamp:** 2026-11-15T15:10+0800
- **Recorded by:** Jay（AO / current developer）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 已按原型重写 In/Out scope 与「原型对齐决议」 |
| Delta Spec | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 5 Requirement / 21 Scenario；`openspec validate --strict` = valid |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 4 Pass + 1 Partial（无阻塞） |
| Prototype evidence | [`docs/prototype/`](../../../docs/prototype/index.html)（S03–S05、`store.js`） | 冲突裁决基线 |
| Upstream requirements | [`REQ-002`](../../../requirement-workspace/requirements/REQ-002-trip-plans.md)、[`impact-brief`](../../../requirement-workspace/impact-brief.md)、[`deep-dive`](../../../requirement-workspace/deep-dive.md) | 依赖链起点，无并行上游 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-002 一致；原型额外的编辑/删除/取消、保存筛选、拖拽、批量、撤销、匹配度打分已显式排除 | `proposal.md` §范围、§原型对齐决议 |
| Ambiguity | 筛选语义、日期区间、默认列表、发布约束、已结束触发、申请入口资格均已落为可测 Scenario | `spec.md`、`dov-ac-review.md` |
| Conflict | 原型与初版 proposal 的 9 处冲突均以原型为准收口，并有逐条记录 | `proposal.md#原型对齐决议` |
| Traceability | 每条 Requirement 可追溯到 REQ-002 与闭环文档章节；AC 均可观察 | `dov-ac-review.md` AC/DoV 表 |
| Residual risk | 匹配度排序、结束行程时的待处理申请、NFR 测试均为后续项，已指定 owner（Jay） | `dov-ac-review.md#残余风险` |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞残余项（不影响进入 P3）：

| 项 | Owner | 处理时机 |
|---|---|---|
| 「按匹配度」排序接入 | Jay | REQ-003 落地时 |
| 结束行程时拒绝待处理申请 | Jay | REQ-003 落地时 |
| NFR 测试 | Jay | 出现 SLA / 可观测性要求时 |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：用户于 2026-11-15 提供角色名单并确认继续推进 P2。