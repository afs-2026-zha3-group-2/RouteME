# Artifact review — add-travel-finance / design

- **Verdict: Pass（建议）**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 技术设计工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17（2026-11-18 保险返工后复审）
- **Artifact under review:** [`design.md`](../../openspec/changes/add-travel-finance/design.md)（D1–D12）
- **Supporting inputs:**
  - [`specs/travel-finance/spec.md`](../../openspec/changes/add-travel-finance/specs/travel-finance/spec.md)（10 Requirement / 40 Scenario，WAYNE 已复审通过 2026-11-18）
  - [`atdd-design.md`](../../openspec/changes/add-travel-finance/atdd-design.md)（E1–E40 分层映射）
  - [`tasks.md`](../../openspec/changes/add-travel-finance/tasks.md)（T0–T12）
  - [`proposal.md`](../../openspec/changes/add-travel-finance/proposal.md)（D1–D12，WAYNE 已复审通过 2026-11-18）
  - [`g1-decision.md`](../../openspec/changes/add-travel-finance/g1-decision.md)（C1–C7）
  - [`consistency-lint.md`](../../openspec/changes/add-travel-finance/consistency-lint.md)（L-01–L-07）
  - [`dov-ac-review.md`](../../openspec/changes/add-travel-finance/dov-ac-review.md)
  - 前序评审：[`20261117-add-travel-finance-proposal-review.md`](20261117-add-travel-finance-proposal-review.md)、[`20261117-add-travel-finance-spec-review.md`](20261117-add-travel-finance-spec-review.md)
- **Evidence:**
  - `npx.cmd openspec validate add-travel-finance --strict` → `Change 'add-travel-finance' is valid`
  - 结构核对：`design.md` 含 D1–D12 共 12 条决策；`atdd-design.md` 含 E1–E40 共 40 行映射，覆盖 40/40 Delta Scenario
  - 迁移基线：`backend/src/main/resources/db/migration` 现有 head 为 `V29__credit_exit_application.sql`，`V30` 由本 change 占用；`V20__add_credit_account.sql` 提供「普通唯一索引 + NULL 不计数」的可复用先例
  - 契约基线：`RouteME/openapi.yaml` 当前 `info.version = 0.25.0`；`OpenApiTest` 在 `in_openApiFile_out_tripPlanContractDeclared` 与 `in_openApiFile_out_adminConsoleContractDeclared` 两处断言版本，`SPEC_PATH = Path.of("..", "openapi.yaml")` 确认路径为 `RouteME/openapi.yaml`
  - 既有锚点：`TripTimeZoneConstant.ZONE = Asia/Shanghai`、`ApplicationService.isAccepted(tripId, userId)`、`TripPlanService.requireCurrent`、`AuthServiceImpl.register` 的 `@Transactional` + `creditService.ensureAccount`
  - 前端路由：`route.ts` 现有 `^/trips/(\d+)/applications$` 与 `^/trips/(\d+)$`，新增 `^/trips/(\d+)/finance$` 无解析冲突；`api.ts` 已有 `loadMyTrips`
  - 配置锚点：`routeme.insurance.*` 由 `InsuranceProperties` / `InsuranceConfig` 绑定，默认 `example.com`；仓库无外部 HTTP 客户端调用
  - 规则核对：`rules/architecture/rules.md#api-contract`、`#java-patterns`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/process/rules.md#artifact-review-gate`、`#tdd-cycle`；`rules/security/rules.md#security-baseline`；`rules/documentation/rules.md#sdd-artifacts`

## 复审说明（2026-11-18）

保险按第三方模式重写设计：

- D1 的 `insurance_policy` 改为「提供方 / 保障起止日 / 状态 / 确认时刻」，取消保费、保额、保单号、证件与银行卡列；
- D3 改为 `InsuranceProperties` 配置 + 无价格 `InsuranceProductEnum`；5% 费率仅服务借款；
- D4 改为投保跳转（不扣款、不写记录）+ 幂等确认回写 + 读取时派生 `EXPIRED`；
- D8 契约删除 `/finance/plans` 与站内商品 schema，新增 `InsuranceRedirect`，错误码从 4 个减为 3 个（`POLICY_EXISTS` 退休）；
- D12 原型改为「已归档，不新增资产」。

D1–D12 编号与 `tasks.md`、`atdd-design.md` 仍一一对应；本报告签名位因内容变化重置。

## Findings

| id | severity | rule | location | issue | suggested_fix | status |
|---|---|---|---|---|---|---|
| D-01 | WARNING | `rules/architecture/rules.md#api-contract` | `design.md` D8「Schema」段 | `WalletLedgerEntry` 只列了 schema 名，未给 `direction` / `entry_type` / `related_type` 的枚举取值；Delta R2 要求流水含「业务类型 + 关联业务标识」，契约无枚举则 `OpenApiTest` 与前端文案缺少权威取值 | 在 D8 明确 wire 小写枚举：`direction ∈ [credit, debit]`、`entry_type ∈ [loan_disbursement, loan_repayment]`、`related_type ∈ [travel_loan]`，`related_id` 为字符串 | **已修** |
| D-02 | WARNING | `rules/architecture/rules.md#java-patterns` | `design.md` D2 / D8 | Delta R2 要求「按发生顺序回算」且「不存在前后余额断链」，但设计未规定 `ledgerOf` 与契约集合的排序；若返回降序或未定义顺序，`balance_before` / `balance_after` 的链式校验与页面展示都会出现歧义 | D2 规定 `ledgerOf` 按 `occurred_at ASC, id ASC` 返回；D8 在 `MyFinance.ledger` 与 `WalletLedgerEntry` 集合描述注明同序，前端按返回顺序渲染 | **已修** |
| D-03 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` D1 `insurance_policy` | 原设计只校验保费 + 服务费恒等，服务费未入库约束 | 保险已无金额列；借款侧保留 `CHECK (service_fee_cents = principal_cents * 5 / 100)`、`disbursed` / `repay` 恒等 | **已消解** |
| D-04 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` D8 `MyFinance` | `GET /me/finance` 返回全部流水且无分页，契约未说明数据规模上界，后续可能被当作可无限增长的列表 | 明确演示阶段不分页（交易量受行程数与单笔借款约束），分页 / 审计导出列入 NFR deferred，增长时另开 change | **已修** |
| D-05 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `design.md` D12 | 原型历史使用单数 `#/trip/{id}/finance`，产品路由为复数 `#/trips/{tripId}/finance` | D12 注明 `docs/prototype/v1` 已归档，本 change 不新增原型资产，界面以生产 UI 与 E2E 为准 | **已修** |
| D-06 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` D8 / 实现落点表 | 契约文件只写 `openapi.yaml`，未给路径 | D8 与落点表写明 `RouteME/openapi.yaml`（即 `OpenApiTest` 的 `../openapi.yaml`） | **已修** |
| D-07 | SUGGESTION | `rules/security/rules.md#security-baseline` | `design.md` D3 / D4 | 第三方地址与提供方名称若由客户端传入，存在改写风险 | D3 规定来自 `routeme.insurance.*` 配置；D8 明确 `purchase_url` / 提供方为服务端生成；Delta R3 有「客户端不能改写提供方或价格」场景 | **已修** |

**Counts:** BLOCKER 0 / WARNING 2（已修）/ SUGGESTION 5（4 已修 / 1 已消解）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 四表职责单一（钱包真相 / 台账 / 保险记录 / 借款）；金额与费率只在 `FinanceFeeConstant` 一处；保险提供方与入口只在 `InsuranceProperties` 一处；契约 / 迁移号已排他（0.25.0 + V30） |
| B Quality | Pass | 钱包 CAS `WHERE balance_cents = before` + 同事务流水 + 0 行重读；业务唯一索引兜底；无浮点（整数分 + 整数除法） |
| C Testing | Pass | 40/40 场景有分层落点；D12 列出后端 8 类 / 前端 4 文件 / E2E 1 个；并发重试、跨日到期、封禁还款都有替代验证路径（`atdd-design.md` §4、§7） |
| D Security | Pass | 资格与账号状态均由服务端强制；还款刻意绕开 `assertCanWrite` 以结清债务；他人 `loanId` 返回 403 不泄漏存在性；无改余额端点；无投保敏感字段；第三方地址服务端配置 |
| E Process | Pass | Delta 与 G1 已产出后产出设计；`validate --strict` valid；D1–D12 与 tasks T1–T12 一一承接 |
| F Documentation | Pass | 正文中文、标识符 / 错误码 / 枚举英文；金额口径、时区口径、状态派生均有明文；风险与回滚单列 |
| G Traceability | Pass | 10 个 Requirement 全部落到决策；`atdd-design.md` E1–E40 与 `tasks.md` T1–T12 对齐表无孤儿场景；3 个新增错误码全部有契约归属（D8），`POLICY_EXISTS` 退休已注明 |

## Residual risks

- 409 用于业务规则拒绝（`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`）与 `@rule:api-contract` 的 422 表述不一致；沿用仓库既有先例与 Delta，作为已知偏差在 P4 验证报告注明。
- 身份仍为演示级 `X-User-Id`，越权防护依赖服务端过滤；若未来接入真实鉴权需另开 change 收紧。
- 保险状态与第三方实际状态可能不一致；RouteMe 只保存第三方确认结果，差异由第三方对账负责。
- 契约 0.25.0 + `V30` 依赖合并顺序；main 已用 0.24.0 + `V29`，若号段再被抢占需整体顺延并在 PR 记录。
- 账本不分页属演示取舍；真实用户交易量增长后需另开分页 / 归档 change。
- NFR（并发压测、交易监控、审计导出）deferred，P4 报告需显式列出未验证项。

## Next remediations（non-Gate）

- P4 按 `atdd-design.md` §3 顺序写红态用例，先 `WalletServiceImplTest` 的 CAS 0 行分支与迁移测试。
- P4 落地 D8 时同步更新 `OpenApiTest` 的两处版本断言与新增契约断言，并跑 `redocly lint`（`redocly.yaml` 在 `RouteME/`）。
- P5 归档时把 409 偏差与 NFR deferred 写入验证报告。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 工件 1 / 2（当前开发者） | Karena | 2026-11-18 | 2026-11-18 保险返工后复审通过（当前开发者） | D1–D12 全文 |
| `design.md` | 工件 2 / 2（非当前开发者且非 WAYNE） | Lewis Liu | 待重签 | 待 Lewis Liu 复审确认（尚未回收） | D1–D12 全文 |
| 本评审报告 | 报告 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 2026-11-18 保险返工后复审通过（发起人确认） | 结论与签署位 |
| 本评审报告 | 报告 2 / 2（当前开发者） | Karena | 2026-11-18 | 当前开发者复审（Karena） | 结论与签署位 |

> 2026-11-17 的原签署因保险返工失效；2026-11-18 返工后已回收 Karena（3 处）与 WAYNE（1 处）的复审通过；`design.md` 工件 2（Lewis Liu）签署位仍未回收，P3 正式关闭需先补齐该签署位。