# REQ-028 — 举报违规扣减信用分（Ready 需求）

- **能力：** `user-credit`（ADDED Requirements：举报违规扣分结算）+ `admin-console`（MODIFIED Requirements：举报处置表单与接口）
- **对应 OpenSpec change：** `add-report-credit-deduction`
- **草稿日期：** 2026-11-18 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** GitHub Issue [#29](https://github.com/afs-2026-zha3-group-2/RouteME/issues/29)「[P0] 举报违规扣减信用分」（Story 2 / 信用系统迭代 1 / 故事点 3 / 落点页面「举报详情页 / 用户信用记录」）
- **证据：** `RouteME/backend/src/main/java/routeme/service/impl/AdminReportServiceImpl.java`（`start` / `resolve` / `applyPenalty`）；`RouteME/backend/src/main/java/routeme/enums/BanReasonEnum.java`（8 项码值）；`RouteME/backend/src/main/java/routeme/service/impl/CreditServiceImpl.java`（`book`）；`RouteME/backend/src/main/resources/db/migration/V20__add_credit_account.sql`；`RouteME/backend/src/main/java/routeme/service/impl/CreditEnforcementServiceImpl.java`（`onCreditChanged`）；`openspec/changes/add-admin-console/specs/admin-console/spec.md`（举报队列 / 处置 Requirement）

## Discovery Decision

**Go（light intake，2026-11-18）。** 能力边界清楚：举报处置归 `admin-console`，扣分结算归 `user-credit`，低分限制归既有 `credit-enforcement`；不新建 capability。用户已裁决表单边界、记录落点、低分联动与「其他原因」档位；账号处罚与信用明细明确排除。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-028 |
| statement | 系统 SHALL 在管理员确认举报成立（`RESOLVED`）时，按所选违规类型自动计算并扣减被举报用户信用分：7 类固定扣分，`OTHER` 由管理员在 -5 / -10 / -20 / -30 中选择；扣分 MUST 经统一记账服务写入账本并关联举报编号，同一举报 MUST 最多产生一次扣分；`REJECTED` MUST NOT 扣分；处理后分数 MUST 截断为 0–100（最低 0）；举报处置 MUST NOT 再改变账号状态。 |
| actors | 平台管理员（处理举报、选择违规类型、填写违规原因）；被举报用户（扣分对象）；平台（计算扣分、记账、触发低分限制）。 |
| rationale | 信用账户、账本、低分限制与举报队列均已落地，但举报核实没有任何写分路径；举报成立只改变账号状态，违规与信用完全脱钩。 |
| acceptance hints | 见 §4 场景 R-1 ~ R-26（类型与计算、成立与幂等、预览、账本与留痕、低分联动、表单解耦、权限与边界）。 |
| links to evidence | 见 §6 Context 与 `openspec/changes/add-report-credit-deduction/specs/`。 |

## 1. Intent

一句话：举报核实成立时，管理员只对「违规类型与违规原因」负责；系统按类型自动扣分、写信用记录并联动低分限制，让违规第一次真实影响平台信用。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 平台管理员 | 可开始处理、判定成立 / 不成立、选择 8 类违规类型（`OTHER` 再选档位）、填写违规原因；不可手工指定扣分值；不可从举报页暂停 / 封禁账号。 |
| 被举报用户 | 扣分对象；可在既有信用展示面看到分数变化；不可自行改分；低分时受既有自动限制。 |
| 举报人 | 仅提交举报与查看回执；不参与处理，不感知扣分结果。 |
| 未登录 / 普通用户 | 无管理端处置能力（401 / 403）。 |

## 3. In / Out scope

**In scope**

- 违规类型与扣分规则：8 类违规类型；7 类固定扣分；`OTHER` 由管理员选 -5 / -10 / -20 / -30（D4）。
- 举报处置表单：成立时必选违规类型；填写违规原因（复用既有处理结果字段）；移除处罚动作与封禁理由（D1）。
- 处理前预览：被举报用户「当前分数 → 本次扣分 → 处理后分数」，处理后分数按 0 截断。
- 扣分执行：仅 `RESOLVED`；同一举报最多一次；经 `CreditService.book` 写账本（原因码 `REPORT_VIOLATION`、关联举报、幂等键）。
- 报告留痕：报告记录违规类型与本次实际扣分；已处理详情可查看。
- 低分联动：跌破 60 自动触发既有自动限制；恰好 60 不触发（D3）。
- 账号处置解耦：举报页不再暂停 / 封禁账号；用户管理页能力不变。
- 数据与契约：`reports` 追加违规类型与扣分字段（P3 定稿）；`openapi.yaml` 升次版本。
- 前端：举报详情页表单、预览、处理历史与错误映射。

**Out of scope**

- 用户举报提交端的原因枚举（仍为 4 类）与举报入口（S14 / REQ-012）。
- 用户端 / 管理端信用记录明细页、分数变化历史、申诉通道（D2）。
- 举报页的暂停 / 封禁 / 更新封禁 / 恢复动作（从本页移除；用户管理页保留）。
- 月度扣分上限、重复违规累进、封禁时长规则、自动封禁（< 60 由既有链路负责）。
- 其他扣分 / 加分事件（#30 / #31 / #32）。
- 通知 / 推送 / 邮件。
- 历史已处理举报的补扣或重算（不回填）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 违规类型与计算

1. **R-1 七类固定扣分** — Given 举报处于 `PROCESSING`，When 管理员选择 `HARASSMENT / FAKE_TRIP / FRAUD_RISK / ILLEGAL_CONTENT / IMPERSONATION / NO_SHOW_DISRUPTION / PRIVACY_LEAK` 之一并确认成立，Then SHALL 分别扣减 10 / 15 / 30 / 20 / 20 / 10 / 30 分（issue 表格），扣分值 MUST 由服务端按类型派生。
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
12. **R-12 预览按 0 截断** — Given 当前 5 分、所选类型扣 10 分，When 查看预览，Then 处理后分数 SHALL 展示 0，并 MUST 说明按 0 截断。
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

## 5. Constraints

- **单一写分入口：** 扣分只经 `CreditService.book`；不新增第二条写分路径。
- **服务端派生分值：** 扣分值由违规类型决定；`OTHER` 只接受 -5 / -10 / -20 / -30 固定档位；客户端不得指定任意分值。
- **幂等键：** `REPORT_VIOLATION:<reportId>`；同一举报最多一条账本记录。
- **只扣分不封禁：** 举报处置 MUST NOT 改变账号状态；账号处置仍走用户管理页（D1）。
- **月度口径：** 扣分不受体验获赞月度 +20 上限影响；本 change 不引入扣分月度上限。
- **低分限制：** 只经由既有 `CreditChangedEvent` 消费，不新增限制判定或第二张限制表（D3）。
- **记录可见性：** 信用记录只在账本与举报详情留痕；不新增用户端 / 管理端信用明细页（D2）。
- **契约与迁移排他：** `openapi.yaml` 当前 `0.24.0`、Flyway 头 `V27`；预计本变更使用 `0.25.0` 与 `V28`，P3 按合并顺序排他确认。
- **历史不回填：** 已处理的举报不补扣、不重算。
- **原型缺口：** 管理端举报处置界面不在原型 v1 中；P3 先补截点（`@rule:prototype-ui-alignment`）。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 举报状态机与处置入口 | `ReportStatusEnum`；`AdminReportController`（`POST /api/admin/reports/{id}/start`、`/resolve`）；`AdminReportServiceImpl` |
| 成立分支目前只做账号动作 | `AdminReportServiceImpl.resolve` → `applyPenalty`（`SUSPEND / BAN / UPDATE_BAN`；`KEEP` 返回） |
| 8 类违规行为码值 | `BanReasonEnum`（`HARASSMENT` / `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` / `OTHER`） |
| 用户举报原因 | `ReportServiceImpl.REASONS = {harassment, fake, safety, other}` |
| 记账入口 | `CreditService.book(CreditBooking)`：0–100 裁断、前后快照、`related_type` / `related_id` / `idempotency_key`、零变化留痕 |
| 账本结构 | `V20__add_credit_account.sql`：`credit_ledger` + 幂等唯一索引 |
| 低分自动限制 | `CreditEnforcementServiceImpl.onCreditChanged`（`>= 60 → < 60` 触发；`< 60 → >= 60` 解除） |
| 账号处置可独立执行 | `AdminUserDetailPage` + `StatusActionModal` + `AdminUserController` |
| 当前契约 / 迁移头 | `openapi.yaml` `0.24.0`；`V27__add_credit_learning.sql` |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `user-credit` | ADDED Requirements | 举报违规扣分规则、记账、幂等、零值留痕、月度上限不适用 |
| `admin-console` | MODIFIED Requirements | 举报处置表单与接口：违规类型 + 违规原因；移除账号处罚动作与封禁字段；详情展示当前分数 / 预览 / 违规类型与扣分 |
| `credit-enforcement` | 依赖（只读消费） | `CreditChangedEvent` 自动限制 / 解除；不改其 Delta |
| `trip-plans` / `trip-companions` / `trip-experiences` | 依赖（只读） | 被举报用户推导（发布者 / 作者）；不改语义 |
| `user-auth` | 依赖（只读） | 管理员会话校验；不改语义 |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved（D1） | 表单只留违规类型、移除处罚动作 | IO / SA | 2026-11-18 用户裁决 |
| blocking | resolved（D2） | 信用记录只落账本、不做明细页 | IO | 2026-11-18 用户裁决 |
| blocking | resolved（D3） | 低分联动沿用既有自动限制 | SA | 2026-11-18 用户裁决 |
| blocking | resolved（D4） | `OTHER` 由管理员选 -5/-10/-20/-30 | IO | 2026-11-18 用户裁决 |
| non-blocking | open | OQ-1 违规类型枚举命名与归属（复用 `BanReasonEnum` 或新建 `ReportViolationType`） | Dev | P3 |
| non-blocking | open | OQ-2 报告字段命名（`violation_type` / `applied_deduction`）与是否保留 `resolution_action` 历史值 | Dev | P3 |
| non-blocking | open | OQ-3 已处理详情是否展示违规原因全文与处理结果分行 | IO | P3 / 原型 |
| non-blocking | deferred | OQ-4 契约版本号与迁移号 | Dev | P3 排他 |
| non-blocking | deferred | OQ-5 举报列表是否展示违规类型列 | IO | 默认不展示，最小改动 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | 一句话可对外：举报核实成立 → 选违规类型 → 系统自动扣分 |
| 2 Actors defined | Pass | 管理员 / 被举报用户 / 举报人 / 未登录，权限边界清楚 |
| 3 Scope bounded | Pass | In / Out 均非空；账号处置与信用明细显式排除 |
| 4 Scenarios concrete | Pass | 26 条，均含可观察结果（分值、状态、记录字段） |
| 5 Exception / boundary | Pass | R-10、R-12、R-17、R-24 ~ R-26 |
| 6 Results verifiable | Pass | 分值、状态、账本字段、幂等与预览均可断言 |
| 7 Dependencies / touchpoints | Pass | 举报处置、记账、低分限制、账号处置解耦、契约 / 迁移排他已列出 |
| 8 Open-questions gate | Pass | blocking 4 条全部 resolved；非阻塞 3 open + 2 deferred 有 owner |
| 9 Data contract decided | Pass | 违规类型、扣分规则、账本关联、幂等键已定；字段命名留 P3 |
| 10 Boundary enumerated | Pass | 0 分、账户缺失、已受限、并发、不可推导、状态守卫 |
| 11 Cross-REQ aligned | Pass | 与 #30 / #31 / #32 分工：本 change 只做举报扣分事件与处置解耦 |
| 12 Notification / display contract decided | Partial | 举报详情预览与留痕已定；表单布局 / 文案待 P3（OQ-3） |

**DoR 结论：** BLOCKER 0 / WARNING 1（表单布局与文案待 P3）。可交 proposal-split。
