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

## 对齐自检

| 检查 | 结论 |
|---|---|
| 每任务只落一层 | Pass（T5 跨 map 三文件同属前端地图层） |
| 契约先于两端 | Pass（T1→T2/T3→T4+） |
| 每任务有真实验证命令 | Pass（均为仓库既有命令） |
| spec F-1/F-2/F-3 有任务 | Pass（T5 全省只聚焦 / T5+T10 callout 语义 / T4 trim 单测） |
| out-of-scope 未入任务 | Pass |
| 46 场景覆盖 | Pass（atdd 对齐自检同源） |