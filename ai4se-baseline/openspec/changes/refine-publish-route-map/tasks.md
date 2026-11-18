# 任务：refine-publish-route-map

- **依据：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；零后端 / 契约 / 迁移（无契约任务，故不涉及「契约任务排两端之前」）；不改 `MODE_LABELS` 既有值；新样式只追加到 `styles.css` 末段；探索页行为与文案零变化。
- **Owner：** Jacky（当前开发者）
- **状态：** 待执行（P4）。

## 任务清单

### T1 [frontend] 纯逻辑：坐标占位名判定

- [x] 先写 `frontend/src/map/amap/placePick.test.ts`（Red）：
  - `treats the five-decimal map pick fallback as a coordinate placeholder`
  - `rejects coordinate spellings with other decimal lengths and negative values`
  - `keeps readable names that merely mention coordinates`
  - `keeps POI names returned by search`
- [x] 再实现 `frontend/src/map/amap/placePick.ts` 的 `isCoordinatePlaceholderName(name)`（Green）：以前缀 `地图选点` + 一对坐标开头判定，不要求结尾（同名重复会追加「（坐标）」）；**不改** `pointFallbackName`。

**验证：** `cd RouteME/frontend; npx vitest run src/map/amap/placePick.test.ts` → 全绿；`npx tsc --noEmit` → 0 错误。

### T2 [frontend] 纯逻辑：发布侧出行方式守卫

- [x] 新增 `frontend/src/trips/tripOptions.test.ts`（Red）：`accepts only the three publish travel modes`（`driving` / `bicycling` / `transit` 通过；`walking`、空串、未知值拒绝）；`exposes a label for each publish mode and no walking option`（三档都有标签，标签集合不含「步行」）。
- [x] 在 `frontend/src/trips/tripOptions.ts` 实现 `isTripTravelMode(value): value is TripTravelMode`（Green）；`TRIP_TRAVEL_MODES` / `TRIP_TRAVEL_MODE_LABELS` 保持原值。

**验证：** `npx vitest run src/trips/tripOptions.test.ts` → 全绿。

### T3 [frontend] 纯逻辑：提交投影

- [x] 新增 `frontend/src/trips/publishRoute.test.ts`（Red）：
  - `keeps the located stop order and appends unresolved names last`
  - `drops blank names and keeps duplicate names as separate stops`
  - `returns an empty array when there is nothing to submit`
- [x] 新增 `frontend/src/trips/publishRoute.ts` 的 `projectStops(located, unlocated): string[]`（Green）：已定位点按顺序 → 未定位名称按原相对顺序 → 全部 trim、去空白；不按名称去重（同名不同点由坐标区分）。

**验证：** `npx vitest run src/trips/publishRoute.test.ts` → 全绿。

### T4 [frontend] 纯逻辑：表单校验兜底占位名

- [x] 在 `frontend/src/trips/tripForm.test.ts` 追加（Red）：
  - `rejects a stop that is still a coordinate placeholder`
  - `accepts a readable name that contains coordinates in parentheses`
  - `still requires at least two stops before the placeholder check`
- [x] 在 `frontend/src/trips/tripForm.ts` 的 `validateTripForm` 中，于「至少两个点」检查之后追加占位名分支：任一 `stop` 命中 `isCoordinatePlaceholderName` → `errors.stops = tripMessages.errorStopsPlaceholder`（Green）。
- [x] `frontend/src/i18n/tripMessages.ts` 追加 `errorStopsPlaceholder`（文案：「途经点不能是坐标占位名，请改为可识别的地名」）；追加位置在文件末尾，不重排既有键。

**验证：** `npx vitest run src/trips/tripForm.test.ts` → 全绿。

### T5 [frontend] 共享逻辑：`useRoutePlan` + 探索页接入

- [x] 新增 `frontend/src/map/amap/useRoutePlan.ts`：签名与行为见 `design.md` D6（`generate` / 请求闸门 / 自动重算 / 直线降级 / 城市仅公共交通 / 文案注入 / messages 用 ref）。
- [x] `frontend/src/pages/MapExplorerPage.tsx` 改用它，删除重复的 `route` / `planning` / `routeRequested` / `routeError` / `estimateNote` 状态与 3 个规划 `useEffect`；探索页传入逐字保留的原文案，`city` 传 `undefined`。**不改**景点层、同行者面板、收藏、日期范围与布局。
- [x] 探索页的 `generate` 仍先清 `focusId` 再触发生成。

**验证：** `npx tsc --noEmit`；`npx vitest run`；`cd RouteME/e2e; npx playwright test tests/map.spec.ts tests/trips.spec.ts` → 探索页与详情页现状不回归（发布用例在 T12 前允许因途经点录入方式待改而红，先记录）。

### T6 [frontend] 共享组件：面板参数化

- [x] `frontend/src/map/amap/WaypointPanel.tsx` 增加可选 `modes`（默认 `['walking', 'driving', 'bicycling']`）、`modeLabels`（默认 `MODE_LABELS`）、`emptyHint`（默认现有文案）、`modeAriaLabel`（默认「出行方式」）；`Segmented` 选项由 `modes` + `modeLabels` 生成，并补 `aria-label`。
- [x] `frontend/src/map/amap/ItineraryPanel.tsx` 增加可选 `modeLabels`，两处模式文案改为 `labels[...] ?? MODE_LABELS[...]`。
- [x] `MODE_LABELS` 一个值都不改；探索页不传新 props。

**验证：** `npx tsc --noEmit`；`npx playwright test tests/map.spec.ts` → 探索页仍显示「步行 / 驾车 / 骑行」，路线与统计不变。

### T7 [frontend] 组件：`PublishRouteEditor`

- [x] 新增 `frontend/src/trips/PublishRouteEditor.tsx`，组合 `AmapContainer` + `PlaceSearchBox` + `RouteLayer` + `WaypointPanel` + `ItineraryPanel`，内部状态见 `design.md` D4 / D5：
  - [x] 搜索选点、地图点选（反地理编码 + 附近 POI 候选）、重复点不重复加入、8 点上限拦截并提示；
  - [x] 拖拽 / 上下按钮排序、单点删除、清空；每次变更投影 `stops` 回父级；
  - [x] 出行方式用 `isTripTravelMode` 守卫后回传 `onTravelModeChange`；调用 `useRoutePlan` 时传目的地城市与中性降级文案；
  - [x] 地图点选命中占位名时弹命名对话框（`data-testid="publish-stop-name-dialog"`），确认 / 取消 / 空输入三条路径；
  - [x] 父级 `stops` 变化（AI 预填 / `from` / 草稿）时按城市并发地理编码，未定位项进 `.publish-route-unresolved`（可「重新定位」/「移除」），解析中显示 `正在定位预填途经点…`；
  - [x] `invalid` 传到搜索框（`aria-invalid`），`inputId="trip-stops"` 保证既有 label 关联。
- [x] 不引入 `ScenicLayer`、同行者匹配、收藏路线、日期范围。

**验证：** `npx tsc --noEmit`；组件先由 T12 的 E2E 覆盖（仓库无组件测试层）。

### T8 [frontend] 页面：发布页接入与文案

- [x] `frontend/src/trips/TripCreatePage.tsx`：第 2 段 `fieldStops` 的 `AmapPlacePicker` 换成 `<PublishRouteEditor>`，保留 `sectionRoute` 卡片、`route-ai-recommend` 按钮与提示位；**保留**集合地点的第二个 `AmapPlacePicker` 与 `cityForSearch`。
- [x] 删除第 3 段「同行与预算」里的旧 `Segmented`（`TRIP_TRAVEL_MODES` / `sideTravelMode`）与不再使用的 import；出行方式只由编辑器回传。
- [x] `frontend/src/i18n/tripMessages.ts`：`sectionRoute` → 「路线规划」；`routeSectionHint` → 「在地图上添加并排序途经点，实时查看路线与距离」；追加 `routeSearchPlaceholder` / `routeSearchAriaLabel` / `routeEmptyHint` / `routeUnresolvedTitle` / `routeUnresolvedHint` / `routeNamingTitle` / `routeNamingPlaceholder` / `routeNamingConfirm` / `routeFallbackNote` / `routeFailureNote` / `routePrefillResolving`。
- [x] 不改 `TripFormValues`、`toCreateRequest`、草稿读写。

**验证：** `npx tsc --noEmit`；手动走查 `/ #/trips/new` 三段标题与提交；`npx playwright test tests/trips.spec.ts`（途经点步骤在 T12 重写前先记录差异）。

### T9 [frontend] 外壳：移除旅行地图导航入口

- [x] `frontend/src/shell/AppShell.tsx`：删 `NAV_ITEMS` 的 `map` 项、`NAV_GROUPS`「浏览」的 `map` filter、`activeKey` 的 `map` 分支、`NavKey` 联合与 `NavIcon` 的 `map` 分支（`design.md` D8）。
- [x] 保留 `map` 路由、页面与三级深链；不碰同行者/举报等其它菜单项。

**验证：** `npx tsc --noEmit`；手动访问 `#/map`、`#/map/440000`、`#/map/440000/440100` 正常渲染，导航条无「旅行地图」。

### T10 [frontend] 样式：发布页路线编辑器

- [x] `frontend/src/styles.css` 末段追加 `.publish-route-editor` / `.publish-route-canvas` / `.publish-route-side` / `.publish-route-unresolved` / `.publish-route-name-dialog` 等规则（`design.md` D9）：只覆盖发布页内部的地图高度与两栏，不改 `.amap-container` / `.amap-side-card` 全局定义；颜色只用既有令牌。
- [x] 断点：≤1100px 单列，≤640px 地图 300px；不新增 `[data-theme="dark"]` 规则（令牌自动生效）。

**验证：** 1440 / 768 / 390 手动走查无横向滚动；`git diff` 中 `styles.css` 只新增末段。

### T11 [e2e] 测试基建：抽出 AMap 替身

- [x] 把 `e2e/tests/ai-planner.spec.ts` 的 `installAmapStub` 抽到 `e2e/tests/support/amapStub.ts`，保留 `__amapPois` / `__amapRouteCalls` / `__amapStubConfig` / `__amapClick` 全局名；导出 `installAmapStub` / `setAmapRouteFail` / `clickMapAt`。
- [x] 新增 `__amapTransferOptions` 记录 `Transfer` 构造参数（用于公共交通城市断言），其余替身行为不变。
- [x] `ai-planner.spec.ts` 改为 import 共用替身，删掉本地副本，断言与用例名不变。

**验证：** `cd RouteME/e2e; npx playwright test tests/ai-planner.spec.ts` → 与改动前同样的用例数全绿。

### T12 [e2e] 用例：发布页路线编辑器

- [x] 新增 `e2e/tests/publish-route-map.spec.ts`，覆盖 ATDD #8–#18（用例名见 `atdd-design.md` §1），并加一条 `removes the map nav entry but keeps deep links working`。
- [x] 重写 `e2e/tests/trips.spec.ts` 的途经点录入：删除 `pickPlace(page, '途经点', …)` 的 `AmapPlacePicker` chip 路径，改用 `.publish-route-editor` 内的搜索 / 地图锚点；保留集合地点、AI 入口与既有基线断言。
- [x] 清理该文件内已失效的 `china-map` / `city-map` 断言（发布页目的地已改为 `AreaCascader`，属既有债务，只做最小修正）；`map.spec.ts` 不动。
- [x] 断言用语义化选择器；结构断言限于 `.amap-route-svg path` / `.amap-stop-number` / `.amap-stop-tag`；不用 `waitForTimeout`。

**验证：** `npx playwright test tests/publish-route-map.spec.ts tests/trips.spec.ts` → 全绿；再跑 `tests/map.spec.ts tests/ai-planner.spec.ts` 确认共用替身与探索页无回归。

### T13 [verify] 回归与验证报告

- [x] 前端：`npm run typecheck`、`npm run build`、`npm test`。
- [x] 端到端：`npx playwright test tests/publish-route-map.spec.ts tests/trips.spec.ts tests/map.spec.ts tests/ai-planner.spec.ts`。
- [x] 后端未改动仍跑一次 `backend/mvnw.cmd -B -o clean test`，确认零误伤。
- [x] 反向复核 Non-goals：`git diff --name-only origin/main...HEAD` 不含 `backend/**`、`openapi.yaml`、`db/migration/**`。
- [x] `docs/ai4se-plugins/<ts>-local-verify-report.md` 记录 Red 证据、Green 结果与命令原文摘要。

**验证：** 报告落在 `docs/ai4se-plugins/`，命令与输出可复现；`@rule:web-testing` 检查项逐条勾选。

### T14 [docs] 阶段记录与截图

- [x] `docs/preview/refine-publish-route-map/publish-route-{390,768,1440}-{light,dark}.png`；dark 用 `document.documentElement.dataset.theme = 'dark'` 设置；在 `docs/preview/README.md` 索引登记目录。
- [x] `docs/sdd/refine-publish-route-map/p4-verify.md` 记录实现、测试、G2 签署与遗留项。
- [x] 更新 `requirement-workspace/registry.md`、`requirement-workspace/stories.md`、`docs/sdd/README.md` 的 REQ-027 / S28 状态。

**验证：** 链接可达；截图命名符合 `@rule:sdd-artifacts`；registry 状态与提交链一致。

## 依赖与顺序

1. **Red 批：** T1–T4 先写纯逻辑用例并跑红（函数/校验尚不存在）。
2. **共享件：** T5（规划 hook，先保证探索页不变）→ T6（面板参数化）。
3. **发布页：** T7（编辑器）→ T8（页面接入与文案）→ T10（样式）。
4. **外壳：** T9 可与 T8 并行（互不依赖）。
5. **测试：** T11（替身抽取，先跑通 `ai-planner`）→ T12（新用例 + `trips.spec` 重写）。
6. **收口：** T13（回归与报告）→ T14（截图与阶段记录）。

T12 依赖 T7–T11；T13 依赖全部实现任务；T14 依赖 T13 的验证结论。T5 的探索页回归必须在 T8 之前跑通，避免把「发布页问题」误判成「共享件改坏探索页」。