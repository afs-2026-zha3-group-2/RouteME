# AC / DoV review — add-experience-like-credit

- **Verdict: Pass**
- **Change:** `add-experience-like-credit`（`trip-experiences` ADDED 2 Requirement / 12 Scenario；`user-credit` ADDED 3 Requirement / 15 Scenario；合计 27）
- **计数更正（2026-11-17，P3 前）：** `user-credit` Delta 实为 15 Scenario（7 + 5 + 3），两 Delta 合计 27；原记 12 / 24 系计数笔误，不改变评审结论。
- **Date:** 2026-11-17 ｜ **Phase:** P2（`/sdd:delta-craft` step=review）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`specs/user-credit/spec.md`](specs/user-credit/spec.md)、`requirement-workspace/requirements/REQ-023-experience-like-credit.md`、`requirement-workspace/intents/REQ-023-experience-like-credit.md`、`requirement-workspace/deep-dive.md`「REQ-023 增补」、`requirement-workspace/impact-brief.md` §22
- **Evidence:** `openspec validate add-experience-like-credit --strict` → valid；Living Spec `openspec/specs/trip-experiences/spec.md`（7 Requirement / 22 Scenario，无点赞需求，本 Delta 只 ADDED）；未归档 `add-credit-account/specs/user-credit/spec.md`（7 Requirement，本 Delta 不重名、不覆盖）

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每个 Requirement 至少一条可测 AC | Pass | 点赞 2 Requirement → 8 + 4 Scenario；结算 3 Requirement → 7 + 5 + 3 Scenario | 27 个场景均可落为 API / 单元 / E2E 断言 |
| AC-2 AC 可观察 | Pass | 场景断言赞数、点赞态、信用分、账本 `applied_delta` / 前后快照、月度累计 | 无「正常工作」类表述 |
| AC-3 负向 / 边界覆盖 | Pass | 自赞 403、未登录 401、体验不存在 404、重复点赞 / 取消幂等、并发点赞、档位锁定、赞数回落、月度截断、总分裁断、月初重置 | 高风险分支均有场景 |
| AC-4 不是伪装的实现细节 | Pass（1 条 P2 注意项） | Delta 出现 `like_count` / `liked_by_me`（契约字段候选）与 `reason_code = EXPERIENCE_LIKE`（业务标识）；无类名 / 表名 / SQL | 字段名与「体验不存在」错误码在 P3 契约定稿；若改名需同步前端 / 测试 / E2E |

**AC 结论：** 4 / 4 Pass。

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致，无静默扩张 | Pass | 提案 What Changes（2 + 3 Requirement）↔ Delta 5 Requirement；Out of scope（明细 / 通知 / 管理端 / 回收 / 结转）未进入 Delta | 双 capability 偏离已在 proposal 评审 F-1 记录，待 G1 SA 裁决，非范围扩张 |
| DoV-2 歧义已列出或解决 | Pass（含注记） | 端点形态、错误码、字段名 → P3 契约定稿；月度并发保障 → P3 设计；多篇体验规则 → 多行数据单测 | issue 的「已 +18，应发 +5，实发 +2」示例与「每档 +1」不自洽；Delta 采用通用截断公式 `min(应发, 月度剩余, 分数余量)`，每档应发恒为 +1 |
| DoV-3 角色关注点已记录 | Pass（含残余） | proposal 评审 F-1（SA）、F-4（SM 排期）；本报告残余风险 | G1 需 IO + SA 具名签署；SA 需裁决双 capability 打包 |
| DoV-4 未声称已做业务实现 | Pass | 本阶段无代码 / 契约 / 迁移 / 原型改动 | — |
| DoV-5 Delta 可追溯到提案 / 已批准需求 | Pass | REQ-023 场景映射：L-1 ~ L-8 → `trip-experiences`「体验点赞与取消点赞」；D-1 / D-2 / E-2 →「体验赞数与点赞态的展示」；T-1 ~ T-6 / E-1 →「体验获赞阶梯加分」；T-7 ~ T-10 →「体验获赞加分的月度上限」；L-8 / D-3 / T-3 边界 →「体验获赞的计分边界」 | 无孤儿 Requirement / Scenario |

**DoV 结论：** 5 / 5 Pass。

## 基线保留

- `trip-experiences`：Living Spec 7 Requirement / 22 Scenario 全部保留（纯 ADDED）；新增 2 Requirement / 12 Scenario。
- `user-credit`：`add-credit-account` 的 7 Requirement 全部保留（纯 ADDED）；新增 3 Requirement / 15 Scenario，无重名。
- 归档顺序：本 change 的 Living 合并必须晚于 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home`（P5 约束）。

## Residual risks / IO-SA concerns

- **SA：** 单 change 跨两个 capability 与 `@rule:sdd-artifacts` 存在偏离，需 G1 明确接受或要求拆分。
- **SA：** 月度上限并发严格性未设计；P3 需给出事务保障并以测试固定「单月实发 ≤ +20」。
- **IO：** issue 标题 P0 与正文 P1 不一致，排期由 SM 确认。
- **IO：** 「信用记录」不做可见面已获用户裁决（D2），G1 需确认这一落点偏离 issue 字面。
- **Dev：** `like_count` / `liked_by_me` 与「体验不存在」错误码在 P3 契约定稿。

## G1 readiness

AC 4/4 + DoV 5/5 → Delta 层面 **G1-ready**；G1 结论与签署由 IO（Wanye）+ SA（Jacky / Karena）具名给出，本报告不代签、不写 Gate 结论。
