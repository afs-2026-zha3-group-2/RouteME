# AC / DoV review — add-credit-recovery

- **Change:** `add-credit-recovery`
- **Phase:** `p2`（Delta Spec 复核，G1 输入）
- **Delta 路径:** `openspec/changes/add-credit-recovery/specs/user-credit/spec.md`（ADDED：7 Requirement / 29 Scenario）
- **Requirement 来源:** `requirement-workspace/requirements/REQ-024-credit-recovery.md` §4（R-1 ~ R-27）
- **Proposal:** `openspec/changes/add-credit-recovery/proposal.md`（§2 场景 R-1 ~ R-25）
- **Timestamp:** 2026-11-17T00:00+08:00
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec validate add-credit-recovery --strict` → `Change 'add-credit-recovery' is valid`；Delta 纯 ADDED（0 MODIFIED / 0 REMOVED）

## Verdict

**AC 4/4 Pass ｜ DoV 5/5 Pass → G1-ready（等签署）**

不阻断项：3 条 SUGGESTION（编号体系口径、契约 / 迁移撞号、拦截提示文案与入口位置），全部带入 P3。

## AC 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测 AC | Pass | 7/7 Requirement 均含 ≥2 个 Scenario（最少 2、最多 6） | 每个 Requirement 都至少有一条可断言的数值或码值 |
| AC-2 AC 可观察 | Pass | `CREDIT_SCORE_BELOW_60`、`SAFETY_LEARNING_RECOVERY`、`applied_delta = +15 / +1 / +60`、「60 / 100 · 信用一般」、10 题 / 答对 8 题 | 无「正常工作」「合理提示」类模糊表述 |
| AC-3 高风险处有负向 / 边界场景 | Pass | 恰好 60 不拦截、59 只补到 60、0 分、未通过不变分、次数用尽、当月已恢复再通过被拒、重复提交幂等、并发只生效一次、无账户按 80 处理、用户不存在沿用 `USER_NOT_FOUND` | 覆盖「越权改分」「超额恢复」「并发累加」「边界差一」四类风险 |
| AC-4 不把实现细节伪装成 AC | Pass | Delta 只约束可观察结果；「同事务」「单一写分入口」写成可验证的原子性与唯一性，不指定表名 / 类名 / 字段名 | 迁移号、表结构、`CreditLearningService` 只出现在提案影响面，Delta 不绑定 |

## DoV 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | 提案 In scope 11 条 → Delta 7 Requirement；Out of scope 7 条无对应 Requirement | 扣分事件（#29–#31）、人工封禁、管理后台、明细可见均无 Requirement；「仅发布行程受限」以 R1 场景 4 显式承接 |
| DoV-2 歧义已列出或解决 | Pass | 需求 §8：blocking 6 条全部 resolved（D1–D4 / D6 / D7）；余 2 条 non-blocking open + 2 条 deferred 均有 owner | 无遗留 blocking 歧义；OQ-5 / OQ-6 明确挂 P3 |
| DoV-3 角色关注点已记录 | Pass | IO：D1 拦截面 / D2 通过线 / D3 次数 / D6 拦截范围；SA：D4 时区 / D5 记账与配额派生 / D7 题库形态 | 见下方「IO / SA 残余关注」 |
| DoV-4 未主张已实现业务 | Pass | P2 无代码 / 契约 / 迁移变更；`openapi.yaml` 仍 `0.14.0`、Flyway 头仍 `V20` | 实现属 P3 / P4 |
| DoV-5 Requirement 可追溯到提案 / 已批准需求 | Pass | 27/27 需求场景全部映射（下表），无孤儿 Requirement、无未覆盖 AC | Delta 29 场景 = 27 需求场景 + 2 处拆分 |

## 编号体系口径（proposal 25 / REQ-024 27 / Delta 29）

三处编号不完全等长，属**预期内的粒度差异**，不是覆盖缺口：

| 层级 | 条数 | 编号 | 与相邻层的关系 |
|---|---|---|---|
| 提案 §2 | 25 | R-1 ~ R-25 | P1 定稿时的场景集（含 D1–D7 裁定后追加的 R-23 / R-24 / R-25） |
| 需求 §4 | 27 | R-1 ~ R-27 | 提案 25 条内容全保留；**新增 R-26**（月份边界按北京时间，把 D4 的口径落成可断言场景）与 **R-27**（其他功能不限制，把提案 DoR #10 的 Partial 要求落成场景）；编号按主题分组重排，`R-23 / R-24 / R-25` 并入 D / E 组，故出现 `R-24` 排在 `R-16` 之后的顺序 |
| Delta | 29 | 7 Requirement / 29 Scenario | 27 条需求场景 + 2 处拆分：`R-8`（逐题判定）拆为「答对 8 题判定通过」+「答对 7 题判定未通过」；`R-17`（恢复后展示）拆为「个人主页」+「列表类展示面」 |

**P3 收口要求：** 以 Delta 的 Requirement / Scenario 为唯一真相；§4 场景清单若要再引用编号，统一改用 `Requirement + Scenario 名`，不再逐条对齐 R-编号，避免第三个编号体系继续漂移。

## Requirement 映射（REQ-024 → Delta）

| REQ-024 场景 | Delta Requirement | Delta Scenario |
|---|---|---|
| R-1 低于 60 可参加 | R2 安全学习的参加资格 | 低于 60 可以开始考试 |
| R-2 达到 60 不可参加 | R2 安全学习的参加资格 | 达到 60 分拒绝参加 |
| R-3 未登录拒绝 | R2 安全学习的参加资格 | 未登录拒绝 |
| R-4 他人不可代办 | R2 安全学习的参加资格 | 只能操作本人 |
| R-5 题目与覆盖 | R3 题库与答题判定 | 每次抽 10 题且覆盖四类 |
| R-6 答案不下发 | R3 题库与答题判定 | 响应不含正确答案 |
| R-7 学习完成后才能答题 | R3 题库与答题判定 | 未完成学习不能提交 |
| R-8 提交返回逐题判定 | R3 题库与答题判定 | 答对 8 题判定通过 + 答对 7 题判定未通过 |
| R-9 未通过可在次数内重试 | R3 题库与答题判定 | 未通过后可在次数内重考 |
| R-10 通过即恢复至 60 | R4 安全学习恢复记账 | 45 分恢复至 60 |
| R-11 不超 60 | R4 安全学习恢复记账 | 59 分只补到 60 |
| R-12 理由码与记录文案 | R4 安全学习恢复记账 | 恢复记录文案 |
| R-13 幂等 | R4 安全学习恢复记账 | 同一会话重复提交只恢复一次 |
| R-14 每自然月一次恢复 | R5 每月考试次数与恢复次数 | 当月已恢复后再次通过被拒绝 |
| R-15 跨自然月可再次参加 | R5 每月考试次数与恢复次数 | 跨自然月可再次参加 |
| R-16 失败不占恢复次数 | R5 每月考试次数与恢复次数 | 失败不占用恢复次数 |
| R-24 月度考试次数用尽 | R5 每月考试次数与恢复次数 | 当月第 3 次考试被拒绝 |
| R-26 月份边界按北京时间 | R5 每月考试次数与恢复次数 | 月份边界按北京时间 |
| R-17 恢复后展示同口径 | R6 恢复后的展示一致性 | 恢复后个人主页展示 + 恢复后在列表类展示面同口径 |
| R-18 限制自动解除 | R1 低分限制与自动解除 | 恢复至 60 后自动放行 |
| R-19 0 分恢复 | R7 恢复链路的边界与并发 | 0 分恢复至 60 |
| R-20 账户缺失 | R7 恢复链路的边界与并发 | 无信用账户按初始分处理 |
| R-21 用户不存在 | R7 恢复链路的边界与并发 | 不存在的用户沿用既有错误 |
| R-22 并发通过 | R7 恢复链路的边界与并发 | 并发通过只恢复一次 |
| R-23 发布行程被拦截 | R1 低分限制与自动解除 | 低于 60 发布行程被拒绝 |
| R-25 恰好 60 不被拦截 | R1 低分限制与自动解除 | 恰好 60 分不被拦截 |
| R-27 其他功能不限制 | R1 低分限制与自动解除 | 其他功能不因低分被限制 |

覆盖率：27/27；Delta 无孤儿 Scenario；反向「每条 Delta Scenario 都能追到需求场景」亦成立（29 = 27 + 2 处拆分）。

## Living Spec 基线保留

**N/A（但有归档顺序约束）。** 本 change 纯 ADDED，未覆盖任何 Living Spec 既有 Requirement。需注意 `openspec/specs/` 下当前**没有** `user-credit`：`add-credit-account`（REQ-019）仍未归档，本 Delta 是**在其 ADDED 增量之上再追加 ADDED 增量**。

- 归档顺序 MUST 为 `add-credit-account` → `add-credit-recovery`；否则本 change 归档后 `user-credit` 会缺「账户与初始分 / 等级派生 / 记账服务」等前置 Requirement。
- 两包 Delta 的 Requirement 名称无重名，归档合并不会互相覆盖。

## IO / SA 残余关注

| 关注点 | 归属 | 说明 |
|---|---|---|
| 契约版本号与迁移号 | SA / Dev | `openapi.yaml` 为 `0.14.0`、Flyway 头 `V20`；`handoff.md` 已记 `add-ai-itinerary`（REQ-017）顺延 **0.15.0 + V21**，故本变更不能直接用 V21，P3 需按合并顺序确认（预计 0.19.0 + V25） |
| 拦截提示文案与学习入口位置 | IO / Dev | D6 只定了「仅发布行程」，OQ-6 仍 open：`CREDIT_SCORE_BELOW_60` 的前端提示串与安全学习页路由待 P3 |
| 学习进度持久化 | SA | OQ-5 仍 open：会话表是否存中途进度，直接影响迁移字段数；P3 `design.md` 前必须关掉 |
| 演示造分路径 | Dev / IO | 扣分事件（#29–#31）未落地，线上无自然入口；演示需种子账号造分，Delta 已允许「因其他事件再次低于 60」的前置（R5 场景 2） |
| 原型缺口 | Dev / IO | `docs/prototype` 无安全学习页（grep `安全学习` 0 命中）；按 `@rule:prototype-ui-alignment` P3 先补截点 |
| 人工封禁关系 | IO | OQ-8 deferred：封禁能力落地后需追加「封禁不因学习解除」的 Requirement，本包不承接 |

## Next

- 一致性检查：`openspec/changes/add-credit-recovery/consistency-lint.md`（phase=p2）
- G1：`openspec/changes/add-credit-recovery/g1-decision.md`（Decision 待 IO + SA 具名签署）
