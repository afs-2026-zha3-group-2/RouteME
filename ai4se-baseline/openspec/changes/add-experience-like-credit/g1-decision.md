# G1 decision — add-experience-like-credit

- **Gate:** G1（Align）
- **Change:** `add-experience-like-credit`（`trip-experiences` ADDED + `user-credit` ADDED，REQ-023 / issue #30）
- **Timestamp:** 2026-11-17T15:25+0800
- **Recorded by:** Qoder（AI agent）；G1 结论与签署由发起人 2026-11-17 具名确认（IO=Wanye / SA=Jacky），模型不代替人工批准
- **计数更正（2026-11-17，P3 前）：** `user-credit` Delta 实为 15 Scenario（7 + 5 + 3），合计 27；原记 12 / 24 系计数笔误，不影响 G1 结论与签署

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、D1–D10、残余风险齐全；能力 `trip-experiences` + `user-credit` 均 ADDED |
| Delta Spec — `trip-experiences` | [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | ADDED 2 Requirement / 12 Scenario；基线 7 Requirement / 22 Scenario 未改写 |
| Delta Spec — `user-credit` | [`specs/user-credit/spec.md`](specs/user-credit/spec.md) | ADDED 3 Requirement / 15 Scenario；与 `add-credit-account` 7 Requirement 不重名 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；基线保留与残余风险已列 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 5 / N/A 7 |
| P1 quality report | `docs/ai4se-plugins/20261117-151032-quality-checklist-report.md` | P1 Overall Pass（P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped） |
| P2 quality report | `docs/ai4se-plugins/20261117-151904-quality-checklist-report.md` | P2 Overall Pass（P2-1 / P2-2 / P2-4 Pass；P2-3 按 G1 未主张 Skipped） |
| Proposal review | `docs/reviews/20261117-add-experience-like-credit-proposal-review.md` | Partial（0 BLOCKER / 1 WARNING 双 capability 偏离 / 4 SUGGESTION），WAYNE + Lewis Liu 签 |
| Spec review | `docs/reviews/20261117-add-experience-like-credit-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION），WAYNE + Lewis Liu 签 |
| Requirements | `requirement-workspace/requirements/REQ-023-experience-like-credit.md` | 24 场景；blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-023-experience-like-credit.md` | Discovery Decision `Go`；D1–D4 |
| Impact brief | `requirement-workspace/impact-brief.md` §22 | as-is 盘点、delta、blast radius、风险与拆分边界 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-023 增补」 | ①–④ 四表；A0 ⑨–⑫ 通过 |
| Issue | GitHub #30「[P0] 旅行体验获赞增加信用分」 | 用户故事、档位表、执行规则、月度上限、场景与垂直切片口径 |
| Implementation evidence | `CreditService` / `CreditServiceImpl`（记账无调用方）；`ExperienceResponse`（无赞数字段）；`ExperienceController`（无点赞端点）；`V8__create_trip_experiences.sql`（每作者每行程唯一）；`openapi.yaml` 0.14.0（`Error.code` 闭集）；`db/migration` V20 | 现状差距逐项核对 |
| Prototype evidence | `docs/prototype/ui.js` `expCard()` 与详情 `.exp-item`；`styles.css` 令牌 | 无点赞交互，需原型先行 |
| User decisions | 2026-11-17 D1–D4 | 点赞全链路；不做信用明细可见面；月度 Asia/Shanghai；月度按实发消耗 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-023 一致：体验点赞 / 取消点赞、赞数与点赞态展示、获赞阶梯加分、月度上限、计分边界；不做信用明细、通知、管理端、回收、结转 | `proposal.md` 范围；`dov-ac-review.md` DoV-1 |
| Ambiguity | 无未决阻塞歧义：端点形态 / 错误码 / 字段名属 P3 契约定稿；月度截断按通用公式（每次跨档应发恒为 +1）；多篇体验规则以多行数据单测覆盖 | `dov-ac-review.md` DoV-2；`consistency-lint.md` L-03 / L-04 |
| Conflict | 单 change 跨 `trip-experiences` / `user-credit` 与 `@rule:sdd-artifacts` one-capability 习惯存在偏离；**SA 在 G1 明确接受该打包**（理由：点赞与结算拆开后无法独立验收 issue 场景，且仓库有 `refine-inspiration-home` / `add-trip-completion` 先例） | `docs/reviews/20261117-add-experience-like-credit-proposal-review.md` F-1；本记录 Decision |
| Traceability | REQ-023 24 个 Ready 场景均有 Delta 落点（两个 Delta 共 27 Scenario）；proposal In scope 5 项均有 Requirement 覆盖 | `dov-ac-review.md` DoV-5 |
| Residual risk | 归档顺序、契约 / 迁移号、月度并发严格性、多篇体验不可 E2E、原型先行、E2E 选择器漂移 | `dov-ac-review.md` 残余风险；`consistency-lint.md` 残余风险 |

## Decision

**Pass**

SA 同时确认：**接受本 change 跨 `trip-experiences` + `user-credit` 两个 capability 的单 change 打包**，不要求拆分为两个 change。

## Conditions + owners

无（Decision = Pass）。

## 后续跟踪（非 G1 条件，不影响本结论）

| # | 事项 | Owner | 处理时机 |
|---|---|---|---|
| T1 | 契约定稿：`like_count` / `liked_by_me` 字段名、点赞 / 取消端点形态、「体验不存在」错误码 | Dev | P3 design |
| T2 | 月度上限并发严格性（单月实发 ≤ +20）的设计与测试 | Dev | P3 design / P4 verify |
| T3 | 契约次版本与迁移号排他确认（当前 0.14.0 / V20；`add-ai-itinerary` 声明 0.15.0 + V21） | Dev | P3 design |
| T4 | 原型先行：体验卡与详情体验区的点赞按钮 / 赞数 / 两态样式先改 `docs/prototype` | Dev | P3 / P4 |
| T5 | 归档顺序：本 change 排在 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home` 之后 | SA / BA | P5 / G3 前 |
| T6 | issue 优先级 P0（标题）/ P1（正文）由 SM 排期确认 | SM | 排期 |
| T7 | `prototype-ui-alignment` 权威锚点缺失属既有治理漂移，由 rules-govern 另立变更 | Rules-govern | 后续 |

## Approvers

| 角色 | 姓名 | 状态 |
|---|---|---|
| IO | Wanye | 已签（2026-11-17，发起人当次会话确认） |
| SA | Jacky | 已签（2026-11-17，发起人当次会话确认；含双 capability 打包接受） |
| 当前开发者 | Lewis Liu | 已确认（2026-11-17） |
| VL / SM | — | 不适用（G1 签署矩阵为 IO + SA） |

签署来源：发起人 2026-11-17 当次会话选择「G1 Pass，SA = Jacky」。本记录不代替后续 G2 / G3 的独立签署。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- T1–T4 落入 P3 / P4；T5 落入 P5 / G3；T6 交 SM；T7 交 rules-govern。
