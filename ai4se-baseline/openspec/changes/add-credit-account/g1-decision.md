# G1 decision — add-credit-account

- **Change id:** `add-credit-account`
- **Gate:** G1（Align）
- **Timestamp:** 2026-11-17T11:26+08:00
- **Decision:** **Pass**

## Input artifacts

| 工件 | 路径 | 结论 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-019-credit-account.md` | 16 场景；blocking OQ 7/7 resolved；DoR BLOCKER 0 |
| 提案 | `openspec/changes/add-credit-account/proposal.md` | 范围 / 决策 D1–D11 / 验收信号 / 残余风险齐备 |
| Delta Spec | `openspec/changes/add-credit-account/specs/user-credit/spec.md` | ADDED 7 Requirement / 22 Scenario；`openspec validate --strict` valid |
| AC / DoV 复核 | `openspec/changes/add-credit-account/dov-ac-review.md` | AC 4/4 Pass；DoV 5/5 Pass；映射 16/16 |
| 一致性检查 | `openspec/changes/add-credit-account/consistency-lint.md` | Pass（BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 6） |
| 工件评审（提案） | `docs/reviews/20261117-add-credit-account-proposal-review.md` | Pass（0 / 0 / 3），WAYNE + Lewis Liu 签 |
| 工件评审（Delta 初版） | `docs/reviews/20261117-add-credit-account-spec-review.md` | Pass（0 / 0 / 3） |
| 工件评审（Delta 修订版） | `docs/reviews/20261117-add-credit-account-spec-review-2.md` | Pass（0 / 0 / 3，1 条已收口），WAYNE + Lewis Liu 签 |

## Findings

| 维度 | 结论 | 说明 |
|---|---|---|
| Scope | Pass | 单一 capability `user-credit`（ADDED）；提案 In scope 与 Delta 7 Requirement 一一对应；Out of scope 7 条无对应 Requirement，未静默扩范围。管理端按 D2 以「边界」Requirement 显式推迟。 |
| Ambiguity | Pass | 需求 blocking OQ 7 条全部 resolved；非阻塞项由 D9（不改 `user-auth`）/ D10（等级英文码 + 前端映射）/ D11（零变化仍留一条 `applied_delta = 0` 记录）裁定；`deep-dive.md` 的 `{TBD}` 已清零。 |
| Conflict | Pass | 与历史「信誉分 0–120 / 六档 / 低于 60 自动封禁」方案冲突已由 D1 裁定以本次故事为准；与 Living `user-auth`「注册账号」不冲突（D9 不改）；与未归档 `add-user-profile` / `add-user-profiles` 的响应字段只做追加、不改语义。 |
| Baseline | N/A | 纯 ADDED，未覆盖任何 Living Spec 的既有 Requirement；不涉及「MODIFIED 必须复制基线场景」。 |

## Conditions + owners

**无。** G1 通过不附条件。

以下三项作为 **P3 任务/跟踪项**（非 G1 条件）：

| 跟踪项 | 说明 | Owner |
|---|---|---|
| 契约版本号与迁移号 | `openapi.yaml` 现 0.11.0、Flyway 头 V17；REQ-016（V17）/ REQ-017（0.12.0 + V18）在途，需排他确认；建表 + 回填同一迁移 | Dev（Lewis Liu） |
| 等级五码入契约 | D10 的 `excellent` / `good` / `fair` / `low` / `risk` 写入 `credit_level` enum 与 `UserProfile.required`，并加契约测试 | Dev（Lewis Liu） |
| 原型截点 | `docs/prototype` 无信用分骨架，按 `@rule:prototype-ui-alignment` 先补截点再实现 | Dev / IO |

## Approvers

| 角色 | 姓名 | 批准时间 | 批准范围 |
|---|---|---|---|
| IO | WAYNE | 2026-11-17 | Delta Spec 与 G1 Pass 结论 |
| SA | Jacky | 2026-11-17 | Delta Spec 与 G1 Pass 结论 |

## Notes

- 本记录只落地人工裁决，不替代 P3 设计与任务分解。
- 管理端 AC3 / AC4 不在本 change（D2）；归档说明需引用 D2，避免被误读为遗漏。
- 下一阶段：`/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan`），P3 先行补原型截点与契约 / 迁移号确认。
