# 变更提案：add-trip-publish

- **需求：** REQ-002（`requirement-workspace/requirements/REQ-002-trip-plans.md`）｜ **故事：** S06「发布自己的旅行计划」（P0，迭代 1，3 点）
- **能力：** `trip-plans`（MODIFIED）｜ **规模：** S（收口一条故事的验收口径，不改数据模型）
- **原型：** `docs/prototype/prototype.html#/create`、`stories.html` S06

## 问题

发布行程的骨架能力已由 `add-trip-plans` 落地（`POST /api/trips`、发布表单、表单校验、详情跳转）。但 S06 作为一条独立故事，它的验收口径还没有被规格与测试逐条钉住：

1. 「逐项给出字段级错误」只笼统写在「给出可读的校验提示」里，无法判断某个字段是否被单独标注。
2. 「发布成功后跳转详情页」与「发布者身份正确」没有可执行断言；端到端用例仍在用旧表单控件选择器（文本框 + antd 下拉/复选），与现在的离线地图选点控件不一致，无法作为 S06 的验证证据。
3. 「人数校验为 ≥ 1 的整数」与现有 `2–12` 的边界存在读法差异，需要在规格里明确一次，避免后续按字面改动破坏「发布者计入人数」的既有语义。

本提案把 S06 的验收转成可执行断言，并明确人数边界的唯一读法。

## 范围

**In scope**

- 增量规格：把 `trip-plans` 的「发布可被他人理解的旅行计划」要求细化为 S06 可判定口径——逐项字段级提示、人数为整数且含发布者、成功发布后跳转详情页、首页立即可见（默认列表/按目的地筛选）、发布者身份正确、重启后数据仍在。
- 前端：确认字段级错误逐项可见；发布成功后跳转 `#/trips/{id}`；失败提交不产生行程。
- 后端：确认 `POST /api/trips` 对必填缺失、日期倒置、途经点不足、人数越界（含 `capacity=1`）、预算倒置统一返回 400 `INVALID_INPUT`，且发布者取当前身份。
- 测试：补齐 S06 验收对应的单元/接口/端到端断言，端到端用例改用当前选点控件的可访问名称。
- 契约：目的地字段改为 `destination_code`（必须选到市），`TripCreateRequest` 与响应字段同步调整；契约版本升 0.7.0（REQ-007 协作）。

**Out of scope**

- 参考此行程发布（S17，属 `trip-experiences` 的既有要求，另开 change）。
- 草稿保存、编辑/删除/取消行程、AI 生成路线、图片上传。
- 匹配原因提示（S07，另开 `add-match-reason`）。
- 把业务端点从 `X-User-Id` 切换到 token 鉴权（`add-user-auth` 已登记的遗留项）。

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-plans/spec.md` | 归档时以本 change 的增量规格覆盖「发布可被他人理解的旅行计划」 |
| `RouteME/frontend/src/trips/TripCreatePage.tsx`、`tripForm.ts` | 目的地从 `PlacePicker` 改省市级联 Cascader；途经点/集合地点保留地图选点；字段级错误保持 |
| `RouteME/backend/.../pojo/TripPlan.java`、`controller/TripController.java` | 目的地校验改为 `destination_code`（二级代码）；其余校验与发布者归属已具备 |
| `RouteME/e2e/tests/trips.spec.ts` | 发布用例目的地改用 Cascader 语义定位；不再按标题搜索，改用默认列表/目的地筛选断言 |
| `openapi.yaml` | 目的地字段改 `destination_code`，响应新增 code/province 字段；契约升 0.7.0 |

## 需求与证据

- 故事来源：GitHub issue #8 `[P0] S06 发布旅行计划`。
- 原型证据：`docs/prototype/stories.html` S06；`store.js` 的 `validateTrip`。
- 既有实现：`add-trip-plans`（发布能力）、`add-offline-map-place-picker`（选点控件替换文本输入）。
- 读法裁定：计划人数含发布者本人，因此「≥ 1 的整数」在契约上等价于 `capacity ∈ [2, 12]`；`capacity = 1` 表示只有发布者一人，无法形成同行，按越界处理（与 `openapi.yaml` 的 `minimum: 2` 一致）。

## 目的地修订（2026-11-16，REQ-007 协作）

- **背景：** REQ-007 把目的地从中文名改为 6 位行政区划代码；发布页目的地字段由本 change 的目的地修订承载，数据底座/字典/响应字段由 `add-destination-area-filters` 提供。
- **改动：** 目的地 `PlacePicker` → 省市级联 Cascader（必须选到市）；请求 `destination_code`；后端按字典校验并生成名称；途经点/集合地点继续用地图选点。
- **测试：** `trips.spec.ts` 发布用例改用 Cascader 语义定位；“按标题搜索”断言改为“默认列表/按目的地筛选可见”。
- **边界：** 本 change **不归档**；归档顺序为 `add-destination-area-filters` → 本 change；G1 结论需在目的地修订完成后重评。

## Spec ID

`add-trip-publish`，业务增量规格见 `specs/trip-plans/spec.md`。