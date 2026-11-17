# 技术设计 — add-credit-recovery

- **Change：** `add-credit-recovery`（REQ-024 / S25 安全学习恢复信用分）
- **输入：** [`specs/user-credit/spec.md`](specs/user-credit/spec.md)（ADDED 7 Requirement / 29 Scenario）、[`atdd-design.md`](atdd-design.md)（A1–A29）、[`proposal.md`](proposal.md)（产品决策 D1–D7）、`g1-decision.md`（**Pass**）
- **日期：** 2026-11-17 ｜ **作者：** Lewis Liu（当前开发者）｜ **第二签署：** Jay（2026-11-17 已签）
- **前置：** G1 **Pass（无条件，2026-11-17，IO=WAYNE / SA=Jacky）**。本设计与 [`tasks.md`](tasks.md) 已于 2026-11-17 通过工件评审（`docs/reviews/20261117-add-credit-recovery-design-review.md` / `-tasks-review.md`，BLOCKER 0）。
- **原型：** [`docs/prototype/credit-learning.html`](../../../docs/prototype/credit-learning.html)（四态可切换，已先行）

> 本文件的 `D1–D14` 是**技术决策**编号，与 `proposal.md` 的产品决策 `D1–D7` 不是同一体系；跨文件引用时写全名（如「proposal D6」）。

## 决策总览

| # | 决策 | 选择 | 放弃的备选与理由 |
|---|---|---|---|
| D1 | 数据模型 | 单表 `credit_learning_session`：一次考试一行，含抽中的题号、作答、得分、判定、学习完成时间、`month_key` | 「会话主表 + 逐题作答明细表」：OQ-5 已裁定只存完成标记与结果，明细表对现有展示面零收益，却要多一张表与一套级联清理 |
| D2 | 列表字段存储 | 题号与作答用 JSON 文本列（复用 `utils/JsonListUtils`） | 逗号拼接自解析、SQLite JSON 扩展：前者无类型校验，后者 H2 无对应函数，破坏「单份 SQL 兼容两库」 |
| D3 | 唯一拦截面 | `CreditGateService.assertCanPublish(userId)`，只在 `TripController.create` 调用 | 放进 `TripPlanServiceImpl.create`：会让「基于旧行程复制」「草稿保存」等非发布路径一起被拦；用 AOP 注解：调用点隐式、难以在 `*ApiTest` 定点断言 |
| D4 | 题库 | `src/main/resources/credit/learning-questions.json`，20 题、四类各 5 题；`LearningQuestionBank` 构造期加载并自校验，加载失败直接启动失败 | 硬编码在 Java：改题要改代码；建题库表：需要管理端才能维护，而管理后台是本 change 的 Non-goal |
| D5 | 抽题 | 四类各抽 1 题（保底覆盖）+ 从剩余 16 题随机补 6 题；`Random` 由构造注入 | 纯随机 10 题：无法保证四类覆盖（R3 硬要求）；`Math.random` 内联：测试无法复算题目集合 |
| D6 | 判分 | 服务端比对题库内 `answerIndex`；请求体只传 `answers: number[]` | 客户端判分上报得分：可伪造；请求体带题号：允许客户端跨会话换题 |
| D7 | 恢复记账 | `CreditService.book(delta = 60 - before, reasonCode = SAFETY_LEARNING_RECOVERY, relatedId = sessionId)` | 固定 `+15`：R4 明确禁止固定加分；直接 `UPDATE` 账户：绕过账本与等式校验 |
| D8 | 并发与月度唯一 | **不用 `SELECT ... FOR UPDATE`**。恢复幂等键 `learning-recovery:<userId>:<monthKey>` 落在既有 `credit_ledger.idempotency_key` 唯一索引上；提交前先用 `CreditService.recorded(key)` 判月度配额 | `SELECT FOR UPDATE` 锁账户行：**SQLite 无该语法**，V20 已定「迁移与 SQL 单份兼容 SQLite/H2」，引入即破坏双库一致；另建计数字段：R5 明确禁止第二份真相 |
| D9 | 自然月窗口 | `CreditMonth.monthKey(Instant)` 纯函数，时区复用 `TripTimeZoneConstant.ZONE`（Asia/Shanghai） | `LocalDate.now()` 隐含系统时区；在 SQL 里做月份换算：两库函数不同 |
| D10 | 契约 | `openapi.yaml` `0.14.0 → 0.19.0`；3 个端点 + 4 个 schema + 6 个错误码 | 复用 `PATCH /api/users/me/credit`：语义是改分，且会与「明细不可见」冲突 |
| D11 | 前端 | 新建 `credit/LearningPage.tsx` + `credit/learningState.ts`（纯函数，可 vitest）+ `api.ts` 三方法 + `route.ts` 补 `creditLearning` | 塞进 `ProfilePage`：一页四态加题库渲染，会把资料页撑成两套关注点 |
| D12 | 入口 | 仅 `TripCreatePage` 的 `submitError === 'CREDIT_SCORE_BELOW_60'` 分支渲染「去安全学习」 | proposal D6 范围内的其余三处（首页提示条、个人主页信用行、侧栏常驻入口）用户已明确不选 |
| D13 | NFR | 不纳入本 change | 沿用 `add-credit-account` 的裁决；P4 只在验证报告记录两条结构事实 |
| D14 | 原因码文案归属 | 后端新增 `enums/CreditReason`（`SAFETY_LEARNING_RECOVERY` → 「安全学习信用恢复」），前端不重复映射 | 前端映射：本 change 不开放明细端点，R4 的「记录文案」无展示面，放在前端会变成无消费者的死代码；复用现有 `credit_level` → 文案的 `creditDisplay.ts`：那是等级不是原因码 |

## 1. 数据库（V25）

```sql
-- 安全学习考试会话（REQ-024 / add-credit-recovery）。
-- 一次考试一行：开始即计次（R5），通过与否都落 submitted。
-- 只存「完成标记 + 抽中题号 + 作答 + 结果」；不建逐题明细表（D1）。
-- 与 V20 同约定：单份 SQL 同时兼容 SQLite（开发/生产）与 H2（测试）。

CREATE TABLE credit_learning_session (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    month_key VARCHAR(7) NOT NULL,          -- 北京时间 YYYY-MM
    status VARCHAR(16) NOT NULL,            -- started | submitted
    question_ids VARCHAR(200) NOT NULL,     -- JSON 数组，10 个题号
    answers VARCHAR(200),                   -- JSON 数组，10 个 0-3；提交后写入
    score INTEGER,                          -- 答对题数 0-10；提交后写入
    passed INTEGER,                         -- 0/1；提交后写入
    started_at VARCHAR(40) NOT NULL,
    learning_completed_at VARCHAR(40),      -- 完成学习的时间戳（OQ-5）
    submitted_at VARCHAR(40),
    CHECK (status IN ('started', 'submitted')),
    CHECK (score IS NULL OR (score >= 0 AND score <= 10)),
    CHECK (passed IS NULL OR passed IN (0, 1)),
    CHECK ((status = 'started' AND answers IS NULL AND score IS NULL AND passed IS NULL)
        OR (status = 'submitted' AND answers IS NOT NULL AND score IS NOT NULL AND passed IS NOT NULL))
);

-- 月度考试次数按 (user_id, month_key) 计数派生（R5：不建计数表）。
CREATE INDEX ix_credit_learning_user_month ON credit_learning_session (user_id, month_key);
```

- **不加 `month_key` 的默认值或生成列**：由服务端按 `CreditMonth` 写入，测试可直接造跨月数据。
- **`app_users` 不变**：本 change 不引入限制列或限制表（R1 + atdd 反向验证）。
- **无需回填**：新表对既有数据零影响，旧库升级只多一张空表。
- **号位**：`0.15.0 + V21` 已被 `add-ai-itinerary`（REQ-017）登记；本 change 取 `0.19.0 + V25`。若 `add-ai-itinerary` 在合并前放弃或改名，P4 前按实际最大号复核一次。

## 2. 后端结构

| 层 | 新增 | 修改 | 职责 |
|---|---|---|---|
| 常量 / 纯函数 | `constant/CreditLearningConstant`、`enums/CreditReason`、`utils/CreditMonth`、`utils/CreditLearningKey` | — | 阈值 60 / 通过线 8 / 题数 10 / 月考试上限 2（**60 只在此定义，`CreditGateServiceImpl` 与 `CreditLearningServiceImpl` 一律引用，不写字面量**）；原因码 → 展示文案；`monthKey(Instant)`；`recoveryKey(userId, monthKey)` |
| 题库 | `credit/LearningQuestion`、`credit/LearningQuestionBank`、`resources/credit/learning-questions.json` | — | 启动期加载 20 题，自校验：题号唯一、四类各 5 题、`answerIndex ∈ [0,3]`、每题 4 个选项 |
| entity / mapper | `entity/CreditLearningSessionEntity`、`mapper/CreditLearningSessionMapper` | — | 会话行（`IdType.INPUT` + `AbstractServiceImpl.nextId`） |
| 异常 | `exception/CreditScoreBelowSixtyException`、`LearningNotEligibleException`、`LearningExamQuotaExceededException`、`LearningRecoveryQuotaExceededException`、`LearningNotCompletedException`、`LearningSessionNotFoundException` | — | 均继承 `BusinessException`，一个类一个稳定码 |
| request / response | `request/LearningSubmissionRequest`、`response/LearningSessionResponse`、`LearningResultResponse`、`LearningAnswerDetailResponse`、`LearningQuestionResponse` | — | 下发题面（不含答案）与判分结果 |
| service | `service/CreditGateService`、`service/CreditLearningService`、`impl/CreditGateServiceImpl`、`impl/CreditLearningServiceImpl` | `service/CreditService` + `impl/CreditServiceImpl`（新增只读 `recorded(String)`）、`service/TripPlanService` 不动 | 拦截面、考试与判分、恢复记账 |
| controller | `controller/CreditLearningController` | `controller/TripController`（`create` 增一行门禁调用） | `POST /api/credit/learning/sessions`、`POST .../{id}/lessons/complete`、`POST .../{id}/submission` |
| 配置 | — | — | 无需新配置项；`Clock` 沿用 `ClockConfig`，测试沿用 `FixedClockTestConfig` |

`CreditLearningServiceImpl` 依赖：`CreditLearningSessionMapper`、`CreditService`、`LearningQuestionBank`、`Clock`、`Random`。**不依赖** `UserCreditAccountMapper`——分数只经 `CreditService` 读写，避免出现第二个写入口。

## 3. 关键流程

### 3.1 开始考试（`POST /api/credit/learning/sessions`）

```
require(userId)                              // 不存在 → USER_NOT_FOUND；未登录 → DEMO_USER_REQUIRED
before = creditService.read(userId).score    // 无账户按 80 建立（R7）
if before >= 60        -> LearningNotEligibleException (409)
monthKey = CreditMonth.monthKey(clock.instant())
if count(userId, monthKey) >= 2 -> LearningExamQuotaExceededException (429)
ids = bank.draw(random)                      // 4 类各 1 + 随机补 6
session = insert(status=started, month_key=monthKey, question_ids=ids, started_at=now)
return { session_id, questions: [{id, category, question, options[4]}], exam_used, exam_limit: 2, month }
```

- 先建会话再返回题目：**开始即计次**（R5），即使客户端立刻关闭也占一次。
- `learning_completed_at` 由 3.2 写入；`started_at` 与它分离，才能判定 A11。

### 3.2 完成学习（`POST /api/credit/learning/sessions/{id}/lessons/complete`）

```
require(userId)
session = requireOwnSession(userId, id)      // 他人/不存在 → LEARNING_SESSION_NOT_FOUND (404)
if session.learning_completed_at == null:
    update learning_completed_at = now       // 幂等：已写则不覆盖
return LearningSession(session)              // 复用同一 schema：learning_completed = true
```

### 3.3 提交作答（`POST /api/credit/learning/sessions/{id}/submission`）

```
require(userId)
session = requireOwnSession(userId, id)
if session.status == 'submitted':  return existingResult(session)   // 幂等，不二次改分（R4）
if session.learning_completed_at == null -> LearningNotCompletedException (409)  // 保留进度
answers = request.answers  // 长度必须 10，每项 0-3，否则 INVALID_INPUT
score  = count(answer[i] == bank.answerOf(questionId[i]))
passed = score >= 8
if !passed:
    update(status=submitted, answers, score, passed=0, submitted_at)   // 不改分、不占恢复次数
    return result(passed=false, recovery_applied=false)
before = creditService.read(userId).score
key = CreditLearningKey.recoveryKey(userId, session.month_key)
if creditService.recorded(key) -> LearningRecoveryQuotaExceededException (409)  // 月度 1 次，先判
if before >= 60 -> LearningNotEligibleException (409)                          // 竞态：已被他处恢复
affected = creditService.book(new CreditBooking(
        userId, "SAFETY_LEARNING_RECOVERY", 60 - before,
        "CREDIT_LEARNING_SESSION", String.valueOf(session.id), key))
update(status=submitted, answers, score, passed=1, submitted_at)       // 与记账同事务
return result(passed=true, recovery_applied=affected.score > before, credit=affected)
```

- **同事务**：`@Transactional` 覆盖「写会话结果 + 调 `book`（账户 + 账本同事务）」；任一步失败整体回滚，不会出现「会话记通过但分未加」。
- **判定顺序（先配额后资格）**：先 `recorded(key)` 再 `before >= 60`。若反过来，A20（造分回 45 后又通过）在分数已被他处改回 60 的并发窗口会错报成 `LEARNING_NOT_ELIGIBLE`，与 R5 要求的「已恢复」原因不符。
- **重复提交**先命中 `status == submitted` 直接返回既有结果，不走记账，故 R4 的「不产生第二条记录」有两条保障（状态短路 + 账本唯一键）。
- `recovery_applied = affected.score > before`：正常路径为 `true`；并发下若另一事务已把分改到 60，`book` 返回 60，此处为 `false`，前端不重复播报恢复动画。
- **未通过也要落 `answers/score`**：A13 与后续展示都依赖已提交状态下的分数，且同一会话不能改成「再答一次」。

### 3.4 发布拦截（`TripController.create`）

```java
DemoUser publisher = demoUserService.require(userId);
creditGateService.assertCanPublish(publisher.id());     // 低于 60 -> CREDIT_SCORE_BELOW_60 (403)
TripPlan saved = tripPlanService.create(request, publisher.id());
```

`assertCanPublish` 只读一次账户（`creditService.read` → 单行主键查询），不写库、不留痕。拦截点在 controller 而非 service，使 `TripPlanService` 的其他入口（取消 / 结束 / 改集合点）不受影响（R1 的 A4）。

### 3.5 并发与月度唯一（D8 的落地）

| 场景 | 机制 |
|---|---|
| 同一会话重复提交 | `status == submitted` 短路（不改分） |
| 两个会话同月并发通过 | 同一 `recoveryKey` → `credit_ledger.idempotency_key` 唯一索引；第二次插入抛 `DuplicateKeyException`，`CreditServiceImpl.book` 既有兜底返回当前分数，不再累加 |
| 月度已恢复后再次通过 | `creditService.recorded(key)` 显式判 → `LEARNING_RECOVERY_QUOTA_EXCEEDED`（409） |
| 跨月 | `month_key` 不同 → 幂等键不同，且会话计数从 0 起 |

`recorded(key)` 是新增的只读方法，签名 `boolean recorded(String idempotencyKey)`，用既有 `ledgerExists` 实现——把幂等判断收在信用模块内，`CreditLearningServiceImpl` 不直接碰 `CreditLedgerMapper`。

### 3.6 错误码 → 状态码

| 错误码 | HTTP | 触发点 | 用户可见文案（前端） |
|---|---|---|---|
| `CREDIT_SCORE_BELOW_60` | 403 | 发布行程 | 「信用分低于 60，暂不能发布行程」+「去安全学习」 |
| `LEARNING_NOT_ELIGIBLE` | 409 | 开始考试 / 提交（已 ≥60） | 「当前信用分无需恢复」 |
| `LEARNING_EXAM_QUOTA_EXCEEDED` | 429 | 开始考试（月第 3 次） | 「本月 2 次考试已用完，请次月再试」 |
| `LEARNING_RECOVERY_QUOTA_EXCEEDED` | 409 | 提交通过但本月已恢复 | 「本月已恢复过 1 次，请次月再试」 |
| `LEARNING_NOT_COMPLETED` | 409 | 提交先于学习完成 | 「请先完成本页学习内容」 |
| `LEARNING_SESSION_NOT_FOUND` | 404 | 会话不存在或非本人 | 「本次考试不存在或已失效，请重新开始」 |

未登录与不存在的用户沿用既有 `DEMO_USER_REQUIRED` / `USER_NOT_FOUND`，不新增码。

## 4. 契约（0.19.0）

```yaml
info: { version: 0.19.0 }

paths:
  /api/credit/learning/sessions:
    post:
      summary: 开始一次安全学习考试（开始即计次）
      parameters: [ X-User-Id ]
      responses:
        '201': { LearningSession }
        '404': { code: USER_NOT_FOUND }
        '409': { code: LEARNING_NOT_ELIGIBLE }
        '429': { code: LEARNING_EXAM_QUOTA_EXCEEDED }
  /api/credit/learning/sessions/{sessionId}/lessons/complete:
    post: { responses: { '200': LearningSession, '404': LEARNING_SESSION_NOT_FOUND } }
  /api/credit/learning/sessions/{sessionId}/submission:
    post:
      requestBody: { answers: [integer] }        # 长度 10，每项 0-3
      responses:
        '200': { LearningResult }
        '400': { code: INVALID_INPUT }
        '404': { code: LEARNING_SESSION_NOT_FOUND }
        # 409 的三种 code 共用同一个 Error，按 §3.6 表分别描述
        '409': { code: LEARNING_NOT_COMPLETED | LEARNING_RECOVERY_QUOTA_EXCEEDED | LEARNING_NOT_ELIGIBLE }

components.schemas:
  LearningQuestion:      # required: [id, category, question, options] —— 无答案类字段
  LearningSession:       # session_id, questions[10], exam_used, exam_limit, month, learning_completed
  LearningResult:        # session_id, passed, score, pass_line, details[10], recovery_applied, credit_score, credit_level
  LearningAnswerDetail:  # question_id, correct(boolean) —— 不含 correct_answer
```

- **`LearningQuestion` 与 `LearningAnswerDetail` 都不含答案**：判分依据只在服务端（R3 的 A10）。`OpenApiTest` 用属性集合精确断言，多一个 `answer` 字段即红。
- **`POST /api/trips` 新增 `403 CREDIT_SCORE_BELOW_60`**：在既有 `post` 的 responses 里补一项，其余错误码不变。
- **错误码 enum** 追加 6 项：`CREDIT_SCORE_BELOW_60`、`LEARNING_NOT_ELIGIBLE`、`LEARNING_EXAM_QUOTA_EXCEEDED`、`LEARNING_RECOVERY_QUOTA_EXCEEDED`、`LEARNING_NOT_COMPLETED`、`LEARNING_SESSION_NOT_FOUND`。
- 路径用复数 `sessions` + 动作子路径 `lessons/complete`：CRUD 无法表达「完成学习」这一状态跃迁（`@rule:architecture` 允许的唯一例外情形）。
- 字段 snake_case；时间 `_at` 为 RFC3339 UTC 字符串；`month` 为北京时间 `YYYY-MM`（与 `month_key` 同源，便于前端展示「本月」）。

## 5. 前端

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/credit/learningState.ts` | 新增 | 纯函数：`nextPhase` / `toViewModel` / `errorMessage(code)`；单测 `learningState.test.ts` |
| `src/credit/LearningPage.tsx` | 新增 | 四态：`intro`（学习要点）/ `quiz`（10 题）/ `result`（通过或未通过）/ `done`（已恢复）；`eligible` 直接渲染「无需恢复」 |
| `src/api.ts` | 修改 | `startLearningSession` / `completeLearningLessons` / `submitLearningAnswers` |
| `src/types.ts` | 修改 | `LearningQuestion` / `LearningSession` / `LearningResult` / `LearningAnswerDetail`；`CreditLevel` 复用 |
| `src/route.ts` | 修改 | `Route` 增 `{ name: 'creditLearning' }`；`parseRoute` 认 `/credit/learning`；`routeToHash` 回 `#/credit/learning` |
| `src/App.tsx` | 修改 | 新增分支渲染 `LearningPage`；未登录沿用既有 GateScene |
| `src/i18n/tripMessages.ts` | 修改 | 拦截提示文案与「去安全学习」按钮（`@rule`：文案集中在 i18n） |
| `src/trips/TripCreatePage.tsx` | 修改 | `submitError === 'CREDIT_SCORE_BELOW_60'` 时渲染专用 `Alert` + 跳转按钮；其他错误保持原样 |
| `src/styles.css` | 修改 | 安全学习页样式，令牌取自 `docs/prototype/styles.css`（`--lagoon` / `--coral` / `--grad-shore` / `--sh-2` / `--r-lg`） |

- **视觉基准**：`docs/prototype/credit-learning.html`。真实页复用同一套令牌与两栏结构（主区状态机 + 侧栏「当前信用 / 恢复规则」），并按用户要求做视觉打磨（进度条、选项选中态、通过/未通过徽标、深色模式）。
- **`learningState.ts` 承担全部判定**：`phase` 由 `session` + `result` 派生，组件不写业务 if——这样 A6 / A24 的界面口径可以在 vitest 里断言，不依赖 E2E。
- **刷新行为**（OQ-5）：会话与学习完成标记在服务端；刷新后 `#/credit/learning` 重新从「开始考试」入口进入时会新建会话（若还有次数）。「刷新不额外扣次数」通过会话内 `learning_completed` 字段与本页的 `sessionStorage` 会话 id 保持：有未提交会话 id 时先「继续本次考试」，不再新建。
- **R6 五展示面口径**：恢复成功后学习页展示「60 / 100 · 信用一般」并给「返回发布」入口；其余四个展示面（弹窗 / 详情发布者行 / 首页行程卡 / 申请处理页）均为路由切换时重新取数，MUST NOT 依赖原地轮询。本 change 不新增全局信用状态，因此「停留同一页不刷新就看到变化」不在范围内（无并发他处恢复入口）。

## 6. 风险与残余

| # | 风险 | 处理 |
|---|---|---|
| R1 | SQLite 写并发是库级锁，`book` 的唯一索引兜底在极端争用下可能抛 `SQLITE_BUSY` | 演示环境单实例；P4 用 A29 在 H2 下验证并发语义，SQLite 侧只在迁移测试断言表结构 |
| R2 | 前端「继续本次考试」依赖 `sessionStorage`，换标签页即丢失 | 丢失后只是重新开始并占一次考试次数；R5 已规定「开始即计次」，不做补偿 |
| R3 | 题库为 20 题固定内容，反复考试可能背题 | 本 change 的 Non-goal（真实题库与 AI 判题为后续迭代）；D4 的 JSON 结构已支持扩题 |
| R4 | `recorded(key)` 与 `book` 之间存在读→写窗口 | 由账本唯一索引兜底；两者组合满足 R7 的「只生效一次、不超过 60」 |
| R5 | 契约 `0.19.0` 依赖 `add-ai-itinerary` 先合入 | 已在 D6/迁移段写明复核点；`OpenApiTest` 会在版本号不符时直接红 |
| R6 | 恢复后五个展示面刷新时机 | `useUserCredits` / 资料页均在路由切换时取数；E2E A24 / A25 覆盖，不新增全局状态 |

## 7. 对齐自检

| 检查项 | 结论 |
|---|---|
| Delta 7 Requirement ↔ design 章节 | Pass：R1→3.4、R2→3.1、R3→3.2/3.3、R4→3.3、R5→3.5、R6→5、R7→3.5/6 |
| 29 Scenario ↔ A1–A29 ↔ tasks 覆盖列 | Pass（见 `tasks.md` 覆盖映射） |
| 决策 ↔ 放弃备选 | Pass：D1–D14 均有一句否决理由 |
| 契约 ↔ 后端落点 | Pass：3 端点 / 4 schema / 6 错误码在 §4 与 §2 一一对应 |
| 迁移 ↔ 双库兼容 | Pass：无 `FOR UPDATE`、无生成列、无 SQL 函数 |
| 原型 ↔ 前端落点 | Pass：`credit-learning.html` 的四态在 §5 逐项对应 |
