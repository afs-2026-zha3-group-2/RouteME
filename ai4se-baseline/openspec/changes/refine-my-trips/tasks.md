# 任务：refine-my-trips

- **依据：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** Jay（AO）｜ **协助：** Neal（VL）在 P4 独立验证；WAYNE（IO）在 G2 前复核 Living Spec 收口
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6；T1 先写失败验收（red），再进入实现。T7 属 P5 / G3 前动作，不在 P4 执行。
- **契约：** `GET /api/me/trips` 新增只读 `pending_applications`；`OpenApiTest` 与 `MyTripsControllerTest` 是门禁；既有 `POST /api/applications/{id}/cancel`、`POST /api/trips/{id}/leave`、`POST /api/trips/{id}/complete` 不变。
- **视觉基准：** `docs/prototype/ui.js` `mine()`、`docs/prototype/styles.css` `.seg` / `.mine-row` / `.mr-*`；不改原型文件。

## 任务清单

### T1 [tests] 先补失败验收

- [ ] 新增 `RouteME/e2e/tests/mine.spec.ts`：M1 四段与计数、M2 提醒定位、M3 撤回、M4 退出、M5 写体验、M6 重新可见同步、M7 无待处理、M8 窄屏布局（见 `atdd-design.md` §4）。
- [ ] 更新 `RouteME/e2e/tests/companions.spec.ts:145-147` 与 `experiences.spec.ts` 两处：`getByRole('tab')` → `getByRole('radio')`。
- [ ] 新增 `RouteME/frontend/src/mine/mineTrips.test.ts`（U1–U4，先 red）。
- [ ] 新增 `RouteME/frontend/src/trips/coverTone.test.ts`（U5，先 red）。
- [ ] 运行 `npx playwright test tests/mine.spec.ts` 记录预期失败；运行 `npm test` 记录两个新单测 red。

**验证：** `cd RouteME/e2e; npx playwright test tests/mine.spec.ts`（需本地前后端）；`cd RouteME/frontend; npm test`
**覆盖：** E1–E9、M1–M8、U1–U5

### T2 [backend] 聚合响应新增按行程待处理数

- [ ] 新增 `RouteME/backend/src/main/java/routeme/response/PendingApplicationCount.java`（record `long tripId, int count`）。
- [ ] `MyTripsResponse` 增加 `List<PendingApplicationCount> pendingApplications`；同步构造点。
- [ ] `MyTripsServiceImpl.forUser()`：在一次 `published` 遍历中按 `applicationService.listForPublisher(trip.id(), userId)` 统计 pending；`pendingApplicationCount` 改为该列表求和。
- [ ] `MyTripsControllerTest` 增加 B1–B3 断言（数组内容、空数组、接受后减少）。
- [ ] `openapi.yaml`：`MyTrips` 增加 `pending_applications`（可选），新增 `PendingApplicationCount` schema；版本递增次版本；`OpenApiTest` 增加 B4 断言。
- [ ] `types.ts` 的 `MyTrips` 增加 `pending_applications: PendingApplicationCount[]`。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp test`；`cd RouteME/e2e; npx playwright test tests/companions.spec.ts`
**覆盖：** E2、E4、B1–B4、`@rule:api-contract`

### T3 [frontend] 纯逻辑与文案

- [ ] 新增 `RouteME/frontend/src/mine/mineTrips.ts`：`groupCounts`、`pendingCountFor`、`pendingTargetTripId`、`formatDateRange`、`dayLabel`、`actionsFor`；所有待处理函数对 `pending_applications` 缺失（旧后端）按空数组处理。
- [ ] 新增 `RouteME/frontend/src/trips/coverTone.ts`：从 `TripCard` 抽出 `COVER_TONES` 与 `coverTone(destination)`；`TripCard` 改为引用。
- [ ] `tripMessages.ts`：新增 §6 的键；删除仅本页使用的旧键（先 grep）。
- [ ] 让 U1–U5 转绿；`npm run typecheck`。

**验证：** `cd RouteME/frontend; npm test; npm run typecheck`
**覆盖：** E1–E8 的纯逻辑、U1–U5

### T4 [frontend] 页面重排

- [ ] `MyTripsPage.tsx`：`page-head`（标题 + 副标题 + 发布按钮）、`Segmented` 四段带计数、`.mine-list` / `.mine-row` 行式列表。
- [ ] 行内动作按 `actionsFor` 渲染；`applications` 显示「处理申请 · N」；`complete` 复用现有 Modal；`cancel` / `leave` 接通既有 API 并 `reload(true)`。
- [ ] 待处理摘要与「去处理」使用 `pendingTargetTripId`；无待处理时不渲染按钮。
- [ ] 保留资料卡与完成组分享入口（`.mine-row` 类名、按钮文案不变）。
- [ ] 分组空态用 `EmptyState` + 主 CTA。
- [ ] 失败映射：`TRIP_NOT_OPEN` / `APPLICATION_NOT_PENDING` → `message.info` + `reload(true)`；其它 → 顶部 Alert。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** E1–E5、E7、E8、M1–M5、M7

### T5 [frontend] 同步与样式

- [ ] `MyTripsPage.tsx`：`visibilitychange`（visible）+ `window focus` → `reload(true)`；`useRef` 记录 in-flight 去重；分组切换不请求。
- [ ] `styles.css`：`.mine-row` 三列网格、`.mr-cover` / `.mr-meta` / `.mr-note` / `.mr-actions`、`.mine-seg` 间距、`@media (max-width: 640px)` 换行。
- [ ] 只用既有令牌；不新增硬编码色值；`StatusBadge` 与 `.cover-*` 复用。

**验证：** `npm run build`；`npx playwright test tests/mine.spec.ts`
**覆盖：** E6、E9、M6、M8

### T6 [tests] 回归与人工走查

- [ ] `cd RouteME/frontend; npm test`、`npm run build` 全绿。
- [ ] `cd RouteME/backend; .\mvnw.cmd -B -ntp test` 全绿（含 `OpenApiTest`）。
- [ ] `cd RouteME/e2e; npx playwright test tests/mine.spec.ts tests/companions.spec.ts tests/experiences.spec.ts tests/profile.spec.ts` 全绿。
- [ ] `openspec validate refine-my-trips --strict` valid。
- [ ] 1440 / 768 / 390 × 浅 / 深 截图存 `docs/preview/refine-my-trips/`；检查无溢出、无重叠、动作同列对齐。
- [ ] `docs/ai4se-plugins/<timestamp>-local-verify-report.md` 记录命令、结果与偏差。

**验证：** 上述命令
**覆盖：** E10、E11、DoD、`@rule:web-testing` / `@rule:java-testing`

### T7 [docs] P5 归档前收口（不在 P4 执行）

- [ ] 用本 change 的 Delta 替换 `openspec/specs/trip-companions/spec.md` 的「我的旅行聚合与最低安全能力」块；用 diff 确认 4 条基线场景与安全段落未变。
- [ ] 与 `refine-experience-share` 对齐完成组文案（「发表游后体验 / 修改我的体验」）。
- [ ] 更新 `docs/knowledge/interfaces/README.md` 的 `GET /me/trips` 行（新增 `pending_applications`）。
- [ ] 更新 `docs/sdd/README.md` 索引与 `requirement-workspace/registry.md` 状态。

**覆盖：** G3 / `@rule:sdd-artifacts`

## 对齐自检（vs Delta Spec）

| Delta Scenario | 任务 |
|---|---|
| 分区展示我的旅行 | T1 / T3 / T4 |
| 分组内容与计数一致 | T2 / T3 |
| 行内动作按分组提供 | T3 / T4 |
| 待处理申请提醒 | T2 / T4 |
| 无待处理申请 | T3 / T4 |
| 重新可见时同步状态 | T5 |
| 页内动作后同步状态 | T4 / T5 |
| 分组空态给出主操作 | T4 |
| 窄屏动作不遮挡 | T5 |
| 安全提示常驻 | T6（回归） |
| 提交举报并收到回执 | T6（回归） |

- 无静默扩张：任务只覆盖 Delta 场景；编辑 / 删除 / 参考发布 / 分页 / 轮询不在任务中。
- 无遗漏场景：11 条场景全部有任务落点。