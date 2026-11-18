# Artifact review — add-travel-finance / proposal

- **Verdict: Pass（建议）**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17（2026-11-18 保险返工后复审）
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-travel-finance/proposal.md)
- **Supporting inputs:**
  - [`requirements/REQ-028-travel-finance.md`](../../requirement-workspace/requirements/REQ-028-travel-finance.md)（33 场景 S29-1 ~ S29-33，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-028-travel-finance.md`](../../requirement-workspace/intents/REQ-028-travel-finance.md)（证据锚点 + 用户裁决 D1–D12）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-028 增补」（①–④ 四表 + 探针记录）
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §28
  - [`stories.md`](../../requirement-workspace/stories.md)（S29）与 [`stories/add-travel-finance.story.md`](../../requirement-workspace/stories/add-travel-finance.story.md)
  - P0 基线：[`docs/sdd/add-travel-finance/p0-baseline.md`](../sdd/add-travel-finance/p0-baseline.md)
- **Evidence:**
  - `openspec validate add-travel-finance --strict` → `Change 'add-travel-finance' is valid`
  - 空白基线核实：`RouteME/**` grep `wallet|insurance_policy|travel_loan|service_fee|balance_cents`（P0 时点）→ 0 命中。
  - 写守卫核实：`AccountStatusService.assertCanWrite(long, WriteScopeEnum)` 仅对 `SUSPENDED + BUSINESS` 阻断；`WriteScopeEnum` 为 `BUSINESS / REPORT / SUPPORT`，本提案要求还款绕过 `BUSINESS` 守卫有代码依据。
  - 注册与账本范式核实：`AuthServiceImpl.register` 为单事务并已内嵌信用账户初始化；`V20__add_credit_account.sql` 已使用条件唯一索引（`WHERE`）写法，可复用于「每人 1 笔 `ACTIVE` 借款」。
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#security-baseline`、`#pii-scrubbing`；`rules/testing/rules.md#web-testing`
  - 迁移与契约排他核实：rebase 后 main 为 `0.24.0` + `V28` / `V29`；本 change 落定 `0.25.0` + `V30`

## 复审说明（2026-11-18）

发起人收敛保险边界后，Proposal 重写为第三方模式：

- 新增 D4「第三方入口 + 状态回写」、D5「最小保险数据」、D11「配置驱动」；原站内商品目录、保费与保险 5% 服务费删除；
- 5% 服务费只作用于借款（从本金扣、发放净额）；
- 明确不保存保单号 / 证件 / 银行卡 / 保费 / 保额；`EXPIRED` 读取时派生；
- 契约与迁移顺延为 0.25.0 + V30；
- 验收信号扩展为 14 条，覆盖第三方跳转、状态回写、到期派生与无敏感字段。

本报告原 Pass 结论在返工后仍成立；4 个签名位因工件内容变化重置为待复审。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已消解） | `rules/documentation/rules.md#sdd-artifacts` | proposal 影响面「迁移」行 | 迁移文件名曾用 `V*__add_travel_finance.sql` 占位 | 已落定 `V30__add_travel_finance.sql`，并在决策与残余风险注明合并顺序 | [fact] |
| F-2 | SUGGESTION（P2/P3 承接） | `rules/architecture/rules.md#api-contract` | proposal 影响面「`openapi.yaml`」行 | 只声明端点与 schema，未定路径、`required`、错误码与 4xx 示例 | P2 Delta 与 P3 `design.md` 定稿路径与 schema；金额统一 `*_cents`；每个写端点补成功 + 4xx 示例 | [fact] |
| F-3 | SUGGESTION（已消解） | `rules/architecture/rules.md#java-patterns` | proposal 决策「账本幂等」行 | 幂等曾靠「唯一约束 + 状态迁移」表述，未定并发实现 | P3 `design.md` 明确 CAS 条件更新 + 0 行重读，并配 `WalletServiceImplTest` | [inference] |
| F-4 | SUGGESTION（P2 承接） | `rules/documentation/rules.md#sdd-artifacts` | REQ-028 §4 与 proposal 验收信号 | REQ-028 §4 仍按旧口径描述站内商品与保险 5% 费用，与收敛后的 Proposal 不一致 | Delta 以发起人 2026-11-18 收敛为准；需求条目待文档窗口修订（`g1-decision.md` C7） | [inference] |
| F-5 | SUGGESTION（已消解） | `rules/testing/rules.md#web-testing` | proposal 影响面「测试」行 | 只列测试类型，未落 ATDD 分层与红→绿切片 | P3 `atdd-design.md` 给出 API / 纯函数 UT / E2E 分层与 E1–E40 编号 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5（3 已消解 / 2 由 P2–P3 承接）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `travel-finance`（ADDED），符合「one change = one capability」；钱包与信用分账户分表，避免给只读评分赋予支付语义；保险只是第三方入口 + 状态记录 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（计划已列） | 提案列出钱包 / 第三方保险 / 借款服务单测、注册集成、响应断言、前端纯函数单测与 E2E 五类，待 P3 ATDD 细化 |
| D Security | Pass | 明确「无客户端改余额端点」「服务端资格为唯一权威」「只返回本人数据」「不保存投保敏感信息」；demo `X-User-Id` 属既有基线，已在基线记录为残余风险 |
| E Process | Pass | proposal 与 Ready 条目 / 故事 / deep-dive / impact 同批；工件评审按 `artifact-review-gate` 执行；未触碰代码、契约或迁移 |
| F Documentation | Pass | 正文中文、标识符与命令英文；引用规则用锚点；无绝对机器路径；金额单位统一 `*_cents`；保险不出现金额字段 |
| G Traceability | Pass | 33 场景 ↔ §3 范围 ↔ 14 条验收信号 ↔ D1–D12 可追；保险 / 借款 / 钱包 / 资格各自有对应场景组，无孤儿验收信号 |

## Residual risks

- 契约版本号与迁移号依赖合并顺序；当前落定 0.25.0 + `V30`，再被抢占时整体顺延。
- 需求条目 §4 与收敛后的 Proposal 存在已知差异，需在下一文档窗口修订。
- 幂等的具体实现与余额并发控制留到 P3；若只用「先查后写」，双击 / 并发下仍可能重复扣款，需以数据库约束 + 条件更新双重兜底。
- 第三方真实投保无法在本期接入；演示用配置 + 演示确认端点，真实回调 / 验签 / 对账列入 Out of scope。

## Next remediations（non-Gate）

- `/sdd:delta-craft`：把场景收敛为 `travel-finance` Delta（ADDED），补齐端点级成功 / 4xx 示例与场景编号映射。
- `/sdd:atdd-design` → `/sdd:task-plan`：ATDD 分层、余额并发与幂等设计、契约 / 迁移号排他。
- 无 Gate 结论；本报告不构成 G1。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 待重签 | 2026-11-18 保险返工后需重新确认 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 待重签 | 同上 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Karena | 2026-11-18 | 当前开发者复审（Karena） | 结论与签署位 |

> 2026-11-17 的原签署（WAYNE + Karena）因保险返工失效；本报告需 WAYNE 重新审阅签署后 P1 阶段关闭。