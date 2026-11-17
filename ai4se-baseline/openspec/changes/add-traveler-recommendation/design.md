# 设计 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`（`trip-recommendations` ADDED）
- **输入：** `proposal.md`、`specs/trip-recommendations/spec.md`（7 Requirement / 19 Scenario）
- **基线：** `origin/main@3db5b14` ｜ **日期：** 2026-11-17 ｜ **设计人：** Jay（AO）

## 1. 目标与约束

**目标：** 一条只读接口完成「候选筛选 → 规则评分 → 去重 → 排序 → 解释」，前端只渲染后端结果。

**约束：**

- 不改 `/matches` 行为，不改写 `trip-companions` 既有需求。
- 复用 `TripPlanService.findOpen` 的开放行程口径与 `DemoUser` 公开摘要。
- 无数据库迁移。
- 所有分值常量集中在后端一个纯函数。
- 前端禁止出现业务分值常量（50 / 30 / 20 / 10）。

## 2. 总体数据流

```text
GET /api/trips/{tripId}/recommendations (X-User-Id)
  → DemoUserService.require(viewerId)                     // 401 DEMO_USER_REQUIRED
  → TripPlanService.requireCurrent(tripId)                // 404 TRIP_NOT_FOUND
  → TripPlanService.findOpen(TripQuery.empty())           // 未结束 / 未取消 / 未过期
  → 过滤：publisherId != viewerId 且 tripId != reference.id
  → TravelerMatch.evaluate(reference, candidate, viewer.interests)   // 纯规则
  → 过滤 score > 0
  → TravelerRecommendationRanker.rank(...)                // 同发布者去重 + 排序
  → DemoUserService.require(publisherId)                  // 组装用户摘要
  → RecommendationListResponse(reference, items)
```

## 3. 契约（0.19.0）

### 3.1 路径

`GET /trips/{tripId}/recommendations`（operationId `loadTripRecommendations`）

- Header：`X-User-Id`（必填）
- 200：`RecommendationList`
- 401 `DEMO_USER_REQUIRED`；404 `TRIP_NOT_FOUND`；500 `INTERNAL_ERROR`

### 3.2 Schema

```yaml
RecommendationReference:
  required: [trip_id, destination, start_date, interests]
  properties:
    trip_id: int64
    destination: string
    start_date: date
    interests: [string]
RecommendationBreakdown:
  required: [dimension, label, points]
  properties:
    dimension: {enum: [destination, date, interest]}
    label: string          # 目的地相同 / 出发日期相同 / 出发日期相差一天 / 共同兴趣摄影
    points: {integer, 0..50}
TravelerRecommendation:
  required: [user, trip, score, reasons, breakdown, shared_interests]
  properties:
    user: DemoUser
    trip: TripPlan
    score: {integer, 0..100}
    reasons: [string]      # 「目的地相同 +50」
    breakdown: [RecommendationBreakdown]
    shared_interests: [string]
RecommendationList:
  required: [reference, items]
  properties:
    reference: RecommendationReference
    items: [TravelerRecommendation]
```

**契约不变量：** `sum(breakdown[].points) == score`；`items` 按 `score` 倒序；同一 `user.id` 最多出现一次。

## 4. 后端设计

### 4.1 包与类

| 包 | 类 | 职责 |
|---|---|---|
| `controller` | `RecommendationController` | 解析 `X-User-Id` / `tripId`，调用服务，映射响应 |
| `service` | `RecommendationService` | 接口 + Javadoc |
| `service/impl` | `RecommendationServiceImpl` | 取参照、取候选、过滤、排序、组装用户 |
| `pojo` | `TravelerMatch` | **唯一评分函数**：返回 `score`、`breakdown`、`reasons`、`sharedInterests` |
| `pojo` | `TravelerRecommendationRanker` | 纯函数：过滤 0 分、按发布者去重、排序 |
| `pojo` | `TravelerRecommendation` | 推荐项（`DemoUser user`、`TripPlan trip`、`TravelerMatch match`） |
| `pojo` | `RecommendationBreakdown` | 分项（`RecommendationDimensionEnum`、`label`、`points`） |
| `pojo` | `RecommendationReference` | 参照（`tripId`、`destination`、`startDate`、`interests`） |
| `enums` | `RecommendationDimensionEnum` | `DESTINATION("destination")` / `DATE("date")` / `INTEREST("interest")` |
| `response` | `RecommendationListResponse`、`TravelerRecommendationResponse`、`RecommendationBreakdownResponse`、`RecommendationReferenceResponse` | HTTP 映射 |

### 4.2 评分函数（`TravelerMatch.evaluate`）

```text
days = |candidate.startDate - reference.startDate|
if candidate.destinationCode == reference.destinationCode:
    breakdown += (destination, "目的地相同", 50)
if days == 0: breakdown += (date, "出发日期相同", 30)
else if days == 1: breakdown += (date, "出发日期相差一天", 20)
shared = distinct(candidate.tags ∩ viewer.interests)   // 保留 candidate.tags 顺序
counted = shared.take(2)                               // 上限 20 = 2 × 10
for interest in counted:
    breakdown += (interest, "共同兴趣" + interest, 10)
score = sum(points)
reasons = breakdown.map(label + " +" + points)
```

- 单次命中上限 50，总分天然 ≤100；仍保留 `min(score, 100)` 防御。
- 0 分不产出 `breakdown` / `reasons`，由 Ranker 过滤。
- `shared_interests` 返回**全部**交集（前端展示标签）；`breakdown` 只列计入的 ≤2 项，避免「分项之和 ≠ 总分」。

### 4.3 去重与排序（`TravelerRecommendationRanker`）

```text
input: reference, List<(trip, match)>
1. discard match.score == 0
2. discard trip.publisherId == viewerId / trip.id == reference.id   // 服务层已做，Ranker 再防御一次可选
3. group by publisherId；每组保留：
     score 最大 → dateDistance 最小 → trip.id 最小
4. sort: score desc → dateDistance asc → trip.id asc
```

- `dateDistance = |trip.startDate - reference.startDate|`。
- 稳定排序用 `Comparator` 链，不依赖输入顺序。

### 4.4 服务实现要点

- `TripPlanService.requireCurrent(tripId)`：未知行程 404，并把过期行程物化为已完成。
- `TripPlanService.findOpen(TripQuery.empty())`：只取开放行程。
- 参照行程自身即使满足条件也必须排除（`tripId` 相等）。
- 当前用户即使在候选集合中也不得出现（`publisherId` 相等）。
- 候选发布者用户缺失属数据异常，直接抛出（不静默跳过），避免产生无主推荐。

### 4.5 异常与边界

| 情况 | 行为 |
|---|---|
| 缺 `X-User-Id` | 401 `DEMO_USER_REQUIRED`（沿用 `DemoUserService.require`） |
| 未知 `tripId` | 404 `TRIP_NOT_FOUND` |
| 参照行程已取消 | 仍返回 `reference` 与基于其目的地 / 日期的推荐；前端在已取消行程详情不挂载推荐区块 |
| 候选为 0 分 | 不返回 |
| 无候选 | 200 + `items: []` |

## 5. 前端设计

### 5.1 类型与请求

```ts
export type RecommendationDimension = 'destination' | 'date' | 'interest';
export type RecommendationBreakdown = { dimension: RecommendationDimension; label: string; points: number };
export type TravelerRecommendation = {
  user: DemoUser; trip: TripSummary; score: number;
  reasons: string[]; breakdown: RecommendationBreakdown[]; shared_interests: string[];
};
export type RecommendationList = {
  reference: { trip_id: number; destination: string; start_date: string; interests: string[] };
  items: TravelerRecommendation[];
};
```

`loadTripRecommendations(userId, tripId)` → `RecommendationList`。

### 5.2 纯函数（`trips/recommendation.ts`）

| 函数 | 作用 |
|---|---|
| `formatScore(score)` | `"90 分"` |
| `breakdownText(item)` | 把 `breakdown` 拼成 `"目的地相同 +50 · 出发日期相同 +30"`（仅格式化，不改值） |
| `referenceText(reference)` | `"以广州 · 2026-11-20 为参照"` |
| `emptyRecommendationText()` | 空状态标题 / 说明 |

**禁止：** 在该文件或组件中出现 50 / 30 / 20 / 10 的业务分值常量或本地加法。

### 5.3 Hook（`trips/useRecommendations.ts`）

- 状态机：`loading` / `ready` / `failed`。
- 请求序号（`seq`）防竞态：只有最后一次请求可落地。
- `reload()` 供失败重试。
- 依赖：`userId`、`tripId`、`interestsKey = interests.join('|')`。
- 组件卸载后忽略响应。

### 5.4 组件（`trips/TravelerRecommendationPanel.tsx`）

```text
<section className="detail-section">
  <h3>可以找谁同行</h3>
  <p>以《行程标题》的目的地、日期与你的兴趣计算</p>
  loading → <Skeleton active />
  failed  → <Alert type="error" action=重试 />
  empty   → <EmptyState title=... text=... />
  ready   → <ul className="recommendation-list">
             每项：Avatar + 昵称 + 简介
                   行程目的地 · 出发日期
                   score 分 + breakdown 文本
                   共同兴趣 Tag（若存在）
                   链接：查看行程 / 查看资料
           </ul>
</section>
```

- 标题与既有「为什么推荐给你」故意不同：既有块解释「这条行程为什么匹配我」，新块回答「还可以和谁同行」。
- 分数只来自 `item.score` / `item.breakdown[].points`。

### 5.5 挂载

- `TripDetailPage`：在既有 `match` 区块之后、反馈区之前挂载。
- 仅当 `state.status === 'ready'` 且 `trip.status !== 'cancelled'` 时渲染。
- 依赖 `currentUser.interests`：资料兴趣变化后 `interestsKey` 改变，自动重算。

### 5.6 样式

新增 `.recommendation-list`、`.recommendation-row`、`.recommendation-score`、`.recommendation-score-value`、`.recommendation-reasons`、`.recommendation-interest`。沿用 `--card` / `--line` / `--warn` 令牌；390px 单列，不横向溢出。

## 6. 测试策略

| 层 | 覆盖 |
|---|---|
| 后端纯函数 | `TravelerMatchTest`：50 / 30 / 20 / 兴趣 10 / 上限 20 / 0 分无分项 / 分项求等于总分 |
| 后端纯函数 | `TravelerRecommendationRankerTest`：0 分过滤、同发布者去重取最高、同分按日期差、再按 id |
| 后端接口 | `RecommendationControllerTest`（`@SpringBootTest` + `FixedClockTestConfig`）：排序、排除本人、分项格式、空列表、401、404 |
| 契约 | `OpenApiTest` 新增路径与 4 schema、版本 0.19.0 |
| 前端纯函数 | `recommendation.test.ts`：`formatScore` / `breakdownText` / `referenceText` |
| E2E | `traveler-recommendation.spec.ts`：成功列表、空状态、失败重试、分值来自后端、切换行程重算、390px 无横向溢出 |

## 7. 风险与回退

| 风险 | 回退 |
|---|---|
| 契约号段被并行 change 占用 | `pull` 后若 0.19.0 已被占用，则顺延 0.20.0 并同步 `OpenApiTest` 三处 |
| 候选量增大导致响应变慢 | 当前一次性返回；后续加 Top-N / 分页，不改 schema 形状 |
| 与首页匹配文案混淆 | 两个区块标题与说明不同；E2E 用独立选择器 |
| 共享兴趣口径争议 | 已固定为「行程标签 ∩ 我的兴趣」；如需改口径，替换数据来源而非契约 |
| E2E 依赖种子数据漂移 | 用 `page.route` 注入固定响应 |