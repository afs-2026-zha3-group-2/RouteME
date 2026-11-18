# 变更提案：add-report-credit-deduction

- **需求来源：** GitHub Issue [#29](https://github.com/afs-2026-zha3-group-2/RouteME/issues/29)「[P0] 举报违规扣减信用分」（Story 2 / 信用系统迭代 1 / 3 点 / 落点 举报详情页 / 用户信用记录）｜ **需求条目：** `requirement-workspace/requirements/REQ-029-report-credit-deduction.md`（26 条验收场景）
- **能力：** `user-credit`（ADDED Requirements：举报违规扣分规则 / 记账与幂等 / 低分联动）+ `admin-console`（MODIFIED Requirements：举报详情与处理）；两者既有 Requirement 均由未归档 change 提供（`add-credit-account` / `add-admin-console`），本变更 MUST 晚于它们归档
- **规模：** S（1 个处置表单改造 + 1 条扣分记账 + 1 次迁移 + 契约升版；无新增端点）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:tdd-cycle`、`@rule:prototype-ui-alignment`
- **本回合状态：** P2 Delta 收敛完成（D1–D5）；Delta（`user-credit` ADDED 3 Requirement / 16 Scenario + `admin-console` MODIFIED 1 Requirement / 20 Scenario），`openspec validate add-report-credit-deduction --strict` → valid（仅有一处 INFO：`admin-console` 活规格尚未存在，归档阶段才校验）；未改业务代码。

## Why

信用账户、账本与记账服务已在 `origin/main` 落地（`V20__add_credit_account.sql`、`CreditService.book`），低分自动限制链路已在 `add-credit-exit-restriction` 落地（`CreditChangedEvent` → `credit_restriction`），举报处置队列已在 `add-admin-console` 落地（4 态 + 成立 / 不成立）。但三条链目前互不相连：

- **扣分事件为空。** `credit_ledger` 只有体验获赞加分（`EXPERIENCE_LIKE`）、退出扣分与安全学习恢复（`SAFETY_LEARNING_RECOVERY`）等事件，举报核实没有任何写分路径；`add-credit-recovery` 的前置依赖明确把 #29 标为「仍 open」。
- **举报成立只改变账号状态。** `AdminReportServiceImpl.resolve` 的成立分支只执行 `SUSPEND / BAN / UPDATE_BAN`，`KEEP` 直接返回，不产生任何信用影响；且管理员被要求手工选择处罚动作与 8 项封禁理由。
- **违规类型与扣分规则未落地。** issue 的 8 类违规行为与固定扣分只停留在文档；`BanReasonEnum` 有同名码值，但语义是「封禁理由」而非「举报违规类型」，两者尚未接到同一处置流程。

本变更做这条链的**扣分段垂直切片**：举报核实成立 → 管理员选违规类型 + 填违规原因 → 系统按规则扣分并写信用记录 → 跌破 60 时既有链路自动限制。账号处罚动作从举报页移除（用户管理页保留），信用明细页与通知不在本变更。

## What Changes

**In scope**

- **违规类型与扣分规则（`user-credit` ADDED）**：8 类违规类型；7 类固定扣分（-10 / -15 / -30 / -20 / -20 / -10 / -30）；`OTHER` 由管理员选 -5 / -10 / -20 / -30；扣分值由服务端派生，客户端不得指定任意分值。
- **举报处置表单（`admin-console` MODIFIED）**：成立时只选违规类型 + 填写违规原因；移除处罚动作（`KEEP / SUSPEND / BAN / UPDATE_BAN`）与封禁理由 / 解封时间；驳回不显示扣分信息。
- **处理前预览**：举报详情展示被举报用户「当前分数 → 本次扣分 → 处理后分数」，处理后分数按 0 截断。
- **扣分执行与记账**：仅 `RESOLVED` 执行；经 `CreditService.book` 写账本，`reason_code = REPORT_VIOLATION`、`related_type = REPORT`、`related_id = reportId`、幂等键 `REPORT_VIOLATION:<reportId>`；同一举报最多一次；0 分截断仍留一条零值记录。
- **报告留痕**：`reports` 追加 `violation_type` / `applied_deduction`（可空，兼容历史）；已处理详情展示违规类型与本次实际扣分。
- **低分联动**：只经既有 `CreditChangedEvent` 消费；跌破 60 自动限制 / 清退，恰好 60 不触发；不新增限制逻辑或第二张限制表。
- **账号处置解耦**：举报页 MUST NOT 改变账号状态；用户管理页的暂停 / 封禁 / 更新 / 恢复能力保持。
- **契约与前端**：`openapi.yaml` 升次版本；前端举报详情页表单、预览、处理历史与错误映射同步。
- **登记**：`stories.md` / `registry.md` / `handoff.md` 登记 REQ-029 → `add-report-credit-deduction`。

## Out of Scope

- 用户举报提交端的原因枚举（仍为 4 类 `harassment / fake / safety / other`）与举报入口（S14 / REQ-012）。
- 用户端 / 管理端信用记录明细页、分数变化历史、申诉通道（用户裁决 D2）。
- 举报页的暂停 / 封禁 / 更新封禁 / 恢复动作（用户裁决 D1；保留在用户管理页）。
- 月度扣分上限、重复违规累进、封禁时长规则、自动封禁（< 60 由既有链路负责）。
- 其他扣分 / 加分事件（#30 / #31 / #32）与通知 / 推送 / 邮件。
- 历史已处理举报的补扣或重算（不回填）。
- 引入第二套 UI 组件库或独立「信用中心」页面。

## Impact

| 位置 | 改动 |
|---|---|
| `backend/src/main/resources/db/migration/V31__report_credit_deduction.sql`（新增，号待 P3 排他） | `reports` 追加 `violation_type` / `applied_deduction`（可空，兼容历史）；不建新表 |
| 后端 `service/impl/AdminReportServiceImpl` | 成立分支改为「校验违规类型 → 计算扣分 → 条件更新报告 → `CreditService.book`」；移除 `applyPenalty` 与账号状态调用 |
| 后端 `request/AdminReportResolveRequest` | 字段改为 `outcome` / `violation_type` / `other_deduction` / `note`；移除 `action` / `ban_*` |
| 后端 `response/AdminReportDetailResponse` | 追加被举报用户当前信用分数与等级、违规类型、本次实际扣分（历史值可空） |
| 后端 `enums/` / `constant/` | 违规类型码值与扣分映射（唯一真相）；原因码 `REPORT_VIOLATION`；`OTHER` 档位集合 |
| 后端 `entity/` / `pojo/` | `ReportEntity` / `Report` 增加两个可空字段与映射 |
| `openapi.yaml` | 升次版本（当前 `0.24.0`）；`AdminReportResolveRequest` / `AdminReportDetailResponse` 调整；错误码沿用 `INVALID_INPUT` / `REPORT_NOT_FOUND` / `REPORT_NOT_PROCESSING` / `REPORT_NOT_PENDING` |
| `frontend/src/admin/reports/AdminReportDetailPage.tsx` | 成立表单改为违规类型 + `OTHER` 档位 + 违规原因；三分段预览；处理历史展示违规类型与本次扣分 |
| `frontend/src/admin/reports/reportActionForm.ts` | 校验规则：违规类型必选、`OTHER` 档位必选、移动作 / 封禁校验 |
| `frontend/src/types.ts` / `api.ts` / `i18n/adminMessages.ts` | 类型、请求体与文案同步；移除处罚动作 / 封禁字段 |
| `frontend/src/styles.css` | 预览三段与表单布局，沿用 `.admin-*` 与 design-system 令牌 |
| 文档 | `stories.md` / `registry.md` / `handoff.md` 登记；`docs/sdd/add-report-credit-deduction/` 阶段记录；P3 补管理端原型截点 |

## 已裁定决策（2026-11-18）

| 编号 | 决策 | 依据 |
|---|---|---|
| D1 | 举报处置只留违规类型 + 违规原因；移除处罚动作与封禁理由；账号处置仍走用户管理页 | 用户 2026-11-18 裁决（「不应该由用户选择处罚类型，用户应该选择违规类型，输入违规原因即可；具体处罚规则应该是系统后台进行处理」） |
| D2 | 信用记录只落账本并关联举报编号；不新增用户端 / 管理端信用明细页 | 用户 2026-11-18 裁决；与 REQ-019 D2 / REQ-023 D2 一致 |
| D3 | 低分联动沿用既有 `CreditChangedEvent` 自动限制 / 清退；本变更不新增限制逻辑 | 用户 2026-11-18 裁决；与 `credit-enforcement` 的「跌破 60 自动触发」场景对齐 |
| D4 | `OTHER` 由管理员在 -5 / -10 / -20 / -30 中选择；其余 7 类固定 | 用户 2026-11-18 裁决（issue 表格原文） |
| D5 | 当前开发者 = Lewis（SM） | 用户 2026-11-18 回答 |

## 关键设计取舍（待 P2 / P3 定稿）

- **扣分只经 `CreditService.book`：** 与体验获赞、退出扣分、安全学习恢复共用同一写分入口；不直接 `UPDATE user_credit_account`，保持账本可回算。
- **分值服务端派生：** 请求只传违规类型（`OTHER` 再传档位），不传 `delta`；即使客户端附带任意分值也必须被忽略。
- **报告留痕与账本分离：** `reports` 存「违规类型 + 实际扣分」，账本存「分数前后 + 关联」；双写在同一事务内，任一步失败整体回滚。
- **幂等双保险：** `reports.status` 条件更新（`PROCESSING → RESOLVED`）+ 账本幂等唯一索引；同一举报最多一条扣分记录。
- **账号动作彻底解耦（D1）：** 举报处置不再调用 `AccountStatusService`；用户管理页的 `StatusActionModal` 与 `AdminUserController` 保持不变，P4 需回归。
- **违规类型枚举归属：** 可复用 `BanReasonEnum` 码值或新建 `ReportViolationType`（OQ-1）；无论哪种，扣分映射只在一处定义。
- **被否决：** (1) 让管理员直接输入扣分值 —— 与「系统按规则处理」冲突；(2) 只在账本存违规类型（如 `REPORT_VIOLATION:HARASSMENT`）—— 报告详情查询与审计不便；(3) 把账号处罚动作保留为可选字段 —— 与 D1 冲突且会让同一举报出现两套处置语义。

## 1. Actors

| 角色 | 说明 |
|---|---|
| 平台管理员 | 开始处理、判定成立 / 不成立、选择违规类型（`OTHER` 再选档位）、填写违规原因；不可手工指定扣分值；不可从举报页暂停 / 封禁账号 |
| 被举报用户 | 扣分对象；可在既有信用展示面看到分数变化；低分时受既有自动限制 |
| 举报人 | 提交举报与查看回执；不参与处理 |
| 平台 | 计算扣分、记账、发布信用变化事件、触发既有低分限制 |

## 2. 场景（前置 / 操作 / 预期）

### A. 违规类型与计算

1. **R-1 七类固定扣分** — Given 举报 `PROCESSING`，When 管理员选择 `HARASSMENT / FAKE_TRIP / FRAUD_RISK / ILLEGAL_CONTENT / IMPERSONATION / NO_SHOW_DISRUPTION / PRIVACY_LEAK` 之一并确认成立，Then SHALL 分别扣减 10 / 15 / 30 / 20 / 20 / 10 / 30 分，扣分值由服务端派生。
2. **R-2 其他原因四档** — Given 管理员选择 `OTHER`，When 选择 -5 / -10 / -20 / -30 之一并确认成立，Then SHALL 按所选档位扣分；未选档位 MUST 返回 400 `INVALID_INPUT`，举报保持 `PROCESSING`、分数不变。
3. **R-3 违规类型必选** — Given 成立处理请求未携带违规类型，When 提交，Then SHALL 返回 400 `INVALID_INPUT`，举报状态与分数 MUST 不变。
4. **R-4 非法类型 / 非法档位** — Given 请求携带未知违规类型或 `OTHER` 之外的档位，When 提交，Then SHALL 返回 400 `INVALID_INPUT`，不扣分、不改变状态。
5. **R-5 扣分值不可由客户端指定** — Given 请求携带自定义扣分值，When 提交，Then 服务端 MUST 忽略该值并按违规类型派生扣分；账本 `applied_delta` MUST 等于派生值（或截断后的实际值）。

### B. 成立与幂等

6. **R-6 成立扣分并生成信用记录** — Given 被举报用户信用分 80、举报 `PROCESSING`，When 管理员选择「发布虚假行程信息」并确认成立，Then 举报 SHALL 变为 `RESOLVED`，分数 SHALL 变为 65，并生成一条信用记录，关联举报编号。
7. **R-7 不成立不扣分** — Given 举报 `PROCESSING`，When 管理员判定不成立（`REJECTED`），Then 举报 SHALL 变为 `REJECTED`，分数 MUST 不变，MUST NOT 生成信用记录。
8. **R-8 同一举报只扣一次** — Given 举报已 `RESOLVED`，When 再次提交处理，Then SHALL 返回 409 `REPORT_NOT_PROCESSING`，MUST NOT 产生第二次扣分或第二条记录。
9. **R-9 并发 / 重复提交只生效一次** — Given 两个请求并发处理同一举报，When 均通过状态校验，Then 只 SHALL 有一个成功；账本 MUST 只有一条该举报记录，分数 MUST 只变化一次。
10. **R-10 0 分截断仍留记录** — Given 被举报用户信用分 0，When 管理员选择需扣分的违规类型并确认成立，Then 分数 SHALL 保持 0，`applied_delta` SHALL 为 0，信用记录 MUST 仍生成一条并关联举报。

### C. 预览

11. **R-11 处理前预览三段** — Given 被举报用户当前 80 分、管理员选择扣 15 分的违规类型，When 打开成立处理表单，Then SHALL 展示「当前分数 80 → 本次扣分 15 → 处理后分数 65」。
12. **R-12 预览按 0 截断** — Given 当前 5 分、所选类型扣 10 分，When 查看预览，Then 处理后分数 SHALL 展示 0，并说明按 0 截断。
13. **R-13 不成立无扣分预览** — Given 管理员选择「不成立」，When 表单切换为驳回，Then MUST NOT 展示扣分预览与违规类型选择。

### D. 账本与留痕

14. **R-14 记录字段完整** — Given 一次成立扣分，When 读取信用记录，Then `reason_code` SHALL 为 `REPORT_VIOLATION`，`related_type` SHALL 为 `REPORT`，`related_id` SHALL 为举报编号，并包含变更前分数、实际变更量、变更后分数与发生时间。
15. **R-15 报告留痕** — Given 一次成立扣分，When 重新打开举报详情，Then SHALL 展示所选违规类型、本次实际扣分与处理人 / 处理时间；处罚动作字段 MUST NOT 作为新数据处理。
16. **R-16 不受月度加分上限影响** — Given 同一被举报用户在同一自然月已有多条扣分，When 再次成立扣分，Then 扣分 MUST 全额生效，MUST NOT 受体验获赞月度 +20 上限约束。
17. **R-17 账户缺失按初始分** — Given 被举报用户没有信用账户，When 处理成立，Then 系统 SHALL 先按初始 80 分建立账户，再执行扣分，MUST NOT 报错。

### E. 低分联动

18. **R-18 跌破 60 自动限制** — Given 被举报用户 80 分，When 成立扣分 30 分变为 50，Then SHALL 沿用既有链路自动建立信用限制，并按既有规则清退未结束行程 / 申请；本变更 MUST NOT 新增限制逻辑。
19. **R-19 恰好 60 不触发限制** — Given 70 分，When 成立扣分 10 分变为 60，Then MUST NOT 触发自动限制。
20. **R-20 已受限用户再次扣分** — Given 用户已处于自动限制中，When 新的举报成立并扣分，Then 分数 SHALL 继续扣减，限制记录 MUST NOT 重复建立，MUST NOT 重复清退。

### F. 表单解耦与回归

21. **R-21 表单只留违规类型与原因** — Given 管理员打开 `PROCESSING` 举报详情，When 选择「成立」，Then 表单 SHALL 只展示违规类型（含 `OTHER` 档位）与违规原因；MUST NOT 展示处罚动作（`KEEP / SUSPEND / BAN / UPDATE_BAN`）与封禁理由 / 解封时间。
22. **R-22 处置不再改变账号状态** — Given 被举报用户 `ACTIVE`，When 举报成立并完成扣分，Then 账号状态 MUST 保持 `ACTIVE`；即使请求携带历史处罚字段，MUST NOT 执行暂停 / 封禁。
23. **R-23 用户管理页能力不变** — Given 管理员打开用户详情页，When 执行暂停 / 封禁 / 更新封禁 / 恢复，Then 行为 MUST 与现状一致（既有 S20 能力回归）。

### G. 权限与边界

24. **R-24 非管理员拒绝** — Given 普通用户或无会话，When 调用举报处理接口，Then SHALL 分别返回 403 `FORBIDDEN` / 401 `UNAUTHORIZED`，MUST NOT 扣分。
25. **R-25 状态与存在性守卫** — Given 举报不存在或状态不是 `PROCESSING`，When 提交处理，Then SHALL 分别返回 404 `REPORT_NOT_FOUND` / 409 `REPORT_NOT_PROCESSING`，MUST NOT 扣分。
26. **R-26 被举报用户不可推导** — Given 举报对象无法推导出被举报用户，When 管理员确认成立，Then SHALL 返回可读错误（400 `INVALID_INPUT`），举报保持 `PROCESSING`，MUST NOT 扣分或写记录。

## 3. Constraints

- **单一写分入口：** 扣分只经 `CreditService.book`；不新增第二条写分路径。
- **服务端派生分值：** 扣分值由违规类型决定；`OTHER` 只接受 -5 / -10 / -20 / -30；客户端不得指定任意分值。
- **幂等键：** `REPORT_VIOLATION:<reportId>`；同一举报最多一条账本记录。
- **只扣分不封禁：** 举报处置 MUST NOT 改变账号状态；账号处置仍走用户管理页（D1）。
- **月度口径：** 扣分不受体验获赞月度 +20 上限影响；本变更不引入扣分月度上限。
- **低分限制：** 只经由既有 `CreditChangedEvent` 消费，不新增限制判定或第二张限制表（D3）。
- **记录可见性：** 信用记录只在账本与举报详情留痕；不新增用户端 / 管理端信用明细页（D2）。
- **契约与迁移排他：** `openapi.yaml` 当前 `0.24.0`、Flyway 头 `V29`；预计使用 `0.26.0` 与 `V31`，P3 按合并顺序排他确认。
- **历史不回填：** 已处理的举报不补扣、不重算。
- **原型缺口：** 管理端举报处置界面不在原型 v1 中；P3 先补截点（`@rule:prototype-ui-alignment`）。
- **归档顺序：** `admin-console` 与 `user-credit` 均未归档；本变更 MUST 排在 `add-admin-console` 与 `add-credit-account` 之后归档。

## 4. Context（证据）

| 事实 | 证据 |
|---|---|
| 举报状态机与处置入口 | `ReportStatusEnum`；`AdminReportController`；`AdminReportServiceImpl` |
| 成立分支目前只做账号动作 | `AdminReportServiceImpl.resolve` → `applyPenalty`（`SUSPEND / BAN / UPDATE_BAN`；`KEEP` 返回） |
| 8 类违规行为码值 | `BanReasonEnum`（`HARASSMENT` / `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` / `OTHER`） |
| 用户举报原因 | `ReportServiceImpl.REASONS = {harassment, fake, safety, other}` |
| 记账入口 | `CreditService.book(CreditBooking)`：0–100 裁断、前后快照、`related_type` / `related_id` / `idempotency_key`、零变化留痕 |
| 账本结构 | `V20__add_credit_account.sql`：`credit_ledger` + 幂等唯一索引 |
| 低分自动限制 | `CreditEnforcementServiceImpl.onCreditChanged`（`>= 60 → < 60` 触发；`< 60 → >= 60` 解除） |
| 账号处置可独立执行 | `AdminUserDetailPage` + `StatusActionModal` + `AdminUserController` |
| 当前契约 / 迁移头 | `openapi.yaml` `0.24.0`；`V29__credit_exit_application.sql` |
| 已处理举报记录 | `reports.resolution_action` / `resolution_note` / `processed_by` / `resolved_at` |

## 5. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `user-credit` | **ADDED Requirements** | 举报违规类型与扣分规则、记账 / 幂等 / 零值留痕、低分联动与月度上限不适用（Delta：`specs/user-credit/spec.md`） |
| `admin-console` | **MODIFIED Requirements** | 「举报详情与处理」：成立只选违规类型 + 违规原因；详情补当前分数 / 预览 / 违规类型与本次扣分；移除账号处罚语义（Delta：`specs/admin-console/spec.md`） |
| `credit-enforcement` | 依赖（只读消费） | `CreditChangedEvent` 自动限制 / 解除；不改其 Delta |
| `trip-plans` / `trip-companions` / `trip-experiences` | 依赖（只读） | 被举报用户推导（发布者 / 作者）；不改语义 |
| `user-auth` | 依赖（只读） | 管理员会话校验；不改语义 |

## 6. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | **resolved（D1）** | 表单只留违规类型、移除处罚动作 | IO / SA | 2026-11-18 用户裁决 |
| blocking | **resolved（D2）** | 信用记录只落账本、不做明细页 | IO | 2026-11-18 用户裁决 |
| blocking | **resolved（D3）** | 低分联动沿用既有自动限制 | SA | 2026-11-18 用户裁决 |
| blocking | **resolved（D4）** | `OTHER` 由管理员选 -5/-10/-20/-30 | IO | 2026-11-18 用户裁决 |
| non-blocking | open | OQ-1 违规类型枚举命名与归属（复用 `BanReasonEnum` 或新建 `ReportViolationType`） | Dev | P3 |
| non-blocking | open | OQ-2 报告字段命名（`violation_type` / `applied_deduction`）与是否保留 `resolution_action` 历史值 | Dev | P3 |
| non-blocking | open | OQ-3 已处理详情是否展示违规原因全文与处理结果分行 | IO | P3 / 原型 |
| non-blocking | deferred | OQ-4 契约版本号与迁移号 | Dev | P3 排他 |
| non-blocking | deferred | OQ-5 举报列表是否展示违规类型列 | IO | 默认不展示，最小改动 |

## 7. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | §Why 一句话可对外：举报核实成立 → 选违规类型 → 系统自动扣分 |
| 2 Actors defined | Pass | §1 四个角色 + 权限边界 |
| 3 Scope bounded | Pass | §What Changes / §Out of Scope 均非空；账号处置与信用明细显式排除 |
| 4 Scenarios concrete | Pass | §2 共 26 条，均含可观察结果（分值、状态、记录字段） |
| 5 Exception / boundary | Pass | R-10、R-12、R-17、R-24 ~ R-26 |
| 6 Results verifiable | Pass | 分值、状态、账本字段、幂等与预览均可断言 |
| 7 Dependencies / app-arch touchpoints | Pass | §3 契约与迁移排他；§5 能力表 |
| 8 Open-questions gate | Pass | blocking 4 条全部 resolved；非阻塞 3 open + 2 deferred 有 owner |
| 9 Data contract decided | Pass | 违规类型、扣分规则、账本关联、幂等键已定；字段命名留 P3 |
| 10 Boundary enumerated | Pass | 0 分、账户缺失、已受限、并发、不可推导、状态守卫 |
| 11 Cross-REQ aligned | Pass | 与 #30 / #31 / #32 分工：本变更只做举报扣分事件与处置解耦 |
| 12 Notification / display contract decided | Pass | 举报详情预览与留痕已定；信用展示沿用既有五展示面；无新增通知（表单布局 / 文案属 P3，Ready 条目按更严口径记 Partial WARNING） |

**DoR 结论：** BLOCKER 0 / WARNING 0。可进 P2（Delta 收敛 + G1）。

## 8. 残余风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| `admin-console` 未归档 | MODIFIED Delta 在归档阶段会被拒绝 | 归档 MUST 排在 `add-admin-console` 之后；P2 记录该约束 |
| 移除处罚动作改变已交付 S22 行为 | 与既有举报处置语义不同 | D1 已裁决；P2 G1 SA 追认；P4 回归用户管理页暂停 / 封禁 |
| `resolution_action` 历史数据与新语义共存 | 旧举报仍显示历史动作 | 新值不再写入；旧值只读展示；不回填 |
| 预览与实际截断不一致 | 管理员误解实际扣分 | 预览以服务端响应为准；E2E 断言 5 → -10 → 0 |
| 并发 resolve 双重扣分 | 重复扣分 | 状态条件更新 + 账本幂等唯一索引双保险；单测覆盖 |
| 契约 / 迁移号撞号 | 合并冲突 | P3 排他确认；预计 `0.26.0` + `V31` |
| 管理端原型缺失 | 视觉无法对照 | P3 先补截点；只复用现有 `.admin-*` 令牌 |
