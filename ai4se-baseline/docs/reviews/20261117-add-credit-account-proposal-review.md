# Artifact review — add-credit-account / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-credit-account/proposal.md)
- **Supporting inputs:**
  - [`requirements/REQ-019-credit-account.md`](../../requirement-workspace/requirements/REQ-019-credit-account.md)（15 场景 C-1 ~ C-15，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-019-credit-account.md`](../../requirement-workspace/intents/REQ-019-credit-account.md)（证据锚点 + 用户裁决 D1–D8）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-019 增补」（①–④ 四表 + 探针记录）
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §18
  - P1 Delta 同批产出：[`specs/user-credit/spec.md`](../../openspec/changes/add-credit-account/specs/user-credit/spec.md)（7 Requirement / 21 Scenario）
- **Evidence:**
  - [`openspec validate add-credit-account --strict`](../../openspec/changes/add-credit-account/) → `Change 'add-credit-account' is valid`（INFO / WARNING 0）
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#security-baseline`、`#pii-scrubbing`；`rules/testing/rules.md#web-testing`
  - 空白基线核实：全仓 grep `信用分 / 信誉分 / credit_score / creditScore / reputation` → 0 命中；grep `admin / 管理后台` → 0 命中；`app_users` 无分数列与角色列（`V3` / `V10`）
  - 迁移与契约排他核实：Flyway 头为 `V17__meeting_areas.sql`；`openapi.yaml` `info.version: 0.11.0`；在途 `refine-trip-map`（REQ-016）声明 V17、`add-ai-itinerary`（REQ-017）声明 V18 与 0.12.0
  - 工具已知偏差：`openspec show --json` 对**所有** change（含既有 `add-user-profile`）返回 `Change must have a Why section`，属项目用中文标题「## 问题」的既有约定差异，`validate --strict` 不受影响；本报告不据此判 Fail

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已记录） | `rules/documentation/rules.md#sdd-artifacts` | proposal 影响面「迁移」行 | 迁移文件名用 `V*__add_credit_account.sql` 占位，实际版本号未定 | 已在「残余风险」写明迁移号在 P3 排他确认，且建表 + 回填同一迁移；P3 任务排契约 / 迁移在两端之前 | [fact] |
| F-2 | SUGGESTION（P2 承接） | `rules/architecture/rules.md#api-contract` | proposal 影响面「`openapi.yaml`」行 | 只给了 `credit_score` / `credit_level` 两个示例字段名，未定 `required`、等级枚举与 owner | P2 契约定稿时把信用字段写入 `UserProfile.required`（破 `NON_NULL` 省略风险），并给成功 / 4xx 示例；本提案已把该风险列入残余风险 | [fact] |
| F-3 | SUGGESTION（已记录） | `rules/process/rules.md#spec-first` | proposal 决策「能力归属」行 | 依赖两个未归档 change（`add-user-profile` / `add-user-profiles`），存在归档顺序交叉风险 | 决策表已明确「信用字段由 `user-credit` 拥有、`user-profile` 语义不变」，归档时不抢同一 Requirement 块 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `user-credit`（ADDED），符合「one change = one capability」；契约变更在提案中同时开，符合 P1 门槛 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（计划已列） | 提案列出后端单测 / 注册集成 / 响应断言 / 前端纯函数单测 / E2E 五类，待 P3 ATDD 细化 |
| D Security | Pass | 明确「无客户端写分端点」「不展示明细」；信用分非个人敏感字段但按最小披露处理（不含明细与原因） |
| E Process | Pass | proposal 与 P1 Delta 同批；工件评审按 `artifact-review-gate` 执行；未触碰代码 |
| F Documentation | Pass | 正文中文、标识符英文；引用规则用锚点；无绝对机器路径 |
| G Traceability | Pass | 故事 AC1–AC6 全部可追：AC1→C-1/C-2、AC2→C-6~C-9、AC3/AC4→R7 + D2、AC5→C-13、AC6→C-7/C-8/C-11 |

## Residual risks

- 契约版本号与迁移号需与在途 `refine-trip-map` / `add-ai-itinerary` 排他确认；冲突会阻塞 P3 任务排序。
- 「理论变化量为 0 时是否留痕」未定，已记为 P3 前置 SA 决策；本变更无业务事件，不影响本提案范围。
- `openspec show --json` 的 `Why section` 报错为项目既有约定差异，不属于本 change 引入。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
