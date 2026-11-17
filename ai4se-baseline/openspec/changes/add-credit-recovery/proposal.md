# 变更提案：add-credit-recovery

- **需求来源：** GitHub Issue [#32](https://github.com/afs-2026-zha3-group-2/RouteME/issues/32)「[P0] 安全学习恢复信用分」（Story 6 / 信用系统迭代 3 / 5 点 / 落点 安全学习页）｜ **需求条目：** `requirement-workspace/requirements/REQ-023-credit-recovery.md`（27 条验收场景）
- **能力：** `user-credit`（ADDED Requirements：追加 7 个 Requirement / 29 Scenario）；既有 Requirement 由未归档 change `add-credit-account` 提供，本变更 MUST 晚于其归档
- **规模：** M（1 个新页面 + 1 组学习会话端点 + 1 条恢复记账 + 月度配额判定 + 1 次迁移 + 契约升版）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:prototype-ui-alignment`
- **本回合状态：** P1 提案定稿（D1–D7）；P2 Delta Spec 通过 `openspec validate --strict`（7 Requirement / 29 Scenario）；P3 已完成原型截点、ATDD 设计（A1–A29）、技术设计（D1–D14 技术决策）与任务清单（T1–T13），契约 / 迁移排他为 `0.18.0 + V24`；未改业务代码、未提交。

## 问题

信用账户、五档等级与记账服务已在 `origin/main` 落地（`V20__add_credit_account.sql`、`CreditService.book`、`GET /users/credits`、前端 `creditDisplay.ts`），但整条链路只走到「看得见分数」：分数一旦掉到 60 以下，用户没有任何自救手段。

- **限制端不存在。** 故事里「因信用分低于 60 被限制」的原因是 `CREDIT_SCORE_BELOW_60`，但全仓（backend / frontend / openapi）grep 该码值只命中文档，没有限制表、没有拦截点、也没有 `app_users` 上的封禁列；`add-credit-account` 把「自动封禁（< 60）」显式列为 out of scope。
- **恢复端为空。** 没有学习会话、没有题库、没有恢复记账，`credit_ledger` 里也不存在 `SAFETY_LEARNING_RECOVERY` 这类 reason code。
- **前置事件未落地。** 能造成扣分的故事 #29（举报扣分）/ #30（获赞加分）/ #31（退出扣分）仍为 open，`openspec/changes/` 下无对应变更包；也就是说当前没有任何生产路径会把用户送到 60 以下。

本变更只做这条链的**恢复段垂直切片**：受限用户 → 完成安全学习 → 答题通过 → 信用分恢复至 60 → 低分限制解除。限制的产生（扣分事件、自动封禁）与人工封禁仍不在本变更。

## 范围

**In scope**

- **学习会话** `user-credit`：开始学习（按四领域取预置 Mock 题目集）、学习内容完成校验（未完成不得提交作答）、提交答案、返回逐题对错与是否通过；答案不下发到前端。
- **资格判定**：仅当前信用分 < 60 的用户可开始学习；分数 ≥ 60 拒绝并给出可展示原因码。
- **低分限制（D1 / D6）**：`user_credit_account.score < 60` 即受限，在唯一拦截面「发布行程」拒绝并返回 `CREDIT_SCORE_BELOW_60`；恢复至 60 后自动放行。
- **考试次数配额（D3）**：每自然月最多 2 次考试（含通过与未通过），第 3 次拒绝。
- **恢复记账**：答题通过后调用既有 `CreditService.book`，`delta = 60 - score_before`，`reason_code = SAFETY_LEARNING_RECOVERY`，`related_type` / `related_id` 指向本次学习会话；账本等式「变更前 + 实际生效量 = 变更后」必须成立，恢复后不超过 60。
- **月度配额**：同一自然月最多成功恢复一次；配额按已成功恢复的账本记录派生，不额外建计数表（口径见 D4 / D5）。
- **限制解除判定**：以「信用分 ≥ 60」为唯一派生条件，在读取侧落地；本变更不引入独立限制表。
- **数据**：新增安全学习考试会话（单表承载会话、抽中题号、作答、判定与 `month_key`；不建作答明细表——OQ-5 已裁定只存完成标记与结果）；`user_credit_account` / `credit_ledger` 结构不改。
- **前端**：新增安全学习页（题库呈现、逐题作答、提交与结果态、已恢复态、无资格态），并在受限提示处给出入口。
- **契约**：`openapi.yaml` 升次版本并新增学习会话端点；同步前端类型与后端契约测试。
- **登记**：`stories.md` / `registry.md` / `handoff.md` 登记 REQ-023 → `add-credit-recovery`。

**Out of scope**

- **扣分 / 加分事件的实现**：举报核实扣分（#29）、体验获赞加分（#30）、退出同行扣分（#31）、月度上限、自动封禁（< 60）。本变更只消费「分数已经 < 60」这一既成状态。
- **管理后台**：用户列表 / 详情 / 手工改分 / 解除限制 / 题库维护（#23 内部管理平台另开 change）。
- **人工封禁模型**：故事里「管理员人工封禁不因学习解除」需要封禁数据与拦截点，本变更既不建模型也不做解封；等封禁能力落地后在 `user-credit` 或独立 capability 追加。
- 真实题库内容（20 题为演示集）、AI 判题、学习时长统计、证书。
- 恢复超过 60、连续恢复奖励、申诉通道、分数明细对用户可见。
- 通知 / 推送 / 邮件；除学习入口外其它界面（行程卡、详情页、聊天页）新增低分提示。
- 引入第二套 UI 组件库或独立「信用中心」页面。

## 影响面

| 位置 | 改动 |
|---|---|
| `backend/src/main/resources/db/migration/V24__add_credit_learning.sql`（新增） | `credit_learning_session` 单表（会话 / 抽中题号 / 作答 / 判定 / `month_key`）+ 月度索引；不建限制表，不改账户表 |
| 后端 `controller/` | 新增学习会话端点（开始 / 提交），沿用既有会话与错误码风格 |
| 后端 `service/`、`service/impl/` | 新增 `CreditLearningService`：资格校验、取题、判分、月度配额、调用 `CreditService.book` |
| 后端拦截面入口 | 在「发布行程」接口接入低分限制，统一返回 `CREDIT_SCORE_BELOW_60`；阈值只在一处实现（D6） |
| 后端 `entity/`、`mapper/`、`pojo/` | 考试会话行对象与题库预置读取（不含作答明细表） |
| 后端 `enums/` | 恢复与判定的 reason code / 拒绝码集中定义（唯一真相） |
| 后端 `src/main/resources/` | Mock 题库资源（四领域：旅行安全、陌生人同行、平台行为规范、隐私保护） |
| `openapi.yaml` | 升次版本（当前 `0.14.0`）；新增学习会话端点与 DTO；信用字段本身不改 |
| `frontend/src/` | 新页面 `credit/LearningPage.tsx` + `credit/learningState.ts`、路由 `#/credit/learning`、`api.ts`、`types.ts`、`i18n/tripMessages.ts`；入口仅「发布行程被拦截提示」（OQ-6） |
| `frontend/src/styles.css` | 学习页与结果态样式，沿用 design-system 令牌 |
| 文档 | `stories.md` / `registry.md` / `handoff.md` 登记；`docs/sdd/add-credit-recovery/` 阶段记录 |

## 已裁定决策（2026-11-17）

| 编号 | 决策 | 依据 |
|---|---|---|
| D1 | 低分限制由本变更落地：以 `score < 60` 派生受限状态，在选定的拦截面返回 `CREDIT_SCORE_BELOW_60`，恢复至 60 自动放行 | 用户裁定 OQ-1 选「本变更内落地限制」 |
| D2 | 通过条件：10 题，答对 ≥ 8 题（即 8 题及以上）通过 | 用户裁定 OQ-2；原话「答对 8 题以上」，按含 8 题执行 |
| D3 | 月度考试次数：每自然月最多 2 次考试，无论通过与否都计次；成功恢复仍最多 1 次 | 用户裁定 OQ-2 附加规则 |
| D4 | 「自然月」按 `Asia/Shanghai` 判定 | 用户裁定 OQ-3 |
| D5 | 恢复只经 `CreditService.book`；月度次数从 `credit_ledger` 派生 | 提案建议，未被否决 |
| D6 | 低分限制只拦「发布行程」；提交申请、聊天、修改资料等功能不限制 | 用户裁定 OQ-10（单选） |
| D7 | 题库为服务端资源文件，共 20 题，每次考试抽 10 题 | 用户裁定 OQ-4 |

## 关键设计取舍（待 P2 / P3 定稿）

- **恢复走既有记账路径（建议）：** 恢复是一次普通记账，`delta = 60 - score_before`，不新开写分入口，保持「信用写入只经 `CreditService.book`」的唯一性。
- **配额从账本派生（建议）：** 「本自然月是否已恢复」用 `credit_ledger` 上 `reason_code = SAFETY_LEARNING_RECOVERY` 且 `occurred_at` 落在本月来判定，避免第二份计数真相；代价是每条判定多一次账本查询（有 `ix_credit_ledger_user_time` 支撑）。
- **限制为派生而非存储（建议）：** 不建 `user_credit_restriction` 表，`score < 60` 即受限；这样「恢复后自动解除」不需要额外写操作，也不会与后续扣分 change 抢表。
- **被否决：** (1) 用 `app_users` 加 `credit_restricted` 列 —— 与 D3「分数唯一真相在账户表」冲突；(2) 恢复直接 `UPDATE user_credit_account` —— 绕过账本，破坏可回算；(3) 单独建 `credit_recovery_quota` 表 —— 与账本重复记录同一事实。

## 1. Actors

| 角色 | 说明 |
|---|---|
| 受限用户 | 已登录，信用分 < 60，需要恢复旅行社交功能 |
| 正常用户 | 已登录，信用分 ≥ 60，无资格参加 |
| 平台 | 出题、判分、记账、派生限制状态 |

## 2. 场景（前置 / 操作 / 预期）

### A. 资格

1. **R-1 低于 60 可参加** — Given 当前用户信用分 45，When 打开安全学习页，Then SHALL 展示学习入口与题量，MUST NOT 提示无资格。
2. **R-2 达到 60 不可参加** — Given 当前用户信用分 60，When 打开安全学习页，Then SHALL 展示「当前无需恢复」文案与当前分数，MUST NOT 允许开始答题。
3. **R-3 未登录拒绝** — Given 无会话，When 调用学习会话端点，Then SHALL 返回既有未登录错误，MUST NOT 建会话。
4. **R-4 他人不可代办** — Given 用户 A 已登录，When 请求为 B 开启学习会话，Then SHALL 只操作会话主体，MUST NOT 出现按请求参数改他分。

### B. 学习与答题

5. **R-5 题目与覆盖** — Given 受限用户开始考试，When 题目返回，Then SHALL 返回 10 题并从 20 题题库抽取，题目集覆盖旅行安全 / 陌生人同行 / 平台行为规范 / 隐私保护四类至少各一题。
6. **R-6 答案不下发** — Given 题目已下发，When 检查响应体，Then MUST NOT 包含正确答案字段。
7. **R-7 学习完成后才能答题** — Given 用户尚未完成学习内容，When 尝试提交作答，Then SHALL 被拒绝并保留学习进度；只有完成学习后 MUST 才允许提交与判定。
8. **R-8 提交返回逐题判定** — Given 用户完成学习并提交全部作答，When 判定完成，Then SHALL 返回每题对错与总判定（通过 / 未通过），且只落一次会话结果。
9. **R-9 未通过可在次数内重试** — Given 本次未通过且本月考试次数未用完，When 用户重新开始，Then SHALL 可以再次答题，且 MUST NOT 改变信用分、MUST NOT 占用恢复次数。

### C. 恢复记账

10. **R-10 通过即恢复至 60** — Given 信用分 45 且本月未恢复，When 答题通过，Then 分数 SHALL 变为 60，`applied_delta = +15`，账本记录满足「变更前 + 实际生效量 = 变更后」。
11. **R-11 不超 60** — Given 信用分 59，When 答题通过，Then 分数 SHALL 为 60（`applied_delta = +1`），MUST NOT 出现 61 及以上。
12. **R-12 理由码与记录文案** — Given 一次成功恢复，When 读取账本，Then `reason_code` SHALL 为 `SAFETY_LEARNING_RECOVERY`，`related_type` / `related_id` SHALL 指向本次学习会话，且恢复记录 SHALL 以「安全学习信用恢复」作为展示文案。
13. **R-13 幂等** — Given 同一次学习会话已被记账，When 重复提交同一会话，Then 分数 MUST NOT 再次变化，MUST NOT 产生第二条恢复记录。

### D. 月度配额

14. **R-14 每自然月一次** — Given 本月已恢复过，When 用户再次通过答题，Then 恢复 SHALL 被拒绝并返回可展示原因码，分数不变。
15. **R-15 跨自然月可再次参加** — Given 上月已恢复且本月尚未恢复，When 用户答题通过，Then SHALL 允许恢复（口径见 OQ-3 的时区裁定）。
16. **R-16 失败不占配额** — Given 本月仅有未通过与取消的会话，When 用户继续答题并通过，Then SHALL 正常恢复。

### E. 展示与限制解除

17. **R-17 恢复后展示同口径** — Given 恢复成功，When 打开个人主页 / 资料弹窗 / 行程卡，Then SHALL 展示「60 / 100 · 信用一般」。
18. **R-18 限制自动解除** — Given 恢复至 60，When 发布行程，Then MUST NOT 再被 `CREDIT_SCORE_BELOW_60` 拦截。

### F. 边界与异常

19. **R-19 0 分恢复** — Given 信用分 0，When 答题通过，Then 分数 SHALL 为 60（`applied_delta = +60`）。
20. **R-20 账户缺失** — Given 用户无信用账户，When 读取或开始学习，Then 系统 SHALL 按初始分 80 建账户并判定为无资格，MUST NOT 报错。
21. **R-21 用户不存在** — Given 不存在的用户，When 调用学习端点，Then SHALL 沿用既有 `USER_NOT_FOUND` 行为。
22. **R-22 并发通过** — Given 同一用户两个会话并发提交且均通过，When 记账执行，Then 只 SHALL 生效一次（幂等键 + 月度配额双保险），分数 MUST NOT 累加超过 60。

### G. 低分限制与考试次数（D1 / D3）

23. **R-23 发布行程被拦截** — Given 用户信用分 45，When 发布行程，Then SHALL 返回 `CREDIT_SCORE_BELOW_60` 并给出安全学习入口，MUST NOT 创建行程。
24. **R-24 月度考试次数用尽** — Given 本月已考 2 次均未通过，When 再次开始考试，Then SHALL 被拒绝并提示次月再试，分数 MUST NOT 变化。
25. **R-25 分数 60 不被拦截** — Given 用户信用分恰为 60，When 发布行程，Then MUST NOT 返回 `CREDIT_SCORE_BELOW_60`。

## 3. Constraints

- **单一写分入口：** 恢复只经 `CreditService.book`，不新增第二条写分路径；`CreditBooking` 已支持 `relatedType` / `relatedId` / `idempotencyKey`。
- **恢复是「补到 60」而非加分：** 实际变化量为 `60 - score_before`，不是固定 +N；分数 ≥ 60 时不得进入恢复。
- **限制为派生状态：** 「是否受限」只由 `user_credit_account.score < 60` 派生，不落库、不做缓存分叉；阈值只在一处实现。
- **次数真相分两处且不交叉：** 恢复次数以 `credit_ledger` 为准（D5）；考试次数以学习会话记录为准（D3）；会话表不存分数。
- **题库边界：** 题库为服务端资源文件共 20 题，每次考试抽 10 题（D7）；题目与答案都在服务端，前端只拿题干与选项。
- **数据契约：** 不改 `user_credit_account` / `credit_ledger` 结构；新增表只在需要承载会话、作答与 `related_id` 时建立。
- **契约与迁移排他：** `openapi.yaml` 当前 `0.14.0`，Flyway 头为 `V20__add_credit_account.sql`；本变更 P3 已排他为 **`0.18.0` + `V24`**（`0.15.0 + V21` 已由在途 `add-ai-itinerary` 登记），合并前复核一次。
- **原型缺口：** `docs/prototype` 无安全学习页骨架（grep `安全学习` 0 命中），按 `@rule:prototype-ui-alignment` 需在 P3 先补原型截点再实现对齐。
- **业务规则不可自行推断：** 题库形态与拦截面清单按 OQ-4 / OQ-10 处理，不得在实现中临时决定；其余口径以 D1–D5 为准。

## 4. Context（证据）

| 事实 | 证据 |
|---|---|
| 信用账户与记账已落地 | `RouteME/backend/src/main/resources/db/migration/V20__add_credit_account.sql`；`CreditService.book(CreditBooking)` |
| 信用展示已有统一口径 | `RouteME/frontend/src/profile/creditDisplay.ts`（`normalizeCreditLevel` / `normalizeCreditScore`） |
| 批量读取端点存在 | `RouteME/openapi.yaml` `/users/credits` → `operationId: loadUserCredits` |
| 低分限制未实现 | 全仓 grep `CREDIT_SCORE_BELOW_60` 仅命中文档（`add-credit-account/proposal.md`、`REQ-019`、`stories.md`），backend / frontend / openapi 0 命中 |
| 事件类故事未落地 | Issue #29 / #30 / #31 均 open；`openspec/changes/` 无对应变更包 |
| 限制被显式推迟 | `openspec/changes/add-credit-account/proposal.md` Out of scope：「自动封禁（< 60）、安全学习恢复」 |
| 原型的信用展示只到分数 | `docs/prototype/ui.js` `creditInfo()`；`docs/prototype/data.js` `creditScore: 80` |
| 原型无安全学习页 | `docs/prototype/*.html|*.js` grep `安全学习` → 0 命中 |
| 当前迁移头与契约版本 | `V20__add_credit_account.sql`；`openapi.yaml` `info.version: 0.14.0` |
| 账本已有用户+时间索引 | `V20` 中 `ix_credit_ledger_user_time (user_id, occurred_at)` |

## 5. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `user-credit` | **ADDED Requirements** | 追加安全学习恢复：资格、题库与判分、恢复记账、月度次数、低分限制与解除、展示一致、边界并发（Delta：`specs/user-credit/spec.md`） |
| `user-profile` / `user-profiles` | 依赖（未归档） | 展示沿用现有信用字段；恢复后自然显示 60，无需改语义 |
| `user-auth` | 依赖 | 仅用既有登录态与会话；不改「注册账号」Requirement |
| `admin`（不存在） | **不在本需求** | 题库维护、手工解封推迟（#23） |

## 6. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | **resolved（D1）** | OQ-1 低分限制由谁提供 | IO / SA | 本变更内落地：`score < 60` 为唯一派生条件；具体拦截面清单转 OQ-10 |
| blocking | **resolved（D2）** | OQ-2 答题通过条件 | IO | 10 题，答对 ≥ 8 题通过 |
| blocking | **resolved（D4）** | OQ-3 自然月时区口径 | SA | 按 `Asia/Shanghai` 判定 |
| blocking | **resolved（D6）** | OQ-10 低分限制具体拦截哪些功能 | IO / SM | 仅「发布行程」；申请 / 聊天 / 改资料不限制 |
| blocking | **resolved（D7）** | OQ-4 题库形态与最小题量 | SA / Dev | 服务端资源文件，20 题，每次抽 10 题 |
| non-blocking | **resolved（P3-D2）** | OQ-5 学习进度是否需要持久化（中途退出后是否续答） | SA | 只存完成标记 + 结果；不建逐题明细；刷新不额外扣次数 |
| non-blocking | **resolved（P3-D3 / P3-D4）** | OQ-6 页面路由与入口位置 | IO | `#/credit/learning` 独立页；入口仅「发布行程被拦截提示」 |
| non-blocking | **resolved（P3-D5）** | OQ-7 契约版本号与迁移号 | Dev | `0.18.0` + `V24` |
| non-blocking | deferred | OQ-8 人工封禁与学习恢复的关系 | IO | 依赖封禁模型（#23）先落地 |
| non-blocking | **resolved（D3）** | OQ-9 未通过后的重考次数上限 | IO | 每月最多 2 次考试，不限通过与否；本期不设冷却间隔 |

## 7. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | §问题 一句话可对外表述：受限用户通过安全学习回到 60 分 |
| 2 Actors defined | Pass | §1 三个角色 + 权限边界（R-3 / R-4） |
| 3 Scope bounded | Pass | §范围 in / out 均非空，扣分事件与人工封禁显式排除 |
| 4 Scenarios concrete | Pass | §2 共 25 条，均含可观察结果 |
| 5 Exception / boundary | Pass | R-19 ~ R-22（0 分、缺账户、用户不存在、并发）与 R-24（次数用尽） |
| 6 Results verifiable | Pass | 分数、账本等式、reason code、月度拒绝均可断言 |
| 7 Dependencies / app-arch touchpoints | Pass | §3 契约与迁移排他；§5 能力表 |
| 8 Open-questions gate | Pass | OQ-1–OQ-7 / OQ-9 / OQ-10 均 resolved（D1–D7 + P3-D1~P3-D6）；仅余 1 条 deferred（OQ-8 依赖封禁模型） |
| 9 Data contract decided | Pass | 题量 10 / 题库 20 / 题库形态 / 考试次数 2 / 恢复次数 1 已定，可推会话表字段与点数 |
| 10 Boundary enumerated | Pass | R-23 ~ R-25 覆盖拦截与次数；Delta R1 已显式写「提交申请 / 聊天 / 改资料 MUST NOT 被拒绝」 |
| 11 Cross-REQ aligned | Pass | 与 #29–#31 分工清晰：事件只写分，限制只在发布行程一处 |
| 12 Notification / display contract decided | Pass | 恢复后展示沿用 `creditDisplay.ts`；拦截提示文案与入口位置已由 OQ-6 定为 `#/credit/learning` + 拦截提示内入口 |

**DoR 结论：** BLOCKER 0 / WARNING 0（原 3 条 WARNING 均已收口：OQ-6 已于 P3 裁定、Delta 已明写拦截面边界、契约与迁移号已排他）。可进 P4。

## 8. 残余风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 恢复链路先于扣分链路交付，线上无人会掉到 60 以下 | 功能可演示但无自然触发路径 | 演示走种子账号造分；Delta 显式记录「依赖事件 change 提供真实入口」 |
| 拦截面只覆盖发布行程（D6） | 与故事「旅行社交功能受限」的直觉口径不完全一致，演示时可能被认为限制不足 | Delta 明写拦截面清单与「其他功能不限制」的边界；后续扩展另开 change |
| 限制与后续扣分事件重复实现拦截 | 两处阈值分叉 | 阈值与判定只在 `user-credit` 一处实现，事件 change 只负责写分 |
| 月度配额按账本派生，账本被人工修正后配额漂移 | 可能多恢复一次 | P3 明确「账本 append-only，任何修正走新记录」 |
| 题库过小导致可背答案 | 演示价值下降 | 20 题抽 10（D7），两次考试题目组合不同；MVP 接受 |
