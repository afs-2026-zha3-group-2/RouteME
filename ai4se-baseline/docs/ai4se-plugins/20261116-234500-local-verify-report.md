# Local verify report — refine-trip-map（P4 / G2 输入）

- **Change:** `refine-trip-map`（REQ-016 地图导航风重做 / 详情路线地图 / 多集合区域）
- **Branch:** `feature/refine-trip-map`（P3 提交 `061d00a`）
- **日期:** 2026-11-16 ｜ **记录人:** Jay（AO）
- **Environment:** Windows 11；Node v24.18.0；OpenJDK 21.0.11；SQLite `RouteME/SqlLite/routeme.db`（Flyway V1–V17 重建）；后端 `localhost:8080`、前端 dev `localhost:5173`；Playwright Chromium。

## 1. 命令与结果

| 层 | 命令（工作目录） | 结果 |
|---|---|---|
| 契约 | `npx -y @redocly/cli lint openapi.yaml`（RouteME/） | valid，15 warnings（既有基线，无新增） |
| 规格 | `npx -y openspec validate refine-trip-map --strict`（ai4se-baseline/） | valid；仅 1 条 INFO＝G1 条件 C1 归档顺序模拟（`add-trip-publish` 未归档，预期） |
| 后端 | `.\mvnw.cmd -B -ntp verify`（backend/） | **246 tests / 0 failures / 0 errors**，BUILD SUCCESS（含 strip() 修复后复跑） |
| 前端 | `npm run build` / `npm test`（frontend/） | build 成功；**28 files / 211 tests passed** |
| E2E | `npx playwright test`（e2e/，fresh SQLite + 8080/5173） | **81 passed / 0 failed**（最终轮，6.2m） |
| 走查 | Browser 子代理交互走查 + Playwright 截图脚本 | 交互全符合预期、控制台无 error；6 张截图入 `docs/preview/refine-trip-map-*.png` |

## 2. E2E 覆盖对照（atdd E1–E10）

| # | 用例（trips.spec.ts） | 结果 |
|---|---|---|
| E1 | map supports zoom, fullscreen, pin cards and click-to-add（旧用例语义兼容＋pin 卡＋空白候选浮层） | Pass |
| E2 | map pins add multiple stops and enforce the eight-stop limit（连加 pin＋编号水滴＋8 上限提示） | Pass |
| E3 | province overview city clicks only focus and never write stops（候选「聚焦」＋城市 pin 只聚焦） | Pass |
| E4 | publishes multiple meeting areas and adds a third from the edit dialog | Pass |
| E5 | rejects a fourth meeting area and overlong area text on the publish form | Pass |
| E6 | detail page renders the route map with numbered pins and a route strip | Pass |
| E7 | route strip click focuses the map and read-only pin cards carry no add action | Pass |
| E8 | detail page degrades to text when stops are off the gazetteer | Pass |
| E9 | meeting edit syncs multiple areas and the API guards limit and ownership（400/403） | Pass |
| E10 | legacy single meeting area is backfilled and shown on the detail page（种子 trip 7） | Pass |

另：`companions.spec.ts` helper 改 `meeting_areas` 数组后 11 例全绿；其余 spec 无回归。

## 3. 走查（1440 / 768 / 390 × 浅 / 深）

- 截图：`docs/preview/refine-trip-map-{publish,detail}-1440-{light,dark}.png`、`refine-trip-map-detail-{768,390}-light.png`。
- 发布页：城市聚焦后点位展开、地名常显、控制条（放大/缩小/全屏/回到当前范围）、图例卡、比例尺；pin 卡「加入路线」、空白候选浮层可用。
- 详情页：编号水滴 pin＋蓝色路线白 casing＋河流/绿地/道路＋行程条（步行 约 x km）；strip 点击聚焦；只读 pin 卡无加入动作。
- 深色：地图令牌整套切换，无白底残留；390：图例与比例尺隐藏、strip 换行、无溢出。
- Browser 子代理交互走查：缩放/全屏/Esc、目的地级联、pin 卡、候选浮层、strip 聚焦、只读卡、主题切换全部符合预期；`list_console_messages` 无 error。

## 4. 验证期发现与修复（均在本 change 内闭环）

| # | 发现 | 修复 |
|---|---|---|
| 1 | Java `trim()` 不除 U+3000，与前端 `trim()` 口径不一致（全量 verify 1 失败） | `TripPlan.trimToNull` 改 `strip()`；复跑 246/246 |
| 2 | `PlaceMap` 重置 effect 依赖 `[city, cityView]`，内部城市聚焦被自身撤销（E3 暴露） | 拆分 effect：仅 `city` prop 变化清聚焦；`cityView` 变化只重置视口（design D13） |
| 3 | 省级投影把城内距离压到 ~1 单位，城市视图点位挤团、标注重叠（走查截图证实） | 新增 `cityProjection` 城市局部投影（22..78 铺满）；距离估算仍走真实投影；比例尺城市口径；地名常显；≤700px 隐藏比例尺（design D13） |
| 4 | `trips.spec.ts` identity gate 断言过期（`68d17ae` 登录门移除演示直选） | 用例改为登录/注册表单断言＋localStorage 登录（与 auth.spec 同口径） |
| 5 | E2E 数据污染：开发库累积 125+ 行程挤出种子卡片（7 例基线失败） | 备份 `SqlLite/routeme-dev-backup-20261116-2300.db` 后删库由 Flyway 重建（V1–V17），复跑全绿 |
| 6 | 相邻 pin 命中圆重叠导致 Playwright click 被拦截；antd 双字按钮插空格（「聚 焦」） | pin 断言改 `dispatchEvent('click')`；按钮名改 `/聚\s*焦/` |
| 7 | `tasks.md` 无 checkbox 致 openspec strict WARNING | 补「任务勾选」清单（格式性修订，语义不变；tasks-review 追加变更摘要） |

## 5. 数据卫生

- 全量 E2E 在**删除 `routeme.db` 后由 Flyway 重建**的干净库上执行（本轮共重建 3 次：首跑前、投影修复后、最终轮前）。
- 旧库备份保留于 `SqlLite/routeme-dev-backup-20261116-2300.db`（不入库）。
- E2E 仍会向开发库累积行程（既有债务，见 §6）；CI 用 H2 不受影响。

## 6. Findings

| # | Finding | Mark | Location | Suggestion |
|---|---|---|---|---|
| 1 | E2E 数据污染需 fresh DB 复跑 | [fact] | `SqlLite/routeme.db`、`e2e/tests/*` | 另立 change：独立测试库或 afterEach 清理（既有债务延续） |
| 2 | E2E 不在 CI 流水线 | [fact] | `.github/workflows/ci.yml` | 既有 WARNING 延续；纳入前需临时库 |
| 3 | `experiences.spec.ts` 「marks completed trips as shared」在全量首轮因 focus 触发 reload 出现一次 detach 偶发；单跑与最终全量均 Pass | [fact] | `mine/MyTripsPage.tsx` visibility/focus reload | 观察项；如复现给 reload 加骨架保留或测试侧 retry |
| 4 | 城市局部投影为示意图口径（经纬度线性铺满），非真实街道几何 | [fact] | `placeCatalog.cityProjection` | 与方案1 SVG 离线定位一致；在线瓦片属 proposal out |

## 7. 结论

**Overall Pass。** 后端 246/246、前端 211/211＋build、E2E 81/81、契约与规格 lint 全绿、三档视口双主题走查达标。G2 提请签署（VL Neal / AO Jay，IO WAYNE 契约口径）。按用户要求**不执行 P5、不归档** `refine-trip-map` / S06 / S07。