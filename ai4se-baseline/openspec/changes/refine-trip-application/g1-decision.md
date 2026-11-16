# G1 decision — refine-trip-application

- **Gate:** G1（Align）
- **Change:** `refine-trip-application`（`trip-companions` MODIFIED，REQ-009 / S08）
- **Timestamp:** 2026-11-16T12:10+0800
- **Recorded by:** Qoder（AI agent），按用户 2026-11-16 提供的团队名单与「帮我进行签署」指令记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、决策与验收信号齐全；能力记为 `trip-companions` MODIFIED；后端 / 契约 / 迁移不变 |
| Delta Spec — `trip-companions` | [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md) | 1 Requirement / 8 Scenario；MODIFIED；`openspec validate refine-trip-application --strict` valid |
| Living Spec baseline | `openspec/specs/trip-companions/spec.md`「提交与取消同行申请」 | 同名 Requirement 存在（5 场景）；delta 保留全部基线场景 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；基线保留 5/5；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 5 |
| P2 quality report | `docs/ai4se-plugins/20261116-115630-quality-checklist-report.md` | P2 Overall Pass（P2-3 因 G1 未签署 Skipped；P2-4 Pass） |
| Requirements | `requirement-workspace/requirements/REQ-009-trip-application-entry.md` | §4 8 场景；§8 blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-009-trip-application-entry.md` | 候选能力 MODIFIED；Discovery Decision `Go` |
| Impact brief | `requirement-workspace/impact-brief.md` §13 | as-is 盘点、delta、blast radius、风险与拆分边界 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-009 增补」 | ①–④ 四表，A0 ⑨–⑫ 通过 |
| Baseline change | `openspec/changes/archive/2026-11-15-add-trip-companions/` | 已归档；申请、状态机、后端拒绝与测试已存在，本 change 只补入口与展示 |
| Implementation evidence | `RouteME/frontend/src/trips/TripDetailPage.tsx`、`tripMessages.ts`、`api.ts`；`ApplicationServiceImpl.apply`；`ApplicationServiceTest` | 申请弹窗与错误码直出为现状；后端本人 / 重复 / 满员 / 结束拒绝已实现并测试 |
| Contract evidence | `RouteME/openapi.yaml` 0.7.0 | `message` nullable ≤120；`DUPLICATE_APPLICATION` / `TRIP_NOT_OPEN` 已定义；无需改契约 |
| Prototype evidence | `docs/prototype/ui.js` `actionBox`；`store.js` `canApply`；`stories.html` S08 | 内联申请区、待处理提示 + 撤回、不可申请原因、S08 三条 AC |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-009 一致：详情页内联申请区、提交进入待处理、本人无入口、重复提示、满员 / 结束拒绝、撤回恢复、页面停留期间状态变化；无自动加入、无必填说明、无卡片入口、无通知、无后端 / 契约 / 迁移变更 | `proposal.md` §范围；`dov-ac-review.md` DoV-1；`consistency-lint.md` p2-1 |
| Ambiguity | 无未决歧义：MODIFIED 替换既有「提交与取消同行申请」并保留 5 个基线场景；说明选填；待处理态按原型；重复文案「已申请，请等待回应」；入口只在详情页；满员时两种 409 错误码都可能出现 | `dov-ac-review.md` §规格解释裁决 1–6 |
| Conflict | 无阻塞冲突。S08 字面「提交后按钮变为已申请，待处理」被用户 2026-11-16 裁决 D2 覆盖为原型的等待提示 + 撤回；原型 mock 文案「已申请，等待回应」与用户 AC「已申请，请等待回应」相差一个「请」字，已按用户 AC 收敛 | `requirement-workspace/requirements/REQ-009-trip-application-entry.md` §9；`dov-ac-review.md` §规格解释裁决 2–3 |
| Traceability | REQ-009 §4 八条场景 8/8 有 Delta 落点；Living Spec 5 个既有场景 5/5 保留；proposal In scope 8 项均有 Scenario 覆盖 | `dov-ac-review.md` §Requirement mapping / §Living Spec 基线保留 / §Proposal → Delta 覆盖 |
| Residual risk | 页面停留期间前端 `canApply` 为旧快照；E2E 选择器从弹窗改为内联；重复与满员错误码优先级；MODIFIED 合并需人工核对；宿主规则投影与权威区存在预存漂移（`prototype-ui-alignment` / `rule-precedence` 无锚点，本 change 已避免 `@rule:` 断链） | `dov-ac-review.md` §残余风险；`consistency-lint.md` L-01–L-04 |

## Decision

**Pass**

## Conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 详情页改为内联申请区（非弹窗），保留说明选填 ≤120、提交按钮与聊天权限说明；入口仅对「他人 + recruiting + 未满员 + 无 pending/accepted」展示 | AO（Jay） | P3 `design.md` / P4 Apply |
| 待处理态按原型：等待发布者回应提示 + 撤回申请；刷新后保持；不使用字面「已申请，待处理」按钮（D2） | AO（Jay） | P3 `design.md` / P4 Apply |
| 重复申请把 `DUPLICATE_APPLICATION` 映射为「已申请，请等待回应」；满员 / 结束展示「人数已满」/「行程已结束」；两种 409 错误码都按可读原因处理 | AO（Jay） | P3 `design.md` / P4 Apply |
| 测试矩阵覆盖：本人无入口、重复、满员（无申请 → `TRIP_NOT_OPEN`；已有 pending → `DUPLICATE_APPLICATION`）、已结束、撤回恢复、页面停留期间状态变化（lint L-03） | AO（Jay） | P3 `tasks.md` / P4 Apply |
| `tasks.md` 增加 Living Spec 合并收口任务：合并后仍有 8 个场景，原 5 个场景语义完整（lint L-02） | AO + SA | P3 `tasks.md` / G3 前 |
| P5 `summary.md` 记录 D2 覆盖 S08 字面按钮 AC 的最终口径（lint L-04） | BA / AO | P5 / G3 |
| 后端 `ApplicationServiceImpl` 与 `openapi.yaml` 保持不变；`ApplicationServiceTest` 满员 / 重复 / 本人 / 重申请用例作为回归保留 | AO（Jay） | P4 验证 |
| 宿主规则投影缺少 `prototype-ui-alignment` / `rule-precedence` 锚点（预存差异）由规则治理另立变更处理，不纳入本 change（lint L-01） | Rules-govern | 后续 rules-govern |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：用户 2026-11-16 在会话中提供的团队名单（SM Lewis / AO Jay / IO Wanye / SA Jacky / VL Neal）并明确指示「帮我进行签署」；本记录不代替后续 G2 / G3 的独立签署。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- 4 条 SUGGESTION 分别落入 P3 `design.md` / `tasks.md`、P4 测试矩阵、P5 `summary.md` 与 rules-govern；无阻塞项。
