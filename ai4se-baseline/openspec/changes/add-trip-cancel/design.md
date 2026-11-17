# 技术设计 — add-trip-cancel（REQ-019 / issue #28）

- **Change：** `add-trip-cancel`
- **输入：** Delta Spec（`specs/trip-cancellation/spec.md`）、`atdd-design.md`、G1 决策 C1–C7、`proposal.md`
- **范围：** 设计决策与实现落点；不含业务代码

## 1. 现状与约束

- 状态是派生值：`TripPlan.status(Instant)` 只看 `completedAt`、日期与人数，共四态；`trip_plans` 无取消列。
- `TripPlanServiceImpl` 注入 `Clock`，`materializeIfExpired` 用条件更新写 `completed_at` 并发布 `TripCompletedEvent`；`ApplicationServiceImpl` 监听事件批量取消 PENDING。
- 开放列表 SQL 用 `completed_at IS NULL AND end_date >= today`；到期物化 `selectExpiredIds` 只排除 `completed_at`。
- `ChatServiceImpl.send` 只拒绝 `COMPLETED`；`ExperienceServiceImpl` 只允许 `COMPLETED`；`UserProfileStatsServiceImpl` 把全部发布行程计入「发布行程」。
- 契约 0.11.0，`TripPlan.status` 四态枚举；Flyway head `V17`；`OpenApiTest` 断言版本。
- 原型已有详情页「取消行程」按钮、二次确认与 `CANCELLED` 徽标，但没有原因选择、我的旅行入口与取消原因展示。
- `TripDetailResponse.from` 不接收请求人，无法按角色裁剪取消原因；`TripController.detail` 已有 `userId` 与 `ApplicationService.isAccepted`。

## 2. 决策

### D1 数据模型与状态优先级

- **Context：** 取消态不可观测；取消时间、原因与说明需要持久化。
- **Decision：** 新增迁移 `V19__trip_cancellation.sql`：
  - `ALTER TABLE trip_plans ADD COLUMN cancelled_at TEXT;`
  - `ALTER TABLE trip_plans ADD COLUMN cancel_reason TEXT;`
  - `ALTER TABLE trip_plans ADD COLUMN cancel_note TEXT;`
  - `CREATE INDEX idx_trip_plans_cancelled_at ON trip_plans(cancelled_at);`
  - `TripPlan` record 末尾追加 `Instant cancelledAt, String cancelReason, String cancelNote`；`TripPlanEntity` 同步映射。
  - `TripStatusEnum` 增加 `CANCELLED("cancelled", "已取消")`。
  - `status(now)` 优先级：`cancelledAt != null` → `CANCELLED`；其余顺序不变。`endingSoon` 在非 `ONGOING` 时返回 false。
- **Alternatives：** 独立 `trip_cancellations` 表（多一次查询与 join）；持久化 status 列（与现有派生模型冲突）。
- **Impact：** `TripPlan.create` / `withId` / `withMeetingInfo` / `TripPlanEntity.toTripPlan` 的构造参数补齐；测试工厂 `TripPlanStatusTest` / `TripMatchTest` 同步补三列；旧数据三列为 NULL，按原四态推导。

### D2 取消动作、并发与事件

- **Context：** 取消必须只成功一次，且与「结束 / 到期物化」互斥。
- **Decision：**
  - 新增 `TripCancelReasonEnum`（8 项，wire 值：`personal` / `time_changed` / `plan_changed` / `not_enough_people` / `weather` / `illness` / `safety` / `other`）；`TripCancelRequest(String reason, String note)`。
  - `TripPlanService.cancel(long tripId, long publisherId, TripCancelRequest request)`：
    1. `requireCurrent`（先物化；已取消直接进入状态判断）。
    2. 非发布者 → `ForbiddenActionException`（403）。
    3. `status(now)` 不属于 `{RECRUITING, FULL}` → `TripNotOpenException`（409）。
    4. 校验原因；`other` 的说明必填 1–100 字，其他原因说明可空但 ≤100 字；trim 后存储。
    5. 条件更新：`WHERE id = ? AND cancelled_at IS NULL AND completed_at IS NULL`，写入 `cancelled_at / cancel_reason / cancel_note / updated_at`；影响行数为 0 → 重新读取后按状态抛 409（并发只成功一次）。
    6. 更新成功 → `publishEvent(new TripCancelledEvent(tripId, now))`；返回最新行程。
  - `ApplicationServiceImpl` 增加 `@EventListener onTripCancelled`，复用 `cancelPending(tripId, cancelledAt)`；同步监听、同事务。
- **Alternatives：** 直接注入 `TripApplicationMapper`（跨能力写）；先查后写（并发双写）。
- **Impact：** `TripController` 增加 `POST /api/trips/{tripId}/cancel`；新增 `TripCancelledEvent`；`ApplicationServiceImpl` 增加监听器。

### D3 终态互斥（取消后全部关闭）

- **Context：** 取消后若仍能结束、编辑、接受申请或退出，会出现矛盾数据。
- **Decision：**
  - `materializeIfExpired`：`cancelledAt != null` 直接返回；条件更新与 `selectExpiredIds` 增加 `cancelled_at IS NULL`。
  - `complete`：条件更新增加 `cancelled_at IS NULL`；状态非 `ONGOING` 已覆盖取消。
  - `addCompanion` / `removeCompanion` / `updateMeeting`：`CANCELLED` 与 `COMPLETED` 同样拒绝（409）。
  - `ApplicationServiceImpl.apply`：`CANCELLED` 不属于开放状态 → 409；`decide`：状态为 `CANCELLED` 时 409；`leave` 经 `removeCompanion` 拒绝。
  - `ChatServiceImpl.send`：`COMPLETED || CANCELLED` → `ChatReadOnlyException`；历史读取与 `partners` 不变。
  - `ExperienceServiceImpl`：既有「仅 `COMPLETED`」判断天然拒绝取消，补回归即可。
- **Alternatives：** 只堵前端入口（可绕过）；把取消映射为 `COMPLETED`（丢失语义与统计口径）。
- **Impact：** 现有测试需覆盖取消分支；`ApplicationServiceImpl.decide` 增加取消判断。

### D4 列表、我的旅行与统计

- **Context：** 列表必须排除取消；我的旅行要保留历史；统计要排除取消。
- **Decision：**
  - `TripPlanMapper.xml` 的 `openTripFilter` 增加 `AND t.cancelled_at IS NULL`；`selectExpiredIds` 增加同条件。
  - `latestOpenByPublisher` 增加 `isNull(TripPlanEntity::getCancelledAt)`。
  - `findAllTrips` 保留取消行程；`MyTripsServiceImpl` 无需改分组：`matched` 的 `status != COMPLETED` 会保留取消，`completed` 只取 `COMPLETED`，取消不会进入已完成；PENDING 已被事件清零。
  - `UserProfileStatsServiceImpl` 的 `published` 过滤 `status != CANCELLED`；`completed` 与 `joined` 口径不变。
- **Alternatives：** 在应用层过滤列表（分页总数会错）；把取消归入已完成（违反 R3）。
- **Impact：** `TripPlanMapper.xml`、`TripPlanServiceImpl.latestOpenByPublisher`、`UserProfileStatsServiceImpl`；首页与匹配共用过滤。

### D5 取消原因可见性与响应裁剪

- **Context：** 原因与说明只对发布者与已接受同行者可见；前端隐藏不算安全。
- **Decision：**
  - `TripDetailResponse` 增加 `cancelledAt`、`cancelReason`、`cancelNote`。
  - `TripDetailResponse.from(..., boolean includeCancelDetail)`：`includeCancelDetail == false` 时 `cancelReason` / `cancelNote` 一律为 null；`cancelledAt` 所有请求人可见。
  - `TripController` 统一计算：`userId != null && (trip.publisherId() == userId || applicationService.isAccepted(tripId, userId))`；取消接口自身传 true。
  - `TripSummaryResponse` 不增加原因字段，避免列表与申请响应泄漏；状态仍通过 `status` 暴露。
- **Alternatives：** 前端按角色隐藏（可绕过）；详情响应永远带原因（泄漏）。
- **Impact：** `TripDetailResponse`、`TripController` 的 detail / create / complete / updateMeeting / cancel 调用点；`TripDetailResponse` 测试增加 PENDING / 路人断言。

### D6 契约 0.13.0

- **Context：** 新增状态、取消字段与取消端点。
- **Decision：** `openapi.yaml` 升 `0.13.0`：
  - `TripPlan.status` 枚举加 `cancelled`，描述改为五态与优先级「已取消 > 已结束 > 旅行中 > 已满员 > 招募中」。
  - `TripDetail` 增加 `cancelled_at`（nullable, readOnly）、`cancel_reason`（nullable, readOnly, 8 项枚举）、`cancel_note`（nullable, readOnly, maxLength 100）。
  - 新增 `TripCancelRequest`：`reason` 必填 8 项枚举；`note` nullable ≤100。
  - 新增 `POST /trips/{tripId}/cancel`：200 `TripDetail`；400 `INVALID_INPUT`；401；403 `FORBIDDEN`；404 `TRIP_NOT_FOUND`；409 `TRIP_NOT_OPEN`。
  - 错误枚举不变（`CHAT_READ_ONLY` / `EXPERIENCE_NOT_ALLOWED` 已存在）。
- **Alternatives：** 0.12.0（与 `add-ai-itinerary` 冲突）；不加端点用 `complete` 复用（语义错误）。
- **Impact：** `OpenApiTest` 版本与枚举断言；前端 `types.ts`；Redocly lint；若号段被占用则整体顺延。

### D7 前端入口、弹窗与状态

- **Context：** 详情页与我的旅行都要能取消；原因与二次确认要可操作；取消后界面要一致。
- **Decision：**
  - `TripStatus` 加 `'cancelled'`；`statusLabel` →「已取消」；`statusTone` 新增 `danger`，`statusColor` → `red`；`StatusBadge` 新增取消图标。
  - 新增 `TripCancelModal`（`frontend/src/trips/TripCancelModal.tsx`）：8 项原因 Select、说明 TextArea（≤100，`other` 必填）、影响提示、二次确认按钮；提交调 `cancelTrip`，409/403 映射文案。
  - `TripDetailPage`：发布者且 `recruiting/full` 显示「取消行程」；取消成功后 `reload()` 并停留详情（可看到已取消态）；已取消时展示状态与原因（有权限时），隐藏结束 / 编辑 / 申请 / 体验；ACCEPTED 保留聊天入口。
  - `MyTripsPage`：`published` 组 `recruiting/full` 行内增加「取消行程」，复用同一 Modal；取消后 `reload()`；`cancelled` 显示「已取消」与说明 note，不显示结束 / 申请 / 编辑。
  - `applicationEntryState`：`trip.status === 'cancelled'` 优先于 pending；ACCEPTED 返回 `cancelled` kind（可聊天、不可退出），其他返回 `unavailable`（「行程已取消」）。
  - `ChatPage` / `Experience`：聊天只读提示「该行程已取消」；体验入口在取消时隐藏。
- **Alternatives：** 只在详情页做（不满足 D2）；两个页面各写一套弹窗（重复与漂移）。
- **Impact：** `types.ts`、`api.ts`、`tripStatus.ts`、`StatusBadge.tsx`、`tripMessages.ts`、`TripDetailPage.tsx`、`MyTripsPage.tsx`、`mineTrips.ts`、`applicationEntry.ts`、`ChatPage.tsx`、`TripCancelModal.tsx`、`styles.css`。

### D8 原型先行

- **Context：** `prototype-ui-alignment` 要求先改原型再改实现。
- **Decision：** 在 `docs/prototype/` 完成：
  - `data.js` 增加 `CANCEL_REASONS`（8 项）。
  - `ui.js` 详情页已取消态展示原因（发布者 / 同行者）、我的旅行发布组增加「取消」入口、已取消时隐藏结束 / 申请 / 编辑。
  - `main.js` 用专用取消弹窗替换 `askConfirm`，校验原因与说明后调用 `S.cancelTrip(id, reason, note)`。
  - `store.js` 的 `cancelTrip` 记录 `cancelledAt / cancelReason / cancelNote`，仍只取消 PENDING。
  - `styles.css` 增加 `.action-note.danger`。
- **Alternatives：** 直接改实现（违反项目规则）。
- **Impact：** 原型四文件；P4 实现按原型对齐 1440 / 1024 / 768 / 390 与深浅主题。

### D9 测试、兼容与回滚

- **Context：** 取消是终态，需覆盖并发、旧数据与跨能力回归。
- **Decision：**
  - 新增 `TripCancellationApiTest`（固定 Clock）：取消成功、原因校验、403 / 409、并发条件更新、PENDING 自动取消、ACCEPTED 保留、聊天只读、体验拒绝、统计排除、列表与分页排除、原因裁剪。
  - `TripPlanStatusTest` 增加「取消优先于日期与人数」；`ApplicationServiceTest` 增加取消后申请 / 处理 / 退出拒绝；`ChatControllerTest` 与 `ExperienceServiceTest` 补取消分支。
  - 迁移用 SQLite 测试验证列存在与旧行 NULL 兼容；无数据回填。
  - 回滚：代码回滚后取消列保留，行程回到日期推导（可能显示已结束）；可接受，P5 记录。
- **Alternatives：** 只做 E2E（错误定位差）；不做并发测试（双写风险）。
- **Impact：** 后端 5 个测试类、前端 Vitest、E2E `trips.spec.ts` / `companions.spec.ts` / `experiences.spec.ts`。

## 3. 实现落点清单

| 层 | 文件 |
|---|---|
| 迁移 | `backend/src/main/resources/db/migration/V19__trip_cancellation.sql` |
| 领域 | `pojo/TripPlan.java`、`entity/TripPlanEntity.java`、`enums/TripStatusEnum.java`、`enums/TripCancelReasonEnum.java`、`request/TripCancelRequest.java` |
| 服务/事件 | `service/TripPlanService(+Impl)`（cancel）、`service/TripCancelledEvent.java`、`service/impl/ApplicationServiceImpl`（监听 + decide）、`service/impl/ChatServiceImpl`、`service/impl/UserProfileStatsServiceImpl` |
| 查询 | `mapper/TripPlanMapper.java` / `resources/mapper/TripPlanMapper.xml` |
| 控制器/响应 | `controller/TripController.java`、`response/TripDetailResponse.java` |
| 契约 | `openapi.yaml` 0.13.0、`OpenApiTest` |
| 前端 | `types.ts`、`api.ts`、`tripStatus.ts`、`StatusBadge.tsx`、`tripMessages.ts`、`TripDetailPage.tsx`、`MyTripsPage.tsx`、`mineTrips.ts`、`applicationEntry.ts`、`ChatPage.tsx`、`TripCancelModal.tsx`、`styles.css` |
| 原型 | `docs/prototype/data.js`、`ui.js`、`main.js`、`store.js`、`styles.css` |
| 测试 | `TripCancellationApiTest`、`TripPlanStatusTest`、`ApplicationServiceTest`、`ChatControllerTest`、`ExperienceServiceTest`、`UserProfileControllerTest`、`MyTripsControllerTest`、`OpenApiTest`、Vitest、`e2e/tests/trips.spec.ts`、`companions.spec.ts`、`experiences.spec.ts` |

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 取消与结束并发双写 | 两条条件更新都带 `cancelled_at IS NULL AND completed_at IS NULL`；失败方重读后 409 |
| 到期物化把取消行程写成已完成 | `selectExpiredIds`、`materializeIfExpired`、`completeIfAbsent` 全部排除 `cancelled_at`；P4 回归 |
| 原因裁剪遗漏导致泄漏 | 只在 `TripDetailResponse.from` 一处组装；控制器统一算权限；PENDING / 路人断言 |
| 我的旅行分组回退 | `matched` 保留取消、`completed` 只取 `COMPLETED`；API 测试断言三组 |
| 契约号段冲突 | P3 定稿前复核 0.13.0 / V19；必要时顺延 |
| 原型与实现漂移 | 先改原型四文件；P4 按原型逐屏核对 |

## 5. 未决项

- 无业务未决项。`TripCancelReasonEnum` 的包名与事件类位置由 P4 按现有包结构落地。
- NFR（并发压测、取消量级监控）不在本 change，P4 验证报告注明 deferred。
