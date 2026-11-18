# Artifact review — add-report-credit-deduction / Delta Spec

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 Delta 评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:**
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-report-credit-deduction/specs/user-credit/spec.md)（ADDED：3 Requirement / 16 Scenario）
  - [`specs/admin-console/spec.md`](../../openspec/changes/add-report-credit-deduction/specs/admin-console/spec.md)（MODIFIED：1 Requirement / 19 Scenario）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/add-report-credit-deduction/proposal.md)（D1–D5 / 26 场景）
  - [`requirements/REQ-028-report-credit-deduction.md`](../../requirement-workspace/requirements/REQ-028-report-credit-deduction.md) §4 R-1 ~ R-26
  - 既有 `admin-console` Delta：[`add-admin-console/specs/admin-console/spec.md`](../changes/add-admin-console/specs/admin-console/spec.md) 的「举报详情与处理」（基线 10 场景）
  - 既有 `user-credit` 语义：[`add-credit-account/specs/user-credit/spec.md`](../changes/add-credit-account/specs/user-credit/spec.md)（账户 / 账本 / 零值留痕）
- **Evidence:**
  - `openspec validate add-report-credit-deduction --strict` → `Change 'add-report-credit-deduction' is valid`；INFO：`admin-console` 活规格不存在（MODIFIED 仅归档阶段拒绝，已登记）
  - 场景映射抽验：`user-credit` R-1 ~ R-5 / R-6 ~ R-10 / R-14 / R-16 ~ R-20 → 16 条；`admin-console` 8 条基线保留 + 11 条新增 / 替换 → 19 条
  - 扣分表逐项复核：`HARASSMENT -10` / `FAKE_TRIP -15` / `FRAUD_RISK -30` / `ILLEGAL_CONTENT -20` / `IMPERSONATION -20` / `NO_SHOW_DISRUPTION -10` / `PRIVACY_LEAK -30` / `OTHER (-5/-10/-20/-30)`，与 issue #29 一致
  - 现状复核：`CreditService.book` 的 0–100 裁断与 `applied_delta = 0` 留痕、`idempotency_key` 唯一索引、`CreditEnforcementServiceImpl.onCreditChanged` 的跨 60 判定、`AdminReportServiceImpl.resolve` 的条件更新与事务边界

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING（已收口） | `rules/process/rules.md#spec-first` | `admin-console` §处理段与「处理说明必填」场景 | 初稿把「违规原因」同时用于成立与驳回；驳回时不存在「违规」，字段语义不清 | 已改为「处理说明（成立时为违规原因，不成立时为驳回说明；必填，≤500 字）」 | [fact] |
| F-2 | WARNING（保留，待 G1） | `rules/process/rules.md#artifact-review-gate` | `admin-console` MODIFIED「举报详情与处理」 | 整块替换既有 Requirement：基线 10 场景中 8 条保留、2 条（「举报成立并处罚」「被举报用户已处于受限状态」）按 D1 被替换；属于对未归档 change 的语义改写 | G1 由 SA 具名追认；P2 `consistency-lint` 记录基线保留 8/10 + 2 条显式替换；归档排在 `add-admin-console` 之后 | [fact] |
| F-3 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `user-credit`「七类固定扣分」 | 7 类固定扣分合写为一条场景，文字列举多组断言 | P3 用参数化用例逐类断言（`HARASSMENT` → -10 等 7 组） | [inference] |
| F-4 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `user-credit`「成立扣分并生成记录」 | 同时断言举报状态变为 `RESOLVED`，跨能力断言 | P3 将状态断言放 `admin-console` / 集成用例，分数与账本断言放 `user-credit` | [inference] |
| F-5 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `admin-console`「被举报用户已受限时仍只扣分」 | 覆盖 `SUSPENDED / BANNED / 信用自动限制` 三种既有状态，但未逐状态给出差异断言 | P3 ATDD 为三种状态各给一条或参数化断言（均只扣分、账号状态不变） | [inference] |

**Counts:** BLOCKER 0 / WARNING 2（1 已收口 / 1 保留待 G1）/ SUGGESTION 3（保留）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | `user-credit` 只追加扣分规则 / 记账 / 低分联动；`admin-console` 只改处置语义；两者不互相复制判定实现 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景可测） | 35 条 Delta 场景均含可观察结果；扣分、幂等、截断、预览与低分联动均可断言 |
| D Security | Pass | 管理员权限沿用既有 `requireAdmin`；扣分对象服务端推导；客户端不可指定分值；举报人不可见处理备注与扣分细节 |
| E Process | Pass | 双 Delta 通过 `validate --strict`；D1–D5 与场景一一对应；基线保留 / 替换已说明 |
| F Documentation | Pass | 场景命名与 REQ-028 R-1 ~ R-26 有映射；证据可复核；无绝对机器路径 |
| G Traceability | Pass | REQ-028 → proposal → 双 Delta → P3 tasks 链路可追；剩余缺口为 F-2 的 G1 追认与归档顺序 |

## Residual risks

- `admin-console` 的 MODIFIED 在归档阶段会因活规格不存在被拒绝；归档 MUST 排在 `add-admin-console` 之后。`user-credit` 同理排在 `add-credit-account` 之后。
- 2 条基线场景按 D1 被替换，若 G1 SA 不接受，本变更需回到 pre-spec 重新讨论「举报页是否保留账号处罚」。
- `resolution_action` 历史值保留只读；P4 需确保旧举报详情不因新字段为空而渲染异常。
- 低分联动的清退行为由既有 `credit-enforcement` 负责；P4 只做回归，不新增实现。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/user-credit/spec.md` + `specs/admin-console/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 3 Requirement / 16 Scenario + 1 Requirement / 19 Scenario 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis（SM） | 2026-11-18 | 发起人当次会话指定当前开发者并确认「全部批准」 | 结论与签署位 |
