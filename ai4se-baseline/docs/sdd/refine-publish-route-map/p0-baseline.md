# P0 基线记录 — refine-publish-route-map

- **Change：** `refine-publish-route-map`（候选能力 `trip-plans` MODIFIED）｜ **故事：** REQ-027 发布行程路线地图（P0 / 3 点，编号待 P1 登记）
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-18
- **记录人：** Jacky（本 change 当前开发者；名册角色 SA）
- **分支：** `feature/refine-publish-route-map`（尚未切出；基线 `origin/main@c058e12`）
- **落点页面：** 发布行程页 `#/trips/new` 第 2 段（现「简单路线」）

## 1. 阶段目标

确认「把旅行地图的**路线展示 + 地图增点**能力搬进发布行程，替掉现有地名多选框」这件事在基线上可开工：两条链路的组件边界、状态模型、规划降级口径、提交契约、下游消费点、导航入口与测试锚点都在仓库里可查；把「路线编辑能力只存在于探索页、发布页只有地名列表」的差距固定成可判定缺口，供 P1 提案使用。

本 change 的既定边界（发起人 2026-11-18 裁决）：

- 旅行地图**页面保留**，只移除冗余入口（不再占一级导航位）；发布页复用同一套地图与路线能力。
- 途经点**继续只存地名**（`stops: string[]`），不加坐标、不加 `place_id`、不加路线几何列。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`：`design-system`、`hello-world`、`trip-companions`、`trip-experiences`、`trip-plans`、`user-auth`；`openspec/changes/` 27 个在途 change；`config.yaml`（`schema: spec-driven`） | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-plans/spec.md`「发布可被他人理解的旅行计划」（至少两个途经点与必填校验）、「查看行程详情与清晰的状态」 | 本 change 以「发布」条为增量载体；详情条不改 |
| 发布页路线段 | `frontend/src/trips/TripCreatePage.tsx`：`TripCreatePage` 第 2 段 `Card`，标题取 `tripMessages.sectionRoute`，正文只有 `AmapPlacePicker mode="multi" showMap` | 只有地名多选 + 静态地图；**不画路线、无距离/时间、不可排序** |
| 途经点数据模型 | `frontend/src/trips/tripForm.ts` `TripFormValues.stops`；`frontend/src/types.ts` `TripSummary.stops` / `TripCreateRequest.stops`；`backend/.../request/TripCreateRequest.java` `stops`；`pojo/TripPlan.java` `stops`；`entity/TripPlanEntity.java` `stops`（JSON 文本列）；`V4__seed_demo_trips.sql` `stops VARCHAR(1000)` | 只有**地名字符串**，全链路无坐标、无路线几何 |
| 途经点校验 | `tripForm.ts` `validateTripForm`（<`MIN_STOPS` 报错）；`trips/tripOptions.ts` `MIN_STOPS` / `MAX_STOPS`（2 / 8）；`pojo/TripPlan.java` `create`（<2 拒绝） | 两级都有最小 2；**最大 8 只在前端**，后端只查数量、不校验地名可否解析 |
| 出行方式 | `types.ts` `TripTravelMode`（`driving` / `bicycling` / `transit`）；`tripOptions.ts` `TRIP_TRAVEL_MODES`；发布页 `Segmented` 位于**第 3 段**（`aria-label` = `tripMessages.sideTravelMode`） | 发布口径 3 档、无步行；控件与路线段分离 |
| 地图侧出行方式 | `frontend/src/map/amap/AmapService.ts` `TravelMode`（含 `walking`）；`ROUTE_SERVICES` 映射 | 探索页 4 档；与发布口径差 `walking` |
| 地图页增点能力 | `frontend/src/pages/MapExplorerPage.tsx`：`addPlace`（去重、`MAX_STOPS` 拦截、成功后聚焦）、`handleMapClick`（反地理编码 + 500m 最近 POI 二选一） | 发布页需要的能力已存在且成型 |
| 地图页规划链路 | 同文件规划 `useEffect` 调 `planRoute`，失败降级 `straightLineRoute` 并给出「已按直线显示…本地估算」提示；`routeRequested` 在 <2 点时自动复位；`generate` 置位 | 降级口径可直接沿用 |
| 地图页排序/删除 | `MapExplorerPage` `reorder` / `remove`；`map/amap/WaypointPanel.tsx` 的 `onReorder`（拖动 + 上下按钮）与 `{n}/{maxStops}` 计数 | 排序交互已有实现；`AmapPlacePicker` 只有增删 |
| 路线渲染 | `map/amap/RouteLayer.tsx`：`toSvgPath` 投影、`fitBounds` 自适应、白 casing + 主色折线（`route.estimated` 走虚线）、起 / 终 / 序号 pin | **渲染是通用的**：只吃 `RoutePlan` + `RouteWaypoint`，不含发布/探索语义 |
| 地图容器 | `map/amap/AmapContainer.tsx`：栅格瓦片 + `map.overlay` 覆盖层 + `project` / `onChange` / `fitBounds`；`AmapPlacePicker` 与 `MapExplorerPage` 共用 | 发布页已有同一容器，可复用 |
| 地点检索 | `AmapService.ts`：`searchPlaces`、`aroundPlaces`、`scenicSpots`、`reverseGeocode`、`geocodePlace`、`straightLineRoute`、`planRoute`、`formatDistance`、`formatDuration` | 前端已封装完毕，无需新服务 |
| 公共交通前置条件 | `AmapService.planRoute` 的 `city` 参数：`transit` 需要城市限定换乘范围；`MapExplorerPage` 规划调用**未传 city** | 发布页必须传 `cityForSearch`，否则公共交通退化 |
| 高德代理 | `backend/.../controller/AmapProxyController.java`：`@RequestMapping({"/api/amap", "/_AMapService"})` + `ALLOWED_PATHS` 白名单（place/text、place/around、geocode/geo、geocode/regeo、direction/*、place/scenic） | 能力已通；本 change 不改代理 |
| 发布契约 | `TripController.create`（`POST /api/trips`）、`TripController.detail`（`GET /api/trips/{tripId}`）；前端 `api.ts` `createTrip` / `loadTrip` | 无任何接收坐标或路线几何的端点 |
| 落库与读回 | `TripPlanEntity` 把 `stops` 写成 JSON 文本；`TripSummaryResponse` / `TripDetailResponse` 原样回吐 `List<String>` | 不需要迁移即可承载本 change |
| 详情页消费 | `frontend/src/trips/TripDetailPage.tsx` 的路线地图块渲染 `AmapTripMap`；`map/amap/AmapTripMap.tsx` **逐个地名 `geocodePlace`** 后规划；文本途经点列表另列 | 名称即真相，展示端反复解析；本 change 不改 |
| 卡片消费 | `frontend/src/trips/TripCard.tsx` 以 `stops.join(' → ')` 渲染摘要 | 不受影响 |
| AI 预填 | `frontend/src/ai/snapshot.ts` `toTripPrefill` → `stops`；`TripCreatePage` 预填时按 `MAX_STOPS` 截断 | 预填写入同一字段，替换 UI 后必须仍可编辑 |
| 导航入口 | `frontend/src/shell/AppShell.tsx` `NAV_ITEMS` 含 `{ key: 'map', label: '旅行地图', href: '#/map' }`；`activeKey` 有 `map` 分支；侧栏与底部栏同源 | 「旅行地图」是**一级导航项**，与发布页路线段职责重叠 |
| 路由 | `frontend/src/route.ts` `Route` 的 `map` 变体、`parseRoute` 三级匹配、`routeToHash` 反向生成 | 去掉入口后 `#/map` 深链必须仍可达 |
| 契约版本 | `RouteME/openapi.yaml` `info.version` = **0.22.0**；`OpenApiTest` 多处断言 | 本 change 不动契约 |
| 迁移号段 | `backend/src/main/resources/db/migration/`（`origin/main`）最新 `V26__ai_itineraries.sql` | 本 change **不占号段** |
| 既有测试 | 前端 `trips/tripForm.test.ts`、`trips/tripDraft.test.ts`、`api.test.ts`；后端 `TripControllerTest`、`TripPlanServiceTest`、`OpenApiTest`、`AmapProxyControllerTest`；E2E `e2e/tests/trips.spec.ts` 发布用例 | 校验与提交链有锚点；路线 UI 无发布侧单测 |
| E2E 现状 | `e2e/tests/trips.spec.ts` 发布用例断言「简单路线」标题，并断言 `[data-testid="china-map"]` / `[data-testid="city-map"]`，而这两个 testid 只存在于 `map/ChinaMap.tsx` / `map/CityTravelMap.tsx`（已无 import） | 发布主流程 E2E **当前必红**，不能当回归锚点，需随本 change 重写 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`；本次触发 `spec-first`、`sdd-artifacts`、`artifact-review-gate`、`web-coding-style`、`web-testing`、`api-contract`（不新增契约，声明不变）、`git-branching-and-pr` | 覆盖规格、评审、样式、测试与分支 |
| 工具链 | JDK 21；Node ≥ 22；Maven Wrapper；Playwright；`openspec` 1.16.1（`%APPDATA%\npm\openspec.cmd`，不在 PATH） | 满足；校验命令用完整路径或 `npx` |
| CI | `.github/workflows/ci.yml`（后端 `./mvnw -B -ntp verify`、前端 `npm run build && npm test`） | 存在；新增测试必须离线可跑 |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `cd ai4se-baseline; npx openspec validate refine-publish-route-map --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test "-Dtest=OpenApiTest"` | 证明契约未变（0.22.0） |
| 后端 | 无新增后端代码；仅跑受影响回归 `"-Dtest=TripControllerTest,TripPlanServiceTest"` | 证明 `stops` 提交口径未变 |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run build` | `tsc --noEmit` + vite build |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run（含新增路线编辑器纯函数用例） |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/trips.spec.ts` | 重写发布主流程断言；`page.route` 注入高德响应，不依赖外网 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色 | 路线段不溢出；模式切换、空态、降级提示可读 |

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`docs/sdd/`、`AGENTS.md` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 见「规则载体」行 |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` 均 ready |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | 沿用 `main` 的 CI/CD 工作流 |

**阶段结论：Pass（required 4/4；P0-4 Skipped 不适用）。**

## 5. 缺口基线（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | **发布页不展示路线。** 路线段只有地名 chips + 静态地图，没有折线、距离、时长 | `TripCreatePage.tsx` 第 2 段；`AmapPlacePicker` 全文未调用 `planRoute` | 发布者无法在提交前确认「走起来是否合理」；这正是发起人要保留的探索页能力 |
| G-02 | **不能在地图上直接增点。** 发布页地图点选只把地名追加进列表，没有反地理编码确认与最近 POI 备选 | `AmapPlacePicker` 的选点分支；对照 `MapExplorerPage.handleMapClick` | 地图退化为装饰；用户仍需先搜到准确地名 |
| G-03 | **途经点不可排序。** 顺序 = 点选顺序，无法把先点的景点挪到后面；也没有清空/计数 | `AmapPlacePicker` 只有新增与删除；`WaypointPanel` 的拖拽/上下移只服务探索页 | 起终点写反只能删了重选 |
| G-04 | **出行方式与路线段分离。** 模式切换在第 3 段，且不触发任何预览 | `TripCreatePage` 第 3 段 `sideTravelMode` 分组；第 2 段无 `mode` 入参 | 用户改「骑行」时看不到路线差异 |
| G-05 | **名称即真相，展示端反复解析。** 后端不校验地名可解析，详情页每次渲染重新 geocode | `TripPlan.create` 只查数量；`AmapTripMap` 逐个地名 `geocodePlace` | 同名/模糊地名会被解析到别处；本 change 以「发布时用地图确认过的地名」缓解，但**不引入坐标** |
| G-06 | **公共交通规划缺城市上下文。** 探索页调用未传 `city`，而 `transit` 服务依赖城市 | `MapExplorerPage` 规划调用；`AmapService.planRoute` 的 `city` 参数 | 发布页必须传 `cityForSearch`；探索页该退化不在本 change 修复范围（记录） |
| G-07 | **导航冗余。** 「旅行地图」占一级导航，与发布页路线段职责重叠 | `AppShell.NAV_ITEMS`（侧栏 + 底部栏同源） | 用户裁决：保留页面、移除入口；`#/map` 深链仍需可用 |
| G-08 | **发布 E2E 已红。** 仍在断言已下线的 SVG 地图 testid | `e2e/tests/trips.spec.ts` 发布用例；`ChinaMap` / `CityTravelMap` 无 import | 当前无有效发布回归锚点；本 change 必须重写而不是继承 |
| G-09 | **发布路线段无单测。** 现有前端单测只覆盖校验与请求体 | `tripForm.test.ts`、`tripDraft.test.ts` | 「顺序 → 提交顺序」「模式映射」没有可执行证据 |
| G-10 | **段标题与能力不符。** `简单路线` 与 `routeSectionHint` 描述的是旧多选框 | `tripMessages.sectionRoute` / `routeSectionHint` | 替换后需改标题与提示，否则文案自相矛盾 |

## 6. 关键基线事实（供 P1 / P3 决策）

1. **渲染层已经通用，可直接复用。** `RouteLayer` 只依赖 `RoutePlan` 与 `RouteWaypoint`，不含页面语义；不需要重写画线或 pin。
2. **编辑期必须有坐标、提交时投影为地名。** `planRoute` 需要带 `lng/lat` 的 `RouteWaypoint`；而契约只有 `stops: string[]`。因此发布页在**组件内持有 `RouteWaypoint[]`**，提交前转成名称数组——这是「不加坐标」与「要画路线」之间唯一自洽的解法。
3. **无契约变更、无迁移。** `stops` / `travel_mode` 字段与响应结构都不动；后端只做数量校验（≥2）的现状保持不变。
4. **出行方式只收 3 档。** `TripTravelMode` 不含 `walking`，发布页不得新增「步行」选项；探索页的 `walking` 仅用于探索。
5. **公共交通必须带城市。** `planRoute(mode, waypoints, city)` 的第三参在 `transit` 下决定可用性，发布页传 `cityForSearch`。
6. **`MAX_STOPS = 8` 是两侧共享常量**，`MIN_STOPS = 2` 两级都校验；「后端未校验 8」属既有不对称，本 change 不扩大范围。
7. **能力必须抽成共享件。** 探索页把状态放在页面本地（`MapExplorerPage` 的 `useState` 群）；若发布页复制一份逻辑，会立即出现两套降级与排序口径。P0 结论：以共享组件/钩子承载「地图 + 增点 + 排序 + 规划 + 渲染」，探索页与发布页都调用它。
8. **导航入口是一行数据。** `NAV_ITEMS`（`AppShell`）同时驱动侧栏与底部栏；移除 `map` 项还要处理 `activeKey` 的 `map` 分支，但**页面与路由保留**。
9. **AI 预填是必须保住的入口。** `toTripPrefill` 与 `TripCreatePage` 的预填截断直接写 `stops`；新编辑器只认 `string[]`，因此预填路径天然兼容，只需验证「预填后仍可拖拽/重排/重算」。
10. **探索页的 `localStorage` 保存不在范围。** `savedRoutes.ts`（键 `routeme.savedRoutes`，上限 20）是浏览器本地收藏，不与发布链路合并。

## 7. 阶段产出

- 本记录：`docs/sdd/refine-publish-route-map/p0-baseline.md`
- 未新增代码、规格或需求文件；P1 起进入提案与 Delta。
- 基线 commit：`origin/main@c058e12`（本地 `main` 与之同点）。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| 记录人（当前开发者） | Jacky | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-18 |
| 规格签署（IO） | WAYNE | REQ-027 为需求来源；能力归属 `trip-plans` MODIFIED | 2026-11-18（随 proposal / Delta 批准） |
| 排期确认（SM） | Lewis | 准入 P1；迭代排期 | 待确认 |

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：只做「发布页路线编辑器 + 共享地图路线组件 + 导航入口收敛」，不做坐标化数据模型、不做路线持久化、不做同行者匹配面板。
- 明确数据口径：编辑期 `RouteWaypoint[]`（含坐标），提交时只写 `stops: string[]` + `travel_mode`；不得出现第二个途经点字段。
- 明确模式口径：发布页维持 `driving / bicycling / transit` 三档，`transit` 必须传城市；不新增「步行」。
- 明确降级口径：高德不可用时按顺序画直线并显式标注「示意 / 估算」，与探索页一致；不得静默降级。
- 明确导航口径：`旅行地图` 从导航项移除，`#/map` 与 `#/map/{省}/{市}` 深链仍可达。
- 明确测试口径：重写 `e2e/tests/trips.spec.ts` 中已失效的 `china-map` / `city-map` 断言；新增「顺序保持」「模式切换」「降级提示」的 E2E 或单测证据。