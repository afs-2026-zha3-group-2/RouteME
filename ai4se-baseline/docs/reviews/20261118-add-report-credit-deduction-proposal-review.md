# Artifact review — add-report-credit-deduction / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 提案评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-report-credit-deduction/proposal.md)（D1–D5 / 26 场景 / 12 项 DoR）
- **Supporting inputs:**
  - [`requirements/REQ-028-report-credit-deduction.md`](../../requirement-workspace/requirements/REQ-028-report-credit-deduction.md)、[`intents/REQ-028-report-credit-deduction.md`](../../requirement-workspace/intents/REQ-028-report-credit-deduction.md)
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-report-credit-deduction/specs/user-credit/spec.md) 与 [`specs/admin-console/spec.md`](../../openspec/changes/add-report-credit-deduction/specs/admin-console/spec.md)（Delta 草稿，用于反向核对提案与 Delta 是否分叉）
  - [`registry.md`](../../requirement-workspace/registry.md)、[`stories.md`](../../requirement-workspace/stories.md)（S29）、[`handoff.md`](../../requirement-workspace/handoff.md)、[`impact-brief.md`](../../requirement-workspace/impact-brief.md) §25、[`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-028 增补」
- **Evidence:**
  - 规则核对：`rules/process/rules.md#spec-first`（P1 门槛：问题 / 范围 / Actors / 场景 / 约束 / 证据 / 能力影响 / OQ 八段齐全）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`
  - 现状复核：`AdminReportServiceImpl.resolve` 的成立分支只调 `applyPenalty`（`SUSPEND / BAN / UPDATE_BAN`；`KEEP` 返回）；`BanReasonEnum` 为 8 码值；`ReportServiceImpl.REASONS` 为 4 类；`CreditService.book(CreditBooking)` 支持 `relatedType` / `relatedId` / `idempotencyKey` 与 0–100 裁断；`CreditEnforcementServiceImpl.onCreditChanged` 在 `>= 60 → < 60` 时建立限制；`openapi.yaml` `info.version` 为 `0.24.0`；migration 头为 `V27__add_credit_learning.sql`
  - 扣分表逐项复核：issue #29 的 8 类 → 10 / 15 / 30 / 20 / 20 / 10 / 30 与 `OTHER` 四档，与提案 §范围 / §2 R-1 / R-2 一致
  - `openspec validate add-report-credit-deduction --strict` → `Change 'add-report-credit-deduction' is valid`；INFO：`admin-console` 活规格不存在，归档阶段才拒绝 MODIFIED（已登记）
  - 依赖顺序复核：`add-credit-account` 已落 `user_credit_account` / `credit_ledger`；`add-admin-console` 已落举报 4 态与处置；`add-credit-exit-restriction` 已落 `CreditChangedEvent` 限制链路

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已收口） | `rules/documentation/rules.md#document-conventions` | 首部「本回合状态」 | 初稿写 `openspec validate --strict` 待跑，与已执行的校验结果不一致 | 已回填 `valid` 与 `admin-console` 归档 INFO 说明 | [fact] |
| F-2 | WARNING（已收口） | `rules/process/rules.md#spec-first` | §7 DoR #12 与 Ready 条目 §9 #12 | 同一 DoR 项在提案记 Pass、在 Ready 条目记 Partial（表单布局 / 文案待 P3），口径不一致 | 已在提案 DoR #12 注明「契约层面 Pass；布局 / 文案按更严口径记 P3 WARNING」 | [fact] |
| F-3 | WARNING（保留，待 G1） | `rules/process/rules.md#artifact-review-gate` | §范围 D1、§5 `admin-console`、§8 残余风险 | D1 改写 `add-admin-console` 已交付的「举报成立并处罚」「被举报用户已处于受限状态」两个基线场景，属于对未归档 change 语义的替换 | G1 由 SA 具名追认 D1；归档 MUST 排在 `add-admin-console` 之后；P4 回归用户管理页暂停 / 封禁 | [fact] |
| F-4 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | §2 R-6、Delta `user-credit`「成立扣分并生成记录」 | 该场景同时断言举报状态变为 `RESOLVED`，属跨能力集成断言；分层时容易与 `admin-console` 的职责重叠 | P3 ATDD 将「报告状态迁移」归 `admin-console`，「分数 / 账本」归 `user-credit`；保留一条端到端集成用例即可 | [inference] |
| F-5 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | §2 R-1、Delta「七类固定扣分」 | 7 类固定扣分合写在一条场景内，断言强度依赖文字描述 | P3 为 7 类各生成参数化用例（同一 Given / When，多组类型 → 分值），确保每类都有可执行断言 | [inference] |

**Counts:** BLOCKER 0 / WARNING 2（1 已收口 / 1 保留待 G1）/ SUGGESTION 3（1 已收口 / 2 保留）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 扣分归 `user-credit`（只经 `CreditService.book`），处置归 `admin-console`（MODIFIED 1 Requirement），低分限制只读消费既有 `CreditChangedEvent`；无新端点、无新表 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景可测） | 26 条场景均含可观察结论（分值、状态、账本字段、错误码）；扣分表与 issue 逐项一致 |
| D Security | Pass | 管理员会话校验沿用 `AdminPrincipalService`；扣分对象由服务端推导；客户端不可指定任意扣分值；举报人不可见处理备注与扣分细节 |
| E Process | Pass | D1–D5 全部具名裁定；Scope in / out 均非空；`validate --strict` 有效；质量检查报告 `docs/ai4se-plugins/20261118-095648-quality-checklist-report.md`（P1 Overall Pass） |
| F Documentation | Pass | 证据表逐条可复核；无绝对机器路径；`registry` / `stories` / `handoff` 已登记 |
| G Traceability | Pass | REQ-028 → S29 → proposal → 双 Delta → P3 tasks 可追；剩余缺口仅在 F-3 的归档顺序与 G1 追认 |

## Residual risks

- `admin-console` 未归档：MODIFIED Delta 在归档阶段会被拒绝，归档 MUST 排在 `add-admin-console` 之后；`user-credit` 同理排在 `add-credit-account` 之后。
- D1 与已交付 S22 行为不同（举报页不再暂停 / 封禁）；需 G1 SA 具名追认，P4 回归用户管理页能力。
- `resolution_action` 历史值与新语义共存；新值不再写入，旧值只读展示，不回填。
- 预览的「处理后分数」在服务端与前端各派生一次，P3 需固定以服务端响应为准，避免截断不一致。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | D1–D5 / §范围 / §6 OQ / §7 DoR |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis（SM） | 2026-11-18 | 发起人当次会话指定当前开发者并确认「全部批准」 | 结论与签署位 |
