# Artifact review — add-credit-account / spec（第 2 次，D9–D11 修订后）

- **Verdict: Pass**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 对修改后 Delta Spec 的重评）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-account/specs/user-credit/spec.md)（ADDED：7 Requirement / 22 Scenario）
- **修订输入：** 用户在 P2 入口的三项裁决
  - **D9** 不改 `user-auth`「注册账号」→ Delta 无新增 MODIFIED，保持单 capability
  - **D10** 等级契约取英文码 `excellent` / `good` / `fair` / `low` / `risk` + 前端 i18n 映射 → 落提案决策与影响面，Delta 仍只约束展示文字
  - **D11** 零变化仍留一条 `applied_delta = 0` 记录 → Requirement「信用记录与记账服务」补一句 + 新增 Scenario「实际生效量为零仍留记录」
- **Supporting inputs:** [`proposal.md`](../../openspec/changes/add-credit-account/proposal.md)、[`dov-ac-review.md`](../../openspec/changes/add-credit-account/dov-ac-review.md)、[`consistency-lint.md`](../../openspec/changes/add-credit-account/consistency-lint.md)
- **Evidence:**
  - `openspec validate add-credit-account --strict` → `Change 'add-credit-account' is valid`（修订后复跑）
  - Scenario 计数：7 Requirement / 22 Scenario（修订前 21，新增 1 条零变化场景）
  - 需求侧同步：`requirements/REQ-019-credit-account.md` 新增 C-15（零变化留痕）、原 C-15 改为 C-16；`deep-dive.md` 的 `{TBD}` 已清零；`impact-brief.md` §19 已补 D9–D11
  - 交叉一致性：`dov-ac-review.md` 映射 16/16 场景；`consistency-lint.md` Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-4 | SUGGESTION（已收口） | `rules/process/rules.md#spec-first` | Requirement「信用记录与记账服务」 | 修订前未覆盖「理论变化被完全裁断」的分支，`deep-dive.md` 留有 `{TBD}` | 已按 D11 补 Requirement 语句 + Scenario；`deep-dive.md` ①/② 同步改为 in，探针记录 `{TBD}` 清零 | [fact] |
| F-5 | SUGGESTION（P3 承接） | `rules/documentation/rules.md#document-conventions` | Requirement「个人主页展示信用状态」Scenario「分数与等级文字同时展示」 | 「含 `/ 100` 上限」未指定文案模板落点（i18n） | P3 统一「信用分：{score} / 100」模板并在 E2E 断言整串；与 `consistency-lint.md` L-02 同一项 | [fact] |
| F-6 | SUGGESTION（P4 承接） | `rules/architecture/rules.md#api-contract` | Requirement「信用等级派生」 | D10 的五个英文码尚未进入 `openapi.yaml` enum | P3 / P4 把 enum 与 `UserProfile.required` 写入契约，契约测试断言码值集合；与 L-03 同一项 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3（1 已收口 / 2 承接）→ **Pass**

## 与第 1 次评审的关系

- 第 1 次评审（`20261117-add-credit-account-spec-review.md`）的 F-1（时态词）已在 P1 收口；F-2（写分端点的 404/405 断言口径）仍为 P2 承接项；F-3（R2 与 R6 的数值重叠）保留互证。
- 本次修订**未推翻**第 1 次结论；新增 F-4 ~ F-6 覆盖 D9–D11 带来的变化。

## Residual risks

- 契约版本号与迁移号仍需 P3 排他确认（与在途 REQ-016 / REQ-017）。
- 零变化记录进入账本后，任何报表 / 统计若以账本条数计数会被高估；后续统计口径需以 `applied_delta <> 0` 过滤。
- 管理端推迟依赖另立需求；归档说明需再次引用 D2。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `specs/user-credit/spec.md`（修订版） | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「批准修订版」 | 全文（7 Requirement / 22 Scenario） |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「批准修订版」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
