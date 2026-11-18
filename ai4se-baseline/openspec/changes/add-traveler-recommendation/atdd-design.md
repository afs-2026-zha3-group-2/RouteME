# ATDD 设计 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`
- **输入：** Delta Spec 7 Requirement / 19 Scenario；`design.md`
- **日期：** 2026-11-17 ｜ **设计人：** Jay（AO）

## 1. 分层原则

| 层 | 覆盖对象 | 不覆盖 |
|---|---|---|
| 后端纯函数（JUnit） | 评分、分项、0 分、上限、去重、排序 | HTTP、数据库 |
| 后端接口（`@SpringBootTest`） | 参照、候选过滤、响应结构、401 / 404、空列表 | 前端渲染 |
| 前端纯函数（Vitest） | 分数字符串、分项文本、参照文本 | DOM |
| E2E（Playwright） | 推荐区块四态、重试、分值来自后端、切换行程、窄屏 | 规则细节（已由单测覆盖） |

仓库没有 jsdom / Testing Library，本 change **不引入**；组件状态由 E2E 覆盖。

## 2. Scenario → 验收落点

| # | Scenario | 层级 | 用例 |
|---|---|---|---|
| S-1 | 进入已发布行程详情后自动计算 | API | A1 |
| S-2 | 没有候选时返回空列表 | API + E2E | A2 / E2 |
| S-3 | 排除本人 | API | A3 |
| S-4 | 排除已取消与已结束行程 | API | A4 |
| S-5 | 排除零分候选 | UT + API | U1 / A2 |
| S-6 | 目的地相同计 50 分 | UT | U2 |
| S-7 | 出发日期相同计 30 分 | UT | U3 |
| S-8 | 出发日期相差一天计 20 分 | UT | U4 |
| S-9 | 每个共同兴趣计 10 分且合计 ≤20 | UT | U5 / U6 |
| S-10 | 多项命中时总分 ≤100 | UT | U7 |
| S-11 | 按总分从高到低 | UT + API | U8 / A1 |
| S-12 | 同分时日期更接近者优先 | UT + API | U9 / A1 |
| S-13 | 同一用户多条行程只保留最高分 | UT + API | U10 / A5 |
| S-14 | 返回用户、行程与总分 | API | A1 |
| S-15 | 推荐原因写出维度与分值 | API + E2E | A1 / E1 |
| S-16 | 加载中展示加载状态 | E2E | E3 |
| S-17 | 失败可重试且不影响行程信息 | E2E | E4 |
| S-18 | 改为展示后端分值 | E2E | E1 / E5 |
| S-19 | 切换行程或修改兴趣后重新计算 | E2E | E6 |

**覆盖：19/19。**

## 3. 后端用例

### 3.1 纯函数（`TravelerMatchTest`）

| id | Given | When | Then |
|---|---|---|---|
| U2 | 候选与参照同目的地 | 评分 | breakdown 含 `目的地相同`/50；score 50（无其他命中时） |
| U3 | 同日期、不同目的地 | 评分 | 含 `出发日期相同`/30 |
| U4 | 日期差 1 天 | 评分 | 含 `出发日期相差一天`/20 |
| U5 | 1 个共同兴趣 | 评分 | 含 `共同兴趣摄影`/10 |
| U6 | 3 个共同兴趣 | 评分 | 兴趣分项合计 20（只计 2 项） |
| U7 | 目的地 + 日期 + 兴趣全命中 | 评分 | score 100；sum(points) == score |
| U1 | 无命中 | 评分 | score 0；breakdown 为空 |

### 3.2 排序 / 去重（`TravelerRecommendationRankerTest`）

| id | Given | When | Then |
|---|---|---|---|
| U8 | 分数 50 / 90 / 0 | rank | 返回 90 → 50；0 被丢弃 |
| U9 | 两个 50 分，日期差 2 / 1 | rank | 日期差 1 在前 |
| U10 | 同一发布者 50 / 80 / 60 | rank | 只保留 80 |

### 3.3 接口（`RecommendationControllerTest`，FixedClock 2026-11-16）

| id | 请求 | 期待 |
|---|---|---|
| A1 | `GET /api/trips/4/recommendations`，`X-User-Id: 1` | 200；`reference.trip_id=4`；items 非空；score 降序；`reasons[0]` 形如 `目的地相同 +50`；`sum(points)==score`；user.id 唯一 |
| A2 | `GET /api/trips/{id}/recommendations`，无候选场景 | 200；`items: []`（可通过一个目的地 / 日期 / 兴趣都不重合的行程断言包含过滤后的空集） |
| A3 | 同上 | items 中不包含 `user.id == 1` |
| A4 | 已取消行程（测试内插入） | 不出现在 items |
| A5 | 同一用户两条候选 | 只出现一次且为高分那条 |
| A6 | 缺 `X-User-Id` | 401 `DEMO_USER_REQUIRED` |
| A7 | 未知 `tripId` | 404 `TRIP_NOT_FOUND` |

### 3.4 契约（`OpenApiTest`）

- `info.version == 0.19.0`
- `/trips/{tripId}/recommendations` 存在，200 / 401 / 404 / 500 响应声明
- `RecommendationList` 必填 `reference` / `items`
- `TravelerRecommendation` 必填 `user` / `trip` / `score` / `reasons` / `breakdown` / `shared_interests`
- `RecommendationBreakdown` 必填 `dimension` / `label` / `points`，`dimension` 枚举三值

## 4. 前端用例

### 4.1 纯函数（`recommendation.test.ts`）

| id | 输入 | 期待 |
|---|---|---|
| F1 | `formatScore(90)` | `匹配度 90%` |
| F2 | `breakdownText([{label:'目的地相同',points:50},...])` | `目的地相同 +50 · ...` |
| F3 | `referenceText({destination:'广州',start_date:'2026-11-20',...})` | 含「广州」「2026-11-20」 |
| F4 | `emptyRecommendationText()` | 非空标题与说明 |
| F5 | `reasonSentence(目的地 + 同日 + 摄影)` | `目的地和日期相同，并且都喜欢摄影` |
| F6 | `reasonSentence(无共同兴趣)` | 不含「共同兴趣」/「都喜欢」 |
| F7 | `reasonSentence(日期分项为「旅行日期相差 1 天」)` | 保留该文案 |
| F8 | `recommendationReason(breakdown 缺失、reasons 存在)` | 返回 `reasons` 原文 |
| F9 | `recommendationReason(两者都缺失)` | 空字符串 |

### 4.2 E2E（`e2e/tests/traveler-recommendation.spec.ts`，`page.route` 注入）

| id | 场景 | 断言 |
|---|---|---|
| E1 | 成功列表 | 显示 2 条；第 1 条「匹配度 90%」与原因句；展开分项后含 `目的地相同 +50`、`共同兴趣摄影 +10`；不出现前端自算分数 |
| E2 | 空列表 | 显示 `data-testid="recommendation-empty"`；不显示任何推荐行 |
| E3 | 加载中 | 延迟响应，显示 `data-testid="recommendation-loading"` |
| E4 | 失败 + 重试 | 首次 500，显示错误与重试；点击重试后返回 200 并渲染列表；行程标题仍在 |
| E5 | 后端分值优先 | mock 返回 42 分，页面显示「匹配度 42%」而不是任何常量 |
| E8 | 相差一天 | 原因句含「旅行日期相差 1 天」，无共同兴趣时不出现兴趣原因 |
| E6 | 切换行程 | 进入行程 A 后再进入行程 B，请求次数 +1 且显示 B 的参照 |
| E7 | 390px 窄屏 | 推荐行可见且 `document.scrollWidth - clientWidth <= 1` |

## 5. Red → Green 顺序

1. `TravelerMatchTest`（U1–U7）→ 实现 `TravelerMatch`
2. `TravelerRecommendationRankerTest`（U8–U10）→ 实现 Ranker
3. `OpenApiTest` 新断言（契约先行）→ 更新 `openapi.yaml`
4. `RecommendationControllerTest`（A1–A7）→ 服务 + 控制器
5. `recommendation.test.ts`（F1–F4）→ 纯函数
6. 组件 + 挂载 → E2E（E1–E6）

## 6. Fixtures

- 后端：复用 `V3` / `V4` / `V12` 种子与 `FixedClockTestConfig`（2026-11-16）。
- A4 取消行程：在 `@Transactional` 测试内用 `JdbcTemplate` 插入一条 `cancelled_at` 非空的开放窗口行程，或调用 `TripPlanService.cancel`。
- 前端：E2E 用 `page.route('**/api/trips/*/recommendations', ...)` 注入固定 JSON。

## 7. NFR

不在本次范围：性能、并发、缓存、限流。演示规模下一次性返回可接受。