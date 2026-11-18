# All-specs review — refine-publish-route-map

- **Verdict: Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 5）
- **Scope：** `proposal.md`、`specs/trip-plans/spec.md`、`design.md`、`atdd-design.md`、`tasks.md`、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`
- **Timestamp：** 2026-11-18 ｜ **Reviewer：** AI agent（P3 all-specs 复核）
- **Evidence：**
  - `openspec validate refine-publish-route-map --strict` → `Change 'refine-publish-route-map' is valid`
  - `openspec show refine-publish-route-map --json --deltas-only` → `deltaCount: 1` / `MODIFIED`
  - 基线脚本：`delta scenarios 18 / preserved 7/7 / missing []`
  - 交叉核对：提案 D1–D9 ↔ 设计 D1–D11 ↔ 任务 T1–T14 ↔ ATDD #1–#18 ↔ AC-1 ~ AC-10

## 1. 全量一致性结论

提案 → Delta → ATDD → 设计 → 任务五份工件在范围、口径、阈值与失败路径上一致：

- **范围：** 提案 In scope 9 项全部有落点；Out of scope 7 条无对应 Requirement、无对应任务（无坐标入库、无迁移、无详情页重算、无匹配面板、无 AI 页、无探索页缺陷修复、无 `map.spec.ts` 重写）。
- **场景：** Delta 18 = 基线 7 + 新增 11；ATDD 表 18 行无缺号；设计自检表 18 行；基线 7 条中 5 条走 E2E、2 条（人数 / 预算）走既有单测并明确标注「不改代码」。
- **模式：** 提案 D4、Delta 模式段、设计 D2 / D3、任务 T2 / T6 四处一致：发布页 `driving / bicycling / transit`（自驾 / 骑行 / 公共交通），探索页 `walking / driving / bicycling`（步行 / 驾车 / 骑行），`MODE_LABELS` 零改动。
- **规划时机：** 提案 D1「按钮显式触发，首次后自动重算」= Delta「生成旅行路线」段 = 设计 D6 的 hook 行为 1–6 = 任务 T5 = ATDD #8 / #10。
- **降级：** Delta 要求「直线示意 + 示意 / 估算 + 不暴露实现细节」；设计 D6 给出两端注入文案，发布侧忽略 `amapErrorMessage`；任务 T5 / T8 / T12 与 ATDD #12 / #13 对应。
- **提交边界：** 提案 D2 / AC-6 = Delta「只提交地名与出行方式」= 设计 D4 投影 = 任务 T3 / T7 = ATDD #14 的请求体断言。
- **占位名：** 提案 D9 = Delta「坐标占位名不得进入发布」= 设计 D7 双层拦截 = 任务 T1 / T4 / T7 = ATDD #15（单测 + E2E）。
- **导航：** 提案 D7 / AC-7 = 设计 D8 = 任务 T9 / T12；三处都说明「不写 Delta、由 E2E 覆盖」，口径一致。
- **契约 / 迁移：** 五份工件均声明不变（0.22.0 / `V26`），无契约任务、无后端任务。

## 2. Findings

| id | Severity | Location | Issue | Fix |
|---|---|---|---|---|
| AS-1 | SUGGESTION | `proposal.md` §风险与处置「E2E 依赖外网高德」行 ↔ `atdd-design.md` §4 / `tasks.md` T11 | 提案写「用 `page.route` 拦截 `/api/amap/**`」，实际方案是从 `ai-planner.spec.ts` 抽出 `window.AMap` 替身（`addInitScript`），两者都能离线，但文档与实现口径不同 | 以 ATDD 的 `window.AMap` 替身为准（仓库既有范式）；提案已签署不回溯修改，P4 验证报告注明实际方案与理由 |
| AS-2 | SUGGESTION | 提案 AC-7 ↔ 三份 P3 工件 | AC-7（移除导航入口）没有独立 Delta 场景，容易被归档读者当成「漏写」 | 三份工件均已用「removes the map nav entry but keeps deep links working」承接；P5 `summary.md` 归档时引用该用例名，不补写 Delta |
| AS-3 | SUGGESTION | `design.md` D5 ↔ `specs/trip-plans/spec.md` 提交段 | 未定位名称提交时排在已定位点之后，与「按当前顺序」存在字面张力 | 已在设计 DG-1 记录；P4 必须断言公开文案「未定位的地点按名称保留，排在已定位地点之后」，让顺序变化可见 |
| AS-4 | SUGGESTION | `proposal.md` D8 ↔ `tasks.md` T12 | 提案把 `china-map` / `city-map` 描述为「发布页路线段的下线组件」，实际它们来自已下线的目的地地图（发布页现已用 `AreaCascader`），属既有测试债务，与路线段无直接关系 | 保持 T12 的「最小修正 + `map.spec.ts` 不动」；P4 报告说明两者归属，避免把既有债务算作本 change 的回归 |
| AS-5 | SUGGESTION | `tasks.md` T12 / `atdd-design.md` §2 | 新 E2E 与 `trips.spec.ts` 都使用 `data-testid` 和 `.amap-*` 选择器；若两页在同一会话先后渲染，限定容器可避免命中残留节点 | T12 已要求以 `.publish-route-editor` 限定；P4 执行时逐条确认选择器作用域 |

## 3. 工件完备性

| 工件 | 在位 | 评审报告 | 签署 |
|---|---|---|---|
| `proposal.md` | 是 | `20261118-refine-publish-route-map-proposal-review-2.md`（Pass） | WAYNE + Jacky |
| Delta Spec | 是（1 Requirement / 18 Scenario） | `20261118-refine-publish-route-map-spec-review-2.md`（Pass） | WAYNE + Jacky |
| `design.md` | 是（D1–D11） | `20261118-refine-publish-route-map-design-review.md`（Pass） | Jacky + Karena |
| `tasks.md` | 是（T1–T14） | `20261118-refine-publish-route-map-tasks-review.md`（Pass） | Jacky + Karena |
| `atdd-design.md` | 是（18 场景 + Red 顺序 + fixtures） | 本报告一并覆盖 | — |
| `dov-ac-review.md` | 是（AC 4/4 + DoV 5/5） | — | 随 P2 |
| `consistency-lint.md` | 是（Pass） | — | 随 P2 |
| `g1-decision.md` | 是（Pass，无条件） | — | IO WAYNE / SA Karena |

## 4. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 |
|---|---|---|---|---|
| 本报告 | 报告 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话指示「commit and p3」，沿用「全部批准」授权 |
| 本报告 | 报告 2（当前开发者） | Jacky | 2026-11-18 | 同上 |

批准范围：上述工件与本报告。批准不替代 G1（已 Pass）与后续 G2。

## 5. Next

- AS-1 / AS-3 / AS-4 / AS-5 落 P4 验证报告；AS-2 落 P5 `summary.md`。
- 可进入 P4：按 `tasks.md` 的 T1 起执行，先红后绿。