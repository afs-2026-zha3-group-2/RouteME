# 任务清单 — add-travel-finance（REQ-028 / S29）

- **Change：** `add-travel-finance`
- **输入：** Delta Spec（`travel-finance`，10 Requirement / 40 Scenario）、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)（D1–D12）
- **约定：** 先 Red 后 Green；每个任务只落一层；每条给出落点、覆盖场景与验证命令；测试方法沿用 `in_<input>_out_<expected>` 命名；最后一条为回归验证
- **Owner：** Karena（当前开发者）

## 任务

- [x] **T0 原型核对（P3 已完成；rebase 后撤回）**
  - Owner：Karena ｜ 覆盖：E1、E8、E11、E14、E21、E24、E27、E30–E33、E35
  - rebase 后 `docs/prototype/v1` 已由 main 归档，本 change 不新增或改结构；页面结构、文案与选择器以 Delta Spec 与生产 UI 为准。
  - 页面骨架复用既有 `detail-section` / `card` / `chip` 令牌，新增 `.fin-*` 版式与 `data-testid`（`wallet-balance`、`insurance-status`、`insurance-provider`、`trip-insurance-status`）。
  - 验证：E2E 在 1440 / 1024 / 768 / 390 与深浅主题逐屏核对，控制台 0 错误。

- [x] **T1 后端 Red：钱包、注册与迁移用例**
  - Owner：Karena ｜ 覆盖：E1–E4
  - 新增 `TravelFinanceWalletApiTest`（固定 Clock）：`GET /me/finance` 初始 1,000,000；新账号注册后有钱包。
  - 新增 `TravelFinanceMigrationSqliteTest`：执行 `V30` 后四表 / 索引存在，全部既有账号回填 1 行 1,000,000。
  - `AuthControllerTest` 增加「注册成功即有钱包 / 注册失败不留钱包」。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceWalletApiTest,TravelFinanceMigrationSqliteTest,AuthControllerTest test`（预期失败）

- [x] **T2 迁移 V30 与领域 / 实体**
  - Owner：Karena ｜ 覆盖：E3、E4、E5、E6
  - 新增 `V30__add_travel_finance.sql`：四表、CHECK、`ux_insurance_policy_user_trip`、`ux_travel_loan_active_user`、四个普通索引、钱包回填。
  - 新增 `UserWalletEntity` / `WalletLedgerEntity` / `InsurancePolicyEntity` / `TravelLoanEntity` 与四个 mapper；`UserWallet` / `WalletLedgerEntry` / `InsurancePolicy` / `TravelLoan` / `WalletPosting` 领域对象；`InsuranceProductEnum` / `WalletDirectionEnum` / `WalletEntryTypeEnum` / `LoanStatusEnum` / `FinanceFeeConstant`。
  - `InsurancePolicyEntity` 只落提供方、保障起止日、状态与确认时刻；不建保费 / 保额 / 保单号 / 证件 / 银行卡列。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceMigrationSqliteTest test`

- [x] **T3 钱包服务、流水与注册集成**
  - Owner：Karena ｜ 覆盖：E1–E7、E36
  - 新增 `WalletService` / `WalletServiceImpl`：`ensureWallet`、`read`、`debit`、`credit`、`ledgerOf`；CAS 更新 + 同事务流水 + id 冲突重试；`ledgerOf` 按 `occurred_at ASC, id ASC` 返回。
  - 新增 `WalletServiceImplTest`：CAS 0 行 → 重读重试；余额不足抛 409；流水 id 冲突重试。
  - `AuthServiceImpl.register` 在信用账户之后调用 `ensureWallet`；`InsufficientBalanceException`（409）。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceWalletApiTest,AuthControllerTest,WalletServiceImplTest test`

- [x] **T4 后端 Red：第三方保险、借款、还款与资格用例**
  - Owner：Karena ｜ 覆盖：E8–E30、E34、E35、E38
  - 新增 `TravelFinanceInsuranceApiTest`：行程上下文、提供方 / 类别 / 入口、投保跳转不改钱包、状态回写与保障期、重复回写幂等、到期派生、无敏感字段、越权、`completed` / `cancelled`。
  - 新增 `TravelFinanceLoanApiTest`：金额 / 期限边界、净额、到期、单笔进行中、还款、余额不足、重复还款、逾期派生、账号状态、还款放行。
  - 新增 `TravelFinanceEligibilityApiTest`：非同行者 403、`is_eligible=false`、聚合页数据隔离、他人 loanId 403。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceInsuranceApiTest,TravelFinanceLoanApiTest,TravelFinanceEligibilityApiTest test`（预期失败）

- [x] **T5 契约 0.25.0**
  - Owner：Karena ｜ 覆盖：契约面（E8 / E16 / E20 / E24 / E31 / E33 / E36 的字段、枚举与错误码）
  - `RouteME/openapi.yaml` 升 0.25.0：6 条路径、11 个 schema、3 个新错误码、成功 / 拒绝示例与 `readOnly` 标注；删除 `/finance/plans` 与站内商品 schema。
  - `OpenApiTest` 两处版本断言改为 0.25.0，新增 `in_openApiFile_out_travelFinanceContractDeclared`（路径集合、schema 必填、保险状态 / 类别枚举、无价格字段、`POLICY_EXISTS` 已退休、流水枚举与排序描述）。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=OpenApiTest test`；`cd RouteME; npx.cmd @redocly/cli lint openapi.yaml`（读 `redocly.yaml`）。

- [x] **T6 第三方保险服务与控制器**
  - Owner：Karena ｜ 覆盖：E8–E19、E31、E33
  - 新增 `FinanceController` 的行程保障读取、`POST /trips/{tripId}/insurance/purchase` 与 `POST /trips/{tripId}/insurance/confirm`；`InsuranceService` / `InsuranceServiceImpl`、`InsuranceProperties` / `InsuranceConfig`、摘要 / 提供方 / 类别 / 跳转响应。
  - 资格与账号状态：`FinanceEligibility`、`assertCanWrite(BUSINESS)`；保障期取行程起止日；投保跳转与状态回写都不触碰钱包。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceInsuranceApiTest,TravelFinanceEligibilityApiTest test`

- [x] **T7 借款、还款与逾期派生**
  - Owner：Karena ｜ 覆盖：E20–E30、E34、E35
  - 新增 `LoanService` / `LoanServiceImpl`、`ActiveLoanExistsException`、`LoanNotActiveException`、`TravelLoanResponse`、`LoanCreateRequest`。
  - 发放：整元校验、5% 净额、`funded_at` / `due_at`、`active_user_id` 唯一；还款：归属 403、状态 409、条件更新、`active_user_id = NULL`；逾期只读派生。
  - `POST /trips/{tripId}/loans`、`POST /loans/{loanId}/repay` 接入控制器。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceLoanApiTest,TravelFinanceEligibilityApiTest test`

- [x] **T8 聚合接口、账本展示与数据隔离**
  - Owner：Karena ｜ 覆盖：E4–E7、E16、E17、E24、E25、E36、E38
  - `GET /me/finance`：钱包、全部流水、全部保险记录 / 借款；`GET /trips/{tripId}/finance`：行程上下文（目的地 / 起止日 / 同行人数）、`is_eligible` / `ineligible_reason`、保险摘要与该行程借款。
  - 所有查询按当前身份过滤；`WalletLedgerEntryResponse` 输出方向、金额、前后余额、业务类型与关联业务。
  - 金额契约校验：`amount_cents` / `balance_cents` / `balance_before_cents` / `balance_after_cents` 等断言为整数分（Jackson 序列化后为整数、无小数），作为 E36 的显式落点。
  - 验证：`cd RouteME/backend; .\mvnw.cmd -q -Dtest=TravelFinanceWalletApiTest,TravelFinanceEligibilityApiTest,OpenApiTest test`

- [x] **T9 前端纯逻辑、类型、API 与路由**
  - Owner：Karena ｜ 覆盖：E1、E8、E9、E21、E24、E30、E33、E36
  - `types.ts`：`Wallet` / `WalletLedgerEntry` / `InsuranceStatus` / `InsurancePolicy` / `InsuranceProvider` / `InsuranceProduct` / `InsuranceSummary` / `InsuranceRedirect` / `TravelLoan` / `TripFinance` / `MyFinance` 与请求类型。
  - `api.ts`：`loadTripFinance`、`openInsurancePurchase`、`confirmInsurance`、`createLoan`、`loadMyFinance`、`repayLoan`。
  - `financeFormat.ts`（`money` / `feeOf` / `netOf` / `loanStatusOf`）、`financeEligibility.ts`；`route.ts` 增加 `tripFinance` / `finance` 与 `routeToHash`。
  - 验证：`cd RouteME/frontend; npm test -- --run src/finance/financeFormat.test.ts src/finance/financeEligibility.test.ts src/route.test.ts src/api.test.ts`

- [x] **T10 前端页面、入口与样式**
  - Owner：Karena ｜ 覆盖：E1、E8、E11、E14–E16、E18、E19、E21、E24、E27、E30–E33
  - 新增 `finance/TripFinancePage.tsx`、`FinancePage.tsx`、`InsurancePanel.tsx`、`WalletCard.tsx`、`LoanForm.tsx`、`PolicyList.tsx`、`LoanList.tsx`；`App.tsx` 渲染两条路由。
  - `TripDetailPage` 增加「旅行安全保障」区块（按资格显示，含实时保险状态与保障期）；`AppShell` 账号菜单与「我的旅行」下方增加入口，移动端底部导航不变。
  - `i18n/financeMessages.ts` 与 `styles.css`：第三方提供方、保险状态、借款费用、余额与错误文案；提交中禁用按钮；响应式 390 / 768 / 1024 / 1440。
  - 验证：`cd RouteME/frontend; npm run build`；`npm test -- --run`

- [x] **T11 E2E 用户路径**
  - Owner：Karena ｜ 覆盖：E1、E8、E11、E14、E16、E18、E19、E21、E24、E27、E31–E33
  - 新增 `e2e/tests/finance.spec.ts`：新注册账号 → 钱包「¥10,000.00」→ 侧边栏入口 → 行程详情「未购买」→ 第三方购买（新窗口带 `trip_id`，余额不变）→ 演示回写（保障中、保单 / 理赔 / 求助入口可见、刷新后仍保障中）→ 借 1,000 元 / 14 天（净额 950，余额 10,950）→ 还款（余额 9,950，借款已还清）→ 账号菜单聚合页。
  - 无资格路径：非同行者详情页无入口；直达 `#/trips/{id}/finance` 显示无资格说明且无表单。
  - 验证：`cd RouteME/e2e; npx playwright test tests/finance.spec.ts`

- [x] **T12 回归验证与收尾**
  - Owner：Karena ｜ 覆盖：全部 + Non-goals 反向验证
  - 全量：`cd RouteME/backend; .\mvnw.cmd test`、`cd RouteME/frontend; npm run build && npm test`、`cd RouteME/e2e; npx playwright test`、`cd RouteME; npx.cmd @redocly/cli lint openapi.yaml`、`npx.cmd openspec validate add-travel-finance --strict`。
  - 反向检查：无理赔 / 退保 / 罚息 / 充值提现 / 管理后台金融路径；交易前后信用分不变；无客户端改余额或定价字段生效。
  - 产出 P4 验证报告与质量报告；更新 `registry.md` / `handoff.md` / `docs/sdd/add-travel-finance/`。
  - 验证：上述命令全绿 + 报告落盘。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| Spec Requirement | Design | Tasks | ATDD |
|---|---|---|---|
| 演示钱包与初始余额 | D1/D2/D10 | T1/T2/T3 | E1–E4 |
| 钱包账本与余额可回算 | D1/D2/D9 | T1/T2/T3/T8 | E5–E7 |
| 第三方旅行保险入口 | D3/D4/D8 | T2/T5/T6 | E8–E10 |
| 第三方投保状态回写与保障期 | D1/D4/D7/D9 | T4/T6 | E11–E15 |
| 保险状态查询与入口资格 | D4/D7/D8 | T4/T6/T8 | E16–E19 |
| 借款申请与 5% 服务费 | D3/D5/D8 | T5/T7 | E20–E23 |
| 借款查询 | D5/D6/D8 | T7/T8 | E24/E25 |
| 单笔进行中借款与手动还款 | D5/D6/D7/D9 | T4/T7 | E26–E30 |
| 金融入口与账号状态 | D7/D8/D11 | T3/T6/T7/T10/T11 | E31–E35 |
| 金额精度、幂等与数据隔离 | D2/D9/D12 | T1/T3/T8/T9/T12 | E36–E38 |

- **覆盖缺口：** 无孤儿场景；40 个 Delta Scenario 均至少有一个任务承接。
- **范围一致性：** 任务全部落在 Proposal In scope；无理赔 / 退保 / 罚息 / 充值提现 / 管理后台 / 通知 / 信用分 / 主动定价任务。
- **分层一致性：** 契约（T5）、后端（T1–T4、T6–T8）、前端（T9–T10）、E2E（T11）、验证（T12）各占独立任务，无混合层任务。
- **契约与迁移：** T5 固定 0.25.0；T2 固定 `V30`；main 已用 0.24.0 + `V29`，本 change 按顺延规则不冲突。
- **结论：** 对齐自检 **Pass**。P3 完成后进入 P4（`/sdd:atdd-apply`，从 T1 的 Red 用例开始）。

## P4 执行结果

- T0–T12 全部完成；后端 618 / 前端 482 / 金融 E2E 3/3 / 契约 0 error（26 warnings）/ `openspec validate --strict` valid。
- 2026-11-18 保险按「第三方入口 + 状态回写」返工后重跑：后端 `clean verify` 618 通过、前端 `npm test -- --run` 482 通过、`tests/finance.spec.ts` 3/3、Redocly 0 error。
- 全量 E2E 109 passed / 32 failed（返工前基线），失败全部在金融之外且为既有债务（高德 502、选择器与文案漂移、共享库数据），归因见 `docs/reviews/20261117-add-travel-finance-p4-verify.md` §5。
- 两份 P4 报告已落盘；保险返工后 P1–P4 签名槽位重置为「待复审」，详见 §返工说明。