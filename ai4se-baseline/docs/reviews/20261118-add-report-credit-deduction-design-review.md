# Artifact review — add-report-credit-deduction / Design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 设计评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review：**
  - [`design.md`](../../openspec/changes/add-report-credit-deduction/design.md)（D1–D10 / 契约 / 数据 / 前后端 / 安全 / 回滚）
  - [`atdd-design.md`](../../openspec/changes/add-report-credit-deduction/atdd-design.md)（A1–A18 / E1–E9 / R1–R5；NFR 不纳入）
  - 原型：[`admin-report-resolve.html`](../prototype/admin-report-resolve.html)
- **Supporting inputs：**
  - Delta：`specs/user-credit/spec.md`（16 Scenario）+ `specs/admin-console/spec.md`（20 Scenario）
  - G1：`g1-decision.md`（Conditional；C1 / C2）
  - 现状：`AdminReportServiceImpl.resolve` / `AdminReportResolveRequest` / `ReportedUserResponse` / `CreditService.book` / `CreditEnforcementServiceImpl.onCreditChanged` / `V21__admin_console.sql`

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `design.md` D5 | `ReportedUser` 共享 schema 使列表也返回 `credit_score` / `credit_level`；提案影响面只写到详情 | P4 在列表页不展示；若后续要求列表展示，另开 UI 评审 | [fact] |
| S-2 | SUGGESTION（保留） | `rules/testing/rules.md#tdd-cycle` | `design.md` D4 | 新增 `CreditService.snapshot` 是只读契约；若实现误用 `read` 会产生建账户副作用 | T3 必须包含「snapshot 不写库」的断言 | [inference] |
| S-3 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `design.md` D7 | 成立时 `resolution_action=null`；前端历史动作展示需处理 null | T7 明确 `null → 不展示 / 显示 —`，并用历史举报用例覆盖 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 扣分只经 `CreditService.book`；低分联动只消费既有事件；未新增第二套限制或写分路径 |
| B Quality | N/A | P3 无实现 |
| C Testing | Pass | ATDD 覆盖 API / E2E / 反向；并发、截断、历史数据、G1 C1 / C2 均有落点 |
| D Security | Pass | 管理员权限沿用；扣分对象服务端推导；客户端不可指定分值 |
| E Process | Pass | 契约先行、迁移先于业务、原型先行；NFR 经用户确认不纳入 |
| F Documentation | Pass | 决策含 Context / 选择 / 被否决方案；契约与字段有样例 |
| G Traceability | Pass | D1–D10 → T1–T12 → A/E/R 场景链路完整；G1 C1 / C2 有承接 |

## Residual risks

- 前后端扣分映射双端维护，存在漂移风险；由双端单测与 P4 交叉核对缓解。
- `ReportedUser` 扩展会改变列表响应字段（非破坏性），前端列表不改展示。
- 契约 `0.25.0` / 迁移 `V30` 可能被远端占用；P4 开工前复核。
- 归档 MUST 排在 `add-admin-console` 与 `add-credit-account` 之后。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` + `atdd-design.md` | 1 / 2（当前开发者） | Lewis（SM） | 2026-11-18 | 发起人当次会话确认 | D1–D10 与 ATDD 分层全文 |
| `design.md` + `atdd-design.md` | 2 / 2（非当前开发者、非 WAYNE） | Jay（AO） | 2026-11-18 | 发起人当次会话指定第二签署人 | D1–D10 与 ATDD 分层全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「批准评审签署」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis（SM） | 2026-11-18 | 发起人当次会话确认「批准评审签署」 | 结论与签署位 |
