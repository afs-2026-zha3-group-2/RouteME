# P4 — refine-publish-route-map（REQ-027 / S28 发布页路线编辑器实现与验证）

- **日期：** 2026-11-18 ｜ **记录人：** Jacky（当前开发者）｜ **阶段：** P4 本地 Pass（G2 待独立验证人签署）
- **Change：** `refine-publish-route-map`（`trip-plans` MODIFIED：1 Requirement / 18 Scenario）
- **提交链：** P0–P2 `385afcf` ｜ P3 `a90755b` ｜ P4 实现 / 记录见 §7
- **验证报告：** [`docs/ai4se-plugins/20261118-110400-local-verify-report.md`](../../docs/ai4se-plugins/20261118-110400-local-verify-report.md)
- **走查截图：** [`docs/preview/refine-publish-route-map/`](../../docs/preview/refine-publish-route-map/)（390 / 768 / 1440 × light / dark）

## 1. 实现落点

| 文件 | 改动 |
|---|---|
| `frontend/src/trips/PublishRouteEditor.tsx` | 新增编辑器：栅格底图 + 搜索 + 途经点面板 + 行程面板；地图点选的坐标占位名先弹命名框；未定位名称进 `.publish-route-unresolved`（可重试 / 移除） |
| `frontend/src/map/amap/useRoutePlan.ts` | 新增共享规划 hook：生成路线、失败退直线、城市透传到公共交通、文案可注入；探索页与发布页同源 |
| `frontend/src/map/amap/WaypointPanel.tsx` / `ItineraryPanel.tsx` | 新增可选 `modes` / `modeLabels` / `emptyHint` / `modeAriaLabel`；不改变探索页默认值，`MODE_LABELS` 不被改写 |
| `frontend/src/trips/publishRoute.ts`（+ `.test.ts`） | `projectStops(located, unlocated)`：已定位点在前、未定位名在后、trim 去空 |
| `frontend/src/trips/tripOptions.ts`（+ `.test.ts`） | `TRIP_TRAVEL_MODES` / `TRIP_TRAVEL_MODE_LABELS` / `isTripTravelMode`（三档，`walking` 被拒） |
| `frontend/src/trips/tripForm.ts`（+ `.test.ts`） | `validateTripForm` 增加占位名分支：`errors.stops = tripMessages.errorStopsPlaceholder` |
| `frontend/src/map/amap/placePick.ts`（+ `.test.ts`） | `isCoordinatePlaceholderName`（`地图选点 <lng>, <lat>`） |
| `frontend/src/trips/TripCreatePage.tsx` | 「简单路线」段换为路线编辑器；删除内嵌目的地地图与出行方式 Segmented；接入 12 个文案键 |
| `frontend/src/i18n/tripMessages.ts` | 新增 `route*` 文案；移除已无引用的 `waypointCityUncovered` |
| `frontend/src/shell/AppShell.tsx` | 仅移除 `map` 导航条目（`#/map` 路由与深链保留） |
| `frontend/src/styles.css` | 末段追加 `.publish-route-*` 95 行，无删除 |
| `e2e/tests/support/amapStub.ts` | 从 `ai-planner.spec.ts` 抽出共享替身；新增 `/v3/ip` 探测放行、分模式时长、`clickMapAt(scope)` |
| `e2e/tests/publish-route-map.spec.ts` | 新增 12 条（ATDD #8–#18 + 导航约束） |
| `e2e/tests/publish-route-walkthrough.spec.ts` | 新增 1 条走查，产出 6 张截图 |
| `e2e/tests/trips.spec.ts` | 途经点录入改编辑器锚点；3 条针对已删组件的用例替换为 `picking the destination does not write stops` |
| `e2e/tests/ai-planner.spec.ts` | 改用共享替身；A11 / A12 的发布页途经点改编辑器入口 |

## 2. 验证结果

| 层 | 结果 | 关键项 |
|---|---|---|
| 规格 | 18 场景（基线 7 + 新增 11） | `atdd-design.md` §1 逐条映射到用例名 |
| 前端类型 / 构建 | Pass | `tsc --noEmit` 无输出；`vite build` 成功（仅既有 chunk-size 提示） |
| 前端单测 | 59 文件 / **469 项** | 新增 `placePick.test.ts` / `tripOptions.test.ts` / `publishRoute.test.ts` 及 `tripForm.test.ts` 扩充 |
| E2E 新功能 | **12/12** | 地图加途经点、排序后发布、切模式重算、公共交通城市、直线降级、文案脱敏、请求体、占位名拦截、AI 预填、8 点上限、三档双主题、导航深链 |
| E2E 走查 | 1/1 | 3 视口 × 2 主题，无横向溢出 |
| E2E 回归（T13 集合） | 43 passed / 16 failed | 16 条全部为既有失败，逐条归因见验证报告 §5 |
| 后端 | 561 项 / 3 failed | 3 条为并行会话 profile WIP 未落地（`backend/**` 无本 change 改动） |
| 非目标 | Pass | 无 `backend/**`、`openapi.yaml`、`db/migration/**` 改动；工作区两处未跟踪后端文件属他人 WIP，未提交 |

## 3. Red → Green 证据

| 层 | Red（实施时观察） | Green |
|---|---|---|
| 纯逻辑（T1–T4） | 新测试先落盘：`isCoordinatePlaceholderName` / `isTripTravelMode` / `projectStops` / 占位名校验导入即失败（模块未导出），断言无法求值 | 4 个测试文件随 `npm test` 全绿（469 项） |
| 页面（T7–T9） | `publish-route-map.spec.ts` 的锚点 `.publish-route-editor` / `#trip-stops` / `.amap-waypoint-text b` 在旧发布页不存在（旧页是 `AmapPlacePicker` chip + `china-map`） | 12/12 通过 |
| 回归（T12） | `trips.spec.ts` 改锚点前 3 条旧用例指向已删除组件（`AmapPlacePicker` / `china-map` / `city-map`） | 21/25（余 4 条为库累积债务） |

## 4. 反向复核

- **契约：** 请求体仍为 `stops: string[]` + `travel_mode`；`publish-route-map.spec.ts` 有反向守卫断言（不含 `coord|lng|lat|place|polyline|route` 键，`stops` 内无坐标）。
- **导航：** `#/map`、`#/map/440000`、`#/map/440000/440100` 三条深链仍渲染 `.amap-explorer`；仅 `.rail-nav` / `.tabbar` 不再出现「旅行地图」。
- **探索页：** `WaypointPanel` / `ItineraryPanel` 的默认值未变；`MODE_LABELS` 未被发布页标签覆盖。
- **文案：** 降级文案不含 后端 / 端口 / 代理 / 重载 / 8080 / Key（E2E 断言）。

## 5. 失败归因（非本 change）

| 用例 | 归因 |
|---|---|
| `trips.spec.ts` 4 条列表 / 筛选 | 本地 E2E 库累积 120 条可招募 / 满员行程，默认匹配排序把种子行程（`id 5` / `id 6`）挤出一页 |
| `map.spec.ts` 9 条 | 探索页早已迁到栅格底图 + `AreaCascader`，用例仍找 `china-map` / `city-map` / `data-poi-id` |
| `ai-planner.spec.ts` A1 / A2 / A10 | 用 `git show HEAD:` 的同名用例复跑，失败点与信息完全一致（日期预填、定位占位名、retry 渲染两份） |
| 后端 3 条 profile 测试 | 并行会话未跟踪的 `V27__normalize_demo_user_profiles.sql` 与已提交测试口径冲突 |

## 6. 残余风险

1. **未定位名称的提交顺序：** 解析不到坐标的地名排在已定位点之后（`proposal.md` D6 记录的口径例外）；若同一次发布既有已定位点又有未定位名，用户看到的顺序与编辑器列表不一致，需后续需求决定是否改为阻断。
2. **地图点选依赖逆地理：** 离线 / 配额耗尽时逆地理退化为坐标占位名，此时必须人工命名（已双层拦截，但多一步操作）。
3. **组件层无单测：** 仓库无 jsdom / Testing Library，编辑器交互仅由 E2E 覆盖。
4. **本地 E2E 库污染：** 上述 4 条列表用例在干净库上应通过；未在本次清理数据库。
5. **G2 未签署：** 独立验证人尚未指定，签署后本阶段才可推进到 P5。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0–P2 | `385afcf` | `docs(sdd): add refine-publish-route-map P0-P2 artifacts (REQ-027)` |
| P3 | `a90755b` | `docs(p3): add refine-publish-route-map design, ATDD and tasks (REQ-027)` |
| P4 实现 | `ceb4a47` | `feat(p4): refine-publish-route-map publish trips on the route editor` |
| P4 记录 | 本条提交 | `docs(p4): refine-publish-route-map record verification and screenshots` |

## 8. 下一阶段

- P5（归档）**暂不执行**：需排在 `refine-trip-map` / `add-trip-publish` 之后，且 G2 签署完成。