# P4 实现与本地验证 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation` ｜ **故事：** REQ-024 同行者推荐
- **阶段：** P4（实现 → 本地验证 → G2）｜ **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **环境：** Windows 11 / JDK 21 / Node 22 / 独立 worktree `RouteME-traveler`；E2E 独立后端 8094 + 前端 5180 + 全新 SQLite

## 1. 实现清单

### 1.1 契约

| 文件 | 改动 |
|---|---|
| `RouteME/openapi.yaml` | 0.18.0 → **0.19.0**；新增 `GET /trips/{tripId}/recommendations`；新增 `RecommendationReference` / `RecommendationBreakdown` / `TravelerRecommendation` / `RecommendationList` |
| `OpenApiTest` | 三处版本断言同步；新增 `in_openApiFile_out_travelerRecommendationContractDeclared` |

### 1.2 后端

| 文件 | 作用 |
|---|---|
| `enums/RecommendationDimensionEnum` | `destination` / `date` / `interest` 线值 |
| `pojo/RecommendationBreakdown` | 分项（维度、标签、得分） |
| `pojo/TravelerMatch` | **唯一评分纯函数**；`reasons` 由 `breakdown` 派生 |
| `pojo/TravelerRecommendation` | 用户 + 行程 + 匹配结果 |
| `pojo/TravelerRecommendationRanker` | 0 分过滤、同发布者去重、稳定排序 |
| `pojo/RecommendationReference`、`pojo/RecommendationResult` | 参照说明与结果聚合 |
| `response/RecommendationBreakdownResponse`、`RecommendationReferenceResponse`、`TravelerRecommendationResponse`、`RecommendationListResponse` | HTTP 映射 |
| `service/RecommendationService`、`service/impl/RecommendationServiceImpl` | 取参照、开放候选、过滤、排序、组装用户 |
| `controller/RecommendationController` | `GET /api/trips/{tripId}/recommendations` |

### 1.3 前端

| 文件 | 作用 |
|---|---|
| `types.ts`、`api.ts` | 推荐类型与 `loadTripRecommendations` |
| `trips/recommendation.ts` + `.test.ts` | 只格式化的展示纯函数（无业务分值常量） |
| `trips/useRecommendations.ts` | 请求序号防竞态 + 重试 |
| `trips/TravelerRecommendationPanel.tsx` | 加载 / 成功 / 空状态 / 失败重试；`data-testid` 探针 |
| `trips/TripDetailPage.tsx` | 挂载推荐区块（已取消行程不挂载） |
| `styles.css` | 推荐卡片样式；390px 单列 |

### 1.4 E2E 与文档

- `e2e/tests/traveler-recommendation.spec.ts`（7 条）。
- `docs/knowledge/interfaces/README.md`、`architecture/README.md`、`_LOG.md` 同步。

## 2. 本地验证

| 层 | 命令 | 结果 |
|---|---|---|
| 契约结构 | `openspec validate add-traveler-recommendation --strict` | **valid** |
| 后端新增 | `.\mvnw.cmd -B -o test "-Dtest=TravelerMatchTest,TravelerRecommendationRankerTest,RecommendationControllerTest,OpenApiTest"` | **31 tests, 0 failures** |
| 后端全量 | `.\mvnw.cmd -B -o test` | **484 tests, 0 failures** |
| 前端构建 | `npm run build` | **通过**（仅既有 chunk >500kB 警告） |
| 前端单测 | `npm test` | **48 files / 356 tests passed** |
| E2E | `npx playwright test tests/traveler-recommendation.spec.ts`（`ROUTEME_E2E_BASE_URL=http://localhost:5180`） | **7/7 passed** |
| 契约 lint | `npx @redocly/cli lint openapi.yaml` | 新增 schema **0 error**；仓库既有 admin schema 6 个 `nullable-type-sibling` error / 21 warning（基线债务，未在本次修复） |
| 窄屏 | E2E `390px 窄屏不出现横向溢出` | **通过**（`scrollWidth - clientWidth <= 1`） |

### 2.1 E2E 覆盖

| 用例 | 结果 |
|---|---|
| 展示推荐人、总分与分项明细 | Pass |
| 没有候选时显示明确空状态 | Pass |
| 请求未返回时显示加载状态 | Pass |
| 推荐失败可重试且不影响行程信息 | Pass |
| 分值完全来自后端而不是前端常量 | Pass |
| 切换行程后重新请求推荐 | Pass |
| 390px 窄屏不出现横向溢出 | Pass |

## 3. 与 ATDD 对齐

- 后端：U1–U10（规则与排序）、A1–A7（接口）全部有对应测试；`TravelerMatchTest` 7 条、`RankerTest` 5 条、`RecommendationControllerTest` 6 条。
- 前端：F1–F4（`recommendation.test.ts` 5 条）。
- E2E：E1–E7。
- 覆盖：Delta 19/19 场景均有执行证据。

## 4. 偏差与残余风险

1. **Red 输出未单独留档。** 用例与实现同批落盘后执行到 Green，未保留「先失败」的日志；规则边界已由 U1–U7 显式断言。后续同类 change 应先跑一次失败用例再实现。
2. **全量 E2E 未跑。** 仅执行本 change 的 7 条；仓库其他 E2E 有已知地图 / 种子漂移债务，不在本次范围。
3. **视觉走查为自动化断言。** 已用 390px 宽度做溢出断言；1440 / 768 与深色模式未逐张截图。
4. **契约 lint 基线债务。** 6 个 `nullable-type-sibling` error 位于既有 admin schema，与本 change 无关；修复需另开 change。
5. **G2 签署。** 本地验证 Pass；VL（Neal）签署待补。

## 5. 结论

**P4 本地验证 Pass。** 契约、后端、前端、E2E 全绿；无迁移；`/matches` 与既有详情页匹配块零改动。