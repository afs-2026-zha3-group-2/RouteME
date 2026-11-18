# Consistency lint — refine-publish-route-map

- **Change:** `refine-publish-route-map`
- **Phase:** `p2`
- **Focus:** `openspec/changes/refine-publish-route-map/`（proposal + Delta + `dov-ac-review.md`）↔ Living Spec `trip-plans` / `design-system` ↔ `requirement-workspace`（REQ-027 / S28 / intent）
- **Timestamp:** 2026-11-18
- **Artifact level:** 2（`proposal.md` + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec validate refine-publish-route-map --strict` → valid；`openspec show --json --deltas-only` → `deltaCount: 1` / `MODIFIED`；基线保留脚本 `preserved 7/7 missing []`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 7 / N/A 4

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | Delta「切换出行方式重算路线」↔ `WaypointPanel` 的 `onModeChange` | 面板与 `planRoute` 使用的 `TravelMode` 含 `walking`，发布侧 `TripTravelMode` 只含三档；直接复用会把 `walking` 分支带进发布页 | P3 `design.md` 明确共享件对模式的泛型 / 映射方案；发布页不得出现 `walking` 选项或分支 | `frontend/src/map/amap/AmapService.ts`（`TravelMode`）、`frontend/src/trips/tripOptions.ts`（`TRIP_TRAVEL_MODES`） | `[fact]` | code |
| L-02 | SUGGESTION | p2 | Delta「切换出行方式重算路线」↔ `MODE_LABELS` | 标签表是共享常量且 `driving` 写作「驾车」；若 P3 直接改常量，探索页会同步变成「自驾」，与 AC-7 的探索页断言冲突 | P3 不改 `MODE_LABELS` 的既有值，改为注入发布侧标签（`TRIP_TRAVEL_MODE_LABELS`）；P4 分别断言两端文案 | `frontend/src/map/amap/WaypointPanel.tsx`、`frontend/src/map/amap/ItineraryPanel.tsx`、`frontend/src/trips/tripOptions.ts` | `[fact]` | code |
| L-03 | SUGGESTION | p2 | 提案 D8 ↔ `e2e/tests/trips.spec.ts` / `e2e/tests/map.spec.ts` | 失效的 `china-map` / `city-map` 断言不止发布用例：`map.spec.ts` 也大量依赖；本 change 只重写 `trips.spec.ts`，需避免顺手扩面 | P4 只改 `trips.spec.ts` 与新增面板断言；`map.spec.ts` 的同类选择器记为既有债务，入口移除若直接导致其失败只做最小修正 | `e2e/tests/trips.spec.ts`、`e2e/tests/map.spec.ts` | `[fact]` | code |
| L-04 | SUGGESTION | p2 | 提案影响面「`TripCreatePage` 第 2 段替换」 | 第 2 段内还有第二个 `AmapPlacePicker`（集合地点，`mode="single"`）；替换途经点时误删会丢掉集合地点录入 | P3 / P4 保留集合地点选择器与其 `cityForSearch`，替换范围仅限途经点字段 | `frontend/src/trips/TripCreatePage.tsx`（`fieldStops` 与集合地点两处 `AmapPlacePicker`） | `[fact]` | code |
| L-05 | SUGGESTION | p2 | Delta「坐标占位名不得进入发布」 | 占位名格式为 `地图选点 {lng.toFixed(5)}, {lat.toFixed(5)}`；精确字符串匹配会漏掉不同小数位或用户自选同名地点 | P3 定义可判定的校验（前缀 + 坐标模式），P4 单测同时覆盖「占位名被拒」与「真实地名不被误伤」 | `frontend/src/map/amap/placePick.ts`（`pointFallbackName`）、`frontend/src/map/amap/placePick.test.ts` | `[inference]` | spec |
| L-06 | SUGGESTION | p2 | Delta「公共交通使用目的地城市规划」 | 发布页只有 `destinationCode`；需明确城市名的来源，避免 P4 临时拼接或误用离线地名库（后者只覆盖少数城市） | P3 复用 `cityForSearch`（`cityLabel(destinationCode)` 去「市」后缀）作为 `planRoute` 的 `city` 实参 | `frontend/src/trips/TripCreatePage.tsx`（`cityForSearch`）、`frontend/src/map/amap/AmapService.ts`（`planRoute` 第三参） | `[fact]` | code |
| L-07 | SUGGESTION | p2 | Delta「在地图上添加途经点并看到路线」 | 生成按钮文案随状态切换（首次「生成旅行路线」／之后「重新生成旅行路线」）；E2E 若硬编码单一文案，会在第二次点击时失败 | P4 优先用 `data-testid="amap-route-generate"` 定位，文案断言只覆盖当前状态 | `frontend/src/map/amap/WaypointPanel.tsx`（`amap-route-generate`） | `[fact]` | code |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 发布页路线段只有地名多选、探索页能力放错位置、同一能力实现两次；非空且指向具体缺口 |
| P2 `## What Changes` | Pass | D1–D9 + 影响面 11 行，in scope 与 out of scope 分列 |
| P3 Non-Goals | Pass | 「不做的事」7 条，覆盖契约 / 迁移 / 详情页 / 持久化 / 匹配面板 / AI 页 / 探索页债务 |
| P4 Impact self / upstream / downstream | Pass | 自身（`TripCreatePage` / 面板 / `AppShell` / `tripMessages`）、上游（`AmapService` / `placePick` / `RouteLayer`）、下游（E2E / `docs/sdd` / 评审） |
| S1 Spec structure | Pass | `## MODIFIED Requirements` + `### Requirement` + `#### Scenario`；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | Pass | 提案 `@rule:` 均指向存在锚点；Delta 无 `@knowledge:` / `@rule:` |
| S3 Requirement → proposal What Changes | Pass | 唯一 Requirement 对应提案 `trip-plans` MODIFIED 与 D1–D9 |
| S4 Given / When / Then | Pass | 18/18 Scenario 三要素齐备；基线 7 条保持原文 |
| S5 Scenario 归属 | Pass | 每个 Scenario 都在唯一 Requirement 之内 |
| C1 proposal → spec | Pass | In scope 全部有落点（AC-7 按 D7 由 E2E 覆盖，理由已写入提案）；Out of scope 无对应 Requirement |
| C2 spec → tasks | N/A | 无 `tasks.md`（P3） |
| C6 引用可达 | Pass | 新增工件相对链接检查 `broken 0` |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 scope | Pass | 提案与 Delta 范围一致；无静默扩 / 缩 |
| p2-2 internal consistency | Pass | 三档模式、8 点上限、按钮触发时机、降级口径、提交字段在正文与场景中一致 |
| p2-3 proposal scenarios / constraints in Delta | Pass | S28-1 ~ S28-11 全部有落点；AC-7 例外已记录 |
| p2-4 tasks direction | N/A | 无 `tasks.md` |
| p2-5 traceability | Pass | 11/11 映射见 `dov-ac-review.md`；基线 7/7 保留 |

## P2 Delta 收敛

- 头部补「MODIFIED = 在既有数量与顺序约束上追加…；7 个基线场景原文保留」，满足 `spec-first` 对「旧行为与新行为差异」的可读要求。
- 模式段由 prop 级表述（`modes` / `modeLabels`）改写为两端可观察口径（发布页三档 / 探索页三档 / 互不串味）；约束语义不变，prop 形状移交 P3。
- 场景数与基线保留不变：18 = 7 基线 + 11 新增；`validate --strict` 复跑 valid。

## Living Spec 基线保留

- `trip-plans`「发布可被他人理解的旅行计划」基线 7 场景：**7 条原样保留、0 修改**。
- Requirement 正文第 1 段逐字保留，新增 3 段为纯追加；无删除、无改写。
- `design-system`「应用外壳与导航」不写 Delta：该条未列举「旅行地图」，移除入口不改变其可判定行为。

## N/A / skipped

- `tasks.md` 相关（T1–T3、C2、p2-4）：P3 产出。
- `design.md` 相关（D1–D3）：P3 产出。
- `all-specs-review`：P3 全链完成后执行；本 lint 不替代它。

## 修复建议（按优先级）

1. **无 BLOCKER。**
2. **无 WARNING。**
3. SUGGESTION：L-01 / L-02 / L-04 / L-06 带入 P3 `design.md`；L-03 / L-05 / L-07 带入 P4 `tasks.md` 与验证报告。

## Residual risks

- 共享件边界若划在页面层，会出现第三套路线逻辑；`MapExplorerPage` 的规划 `useEffect` 以 `routeRequested` 为闸门，搬移时若丢失该状态，会在未生成时对 1 个点发请求。
- `MODE_LABELS` 是跨页面共享常量，任何「就地改值」都会同时改变探索页文案，属最容易被忽视的回归点。
- 发布页与探索页共用 `data-testid`；若两页在同一 E2E 会话中先后渲染，选择器需限定容器，避免命中上一个页面的残留节点。
- `trips.spec.ts` 重写与并行会话的 `profile.spec.ts` / `tripMessages.ts` 改动落在同一测试批次；P4 需先合并 `origin/main`。

## Reviewer metadata

- Reviewer: AI agent（P2 consistency lint）
- Human sign-off: 待 G1（IO / SA）
- Date: 2026-11-18

## Next

- `openspec/changes/refine-publish-route-map/g1-decision.md`（IO + SA 具名签署）。
- 本报告不是 Gate 结论，不替代 G1。