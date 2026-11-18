# 设计：refine-publish-route-map

- **Change：** `refine-publish-route-map`（REQ-027 / S28，`trip-plans` MODIFIED）
- **输入：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`atdd-design.md`](atdd-design.md)、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)、[`consistency-lint.md`](consistency-lint.md)
- **结论：** 发布页第 2 段换成地图路线编辑器，**复用探索页现有面板**，只抽出一条共享的规划逻辑 `useRoutePlan`（规划 / 直线降级 / 城市 / 可注入文案），不搬探索页的其余状态与布局。零后端、零契约、零迁移。

## 关键取舍

### D1 共享边界：抽「规划逻辑」而不是抽「整块编辑器」

| 方案 | 行为 | 结论 |
|---|---|---|
| 把 `MapExplorerPage` 整块抽成 `<RouteEditor>`，两端共用 | 会把景点图钉、同行者匹配、收藏路线、日期范围一起带进发布页；探索页布局被迫改造 | 否决 |
| 只抽规划逻辑 + 复用面板，发布页自己组织布局 | 探索页只删 3 个 `useEffect` 与 5 个 `useState`；发布页按自己的卡片排版组合 | 采用 |
| 两套各写一份规划逻辑 | 继续分叉（探索页公共交通至今没传城市），本 change 的核心缺口没解决 | 否决 |

共享件只有 `frontend/src/map/amap/useRoutePlan.ts`。面板（`WaypointPanel` / `ItineraryPanel` / `RouteLayer` / `AmapContainer` / `PlaceSearchBox` / `placePick`）保持各自职责，只按 D2 增加可选入参。

### D2 面板参数化：模式清单与标签由调用方注入

现状 `WaypointPanel` 把三档写死为 `步行 / 驾车 / 骑行`（无 `transit`），`ItineraryPanel` 直接 import `MODE_LABELS`。若原样搬进发布页，会同时错三处：多「步行」、缺「公共交通」、「自驾」显示成「驾车」。

| 方案 | 行为 | 结论 |
|---|---|---|
| 直接改 `MODE_LABELS.driving = '自驾'` | 探索页同步变成「自驾」，与「探索页保持 步行 / 驾车 / 骑行」冲突 | 否决 |
| 再建一张发布侧标签表 | 两张表各自漂移，`ItineraryPanel` 仍拿错表 | 否决 |
| 加可选 `modes` / `modeLabels`，默认值保持现状 | 探索页不传 → 代码路径与文案零变化；发布页注入 `TRIP_TRAVEL_MODES` + `TRIP_TRAVEL_MODE_LABELS` | 采用 |

```ts
// WaypointPanel.tsx（新增可选入参，其余 props 不变）
type Props = {
  waypoints: RouteWaypoint[];
  mode: TravelMode;
  maxStops: number;
  planning: boolean;
  routeRequested: boolean;
  onModeChange: (mode: TravelMode) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onFocus: (id: string) => void;
  onGenerate: () => void;
  /** 默认 ['walking', 'driving', 'bicycling']；发布页传 TRIP_TRAVEL_MODES。 */
  modes?: readonly TravelMode[];
  /** 默认 MODE_LABELS；发布页传 TRIP_TRAVEL_MODE_LABELS。 */
  modeLabels?: Partial<Record<TravelMode, string>>;
  /** 默认探索页空态文案；发布页换成不含「景点」的提示。 */
  emptyHint?: string;
  /** 默认「出行方式」；只影响可访问名，不改视觉。 */
  modeAriaLabel?: string;
};

// ItineraryPanel.tsx（新增可选入参）
type Props = { /* 既有四项 */ modeLabels?: Partial<Record<TravelMode, string>> };
```

- `MODE_LABELS` 的值**一个都不改**（`driving` 仍是「驾车」）；发布侧只读 `TRIP_TRAVEL_MODE_LABELS`。
- `Segmented` 选项由 `modes.map((value) => ({ value, label: modeLabels[value] }))` 生成；`onChange` 仍回传 `TravelMode`，调用方用 D3 的守卫收窄。
- `ItineraryPanel` 的两处 `MODE_LABELS[...]` 改成 `labels[...] ?? MODE_LABELS[...]`，保证探索页即使漏传也不会显示空白。

### D3 类型边界：`TravelMode` ⊃ `TripTravelMode`，用守卫而不是泛型

`TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit'`；`TripTravelMode = 'driving' | 'bicycling' | 'transit'`。给共享件加泛型会把面板签名复杂化，收益不足。

```ts
// frontend/src/trips/tripOptions.ts
export function isTripTravelMode(value: unknown): value is TripTravelMode {
  return value === 'driving' || value === 'bicycling' || value === 'transit';
}
```

- `WaypointPanel.onModeChange` 在发布页包一层：`if (isTripTravelMode(next)) onTravelModeChange(next)`；不合法值直接忽略（探索页不需要该守卫）。
- 发布页不渲染 `walking` 选项，也不写 `walking` 分支；`planRoute` 收到的模式一定在 `TravelMode` 内。

### D4 状态归属：编辑期持坐标，提交时投影为地名

| 状态 | 归属 |
|---|---|
| `stops: string[]` / `travelMode: TripTravelMode` | `TripFormValues`（父级，草稿与提交的唯一事实源） |
| `located: RouteWaypoint[]`（含 `lng/lat`） | `PublishRouteEditor` 内部 |
| `unlocated: string[]` | `PublishRouteEditor` 内部（见 D5） |
| 地图实例 / 候选点 / 命名弹窗 / 焦点 | `PublishRouteEditor` 内部 |

```ts
// frontend/src/trips/publishRoute.ts
/** 提交投影：已定位点按顺序在前，未定位名称按原相对顺序追加在后；去空白、不去重同名。 */
export function projectStops(
  located: readonly RouteWaypoint[],
  unlocated: readonly string[],
): string[];
```

- 每次增 / 删 / 排序 / 改名后调用 `onChange(projectStops(nextLocated, unlocated))`，并用 ref 记下本次投影结果，避免父级回传触发重复地理编码。
- 父级 `stops` 变化（AI 预填、`from` 参考行程、草稿恢复）时，若与 ref 记录不同才重新解析，形成单向数据流：**父级是名称权威，编辑器是坐标权威**。
- `TripFormValues`、`TripCreateRequest`、草稿结构（`tripDraft`）都不改；`toCreateRequest` 已有的 trim + drop-empty 保留，投影只保证顺序与「不含占位名」。

### D5 预填与未定位：可见、可移除、可重试，不静默丢

AI 快照与参考行程只给名称（`toTripPrefill` → `snapshot.stops.map(s => s.name)`），编辑器必须重新拿坐标：

1. 用 `geocodePlace(name, city)`（内部先搜索、再地理编码、最后离线地名库）并发解析，最多 8 个；
2. 解析成功 → 进入 `located`，参与画线、排序与规划；
3. 解析失败 → 进入 `.publish-route-unresolved` 列表，显示名称 +「重新定位」/「移除」；文案明说「未定位的地点按名称保留，排在已定位地点之后」；
4. 提交时未定位名称仍按顺序进入 `stops`——它们是可读地名，详情页有既有的「有 N 个途经点未能定位」提示兜底；**不静默删除用户数据**。

被否决的方案：把未定位点按城市中心伪造坐标（会让浏览者看到错误位置）；解析失败即禁止发布（会把「高德/离线库没收录」变成发布阻断，且与详情页既有降级口径冲突）。

### D6 规划时机与降级文案：逻辑进 hook，文案由调用方注入

```ts
// frontend/src/map/amap/useRoutePlan.ts
export type RoutePlanMessages = {
  /** 错误原因 → 面向用户的失败说明；默认 amapErrorMessage。 */
  describeFailure?: (reason: unknown) => string;
  /** 直线降级提示；入参是 describeFailure 的结果。发布页可忽略入参，用中性文案。 */
  fallbackNote: (failure: string) => string;
};

export type RoutePlanState = {
  route: RoutePlan | null;
  planning: boolean;
  routeError: string | null;
  estimateNote: string | null;
  routeRequested: boolean;
  generate: () => void;
};

export function useRoutePlan(
  waypoints: RouteWaypoint[],
  mode: TravelMode,
  city: string | undefined,
  messages: RoutePlanMessages,
): RoutePlanState;
```

行为逐条对应现状（`MapExplorerPage` 156–199 行）：

1. `!routeRequested || waypoints.length < 2` → `route = null`、`estimateNote = null`，不发请求；
2. `routeRequested` 为真时，增删点 / 排序 / 换模式 / 换城市都会重新规划；
3. `planRoute(mode, waypoints, mode === 'transit' ? city : undefined)`；
4. 失败 → `straightLineRoute(mode, waypoints)` + `estimateNote = fallbackNote(describeFailure(reason))`；
5. 直线也失败 → `route = null`、`routeError = describeFailure(reason)`；
6. 途经点降到 2 个以下 → `routeRequested` 复位；
7. `messages` 用 ref 持有，不进依赖数组（避免调用方每次渲染传新对象导致重复请求）。

两端注入的文案：

| 调用方 | `describeFailure` | `fallbackNote` |
|---|---|---|
| 探索页 | 默认 `amapErrorMessage` | `高德路线服务不可用（${failure}），已按直线显示途经点顺序，距离与时间为本地估算。`（逐字保留现状） |
| 发布页 | `() => '路线服务暂时不可用'` | `路线服务暂时不可用，已按途经点顺序显示直线示意，距离与时间为本地估算。` |

发布页**不使用** `amapErrorMessage` 的结果：该函数会输出「请确认后端已启动（默认 8080）」「地图代理不可达」「高德 Key…」等实现细节，违反 Delta 的「降级提示 MUST NOT 出现后端服务名、端口、代理或重载」。

探索页 `city` 传 `undefined`，保持「探索页公共交通未传城市」的现状不动（P0 G-06，本 change 不修）。

### D7 占位名：加入时引导命名 + 提交时兜底

```ts
// frontend/src/map/amap/placePick.ts
/**
 * 坐标占位名判定：以 `pointFallbackName` 的前缀 + 一对坐标开头即命中。
 * 不要求结尾，因为同名重复时 `pickedPlaceName` 会在占位名后追加「（坐标）」。
 */
export function isCoordinatePlaceholderName(name: string): boolean;
// /^地图选点\s+-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/
```

两层：

1. **加入时（发布页地图点选）**：逆地理失败 → 候选卡片仍显示「使用该位置」，点击后弹命名对话框（`data-testid="publish-stop-name-dialog"`，输入框「途经点名称」）。确认 → 用用户输入的名字加入；取消 → 放弃该点；空输入 → 留在对话框并提示。搜索候选与「用这个景点」拿到的是真实 POI 名称，不弹窗。
2. **提交时（表单校验）**：`validateTripForm` 在「至少两个点」之后追加占位名分支，命中则 `errors.stops = tripMessages.errorStopsPlaceholder`，提交不发出。这是兜底，覆盖草稿恢复、`from` 参考行程、未来的手工数据等不经过第 1 层的路径。

被否决：只做提交拦截（用户点选后仍看到坐标串，直到发布才被打回）；只做加入时引导（历史/预填数据仍可能带占位名）。`pointFallbackName` 本身不改——探索页不落库，坐标名在探索页是合理兜底。

### D8 导航入口：只删条目，不删页面

`frontend/src/shell/AppShell.tsx` 删除四处：

1. `NAV_ITEMS` 的 `{ key: 'map', label: '旅行地图', href: '#/map' }`；
2. `NAV_GROUPS` 的「浏览」分组 filter 去掉 `|| item.key === 'map'`（该组只剩 `discover`）；
3. `activeKey` 的 `route.name === 'map'` 分支；
4. `NavKey` 联合类型与 `NavIcon` 的 `map` 分支（删条目后成为死代码）。

保留：`App.tsx` / `route.ts` 的 `map` 路由、`MapExplorerPage`、`#/map`、`#/map/{省码}`、`#/map/{省码}/{市码}`。`design-system`「应用外壳与导航」不写 Delta（该条未列举具体导航项，见提案 AC-7 说明）。

### D9 布局与主题：新增 `.publish-route-*`，只追加到 `styles.css` 末段

```css
.publish-route-editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 12px;
  align-items: start;
}
.publish-route-canvas .amap-container {
  min-height: 320px;
  height: clamp(320px, 46vh, 460px);
}
.publish-route-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.publish-route-unresolved { /* 复用 --surface-2 / --line / --r，不新增色值 */ }
@media (max-width: 1100px) { .publish-route-editor { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .publish-route-canvas .amap-container { height: 300px; min-height: 300px; } }
```

- `.amap-container` 的既有 `height: clamp(440px, 68vh, 720px)` 是探索页尺寸，发布页卡片内过高；用后代选择器覆盖，不改全局类。
- `.amap-side-card` 是全局样式，发布页直接复用；只给外层加 `.publish-route-side` 控制间距。
- 颜色只用既有令牌（`--surface` / `--surface-2` / `--line` / `--r` / `--sh-2`），不写十六进制；`[data-theme="dark"]` 由令牌自动生效，无新增主题规则。
- 与探索页并排的两栏在 1440 下约 700px 宽：地图约 400px + 面板 280px；≤1100px 自动堆叠。

### D10 测试分层与 AMap 替身复用

| 层 | 落点 |
|---|---|
| 纯逻辑 | `placePick.test.ts`（占位名）、`tripOptions.test.ts`（模式守卫）、`publishRoute.test.ts`（提交投影）、`tripForm.test.ts`（占位名校验） |
| 端到端 | 新增 `e2e/tests/publish-route-map.spec.ts`（#8–#18 + 导航/深链）；重写 `trips.spec.ts` 的途经点录入步骤 |
| 组件 | 不新增（`vitest` 为 node 环境、只收 `*.test.ts`，无 Testing Library / jsdom） |

AMap 替身从 `ai-planner.spec.ts` 抽到 `e2e/tests/support/amapStub.ts`：

- 保留全局名 `__amapPois` / `__amapRouteCalls` / `__amapStubConfig` / `__amapClick`，既有断言不改；
- 新增 `__amapTransferOptions` 记录 `Transfer` 构造参数，供「公共交通带目的地城市」断言；
- 导出 `installAmapStub` / `setAmapRouteFail` / `clickMapAt`；两个 spec 共用。
- 取舍：抽出会碰一个当前全绿的 700 行 spec，收益是不复制 ~150 行替身并在两处保持一致。若抽取代价超出预期（例如初始化顺序变化导致 ai-planner 不稳），退路是在发布 spec 内保留局部替身并记一笔测试债务，不阻塞本 change。

### D11 原型与截图：不做新原型页

用户口径是「复用探索页现有面板，够用了」——探索页就是本 change 的视觉基线，另画原型只会引入第三种排版。任务里不安排 `docs/prototype` 改动；P4 只按 `@rule:sdd-artifacts` 补走查截图（390 / 768 / 1440 × light / dark），dark 用 `document.documentElement.dataset.theme = 'dark'` 显式设置（应用自 `357f5e2` 起只有浅色）。

## 文件清单

| 层 | 文件 | 变更 |
|---|---|---|
| 逻辑 | `frontend/src/map/amap/useRoutePlan.ts` | 新增：规划 + 直线降级 + 城市 + 可注入文案 |
| 逻辑 | `frontend/src/map/amap/placePick.ts` | 新增 `isCoordinatePlaceholderName`（不改 `pointFallbackName`） |
| 逻辑 | `frontend/src/trips/tripOptions.ts` | 新增 `isTripTravelMode` |
| 逻辑 | `frontend/src/trips/publishRoute.ts` | 新增 `projectStops` |
| 逻辑 | `frontend/src/trips/tripForm.ts` | `validateTripForm` 追加占位名分支 |
| 组件 | `frontend/src/map/amap/WaypointPanel.tsx` | 可选 `modes` / `modeLabels` / `emptyHint` / `modeAriaLabel` |
| 组件 | `frontend/src/map/amap/ItineraryPanel.tsx` | 可选 `modeLabels` |
| 组件 | `frontend/src/trips/PublishRouteEditor.tsx` | 新增：地图 + 搜索 + 点选 + 面板 + 未定位 + 命名弹窗 |
| 页面 | `frontend/src/trips/TripCreatePage.tsx` | 第 2 段换成编辑器；出行方式移入；删旧 `Segmented` |
| 页面 | `frontend/src/pages/MapExplorerPage.tsx` | 改用 `useRoutePlan`，删除重复状态与 3 个 effect；其余不变 |
| 外壳 | `frontend/src/shell/AppShell.tsx` | 移除 `map` 导航项、分组 filter、`activeKey` 分支、图标分支 |
| 文案 | `frontend/src/i18n/tripMessages.ts` | `sectionRoute` / `routeSectionHint` / 未定位 / 命名弹窗 / 占位名错误 / 中性降级 |
| 样式 | `frontend/src/styles.css` | 末段追加 `.publish-route-*` |
| 测试 | `frontend/src/{map/amap/placePick.test.ts,trips/{tripOptions,publishRoute,tripForm}.test.ts}` | 纯逻辑用例 |
| 测试 | `e2e/tests/support/amapStub.ts` | 新增（从 `ai-planner.spec.ts` 抽出） |
| 测试 | `e2e/tests/publish-route-map.spec.ts`、`e2e/tests/trips.spec.ts`、`e2e/tests/ai-planner.spec.ts` | 新增 / 重写 / 改为共用替身 |
| 契约 / 后端 / 迁移 | — | **不动**（0.22.0 / `V26`） |

## 风险与例外

- **风险：** `styles.css` 是并行修改热点。缓解：只追加末段、类名带 `publish-route-` 前缀、合并后 grep 抽查。
- **风险：** `tripMessages.ts` 与 `AppShell.tsx` 当前有并行会话的未提交改动。缓解：实现时先合并 `origin/main` 并保留对方改动；新增文案键追加在文件末尾，不重排既有键。
- **风险：** 探索页改用 `useRoutePlan` 后行为漂移。缓解：hook 逐条复刻三个 effect 的语义，探索页文案逐字保留；`map.spec.ts` 路线套件 + `trips.spec.ts` 详情页用例作为回归。
- **风险：** 预填并发地理编码最多 8 个请求，弱网下首屏有等待。缓解：解析中显示「正在定位预填途经点…」，失败项进入未定位列表，不阻塞其他字段填写。
- **例外：** 未定位名称在提交时排在已定位点之后（D5）；这是刻意取舍，文案已明示，不作为缺陷。
- **例外：** 导航入口移除后 `#/map` 无高亮项；页面仍可从 AI 规划、详情页路线等入口进入，深链不受影响。
- **遗留：** `map.spec.ts` 中依赖已下线 `china-map` / `city-map` 的断言属既有债务；本 change 只在入口移除直接导致失败时做最小修正。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| Delta 场景 | 设计 | 任务 | ATDD |
|---|---|---|---|
| 填写完整必填项后成功发布 | D4 / D7 | T6 T7 T10 | #1 E2E |
| 选填项可留空 | D4 | T7 T10 | #2 E2E |
| 必填项缺失时拒绝发布 | D7 | T3 T7 | #3 E2E |
| 日期不合法时拒绝发布 | 基线不变 | T7 | #4 E2E |
| 途经点不足两个时拒绝发布 | D4 / D6 | T4 T6 T7 | #5 E2E + 单测 |
| 计划人数越界时拒绝发布 | 基线不变 | — | #6 单测 |
| 预算区间倒置时拒绝发布 | 基线不变 | — | #7 单测 |
| 在地图上添加途经点并看到路线 | D1 / D2 / D4 | T4 T5 T6 T9 T10 | #8 E2E |
| 途经点顺序可调整 | D4 | T6 T10 | #9 E2E |
| 切换出行方式重算路线 | D2 / D3 / D6 | T4 T5 T6 T10 | #10 E2E |
| 公共交通使用目的地城市规划 | D3 / D6 | T4 T6 T10 | #11 E2E |
| 路线服务不可用时按顺序直线示意 | D6 | T4 T6 T10 | #12 E2E |
| 降级提示不暴露实现细节 | D6 | T4 T6 T7 T10 | #13 E2E |
| 发布只提交地名与出行方式 | D4 | T2 T6 T10 | #14 E2E |
| 坐标占位名不得进入发布 | D7 | T1 T3 T6 T10 | #15 E2E + 单测 |
| AI 预填路线进入编辑器后可编辑 | D5 | T6 T7 T10 | #16 E2E |
| 途经点超过上限时被拦截 | D4 | T6 T10 | #17 E2E |
| 窄屏与双主题不溢出 | D9 | T6 T11 T12 | #18 E2E |

**自检结论：Pass** — 18 条场景全部有落点；无越过 Delta 的新增范围（无后端 / 契约 / 迁移 / 新权限）；两条基线场景（人数、预算）明确标注不改代码，由既有单测守护；导航约束（AC-7）在 ATDD 中单列，不伪装成 Delta 场景。

## 签署

| 角色 | 姓名 | 结论 | 时间 |
|---|---|---|---|
| 设计（当前开发者） | Jacky | Pass | 2026-11-18 |
| 复核（非当前开发者、非 WAYNE） | Karena | Pass | 2026-11-18 |