# Local Verify Report: refine-publish-route-map（REQ-029 / S30 发布页路线编辑器）

**Date:** 2026-11-18 (timezone: +0800)
**Root:** D:/zha_training/RouteME/ai4se-baseline/RouteME
**Change:** `refine-publish-route-map`
**Scope:** P4 实现 + 本地回归；未执行 PR / CI / G2 之外的远端步骤

## 1. Environment

| 项 | 值 |
|---|---|
| JDK | 21（Maven Wrapper 3.10.0） |
| Node | 24（npm 11） |
| Backend | Spring Boot，端口 **8080**（`java -jar target/routeme-backend-0.0.1-SNAPSHOT.jar`） |
| Frontend | Vite + React 19，端口 **5173** |
| E2E DB | `RouteME/SqlLite/*.db`（本地累积数据，见 §5） |
| 契约 | `openapi.yaml` **未改动**（`stops: string[]` 与 `travel_mode` 沿用，0.22.0） |
| 上游 | 高德侧用 `window.AMap` 替身 + `/v3/ip` 探测放行；天气用 `page.route` 固定响应 |

## 2. Commands & Results

| 层 | 命令 | 结果 |
|---|---|---|
| 前端类型 | `cd RouteME/frontend; npm run typecheck` | **Pass**（`tsc --noEmit` 无输出） |
| 前端构建 | `npm run build` | **Pass**（1646 modules；仅有既有 chunk-size 提示） |
| 前端单测 | `npm test` | **59 文件 / 469 项通过** |
| E2E 新增功能 | `cd RouteME/e2e; npx playwright test tests/publish-route-map.spec.ts` | **12/12 passed** |
| E2E 走查 | `npx playwright test tests/publish-route-walkthrough.spec.ts` | **1/1 passed**；6 张截图写入 `docs/preview/refine-publish-route-map/` |
| E2E 回归（T13 指定集合） | `npx playwright test tests/publish-route-map.spec.ts tests/publish-route-walkthrough.spec.ts tests/trips.spec.ts tests/map.spec.ts tests/ai-planner.spec.ts` | **43 passed / 16 failed**；16 条全部为既有失败（§5 逐条归因） |
| 后端单测 + API | `cd RouteME/backend; .\mvnw.cmd -B -o clean test` | **558 passed / 3 failed**（561 项）；3 条为并行会话的 profile 改造未落地，见 §5 |
| 非目标复核 | `git diff --name-only origin/main...HEAD` | **不含** `backend/**`、`openapi.yaml`、`db/migration/**` |
| 非目标复核（工作区） | `git status --porcelain` | 仅两处**他人未跟踪**文件（`backend/applicationlocal.yml`、`V27__normalize_demo_user_profiles.sql`），本 change 不提交 |

## 3. 覆盖的关键场景

| 场景（Delta） | 证据 |
|---|---|
| #8 地图 / 搜索加入途经点并生成路线 | `publish-route-map.spec.ts` › `adds stops on the map and draws the generated route`（2.1 公里 / 15 分钟、起终标签、2 条 SVG 路径、无景点图钉层） |
| #9 排序与发布顺序一致 | › `reorders stops and keeps the new order after publishing`（详情页 `.detail-stops` 同序） |
| #10 出行方式重算 | › `recalculates the route when the travel mode changes`（自驾 10 分钟 / 骑行 20 分钟 / 公共交通 15 分钟；无「步行 / 驾车」） |
| #11 公共交通传目的地城市 | › `plans transit inside the destination city`（`Transfer` 构造参数 `city=珠海`、`policy=0`） |
| #12–#13 路线失败降级与文案 | › `falls back to straight segments when the route service fails`、`keeps the fallback copy free of backend details`（断言不含 后端/端口/代理/重载/8080/Key） |
| #14 只提交地名与出行方式 | › `submits stop names and the travel mode only`（`stops: ['香洲港','情侣路']`、`travel_mode: driving`；反向守卫无坐标键） |
| #15 坐标占位名拦截 | › `blocks publishing when a stop is still a coordinate placeholder`（预填未定位名可见 + 提交被 `validateTripForm` 拦） |
| #16 AI 预填可编辑 | › `opens AI-prefilled stops in the same editable route editor`（排序 / 生成 / 移除） |
| #17 八个途经点上限 | › `stops accepting new stops at the eight-stop limit`（第 9 个被拒，已有路线 `d` 不变） |
| #18 窄视口与双主题 | › `keeps the route editor inside narrow viewports and both themes`（390/768/1440 × light/dark 无横向溢出） |
| AC-7 导航项移除、深链保留 | › `removes the map nav entry but keeps deep links working`（`#/map`、`#/map/440000`、`#/map/440000/440100`） |
| 基线 7 条发布流程 | `trips.spec.ts` 途经点录入改为编辑器锚点后仍全绿（21/25；4 条见 §5） |

## 4. 实现要点

- **坐标只活在编辑期：** `PublishRouteEditor` 用 `RouteWaypoint[]` 维护已定位点，每次增删 / 排序 / 改名都经 `projectStops(located, unlocated)` 投影回 `stops: string[]`；表单与请求体结构不变。
- **共享规划逻辑：** 新增 `map/amap/useRoutePlan.ts`（规划 + 直线降级 + 城市透传 + 可注入文案），探索页与发布页共用；探索页布局与行为未改。
- **面板参数化：** `WaypointPanel` / `ItineraryPanel` 新增可选 `modes` / `modeLabels` / `emptyHint` / `modeAriaLabel`；`MODE_LABELS` 常量不被改写（发布页三档标签独立的 `TRIP_TRAVEL_MODE_LABELS`）。
- **占位名闭环：** `isCoordinatePlaceholderName` 统一识别 `地图选点 <lng>, <lat>`；地图点选命中占位名时先弹命名框，`validateTripForm` 作最后一道闸。
- **未定位名称：** 预填 / 参考行程里解析不到坐标的地名留在 `.publish-route-unresolved`（可重试 / 移除），提交时排在已定位点之后（`proposal.md` D6 记录的例外）。
- **导航：** 仅从 `NAV_ITEMS` 移除 `map`（`#/map` 路由与深链保留）。
- **样式：** `styles.css` 追加 `.publish-route-*` 95 行，无删除。

## 5. 既有失败归因（本次未引入，逐条复核）

| 用例 | 归因 | 复核方式 |
|---|---|---|
| `trips.spec.ts` › `shows the identity gate…` / `filters the list by interest tag…` / `distinguishes full trips…` / `filters by province and city…` | 本地 E2E 库累积到 120 条可招募 / 满员行程；`/api/matches` 默认排序把种子行程（`id 5` 深圳大鹏 / `id 6` 佛山祖庙）挤出一页（size 45） | 直接查 `/api/matches?page=1&size=45`：默认排序第 1 页无种子行程，`sort=date` 时才回到 abs=16 / abs=31；4 条用例主体在 `git diff` 中无改动 |
| `map.spec.ts` 9 条（E11–E18） | 探索页早已迁到栅格底图 + `AreaCascader`，用例仍在找 `china-map` / `city-map` / `china-map-search` / `data-poi-id` | 失败信息全部为上述选择器 `element(s) not found`；该文件本 change 未改 |
| `ai-planner.spec.ts` › A1 / A2 / A10 | A1 日期已默认预填导致生成按钮提前可用；A2 定位反查拿到坐标占位名；A10 `ai-error-retry` 渲染出 2 个（strict mode） | 用 `git show HEAD:…ai-planner.spec.ts` 跑同一批用例，失败点与失败信息完全一致 |
| `backend` 3 条（`UserProfileControllerTest`、`ProfileDataMigrationSqliteTest`、`ProfileMigrationSqliteTest`） | 并行会话的未跟踪迁移 `V27__normalize_demo_user_profiles.sql` 与已提交测试口径不一致 | 仓内 `backend/**` 无本 change 改动（§2 非目标复核）；3 条均断言 `school` / `job` 归一化 |

## 6. 偏差 / 测试修复

| 项 | 说明 |
|---|---|
| 替身 `/v3/ip` | 共享替身必须同时伪造代理探测：真实后端对 Web 端 Key 返回 `USERKEY_PLAT_NOMATCH`，`loadSdk` 会在读 `window.AMap` 前抛错，替身等于没装。该放行仅影响 E2E 替身，不改产品代码。 |
| 替身时长分档 | 每段 2100 米固定；时长按模式区分（driving 600s / bicycling 1200s / transit & walking 900s），让「切换出行方式重算」可观察；`transit` 保持 900s 以免破坏 AI 规划页既有的 6.3 公里 / 45 分钟断言。 |
| 删除 3 条过时用例 | `trips.spec.ts` 的「地图缩放 / 全屏 / 点选加途经点」三条针对已删除的 `AmapPlacePicker` chip + `china-map` / `city-map`；画布能力由新 spec #8 / #17 覆盖，其中「选目的地不写途经点」以 `picking the destination does not write stops` 保留。 |
| `trips.spec.ts` 无替身 | 发布流程刻意不装高德替身，保留离线地名库行为（集合区域用例依赖 `.place-chip-name`：香洲港客运站 / 新码头 / 拱北口岸）。 |
| antd 弹窗页脚 | `加入途经点` 按钮渲染在 `body` 下，不在 `[data-testid="publish-stop-name-dialog"]` 容器内，需在页面级定位。 |
| `ai-planner.spec.ts` A11 | 固定标题多次运行会产生多张同名卡片；末步断言改用 `.first()`，避免 strict mode 误报（与本次功能无关的用例健壮性）。 |
| `ai-planner.spec.ts` A11 / A12 | 发布页途经点入口由 chip 改为编辑器，两条用例改用 `addRouteStop`（`#trip-stops` + `.amap-waypoint-text b`）。 |

## 7. Overall

**Overall: Pass（change scope）。** 新功能 E2E 12/12、走查 1/1（6 图）、前端 469 项、后端 561 项（3 条他人 WIP 导致的既有失败）；T13 指定集合 43 passed / 16 failed，16 条均已按 §5 归因为既有问题。无本 change 引入的失败，无后端 / 契约 / 迁移改动。