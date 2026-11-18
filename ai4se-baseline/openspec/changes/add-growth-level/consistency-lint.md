# 一致性 lint — add-growth-level（P2）

- **Change：** `add-growth-level`（`user-growth` ADDED）
- **Phase：** p2 ｜ **Focus：** full（change 目录全部工件）
- **Timestamp：** 2026-11-18（Asia/Shanghai）
- **Artifact level：** 2（`proposal.md` + `specs/user-growth/spec.md`；无 `tasks.md` / `design.md`）
- **Authorities：** `openspec/changes/add-growth-level/**`、`requirement-workspace/requirements/REQ-033-growth-level.md`、`docs/knowledge/rules/**`

## 1. Verdict

**Pass**（0 BLOCKER / 0 WARNING / 4 SUGGESTION / 3 N/A）

## 2. Findings

| id | severity | location | issue | suggested_fix | evidence | authority |
|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | `proposal.md` 规则行 | 提案引用 6 个 `@rule:` 锚点（`api-contract` / `java-patterns` / `web-coding-style` / `security-baseline` / `tdd-cycle` / `sdd-artifacts`），均在权威区 `_INDEX.md` 与对应 rules.md 标题存在；但宿主投影中的 `@rule:prototype-ui-alignment` / `@rule:rule-precedence` 在权威区无同名 heading，提案已改用「原型先行 + 文件路径」表述 | 保持现状；若后续要在工件中引用这两个 ID，需先在权威区补 heading（治理项，与本 change 无关） | `docs/knowledge/rules/**/rules.md` grep 结果；proposal.md 规则行 [fact] | proposal |
| L-02 | SUGGESTION | `proposal.md`「13 条验收信号」 vs Delta 41 Scenario | 两套计数属不同层级（对外验收信号 vs 规格断言），无冲突，但 P4 本地验证报告需逐条覆盖 13 条信号 | P4 `local-verify-report` 增加「13 条验收信号 ↔ 测试证据」对照表 | proposal.md / spec.md [fact] | proposal |
| L-03 | SUGGESTION | `spec.md` R1「成长账户 MUST 与经验流水在同一事务内更新」 | 该句只约束账户 + 流水原子性；不覆盖业务事件（发布 / 点赞 / 举报处置）与成长结算之间是否同事务——正是 P1 评审 WARNING 的 P3 待决项，易被误读为已定 | P3 `design.md` 显式写「业务事件事务边界」决策并注明本句不涉业务事件 | spec.md R1 / proposal review WARNING [inference] | spec |
| L-04 | SUGGESTION | REQ-033 §4 场景编号（L / P / K / D / R / V / C / S） vs Delta Scenario 标题 | 两套命名靠 `dov-ac-review.md` 映射表对齐，无断链；但 P3 `tasks.md` 若直接引用 REQ 编号会再次引入双轨 | P3 tasks 统一引用 Delta Scenario 标题，REQ 编号只在追溯列出现 | dov-ac-review.md §3 [fact] | spec |

## 3. Checklist results

| 组 | 结果 | 说明 |
|---|---|---|
| Proposal P1–P4 | Pass | `## Why` / `## What Changes` / `## Out of Scope` / `## Impact` 均存在且非空 |
| Spec S1–S5 | Pass | 结构符合 OpenSpec schema；`@` 引用仅出现在 proposal 且可解析；9/9 Requirement 可回指 proposal What Changes；全部 Scenario 含 Given / When / Then；无孤儿 Scenario |
| Tasks T1–T3 | N/A | 无 `tasks.md`（P3 产出） |
| Design D1–D3 | N/A | 无 `design.md`（P3 产出） |
| C1 proposal → spec | Pass | What Changes 10 条均有 Requirement 承接 |
| C2 spec → tasks | N/A | 无 `tasks.md` |
| C6 `@rule:` reachability | Pass | 6 个 `@rule:` 锚点在权威区可解析；无 `@knowledge:` 引用 |
| p2-1 范围一致性 | Pass | proposal Out of Scope 与 Delta 无对应条目；无静默扩散 / 缩水 |
| p2-2 Delta 内部一致 | Pass | 角色（用户 / 他人 / 管理员 / 平台）、约束（每日 +20、−50、最低 0）、场景之间无矛盾 |
| p2-3 关键场景有归属 | Pass | 引用 / 展示 / 上限 / 幂等全部有 Requirement；两处实现口径显式 defer 到 P3 |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 不可追溯项 | Pass | 无孤儿 Requirement / Scenario |
| 交叉引用完整性 | Pass | Delta 头引用的 `dov-ac-review.md`、proposal 引用的 RouteME 路径与规则文件均存在 |

## 4. Residual risks

- 重复处理已成立举报的响应形态（既有异常 vs no-op）与字段级可见性未在 Delta 写死 → 已列入 `dov-ac-review.md` §4，由 P3 design 收口（owner：Jay；复核：WAYNE）。
- 契约版本 / 迁移号按「落定 0.30.0 + V34」占位（基线 0.26.0 + V31，已随 #29 并入 main）；P3 排他确认，若 origin/main 再前进需顺延。
- 展示面涉及 6 处跨页面改动，视觉回归依赖 P3 原型截点与 P4 E2E；本阶段无代码证据。

## 5. Reviewer metadata

- **Agent run：** 2026-11-18（P2 / phase=p2）
- **Human sign-off：** 待 G1（IO=WAYNE / SA=Jacky）
- **Next（non-Gate）：** `/sdd:g1-decision-record` 或继续 `/sdd:p2`

> 本报告不是 Gate 结论，不构成 Living Spec 权威；修复建议在人工确认前不自动改写规格。
