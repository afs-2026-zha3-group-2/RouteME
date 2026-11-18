# P4 实现与验证记录 — add-travel-finance

- **Change：** `add-travel-finance`（REQ-028 / S29）｜ **阶段：** P4（Apply & verify）
- **编号顺延：** rebase 到 `origin/main@822471c` 后，REQ-024 / S25 → REQ-028 / S29，契约 0.19.0 → 0.24.0 → 0.25.0，迁移 `V25` → `V28` → `V30`（两轮 rebase；main 已用 0.24.0 + `V29`）
- **日期：** 2026-11-17（2026-11-18 保险返工后重跑与更新）｜ **记录人：** Karena（当前开发者）
- **基点：** `origin/main@822471c`，分支 `feature/add-travel-finance`
- **本地验证报告：** [`docs/reviews/20261117-add-travel-finance-p4-verify.md`](../../reviews/20261117-add-travel-finance-p4-verify.md)
- **P4 质量报告：** [`docs/reviews/20261117-add-travel-finance-p4-quality.md`](../../reviews/20261117-add-travel-finance-p4-quality.md)

## 0. 复审说明（2026-11-18）

保险由「站内商品 + 保费 + 保险 5% 服务费」返工为「第三方投保入口 + 状态回写」。受影响实现与验证如下：

- 删除 `InsurancePlanEnum`、`FinanceCatalogResponse`、`FinancePlanResponse`、`InsurancePurchaseRequest`、`PolicyExistsException`；`POLICY_EXISTS` / `INSURANCE_PURCHASE` 相关枚举分支移除。
- 新增 `InsuranceProperties` / `InsuranceConfig`（`routeme.insurance.*`）、`InsuranceProductEnum`（无价格 / 保额）；`InsurancePolicy` 只保留提供方 / 保障期 / 状态 / 确认时刻。
- `POST /trips/{tripId}/insurance/purchase` 只返回第三方跳转地址（附 `trip_id`）；`POST /trips/{tripId}/insurance/confirm` 供演示回写；两者都不触碰钱包。
- 前端删除 `FinancePlanCards.tsx`，新增第三方保险面板与演示同步按钮；行程详情展示实时保险状态。
- E2E 改为「新窗口带 `trip_id` → 演示回写 → 状态持久化」；还款后余额为 `¥9,950.00`（初始 10,000 + 950 净额 − 1,000 应还）。
- 本次返工使 2026-11-17 的 P1–P4 签名失效，全部签名槽位重置为待复审。

## 1. 实现摘要

| 层 | 变更 |
|---|---|
| 迁移 | `V30__add_travel_finance.sql`：`user_wallet` / `wallet_ledger` / `insurance_policy` / `travel_loan`；钱包与账本 CHECK、借款 CHECK（含 `principal_cents % 100 = 0`、`term_days IN (7,14,30)`、费用 / 净额 / 应还恒等）、`ux_insurance_policy_user_trip`、`ux_travel_loan_active_user`（`active_user_id` 为 NULL 不计数）、4 个普通索引、存量账号回填 1,000,000 分；保险表无保费 / 保额 / 保单号 / 证件 / 银行卡列 |
| 配置 / 枚举 | `InsuranceProperties` / `InsuranceConfig`（提供方名称与投保 / 保单 / 理赔 / 求助地址，默认 `example.com`）；`InsuranceProductEnum`（wire `accident_medical` / `emergency_rescue` / `travel_baggage`，无价格）、`WalletDirectionEnum`、`WalletEntryTypeEnum`、`LoanStatusEnum`、`FinanceFeeConstant`（仅借款 5%） |
| 钱包 | `WalletServiceImpl`：`ensureWallet` / `read` / `debit` / `credit` / `ledgerOf`；CAS + 同事务流水 + id 冲突重试；注册同事务建钱包 |
| 保险 | `InsuranceServiceImpl`：`purchaseUrl` 返回第三方地址（附 `trip_id`，不扣款、不写记录）；`confirm` 幂等回写 `ACTIVE`，保障期取行程起止日；`wireStatus` 在保障结束后派生 `EXPIRED`；不落库 `EXPIRED` |
| 借款 | `LoanServiceImpl`：整元 100–2,000、净额 = 本金 − 5%、`due_at = funded_at + N 天`、每人 1 笔 `ACTIVE`、还款扣本金并释放槽位、逾期只读派生 |
| 资格 | `FinanceEligibility`：发布者或 `ACCEPTED` 同行者；行程 `recruiting` / `full` / `ongoing`；投保入口 / 回写 / 借款要求账号 `ACTIVE`；还款不受账号状态阻断；`companion_count = participants − 1` |
| 契约 | `openapi.yaml` 0.25.0：6 条路径、11 个 schema、3 个新错误码（`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`）、成功示例、`readOnly` 标注；删除 `/finance/plans` 与站内商品 schema，`POLICY_EXISTS` 退休 |
| 前端 | `finance/{TripFinancePage,FinancePage,InsurancePanel,WalletCard,LoanForm,PolicyList,LoanList}.tsx`、`financeFormat.ts`、`financeEligibility.ts`、`financeLabels.ts`、`i18n/financeMessages.ts`；`route.ts` 两条路由；`TripDetailPage` 保障区块（含实时状态）；`AppShell` 账号菜单与侧边栏入口；`.fin-*` 样式 |
| 测试 | 后端 8 个测试类；前端 4 个测试文件；`e2e/tests/finance.spec.ts` 3 条 |

## 2. 验证结果（2026-11-18 返工后）

| 项 | 结果 |
|---|---|
| 后端全量 | 618 passed / 0 failed / 0 error / 0 skipped（`mvnw -B -ntp clean verify`，BUILD SUCCESS） |
| 前端构建 | Pass（`tsc --noEmit && vite build`） |
| 前端单测 | 60 文件 / 482 passed（`vitest run`） |
| E2E 金融 | 3/3 passed（`playwright test tests/finance.spec.ts`） |
| Redocly | 0 error / 26 warning（`openapi.yaml` 0.25.0，低于 main 基线 28） |
| OpenSpec | valid（`openspec validate add-travel-finance --strict`） |
| 本地库 | 删除 `SqlLite/routeme.db` 后由 Flyway 重建 `V1`–`V30`，`flyway_schema_history` 末行为 `30 / add travel finance / success` |
| 反向验证 | 11 项 Non-goals 全部通过（含不承保 / 不定价、无敏感字段、客户端不能改写提供方或价格、信用分不变） |

后端计数从第一轮的 643 降至 618，原因是 main 已移除推荐引擎并删除其契约测试，且本次返工删除了站内商品相关用例；前端同理（488 → 482）。

## 3. 偏差

1. 业务规则拒绝返回 409，与 `@rule:api-contract` 的 422 表述不一致；沿用仓库先例与已签 Delta，保持状态码不变。
2. 原型 `docs/prototype/v1` 已由 main 归档，本 change 不新增原型资产；界面证据以生产 UI 与 E2E 为准。
3. T5 修复 HEAD `openapi.yaml` 的既有缺陷（重复 mapping key、无效示例等），使基线从「不可解析」变为 0 error。
4. `application.yaml` 全局设 `mybatis-plus.configuration.local-cache-scope: statement`，消除同事务一级缓存读到旧余额的问题。
5. 第三方投保入口在演示环境指向 `example.com` 占位页，真实回调 / 验签未接入（Out of scope）。
6. NFR（并发压测 / 交易监控 / 审计导出）deferred，未验证。
7. E2E 不在 CI；全量套件依赖本地双服务与共享演示库。

## 4. 残余风险

- 演示级 `X-User-Id` 身份；真实鉴权需另开 change。
- 演示钱包 10,000 元与借款 5% 费率为产品口径常量，真实资金场景需重新评审。
- 保险状态依赖第三方确认；差异由第三方对账负责，页面固定展示提供方名称与「不承保、不参与理赔」说明。
- 账本不分页、无 down 迁移。
- 契约 / 迁移号依赖合并顺序（main 已用 0.24.0 + `V29`；再被抢占时整体顺延）。
- 全量 E2E 既有债务（AI planner / auth 等），本次只保证金融 3/3 通过；建议单独立项修复。
- 需求条目 §4 仍写站内商品与保险 5% 费用，与本次实现不一致，待文档窗口修订。

## 5. 签署

| 角色 | 签署位 | 姓名 | 状态 |
|---|---|---|---|
| 当前开发者（报告 2 / 2） | 验证报告 + 质量报告 | Karena | 已批准（2026-11-18 复审通过） |
| IO（报告 1 / 2） | 验证报告 + 质量报告 | WAYNE | 已批准（2026-11-18 复审通过） |
| VL | `g2-decision.md` | Neal | G2 Pass with documented debt（2026-11-18） |

**阶段结论：Pass with documented debt**；4 个 P4 签署位已于 2026-11-18 复审通过；PR #42 已提交且 CI 2/2 通过；G2 由 Neal 于 2026-11-18 批准，已合并到 `main`；P5 归档按用户指示不执行。

## 6. Rebase 与返工复测（2026-11-18）

两轮 rebase 后按合并代码与测试集重跑。第一轮落到 `origin/main@f4a7c65`（契约 0.24.0 + `V28`），第二轮 main 前进 8 个提交到 `origin/main@822471c`（已占 0.24.0 + `V28`/`V29`），本 change 按「后到者顺延」落定 **0.25.0 + `V30`**；保险返工后再次全量复测，结果见 §2。

rebase 冲突处理中修复的回归：

1. `AppShell.tsx` 合并时丢失账号菜单「旅行保障」入口与 `financeMessages` 导入；已按原实现补回，E2E 步骤「账号菜单 → 旅行保障 → `#/finance`」恢复通过。
2. `target/classes` 残留旧迁移 `V25__add_travel_finance.sql`，与 main 的 `V25__credit_enforcement.sql` 版本号冲突，导致 491 个 Spring 上下文加载错误；改为 `clean verify` 并在构建前清理残留副本后恢复。
3. 第二轮 rebase 后 `target/classes` 又复制出 `V28__add_travel_finance.sql`，与 main 的 `V28__credit_exit_evidence.sql` 重名；删除后 `clean verify` 通过（`V30` 为唯一新增版本）。
4. `api.test.ts` 以 main 版本为底并重贴 finance 用例块，导入改为 `openInsurancePurchase` / `confirmInsurance` / `createLoan` / `repayLoan`。
5. 迁移测试 `TravelFinanceMigrationSqliteTest` 的版本断言由 `'25'` 改为 `'30'`；原断言在 main 占用 `V25` 后会误命中 `credit_enforcement`，属潜在缺陷，本次一并修正。
6. 保险返工后 `TravelFinanceInsuranceApiTest` 与 `OpenApiTest` 的金融用例重写；`finance.spec.ts` 的还款后余额改为 `¥9,950.00`，无资格文案与 `financeMessages.ts` 对齐。

## 7. 下一步

1. ~~完成 P1–P4 复审与签名（WAYNE、Karena、Lewis Liu）~~：2026-11-18 已回收 WAYNE 与 Karena 的全部签署位；`design.md` / `tasks.md` 工件 2（Lewis Liu）2 个签署位仍待签。
2. ~~提交（verify 提交）并开 PR~~：2026-11-18 提交 `24ae282` 并开 [PR #42](https://github.com/afs-2026-zha3-group-2/RouteME/pull/42)；CI 2/2 通过（Backend `./mvnw -B -ntp verify`、Frontend `build && test`），无冲突、可自动合并。提交前 rebase 到 `origin/main@5cb67ff`：唯一冲突 `frontend/src/styles.css` 以「保留 main 的 AI 样式块 + 追加本 change 的 459 行」解决，rebase 后本地复验前端 62 文件 / 493 tests、后端 618。
3. ~~VL 签 G2~~：`g2-decision.md` 由 Neal 于 2026-11-18 签为 **Pass with documented debt**。
4. ~~P5 归档~~：按用户 2026-11-18 指示不执行；`openspec/changes/add-travel-finance/` 保留在 `main` 作为变更记录，Living Spec 不合并。