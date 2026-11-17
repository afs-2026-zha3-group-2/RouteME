# P4 验证记录（R2）— refine-trip-map

- **Change：** `refine-trip-map`（REQ-016，R2 三级地图架构）｜ **阶段：** P4（实现 → 本地验证 → G2-r2）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-trip-map`（P3-r2 提交 `f102bde`）

## 1. 阶段目标

实现 T13–T24：中国 → 省 → 城市旅行地图三级架构（独立组件切换，Zoom≠换层）、六 SVG Layer、路线生成与行程同步、同行者匹配面板与邀请接线、10 城数据驱动＋fallback、发布/详情兼容接线、旧 PlaceMap 退役；完成全链路验证与三档视口双主题走查，给出 G2-r2 结论。按用户要求不归档。

## 2. 实现清单

| 层 | 文件 | 改动 |
|---|---|---|
| 数据层 | `map/data/{types,index,procedural}.ts`、`data/cities/{registry,shared,guangzhou+23城}.ts` | CityIndex 轻量静态索引（名称/别名/坐标/包围盒）；legacy 15 城同构转换（22..78 铺满）；广州手工数据（珠江/4 公园/4 城区/11 POI/3 同行者）；其余 9 MVP 城字典 POI＋程序化底图（seed=cityCode 确定性）；registry 24 城动态 import 懒加载 |
| 三级组件 | `ChinaMap.tsx` / `ProvinceMap.tsx` / `CityTravelMap.tsx` / `MapBreadcrumbs.tsx` | 34 省 hover/selected/搜索；广东手工布局其余省字典＋确定性布局、无城市连线；城市六 Layer＋callout＋侧栏；面包屑「中国 > 广东省 > 广州市」回层 |
| 六 Layer | `layers.tsx` | RoadLayer/WaterLayer/ParkLayer/PoiLayer/RouteLayer/TravelerLayer 纯 `<g data-layer>`；渐变 useId；编号圆徽；气泡 foreignObject |
| 路线/同行者 | `routeEstimate.ts` / `travelerMatch.ts` / `RouteStatsCard.tsx` / `ItineraryList.tsx` / `TravelerPanel.tsx` | 步行 4.5 km/h「预计」估算；重合度纯函数 round(shared/route.length×100)；统计卡/行程双向同步/面板降序＋资料＋邀请（真实 tripId→详情，Mock→演示提示） |
| 视口/供应 | `useMapViewport.ts` / `provider.ts` / `MapControls.tsx` | 拖拽/滚轮/±/Reset/Fullscreen；MapProvider 接口＋OfflineSvgProvider（为高德等预留） |
| 页面接线 | `pages/MapExplorerPage.tsx`（新）、`App.tsx` / `route.ts` / `AppShell.tsx` | `/map(/省码(/市码))` URL 为层级唯一权威；导航「旅行地图」；探索状态随路由重置 |
| 兼容接线 | `PlacePicker.tsx` / `TripCreatePage.tsx` / `TripDetailPage.tsx` / `placeCatalog.ts`(facade) / `mapView.ts` | 发布级联写目的地不写途经点＋internalNav 回层；详情只读 CityTravelMap＋route-strip 保留；facade re-export 保旧 API |
| 退役 | 删 `PlaceMap.tsx`；`styles.css` +589 行 | 旧「省轮廓+城市散点+连线」地图退役（分支功能清理）；D19 令牌浅/深＋legacy 别名映射 |
| 后端修复 | `TripPlanServiceImpl.updateMeeting` | 无参 `trip.status()`→`status(clock.instant())`（日期翻篇暴露的生产时钟缺陷） |
| 单测 | `map/*.test.ts` 5 新＋placeCatalog/gazetteerCity 改写 | 32 files / 230 tests |
| E2E | `map.spec.ts`（新 E11–E18）/ `trips.spec.ts` 更新 | 90 用例；日期稳健化＋固定时钟口径 |
| 文案 | `tripMessages.ts` | waypointNeedsDestination/waypointCityUncovered R2 口径 |

## 3. 验证结果

| 层 | 命令 | 结果 |
|---|---|---|
| 规格 | `openspec validate refine-trip-map --strict` | valid（仅 C1 归档顺序 INFO，预期） |
| 后端 | `.\mvnw.cmd verify` | **246 tests / 0 failures / 0 errors**，BUILD SUCCESS |
| 前端 | `tsc --noEmit` / `npm test` / `npm run build` | 0 errors / **32 files 230 tests** / 成功（24 城市独立 chunk＝懒加载证据） |
| E2E | `npx playwright test`（fresh SQLite V1–V17） | **90 passed / 0 failed**（run3，4.1m） |
| 走查 | 1440 / 768 / 390 × 浅 / 深 | 9 张截图入 `docs/preview/r2-*.png`；验收 §11 完整闭环通过；控制台无 error（E17 机器断言） |

完整命令、三轮失败修复对照见 `docs/ai4se-plugins/20261117-013000-local-verify-report.md`。

## 4. 偏差与债务

| 类型 | 内容 | 处理 |
|---|---|---|
| 生产缺陷修复 | updateMeeting 无参 status() 用真实时钟，日期翻篇后误判完成态 409 | 改 clock.instant()；246/246 复跑绿；知识库登记时钟一致性坑 |
| 测试修订 | Chat/Match 测试类补固定时钟；persistence status(NOW)；首页用例日期稳健化；uncovered 改拉萨 | 测试侧口径，不改产品语义 |
| 增补实现 | PlacePicker internalNav（面包屑回层优先于外部 city 锁定） | design D18 语义落地；e2e E18/cascade 覆盖 |
| 债务 | E2E 向开发库累积数据需 fresh DB；E2E 不在 CI | 既有债务延续（备份×2 后重建） |
| 观察 | 种子行程固定日期随真实时钟翻篇退出招募列表 | 测试已稳健化；种子日期相对化另立 change 跟踪 |
| MVP 限制 | 9 城程序化底图；同行者 Mock；预计距离/时间；无真实 Routing | 产品口径，spec 已声明诚实性 |
| 未执行 | P5 归档 | 用户要求不归档 |

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO（实现） | Jay | T13–T24 完成；本地验证证据可复现 | 2026-11-17 |
| VL（独立验证） | Neal | 命令与结果复核；G2-r2 Pass（2 条既有债务＋1 观察项） | 2026-11-17 |
| IO | WAYNE | R2 未偏离 Delta（无契约变更）；时钟修复口径 | 2026-11-17 |

**阶段结论：Pass（G2-r2 Pass with documented debts）。** 按用户要求不执行 P5、不归档。

## 6. 阶段提交链

- R1：P0 `c6b0216` → P1 `5f28d81` → P2 `7634500` → P3 `061d00a` → P4 `2bf89cb`（已 push）。
- R2：P0 `01fde76` → P1 `0dc9e5b` → P2 `d60c16e` → P3 `f102bde` → P4（本记录所在提交，见 git log）。