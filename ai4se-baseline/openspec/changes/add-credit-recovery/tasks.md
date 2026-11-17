# 任务：add-credit-recovery

- **依据：** [`specs/user-credit/spec.md`](specs/user-credit/spec.md)（7 Requirement / 29 Scenario）、[`atdd-design.md`](atdd-design.md)（A1–A29）、[`design.md`](design.md)（D1–D14）
- **Owner：** Lewis Liu（当前开发者）｜ **第二签署：** Jay（design / tasks 共用同一签署位）
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6 → T7；T8 → T9 → T10 → T11；T12 依赖 T7 + T11；T13 最后。
- **契约：** `0.22.0`（`0.15.0` 已被 `add-ai-itinerary` 登记）；3 端点 / 4 schema / 6 错误码；`OpenApiTest` 为门禁。
- **迁移：** `V27__add_credit_learning.sql`（`V21` 已被 `add-ai-itinerary` 登记）。
- **视觉基准：** [`docs/prototype/credit-learning.html`](../../../docs/prototype/credit-learning.html)（四态 + 深色，已先行）。
- **前置：** G1 **Pass（无条件，2026-11-17，IO=WAYNE / SA=Jacky）**，本文件与 `design.md` 已通过工件评审（第二签署 Jay 已签，BLOCKER 0）；P4 已按 T1 起推进。每条任务开工前先写/扩展对应测试类，先红后绿。

## 任务清单

### T1 [contract] 契约 0.22.0

- [x] `openapi.yaml`：`info.version` → `0.22.0`。
- [x] 新增 3 个 path：`POST /api/credit/learning/sessions`、`POST /api/credit/learning/sessions/{sessionId}/lessons/complete`、`POST /api/credit/learning/sessions/{sessionId}/submission`；均带 `X-User-Id` 参数与 `Error` 错误体（仓库错误 schema 实名 `Error`）。
- [x] 新增 schema：`LearningQuestion`（`required: [id, category, question, options]`）、`LearningSession`、`LearningResult`、`LearningAnswerDetail`；**题面与明细均不含答案或判分依据字段**。
- [x] `Error.code` enum 追加 6 项；`POST /api/trips` 的 responses 补 `'403': CREDIT_RESTRICTED`。
- [x] 示例补一组 45 分 → 恢复 60 的会话/结果样例。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=OpenApiTest test`；`cd RouteME; npx --no-install @redocly/cli lint openapi.yaml`
**覆盖：** A10（契约半）、A1 的 403 声明、`@rule:api-contract`
**P4 结果：** `OpenApiTest` 10/10 绿；Redocly `valid` + 19 warnings（17 条基线 + 2 条故意非法的 409 拒绝示例）。

### T2 [backend] 迁移 V27 与迁移测试

- [x] 新增 `V27__add_credit_learning.sql`：`credit_learning_session` + 四条 CHECK（状态枚举、`score` 0–10、`passed` 0/1、状态与字段共变）+ `ix_credit_learning_user_month`。
- [x] 只用 SQLite 与 H2 都支持的语法：不出现 `FOR UPDATE`、生成列、`strftime`、JSON 函数。
- [x] 新增 `CreditLearningMigrationSqliteTest`（先 red）：全新库 V1–V27 建表成功；旧库（V20）升级后新表存在、`user_credit_account` / `credit_ledger` 行数与分数不变；`app_users` 列集合不变、无 `*_restriction*` 表。
- [x] 同一测试内做一次 `status` / `passed` / `score` 的写读往返（证明 INTEGER ↔ Java `Boolean` / `Integer` 在 SQLite 与 H2 两边都正确）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditLearningMigrationSqliteTest test`
**覆盖：** Atdd §2.2 迁移门禁、A18（UT 半）、A27 的无账户路径前提
**P4 结果：** 3/3 绿；`app_users` 实为 17 列（profile 迁移已扩列），断言改为 17 + 包含 `travel_style`。

### T3 [backend] 题库、抽题与纯函数

- [x] 新增 `resources/credit/learning-questions.json`：20 题，四类各 5 题，字段 `id / category / question / options[4] / answerIndex`。
- [x] 新增 `credit/LearningQuestionBank`：构造期加载并自校验（题号唯一、四类各 5、`answerIndex ∈ [0,3]`、选项恰 4 个），校验失败直接启动失败；对外只暴露不含答案的视图。
- [x] 新增 `utils/CreditMonth`（`monthKey(Instant)`，复用 `TripTimeZoneConstant.ZONE`）、`utils/CreditLearningKey`（`recoveryKey(userId, monthKey)`）、`constant/CreditLearningConstant`（60 / 8 / 10 / 2 / 1）。
- [x] 抽题：四类各 1 题 + 剩余随机补 6 题；`Random` 构造注入。
- [x] 新增 `CreditLearningDrawTest`、`CreditMonthTest`（先 red）：固定 seed 复算题目集合；`2026-11-30T23:30Z → 2026-12`、`2026-11-30T16:00Z → 2026-12`、`2026-11-30T15:59Z → 2026-11`。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp "-Dtest=CreditLearningDrawTest,CreditMonthTest" test`（PowerShell 下逗号分隔的 `-Dtest` 必须加引号）
**覆盖：** A9、A23、A29（幂等键半）
**P4 结果：** 5/5 绿；答案字段名按仓库零 Jackson 注解的现状用 camelCase `answerIndex`（仅服务端可见，不下发，故不影响契约）；首版 20 题答案全在 index 1，已重写为 0/1/2/3 分布并由 `CreditLearningDrawTest` 守护。

### T4 [backend] 会话与学习完成

- [x] 新增 `entity/CreditLearningSessionEntity`、`mapper/CreditLearningSessionMapper`、`request/*`、`response/*`、6 个 `BusinessException` 子类（合并后由 6 减为 5：按裁决删除 `CreditScoreBelowSixtyException`，低分拦截改由统一守卫抛 `CreditRestrictedException`）。
- [x] 新增 `service/CreditLearningService` + `impl/CreditLearningServiceImpl`：`start`（读分 → 判资格 → 判月度次数 → 抽题 → 建会话）与 `completeLessons`（幂等写 `learning_completed_at`）。
- [x] 新增 `controller/CreditLearningController`。
- [x] 新增 `CreditLearningApiTest`（先 red）：A5 建立会话返回 10 题、A6 达 60 拒绝、A7 缺 `X-User-Id` 沿用既有码、A8 请求体塞他人 id 不生效、A11 未完成学习提交 409、A27 无账户按 80 建账户并判无资格、A28 不存在用户 404。

**P4 结果：** `CreditLearningApiTest` **12/12 绿**（T4 的 A5–A8 / A11 / A27 / A28 + T5 的 A10 / A12–A14 同类累加）。6 个异常类：`LearningNotEligible` / `LearningExamQuotaExceeded` / `LearningNotCompleted` / `LearningRecoveryQuotaExceeded` / `LearningSessionNotFound`（合并后为 5 个，`CreditScoreBelowSixty` 已删）；会话行只存完成标记 + 抽中题号 + 作答 + 得分（OQ-5，不建逐题明细表），`userId` 一律以 `X-User-Id` 为准，请求体同名字段不生效。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditLearningApiTest test`
**覆盖：** A5、A6、A7、A8、A11、A27、A28

### T5 [backend] 判分与未通过路径

- [x] `submit` 实现判分：请求体长度必须 10、每项 0–3（否则 `INVALID_INPUT`）；每题对错与总分落库。
- [x] 未通过（≤7）：写 `status=submitted` / `answers` / `score` / `passed=0`，不改分、不写账本、不占恢复次数。
- [x] 已提交会话再次提交：直接返回既有结果（不改分、不写第二条账本）。
- [x] 扩展 `CreditLearningApiTest`：A12（8 对通过）、A13（7 对未通过且分不变）、A14（未通过后可建第 2 个会话）、A10（响应 JSON 无答案字段）。

**P4 结果：** A10 / A12 / A13 / A14 均在 `CreditLearningApiTest` 中绿（该类共 12 条）；`score ≥ 8` 为通过线（`CreditLearningConstant` 单点），未通过不改分 / 不写账本 / 不占恢复次数，已提交会话重复提交原样回放既有结果。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditLearningApiTest test`
**覆盖：** A10、A12、A13、A14

### T6 [backend] 恢复记账、月度配额与并发

- [x] `CreditService` 增只读 `boolean recorded(String idempotencyKey)`，`CreditServiceImpl` 复用既有 `ledgerExists`。
- [x] 新增 `enums/CreditReason`（D14）：`SAFETY_LEARNING_RECOVERY` → 「安全学习信用恢复」，供账本与未来明细页共用；本 change 不开放读账本端点。
- [x] 通过路径（同事务）：`recorded(key)` 判月度（命中 → 409） → `before < 60` 校验（不满足 → 409） → `book(delta = 60 - before, SAFETY_LEARNING_RECOVERY, relatedType = CREDIT_LEARNING_SESSION, relatedId = sessionId, key)` → 落会话结果。先配额后资格的顺序由 A20 锁定。
- [x] 新增 `CreditLearningRecoveryApiTest`（A15/A16/A18/A20/A22/A26）、`CreditLearningQuotaApiTest`（A19/A21，固定 `Clock`）、`CreditLearningConcurrencyTest`（A29，H2 双线程）。
- [x] `CreditLearningReasonLabelTest`：reason code → 「安全学习信用恢复」的映射单测（A17；无公开读账本端点）。

**P4 结果：** `CreditLearningRecoveryApiTest` **6/6**、`CreditLearningQuotaApiTest` **3/3**、`CreditLearningConcurrencyTest` **1/1**、`CreditLearningReasonLabelTest` **2/2** 全绿。判定顺序锁定「先配额 `LEARNING_RECOVERY_QUOTA_EXCEEDED`（409）后资格 `LEARNING_NOT_ELIGIBLE`（409）」；恢复记账 `delta = 60 - before` 与 `relatedId = sessionId` 同事务；并发只落 1 条账本（幂等键唯一 + `recorded(key)` 预判，未引入 `SELECT ... FOR UPDATE`）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditLearningRecoveryApiTest,CreditLearningQuotaApiTest,CreditLearningConcurrencyTest,CreditLearningReasonLabelTest test`
**覆盖：** A15、A16、A17、A18、A19、A20、A21、A22、A26、A29

### T7 [backend] 发布拦截（复用统一守卫）

- [x] 不新增门禁实现：发布入口沿用 `add-credit-exit-restriction` 的 `CreditRestrictionGuard.requireNotRestricted(userId)`（已在 `TripPlanServiceImpl.create` 调用），受限时抛 `CreditRestrictedException`（403 `CREDIT_RESTRICTED`）。
- [x] `TripController.create` **不加**门禁调用；合并 main 后按裁决删除自建 `CreditGateService` / `CreditGateServiceImpl` / `CreditScoreBelowSixtyException`。
- [x] 阈值仍单点定义：`CreditLearningConstant.RECOVERY_TARGET_SCORE = 60`，`CreditExitCalculator.RESTRICTION_THRESHOLD` 为守卫侧唯一阈值。
- [x] `CreditPublishGuardApiTest`（先 red）：A1（45 分 403 `CREDIT_RESTRICTED` 且行程数不变）、A2（59 拦 / 60 放行）、A3（恢复后同一请求成功）；合并后删除「其余入口不受影响」用例（统一守卫下已不成立）。

**P4 结果：** 初版 4/4 绿；合并 `origin/main@acf1b1f` 后按裁决改为 3/3（A1–A3），断言码统一为 `CREDIT_RESTRICTED`，与 main 的 `CreditRestrictionApiTest` 同口径。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditPublishGuardApiTest test`
**覆盖：** A1、A2、A3

### T8 [frontend] 路由、类型与 API 客户端

- [x] `types.ts`：`LearningQuestion` / `LearningSession` / `LearningResult` / `LearningAnswerDetail`。
- [x] `api.ts`：`startLearningSession(userId)` / `completeLearningLessons(userId, sessionId)` / `submitLearningAnswers(userId, sessionId, answers)`；错误统一走既有 `ApiError`。
- [x] `route.ts`：`Route` 增 `{ name: 'creditLearning' }`；`parseRoute('#/credit/learning')`、`routeToHash` 双向补全；`route.test.ts` 补 2 条。

**P4 结果：** `route.test.ts` 新增 1 条用例（3 断言：`#/credit/learning` 命中、`#/credit` 与多段路径落 `notFound`）+ round-trip 数组增 `creditLearning` 一项；`route.test.ts` 9/9 绿。

**验证：** `cd RouteME/frontend; npm run typecheck; npm test -- route.test.ts`
**覆盖：** A6 路由可达、`@rule:api-contract`（前端只按契约字段取值）

### T9 [frontend] 页面状态机纯逻辑

- [x] 新增 `src/credit/learningState.ts`：`phase(session, result)`、`toViewModel(session)`、`errorMessage(code)`、`quizProgress(index, total)`。
- [x] 新增 `src/credit/learningState.test.ts`：45 分 → `intro`；≥60 → `eligible`；已恢复 → `done`；未通过 → `result` 且不出现「已恢复」；6 个错误码各有文案。

**P4 结果：** `learningState.ts` 以 `phase({ creditScore, session, result })` 收参（分数与两态一并判定，避免页面各自拼条件）；另补 `answerVerdict` / `isReadyToSubmit` / `unansweredCount` 三个纯函数供页面复用。`learningState.test.ts` **10/10 绿**：五态、`toViewModel`、`quizProgress` 钳制、6 码文案互异 + 未知码回退。

**验证：** `cd RouteME/frontend; npm test -- learningState.test.ts`
**覆盖：** A6（界面口径）、A24 的文案口径、A20/A21 的错误提示分支

### T10 [frontend] 安全学习页与视觉

- [x] 新增 `src/credit/LearningPage.tsx`：四态 `intro / quiz / result / done` + `eligible`；学习要点四类、10 题作答、进度条、结果徽标。
- [x] 「完成学习」先调 `completeLearningLessons` 再允许提交；刷新用 `sessionStorage` 记住未提交的会话 id，先「继续本次考试」。
- [x] `src/styles.css` 增安全学习页样式：令牌取原型（`--lagoon` / `--coral` / `--grad-shore` / `--sh-2` / `--r-lg`），含深色模式与 940px 单栏回退。
- [x] `App.tsx` 增 `creditLearning` 分支渲染；未登录沿用 `GateScene`。

**P4 结果：** `LearningPage.tsx`（579 行）+ `credit/learningPage.css`（680 行，样式独立成文件并由页面 `import`，不改动 6917 行的主样式表）；`start()` 在 `learning_completed === false` 时自动补 `completeLearningLessons` 后才放行答题；草稿键 `routeme.creditLearningDraft`，命中即渲染「已为你恢复题目」。只有 `passed && recovery_applied` 才播报「已恢复」，并发下 `recovery_applied=false` 改播「已达 60 分不再叠加」。验证：`npm run typecheck` 通过、`npm run build` 通过（css 102.41 kB / js 1,314.65 kB）、`npm test` **304/304 绿（39 文件）**。

**验证：** `cd RouteME/frontend; npm run typecheck; npm run build; npm test`
**覆盖：** A5（界面）、A6、A11（未完成学习不可提交的禁用态）、A24

### T11 [frontend] 发布拦截入口

- [x] `TripCreatePage`：读 `useMyCredit().restricted`，受限时渲染 `CreditRestrictedNotice`（`.blocked-notice`）+ 学习入口链接（`.publish-guard-note` / `.publish-guard-entry` → `#/credit/learning`），发布按钮 `disabled`。
- [x] `tripMessages.ts` 增文案（`creditRestrictedAction` 复用 main；`publishGuardAction` / `publishGuardRemaining` 为本 change）。
- [x] 原 `trips/publishGuard.ts` 与 `publishGuard.test.ts` 在合并后删除（不再按错误码分流）。

**P4 结果：** 初版为「错误码分流 + 专用 Alert」；合并 `origin/main@acf1b1f` 后改为复用 main 的 `CreditRestrictedNotice` 与 `CreditContext`，样式只留 `.publish-guard-note` / `.publish-guard-entry` 两块。全量 `npm test` 在合并后重跑（见 §8）。

**验证：** `cd RouteME/frontend; npm test`
**覆盖：** A1（前端入口）、proposal D6

### T12 [e2e] 端到端回归

- [x] 新增 `e2e/tests/credit-learning.spec.ts`：45 分账号发布被拦 → 进入 `#/credit/learning` → 完成学习 → 10 题（固定 8 对）→ 通过 → 回发布页成功 → 个人主页「60 / 100 · 信用一般」。
- [x] 同文件第二例：62 分账号深链 → 「当前无需恢复」，无「开始答题」按钮。
- [x] 断言首页 / 聊天页 / 我的旅行**无**学习入口（proposal D6 反向验证：入口只在发布页）。

**P4 结果：** `credit-learning.spec.ts` **3/3 绿**（隔离环境：全新 SQLite + 后端 8081 + 前端 5174）。造分按 atdd §4：注册后直接改 `user_credit_account.score` 并补一条 `SYSTEM_ADJUST` 账本行维持等式；答案只在服务端，E2E 按题面回查 `backend/src/main/resources/credit/learning-questions.json` 的 `answerIndex`，**前 8 题答对 / 后 2 题故错**锁 A12 边界。用例 1 覆盖 A1（`.publish-guard` 提示 + 「去安全学习」）→ A5/A6 排除 → 8 对通过 → `cl-done` 展示「变更前 45 · +15 · 变更后 60」→ 同页再发布 201 → A24 个人主页「60 / 100 · 信用一般」→ A25 首页卡片同口径；用例 2 覆盖 62 分 `eligible` 且无「开始答题」；用例 3 覆盖 D6 反向（首页 / 我的旅行 / 聊天无横幅、无学习入口）。附带：`support.ts` 新增共用 `pickDestination` / `pickPlace`（后者改为等候选出现再点中，避开搜索防抖），并补 `@types/node` 仅用于 E2E 的 Node 内建模块类型。

**验证：** `cd RouteME/e2e; npx playwright test tests/credit-learning.spec.ts`
**覆盖：** A1、A6、A24、A25、Atdd §5 反向验证

### T13 [docs] 登记回填

- [x] `requirement-workspace/registry.md`：REQ-026 行状态 → `p4-pass`，notes 补 P4 段（T1–T13 结论 + 门禁数字 + `p4-apply.md`）。
- [x] `requirement-workspace/stories.md`：REQ-026 段 Status → `P4 Pass（2026-11-17）`，Notes 追加「P4 产出」条（T1–T13 关键结论与测试数字）。
- [x] `requirement-workspace/handoff.md`：REQ-026 的 P1/P2/P3 状态 bullet 追加 P4 段与带入 local-verify / G2 的 6 条跟踪项。
- [x] `docs/sdd/add-credit-recovery/p4-apply.md`：阶段记录（产出表 / 本阶段裁决 P4-D1..D6 / 校验 / 待签 / 跟踪项 / 提交记录）。

**P4 结果：** `registry.md` REQ-026 → `p4-pass`（notes 追加 P4 段：契约 `0.22.0` / `V27` / 题库与判分 / 会话记账配额 / 发布拦截 / 前端五态与拦截入口 / E2E 3/3 + 门禁数字 + 待 local-verify 与 G2）；`stories.md` S27 Status → `P4 Pass（2026-11-17）` 并在 Notes 追加「P4 产出」条（含测试数字）；`handoff.md` 新增「P4 状态（REQ-026）」bullet（含带入 local-verify / G2 的 6 条跟踪项）；阶段记录 `docs/sdd/add-credit-recovery/p4-apply.md`（7 节：产出 / 裁决 P4-D1..D6 / 校验 / 待签 VL 与 IO+SA G2 / 跟踪项 / 未提交记录）。本阶段**未代签**任何评审位。

**验证：** `cd ai4se-baseline; npx --no-install openspec validate add-credit-recovery --strict`
**覆盖：** `@rule:documentation`

## 覆盖映射（A1–A29）

| A | 任务 | A | 任务 | A | 任务 |
|---|---|---|---|---|---|
| A1 | T1 / T7 / T11 / T12 | A11 | T4 | A21 | T6 |
| A2 | T7 | A12 | T5 | A22 | T6 |
| A3 | T7 | A13 | T5 | A23 | T3 |
| A4 | T7 | A14 | T5 | A24 | T9 / T10 / T12 |
| A5 | T4 / T10 | A15 | T6 | A25 | T12 |
| A6 | T4 / T8 / T9 / T10 / T12 | A16 | T6 | A26 | T6 |
| A7 | T4 | A17 | T6 | A27 | T2 / T4 |
| A8 | T4 | A18 | T2 / T5 / T6 | A28 | T4 |
| A9 | T3 | A19 | T6 | A29 | T3 / T6 |
| A10 | T1 / T5 | A20 | T6 / T9 | — | — |

## 对齐自检

| 检查项 | 结论 |
|---|---|
| 契约任务在最前 | Pass：T1 先于全部 backend / frontend 任务 |
| 一条任务一层 | Pass：T1 contract / T2–T7 backend / T8–T11 frontend / T12 e2e / T13 docs |
| 每条有验证命令 | Pass：13/13 |
| 29 Scenario 全覆盖 | Pass：覆盖映射 29/29，无孤儿任务 |
| 设计决策全覆盖 | Pass：D1–D14 均有落点（D14 → T6 `CreditReason`） |
| 迁移与契约号排他 | Pass：`0.22.0 + V27`，与 `add-ai-itinerary`（`0.15.0 + V21`）不冲突 |
| G1 前置 | Pass：T1 提交前必须取得具名签署 |

## 合并与号位重排（2026-11-17）

| 项 | 结论 |
|---|---|
| 合并方向 | 用户裁决：`feature/add-credit-recovery` 直接合入 `main`（未开 PR） |
| 基线偏差 | 合并开始时本地 `main` 落后 `origin/main` 9 个提交（含 `add-experience-like-credit`） |
| 号位（三次顺延后最终） | REQ-026 / S27 / 契约 0.22.0 / `V27__add_credit_learning.sql` |
| 门禁（最终复跑） | 后端 `verify` 576/576；前端 417（54 文件）+ `typecheck` + `build`；openspec valid；Redocly 0 error / 25 warning；删库后 Flyway V1–V27 重放；本 change E2E 3/3 + 信用域与受影响回归 34/34（合计 37/37、8 份 spec） |
| 未签 | G2（VL）、E3；记录见 `docs/sdd/add-credit-recovery/p4-apply.md` §8 |
