# 变更提案：refine-publish-route-map

- **需求来源：** 发起人 2026-11-18 验收反馈：「旅行地图有点冗余，但它在地图上显示路线、添加目的地的能力很好；用它替掉发布行程里的简单路线」｜ **编号登记：** REQ-029 / S30（已登记于 `requirement-workspace/registry.md`）
- **能力：** `trip-plans`（MODIFIED 1 Requirement，新增 11 Scenario，基线 7 Scenario 保留）
- **规模：** S–M（纯前端重排 + 共享组件抽取 + 1 个 E2E 重写；**无契约变更、无迁移**）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:artifact-review-gate`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:api-contract`（声明「不变」）、`@rule:git-branching-and-pr`
- **基线：** `origin/main@c058e12`（契约 0.22.0，迁移最新 `V26`）
- **阶段记录：** `docs/sdd/refine-publish-route-map/p0-baseline.md`

## Why

地图路线能力已经存在，但它长在「旅行地图」这个独立页面上；而**发布行程**才是用户真正要交代路线的地方。发布页第 2 段现名「简单路线」，实际只是 `AmapPlacePicker mode="multi" showMap` 的一个地名多选框（`TripCreatePage` 第 2 段）：不画路线、不给距离与时间、不能排序、切换出行方式也不会重算（P0 §5 G-01…G-04）。

结果是两头都别扭：

- **发布者**提交前看不到自己要走的路线，途经点写反只能删了重选；
- **浏览者**打开「旅行地图」时面对的是一个与发布流程无关的探索器，而详情页的路线靠地名重新 geocode（`AmapTripMap` 的解析 `useEffect`），发布时的「地图确认」价值没有留下来；
- 同一个「地图 + 路线」被实现两次（`MapExplorerPage` 的 `useState` 群与发布页的 `AmapPlacePicker`），口径已经开始分叉：探索页规划公共交通时甚至没有传城市（`MapExplorerPage` 的规划调用 vs `AmapService.planRoute` 的 `city` 参数）。

因此本 change 做三件事：把发布页路线段换成**地图路线编辑器**；把编辑、规划、渲染抽成**共享件**供探索页复用；把「旅行地图」从一级导航移除（页面与深链保留），让入口回到它该在的地方——发布行程。

## What Changes

### D1 发布页路线段改为地图路线编辑器（in scope）

第 2 段保留同一张卡片、同一个 `stops` 字段，内容替换为**探索页现有的那套面板**，不另做一套：

- 地图（`AmapContainer`）+ 关键字搜索（`PlaceSearchBox`）+ 地图点选（反地理编码 → 「使用该位置 / 用这个景点」二选一，`placePick`）；
- 途经点面板 `WaypointPanel`：`已选途经点 n/8`、拖拽或上下按钮排序、单点删除、清空、出行方式、生成按钮；
- 行程统计与顺序 `ItineraryPanel`：总距离 / 预计时间 / 途经点数 + 逐段说明；
- 路线折线 + 起/终/编号 pin（`RouteLayer`）；
- 少于 2 点时给出空态与「至少两个途经点」提示，生成按钮禁用。

**交互节奏沿用现有实现**：首次由用户点「生成旅行路线」触发规划；生成之后，增删途经点、调整顺序、切换出行方式都会自动重算（`MapExplorerPage` 的规划 `useEffect` 已按此依赖工作）。本 change 不改成「边加边算」。

### D2 编辑期持坐标、提交时只交地名（in scope）

组件内部状态是 `RouteWaypoint[]`（含 `lng/lat`、`id`），提交时投影为 `stops: string[]`；`TripFormValues`、`TripCreateRequest`、`trip_plans.stops`、响应结构**全部不变**。理由：`planRoute` 必须要坐标，而契约只有名称；在边界上做一次投影是唯一不引入迁移的解法（P0 §6.2）。

### D3 出行方式控件移入路线段，字段与语义不变（in scope）

第 3 段「同行与预算」里的 `Segmented`（`aria-label` = `tripMessages.sideTravelMode`）整体移进第 2 段，仍绑定 `values.travelMode`、仍用同一 `aria-label`、仍是三档。发布页**不新增「步行」**（`TripTravelMode` 不含 `walking`）；探索页的 `walking` 只服务探索。

### D4 复用现有面板，但模式行必须参数化（in scope）

`WaypointPanel` 与 `ItineraryPanel` 直接复用，**不改两端各自的视觉与交互**。但现有实现把模式行写死为 `步行 / 驾车 / 骑行`（`WaypointPanel` 的 `Segmented` 选项，无 `transit`），标签表 `MODE_LABELS` 把 `driving` 写作「驾车」，`ItineraryPanel` 也复用它。若原样搬进发布页，会同时出现三个错：多出「步行」、缺「公共交通」、「自驾」被写成「驾车」。

因此共享件必须接收**模式列表与标签**（例如 `modes` / `modeLabels` 两个 prop）：

- 发布页传 `['driving', 'bicycling', 'transit']` + `TRIP_TRAVEL_MODE_LABELS`（自驾 / 骑行 / 公共交通）；
- 探索页不传则保持现状（步行 / 驾车 / 骑行），行为与文案零变化。

`ItineraryPanel` 的模式标题同样取自传入标签，不得自带第二张标签表。探索页的同行者匹配面板、收藏路线（`savedRoutes`）与城市深链保持原样。

### D5 段标题与提示更新（in scope）

`sectionRoute`：`简单路线` → `路线规划`；`routeSectionHint` 改为「在地图上添加并排序途经点，实时查看路线与距离」。同步更新 `e2e/tests/trips.spec.ts` 发布用例的标题断言。

### D6 降级口径沿用，但文案改为面向用户（in scope）

高德路线服务不可用时按顺序画直线（虚线），并显式提示「已按直线显示途经点顺序，距离与时间为本地估算」；不得静默降级，也不得整块地图空白。

但探索页现有提示会把实现细节写给用户：「高德路线服务不可用（地图代理不可达：请确认后端已启动（默认 8080），然后重新加载地图。）」。发布页**不得**出现后端、端口、代理、重载地图这类开发者口径；共享件需按场景注入提示文案，或统一使用中性文案（例如「路线服务暂时不可用，已按途经点顺序显示直线，距离与时间为估算」）。

### D7 导航入口收敛（in scope）

`AppShell.NAV_ITEMS` 中的 `{ key: 'map', label: '旅行地图', href: '#/map' }` 从 `NAV_ITEMS` 移除，并清理 `activeKey` 的 `map` 分支；**页面组件、`#/map`、`#/map/{省码}`、`#/map/{省码}/{市码}` 全部保留**。`design-system`「应用外壳与导航」条不改（其列举的三项本就不含旅行地图，导航项清单不在该条的可判定范围内）。

### D8 测试锚点重建（in scope）

`e2e/tests/trips.spec.ts` 中 `china-map` / `city-map` 断言指向已无渲染方的下线组件，当前必红（P0 §5 G-08）：本 change 重写为 AMap 口径，而不是保留既有断言。新增覆盖：地图增点、排序后顺序保持、模式切换重算、降级提示、AI 预填后可编辑。

### D9 占位名不得进入发布（in scope）

地图点选在反地理编码失败时会用 `pointFallbackName` 生成 `地图选点 109.11728, 33.86976` 这样的**坐标占位名**（截图中两条途经点就是这种名字）。它能在地图上正确连线，但一旦随发布落库，详情页 `AmapTripMap` 会拿这串文字去 `geocodePlace` 并失败，浏览者看到的将是没有路线的行程；`TripCard` 也会直接显示坐标串。

因此发布前必须拦截：提交时若任一途经点名称仍是坐标占位名，MUST 拒绝并提示用户改成可解析的地点名（从候选选择、或用「用这个景点」取到 POI 名称）。具体 UX（禁止加入 / 允许加入但提交前拦截 / 要求补名称）在 P3 定稿。

> 说明：探索页没有这个约束是对的——它不落库，坐标名只是临时显示。差异由发布侧的提交校验承担，不改 `pointFallbackName` 本身。

### 影响面

| 层 | 文件 | 变更 |
|---|---|---|
| 页面 | `frontend/src/trips/TripCreatePage.tsx` | 第 2 段替换为路线编辑器；`travelMode` 控件移入；提交前做占位名校验 |
| 组件 | `frontend/src/map/amap/WaypointPanel.tsx` | 模式行改为可传入 `modes` / `modeLabels`；默认值保持现状（步行 / 驾车 / 骑行） |
| 组件 | `frontend/src/map/amap/ItineraryPanel.tsx` | 模式标题取自传入标签，不再直接用 `MODE_LABELS` |
| 组件 | `frontend/src/map/amap/`（共享路线编辑器：复用 `AmapContainer` / `RouteLayer` / `PlaceSearchBox` / `WaypointPanel` / `ItineraryPanel` / `placePick`） | 抽取「地图路线编辑器」；降级文案可注入 |
| 页面 | `frontend/src/pages/MapExplorerPage.tsx` | 改用共享件；移除重复状态与规划逻辑；行为与文案不变 |
| 外壳 | `frontend/src/shell/AppShell.tsx` | 移除 `map` 导航项与 `activeKey` 分支 |
| 文案 | `frontend/src/i18n/tripMessages.ts` | `sectionRoute` / `routeSectionHint` / 占位名校验提示 / 中性降级提示 |
| 契约 | `openapi.yaml` | **不改**（0.22.0） |
| 数据库 | `db/migration/` | **不新增**（最新 `V26`） |
| 后端 | `backend/**` | **不改** |
| 测试 | `frontend/src/trips/*.test.ts`、`frontend/src/map/amap/*.test.ts`、`e2e/tests/trips.spec.ts` | 新增/重写（含模式列表与占位名拦截） |

### 验收口径

| # | 可观察结果 | 追溯 |
|---|---|---|
| AC-1 | 发布页路线段展示地图、`已选途经点 n/8` 面板与 `行程顺序` 面板；加入 2 个及以上地点后点「生成旅行路线」，出现折线、起点/终点与编号 pin、总距离与总时长 | Delta「在地图上添加途经点并看到路线」 |
| AC-2 | 搜索选点与地图点选都能加入途经点；重复点不重复加入；超过 8 个时被拦截并提示 | Delta「在地图上添加途经点并看到路线」+「途经点超过上限时被拦截」 |
| AC-3 | 拖拽或上下按钮调整顺序后，折线与编号即时按新顺序重排；提交后详情页按同一顺序展示 | Delta「途经点顺序可调整」 |
| AC-4 | 切换 `自驾 / 骑行 / 公共交通` 会重算路线，且面板标题同步；公共交通请求带上目的地城市；发布页不出现「步行」、也不出现探索页的「驾车」 | Delta「切换出行方式重算路线」+「公共交通使用目的地城市规划」 |
| AC-5 | 高德不可用时显示直线虚线并给出「示意 / 估算」说明，页面不空白、不假装是真实路线；提示不出现后端、端口、代理、重载等实现细节 | Delta「路线服务不可用时按顺序直线示意」+「降级提示不暴露实现细节」 |
| AC-6 | 提交请求体仍只有 `stops: string[]`（按当前顺序、去空）与 `travel_mode`；契约与服务端响应无差异 | Delta「发布只提交地名与出行方式」 |
| AC-7 | 导航中不再出现「旅行地图」；`#/map`、`#/map/{省码}`、`#/map/{省码}/{市码}` 仍可直达并正常渲染，且探索页仍是「步行 / 驾车 / 骑行」 | D7 + D4 + E2E（见下） |
| AC-8 | AI 推荐预填的途经点进入同一编辑器，可继续排序、删除、重算；发布链路与普通发布一致 | Delta「AI 预填路线进入编辑器后可编辑」 |
| AC-9 | 1440 / 1024 / 768 / 390 与浅 / 深色下无横向溢出，路线段可读 | Delta「窄屏与双主题不溢出」 |
| AC-10 | 途经点仍是 `地图选点 {lng}, {lat}` 占位名时无法发布，并给出可读的改名提示；改名后可正常发布 | Delta「坐标占位名不得进入发布」 |

> AC-7 为什么没有独立 Scenario：`design-system`「应用外壳与导航」条只约束「顶栏 + 主导航 / 窄屏底部导航 + 当前页可辨认」，并未列举「旅行地图」这一项；移除入口不改变该条的可判定行为，因此不写 Delta、不改该能力。它作为本提案的 UI 约束，由 `trips.spec.ts` 的导航断言与 `#/map` 深链回归覆盖。

### 风险与处置

| 风险 | 处置 |
|---|---|
| 抽共享件时把探索页改坏（同行者面板、收藏、城市深链） | 探索页行为列为回归项：`#/map/{省}/{市}` 深链、收藏、匹配面板、模式行（步行 / 驾车 / 骑行）逐条走查；共享件只接管地图/路线职责 |
| 复用面板导致模式行串味（多出步行、缺公共交通、自驾写成驾车） | D4 要求传入 `modes` / `modeLabels`；探索页不传保持现状，发布页传三档发布标签；P4 用 E2E 分别断言两端选项 |
| 地图点选的坐标占位名被提交 | D9：提交前拦截 `地图选点 {lng}, {lat}` 并要求改名；P3 定 UX，P4 用单测 + E2E 各覆盖一条 |
| 降级提示暴露后端/端口 | D6：共享件注入文案，发布页使用中性提示；P4 断言提示文本不含 `8080` / 「代理」 |
| `RouteLayer` 每次 `onChange` 重投影带来的性能抖动（8 点 + 7 段折线） | 沿用现有实现；若出现卡顿，在 P3 记录为已知债务，本 change 不重写渲染 |
| E2E 依赖外网高德 | 用 `page.route` 拦截 `/api/amap/**` 注入固定响应，与既有范式一致 |
| 与未归档 change 的 Delta 冲突（`refine-trip-map`、`add-trip-publish` 同样 MODIFY 该 Requirement） | 以 Living Spec 为基线撰写 Delta；归档串行，本 change 是发布页路线段的权威 |

### 不做的事（out of scope）

- 不加坐标、`place_id`、polyline 列；不做迁移；契约版本保持 0.22.0。
- 不改详情页 `AmapTripMap` 的「按名称重算路线」口径。
- 不做路线持久化 / 收藏 / 分享（探索页 `routeme.savedRoutes` 保持浏览器本地，单独一条线）。
- 不做同行者匹配面板进发布页、不做路线重合度打分。
- 不改 AI 规划页与 AI 快照结构；只保证预填进入新编辑器可编辑。
- 不修探索页公共交通未传城市的既有缺陷（P0 G-06 已记录，本 change 只保证发布页传城市）。
- 不重写探索页专属的 `map.spec.ts` 历史债务（除非它因入口移除而直接失败，届时只做最小修正）。