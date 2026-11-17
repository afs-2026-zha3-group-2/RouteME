# AC / DoV review — add-credit-account

- **Change:** `add-credit-account`
- **Phase:** `p2`（Delta Spec 复核，G1 输入）
- **Delta 路径:** `openspec/changes/add-credit-account/specs/user-credit/spec.md`（ADDED：7 Requirement / 22 Scenario）
- **Requirement 来源:** `requirement-workspace/requirements/REQ-019-credit-account.md` §4（C-1 ~ C-16）
- **Proposal:** `openspec/changes/add-credit-account/proposal.md`
- **Timestamp:** 2026-11-17T11:20+08:00
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec validate add-credit-account --strict` → `Change 'add-credit-account' is valid`；Delta 纯 ADDED（0 MODIFIED / 0 REMOVED）

## Verdict

**AC 4/4 Pass ｜ DoV 5/5 Pass → G1-ready（等签署）**

## AC 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测 AC | Pass | 7/7 Requirement 均含 ≥2 个 Scenario（最少 2、最多 5） | 边界、只读、账本三条各有独立可断言数值 |
| AC-2 AC 可观察 | Pass | 展示串「80 / 100 · 信用良好」、五档边界表、裁断数值（98→100 记 +2）、等式「前 + 变化 = 后」 | 无「正常工作」类模糊表述 |
| AC-3 高风险处有负向 / 边界场景 | Pass | 注册失败不留账户、上下界裁断、实际生效 0、提交分数被忽略、无写分端点、用户不存在 | 覆盖数据完整性与越权两类风险 |
| AC-4 不把实现细节伪装成 AC | Pass | Delta 只约束可观察结果；「同一事务」写成可验证的原子性（失败时两者都不生效），不指定表结构 / 类名 | 字段名与码值只在 proposal 影响面出现，Delta 不绑定 |

## DoV 检查

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | 提案 In scope 8 条 → Delta 7 Requirement；Out of scope 全部无对应 Requirement | 管理端以「边界」Requirement 落地推迟，未静默扩范围 |
| DoV-2 歧义已列出或解决 | Pass | 需求 §8：blocking 7 条 resolved；非阻塞 3 条由 D9–D11 裁定、2 条 deferred 且有 owner | 无遗留 blocking 歧义 |
| DoV-3 角色关注点已记录 | Pass | IO：D1 口径 / D2 管理端 / D4 可见性 / D5 回填；SA：D3 数据模型 / D6 记账 / D9 归属 / D10 契约取值 / D11 零变化 | 见下方「IO / SA 残余关注」 |
| DoV-4 未主张已实现业务 | Pass | P2 无代码 / 契约 / 迁移变更；`openapi.yaml` 仍 0.11.0 | 实现属 P3 / P4 |
| DoV-5 Requirement 可追溯到提案 / 已批准需求 | Pass | 16/16 场景映射见下表，无孤儿 Requirement、无未覆盖 AC | AC3 / AC4 由 D2 + R7 显式承接 |

## Requirement 映射（REQ-019 → Delta）

| REQ-019 场景 | Delta Requirement | Delta Scenario |
|---|---|---|
| C-1 注册即得初始分 | R1 信用账户与初始分值 | 注册成功后初始化信用账户 |
| C-2 注册事务内建账户 | R1 信用账户与初始分值 | 注册成功后初始化信用账户 / 注册失败不留信用账户 |
| C-3 历史账号回填 | R1 信用账户与初始分值 | 存量账号补齐初始分 |
| C-4 账户唯一且幂等 | R1 信用账户与初始分值 | 同一用户只有一个信用账户 |
| C-5 五档边界 | R3 信用等级派生 | 五档边界与区间闭合 |
| C-6 分数与等级同时展示 | R4 个人主页展示信用状态 | 分数与等级文字同时展示 |
| C-7 本人可见 | R4 个人主页展示信用状态 | 本人查看自己的信用状态 |
| C-8 他人可见、明细不可见 | R4 个人主页展示信用状态 + R7 管理后台边界 | 其他用户查看同一信用状态 / 不展示加扣分明细 |
| C-9 资料未完善仍展示 | R4 个人主页展示信用状态 | 资料未完善仍展示信用状态 |
| C-10 用户不能自行修改 | R5 信用分只读 | 用户提交信用分字段被忽略 / 不存在客户端写分端点 |
| C-11 多入口一致 | R4 个人主页展示信用状态 | 重复进入展示一致 |
| C-12 变化必留痕且可回算 | R6 信用记录与记账服务 | 每次变化写入一条信用记录 / 记录满足前后分数等式 |
| C-13 越界裁断取实际值 | R2 分数区间与越界裁断 + R6 | 上界裁断记录实际生效量 / 下界裁断记录实际生效量 / 记录满足前后分数等式 |
| C-14 等级随分数实时重算 | R3 信用等级派生 | 等级随分数实时重算 |
| C-15 零变化也留痕 | R6 信用记录与记账服务 | 实际生效量为零仍留记录 |
| C-16 任意用户不出现缺失值 | R1 + R6 + R4 | 存量账号补齐初始分 / 记录满足前后分数等式 / 本人与他人查看 |
| 故事 AC3 / AC4（管理端） | R7 管理后台信用分视图与计分明细的边界 | 不存在管理后台信用分视图 |

## Living Spec 基线保留

**N/A**：本 change 为纯 ADDED，未覆盖任何 Living Spec 的既有 Requirement；`user-auth`「注册账号」按 D9 保持不动。归档时不涉及「MODIFIED 必须复制基线场景」的约束。

## IO / SA 残余关注

| 关注点 | 归属 | 说明 |
|---|---|---|
| 契约版本号与迁移号 | SA / Dev | `openapi.yaml` 0.11.0、Flyway 头 V17；REQ-016（V17）/ REQ-017（0.12.0 + V18）在途，P3 必须排他确认 |
| 等级码值落契约 | SA | D10 已定五码；P3 / P4 需把 `credit_level` 的 enum 与 `UserProfile.required` 写进契约并加契约测试 |
| 原型缺口 | IO / SA | `docs/prototype` 无信用分骨架；P3 先补截点再实现（`@rule:prototype-ui-alignment`） |
| 管理端推迟 | IO / SM | AC3 / AC4 不在本 change；需另开管理后台需求，避免被当成「遗漏」 |

## Next

- 一致性检查：`openspec/changes/add-credit-account/consistency-lint.md`（phase=p2）
- G1：`/sdd:g1-decision-record`（需 IO + SA 具名签署）
