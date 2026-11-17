# Local verify report — refine-trip-map R2（P4 / G2-r2 输入）

- **Change:** `refine-trip-map`（REQ-016，R2 三级地图架构：中国 → 省 → 城市旅行地图）
- **Branch:** `feature/refine-trip-map`（P3-r2 提交 `f102bde`）
- **日期:** 2026-11-17 ｜ **记录人:** Jay（AO）
- **Environment:** Windows 11；Node v24.18.0；OpenJDK 21.0.11；SQLite `RouteME/SqlLite/routeme.db`（Flyway V1–V17 重建）；后端 `localhost:8080`、前端 dev `localhost:5173`；Playwright Chromium。
- **注意:** 验证期间机器日期由 2026-11-16 翻篇至 2026-11-17，暴露并修复一处生产时钟缺陷（见 §4-1）。

## 1. 命令与结果

| 层 | 命令（工作目录） | 结果 |
|---|---|---|
| 规格 | `npx -y openspec validate refine-trip-map --strict`（ai4se-baseline/） | valid；仅 1 条 INFO＝G1 条件 C1 归档顺序模拟（预期） |
| 契约 | R2 无契约变更（openapi 0.11.0 不动）；后端仅时钟一致性缺陷修复 | 基线延续 R1（Redocly valid 15 warnings） |
| 后端 | `.\mvnw.cmd verify`（backend/） | **246 tests / 0 failures / 0 errors / 0 skipped**（36 报告文件汇总），BUILD SUCCESS |
| 前端类型 | `npx tsc --noEmit`（frontend/） | 0 errors |
| 前端单测 | `npm test -- --run`（frontend/） | **32 files / 230 tests passed** |
| 前端构建 | `npm run build`（frontend/） | 成功（1.92s）；24 个城市数据独立 chunk（guangzhou 1.46 kB 最大）＝按城懒加载证据；仅既有主 chunk >500 kB 警告 |
| E2E | `npx playwright test`（e2e/，fresh SQLite + 8080/5173） | **90 passed / 0 failed**（最终轮 run3，4.1m） |
| 走查 | Browser 交互走查 + Playwright 截图脚本 | 完整闭环符合验收 §11；9 张截图入 `docs/preview/r2-*.png`；E17 断言控制台/pageerror 为空 |

## 2. E2E 覆盖对照（atdd R2 E11–E18，map.spec.ts 新增）

| # | 用例 | 结果 |
|---|---|---|
| E11 | 中国地图 34 省级区域、hover/selected、搜索省或市直达、不显示景点/路线/同行者 | Pass |
| E12 | 点击广东切换独立 ProvinceMap（非 Zoom），14 城、无城市间连线 | Pass |
| E13 | 点击广州切换独立 CityTravelMap，六 Layer（road/water/park/poi/route/traveler）按序渲染 | Pass |
| E14 | 选广州塔/海心沙/花城广场/北京路生成路线：①②③④编号与行程列表同步、渐变高亮、统计卡「预计」口径 | Pass |
| E15 | <2 景点禁止生成；加入/移除/上限 8；Reset/缩放/拖拽/全屏 | Pass |
| E16 | 同行者气泡（最高重合度＋人数）→面板降序、共同景点/日期/偏好、查看资料→真实用户页、邀请→真实行程详情、Mock 邀请演示提示不伪造成功 | Pass |
| E17 | 全闭环控制台无 error / 无 pageerror | Pass |
| E18 | 发布页双 picker（途经点＋集合区域）级联写目的地不写途经点；面包屑回省清市保留省 | Pass |

另：`trips.spec.ts` 既有 R1 用例全部兼容通过（详情只读 CityTravelMap、route-strip、降级语义保留）；未覆盖城市用例改拉萨（R2 已覆盖北京/上海）断言 picker 提示文案；首页三用例改日期稳健口径（种子 5/6＋API 新建未来行程）。全量 90/90 含 companions/chat/mine/profiles/auth/experiences 无回归。

## 3. 走查（1440 / 768 / 390 × 浅 / 深）

- 截图：`docs/preview/r2-{china,province,city-route,traveler-panel,fallback}-*.png` 共 9 张（1440 浅×4、1440 深×1、768 浅×1、390 浅×1、390 深×1、fallback 1440 浅×1）。
- 完整闭环（验收 §11）：中国 34 省 → 广东 14 城（无连线）→ 广州 11 POI＋珠江/绿地/道路/城区四底图 Layer → 选 4 景点生成路线 → 六 Layer 齐＋统计卡「4 景点 / 6 km 预计距离 / 1 小时 22 分钟预计时间」＋气泡「75% 同路 · 3 位同行者」＋编号 1–4 蓝→紫渐变 → 面板降序（阿哲 75 / 林见夏 75 / 苏念 25）共同景点/日期/偏好 → 苏念「发起同行邀请」→ `#/trips/4` 详情申请入口 → 详情只读地图正确降级（种子 stops 仅永庆坊可解析）。
- 拉萨 fallback：「该城市详细旅行地图正在完善」＋面包屑可回层，不白屏不报错；西藏字典 7 城可选。
- 发布级联：中国→广东→珠海回写「广东省 / 珠海市」，点选 POI 加 chip；面包屑回省清市保留省。
- 深色：D19 令牌整套衍生切换无白底残留；390：侧栏堆叠、气泡字号缩小、无溢出。

## 4. 验证期发现与修复（均在本 change 内闭环）

| # | 发现 | 修复 |
|---|---|---|
| 1 | **生产时钟缺陷**：`TripPlanServiceImpl.updateMeeting` 用无参 `trip.status()`（Instant.now()）判完成态；日期翻篇 2026-11-17 后种子行程 3（plannedEnd=11-16T16:00Z）被误判 COMPLETED → 409（后端 verify 3 失败） | 改 `trip.status(clock.instant())` 与服务注入 Clock 一致；复跑 246/246 |
| 2 | `ChatControllerTest`（5 失败）/`MatchControllerTest`（1 失败）缺固定时钟，真实时钟下种子行程过期 | 两类补 `@Import(FixedClockTestConfig.class)`；`TripPlanServicePersistenceTest` 无参 `status()` 改 `status(NOW)` |
| 3 | e2e run1 11 失败：pin 编号 DOM 顺序=索引表顺序；antd Space `direction` 弃用告警；goBack 后探索状态随路由重置；双 picker strict mode；uncovered 语义变化；**日期翻篇**种子 3/4 退出招募列表 | per-pin 编号断言；`orientation="vertical"`；跳转后重生成路线；`.first()`；拉萨提示文案断言；首页用例日期稳健化 |
| 4 | e2e run2 1 失败（cascade）：面包屑是 map-shell 内 SVG 的兄弟节点，city 定位器找不到；索引省名简称「广东」≠字典全名「广东省」 | shell 定位器；`findCity` 取字典全名 |
| 5 | cascade 回省后仍显示城市地图：级联写目的地后外部 `city` prop 锁定 scopedCity，内部回层被覆盖 | PlacePicker 增 `internalNav` 标记：面包屑回层后内部导航优先，直到外部目的地变化或重新选市（design D18 语义）；单跑+全量通过 |
| 6 | E2E 数据污染（既有债务）：run2 后开发库累积行程 | 备份 `routeme-dev-backup-20261117-r2-run3.db` 后删库 Flyway 重建，run3 全绿 |

## 5. 数据卫生

- 最终全量 E2E 在删除 `routeme.db` 后由 Flyway 重建（V1–V17）的干净库上执行；本轮共重建 2 次（run2 前、run3 前）。
- 旧库备份保留于 `SqlLite/routeme-dev-backup-20261116-r2.db`、`routeme-dev-backup-20261117-r2-run3.db`（不入库）。
- 截图临时脚本 `e2e/tmp-r2-shots.mjs` 用毕已删除。

## 6. 债务与观察（延续 R1 G2）

- 债务 1：E2E 向开发库累积行程，本地全量需 fresh DB；CI 用 H2 不受影响。
- 债务 2：E2E 不在 CI 流水线（既有 WARNING 延续）。
- 观察项：种子行程日期固定（11-16 等），真实时钟翻篇后退出招募列表——测试侧已日期稳健化＋固定时钟；生产侧 updateMeeting 时钟缺陷已修。后续可考虑种子日期相对化（另立 change）。
- MVP 限制（产品口径，非缺陷）：9 城程序化底图＋字典 POI；同行者 Mock 存城市数据模块；距离/时间为步行估算标「预计」；无真实 Routing。