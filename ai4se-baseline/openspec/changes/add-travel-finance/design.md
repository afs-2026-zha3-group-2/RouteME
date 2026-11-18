# 技术设计 — add-travel-finance（REQ-028 / S29）

- **Change：** `add-travel-finance`
- **输入：** Delta Spec（`specs/travel-finance/spec.md`）、`atdd-design.md`、`proposal.md`（D1–D12）、`g1-decision.md`（C1–C5）、`dov-ac-review.md`、`consistency-lint.md`
- **范围：** 设计决策与实现落点；不含业务代码

## 1. 现状与约束

- 仓库没有钱包、余额、流水、保险记录或借款概念；`user_credit_account` 是只读 0–100 评分，不能承担支付语义；`budget_*_cents` 只是行程展示字段。
- 注册在 `AuthServiceImpl.register` 的同一事务内调用 `CreditService.ensureAccount`，可复用该模式初始化钱包。
- 同行判定只有两处来源：`trip_plans.publisher_id`（发布者）与 `trip_applications.status = ACCEPTED`；`ApplicationService.isAccepted(tripId, userId)` 已存在。
- 行程状态由 `TripPlan.status(now)` 派生（取消 > 结束 > 旅行中 > 满员 > 招募中）；`TripPlanService.requireCurrent` 先物化到期。
- 写守卫唯一入口是 `AccountStatusService.assertCanWrite(userId, WriteScopeEnum.BUSINESS)`：`BANNED` 全阻断，`SUSPENDED` 阻断 `BUSINESS`；没有全局拦截器，守卫由服务层调用。
- 身份为演示级 `X-User-Id`；Jackson 全局 `SNAKE_CASE`；借款金额沿用整数分（`*_cents`，`INTEGER` 列）。
- RouteME 不是保险机构：保险入口、提供方名称与条款 / 理赔 / 求助地址来自配置 `routeme.insurance.*`，RouteME 不参与定价、承保与理赔。
- 契约基线 0.17.0、Flyway head `V23`（P3 时点）；rebase 后 main 为 0.24.0 + `V29`，本 change 落定 **0.25.0 + `V30`**；`OpenApiTest` 断言 `info.version`。
- 迁移必须同时跑 SQLite（运行时 / 迁移测试）与 H2（Spring 测试）；两者都不支持可靠的部分唯一索引。
- 原型：P3 时点完成过金融页面；rebase 后 `docs/prototype/v1` 已由 main 归档且禁止结构性改动，原型改动撤回，界面证据以生产 UI 与 E2E 为准。

## 2. 决策

### D1 迁移 V30 与四表模型

- **Context：** 需要可扣款余额、可审计流水、第三方保险状态与借款订单；钱包只有借款两类流水。
- **Decision：** 新增 `V30__add_travel_finance.sql`，建四表（`INTEGER` 金额与既有 `budget_*_cents` 一致）：

  ```sql
  CREATE TABLE user_wallet (
      user_id INTEGER NOT NULL PRIMARY KEY,
      balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES app_users (id)
  );

  CREATE TABLE wallet_ledger (
      id INTEGER NOT NULL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      direction VARCHAR(8) NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      balance_before_cents INTEGER NOT NULL CHECK (balance_before_cents >= 0),
      balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
      entry_type VARCHAR(32) NOT NULL,
      related_type VARCHAR(32) NOT NULL,
      related_id VARCHAR(64) NOT NULL,
      occurred_at VARCHAR(40) NOT NULL,
      CHECK (balance_after_cents = balance_before_cents
             + CASE WHEN direction = 'CREDIT' THEN amount_cents ELSE -amount_cents END),
      FOREIGN KEY (user_id) REFERENCES app_users (id)
  );
  ```

  - `insurance_policy`：`id`、`user_id`、`trip_id`、`provider VARCHAR(128)`、`coverage_start VARCHAR(10)`、`coverage_end VARCHAR(10)`、`status VARCHAR(16)`、`confirmed_at VARCHAR(40)`。`CHECK (status IN ('ACTIVE', 'EXPIRED'))` 只约束取值；服务层只写 `ACTIVE`，`EXPIRED` 由读取时刻派生，不迁移。**不建**保费、保额、保单号、证件或银行卡列。
  - `travel_loan`：`id`、`user_id`、`trip_id`、`principal_cents`、`service_fee_cents`、`disbursed_cents`、`repay_cents`、`term_days`、`status`、`active_user_id`、`funded_at`、`due_at`、`repaid_at`；`CHECK (principal_cents BETWEEN 10000 AND 200000)`、`CHECK (service_fee_cents = principal_cents * 5 / 100)`、`CHECK (disbursed_cents = principal_cents - service_fee_cents)`、`CHECK (repay_cents = principal_cents)`。
  - 唯一索引：`ux_insurance_policy_user_trip (user_id, trip_id)`；`ux_travel_loan_active_user (active_user_id)`（`ACTIVE` 时等于 `user_id`，`REPAID` 时置 NULL，以此表达「每人最多 1 笔进行中」且不依赖部分索引）。
  - 普通索引：`ix_wallet_ledger_user_time (user_id, occurred_at)`、`ix_insurance_policy_user_time (user_id, confirmed_at)`、`ix_travel_loan_user_time (user_id, funded_at)`、`ix_travel_loan_trip (trip_id)`。
  - 四表均有 `FOREIGN KEY` 指向 `app_users`；保险与借款另指向 `trip_plans`。
  - 枚举落库用常量名（`CREDIT` / `DEBIT`、`ACTIVE`、`ACTIVE` / `REPAID`），响应输出 `wireValue`（`credit` / `active`），沿用 `trip_applications.status` 与 `TripApplicationResponse` 的既有约定。
  - 回填：`INSERT INTO user_wallet ... SELECT u.id, 1000000, '2026-11-17T00:00:00Z', ... FROM app_users u WHERE NOT EXISTS (...)`；`V30` 在 `V3/V14` 种子之后执行，演示账号同样获得 10,000 元。
- **Alternatives：** 复用信用账户（污染只读评分）；把保险 / 借款合并为通用订单表（演示阶段增加多态列与判空）；部分唯一索引（H2 不稳定）。
- **Impact：** `user_wallet` 以 `user_id` 为自然主键；其余三表沿用「当前最大 id + 1」主键约定；实体统一 `@TableId(type = IdType.INPUT)`。

### D2 钱包服务：CAS 扣款 / 入账与同事务流水

- **Context：** 余额是唯一真相，流水必须可回算；双击或并发不得双花。
- **Decision：**
  - `WalletService`：`WalletBalance ensureWallet(long userId)`、`WalletBalance read(long userId)`、`WalletPosting debit(userId, amountCents, entryType, relatedType, relatedId)`、`WalletPosting credit(...)`、`List<WalletLedgerEntry> ledgerOf(long userId)`。
  - `ledgerOf` 按 `occurred_at ASC, id ASC` 返回（升序），使「初始余额 + 入账 − 出账」可直接顺序回算，且每条流水的 `balance_before` 等于上一条 `balance_after`；前端按返回顺序渲染，不再自行排序。
  - 每次变更加载钱包 → 计算 `before / after` → 执行 CAS：
    ```sql
    UPDATE user_wallet SET balance_cents = #{after}, updated_at = #{now}
    WHERE user_id = #{userId} AND balance_cents = #{before}
    ```
    影响行数 1 才写流水；0 行则重读并重试，最多 5 次；扣款时若 `before < amount` 立即抛 `InsufficientBalanceException`（409 `INSUFFICIENT_BALANCE`）。
  - 流水追加：`nextId` 取 id；`DuplicateKeyException` 仅可能是 id 并发碰撞，重算 id 重试（最多 3 次）；流水无其他唯一键。
  - 非负约束由应用与 `CHECK (balance_cents >= 0)` 双重保证；`balance_after >= 0` 同样入库校验。
  - `ensureWallet` 缺失时插入初值 1,000,000；并发插入命中主键冲突则重读（复用 `CreditServiceImpl.ensureAccount` 模式）。
- **Alternatives：** `SELECT ... FOR UPDATE`（SQLite 不支持）；读后无条件 `UPDATE`（丢失更新）；先写流水后改余额（断链风险）。
- **Impact：** 新增 `WalletServiceImpl`、`WalletMapper`、`WalletLedgerMapper`、`WalletBalance` / `WalletPosting` / `WalletLedgerEntry` 领域对象；所有金融写方法 `@Transactional`，与业务写入同一事务。

### D3 第三方保险配置、保障类别与借款费率

- **Context：** RouteME 不设计保险、不计算保费；提供方与入口必须可配置，借款 5% 不得出现浮点尾差。
- **Decision：**
  - `InsuranceProperties`（`@ConfigurationProperties(prefix = "routeme.insurance")`）：`providerName`、`purchaseUrl`、`policyUrl`、`claimUrl`、`emergencyUrl`；空值回退到 `第三方保险机构（演示）` 与 `https://example.com/routeme/insurance/...`，生产通过环境变量覆盖。
  - `InsuranceProductEnum`：`ACCIDENT_MEDICAL`、`EMERGENCY_RESCUE`、`TRAVEL_BAGGAGE`（wire / 名称 / 范围摘要），**不含价格和保额**；只用于展示第三方保障类别。
  - `FinanceFeeConstant.FEE_RATE_PERCENT = 5` 仅服务借款：`fee = principal * 5 / 100`，`net = principal - fee`，`repay = principal`；本金必须是 100 的倍数（整元），因此恒为整数。
  - 投标入口只拼接 `trip_id`（URL 编码），不传用户身份、证件或保单信息。
- **Alternatives：** 价格入库 / 枚举内置价格（RouteME 无权定价）；`BigDecimal`（整数运算已足够）。
- **Impact：** `config/InsuranceProperties.java`、`config/InsuranceConfig.java`、`enums/InsuranceProductEnum.java`；`application.yml` 可覆盖但默认值即可运行。

### D4 第三方保险入口与状态回写

- **Context：** 入口只负责把用户送到第三方；状态只在第三方确认后回写，且要幂等、可派生到期。
- **Decision：**
  - `InsuranceService.purchaseUrl(long userId, long tripId)`：`requireTradable` → 返回 `purchaseUrl + "?trip_id=" + id`（已有 query 用 `&`）。不扣款、不写记录、不写流水。
  - `InsuranceService.confirm(long userId, long tripId)`：`requireTradable` → 已有记录直接返回 → 否则插入 `ACTIVE`，`coverage_start = trip.startDate()`、`coverage_end = trip.endDate()`、`confirmed_at = clock.instant()`。插入命中 `ux_insurance_policy_user_trip` → 返回已写入记录（并发安全）。
  - `requireTradable` 顺序：`requireCurrent(tripId)`（404）→ 发布者或 `isAccepted`（403 `FORBIDDEN`）→ 行程状态 ∈ {recruiting, full, ongoing}（409 `TRIP_NOT_OPEN`）→ `assertCanWrite(userId, BUSINESS)`（403 `ACCOUNT_*`）。
  - 状态派生（`InsurancePolicy.wireStatus(now)`）：`now` 的上海本地日期晚于 `coverage_end` → `expired`，否则 `active`；无记录时摘要为 `not_purchased` 且 `policy = null`。
  - 列表：`listByUser` 按 `confirmed_at DESC, id DESC`；行程页 `find(userId, tripId)` 单条。
- **Alternatives：** 站内购买并扣款（越界承保）；按行程风险多份记录（第三方不按 RouteMe 风险拆分）；落库 `EXPIRED`（需要定时任务与状态漂移处理）。
- **Impact：** 新增 `InsurancePolicyEntity` / `InsurancePolicyMapper` / `InsuranceServiceImpl`、`InsurancePolicy` 领域对象；`InsuranceSummaryResponse` 组装状态、提供方、类别、入口与记录。

### D5 借款发放：整元、净额、到期与单笔进行中

- **Context：** 借款要把「5% 从本金扣」和「应还 = 本金」同时表达清楚，并保证一人一笔进行中。
- **Decision：**
  - 入参 `principal_cents`（10,000–200,000，且 `% 100 == 0`）、`term_days ∈ {7, 14, 30}`；否则 400 `INVALID_INPUT`。
  - 顺序：入参 → `requireCurrent` → 同行者 → 行程状态 → `assertCanWrite(BUSINESS)` → 已有 `ACTIVE` 借款（409 `ACTIVE_LOAN_EXISTS`）→ 钱包入账净额（`principal - fee`）→ 插入借款。
  - `funded_at = clock.instant()`；`due_at = funded_at.plus(termDays, DAYS)`；忽略客户端 `due_at`。
  - 借款行 `status = ACTIVE`、`active_user_id = user_id`；插入命中 `ux_travel_loan_active_user` → 抛 `ActiveLoanExistsException`（409），事务回滚入账与流水。
  - 列表：`listByUser`、`listByTrip`，按 `funded_at DESC`；响应状态由 `status + due_at` 派生（见 D6）。
- **Alternatives：** 允许非整元（5% 出现角分，需要额外舍入规则）；把服务费加到应还（与发起人口径相反）；允许并行多笔（演示无法验证债务叠加）。
- **Impact：** 新增 `TravelLoanEntity` / `TravelLoanMapper` / `LoanServiceImpl`、`TravelLoan` 领域对象与响应；`LoanStatusEnum` 只落 `ACTIVE` / `REPAID`。

### D6 还款、逾期派生与状态机

- **Context：** 还款必须可结清、不可重复扣款；逾期只展示、不罚息。
- **Decision：**
  - 还款不调用 `assertCanWrite`，因此 `SUSPENDED` / `BANNED` 仍可还款；其余金融写操作保留 `BUSINESS` 守卫。
  - `LoanService.repay(long userId, long loanId)`：加载借款；不存在或 `user_id != userId` → 403 `FORBIDDEN`（不新增「借款不存在」码，避免泄漏他人订单存在性）→ 状态非 `ACTIVE` → 409 `LOAN_NOT_ACTIVE` → 钱包扣 `repay_cents`（409 `INSUFFICIENT_BALANCE`）→ 条件更新：
    ```sql
    UPDATE travel_loan SET status = 'REPAID', active_user_id = NULL, repaid_at = #{now}
    WHERE id = #{loanId} AND user_id = #{userId} AND status = 'ACTIVE'
    ```
    0 行 → 409 `LOAN_NOT_ACTIVE`（并发重复还款只成功一次，事务回滚扣款）。
  - 响应状态派生：`REPAID` → `repaid`；`ACTIVE && now.isAfter(dueAt)` → `overdue`；否则 `active`。`repay_cents` 恒等于本金，不追加罚息、不自动扣款。
- **Alternatives：** 落独立 `OVERDUE` 状态（需定时任务与状态漂移处理）；按账号状态阻断还款（债务永续）。
- **Impact：** 还款后 `active_user_id = NULL` 释放唯一索引，可再次借款；响应枚举含 `overdue`，DB 不含。

### D7 资格、账号状态与时间源

- **Context：** 入口与写端点都必须服务端判定；日期口径必须稳定。
- **Decision：**
  - `FinanceEligibility`：`eligible = participant && status ∈ {RECRUITING, FULL, ONGOING}`；`participant = trip.publisherId() == userId || applicationService.isAccepted(tripId, userId)`；非同行者 `ineligible_reason = not_participant`，同行者但行程 `completed` / `cancelled` → `trip_closed`。
  - 页面读取（`GET /trips/{tripId}/finance`）对无资格者返回 200 + `is_eligible=false`，仍返回自己的钱包与保险摘要（`purchase_url = null`）与借款，不返回可提交入口（前端按 `is_eligible` 控制）。
  - 投保入口 / 状态回写 / 借款：同行者 → 行程状态 → 账号状态；还款只校验归属与状态。
  - `companion_count` = `participants` 人数 − 1（排除发布者），与行程详情「同行者」列表口径一致。
  - 统一注入 `Clock`；保险到期派生用 `LocalDate.ofInstant(now, TripTimeZoneConstant.ZONE)`；借款到期用 `Instant` 直接加天数，避免服务器时区影响。
- **Alternatives：** 前端隐藏即视为资格（可绕过）；用 `LocalDate.now()`（CI 时区漂移）；把账号状态并入 `is_eligible`（页面无法解释 403）。
- **Impact：** 新增 `FinanceEligibility` 纯逻辑与 `ineligible_reason` 契约字段；控制器只做身份解析与响应组装。

### D8 契约 0.25.0

- **Context：** 新增 6 条路径、若干 schema 与 3 个业务码；需避开在途 0.18.0 + `V24`。
- **Decision：** `RouteME/openapi.yaml`（`OpenApiTest` 以 `../openapi.yaml` 读取，相对 `backend/` 即仓库 `RouteME/` 根）由 0.17.0 升 **0.25.0**（`V30` 对应），新增：

  | 方法与路径 | 成功 | 失败 |
  |---|---|---|
  | `GET /trips/{tripId}/finance` | 200 `TripFinance` | 401、404 `TRIP_NOT_FOUND` |
  | `POST /trips/{tripId}/insurance/purchase` | 200 `InsuranceRedirect` | 401、403 `FORBIDDEN` / `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED`、404 `TRIP_NOT_FOUND`、409 `TRIP_NOT_OPEN` |
  | `POST /trips/{tripId}/insurance/confirm` | 200 `InsurancePolicy` | 401、403（同上）、404、409 `TRIP_NOT_OPEN` |
  | `POST /trips/{tripId}/loans` | 201 `TravelLoan` | 400 `INVALID_INPUT`、401、403（同上）、404、409 `TRIP_NOT_OPEN` / `ACTIVE_LOAN_EXISTS` |
  | `GET /me/finance` | 200 `MyFinance` | 401 |
  | `POST /loans/{loanId}/repay` | 200 `TravelLoan` | 401、403 `FORBIDDEN`、409 `INSUFFICIENT_BALANCE` / `LOAN_NOT_ACTIVE` |

  - Schema：`Wallet`、`WalletLedgerEntry`、`InsurancePolicy`、`InsuranceProvider`、`InsuranceProduct`、`InsuranceSummary`、`InsuranceRedirect`、`TravelLoan`、`TripFinance`、`MyFinance`、`LoanCreateRequest`。删除 `FinanceCatalog` / `FinancePlan` / `InsurancePurchaseRequest` 与 `/finance/plans`。
  - `InsurancePolicy.status` 枚举 `[active, expired]`（`expired` 只读派生）；`InsuranceSummary.status` 枚举 `[not_purchased, active, expired]`，`purchase_url` 与 `policy` 可空；`InsuranceProduct.code` 枚举 `[accident_medical, emergency_rescue, travel_baggage]`，不含价格 / 保额字段；`TravelLoan.status` 枚举 `[active, repaid, overdue]`；`LoanCreateRequest.term_days` 枚举 `[7, 14, 30]`，`principal_cents` 为 `multipleOf: 100` 且 10,000–200,000。
  - 所有金额字段 `type: integer`、`format: int32`，描述注明「整数分，CNY」；标识字段（`id` / `trip_id` / `loan_id`）`type: integer`、`format: int64`；`coverage_start` / `coverage_end` / `start_date` / `end_date` 为 `format: date`；`*_at` 为 `format: date-time`（UTC）。`Wallet.balance_cents` 最小值 0。
  - `WalletLedgerEntry` 枚举取 wire 小写：`direction ∈ [credit, debit]`、`entry_type ∈ [loan_disbursement, loan_repayment]`、`related_type ∈ [travel_loan]`；`related_id` 为字符串（与 `wallet_ledger.related_id VARCHAR(64)` 一致）。`MyFinance.ledger` 与 `WalletLedgerEntry` 集合描述均注明「按 `occurred_at` 升序（同刻按 `id` 升序）」，与 D2 的 `ledgerOf` 排序一致。
  - 每个响应 schema 写全 `required`；服务端生成字段（`id`、余额 / 费用、`status`、`*_at`、`coverage_*`、提供方名称与入口）标 `readOnly: true`。投保入口、状态回写与借款 POST、还款 POST 各给典型 `examples`；示例必须符合 schema（不写越界金额）。
  - `Error.code` 增加 `INSUFFICIENT_BALANCE`、`ACTIVE_LOAN_EXISTS`、`LOAN_NOT_ACTIVE`（均 409）；移除 `POLICY_EXISTS`。
  - `MyFinance` = `wallet + ledger + policies + loans`；`TripFinance` = `trip_id / trip_title / destination / trip_status / start_date / end_date / companion_count / is_eligible / ineligible_reason / wallet / insurance / loans`。
  - 演示阶段账本与列表不分页：单用户交易量受「行程数 + 单笔进行中借款」限制，规模有界；分页、审计导出与交易监控属 NFR，已在 `proposal.md` 列为 out of scope，P4 验证报告注明 deferred。若真实数据增长需另开 change 增加 `page` / `size`。
  - `OpenApiTest` 的 `in_openApiFile_out_travelFinanceContractDeclared` 按新路径 / schema / 枚举断言，并断言 `POLICY_EXISTS` 已退休；版本断言为 `0.25.0`。
- **Alternatives：** 0.18.0（与在途通知 change 冲突）；`V24`（冲突）；保留站内商品目录（越界承保）。
- **Impact：** `OpenApiTest` 版本 / 路径 / schema / 错误码断言；Redocly lint；前端 `types.ts`；若合并顺序变化则整体顺延并在 PR 记录。

### D9 幂等与重复提交

- **Context：** 双击、网络重试与并发都可能重复请求；不能出现第二次扣款或第二条保险记录。
- **Decision：**
  - 保险：唯一索引 `(user_id, trip_id)`；重复状态回写先查后返回，并发插入由唯一索引兜底后重读；投保入口无写入，重复点击只再次打开第三方页面。
  - 借款：唯一索引 `active_user_id`；第二次请求 409 `ACTIVE_LOAN_EXISTS`；还清后 `active_user_id = NULL` 才允许再借。
  - 还款：条件更新 `status = 'ACTIVE'`；第二次请求 409 `LOAN_NOT_ACTIVE`，不产生第二条流水。
  - 钱包 CAS：0 行即重读；同一用户并发请求最终串行成功一次，另一请求按业务唯一键失败。
- **Alternatives：** 客户端幂等键（契约与前端都要新增字段，本期无必要）；服务层「先查后写」（并发不可靠）。
- **Impact：** `atdd-design.md` E14 / E26 / E29 / E37；并发重试分支由 `WalletServiceImplTest` 覆盖。

### D10 注册集成与存量回填

- **Context：** 新账号必须有钱包，且失败不能留下半成品。
- **Decision：** `AuthServiceImpl.register` 在 `creditService.ensureAccount(user.id())` 之后调用 `walletService.ensureWallet(user.id())`，同处 `@Transactional`；任一步失败整体回滚。存量账号由 `V30` 回填；读取时 `ensureWallet` 作为兜底（覆盖演示数据 / 旧库）。
- **Alternatives：** 注册后异步补钱包（可能出现空钱包窗口）；只在读取时懒创建（P0 迁移回填仍要求可验证）。
- **Impact：** `AuthControllerTest` 增加注册即钱包断言；迁移测试断言全量回填。

### D11 前端路由、页面与入口

- **Context：** 用户从行程详情、账号菜单与侧边栏进入；两页共享钱包、保险状态、借款组件。
- **Decision：**
  - `route.ts`：新增 `{ name: 'tripFinance'; tripId }` ↔ `#/trips/{tripId}/finance`、`{ name: 'finance' }` ↔ `#/finance`；`App.tsx` 渲染 `TripFinancePage` / `FinancePage`。
  - `TripDetailPage`：在 `detail-section` 中新增「旅行安全保障」区，仅当 `trip.status ∈ {recruiting, full, ongoing}` 且当前用户在 `trip.participants` 中显示；打开时请求 `GET /trips/{tripId}/finance` 展示实时状态与保障期，已投保时提供「紧急求助」。
  - `AppShell`：账号菜单新增「旅行保障」项；侧边栏「我的旅行」下方新增常驻「旅行保障」→ `#/finance`；移动端底部导航不变。
  - 新目录 `frontend/src/finance/`：`TripFinancePage.tsx`（行程上下文、保险面板、借款表单、该行程借款）、`FinancePage.tsx`（钱包、流水、保险记录、借款、可交易行程入口）、`InsurancePanel.tsx`（状态、提供方、类别、保单 / 理赔 / 求助入口）、`WalletCard.tsx`、`LoanForm.tsx`、`PolicyList.tsx`、`LoanList.tsx`。
  - 投保交互：按钮调用 `POST /insurance/purchase` 后 `window.open(redirect_url, '_blank', 'noopener,noreferrer')`，不刷新、不扣款；演示「已完成投保（演示同步）」调用 `POST /insurance/confirm` 后重载状态。
  - 纯逻辑：`financeFormat.ts`（`money` / `feeOf` / `netOf` / `loanStatusOf`）、`financeEligibility.ts`（行程可交易判定）；Vitest 覆盖。
  - 可交易行程入口：复用 `loadMyTrips()`，前端过滤 `status ∈ {recruiting, full, ongoing}` 且当前用户在 participants / publisher 中；资格权威仍在服务端。
  - 错误文案：`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE` 与 403 账号状态映射到 `financeMessages.ts`；提交中禁用按钮防双击。
- **Alternatives：** 只做一个聚合页（行程上下文丢失）；把入口做成常驻导航（对无资格用户误导）。
- **Impact：** `types.ts`、`api.ts`、`route.ts`、`App.tsx`、`shell/AppShell.tsx`、`trips/TripDetailPage.tsx`、`finance/*`、`i18n/financeMessages.ts`、`styles.css`；`route.test.ts` 增加两条路由。

### D12 原型、测试与回滚

- **Context：** `prototype-ui-alignment` 要求先改原型；金融是金额敏感功能，需要可回算证据。
- **Decision：**
  - 原型：rebase 后 `docs/prototype/v1` 已归档，本 change 不新增原型资产；页面结构与文案以 Delta Spec 与生产 UI 为准。
  - 后端测试：`TravelFinanceWalletApiTest`、`TravelFinanceInsuranceApiTest`、`TravelFinanceLoanApiTest`、`TravelFinanceEligibilityApiTest`、`TravelFinanceMigrationSqliteTest`、`OpenApiTest`、`AuthControllerTest`、`WalletServiceImplTest`。
  - 前端测试：`financeFormat.test.ts`、`financeEligibility.test.ts`、`route.test.ts`、`api.test.ts`；E2E `finance.spec.ts`（投保跳转 → 演示回写 → 状态持久化；借款 → 净额到账 → 还款；非同行者 / 已结束）。
  - 回滚：代码回滚后四表保留，钱包 / 保险记录 / 借款成为孤立数据，不影响既有能力；如需彻底回滚，另写 down 迁移（本期不做，P5 记录）。
- **Alternatives：** 先实现后补原型（违反项目规则）；不做迁移测试（SQLite / H2 差异风险）。
- **Impact：** 后端 8 个测试类、前端 4 个测试文件、E2E 1 个。

## 3. 实现落点清单

| 层 | 文件 |
|---|---|
| 迁移 | `backend/src/main/resources/db/migration/V30__add_travel_finance.sql` |
| 配置 | `config/InsuranceProperties.java`、`config/InsuranceConfig.java` |
| 领域 / 枚举 | `pojo/UserWallet.java`、`pojo/WalletLedgerEntry.java`、`pojo/InsurancePolicy.java`、`pojo/TravelLoan.java`、`pojo/WalletPosting.java`、`enums/InsuranceProductEnum.java`、`enums/WalletDirectionEnum.java`、`enums/WalletEntryTypeEnum.java`、`enums/LoanStatusEnum.java`、`constant/FinanceFeeConstant.java` |
| 实体 / mapper | `entity/UserWalletEntity.java`、`WalletLedgerEntity.java`、`InsurancePolicyEntity.java`、`TravelLoanEntity.java`；`mapper/*Mapper.java` |
| 服务 | `service/WalletService.java`、`InsuranceService.java`、`LoanService.java`、`FinanceEligibility.java`；`service/impl/WalletServiceImpl.java`、`InsuranceServiceImpl.java`、`LoanServiceImpl.java` |
| 注册集成 | `service/impl/AuthServiceImpl.java`（`ensureWallet`） |
| 控制器 / 响应 | `controller/FinanceController.java`；`response/WalletResponse.java`、`WalletLedgerEntryResponse.java`、`InsurancePolicyResponse.java`、`InsuranceProviderResponse.java`、`InsuranceProductResponse.java`、`InsuranceSummaryResponse.java`、`InsuranceRedirectResponse.java`、`TravelLoanResponse.java`、`TripFinanceResponse.java`、`MyFinanceResponse.java`；`request/LoanCreateRequest.java` |
| 异常 | `exception/InsufficientBalanceException.java`、`ActiveLoanExistsException.java`、`LoanNotActiveException.java`（均 409） |
| 契约 | `openapi.yaml` 0.25.0、`OpenApiTest` |
| 前端 | `types.ts`、`api.ts`、`route.ts`、`App.tsx`、`shell/AppShell.tsx`、`trips/TripDetailPage.tsx`、`finance/*`、`i18n/financeMessages.ts`、`styles.css` |
| 原型 | 无新增（`docs/prototype/v1` 已归档） |
| 测试 | 第 2 节 D12 所列后端 8 类、前端 4 文件、`e2e/tests/finance.spec.ts` |

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 余额并发双花 | 钱包 CAS `WHERE balance_cents = before` + 同事务流水；0 行重读重试；借款唯一索引兜底 |
| 流水 id 并发碰撞 | `nextId` 冲突重试（最多 3 次）；流水无其他唯一键，异常语义单一 |
| 唯一索引在 H2 / SQLite 行为差异 | 只用普通唯一索引；`active_user_id` 为 NULL 时不被唯一约束计数（两库一致）；迁移测试双引擎执行 |
| 保险状态跨时区偏一天 | 到期派生固定 `Asia/Shanghai`；测试注入固定 `Clock` |
| 借款到期跨时区 | `due_at` 由 `Instant + DAYS` 生成，不做本地日期换算 |
| 第三方入口不可达 | 配置默认 `example.com` 演示页；真实地址用环境变量覆盖；E2E 只断言新窗口地址含 `trip_id` |
| 用户误以为 RouteME 承保 | 页面固定展示提供方名称与免责说明；契约与文案都不出现保费 / 保额 |
| 契约 / 迁移号冲突 | 本 change 落定 0.25.0 + `V30`（main 已用 0.24.0 + `V29`）；再被抢占时整体顺延，PR 描述记录合并顺序 |
| 封禁用户无法还款 | 还款不调用 `assertCanWrite`；API 测试覆盖 `SUSPENDED` / `BANNED` |
| 非同行者绕过 UI | 服务端资格判定为唯一权威；API 403 / `is_eligible=false` 双覆盖 |
| 原型与实现漂移 | `docs/prototype/v1` 已归档；P4 以生产 UI 在 1440 / 1024 / 768 / 390 与深浅主题逐屏核对为准 |
| 迁移回填把新注册路径重复插入 | 回填带 `WHERE NOT EXISTS`；`ensureWallet` 幂等 |

## 5. 未决项

- 无业务未决项。异常类包名、mapper XML（如需自定义 SQL）与前端组件拆分由 P4 按现有包结构落地。
- NFR（并发压测、交易监控、审计导出）不在本 change，P4 验证报告注明 deferred。