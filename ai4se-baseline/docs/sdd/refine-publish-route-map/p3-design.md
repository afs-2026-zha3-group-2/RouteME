# P3 — refine-publish-route-map（REQ-029 / S30 发布行程改用地图路线编辑器）

- **日期：** 2026-11-18 ｜ **记录人：** Jacky（当前开发者）｜ **阶段：** P3 Pass
- **Change：** `refine-publish-route-map`
- **工件：** [`atdd-design.md`](../../../openspec/changes/refine-publish-route-map/atdd-design.md)、[`design.md`](../../../openspec/changes/refine-publish-route-map/design.md)、[`tasks.md`](../../../openspec/changes/refine-publish-route-map/tasks.md)
- **基点：** `main@385afcf`（P0–P2 已入库）

## 1. 输入

| 输入 | 路径 | 结论 |
|---|---|---|
| Delta Spec | `openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md` | MODIFIED 1 Requirement / 18 Scenario（基线 7 + 新增 11） |
| G1 | `openspec/changes/refine-publish-route-map/g1-decision.md` | Pass（无条件）；IO=WAYNE / SA=Karena |
| P2 lint | `openspec/changes/refine-publish-route-map/consistency-lint.md` | Pass；L-01 / L-02 / L-04 / L-05 / L-06 由 P3 落定，L-03 / L-07 落 P4 |
| 测试规则 | `docs/knowledge/rules/testing/rules.md#web-testing` | 纯逻辑 Vitest + Playwright；组件层 Testing Library 在仓库不可用 |
| 现状核验 | `MapExplorerPage` 的规划 effect、`WaypointPanel` / `ItineraryPanel`、`placePick`、`planRoute`、`AppShell`、`styles.css` | 见 `design.md` 各决策的「现状」与 `atdd-design.md` 锚点 |

## 2. P3 落定的争议点

| 编号 | 争议 | 结论 |
|---|---|---|
| L-01 | `TravelMode`（含 `walking`）与 `TripTravelMode`（三档） | `isTripTravelMode` 守卫；共享件仍用 `TravelMode`，发布页回调处收窄；不用泛型 |
| L-02 | `MODE_LABELS.driving = 驾车` 会不会串味 | `modes` / `modeLabels` 可选注入，默认值保持现状；常量零改动 |
| L-04 | 第 2 段还有集合地点的 `AmapPlacePicker` | 只替换 `fieldStops`；集合地点选择器与 `cityForSearch` 保留（T8 明写） |
| L-05 | 占位名可判定形式 | 前缀锚定 `/^地图选点\s+-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?/`，不要求结尾；加入时命名弹窗 + 提交校验双层 |
| L-06 | 公共交通的城市名来源 | 复用 `cityForSearch`（`cityLabel(code)` 去「市」），经 `useRoutePlan` 第三参传入，仅 `transit` 使用 |
| D-新 | 共享边界划在哪 | 只抽 `useRoutePlan`（规划 / 降级 / 城市 / 文案）；不搬探索页整块编辑器 |
| D-新 | 未定位预填点怎么处理 | 可见列表（重新定位 / 移除），按名称保留并排在已定位点之后；不伪造坐标、不静默删除 |
| D-新 | 要不要先做原型 | 不做。用户口径「复用探索页现有面板」，探索页就是视觉基线 |

## 3. 产出

| 工件 | 摘要 |
|---|---|
| [`atdd-design.md`](../../../openspec/changes/refine-publish-route-map/atdd-design.md) | 18 场景分层表；Red A/B/C；锚点清单；AMap 替身与 fixtures；Non-goals 反向验证；NFR 不纳入 |
| [`design.md`](../../../openspec/changes/refine-publish-route-map/design.md) | D1–D11：共享边界、面板参数化、类型守卫、状态归属、预填与未定位、规划 hook 与文案注入、占位名双层、导航移除、布局主题、测试分层、原型取舍；文件清单与 18 行对齐自检 |
| [`tasks.md`](../../../openspec/changes/refine-publish-route-map/tasks.md) | T1–T14：纯逻辑 4 条 → 共享件 2 条 → 发布页 4 条 → 测试 2 条 → 验证 / 文档 2 条；每条含落点与验证命令 |
| 设计与任务评审 | [`design-review`](../../reviews/20261118-refine-publish-route-map-design-review.md)（Pass；0 / 0 / 5）、[`tasks-review`](../../reviews/20261118-refine-publish-route-map-tasks-review.md)（Pass；0 / 0 / 6） |
| 全量评审 | [`all-specs-review`](../../reviews/20261118-refine-publish-route-map-all-specs-review.md)（Pass；0 / 0 / 5） |

## 4. 关键设计决策（摘要）

- **一条共享逻辑（D1 / D6）。** `useRoutePlan` 接管「按钮闸门 + 自动重算 + 直线降级 + 城市 + 文案注入」；探索页只删重复状态与 3 个 effect，其余不动。
- **面板参数化（D2）。** `WaypointPanel` 新增 `modes` / `modeLabels` / `emptyHint` / `modeAriaLabel`，`ItineraryPanel` 新增 `modeLabels`；默认值即现状。
- **坐标只活在编辑期（D4）。** 父级 `stops: string[]` 是名称权威，编辑器 `RouteWaypoint[]` 是坐标权威，每次变更用 `projectStops` 投影；草稿与契约不变。
- **降级文案分端（D6）。** 发布页不使用 `amapErrorMessage` 的开发者口径；探索页保留逐字原文案。
- **占位名双保险（D7）。** 地图点选逆地理失败 → 命名弹窗；提交时 `validateTripForm` 兜底拒绝。
- **导航只删条目（D8）。** 页面、路由与三级深链保留；`design-system` 不写 Delta。
- **不做新原型（D11）。** P4 只补 390 / 768 / 1440 × light / dark 走查截图。

## 5. 对齐自检（vs Delta Spec）

| Delta Scenario | 设计 | 任务 | ATDD |
|---|---|---|---|
| 在地图上添加途经点并看到路线 | D1 / D2 / D4 | T5 T6 T7 T11 T12 | #8 |
| 途经点顺序可调整 | D4 | T7 T12 | #9 |
| 途经点超过上限时被拦截 | D4 | T7 T12 | #17 |
| 切换出行方式重算路线 | D2 / D3 / D6 | T2 T5 T6 T7 T12 | #10 |
| 公共交通使用目的地城市规划 | D3 / D6 | T5 T7 T11 T12 | #11 |
| 路线服务不可用时按顺序直线示意 | D6 | T5 T7 T12 | #12 |
| 降级提示不暴露实现细节 | D6 | T5 T7 T8 T12 | #13 |
| 发布只提交地名与出行方式 | D4 | T3 T7 T12 | #14 |
| 坐标占位名不得进入发布 | D7 | T1 T4 T7 T12 | #15 |
| AI 预填路线进入编辑器后可编辑 | D5 | T7 T8 T12 | #16 |
| 窄屏与双主题不溢出 | D9 | T7 T10 T12 T14 | #18 |
| 基线 7 场景 | 基线不变 | T8 T12 T13 | #1–#7 |

- **无静默扩张：** 任务不含后端、契约、迁移、详情页重算、匹配面板、AI 页、探索页缺陷修复。
- **无遗漏场景：** 18/18 场景在设计、任务与 ATDD 中均有落点；导航约束（AC-7）单列，不补写 Delta。

## 6. 测试与验证计划

| 层 | 命令 | 判据 |
|---|---|---|
| 纯逻辑 | `cd RouteME/frontend; npx vitest run src/map/amap/placePick.test.ts src/trips/tripOptions.test.ts src/trips/publishRoute.test.ts src/trips/tripForm.test.ts` | 全绿 |
| 类型 / 构建 | `npm run typecheck`、`npm run build` | 0 错误 |
| 前端全量单测 | `npm test` | 全绿 |
| E2E 新增 | `cd ../e2e; npx playwright test tests/publish-route-map.spec.ts` | #8–#18 + 导航 / 深链全绿 |
| E2E 回归 | `npx playwright test tests/trips.spec.ts tests/map.spec.ts tests/ai-planner.spec.ts` | 无新增失败；探索页模式行仍为 步行 / 驾车 / 骑行 |
| 后端未误伤 | `backend/mvnw.cmd -B -o clean test` | 全绿（零后端改动） |
| 反向复核 | `git diff --name-only origin/main...HEAD` | 不含 `backend/**`、`openapi.yaml`、`db/migration/**` |
| 走查 | 390 / 768 / 1440 × light / dark | 无横向溢出；截图落 `docs/preview/refine-publish-route-map/` |

## 7. 残余风险

- `styles.css`、`tripMessages.ts`、`AppShell.tsx` 均有并行会话改动；P4 先合并 `origin/main`，新增键 / 规则追加在末尾。
- 组件层无单测（仓库无 jsdom / Testing Library），渲染回归依赖 E2E。
- 替身抽取触碰当前全绿的 `ai-planner.spec.ts`；退路为局部替身 + 记测试债务（`design.md` D10）。
- 未定位名称提交时排在已定位点之后（`design.md` D5 例外）；P4 断言公开文案使其可见。
- `map.spec.ts` 的 `china-map` / `city-map` 断言属既有债务，本 change 不做全量重写。

## 8. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| 设计 / 任务第一签署（当前开发者） | Jacky | `design.md`、`tasks.md` 全文 | 2026-11-18 |
| 设计 / 任务第二签署（非当前开发者且非 WAYNE） | Karena | `design.md`、`tasks.md` 全文 | 2026-11-18 |
| 报告签署（WAYNE） | WAYNE（IO） | design / tasks / all-specs 三份报告结论 | 2026-11-18 |
| 报告签署（当前开发者） | Jacky | 同上 | 2026-11-18 |

批准来源：发起人当次会话指示「commit and p3」，沿用「全部批准」授权。批准范围：P3 三份工件与三份评审报告；不替代 G1（已 Pass）与后续 G2。

## 9. 下一阶段

- P4：按 `tasks.md` 依赖顺序执行（T1 起，先红后绿）。
- P4 收口：T13 回归 + `docs/ai4se-plugins/<ts>-local-verify-report.md`；T14 截图与阶段记录。
- P4 需回应的评审项：DG-1 / DG-3（design）、TK-2 / TK-3 / TK-4（tasks）、AS-1 / AS-3 / AS-4 / AS-5（all-specs）。