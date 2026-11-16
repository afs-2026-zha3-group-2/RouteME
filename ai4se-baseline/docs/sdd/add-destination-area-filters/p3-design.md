# P3 设计与任务记录 — add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把两份 Delta（33 条场景）落成设计取舍、ATDD 映射与可执行任务，并完成对齐自检。

## 2. 设计取舍（详见 [`design.md`](../../../openspec/changes/add-destination-area-filters/design.md)）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D1 | 数据模型与迁移 | `destination_code VARCHAR(6) NOT NULL`；重建 `trip_plans`；`destination` 名称缓存；省名从字典派生 |
| D2 | 区划字典 | `element-china-area-data` v5（6 位码、含港澳台）；后端 JSON 资源 + 前端同一数据源；直辖市二级 label=省级名 |
| D3 | 契约 | 0.7.0；删 `q`；`destination_code`；响应 code/province；体验日期 |
| D4 | 后端领域/查询 | `TripPlan` 持 code + 名称；`TripQuery` 按 code；`TripMatch` 按 code；删 q |
| D5 | 前端筛选/展示 | 省市级联（自绘 AreaCascader，仅选到市生效；P4 实现修订）；摘要/卡片/详情标准名；体验卡无日期 |
| D6 | 搜索移除 | 前端/后端/契约/测试全删；A 的场景改写、refine 的测试交 owner |
| D7 | 迁移与外键 | V11 加列 `NOT NULL DEFAULT ''` + 16 城/别名映射 + 索引；不重建表（H2 外键）；未知名称回填失败 |
| D8 | 匹配口径 | code 比较，理由文案不变 |
| D9 | 错误/边界 | 非法 code 400；只选省不筛选；无结果保留条件；不做 NFR |

## 3. ATDD 与任务

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-destination-area-filters/atdd-design.md) | 契约/API/E2E/Defer UT 分层 + 20 组场景映射 + Red/Green + fixtures |
| 任务 | [`tasks.md`](../../../openspec/changes/add-destination-area-filters/tasks.md) | T1 contract → T2–T5 backend → T6–T8 frontend → T9 e2e → T10 docs → T11 verify |
| 任务层分布 | — | contract 1、backend 4、frontend 3、e2e 1、docs 1、verify 1，无跨层任务 |
| 对齐自检 | `tasks.md` §对齐自检 | Pass（Spec ↔ Design ↔ Tasks ↔ ATDD） |

## 4. 一致性检查

记录：[`consistency-lint.md`](../../../openspec/changes/add-destination-area-filters/consistency-lint.md)

- BLOCKER 0 / WARNING 4 / SUGGESTION 1；verdict Partial（手工/外部依赖）。
- L-01 `@rule:` 解析约定；L-02 A 的 G1/G2 需重评；L-03 refine 搜索测试；L-04 Living Spec"关键词"术语。均为外部/归档前条件，不影响 P3 准入。

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | `e2759bd`（P0/P1 合并提交：基线记录 + P1 产物） |
| P1 | `e2759bd` |
| P2 | `bba0c95` |
| P3 | 本条提交（待提交） |

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 设计取舍与 33 条场景覆盖一致；同意 code 权威与 V11 迁移方案 | 2026-11-16 |
| AO | Jay | T1–T11 可在本迭代完成；承担 P4 实现与验证 | 2026-11-16 |
| SM | Lewis | P3 产出齐备，准入 P4 | 2026-11-16 |

**阶段结论：Pass**

## 7. 准入 P4 的条件

- 先写失败验收（T1/T9 Red），再实现；不得先改实现再补断言。
- 本地验证报告贴真实命令与输出；CI 在目标提交上通过。
- G2 由 VL（Neal）签署，AO 不得自签为 VL。
- G1 条件 C1–C6 继续跟踪：C1/C2 归档前必须满足；C3/C4/C6 在 P4 实现中关闭；C5 归档合并时收敛。
- 本 change 归档顺序：`refine-inspiration-home` → 本 change → `add-trip-publish`。
