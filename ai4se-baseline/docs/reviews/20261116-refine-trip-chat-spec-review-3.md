# All specs review — refine-trip-chat（spec，第 3 次）

- **Verdict: Pass**
- **Scope:** focus=full（Delta Spec 重评）；root=`ai4se-baseline`；timestamp=2026-11-16
- **触发原因：** P4 T3 实现前发现两处已批准文本互相矛盾——Delta 场景「退出后的展示口径」写「个人统计中的『参与同行』**不因退出而减少**」，而 G1 条件 7 与 `design.md` D3 写「`joined` 仍只认 `ACCEPTED`（`left` 不计入）」→ 退出后减 1。经用户 2026-11-16 裁决采用**当前口径**，属语义修改，按 `@rule:artifact-review-gate` 重评，不覆盖前两份报告。
- **Artifact under review:** [`specs/trip-companions/spec.md`](../../openspec/changes/refine-trip-chat/specs/trip-companions/spec.md)（3 Requirement / 21 Scenario）
- **Evidence:**
  - `openspec validate refine-trip-chat --strict` → `Change 'refine-trip-chat' is valid`
  - 现状核对：`UserProfileStatsServiceImpl#stats` 的 `joined` = `applicationService.mine(userId)` 中 `TripApplication::isAccepted` 的计数；`leave` 改置 `LEFT` 后该计数自然减 1

## 变更摘要

| 位置 | 旧表述 | 新表述 |
|---|---|---|
| 场景「退出后的展示口径」 | 个人统计中的「参与同行」不因退出而减少 | 个人统计中的「参与同行」只计当前仍接受的申请，退出后减一 |
| `atdd-design.md` A7 | `joined` 不减少 | `joined` 减少一（只计 accepted） |
| `atdd-design.md` UT-4 | matched/joined 口径不因 `left` 改变 | matched 分区不含 `left`；joined 只计 `accepted` |

- **未变更：** Requirement 正文「『参与同行』统计口径 MUST 保持不变」保留——口径定义不变（仍等于被接受的申请数），计数随状态自然变化，与裁决一致。
- **未变更：** `g1-decision.md` 条件 7、`design.md` D3、`proposal.md`、`p2-spec.md` 的「joined 仍只认 `ACCEPTED`」表述本来就与裁决一致。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION | `rules/process/rules.md#artifact-review-gate` | `g1-decision.md` | G1 签署时未发现条件 7 与 Delta 场景冲突，说明 G1 的逐条映射缺少「同一术语在需求正文与场景中的数值口径一致性」检查 | P5 复盘时把该检查加入 `consistency-lint` 模板 | [inference] |
| S-2 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `atdd-design.md` | 同一口径在 A7、UT-4、分层策略第 12 行三处出现，存在再次漂移风险 | 以 Delta 场景为唯一权威；A7 为验收断言、UT-4 为纯函数断言，分层策略表述保留「口径不变」 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 2 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 统计只读消费申请状态，不改数据所有权 |
| B Quality | Skipped | 无代码改动 |
| C Testing | Pass | A7 / UT-4 断言已与裁决一致，可由 `ApplicationControllerTest` 与 `applicationStatus.test.ts` 验证 |
| D Security | Pass | 不涉及权限变化 |
| E Process | Pass | 语义修改走重评，不覆盖前两份报告；冲突按 `rule-precedence` 第 1 层以用户指示为准 |
| F Documentation | Pass | 中文正文；路径可点 |
| G Traceability | Pass | 场景总数仍 21；REQ-010 25/25 映射不变 |

## Residual risks

- `joined` 采用「当前口径」后，退出同行会让个人页统计变小；若未来产品希望展示「累计参与」，需要另立需求，不在本 change 范围。
- 本订正依赖 AO 补签批准；未补签前不得归档。

## Next remediations（non-Gate）

- 继续 P4：T3 起按「当前口径」实现，并在 `ApplicationControllerTest` 断言 leave 后 `joined` 减一。
- P4 验证报告记录该裁决与订正。

## 审批

> 本次 spec 重评结论为 **Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 2）。

| 角色 | 姓名 | 结论 | 时间 |
|---|---|---|---|
| AO（当前开发） | Jay | 批准；T3 起按「当前口径」实现，`ApplicationControllerTest` 断言 leave 后 `joined` 减一 | 2026-11-16 |
| IO | Wanye | 口径裁决来源（用户 2026-11-16 当次） | 2026-11-16 |

签署来源：用户 2026-11-16 就 spec-review-3 的冲突项裁决「当前口径」并授权继续 P4。本文件只记录规格重评，不代表 G2 / G3。
