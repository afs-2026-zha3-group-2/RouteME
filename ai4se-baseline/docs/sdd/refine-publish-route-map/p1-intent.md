# P1 意图记录 — refine-publish-route-map

- **Change：** `refine-publish-route-map`（REQ-027 / S28 发布行程改用地图路线编辑器）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-18 ｜ **记录人：** Jacky（当前开发者）
- **分支 / 基点：** 主工作区 `main`，基线 `origin/main@c058e12`（契约 0.22.0，迁移最新 `V26`）；实现前切出 `feature/refine-publish-route-map`

## 1. 阶段目标

把「旅行地图有点冗余，但地图显示路线与添加目的地很好，用它替掉发布行程里的简单路线」收敛为一个可判定的 REQ-027：发布页第 2 段换成探索页现有的地图路线编辑器，提交仍是 `stops: string[]` + `travel_mode`；同时移除冗余的导航入口，保留页面与深链。本 change 不改后端、不改契约、不加迁移，因此 P0 只做基线与缺口记录。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-027-publish-route-map.md`](../../../requirement-workspace/intents/REQ-027-publish-route-map.md) | 原始反馈、现状差距 10 项、裁决 D1–D8、覆盖与不覆盖 |
| Ready 需求 | [`requirements/REQ-027-publish-route-map.md`](../../../requirement-workspace/requirements/REQ-027-publish-route-map.md) | 六字段 + 11 条场景（S28-1 ~ S28-11）+ 7 项 OQ 默认裁决 + DoR（BLOCKER 0） |
| 故事 | [`stories/refine-publish-route-map.story.md`](../../../requirement-workspace/stories/refine-publish-route-map.story.md)、[`stories.md`](../../../requirement-workspace/stories.md) | S28，迭代 3，3 点；保留原始诉求、AC、场景与口径 |
| 登记 | [`registry.md`](../../../requirement-workspace/registry.md) | REQ-027 行（p1-drafted） |
| 提案 | [`proposal.md`](../../../openspec/changes/refine-publish-route-map/proposal.md) | Why / D1–D9 / 影响面 / AC-1 ~ AC-10 / 7 项风险 / out of scope |
| Delta | [`specs/trip-plans/spec.md`](../../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md) | MODIFIED 1 Requirement / 18 Scenario（基线 7 保留 + 新增 11） |
| 工件评审 | [`proposal-review-2`](../../reviews/20261118-refine-publish-route-map-proposal-review-2.md)、[`spec-review-2`](../../reviews/20261118-refine-publish-route-map-spec-review-2.md) | 2026-11-18，0 BLOCKER / 0 WARNING / 5 SUGGESTION ×2，已签署 |
| 阶段记录 | 本文件、[`p0-baseline.md`](p0-baseline.md) | P0 缺口 G-01 ~ G-10、关键基线事实 1–10 |

## 3. 关键决策

- **复用而非重做：** 直接复用探索页 `AmapContainer` / `PlaceSearchBox` / `WaypointPanel` / `ItineraryPanel` / `RouteLayer` / `placePick`；不重新设计 `已选途经点`、`出行方式`、`重新生成旅行路线`、`已按直线显示路线`、`行程顺序` 五块面板。
- **模式行参数化：** `WaypointPanel` 与 `ItineraryPanel` 接受 `modes` / `modeLabels`；缺省保持探索页现状（步行 / 驾车 / 骑行），发布页注入「自驾 / 骑行 / 公共交通」。
- **规划时机：** 保留「生成旅行路线」按钮；首次生成后增删 / 排序 / 切模式自动重算，与 `MapExplorerPage` 现有效果一致。
- **数据边界：** 编辑期 `RouteWaypoint[]`（含 `lng` / `lat`）只在内存；提交投影为 `stops: string[]`（当前顺序、去空、2–8 个）+ `travel_mode`；契约 0.22.0 与 `trip_plans` 表不变。
- **占位名拦截：** 地图点选反地理编码失败会得到「地图选点 {经度}, {纬度}」；提交时必须拒绝并提示改名，避免详情页 geocode 失败。
- **降级文案：** 直线示意提示面向普通用户，不出现后端服务名、端口、代理或重载；探索页文案保持原样。
- **导航收敛：** 移除 `AppShell.NAV_ITEMS` 的 `map` 项与 `activeKey` 分支；页面、`#/map`、`#/map/{省码}`、`#/map/{省码}/{市码}` 全部保留；不改 `design-system` 导航条。
- **测试锚点：** `e2e/tests/trips.spec.ts` 的 `china-map` / `city-map` 断言指向已下线组件，本 change 重写为 AMap 口径并新增面板与占位名覆盖。
- **单 capability：** 只 MODIFIED `trip-plans` 一条 Requirement，不新增能力。

## 4. 校验

- `openspec validate refine-publish-route-map --strict` → `Change 'refine-publish-route-map' is valid`（无 WARNING）。
- 场景核对：Delta 共 18 条 Scenario，基线 7 条原文保留，新增 11 条；脚本比对 `deltaCount=18` / `missing=[]`。
- `frontend` 的 `npx tsc --noEmit` → 退出码 0（本 change 尚未改代码）。
- 契约 / 迁移核对：`openapi.yaml` `info.version` = 0.22.0；`origin/main` 迁移最新 `V26__ai_itineraries.sql`；本 change 声明零后端 / 契约 / 迁移。
- 未运行后端 / 前端测试：P1 尚无实现，按 `all-specs-review` 记 N/A；E2E 与契约 lint 属 P4。
- 首轮评审曾按 16 场景签署；发起人确认「这些面板已经够好」后修订为 18 场景（新增「降级提示不暴露实现细节」「坐标占位名不得进入发布」，并补齐生成按钮与模式标签断言），已按修订稿重新评审与签署。

## 5. 签署

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `proposal.md` | 1 | WAYNE（IO） | 2026-11-18 | 已批准（修订稿） |
| `proposal` 评审报告（-2） | 1 | WAYNE（IO） | 2026-11-18 | 已批准 |
| `proposal` 评审报告（-2） | 2 | Jacky（当前开发者） | 2026-11-18 | 已批准 |
| Delta Spec | 1 | WAYNE（IO） | 2026-11-18 | 已批准（修订稿） |
| `spec` 评审报告（-2） | 1 | WAYNE（IO） | 2026-11-18 | 已批准 |
| `spec` 评审报告（-2） | 2 | Jacky（当前开发者） | 2026-11-18 | 已批准 |

> 当前开发者由发起人确认为 Jacky。按 `@rule:artifact-review-gate`，`proposal` 与 Delta Spec 由 WAYNE 签署，两份评审报告由 WAYNE + Jacky 签署；六处已于 2026-11-18 按发起人「继续」确认签齐，P2 解锁。首轮 `-review.md` 保留为 16 场景版本的历史记录，不再作为现行签署依据。

## 6. 提交与偏离记录

- 本记录与 P1 工件尚未提交；P1 收口时随阶段一起入库。
- 未触碰并行会话的 WIP：`e2e/tests/profile.spec.ts`、`frontend/src/App.tsx`、`frontend/src/i18n/tripMessages.ts`、`frontend/src/profile/ProfileSetupPage.tsx`、`frontend/src/shell/AppShell.tsx`、`V27__normalize_demo_user_profiles.sql` 均未修改。本 change 只新增文档 / 规格文件。
- P4 前需先合并 `origin/main`：`AppShell.tsx` 与 `tripMessages.ts` 有并行改动，本 change 的 `NAV_ITEMS` / `activeKey` 与 `sectionRoute` 落在同一文件，必须以合并后版本为基线。
- 与未归档的 `refine-trip-map`、`add-trip-publish` 修改同一 Requirement；归档必须串行，本 change 是发布页路线段的权威。