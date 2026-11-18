# Tasks — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction` ｜ **REQ：** REQ-025 ｜ **Delta：** `specs/credit-enforcement/spec.md`（ADDED 9 Requirement / 46 Scenario）
- **ATDD：** `atdd-design.md`（A1–A5 / E1–E3 / Defer UT）
- **设计：** `design.md`（D1–D20）
- **Owner：** Lewis Liu（当前开发者）
- **执行顺序：** 契约 → 迁移 → 领域 → 服务 → 守卫 → 响应 → 前端 → E2E → 回归 → G2

## T0 — 原型与预览（P3 已完成）

- [x] **层：** docs / prototype ｜ **Owner：** Lewis Liu
- 更新 `docs/prototype/main.js` / `store.js` / `ui.js` / `styles.css`：退出弹窗（原因 + 预计影响）、限制徽标、本人原因/自动解除说明、拦截提示、系统取消原因。
- 新增 `preview/exit-credit.html`（1440 / 390，浅/深色；退出弹窗 + 本人限制 + 他人徽标 + 拦截提示 + 系统取消）。
- **验证：** 浏览器打开预览，检查无横向溢出、原因/徽标/提示同时可见。

## T1 — 契约 0.20.0

- [x] **层：** contract ｜ **Owner：** Lewis Liu
- `openapi.yaml` 升 0.20.0；新增 `GET /trips/{tripId}/leave-preview`、改 `POST /trips/{tripId}/leave`（body `{reason}`、200 `LeaveResult`）；新增 `LeavePreview` / `LeaveRequest` / `LeaveResult`；`UserCreditEntry.credit_restricted`；`UserProfile.credit_restricted` + `credit_restriction_reason`；`TripDetail.cancel_reason` 响应 enum 加 `credit_restricted`；错误 `CREDIT_RESTRICTED`；补成功/400/403/409 示例。
- **验证：** `cd ai4se-baseline/RouteME; npx.cmd -y @redocly/cli lint openapi.yaml`；`OpenApiTest`。

## T2 — 迁移 V25

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `V25__credit_enforcement.sql`：`credit_exit_event`、`credit_restriction`、`trip_applications.status_reason`；唯一/普通索引；双引擎兼容。
- **验证：** `CreditMigrationSqliteTest`（空库 V1→V25 + V20→V25）；`.\mvnw.cmd -B -ntp verify` 的 H2 迁移。

## T3 — 领域枚举与计算器

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `CreditExitReasonEnum` / `CreditExitPenaltyTier` / `CreditRestrictionType` / `CreditRestrictionStatus`；`CreditExitCalculator`（出发基准、六档、月度边界、计数规则）；`CreditExitEvent` / `CreditRestriction` 记录。
- **验证：** `CreditExitCalculatorTest`（48h -5、7d 0、3d -3、72h -3、24h -8、12h -10、旅行中 -15、少 1 秒进下一档、待核实/≥7d/旅行中不计入、0 分裁断事件计入）。

## T4 — 账本事件与限制监听

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `CreditServiceImpl` 注入 `ApplicationEventPublisher`，`book` 在 `applied != 0` 时发布 `CreditChangedEvent`；`CreditEnforcementEventListener` 处理 `>=60 → <60` 触发 / `<60 → >=60` 解除；`credit_restriction` 写入 `active_flag`；`CreditRestrictionGuard` 叶子组件。
- **验证：** `CreditServiceImplTest`（事件发布 / 不改变既有裁断/幂等/零值）；`CreditEnforcementServiceTest`（触发、解除、active 幂等、无循环依赖启动）。

## T5 — 退出预览 / 退出编排

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `CreditEnforcementService.previewExit` / `leave` / `reviewExit`（领域方法，无 controller）；`ApplicationController` 新 GET + POST；`ApplicationService.findAccepted/acceptedByUser/markLeft/cancelPendingByUser`；`TripPlanService.removeCompanion` 复用；退役 `ApplicationService.leave`；`LeavePreviewResponse` / `LeaveResultResponse`。
- **验证：** `CreditExitPreviewApiTest`（A1）、`CreditExitReviewApiTest`（A2，含 `reviewExit` 为真/不属实）；`openspec validate` 不变。

## T6 — 系统取消与申请状态原因

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `TripCancelReasonEnum` 加 `credit_restricted`（systemOnly，`parse` 拒绝）；`TripCancelledEvent.cancelReason`；`TripPlanService.cancelByCreditRestriction` / `cancelUnfinishedByPublisher`；`ApplicationServiceImpl.onTripCancelled` 写 `status_reason`；现有 cancel/leave/reject/complete 写入对应 `status_reason`。
- **验证：** `TripCancellationApiTest` 扩展（系统原因、ONGOING 取消、PENDING 取消原因）；`ApplicationServicePersistenceTest` 断言 `status_reason`。

## T7 — 只读守卫

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `CreditRestrictedException`（403 `CREDIT_RESTRICTED`）；`CreditRestrictionGuard` 注入 `TripPlanServiceImpl.create/cancel/complete/updateMeeting`、`ApplicationServiceImpl.apply/cancel/decide`、`ChatServiceImpl.send`、`UserProfileServiceImpl.save/uploadAvatar`、`ExperienceServiceImpl.upsert`、`ExperiencePhotoService` 上传/删除；系统清退方法绕过；举报/安全/查看不拦。
- **验证：** `CreditRestrictionGuardApiTest`（A4 逐项 403；查看/举报保留；系统清退不 403）。

## T8 — 响应字段

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- `UserCreditResponse.credit_restricted`；`UserProfile.credit_restricted` + 本人 `credit_restriction_reason`；`UserProfileResponse` 同步；`UserProfileServiceImpl.toProfile` 从 `CreditService.read` 派生；`UserCreditEntry` 契约测试。
- **验证：** `CreditBatchApiTest` / `CreditProfileApiTest` / `CreditReadOnlyApiTest` 扩展；`OpenApiTest`。

## T9 — 前端类型 / API / 信用上下文

- [x] **层：** frontend ｜ **Owner：** Lewis Liu
- `types.ts`：`LeaveReason` / `LeavePreview` / `LeaveResult` / `UserCreditEntry.credit_restricted` / `UserProfile.credit_restricted` + `credit_restriction_reason`。
- `api.ts`：`loadLeavePreview` / `leaveTrip(body)` 返回 `LeaveResult`。
- `creditDisplay.ts` / `creditRestriction.ts`：徽标、原因、自动解除、拦截文案。
- `CreditProvider` / `useMyCredit`：加载当前用户信用、`refresh`；`App.tsx` 包裹。
- **验证：** `npm.cmd test`（creditDisplay / creditRestriction / api）；`npm.cmd run build`。

## T10 — 退出弹窗三入口

- [x] **层：** frontend ｜ **Owner：** Lewis Liu
- `TripLeaveModal`（原生 select、预览、确认、错误映射、安全原因引导举报）；接入 `TripDetailPage` / `MyTripsPage` / `ChatPage`；移除旧 `window.confirm` / leave confirm。
- **验证：** `credit-exit.spec.ts` E1（三入口、48h -5、不可抗力待核实、旅行中 -15、二次确认）。

## T11 — 五展示面徽标与本人限制说明

- [x] **层：** frontend ｜ **Owner：** Lewis Liu
- `ProfilePage`（本人限制原因 + 自动解除）、`ProfileModal`、详情发布者行、`TripCard`、`ApplicationsPage` 徽标；他人不显示原因。
- `CreditRestrictedNotice`：发布页 / 分享页 / 详情申请区 / 申请处理 / 聊天输入 / 资料编辑；`AppShell` 发布导航禁用。
- **验证：** `credit-restriction.spec.ts` E2（mock `credit_restricted`）；五展示面徽标；本人/他人差异；拦截提示。

## T12 — 系统取消原因与 E2E

- [x] **层：** frontend / e2e ｜ **Owner：** Lewis Liu
- `tripCancel.ts` 映射 `credit_restricted`；详情页系统原因展示；其他用户只看已取消；聊天只读提示。
- E2E `credit-cancel-reason.spec.ts` E3；`credit-restriction.spec.ts` 扩展。
- **验证：** `npx.cmd playwright test tests/credit-exit.spec.ts tests/credit-restriction.spec.ts tests/credit-cancel-reason.spec.ts`。

## T13 — 回归与本地验证

- [x] **层：** backend / frontend / e2e ｜ **Owner：** Lewis Liu
- 全量 `.\mvnw.cmd -B -ntp verify`；`npm.cmd run build` / `npm.cmd test`；Redocly lint；`openspec validate --strict`；E2E 全量（记录既有债务）；1440 / 768 / 390 × 浅/深色走查。
- **验证：** `docs/ai4se-plugins/<ts>-local-verify-report.md` + `docs/ai4se-plugins/<ts>-quality-checklist-report.md`（P4）。

## T14 — G2 与 P4 记录

- [x] **层：** docs ｜ **Owner：** Lewis Liu / Neal（VL）
- `g2-decision.md`（VL=Neal）；`docs/sdd/add-credit-exit-restriction/p4-verify.md`；提交 `feat(p4)`。
- **验证：** G2 签署；阶段提交链完整。

## T15 — R2 规格 / 契约

- [x] **层：** spec / contract ｜ **Owner：** Lewis Liu
- Delta 新增「退出说明与证明材料」Requirement 与 7 个 Scenario；`openapi.yaml` 0.21.0；`LeaveRequest.note` / `attachment_ids`；`POST /trips/{tripId}/leave-evidence` + `LeaveEvidence`。
- **验证：** `openspec validate add-credit-exit-restriction --strict`；`npx.cmd @redocly/cli lint openapi.yaml`；`OpenApiTest`。

## T16 — R2 迁移 / 后端

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- V26：`credit_exit_event.exit_note` 与 `credit_exit_attachment`；`ExitEvidenceStorage`（磁盘文件）；`uploadEvidence` 魔数 / 5MB / 3 张 / 24h 孤儿清理；`leave` 校验说明（安全 / 不可抗力必填）并绑定附件。
- **验证：** `CreditExitApiTest`、`CreditEnforcementMigrationSqliteTest`。

## T17 — R2 前端

- [x] **层：** frontend ｜ **Owner：** Lewis Liu
- 标签纯文字 + 「请选择退出原因」占位；未选原因 / 必填说明未填时确认置灰；说明 TextArea（≤200）；图片选择 / 预览 / 移除（≤3、≤5MB、JPEG/PNG/WebP）；待核实删第二行。
- **验证：** `leaveForm.test.ts`；`npm.cmd test`；`npm.cmd run build`。

## T18 — R2 E2E 与记录

- [x] **层：** e2e / docs ｜ **Owner：** Lewis Liu
- `credit-exit.spec.ts` 覆盖置灰 / 占位 / 删说明 / 说明必填 / 上传；`companions.spec.ts` / `mine.spec.ts` 补说明；P4 记录追加 R2。
- **验证：** 隔离环境 `playwright test`；`p4-verify.md` §R2。

## T19 — R3 契约 / 后端读取接口

- [x] **层：** contract / backend ｜ **Owner：** Lewis Liu
- `GET /trips/{tripId}/leave-record`（本人；无记录 404 `LEAVE_RECORD_NOT_FOUND`）；`GET /leave-evidence/{attachmentId}`（本人二进制，非本人 403）；契约 0.22.0 + `LeaveRecord` / `LeaveRecordAttachment`。
- **验证：** `CreditExitApiTest`；`OpenApiTest`；Redocly。

## T20 — R3 前端回看入口

- [x] **层：** frontend ｜ **Owner：** Lewis Liu
- `LeaveRecordModal`（只读；原因 / 说明 / 时间 / 影响 / 缩略图可预览；404 提示）；`MyTripsPage` 已退出行「查看退出记录」；图片带用户头取回。
- **验证：** `npm.cmd test`；`npm.cmd run build`。

## T21 — R3 E2E 与记录

- [x] **层：** e2e / docs ｜ **Owner：** Lewis Liu
- `credit-exit.spec.ts` 追加本人回看断言；P4 / G2 / registry / handoff 追加 R3（契约 0.22.0，无新迁移）。
- **验证：** 隔离环境 `playwright test tests/credit-exit.spec.ts`。

## T22 — R4 迁移 / 后端多次退出

- [x] **层：** backend ｜ **Owner：** Lewis Liu
- V27 `credit_exit_event.application_id`（旧数据回填）；幂等键改为 `exit:{userId}:{tripId}:{applicationId}`；无 ACCEPTED 时返回最近一次事件（重试幂等）；记录接口返回全部事件。
- **验证：** `CreditExitApiTest`（再次退出 -10 / 月序号 2 / 2 条记录 / 重试幂等）；`CreditEnforcementMigrationSqliteTest`。

## T23 — R4 前端全量记录

- [x] **层：** frontend ｜ **Owner：** Lewis Liu
- `LeaveRecordModal` 支持多条记录（时间倒序、每次独立原因 / 说明 / 影响 / 图片）；`loadLeaveRecords` 返回数组。
- **验证：** `npm.cmd test`；`npm.cmd run build`。

## T24 — R4 契约 / E2E 与记录

- [x] **层：** contract / e2e / docs ｜ **Owner：** Lewis Liu
- 契约 0.23.0（`leave-record` 响应数组）；E2E 新增再次申请→再次退出→2 条记录；P4 / G2 / registry / handoff 追加 R4。
- **验证：** `OpenApiTest`；Redocly；隔离环境 `playwright test tests/credit-exit.spec.ts`。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| # | 检查 | 结果 | 证据 |
|---|---|---|---|
| 1 | 46 Scenario 均有 Design 落点 | Pass | design D6–D18 + T1–T12 |
| 2 | A1–A5 / E1–E3 覆盖 API / E2E | Pass | `atdd-design.md` §2 |
| 3 | 每条 Task 单层 + Owner + 验证命令 | Pass | T1–T14 |
| 4 | 契约 / 迁移排在两端之前 | Pass | T1 / T2 在 T3–T12 前 |
| 5 | 无静默扩范围 | Pass | 无管理员 / 明细 / 恢复 / 通知任务 |
| 6 | 系统清退不扣分 | Pass | T4 / T6 / T7 明确绕过 guard 与账本 |
| 7 | 低信用测试不新增写接口 | Pass | T5 / T7 / T12 用 `CreditService.book` + `page.route` |
| 8 | 原型先行 | Pass | T0 已完成，P4 不重复改原型 |
| 9 | 契约 / 迁移号可排他 | Pass | T1 / T2 前置确认 |
| 10 | 未归档 Delta 不被修改 | Pass | 仅新增 `credit-enforcement`；无 MODIFIED |
| 11 | R2 说明 / 证据与交互一致 | Pass | T15–T18；Delta 第 10 个 Requirement；契约 0.21.0；V26 |
| 12 | R3 本人回看仅本人只读 | Pass | T19–T21；契约 0.22.0；无新迁移 |
| 13 | R4 同行程多次退出与全量记录 | Pass | T22–T24；契约 0.23.0；V27 |
