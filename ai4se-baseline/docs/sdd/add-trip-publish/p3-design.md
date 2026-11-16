# P3 设计与任务记录 — add-trip-publish

- **Change：** `add-trip-publish`｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把 11 条场景落成设计取舍、ATDD 映射与可执行任务，并做一次一致性检查。

## 2. 设计取舍（详见 [`design.md`](../../../openspec/changes/add-trip-publish/design.md)）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D1 | 计划人数边界 | 含发布者，`capacity ∈ [2, 12]`；`capacity = 1` 越界（否决字面 ≥ 1） |
| D2 | 字段级错误的归属 | 前端 `validateTripForm` 逐字段提示；后端整体 400 `INVALID_INPUT` |
| D3 | 端到端如何定位选点控件 | 用可访问名称与 `listbox` 语义，不用旧文本框 / antd 下拉选择器 |
| D4 | 同一表单多个选点控件如何区分 | `PlacePicker` 增加 `ariaLabel` / `inputId` / `invalid`，默认值保持兼容 |

## 3. ATDD 与任务

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-trip-publish/atdd-design.md) | 五层策略 + 11 条场景 → 测试映射 + Red/Green 计划 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-trip-publish/tasks.md) | T1 contract → T2 backend → T3/T4 frontend → T5 e2e → T6 docs |
| 任务层分布 | — | contract 1、backend 1、frontend 2、e2e 1、docs 1，无跨层任务 |

## 4. 一致性检查

记录：[`consistency-lint.md`](../../../openspec/changes/add-trip-publish/consistency-lint.md)

- BLOCKER 0 / WARNING 2 / SUGGESTION 2
- W-01（人数口径）已在 Delta Spec 主句与 D1 固化；W-02（门禁工时序）由本目录的阶段记录补齐。

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-trip-publish baseline stage and sign-off |
| P1 | docs(p1): add-trip-publish intent stage and sign-off |
| P2 | docs(p2): add-trip-publish delta spec G1 and sign-off |
| P3 | 本条提交 |

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 设计取舍与场景覆盖一致；同意按 11 条场景验收 | 2026-11-16 |
| AO | Jay | 任务拆分可在本迭代完成；承担 P4 实现与验证 | 2026-11-16 |
| SM | Lewis | P3 产出齐备，准入 P4 | 2026-11-16 |

**阶段结论：Pass**

## 7. 准入 P4 的条件

- 先有可失败的验收（Red），再做最小实现（Green）。
- 本地验证报告贴真实命令与输出；CI 在目标提交上通过。
- G2 由 VL 签署，AO 不得自签为 VL。