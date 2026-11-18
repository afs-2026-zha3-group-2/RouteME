# Local Verify Report: add-credit-recovery

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** c:\Users\LIUWA2\Desktop\ITA\11.13\RouteME\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-credit-recovery（REQ-022 / S22；分支 `feature/add-credit-recovery`，base `ec360dc`）

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass**（全量 E2E 17 条失败全部落在 `map.spec.ts` / `trips.spec.ts` 的地图断言，失败签名与同 base 上先前报告一致，本 change 零改动地图代码与两份用例） |

**PR gate:** Overall=Pass，`/sdd:pr-submit` 可继续；Waiver 不适用。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `.\mvnw.cmd -B -ntp test`（`RouteME/backend`） | `.github/workflows/ci.yml`（`./mvnw -B -ntp verify` 的阶段等价） | 0 | **348 tests**，0 failures / 0 errors / 0 skipped（含 `CreditLearningApiTest` 12、`CreditLearningRecoveryApiTest` 6、`CreditPublishGuardApiTest` 4、`CreditLearningQuotaApiTest` 3、`CreditLearningMigrationSqliteTest` 3、`CreditLearningDrawTest` 3、`CreditMonthTest` 2、`CreditLearningReasonLabelTest` 2、`CreditLearningConcurrencyTest` 1） |
| `npm.cmd run typecheck`（`RouteME/frontend`） | `package.json` scripts + `@rule:web-coding-style` | 0 | `tsc --noEmit` 无输出 |
| `npm.cmd run build`（`RouteME/frontend`） | `.github/workflows/ci.yml`（`npm run build`） | 0 | 构建成功；css 102.81 kB / js 1,315.21 kB；仅既有 chunk > 500 kB 提示 |
| `npm.cmd test`（`RouteME/frontend`） | `.github/workflows/ci.yml`（`npm test`） | 0 | **40 文件 / 308 tests** 全通过（含 `learningState.test.ts` 10、`publishGuard.test.ts` 4、`route.test.ts` 9） |
| `npx playwright test`（`RouteME/e2e`，开发环境 8080 + 5173，库 `SqlLite/routeme.db`） | `e2e/package.json` + 既有本地验证约定 | 1 | **119 tests：102 passed / 17 failed**（7.5m）；17 条全部在 `map.spec.ts`（E11–E18 共 9 条）与 `trips.spec.ts`（8 条），抽样复跑 `map.spec.ts:38` / `trips.spec.ts:140` 均报 `locator('[data-testid="china-map"]')` `element(s) not found` |
| `npx playwright test tests/credit-learning.spec.ts`（同上环境） | 本 change 门禁 | 0 | **3/3 passed**（17.5s）：45 分拦截 → 学习 → 60 → 同页发布成功 / 62 分「当前无需恢复」 / 低分不在首页·我的旅行·聊天新增入口 |
| `openspec validate add-credit-recovery --strict` | `@rule:spec-first` | 0 | `Change 'add-credit-recovery' is valid` |
| `npx -y @redocly/cli@2 lint openapi.yaml` | `@rule:api-contract` | 0 | `valid`；19 warning，其中 #18–#19 为提交端点刻意构造的 400 示例（与既有 `trips/post` 的 `rejected` 示例同口径） |

## 地图 E2E 归因（非本 change）

- 失败签名：`[data-testid="china-map"]` 元素不存在（`map.spec.ts` E11–E18 与 `trips.spec.ts` 发布/编辑/地图用例），与 2026-11-17 早些时候的 `20261117-131346-local-verify-report.md`、`20261117-122937-local-verify-report.md`、`20261117-123452-local-verify-report.md` 记录的同类失败完全一致（当时 20–21 条）。
- 本 change 改动面：`git status` 中不含 `frontend/src/map/**`、`e2e/tests/map.spec.ts`、`e2e/tests/trips.spec.ts`；`frontend/src/map/ChinaMap.tsx` 的 `data-testid="china-map"` 仍在源码中，说明是页面未渲染该组件（既有地图环境/数据依赖债务），不是断言漂移。
- 结论：由地图 owner 单独立项排查；本 change 不接触、不认领，列入残余风险与跟踪项。

## Code-review highlights

- **契约先于两端**：`openapi.yaml` 升 `0.16.0`（3 端点 / 4 schema / 6 错误码 / `POST /api/trips` 403 `CREDIT_SCORE_BELOW_60`），`OpenApiTest` 断言 schema 属性集合**不含答案**；Redocly `valid`。
- **迁移双引擎**：`V22__add_credit_learning.sql` 只用 SQLite / H2 都支持的语法（单表 + `(user_id, month_key)` 索引），`CreditLearningMigrationSqliteTest` 覆盖全新库 V1–V22 与旧库（V20）升级两条路径，并做 `status` / `passed` / `score` 写读往返。
- **阈值单点**：`CreditLearningConstant.PUBLISH_MIN_SCORE = RECOVERY_TARGET_SCORE`；`CreditGateServiceImpl` 零字面量 `60`，放行与恢复共用一处定义。
- **判定顺序**：`submit` 走「先月度恢复配额（409 `LEARNING_RECOVERY_QUOTA_EXCEEDED`）→ 后当前分数（409 `LEARNING_NOT_ELIGIBLE`）」，由 `CreditLearningRecoveryApiTest` / `CreditLearningQuotaApiTest`（固定 `Clock`）锁定；月度边界按 `Asia/Shanghai`。
- **记账真相**：恢复只经 `CreditService.book`（`delta = 60 - before`、`SAFETY_LEARNING_RECOVERY`、`relatedId = sessionId`、幂等键 `learning-recovery:<userId>:<monthKey>`），`recorded(key)` 预判 + 账本唯一索引兜底，并发用例只落 1 条账本（未引入 `SELECT ... FOR UPDATE`）。
- **未通过路径**：≤ 7 分写 `submitted` / `score` / `passed=0`，不改分、不写账本、不占恢复次数；已提交会话重复提交原样回放。
- **唯一拦截面**：`CreditGateService.assertCanPublish` 只在 `TripController.create` 调用；申请 / 接受 / 聊天 / 改资料不返回该码（`CreditPublishGuardApiTest` A1–A4）。
- **前端只做状态派生**：`credit/learningState.ts` 承担 `phase({creditScore, session, result})` / `toViewModel` / `quizProgress` / `errorMessage`；页面 `LearningPage.tsx` 五态渲染不写业务 if，`sessionStorage` 续考不额外扣次数。
- **拦截入口收敛**：`trips/publishGuard.ts` 纯函数分流 `creditGuard` / `generic` / `null`，页面只按 `kind` 渲染专用 Alert（`type="warning"` + 「去安全学习」）与通用错误块；错误码字符串比较不进页面。
- **零入口原则**：首页、我的旅行、聊天、个人主页均未新增学习入口（E2E 反向断言 count=0），入口仅「发布行程被拦截提示」（OQ-6）。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | 29 个 Scenario 有对应实现 / 测试 | Pass | [fact] | API 24（后端 8 个测试类）+ 仅 E2E 2 + Defer UT 3（A18 兼 UT）；覆盖映射 29/29 无孤儿任务（`tasks.md`） |
| V2 | AC 可观察 | Pass | [fact] | 403 码、`delta = 60 - before`、账本行数、`score ≥ 8`、月度 2 考 1 恢复、五展示面「60 / 100 · 信用一般」均有断言 |
| V3 | 反向（Non-goals）覆盖 | Pass | [fact] | 无扣分 / 加分端点、无自动封禁、无题库管理、无读账本端点、无学习入口；`app_users` 无限制列（迁移测试断言列集合） |
| V4 | 契约与实现一致 | Pass | [fact] | `OpenApiTest` + `CreditLearningApiTest` 同字段名 / 同错误码；答案字段不下发 |
| V5 | 数据不变量 | Pass | [fact] | 账本等式（`before + applied = after`）、会话 `(user_id, month_key)` 计数、幂等键唯一 |
| V6 | 文档与工件同步 | Pass | [fact] | `tasks.md` T1–T13 回填、`registry.md` / `stories.md` / `handoff.md` / `docs/sdd/README.md`、`p4-apply.md`、本报告 |
| V7 | 视觉 / 响应式 | Pass | [fact] | 无截图产物（按约定）；按 DOM 类名（`.cl-*`、`.publish-guard*`）与令牌核对五态、940px 单栏、620px 按钮、深色三处提亮；E2E 断言关键文案与区块存在 |
| V8 | 必要性（无越界实现） | Pass | [fact] | 无计分事件、无管理端、无第二套视觉体系、无逐题明细表（OQ-5） |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（后端 / 前端 / E2E / openspec / Redocly） |
| E2 AI | Pass | 本报告证据层 + `docs/sdd/add-credit-recovery/p4-apply.md` |
| E3 Human | Pending | 待 VL 独立复核并在 G2 签署（本报告不代签） |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | 残余风险 | ⚠️（地图 E2E 既有债务 + E2E 不在 CI，见下） |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 全量 E2E 17 条失败（地图 `china-map` 未渲染），已用同 base 历史报告与「本 change 零改动地图」双向归因 | [fact] | `e2e/tests/map.spec.ts`、`e2e/tests/trips.spec.ts` | 由地图 owner 单独立项；本 change 不处理，也不改这些用例 |
| 2 | 契约 19 warning 中 #18–#19 来自提交端点刻意越界的 `invalid` 示例 | [fact] | `openapi.yaml`（`.../submission` 的 `examples.invalid`） | 刻意保留以演示 400；与既有 `trips/post` 的 `rejected` 示例同口径 |
| 3 | E2E 不在 CI（既有约定） | [fact] | `.github/workflows/ci.yml` | 沿用既有；本 change 的 `credit-learning.spec.ts` 由 P4 本地全量回归覆盖 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `support.ts` 已提供共用 `pickPlace`，`trips.spec.ts` 内同名本地实现仍用「回车」旧写法 | [fact] | `e2e/tests/support.ts`、`e2e/tests/trips.spec.ts` | 下次地图用例整改时一并替换，避免动 749 行既有用例（本轮不改） |
| 2 | 学习页续考依赖 `sessionStorage`，换设备 / 换标签页会丢失草稿 | [fact] | `frontend/src/credit/LearningPage.tsx` | 有意取舍（OQ-5 只存完成标记 + 结果）；如需可后续加服务端回放入口 |
| 3 | 本机 harness 对 Maven `-Dtest=<具体类名>` 偶发拦截 | [inference] | 本地命令 | 实际执行用通配（如 `-Dtest=CreditPublish*`）或全量 `test` |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | E2E 不在 CI（既有） | `ci.yml` 仅含后端 verify 与前端 build+test | 沿用既有约定；P4 本地全量回归 + 本 change 专用 spec 3/3 |
| 2 | 地图相关 E2E 失败（既有债务） | 同 base 上改动前同样失败；组件未渲染 | 归属地图 owner；本 change 未触碰地图 |
| 3 | 归档顺序依赖 | `openspec/specs/` 尚无 `user-credit` | MUST 排在 `add-credit-account` 之后归档 |
| 4 | 契约 / 迁移号位 | `0.16.0 + V22` 与在途 `add-ai-itinerary`（`0.15.0 + V21`）相邻 | 合并前复核 `add-ai-itinerary` 是否仍占用 `0.15.0 + V21` |
| 5 | 恢复入口可达性 | 入口仅「发布行程被拦截提示」（OQ-6 用户裁决） | 属产品裁决，非缺陷；如需常驻入口须另开 change |
| 6 | 开发库已迁移到 V22 | 本地启动自动跑 V18–V22 | 迁移可重放且幂等（`CreditLearningMigrationSqliteTest` 双路径覆盖） |

## Waiver

`N/A — no waiver`
