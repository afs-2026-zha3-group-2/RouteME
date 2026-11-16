# P3 设计记录 — REQ-014-reference-publish

- **Change：** 无新建（REQ-014 / S17，复用已归档的 `add-trip-experiences`）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@652e38b`（P2 提交）

## 1. 阶段目标

P3 的常规产物是 `design.md` + `atdd-design.md` + `tasks.md`，用来把 Delta Spec 翻成可执行任务。REQ-014 没有 Delta（见 [`p2-spec.md`](p2-spec.md) §2），所以本阶段做两件事：

1. 对**现状设计**做一次显式确认（as-is design），证明代码实现与 Living Spec 一致、没有隐性扩范围；
2. 交付一份**现状 UI 预览**给 IO / SA / SM 看，作为验收口径的视觉锚点。

本阶段**不**产出 `design.md` / `atdd-design.md` / `tasks.md`，也不产生开发任务。

## 2. 准入判定

| 判定项 | 事实 | 结论 |
|---|---|---|
| 是否有 Delta 需要设计 | 无（P2 已判定 N/A） | 无新设计对象 |
| 是否有代码要写 | 4 条 AC 全部由 REQ-004 已交付 | 无任务可拆 |
| 是否有视觉变更 | 预览复刻现状，不提出新样式、新组件、新页面 | 无设计增量 |
| 是否要动契约 / 迁移 | `TripCreateRequest` 无来源字段；无迁移 | 无 Technical Design 需求 |

## 3. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 现状 UI 预览 | [`preview/reference-publish.html`](preview/reference-publish.html) | 静态单页，4 个视图（入口 / 预填发布页 / 校验态 / 新计划），可切标注层与深色 |
| 现状设计确认 | 本文件 §4 | 契约、组件、校验、提交流四段 as-is 核对 |
| 对齐自检 | 本文件 §5 / §6 | 预览视图 ↔ 代码行号 ↔ Living Spec 场景三方对应，无扩范围 |
| `design.md` / `atdd-design.md` / `tasks.md` | **无** | 无 Delta、无实现任务；写了也是空壳 |
| 设计 / 任务评审报告 | **无** | 无 `design.md` / `tasks.md`，不触发 `@rule:artifact-review-gate` |

## 4. 现状设计确认（as-is）

| 层 | 现状 | 证据 |
|---|---|---|
| 路由与入口 | `#/trips/new?from=<tripId>`；行程详情在「游后真实体验」区底部渲染「参考此行程发布」（仅 `status = completed`）；体验卡页脚同样渲染 | `TripDetailPage.tsx:409-421`、`ExperienceCard.tsx:53-55` |
| 页面状态初始化 | 有 `fromTripId` 时用 `emptyTripForm` 起步，再异步 `loadTrip` 覆盖；无 `fromTripId` 时用 `initialTripForm`（日期默认今天） | `TripCreatePage.tsx:36-38,46-68`、`tripForm.ts:23-47` |
| 预填字段 | 只带入 `destination_code` / `stops`（≤ `MAX_STOPS`）/ `tags`（≤ `MAX_TAGS`）；`capacity` 显式清空 | `TripCreatePage.tsx:56-62` |
| 不预填字段 | 标题、起止日期、人数、集合区域、预算、补充说明 | 同上（`emptyTripForm` 空值 + `capacity: ''`） |
| 校验 | 标题 / 目的地 / 起止日期 / 途经点 / 人数必填；集合区域选填，不校验、不沿用 | `tripForm.ts:49-85`、`tripMessages.ts:65-73` |
| 预填提示 | 顶部 info 条固定文案：已预填目的地、途经点与兴趣；请重新选择标题、日期、人数与集合区域 | `TripCreatePage.tsx:145-152`、`tripMessages.ts:191` |
| 实时预览 | 右侧 `TripCard` 用表单值渲染；标题空时占位「你的行程标题」，人数空时回退 2 | `TripCreatePage.tsx:77-94,431-444` |
| 提交契约 | `toCreateRequest` 只发 8 个业务字段，无来源字段；服务端无来源校验 | `tripForm.ts:87-101`、`openapi.yaml` `TripCreateRequest`、`route.test.ts:25-28` |
| 数据模型 | `TripSummary` / 详情响应无 `from_trip_id` 之类字段 | `types.ts:131-143` |
| Living Spec | 两条场景：预填目的地 / 途经点 / 兴趣；日期 / 人数 / 集合区域不沿用 | `openspec/specs/trip-experiences/spec.md:133-148` |

**结论：** 现状设计已满足 REQ-014 的四条 AC，P3 无需新增设计决策。

## 5. 预览与实现的对应

| 预览视图 | 复刻对象 | 对应实现 | 想说明的事 |
|---|---|---|---|
| ① 行程详情入口 | 已结束行程详情 + 体验卡 | `TripDetailPage.tsx:384-423`、`ExperienceCard.tsx:45-57` | 两个入口都在，且只在已结束行程上出现 |
| ② 参考发布页 | 进入页面、尚未编辑的初始态 | `TripCreatePage.tsx:131-445` | 虚线字段来自原行程；其余为空；顶部提示条说明预填范围 |
| ③ 未重填就发布 | 空表单点「发布」 | `tripForm.ts:49-85` | 错误只落必填项；集合区域空着不报错，也不沿用原值 |
| ④ 新计划（无归属） | 发布成功后的详情 | `tripForm.ts:87-101`、`types.ts:131-143` | 新计划独立，契约里没有来源字段 |

预览页底部的「四条 AC ↔ 四个视图」条与红色标注层是评审辅助，不属于产品界面；关掉「标注层」即为纯界面态。

## 6. P3 质量检查

| id | Required | 状态 | 证据 |
|---|---|---|---|
| P3-1 | yes | N/A | 无 Delta Spec，`/sdd:atdd-design` 无输入；验收口径直接落在 Living Spec 场景上 |
| P3-2 | yes | N/A | 无新设计、无实现任务，`design.md` / `tasks.md` 会是空壳 |
| P3-3 | yes | **Pass** | 对齐自检见 §4 / §5：预览与代码逐行对应 Living Spec `trip-experiences/spec.md:133-148`；无新增字段、无新页面、集合区域仍选填（`trip-plans/spec.md:151`），无隐性扩范围 |
| P3-4 | yes | N/A | 无 `tasks.md`，无可执行任务可拆 |

**Stage Overall：N/A（适用 1/1 = P3-3 Pass）。** 本表不主张 P3 阶段 Pass，也不改变 P1 的 `verified` 结论。

## 7. 签署与结论

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jacky | 现状设计确认 + 预览交付 + 对齐自检 | 2026-11-16 |
| IO | 待确认 | 预览是否与 S17 故事预期一致（建议看视图 ① / ②） | 待签署 |
| SA | 不适用 | 无 Delta / 无 G1，规格签认已在 P2 判定 N/A | — |
| SM | 不适用 | 无排期变更 | — |

**阶段结论：P3 不适用（N/A）**，不进入 P4；REQ-014 保持 `verified`。

## 8. 什么情况下 P3 才有设计任务

沿用 [`p2-spec.md`](p2-spec.md) §5 的三个触发条件：集合区域改必填、新增独立体验详情页、参考发布带来源字段。任一发生时才需要 `design.md`（含契约 / 校验 / 组件变更）、`atdd-design.md` 与 `tasks.md`，以及设计与任务两份评审报告。

## 9. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | `7fafd94` | 意图、Ready 条目、P1 记录与质量报告 |
| P2 | `652e38b` | P2 准入判定（无 Delta / 无 G1） |
| P3 | 本记录 + `preview/reference-publish.html` | `docs(p3): REQ-014-reference-publish add as-is design confirmation and UI preview` |

- **偏离：** 常规 P3 产出 `design.md` / `atdd-design.md` / `tasks.md` 与两份评审报告；本阶段无 Delta、无实现任务，故只交付现状确认与预览，且不声称 P3 Pass。
- **未触碰：** 代码、`openapi.yaml`、迁移、测试、Living Spec、设计系统；并行会话的 `refine-safety-report` 工件。