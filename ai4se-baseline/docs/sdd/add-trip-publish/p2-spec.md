# P2 增量规格与 G1 记录 — add-trip-publish

- **Change：** `add-trip-publish`｜ **能力：** `trip-plans`（MODIFIED）｜ **阶段：** P2（Delta spec & G1）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把 P1 的提案写成可判定的增量规格，并以 G1 门禁确认「可以进入设计」。

## 2. 增量规格

| 项 | 内容 |
|---|---|
| 文件 | [`openspec/changes/add-trip-publish/specs/trip-plans/spec.md`](../../../openspec/changes/add-trip-publish/specs/trip-plans/spec.md) |
| 变更类型 | MODIFIED（覆盖 living spec 的「发布可被他人理解的旅行计划」） |
| 规模 | 1 Requirement / 11 Scenario |
| 新增场景 | 逐项字段级错误、后端独立校验、跳转详情、首页立即可检索、发布者身份、重启后仍在 |
| 契约 | 无字段变化；`TripCreateRequest` 已满足场景所需边界 |

## 3. AC / DoV 复核

摘要（完整表格见 [`dov-ac-review.md`](../../../openspec/changes/add-trip-publish/dov-ac-review.md)）：

| 检查 | 结果 |
|---|---|
| AC-1 场景可测 | Pass（11 个 Scenario） |
| AC-2 可观察 | Pass |
| AC-3 负向与边界 | Pass（空表单、日期倒置、途经点 < 2、人数 1/13/非整数、预算倒置、直连请求） |
| AC-4 非实现细节 | Pass |
| DoV-3 残余风险 | Partial（有 owner） |

## 4. G1 结论

- 记录：[`g1-decision.md`](../../../openspec/changes/add-trip-publish/g1-decision.md)
- 结论：**Pass**
- 阻塞条件：0

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-trip-publish baseline stage and sign-off |
| P1 | docs(p1): add-trip-publish intent stage and sign-off |
| P2 | 本条提交 |

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 增量规格与 11 条场景可判定；MODIFIED 覆盖范围正确 | 2026-11-16 |
| IO | Wanye | 场景完整回溯 issue #8 的验收条目 | 2026-11-16 |
| AO | Jay | 场景可实现且与现有契约一致；承担 P3 设计 | 2026-11-16 |
| SM | Lewis | G1 Pass，准入 P3 | 2026-11-16 |

**阶段结论：Pass（G1）**

## 7. 准入 P3 的条件

- `design.md` 记录人数口径、字段级错误归属、选点控件可访问名称三项取舍。
- `atdd-design.md` 把 11 条场景映射到具体测试层。
- `tasks.md` 一条任务只落一层，并给出验证命令。