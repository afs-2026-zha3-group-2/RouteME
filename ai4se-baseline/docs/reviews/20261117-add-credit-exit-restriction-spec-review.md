# Artifact review — add-credit-exit-restriction / spec

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 Delta Spec 评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`specs/credit-enforcement/spec.md`](../../openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md)（ADDED：9 Requirement / 46 Scenario）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/add-credit-exit-restriction/proposal.md)
  - [`requirements/REQ-022-exit-credit-restriction.md`](../../requirement-workspace/requirements/REQ-022-exit-credit-restriction.md) §4（S22-1 ~ S22-22 / S23-1 ~ S23-24）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-022 增补」①–④
  - Living Spec 基线：`openspec/specs/trip-companions/spec.md`「退出同行」；未归档 `add-credit-account/specs/user-credit/spec.md`、`add-trip-cancel/specs/trip-cancellation/spec.md`
- **Evidence:**
  - [`openspec validate add-credit-exit-restriction --strict`](../../openspec/changes/add-credit-exit-restriction/) → `Change 'add-credit-exit-restriction' is valid`；Delta 为纯 ADDED（0 MODIFIED / 0 REMOVED），不与 Living Spec 的既有 Requirement 块相交
  - 规则核对：`rules/process/rules.md#spec-first`（P2 门槛：ADDED 描述变更 + 每条带可验证场景）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`（capability 名词短语 kebab-case）、`#document-conventions`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#pii-scrubbing`
  - 场景与 AC 映射核对：S22-1 ~ S22-22、S23-1 ~ S23-24 → 9 条 Requirement 的 46 个 Scenario，无孤儿场景、无未覆盖 AC

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已当场收口） | `rules/documentation/rules.md#sdd-artifacts` | Requirement「受限账号只读与保留能力」第 1 段 | 初稿只列六类写操作，未覆盖撤回申请、退出同行、取消/结束行程等；D9 的「只读账号」应覆盖全部写操作 | 已改写为「……以及撤回申请、退出同行、取消或结束行程等其它写操作」，并保留 403 `CREDIT_RESTRICTED` 统一拒绝 | [fact] |
| F-2 | SUGGESTION（P3 承接） | `rules/architecture/rules.md#api-contract` | Requirement「退出原因与预计信用影响」与「无管理员边界与事务一致性」 | 规格未定退出预览/确认的请求响应形态、403 envelope、`credit_restricted` 字段的 `required` | P3 `design.md` 与契约任务排他确认；P4 契约测试断言成功 / 400 / 403 示例 | [fact] |
| F-3 | SUGGESTION（P3 承接） | `rules/process/rules.md#spec-first` | Requirement「免责退出与待核实」Scenario「待核实核实不属实」 | 本 change 无管理端；核实的领域行为没有入口，P3 需决定是内部服务方法 + 单测，还是标为未来 change | P3 设计明确「领域方法 + 单测、无 controller」；不向客户端暴露入口 | [inference] |
| F-4 | SUGGESTION（P5 承接） | `rules/process/rules.md#spec-first` | Requirement「退出原因与预计信用影响」 | 本 Delta 不改「退出同行」的聊天语义；活规格与 `refine-trip-chat` 未归档 Delta 的差异仍在 | 本 change 不触碰聊天语义；P5 归档前由 SA 对活规格与未归档 Delta 做具名追认 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4（1 当场收口 / 3 承接）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单一新能力 `credit-enforcement`（ADDED）；`user-credit` / `trip-companions` / `trip-cancellation` 只作依赖；不改未归档 Delta |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景已可测） | 46 个场景均含可观察结论；分数、账本、状态、错误码、计数、展示均可直接转 ATDD 断言 |
| D Security | Pass | 限制原因仅本人；他人只见徽标；不展示明细；不做管理端；安全原因保留举报入口 |
| E Process | Pass | Delta 为 ADDED，首段不带引言归档风险；`validate --strict` 通过 |
| F Documentation | Pass | Requirement / Scenario 命名清晰；时间边界左闭右开；月度计数与待核实的顺序有明确场景 |
| G Traceability | Pass | S22-1~22 → 退出原因/阶梯/旅行中与月度/免责；S23-1~24 → 触发/只读/自动清理/展示与解除/无管理端与事务；无孤儿场景 |

## Residual risks

- 契约 / 迁移号需与在途 `add-ai-itinerary` 排他确认；冲突会阻塞 P3 任务排序。
- 待核实退出的核实动作没有管理端入口；P3 需决定内部领域方法与测试边界，不向客户端暴露。
- 低信用演示数据 / E2E 触发路径未定；P3 决定种子 / 夹具 / 直接记账。
- 自动清理跨域事务较大；P3 需评估批量、索引与失败回滚，P4 用集成测试锁定「无半状态」。
- `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 的聊天语义差异不在本 change 解决。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/credit-enforcement/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文（9 Requirement / 46 Scenario） |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
