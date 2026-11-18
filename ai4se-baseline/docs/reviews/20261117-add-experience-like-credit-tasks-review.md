# Artifact review — add-experience-like-credit / Tasks

- **Verdict: Pass**
- **Scope:** focus=tasks（`@rule:artifact-review-gate` 的 P3 任务评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **变更摘要（2026-11-17，签署后）：** T1 / T2 的契约 / 迁移号由 `0.15.0` + `V21` 改为 `0.18.0` + `V24`（`0.15.0` + `V21` 已由 `add-ai-itinerary` 台账声明，用户裁决顺延）；结论与签署不变。
- **Artifacts under review:**
  - [`tasks.md`](../../openspec/changes/add-experience-like-credit/tasks.md)（T0–T11 + 层与顺序约束 + 对齐自检）
- **Supporting inputs:**
  - [`design.md`](../../openspec/changes/add-experience-like-credit/design.md)（D1–D16）
  - [`atdd-design.md`](../../openspec/changes/add-experience-like-credit/atdd-design.md)（27 场景分层）
  - [`specs/trip-experiences/spec.md`](../../openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md)、[`specs/user-credit/spec.md`](../../openspec/changes/add-experience-like-credit/specs/user-credit/spec.md)
- **Evidence:**
  - 规则核对：`rules/documentation/rules.md#sdd-artifacts`（一条任务一层、落点与验证命令）、`#document-conventions`；`rules/testing/rules.md#java-testing`、`#web-testing`（验收场景落成测试名、E2E 约定）；`rules/quality/rules.md#prototype-ui-alignment`（原型先行）；`rules/process/rules.md#tdd-cycle`、`#artifact-review-gate`
  - 现状核实：`docs/knowledge/interfaces/README.md` 存在（T11 引用有效）；`ExperienceLikeMapper` / `CreditService.book` / `V20` / `openapi.yaml` 0.14.0
  - 对齐自检：`tasks.md` §对齐自检 9 项全 Pass（27/27 场景有任务承接、D 决策有落点、契约 / 迁移先于两端、T0 原型先行）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| T-1 | SUGGESTION | `rules/quality/rules.md#prototype-ui-alignment` | `tasks.md` T0 验证 | 原型任务验证为人工浏览器走查，没有可执行命令 | P4 在 `p4-verify.md` 保留走查记录（宽度 × 主题矩阵结论），作为人工证据 | [fact] |
| T-2 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `tasks.md` T6 | T6 聚合结算服务、3 个测试类与 apply 层 UT，粒度偏大 | 保留单任务（同属 `backend` 结算一层），P4 按「服务实现 → API 测试 → 月度时钟夹具 → UT」内部顺序推进，并在 P4 记录拆分执行轨迹 | [inference] |
| T-3 | SUGGESTION | `rules/testing/rules.md#web-testing` | `tasks.md` T9 C-15 | C-15 需新建作者 + 5 个点赞者（共 6 个账号），E2E 时长上升 | 复用 `credit.spec.ts` 的 `registerViaApi` helper；点赞串行执行并在用例末清理（取消点赞或依赖一次性库） | [inference] |
| T-4 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `tasks.md` T5 `listAll` | 为无调用方的 `listAll` 增加 `viewerId`，任务描述未说明理由 | 在实现注释标注「内部方法，无 Controller 调用」；若决定废弃，另立清理任务，不混入本 change | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 任务按 `contract` / `backend` / `frontend` / `tests` / `verify` / `docs` 分层；契约与迁移先于两端；数据访问先于服务 |
| B Quality | Pass | 每条任务有明确落点（文件 / 类 / 方法）与验证命令；命名与 design 一致 |
| C Testing | Pass | 测试任务标注验证命令与覆盖场景；API / E2E / UT 分层与 ATDD 一致；未引入 POM / Excel 生成器 |
| D Security | N/A | P3 无实现；自赞与未登录断言已列入 T4 |
| E Process | Pass | T0 原型先行；TDD 红→绿在 T4 / T5 / T6 明确「先 red」；最后一项为回归验证（T10） |
| F Documentation | Pass | 中文正文、相对链接、无行号；任务清单可执行 |
| G Traceability | Pass | 27/27 场景有任务承接；D1–D16 全部有落点；自检结论 Pass |

## Residual risks

- T6 的实际工作量取决于并发与月度时钟夹具的复杂度；若 P4 发现需要拆任务，按「一条任务一层」原则在 P4 记录。
- E2E 共享库累积点赞：T9 已要求相对断言与收尾取消，仍需 P4 实测确认。
- 契约 / 迁移号若被越过，T1 / T2 整体顺延。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `tasks.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| `tasks.md` | 2 / 2（非当前开发者且非 WAYNE） | Neal（VL） | 2026-11-17 | 发起人当次会话指定第二签署人 Neal + 全部批准 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
