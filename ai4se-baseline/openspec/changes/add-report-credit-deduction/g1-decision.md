# G1 decision — add-report-credit-deduction

- **Change id：** `add-report-credit-deduction`（Issue #29 / REQ-030 / S31）
- **Gate：** G1（Align）
- **Date：** 2026-11-18
- **Inputs：**
  - Delta：`specs/user-credit/spec.md`（ADDED 3 Requirement / 16 Scenario）
  - Delta：`specs/admin-console/spec.md`（MODIFIED 1 Requirement / 20 Scenario）
  - AC / DoV：`dov-ac-review.md`（AC 4/4 Pass；DoV 5/5 Pass）
  - 一致性检查：`consistency-lint.md`（Partial；BLOCKER 0 / WARNING 2 / SUGGESTION 2 / N/A 6）
  - Proposal：`proposal.md`（D1–D5 / R-1 ~ R-26）
  - P1 评审：`docs/reviews/20261118-add-report-credit-deduction-proposal-review.md`、`…-spec-review.md`（均 Pass）
  - 校验：`openspec validate add-report-credit-deduction --strict` → valid

## Findings

| 维度 | 结论 | 说明 |
|---|---|---|
| Scope | Pass | D1–D5 与 In / Out of scope 一一对应；无静默扩缩 |
| Ambiguity | Conditional | 历史举报空值展示与驳回措辞已在 P2 收敛；剩余 2 条 WARNING 属跨工件承接，不改变 Delta 语义 |
| Conflict | Pass | 与 `add-admin-console` 的 2 条基线场景按 D1 显式替换；与 `add-credit-account` / `credit-enforcement` 无重复实现 |
| AC / DoV | Pass | AC 4/4、DoV 5/5；36 条 Delta 场景可测 |
| Traceability | Conditional | R-23（用户管理页回归）与 R-24 / R-25（401 / 403 / 404 基线守卫）由 P3 承接 |

## Decision

**Conditional**

## Conditions + owners

| # | 条件 | Owner | 落点 | 关闭标志 |
|---|---|---|---|---|
| C1 | `tasks.md` 增加「用户管理页暂停 / 封禁 / 更新封禁 / 恢复回归」任务 | Dev（Lewis） | P3 `tasks.md` + `atdd-design.md` | 任务与用例存在 |
| C2 | ATDD / 回归用例显式覆盖 401 `UNAUTHORIZED`、403 `FORBIDDEN`、404 `REPORT_NOT_FOUND`，确认基线守卫未回退 | Dev（Lewis） | P3 ATDD + P4 测试 | 用例通过 |
| C3 | 追认 D1 对 `add-admin-console` 2 条基线场景（「举报成立并处罚」「被举报用户已处于受限状态」）的替换语义 | SA（Jacky） | 本记录签署 | 本记录签署即视为追认 |
| C4 | 归档 MUST 排在 `add-admin-console` 与 `add-credit-account` 之后 | Dev（Lewis） | P5 | 归档顺序核对 |

C1 / C2 为 P3 开工后的承接项，不阻塞 P3 启动；C3 已在本记录签署时完成；C4 为 P5 约束。

## Approvers

| 角色 | 姓名 | 批准内容 | 日期 | 来源 |
|---|---|---|---|---|
| IO | WAYNE | Delta Spec、G1 Conditional 结论与 C1–C4 | 2026-11-18 | 发起人当次会话确认 |
| SA | Jacky | Delta Spec、D1 替换追认、G1 Conditional 结论与 C1–C4 | 2026-11-18 | 发起人当次会话指定 SA 并确认 |

## Timestamp

2026-11-18

## Next

Conditional 已带 owner 与关闭标志，可进入 P3（`/sdd:atdd-design` → `/sdd:task-plan`）；C1 / C2 在 P3 工件中关闭后方可视为 G1 完全 Verified。
