# P1 意图记录 — add-credit-recovery

- **Change：** `add-credit-recovery`（Issue #32 / Story 6「安全学习恢复信用分」/ 信用系统迭代 3）｜ **阶段：** P1（Intent & proposal 草稿）
- **日期：** 2026-11-17 ｜ **记录人：** liuwa2（当前开发者）
- **分支 / 基点：** `feature/add-credit-recovery` ← `origin/main@ec360dc`（本地 `main` 落后 37 个提交，未沿用旧基点）

## 1. 阶段目标

把看板与 Issue #32 收束为一个可判定的变更提案：明确「受限用户 → 安全学习 → 答题通过 → 恢复至 60 → 解除低分限制」这条垂直切片，并把三处边界划清——扣分 / 加分事件（#29–#31）、管理后台与人工封禁（#23）、题库与题目策略（本变更只做 Mock 预置题）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 提案 | [`proposal.md`](../../../openspec/changes/add-credit-recovery/proposal.md) | 问题 / 范围 / 影响面 / 设计取舍 / 裁定 D1–D5 / 25 条场景 / 约束 / 证据表 / 能力表 / 10 条 OQ / DoR 自检 / 残余风险 |

**本回合未产出**（按用户当次指示只起草提案，不动 P2 及以后的工件）：

| 工件 | 未产出原因 | 建议落点 |
|---|---|---|
| 意图捕获 `intents/REQ-024-credit-recovery.md` | 未获授权新增需求条目；且 OQ-1 未定会改变范围 | OQ-1 裁定后补齐 |
| Ready 需求 `requirements/REQ-024-credit-recovery.md` | 同上，DoR 尚有 4 条 BLOCKER | blocking OQ 清零后 |
| Delta 草稿 `specs/user-credit/spec.md` | P1 门槛只要求 proposal；4 条 blocking OQ 未定，此时写 Delta 会把未定口径固化成验收场景 | P2 |
| `stories.md` / `registry.md` / `handoff.md` 登记 | 需求编号与 capability 归属未最终确认 | P1 收尾或 P2 入口 |
| 提案评审记录 / 质量报告 | 提案本身尚未签署 | 提案裁定后 |

## 3. 已裁定决策（2026-11-17）

| 编号 | 决策 | 来源 |
|---|---|---|
| D1 | 低分限制由本变更落地：`score < 60` 为唯一派生条件，在选定拦截面返回 `CREDIT_SCORE_BELOW_60`，恢复至 60 自动放行 | 用户裁定 OQ-1 |
| D2 | 10 题，答对 ≥ 8 题通过 | 用户裁定 OQ-2 |
| D3 | 每自然月最多 2 次考试（无论通过与否计次），成功恢复仍最多 1 次 | 用户裁定 OQ-2 附加规则 |
| D4 | 「自然月」按 `Asia/Shanghai` 判定 | 用户裁定 OQ-3 |
| D5 | 恢复只经 `CreditService.book`，`delta = 60 - score_before`；恢复次数从 `credit_ledger` 派生 | 提案建议，未被否决 |
| D6 | 低分限制只拦「发布行程」；提交申请、聊天、修改资料不限制 | 用户裁定 OQ-10 |
| D7 | 题库为服务端资源文件，共 20 题，每次考试抽 10 题 | 用户裁定 OQ-4 |

- **次数真相分两处且不交叉：** 恢复次数看账本，考试次数看学习会话记录；会话表不存分数。
- **限制为派生而非存储：** 不建限制表，避免与后续扣分 change 抢表。
- **被否决：** `app_users` 加限制列、绕过账本直接改账户表、单独建 `credit_recovery_quota` 表（理由见提案「关键设计取舍」）。

**明确不做：** 扣分 / 加分事件（#29 / #30 / #31）、自动封禁、人工封禁模型与解封、管理后台与题库维护、明细可见、通知推送、恢复超过 60。

## 4. 校验

- `openspec validate add-credit-recovery --strict` → **未通过**，输出：`Change must have at least one delta. No deltas found.` 该错误来自「变更包必须含 `specs/<capability>/spec.md`」，属提案单工件阶段的预期状态；Delta 在 P2 补齐后才可通过。
- 基线核查（`origin/main@ec360dc`）：`CREDIT_SCORE_BELOW_60` 在 backend / frontend / openapi **0 命中**，仅存在于文档；`SAFETY_LEARNING_RECOVERY` 全仓 0 命中。
- 依赖现状：Issue #29 / #30 / #31 均 open，`openspec/changes/` 无对应变更包；`add-credit-account` 的 out of scope 已显式包含「自动封禁（< 60）、安全学习恢复」。
- 契约与迁移：`openapi.yaml` `info.version: 0.14.0`；Flyway 头为 `V20__add_credit_account.sql`；本变更需在 P3 排他确认版本号与 `V21`。
- 原型缺口：`docs/prototype` 无安全学习页（grep `安全学习` 0 命中）；按 `@rule:prototype-ui-alignment` 需在 P3 先补原型截点。
- 未运行：`scripts/verify-links.sh` / `kb-lint.sh`（需 bash，本机 PowerShell 环境不具备）；本轮新增文档的相对链接由人工核对。

## 5. 签署

未签署。BLOCKER 已清零（D1–D7）；余 3 条 WARNING：拦截提示文案与入口位置（OQ-6）、契约与迁移号 P3 排他、Delta 需明写「仅发布行程受限」。本阶段结论：**DoR 通过，待评审签署后可进 P2**。

## 6. 待决与风险（带入 P2）

| 项 | 说明 | 落点 |
|---|---|---|
| OQ-5 学习进度 | 中途退出是否续答；影响会话表字段 | non-blocking，P2 附例 |
| OQ-6 页面路由与入口 | 拦截提示与学习入口的位置 | non-blocking，P3 |
| OQ-7 契约与迁移号 | `0.14.0` → 次版本；`V20` → `V21` | deferred，P3 排他确认 |
| OQ-8 人工封禁 | 依赖封禁模型（#23） | deferred |
| 原型缺口 | 安全学习页无原型骨架 | P3 |
| 恢复链路先于扣分链路 | 当前无生产路径把用户送到 60 以下，演示需造分 | P4 演示口径 |
| 拦截面口径 | D6 只限制发布行程，与故事「旅行社交功能受限」的直觉不完全一致 | Delta 需明写边界 |

## 7. 提交记录

本阶段**未提交**：用户当次只要求新建分支与起草提案。工作区新增 `openspec/changes/add-credit-recovery/proposal.md` 与本记录，均在 `feature/add-credit-recovery` 上，未 push。
