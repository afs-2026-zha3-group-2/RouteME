# 任务计划 — refine-trip-map（P3）

- **日期：** 2026-11-16｜ **Owner：** Jay（AO）｜ **签署：** Jay + Neal（2026-11-16 签）
- **顺序：** T1→T2→T3→T4→T5→T6→T7→T8→T9→T10→T11→T12；契约先于两端，样式与接线随后，E2E 与验证收口。

| id | 层 | 任务 | 落点 | 验证命令（工作目录） |
|---|---|---|---|---|
| T1 | contract | openapi 0.11.0：三处 meeting_area→meeting_areas（array/maxItems 3/maxLength 100/nullable）+ 示例；OpenApiTest 同步 | `RouteME/openapi.yaml`、`backend/.../OpenApiTest.java` | `npx -y @redocly/cli lint openapi.yaml`（RouteME/）；`.\mvnw.cmd test -Dtest=OpenApiTest`（backend/） |
| T2 | db | V17 新列 + 回填（SQLite JSON_ARRAY / H2 拼接双兼容）；entity/pojo/mapper XML 换列 | `V17__meeting_areas.sql`、`TripPlanEntity`、`TripPlan`、`TripPlanMapper.xml` | `.\mvnw.cmd -B -ntp test`（backend/，H2+SQLite 迁移校验） |
| T3 | backend | request/response/service 多值校验（trim/去重/≤3/≤100/归一 []）；TripControllerTest/TripCompletionApiTest 同步 | `request/*`、`response/*`、`TripPlanServiceImpl` | `.\mvnw.cmd -B -ntp verify`（backend/） |
| T4 | frontend-form | types/tripOptions/tripForm/meetingForm 多值 + U3/U4 单测 | `types.ts`、`tripOptions.ts`、`tripForm.ts`、`meetingForm.ts` 及测试 | `npm test`（frontend/） |
| T5 | frontend-map | mapView 增 routePath/distanceKm/buildScenery/nearestPlaces + U1/U2；PlaceMap 视觉重做（D2–D6）+ readOnly/focusedCity + data-place-id | `mapView.ts`、`placeCatalog.ts`、`PlaceMap.tsx` 及测试 | `npm test`；`npm run build`（frontend/） |
| T6 | frontend-publish | PlacePicker 集合 multi(max 3)；TripCreatePage 集合字段 draft+添加+chips；全省概览只聚焦接线 | `PlacePicker.tsx`、`TripCreatePage.tsx` | `npm test`；`npm run build` |
| T7 | frontend-detail | TripDetailPage 路线地图 + route-strip + 聚焦 + 降级；编辑弹窗多值 | `TripDetailPage.tsx` | `npm test`；`npm run build` |
| T8 | frontend-display | chatMeeting/MyTripsPage/TripCard 摘要/i18n 多值展示 + U5 | `chatMeeting.ts`、`MyTripsPage.tsx`、`tripMessages.ts` 及测试 | `npm test` |
| T9 | styles | styles.css 末尾追加 D2 令牌 + 控制条/图例/strip/浮层样式（浅+深） | `styles.css` | `npm run build` |
| T10 | e2e | E1–E10 增改（含旧用例语义兼容） | `e2e/tests/trips.spec.ts` | `npx playwright test`（e2e/，需 8080+5173） |
| T11 | verify | 本地验证报告（V1–V8）+ 三档视口双主题走查截图 | `docs/ai4se-plugins/<ts>-local-verify-report.md` | 全链路命令复跑 |
| T12 | docs | 知识库地图小节回写 + _LOG；p3/p4 记录、G2、索引；不归档 | `docs/knowledge/architecture/README.md`、`docs/sdd/refine-trip-map/*` | 链接核对 |

## 任务勾选（openspec 跟踪，与上表同源）

- [x] 1. T1 契约 0.11.0 + OpenApiTest
- [x] 2. T2 V17 迁移 + entity/pojo/mapper 换列
- [x] 3. T3 后端多值校验 + 控制器测试
- [x] 4. T4 前端表单多值 + 单测
- [x] 5. T5 地图视觉重做 + mapView/placeCatalog 纯函数 + 单测
- [x] 6. T6 发布页多途经点/多集合接线
- [x] 7. T7 详情页路线地图 + strip + 聚焦 + 编辑弹窗多值
- [x] 8. T8 聊天/我的旅行/卡片多值展示
- [x] 9. T9 导航风样式（浅+深）
- [x] 10. T10 E2E E1–E10 增改 + 全量 81/81
- [x] 11. T11 本地验证报告 + 三档视口双主题走查
- [x] 12. T12 知识库回写 + p4 记录 + G2 + 索引（不归档）

## R2 任务（三级地图架构，T13–T24）

| id | 层 | 任务 | 落点 | 验证命令 |
|---|---|---|---|---|
| T13 | data | types/china/index 轻量索引 | `map/data/{types,china,index}.ts` | `npm test` |
| T14 | data | registry 懒加载＋10 城＋legacy 广东转换＋procedural | `map/data/cities/*`、`procedural.ts` | `npm test` |
| T15 | map-core | layers 六组件＋useMapViewport＋controls＋breadcrumbs | `map/layers.tsx`、`useMapViewport.ts` 等 | `npm test`/`build` |
| T16 | map-levels | ChinaMap＋ProvinceMap | `map/ChinaMap.tsx`、`ProvinceMap.tsx` | `npm test`/`build` |
| T17 | map-city | CityTravelMap＋路线生成＋stats＋ItineraryList | `map/CityTravelMap.tsx` 等 | `npm test`/`build` |
| T18 | match | travelerMatch/routeEstimate＋TravelerPanel＋气泡＋邀请 | `map/travelerMatch.ts` 等 | `npm test` |
| T19 | page | MapExplorerPage＋route＋rail 入口 | `pages/MapExplorerPage.tsx`、`route.ts`、`AppShell.tsx`、`App.tsx` | `build` |
| T20 | integration | PlacePicker/TripCreatePage/TripDetailPage 接线＋facade | `PlacePicker.tsx`、`placeCatalog.ts` 等 | `npm test`/`build` |
| T21 | visual | 新令牌＋渐变＋样式替换＋退役 PlaceMap | `styles.css`、删 `PlaceMap.tsx` | `build` |
| T22 | ut | U6–U9＋旧地图单测改写 | `map/*.test.ts` | `npm test` |
| T23 | e2e | map.spec E11–E18＋trips.spec 更新 | `e2e/tests/*` | `npx playwright test` |
| T24 | verify | 全量验证＋走查＋报告＋G2-r2＋知识库/索引 | docs | 全链路 |

- [x] 13. T13 数据 types/china/index
- [x] 14. T14 registry＋城市模块
- [x] 15. T15 layers/hook/controls/breadcrumbs
- [x] 16. T16 ChinaMap/ProvinceMap
- [x] 17. T17 CityTravelMap/路线/stats/行程
- [x] 18. T18 匹配纯函数/面板/气泡/邀请
- [x] 19. T19 探索页/路由/导航
- [x] 20. T20 发布/详情/facade 接线
- [x] 21. T21 令牌/样式/退役
- [x] 22. T22 单测
- [x] 23. T23 e2e
- [x] 24. T24 验证收口（不归档）

## 对齐自检

| 检查 | 结论 |
|---|---|
| 每任务只落一层 | Pass（T5 跨 map 三文件同属前端地图层） |
| 契约先于两端 | Pass（T1→T2/T3→T4+） |
| 每任务有真实验证命令 | Pass（均为仓库既有命令） |
| spec F-1/F-2/F-3 有任务 | Pass（T5 全省只聚焦 / T5+T10 callout 语义 / T4 trim 单测） |
| out-of-scope 未入任务 | Pass |
| 46 场景覆盖 | Pass（atdd 对齐自检同源） |