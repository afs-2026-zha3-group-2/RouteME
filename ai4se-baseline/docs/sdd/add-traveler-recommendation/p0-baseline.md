# P0 基线记录 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`（候选能力 `trip-recommendations` ADDED）｜ **故事：** REQ-024 同行者推荐（迭代 2 / P0 / 5 点）
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-17
- **记录人：** Jay（AO）
- **分支：** `feature/add-traveler-recommendation`（独立 worktree `D:\software\training\TATP\RouteMe\RouteME-traveler`，从 `origin/main@3db5b14` 切出）
- **落点页面：** 行程详情页 / 同行者推荐

## 1. 阶段目标

确认「根据目的地、旅行日期与共同兴趣推荐其他旅行者」这件事在基线上可开工：现有匹配能力的边界、行程与用户数据模型、详情页承载位置、契约与测试链路、前端展示口径都在仓库里可查；把「用户故事有、实现只有行程级匹配」的差距固定成可判定缺口，供 P1 提案使用。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`：`design-system`、`hello-world`、`trip-companions`、`trip-experiences`、`trip-plans`、`user-auth`；`openspec/changes/` 24 个在途 change；`config.yaml`（`schema: spec-driven`） | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-companions/spec.md`「展示可解释的匹配原因」；`trip-plans/spec.md`（详情页展示） | 本 change 以 `trip-companions` 的评分权重为既有口径，新增「按行程推荐其他旅行者」能力 |
| 现有匹配实现 | `controller/MatchController.java`（`GET /api/matches`、`GET /api/matches/{tripId}`）、`service/impl/MatchServiceImpl.java`、`pojo/TripMatch.java`、`response/MatchResponse.java` | **只有行程级匹配**：候选是「行程」，不是「旅行者」；分值与 `reasons[]` 可用，但没有分项得分 |
| 评分规则 | `pojo/TripMatch.of(candidate, reference, interests)`：目的地 50 / 日期相同 30 / 差一天 20 / 共同兴趣每项 10 且 ≤20，上限 100 | 与故事要求的权重一致，**可直接复用为规则基线** |
| 参照物口径 | `MatchServiceImpl`：`reference = tripPlanService.latestOpenByPublisher(userId)`；无参照时用「我的兴趣」 | 与故事要求的「我发布的行程 + 我的兴趣」不同：故事以**当前查看的行程**为参照 |
| 候选来源 | `TripPlanServiceImpl.findOpen(TripQuery)` → `TripPlanMapper.selectOpenList`：`completed_at IS NULL AND cancelled_at IS NULL AND end_date >= today` | 已取消 / 已结束行程天然排除；**未排除本人**，也**未按用户去重** |
| 排序 | `MatchServiceImpl.search`：`score` 倒序，同分按 `createdAt` 倒序 | 故事要求同分优先「旅行日期更接近」；当前不满足 |
| 详情页 | `frontend/src/trips/TripDetailPage.tsx`：`loadMatch` 渲染「为什么推荐给你」的**百分比 + 一句话理由 + 规则提示** | 只解释「这条行程为什么匹配我」，没有「推荐哪些旅行者」 |
| 前端类型 | `frontend/src/types.ts`：`MatchCandidate = { trip, match }`；`Match = { score, percentage, reasons, basis }` | 无 `user`、无 `breakdown`、无 `shared_interests` |
| 地图探索同行者 | `frontend/src/map/travelerMatch.ts`（路线重合度纯函数）＋ `map/amap/mockCompanions.ts`（**硬编码 `overlapPercent: 85 / 70 / 55`**） | 属「地图探索 / 路线重合」另一条展示线；本 change 不改造它，但**新推荐的分数必须全部来自后端** |
| 用户数据 | `pojo/DemoUser.java`：`nickname`、`avatar_url`、`interests`、`bio` 等；`V3` / `V12` / `V13` 种子 | 推荐结果可直接返回用户摘要与共同兴趣 |
| 行程数据 | `pojo/TripPlan.java`：`destinationCode`、`startDate`、`tags`、`publisherId`；`V4` 种子 7 条演示行程 | 打分所需字段齐全，**无需迁移** |
| 契约 | `RouteME/openapi.yaml` **0.18.0**；`/matches`、`/matches/{tripId}` 已声明；`OpenApiTest` 3 处断言 `info.version = 0.18.0` | 新路径需版本顺延 |
| 迁移号段 | `backend/src/main/resources/db/migration/` 最新 `V24__ai_itineraries.sql` | 本 change 无新列，**不占号段** |
| 既有测试 | 后端 `controller/MatchControllerTest`、`pojo/TripMatchTest`；前端 Vitest 纯函数；E2E `e2e/tests/*.spec.ts` | 可沿用 `@SpringBootTest` + `FixedClockTestConfig` 与 `page.route` 拦截范式 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`；本次触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`api-contract`、`web-coding-style`、`web-testing`、`java-testing` | 覆盖分支、提交、工件评审、契约、样式与测试 |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md`、`interfaces/README.md`（已有 `/matches` 两行） | 槽位可写；新接口需同批登记 |
| 协作约定 | `ai4se-baseline/AGENTS.md`（四原则、SDD 工件门禁）、`docs/sdd/README.md`（P0–P5 与阶段提交格式） | 存在；本 change 按用户要求「每阶段一次提交、不提交 P5、不归档」 |
| CI / CD | `.github/workflows/ci.yml`（后端 `./mvnw -B -ntp verify`、前端 `npm run build && npm test`） | 存在；新增测试必须离线可跑 |
| 工具链 | JDK 21；Node ≥ 22；Maven Wrapper；Playwright；`openspec` | 满足 `pom.xml` 与 `frontend/package.json` |
| 原型 | `docs/prototype/ui.js`、`styles.css` | 原型没有「旅行者推荐列表」；按 antd 与既有令牌实现，不引入第二套视觉 |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `cd ai4se-baseline; openspec validate add-traveler-recommendation --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest` | `openapi.yaml` 版本、路径与 schema 断言 |
| 后端 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 规则纯函数、控制器行为、既有回归 |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run build` | `tsc --noEmit` + vite build |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/traveler-recommendation.spec.ts` | `page.route` 注入推荐响应，不依赖后端种子漂移 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色 | 推荐卡片不溢出；空状态与失败态可读 |

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`docs/sdd/`、`AGENTS.md` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 见规则载体行 |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` 均 ready |
| P0-4 | pack 隔离违规 | Skipped | 本 change 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | 沿用 `main` 的 CI/CD 工作流 |

**阶段结论：Pass（required 4/4；P0-4 Skipped 不适用）。**

## 5. 缺口基线（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | **没有旅行者级推荐接口。** `/matches` 的候选单元是「行程」，响应里没有 `user` 字段 | `MatchCandidateResponse(trip, match)`；`MatchResponse(score, percentage, reasons, basis)` | 验收标准「推荐结果至少返回用户、关联行程、总分、原因、共同兴趣」无承接 |
| G-02 | **参照物是「我的最近行程」，不是「当前查看的行程」** | `MatchServiceImpl.search` / `matchFor` 均调用 `latestOpenByPublisher(userId)` | 用户在「广州 11-20」详情页里看到的匹配理由可能来自另一条行程 |
| G-03 | **没有分项得分。** 理由只有自然语言字符串 | `TripMatch.reasons` 是 `List<String>`，如「目的地相同」 | 验收标准「目的地相同 +50 / 日期相同 +30 / 共同兴趣摄影 +10」无法逐项展示 |
| G-04 | **没有按用户去重。** 同一发布者多条符合条件行程会重复出现 | `search()` 直接 `map` 行程，无按 `publisherId` 归并 | 验收标准「同一用户只显示匹配分最高的一条」不满足 |
| G-05 | **同分排序不按日期接近度。** | `thenComparing(createdAt, reverseOrder())` | 验收标准「同分优先旅行日期更接近」不满足 |
| G-06 | **没有排除本人与基础匹配过滤。** | `findOpen` 排除取消 / 结束，但不过滤 `publisherId == 当前用户`，也不过滤 0 分候选 | 会出现「推荐自己」与「0 分虚假推荐」 |
| G-07 | **没有空状态口径。** | 详情页只在 `match !== null` 时渲染匹配块；没有推荐列表，也就没有推荐空状态 | 验收标准「没有匹配结果时显示明确空状态」无承接 |
| G-08 | **前端存在硬编码匹配分数。** | `map/amap/mockCompanions.ts` 的 `overlapPercent: 85 / 70 / 55` | 验收标准「前端不得写死 10、50、80」要求新推荐 UI 全部使用后端分值；地图探索的 Mock 面板需在 spec 明确范围 |
| G-09 | **无回归锚点。** | 无推荐接口、无规则分项测试、无推荐 E2E | 15 条验收标准没有可执行证据 |

## 6. 关键基线事实（供 P1 / P3 决策）

1. **评分权重已经存在且与故事一致。** `TripMatch` 是唯一评分载体，新能力应复用同一组常量与语义，避免出现第二套分值。
2. **候选来源已有「开放行程」过滤。** `selectOpenList` 已排除 `completed_at` / `cancelled_at` 与过期行程，只需追加「排除本人」与「0 分过滤」。
3. **无需数据库迁移。** 目的地、日期、兴趣、发布者都在现有表里。
4. **详情页已有匹配块，但语义不同。** 现有块回答「这条行程为什么匹配我」；新块回答「还可以和谁同行」，两者可共存但不可混用文案。
5. **契约号段：** `openapi.yaml` 当前 0.18.0；本 change 顺延取 **0.19.0**，并同步 `OpenApiTest` 三处版本断言。
6. **前端禁止自算分数。** 只允许格式化后端返回的 `score` / `points` / `reasons`；不得在 TSX 中出现 50 / 30 / 20 / 10 的业务分值常量。
7. **地图探索的 Mock 面板是另一条展示线。** 它展示「路线重合度」而非「同行者推荐」，本 change 不替换其数据源；在 spec 中显式列为 out of scope，避免范围静默扩张。

## 7. 阶段产出

- 本记录：`docs/sdd/add-traveler-recommendation/p0-baseline.md`
- 分支：`feature/add-traveler-recommendation`（worktree `D:\software\training\TATP\RouteMe\RouteME-traveler`）
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-17 |
| SM | Lewis | 准入 P1；迭代 2 排期确认 | 2026-11-17 |
| IO | WAYNE | REQ-024 为需求来源；能力归属待 P1 定稿 | 2026-11-17 |

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：只做「一条推荐接口 + 一套可解释评分规则 + 一个推荐结果视图」，不做机器学习 / LLM 打分、不做预算与路线重合特征、不做邀请流程。
- 明确参照物：以**当前查看的行程**（目的地 + 出发日期）与**当前用户兴趣**为参照，不再使用「我的最近一条行程」。
- 明确候选口径：排除本人、排除已取消 / 已结束行程、排除 0 分候选；同一发布者只保留最高分行程。
- 明确响应结构：用户、关联行程、总分、分项得分、共同兴趣，且分项得分由后端计算。
- 明确前端边界：只展示后端分值，新增空状态与失败重试，且不影响详情页其他信息。