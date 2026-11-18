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

### 2.1 合并 `origin/main` 后复验（2026-11-18，`4c1e8ea` / `84c1346`）

P4 落地后 `origin/main` 前进 29 个提交（含 v3 发布页 / AI 页改版），合并后按合并态重跑：

| 层 | 结果 | 说明 |
|---|---|---|
| 合并冲突 | 9 处全部人工解冲突 | 发布页保留 v3 版式（基本信息 / 路线规划 / 集合与预算）并把 `PublishRouteEditor` 放进路线卡片；删除与编辑器重复的出行方式 `<Select>`（出行方式由编辑器独占）；保留 `capacity` 与 `difficulty` |
| 前端类型 / 构建 | Pass | `tsc --noEmit` 无输出；`vite build` 成功 |
| 前端单测 | 62 文件 / **487 项** | `npm test` 全绿 |
| 后端 | 29 个迁移在独立库 `routeme-verify.db` 上全部应用，`/api/trips` 200 | 共享开发库已被并行会话记为另一份 V27，未触碰 |
| E2E 新功能 | **12/12** | 合并后仅调整测试侧锚点，见下 |
| E2E `trips.spec.ts` | **25/25** | 干净 `routeme-verify.db` 上全绿；此前的 4 条失败确认为库累积所致，非合并回归 |
| E2E `ai-planner.spec.ts` | 10/12 | 余 A2 / A10 为既有债务（与 §5 一致） |
| E2E `map.spec.ts` | 0/9 | 既有债务（栅格底图 + `AreaCascader` 迁移未同步用例），与本次合并无关 |

合并引致的测试侧适配（均为版式/文案变化，不是功能回归）：

| 用例 | 适配 |
|---|---|
| `publish-route-map.spec.ts` | 发布按钮渲染为 `发布 →`，正则放宽为 `/^发\s*布/`；详情页途经点从 `.detail-stops li` 改读 `.route-strip-name`；直线降级提示在地图失败回调后渲染，改为 `expect(...).toContainText` 自动重试 |
| `trips.spec.ts` | v3 用 CSS `content: "+ "` 装饰未选标签，可访问名为 `+ 摄影`，定位器放宽为 `/摄影/` |
| `ai-planner.spec.ts` | 规划条件收进抽屉：A8 清空预算、A9 改兴趣/节奏前先用 `openConditions` 展开、`closeConditions` 收起；超预算提示移到 `.ai-over-budget`，按钮文案为 `帮我降低预算`；估算标识改为 `参考估算` |

### 2.2 再合并 `origin/main@aa320dc`（2026-11-18，`eb6a998`）

§2.1 记录合并后远端又前进 9 个提交：旅行金融（REQ-028 / `V30`）、发布页日期与同行设置生效、AI 规划收为单页对话流、减少动态效果下 `Select` 弹层不可见的修复；随后并入 `LIULE15` 的「我申请的按行程去重」（`2bf9148`）。按合并态复验：

| 层 | 结果 | 说明 |
|---|---|---|
| 合并冲突 | 5 处人工解冲突 | `ai-planner.spec.ts` / `AppShell.tsx` / `TripCreatePage.tsx` / `registry.md` / `stories.md`；无残留冲突标记 |
| 前端类型 / 构建 | Pass | `tsc --noEmit` 无输出；`vite build` 成功 |
| 前端单测 | 64 文件 / **518 项** | `npm test` 全绿（含远端新增的旅行金融与「我申请」用例） |
| 后端 | 30 个迁移在独立库 `routeme-verify.db` 上全部应用（`now at version v30`），`/api/trips` 200 | 打包在仓库外临时目录完成：并行会话的应用正占用 `backend/target/*.jar`（8090 端口），不打断它 |
| E2E 回归 | **58 passed / 9 failed** | 9 条全部是 `map.spec.ts` 既有债务；`trips` 26/26、`publish-route-map` 12/12、`ai-planner` 12/12、`finance` 3/3、`credit-exit` 5/5 |

合并取舍（保留双方能力，不重复实现）：

- **AI 规划页采用远端的纯对话流：** 规划条件抽屉、`ai-conditions-toggle`、`ai-interests` / `ai-pace` 一并移除，条件由对话解析；主线只保留 `support/amapStub` 共享替身、`addRouteStop` 与 `/^发\s*布/` 按钮锚点。§2.1 里 A2 / A10 的适配随之作废，用例重写后 A1–A12 全绿。
- **同行设置卡片不再有出行方式：** 出行方式由 `PublishRouteEditor` 独占，卡片只留 `capacity`（招募人数）与 `difficulty`（难度强度）；减少动态效果的 `Select` 用例因此由三项收敛为两项，并去掉 `.ppc-facts` 的「骑行」断言。
- **需求台账并存：** `registry.md` / `stories.md` 同时保留 REQ-027（S28 发布页路线编辑器）与 REQ-028（S29 旅行金融）；重复编号（REQ-027 两处、REQ-018 两处）为既有「后到者顺延」遗留，本 change 不重编号。

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
| `trips.spec.ts` 4 条列表 / 筛选 | 本地 E2E 库累积可招募 / 满员行程，默认匹配排序把种子行程（`id 5` / `id 6`）挤出一页；干净 `routeme-verify.db` 上 25/25 通过（§2.1 已复验） |
| `map.spec.ts` 9 条 | 探索页早已迁到栅格底图 + `AreaCascader`，用例仍找 `china-map` / `city-map` / `data-poi-id` |
| `ai-planner.spec.ts` A1 / A2 / A10 | 首次合并时用 `git show HEAD:` 的同名用例复跑，失败点与信息完全一致（日期预填、定位占位名、retry 渲染两份）；远端把 AI 规划改为单页对话流后用例整体重写，§2.2 复验 A1–A12 全绿 |
| 后端 3 条 profile 测试 | 并行会话未跟踪的 `V27__normalize_demo_user_profiles.sql` 与已提交测试口径冲突 |

## 6. 残余风险

1. **未定位名称的提交顺序：** 解析不到坐标的地名排在已定位点之后（`proposal.md` D6 记录的口径例外）；若同一次发布既有已定位点又有未定位名，用户看到的顺序与编辑器列表不一致，需后续需求决定是否改为阻断。
2. **地图点选依赖逆地理：** 离线 / 配额耗尽时逆地理退化为坐标占位名，此时必须人工命名（已双层拦截，但多一步操作）。
3. **组件层无单测：** 仓库无 jsdom / Testing Library，编辑器交互仅由 E2E 覆盖。
4. **本地 E2E 库污染：** 上述 4 条列表用例在干净库上 25/25 通过（§2.1 已复验）；本地反复跑 E2E 后仍会复现，需要时清库重跑。
5. **G2 未签署：** 独立验证人尚未指定，签署后本阶段才可推进到 P5。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0–P2 | `385afcf` | `docs(sdd): add refine-publish-route-map P0-P2 artifacts (REQ-027)` |
| P3 | `a90755b` | `docs(p3): add refine-publish-route-map design, ATDD and tasks (REQ-027)` |
| P4 实现 | `ceb4a47` | `feat(p4): refine-publish-route-map publish trips on the route editor` |
| P4 记录 | `41309f9` | `docs(p4): refine-publish-route-map record verification and screenshots` |
| 合并 1 | `4c1e8ea` | `merge: sync origin/main@a571563 (v3 redesign) into refine-publish-route-map` |
| 合并 1 适配 | `84c1346` | `test(e2e): align trip and planner specs with the merged v3 layout`（§2.1） |
| 合并 2 | `2209a99` | `merge: sync origin/main@aa320dc into main`（旅行金融 `V30` / 对话式 AI / Select 弹层修复） |
| 合并 3 | `eb6a998` | `Merge remote-tracking branch 'origin/main'`（并入 `2bf9148` 我申请按行程去重） |
| 合并 2 适配 | 本条提交 | `test(e2e): fix the companions select case after dropping the travel-mode select`（§2.2） |

## 8. 下一阶段

- P5（归档）**暂不执行**：需排在 `refine-trip-map` / `add-trip-publish` 之后，且 G2 签署完成。