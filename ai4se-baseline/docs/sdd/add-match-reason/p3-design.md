# P3 设计与任务记录 — add-match-reason

- **Change：** `add-match-reason`｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把九条场景落成设计取舍、ATDD 映射与可执行任务，并完成一致性检查。

## 2. 设计取舍（详见 [`design.md`](../../../openspec/changes/add-match-reason/design.md)）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D1 | 打分放在哪一层 | 后端纯计算 `TripMatch` 单点定义，前端不重复算 |
| D2 | 百分比与分值关系 | `percentage = score`（0–100），不做二次归一 |
| D3 | 降级文案边界 | 有参照行程 / 仅有兴趣 / 无重合三种文案，`reasons` 至少一条 |
| D4 | 展示位置 | 卡片「匹配度 N%」+「匹配理由 …」；详情页原因列表 + 百分比 + 参照来源 |

## 3. ATDD 与任务

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-match-reason/atdd-design.md) | 五层策略 + 9 条场景映射 + Red/Green 计划 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-match-reason/tasks.md) | T1 contract → T2/T3 backend → T4 frontend → T5 e2e → T6 docs |
| 任务层分布 | — | contract 1、backend 2、frontend 1、e2e 1、docs 1 |

## 4. 一致性检查

记录：[`consistency-lint.md`](../../../openspec/changes/add-match-reason/consistency-lint.md)

- BLOCKER 0 / WARNING 2 / SUGGESTION 2
- W-01（卡片视觉变化）已在 ATDD §3 约束；W-02（门禁工时序）由阶段记录补齐。

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-match-reason baseline stage and sign-off |
| P1 | docs(p1): add-match-reason intent stage and sign-off |
| P2 | docs(p2): add-match-reason delta spec G1 and sign-off |
| P3 | 本条提交 |

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 设计取舍与场景覆盖一致；同意卡片文案约束 | 2026-11-16 |
| AO | Jay | 任务可在本迭代完成；承担 P4 | 2026-11-16 |
| SM | Lewis | P3 产出齐备，准入 P4 | 2026-11-16 |

**阶段结论：Pass**

## 7. 准入 P4 的条件

- Red 证据来自真实失败，不得先写实现。
- 本地验证报告贴真实命令与输出；CI 在目标提交上通过。
- G2 由 VL 签署。