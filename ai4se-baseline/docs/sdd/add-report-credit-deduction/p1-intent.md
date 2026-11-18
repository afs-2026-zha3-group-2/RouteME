# P1 意图记录 — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`（Issue #29 / Story 2「举报违规扣减信用分」/ 信用系统迭代 1）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-18 ｜ **记录人：** Lewis（SM，当前开发者）
- **分支 / 基点：** `feature/add-report-credit-deduction` ← `origin/main@f0d093a`（独立 worktree `.worktrees/add-report-credit-deduction`；主工作区有未提交改动，未复用）；P1 提交后已合并 `origin/main@822471c`
- **需求 / 故事：** REQ-029 / S30（REQ-019…REQ-027 已占用；S28 为安全学习恢复）

## 1. 阶段目标

把 GitHub Issue #29 收束为一个可判定的变更提案：明确「举报核实成立 → 管理员选违规类型 + 填违规原因 → 系统按规则扣分并写信用记录 → 跌破 60 触发既有低分限制」这条垂直切片，并把三处边界划清——账号处置动作（从举报页移除，保留在用户管理页）、信用明细可见面（不做）、其他扣分 / 加分事件（#30–#32，另开 change）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-029-report-credit-deduction.md`](../../../requirement-workspace/intents/REQ-029-report-credit-deduction.md) | 原始意图 / 价值假设 / 现状核对 12 条 / D1–D5 / 边界 / 能力关系 / Discovery Go |
| Ready 需求 | [`requirements/REQ-029-report-credit-deduction.md`](../../../requirement-workspace/requirements/REQ-029-report-credit-deduction.md) | 六字段 + 26 场景（A–G 七组）+ 约束 + 证据 + 能力表 + 9 条 OQ + DoR 自检 |
| 深度分析 | [`deep-dive.md`](../../../requirement-workspace/deep-dive.md)「REQ-029 增补」 | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致性 / ④ 通知与展示契约 + 探针记录 |
| 影响分析 | [`impact-brief.md`](../../../requirement-workspace/impact-brief.md) §29 | As-is 资产清单 / As-is → Delta / 爆炸半径 / 工件影响 / 双轨 / 风险 / 切分边界 |
| 提案 | [`proposal.md`](../../../openspec/changes/add-report-credit-deduction/proposal.md) | 问题 / 范围 / 影响面 / D1–D5 / 设计取舍 / 26 条场景 / 约束 / 证据 / 能力表 / 9 条 OQ / DoR / 残余风险 |
| Delta（`user-credit`） | [`specs/user-credit/spec.md`](../../../openspec/changes/add-report-credit-deduction/specs/user-credit/spec.md) | ADDED 3 Requirement / 16 Scenario：违规类型与扣分规则、记账 / 截断 / 幂等、低分联动 |
| Delta（`admin-console`） | [`specs/admin-console/spec.md`](../../../openspec/changes/add-report-credit-deduction/specs/admin-console/spec.md) | MODIFIED 1 Requirement / 19 Scenario：举报详情与处理（保留 8 条基线 + 11 条新增 / 替换） |
| 提案评审 | [`docs/reviews/20261118-add-report-credit-deduction-proposal-review.md`](../../reviews/20261118-add-report-credit-deduction-proposal-review.md) | Verdict Pass；BLOCKER 0 / WARNING 2（1 已收口、1 留待 G1）/ SUGGESTION 3；WAYNE + Lewis 签署 |
| 规格评审 | [`docs/reviews/20261118-add-report-credit-deduction-spec-review.md`](../../reviews/20261118-add-report-credit-deduction-spec-review.md) | Verdict Pass；BLOCKER 0 / WARNING 2（1 已收口、1 留待 G1）/ SUGGESTION 3；WAYNE + Lewis 签署 |
| P1 质量报告 | [`docs/ai4se-plugins/20261118-095648-quality-checklist-report.md`](../../ai4se-plugins/20261118-095648-quality-checklist-report.md) | P1 必选项 4/4 Pass；可选 2 项 Skipped；Overall Pass |
| 登记 | `registry.md` / `stories.md` / `handoff.md` | REQ-029 / S30 行与映射；`docs/sdd/README.md` 索引行 |

## 3. 已裁定决策（2026-11-18）

| 编号 | 决策 | 来源 |
|---|---|---|
| D1 | 举报处置只留违规类型 + 违规原因；移除处罚动作（`KEEP / SUSPEND / BAN / UPDATE_BAN`）与封禁理由；账号处置仍走用户管理页 | 用户当次会话裁决（「用户应该选择违规类型，输入违规原因即可；具体处罚规则应该是系统后台进行处理」） |
| D2 | 信用记录只落账本并关联举报编号；不新增用户端 / 管理端信用明细页 | 用户当次会话裁决（与 REQ-019 D2 / REQ-023 D2 一致） |
| D3 | 低分联动沿用既有 `CreditChangedEvent` 自动限制 / 清退；本变更不新增限制逻辑 | 用户当次会话裁决 |
| D4 | `OTHER` 由管理员在 -5 / -10 / -20 / -30 中选择；其余 7 类固定 | 用户当次会话裁决（issue 表格原文） |
| D5 | 当前开发者 = Lewis（SM） | 用户当次会话回答 |

**明确不做：** 用户举报提交端原因枚举（仍 4 类）、信用明细页 / 申诉、举报页账号处罚、月度扣分上限、其他扣分 / 加分事件（#30–#32）、通知推送、历史举报补扣。

## 4. 校验

- `openspec validate add-report-credit-deduction --strict` → **valid**；INFO：`admin-console` 活规格不存在，MODIFIED 仅归档阶段拒绝（已登记归档顺序约束）。
- 基线核查（`origin/main@f0d093a`）：`AdminReportServiceImpl.resolve` 的成立分支只调 `applyPenalty`（`SUSPEND / BAN / UPDATE_BAN`；`KEEP` 返回）；`BanReasonEnum` 8 码值与 issue 的 8 类违规行为同名；`ReportServiceImpl.REASONS` 为 4 类；`CreditService.book` 支持 `relatedType` / `relatedId` / `idempotencyKey` 与 0–100 裁断；`CreditEnforcementServiceImpl.onCreditChanged` 在跨 60 时建立 / 解除限制；`openapi.yaml` `0.24.0`；Flyway 头 `V27`。
- **合并 `origin/main@822471c` 后复验：** 迁移头顺延至 `V29__credit_exit_application.sql`（`V28` 说明证据 / `V29` 申请关联已被 `add-credit-exit-restriction` 占用），本变更预计 `V31`；契约仍为 `0.24.0`，预计 `0.26.0`；`onCreditChanged` 跨 60 语义未变（阈值改由 `CreditExitCalculator.RESTRICTION_THRESHOLD` 提供）。`V27` 为合并前基线，保留在评审报告中作为当时证据。
- 扣分表逐项核对：10 / 15 / 30 / 20 / 20 / 10 / 30 + `OTHER` 四档，与 issue #29 一致。
- 原型缺口：管理端举报处置界面不在原型 v1 中；P3 先补截点（`@rule:prototype-ui-alignment`）。
- 未运行：`scripts/verify-links.sh` / `kb-lint.sh`（需 bash 环境且本轮新增文档的相对链接已人工核对）。

## 5. 签署

- `proposal.md`：WAYNE（IO）— 2026-11-18，发起人当次会话确认「全部批准」。
- Delta Spec（`user-credit` + `admin-console`）：WAYNE（IO）— 2026-11-18，同上。
- 两份评审报告：WAYNE（IO）+ Lewis（SM）— 2026-11-18，同上。
- 本阶段结论：**Pass**（BLOCKER 0；WARNING 1 留待 G1 追认 D1 对 `add-admin-console` 语义的替换）。

## 6. 待决与风险（带入 P2）

| 项 | 说明 | 落点 |
|---|---|---|
| OQ-1 违规类型枚举归属 | 复用 `BanReasonEnum` 或新建 `ReportViolationType` | P3 |
| OQ-2 报告字段命名 | `violation_type` / `applied_deduction`；`resolution_action` 历史值只读 | P3 |
| OQ-3 已处理详情展示 | 违规原因全文与处理结果分行 | P3 / 原型 |
| OQ-4 契约与迁移号 | `0.24.0` → 次版本；`V29` → `V31` | P3 排他确认 |
| OQ-5 举报列表列 | 是否展示违规类型列 | 默认不展示 |
| G1 追认 | D1 替换 `add-admin-console` 的 2 条基线场景（成立并处罚 / 已受限处置） | G1 SA |
| 归档顺序 | `admin-console` / `user-credit` 均未归档 | P5：排在 `add-admin-console` 与 `add-credit-account` 之后 |

## 7. 提交记录

P1 阶段产物一次性提交（`docs(p1): add-report-credit-deduction add REQ-029 proposal and delta`），按阶段提交约定只包含本阶段产物；提交后先 `git pull` 再 `git push`。

- **拉取：** `origin/main` 在 P1 起草期间前进 3 个提交（`e491d37` / `370076d` / `822471c`，含 `add-credit-exit-restriction` 的 `V28` / `V29`），已 `git pull --no-rebase` 合并（合并提交 `2d6b95d`）；迁移号已按合并后基线改为 `V29` → 预计 `V31`。
- **推送：** `git push -u origin feature/add-report-credit-deduction`（worktree 创建时 upstream 指向 `origin/main`，推送时改绑 feature 分支）。
