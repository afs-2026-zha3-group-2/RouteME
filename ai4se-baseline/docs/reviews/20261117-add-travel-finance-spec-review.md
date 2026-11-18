# Artifact review — add-travel-finance / spec

- **Verdict: Pass（建议）**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P2 Delta Spec 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17（2026-11-18 保险返工后复审）
- **Artifact under review:** [`specs/travel-finance/spec.md`](../../openspec/changes/add-travel-finance/specs/travel-finance/spec.md)
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/add-travel-finance/proposal.md)（2026-11-18 返工，待 WAYNE 重签）
  - [`requirements/REQ-028-travel-finance.md`](../../requirement-workspace/requirements/REQ-028-travel-finance.md)（33 场景 S29-1 ~ S29-33）
  - [`intents/REQ-028-travel-finance.md`](../../requirement-workspace/intents/REQ-028-travel-finance.md)（D1–D12）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-028 增补」
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §28
  - 前序评审：[`20261117-add-travel-finance-proposal-review.md`](20261117-add-travel-finance-proposal-review.md)
- **Evidence:**
  - `openspec validate add-travel-finance --strict` → `Change 'add-travel-finance' is valid`
  - Delta 统计：`travel-finance` **ADDED**，10 Requirement / 40 Scenario
  - 错误码核对：`ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` / `FORBIDDEN` / `TRIP_NOT_OPEN` / `INVALID_INPUT` 均为仓库既有异常；`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE` 为本次新增业务码，已在 P3 写入契约；`POLICY_EXISTS` 已退休
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/architecture/rules.md#api-contract`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`
  - `openspec show --json` 仍对中文「## 问题」标题报 `Why section`，属项目既有约定差异；`validate --strict` 不受影响，本报告不据此判 Fail

## 复审说明（2026-11-18）

保险按第三方模式重写后，Delta 由 38 场景扩展为 40 场景：

- R3 改为「第三方旅行保险入口」：保障页展示行程上下文 + 提供方名称 + 保单 / 理赔 / 求助入口；打开入口不扣款；客户端不能改写提供方或价格；保险不影响同行。
- R4 改为「第三方投保状态回写与保障期」：确认后记 `ACTIVE`、保障期取行程起止日、重复回写幂等、保障结束后派生 `EXPIRED`、不保存敏感信息、投保不回写钱包。
- 删除原「三款固定商品 / 保费 / 保险 5% 服务费 / 同行程同风险唯一」场景；5% 仅保留在借款端。
- 仍为纯 `ADDED`，不替换任何 Living Spec 块。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已消解） | `rules/architecture/rules.md#api-contract` | Delta「借款申请与 5% 服务费」「金额精度」 | 3 个新增业务码曾未进入 `openapi.yaml` | P3 `design.md` 与契约补齐错误码、HTTP 状态与示例；`OpenApiTest` 断言集合；`POLICY_EXISTS` 退休 | [fact] |
| F-2 | SUGGESTION（已消解） | `rules/architecture/rules.md#java-patterns` | Delta「钱包账本与余额可回算」 | 只要求「同事务 + 非负」，未定并发控制实现 | P3 明确 CAS 条件更新 + 0 行重读，并在 `atdd-design.md` 配重试用例 | [inference] |
| F-3 | SUGGESTION（已消解） | `rules/testing/rules.md#java-testing` | Delta 全文 | 40 个场景需给红→绿分层与测试编号映射 | P3 `atdd-design.md` 建立 E1–E40 映射，保留反向验证（余额不足、重复提交、越权、无敏感字段） | [fact] |
| F-4 | SUGGESTION（已消解） | `rules/documentation/rules.md#sdd-artifacts` | Delta「保障期」与「到期时刻」 | 「日期」与「时刻」混用可能引起时区 / 跨日歧义 | 保险保障期按日期（含首尾）、借款到期按「发放时刻 + 期限天数」；P3 统一注入 `Clock` 与时区口径 | [inference] |
| F-5 | SUGGESTION（已记录） | `rules/process/rules.md#spec-first` | Delta 场景总数 40 vs REQ 33 | Delta 新增 5 条第三方便利 / 合规边界场景，数量不一致 | 差异属细化与合规钉桩；`dov-ac-review.md` 逐条说明来源，需求条目 §4 待文档窗口修订 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5（4 已消解 / 1 已记录）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `travel-finance`（ADDED）；钱包 / 流水 / 保险记录 / 借款四表职责清晰；保险只是第三方入口与状态记录；契约影响已在提案与 Delta 同步声明 |
| B Quality | N/A | P2 无实现 |
| C Testing | N/A（计划已列） | 每个 Requirement 均有可观察 Scenario；余额不足、重复回写、单笔借款、逾期、越权、幂等、无敏感字段均有反向场景 |
| D Security | Pass | 资格与账号状态由服务端强制；明确「无客户端改余额端点」「不返回他人数据」「不保存保单号 / 证件 / 银行卡 / 保费 / 保额」；新增业务码不泄露内部细节 |
| E Process | Pass | Proposal 后产出 Delta；`validate --strict` valid；未触碰代码、契约或迁移；单 capability 符合 spec-first |
| F Documentation | Pass | 正文中文、标识符与错误码英文；Requirement / Scenario 结构符合 OpenSpec；金额统一整数分，保险无金额字段 |
| G Traceability | Pass | 10 个 Requirement 覆盖 REQ 的钱包 / 保险 / 借款 / 资格 / 入口 / 精度全部场景组；新增 5 条已在 `dov-ac-review.md` 注明来源，无孤儿验收信号 |

## Residual risks

- 需求条目 §4 与收敛后的 Delta 存在已知差异；需在下一文档窗口修订，避免后续采用旧口径。
- 余额并发策略已在 P3 定为 CAS；并行压测仍 deferred。
- 借款到期按「发放时刻 + N 天」而非自然日结束时刻；已注入 `Clock` 固化，跨时区部署仍需注意。
- 迁移号与契约版本已排他（0.25.0 + V30），再被抢占需整体顺延。
- 第三方真实投保无法在本期接入；演示用配置 + 演示确认端点。

## Next remediations（non-Gate）

- `/sdd:delta-craft` 复核：补 S29 → Delta Scenario 映射与 3 个错误码的契约归属。
- P2 G1：按 `g1-decision.md` 收集 IO / SA 重签意见（本报告不构成 G1）。
- P3：`design.md` / `atdd-design.md` / `tasks.md` 已产出，待复审。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/travel-finance/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 待重签 | 2026-11-18 保险返工后需重新确认 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 待重签 | 同上 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Karena | 2026-11-18 | 当前开发者复审（Karena） | 结论与签署位 |

> 2026-11-17 的原签署（WAYNE + Karena）因保险返工失效；本报告需 WAYNE 重新审阅签署后 P2 阶段关闭。