# AC / DoV review — add-trip-plans

- **Change:** `add-trip-plans`（capability `trip-plans`，REQ-002）
- **Reviewed at:** 2026-11-15（+0800）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、原型 [`docs/prototype/`](../../../docs/prototype/index.html)（`stories.html` S03–S05、`store.js`）、[`impact-brief.md`](../../../requirement-workspace/impact-brief.md)、[`deep-dive.md`](../../../requirement-workspace/deep-dive.md)
- **裁决基线：** 原型与 proposal 冲突或模糊处，以原型为准（用户 2026-11-15 决定）；裁决明细见 [proposal.md §原型对齐决议](proposal.md#原型对齐决议)。

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | `spec.md` 5 条 Requirement / 21 个 Scenario | 身份、浏览、筛选排序、发布、详情、结束均有 Given/When/Then |
| AC-2 AC 可观察，无「工作良好」类表述 | Pass | `spec.md` 全部 Then 断言页面可见内容、状态文字或拒绝行为 | 状态要求文字表达，避免只用颜色 |
| AC-3 高风险负向/边界已列出 | Pass | `spec.md`：必填缺失、日期倒置、途经点 < 2、人数 2–12、预算倒置、无结果空状态、已结束/已取消不出现、非发布者不能结束、非本人入口隐藏 | 边界值直取原型 `validateTrip` / `queryTrips` |
| AC-4 AC 不是伪装的实现细节 | Pass | 无类名、表名、接口路径；仅业务字段与可见行为 | 接口与表结构留给 `design.md` |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致，无静默扩张 | Pass | `proposal.md` In/Out scope 已按原型重写；原型额外的编辑/删除/取消、保存筛选、拖拽、批量、撤销显式列入 Out of scope | 初版 proposal 与原型冲突的 9 项已逐条裁决 |
| DoV-2 歧义已列出或解决 | Pass | 筛选语义、日期区间、默认视图、发布约束、已结束触发、申请入口资格均落为 Scenario | 匹配度排序归 REQ-003，本 change 只保留排序位 |
| DoV-3 IO / SA 残余风险已记录 | Partial | 见 §残余风险 | 无阻塞项；均为已指定 owner 的后续项 |
| DoV-4 未声称完成业务实现 | Pass | 本文件只评审规格；无代码/迁移/接口实现声明 | — |
| DoV-5 每条需求可追溯到 proposal / REQ-002 | Pass | `proposal.md` 引用 REQ-002 与 `records/discussion/2026-11-13/RouteMe_MVP_完整闭环_中文.md` §2.1–2.2 / §5.1.1–5.1.4；`spec.md` 5 条 Requirement 全部对应 In scope 条目 | 原型证据 S03–S05 |

## 原型 ↔ proposal 裁决记录

| # | 冲突/模糊点 | 裁决 | 落到规格的位置 |
|---|---|---|---|
| 1 | 首页筛选能力 | 按原型：搜索 + 目的地 + 日期区间 + 兴趣多选 + 排序 | `搜索、筛选与排序` |
| 2 | 日期筛选语义 | 按原型：出发不早于 / 不晚于，行程区间有交集 | 同上，`按日期区间筛选` |
| 3 | 默认列表范围 | 按原型：只列未结束（招募中 + 已满员） | `浏览未结束的旅行计划` |
| 4 | 发布约束 | 按原型：标题 ≤ 40、途经点 ≥ 2、人数 2–12、预算下限 ≤ 上限、标签 ≤ 5 | `发布可被他人理解的旅行计划` |
| 5 | 已结束触发 | 按原型：发布者手动「标记为已结束」 | `发布者结束自己的行程` |
| 6 | 申请入口 | 按原型：仅招募中且未满员且非本人可用；提交归 REQ-003 | `查看行程详情与清晰的状态` |
| 7 | 已取消状态 | 不纳入 MVP（原型为取消/删除演示） | proposal Out of scope |
| 8 | 匹配度排序 | 排序位保留，打分与原因归 REQ-003 | `排序` + 残余风险 |
| 9 | 编辑 / 删除 / 取消行程、保存筛选、拖拽、批量、撤销 | 不纳入本 change（原型演示增强） | proposal Out of scope |

## 残余风险

| 风险 | 影响 | Owner |
|---|---|---|
| 「按匹配度」排序依赖 REQ-003 打分 | 本 change 只上「按出发日期 / 最新发布」，匹配排序在 REQ-003 接入 | Jay（开发） |
| 结束行程时待处理申请如何处理属于 REQ-003 | 本 change 只改状态；REQ-003 落地时补「结束即拒绝待处理申请」 | Jay（开发） |
| NFR 测试（性能 / 可观测性）未纳入 | MVP 无 SLA；ATDD 设计记录为 deferred | Jay（开发） |
| 原型含编辑 / 删除 / 取消等演示增强 | 易被误当 MVP 范围；已在 proposal Out of scope 固化 | Jay（开发） |

## 结论

- **AC/DoV：通过**（AC 4/4 Pass；DoV 4 Pass + 1 Partial，Partial 项均有 owner，无阻塞）。
- **G1-ready：Yes** —— 无未解决的阻塞歧义；可进入 `/sdd:g1-decision-record`。