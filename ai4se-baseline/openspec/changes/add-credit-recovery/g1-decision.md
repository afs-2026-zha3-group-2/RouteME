# G1 decision — add-credit-recovery

- **Change id:** `add-credit-recovery`
- **Gate:** G1（Align）
- **Timestamp:** 2026-11-17（当次会话；原 Pending 记录于同日 P2 末）
- **Decision:** **Pass（无条件）**

> 本记录先以 `Pending` 落盘（P2 末，不代签），P3 工件与四份评审报告完成后由 IO + SA 具名裁定为 **Pass**。以下「签署闭环」记录原待签项的关闭方式。

## Input artifacts

| 工件 | 路径 | 结论 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-022-credit-recovery.md` | 27 场景；blocking OQ 6/6 resolved；DoR BLOCKER 0 / WARNING 1 |
| 意图捕获 | `requirement-workspace/intents/REQ-022-credit-recovery.md` | 原始意图、用户裁决 D1–D7、现状核对表 |
| 提案 | `openspec/changes/add-credit-recovery/proposal.md` | 范围 / 决策 D1–D7 / 影响面 / 残余风险齐备；P3 已回填（单表口径、OQ-5/6/7 resolved、DoR 12/12 Pass） |
| Delta Spec | `openspec/changes/add-credit-recovery/specs/user-credit/spec.md` | ADDED 7 Requirement / 29 Scenario；`openspec validate --strict` valid |
| AC / DoV 复核 | `openspec/changes/add-credit-recovery/dov-ac-review.md` | AC 4/4 Pass；DoV 5/5 Pass；映射 27/27 |
| 一致性检查 | `openspec/changes/add-credit-recovery/consistency-lint.md` | Pass（BLOCKER 0 / WARNING 1 已收口 / SUGGESTION 5 / N/A 6） |
| 工件评审（提案） | `docs/reviews/20261117-add-credit-recovery-proposal-review.md` | Pass（0 BLOCKER / 3 WARNING 已收口 / 2 SUGGESTION），WAYNE + Lewis Liu 签；工件 Jay 签 |
| 工件评审（Delta） | `docs/reviews/20261117-add-credit-recovery-spec-review.md` | Pass（0 / 1 已收口 / 4），产物含 R6 取数时机限定句；WAYNE + Lewis Liu 签；工件 Jay 签 |
| 工件评审（P3 design） | `docs/reviews/20261117-add-credit-recovery-design-review.md` | Pass（0 / 3 已收口 / 4）；WAYNE + Lewis Liu 签；工件 Jay 签 |
| 工件评审（P3 tasks） | `docs/reviews/20261117-add-credit-recovery-tasks-review.md` | Pass（0 / 3 已收口 / 4）；WAYNE + Lewis Liu 签；工件 Jay 签 |
| 阶段记录 | `docs/sdd/add-credit-recovery/p1-intent.md`、`p2-spec.md`、`p3-design.md` | P1 / P2 / P3 三阶段记录齐备 |

## Findings

| 维度 | 结论 | 说明 |
|---|---|---|
| Scope | Pass | 单一 capability `user-credit`（ADDED）；提案 In scope 11 条与 Delta 7 Requirement 一一对应；Out of scope 7 条无对应 Requirement。低分限制按 D1 / D6 只落在「发布行程」，其余功能以 R1 场景 4 显式声明不限制。 |
| Ambiguity | Pass | blocking 6 条全部由 D1–D4 / D6 / D7 裁定；OQ-5（学习进度）→ P3-D2「只存完成标记 + 结果」，OQ-6（路由 / 入口）→ P3-D3/P3-D4「`#/credit/learning` + 仅拦截提示」，OQ-7（号位）→ P3-D5「`0.16.0 + V22`」；仅 OQ-8（人工封禁）deferred 且有依赖说明。 |
| Conflict | Pass | 与 `add-credit-account` 不冲突（本包只追加 ADDED，不改既有 Requirement 语义）；与 #29–#31 分工明确（事件写分 / 本包只消费 `< 60` 状态）；Delta 内部「开始即计次」冲突已在 L-01 收口；R6 的「MUST 立即展示」与实现口径冲突已在 spec 评审 F-1 收口为「进入 / 重新进入时取数」。 |
| Baseline | N/A | 纯 ADDED，未覆盖任何 Living Spec 既有 Requirement。**但** `user-credit` Living Spec 尚不存在，归档顺序 MUST 为 `add-credit-account` → `add-credit-recovery`（consistency-lint L-06）。 |

## 签署闭环（原待签项）

| 项 | 关闭方式 | 签署 / Owner |
|---|---|---|
| G1 结论签署 | `Decision` 由 Pending 改为 **Pass（无条件）**；无附加条件 | IO=WAYNE、SA=Jacky，2026-11-17 当次会话 |
| 拦截范围确认（D6） | IO 确认「只拦发布行程」并接受与故事直觉口径的差异；R1 场景 4 已显式写不限制路径 | IO=WAYNE |
| 恢复口径确认（D2 / D3 / D4） | IO 复核 10 题 / ≥ 8 通过、每月 2 考 1 恢复、`Asia/Shanghai` | IO=WAYNE |
| OQ-5 学习进度持久化 | P3-D2：只存完成标记 + 结果，不建逐题明细表 | SA=Jacky（随 P3 裁定） |
| OQ-6 路由与入口 | P3-D3/D4：`#/credit/learning` 独立页；入口仅「发布行程被拦截提示」 | IO=WAYNE |
| OQ-7 契约与迁移号 | P3-D5：`0.16.0` + `V22`（`0.15.0 + V21` 由 `add-ai-itinerary` 占用） | Dev |

## Conditions + owners

**无。** G1 通过不附条件。

以下为 **P4 跟踪项**（非 G1 条件）：

| 跟踪项 | 说明 | Owner |
|---|---|---|
| 号位复核 | 合并前确认 `add-ai-itinerary` 是否仍占用 `0.15.0 + V21`；若放弃则 V22 出现空号，需在 P4 报告注明 | Dev（Lewis Liu） |
| 演示造分 | 扣分事件（#29–#31）未落地，P4 需以种子账号造分（< 60）证明链路 | Dev / IO |
| 并发口径 | A29 只断言「账本 1 条 + 终值 60」，不断言单请求 `recovery_applied` | Dev |
| E2E 不在 CI | `credit-learning.spec.ts` 只能本地证明，报告需附环境与原文 | Dev |
| 归档顺序 | 排在 `add-credit-account` 之后 | Dev |

## Approvers

| 角色 | 姓名 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|
| IO | WAYNE | 2026-11-17 | 发起人当次会话确认「G1 Pass」 | Delta Spec 与 G1 结论 |
| SA | Jacky | 2026-11-17 | 发起人当次会话确认「G1 Pass」 | Delta Spec 与 G1 结论（含 P3-D2 / P3-D5） |

## Notes

- 本记录只落地人工裁决，不替代 P3 设计与任务分解。
- P3 曾在 `Pending` 期间按用户裁定以「起草态」推进；`Decision: Pass` 后该偏差关闭，P3 工件按已签状态生效。
- 管理端题库维护、人工封禁解封不在本 change（OQ-8 deferred），归档说明需引用，避免被读成遗漏。
- 下一阶段：`/sdd:atdd-apply`（P4），从 T1 契约（`0.16.0`）先红开始。
