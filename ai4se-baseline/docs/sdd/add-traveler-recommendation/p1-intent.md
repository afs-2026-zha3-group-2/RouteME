# P1 意图与提案 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation` ｜ **故事：** REQ-024 同行者推荐（迭代 2 / P0 / 5 点）
- **阶段：** P1（Intent → Proposal）｜ **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **分支：** `feature/add-traveler-recommendation`（worktree `RouteME-traveler`）

## 1. 本阶段目标

把「帮我找同行者」这个模糊诉求收敛成可判定的提案：明确参照物、候选口径、评分规则、去重与排序、响应字段与前端边界，并写清不做什么。

## 2. 产出

| 产出 | 路径 | 结论 |
|---|---|---|
| 意图捕获 | `requirement-workspace/intents/REQ-024-traveler-recommendation.md` | Pass |
| Ready 需求条目 | `requirement-workspace/requirements/REQ-024-traveler-recommendation.md` | 16 场景；blocking OQ 0；DoR BLOCKER 0 |
| 提案 | `openspec/changes/add-traveler-recommendation/proposal.md` | Pass |
| 提案评审 | `docs/reviews/20261117-add-traveler-recommendation-proposal-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION） |
| 编号登记 | `requirement-workspace/registry.md` | REQ-024 |

## 3. 范围结论

**做：** 一条只读推荐接口、一套可解释规则、一个详情页推荐视图、契约 0.19.0、规则 / 接口 / 前端 / E2E 测试。

**不做：** ML / LLM 打分、预算 / 路线重合 / 天气 / 信用等新特征、邀请流程改造、地图 Mock 面板替换、迁移、缓存、分页。

## 4. 关键决策（D1–D7）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 能力归属 | 新增 `trip-recommendations`（ADDED）；`/matches` 零回归 |
| D2 | 参照物 | 当前查看行程的目的地 + 出发日期 + 当前用户兴趣 |
| D3 | 候选口径 | 开放行程、排除本人、排除参照行程、排除 0 分 |
| D4 | 去重与排序 | 同一发布者保留最高分；总分倒序 → 日期差升序 → 行程 id |
| D5 | 响应结构 | `user` + `trip` + `score` + `breakdown[]` + `reasons[]` + `shared_interests[]` |
| D6 | 前端边界 | 只展示后端分值；空状态 + 重试；禁止业务分值常量 |
| D7 | 编号 | REQ-024；契约 0.19.0；无迁移 |

## 5. 评审承接项（带入 P2 / P3）

- F-1：P2 用「推荐项 = 用户 + 其行程」固定语义，P3 明确不复用 `MatchCandidate`。
- F-2：P3 ATDD 明确「纯函数单测 + E2E 四态」，不引入 jsdom / Testing Library。
- F-3：P2 Delta 为「共同兴趣」补可判定场景（候选行程标签 ∩ 当前用户兴趣）。
- F-4：P4 落地前重新 `pull` 并核对契约号段。

## 6. 签署

| 对象 | 签署人 | 时间 |
|---|---|---|
| `proposal.md` | WAYNE（IO） | 2026-11-17 |
| 提案评审报告 | WAYNE（IO）+ Jay（AO） | 2026-11-17 |

**阶段结论：Pass。** 准入 P2：写 Delta Spec、AC/DoV 复核与 G1。