# AC / DoV 评审 — add-growth-level（P2）

- **Change：** `add-growth-level`（`user-growth` ADDED）｜ **阶段：** P2（delta-craft review）｜ **日期：** 2026-11-18
- **Delta：** [`specs/user-growth/spec.md`](specs/user-growth/spec.md)（纯 ADDED：9 Requirement / 41 Scenario）
- **输入：** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-031-growth-level.md`（41 场景 A–H）、`intents/REQ-031-growth-level.md`（D1–D15）、`requirement-workspace/deep-dive.md`「REQ-031 增补」、`requirement-workspace/impact-brief.md` §30
- **评审人：** Jay（AO）｜ **IO / SA 复核位：** WAYNE / Jacky（G1）
- **基线：** `origin/main@f2bad40`（合并 `8992853` 后再次合并）；契约 0.26.0；迁移头 `V31__report_credit_deduction.sql`（#29 已并入 main）

## 1. AC 检查（4 项）

| 项 | 结果 | 证据 | 说明 |
|---|---|---|---|
| AC-1 每条 Requirement 至少 1 条可测 AC | Pass | `specs/user-growth/spec.md`：9 Requirement 各含 3–6 条 Scenario，共 41 条 | 全部 Requirement ≥ 3 Scenario |
| AC-2 AC 可观察 | Pass | 同文件全部 Scenario 的 Then 均为返回值 / 流水字段 / 展示文本 / 既有错误码 | 无「体验良好」「性能可接受」类断言 |
| AC-3 高风险负向 / 边界已覆盖 | Pass | `100 与 400 边界`、`LV5 之后继续累计`、`扣经验后等级回退`、`不足 50 时扣到 0`、`达到 20 后停止增加`、`截断档位锁定且不次日补发`、`并发点赞同一档位只结算一次`、`用户不存在沿用既有错误` | 边界 + 负向 + 并发三个维度齐全 |
| AC-4 无实现细节伪装、无模糊词 | Pass | 全文检索无「适当 / 尽快 / 正确 / 合理」；唯一实现级约束为配置键 `routeme.growth.publish-exp`（用户裁决 D5 明确要求配置化，属范围约束） | 事务边界、响应形态均未写死，留 P3 design |

## 2. DoV 检查（5 项）

| 项 | 结果 | 证据 | 说明 |
|---|---|---|---|
| DoV-1 范围与 proposal 一致，无静默扩缩 | Pass | proposal §What Changes（10 条）↔ Delta 9 Requirement 一一对应；明细页 / 排行榜 / 通知 / 权益 / 管理端 / 中文头衔 / 回填 / #45 在 proposal Out of Scope 且 Delta 无对应条目 | 无新增能力、无第二个 capability |
| DoV-2 歧义已列出或解决 | Pass | 2 条已列明并带归属：① 重复处理已 `RESOLVED` 举报的响应形态（沿用既有异常 vs no-op）→ P3 design；② 他人响应的字段级可见性（本人返回经验 / 他人省略 / 批量只返回等级）→ P3 design；Delta 仅约束可观察结果 | 见「4. 残余关注」 |
| DoV-3 角色关注点（IO / SA）已记录 | Pass | 见「4. 残余关注」：IO 关注契约与可见口径、SA 关注展示与文案边界 | |
| DoV-4 未声称业务实现完成 | Pass | 本阶段无代码改动；Delta 为草稿收敛，状态 P2 | |
| DoV-5 Requirement 可追溯 proposal / REQ | Pass | 见「3. 场景映射」：41/41 条 REQ 场景有 Delta 归属；9/9 条 Delta Requirement 可回指 proposal | 无孤儿 Requirement / Scenario |

## 3. 场景映射（REQ-031 §4 → Delta Requirement）

| REQ 组（REQ-031 §4） | 条数 | Delta Requirement | 说明 |
|---|---|---|---|
| A 等级与初始值（L-1 ~ L-6） | 6 | R1 成长账户与初始经验（L-1 / L-5）+ R2 等级派生、边界与回退（L-2 / L-3 / L-4 / L-6） | L-2 + L-3 在 Delta 合并为「100 与 400 边界」一条（99/100/399/400 四值断言） |
| B 发布经验（P-1 ~ P-5） | 5 | R3 发布体验经验 | 1:1；「编辑或重复提交」与「删除后重建」保留为两条（后者额外验证幂等键跨删除仍有效） |
| C 点赞经验（K-1 ~ K-6） | 6 | R4 体验获赞经验 | 1:1 |
| D 每日上限（D-1 ~ D-5） | 5 | R5 每日正向上限 | 1:1；D-1 在 Delta 明确「实发 0 也留流水」 |
| E 举报扣经验（R-1 ~ R-6） | 6 | R6 举报成立扣减经验（R-1 ~ R-5）+ R2 等级回退（R-6） | R-6 归入等级派生 Requirement |
| F 展示与可见性（V-1 ~ V-6） | 6 | R8 成长等级的展示与可见性 | V-1 + V-4 在 Delta 合并为「本人可见等级与经验进度」（含 LV5 已满级） |
| G 并发与幂等（C-1 ~ C-3） | 3 | R9 结算幂等与并发 | 1:1；与 R6「同一举报只扣一次」构成顺序重试 / 并发双触发维度 |
| H 数据与契约边界（S-1 ~ S-4） | 4 | R7 经验流水与只读约束（S-1 / S-2 / S-4）+ R1 账户懒建（S-3） | S-3 读取不产生经验变化归入账户 Requirement |

**同义场景合并评估（P1 spec 评审 SUGGESTION 的 P2 处理）：** 逐组核对后仅保留两处「同义不合并」，均在 P1 已收敛或属不同触发维度，理由如下——

1. 发布经验「编辑或重复提交」vs「删除后重建」：断言相同（+0、无第二条流水），但后者显式覆盖删除路径与幂等键存活，删除后重建是真实可发生路径，保留两条不构成冗余。
2. 举报「同一举报只扣一次」（R6）vs「并发举报处理只扣一次」（R9）：前者验证重试 / 重复提交，后者验证并发竞态；两条可观察断言虽同构，但 P4 测试形态不同（顺序重试 vs 并发），合并会丢失并发门槛。

其余场景（K-3 与 K-2、D-1 与 D-2、S-4 与其余边界）均为不同前置 / 触发条件，不做合并。**结论：维持 41 Scenario，不新增合并。**

## 4. 残余关注（IO / SA）

| 角色 | 关注点 | 处理 |
|---|---|---|
| IO（WAYNE） | 契约扩展仅「个人主页响应 + 批量信用读取响应追加只读成长字段」；他人不得返回经验值 | P3 design 定字段形状与字段级可见性；P4 契约 lint 与本表对齐 |
| IO（WAYNE） | 重复处理已成立举报的响应形态（沿用既有异常 vs 静默 no-op） | P3 design 明确；Delta 只要求「至多扣一次」 |
| SA（Jacky） | 6 处展示面与信用分并列的文案边界（不得称信用等级 / 官方安全认证） | P3 原型先行 + 四档宽度 × 浅 / 深色走查；P4 E2E 断言文案 |
| SA（Jacky） | 每日上限跨档截断（18/20 +5 → +2）与档位锁定不次日补发 | Delta D-3 / D-2 显式断言，P4 后端测试覆盖日界（UTC 16:00） |

## 5. 结论

**AC 4/4 Pass，DoV 5/5 Pass，G1-ready（无阻塞项）。** 两处设计口径（重复处理响应形态、字段级可见性）已列明并归属 P3，不构成 Delta 级歧义；`openspec validate add-growth-level --strict` = valid。

> **编号更新（2026-11-18）：** 合并 `origin/main@f2bad40` 后，REQ-030 / S31 已由 `add-report-credit-deduction`（#29）占用，本 change 顺延为 **REQ-031 / S32**；本报告的编号与基线行已同步更新，评审结论不变。
