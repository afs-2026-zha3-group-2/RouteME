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