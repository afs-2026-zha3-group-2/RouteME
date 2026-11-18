# 任务：refine-service-close

- **依据：** [`specs/customer-service/spec.md`](specs/customer-service/spec.md)（ADDED 4 Requirement / 37 Scenario）、[`proposal.md`](proposal.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **Owner：** Lewis Liu（当前开发者）｜ **协助：** Neal（VL）在 P4 独立验证
- **顺序：** 契约（T1）与迁移（T2）先行 → 后端状态机与端点（T3–T6）→ 前端（T7–T9）→ E2E（T10）→ 收口（T11）；每片先写失败验收（red）再实现
- **契约：** `openapi.yaml` **0.25.0**；迁移 **`V30__add_service_session_resolve.sql`**
- **视觉基准：** 无客服会话原型（P0 已核）；沿用 `help-chat` / `admin-service` / `badge` 既有样式与 antd 组件，不新增色值与像素
- **不做：** NFR 压测、满意度评价、超时自动关闭、历史会话列表、系统提示消息、客服接待策略

## 前置（P4 开始前）

- [x] 确认 `origin/main` 的 `openapi.yaml` 与迁移头仍为 0.24.0 / V29；若被并行 change 抢占，本 change 顺延（0.25.0 → 下一版、V30 → 下一号）并回写 proposal / design / tasks。
- [x] 本地后端使用隔离 SQLite 库启动（避免迁移号冲突）；E2E 用 `ROUTEME_E2E_BASE_URL` 指向本次前端实例。

## T1 [contract] 契约升到 0.25.0 并先写失败断言

- [x] `openapi.yaml` `info.version` 改 `0.25.0`；`ServiceSessionStatus` 增 `RESOLVED`。
- [x] `ServiceSessionSummary` 增可空 `resolved_at`（`readOnly`、`date-time`）；不增 `resolved_by`。
- [x] 新增 `POST /service/sessions/{sessionId}/close`（用户）与 `POST /admin/service/sessions/{sessionId}/resolve`（ADMIN）；删除 `/admin/service/sessions/{sessionId}/close`。
- [x] `/service/sessions/current`、`POST /service/sessions` 的描述改为三态未结束。
- [x] `AdminDashboardServiceSessions.by_status` `required` 与 `properties` 增 `RESOLVED`。
- [x] `OpenApiTest` 先红：版本 0.25.0、路径清单（移除 close、加 resolve、加用户 close）、四值枚举、`resolved_at` 字段、admin close 缺席、概览四桶。

**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=OpenApiTest test`
**覆盖：** S8、S9、S10；U1 / A1 的契约面

## T2 [db] V30 迁移与迁移测试

- [x] 新增 `V30__add_service_session_resolve.sql`：`resolved_at VARCHAR(40)`、`resolved_by INTEGER`。
- [x] `AdminConsoleMigrationSqliteTest` 增断言：两列存在、V30 记录成功；既有 V19 / V22 断言不回归。
- [x] 确认空库全链与存量库（`SqlLite/routeme-dev.db` 副本）均可迁移。

**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=AdminConsoleMigrationSqliteTest test`
**覆盖：** S3 / S4 / S5 的数据前提；A1 / U3 的留痕字段

## T3 [backend] 四态模型与响应字段

- [x] `ServiceSessionStatusEnum` 增 `RESOLVED`（`of()` 自然支持）。
- [x] `CustomerServiceSessionEntity` / `CustomerServiceSession` 增 `resolvedAt` / `resolvedBy`。
- [x] `ServiceSessionSummaryResponse` / `ServiceSessionDetailResponse` 增 `resolvedAt`（`closedAt` 之后）。
- [x] `CustomerServiceImpl.summary` / `detail` 组装新字段。

**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** S8

## T4 [backend] 用户结束端点

- [x] `CustomerService.closeByUser`：三态 CAS，`closed_at` / `closed_by=用户`；0 行 → `SessionClosedException`。
- [x] `ServiceController` 增 `POST /{sessionId}/close`：`authService.requireUser` → `assertCanWrite(SUPPORT)` → 404 / 409。
- [x] 删除 `CustomerService.close(long, long)` 与 `AdminServiceController` 的 close 映射。
- [x] `ServiceControllerTest` 增：U1 / U2 / U3 / U5 / U6 / U7 / S5；删除依赖 admin close 的旧用例与 helper。
- [x] `AdminServiceControllerTest` 增 S10（旧路径 404）。

**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=ServiceControllerTest,AdminServiceControllerTest test`
**覆盖：** U1–U3、U5–U7、S5、S10

## T5 [backend] 客服标记完成端点

- [x] `CustomerService.resolve`：`HANDLING` CAS → `RESOLVED` + `resolved_*`；0 行 → `SessionNotHandlingException`。
- [x] `AdminServiceController` 增 `POST /{sessionId}/resolve`。
- [x] `AdminServiceControllerTest` 增：A1 / A2 / A3 / A10；删除 `in_close_out_closed` / `in_closeWaiting_out_sessionNotHandling`。

**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=AdminServiceControllerTest test`
**覆盖：** A1–A3、A10、S1 的 `HANDLING → RESOLVED` 分支

## T6 [backend] 消息回迁、current 三态与概览分桶

- [x] `openSession` 改为三态（`WAITING` / `HANDLING` / `RESOLVED`）。
- [x] `appendMessage`：`RESOLVED` 下条件回迁 `HANDLING` 并清空 `resolved_*`；CAS 0 行重读，`CLOSED` → 409。
- [x] `AdminDashboardServiceImpl.SERVICE_SESSION_STATUS_KEYS` 增 `RESOLVED`。
- [x] `ServiceControllerTest` 增：A5 / S2 / S3 / S4；`AdminServiceControllerTest` 增 A6；`AdminDashboardControllerTest` 增 A11 / S9（基线增量断言）。

**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=ServiceControllerTest,AdminServiceControllerTest,AdminDashboardControllerTest test`
**覆盖：** A5 / A6 / A11、S2–S4、S9

## T7 [frontend] 类型、API、文案与状态派生

- [x] `types.ts`：`ServiceSessionStatus` 增 `'RESOLVED'`；`ServiceSessionSummary` 增 `resolved_at`。
- [x] `api.ts`：`closeServiceSession` 指向用户端点；新增 `resolveServiceSession`（管理端）。
- [x] `adminMessages.ts`：补 `sessionResolved`、`helpResolved`、`serviceResolve`、`serviceResolvedToast`、`serviceResolvedHint`、`serviceCloseTitle` / `serviceCloseBody` / `serviceCloseWaitTitle` / `serviceCloseWaitBody`。
- [x] `adminStatus.ts`：`ServiceStatusTone` 增 `'jade'`；`serviceStatusLabel` / `serviceStatusTone` 增 `RESOLVED`。
- [x] `help/helpStatus.ts`：新增 `serviceChatHint(status)`；`SupportPage` / `ServiceChat` 删除私有 `statusHint` 并引用。
- [x] `adminStatus.test.ts` 补四态断言；新增 `help/serviceChatStatus.test.ts`（`serviceChatHint` 四态）。

**验证：** `cd ai4se-baseline/RouteME/frontend; npm.cmd test`
**覆盖：** A4 / A5 的文案面；S8 的前端 union

## T8 [frontend] 用户端结束入口

- [x] `ServiceChat`：`WAITING` / `HANDLING` / `RESOLVED` 显示「结束会话」`Popconfirm`（按状态选标题 / 描述）；确认后调 `closeServiceSession` 并 `onSessionChange`。
- [x] `RESOLVED` 显示 `helpResolved` 提示；不展示客服身份。
- [x] `CLOSED` 分支保持只读与「重新发起会话」。

**验证：** `cd ai4se-baseline/RouteME/frontend; npm.cmd run build`
**覆盖：** U4 / U8 / U9、A4

## T9 [frontend] 管理端标记完成、筛选、徽标与概览

- [x] `AdminServiceDetailPage`：删除结束按钮与 `close` 调用；`HANDLING` 显示「标记处理完成」，成功 `message.success(serviceResolvedToast)`。
- [x] `AdminServicePage`：`STATUS_OPTIONS` 增「待用户确认」；刷新后可按 `RESOLVED` 筛选。
- [x] `AdminDashboardPage`：`SERVICE_SESSION_STATUS_ORDER` / `LABELS` 增 `RESOLVED`。
- [x] `adminBadges.tsx` 注释由「三态」改「四态」。

**验证：** `cd ai4se-baseline/RouteME/frontend; npm.cmd run build`
**覆盖：** A8 / A9 / A10 / A11 的展示面、S9 的图例；U8 的反向（管理端无结束按钮）

## T10 [e2e] 端到端验收改写

- [x] `customer-service.spec.ts` `[C3]`：用户结束（确认）→ `CLOSED` → 重新发起；不再调 admin close。
- [x] 新增 `[C4]`：客服 join → resolve → 用户看到待确认 → 用户发消息回 `HANDLING` → 客服再 resolve → 用户结束 → 双方只读。
- [x] `admin.spec.ts` `[I3]`：管理员接入 → 回复 → 「标记处理完成」→ 用户待确认 → 用户结束 → 筛选「已结束」；断言管理端无「结束会话」按钮。

**验证：** `cd ai4se-baseline/RouteME/e2e; npx.cmd playwright test tests/customer-service.spec.ts tests/admin.spec.ts`
**覆盖：** U2 / U4 / U8 / U9、A4 / A7 / A8 / A9、S7

## T11 [docs] 阶段记录与交付说明

- [x] `docs/sdd/refine-service-close/p3-design.md`（本阶段）。
- [x] P4 写 `p4-verify.md`：本地验证报告路径、E2E 结果、视口 / 主题走查截图、issue #38 处置说明（按钮与接口已删除）。
- [x] 回写 `registry.md` / `handoff.md` / `stories.md` 的 P3–P4 状态。

**验证：** 记录与实际命令输出一致；不代签 G2。

## T12 [backend] 恢复客服结束会话端点（2026-11-18 修正）

- [x] `CustomerService.closeByAdmin`：`WAITING` / `HANDLING` / `RESOLVED` 三态 CAS → `CLOSED`，`closed_at` / `closed_by=客服`，并通知用户；0 行 → `SessionClosedException`。
- [x] `AdminServiceController` 恢复 `POST /{sessionId}/close`（ADMIN）。
- [x] `AdminServiceControllerTest`：改为 `in_adminCloseWaiting_out_closed` / `in_adminCloseHandling_out_closed` / `in_adminCloseResolved_out_closed` / `in_adminCloseTwice_out_sessionClosed` / `in_adminCloseUnknown_out_notFound`。

**背景：** proposal 声明「管理端结束会话能力保留」，T4/T9/T10 误将其删除；本次按 proposal 与修订后的 Delta 恢复。
**验证：** `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=AdminServiceControllerTest test`

## T13 [frontend] 管理端结束入口

- [x] `api.ts` 新增 `closeServiceSessionByAdmin`，指向 `/admin/service/sessions/{sessionId}/close`。
- [x] `AdminServiceDetailPage`：未结束状态显示「结束会话」`Popconfirm`（`WAITING` 用取消排队文案）；成功 `message.success(serviceCloseToast)`；`HANDLING` 同时保留「标记处理完成」。
- [x] 文案复用既有 `serviceClose*`，不新增色值与像素。

**验证：** `cd ai4se-baseline/RouteME/frontend; npm.cmd run build`

## T14 [contract/e2e] 契约与端到端回归

- [x] `openapi.yaml` 增 `/admin/service/sessions/{sessionId}/close`，版本 `0.32.0`；`OpenApiTest` 同步路径白名单与「两个 close 端点并存」断言。
- [x] `customer-service.spec.ts` `[C3]`：admin close 期望由 404 改为 200；`[C4]` 增「客服结束 → 用户端 3 秒内已结束」。
- [x] `admin.spec.ts` `[I3]`：按钮断言改为「存在结束会话」，并走一次客服结束闭环。

**验证：** `cd ai4se-baseline/RouteME/e2e; npx.cmd playwright test tests/customer-service.spec.ts tests/admin.spec.ts`

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查项 | 结论 |
|---|---|
| Delta 场景全部有 ATDD 行 | Pass：ATDD §2 共 31 行 + T12–T14 新增 6 行客服结束场景 |
| Design 与 Delta 一致 | Pass：状态机 6 条迁移、2 个新端点、1 个删除端点、`resolved_at` / `resolved_by`、概览四桶均有对应 |
| Tasks 与 Design 一致 | Pass：T1–T10 逐项覆盖 design §2–§9；无未承接的设计项 |
| ATDD 与 Tasks 一致 | Pass：ATDD §3 的 red 顺序 = T1 → T2 → T4–T6 → T7–T10 |
| 无静默扩范围 | Pass：唯一超出 P2 原稿的是概览第四段，已补 Delta 场景并由用户确认（`g1-decision.md` Post-G1 addendum） |
| 契约 / 迁移排他 | Pass：`origin/main@9a13fe4` = 0.24.0 / V29，本 change 0.25.0 / V30 |
| 归档顺序 | Pass：MUST 排在 `add-admin-console` 之后（P5 不执行） |
| 未签项 | G3（SA）不代签、P5 不执行；design / tasks、评审报告与 G2 已签署（2026-11-18） |
