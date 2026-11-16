# 技术设计 — add-trip-completion（REQ-011 / S15）

- **Change：** `add-trip-completion`
- **输入：** Delta Spec、`atdd-design.md`、G1 决策 D1–D9、P3 前置决策 D10–D13
- **范围：** 设计决策与实现落点；不含业务代码

## 1. 现状与约束

- 状态是派生值：`TripPlan.status()` 只看 `completedAt` 与 `joinedCount`，无日期。
- `TripPlanServiceImpl` 注入 `Clock`（`ClockConfig` 为 `Clock.systemUTC()`），可直接复用。
- 列表 SQL 用 `completed_at IS NULL`；`MyTripsServiceImpl` 与 `UserProfileStatsServiceImpl` 用 `completedAt` 判定已完成。
- `ApplicationServiceImpl` 依赖 `TripPlanService`；`TripPlanService` 不能反向依赖申请服务，否则循环依赖。
- 契约 0.8.0；`OpenApiTest` 断言版本；种子行程 3/4 日期为 2026-11-16。

## 2. 决策

### D1 业务日期按 Asia/Shanghai 解释

- **Context：** `Clock` 是 UTC；旅行起止是日期，用户在中国。
- **Decision：** 新增 `TripTimeZone.ZONE = ZoneId.of("Asia/Shanghai")`；`startDate` / `endDate` 转瞬时一律用该 Zone：`startDate.atStartOfDay(ZONE)`、`endDate.plusDays(1).atStartOfDay(ZONE)`。所有状态判定、提醒窗口、发布“今天”校验共用。
- **Alternatives：** UTC（与 Clock 一致但会差 8 小时，凌晨边界错误）；服务器默认时区（部署环境漂移）。
- **Impact：** `TripPlan` 不持有 Zone，新增 `TripClock` 工具或 `TripPlan.status(Instant now)` 内部使用常量；测试固定 Clock 时同样按该 Zone 断言。

### D2 四态推导

- **Context：** 现有三态无法表达旅行中；日期必须参与。
- **Decision：** `TripPlan` 新增 `status(Instant now)`：
  1. `completedAt != null` 或 `now >= plannedEnd` → `COMPLETED`
  2. `now >= plannedStart` → `ONGOING`
  3. `joinedCount >= capacity` → `FULL`
  4. 否则 `RECRUITING`
  `status()` 保留并委托 `status(Instant.now())`，业务代码一律使用注入的 `Clock`。
- **Alternatives：** 持久化 `status` 列（需迁移 + 定时任务）；把日期判断散落在各服务（不可维护）。
- **Impact：** `TripStatusEnum` 增加 `ONGOING("ongoing","旅行中")`；所有 `trip.status()` 调用点改为 `trip.status(clock.instant())`（约 10 处）。

### D3 懒写入物化

- **Context：** 用户裁决 D10：读取到期行程时物化，不引入定时任务。
- **Decision：**
  - `TripPlanService.materializeIfExpired(long tripId)`：先 `require` 取实体；若 `completedAt == null && now >= plannedEnd`，执行条件更新 `UPDATE trip_plans SET completed_at = :plannedEnd, updated_at = :now WHERE id = :id AND completed_at IS NULL`；更新行数 > 0 时发布 `TripCompletedEvent`（含 tripId、completedAt）。
  - `TripPlanService.materializeExpired()`：查询 `completed_at IS NULL AND end_date < :today` 的 id 列表（SQL 简单），逐条调用物化；供列表/聚合查询前使用。
  - `TripPlanService.requireCurrent(long tripId)`：`materializeIfExpired` 后返回 `require`；所有写操作与详情读取使用。
  - 物化方法 `@Transactional`；条件更新保证并发幂等。
- **Alternatives：** 纯投影（申请无法真正取消）；定时任务（延迟窗口 + 调度配置）。
- **Impact：** `TripPlanMapper` 增加 `selectExpiredIds(today)` 与 `UPDATE` 必需的方法；`TripController.detail`、`complete`、`ApplicationServiceImpl.apply/decide/leave`、`ChatServiceImpl.send`、`ExperienceServiceImpl.requireCanShare` 改为 `requireCurrent`；列表/我的旅行/统计前调用 `materializeExpired`。

### D4 结束善后通过事件解耦

- **Context：** `trip-plans` 不能依赖 `trip-companions`（会循环依赖）。
- **Decision：** 定义 `TripCompletedEvent(long tripId, Instant completedAt)`（在 `service` 或 `event` 包）。`TripPlanServiceImpl` 在手动结束/自动物化且更新成功时 `publishEvent`。`ApplicationServiceImpl` 增加 `@EventListener` 方法 `cancelPendingOnTripCompleted`：`UPDATE trip_applications SET status='CANCELLED', decided_at=:now, updated_at=:now WHERE trip_id=:tripId AND status='PENDING'`。监听器与发布者同事务（Spring 默认同步），失败回滚。
- **Alternatives：** `TripPlanServiceImpl` 直接注入 `TripApplicationMapper`（跨 capability 写）；新建编排服务（增加层次）。
- **Impact：** 新增事件类与监听器；`ApplicationService` 增加 `cancelPending(long tripId, Instant now)` 供监听器调用；手动结束与自动完成行为一致。

### D5 结束权限与终态

- **Context：** 当前 `complete` 只拒绝 COMPLETED。
- **Decision：** `complete(tripId, userId)`：
  1. `requireCurrent`（先物化）
  2. 非发布者 → `ForbiddenActionException`（403）
  3. `status(now) != ONGOING` → `TripNotOpenException`（409）
  4. 条件更新 `completed_at = now`（手动时间），发布事件，返回最新行程
- **Alternatives：** 保留旧“任意未结束可结束”（违反 S15）。
- **Impact：** `TripControllerTest` 的结束用例需先构造 ongoing 行程；已结束/招募中/满员均断言 409。

### D6 申请与处理资格

- **Context：** 旅行中仍可申请；满员后仅可拒绝；结束后全部关闭。
- **Decision：**
  - `ApplicationServiceImpl.apply`：`requireCurrent`；本人 403；重复 409；`status` 不属于 `{RECRUITING, ONGOING}` 或 `joinedCount >= capacity` → `TripNotOpenException`。
  - `decide`：`requireCurrent`；非发布者 403；非 PENDING 409；`next == ACCEPTED` 时要求 `status ∈ {RECRUITING, ONGOING}` 且未满员，否则 409；`next == REJECTED` 时要求 `status != COMPLETED`。
  - `TripPlanService.addCompanion`：校验改为“未结束且未满员”，不再仅 RECRUITING；接受后状态由 D2 自动推导（未开始满员 → FULL；旅行中满员 → ONGOING）。
  - `removeCompanion`：保持仅拒绝 COMPLETED；旅行中退出不改变 ONGOING（D2 自动）。
- **Alternatives：** 拆分 `addCompanion` 为多个方法（接口膨胀）。
- **Impact：** 现有 `ApplicationServiceTest` 中“满员拒新申请”仍通过；新增 ONGOING 申请、满员仅拒绝、结束后拒绝用例。

### D7 列表与匹配参照

- **Context：** `completed_at IS NULL` 无法排除到期未物化行程。
- **Decision：** `TripPlanMapper.openTripFilter` 增加 `AND t.end_date >= #{today}`（today 由服务层按 D1 计算传入）；`selectOpenPage/selectOpenList` 参数增加 `today`。`latestOpenByPublisher` 改为先 `materializeExpired()` 再按 `completed_at IS NULL` 查询（保持参照物正确）。
- **Alternatives：** 仅依赖物化（并发/性能风险）；仅 SQL（参照物仍可能过期）。
- **Impact：** `TripPlanMapper.java`、`TripPlanMapper.xml`、`TripPlanServiceImpl.searchPage/findOpen/latestOpenByPublisher` 签名调整；匹配列表与首页共用过滤。

### D8 我的旅行与统计口径

- **Context：** 已完成只认 `completedAt`，自动完成不计入。
- **Decision：**
  - `MyTripsServiceImpl` 注入 `Clock`，查询前 `materializeExpired()`；`completed` 用 `status(now) == COMPLETED`；`matched` 用 `status(now) != COMPLETED` 且当前用户是已接受同行者。
  - `UserProfileStatsServiceImpl` 注入 `Clock`，`completed` 计数用 `status(now) == COMPLETED`。
- **Alternatives：** 只改统计不改分组（不一致）。
- **Impact：** 两个服务构造器增加 `Clock`；对应测试用固定 Clock 覆盖自动完成。

### D9 提醒字段与展示

- **Context：** 提醒窗口需服务端判定，避免前端时钟漂移。
- **Decision：** `TripPlan` 增加 `endingSoon(Instant now)`：`status(now) == ONGOING && now >= plannedEnd - 3h`。`TripSummaryResponse` 与 `TripDetailResponse` 增加 `boolean endingSoon`；`from(...)` 增加 `Instant now` 参数，调用方传 `clock.instant()`。前端 `TripSummary/TripDetail` 增加 `ending_soon`；详情页与我的旅行按“当前用户是发布者或已接受同行者”展示提示。
- **Alternatives：** 前端用 `end_date` 计算（时钟不可靠）；新增提醒表（MVP 不需要去重）。
- **Impact：** 7 处 `TripSummaryResponse.from` / `TripDetailResponse.from` 调用点增加 `now`；契约新增只读字段；`tripMessages` 新增提醒文案。

### D10 契约 0.9.0

- **Context：** 新增枚举值与响应字段。
- **Decision：** `openapi.yaml` 升 0.9.0：`TripSummary.status` / `TripDetail.status` 枚举加 `ongoing`；`TripSummary` / `TripDetail` 增加 `ending_soon`（boolean，readOnly）；`/trips/{tripId}/complete` 描述改为“仅发布者且仅 ongoing”；错误码不变。
- **Alternatives：** 0.8.1（低估枚举扩展影响）；不改契约（前端无类型依据）。
- **Impact：** `OpenApiTest` 版本与枚举断言；前端 `types.ts`、`TripStatus`；Redocly lint。

### D11 前端状态、入口与过期刷新

- **Context：** 详情页申请区已重构为内联 `applicationEntry.ts`；结束按钮仍为旧的 `!isCompleted`。
- **Decision：**
  - `TripStatus` 加 `'ongoing'`；`statusLabel` → “旅行中”；`statusTone/statusColor` 新增值；`StatusBadge` 新增“旅行中”图标（路径/脚印），`data-status="ongoing"`。
  - `tripMessages`：`detailMarkCompleted` 改为 `detailCompleteTrip: '结束行程'`（保留旧键别名或全量替换）；新增 `detailEndingSoon`、`detailCompleteHint`、`mineCompleteTrip`、`applicationsClosed`。
  - `TripDetailPage`：结束按钮条件改为 `isPublisher && trip.status === 'ongoing'`；确认文案“结束后不可恢复，同行申请将关闭，待处理申请会自动取消。”；`complete()` 失败时 `showActionError` 映射 409/403 并 `reload()`；提醒 Alert 放在状态区下方。
  - `applicationEntry.ts`：`apply` 分支允许 `recruiting` / `ongoing`；`unavailable` 仅 `completed` / `full`，原因沿用 `applyEnded` / `applyFull`；accepted 在 completed 时保留聊天入口、隐藏退出。
  - `MyTripsPage`：“我发布的”行内 `trip.status === 'ongoing'` 且当前用户是发布者时显示“结束行程”，复用二次确认 Modal；`trip.ending_soon` 显示提醒 badge；完成后 `reload()`。
  - `ApplicationsPage`：`trip.status === 'completed'` 隐藏接受/拒绝；`trip.status === 'full'` 或 `joined_count >= capacity` 时接受禁用、拒绝可用。
  - `ChatPage`：`completed` 时提示文案改为“该行程已结束，只能查看历史消息。”。
- **Alternatives：** 把结束按钮放进 `TripCard`（卡片整体是链接，嵌套交互风险）；只在详情页（不满足故事落点）。
- **Impact：** 详情页、我的旅行、申请页、聊天页、`tripStatus.ts`、`StatusBadge.tsx`、`tripMessages.ts`、`types.ts`；E2E 选择器同步。

### D12 发布校验

- **Context：** 过去日期会导致“发布即旅行中/已结束”。
- **Decision：** `TripPlanServiceImpl.create` 计算 `LocalDate today = LocalDate.ofInstant(now, TripTimeZone.ZONE)`；`TripPlan.create(draft, now, today)` 校验 `startDate < today` → `InvalidInputException`。当天发布 → D2 推导为 ONGOING。
- **Alternatives：** 允许过去日期并在投影中立即完成（演示混乱）。
- **Impact：** `TripPlan.create` 签名增加 `today`；`TripCreatePage` 前端最小日期设为今天；`TripControllerTest.VALID_TRIP` 改用相对日期。

### D13 测试、兼容与回滚

- **Context：** 固定 Clock 与相对日期夹具。
- **Decision：** 新增 `FixedClockTestConfig`（`@Primary`，`2026-11-16T09:00:00Z`，Asia/Shanghai）；仅相关测试 `@Import`。纯函数边界用 `TripPlan.status(now)`。E2E 统一相对日期。无数据库迁移；回滚代码后已物化的 `completed_at` 保留（数据仍为已结束，可接受）。列表 SQL 的 `end_date >= today` 与物化双保险。
- **Alternatives：** 全测试固定 Clock（影响生日/年龄）；改种子日期（迁移风险）。
- **Impact：** `TripControllerTest` 日期夹具、`trips.spec.ts` 结束用例、`OpenApiTest` 版本；`application.yml` 不改。

## 3. 实现落点清单

| 层 | 文件 |
|---|---|
| 领域 | `pojo/TripPlan.java`（status/endingSoon/plannedStart/plannedEnd）、`enums/TripStatusEnum.java`、`constant/TripTimeZoneConstant.java` |
| 服务 | `TripPlanService(+Impl)`（materialize/requireCurrent/complete/addCompanion）、`ApplicationService(+Impl)`（apply/decide/cancelPending/listener）、`MyTripsServiceImpl`、`UserProfileStatsServiceImpl` |
| 响应/契约 | `TripSummaryResponse`、`TripDetailResponse`、`MatchCandidateResponse`、`ExperienceResponse`、`ChatPartnerResponse`、`TripApplicationResponse`、`openapi.yaml` |
| 查询 | `TripPlanMapper.java` / `TripPlanMapper.xml`（today 过滤、expired ids） |
| 前端 | `types.ts`、`tripStatus.ts`、`StatusBadge.tsx`、`TripDetailPage.tsx`、`applicationEntry.ts`、`MyTripsPage.tsx`、`ApplicationsPage.tsx`、`ChatPage.tsx`、`tripMessages.ts`、`styles.css` |
| 测试 | `TripPlanStatusTest`、`TripCompletionApiTest`、`ApplicationServiceTest`、`MyTripsControllerTest`、`UserProfileControllerTest`、`OpenApiTest`、`trips.spec.ts`、`companions.spec.ts`、`experiences.spec.ts` |

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 懒写入放在读路径，事务边界遗漏导致申请未取消 | 物化方法 `@Transactional`；事件监听同事务；API 用例断言申请状态 |
| 事件监听器顺序/异常影响结束 | 同步监听、异常回滚；结束接口用例覆盖 |
| `status()` 旧调用点遗漏系统时钟 | P4 全量 grep，所有业务判断改 `status(clock.instant())`；纯函数测试兜底 |
| 契约新增 `ending_soon` 影响所有 from 调用点 | 编译期暴露；逐点补 `now`；`OpenApiTest` 断言 |
| E2E 依赖今天日期 | 相对日期夹具；不使用种子 3/4 的日期漂移断言 |
| 时区（Asia/Shanghai）与现有 UTC 时间戳混用 | 仅日期边界用 Zone；时间戳仍 UTC；D1 记录 |

## 5. 未决项（P4 前必须关闭）

- 无业务未决项。实现细节（事件类包名、`TripTimeZoneConstant` 命名）由 P4 按现有包结构落地。
