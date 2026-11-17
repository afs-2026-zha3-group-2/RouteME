# ATDD 设计 — refine-trip-map（P3）

- **日期：** 2026-11-16｜ **作者：** Jay（AO）
- **分层：** E2E（Playwright，本地门禁）+ UT（vitest / JUnit）。场景编号对齐 Delta `specs/trip-plans/spec.md`。

## E2E（e2e/tests/trips.spec.ts 增改）

| id | 用例 | 场景 | 断言要点 |
|---|---|---|---|
| E1 | 既有「map supports zoom, fullscreen and click-to-add」保留改 | 缩放平移与全屏 / 地图点击总有可见反馈 | viewBox 变化；is-fullscreen + Esc；空白点击 `.map-callout` 含「加入路线」并可加入 |
| E2 | 发布页连加多途经点 + 上限 | 途经点连加与上限反馈 | 用 `data-place-id` 连点 3 个 pin → chips 1/2/3；搜索补到 8 个后再加 → 「最多选择 8 个地点」 |
| E3 | 全省概览点击只聚焦 | 未选目的地时展示全省概览 | 未选目的地 map data-city=all；点广州 pin → 视口聚焦且 chips 不增 |
| E4 | 多集合区域发布 + 三处展示 | 填写集合信息后成功发布 / 展示集合区域与集合时间 | 集合加 2 个（地图 + 手输）→ 发布 → 详情 dd 含两值；聊天安全条含两值；我的旅行备注含两值 |
| E5 | 集合超量 / 超长拒绝 | 集合区域超量 / 超长时拒绝发布 | 第 4 个提示「最多选择 3 个集合区域」；手输 101 字提示长度上限 |
| E6 | 详情路线地图 + 行程条 | 详情渲染路线地图与行程安排条 | API 创建 stops=[广州塔,北京路,陈家祠] 的行程 → 详情 `.map-shell` 存在、编号 pin 3、strip 3 卡 + 「约 x km」 |
| E7 | 详情点击聚焦 + 地点卡 | 点击途经点聚焦并弹出地点卡 | 点 strip 卡 → viewBox 变化 + `.map-callout` 名称一致；readOnly 无「加入路线」 |
| E8 | 详情降级 | 无离线点位时降级文本列表 | stops 含非地名库值 → 无 map + 说明文案；文本列表保留 |
| E9 | 发布者编辑多集合 | 发布者编辑集合信息 / 校验失败时不保存 | 编辑弹窗改 2 个保存 → 三处同步；非发布者 API 403；已结束 409（API 断言） |
| E10 | 旧数据不丢值 | 旧数据集合区域升级不丢值 | 种子 trip（V16 meeting_area 非空）详情展示原值（V17 回填） |

## UT

| id | 落点 | 覆盖 |
|---|---|---|
| U1 | `map/mapView.test.ts` | `routePath` 平滑路径端点一致；`distanceKm` 口径（广州塔→北京路 ≈5–6km）；`buildScenery` 确定性 |
| U2 | `map/placeCatalog.test.ts` | `nearestPlaces` 升序 ≤3 |
| U3 | `trips/tripForm.test.ts` | meetingAreas ≤3 / trim(U+3000) / ≤100 / 去重保序 / toCreateRequest null 口径 |
| U4 | `trips/meetingForm.test.ts` | 多值编辑校验与 toMeetingRequest |
| U5 | `chat/chatMeeting` 既有测试改 | 数组 join / 空数组待确认 |
| U6 | 后端 `TripControllerTest` | meeting_areas 创建 / 编辑 / 400 超量超长 / 403 / 409 / 响应归一 [] |
| U7 | 后端 `OpenApiTest` | 0.11.0 / meeting_areas maxItems 3 / meeting_area 移除 |
| U8 | 后端迁移双库 | V17 在 H2 与 SQLite 均成功且回填正确（`TripControllerTest` 间接 + 临时 SQLite 启动） |

## 走查

1440 / 768 / 390 × 浅 / 深：发布页地图、详情地图 + strip、浮层不越界；截图留 P4 报告。

## 对齐自检

46 场景中 35 基线保留由既有 E2E/UT 回归覆盖（trips/companions/chat/mine 全量）；11 新增/取代由 E1–E10 + U1–U8 覆盖；无孤儿场景。

---

## R2 增补（三级地图架构，66 场景）

### E2E（新 map.spec.ts E11–E18＋trips.spec 更新）

| # | 场景覆盖 | 断言要点 |
|---|---|---|
| E11 | 探索三级切换 | `#/map` china-map 可见→点广东→province-map（无连线 svg line）→点广州→city-map＋六 layer testid＋面包屑文本 |
| E12 | 搜索直达 | 中国层搜「广州」选结果→hash `#/map/440000/440100`；搜「广东」→省层 |
| E13 | 面包屑回层＋Zoom 不换层 | 城市层点面包屑省→province-map；滚轮/＋−后 hash 不变 |
| E14 | 路线生成同步 | 选 4 POI→route-generate 可用→点击→poi-pin 编号 1–4＋route-stats 含「预计」＋ItineraryList 同序；点列表第 3 项→focus |
| E15 | 移除同步 | 移除第 2 个→编号 1–3＋stats 数量 3 |
| E16 | 同行者 | traveler-bubble 百分比＝数据计算（75% 例）；panel 降序＋共同景点/日期/标签；查看资料→#/users/{id}；邀请→真实 trip 详情；无 tripId 者→演示提示 |
| E17 | fallback | `#/map/540000/540100`（拉萨）→「该城市详细旅行地图正在完善」；无 console error |
| E18 | 发布/详情兼容 | 发布页未选目的地→china-map 级联写目的地；珠海 stops 连加/上限/多集合回归；详情只读 city-map＋气泡＋strip 聚焦；拉萨目的地→fallback 文案 |

### 单测 U6–U9

- U6 travelerMatch：overlap 3/4=75、0 共同过滤、降序、空路线=0。
- U7 routeEstimate：km 与 minutes=km/4.5*60；format 预计文案。
- U8 registry：未登记城→null；登记城 loadCity 返回 layers/travelers（vitest dynamic import）。
- U9 facade：searchPlaces/resolvePlace 命中新索引（广州塔/海心沙/香洲港）；placesInCity 珠海保留。

### 走查与 bundle

1440/768/390 × 浅/深：中国/省/城市三层＋路线＋面板截图；build 产物断言 city chunks 独立（懒加载证据）。

### 对齐自检

66 场景：R1 基线 35 仍由回归覆盖；R2 新增/取代 31 由 E11–E18 + U6–U9 + 走查覆盖；无孤儿场景。