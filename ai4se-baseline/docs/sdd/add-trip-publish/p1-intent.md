# P1 意图与提案记录 — add-trip-publish

- **Change：** `add-trip-publish`｜ **能力：** `trip-plans`（MODIFIED）｜ **故事：** S06 发布旅行计划
- **阶段：** P1（Intent & proposal）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把「发布旅行计划」这条故事收敛成一份可判定的提案：范围、排除项、影响面、需求来源与证据。

## 2. 需求与故事

| 项 | 来源 | 结论 |
|---|---|---|
| 需求 | `requirement-workspace/requirements/REQ-002-trip-plans.md`（§ 发布行程） | 本 change 只承载 S06 的验收口径 |
| 故事 | issue #8 `[P0] S06 发布旅行计划`（迭代 1，3 点） | 角色：发起人；落点页面：发布行程页 |
| 原型 | `docs/prototype/stories.html` S06、`store.js#validateTrip` | 字段、约束与错误提示以原型为准 |
| 上游依赖 | S01 身份、S05 详情 | 均已落地；本 change 无阻塞前置 |
| 下游消费 | S08 申请、S11 我的旅行、S17 参考发布 | 只消费行程数据，不需要为它们改契约 |

## 3. 范围

**In scope**

- 增量规格：把「发布可被他人理解的旅行计划」细化为 S06 可判定口径（字段级错误、人数整数与边界、跳转详情、首页可检索、发布者归属、重启后仍在）。
- 前端：字段标签与错误文案的控件关联；提交失败不发请求。
- 后端：`POST /api/trips` 的独立校验与发布者归属。
- 测试：单元 / 接口 / 端到端断言；端到端用例对齐离线地图选点控件。

**Out of scope**

- S17 参考此行程发布（`trip-experiences`，另开 change）。
- 草稿、编辑 / 删除 / 取消行程、图片上传、AI 生成路线。
- S07 匹配原因（另开 `add-match-reason`）。
- 业务端点从 `X-User-Id` 切到 token 鉴权（`add-user-auth` 已登记的遗留项）。

## 4. 影响面

| 位置 | 影响 |
|---|---|
| `openapi.yaml` | 无字段变化；`TripCreateRequest` 已含必填与 `capacity 2–12`，版本保持 `0.6.0` |
| 后端 | `TripPlan.create` 校验链、`TripController#create` 取当前身份 |
| 前端 | `TripCreatePage`、`tripForm`、`PlacePicker`（可访问名称） |
| 端到端 | `e2e/tests/trips.spec.ts` 发布用例 |
| 数据库 | 无迁移；沿用 `trip_plans` |

## 5. 关键裁定（提案阶段）

| 裁定 | 内容 | 理由 |
|---|---|---|
| 人数口径 | 「≥ 1 的整数」按「含发布者、至少 1 位同行者」实现，即 `capacity ∈ [2, 12]`；`capacity = 1` 越界 | 已加入人数从 1 起算；`capacity = 1` 发布即满员，无法形成同行；与契约 `minimum: 2` 一致 |
| 字段级错误归属 | 前端表单逐字段提示；后端统一 400 `INVALID_INPUT` | 契约已如此定义，避免新增错误结构 |
| 选点控件 | 保留「必须能在地图地名库搜到」的约束 | 与 `add-offline-map-place-picker` 的既定行为一致 |

## 6. 阶段产出

| 工件 | 路径 |
|---|---|
| 提案 | [`openspec/changes/add-trip-publish/proposal.md`](../../../openspec/changes/add-trip-publish/proposal.md) |
| 阶段记录 | [`p1-intent.md`](p1-intent.md) |

## 7. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-trip-publish baseline stage and sign-off |
| P1 | 本条提交 |

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 范围与迭代归属：只做 S06，S17 与匹配原因另立 change | 2026-11-16 |
| IO | Wanye | 需求来源 REQ-002 与 issue #8 一致，无遗漏验收项 | 2026-11-16 |
| SA | Jacky、Karena | 接受 in/out scope 与三项裁定，同意进入 P2 写增量规格 | 2026-11-16 |
| AO | Jay | 影响面与工作量判断（S）｜ 承担实现与验证 | 2026-11-16 |

**阶段结论：Pass**

## 9. 准入 P2 的条件

- Delta Spec 以 MODIFIED 覆盖既有 Requirement，并补 S06 专有场景。
- AC / DoV 复核无 BLOCKER；G1 由 SA 签署。