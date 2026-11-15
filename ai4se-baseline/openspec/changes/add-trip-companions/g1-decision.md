# G1 decision — add-trip-companions

- **Gate:** G1（Align）
- **Change:** `add-trip-companions`（capability `trip-companions`，REQ-003）
- **Timestamp:** 2026-11-15T16:55+0800
- **Recorded by:** Jay（AO / current developer）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 已按原型重写 In/Out scope 与 14 条对齐决议 |
| Delta Spec | [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md) | 6 Requirement / 22 Scenario；`openspec validate --strict` valid |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 4 Pass + 1 Partial（无阻塞） |
| Prototype evidence | `docs/prototype/stories.html` S07–S14、`store.js` | 冲突裁决基线 |
| Upstream | `REQ-003`、`impact-brief.md`、`deep-dive.md` | 依赖 REQ-002（已归档），两阶段建议 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-003 一致；批量处理、保存筛选、WS/已读、举报后台已排除 | `proposal.md` §范围 |
| Ambiguity | 匹配计分与参照、申请说明、取消/退出规则、聊天只读、我的旅行分组均已落为 Scenario | `spec.md`、`dov-ac-review.md` |
| Conflict | 原型与初版提案的 14 处差异以原型为准收口 | `proposal.md#原型对齐决议` |
| Traceability | 每条 Requirement 可追溯到 REQ-003 与闭环文档 §5.1.5–5.1.9 | `dov-ac-review.md` |
| Residual risk | 首页默认排序改为匹配度；`joined_count` 唯一写入方；轮询间隔；发起人退出提示 | `dov-ac-review.md#残余风险` |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞项：

| 项 | Owner | 处理时机 |
|---|---|---|
| 首页默认按匹配度排序（覆盖 trip-plans 的默认） | Jay | 设计阶段写入 design |
| `joined_count` 仅经 trip-plans 服务更新 | Jay | 实现阶段 |
| 轮询间隔（建议 5s）与已结束只读 | Jay | 设计阶段 |
| 批量处理 / 保存筛选 | Jay | 后续增强，不在本 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：用户于 2026-11-15 提供角色名单并确认继续推进 P2。