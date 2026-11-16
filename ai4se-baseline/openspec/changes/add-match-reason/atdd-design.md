# ATDD design — add-match-reason

- **Change：** `add-match-reason`（`trip-companions` MODIFIED，S07）
- **Inputs：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（9 场景）、[`design.md`](design.md)、[`tasks.md`](tasks.md)

## 1. 分层策略

| 层 | 职责 | 本 change 的落点 |
|---|---|---|
| 契约 | 分值字段形状 | `openapi.yaml` `Match` / `MatchCandidate`（核对，无改动）+ `OpenApiTest` |
| 领域（纯计算） | 权重、上限、降级文案 | `routeme.pojo.TripMatch` + `TripMatchTest` |
| 接口 | 列表与单条的返回、参照物 | `MatchControllerTest` |
| 前端 | 卡片与详情的原因展示 | `TripCard`（新增文字标签）、`TripDetailPage`（既有面板） |
| 端到端 | 双展示、排序、跨身份差异 | `e2e/tests/companions.spec.ts` |

规则：打分是一个纯函数，全部权重分支在领域层断言；端到端只验证「用户看得到什么」与排序结果。

## 2. 场景 → 测试映射

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 1 | 展示匹配理由与百分比 | 端到端 | `companions.spec.ts › shows match reasons and keeps match as the default sort`（`.match-score` = `匹配度 N%`，`.match-reason-label` = `匹配理由`，`.match-reason` 非空） |
| 2 | 目的地相同计 50 分 | 领域 | `TripMatchTest#in_filterDestination_out_overridesReference` |
| 3 | 出发日期相同 30 / 相差一天 20 | 领域 | `TripMatchTest#in_sameDateOnly_out_thirtyPoints`、`#in_oneDayApart_out_twentyPoints` |
| 4 | 共同兴趣每项 10 且合计 ≤ 20 | 领域 | `TripMatchTest#in_singleSharedInterest_out_tenPoints`、`#in_threeSharedInterests_out_cappedAtTwenty` |
| 5 | 多项命中总分 ≤ 100 | 领域 | `TripMatchTest#in_sameDestinationAndDateWithSharedInterests_out_cappedAt100` |
| 6 | 没有可参照的已发布行程 | 领域 + 接口 | `TripMatchTest#in_noOverlap_out_fallbackReasonAndInterestBasis`；`MatchControllerTest` 断言 `basis` |
| 7 | 没有任何重合时给出提示 | 领域 | 同上（`暂无重合，可作为新方向的灵感`） |
| 8 | 详情页与列表页都展示匹配原因 | 端到端 | 同一用例点击首卡，断言 `.match-reason-list li` 与 `.detail-meta` |
| 9 | 默认按匹配度排序 | 端到端 + 前端纯函数 | 同一用例读取 `.match-percentage` 序列断言非递增；`tripFilters.emptyFilterState.sort === 'match'` |

## 3. UI 设计约束

- 环形进度条只作装饰（`aria-hidden`），数字必须作为**文字**出现在「匹配度 N%」里，避免读屏与视觉都只能看到裸数字。
- 原因文本前缀「匹配理由」，去掉百分比后语义仍完整。
- 数字节点加 `.match-percentage`，供排序断言使用，同时不改变用户可见语义。

## 4. Red → Green 计划

| 步骤 | 预期观察 |
|---|---|
| Red | `npx playwright test tests/companions.spec.ts -g "shows match reasons"` → 卡片内找不到 `匹配度 N%`（8.5s 失败） |
| Green | 卡片改为「匹配度 N%」+「匹配理由 …」，环形图去数字 |
| 回归 | 后端 `clean test`、前端 `npm test` / `npm run build`、匹配 e2e |

## 5. 覆盖缺口说明

- 未新增视觉快照；颜色与间距属 `design-system` 的既有要求。
- 未覆盖「参照物多值」策略，属后续优化（已记为残余风险）。