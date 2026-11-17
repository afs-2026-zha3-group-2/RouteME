# 变更提案：add-traveler-recommendation

- **触发：** 发起人 2026-11-17 用户故事「根据目的地、旅行日期和共同兴趣自动计算匹配度并推荐同行者」（优先级 P0 ｜ 迭代 2 ｜ 故事点 5 ｜ 落点：行程详情页 / 同行者推荐）＋ 用户裁决 D1–D7
- **需求条目：** `requirement-workspace/requirements/REQ-024-traveler-recommendation.md`
- **意图捕获：** `requirement-workspace/intents/REQ-024-traveler-recommendation.md`
- **能力：** `trip-recommendations`（ADDED）
- **规模：** M（后端一个只读推荐接口 + 规则排序 + 前端一个推荐区块 + 契约与测试；无迁移）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:java-testing`、`@rule:sdd-artifacts`
- **基线：** `origin/main@3db5b14`（worktree `RouteME-traveler`，分支 `feature/add-traveler-recommendation`）
- **阶段记录：** `docs/sdd/add-traveler-recommendation/p0-baseline.md`

## Why

用户能发布行程、浏览行程、申请同行，但**找不到「还有谁适合一起去」**。

现有匹配能力（`/matches`）回答的是「**这条行程**为什么匹配我」：候选单元是行程、参照物是「我的最近一条行程」、理由只有一句话、没有分项得分、也没有按人去重。用户真正要做的判断是「找谁」，而当前页面只能给出一个百分比。

结果：用户要么逐条点开行程自己比对，要么放弃寻找。推荐能力缺失让「发布行程 → 找到同行者」这条主链路停在第一步。

## What Changes

- **`trip-recommendations`（ADDED，7 Requirement / 16 Scenario）：**
  1. 按行程推荐同行者：以当前行程的目的地与出发日期为参照，以当前用户兴趣为兴趣集合。
  2. 候选筛选：只取开放行程，排除本人、排除参照行程自身、排除 0 分候选。
  3. 可解释评分：目的地 50 / 日期相同 30 / 差一天 20 / 共同兴趣每项 10（合计 ≤20），总分 ≤100，并返回分项得分。
  4. 排序：总分倒序；同分按旅行日期更接近；再按行程 id 保证稳定。
  5. 去重：同一发布者只保留匹配分最高的一条行程。
  6. 响应契约：用户、关联行程、总分、分项、原因、共同兴趣、参照说明。
  7. 详情页推荐视图：加载 / 成功 / 空状态 / 失败重试；切换行程或兴趣变化后重新计算。
- **后端：** 新增 `GET /api/trips/{tripId}/recommendations`（`X-User-Id`），纯规则评分与排序；复用现有开放行程查询与 `DemoUser` 摘要；不改 `/matches` 行为。
- **前端：** 新增 `TravelerRecommendationPanel` + `useRecommendations`；挂到行程详情页；所有分数与文案来自后端，前端只做展示。
- **契约：** `openapi.yaml` 0.18.0 → **0.19.0**，新增 1 条路径与 4 个 schema；`OpenApiTest` 三处版本断言同步。
- **数据：** **无迁移**。

## 问题（现状差距）

1. **没有旅行者级推荐接口。** 候选单元是行程，响应无 `user` 字段（G-01）。
2. **参照物错位。** 用「我的最近一条行程」而不是「当前查看的行程」（G-02）。
3. **没有分项得分。** 理由只有自然语言字符串，无法展示 `+50` / `+30` / `+10`（G-03）。
4. **没有按用户去重。** 同一发布者多条行程会重复出现（G-04）。
5. **同分排序不按日期接近度。** 当前按发布时间（G-05）。
6. **没有排除本人与 0 分候选。** 会出现「推荐自己」与虚假推荐（G-06）。
7. **没有空状态口径。** 详情页没有推荐列表，也就没有空状态（G-07）。
8. **前端存在硬编码分数。** 地图 Mock 面板 `overlapPercent: 85 / 70 / 55`（G-08），新视图必须杜绝。
9. **无回归锚点。** 无推荐接口、规则分项测试与推荐 E2E（G-09）。

## 范围

**In scope**

- 只读推荐接口与响应模型。
- 规则评分、候选筛选、去重、排序、解释文本。
- 详情页推荐区块（四态 + 重试）。
- 契约新增路径与 schema；后端 / 前端 / E2E 测试。
- 知识库接口登记与架构计数更新。

**Out of scope**

- 机器学习 / LLM 打分、推荐理由生成模型。
- 预算、路线重合度、天气偏好、信用分、旅行节奏等新特征（保留扩展结构，不实现）。
- 邀请 / 申请 / 聊天链路改造、通知与推送。
- 地图探索页 Mock 同行者面板的数据源替换。
- 推荐结果落库、缓存、分页、A/B 实验。
- 数据库迁移。

## 关键决策（摘要）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 能力归属 | 新增 `trip-recommendations`（ADDED）；`/matches` 与 `trip-companions` 既有需求保持不变，零回归 |
| D2 | 参照物 | 当前查看行程的 `destination_code` + `start_date` + 当前用户 `interests` |
| D3 | 候选口径 | `findOpen` 开放行程，排除本人、排除参照行程、排除 0 分 |
| D4 | 去重与排序 | 按 `publisherId` 去重保留最高分；总分倒序 → 日期差升序 → 行程 id 升序 |
| D5 | 响应结构 | `reference` + `items[{user, trip, score, breakdown[], reasons[], shared_interests[]}]` |
| D6 | 前端边界 | 只格式化后端返回值；空状态用 `EmptyState`；失败可重试；禁止业务分值常量 |
| D7 | 编号 | REQ-024 / `add-traveler-recommendation` / `trip-recommendations`（ADDED）；契约 0.19.0；无迁移 |

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-recommendations/spec.md` | 归档时新增该能力（7 Requirement / 16 Scenario） |
| `openspec/specs/trip-companions/spec.md` | 不改写；既有匹配需求保持原样 |
| `RouteME/backend/.../controller/RecommendationController.java` | `GET /api/trips/{tripId}/recommendations` |
| `RouteME/backend/.../service/RecommendationService.java`、`impl/RecommendationServiceImpl.java` | 取参照行程、开放候选、规则评分、去重排序、组装用户摘要 |
| `RouteME/backend/.../pojo/TravelerMatch.java`、`TravelerRecommendation.java`、`RecommendationBreakdown.java`、`RecommendationReference.java` | 纯规则与响应模型 |
| `RouteME/backend/.../enums/RecommendationDimensionEnum.java` | `destination` / `date` / `interest` 线值 |
| `RouteME/backend/.../response/RecommendationListResponse.java` 等 | HTTP 响应映射 |
| `RouteME/frontend/src/api.ts`、`types.ts` | `loadTripRecommendations` 与响应类型 |
| `RouteME/frontend/src/trips/recommendation.ts`、`useRecommendations.ts`、`TravelerRecommendationPanel.tsx` | 展示派生、请求防竞态、四态组件 |
| `RouteME/frontend/src/trips/TripDetailPage.tsx` | 挂载推荐区块 |
| `RouteME/frontend/src/styles.css` | 推荐卡片样式 |
| `RouteME/openapi.yaml` | 新路径 + `RecommendationReference` / `RecommendationBreakdown` / `TravelerRecommendation` / `RecommendationList`；版本 0.19.0 |
| 测试 | 后端规则纯函数 + 控制器；前端格式化纯函数；E2E `traveler-recommendation.spec.ts` |

## 需求与证据

- 故事来源：发起人 2026-11-17 用户故事与 16 条验收标准（迭代 2 / P0 / 5 点）。
- 现状证据：P0 §5 的 G-01 ~ G-09。
- 现有规则证据：`pojo/TripMatch.java`（权重与上限）、`TripPlanMapper.xml#openTripFilter`（开放行程过滤）。
- 用户裁决：D1–D7。

## Effort / size

- **相对规模：** M。后端是纯函数 + 一条只读查询，无状态机、无迁移；前端一个区块挂到既有详情页。
- **建议实施顺序：** ① 契约 → ② 规则纯函数 Red → ③ 服务与控制器 → ④ 前端纯函数与组件 → ⑤ 挂载 → ⑥ E2E 与走查。

## Spec ID

`add-traveler-recommendation`，业务增量规格见 `specs/trip-recommendations/spec.md`。

## 残余风险与偏离记录

1. **与 `trip-companions` 的语义重叠。** 既有「展示可解释的匹配原因」仍服务首页 `/matches`；本 change 的推荐块服务详情页「找谁」。两者共享权重但不能共享文案，P3 设计中会明确「两条展示线」。
2. **共同兴趣取行程标签。** 与现有 `TripMatch` 一致（候选行程 `tags` ∩ 我的 `interests`），不读取候选用户资料兴趣。若产品后要改为「用户兴趣 ∩ 用户兴趣」，只需替换兴趣来源，契约形状不变。
3. **地图探索 Mock 面板未改造。** `mockCompanions.ts` 仍有硬编码百分比；它属路线重合展示线，本 change 显式列为 out of scope，避免范围扩张。新推荐视图完全不使用 Mock 数据。
4. **候选规模。** 演示数据量小，当前一次性返回数组不分页；真实规模需要分页或 Top-N，届时在同路径加 `page` / `size` 即可。
5. **无缓存。** 每次进入详情页都重新计算；对演示规模可接受，上量后需缓存或预计算。