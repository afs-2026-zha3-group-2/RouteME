# 设计 — refine-trip-map（P3）

- **日期：** 2026-11-16｜ **作者：** Jay（AO）｜ **签署：** Jay + Neal（2026-11-16 签）
- **基线口径说明（proposal F-1 落点）：** 有效规格 = Living `trip-plans` + 未归档 `add-trip-publish`（地图上下文）+ `refine-trip-chat`（集合信息）。本 change 的 MODIFIED 在归档时按 C1 顺序覆盖；P4 实现以本 design 为唯一技术权威。

## D1 组件边界

`PlaceMap` 保持单一组件，新增 props：`readOnly?: boolean`（详情用，隐藏加入动作）、`onCityFocus?: (city: string) => void`（全省概览点击城市时通知外部，可选）。内部新增 `focusedCity` state：prop `city` 变化时重置；全省概览点击城市 pin → `setFocusedCity(name)` + 视口聚焦，**不**调用 `onPick`（spec F-1）。`PlacePicker` 不变接口，集合区域调用方改 `mode="multi" max={3}`。

## D2 视觉令牌（styles.css 末尾追加，含深色）

| 令牌 | 浅 | 深 | 用途 |
|---|---|---|---|
| `--map-land-from/to` | `#f7f4ec / #efe9db` | `#17262b / #122026` | 米白陆地 |
| `--map-park` | `#cfe8c4` | `#28513c` | 公园绿地 |
| `--map-park-tree` | `#8fc79a` | `#3f7a58` | 树形 glyph |
| `--map-water-from/to` | `#bfe0f2 / #9ccbe8` | `#12384a / #0e2c3c` | 河流 |
| `--map-road` | `#ffffff` | `#233a41` | 道路 |
| `--map-road-casing` | `#e3ddcd` | `#0d1a20` | 路 casing |
| `--map-route` | `#3d7bff` | `#6ea8ff` | 路线蓝 |
| `--map-pin` | `#f4623a` | `#ff7a52` | 编号水滴 pin 珊瑚红 |
| `--map-pin-city` | `#3d7bff` | `#6ea8ff` | 城市点蓝 |

覆盖既有 `:root` / `[data-theme="dark"]` 的 `--map-*` 旧值（后写覆盖，不改旧块）。

## D3 底图绘制（city 视图）

陆地米白底；公园 = 3–4 个圆角 blob（`rx≥0.03w`）+ 每 blob 2–3 个树 glyph（圆冠 + 短干 path），位置由 view 确定性生成（纯函数 `buildScenery(view)` 落 `mapView.ts`，可单测）；河流 = 宽带 `stroke-width 0.06w` + 内层浅蓝 `0.03w`；道路 = 白色网格（major 带 casing 双线）+ 一条斜向主干道；分区名淡灰。province 视图保留 `LAND_PATH` / 岛屿 / 海名，高速连线改白色实线 + 淡 casing。

## D4 pin 与路线

未选 POI：珊瑚红小圆点 + 白 stroke，hover/active 放大并显示标签（沿用现状语义）。已选 stop：水滴 path（`M0,0 C-1.6,-2.2 -2.2,-3.4 -2.2,-4.6 A2.2,2.2 0 1,1 2.2,-4.6 C2.2,-3.4 1.6,-2.2 0,0 Z` × scale）珊瑚红填充 + 白描边 + 白色序号；锚点处蓝色小圆点。路线：`mapView.ts` 新增 `routePath(points): string`（Catmull-Rom → 三次贝塞尔平滑），白 casing `0.02w` + 蓝线 `0.011w`，round cap/join。

## D5 控制条与图例

控制条移入 viewport 右上竖排（antd `Button` 白底阴影，aria-label 沿用「放大地图 / 缩小地图 / 回到当前范围 / 全屏查看地图 / 退出全屏」）；scope 信息改左上浮卡（城市名 + 可选点数）。图例左下卡：路线 / 景点 / 编号途经点 / 公园绿地 / 河流 / 道路；比例尺右下，km 口径见 D8。`data-testid="place-map"`、`.map-shell`、`.map-callout` 保留。

## D6 点击反馈（spec F-2 落点）

`onCanvasClick` 重写：命中 pin 阈值内 → 地点卡；否则 → 候选浮层（`nearestPlaces(point, 3)`，`placeCatalog.ts` 新增，按距离升序）。两者共用 `.map-callout` 容器（`data-testid="map-callout"`）：地点卡 = 封面块（城市哈希到 `cover-*` 五色 + 地点 glyph）+ 名称 + 类型·城市 + 动作按钮「加入路线」（readOnly 时无动作）；候选浮层 = ≤3 行，每行名称 + 「加入路线」按钮（readOnly 时行不可点）。关闭按钮 aria「关闭地图选点」保留。定位 clamp 到 shell 内（沿用现状 clamp，宽 232 / 高按内容 168）。

## D7 详情页路线地图

`TripDetailPage` 新增 section「路线地图」：`PlaceMap readOnly selected={resolvedStops} city={mapCity} focusPlaceId={focusStop}`；下方 `.route-strip` 横排卡片（序号徽标四色循环 coral/blue/purple/green + 名称 + 与下一点「约 x km」）。点击 `ol.detail-stops li`（改 button 语义）/ strip 卡片 / 地图 pin → `setFocusStop(place.id)` + `scrollIntoView` 地图。解析：`findPlaceByName(stop)`；未解析 stop 在 strip 灰徽标 + 「不在地图」；`mapCity===undefined` 或 resolved=0 → 不渲染地图，保留文本列表 + 说明文案（`tripMessages` 新增）。

## D8 距离与比例尺口径

`MAP_BOUNDS` 推导：`KM_PER_X = (maxLng-minLng)*102.5/100 ≈ 8.2`（北纬 23° 每经度 ≈102.5km）、`KM_PER_Y = (maxLat-minLat)*111/100 ≈ 6.66`。`distanceKm(a,b)=hypot(dx*8.2, dy*6.66)`，展示「约 x km」（≥1 取整，<1 一位小数）。比例尺 = `view.w*8.2` 取整。落 `mapView.ts` 纯函数 + 单测。

## D9 多值集合区域（前端）

`tripOptions.MAX_MEETING_AREAS=3`；`tripForm.meetingAreas: string[]`，validate：≤3、每项 `String.trim()`（覆盖 U+3000，spec F-3）≤100；`toCreateRequest.meeting_areas = list.length? list : null`。`meetingForm` 同构。`TripCreatePage` 集合字段 = Input draft + 「添加」按钮（trim 去重入列表）+ `PlacePicker mode="multi" max=3`（共享 value）+ chips 移除。`types.ts`：`TripSummary.meeting_areas: string[]`；请求类型 nullable array。`chatMeeting.meetingAreaText(areas)` → 有值 join('、') 否则 MEETING_PENDING；`chatSafetyText` / `mineMeetingNote` 改收数组。`MyTripsPage` / 详情 dd 展示 join。编辑弹窗：同发布字段结构。

## D10 契约与后端

openapi 0.11.0：三处 `meeting_area` → `meeting_areas`（`type: array, items: {type: string, maxLength: 100}, maxItems: 3, nullable: true`）；示例改数组。`V17__meeting_areas.sql`：`ALTER TABLE trip_plans ADD COLUMN meeting_areas TEXT;` 加回填。回填不用 JSON_ARRAY（H2 不支持），用 SQLite 与 H2 都支持的 `||` 与 REPLACE 拼接：把非空 meeting_area 包成单元素 JSON 数组，双引号用 REPLACE 转义（拼接串为 左括号引号 加 转义后的值 加 引号右括号）。种子值不含反斜杠与控制符，拼接即合法 JSON；T2 在 H2 与临时 SQLite 双库验证回填。entity 增 `meetingAreas` JSON 列（`JsonListUtils`，同 stops/tags）；pojo `TripPlan.meetingAreas List<String>`（null→`List.of()`）；`withMeetingInfo` 改收 list；service `normalizeMeetingAreas`：null→[]、trim、去重保序、>3 或 >100 抛 `InvalidInputException`；create/update 同口径。response 归一为数组。Mapper XML select 列换 `t.meeting_areas`。`OpenApiTest`：0.11.0 + `meeting_areas` 存在 + `meeting_area` 不存在 + maxItems 断言。`TripControllerTest` / `TripCompletionApiTest` JSON 与列清单同步。

## D11 E2E 语义兼容（spec F-2）

旧用例「map supports zoom, fullscreen and click-to-add」保留：空白点击后 `.map-callout` 内仍有「加入路线」按钮（候选行提供）；pin 增 `data-place-id` 属性供连加断言。新增用例见 atdd。

## D12 不做

在线瓦片 / 照片 / 同路气泡 / 时长编辑 / 拖拽排序 / 旧列删除（proposal out）。

## 对齐自检

| 检查 | 结论 |
|---|---|
| 每条 MODIFIED/ADDED 场景有设计落点 | Pass（D1–D11 覆盖 46 场景；P2 映射表同源） |
| spec F-1/F-2/F-3 落点 | Pass（D1 / D6+D11 / D9） |
| 任务可分层（见 tasks.md） | Pass |
| 样式只追加、antd 优先 | Pass（D2/D5；浮层自绘为 SVG 锚定例外，记 web-coding-style 例外） |