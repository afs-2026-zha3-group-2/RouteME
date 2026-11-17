# Artifact review — add-credit-exit-restriction / tasks

- **Verdict: Pass**
- **Scope:** focus=tasks（`@rule:artifact-review-gate` 的 P3 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`tasks.md`](../../openspec/changes/add-credit-exit-restriction/tasks.md)（T0–T14 + 对齐自检 10/10）
- **Supporting inputs:**
  - [`design.md`](../../openspec/changes/add-credit-exit-restriction/design.md)（D1–D20）
  - [`atdd-design.md`](../../openspec/changes/add-credit-exit-restriction/atdd-design.md)（A1–A5 / E1–E3 / Defer UT）
  - [`specs/credit-enforcement/spec.md`](../../openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md)（ADDED 9 Requirement / 46 Scenario）
  - [`g1-decision.md`](../../openspec/changes/add-credit-exit-restriction/g1-decision.md)
- **Evidence:**
  - `openspec validate add-credit-exit-restriction --strict` → valid
  - 任务分层：T1 contract / T2–T8 backend / T9–T12 frontend+e2e / T13 回归 / T14 docs
  - 契约与迁移在 T3–T12 之前；每条任务有 Owner、复选框、验证命令
  - 对齐自检 10/10 Pass（46 Scenario、A/E 覆盖、单层、无扩范围、系统清退不扣分、低信用测试不新增写接口、原型先行、未归档 Delta 不改）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P4 承接） | `rules/process/rules.md#spec-first` | T1 / T2 | 契约 0.15.0 与 V21 仍为暂定；`add-ai-itinerary` 曾声明同号 | T1/T2 开工前确认实际合并顺序；冲突则顺延 0.16.0 + V22，回写 design / tasks | [fact] |
| F-2 | SUGGESTION（P4 承接） | `rules/testing/rules.md#java-testing` | T5 / T7 | `reviewExit` 与自动清理的并发/事务测试是高风险项，任务文字只写到 API 测试 | T5 明确 `reviewExit` 为真/不属实 + 并发重复提交；T7 明确系统清退绕过 guard 的集成断言 | [inference] |
| F-3 | SUGGESTION（已记录） | `rules/testing/rules.md#web-testing` | T10–T12 | 限制展示 E2E 依赖 `page.route` 模拟，若 route 匹配不全会出现假绿 | T12 明确匹配 `**/api/users/credits**` 与 `**/api/users/*/profile`，并在测试中断言他人无 reason | [fact] |
| F-4 | SUGGESTION（P4 承接） | `rules/process/rules.md#tdd-cycle` | T13 | 全量 E2E 存在既有 map/trips 债务，可能掩盖本 change 的真实失败 | T13 先跑本 change 三条 spec，再跑全量；报告中区分新增失败与既有债务 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 任务按契约 → 迁移 → 领域 → 服务 → 守卫 → 响应 → 前端 → E2E 排序；无跨层捷径 |
| B Quality | Pass | 每条任务单层、单 Owner、带验证命令；无「顺手重构」范围 |
| C Testing | Pass | A1–A5 / E1–E3 落到 T5/T7/T10/T12/T13；Defer UT 在 T3/T4/T9 |
| D Security | Pass | 守卫任务覆盖写入口；无管理端 / 测试写接口；举报/安全保留 |
| E Process | Pass | T0 原型已完成；T14 G2；未归档 Delta 不改 |
| F Documentation | Pass | 任务路径 / 命令相对；无绝对机器路径 |
| G Traceability | Pass | 46 Scenario → T1–T12；对齐自检 10/10 |

## Residual risks

- 契约 / 迁移号与在途 change 撞号；T1/T2 前确认。
- 自动清理事务与并发；T5/T7/T13 锁定。
- 限制展示 E2E 的 route mock 覆盖面；T12 明确。
- 全量 E2E 既有债务；T13 区分新增失败。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `tasks.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| `tasks.md` | 2 / 2（非当前开发者、非 WAYNE） | Neal | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
