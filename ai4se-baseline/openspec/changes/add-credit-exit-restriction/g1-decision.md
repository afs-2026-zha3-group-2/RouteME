# G1 decision — add-credit-exit-restriction

- **Change id:** `add-credit-exit-restriction`
- **Gate:** G1（Align）
- **Timestamp:** 2026-11-17T15:45+08:00
- **Decision:** **Pass**

## Input artifacts

| 工件 | 路径 | 结论 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-024-exit-credit-restriction.md` | 46 场景（S25-1~22 / S26-1~24）；blocking OQ 15/15 resolved；DoR BLOCKER 0 |
| 提案 | `openspec/changes/add-credit-exit-restriction/proposal.md` | Why / What Changes / Out of Scope / 决策 D1–D17 / 验收信号 / 残余风险齐备 |
| Delta Spec | `openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md` | ADDED 9 Requirement / 46 Scenario；`openspec validate --strict` valid |
| AC / DoV 复核 | `openspec/changes/add-credit-exit-restriction/dov-ac-review.md` | AC 4/4 Pass；DoV 5/5 Pass；映射 46/46 |
| 一致性检查 | `openspec/changes/add-credit-exit-restriction/consistency-lint.md` | Pass（BLOCKER 0 / WARNING 0 / SUGGESTION 3 / N/A 5） |
| 工件评审（提案） | `docs/reviews/20261117-add-credit-exit-restriction-proposal-review.md` | Pass（0 / 0 / 4），WAYNE + Lewis Liu 签 |
| 工件评审（Delta） | `docs/reviews/20261117-add-credit-exit-restriction-spec-review.md` | Pass（0 / 0 / 4，1 条当场收口），WAYNE + Lewis Liu 签 |

## Findings

| 维度 | 结论 | 说明 |
|---|---|---|
| Scope | Pass | 单一新能力 `credit-enforcement`（ADDED）；提案 9 组 What Changes 与 Delta 9 Requirement 一一对应；Out of Scope 9 条无对应 Requirement，未静默扩范围。管理端、明细、恢复关系、安全学习/客服、通知、正向加分均显式排除。 |
| Ambiguity | Pass | 六档边界左闭右开、集合时间优先、月度计数（仅已生效出发前扣分；待核实不计入；核实不属实取下一序号；0 分裁断事件计入）、60/59、只读范围、自动清理、自动解除均已写成可判定场景；blocking OQ 0；`deep-dive.md` 的 `{TBD}` 已清零。 |
| Conflict | Pass | Story 5「<60 自动限制」与 REQ-019 D1「不引入自动封禁」的冲突已由用户 D2 裁定以 Story 5 为准；`user-credit` / `trip-cancellation` / `trip-companions` 未归档 Delta 不被修改，避免抢块；`trip-companions` 聊天语义差异不在本 change 解决，P5 前由 SA 追认。 |
| Baseline | N/A | 纯 ADDED，未覆盖任何 Living Spec 的既有 Requirement；不涉及「MODIFIED 必须复制基线场景」。 |

## Conditions + owners

**无 G1 条件。** G1 通过不附条件。

以下作为 **P3 / P5 跟踪项**（非 G1 条件）：

| 跟踪项 | 说明 | Owner |
|---|---|---|
| 契约版本号与迁移号 | `openapi.yaml` 现 0.14.0、Flyway 头 V20；本 change 暂定 0.19.0 + V25；`add-ai-itinerary` 曾声明同号，需 P3 排他确认；若先落则顺延 0.16.0 + V22 | Dev（Lewis Liu） |
| 服务端守卫清单 | 发布/编辑/取消/结束行程、申请/撤回/退出、发布/编辑体验、发消息、改资料/头像逐项加 `CREDIT_RESTRICTED`；P3 给出 guard 清单，P4 测试逐项覆盖 | Dev（Lewis Liu） |
| 待核实领域行为 | 本 change 无管理端；P3 决定内部领域方法 + 单测，不暴露 controller / 页面 | Dev / SA |
| 低信用测试数据 | 所有种子账号 80 分；P3 决定种子 / 夹具 / 直接记账，不新增管理员入口 | Dev |
| 聊天语义追认 | `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 的差异；本 change 不改「退出同行」Requirement | SA（Jacky）+ IO（WAYNE），P5 前 |

## Approvers

| 角色 | 姓名 | 批准时间 | 批准范围 |
|---|---|---|---|
| IO | WAYNE | 2026-11-17 | Delta Spec 与 G1 Pass 结论 |
| SA | Jacky | 2026-11-17 | Delta Spec 与 G1 Pass 结论 |

## Notes

- 本记录只落地人工裁决，不替代 P3 设计与任务分解。
- REQ-019 D1 的「不引入自动封禁（<60）」已被本 change 的 Story 5 取代（用户 D2）；归档说明必须引用 D2，避免被误读为违反历史决策。
- 管理端、人工核实、人工封禁、明细、恢复关系、安全学习/客服入口均不在本 change。
- 下一阶段：`/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan`），P3 先定契约 / 迁移号、原型截点、guard 清单与低信用测试路径。
