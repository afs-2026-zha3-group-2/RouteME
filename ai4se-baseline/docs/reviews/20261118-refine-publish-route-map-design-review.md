# Artifact review — refine-publish-route-map / design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`design.md`](../../openspec/changes/refine-publish-route-map/design.md)
- **Supporting inputs:**
  - [`specs/trip-plans/spec.md`](../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 18 Scenario）
  - [`atdd-design.md`](../../openspec/changes/refine-publish-route-map/atdd-design.md)（场景分层 + Red 顺序 + fixtures）
  - [`tasks.md`](../../openspec/changes/refine-publish-route-map/tasks.md)（同批产出，单独报告）
  - [`g1-decision.md`](../../openspec/changes/refine-publish-route-map/g1-decision.md)（G1 Pass；follow-up：共享件边界、模式泛型、占位名校验、测试重写范围）
  - [`consistency-lint.md`](../../openspec/changes/refine-publish-route-map/consistency-lint.md)（L-01 / L-02 / L-04 / L-05 / L-06 带入 P3）
- **Evidence:**
  - `openspec validate refine-publish-route-map --strict` → `Change 'refine-publish-route-map' is valid`
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#tdd-cycle`；`rules/testing/rules.md#web-testing`；`rules/quality/rules.md#web-coding-style`；`rules/documentation/rules.md#sdd-artifacts`
  - 现状核实：`MapExplorerPage.tsx` 156–199 行的规划 `useEffect` 与 `routeRequested` 闸门；`WaypointPanel.tsx` 的 `MODE_LABELS` 与写死三档；`ItineraryPanel.tsx` 的 `MODE_LABELS` 依赖；`placePick.ts#pointFallbackName`；`AmapService.ts#planRoute(mode, waypoints, city?)`、`#straightLineRoute`、`#amapErrorMessage`（含后端 / 端口 / 代理字样）；`tripForm.ts#validateTripForm`；`AppShell.tsx` 的 `NAV_ITEMS` / `NAV_GROUPS` / `activeKey` / `NavIcon`；`styles.css#.amap-container`（`clamp(440px, 68vh, 720px)`）
  - 测试基线核实：`frontend/vite.config.ts` 的 `test.environment=node`、只收 `src/**/*.test.ts`，无 Testing Library / jsdom；`e2e/tests/ai-planner.spec.ts#installAmapStub` 提供 `window.AMap` 替身与 `__amapRouteCalls` / `__amapStubConfig` / `__amapClick`
  - 实现未开始：本报告不跑前端 / E2E 用例，测试证据由 P4 给出

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| DG-1 | SUGGESTION | `rules/process/rules.md#spec-first` | `design.md` D5 | 未定位名称提交时排在已定位点之后，与 Delta「按当前顺序排列的途经点名称」的字面口径有张力 | 保留该取舍（不伪造坐标、不静默删数据），但 P4 必须断言 `.publish-route-unresolved` 的说明文案「未定位的地点按名称保留，排在已定位地点之后」，让顺序变化对用户可见 | [inference] |
| DG-2 | SUGGESTION | `rules/testing/rules.md#web-testing` | `design.md` D10 | 抽出 `amapStub` 会改动一个当前全绿的 700 行 spec，若初始化顺序变化可能引入新不稳定 | 按 D10 执行并先单独跑 `ai-planner.spec.ts` 对比用例数与结果；若不稳，退回「发布 spec 内保留局部替身 + 记测试债务」，不阻塞本 change | [inference] |
| DG-3 | SUGGESTION | `rules/quality/rules.md#web-coding-style` | `design.md` D6；`useRoutePlan.ts` | `messages` 用 ref 持有并刻意不进依赖数组，会触发 `react-hooks/exhaustive-deps` 警告 | 在 effect 上方加一行注释说明「文案对象每帧新建，故以 ref 读取，避免重复规划」，与 `AmapPlacePicker` 既有 `eslint-disable-next-line` 的处理方式一致 | [fact] |
| DG-4 | SUGGESTION | `rules/quality/rules.md#web-coding-style` | `design.md` D5 | 预填解析按名称逐个请求，同名地点会重复请求；反复进入 `?ai=` 也会重算 | 不引入跨页面缓存（超范围）；在同一批解析内按名称去重，并对同一 `stops` 键只解析一次（D4 的 ref 已覆盖） | [inference] |
| DG-5 | SUGGESTION | `rules/testing/rules.md#web-testing` | `design.md` D8 | 删除 `NavKey` 的 `map` 后，`#/map` 页面 `activeKey` 返回 `null`，导航无高亮 | 已作为例外记录；P4 只断言「导航不含旅行地图 + 深链可用」，不断言高亮状态 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 只抽 `useRoutePlan` 一条共享逻辑，不搬探索页整块编辑器；单 capability `trip-plans` MODIFIED；零后端 / 契约 / 迁移 |
| B Quality | Pass | 面板参数化保持默认值，`MODE_LABELS` 零改动；发布页新文件落在 `frontend/src/trips` 与 `map/amap` 既有组织；样式只追加末段、只用令牌 |
| C Testing | Pass（组件层例外已记录） | 四组纯逻辑单测 + 新 E2E spec + `trips.spec.ts` 重写；组件层缺口有书面理由与残余风险 |
| D Security | Pass | 无新增权限、无新接口；占位名拦截只影响发布侧校验，不改探索页临时坐标名 |
| E Process | Pass | 设计在 ATDD 之后产出；P2 的五条 SUGGESTION（L-01 / L-02 / L-04 / L-05 / L-06）逐条落定 |
| F Documentation | Pass | 正文中文、标识符英文；引用选择器 / 符号而非行号；链接均为相对路径 |
| G Traceability | Pass | 18 条场景在设计自检表逐条映射到任务与 ATDD；导航约束（AC-7）单列，不伪装成 Delta 场景 |

## P2 follow-up 落实核对

| P2 编号 | 内容 | P3 落点 |
|---|---|---|
| L-01 | `TravelMode` 含 `walking` vs `TripTravelMode` 三档 | D3：`isTripTravelMode` 守卫，不用泛型 |
| L-02 | `MODE_LABELS.driving` 不得就地改值 | D2：`modes` / `modeLabels` 注入，常量零改动 |
| L-04 | 不得误删集合地点的第二个 `AmapPlacePicker` | T8：明确保留该选择器与 `cityForSearch` |
| L-05 | 占位名校验用「前缀 + 坐标模式」 | D7：前缀锚定、不要求结尾，覆盖重复名追加坐标的变体 |
| L-06 | 公共交通城市复用 `cityForSearch` | D6：`useRoutePlan` 第三参传 `city`，仅 `transit` 使用 |

## Residual risks

- `styles.css` 为并行修改热点；P4 需在合并 `origin/main` 后抽查 `.publish-route-*` 是否仍存在。
- `tripMessages.ts` / `AppShell.tsx` 当前有并行会话未提交改动；实现时先合并并保留对方改动，新增键追加在末尾。
- 无组件测试层：编辑器渲染回归只能由 E2E 发现，失败定位成本略高。
- 替身抽取触碰 `ai-planner.spec.ts`；退路已写明。

## Next remediations (non-Gate)

- `/sdd:task-plan` 已同批产出 → 本报告与 tasks 报告一并签署后进入 P4。
- DG-1 的公开文案断言、DG-3 的注释由当前开发者在 P4 落实。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Jacky | 2026-11-18 | 发起人当次会话指示「commit and p3」，沿用「全部批准」授权（当前开发者 = Jacky） | 全文 |
| `design.md` | 2 / 2（非当前开发者且非 WAYNE） | Karena | 2026-11-18 | 同上；SA 取非当前开发者成员，避免开发者自签 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 同上 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Jacky | 2026-11-18 | 同上 | 结论与签署位 |