# 技术设计 — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction` ｜ **REQ：** REQ-025 ｜ **Delta：** `specs/credit-enforcement/spec.md`（ADDED 9 Requirement / 46 Scenario）
- **G1：** Pass（IO=WAYNE / SA=Jacky，2026-11-17，`g1-decision.md`）
- **基线：** `main@ec360dc`；分支 `feature/add-credit-exit-restriction`
- **阶段：** P3（Design & decompose）
- **契约 / 迁移：** 已定稿 `openapi.yaml` 0.20.0 + `V25__credit_enforcement.sql`（P4 合并时按实际顺序排他）

## 0. 目标与非目标

**目标：** 用一个新能力 `credit-enforcement` 把「退出同行 → 扣分留痕 → 分数跌破 60 → 只读限制 → 自动清理 → 分数回到 60 自动解除」做成一条可测试、可回算、无管理端的链路。

**非目标：** 管理员核实 / 人工封禁 / 明细页 / 安全学习 / 客服 / 通知 / 恢复被清退关系 / 正向加分；不修改未归档的 `user-credit` / `trip-cancellation` / `trip-companions` Delta。

## 1. 关键决策

| # | 决策 | 选择 | 放弃的替代方案 | 理由 |
|---|---|---|---|---|
| D1 | 能力归属 | 新增 `credit-enforcement`（ADDED） | MODIFY `user-credit` / `trip-companions` / `trip-cancellation` | 三者未归档，MODIFIED 会抢同一 Requirement 块；新能力可独立归档 |
| D2 | 数据模型 | `credit_exit_event` + `credit_restriction` + `trip_applications.status_reason` | 只扩账本 / 只加账户字段 | 退出事件需要档位、月度序号、待核实；限制需要 active/lifted 历史；账本只负责分数变化 |
| D3 | 限制触发 / 解除 | `CreditService.book` 发布 `CreditChangedEvent`，`@EventListener` 同步处理 | 定时任务 / 读时懒触发 / 管理员触发 | 与扣分同事务、无外部依赖；读时触发会把写逻辑藏进读路径 |
| D4 | 依赖方向 | `CreditRestrictionGuard` 只依赖 `CreditService` + `CreditRestrictionMapper`；写服务注入 guard；`CreditEnforcementService` 依赖 `ApplicationService` / `TripPlanService` | 写服务直接依赖 `CreditEnforcementService` | 避免 `ApplicationService ↔ CreditEnforcementService` 循环依赖 |
| D5 | 退出编排 | 控制器调用 `CreditEnforcementService.preview/leave`；`ApplicationService.leave` 退役 | 在 `ApplicationService.leave` 内做扣分 | 退出扣分需要读信用、写事件、触发限制，放在同行域会把信用域塞进申请域 |
| D6 | 退出接口 | `GET /trips/{tripId}/leave-preview?reason=` + `POST /trips/{tripId}/leave`（body `{reason}`，200 带结果） | 前端自算 / 一个 POST 同时返回预览与结果 | 预计影响必须服务端计算；确认时重算防并发漂移 |
| D7 | 出发基准 | `meeting_time` 有值 → 按 Asia/Shanghai 解析；否则 `plannedStart()`（开始日期 00:00） | 固定开始日期 / 结束日期 / UTC | 用户 D7；与行程状态 `plannedStart` 一致 |
| D8 | 扣分阶梯 | 左闭右开：≥7d 0；[3d,7d) -3；[24h,3d) -5；[12h,24h) -8；[0,12h) -10；旅行中 -15 | 右闭 / 四舍五入到天 | 用户规则；边界可判定 |
| D9 | 月度序号 | 按退出动作所在自然月；只数已生效出发前扣分（含 0 分裁断事件）；待核实、旅行中、≥7d 不计入；核实不属实取「核实当时已有次数 + 1」 | 提交即计数 / 退回月度上限 | 用户 D8 / D14；不追溯其他已结算退出 |
| D10 | 幂等 | `credit_exit_event` 唯一键 + 账本 `idempotency_key = exit:{userId}:{tripId}` | 只靠前端防抖 | 双击 / 并发 / 重试都只产生一次关系解除与一次分数变化 |
| D11 | 限制阈值 | `before >= 60 && after < 60` 触发；`before < 60 && after >= 60` 解除；60 不触发 | 永远 active / 人工解除 | 用户 D2 / D5；限制由当前分数派生 |
| D12 | active 唯一 | `credit_restriction.active_flag`：active=1，lifted=NULL；唯一索引 `(user_id, active_flag)` | 部分唯一索引 `WHERE status='active'` | SQLite 支持部分索引，H2 不保证；NULL 在两边都可重复 |
| D13 | 自动清理 | 同一事务：撤回全部 PENDING → 解除未结束 ACCEPTED（人数 -1）→ 取消未结束已发布行程（含 ONGOING） | 异步清理 / 只清一种 | 用户 D11；只读账号不能留下未收口关系；系统清退不扣分 |
| D14 | 系统取消 | 新增 `TripPlanService.cancelByCreditRestriction` / `cancelUnfinishedByPublisher`；`TripCancelledEvent` 带 `cancelReason` | 复用发布者 `cancel`（只允许 RECRUITING/FULL） | 现有 cancel 不能取消 ONGOING；系统原因不能走发布者入口 |
| D15 | 原因字典 | `TripCancelReasonEnum` 加 `credit_restricted`，标记 `systemOnly`；`parse` 拒绝 systemOnly；响应 enum 含它，请求 enum 不含 | 复用 `other` / 不展示原因 | 用户 D13；发布者不能伪造系统原因 |
| D16 | 只读守卫 | `CreditRestrictionGuard.requireNotRestricted` 注入写服务；系统清退方法绕过；举报 / 安全 / 查看不拦 | 只靠前端 / 只在控制器 | 服务端才是安全边界；guard 是叶子依赖，避免循环 |
| D17 | 展示字段 | `UserCreditEntry.credit_restricted` + `UserProfile.credit_restricted` + 本人 `credit_restriction_reason`；五展示面徽标；原因仅本人 | 新开信用中心 / 明细页 | 用户 D4 / D10；最小披露 |
| D18 | 前端状态 | `CreditProvider` 加载当前用户信用并暴露 `useMyCredit`；`TripLeaveModal` 三入口复用；原生 select | 每页各自请求 / antd Select | 一次取数、全局禁用；Edge 下 antd 浮层有既有兼容问题 |
| D19 | 测试路径 | 后端 API 测试内 `CreditService.book` 造低信用；E2E 用 `page.route` 模拟限制展示；真实退出走 E2E | 新增测试写接口 / 新增管理员 | 不破坏「无客户端写分端点 / 无管理端」边界 |
| D20 | 原型 | 更新 `docs/prototype` 退出弹窗与限制徽标；新增 `preview/exit-credit.html` | 只写 design 不改原型 | `@rule:prototype-ui-alignment` |

## 2. 数据模型（V25）

```sql
CREATE TABLE credit_exit_event (
  id INTEGER NOT NULL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  trip_id BIGINT NOT NULL,
  exit_reason VARCHAR(20) NOT NULL,
  exit_at VARCHAR(40) NOT NULL,
  departure_basis_at VARCHAR(40) NOT NULL,
  penalty_tier VARCHAR(20) NOT NULL,
  theoretical_delta INTEGER NOT NULL,
  applied_delta INTEGER NOT NULL,
  monthly_ordinal INTEGER NOT NULL,
  review_status VARCHAR(20) NOT NULL,
  reviewed_at VARCHAR(40),
  ledger_id INTEGER,
  idempotency_key VARCHAR(120) NOT NULL,
  created_at VARCHAR(40) NOT NULL
);
CREATE UNIQUE INDEX ux_credit_exit_event_idempotency
  ON credit_exit_event (user_id, trip_id, idempotency_key);
CREATE INDEX ix_credit_exit_event_user_time
  ON credit_exit_event (user_id, exit_at);

CREATE TABLE credit_restriction (
  id INTEGER NOT NULL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  trigger_reason VARCHAR(40) NOT NULL,
  trigger_score INTEGER NOT NULL,
  triggered_at VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL,
  active_flag INTEGER,
  lifted_at VARCHAR(40),
  lift_reason VARCHAR(40),
  trigger_ledger_id INTEGER
);
CREATE UNIQUE INDEX ux_credit_restriction_active
  ON credit_restriction (user_id, active_flag);
CREATE INDEX ix_credit_restriction_user_status
  ON credit_restriction (user_id, status);

ALTER TABLE trip_applications ADD COLUMN status_reason VARCHAR(40);
```

- **时间：** 全部 UTC ISO-8601，与 `auth_sessions` / `credit_ledger` 一致；月度边界用 `TripTimeZoneConstant.ZONE` 解释。
- **active_flag：** active=1，lifted=NULL；唯一索引允许同一用户多条历史、最多一条 active（SQLite / H2 均允许多个 NULL）。
- **旧库：** `ALTER TABLE ... ADD COLUMN` 可空，不回填；旧申请 `status_reason` 为 NULL，读取兼容。
- **账本：** 不新增列；新增原因码 `EXIT_BEFORE_TRIP` / `EXIT_DURING_TRIP` / `EXIT_BEFORE_TRIP_NO_PENALTY` / `EXIT_FORCE_MAJEURE_PENDING` / `EXIT_SAFETY_PENDING`；`related_type=TRIP`，`related_id=tripId`。
- **系统取消：** 复用 `trip_plans.cancelled_at` / `cancel_reason` / `cancel_note`；`cancel_reason='credit_restricted'`，`cancel_note='信用分低于 60，账号受限'`；不新增列。

## 3. 后端组件与依赖

```
controller
  ApplicationController ──> CreditEnforcementService
  TripController        ──> CreditRestrictionGuard (create/cancel/complete/updateMeeting)
  UserProfileController ──> CreditRestrictionGuard (save/avatar)
  ExperienceController  ──> CreditRestrictionGuard (upsert)
  ChatController        ──> CreditRestrictionGuard (send)
service
  CreditEnforcementService (preview / leave / review / isRestricted)
    ├─ CreditExitCalculator (pure)
    ├─ CreditExitEventMapper / CreditRestrictionMapper
    ├─ CreditService (read / book)
    ├─ ApplicationService (findAccepted / acceptedByUser / markLeft / cancelPendingByUser)
    └─ TripPlanService (removeCompanion / cancelByCreditRestriction / cancelUnfinishedByPublisher)
  CreditRestrictionGuard (leaf)
    ├─ CreditService
    └─ CreditRestrictionMapper
  CreditServiceImpl
    └─ ApplicationEventPublisher -> CreditChangedEvent -> CreditEnforcementEventListener
```

- **`CreditChangedEvent`**：`userId` / `scoreBefore` / `scoreAfter` / `ledgerId` / `reasonCode` / `occurredAt`；`CreditServiceImpl.book` 在账户更新后、`applied != 0` 时发布；`@EventListener` 同步执行，仍在 `book` 的事务内。
- **`CreditRestrictionGuard`**：`requireNotRestricted(userId)` 读 `CreditService.read` 与 active restriction；`score < 60` 或存在 active 记录 → `CreditRestrictedException`（403 `CREDIT_RESTRICTED`）。
- **`CreditEnforcementService`**：`previewExit` / `leave` / `reviewExit` / `isRestricted`；`leave` 与 `reviewExit` 为 `@Transactional`。
- **`ApplicationService` 扩展：** `findAccepted(tripId, userId)`（public）、`acceptedByUser(userId)`、`markLeft(applicationId, statusReason, at)`、`cancelPendingByUser(userId, statusReason, at)`、`cancelPending(tripId, statusReason, at)`；退役 `leave`（由 `CreditEnforcementService.leave` 取代）。
- **`TripPlanService` 扩展：** `cancelByCreditRestriction(tripId, now)`、`cancelUnfinishedByPublisher(publisherId, now)`；现有 `cancel` / `complete` / `updateMeeting` / `create` 加 guard。
- **`TripCancelledEvent`：** 增加 `cancelReason`；发布者取消写原因 wire 值，系统取消写 `credit_restricted`；`onTripCancelled` 据此写 `status_reason`。
- **`TripCancelReasonEnum`：** 增加 `CREDIT_RESTRICTED("credit_restricted", "信用分低于 60，账号受限", true)`；`parse` 跳过 `systemOnly`。

## 4. 退出预览与退出流程

### 4.1 API

| 方法 | 路径 | 入参 | 出参 |
|---|---|---|---|
| GET | `/api/trips/{tripId}/leave-preview` | `X-User-Id` + `reason`（personal / force_majeure / safety） | `LeavePreview` |
| POST | `/api/trips/{tripId}/leave` | `X-User-Id` + `{reason}` | `LeaveResult`（200） |

`LeavePreview`：`reason` / `departure_at` / `penalty_tier` / `theoretical_delta` / `applied_delta` / `monthly_ordinal` / `monthly_doubled` / `counted` / `review_status` / `resulting_score` / `message_code`。

`LeaveResult`：`credit_score` / `credit_level` / `credit_restricted` / `theoretical_delta` / `applied_delta` / `monthly_ordinal` / `review_status` / `message_code`。

`message_code`：`penalty` / `penalty_doubled` / `no_penalty` / `during_trip` / `pending_review` / `at_floor`。

### 4.2 计算

1. 校验：非发布者、必须 ACCEPTED、行程未 COMPLETED/CANCELLED；限制账号 → 403 `CREDIT_RESTRICTED`。
2. 出发基准：`meeting_time` 非空 → `LocalDateTime.parse` + `TripTimeZoneConstant.ZONE`；解析失败或为空 → `trip.plannedStart()`。
3. 档位：`duration = Duration.between(now, basis)`；`>=7d` ge7d；`>=3d` d3to7d；`>=24h` h24to72；`>=12h` h12to24；`>=0` lt12h；否则 during。
4. 基础分：ge7d 0 / d3to7d -3 / h24to72 -5 / h12to24 -8 / lt12h -10 / during -15。
5. 月度：`monthStart = exitAt.atZone(ZONE).withDayOfMonth(1).atStartOfDay(ZONE)`；`monthEnd = +1 month`；统计 `credit_exit_event` 中 `exit_at` 在区间、`penalty_tier in (d3to7d,h24to72,h12to24,lt12h)`、`review_status != pending` 的行数（包含 `verified_false` 与 0 分裁断事件）。
6. 个人原因且基础分 <0：`ordinal = count + 1`；`doubled = ordinal >= 2`；`theoretical = base * (doubled ? 2 : 1)`；`counted = true`。
7. 个人原因且 ≥7d：`ordinal=0`、`theoretical=0`、`counted=false`、`review=not_required`。
8. 旅行中：`ordinal=0`、`theoretical=-15`、`counted=false`、`review=not_required`。
9. 不可抗力 / 安全：`ordinal=0`、`theoretical=0`、`counted=false`、`review=pending`。
10. `applied = clamp(currentScore + theoretical) - currentScore`；`resulting = currentScore + applied`；若 `currentScore=0 && theoretical<0` → `message=at_floor`。
11. 预览不写库；`leave` 确认时重算；若结果与预览不一致，以确认结果为准（前端展示实际结果）。

### 4.3 退出事务

`CreditEnforcementService.leave`：

1. 重算预览；不满足 → 抛既有 403 / 409 / 400。
2. `tripPlanService.removeCompanion(tripId)`（人数 -1；满员回退招募中）。
3. `applicationService.markLeft(accepted.id(), USER_EXIT, now)`。
4. `creditService.book(new CreditBooking(userId, reasonCode, theoretical, "TRIP", tripId, "exit:"+userId+":"+tripId))`；`reasonCode` 按原因 / 档位 / pending 选择。
5. 查 `credit_ledger` by idempotencyKey 得 `ledgerId`；写 `credit_exit_event`（唯一键冲突 → 幂等返回已有事件）。
6. 返回 `LeaveResult`；若 `book` 触发限制，`CreditChangedEvent` 监听器已在同一事务内完成清理。
7. 任一步失败 → 整体回滚；重复提交返回同一结果，不重复扣分。

## 5. 限制触发 / 解除 / 自动清理

### 5.1 触发

`CreditEnforcementEventListener.onCreditChanged`：

- `before >= 60 && after < 60` → `activateRestriction`。
- `before < 60 && after >= 60` → `liftRestriction`。
- 其他（含仍在同侧）→ no-op。

`activateRestriction`：

1. 若已有 active 记录 → no-op（幂等）。
2. 插入 `credit_restriction`：`type=auto_credit`、`trigger_reason=CREDIT_SCORE_BELOW_60`、`trigger_score=after`、`status=active`、`active_flag=1`、`trigger_ledger_id`。
3. `applicationService.cancelPendingByUser(userId, "CREDIT_RESTRICTION", now)`。
4. `applicationService.acceptedByUser(userId)`：对每条，`tripPlanService.require(tripId).status(now)` 不是 COMPLETED/CANCELLED → `removeCompanion` + `markLeft(..., "CREDIT_RESTRICTION", now)`。
5. `tripPlanService.cancelUnfinishedByPublisher(userId, now)`：RECRUITING/FULL/ONGOING → 系统取消，发 `TripCancelledEvent(..., "credit_restricted")`。
6. 不写退出账本、不增加月度次数。

`liftRestriction`：

1. 查 active；无 → no-op。
2. 更新 `status=lifted`、`active_flag=NULL`、`lifted_at`、`lift_reason=SCORE_RECOVERED_TO_60`。
3. 不恢复原申请 / 同行关系 / 已取消行程。

### 5.2 只读守卫

| 入口 | 方法 | 错误 |
|---|---|---|
| 发布行程 | `TripPlanService.create` | 403 `CREDIT_RESTRICTED` |
| 编辑行程 / 集合 | `TripPlanService.updateMeeting` | 同上 |
| 取消 / 结束行程 | `TripPlanService.cancel` / `complete` | 同上 |
| 申请加入 | `ApplicationService.apply` | 同上 |
| 撤回申请 | `ApplicationService.cancel` | 同上 |
| 接受 / 拒绝申请 | `ApplicationService.decide` | 同上 |
| 退出同行 | `CreditEnforcementService.leave` | 同上（正常已被自动清退） |
| 发布 / 编辑体验 | `ExperienceService.upsert` | 同上 |
| 上传 / 删除体验照片 | `ExperiencePhotoService` | 同上 |
| 发送聊天消息 | `ChatService.send` | 同上 |
| 保存资料 / 上传头像 | `UserProfileService.save` / `uploadAvatar` | 同上 |
| 查看 / 举报 / 安全 / 登录退出 | 不拦 | — |
| 系统清退 | `markLeft` / `cancelPendingByUser` / `cancelByCreditRestriction` | 绕过 guard |

## 6. 系统取消与申请状态原因

- `TripPlanServiceImpl.cancelByCreditRestriction`：允许 RECRUITING/FULL/ONGOING；条件更新 `cancelledAt IS NULL AND completedAt IS NULL`；写 `cancel_reason=credit_restricted`、`cancel_note=信用分低于 60，账号受限`；发事件；已完成/已取消 no-op。
- `cancelUnfinishedByPublisher`：按 publisher 查未结束行程，逐条调用；同一事务；幂等。
- `ApplicationServiceImpl.onTripCancelled`：`event.cancelReason == credit_restricted` → PENDING 的 `status_reason=CREDIT_RESTRICTION`；否则 `TRIP_CANCELLED`。
- 现有用户取消：`cancel` → `status_reason=USER_CANCEL`；`leave` → `USER_EXIT`；`reject` → `PUBLISHER_REJECT`；`onTripCompleted` → `TRIP_COMPLETED`。
- `TripCancelReasonEnum.parse` 拒绝 `credit_restricted`；请求 enum 不含它；响应 enum 含它；前端 `cancelReasonLabel` 映射「信用分低于 60，账号受限」。

## 7. 契约 0.20.0

| 变更 | 内容 |
|---|---|
| 新路径 | `GET /trips/{tripId}/leave-preview`；`POST /trips/{tripId}/leave` 改请求体与 200 响应 |
| 新 schema | `LeavePreview` / `LeaveRequest` / `LeaveResult` |
| `UserCreditEntry` | `credit_restricted`（boolean，required） |
| `UserProfile` | `credit_restricted`（boolean，required）；`credit_restriction_reason`（nullable，仅本人；enum `CREDIT_SCORE_BELOW_60`） |
| `TripDetail.cancel_reason` | 响应 enum 加 `credit_restricted`；`TripCancelRequest.reason` 保持 8 项 |
| 错误 | `CREDIT_RESTRICTED`（403）；`INVALID_INPUT`（400）；`FORBIDDEN`（403）；`TRIP_NOT_OPEN`（409） |
| 示例 | 48h -5、7d 0、待核实、0 分裁断、旅行中 -15、限制中本人/他人 |

## 8. 前端设计

- **`CreditProvider` / `useMyCredit`：** 登录后加载 `GET /api/users/credits?ids={me}`；暴露 `restricted` / `score` / `refresh`；页面用 `restricted` 做入口禁用与提示；个人主页仍用自己的 `UserProfile` 拿原因。
- **`TripLeaveModal`：** 三个入口共用；原生 `<select>`（Edge / antd 浮层既有兼容问题）；选择原因后请求预览；确认调 `leaveTrip`；成功回调刷新；错误映射 `CREDIT_RESTRICTED` / `FORBIDDEN` / `TRIP_NOT_OPEN` / `INVALID_INPUT`；安全原因成功后可引导到既有举报入口。
- **五展示面：** `ProfilePage` / `ProfileModal` / 详情发布者行 / `TripCard` / `ApplicationsPage` 在信用行旁渲染「限制中」徽标；本人主页在徽标下渲染原因与「分数回到 60 分及以上自动解除」；他人不渲染原因。
- **拦截提示：** `CreditRestrictedNotice` 组件；发布页 / 分享页 / 详情申请区 / 申请处理 / 聊天输入 / 资料编辑使用；文案「信用分低于 60，当前账号仅可查看；分数回到 60 分及以上自动解除」。
- **聊天：** `ChatMain` 在 `restricted` 时把输入区替换为提示，历史消息仍可读；`ChatPage` 的退出按钮打开 `TripLeaveModal`。
- **导航：** `AppShell` 的「发布行程」在 `restricted` 时禁用并提示。
- **无明细：** 不新增明细页 / 历史列表 / 原因列表；不展示账本。
- **样式：** 复用 `.profile-credit` / `.badge` / `.chip`；新增 `.credit-restricted-badge` / `.restriction-note` / `.leave-preview` / `.blocked-notice`；不引入第二套组件库。

## 9. 测试策略

| 层 | 内容 |
|---|---|
| 单元 | `CreditExitCalculator` 六档边界 / 月度序号 / 待核实；`CreditRestrictionGuard`；`CreditEnforcementService` 触发/解除/清理（mock）；`CreditServiceImpl` 事件发布；前端 `creditDisplay` / `creditRestriction` 纯函数 |
| API | A1–A5（见 `atdd-design.md`）；`@SpringBootTest + MockMvc`；低信用由测试内 `CreditService.book` 触发；不新增写接口 |
| 迁移 | V25 空库 + V20→V25 双引擎；`status_reason` 可空；active 唯一 |
| 契约 | `OpenApiTest`；Redocly lint 0 error |
| E2E | E1–E3；退出用真实 API 造数；限制展示用 `page.route` 模拟；断言五展示面、原因、拦截、系统取消原因 |
| 回归 | 注册 / 登录 / 资料 / 行程 / 申请 / 聊天 / 体验 / 取消 / 信用展示既有用例全绿 |

## 10. 风险与跟踪项

| 风险 | 缓解 |
|---|---|
| `ApplicationService ↔ CreditEnforcementService` 循环依赖 | D4：guard 是叶子；enforcement 单向依赖 application/trip；控制器调 enforcement |
| `CreditService.book` 事件监听器在单元测试中意外触发 | `CreditServiceImplTest` 用 mock publisher；Spring 测试显式造低信用并断言清理 |
| 自动清理跨域事务大 | 同事务；按 user 查 pending/accepted/published；索引 `(user_id, status)` / `(publisher_id)`；P4 用集成测试锁定无半状态 |
| H2 对 `active_flag` 唯一索引 | 用 `(user_id, active_flag)` + NULL 可重复；迁移测试覆盖 |
| 系统原因被发布者伪造 | `systemOnly` + `parse` 拒绝；请求 enum 不含 |
| 限制原因泄漏 | `UserProfileResponse` 仅本人带 reason；他人 `NON_NULL` 省略；E2E 断言 |
| 低信用测试数据 | API 测试内 `CreditService.book`；E2E `page.route`；不新增管理员/写接口 |
| 契约 / 迁移号 | 0.20.0 + V25；P4 落库前排他确认 |
| 待核实核实无管理端 | 领域方法 `reviewExit` + 单测；无 controller；未来 change 接管理端 |
| 无恢复关系 | 明确写进 Delta / 设计 / 文案；P4 反向断言 |

## 11. 对齐自检

- **Spec ↔ Design：** 9 Requirement / 46 Scenario 均有设计落点；无新增 Requirement；无静默删减。
- **Design ↔ ATDD：** A1–A5 / E1–E3 覆盖 46 场景；Defer UT 只列纯逻辑；Non-goal 反向验证表齐备。
- **Tasks ↔ Design：** `tasks.md` 每条任务标注层（backend / frontend / contract / docs）与验证命令；契约与迁移排在两端之前。
- **未决：** 无阻塞；契约 / 迁移号与低信用测试数据为 P4 前置确认项。
