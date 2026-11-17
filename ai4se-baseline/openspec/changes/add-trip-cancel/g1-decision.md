# G1 decision — add-trip-cancel

- **Gate:** G1（Align）
- **Change:** `add-trip-cancel`（`trip-cancellation` ADDED，REQ-019 / issue #28）
- **Timestamp:** 2026-11-17T12:30+0800
- **Recorded by:** Qoder（AI agent）；决策与签署待 IO / SA 具名确认，模型不代替人工批准

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、D1–D6 与残余风险齐全；能力 `trip-cancellation` ADDED；信用分显式排除 |
| Delta Spec — `trip-cancellation` | [`specs/trip-cancellation/spec.md`](specs/trip-cancellation/spec.md) | 5 Requirement / 20 Scenario；ADDED；`openspec validate add-trip-cancel --strict` valid |
| Living Spec baseline | `openspec/specs/trip-plans/spec.md`、`trip-companions/spec.md`、`trip-experiences/spec.md` | 不替换任何既有 Requirement 块；`trip-plans` 已含「已取消不出现在默认列表」 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；映射 20/20；#28 in-scope AC 10/10；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 5 / N/A 4 |
| P1 quality report | `docs/ai4se-plugins/20261117-114804-quality-checklist-report.md` | P1 Overall Pass（P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped） |
| P2 quality report | `docs/ai4se-plugins/20261117-115250-quality-checklist-report.md` | P2 Overall Pass（P2-1 / P2-2 Pass；P2-3 Skipped 因 G1 未签署；P2-4 Pass） |
| Requirements | `requirement-workspace/requirements/REQ-019-trip-cancel.md` | 20 场景；blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-019-trip-cancel.md` | 候选能力 ADDED；Discovery Decision `Go` |
| Impact brief | `requirement-workspace/impact-brief.md` §19 | as-is 盘点、delta、blast radius、风险与拆分边界 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-019 增补」 | ①–④ 四表；A0 ⑨–⑫ 通过 |
| Issue | GitHub #28「[P0] 取消行程」 | 用户故事、取消规则、8 项原因、取消后处理、15 条 AC、4 个场景 |
| Implementation evidence | `TripStatusEnum`、`TripPlan.status()`、`TripPlanMapper.xml`、`TripPlanServiceImpl.complete()`、`ApplicationServiceImpl:235`、`ChatServiceImpl:114`、`UserProfileStatsServiceImpl:42-52`、`ExperienceServiceImpl:149` | 四态推导、只排已结束、仅结束事件批量取消、仅 COMPLETED 只读、发布统计含全部 |
| Contract evidence | `RouteME/openapi.yaml` 0.11.0 | 四态 enum；无取消端点；错误码 `TRIP_NOT_OPEN` / `CHAT_READ_ONLY` / `EXPERIENCE_NOT_ALLOWED` / `FORBIDDEN` / `INVALID_INPUT` 已定义 |
| Prototype evidence | `docs/prototype/ui.js:410`、`main.js:646`、`store.js:240-248` | 详情页入口、二次确认文案、取消 PENDING / 保留 ACCEPTED |
| User decisions | 2026-11-17 D1–D6 | 信用分排除；入口两处；原因可见性；其他说明必填；四组不变；REQ-019 / add-trip-cancel |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-019 一致：取消状态机、原因与二次确认、列表/详情/我的旅行展示、申请与聊天关闭、统计口径；无信用分、删除、恢复、推送、原因公开、体验/退款 | `proposal.md` §范围；`dov-ac-review.md` DoV-1 |
| Ambiguity | 无未决歧义：D1–D6 已裁决；「其他原因」说明必填 1–100 字；原因仅发布者与 ACCEPTED 可见；我的旅行沿用四组 | `dov-ac-review.md` §规格解释裁决 1–7；REQ-019 §8 |
| Conflict | 无阻塞冲突。新能力不改写 `trip-plans` / `trip-companions` 既有块，规避与三个未归档 change 的四方覆盖；列表口径双权威记为 SUGGESTION | `consistency-lint.md` L-02 |
| Traceability | REQ-019 20 个场景 20/20 有 Delta 落点；#28 in-scope AC 10/10；proposal In scope 10 项均有 Scenario 覆盖 | `dov-ac-review.md` §Requirement mapping / §Proposal → Delta 覆盖 |
| Residual risk | 到期物化未排除取消；原因裁剪边界；原型未先行；契约/迁移号段；信用分 AC 缺口；列表口径双权威 | `dov-ac-review.md` §残余风险；`consistency-lint.md` L-01–L-05 |

## Decision

**Pass**

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | 到期物化与 `selectExpiredIds` 排除 `cancelled_at` 非空行程；补「取消行程越过结束日期后 `completed_at` 仍为空」回归 | AO（Neal） | P3 design / P4 verify |
| C2 | 详情响应的取消原因与说明只在服务端按「发布者或 ACCEPTED」裁剪；摘要不携带原因；补 PENDING / 非参与者断言 | AO（Neal） | P3 design / P4 verify |
| C3 | 原型先行：我的旅行入口、原因选择、取消态样式先改 `docs/prototype/`，再改实现 | AO（Neal） | P3 design / P4 apply |
| C4 | 复核契约 0.13.0 + V19 号段；若被 `add-ai-itinerary` / `add-experience-photos` 占用则顺延，并同步 `OpenApiTest` | AO（Neal） | P3 design |
| C5 | P5 `summary.md` 记录 D1：信用分 / 信用记录 / 免扣分 / 管理员审核另立 story，#28 的 5 条信用 AC 不在本 change | BA / AO | P5 / G3 |
| C6 | 归档前核对「已取消不出现在默认列表」在 `trip-plans` 与 `trip-cancellation` 的措辞一致 | SA | G3 前 |
| C7 | `prototype-ui-alignment` 权威锚点缺失作为既有治理漂移，由 rules-govern 另立变更；不在本 change 修 | Rules-govern | 后续 rules-govern |

## Approvers

| 角色 | 姓名 | 状态 |
|---|---|---|
| IO | WAYNE | 已签（2026-11-17） |
| SA | Jacky | 已签（2026-11-17） |
| 当前开发者 | Neal（VL） | 已确认（2026-11-17） |
| VL | Neal | 不适用（G1 签署矩阵为 IO + SA） |
| SM | Lewis | 不适用（G1 签署矩阵为 IO + SA） |

签署来源：发起人 Neal 2026-11-17 指示「签字然后继续推进」，按名册记录 IO = WAYNE、SA = Jacky 具名批准；本记录不代替后续 G2 / G3 的独立签署。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- C1–C4 落入 P3 / P4；C5 落入 P5；C6 落入 G3；C7 交 rules-govern。
