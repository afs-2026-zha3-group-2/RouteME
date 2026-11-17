# ATDD 设计 — add-credit-recovery

- **Change：** `add-credit-recovery`（REQ-022 / S22 安全学习恢复信用分）
- **输入：** `specs/user-credit/spec.md`（ADDED 7 Requirement / 29 Scenario）、`g1-decision.md`（**Pass**）、`proposal.md`（D1–D7）
- **日期：** 2026-11-17 ｜ **作者：** Lewis Liu（当前开发者）
- **前置：** G1 **Pass（无条件，2026-11-17，IO=WAYNE / SA=Jacky）**；本设计与 `tasks.md` 已于 2026-11-17 通过工件评审（BLOCKER 0），P4 按 T1 起推进。
- **原型：** `docs/prototype/credit-learning.html`（已先行，四态可切换）

## 1. ATDD 层次划分

用例 ID `A1–A29` 按 Delta 顺序编号，与 REQ-022 的 `R-1 ~ R-27` **不是同一编号体系**（Delta 比需求多 2 条拆分场景）。

| ID | Delta Requirement | Scenario | Layer | 附加层 | 依据 |
|---|---|---|---|---|---|
| A1 | R1 低分限制与自动解除 | 低于 60 发布行程被拒绝 | **API + E2E** | 安全 | API 断言码值 403 与「行程数不变」；E2E 断言提示与「去安全学习」入口 |
| A2 | R1 低分限制与自动解除 | 恰好 60 分不被拦截 | **API** | 边界 | 差一断言：59 拦 / 60 放行 |
| A3 | R1 低分限制与自动解除 | 恢复至 60 后自动放行 | **API** | — | 同一账号先被拒，考试通过后同请求成功 |
| A4 | R1 低分限制与自动解除 | 其他功能不因低分被限制 | **API** | 回归 / 安全 | 申请、撤回、聊天、改资料在 45 分下均不返回该码 |
| A5 | R2 安全学习的参加资格 | 低于 60 可以开始考试 | **API** | — | 建会话并返回 10 题 |
| A6 | R2 安全学习的参加资格 | 达到 60 分拒绝参加 | **API + E2E** | 边界 | API 断言 `LEARNING_NOT_ELIGIBLE`；E2E 断言「当前无需恢复」文案 |
| A7 | R2 安全学习的参加资格 | 未登录拒绝 | **API** | 安全 | 缺 `X-User-Id` 沿用既有未登录码；不建会话 |
| A8 | R2 安全学习的参加资格 | 只能操作本人 | **API** | 安全 | 请求体塞 `userId` 不生效；B 的分数与次数不变 |
| A9 | R3 题库与答题判定 | 每次抽 10 题且覆盖四类 | **API** | — | 断言 10 题、四类各 ≥1、题号 ⊆ 题库 20 |
| A10 | R3 题库与答题判定 | 响应不含正确答案 | **API** | 契约 | 响应 JSON 序列化后不含 `answer` 字段；`OpenApiTest` 校验 DTO 无该属性 |
| A11 | R3 题库与答题判定 | 未完成学习不能提交 | **API** | — | 未调 `lessons/complete` 直接提交 → 409；分数与次数不变 |
| A12 | R3 题库与答题判定 | 答对 8 题判定通过 | **API** | 边界 | 计数器断言 8 → `passed = true` |
| A13 | R3 题库与答题判定 | 答对 7 题判定未通过 | **API** | 边界 | 7 → `passed = false`；分数不变；恢复次数仍 0/1 |
| A14 | R3 题库与答题判定 | 未通过后可在次数内重考 | **API** | — | 第 2 次会话可建立，判定互不影响 |
| A15 | R4 安全学习恢复记账 | 45 分恢复至 60 | **API** | 数据完整性 | 账本 `score_before=45 / applied_delta=+15 / score_after=60` |
| A16 | R4 安全学习恢复记账 | 59 分只补到 60 | **API** | 边界 | `+1`；不出现 61 |
| A17 | R4 安全学习恢复记账 | 恢复记录文案 | **Defer UT** | — | reason code → 展示文案的映射单测（无公开读账本端点） |
| A18 | R4 安全学习恢复记账 | 同一会话重复提交只恢复一次 | **API + Defer UT** | 幂等 | API 重复提交不二次改分；UT 断言唯一索引 |
| A19 | R5 每月考试次数与恢复次数 | 当月第 3 次考试被拒绝 | **API** | 配额 | 第 3 次 429；不建会话 |
| A20 | R5 每月考试次数与恢复次数 | 当月已恢复后再次通过被拒绝 | **API** | 配额 | 造分回 45 后再通过 → 拒绝；不写第二条账本 |
| A21 | R5 每月考试次数与恢复次数 | 跨自然月可再次参加 | **API** | 时区 | 固定 `Clock` 跨月；`FixedClockTestConfig` |
| A22 | R5 每月考试次数与恢复次数 | 失败不占用恢复次数 | **API** | 配额 | 1 次失败 + 1 次通过 → 恢复成功 |
| A23 | R5 每月考试次数与恢复次数 | 月份边界按北京时间 | **Defer UT** | 时区 | `CreditMonth.monthKey(Instant)` 纯函数：UTC 11-30 23:30 → `2026-12` |
| A24 | R6 恢复后的展示一致性 | 恢复后个人主页展示 | **E2E** | — | 断言整串「60 / 100」+「信用一般」 |
| A25 | R6 恢复后的展示一致性 | 恢复后在列表类展示面同口径 | **E2E** | 性能（单次批量） | 首页行程卡 / 申请处理页同行；断言 `loadUserCredits` 一次请求 |
| A26 | R7 恢复链路的边界与并发 | 0 分恢复至 60 | **API** | 边界 | `+60`；等式成立 |
| A27 | R7 恢复链路的边界与并发 | 无信用账户按初始分处理 | **API** | 边界 | 删账户后开始考试 → 自动建 80 并判无资格，不报错 |
| A28 | R7 恢复链路的边界与并发 | 不存在的用户沿用既有错误 | **API** | — | `USER_NOT_FOUND`；不建会话 |
| A29 | R7 恢复链路的边界与并发 | 并发通过只恢复一次 | **Defer UT** | 并发 | 两个线程提交同一用户的两次会话；断言只 1 条恢复记录、分数 = 60 |

**汇总：** API 24 条（A1 / A6 兼 E2E）｜仅 E2E 2 条（A24 / A25）｜Defer UT 3 条（A17 / A23 / A29，A18 兼 UT）；去重合计 **29 条**，与 Delta 29 Scenario 一一对应。

**Deferred to `/sdd:atdd-apply`（unit-level TDD）：** reason code 文案映射、北京时间月份窗口函数、账户行锁下的并发恢复。

## 2. 在生产代码前先写的验收检查

1. **契约（最先）**
   - `OpenApiTest`：新增三个端点与 `LearningSession` / `LearningQuestion` / `LearningResult` / `LearningAnswerDetail` 四个 schema；`LearningQuestion` 的属性集合**不含**答案类字段；错误码 enum 含 5 个 `LEARNING_*` 与 `CREDIT_SCORE_BELOW_60`。

2. **API（先红）**
   - `CreditLearningApiTest`：A5 / A6 / A9 / A10 / A11 / A12 / A13 / A14（会话与判分）。
   - `CreditLearningRecoveryApiTest`：A15 / A16 / A18 / A20 / A22 / A26 / A27（恢复记账与配额）。
   - `CreditLearningQuotaApiTest`：A19 / A21（考试次数与跨月；固定 `Clock`）。
   - `CreditPublishGuardApiTest`：A1 / A2 / A3 / A4 / A7 / A8 / A28（拦截面 + 权限）。
   - `CreditLearningMigrationSqliteTest`：沿用 `*MigrationSqliteTest` 命名；全新库 V1–V22 建会话表；旧库（V20）升级后表存在且既有 `user_credit_account` / `credit_ledger` 数据不变，并做一次 `status` / `passed` / `score` 写读往返。

3. **E2E（先红）**
   - `e2e/tests/credit-learning.spec.ts`：45 分账号发布行程 → 看到 `CREDIT_SCORE_BELOW_60` 提示与「去安全学习」→ 进入 `#/credit/learning` → 完成学习 → 10 题作答（固定 8 对）→ 结果「通过」→ 回发布页成功；再看个人主页为「60 / 100 · 信用一般」。
   - 62 分账号直接深链 `#/credit/learning` → 「当前无需恢复」，无「开始答题」按钮。

## 3. 本地与 CI 门禁

| 层 | 命令 | 备注 |
|---|---|---|
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B -ntp verify` | 与 CI 一致 |
| 前端 | `cd RouteME/frontend; npm run typecheck; npm run build; npm test` | 与 CI 的 `build && test` 对齐 |
| E2E | `cd RouteME/e2e; npx playwright test tests/credit-learning.spec.ts` | **不在 CI**（既有残余风险），P4 本地全量回归 |
| 规格 | `openspec validate add-credit-recovery --strict` | 每次改 Delta 后 |
| 契约 | `npx @redocly/cli lint openapi.yaml`（`RouteME/redocly.yaml`） | 本地可选 |

## 4. 数据 / 夹具策略

- **造分**：扣分事件（#29–#31）未落地，测试用 SQL 直接改 `user_credit_account.score`，并在 `credit_ledger` 补一条 `SYSTEM_ADJUST` 记录保证等式成立（不伪造业务事件类型）。
- **时钟**：沿用 `config/FixedClockTestConfig`，A21 / A23 注入固定时刻；`Asia/Shanghai` 边界用 `2026-11-30T23:30Z` 与 `2026-11-30T16:00Z`（= 北京 12-01 00:00）两组。
- **抽题确定性**：`CreditLearningService` 注入 `Random`；测试传固定 seed，断言题目集合可复算。
- **E2E**：沿用「全新 SQLite + 独立后端端口」；45 分账号由 seeding SQL 造；注册用户名用时间戳唯一。
- **清理**：后端用例事务回滚或 `DELETE FROM credit_learning_session`；E2E 结束删临时库。

## 5. Non-goals 反向验证

| Non-goal（提案 Out of scope） | 反向用例 | Layer |
|---|---|---|
| 扣分 / 加分事件（#29–#31）与自动封禁 | API：不存在对应事件端点；`credit_ledger` 无新增业务 reason code | API |
| 人工封禁与解封 | API：无封禁表 / 端点；账号被标记不存在字段可读 | API |
| 管理后台与题库维护 | API：`/api/admin/**` → 404；E2E：导航无管理入口 | API + E2E |
| 真实题库 / AI 判题 / 学习时长统计 / 证书 | API：响应无 `duration` / `certificate` 字段 | 契约 |
| 恢复超 60 / 连续奖励 / 申诉 / 明细可见 | API：A16 断言不出现 61；E2E：个人主页无「信用明细」入口 | API + E2E |
| 通知 / 推送 / 邮件 | E2E：流程中无通知中心变化 | E2E |
| 其他界面新增低分提示（D6） | E2E：首页、聊天页、我的旅行无受限横幅（入口只在拦截提示内） | E2E |
| 不建限制表 / 限制列 | 迁移测试：`app_users` 列集合不变，无 `*_restriction*` 表 | API（迁移断言） |

## 6. NFR 测试

**不在本 change 范围**（沿用 `add-credit-account` 的裁决：NFR 不纳入）。P4 只在验证报告记录两条结构事实：发布行程多一次账户读取（单行主键查询）、恢复为单事务 3 条 SQL（锁账户 + 写账本 + 更新账户）。
