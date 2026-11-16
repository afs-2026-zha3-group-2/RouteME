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
| IO | WAYNE |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：[`docs/sdd/add-trip-publish/p2-spec.md`](../../../docs/sdd/add-trip-publish/p2-spec.md) §签署表；角色名册见 [`docs/sdd/README.md`](../../../docs/sdd/README.md)。

## Next

- Decision = Pass → P3（设计、ATDD、任务拆分）。

## G1 重评（REQ-007 目的地代码化，2026-11-16）

P2 §8 修订后按远程 `add-destination-area-filters` 的协作口径重评，只复核受影响的两维：

| 维度 | 修订前结论 | 重评结论 | 证据 |
|---|---|---|---|
| Scope | 仅收口 S06 的发布验收，无契约变化 | 仍只收口发布侧；目的地代码化属 S06 内的发布字段修订，数据底座不在本 change | `proposal.md` §目的地修订、`tasks.md`「目的地修订」 |
| Contract | 0.6.0，`TripCreateRequest` 无字段变化 | 0.7.0，`destination_code` 必填、`^[0-9]{6}$`；`OpenApiTest` 已同步 | `openapi.yaml`、`OpenApiTest` |
| Ambiguity | 人数口径已裁定 | 新增：省级码、未知码、缺失码一律 400；名称由字典生成（直辖市取省级名） | `TripControllerTest` 三个拒绝用例 |
| Traceability | 11 条场景 | 13 条场景（新增必须选到市、非法代码拒绝） | `dov-ac-review.md` §需求 → 场景映射、`docs/ai4se-plugins/20261116-113500-local-verify-report.md` |

**重评结论：Pass**（阻塞条件 0）。条件：`add-destination-area-filters` 落地后，本 change 的最小字典切片必须替换为全国字典并把代码持久化，归档前复核。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 0.7.0 与三条新场景，重评 Pass | 2026-11-16 |
| VL | Neal | 复核修订后的验证证据 | 2026-11-16 |
| AO | Jay | 记录字典切片的临时性与归档前复核项 | 2026-11-16 |

## G1 重评 R2（发布页体验，2026-11-16）

新增一条 ADDED Requirement（默认值与地图上下文，5 个 Scenario），范围仍限 S06 发布页：

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 仅前端表单行为 + e2e；后端与契约不动 | `docs/sdd/add-trip-publish/p1-intent.md` §10 |
| Contract | 无变化（0.7.0 不变） | `openapi.yaml` 未改 |
| Ambiguity | 地图「按目的地展示」定义为：未选不渲染、选中后只列该市；「布局自然」量化为分组 + 全宽 + 等距 | P1 §10 裁定 R2-1…R2-5 |
| Traceability | 4 项用户反馈 → 5 个 Scenario | `specs/trip-plans/spec.md` ADDED 段 |

**重评结论：Pass**。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 ADDED Requirement 与量化口径 | 2026-11-16 |
| AO | Jay | 承担实现与截图核验 | 2026-11-16 |
| SM | Lewis | 准入 P3 | 2026-11-16 |

## G1 重评 R3（字典全国化后，2026-11-16）

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 仅返工清理：前端映射改读共享字典、未覆盖城市提示、删除重复字典 | `docs/sdd/add-trip-publish/p1-intent.md` §12 |
| Contract | 无变化（0.7.0） | `openapi.yaml` 未改 |
| Ambiguity | 「地图按目的地展示」补上覆盖边界：未覆盖城市不渲染地图并说明原因 | Delta Spec 第 6 个 Scenario |
| Traceability | R2 遗留项「最小字典切片待替换」在本轮关闭 | `tasks.md` R3 段 |

**重评结论：Pass**。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受覆盖边界的写法 | 2026-11-16 |
| AO | Jay | 承担清理与验证 | 2026-11-16 |
| SM | Lewis | 准入 P3 | 2026-11-16 |