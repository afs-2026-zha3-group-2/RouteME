# 任务清单 — add-trip-completion（REQ-011 / S15）

- **Change：** `add-trip-completion`
- **输入：** Delta Spec、`atdd-design.md`、`design.md`（D1–D13）
- **约定：** 每层一条；先 Red 后 Green；最后一条必须是回归验证
- **Owner：** AO（Jay）

## 任务

- [ ] **T1 后端 Red：四态与结束用例**
  - Owner：AO（Jay）｜ 覆盖：E1–E4、E7–E9、E11、E13、E14
  - 新增 `FixedClockTestConfig`（`2026-11-16T09:00:00Z`，Asia/Shanghai）。
  - 新增 `TripPlanStatusTest`：四态优先级、开始日期 00:00、结束日期 23:59 / 次日 00:00、满员旅行中。
  - 新增 `TripCompletionApiTest`：结束权限、非 ongoing 409、批量取消、自动完成物化、页面停留过期、满员仅拒绝。
  - 验证：`cd RouteME/backend; ./mvnw -q -Dtest=TripPlanStatusTest,TripCompletionApiTest test`（预期失败）

- [ ] **T2 领域四态**
  - Owner：AO（Jay）｜ 覆盖：E1–E3
  - `TripStatusEnum` 增加 `ONGOING`；新增 `TripTimeZoneConstant`（Asia/Shanghai）。
  - `TripPlan` 增加 `status(Instant now)`、`endingSoon(Instant now)`、`plannedStart()`、`plannedEnd()`；`status()` 保留委托。
  - 验证：`./mvnw -q -Dtest=TripPlanStatusTest test`

- [ ] **T3 懒写入物化与结束善后**
  - Owner：AO（Jay）｜ 覆盖：E3、E5、E8、E14
  - `TripPlanMapper` 增加 `selectExpiredIds(today)` 与条件更新 `completeIfAbsent(id, completedAt, now)`。
  - `TripPlanService` 增加 `materializeIfExpired`、`materializeExpired`、`requireCurrent`；`complete` 改为仅 ONGOING，发布 `TripCompletedEvent`。
  - 新增事件类与 `ApplicationServiceImpl` 监听器 `cancelPendingOnTripCompleted`；`ApplicationService.cancelPending`。
  - 验证：`./mvnw -q -Dtest=TripCompletionApiTest test`（E3/E5/E8/E14 绿）

- [ ] **T4 申请与处理资格**
  - Owner：AO（Jay）｜ 覆盖：E7、E11、E14
  - `apply`：要求 `RECRUITING` 或 `ONGOING` 且未满员；`decide`：接受要求未结束未满员，拒绝要求未结束。
  - `addCompanion`：改为“未结束且未满员”；`removeCompanion` 保持拒绝 COMPLETED。
  - 更新 `ApplicationServiceTest`：ONGOING 可申请、满员仅拒绝、结束后拒绝、过期申请 409。
  - 验证：`./mvnw -q -Dtest=ApplicationServiceTest,ApplicationServicePersistenceTest,TripCompletionApiTest test`

- [ ] **T5 列表、聚合与统计口径**
  - Owner：AO（Jay）｜ 覆盖：E13
  - `TripPlanMapper.xml` 的 `openTripFilter` 增加 `end_date >= #{today}`；`selectOpenPage/selectOpenList` 传 `today`。
  - `searchPage/findOpen/latestOpenByPublisher` 查询前物化并按 `today` 过滤。
  - `MyTripsServiceImpl`、`UserProfileStatsServiceImpl` 注入 `Clock`，按 `status(now)` 分组/计数。
  - 验证：`./mvnw -q -Dtest=MyTripsControllerTest,UserProfileControllerTest,TripPlanServicePersistenceTest test`

- [ ] **T6 契约 0.9.0 与响应字段**
  - Owner：AO（Jay）｜ 覆盖：E12、E15
  - `openapi.yaml`：版本 0.9.0；`status` enum 加 `ongoing`；`TripSummary` / `TripDetail` 加 `ending_soon`；complete 描述收紧。
  - `TripSummaryResponse` / `TripDetailResponse` 增加 `endingSoon`，`from(...)` 增加 `Instant now`；7 处调用点补 `clock.instant()`。
  - `OpenApiTest` 更新版本、枚举与字段断言；`redocly lint` 通过。
  - 验证：`./mvnw -q -Dtest=OpenApiTest test; npx @redocly/cli lint openapi.yaml`

- [ ] **T7 前端状态与详情**
  - Owner：AO（Jay）｜ 覆盖：E5、E6、E9、E12、E14
  - `types.ts` 的 `TripStatus` 加 `'ongoing'`，`TripSummary/TripDetail` 加 `ending_soon`；`tripStatus.ts` / `StatusBadge.tsx` 新增「旅行中」。
  - `tripMessages.ts`：`detailCompleteTrip: '结束行程'`、`detailEndingSoon`、`detailCompleteHint`、`chatReadOnly` 对齐「该行程已结束」。
  - `TripDetailPage.tsx`：结束按钮仅 `isPublisher && ongoing`；二次确认文案；失败 409/403 后 `reload()`；提醒 Alert。
  - `applicationEntry.ts`：`ongoing` 归入可申请；completed/full 仍不可用。
  - 验证：`cd RouteME/frontend; npm test -- --run`

- [ ] **T8 前端我的旅行、申请页与聊天**
  - Owner：AO（Jay）｜ 覆盖：E7、E9、E13
  - `MyTripsPage.tsx`：我发布且 ongoing 的行显示「结束行程」+ 二次确认 Modal；`ending_soon` 显示提醒；完成后 `reload()`。
  - `ApplicationsPage.tsx`：已结束隐藏接受/拒绝；满员接受禁用、拒绝可用。
  - `ChatPage.tsx`：只读文案包含「该行程已结束」。
  - `styles.css`：新增提醒与行内操作样式，复用现有令牌。
  - 验证：`npm test -- --run`

- [ ] **T9 发布校验与测试夹具**
  - Owner：AO（Jay）｜ 覆盖：E4
  - `TripPlan.create(draft, now, today)` 增加开始日期校验；`TripPlanServiceImpl.create` 按 Asia/Shanghai 计算 `today`。
  - `TripCreatePage` 开始/结束日期 `min` 设为今天；前端测试补日期校验。
  - `TripControllerTest.VALID_TRIP` 改用相对日期；`OpenApiTest` 同步。
  - 验证：`./mvnw -q -Dtest=TripControllerTest,OpenApiTest test; npm test -- --run`

- [ ] **T10 E2E 相对日期与用户路径**
  - Owner：AO（Jay）｜ 覆盖：E5–E7、E9、E10、E15
  - `trips.spec.ts`：`createTripViaApi` 用 `todayIso()`；结束用例改为「旅行中 → 结束行程 → 已结束」；取消确认保持；非 ongoing 无按钮；首页不再依赖种子 3/4 的日期漂移。
  - `companions.spec.ts`：结束后申请区显示「行程已结束」、提交被拒绝。
  - `experiences.spec.ts`：自动完成行程可进入体验入口（用 API 创建今天行程并结束）。
  - 验证：`cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/companions.spec.ts tests/experiences.spec.ts`

- [ ] **T11 回归验证与收尾**
  - Owner：AO（Jay）｜ 覆盖：全部 + E15 反向验证
  - 全量：`./mvnw test`、`npm test -- --run`、`npx playwright test`、`openspec validate add-trip-completion --strict`、`redocly lint openapi.yaml`。
  - 反向检查：`grep -R "@Scheduled\|恢复行程\|撤销结束"` 无命中；结束后数据行数不变；`TripStatus` 无 `cancelled`。
  - 产出 P4 验证报告与质量报告；更新 registry / handoff / docs/sdd。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| Spec Requirement | Design | Tasks | ATDD |
|---|---|---|---|
| `trip-plans` MODIFIED 浏览未结束 | D3/D7 | T3/T5 | E3/E13 |
| `trip-plans` MODIFIED 发布 | D12 | T9 | E4 |
| `trip-plans` MODIFIED 详情状态 | D2/D5/D9/D11 | T2/T7 | E5/E6/E12 |
| `trip-plans` MODIFIED 发布者结束 | D5/D4 | T3/T7/T8 | E6/E8/E9 |
| `trip-plans` ADDED 四态与流转 | D1/D2/D3 | T2/T3 | E1–E4/E14 |
| `trip-plans` ADDED 即将结束提醒 | D9 | T6/T7 | E12 |
| `trip-plans` ADDED 已结束口径统一 | D8 | T5 | E13 |
| `trip-companions` MODIFIED 提交与取消 | D6 | T4 | E7/E11/E14 |
| `trip-companions` MODIFIED 处理申请 | D4/D6 | T3/T4 | E8/E11 |
| `trip-companions` MODIFIED 聊天只读 | D3 | T3/T8 | E9 |
| `trip-companions` MODIFIED 退出同行 | D2/D6 | T4 | E11 |
| `trip-companions` MODIFIED 我的旅行聚合 | D8 | T5/T8 | E13 |

- **覆盖缺口：** 无孤儿场景；E15 为非目标反向验证，由 T11 承担。
- **范围一致性：** 任务全部落在 Proposal In scope；无静默扩张。
- **结论：** 对齐自检 **Pass**。P3 完成后进入 P4（`/sdd:atdd-apply`，从 T1 的 Red 用例开始）。
