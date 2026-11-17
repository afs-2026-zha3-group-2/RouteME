# P2 阶段记录 — add-credit-recovery

- **Change：** `add-credit-recovery`（REQ-026 / S27 安全学习恢复信用分）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-17 ｜ **记录人：** Qoder（当前开发者）
- **基点：** `origin/main@ec360dc`，分支 `feature/add-credit-recovery`（本阶段未提交、未推送）

> **过程快照：** 需求 / 故事编号、契约与迁移号、403 错误码已随 P4 合并 `origin/main@acf1b1f` 统一为 REQ-026 / S27 / `0.22.0` / `V27` / `CREDIT_RESTRICTED`；本文保留 P2 当时口径，变更明细见 `p4-apply.md` §8。

## 1. 阶段目标

把 P1 定稿的 25 条提案场景收敛为可判定的 Delta Spec：补齐 P2 入口发现的两条边界场景、把 7 条用户裁决 D1–D7 全部落成可断言语句，完成 AC/DoV 复核与一致性检查，产出待签的 G1 记录。

## 2. 产出

| 工件 | 路径 | 结论 |
|---|---|---|
| Delta Spec | [`specs/user-credit/spec.md`](../../../openspec/changes/add-credit-recovery/specs/user-credit/spec.md) | ADDED 7 Requirement / 29 Scenario；`validate --strict` valid |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/add-credit-recovery/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、映射 27/27、基线保留 N/A（纯 ADDED） |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-credit-recovery/consistency-lint.md) | Pass（BLOCKER 0 / WARNING 1 已收口 / SUGGESTION 5 / N/A 6） |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-credit-recovery/g1-decision.md) | **Pending**（待 IO + SA 具名签署；未代签） |
| 需求条目 | [`REQ-026-credit-recovery.md`](../../../requirement-workspace/requirements/REQ-026-credit-recovery.md) | 27 场景；blocking OQ 6/6 resolved；DoR BLOCKER 0 / WARNING 1 |
| 意图捕获 | [`REQ-026-credit-recovery.md`](../../../requirement-workspace/intents/REQ-026-credit-recovery.md) | 原始意图、D1–D7、现状核对 11 项证据 |

## 3. 本阶段裁决

P2 未产生新的业务裁决；D1–D7 在 P1 已由用户定稿。本阶段只做落地与收口：

| 议题 | 处理 | 落点 |
|---|---|---|
| 能力变更类型 | 从提案初稿的 `MODIFIED` 改为 **ADDED Requirements** | `openspec/specs/` 下无 `user-credit`（`add-credit-account` 未归档），本包只能追加；归档顺序 MUST 为 `add-credit-account` → `add-credit-recovery` |
| 场景粒度 | 提案 25 → 需求 27 → Delta 29 | 需求新增 R-26（北京时间月份边界）/ R-27（其他功能不限制）；Delta 把 R-8、R-17 各拆为两条场景 |
| 「开始即计次」冲突 | 当场修正 Delta R3 场景 3 | 原写「考试次数不被消耗」与 R5 冲突；改为「已在开始时计次，不退还次数；不占用恢复次数」 |
| 契约 / 迁移号 | 修正「P3 确认 V21」的措辞 | `handoff.md` 已记 `add-ai-itinerary` 占 `0.15.0 + V21`；本变更预计 `0.22.0 + V27`，P3 排他确认 |
| 拦截范围 | Delta R1 显式写「其余功能 MUST NOT 被拒绝」 | 承接 D6 与提案 DoR #10 的 Partial |

## 4. 校验

- `openspec validate add-credit-recovery --strict` → `Change 'add-credit-recovery' is valid`（L-01 修正后复跑）。
- Scenario 计数：7 Requirement / 29 Scenario（提案 25 → 需求 27 → Delta 29，差额已逐条说明）。
- Delta 结构：首个 `##` 之前无正文（首版顶部有基线说明引用块，validate 报 `Text above the first "## " section is not carried into the main spec by archive`，已删除并改记在提案与本记录）。
- 需求侧同步：`requirements/REQ-026-credit-recovery.md` 改 acceptance hints 编号区间、§4 加编号口径说明、§5 改契约 / 迁移措辞。
- 已知工具偏差：`openspec show --json` 对所有 change 报 `Change must have a Why section`（项目中文「## 问题」标题的既有约定），`validate --strict` 不受影响。

## 5. G1 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | 待签 | Delta Spec 与 G1 结论 | — |
| SA | 待签 | Delta Spec 与 G1 结论 | — |

**G1 结论：Pending。** P2 工件齐备且自检通过，但 `g1-decision.md` 的 `Decision` 与批准人栏保持待签；未取得具名签署前 P3 不得开工。

## 6. 带入 P3 的跟踪项

| 项 | 说明 | Owner |
|---|---|---|
| 契约版本号 | `openapi.yaml` 现 `0.14.0`；`add-ai-itinerary` 已占 `0.15.0 + V21`，本变更预计 `0.22.0`，需排他 | Dev |
| 迁移号 | Flyway 头 `V20`；预计 `V27`，需排他；建考试会话 + 作答记录两张表 | Dev |
| OQ-5 学习进度持久化 | 决定会话表字段（建议只存「学习完成时间戳 + 最终结果」） | SA |
| OQ-6 路由与提示文案 | 安全学习页路由 + `CREDIT_SCORE_BELOW_60` 提示串与入口位置 | IO / Dev |
| 原型截点 | `docs/prototype` 无安全学习页，按 `@rule:prototype-ui-alignment` 先补截点 | Dev / IO |
| 演示造分 | 扣分事件（#29–#31）未落地，需种子账号造分路径 | Dev / IO |
| 归档顺序 | 排在 `add-credit-account` 之后（`user-credit` Living Spec 尚不存在） | Dev |
| OQ-8 人工封禁 | deferred：封禁能力落地后追加「封禁不因学习解除」Requirement | IO |

## 7. 提交记录

本阶段**未提交**：用户只要求进行 P2，未要求分阶段提交或推送。新增文件为 `openspec/changes/add-credit-recovery/{specs/user-credit/spec.md,dov-ac-review.md,consistency-lint.md,g1-decision.md}`、`docs/sdd/add-credit-recovery/p2-spec.md`、`requirement-workspace/{intents,requirements}/REQ-026-credit-recovery.md` 与 `stories.md` / `registry.md` / `handoff.md` 登记。
