# 意图捕获 — REQ-026 安全学习恢复信用分（issue #32）

- **候选能力：** `user-credit`（ADDED Requirements，追加恢复段）
- **来源：** GitHub Issue [#32](https://github.com/afs-2026-zha3-group-2/RouteME/issues/32)「[P0] 安全学习恢复信用分」（`afs-2026-zha3-group-2/RouteME`，2026-11-17 读取）；Story 6 / 信用系统迭代 3 / 5 点；落点页面「安全学习页」
- **捕获日期：** 2026-11-17 ｜ **记录人：** Qoder（当前开发者）
- **分支：** `feature/add-credit-recovery`（从 `origin/main@ec360dc` 切出；`docs/prototype` 的 6 处 WIP 改动已 stash 为 `wip-prototype-before-credit-recovery`，未带入本分支）
- **编号说明：** REQ-019 由 `add-credit-account` 占用、REQ-020 由并行 `refine-detail-companions` 预留、REQ-021 为 `add-trip-cancel`，REQ-022 / S22 由 `add-trip-weather` 占用，REQ-023 / 0.18.0 / V24 由同步 `origin/main` 时的 `add-experience-like-credit` 占用；本需求按「后到者顺延」最终登记为 **REQ-026**。
- **范围说明：** #32 的故事把「因信用分低于 60 被限制」当作既成前提，但该限制在代码里并不存在（`CREDIT_SCORE_BELOW_60` 全仓 0 命中）。用户 2026-11-17 裁定（OQ-1）：**限制端在本变更内一并落地**，否则「恢复」不可验证。

## 原始意图（一句话）

作为因信用分低于 60 而被限制发布行程的用户，我希望通过完成安全学习并答题通过，把信用分补回 60 并立即恢复发布行程的能力，以便在不依赖人工申诉的情况下重新参与旅行社交。

## 为什么（价值假设）

信用账户、五档等级、账本与记账服务已在 `add-credit-account` 落地，但整条链只走到「看得见分数」：分数一旦掉到 60 以下，用户没有任何自救手段，也没有任何拦截点让「低分」产生实际后果。

- **恢复端为空。** 没有学习会话、没有题库、没有 `SAFETY_LEARNING_RECOVERY` 这类 reason code（migration 与 backend 全仓 grep `learning` 0 命中）。
- **限制端不存在。** `CREDIT_SCORE_BELOW_60` 只出现在文档，`app_users` 无封禁列、无限制表、无拦截点；`add-credit-account` 把「自动封禁（< 60）」显式列为 out of scope。
- **前置事件未落地。** 能造成扣分的故事 #29（举报扣分）/ #31（退出扣分）与加分 #30 仍 open，当前没有任何生产路径会把用户送到 60 以下。

价值假设：**给低分用户一条确定、可验证、有次数上限的自救路径，并让「低分限制」第一次成为可观察行为**——这样后续扣分事件上线时，用户不会因为一次扣分被永久锁死。

## 现状核对（2026-11-17，`origin/main@ec360dc`）

| 事实 | 证据 | 结论 |
|---|---|---|
| 信用账户与账本已落地 | `V20__add_credit_account.sql`（`user_credit_account` / `credit_ledger` + `ix_credit_ledger_user_time`） | 恢复可直接复用账户与账本 |
| 记账入口唯一且支持关联与幂等 | `CreditBooking(userId, reasonCode, delta, relatedType, relatedId, idempotencyKey)`；`CreditService.book` | 恢复不必新开写分路径 |
| 分数区间与初始分 | `UserCredit`：`MIN 0` / `MAX 100` / `INITIAL_SCORE 80` | 恢复上界 60 落在合法区间内 |
| 等级阈值 | `CreditLevel`：excellent 90 / good 80 / fair 60 / low 30 / risk 0 | 恢复至 60 恰好落到「信用一般」 |
| 考试能力完全不存在 | backend `*.java` 与 `db/migration/*.sql` grep `learning` → 0 命中 | 需新增会话 / 作答表与题库资源 |
| 低分限制未实现 | 全仓 grep `CREDIT_SCORE_BELOW_60` → 仅文档命中 | 需新增错误码与拦截点（用户裁定 D1） |
| 发布行程入口唯一 | `TripController.create`（`POST /api/trips`）+ `demoUserService.require(userId)` | 拦截点只需一处（D6） |
| 错误码风格 | 每个异常一个 `BusinessException` 子类，例：`TRIP_NOT_OPEN` + `HttpStatus.CONFLICT` | `CREDIT_SCORE_BELOW_60` 按同风格实现 |
| 展示口径已有统一封装 | 前端 `creditDisplay.ts`（`normalizeCreditLevel` / `normalizeCreditScore`）；展示面 5 处 | 恢复后自然显示 60，不需改语义 |
| 契约与迁移头 | `openapi.yaml` `0.14.0`、Flyway 头 `V20__add_credit_account.sql` | P3 排他确认（V21 已归 `add-ai-itinerary`） |
| 原型无学习页 | `docs/prototype/*.html|*.js` grep `安全学习` → 0 命中 | P3 先补原型截点 |

## 用户裁决（2026-11-17）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | 低分限制由谁提供 | **本变更内落地**：`score < 60` 派生受限，在选择拦截面返回 `CREDIT_SCORE_BELOW_60`，恢复至 60 自动放行 | 需新增错误码 + 拦截点；不建限制表 |
| D2 | 答题通过条件 | **10 题，答对 ≥ 8 题**（原话「答对 8 题以上」，按含 8 题执行） | 题库至少 10 题；判分线固定 |
| D3 | 考试与恢复次数 | **每自然月最多 2 次考试**（通过与否都计次）、**最多 1 次成功恢复** | 两条配额真相：考试看会话、恢复看账本 |
| D4 | 自然月时区 | **`Asia/Shanghai`** | 月份边界必须按 UTC+8 判定，不能用 UTC |
| D5 | 恢复记账路径 | 只经 `CreditService.book`，`delta = 60 - score_before`，配额从 `credit_ledger` 派生 | 不新增写分入口、不建计数表 |
| D6 | 拦截哪些功能 | **仅「发布行程」**；提交申请 / 聊天 / 改资料不限制 | 拦截点一处，Delta 需显式写「其他功能不限制」 |
| D7 | 题库形态与题量 | **服务端资源文件，共 20 题，每次抽 10 题** | 题目与答案都在服务端，前端只拿题干与选项 |

## 意图边界

**覆盖：**

- 低分限制：`score < 60` 时 `POST /api/trips` 返回 `CREDIT_SCORE_BELOW_60`；恢复至 60 自动放行；其余功能不限制（D1 / D6）。
- 资格：仅 `< 60` 的已登录用户可开始考试；`≥ 60` 拒绝并返回可展示原因；只能操作本人。
- 题库与判分：服务端 20 题抽 10 题，覆盖旅行安全 / 陌生人同行 / 平台行为规范 / 隐私保护四类；答案不下发；答对 ≥ 8 通过（D2 / D7）。
- 学习完成校验：未完成学习内容不得提交作答。
- 恢复记账：经 `CreditService.book`，`delta = 60 - score_before`，reason code `SAFETY_LEARNING_RECOVERY`，`relatedType` / `relatedId` 指向本次会话，展示文案「安全学习信用恢复」（D5）。
- 月度次数：每自然月 2 次考试 / 1 次恢复，按 `Asia/Shanghai` 判定（D3 / D4）。
- 恢复后展示：五个既有展示面同口径显示「60 / 100 · 信用一般」。
- 数据与契约：新增考试会话与作答记录；`openapi.yaml` 升次版本。
- 前端：安全学习页（作答 / 结果 / 已恢复 / 无资格四态）与受限提示入口。

**不覆盖：**

- 扣分 / 加分事件（#29 举报扣分、#30 获赞加分、#31 退出扣分）、自动封禁、月度加分上限。
- 人工封禁模型与解封（故事中「人工封禁不因学习解除」依赖封禁能力，OQ-8 deferred）。
- 管理后台与题库维护（#23）。
- 真实题库内容生产、AI 判题、学习时长统计、证书。
- 恢复超过 60、连续恢复奖励、申诉通道、分数明细对用户可见。
- 通知 / 推送 / 邮件；学习入口以外的低分提示。

## 与现有 Living Spec / 能力的关系

- `user-credit`：本需求只追加 ADDED Requirements，不改写 `add-credit-account` 已定义语义（账户、初始分、五档、账本）。**归档顺序约束：** `openspec/specs/` 下尚无 `user-credit`，本变更 MUST 在 `add-credit-account` 归档之后归档。
- `trip-plans`：只在「发布行程」入口消费低分判定，行程语义、状态机与列表规则不变；Delta 不修改 `trip-plans`。
- `user-profile` / `user-profiles`：只读消费既有信用字段，恢复后自然显示 60，无需改语义。
- `user-auth`：仅用既有登录态（`X-User-Id` + `demoUserService.require`），不改「注册账号」Requirement。

## Discovery Decision

`Go` — 候选能力可一句话说清（「低分用户完成安全学习并答题通过后，信用分补回 60 并自动解除发布行程的限制」）；与既有能力边界明确（恢复归 `user-credit`，拦截只占 `POST /api/trips` 一处）；用户已裁决限制范围、通过线、次数、时区、题库形态；扣分事件与人工封禁明确排除；无阻塞项。日期：2026-11-17。
