# G1 decision — add-travel-finance

- **Gate:** G1（Align）
- **Change:** `add-travel-finance`（`travel-finance` ADDED，REQ-028 / S29）
- **Timestamp:** 2026-11-17（保险改为第三方入口 + 状态回写后于 2026-11-18 复审）
- **Recorded by:** Karena（当前开发者）；模型不代替人工批准，签署待 IO / SA 具名确认

## 复审说明（2026-11-18）

发起人收敛保险边界：RouteME 不设计保险产品、不计算保费、不承保、不参与理赔，只提供第三方投保入口并在第三方确认后回写状态。据此：

- Proposal 重写为 D1–D12，新增「第三方模式」「不保存敏感信息」「配置驱动」三组决策；原站内商品目录、保费与保险 5% 服务费全部移除；
- Delta Spec 由 38 场景调整为 40 场景，R3 / R4 / R5 重排为「第三方入口」「状态回写与保障期」「状态查询与资格」；
- 保险记录不保存保单号 / 证件 / 银行卡 / 保费 / 保额；`EXPIRED` 读取时派生；
- 契约落定 **0.25.0**、迁移 **`V30__add_travel_finance.sql`**（main 已占用 0.24.0 + V28 / V29）；
- 此前 2026-11-17 的 P1 / P2 / P3 / P4 签名因保险返工失效，需按签署矩阵重新审阅。

`requirement-workspace/requirements/REQ-028-travel-finance.md` §4 仍按旧口径描述站内商品与保险 5% 费用，与本记录存在已知源文档差异；以发起人 2026-11-18 收敛为准，需求条目待后续文档窗口修订。

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、D1–D12 与残余风险齐全；`travel-finance` ADDED；理赔 / 退保 / 罚息 / 管理后台 / 真实机构对接显式排除；**待 WAYNE 重签** |
| Delta Spec — `travel-finance` | [`specs/travel-finance/spec.md`](specs/travel-finance/spec.md) | 10 Requirement / 40 Scenario；ADDED；`openspec validate --strict` valid；**待 WAYNE 重签** |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ-028 §4 全覆盖（含 5 条收敛说明）；基线保留 N/A；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 7 / N/A 1 |
| P1 artifact review | `docs/reviews/20261117-add-travel-finance-proposal-review.md` | Pass 结论保留；签名槽位重置为待复审（2026-11-18 返工） |
| P2 artifact review | `docs/reviews/20261117-add-travel-finance-spec-review.md` | Pass 结论保留；签名槽位重置为待复审（2026-11-18 返工） |
| P0 baseline | `docs/sdd/add-travel-finance/p0-baseline.md` | 后端 618 / 前端 482 当前基线；缺口 G-01 ~ G-06；契约 0.25.0 + V30 |
| Requirements | `requirement-workspace/requirements/REQ-028-travel-finance.md` | 33 场景 S29-1 ~ S29-33；blocking OQ 0；DoR BLOCKER 0；§4 保险口径滞后于 2026-11-18 收敛 |
| Intent | `requirement-workspace/intents/REQ-028-travel-finance.md` | 候选能力 ADDED；Discovery `Go`；D1–D10 |
| Impact brief | `requirement-workspace/impact-brief.md` §28 | as-is 盘点、delta、blast radius、风险与拆分边界 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-028 增补」 | ①–④ 四表 + 探针记录；A0 ⑨–⑫ 通过 |
| Implementation evidence | `TripPlanEntity` / `TripPlan.status()`、`TripApplicationEntity`、`ApplicationStatusEnum`、`AccountStatusService`、`WriteScopeEnum`、`AuthServiceImpl.register`、`V20__add_credit_account.sql` | 行程状态派生、`ACCEPTED` 同行判定、写守卫、注册单事务、部分唯一索引范式 |
| Contract evidence | `RouteME/openapi.yaml` 0.25.0 | 错误码 `FORBIDDEN` / `TRIP_NOT_OPEN` / `INVALID_INPUT` / `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` / `INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`；`POLICY_EXISTS` 已退休 |
| Prototype evidence | `docs/prototype/v1`（已归档） | 本 change 不新增原型资产；界面证据以生产 UI 与 E2E 为准 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-028 意图一致：演示钱包与账本、第三方保险入口与状态回写、借款与还款、借款 5% 服务费、资格与入口、精度与幂等；无承保 / 定价 / 理赔 / 退保 / 罚息 / 提现 / 管理后台 / 通知 / 信用分 | `proposal.md` §范围；`dov-ac-review.md` DoV-1 |
| Ambiguity | blocking OQ 0；D1–D12 已固化；保险到期与借款逾期均读取时派生、还款不受账号状态阻断、提供方与入口来自配置均写明 | `dov-ac-review.md` DoV-2；REQ-028 §8 |
| Conflict | 无阻塞冲突；钱包与信用分账户分表；保险不产生钱包流水；纯 ADDED 不抢既有 Requirement 块 | `consistency-lint.md` 6–17 |
| Traceability | REQ-028 33 场景全部有 Delta 落点；新增 5 条合规 / 入口场景已说明来源；13 条验收信号均有对应 Requirement | `dov-ac-review.md` §Requirement mapping |
| Residual risk | 源文档 §4 滞后、3 个新增错误码（已入契约）、余额并发（CAS 已定）、契约 / 迁移号（已排他）、第三方真实对接 | `dov-ac-review.md` §残余风险；`consistency-lint.md` L-01–L-07 |

## Decision

**Pass（建议）** — 待 IO / SA 具名重签后生效。

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | 3 个新增业务码（`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`）写入契约，补成功 + 4xx 示例，`OpenApiTest` 断言集合，并确认 `POLICY_EXISTS` 退休 | SA / Dev | P3 design（已完成） |
| C2 | 余额变动与放款的并发控制（CAS 条件更新 + 0 行重读）+ 双击 / 重试用例 | Dev | P3 design / P4 verify（已完成） |
| C3 | 契约版本与迁移号排他确认，避开 main 的 0.24.0 + V28 / V29 | Dev | P3 design（落定 0.25.0 + V30） |
| C4 | 原型：`docs/prototype/v1` 已归档，本 change 不新增资产；以生产 UI 与 E2E 作为界面证据 | Dev | P3 / P4（已按此收敛） |
| C5 | 借款到期使用注入 `Clock`；还款绕过 `BUSINESS` 写守卫，第三方投保入口 / 状态回写 / 借款保留守卫 | Dev | P3 / P4（已完成） |
| C6 | 第三方保险提供方与入口全部走 `routeme.insurance.*` 配置，默认 `example.com` 演示地址；不保存保单号 / 证件 / 银行卡 / 保费 / 保额 | Dev | P3 / P4（已完成） |
| C7 | 需求条目 §4 保险口径待修订，使其与第三方模式一致 | SM / Dev | 下一个文档窗口 |

## Approvers

| 角色 | 姓名 | 状态 |
|---|---|---|
| IO | WAYNE | 待重签（2026-11-18 返工） |
| SA | Jacky | 待重签（2026-11-18 返工） |
| 当前开发者 | Karena | 已确认（2026-11-18 复审） |
| VL | Neal | 不适用（G1 签署矩阵为 IO + SA） |
| SM | Lewis | 不适用（G1 签署矩阵为 IO + SA） |

签署来源：发起人 2026-11-17 确认「G1 = WAYNE + Jacky，全部批准」；2026-11-18 保险返工后需重新确认。本记录不代替后续 G2 / G3 的独立签署。

## Next

- IO / SA 重签后 → P4 报告重审 → verify 提交 / PR / CI → G2。
- C1–C6 已在 P3 / P4 完成；C7 留待文档窗口。
- 归档在 P5；契约 / 迁移号已在合并 `origin/main` 后确认。