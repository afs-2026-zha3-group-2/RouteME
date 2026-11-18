# ATDD design — refine-publish-route-map

- **Change：** `refine-publish-route-map`（`trip-plans` MODIFIED，REQ-027 / S28）
- **Inputs：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)（1 Requirement / 18 Scenario：基线 7 + 新增 11）、[`proposal.md`](proposal.md)（D1–D9 / AC-1 ~ AC-10）、[`g1-decision.md`](g1-decision.md)（G1 Pass，IO=WAYNE / SA=Karena）
- **边界：** 零后端 / 零契约（0.22.0）/ 零迁移；纯前端重排 + 共享规划逻辑抽取 + 导航项移除
- **依据：** `@rule:web-testing`（纯逻辑 Vitest + Playwright；仓库无 Testing Library / jsdom）、`@rule:sdd-artifacts`（场景与用例名一一对应）

## 1. ATDD 层范围

| # | 场景（Delta） | 层 | 用例锚点 | 判定依据 |
|---|---|---|---|---|
| 1 | 填写完整必填项后成功发布 | E2E | `trips.spec.ts` › publishes a trip and finds it in the home list | 基线，只改途经点录入步骤；断言标题 / 招募中 / 首页可见 |
| 2 | 选填项可留空 | E2E | `trips.spec.ts` › publishes with a meeting time and edits it from the detail page | 基线；集合区域与预算留空仍可发布 |
| 3 | 必填项缺失时拒绝发布 | E2E | `trips.spec.ts` › blocks publishing and flags every missing required field | 基线；错误文案逐字段可见 |
| 4 | 日期不合法时拒绝发布 | E2E | `trips.spec.ts` › rejects a meeting time after the end date on the publish form | 基线；URL 仍停在 `#/trips/new` |
| 5 | 途经点不足两个时拒绝发布 | E2E + 单测 | `trips.spec.ts` › blocks publishing and flags every missing required field；`tripForm.test.ts`（少于两个） | 基线；空列表时提交报错、生成按钮禁用 |
| 6 | 计划人数越界时拒绝发布 | 单测（既有） | `tripForm.test.ts` › capacity 边界 1 / 13 | 基线不变，表单校验未改 |
| 7 | 预算区间倒置时拒绝发布 | 单测（既有） | `tripForm.test.ts` › budget 下限 > 上限 | 基线不变，表单校验未改 |
| 8 | 在地图上添加途经点并看到路线 | E2E | `publish-route-map.spec.ts` › adds stops on the map and draws the generated route | `.amap-route-svg path`、`.amap-stop-number`、`.amap-stop-tag`、`amap-route-stats` |
| 9 | 途经点顺序可调整 | E2E | `publish-route-map.spec.ts` › reorders stops and keeps the new order after publishing | 编号即时重排 + 详情页 `.detail-stops` 同序 |
| 10 | 切换出行方式重算路线 | E2E | `publish-route-map.spec.ts` › recalculates the route when the travel mode changes | `amap-route-stats` 时长变化、面板标题同步、无「步行 / 驾车」 |
| 11 | 公共交通使用目的地城市规划 | E2E | `publish-route-map.spec.ts` › plans transit inside the destination city | `__amapTransferOptions.city === '珠海'`（stub 记录构造参数） |
| 12 | 路线服务不可用时按顺序直线示意 | E2E | `publish-route-map.spec.ts` › falls back to straight segments when the route service fails | `.amap-route-svg path[stroke-dasharray]` + 直线顺序 + 地图不空白 |
| 13 | 降级提示不暴露实现细节 | E2E | `publish-route-map.spec.ts` › keeps the fallback copy free of backend details | 提示可见且不含 `后端` / `端口` / `代理` / `重载` / `8080` / `Key` |
| 14 | 发布只提交地名与出行方式 | E2E | `publish-route-map.spec.ts` › submits stop names and the travel mode only | 拦截 `POST /api/trips` 请求体：`stops` 为字符串数组、无坐标键 |
| 15 | 坐标占位名不得进入发布 | E2E + 单测 | `publish-route-map.spec.ts` › blocks publishing when a stop is still a coordinate placeholder；`placePick.test.ts` / `tripForm.test.ts` | 提交被拒 + 可读提示；纯函数覆盖误伤与漏判 |
| 16 | AI 预填路线进入编辑器后可编辑 | E2E | `publish-route-map.spec.ts` › opens AI-prefilled stops in the same editable route editor | `#/trips/new?ai=1` → 面板出现预填点 → 排序 / 删除 / 重算可用 |
| 17 | 途经点超过上限时被拦截 | E2E | `publish-route-map.spec.ts` › stops accepting new stops at the eight-stop limit | 第 9 个被拒 + 提示「最多 8 个」+ 已有路线不变 |
| 18 | 窄屏与双主题不溢出 | E2E | `publish-route-map.spec.ts` › keeps the route editor inside narrow viewports and both themes | 390 / 768 / 1440 × light / dark：`document.scrollWidth <= clientWidth`，面板与地图可见 |

**API 层：** 无新增或修改接口。唯一「反向守卫」是一条请求体断言（#14），预期首次运行即绿：它守住「发布请求仍是 `stops: string[]` + `travel_mode`」这条 Non-goal；若变红说明实现方向错了。

**导航约束（AC-7，无独立 Scenario）：** 由 `publish-route-map.spec.ts` › `removes the map nav entry but keeps deep links working` 覆盖：导航条不含「旅行地图」，而 `#/map`、`#/map/440000`、`#/map/440000/440100` 仍渲染 `.amap-explorer`。

**Deferred to `/sdd:atdd-apply`（unit-level TDD）：**

- `frontend/src/map/amap/placePick.ts` → `isCoordinatePlaceholderName(name)`：前缀 + 坐标模式判定，覆盖不同小数位、负号、空格与「真实地名里带坐标」的误伤；测试放同目录 `placePick.test.ts`。
- `frontend/src/trips/tripOptions.ts` → `isTripTravelMode(value)`：`TripTravelMode` 守卫，接受三档、拒绝 `walking` / 空串 / 未知值；测试放同目录 `tripOptions.test.ts`。
- `frontend/src/trips/publishRoute.ts` → `projectStops(located, unlocated)`：提交投影（保序、去空白、未定位排在已定位之后）；测试放同目录 `publishRoute.test.ts`。
- `frontend/src/trips/tripForm.ts` → `validateTripForm` 追加占位名分支；测试追加到既有 `tripForm.test.ts`。
- **不新增组件测试层：** 仓库 `vitest` 为 `environment: node` 且只收 `src/**/*.test.ts`，无 Testing Library / jsdom；引入属独立基础设施变更。`@rule:web-testing` 的阻断项（纯逻辑单测 + 受影响 E2E）由两层满足，组件渲染由 E2E 覆盖，已记入 `design.md` 残余风险。

## 2. 生产代码之前先写什么

先定锚点（测试先于实现）：

| 锚点 | 取值 |
|---|---|
| 编辑器容器 | `.publish-route-editor`（只在发布页出现，用于限定选择器范围） |
| 地图宿主 | `.publish-route-canvas .amap-container`（高度覆盖 `.amap-container` 的 560px 下限） |
| 关键字搜索 | `data-testid="amap-place-search"`（复用 `PlaceSearchBox`，`inputId="trip-stops"`） |
| 途经点面板 | `data-testid="waypoint-panel"`（复用）；生成按钮 `data-testid="amap-route-generate"` |
| 行程面板 | `data-testid="amap-itinerary-panel"`、`data-testid="amap-route-stats"` |
| 折线与编号 | `.amap-route-svg path`（降级时带 `stroke-dasharray`）、`.amap-stop-number`、`.amap-stop-tag`（起 / 终） |
| 模式行 | `getByRole('radio', { name: '自驾' / '骑行' / '公共交通' })`；探索页仍为 `步行 / 驾车 / 骑行` |
| 未定位列表 | `.publish-route-unresolved` + 文案「未定位的地点按名称保留，排在已定位地点之后」 |
| 命名对话框 | `data-testid="publish-stop-name-dialog"`，输入框 `getByLabel('途经点名称')` |
| 占位名报错 | 字段错误文案「途经点不能是坐标占位名，请改为可识别的地名」 |
| 中性降级提示 | 可见提示文本，断言不含 `后端` / `端口` / `代理` / `重载` / `8080` / `Key` |
| 导航 | `.tabbar` / `.rail-menu` 不含「旅行地图」；`#/map` 仍渲染 `.amap-explorer` |

Red 顺序：

| 步骤 | 内容 | 预期观察 |
|---|---|---|
| Red A | `placePick.test.ts` 追加 `isCoordinatePlaceholderName`；新增 `tripOptions.test.ts`、`publishRoute.test.ts`；`tripForm.test.ts` 追加占位名用例 | 导入失败 / 断言失败（函数不存在或校验未加） |
| Red B | 新增 `e2e/tests/publish-route-map.spec.ts`（#8–#18） | `.publish-route-editor` 与各锚点均不存在，用例失败 |
| Red C | `trips.spec.ts` 的发布用例改用编辑器锚点（原 `pickPlace(page, '途经点', …)` 走 `AmapPlacePicker` 的 chip） | `.place-chip-name` 消失，旧步骤失败 |
| Green | 纯函数 → 面板参数化 → `useRoutePlan` → `PublishRouteEditor` → 页面接入 → 导航移除 → 样式 | A/B/C 全绿 |
| 守卫 | #14 请求体断言与 #1 基线用例 | 首次运行即绿，绿灯持续 |

## 3. 本地与 CI 门禁

- 本地（`@rule:web-testing` 提交前验证，不新增脚本，均在 `RouteME/frontend`）：
  - `npm run typecheck`、`npm run build`、`npm test`
  - `cd ../e2e; npx playwright test tests/publish-route-map.spec.ts tests/trips.spec.ts`（需后端 + 前端已启动）
  - 共享件与导航回归：`npx playwright test tests/ai-planner.spec.ts tests/map.spec.ts`
- CI：沿用现有流水线，不新增阶段、不新增同义脚本。零后端改动，仍跑一次 `backend/mvnw.cmd -B -o clean test` 确认零误伤。
- 截图（AC-9 证据）：`docs/preview/refine-publish-route-map/publish-route-{390,768,1440}-{light,dark}.png`，命名遵循 `@rule:sdd-artifacts`；dark 通过 `document.documentElement.dataset.theme = 'dark'` 设置（应用自 `357f5e2` 起只有浅色，无切换入口）。

## 4. 数据 / fixtures 策略

**AMap 替身：** 从 `e2e/tests/ai-planner.spec.ts` 抽出 `installAmapStub(page)` 到 `e2e/tests/support/amapStub.ts`，保留既有全局名（`__amapPois` / `__amapRouteCalls` / `__amapStubConfig` / `__amapClick`）以免改动既有断言；新增 `__amapTransferOptions` 记录 `Transfer` 构造参数（#11 断言 `city`）。两个 spec 共用同一份替身。

| 身份 / 数据 | 来源 | 用途 |
|---|---|---|
| 发布者 | `loginAs(page, 1)`（`support.ts`） | 发布链路 |
| 目的地 | 珠海市 `440400` / 广州市 `440100`（`pickDestination`） | `cityForSearch` → `珠海` / `广州`；#11 断言 `珠海` |
| 途经点 POI | 替身 `__amapPois`：香洲港 / 情侣路 / 广州塔 / 永庆坊 | 搜索候选、地图点选候选、排序与上限 |
| 路线 | 替身 `makeRouteService`：每段 2100 米 / 900 秒 | 真实路线分支；`routeFail` 切换降级分支 |
| AI 预填 | `page.route('**/api/ai/itineraries/*')` 返回固定快照（stops = 广州塔 / 北京路 / 陈家祠） | #16 |
| 占位名行程 | `createTripViaApi`（`support.ts`）写 `stops: ['地图选点 113.57670, 22.28590', '情侣路']` → `#/trips/new?from=<id>` | #15 提交拦截 |
| 视口 / 主题 | `page.setViewportSize` 390 / 768 / 1440；`dataset.theme` light / dark | #18 |

- 标题带 `Date.now()` 后缀，断言只落在本次创建的行程内；不清理共享数据库（沿用「先按唯一标题 / id 定位」的既有约定）。
- 一切路线与搜索走替身，不依赖外网高德；`POST /api/trips` 只在 #14 拦截并放行（fulfill 后仍按真实响应继续）。
- 断言优先语义化选择器；CSS 选择器只用于结构断言（`.amap-route-svg path`、`.amap-stop-number`），不使用 `waitForTimeout`。

## 5. Non-goals 与反向验证

| 编号 | Non-goal | 反向验证 |
|---|---|---|
| N1 | 不加坐标 / `place_id` / polyline / 迁移 / 契约变更 | #14 断言请求体只有既有键；P4 `git diff --name-only origin/main...HEAD` 不含 `backend/**`、`openapi.yaml`、`db/migration/**` |
| N2 | 不改探索页行为与文案 | `map.spec.ts` 路线套件保持绿；探索页模式行仍为「步行 / 驾车 / 骑行」，地图高度与布局不变 |
| N3 | 发布页不出现「步行」或探索页的「驾车」 | #10 断言三档文案；`tripOptions.test.ts` 断言 `TRIP_TRAVEL_MODES` 不含 `walking` |
| N4 | 旅行地图页面与深链保留 | 导航用例访问 `#/map`、`#/map/440000`、`#/map/440000/440100`，`.amap-explorer` 可见 |
| N5 | 发布页不引入景点图钉层 | 编辑器用例断言 `.amap-scenic-toggle` 计数为 0 |
| N6 | 集合地点录入不被替换误删 | `trips.spec.ts` 集合时间 / 集合区域用例保持绿（第二个 `AmapPlacePicker` 保留） |

本 skill 自身非目标：不写业务实现、不产出完整 UT 套件计划、不生成 Playwright/POM/Excel 用例、不新建 CI 产品。

## 6. NFR 测试（已询问，2026-11-18）

用户确认：**NFR 测试不纳入本 change**。无性能、可观测性、韧性指标变化；窄屏与双主题属验收场景 #18，不作为 NFR 单列。后续如需补充，另开 change。