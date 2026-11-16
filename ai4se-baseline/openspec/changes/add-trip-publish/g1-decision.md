# G1 decision — add-trip-publish

- **Gate：** G1（Align）
- **Change：** `add-trip-publish`（capability `trip-plans` MODIFIED，REQ-002 / S06）
- **Timestamp：** 2026-11-16T10:45+0800
- **Recorded by：** Jay（AO / current developer）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、读法裁定齐全 |
| Delta Spec | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 1 Requirement（MODIFIED）/ 11 Scenario |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 4 Pass + 1 Partial（无阻塞） |
| P1 阶段记录 | [`docs/sdd/add-trip-publish/p1-intent.md`](../../../docs/sdd/add-trip-publish/p1-intent.md) | 三项裁定（人数口径、字段级错误归属、选点约束） |
| Story / Requirement | issue #8、`requirement-workspace/requirements/REQ-002-trip-plans.md` | 故事与需求一致 |
| Contract | `RouteME/openapi.yaml` `TripCreateRequest` | `required` 6 项、`stops.minItems=2`、`capacity 2–12`、`tags.maxItems=5` |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 只收口 S06；S17、草稿、编辑/删除/取消、匹配原因均排除 | `proposal.md` §范围 |
| Ambiguity | 三项歧义已在 P1 裁定并写进 Delta Spec 主句，不再需要实现期猜测 | `p1-intent.md` §5、Delta Spec 主句 |
| Conflict | 故事「人数 ≥ 1」与实现「2–12」的读法差异已裁定为「含发布者、至少 1 位同行者」 | `p1-intent.md` §5 D1 |
| Traceability | 每条 Scenario 可映射回 issue #8 的验收条目 | `dov-ac-review.md` §需求 → 场景映射 |
| Residual risk | 身份桩、其它故事的 e2e 债、地名库约束 | `dov-ac-review.md` §残余风险 |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞项：

| 项 | Owner | 处理时机 |
|---|---|---|
| 端到端用例覆盖 `aria-invalid` 与字段级文案 | AO（Jay） | P3 / P4 |
| 其它故事的陈旧 e2e 选择器 | AO（Jay） | 随各自 change |
| `X-User-Id` 身份桩替换 | AO（Jay） | 生产化 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：[`docs/sdd/add-trip-publish/p2-spec.md`](../../../docs/sdd/add-trip-publish/p2-spec.md) §签署表；角色名册见 [`docs/sdd/README.md`](../../../docs/sdd/README.md)。

## Next

- Decision = Pass → P3（设计、ATDD、任务拆分）。