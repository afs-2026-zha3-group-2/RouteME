# 意图捕获 — REQ-028 举报违规扣减信用分（issue #29）

- **候选能力：** `user-credit`（ADDED：举报违规扣分结算）+ `admin-console`（MODIFIED：举报处置表单与接口）
- **来源：** GitHub Issue [#29](https://github.com/afs-2026-zha3-group-2/RouteME/issues/29)「[P0] 举报违规扣减信用分」（`afs-2026-zha3-group-2/RouteME`，2026-11-18 读取）；Story 2 / 信用系统迭代 1 / 3 点；落点页面「举报详情页 / 用户信用记录」
- **捕获日期：** 2026-11-18 ｜ **记录人：** Lewis（SM，本 change 当前开发者）
- **分支：** `feature/add-report-credit-deduction`（独立 worktree，从 `origin/main@f0d093a` 切出）
- **编号说明：** REQ-019…REQ-027 已被既有 change 占用；本需求按登记顺序定为 **REQ-028**。故事按登记顺序顺延为 **S29**（S19 为信用系统 Story 1，S25–S28 已被退出扣分 / 安全学习故事占用）。
- **范围说明：** issue 只定义「举报成立 → 按违规类型扣分」。用户 2026-11-18 裁决定界：举报处置表单**只保留违规类型与违规原因，移除账号处罚动作与封禁理由选择**；扣分由服务端按类型自动计算，管理员不直接选扣分值（「其他原因」按 issue 原文选 -5/-10/-20/-30）；账号暂停 / 封禁仍走用户管理页（既有 S20 能力），不在举报页发起。

## 原始意图（一句话）

作为平台管理员，我希望在确认举报成立后选择违规类型并填写违规原因，由系统按规则自动扣减被举报用户的信用分，以便让违规行为真实影响平台信用，同时避免管理员手工决定处罚与分值。

## 为什么（价值假设）

信用账户、账本与记账服务已在 `add-credit-account` 落地，低分自动限制链路已在 `add-credit-exit-restriction` 落地，举报处置队列已在 `add-admin-console` 落地；但三条链目前互不相连：

- **扣分事件为空。** `credit_ledger` 只有体验获赞加分（`EXPERIENCE_LIKE`）、退出扣分与安全学习恢复（`SAFETY_LEARNING_RECOVERY`）等事件，举报核实没有任何写分路径；issue #29 / #30 / #31 在 `add-credit-recovery` 的前置依赖中被明确标为「仍 open」。
- **举报成立只改变账号状态。** `AdminReportServiceImpl.resolve` 的成立分支只执行 `SUSPEND / BAN / UPDATE_BAN`，`KEEP` 直接返回，不产生任何信用影响；举报违规与信用分完全脱钩。
- **管理员手工决定处罚。** 现有表单要求管理员选择处罚动作与 8 项封禁理由；issue #29 只把 8 类违规行为与固定扣分绑定，没有「管理员选处罚」的语义。

价值假设：**让「举报核实」第一次成为信用分的真实扣分事件**——管理员只对「违规事实与类型」负责，扣分与低分限制由系统按规则执行，形成「举报 → 核实 → 扣分 → 低分限制」的可观察闭环。

## 现状核对（2026-11-18，`origin/main@f0d093a`）

| 事实 | 证据 | 结论 |
|---|---|---|
| 举报处置状态机已落地 | `ReportStatusEnum`：`PENDING / PROCESSING / RESOLVED / REJECTED`；`AdminReportServiceImpl.start / resolve` | 扣分只需挂在 `resolve` 的成立分支 |
| 成立处置目前只做账号动作 | `AdminReportServiceImpl.applyPenalty`：`SUSPEND / BAN / UPDATE_BAN`；`KEEP` 直接返回 | 需要新增扣分路径并移除账号动作选择 |
| 8 类封禁理由与 issue 的 8 类违规行为同名 | `BanReasonEnum`：`HARASSMENT / FAKE_TRIP / FRAUD_RISK / ILLEGAL_CONTENT / IMPERSONATION / NO_SHOW_DISRUPTION / PRIVACY_LEAK / OTHER` | 违规类型可复用同一组码值（P3 定枚举归属），但语义从「封禁理由」转为「违规类型」 |
| 用户举报原因只有 4 类 | `ReportServiceImpl.REASONS = {harassment, fake, safety, other}` | 举报提交端不在本 change；不得把 4 类与 8 类混为一谈 |
| 信用账本与记账入口已落地 | `V20__add_credit_account.sql`；`CreditService.book(CreditBooking)`：0–100 裁断、前后快照、`related_type` / `related_id` / `idempotency_key`、零变化留痕 | 扣分直接复用，不新增写分路径 |
| 低分自动限制已落地 | `CreditEnforcementServiceImpl.onCreditChanged`：`scoreBefore >= 60 && scoreAfter < 60` → 建立限制并清退 | 举报扣分只需走 `CreditService.book`，限制自动触发（D3） |
| 体验获赞加分已有「月度上限」 | `add-experience-like-credit`：月度实发 ≤ +20（仅正向事件） | 扣分不受该上限影响；本 change 不新增扣分上限 |
| 管理端账号处置可独立执行 | 用户详情页 `StatusActionModal` + `AdminUserController`（暂停 / 封禁 / 更新封禁 / 恢复） | 从举报页移除处罚动作不会丢失账号处置能力 |
| 举报详情页已有处理历史区 | `AdminReportDetailPage`：处理人 / 处理时间 / 完成时间 / 处罚动作 / 处理结果 | 需把「处罚动作」改为「违规类型 + 本次扣分」，并补当前分数与预览 |
| 被举报用户推导唯一 | `ReportTargetService.reportedUserId(report)`：用户 = 本人、行程 = 发布者、体验 = 作者 | 扣分对象无需新增字段 |
| 契约与迁移头 | `openapi.yaml` `0.24.0`、Flyway 头 `V27__add_credit_learning.sql` | 迁移 / 契约号 P3 排他确认（预计 `V28` / `0.25.0`） |
| 原型无举报处置界面 | `docs/prototype` grep `举报` 仅命中用户侧入口与回执 | P3 先补管理端截点（`@rule:prototype-ui-alignment`） |

## 用户裁决（2026-11-18）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | 举报处置表单边界 | **只留违规类型（8 类）+ 违规原因**；移除处罚动作（`KEEP / SUSPEND / BAN / UPDATE_BAN`）与封禁理由选择；账号处置不再从举报页发起 | `admin-console` 的「举报处置与处罚」Requirement 需 MODIFIED；用户管理页能力保持 |
| D2 | 信用记录落点 | **仅后端账本**：`credit_ledger` 写记录并关联举报编号；不新增用户端 / 管理端信用明细页面 | 沿用 REQ-019 D2 与 REQ-023 D2「不做明细可见面」 |
| D3 | 低分联动 | 扣分后跌破 60 **沿用既有 `CreditChangedEvent` 自动限制链路**；本 change 只写分，不新增限制逻辑 | 与 `credit-enforcement` 的「跌破 60 自动触发」场景对齐 |
| D4 | 「其他原因」档位 | 选中 `OTHER` 时管理员再选 **-5 / -10 / -20 / -30**（issue 表格原文）；其余 7 类为系统固定值 | 请求需携带 `other_deduction`；仅 `OTHER` 必填 |
| D5 | 当前开发者 | **Lewis（SM）** | 阶段记录、工件签署与评审报告按此填写 |

## 意图边界

**覆盖：**

- 违规类型与扣分规则：8 类违规类型，7 类固定扣分（-10 / -15 / -30 / -20 / -20 / -10 / -30），`OTHER` 由管理员选 -5 / -10 / -20 / -30。
- 举报处置表单：成立时必选违规类型；填写违规原因（复用既有处理结果字段）；移除处罚动作与封禁理由。
- 处理前预览：举报详情页展示被举报用户「当前分数 → 本次扣分 → 处理后分数」，处理后分数按 0 截断。
- 扣分执行：仅在 `RESOLVED` 时执行；`REJECTED` 不扣分；同一举报最多扣一次；经 `CreditService.book` 写账本（原因码 + 关联举报 + 幂等键）。
- 报告留痕：报告记录违规类型与本次实际扣分；已处理详情可查看。
- 低分联动：跌破 60 自动触发既有自动限制；恰好 60 不触发。
- 账号处置解耦：举报页不再暂停 / 封禁账号；用户管理页能力不变。
- 数据与契约：`reports` 追加违规类型与扣分字段（P3 定稿）；`openapi.yaml` 升次版本。
- 前端：举报详情页表单、预览、处理历史与错误映射。

**不覆盖：**

- 用户举报提交端的原因枚举（仍为 4 类）与举报入口（S14）。
- 用户端 / 管理端信用记录明细展示、分数变化历史、申诉通道。
- 举报页的暂停 / 封禁 / 更新封禁 / 恢复动作（已从本页移除；用户管理页保留）。
- 月度扣分上限、重复违规累进、封禁时长规则。
- 其他扣分 / 加分事件（#30 获赞加分、#31 退出扣分、#32 安全学习恢复）。
- 通知 / 推送 / 邮件；自动封禁（< 60 限制由既有链路负责）。
- 历史已处理举报的补扣或重算（不回填）。

## 与现有 Living Spec / 能力的关系

- `user-credit`：本需求追加 ADDED Requirements（举报违规扣分结算）；不改写 `add-credit-account` 已定义的账户 / 账本 / 等级语义。**归档顺序约束：** `openspec/specs/` 下尚无 `user-credit`，本变更 MUST 排在 `add-credit-account` 之后归档。
- `admin-console`：本需求 MODIFIED「举报处置与处罚」相关 Requirement，把成立处置从「账号动作」改为「违规类型 + 扣分」；因其尚未归档（`openspec/specs/` 无 `admin-console`），本变更 MUST 排在 `add-admin-console` 之后归档。
- `credit-enforcement`：只消费既有 `CreditChangedEvent`，不改其 Delta 与限制规则（D3）。
- `trip-companions` / `trip-plans` / `trip-experiences`：举报对象推导与展示均为只读依赖，不改其语义。
- `user-auth`：仅用既有管理员会话校验（`AdminPrincipalService.requireAdmin`），不改登录 / 退出。

## Discovery Decision

`Go` — 候选能力可一句话说清（「举报核实成立 → 管理员选违规类型 → 系统自动扣分并触发低分限制」）；与既有能力边界明确（扣分归 `user-credit`，举报处置归 `admin-console`，限制归既有 `credit-enforcement`）；用户已裁决表单边界、记录落点、低分联动与其他原因档位；账号处罚与信用明细明确排除；无阻塞项。日期：2026-11-18。
