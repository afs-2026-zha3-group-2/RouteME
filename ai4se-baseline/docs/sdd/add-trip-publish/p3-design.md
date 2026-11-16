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

## 8. 修订：目的地代码化（REQ-007 协作）

P3 结论在提交后因上游协作追加了一条设计取舍与三条场景映射。

| 项 | 内容 |
|---|---|
| 设计 | `design.md` D5：目的地从地图 `PlacePicker` 改为省市级联 Cascader，请求只传 `destination_code`，名称由后端生成；途经点/集合地点仍用地图选点 |
| ATDD | `atdd-design.md` §6：场景 12–14 分别落到前端纯函数、接口测试与发布端到端 |
| 任务 | `tasks.md`「目的地修订（REQ-007 协作，已完成）」5 条全部完成 |
| 边界 | 数据底座（V10、全国字典、响应字段）归 `add-destination-area-filters`；本 change 暂时携带最小字典切片 |

## 9. 修订后的签署确认

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 Cascader + `destination_code` 的设计与测试映射 | 2026-11-16 |
| AO | Jay | 承担修订实现；确认字典切片的临时性并在归档前复核 | 2026-11-16 |
| SM | Lewis | 修订后的 P3 产出齐备，准入 P4 | 2026-11-16 |

## 10. R2 设计（发布页体验）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D6 | 目的地弹出层定位 | `getPopupContainer` 挂字段容器 + 全宽，修复面板落在视口外 |
| D7 | 日期默认值 | 本地年月日拼接，不用 `toISOString` |
| D8 | 地图投影与上下文 | `meet` 保比例；未选目的地不渲染；选中后按该市包围盒缩放 |
| D9 | 布局与间距 | 三段分组、控件全宽、行距 16 / 段距 24、窄屏日期单列 |

ATDD：`atdd-design.md` §7 把场景 15–19 映射到纯函数、端到端两层。
任务：`tasks.md` §8 T7–T11。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 D6–D9，同意按场景 15–19 验收 | 2026-11-16 |
| AO | Jay | 承担实现与截图核验 | 2026-11-16 |
| SM | Lewis | 准入 P4 | 2026-11-16 |

## 11. R3 设计（字典全国化后的返工）

| 编号 | 取舍 | 结论 |
|---|---|---|
| D10-1 | 目的地 → 地名库城市映射 | 只保留 `areas/gazetteerCity.ts` 一层，字典读共享 `area/areaOptions`；删除 16 城重复数据 |
| D10-2 | 未覆盖城市的呈现 | 不渲染地图，改为一句话覆盖说明；不得复用「先选目的地」文案 |
| D10-3 | 后端名称派生 | 统一走 `area/AreaDictionary` + `AreaNames`，删除 `AreaConstant` / `pojo/AreaCity` |

ATDD：`atdd-design.md` §8 场景 20–23。任务：`tasks.md` §9 T12–T15。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 D10-1…D10-3 | 2026-11-16 |
| AO | Jay | 承担清理与验证 | 2026-11-16 |
| SM | Lewis | 准入 P4 | 2026-11-16 |

## 12. R4 设计（按原型重排发布页，2026-11-16）

依据 `docs/prototype/ui.js` 的 `tripForm` 与 `docs/prototype/styles.css` 的 `.form-grid / .panel / .preview-label / .safety-list`。

| 编号 | 取舍 | 结论 |
|---|---|---|
| D11 | 页面结构 | 主栏放表单面板，右侧放「实时预览」与「发布前提醒」；窄屏（≤900px）回落单列，侧栏取消 sticky |
| D12 | 字段分组 | 基本信息（标题 / 目的地 / 日期）→ 简单路线（途经点）→ 同行与预算（人数 / 集合区域 / 预算）→ 兴趣标签（标签 / 自定义 / 说明 / 提交） |
| D13 | 标签与提示 | 必填项显示 `*`，选填项显示「选填」；标题显示字数计数；人数与集合区域给出原型中的提示句 |
| D14 | 组件边界 | 仍用 antd：`DatePicker` / `InputNumber` / `Tag.CheckableTag` / `Input`；不引入图标依赖，面板标题用文字加分隔线 |
| D15 | 实时预览 | 复用 `TripCard` 的 `preview` 模式：不跳详情、不打开资料弹窗，未填字段显示占位文案 |

ATDD：`atdd-design.md` §9 场景 24–26。任务：`tasks.md` §10 T19–T21。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 承担布局重排与验证 | 2026-11-16 |
| SA | Jacky、Karena | 待确认 D11–D15 | 待签 |
| SM | Lewis | 待确认是否准入 P5（P5 仍暂缓） | 待签 |

## 13. R6 设计（日期弹层在减少动态效果下可用，2026-11-16）

根因：antd 6.7 在系统开启「减少动态效果」（`prefers-reduced-motion: reduce`）时，日期弹层停留在视口外；用户看到的是「点击日期没有反应」。`ProfileSetupPage` 已有同源修复，R6 把它抽成共享约定。

| 编号 | 取舍 | 结论 |
|---|---|---|
| D16 | 弹层挂载 | 新增 `utils/datePickerProps.ts`：`getPopupContainer` 挂到字段容器，popup 根类 `app-date-popup`；字段容器 `position: relative` |
| D17 | reduced motion 定位 | `@media (prefers-reduced-motion: reduce)` 下把 `.app-date-popup` 固定到字段下方（`left: 0` / `top: calc(100% + 4px)`） |
| D18 | 覆盖范围 | 发布页起止日期、首页「出发不早于 / 不晚于」统一使用；生日字段保留自身同类修复，后续可并入 |

ATDD：`atdd-design.md` §10 场景 27。任务：`tasks.md` §12 T22–T23。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 承担修复与验证 | 2026-11-16 |
| SA | Jacky、Karena | 待确认 D16–D18 | 待签 |
| SM | Lewis | 待确认是否准入 P5（P5 仍暂缓） | 待签 |