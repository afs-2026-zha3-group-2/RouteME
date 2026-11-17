# P4 验证记录 — refine-trip-map

- **Change：** `refine-trip-map`（REQ-016 地图导航风重做 / 详情路线地图 / 多集合区域）｜ **阶段：** P4（实现 → 本地验证 → G2）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-trip-map`（P3 提交 `061d00a`）

## 1. 阶段目标

实现 T1–T10，完成本地全链路验证与三档视口双主题走查，给出 G2 结论；T11/T12 收口记录。按用户要求不归档。

## 2. 实现清单

| 层 | 文件 | 改动 |
|---|---|---|
| 契约 | `RouteME/openapi.yaml`（0.10.0→0.11.0） | TripPlan/TripDetail/TripCreateRequest/TripMeetingRequest 的 `meeting_area`→`meeting_areas`（array、maxItems 3、items maxLength 100、nullable）＋示例 |
| 契约测试 | `OpenApiTest.java` | 0.11.0、`meeting_areas` 存在、`meeting_area` 不存在、maxItems 断言 |
| 迁移 | `V17__meeting_areas.sql`（新） | 新列＋回填；`\|\|`+REPLACE 双库兼容（H2 无 JSON_ARRAY） |
| 后端 | `TripPlanEntity` / `TripPlan` / `TripPlanMapper.xml` / `TripPlanDraft` / `TripCatalogConstant` | JSON 列换列；`cleanMeetingAreas`（trim 含 U+3000 用 `strip()`、去重保序、≤3、≤100）；null→`List.of()` 守卫 |
| 后端 | request/response/service | 多值校验与归一数组；`TripControllerTest` +3、`TripCompletionApiTest` 同步 |
| 前端地图 | `mapView.ts` / `placeCatalog.ts` / `PlaceMap.tsx` | KM 常量/distanceKm/formatKm/routePath/buildScenery/nearestPlaces；导航风视觉重做（水滴 pin、蓝路线白 casing、公园/河流/道路、图例、控制条、比例尺）；readOnly/focusedCity/onCityFocus；空白候选浮层；`data-place-id`；**D13 城市局部投影＋聚焦 effect 拆分＋地名常显** |
| 前端表单 | `meetingForm.ts` / `tripForm.ts` / `types.ts` / `tripOptions.ts` / `TripCreatePage.tsx` / `PlacePicker.tsx` | 多集合 draft+添加+chips（max 3）；多途经点 max 8；全省概览只聚焦 |
| 前端详情 | `TripDetailPage.tsx` | 路线地图 section＋route-strip（编号徽标＋步行 约 x km）＋点击聚焦＋降级文案；编辑弹窗多值 |
| 前端展示 | `chatMeeting.ts` / `ChatMain.tsx` / `MyTripsPage.tsx` / `tripMessages.ts` | 数组 API 与多值展示文案 |
| 样式 | `styles.css` | 导航风令牌（浅+深）＋控制条/图例/strip/浮层；≤700px 隐藏图例与比例尺 |
| 单测 | mapView/placeCatalog/meetingForm/tripForm/chatMeeting/mineTrips 等 | 211 tests（含 D13 新增 3 例） |
| E2E | `e2e/tests/trips.spec.ts` / `companions.spec.ts` | E1–E10 增改；helper 支持 stops/destinationCode/meetingAreas；identity gate 断言对齐 `68d17ae` 登录门 |

## 3. 验证结果

| 层 | 命令 | 结果 |
|---|---|---|
| 规格 | `openspec validate refine-trip-map --strict` | valid（仅 G1-C1 归档顺序 INFO，预期） |
| 契约 | `npx -y @redocly/cli lint openapi.yaml` | valid，15 warnings＝既有基线 |
| 后端 | `.\mvnw.cmd -B -ntp verify` | 246 tests / 0 failures，BUILD SUCCESS |
| 前端 | `npm run build` / `npm test` | 成功 / 28 files 211 tests |
| E2E | `npx playwright test`（fresh SQLite V1–V17） | **81 passed / 0 failed** |
| 走查 | 1440 / 768 / 390 × 浅 / 深 | 6 张截图入 `docs/preview/refine-trip-map-*.png`；交互走查全符合、控制台无 error |

完整命令、E2E 对照与发现修复见 `docs/ai4se-plugins/20261116-234500-local-verify-report.md`。

## 4. 偏差与债务

| 类型 | 内容 | 处理 |
|---|---|---|
| 增补设计 | D13 城市局部投影＋聚焦 effect 拆分＋地名常显＋小屏比例尺隐藏 | 走查发现视觉挤团后增补；design.md 已登记；语义场景不变 |
| 修复 | Java `trim()`→`strip()`（U+3000 口径，spec F-3） | 后端 246/246 复跑绿 |
| 测试修订 | identity gate 断言对齐登录门；tasks.md 补 checkbox（格式性） | tasks-review 追加变更摘要；不改语义 |
| 债务 | E2E 向开发库累积数据，需 fresh DB 复跑 | 备份后重建×3；既有债务延续，另立 change 跟踪 |
| 债务 | E2E 不在 CI | 既有 WARNING 延续 |
| 观察 | experiences 一例全量首轮 detach 偶发（focus reload） | 单跑与最终全量均 Pass；登记观察项 |
| 未执行 | P5 归档（Living Spec 合并、索引收口） | 用户要求不归档 refine-trip-map / S06 / S07 |

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO（实现） | Jay | T1–T12 完成；本地验证证据可复现 | 2026-11-16 |
| VL（独立验证） | Neal | 命令与结果复核；G2 Pass（2 条既有债务＋1 观察项） | 2026-11-16 |
| IO | WAYNE | 契约 0.11.0 多值替换与 Delta 未偏离 | 2026-11-16 |

**阶段结论：Pass（G2 Pass with documented debts）。** 按用户要求不执行 P5、不归档。

## 6. 阶段提交链

- P0 `c6b0216` → P1 `5f28d81` → P2 `7634500` → P3 `061d00a` → P4（本记录所在提交，见 git log）。