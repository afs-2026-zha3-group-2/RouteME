# 任务 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`（REQ-024）｜ **Owner：** Jay（AO）
- **顺序原则：** 契约先行 → 后端纯函数 Red → 接口 → 前端纯函数 → 组件与挂载 → E2E → 回归。

## 1. 任务清单

| id | 任务 | 落点 | 依赖 | 验收 | 验证 |
|---|---|---|---|---|---|
| T1 | 契约：`openapi.yaml` 0.19.0；新增 `GET /trips/{tripId}/recommendations`、`RecommendationList` / `TravelerRecommendation` / `RecommendationBreakdown` / `RecommendationReference`；`OpenApiTest` 断言版本与必需字段 | contract | — | `OpenApiTest` Red → Green；Redocly 0 error | C1 |
| T2 | 后端纯函数 Red：`TravelerMatch`（50/30/20/兴趣 10、上限 20、0 分无分项、分项求和） | backend | T1 | U1–U7 全绿；先见 Red | C2 |
| T3 | 后端纯函数 Red：`TravelerRecommendationRanker`（0 分过滤、同发布者去重、排序） | backend | T2 | U8–U10 全绿 | C2 |
| T4 | 响应模型：`RecommendationDimensionEnum`、`RecommendationBreakdown`、`RecommendationReference`、`TravelerRecommendation`、4 个 response record | backend | T2 | 编译通过 | C2 |
| T5 | 服务：`RecommendationService` + `RecommendationServiceImpl`（参照、候选、过滤、Ranker、用户摘要） | backend | T3 / T4 | A1–A5 绿 | C2 |
| T6 | 控制器：`RecommendationController`（`X-User-Id`、`tripId`、错误映射） | backend | T5 | A1–A7 绿 | C2 |
| T7 | 前端纯函数 Red：`trips/recommendation.ts`（`formatScore` / `breakdownText` / `referenceText` / `emptyRecommendationText`） | frontend | T1 | F1–F4 全绿；先见 Red | C3 |
| T8 | 前端请求与组件：`types.ts`、`api.loadTripRecommendations`、`useRecommendations`（防竞态 + 重试）、`TravelerRecommendationPanel`（四态 + 探针） | frontend | T7 | 组件可渲染四态 | C3 |
| T9 | 挂载与样式：`TripDetailPage` 推荐区块；`styles.css` 推荐样式 | frontend | T8 | 详情页可见；390px 无溢出 | C3 / C4 |
| T10 | E2E：`e2e/tests/traveler-recommendation.spec.ts`（E1–E6，`page.route` 注入） | e2e | T9 | 6 条全绿 | C4 |
| T11 | 文档收口：`docs/knowledge/interfaces/README.md` 登记接口；`_LOG.md` 追加；架构计数与 `docs/sdd` 索引 | docs | T6 / T9 | 接口表含新行；索引链接可点开 | C5 |
| T12 | 回归与走查：后端全量、前端 build + 单测、E2E 全量、1440 / 768 / 390 × 浅 / 深色 | verify | T10 / T11 | 全绿；截图 6 张 | C6 |

## 2. 验证命令

| 代号 | 命令 | 判据 |
|---|---|---|
| C1 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest`；`npx @redocly/cli lint openapi.yaml` | 测试通过；0 error |
| C2 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 全绿；新增用例数与 ATDD §3 一致 |
| C3 | `cd ai4se-baseline/RouteME/frontend; npm run build; npm test` | 构建通过；单测全绿 |
| C4 | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/traveler-recommendation.spec.ts` | 6/6 |
| C5 | `cd ai4se-baseline; openspec validate add-traveler-recommendation --strict` | valid |
| C6 | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 与基线对比，无新增失败 |

## 3. 对齐自检（Delta → Design → Tasks → ATDD）

| Delta Scenario | Design | Tasks | ATDD |
|---|---|---|---|
| 进入已发布行程详情后自动计算 | §4.4 | T1 / T5 / T6 | A1 / S-1 |
| 没有候选时返回空列表 | §4.5 | T5 / T8 | A2 / E2 |
| 排除本人 | §4.4 | T5 | A3 |
| 排除已取消与已结束行程 | §4.4 | T5 | A4 |
| 排除零分候选 | §4.3 | T3 / T5 | U1 / A2 |
| 目的地相同计 50 分 | §4.2 | T2 | U2 |
| 出发日期相同计 30 分 | §4.2 | T2 | U3 |
| 出发日期相差一天计 20 分 | §4.2 | T2 | U4 |
| 每个共同兴趣计 10 分且合计 ≤20 | §4.2 | T2 | U5 / U6 |
| 多项命中时总分 ≤100 | §4.2 | T2 | U7 |
| 按总分从高到低 | §4.3 | T3 | U8 / A1 |
| 同分时日期更接近者优先 | §4.3 | T3 | U9 / A1 |
| 同一用户多条行程只保留最高分 | §4.3 | T3 / T5 | U10 / A5 |
| 返回用户、行程与总分 | §4.1 / §3.2 | T4 / T6 | A1 |
| 推荐原因写出维度与分值 | §4.2 | T2 / T6 | A1 / E1 |
| 加载中展示加载状态 | §5.3 / §5.4 | T8 | E3 |
| 失败可重试且不影响行程信息 | §5.3 / §5.4 | T8 | E4 |
| 改为展示后端分值 | §5.2 / §5.4 | T7 / T8 | E1 / E5 |
| 切换行程或修改兴趣后重新计算 | §5.3 / §5.5 | T8 / T9 | E6 |

- **无遗漏：** 19/19 场景均有设计、任务与验收落点。
- **无静默扩张：** 任务中没有 ML / LLM 打分、预算 / 路线 / 天气 / 信用特征、邀请流程、Mock 面板替换、迁移、缓存、分页。
- **阈值单点：** 只有 T2 定义分值与上限；T7 / T8 不出现业务分值常量。
- **契约先行：** T1 在两端实现之前完成。

## 4. 风险与回退

| 风险 | 回退 |
|---|---|
| 契约号段被占用 | 顺延次版本号并同步 `OpenApiTest` |
| 种子数据日期漂移 | 控制器测试固定 `FixedClockTestConfig`；E2E 注入响应 |
| 与首页匹配块混淆 | 不同标题 + 独立 `data-testid` |
| E2E 与既有用例争用端口 | 沿用隔离端口与独立 SQLite |

## 5. 执行清单（openspec 任务追踪）

- [ ] **T1 契约：0.19.0 + 推荐路径与 schema**
- [ ] **T2 规则纯函数：`TravelerMatch`**
- [ ] **T3 排序纯函数：`TravelerRecommendationRanker`**
- [ ] **T4 响应模型：枚举 / 分项 / 推荐项 / 参照**
- [ ] **T5 服务：参照、候选、过滤、去重、排序**
- [ ] **T6 控制器：身份与错误映射**
- [ ] **T7 前端纯函数：分数字符串、分项文本、参照文本**
- [ ] **T8 前端请求与组件：`useRecommendations` + `TravelerRecommendationPanel`**
- [ ] **T9 挂载与样式：详情页推荐区块**
- [ ] **T10 E2E：推荐四态与后端分值**
- [ ] **T11 文档：接口表、变更日志、SDD 索引**
- [ ] **T12 回归与走查：后端全量、前端 build + 单测、E2E、三档 × 深浅色**