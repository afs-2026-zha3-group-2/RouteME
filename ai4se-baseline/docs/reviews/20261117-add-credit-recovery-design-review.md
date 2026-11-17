# Artifact review — add-credit-recovery / design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 技术设计评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`design.md`](../../openspec/changes/add-credit-recovery/design.md)（D1–D14）
- **Supporting inputs:**
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-recovery/specs/user-credit/spec.md)（7 Requirement / 29 Scenario）
  - [`atdd-design.md`](../../openspec/changes/add-credit-recovery/atdd-design.md)（A1–A29）
  - 原型截点 `docs/prototype/credit-learning.html`
  - 既有实现事实：`V20__add_credit_account.sql`、`CreditServiceImpl.book`、`CreditService`、`TripController.create`、`GlobalExceptionHandler`、`AbstractServiceImpl.nextId`、`ClockConfig`、`TripTimeZoneConstant`、`JsonListUtils`
- **Evidence:**
  - 规则核对：`rules/architecture/rules.md#api-contract`、`#package-structure`、`#java-patterns`；`rules/quality/rules.md#naming-conventions`、`#web-coding-style`；`rules/security/rules.md#security-baseline`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/process/rules.md#spec-first`；`rules/documentation/rules.md#sdd-artifacts`
  - **双库兼容硬约束复核**：`V20__add_credit_account.sql` 首段注释「脚本必须同时兼容 SQLite（开发/生产）与 H2（测试），只用两边都支持的语法」→ 设计 D8 放弃 `SELECT … FOR UPDATE`（SQLite 无此语法）成立；§1 SQL 实测无生成列、无 `strftime`、无 JSON 函数
  - **并发兜底依据复核**：`CreditServiceImpl.book` 第 106–109 行 `catch (DuplicateKeyException)` 返回 `toCredit(requireAccount(...))`，配合 `ux_credit_ledger_idempotency` 唯一索引，可保证同幂等键只生效一次；`ledgerExists` 已存在，新增只读 `recorded(key)` 无需改表
  - **拦截点形状复核**：`TripController.create` 为 `require(userId)` → `tripPlanService.create(...)` → `201`，`assertCanPublish` 插入点明确；`TripPlanServiceImpl` 未被污染，复制 / 草稿路径不受影响
  - **号位复核**：`migration` 目录实际最大号 V20，`openapi.yaml` `info.version: 0.14.0`；`openspec/changes/` 23 个目录中 `add-ai-itinerary` 登记 `0.15.0 + V21` → 本变更取 `0.16.0 + V22` 无冲突
  - **测试环境复核**：`backend/src/test/resources/application.properties` 为 `jdbc:h2:mem:routeme` → A29 的 H2 双线程并发用例可落地
  - `npx --no-install openspec validate add-credit-recovery --strict` → `Change 'add-credit-recovery' is valid`
- **变更摘要（2026-11-17，评审中修订）：** ①§3.3 判定顺序改为「先配额后资格」；②新增 D14（原因码文案归属）；③§2 明确阈值 60 单点定义；④§5 补 R6 取数时机口径。四项均为评审发起，D1–D13 的选择本身未变。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING（已收口） | `rules/process/rules.md#spec-first` | §3.3 提交作答伪代码 | 初稿先判 `before >= 60` 再判 `recorded(key)`。在「本月已恢复过、之后分数又被压回 < 60」或并发窗口内，会出现同一事实被判成 `LEARNING_NOT_ELIGIBLE`（资格问题）而非 `LEARNING_RECOVERY_QUOTA_EXCEEDED`（配额问题），与 R5「已恢复 → 返回可展示原因」及 A20 的断言码不符 | 已改为先 `recorded(key)` 后 `before >= 60`，并在 §3.5 写明「先配额后资格」的理由；`tasks.md` T6 同步 | [fact] |
| F-2 | WARNING（已收口） | `rules/process/rules.md#spec-first` | 决策总览 / §2 分层表 | `atdd-design.md` A17 要求「原因码 → 『安全学习信用恢复』」的映射单测，但设计未定义该文案的归属与载体，P4 会出现「有任务、无落点」；若放前端，因本 change 不开放读账本端点会变成无消费者的死代码 | 新增 **D14**：后端 `enums/CreditReason` 提供 `SAFETY_LEARNING_RECOVERY` 与 `label()`，§2 表补落点，`tasks.md` T6 补子项 | [fact] |
| F-3 | WARNING（已收口） | `rules/process/rules.md#spec-first` | §2 常量行 vs §3.4 拦截 | Delta R1 要求「阈值 MUST 只在服务端一处实现」，初稿 §2 只说常量含「阈值 60」，未约束 `CreditGateServiceImpl` 是否另写字面量；P4 极易形成两处 60，后续调阈值会分叉 | §2 已补「60 只在此定义，`CreditGateServiceImpl` 与 `CreditLearningServiceImpl` 一律引用，不写字面量」；`tasks.md` T7 的验证列要求 `grep -n "60" CreditGateServiceImpl` 仅命中注释 | [fact] |
| F-4 | SUGGESTION（已收口） | `rules/process/rules.md#artifact-review-gate` | §5 前端文件表 | R6 的五展示面需要「恢复后展示正确」的口径；初稿只写「路由切换时取数」，未说明与「不手动刷新」的关系，与 Delta 原文（评审中已同样修订）存在解释空间 | §5 已补「R6 五展示面口径」：进入 / 重新进入取数，不做原地轮询；不引入全局信用状态 | [fact] |
| F-5 | SUGGESTION（已收口） | `rules/architecture/rules.md#java-patterns` | §1 `passed INTEGER` | `INTEGER` 列 ↔ Java `Boolean` 的映射在 SQLite 与 H2 上未在设计中给出证据，属最小风险点 | 不改列型（`CHECK … IN (0,1)` 已是整数语义）：`tasks.md` T2 增加 `status` / `passed` / `score` 写读往返断言覆盖两种库 | [inference] |
| F-6 | SUGGESTION（P4 承接） | `rules/process/rules.md#tdd-cycle` | §3.3 `recovery_applied` 与 `book` 返回值 | 并发下第二个事务撞唯一索引时 `book` 返回的是**本事务读到**的账户值（可能仍是 45），因此该请求的 `recovery_applied` 会是 `false`，而全局分数已由另一事务达成 60。这不是缺陷，但断言写「本次 `recovery_applied === true`」会随机失败 | A29 只断言「恢复账本条数 = 1」与「终值 = 60」；不断言单个请求的 `recovery_applied`。P4 验证报告需记录该口径 | [inference] |
| F-7 | SUGGESTION（保留） | `rules/architecture/rules.md#api-contract` | §4 `lessons/complete` 响应 | 复用 `LearningSession` 会在完成学习时再次下发 10 道题面（约 1 KB），语义上略冗余 | 保留：换取少一个 schema 与少一处前后端类型分歧；题面已由 §3.1 下发，前端按 id 覆盖即可 | [inference] |

**Counts:** BLOCKER 0 / WARNING 3（全部已收口）/ SUGGESTION 4（1 已收口 / 1 P4 承接 / 2 保留）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | `controller → service → mapper` 分层；`CreditGateService` 与 `CreditLearningService` 分职（拦截 / 学习），二者只经 `CreditService` 读写分数；无 controller→dao 捷径；不在 `TripPlanServiceImpl` 内埋拦截 |
| B Quality | Pass | 命名与既有 `XxxService` / `XxxEntity` / `XxxMapper` / `XxxException` 一致；D1–D14 每条含否决理由 |
| C Testing | Pass | 设计把 API / E2E / UT 三层与 ATDD 对齐；迁移门禁显式禁 `FOR UPDATE` / 生成列 / `strftime` / JSON 函数；A29 的断言口径已按 F-6 收敛 |
| D Security | Pass | 答案不下发（DTO 无答案字段）；不受理请求方的 userId（只取登录态）；不新增写分端点；日志不落答案 |
| E Process | Pass | 契约 → 后端 → 前端顺序明确，T1 为契约任务；`0.16.0 + V22` 排他已复核；G1 Pending 已声明且不代签 |
| F Documentation | Pass | 表名 / 类名 / 字段名 / 错误码在 §1 / §2 / §4 三处一致（评审中修正了 D 编号区间与自检行） |
| G Traceability | Pass | R1→§3.4、R2→§3.1、R3→§3.2/§3.3、R4→§3.3、R5→§3.5、R6→§5、R7→§3.5/§6；D1–D14 均落到 T1–T13 的具体子项 |

## Residual risks

- **并发模型依赖唯一索引而非行锁**：正确性由 `ux_credit_ledger_idempotency` 保证，但两个并发事务中会有一个「白跑一次事务并回滚判定」。H2 与 SQLite 的锁等待行为不同，A29 只能证明「只生效一次」，不能证明「响应时间可接受」。
- **`delta = 0` 的空账本**：设计用「先 `recorded` 后 `before >= 60`」把该情形挡在 `book` 之前；若未来新增其他恢复入口，需要重新检查该不变式。
- **`add-ai-itinerary` 的在途号位**：若该 change 在合并前改名或放弃 V21，本 change 的 V22 出现空号（Flyway 允许，但需在 P4 验证报告注明）。
- **G1 未签**：本设计在具名签署前不生效；`g1-decision.md` 保持 Pending，未代签。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | D1–D14 / §1–§7 全文 |
| `design.md` | 2 / 2（非当前开发者且非 WAYNE） | Jay | 2026-11-17 | 发起人当次会话指定 | D1–D14 / §1–§7 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准 Pass」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
