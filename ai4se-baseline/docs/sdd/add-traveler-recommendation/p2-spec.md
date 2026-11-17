# P2 增量规格与 G1 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation` ｜ **故事：** REQ-024 同行者推荐
- **阶段：** P2（Proposal → Delta Spec，G1）｜ **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）

## 1. 本阶段目标

把提案收敛成可判定的增量规格：7 条 Requirement / 19 个 Given-When-Then 场景，覆盖参照、候选、评分、分项、排序、去重、响应与前端四态；并完成 AC/DoV 复核与 G1。

## 2. 产出

| 产出 | 路径 | 结论 |
|---|---|---|
| Delta Spec | `openspec/changes/add-traveler-recommendation/specs/trip-recommendations/spec.md` | 7 Requirement / 19 Scenario |
| AC/DoV 复核 | `openspec/changes/add-traveler-recommendation/dov-ac-review.md` | AC 16/16 + DoV 5/5 + 基线保留 4/4 |
| 一致性检查 | `openspec/changes/add-traveler-recommendation/consistency-lint.md` | Pass（0 BLOCKER / 0 WARNING / 2 SUGGESTION） |
| G1 决策 | `openspec/changes/add-traveler-recommendation/g1-decision.md` | **Pass（无条件）** |
| 规格评审 | `docs/reviews/20261117-add-traveler-recommendation-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 2 SUGGESTION） |
| 结构校验 | `openspec validate add-traveler-recommendation --strict` | valid |

## 3. Requirement 一览

| # | Requirement | Scenario 数 |
|---|---|---|
| R1 | 按行程推荐同行者 | 2 |
| R2 | 候选筛选与基础匹配条件 | 3 |
| R3 | 可解释的规则评分与分项得分 | 5 |
| R4 | 推荐排序 | 2 |
| R5 | 同一用户只推荐一条 | 1 |
| R6 | 推荐结果内容 | 2 |
| R7 | 详情页推荐视图 | 4 |
| — | 合计 | **19** |

## 4. 关键口径

| 项 | 结论 |
|---|---|
| 参照行程 | 当前查看行程的 `destination_code` + `start_date` |
| 兴趣集合 | 当前用户 `interests` |
| 候选 | `findOpen` 开放行程，排除本人、排除参照行程、排除 0 分 |
| 评分 | 目的地 50 / 日期相同 30 / 差一天 20 / 兴趣每项 10（≤20）；总分 ≤100 |
| 分项 | `{dimension, label, points}`，求和等于总分 |
| 去重 | 同发布者保留最高分；同分按日期差、行程 id |
| 排序 | 总分倒序 → 日期差升序 → 行程 id 升序 |
| 契约 | 0.19.0；无迁移 |

## 5. 评审承接项

- F-1：P3 ATDD 用 E2E 覆盖四态，纯函数单测只覆盖格式化。
- F-2：P3 设计确定「分项是结构、原因是文本」的单一来源。

## 6. 签署

| 对象 | 签署人 | 时间 |
|---|---|---|
| Delta Spec | WAYNE（IO） | 2026-11-17 |
| 规格评审报告 | WAYNE（IO）+ Jay（AO） | 2026-11-17 |
| G1 | WAYNE（IO）+ Jacky（SA） | 2026-11-17 |

**阶段结论：Pass。** 准入 P3：写 `design.md`、`atdd-design.md`、`tasks.md` 并完成设计与任务评审。