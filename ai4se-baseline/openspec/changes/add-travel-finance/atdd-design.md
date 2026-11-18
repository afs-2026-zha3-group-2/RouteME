# ATDD 设计 — add-travel-finance（REQ-028 / S29）

- **Change：** `add-travel-finance`
- **输入：** Delta Spec `travel-finance`（10 Requirement / 40 Scenario）、`proposal.md`、`g1-decision.md`（C1–C5）、`dov-ac-review.md`、`consistency-lint.md`
- **平台：** Spring Boot 4.1 + MockMvc / JUnit 5；React 19 + Vitest；Playwright E2E
- **门禁：** 本地 `mvnw.cmd test`、`npm run build && npm test`、`npx playwright test tests/finance.spec.ts`、`openspec validate add-travel-finance --strict`、Redocly lint；CI 沿用 `.github/workflows/ci.yml`（E2E 不在 CI）

## 1. 验收层分配

| 层 | 覆盖内容 | 说明 |
|---|---|---|
| **API（后端）** | 钱包初始化与回填、账本可回算、第三方保险入口 / 状态回写 / 保障期 / 到期派生、借款金额 / 期限 / 净额 / 到期、还款与逾期、资格与账号状态、整数分、幂等、数据隔离 | 固定 `Clock` + MockMvc；断言 JSON、数据库状态与流水条数 |
| **E2E（浏览器）** | 注册后钱包、侧边栏与账号菜单入口、行程详情状态、第三方投保跳转与新窗口、演示回写后的状态持久化、借款净额与还款、无资格页 | 每个用例用新注册账号（自动获得 1,000,000 分钱包），避免依赖种子余额 |
| **UT（Defer，apply 阶段补）** | 5% 费用纯函数、利息 / 罚息纯函数、借款净额 / 应还、逾期天数派生、保险状态派生、资格派生、金额格式化、钱包 CAS 重试分支（mock mapper） | 纯逻辑；不在本文件展开用例 |
| **NFR** | 本轮 deferred：并发压测、交易量监控、审计导出 | 由 `proposal.md` Out of scope 与 G1 范围确认；P4 验证报告注明 |

## 2. 场景 → 用例映射

| ID | Delta Requirement / Scenario | 层 | 用例要点 |
|---|---|---|---|
| E1 | R1 注册成功后初始化钱包 | API + E2E | 注册 201 后钱包余额 1,000,000 分；保障页展示「¥10,000.00」 |
| E2 | R1 注册失败不留钱包 | API | 用户名占用 / 非法密码 / 非法用户名：4xx；`user_wallet` 无新行 |
| E3 | R1 存量账号补齐初始余额 | API | 迁移后每个 `app_users.id` 恰有 1 行、余额 1,000,000；读取不报错 |
| E4 | R1 同一用户只有一个钱包 | API | 多次读取 / 重复调用 ensure：仍 1 行；余额不变 |
| E5 | R2 每笔余额变化都有流水 | API | 借款 / 还款各产生 1 条；`direction / amount / before / after / entry_type / related_* / occurred_at` 完整；保险不产生流水 |
| E6 | R2 余额可由流水回算 | API | `初始 + 入账 − 出账 = 当前`；逐条 `before ± amount = after` |
| E7 | R2 客户端不能直接改余额 | API | 请求体带 `balance_cents` 被忽略；契约无改余额端点（`OpenApiTest` 断言路径集合） |
| E8 | R3 保障页展示行程上下文与提供方 | API + E2E | 目的地 / 起止日 / 同行人数 / 提供方名称 / 保单 / 理赔 / 求助入口；无 RouteME 保费与保额 |
| E9 | R3 打开第三方投保入口 | API + E2E | 200 `redirect_url` 含 `trip_id`；钱包、保险记录与流水均不变 |
| E10 | R3 客户端不能改写提供方或价格 | API | 请求携带提供方 / 价格 / 保障期 / 保单号：被忽略；仍取配置 |
| E11 | R3 保险不影响同行 | E2E + API | 未投保仍可申请 / 查看行程；保险不参与申请状态机 |
| E12 | R4 确认投保写入保障期 | API | `status=ACTIVE`；`coverage_start = start_date`、`coverage_end = end_date` |
| E13 | R4 重复回写幂等 | API + E2E | 第二次返回同一 `id`；记录数仍为 1；钱包与流水不变 |
| E14 | R4 保障结束日之后派生已结束 | API | 固定时钟跨过 `coverage_end`：`status=expired`；记录与保障期仍可读 |
| E15 | R4 不保存投保敏感信息 | API | 响应与表结构无保单号 / 证件 / 银行卡 / 保费 / 保额 |
| E16 | R4 投保不回写钱包 | API | 回写前后 `balance_cents` 与流水条数一致 |
| E17 | R5 未购买与已投保的状态展示 | API + E2E | 未购买：`not_purchased` + `policy=null`；回写后：`active` + 保障期 |
| E18 | R5 只能看到自己的保险记录 | API | A 的列表不含 B；聚合端点只按当前身份过滤 |
| E19 | R5 非同行者不能打开入口或回写 | API + E2E | 403 `FORBIDDEN`；页面无可提交投保按钮 |
| E20 | R5 已结束或已取消行程不能投保 | API + E2E | `completed` / `cancelled`：409 `TRIP_NOT_OPEN`；无记录、无扣款 |
| E21 | R6 借款金额与期限边界 | API | 99 / 2,001 元 → 400；`principal_cents` 非 100 倍数 → 400；期限 1 / 10 / 31 → 400 |
| E22 | R6 净额发放与费用拆分 | API + E2E | 1,000 元 / 14 天：服务费 50、净额 950、利息 7、应还 1,007；钱包 +95,000；1 条入账 |
| E23 | R6 到期时间为服务端计算 | API | `due_at = funded_at + 14 天`；客户端传 `due_at` 被忽略 |
| E24 | R6 借款资格限制 | API | 非同行者 403；`completed` / `cancelled` 409；均无流水 |
| E25 | R7 借款列表字段完整 | API + E2E | 本金 / 服务费 / 净额 / 利息 / 应还 / 罚息 / 合计应还 / 期限 / 发放 / 到期 / 状态；逾期显示 `overdue` 与累计罚息 |
| E26 | R7 只能看到自己的借款 | API | A 的列表不含 B；还他人借款 403 |
| E27 | R8 已有进行中借款时拒绝新申请 | API | 409 `ACTIVE_LOAN_EXISTS`；无第二笔、无流水；还清后可再借 |
| E28 | R8 手动还款结清 | API + E2E | 扣 1,007 元（本金 + 利息）、`status=repaid`、`repaid_at` 非空；不再收服务费 |
| E29 | R8 余额不足阻断还款 | API | 409 `INSUFFICIENT_BALANCE`；余额与 `ACTIVE` 不变 |
| E30 | R8 已还清不能重复还款 | API | 409 `LOAN_NOT_ACTIVE`；无扣款、无新流水 |
| E31 | R8 逾期派生并累计罚息 | API + E2E | 固定时钟跨过 `due_at` N 天：`status=overdue`；罚息 = 本金 × 0.1% × N；`total_repay_cents` = 本金 + 利息 + 罚息；不自动扣款；还款按合计应还结清并落库罚息 |
| E32 | R9 行程详情入口按资格显示 | E2E | 同行者 / 发布者可见「旅行安全保障」与状态；路人、`completed` / `cancelled` 不显示 |
| E33 | R9 账号菜单与侧边栏入口 | E2E | 账号菜单与「我的旅行」下方均有「旅行保障」，均指向 `#/finance`；聚合页展示余额、保险记录 / 借款与可交易行程入口 |
| E34 | R9 移动端底部导航不变 | E2E | 390 宽度下导航项与改动前一致；无新增金融项 |
| E35 | R9 未登录与无资格访问 | E2E + API | 未登录被身份门禁拦截；非同行者直达 `#/trips/{id}/finance` 显示无资格且无入口；API 返回 `is_eligible=false` |
| E36 | R9 停用或封禁账号不能投保或借款 | API | 403 `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED`；无保险记录 / 借款 / 流水 |
| E37 | R9 停用或封禁仍可还款 | API | 停用 / 封禁账号还款 200；借款 `repaid` |
| E38 | R10 金额始终为整数分 | API | 响应金额均为整数；无小数；费用无浮点尾差 |
| E39 | R10 重复提交至多生效一次 | API + Defer UT | 顺序双击借款 / 还款：第二次 409 且余额只变一次；重复回写只 1 条记录；并行 CAS 的 0 行重试由 UT 覆盖 |
| E40 | R10 数据隔离 | API | 钱包 / 保险 / 借款聚合只含当前身份；他人 loanId 还款 403 |

覆盖：40/40 Delta Scenario 均至少一层。E1/E8/E9/E11/E13/E17/E19/E20/E22/E25/E28/E31/E32/E33/E34/E35 含 E2E；其余以 API 为主。

## 3. 生产代码前先写的红态用例

| 顺序 | 文件 | 初始失败原因 |
|---|---|---|
| 1 | `backend/src/test/java/routeme/controller/TravelFinanceWalletApiTest.java` | 端点、钱包表、流水均不存在 |
| 2 | `.../TravelFinanceInsuranceApiTest.java` | 投保跳转 / 状态回写 / 保险摘要端点不存在 |
| 3 | `.../TravelFinanceLoanApiTest.java` | 借款 / 还款端点不存在 |
| 4 | `.../TravelFinanceEligibilityApiTest.java` | 资格与账号状态守卫未接入 |
| 5 | `.../migration/TravelFinanceMigrationSqliteTest.java` | `V30` / `V32` 未执行 |
| 6 | `OpenApiTest` 新增 `in_openApiFile_out_travelFinanceContractDeclared` | 路径 / schema / 3 个错误码缺失，旧站内商品路径仍在 |
| 7 | `AuthControllerTest` 增加「注册即建钱包」 | 注册未初始化钱包 |
| 8 | `e2e/tests/finance.spec.ts` | 路由、入口与页面不存在 |

后端测试类统一采用 `@SpringBootTest @AutoConfigureMockMvc @Transactional @Import(FixedClockTestConfig.class)`，断言风格沿用 `TripCancellationApiTest`（JSON + `JdbcClient` 校验数据库）。

## 4. 夹具与数据策略

### 4.1 固定时钟与日期

- 复用 `FixedClockTestConfig.NOW = 2026-11-16T09:00:00Z`（北京时间 2026-11-16 17:00）。
- 保险保障期固定取行程起止日，不再依赖「购买日」：`coverage_start = trip.start_date`、`coverage_end = trip.end_date`。
- 到期派生按 `LocalDate.ofInstant(now, TripTimeZoneConstant.ZONE).isAfter(coverage_end)`。
- 借款 `due_at = funded_at.plus(termDays, DAYS)`，时区固定为上海，避免 CI 运行机时区影响。
- 测试行程用 SQL 直接插入固定日期：进行中 `2026-11-15 ~ 2026-11-20`，未开始 `2026-11-20 ~ 2026-11-25`，已结束 `2026-11-01 ~ 2026-11-02`。

### 4.2 身份、余额与并发

- 身份用既有 `X-User-Id`；账号状态用 `AccountStatusService.suspend / ban` 或 SQL 置位，`@Transactional` 自动回滚。
- 余额不足：`UPDATE user_wallet SET balance_cents = ?`，不新增「测试专用改余额端点」。
- 保险状态：直接 `UPDATE insurance_policy SET coverage_end = ?` 或使用固定时钟 + 过去行程，验证 `expired` 派生。
- 并发：API 层验证顺序重复提交；「条件更新 0 行 → 重读重试」由 `WalletServiceImplTest` 用 mock mapper 覆盖；不做压测（NFR deferred）。
- 流水回算：直接 `SELECT ... ORDER BY occurred_at, id` 求和，与 `user_wallet.balance_cents` 比对。

### 4.3 E2E 数据与选择器

- `createUserViaApi(page)` 注册新账号（初始钱包 1,000,000 分）；`loginAs` / `loginAsAccount` 注入身份。
- `createTripViaApi(page, publisherId, title, { daysFromToday: 0 })` 建当天行程；同行者用 `applyViaApi` + `acceptApplicationViaApi` 建立 `ACCEPTED`。
- 选择器以生产 UI 为准：`data-testid="wallet-balance"`、`insurance-status`、`insurance-provider`、`trip-insurance-status`、`trip-insurance-period`；入口用角色名「前往第三方购买」「已完成投保（演示同步）」「申请借款」「立即还款」；金额断言文本 `¥10,000.00`。
- 投保跳转用 `page.waitForEvent('popup')` 断言新窗口地址含 `trip_id`，随后关闭弹窗，确认余额不变。
- 多宽度：1440 / 1024 / 768 / 390；浅色 / 深色各跑一次主路径。
- 结束后不清理账号（既有 E2E 约定）；断言只基于本用例创建的数据。

## 5. 门禁与执行顺序

1. **Red：** 第 3 节 1–5 类失败用例 + `OpenApiTest` 新断言。
2. **契约：** `openapi.yaml` 升 0.28.0，补 6 条路径、11 个 schema 与 3 个错误码，删除站内商品路径；`TravelLoan` 增加利息 / 罚息 / 合计应还字段；同步 `OpenApiTest` 版本断言。
3. **Green：** 迁移 `V30` / `V32` → 钱包 / 账本 → 第三方保险配置 / 入口 / 回写 → 借款 / 利息 / 还款 / 罚息 → 资格 / 账号状态 → 控制器 / 响应 → 前端。
4. **E2E：** `finance.spec.ts` 覆盖投保跳转与回写、借款、还款、入口、无资格。
5. **门禁：** `mvnw.cmd test`、`npm run build && npm test`、`npx playwright test tests/finance.spec.ts`、`openspec validate add-travel-finance --strict`、`npx @redocly/cli lint openapi.yaml`。

## 6. Non-goals 与反向验证

| Non-goal | 反向验证 |
|---|---|
| 不做承保 / 定价 / 保费计算 | 保险响应与表结构无保费 / 保额字段；`InsuranceProduct` 只有 code / title / summary |
| 不做理赔 / 给付 / 审核 | 契约无 claim 处理路径；RouteMe 只输出提供方的理赔指引链接 |
| 不做退保 / 退款 / 批改 | 无 DELETE 或改保险记录端点；保险状态只有 `active` / `expired` 派生 |
| 不做分期 / 展期 / 复利 / 罚息封顶 | 借款响应只有线性 `interest_cents` / `penalty_cents`；无分期或复利字段；逾期不自动扣款，仅还款时结清 |
| 不做充值 / 提现 / 转账 | 金融路径集合恰为 6 条；无改余额端点 |
| 不做管理后台金融视图 | `ADMIN_CONSOLE_PATHS` 不变；无 `/admin/finance` |
| 不做通知 / 推送 / 邮件 | 金融写入不依赖 `mq` / push；无通知副作用断言 |
| 不改信用分 | 交易前后 `user_credit_account.score` 不变 |
| 不接受客户端定价 / 余额 / 提供方 | E7 / E10 断言请求字段被忽略 |
| 不保存投保敏感信息 | E15 反查表结构与响应 |
| 不对接真实机构 API / KYC | 保险包只有配置读取，无外部 HTTP 客户端；无核保 / 验签代码 |

## 7. 覆盖缺口与处置

| 缺口 | 处置 |
|---|---|
| 并行扣款无法在 E2E / MockMvc 稳定复现 | API 验证顺序幂等；CAS 0 行重试由 UT 覆盖；不压测 |
| 逾期 / 保险到期需要跨日 | API 用固定时钟 + SQL 把日期置为过去；E2E 不做跨日等待 |
| 停用 / 封禁的 E2E 需后台 token | 以 API 层覆盖 403 与还款放行；E2E 只覆盖 ACTIVE 主路径 |
| 第三方真实投保无法在 E2E 完成 | 用 `waitForEvent('popup')` 断言跳转地址；状态回写用演示按钮与 API 覆盖 |
| 迁移回填只在迁移测试中可观察 | `TravelFinanceMigrationSqliteTest` 断言每个既有账号 1 行 / 1,000,000 分 |
| 40 个场景逐一 E2E 成本高 | 入口 / 主路径 / 错误提示走 E2E；金额与边界留在 API |

**结论：** 40 个 Delta Scenario 均可分层断言；E2E 只承担用户可感知路径，金额与并发边界由 API + UT 承担；NFR 明确 deferred。