# 任务清单 — add-trip-cancel（REQ-021 / issue #28）

- **Change：** `add-trip-cancel`
- **输入：** Delta Spec（`trip-cancellation`）、`atdd-design.md`、`design.md`（D1–D9）
- **约定：** 每层一条；先 Red 后 Green；最后一条必须是回归验证
- **Owner：** Neal（VL / 当前开发）

## 任务

- [x] **T0 原型先行（P3 已完成）**
  - Owner：Neal ｜ 覆盖：E5、E9、E10、E20
  - `docs/prototype/data.js` 增加 8 项 `CANCEL_REASONS`。
  - `ui.js`：详情页已取消态展示原因（发布者 / 同行者）、我的旅行发布组增加「取消」入口、已取消时隐藏结束 / 申请 / 编辑。
  - `main.js`：专用取消弹窗（原因 + 说明 + 不可恢复提示），校验后调用 `S.cancelTrip(id, reason, note)`。
  - `store.js`：`cancelTrip` 记录 `cancelledAt / cancelReason / cancelNote`，仍只取消 PENDING。
  - `styles.css`：`.action-note.danger`。
  - 验证：原型页面手动走查 1440 / 1024 / 768 / 390 与深浅主题。

- [x] **T1 后端 Red：取消 API 与状态用例**
  - Owner：Neal ｜ 覆盖：E1–E4、E6–E8、E12–E14、E16–E21
  - 新增 `TripCancellationApiTest`（固定 Clock）：取消成功、原因校验、403 / 409、并发、PENDING / ACCEPTED、聊天只读、体验拒绝、统计、列表 / 分页、原因裁剪、旧数据。
  - `TripPlanStatusTest` 增加「取消优先于日期与人数」。
  - `ApplicationServiceTest` / `ChatControllerTest` / `ExperienceServiceTest` 增加取消分支失败用例。
  - 验证：`cd RouteME/backend; ./mvnw -q -Dtest=TripCancellationApiTest,TripPlanStatusTest,ApplicationServiceTest,ChatControllerTest,ExperienceServiceTest test`（预期失败）

- [x] **T2 迁移与领域状态**
  - Owner：Neal ｜ 覆盖：E1、E2、E10、E21
  - 新增 `V19__trip_cancellation.sql`（三列 + 索引）。
  - `TripPlan` 增加 `cancelledAt / cancelReason / cancelNote`；`TripPlanEntity` 映射；`TripPlan.create / withId / withMeetingInfo` 与 `TripPlanStatusTest` / `TripMatchTest` 的测试工厂补齐。
  - `TripStatusEnum` 增加 `CANCELLED`；`status(now)` 取消优先；`endingSoon` 非 ONGOING 为 false。
  - 验证：`./mvnw -q -Dtest=TripPlanStatusTest,TripPlanServicePersistenceTest test`

- [x] **T3 取消服务、原因枚举与事件**
  - Owner：Neal ｜ 覆盖：E1、E2、E6–E8、E12、E16
  - 新增 `TripCancelReasonEnum`、`TripCancelRequest`、`TripCancelledEvent`。
  - `TripPlanService.cancel`：权限、状态、原因 / 说明校验、条件更新、事件发布。
  - `ApplicationServiceImpl` 增加 `onTripCancelled` 监听，复用 `cancelPending`。
  - `TripController` 增加 `POST /{tripId}/cancel`。
  - 验证：`./mvnw -q -Dtest=TripCancellationApiTest test`（E1–E4/E6–E8/E12 绿）

- [x] **T4 终态互斥与跨能力回归**
  - Owner：Neal ｜ 覆盖：E4、E13–E18
  - `materializeIfExpired` / `complete` / `selectExpiredIds` / `completeIfAbsent` 排除 `cancelled_at`。
  - `addCompanion` / `removeCompanion` / `updateMeeting` / `decide` / `leave` 拒绝取消。
  - `ChatServiceImpl.send` 增加取消只读；`ExperienceServiceImpl` 回归断言。
  - 验证：`./mvnw -q -Dtest=TripCancellationApiTest,ApplicationServiceTest,ChatControllerTest,ExperienceServiceTest,TripCompletionApiTest test`

- [x] **T5 列表、我的旅行与统计**
  - Owner：Neal ｜ 覆盖：E11、E19
  - `TripPlanMapper.xml` 的 `openTripFilter` 与 `selectExpiredIds` 增加 `cancelled_at IS NULL`；`latestOpenByPublisher` 增加 `isNull(cancelledAt)`。
  - `UserProfileStatsServiceImpl.published` 排除取消；`MyTripsServiceImpl` 分组回归（matched 保留、completed 排除）。
  - 验证：`./mvnw -q -Dtest=MyTripsControllerTest,UserProfileControllerTest,TripPlanServicePersistenceTest,TripMatchTest test`

- [x] **T6 响应裁剪与契约 0.13.0**
  - Owner：Neal ｜ 覆盖：E10、E20
  - `TripDetailResponse` 增加 `cancelledAt / cancelReason / cancelNote` 与 `includeCancelDetail`；`TripController` 统一计算可见性。
  - `openapi.yaml` 升 0.13.0：五态枚举、`TripDetail` 字段、`TripCancelRequest`、`/trips/{tripId}/cancel`。
  - `OpenApiTest` 更新版本 / 枚举 / schema 断言；`redocly lint` 通过。
  - 验证：`./mvnw -q -Dtest=OpenApiTest,TripCancellationApiTest test; npx @redocly/cli lint openapi.yaml`

- [x] **T7 前端状态、弹窗与详情**
  - Owner：Neal ｜ 覆盖：E5、E6、E8–E10、E15、E20
  - `types.ts` 加 `cancelled` 与 `TripCancelRequest`；`api.ts` 加 `cancelTrip`。
  - `tripStatus.ts` / `StatusBadge.tsx` / `styles.css` 增加取消态（`danger` tone）。
  - `tripMessages.ts` 增加取消原因、说明、确认、错误文案。
  - 新增 `TripCancelModal.tsx`；`TripDetailPage.tsx` 接入入口、已取消提示与原因展示，隐藏结束 / 申请 / 体验。
  - 验证：`cd RouteME/frontend; npm test -- --run`

- [x] **T8 我的旅行、申请入口、聊天与体验**
  - Owner：Neal ｜ 覆盖：E5、E13–E15、E18
  - `mineTrips.ts` 发布组增加 `cancel`（recruiting/full）；`MyTripsPage.tsx` 复用 `TripCancelModal`，取消后 `reload()`，已取消显示 note。
  - `applicationEntry.ts` 增加 cancelled 分支（ACCEPTED 可聊天、不可退出；其他不可用）。
  - `ChatPage.tsx` 只读提示「该行程已取消」；体验入口在取消时隐藏。
  - 验证：`npm test -- --run`

- [x] **T9 E2E 用户路径**
  - Owner：Neal ｜ 覆盖：E5、E9、E10、E14、E15、E18
  - `trips.spec.ts`：详情取消（普通原因 + other 说明校验）、二次确认取消不变、我的旅行入口、已取消态。
  - `companions.spec.ts`：PENDING 自动取消、ACCEPTED 保留、聊天只读、再申请 409。
  - `experiences.spec.ts`：取消后无体验入口。
  - 验证：`cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/companions.spec.ts tests/experiences.spec.ts`

- [x] **T10 回归验证与收尾**
  - Owner：Neal ｜ 覆盖：全部 + Non-goals 反向验证
  - 全量：`./mvnw test`、`npm test -- --run`、`npx playwright test`、`openspec validate add-trip-cancel --strict`、`redocly lint openapi.yaml`。
  - 反向检查：无 credit / admin / 退款 / 恢复端点；取消后 `completed_at` 仍为空；PENDING 无残留。
  - 产出 P4 验证报告与质量报告；更新 registry / handoff / docs/sdd。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| Spec Requirement | Design | Tasks | ATDD |
|---|---|---|---|
| 发布者取消自己的行程 | D1/D2/D3/D5/D6/D7 | T2/T3/T4/T6/T7/T8 | E1–E5、E10、E15 |
| 取消原因与二次确认 | D1/D2/D6/D7/D8 | T3/T6/T7/T9 | E6–E9 |
| 已取消行程的可见性 | D4/D5/D6/D7 | T5/T6/T7/T8 | E10/E11/E19/E20 |
| 取消后的同行与聊天关闭 | D2/D3/D4 | T3/T4/T5/T8/T9 | E12–E15 |
| 取消后的其他操作与统计 | D3/D4/D6/D7 | T4/T5/T7/T8 | E16–E19 |

- **覆盖缺口：** 无孤儿场景；E21（旧数据）由 T1/T2 承担，E5/E9 由 T0 与 T7/T9 共同承担。
- **范围一致性：** 任务全部落在 Proposal In scope；无 credit / admin / 退款 / 恢复。
- **结论：** 对齐自检 **Pass**。P3 完成后进入 P4（`/sdd:atdd-apply`，从 T1 的 Red 用例开始）。
