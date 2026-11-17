# P3 设计与可执行任务 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation` ｜ **故事：** REQ-024 同行者推荐
- **阶段：** P3（Spec → Design / ATDD / Tasks）｜ **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）

## 1. 本阶段目标

把 Delta Spec 落到可执行层面：定契约形状、后端类与算法、前端组件与挂载、测试分层与 Red 顺序，并给出逐条任务与验证命令。

## 2. 产出

| 产出 | 路径 | 结论 |
|---|---|---|
| 设计 | `openspec/changes/add-traveler-recommendation/design.md` | D1–D7 落地；契约 0.19.0；无迁移 |
| ATDD | `openspec/changes/add-traveler-recommendation/atdd-design.md` | 19/19 场景分层；U1–U10 / A1–A7 / F1–F4 / E1–E6 |
| 任务 | `openspec/changes/add-traveler-recommendation/tasks.md` | T1–T12 + 对齐自检 19/19 |
| 设计评审 | `docs/reviews/20261117-add-traveler-recommendation-design-review.md` | Pass（0 BLOCKER / 0 WARNING / 3 SUGGESTION） |
| 任务评审 | `docs/reviews/20261117-add-traveler-recommendation-tasks-review.md` | Pass（0 BLOCKER / 0 WARNING / 2 SUGGESTION） |
| 结构校验 | `openspec validate add-traveler-recommendation --strict` | valid |

## 3. 设计要点

| 主题 | 结论 |
|---|---|
| 数据流 | `require(viewer)` → `requireCurrent(trip)` → `findOpen(empty)` → 过滤 → 评分 → 去重排序 → 组装用户 |
| 评分单点 | `TravelerMatch.evaluate`；`reasons` 由 `breakdown` 派生 |
| 分项上限 | 共同兴趣只计前 2 项（合计 20）；`shared_interests` 返回全部交集 |
| 去重 | 同发布者保留 `score` 最大；同分按日期差、行程 id |
| 排序 | `score` 倒序 → 日期差升序 → 行程 id 升序 |
| 前端 | `TravelerRecommendationPanel` 四态；`useRecommendations` 防竞态；无业务分值常量 |
| 挂载 | 详情页既有匹配块之后；已取消行程不挂载 |
| 契约 | `GET /trips/{tripId}/recommendations`；4 schema；0.19.0 |

## 4. 对齐自检

- 19/19 场景有 Design / Tasks / ATDD 落点。
- 无静默扩张：无 ML、无新特征、无迁移、无缓存 / 分页。
- 阈值单点：只有 T2 定义分值。
- 契约先行：T1 在两端实现前。

## 5. 评审承接项

- F-1：`reasons` 由 `breakdown` 派生。
- F-2：U1 / U7 显式断言空分项与求和。
- F-3：不变量用控制器测试断言。
- tasks F-1：按 ATDD Red 顺序逐条执行。
- tasks F-2：A4 在事务内造取消行程数据。

## 6. 签署

| 对象 | 签署人 | 时间 |
|---|---|---|
| `design.md` | Jay（AO）+ Jacky（SA） | 2026-11-17 |
| `tasks.md` | Jay（AO）+ Jacky（SA） | 2026-11-17 |
| 设计 / 任务评审报告 | WAYNE（IO）+ Jay（AO） | 2026-11-17 |

**阶段结论：Pass。** 准入 P4：契约、后端、前端、E2E 与本地验证。