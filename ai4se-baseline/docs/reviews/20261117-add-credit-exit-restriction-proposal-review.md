# Artifact review — add-credit-exit-restriction / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-credit-exit-restriction/proposal.md)
- **Supporting inputs:**
  - [`requirements/REQ-022-exit-credit-restriction.md`](../../requirement-workspace/requirements/REQ-022-exit-credit-restriction.md)（46 场景 S22-1 ~ S22-22 / S23-1 ~ S23-24，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-022-exit-credit-restriction.md`](../../requirement-workspace/intents/REQ-022-exit-credit-restriction.md)（证据锚点 + 用户裁决 D1–D17）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-022 增补」（①–④ 四表 + 探针记录）
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §22
  - 两故事：[`add-credit-exit-restriction-exit.story.md`](../../requirement-workspace/stories/add-credit-exit-restriction-exit.story.md)（S22）与 [`...-restriction.story.md`](../../requirement-workspace/stories/add-credit-exit-restriction-restriction.story.md)（S23）
  - P1 Delta 同批产出：[`specs/credit-enforcement/spec.md`](../../openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md)（ADDED 9 Requirement / 46 Scenario）
- **Evidence:**
  - [`openspec validate add-credit-exit-restriction --strict`](../../openspec/changes/add-credit-exit-restriction/) → `Change 'add-credit-exit-restriction' is valid`（0 error）
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/architecture/rules.md#api-contract`；`rules/security/rules.md#security-baseline`、`#pii-scrubbing`；`rules/testing/rules.md#web-testing`
  - 基线核实：`main@ec360dc`；`openapi.yaml` 0.14.0；Flyway head V20；`user-credit` / `trip-cancellation` 未归档；`trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 存在已知差异；全仓无管理员角色 / 后台端点 / 后台页面
  - 能力边界核实：本 change 只新增 `credit-enforcement`（ADDED），不写 `user-credit` / `trip-cancellation` / `trip-companions` 的 MODIFIED Delta；`openspec validate` 通过

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P3 承接） | `rules/architecture/rules.md#api-contract` | proposal 影响面「`openapi.yaml`」行 | 只给出 0.15.0 与新增字段方向，未定 `credit_restricted` 的 `required`、错误码 envelope、退出预览/确认请求响应形态 | P3 `design.md` 与契约任务在两端之前排他确认；P4 契约测试断言成功 / 403 / 400 示例 | [fact] |
| F-2 | SUGGESTION（已记录） | `rules/documentation/rules.md#sdd-artifacts` | proposal 规模行与「残余风险」 | 46 场景超过 split-heuristics 的单 change 阈值；用户 D1 明确合并 | 已写明「P2 可在同一 change 内拆 Requirement 组，不拆 change」；故事仍分 S22 / S23 验收 | [fact] |
| F-3 | SUGGESTION（P5 承接） | `rules/process/rules.md#spec-first` | proposal「Out of Scope」与「残余风险」 | `trip-companions` 活规格说退出关闭聊天，未归档 `refine-trip-chat` Delta 与当前代码保留聊天；本 change 不改该 Requirement | 本 change 不触碰聊天语义；P5 归档前由 SA 对活规格与未归档 Delta 做具名追认 | [inference] |
| F-4 | SUGGESTION（P3 承接） | `rules/process/rules.md#spec-first` | proposal 影响面「迁移」行 | `V21` 与 `add-ai-itinerary` 曾声明的 V21 同号 | P3 按实际落地顺序排他确认；若 `add-ai-itinerary` 先落则顺延 V22 / 0.16.0 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单新能力 `credit-enforcement`（ADDED）；`user-credit` / `trip-companions` / `trip-cancellation` 只作依赖，不改其未归档 Delta；符合「one change 一个主能力」 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（计划已列） | 提案列出后端记账/退出/限制/迁移、前端纯函数/组件、E2E 退出 + 限制 + 自动清理；待 P3 ATDD 细化 |
| D Security | Pass | 明确「不做管理端」「不展示明细」「限制原因仅本人」；安全原因退出保留举报入口；符合最小披露 |
| E Process | Pass | proposal 与 P1 Delta 同批；`openspec validate --strict` 通过；工件评审按 `artifact-review-gate` 执行；未触碰代码 |
| F Documentation | Pass | 正文中文、标识符英文；规则用锚点；无绝对机器路径；Out of Scope 显式列出 |
| G Traceability | Pass | S22-1 ~ S22-22、S23-1 ~ S23-24 全部可追到 Requirement 组；Story 4 / Story 5 的 AC 在故事文件中有映射 |

## Residual risks

- 契约 / 迁移号需与在途 `add-ai-itinerary` 排他确认；冲突会阻塞 P3 任务排序。
- 待核实退出没有管理端出口；本 change 只保证 pending 与暂不扣分，未来核实逻辑另开 change。
- 低信用演示数据 / E2E 触发路径未定；P3 决定种子 / 夹具 / 直接记账。
- `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 的聊天语义差异不在本 change 解决；P5 归档前需 SA 追认。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
