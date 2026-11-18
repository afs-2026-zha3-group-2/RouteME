# Artifact review — add-credit-exit-restriction / design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`design.md`](../../openspec/changes/add-credit-exit-restriction/design.md)（D1–D20 + 数据模型 + 契约 + 守卫 + 前端 + 风险）
- **Supporting inputs:**
  - [`proposal.md`](../../openspec/changes/add-credit-exit-restriction/proposal.md)
  - [`specs/credit-enforcement/spec.md`](../../openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md)（ADDED 9 Requirement / 46 Scenario）
  - [`dov-ac-review.md`](../../openspec/changes/add-credit-exit-restriction/dov-ac-review.md)、[`g1-decision.md`](../../openspec/changes/add-credit-exit-restriction/g1-decision.md)
  - [`atdd-design.md`](../../openspec/changes/add-credit-exit-restriction/atdd-design.md)
  - [`tasks.md`](../../openspec/changes/add-credit-exit-restriction/tasks.md)
- **Evidence:**
  - `openspec validate add-credit-exit-restriction --strict` → valid；`node --check` 通过原型 4 个 JS 文件
  - 现状核对：`CreditService.book` / `CreditServiceImpl`、`ApplicationServiceImpl.leave`、`TripPlanServiceImpl.cancel`、`TripCancelReasonEnum`、`ChatServiceImpl.send`、`UserProfileServiceImpl.toProfile`、`TripApplicationEntity`、`V20` 迁移、`openapi.yaml` 0.14.0
  - 规则核对：`rules/architecture/rules.md#api-contract` / `#java-patterns` / `#package-structure`；`rules/process/rules.md#spec-first` / `#artifact-review-gate` / `#tdd-cycle`；`rules/security/rules.md#security-baseline` / `#pii-scrubbing`；`rules/testing/rules.md#java-testing` / `#web-testing`；`rules/documentation/rules.md#sdd-artifacts`

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P4 承接） | `rules/architecture/rules.md#java-patterns` | D3 / D4 / §3 依赖图 | `CreditServiceImpl` 发布事件、`CreditEnforcementServiceImpl` 监听并调用 `ApplicationService` / `TripPlanService`；虽然设计上无环，但 Spring 启动期仍需验证 | T4 加一个 `@SpringBootTest` 上下文启动断言；若出现环，按 D4 把监听器拆到独立 `@Component`，不改变接口 | [inference] |
| F-2 | SUGGESTION（P4 承接） | `rules/architecture/rules.md#api-contract` | §4.1 / §7 `LeavePreview` / `LeaveResult` | `message_code`、`applied_delta` 在待核实 / 0 分裁断下的取值需要契约示例锁定 | T1 为 48h -5、7d 0、待核实、0 分裁断、旅行中 -15 各写一个 example；`OpenApiTest` 断言 schema | [fact] |
| F-3 | SUGGESTION（P4 承接） | `rules/process/rules.md#spec-first` | D13 / §5.1 自动清理 | 自动清理跨聚合（申请、关系、行程）在同一事务内，批量大时可能长事务 | T5/T7 用集成测试锁定无半状态；`acceptedByUser` / `published` 查询加索引；P4 记录批量上限与失败回滚证据 | [inference] |
| F-4 | SUGGESTION（已记录） | `rules/documentation/rules.md#sdd-artifacts` | §3 `UserProfile` 字段 / `toProfile` | 现有 `toProfile(entity, includeBirthday)` 同时承担「本人」语义；新增 `credit_restriction_reason` 只给本人时容易误用 | T8 增加 `includePrivate` 语义常量或注释；API 测试断言他人响应无 reason | [inference] |
| F-5 | SUGGESTION（P4 承接） | `rules/process/rules.md#tdd-cycle` | §4.3 退出事务 / D10 幂等 | 「先 markLeft / removeCompanion，再 book，再写 exit_event」顺序若被改动，限制监听器可能重复处理同一关系 | T5 用并发/重复提交测试锁定：一次 LEFT、一条账本、一条 exit_event、一次分数变化；代码注释固定顺序 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 新能力 `credit-enforcement` 单边界；guard 为叶子，event 解耦；不改未归档 Delta；依赖图无环（待 T4 启动验证） |
| B Quality | Pass | 决策 D1–D20 均有选择 / 放弃替代 / 理由；数据模型、事务、幂等、错误码清晰 |
| C Testing | Pass（计划） | ATDD A1–A5 / E1–E3 + Defer UT；迁移双引擎；不新增测试写接口 |
| D Security | Pass | 服务端 guard 为安全边界；原因仅本人；无管理端；举报/安全保留；无硬编码密钥 |
| E Process | Pass | 设计在 G1 后、P4 前；契约/迁移排他；TDD 顺序明确 |
| F Documentation | Pass | 正文中文、标识符英文；相对路径；无绝对机器路径；规则锚点可解析 |
| G Traceability | Pass | 46 Scenario → Requirement → Design D → Task T 可追；无孤儿 |

## Residual risks

- `CreditService.book` 事件监听器在 Spring 上下文中的循环依赖风险；T4 启动测试锁定。
- 自动清理长事务与批量上限；T5/T7/T13 集成测试锁定。
- 契约 / 迁移号暂定 0.15.0 + V21；P4 落库前确认。
- 待核实 `reviewExit` 无管理端入口；本 change 只做领域方法 + 单测。
- `trip-companions` 聊天语义差异仍留 P5 前 SA 追认。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| `design.md` | 2 / 2（非当前开发者、非 WAYNE） | Jay | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
