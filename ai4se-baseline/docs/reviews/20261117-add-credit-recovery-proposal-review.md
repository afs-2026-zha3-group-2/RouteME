# Artifact review — add-credit-recovery / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 提案评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-credit-recovery/proposal.md)（D1–D7 / 25 场景 / 12 项 DoR）
- **Supporting inputs:**
  - [`requirements/REQ-022-credit-recovery.md`](../../requirement-workspace/requirements/REQ-022-credit-recovery.md)、[`intents/REQ-022-credit-recovery.md`](../../requirement-workspace/intents/REQ-022-credit-recovery.md)
  - [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-recovery/specs/user-credit/spec.md)（P2 产物，用于反向核对提案与 Delta 是否已分叉）
  - [`registry.md`](../../requirement-workspace/registry.md)、[`stories.md`](../../requirement-workspace/stories.md)（S22）、[`handoff.md`](../../requirement-workspace/handoff.md)
- **Evidence:**
  - 规则核对：`rules/process/rules.md#spec-first`（P1 门槛：问题 / 范围 / Actors / 场景 / 约束 / 证据 / 能力影响 / OQ 八段齐全）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`
  - 证据复核：`V20__add_credit_account.sql` 存在、`openapi.yaml` `info.version` 为 `0.14.0`、migration 目录最大号为 **V20**、`openspec/changes/` 实测 23 个目录含 `add-ai-itinerary`
  - 「低分限制未实现」复核：`grep CREDIT_SCORE_BELOW_60` 在 `RouteME/backend`、`RouteME/frontend/src`、`openapi.yaml` 均 **0 命中**，与提案 §4 一致
  - 「原型无安全学习页」复核：`docs/prototype/` 下 grep `安全学习` 0 命中；P3 已按 `@rule:prototype-ui-alignment` 补 `credit-learning.html`
  - `npx --no-install openspec validate add-credit-recovery --strict` → `Change 'add-credit-recovery' is valid`

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING（已收口） | `rules/documentation/rules.md#sdd-artifacts` | `docs/sdd/README.md` 变更索引 | 本 change 未登记在文末变更索引，`grep add-credit-recovery` 在该文件 0 命中，P1 之后的追溯链断裂 | 已补一行（排在 `add-trip-cancel` 之后），链接 p1 / p2 / p3 并标注归档须晚于 `add-credit-account` | [fact] |
| F-2 | WARNING（已收口） | `rules/process/rules.md#spec-first` | §范围 In scope「数据」、§影响面 entity/mapper 行、Out of scope 第 4 条、§3「数据契约」 | P1 原文写「学习会话与作答记录」「作答明细」并把「题目随机抽题策略」列为 out of scope，与 D7（20 抽 10）和 P3-D2（只存完成标记 + 结果、不建逐题明细）正面冲突；P4 照此实现会多建一张表 | 已改写为单表 `credit_learning_session` 口径（会话 / 抽中题号 / 作答 / 判定 / `month_key`），并从 out of scope 删除「抽题策略」 | [fact] |
| F-3 | WARNING（已收口） | `rules/process/rules.md#artifact-review-gate` | §6 Open questions、§7 DoR #10 / #12 / 结论 | OQ-5 / OQ-6 仍标 `open`、OQ-7 仍标 `deferred`，DoR #10/#12 仍为 `Partial`，结论仍写「可进 P2」——工件停留在 P1 时点，与 P3 已完成的裁定不一致，会让 P4 误读为「还有未定业务规则」 | 已按 P3 裁决回填：OQ-5→`resolved（P3-D2）`、OQ-6→`resolved（P3-D3/D4）`、OQ-7→`resolved（P3-D5）`；DoR #10/#12 改 Pass；结论改为 BLOCKER 0 / WARNING 0 可进 P4 | [fact] |
| F-4 | SUGGESTION（已收口） | `rules/documentation/rules.md#document-conventions` | 首部「本回合状态」 | 只写到「P2 Delta 已产出」，缺 P3 交付与号位结论 | 已补 P3 五项产物与 `0.16.0 + V22` | [fact] |
| F-5 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | §6 OQ-8、§8 残余风险 | 「人工封禁不因学习解除」仍 deferred，本变更不建封禁模型 | 保留：前提是封禁能力（#23）未来以新 change 追加；本变更的「恢复至 60 即放行」结论在无封禁模型时成立 | [inference] |

**Counts:** BLOCKER 0 / WARNING 3（全部已收口）/ SUGGESTION 2（1 已收口 / 1 保留）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 只追加一个 capability `user-credit` 的 ADDED Requirement；不改 `user_credit_account` / `credit_ledger` 结构；恢复只经既有 `CreditService.book`，不新开写分入口 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景可测） | 25 条场景均含可观察结论（分数值、账本等式、reason code、错误码、次数） |
| D Security | Pass | 答案不下发写成 MUST NOT（R-6）；无写分端点；他人不可代办（R-4）；不建限制表因此无新增可篡改状态 |
| E Process | Pass | 六个 blocking OQ 全部具名裁定（D1–D7）；Scope in / out 均非空；`validate --strict` 通过 |
| F Documentation | Pass | 证据表逐条可复核（本报告已抽验 4 条）；无绝对机器路径 |
| G Traceability | Pass | D1–D7 → Delta 7 Requirement → Tasks T1–T13 全链可追；剩余缺口仅在 OQ-8 的跨 change 依赖 |

## Residual risks

- 恢复链路先于扣分链路（#29–#31）交付，线上无自然触发路径；演示依赖种子账号造分。该风险在提案 §8 已登记，P4 验证报告需注明「造分方式与来源」。
- 拦截面只覆盖发布行程（D6），与故事「旅行社交功能受限」的直觉口径不完全一致；扩展需新 change。
- OQ-8 的人工封禁模型未落地；若未来封禁能力引入，本变更的「≥ 60 即放行」需与新模型对齐。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | D1–D7 / §范围 / §6 OQ / §7 DoR |
| `proposal.md` | 2 / 2（非当前开发者且非 WAYNE） | Jay | 2026-11-17 | 发起人当次会话指定 | D1–D7 / §范围 / §6 OQ / §7 DoR |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准 Pass」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
