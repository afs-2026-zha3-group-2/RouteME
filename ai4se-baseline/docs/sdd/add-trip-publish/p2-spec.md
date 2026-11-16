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

## 8. 修订：REQ-007 目的地代码化（2026-11-16）

P2 结论在提交后被上游协作改变，记录如下，不覆盖上文的原始判定。

| 项 | 修订前（P2 首次签署） | 修订后 |
|---|---|---|
| 目的地字段 | `destination`（中文名，自由/地图选点） | `destination_code`（6 位行政区划码，必须选到市） |
| 契约版本 | `openapi.yaml` 0.6.0，无字段变化 | 0.7.0，`TripCreateRequest.destination_code` 必填，`^[0-9]{6}$` |
| 目的地控件 | 离线地图 `PlacePicker`（16 城） | 省市级联 Cascader；途经点与集合地点仍用 `PlacePicker` |
| 新增场景 | — | 「必须选到市才能提交」「非法或省级代码返回 400」 |
| 数据底座 | 本 change 不涉及 | 字典与 V10 迁移归 `add-destination-area-filters`；本 change 只做发布侧 |

影响：

- `dov-ac-review.md` 的需求映射新增两行（发布必须选到市、非法代码拒绝），AC 仍为 Pass。
- **G1 结论需重评**：`g1-decision.md` 的 Scope 与 Contract 两行基于 0.6.0 判定，目的地修订完成后由 SA 重评并在该文件追加结论。
- `tasks.md` 已追加「目的地修订（REQ-007 协作）」任务组，完成状态以该组为准。
- 归档顺序：`add-destination-area-filters` → `add-trip-publish`。

## 9. 修订后的签署确认

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受目的地代码化的规格修订；要求修订完成后重评 G1 | 2026-11-16 |
| IO | Wanye | 需求来源改为 REQ-007 协作口径，发布侧仍属 S06 | 2026-11-16 |
| AO | Jay | 按修订后的口径实现并在 P4 记录新证据 | 2026-11-16 |