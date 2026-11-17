# REQ-024 — 安全学习恢复信用分（Ready 需求）

- **能力：** `user-credit`（ADDED Requirements；既有 Requirement 由未归档 `add-credit-account` 提供）
- **对应 OpenSpec change：** `add-credit-recovery`
- **草稿日期：** 2026-11-17 ｜ **状态：** P2 aligned（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** GitHub Issue [#32](https://github.com/afs-2026-zha3-group-2/RouteME/issues/32)「[P0] 安全学习恢复信用分」（Story 6 / 信用系统迭代 3 / 故事点 5 / 落点页面「安全学习页」）
- **证据：** `openspec/changes/add-credit-account/proposal.md`（out of scope 显式推迟「自动封禁 < 60」与「安全学习恢复」）；`RouteME/backend/src/main/java/routeme/service/CreditService.java`（`book(CreditBooking)` 已支持 `relatedType` / `relatedId` / `idempotencyKey`）；`RouteME/backend/src/main/resources/db/migration/V20__add_credit_account.sql`；`RouteME/backend/src/main/java/routeme/controller/TripController.java`（发布行程 `POST /api/trips`）

## Discovery Decision

**Go（light intake，2026-11-17）。** 能力边界单一：恢复与低分限制都归 `user-credit`；不新建 capability，不改 `user-credit` 既有 Requirement 语义。前置的扣分 / 加分事件（#29 / #30 / #31）与人工封禁不在本需求，Out of scope 显式列出。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-024 |
| statement | 系统 SHALL 允许信用分低于 60 的受限用户参加安全学习：从 20 题题库抽 10 题作答，答对 8 题及以上通过，通过后信用分 MUST 恢复至 60（不超 60）；每自然月 MUST 最多 2 次考试、最多 1 次成功恢复；恢复 MUST 以原因码 `SAFETY_LEARNING_RECOVERY` 写入信用记录并关联本次考试；信用分低于 60 时发布行程 MUST 被拒绝并返回 `CREDIT_SCORE_BELOW_60`，恢复至 60 后 MUST 自动放行。 |
| actors | 受限用户（信用分 < 60，参加学习与答题）；正常用户（≥ 60，无资格）；平台（出题、判分、记账、派生限制状态）。 |
| rationale | 信用账户与记账已在 `add-credit-account` 落地，但链路只到「看得见分数」：低于 60 没有任何自救通道，也没有限制拦截点。没有恢复段，扣分事件一旦上线，用户会被永久锁死。 |
| acceptance hints | 见 §4 场景 R-1 ~ R-27（资格、抽题与判分、恢复记账、月度次数与时区、展示一致、边界并发、低分拦截与解除）。 |
| links to evidence | 见 §6 Context 与 `openspec/changes/add-credit-recovery/specs/user-credit/spec.md`。 |

## 1. Intent

一句话：让被低分限制的用户有一条确定的自救路径——完成安全学习并答题通过，分数补到 60，发布行程立即恢复；同时把「低于 60 限制发布」这件事真正落地，让恢复有可验证的效果。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 受限用户（< 60） | 可开始考试（月内 2 次）、查看自己的学习进度与结果；不可自行改分；不可为他人发起考试。 |
| 正常用户（≥ 60） | 无参加资格；进入学习页只看到「当前无需恢复」。 |
| 未登录访客 | 无任何考试接口能力，沿用既有未登录错误。 |
| 管理员 | 不存在管理员角色与后台端点（题库维护、手工解封推迟 #23）。 |

## 3. In / Out scope

**In scope**

- 低分限制：`score < 60` 时 `POST /api/trips` 返回 `CREDIT_SCORE_BELOW_60`；恢复至 60 自动放行；其他功能不限制（D6）。
- 资格：仅 `< 60` 的已登录用户可开始考试；`≥ 60` 拒绝。
- 题库与判分：服务端资源文件 20 题，每次抽 10 题，覆盖旅行安全 / 陌生人同行 / 平台行为规范 / 隐私保护；答案不下发；答对 ≥ 8 通过（D2 / D7）。
- 学习完成校验：未完成学习内容不得提交作答。
- 恢复记账：经 `CreditService.book`，`delta = 60 - score_before`，原因码 `SAFETY_LEARNING_RECOVERY`，关联考试会话，展示文案「安全学习信用恢复」（D5）。
- 月度次数：每自然月最多 2 次考试、最多 1 次恢复，按 `Asia/Shanghai` 判定（D3 / D4）。
- 数据与契约：新增考试会话与作答记录；`openapi.yaml` 升次版本。
- 前端：安全学习页（题目、作答、结果、已恢复、无资格四态）与受限提示入口。

**Out of scope**

- 扣分 / 加分事件（#29 举报扣分、#30 获赞加分、#31 退出扣分）、自动封禁、月度加分上限。
- 人工封禁模型与解封（故事中「人工封禁不因学习解除」依赖封禁能力，见 OQ-8）。
- 管理后台与题库维护（#23）。
- 真实题库内容、AI 判题、学习时长统计、证书。
- 恢复超过 60、连续恢复奖励、申诉通道、明细对用户可见。
- 通知 / 推送 / 邮件；学习入口以外的低分提示。

## 4. Scenarios + AC hints（SHALL 式，可观察）

> **编号口径：** 本清单 27 条按主题分组编号（`R-23 / R-24 / R-25` 已并入 D / E 组，故非严格升序）；提案 §2 为 P1 定稿时的 25 条，`R-26` / `R-27` 为 P2 把 D4 时区口径与该提案 DoR #10 的边界要求落成可断言场景时新增。Delta Spec（7 Requirement / 29 Scenario）为唯一真相，`R-8` / `R-17` 在其中各拆为两条场景；映射见 `openspec/changes/add-credit-recovery/dov-ac-review.md`。

### A. 资格

1. **R-1 低于 60 可参加** — Given 信用分 45，When 打开安全学习页，Then SHALL 展示学习入口与题量，MUST NOT 提示无资格。
2. **R-2 达到 60 不可参加** — Given 信用分 60，When 打开学习页，Then SHALL 展示「当前无需恢复」与当前分数，MUST NOT 允许开始考试。
3. **R-3 未登录拒绝** — Given 无会话，When 调用考试接口，Then SHALL 返回既有未登录错误，MUST NOT 建会话。
4. **R-4 他人不可代办** — Given A 已登录而请求携带 B 的标识，When 发起考试，Then SHALL 只按 A 的身份操作，B 的分数与次数不变。

### B. 学习与答题

5. **R-5 题目与覆盖** — Given 受限用户开始考试，When 返回题目，Then SHALL 返回 10 题、来自 20 题题库抽取，并覆盖四类至少各一题。
6. **R-6 答案不下发** — Given 题目已下发，When 检查响应，Then MUST NOT 包含正确答案字段。
7. **R-7 学习完成后才能答题** — Given 未完成学习内容，When 提交作答，Then SHALL 拒绝并保留进度。
8. **R-8 提交返回逐题判定** — Given 完成学习并提交作答，When 判分完成，Then SHALL 返回每题对错与总判定，且只落一次结果。
9. **R-9 未通过可在次数内重试** — Given 未通过且次数未用尽，When 重新开始，Then SHALL 允许再次答题，MUST NOT 改变分数、MUST NOT 占用恢复次数。

### C. 恢复记账

10. **R-10 通过即恢复至 60** — Given 45 分且本月未恢复，When 答题通过，Then SHALL 变为 60，`applied_delta = +15`，记录等式成立。
11. **R-11 不超 60** — Given 59 分，When 通过，Then SHALL 为 60（+1），MUST NOT 出现 61 及以上。
12. **R-12 理由码与记录文案** — Given 一次成功恢复，When 查看信用记录，Then 原因码 SHALL 为 `SAFETY_LEARNING_RECOVERY`、关联指向本次会话、展示文案为「安全学习信用恢复」。
13. **R-13 幂等** — Given 同一会话已记账，When 重复提交，Then MUST NOT 再次改分、MUST NOT 产生第二条记录。

### D. 月度次数

14. **R-14 每自然月一次恢复** — Given 本月已恢复过，When 再次通过，Then SHALL 拒绝并返回可展示原因，分数不变。
15. **R-15 跨自然月可再次参加** — Given 上月已恢复、本月未参加，When 本月通过，Then SHALL 允许恢复。
16. **R-16 失败不占恢复次数** — Given 本月有未通过记录，When 随后通过，Then SHALL 正常恢复。
17. **R-24 月度考试次数用尽** — Given 本月已考 2 次均未通过，When 第 3 次开始，Then SHALL 拒绝并提示次月再试。
18. **R-26 月份边界按北京时间** — Given 北京时间 12-01 07:30（UTC 11-30 23:30）且 11 月已恢复，When 此时通过，Then SHALL 按 12 月允许恢复。

### E. 展示与限制解除

19. **R-17 恢复后展示同口径** — Given 恢复成功，When 打开个人主页 / 资料弹窗 / 行程卡，Then SHALL 展示「60 / 100 · 信用一般」。
20. **R-18 限制自动解除** — Given 恢复至 60，When 发布行程，Then MUST NOT 再被 `CREDIT_SCORE_BELOW_60` 拦截。
21. **R-23 发布行程被拦截** — Given 45 分，When 发布行程，Then SHALL 返回 `CREDIT_SCORE_BELOW_60` 并给出学习入口，MUST NOT 创建行程。
22. **R-25 恰好 60 不被拦截** — Given 恰为 60 分，When 发布行程，Then MUST NOT 返回该错误码。
23. **R-27 其他功能不限制** — Given 45 分，When 提交申请 / 聊天 / 改资料，Then MUST NOT 返回 `CREDIT_SCORE_BELOW_60`。

### F. 边界与异常

24. **R-19 0 分恢复** — Given 0 分，When 通过，Then SHALL 为 60（+60）。
25. **R-20 账户缺失** — Given 无信用账户，When 读取或开始考试，Then SHALL 按 80 建账户并判定无资格，MUST NOT 报错。
26. **R-21 用户不存在** — Given 不存在的用户，When 调用考试接口，Then SHALL 沿用 `USER_NOT_FOUND`。
27. **R-22 并发通过** — Given 两会话并发通过，When 记账执行，Then 只 SHALL 生效一次，分数 MUST NOT 超过 60。

## 5. Constraints

- **单一写分入口：** 恢复只经 `CreditService.book`；不新增第二条写分路径。
- **恢复是补到 60：** 实际变化量 = `60 - score_before`；`score ≥ 60` 不得进入恢复。
- **限制为派生状态：** 不建限制表、不加限制列；阈值只在一处实现（D1 / D6）。
- **次数真相分离：** 恢复次数看 `credit_ledger`，考试次数看考试会话；会话表不存分数（D3 / D5）。
- **时区：** 自然月按 `Asia/Shanghai` 计算（D4）。
- **题库：** 服务端资源文件 20 题、每次抽 10 题、答案不下发（D7）。
- **契约与迁移排他：** `openapi.yaml` 当前 `0.14.0`、Flyway 头 `V20`；`handoff.md` 已记 `add-ai-itinerary`（REQ-017）顺延 `0.15.0 + V21`，本变更不能直接用 V21，预计顺延 `0.19.0 + V25`，P3 按合并顺序排他确认。
- **前置依赖：** 能造成分数低于 60 的扣分事件（#29–#31）尚未实现；演示需造分。
- **原型缺口：** `docs/prototype` 无安全学习页，P3 先补截点。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 信用账户与记账已落地 | `V20__add_credit_account.sql`；`CreditService.book` |
| 记账已支持关联与幂等 | `CreditBooking` 的 `relatedType` / `relatedId` / `idempotencyKey` 入参 |
| 低分限制未实现 | 全仓 grep `CREDIT_SCORE_BELOW_60` → backend / frontend / openapi 0 命中 |
| 发布行程入口唯一 | `TripController.create`（`POST /api/trips`），会话经 `X-User-Id` + `demoUserService.require` |
| 错误码风格 | 每个异常一个 `BusinessException` 子类，带大写码值与 HTTP 状态（如 `TRIP_NOT_OPEN` + 409） |
| 事件类故事未落地 | Issue #29 / #30 / #31 均 open |
| 恢复被显式推迟 | `add-credit-account` proposal Out of scope |
| 原型无学习页 | `docs/prototype` grep `安全学习` → 0 命中 |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `user-credit` | ADDED Requirements | 7 个 Requirement / 29 Scenario |
| `trip-plans` | 依赖（同 change 内只读调用） | 发布行程入口新增低分校验，行程语义不变；Delta 不修改 `trip-plans` |
| `user-profile` / `user-profiles` | 依赖（未归档） | 展示沿用既有信用字段 |
| `admin`（不存在） | 不在本需求 | 题库维护、手工解封（#23） |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved（D1） | 低分限制由谁提供 | IO / SA | 本变更内落地，派生自 `score < 60` |
| blocking | resolved（D2） | 通过条件 | IO | 10 题答对 ≥ 8 题 |
| blocking | resolved（D3） | 考试 / 恢复次数 | IO | 每月 2 次考试、1 次恢复 |
| blocking | resolved（D4） | 自然月时区 | SA | `Asia/Shanghai` |
| blocking | resolved（D6） | 拦截哪些功能 | IO | 仅发布行程 |
| blocking | resolved（D7） | 题库形态与题量 | SA / Dev | 资源文件 20 题抽 10 |
| non-blocking | open | OQ-5 学习进度是否持久化（中途退出续答） | SA | 影响会话表字段 |
| non-blocking | open | OQ-6 页面路由与入口位置 | IO | P3 |
| non-blocking | deferred | OQ-7 契约版本号与迁移号 | Dev | P3 排他 |
| non-blocking | deferred | OQ-8 人工封禁与学习恢复的关系 | IO | 依赖 #23 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | 一句话可对外：低分用户学习答题通过后回到 60 分 |
| 2 Actors defined | Pass | 四个角色 + 权限边界 |
| 3 Scope bounded | Pass | In / Out 均非空，扣分事件与人工封禁显式排除 |
| 4 Scenarios concrete | Pass | 27 条，均含可观察结果 |
| 5 Exception / boundary | Pass | R-19 ~ R-22、R-24、R-26 |
| 6 Results verifiable | Pass | 分数、等式、原因码、次数拒绝均可断言 |
| 7 Dependencies / touchpoints | Pass | 发布行程入口、记账入口、契约与迁移排他均已列出 |
| 8 Open-questions gate | Pass | blocking 6 条全部 resolved；剩余 2 open + 2 deferred 有 owner |
| 9 Data contract decided | Pass | 题库形态、题量、次数、时区已定，可推会话表与 DTO |
| 10 Boundary enumerated | Pass | 0 分、缺账户、不存在用户、并发、次数用尽 |
| 11 Cross-REQ aligned | Pass | 与 #29–#31 分工：事件只写分，限制只在发布行程 |
| 12 Notification / display contract decided | Partial | 恢复后展示沿用既有口径；拦截提示文案与入口位置待 P3（OQ-6） |

**DoR 结论：** BLOCKER 0 / WARNING 1（展示入口位置待 P3）。可交 G1。
