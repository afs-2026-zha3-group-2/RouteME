# Artifact review — add-credit-recovery / tasks

- **Verdict: Pass**
- **Scope:** focus=tasks（`@rule:artifact-review-gate` 的 P3 任务清单评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`tasks.md`](../../openspec/changes/add-credit-recovery/tasks.md)（T1–T13 + A1–A29 覆盖映射 + 7 项对齐自检）
- **Supporting inputs:**
  - [`design.md`](../../openspec/changes/add-credit-recovery/design.md)（D1–D14）
  - [`atdd-design.md`](../../openspec/changes/add-credit-recovery/atdd-design.md)（A1–A29）
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-recovery/specs/user-credit/spec.md)（7 Requirement / 29 Scenario）
- **Evidence:**
  - 规则核对：`rules/process/rules.md#spec-first`（P3 门槛：一条任务只落一层、标注落点与验证命令、契约任务排在两端之前）、`#artifact-review-gate`、`#tdd-cycle`；`rules/testing/rules.md#java-testing`、`#web-testing`
  - **命令可执行性复核**：后端一律 `.\mvnw.cmd -B -ntp`（与 `ci.yml` 的 `./mvnw -B -ntp verify` 同语义）；前端 `npm run typecheck` / `npm run build` / `npm test` 均存在于 `frontend/package.json`；E2E 用 `e2e/` 下 Playwright
  - **测试类命名复核**：`backend/src/test/java/routeme` 下真实存在 `CreditMigrationSqliteTest`、`CreditAccountInitApiTest`、`CreditBatchApiTest`、`CreditBoundaryApiTest`、`CreditProfileApiTest`、`CreditReadOnlyApiTest`、`CreditServiceImplTest`、`OpenApiTest`；本项目约定为 `*ApiTest` / `*SqliteTest` / `*Test`，`tasks.md` 新增类名沿用该约定
  - **迁移号复核**：`db/migration` 实际最大号为 V20，无 V21 → T2 的升级基线必须是 V20
  - **覆盖复核**：A1–A29 在末尾映射表逐条有归属，无孤儿任务；契约任务 T1 排第一
  - **设计决策复核**：D1–D14 均有任务落点（D14 → T6 的 `CreditReason`；F-3 的阈值单点 → T7）
- **变更摘要（2026-11-17，评审中修订）：** T2 升级基线 V21→V20；T3/T6 的 `-Dtest` 分隔符 `+`→`,`；T6 通过路径步骤顺序同步为「先配额后资格」；T2 增写读往返断言；T6 增 `CreditReason` 子项；T7 增阈值单点校验。全部为可执行性修正，任务编号与覆盖矩阵未变。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING（已收口） | `rules/process/rules.md#spec-first` | T2 验证与子项 | 初稿写「旧库（**V21**）升级后新表存在」，但 `db/migration` 实际最大号是 V20，V21 属于仅到 P1 的 `add-ai-itinerary`，文件不存在；P4 照此写测试会因找不到基线而失败，或误以为需要先造 V21 | 已改为「旧库（**V20**）升级」，与真实迁移头一致；并在报告证据中记录复核方式 | [fact] |
| F-2 | WARNING（已收口） | `rules/process/rules.md#tdd-cycle` | T3 / T6 验证命令 | 初稿用 `-Dtest=CreditLearningDrawTest+CreditMonthTest`，Surefire 的 `-Dtest` 只接受逗号分隔，`+` 会被当成一个不存在的类名，命令直接失败 | 已全部改为逗号分隔（T3 两个类、T6 四个类） | [fact] |
| F-3 | WARNING（已收口） | `rules/process/rules.md#spec-first` | T6「通过路径」子项 | 初稿步骤为「`before < 60` 校验 → `recorded(key)` 判月度」，与设计评审修订后的「先配额后资格」相反；照 T6 实现会让 A20 在并发窗口断言到错误码 | 已同步为「`recorded(key)` 命中 → 409」在先、「`before < 60`」在后，并注明「顺序由 A20 锁定」 | [fact] |
| F-4 | SUGGESTION（已收口） | `rules/process/rules.md#spec-first` | T7 子项与验证 | Delta R1 要求阈值单点实现，但 T7 只写「读一次分数，`< 60` 抛异常」，没有可执行检查；P4 极易在 `CreditGateServiceImpl` 内再写一个 `60` | 已补子项：`CreditGateServiceImpl` 不得出现字面量 `60`，用 `grep -n "60"` 只允许命中注释 / 类名 | [fact] |
| F-5 | SUGGESTION | `rules/process/rules.md#tdd-cycle` | T6 | 单个任务含 4 个测试类（Recovery / Quota / Concurrency / ReasonLabel），红态粒度偏大 | 可接受：四者共用同一条「恢复记账」路径，拆开会产生重复夹具；P4 按类顺序逐一先红后绿即可 | [inference] |
| F-6 | SUGGESTION（P4 承接） | `rules/testing/rules.md#web-testing` | T12 | E2E 不在 CI（`ci.yml` 只跑后端 verify 与前端 build/test），T12 的通过只能本地证明 | 保留：P4 验证报告需贴 `npx playwright test` 的实际结果与运行环境，不写成「CI 已覆盖」 | [fact] |
| F-7 | SUGGESTION（P4 承接） | `rules/testing/rules.md#java-testing` | T2 / T6 | 迁移测试与并发测试都依赖种子数据与固定 `Clock`；设计未规定夹具在哪个测试类里共享 | T2 只证明建表与写读往返；造分与固时由 T6 的 `@Import(FixedClockTestConfig.class)` 承担，不在迁移测试里造业务数据 | [inference] |

**Counts:** BLOCKER 0 / WARNING 3（全部已收口）/ SUGGESTION 4（1 已收口 / 2 P4 承接 / 1 接受）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 分层清楚：T1 contract / T2–T7 backend / T8–T11 frontend / T12 e2e / T13 docs；一条任务只落一层 |
| B Quality | Pass | 13 个任务均有可执行验证命令；T1 的 `OpenApiTest` 作为契约门禁 |
| C Testing | Pass | API / E2E / UT 三层与 A1–A29 一一对应；每个后端任务都写明「先 red」 |
| D Security | Pass | 无写分端点任务；A4 反向用例覆盖「申请 / 接受 / 聊天 / 改资料不被拦」；答案不下发由 T5 的响应字段断言承接 |
| E Process | Pass | 契约先于两端；G1 未签在元信息中声明「T1 提交前必须取得具名签署」；号位 `0.16.0 + V22` 已复核 |
| F Documentation | Pass | 层标签统一；命令与仓库脚本一致（修正 `V21` 与 `+` 分隔符两处事实错误） |
| G Traceability | Pass | 29 Scenario → 29 A 编号 → 13 任务的覆盖映射无孤儿、无越界；D1–D14 均有落点 |

## Residual risks

- **T1 的前置**：契约改动在 G1 具名签署前不应提交到共享分支；若先推 T1，后续 G1 结论若变动会留下需要回滚的契约版本。
- **T12 不进 CI**：E2E 结论只能本地证明；P4 报告需附运行环境与结果原文。
- **并发用例的稳定性**：A29 在 H2 上的双线程时序不保证稳定复现；若首次运行未触发竞争，需在 P4 记录「已触发 / 未触发」而不放宽断言。
- **号位顺延**：若 `add-ai-itinerary` 合并前改名或放弃 V21，T2 的迁移号需在 P4 开工前按实际最大号复核一次。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `tasks.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | T1–T13 + 覆盖映射 + 对齐自检 |
| `tasks.md` | 2 / 2（非当前开发者且非 WAYNE） | Jay | 2026-11-17 | 发起人当次会话指定 | T1–T13 + 覆盖映射 + 对齐自检 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准 Pass」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
