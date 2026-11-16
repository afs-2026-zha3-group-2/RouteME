# P2 增量规格与 G1 记录 — add-match-reason

- **Change：** `add-match-reason`｜ **能力：** `trip-companions`（MODIFIED）｜ **阶段：** P2（Delta spec & G1）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把 P1 的提案写成可判定的匹配原因规格，并以 G1 确认可进入设计。

## 2. 增量规格

| 项 | 内容 |
|---|---|
| 文件 | [`openspec/changes/add-match-reason/specs/trip-companions/spec.md`](../../../openspec/changes/add-match-reason/specs/trip-companions/spec.md) |
| 变更类型 | MODIFIED（覆盖 living spec 的「展示可解释的匹配原因」） |
| 规模 | 1 Requirement / 9 Scenario |
| 新增场景 | 目的地 50、日期 30 / 差一天 20、兴趣每项 10 且 ≤ 20、总分 ≤ 100、详情与列表双展示 |
| 契约 | 无字段变化；`Match` schema 已满足 |

## 3. AC / DoV 复核

摘要（完整表格见 [`dov-ac-review.md`](../../../openspec/changes/add-match-reason/dov-ac-review.md)）：

| 检查 | 结果 |
|---|---|
| AC-1 场景可测 | Pass（9 个 Scenario） |
| AC-2 可观察 | Pass |
| AC-3 负向与边界 | Pass（兴趣 1 / 3 个、全命中 100、无重合、无参照） |
| AC-4 非实现细节 | Pass |
| DoV-3 残余风险 | Partial（有 owner） |

## 4. G1 结论

- 记录：[`g1-decision.md`](../../../openspec/changes/add-match-reason/g1-decision.md)
- 结论：**Pass**｜ 阻塞条件：0

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-match-reason baseline stage and sign-off |
| P1 | docs(p1): add-match-reason intent stage and sign-off |
| P2 | 本条提交 |

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 九条场景可判定；权重与上限与原型一致 | 2026-11-16 |
| IO | Wanye | 场景完整回溯 issue #9 | 2026-11-16 |
| AO | Jay | 场景可实现且不改契约；承担 P3 | 2026-11-16 |
| SM | Lewis | G1 Pass，准入 P3 | 2026-11-16 |

**阶段结论：Pass（G1）**

## 7. 准入 P3 的条件

- `design.md` 记录分值关系、降级文案边界与展示位置。
- `atdd-design.md` 把九条场景映射到单元 / 接口 / 端到端三层。