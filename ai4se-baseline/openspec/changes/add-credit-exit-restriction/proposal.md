# 变更提案：add-credit-exit-restriction

- **需求来源：** 用户 P0 卡片「[P0] 退出同行扣减信用分」Story 4（信用系统迭代 2 / 5 点）与 Story 5（信用系统迭代 3 / 3 点）｜ **需求条目：** `requirement-workspace/requirements/REQ-025-exit-credit-restriction.md`
- **能力：** `credit-enforcement`（**ADDED**）；依赖 `user-credit`（账户 / 账本）、`trip-companions`（退出 / 申请）、`trip-cancellation`（取消，未归档）、`trip-plans`（状态）、`trip-experiences`（体验）、`user-profile` / `user-profiles`（展示面）
- **规模：** M（新增 1 个能力 / 9 组 Requirement / 46 Scenario；新增 `V25` 迁移 + 契约 0.20.0；退出三入口 + 五个展示面 + 限制守卫 + 自动清理）
- **规则：** `@rule:spec-first`、`@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:prototype-ui-alignment`、`@rule:sdd-artifacts`

## Why

RouteME 已经有信用账户与账本（REQ-019），也有退出同行、取消行程、申请与体验，但信用分至今是「只看不用」：退出同行是一键退出、零成本；信用分跌到再低也不会改变任何能力。平台希望用可解释、可回算的信用后果降低临时退出与低信用用户带来的社交风险。本变更把「退出同行」接上信用扣分，并在分数低于 60 时自动限制账号，形成一条可验收的信用执行链。

## What Changes

- **退出同行增加原因与告知**：三个入口（详情 / 我的旅行 / 聊天）统一要求选择个人原因 / 不可抗力 / 安全原因，确认前展示服务端计算的预计信用影响；确认时重新校验并以实扣为准。
- **退出扣分**：出发前 7 天以上 0；[3 天, 7 天) -3；[24 小时, 3 天) -5；[12 小时, 24 小时) -8；[0, 12 小时) -10；旅行中 -15；同月第 2 次及之后的出发前退出翻倍（-6 / -10 / -16 / -20）；旅行中不翻倍。
- **时间基准**：`meeting_time` 有值时以它为「出发」；否则 `start_date` 00:00（Asia/Shanghai）。
- **待核实**：不可抗力 / 安全原因暂不扣分，写零值信用记录并标记待核实；本 change 不做管理端，待核实保持 pending；未来核实为真不扣分、为不属实按实际退出时间补扣并取下一序号。
- **信用限制**：分数 <60 自动建立限制记录（`CREDIT_SCORE_BELOW_60`）；受限账号只读（保留查看、聊天历史、举报 / 安全入口）；触发时自动撤回全部待处理申请、解除全部未结束的已接受同行关系、自动取消全部未结束的已发布行程；系统清退不扣分、不计入当月次数。
- **限制展示**：本人个人主页显示限制状态、原因与自动解除说明；五个信用展示面给他人显示「限制中」徽标，不显示原因；不展示加扣分明细。
- **自动解除**：分数回到 ≥60 自动解除；不恢复原申请与同行关系。
- **系统取消原因**：新增「信用分低于 60，账号受限」，发布者与已接受同行者可见，其他用户只看到「已取消」。
- **数据 / 契约**：新增 `credit_exit_event`、`credit_restriction`、`trip_applications.status_reason`；`openapi.yaml` 升次版本，新增限制字段、`CREDIT_RESTRICTED` 错误、退出预览/确认请求与响应、系统取消原因。
- **不修改**未归档的 `user-credit` / `trip-cancellation` / `trip-companions` Delta；本 change 用新能力承载。

## Out of Scope

- 管理后台全部内容：管理员角色、后台用户列表 / 详情、按信用分排序 / 筛选、核实页面、人工封禁、申诉。
- 不可抗力 / 安全原因的人工核实入口与核实结果写入；本 change 只保证「待核实」与暂不扣分。
- 加扣分明细、原因、时间、历史记录列表；用户端「信用记录」按信用状态理解。
- 安全学习页面、客服系统、可点击的「如何恢复」入口；入口待定。
- 解除限制后恢复原申请 / 同行关系 / 已取消行程。
- 通知、推送、邮件、站内信。
- 体验获赞加分、举报核实扣分的完整业务流程；举报核实只作为未来触发源。
- 修改未归档的 `user-credit` / `trip-cancellation` / `trip-companions` Delta；修改「退出同行」的聊天保留语义；修改发布者取消规则。
- 已完成 / 已取消历史行程的清理或改写。

## Capabilities

### New Capabilities

- `credit-enforcement`: 退出同行信用告知与扣分、月度累进、待核实退出、<60 自动限制、只读守卫、限制触发联动、限制展示与自动解除。

### Modified Capabilities

- 无。`user-credit` / `trip-companions` / `trip-cancellation` 仅作依赖；不改其 Requirement 语义。

## Impact

| 位置 | 改动 |
|---|---|
| `backend/src/main/resources/db/migration/V25__credit_enforcement.sql`（新增） | `credit_exit_event`、`credit_restriction`、`trip_applications.status_reason` |
| 后端 `credit-enforcement` 包 | 退出原因 / 预计影响 / 扣分计算 / 月度计数 / 待核实 / 限制执行 / 只读守卫 / 自动清理 |
| `ApplicationServiceImpl` / `ApplicationController` | 退出接口扩展原因、预览、确认；申请 `status_reason` |
| `TripPlanServiceImpl` / `TripCancelledEvent` / `TripCancelReasonEnum` | 系统取消路径（含 ONGOING）与 `credit_restricted` 原因 |
| `ChatServiceImpl` / `UserProfileServiceImpl` / `ExperienceServiceImpl` / `TripPlanService` | 限制守卫与 `CREDIT_RESTRICTED` |
| `UserCredit` / `UserCreditEntry` / `UserProfileResponse` | 追加 `credit_restricted`；本人主页追加限制原因 |
| `frontend/src/trips` / `mine` / `chat` / `profile` / `profiles` | 三入口退出弹窗、五展示面徽标、拦截提示、自动解除说明 |
| `frontend/src/i18n` / `styles.css` | 退出原因、预计影响、限制文案、系统取消原因、徽标样式 |
| `openapi.yaml` | 0.20.0；退出请求/响应、限制字段、`CREDIT_RESTRICTED`、`credit_restricted` 原因 |
| 测试 | 后端记账/退出/限制/迁移双引擎；前端纯函数/组件；E2E 退出 + 限制 + 自动清理 |
| `openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md` | ADDED 9 Requirement / 46 Scenario |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 卡片范围 | 一个 change 覆盖两个故事（用户 D1） | 退出扣分是限制的主要触发源；拆开无法在一次验收内看到「扣分 → <60 → 限制」。 |
| 自动限制与 D1 冲突 | 以 Story 5 为准，推翻 REQ-019 D1（用户 D2） | 新故事明确要求 <60 自动限制；在需求与 Delta 中记录 D1 被取代。 |
| 管理端 | 不做任何管理员能力（用户 D3） | 仓库无角色/后台；从零建后台会把 8 点故事扩成两个功能；待核实保持 pending。 |
| 用户可见信息 | 不展示加扣分明细（用户 D4） | 明细敏感；只展示分数、等级、限制状态与本人原因。 |
| 恢复 | ≥60 自动解除；不恢复关系（用户 D5 / D12） | 限制由当前分数派生，无需管理员；被清退关系不自动恢复，避免绕过限制。 |
| 退出入口 | 三入口统一（用户 D6） | 聊天页已有退出入口；两套行为会造成不一致。 |
| 出发基准 | 集合时间优先，否则开始日期 00:00（用户 D7） | 「出发」以实际集合时间为准；未填时与行程状态推导一致。 |
| 月度计数 | 按退出月；仅已生效出发前扣分计入；待核实不计入；0 分裁断事件计入（用户 D8 / D14） | 可解释、可回算；不追溯其他已结算退出。 |
| 限制范围 | 只读账号 + 保留举报/安全（用户 D9） | 安全与求助不能被限制；查看与聊天历史保留。 |
| 限制可见性 | 本人原因；他人徽标（用户 D10） | 避免公开标签化；但同行者需要知道风险。 |
| 触发联动 | 自动撤回/解除/取消；系统清退不扣分（用户 D11） | 只读账号不能留下未收口的同行关系与行程；系统清退不是用户退出，不二次惩罚。 |
| 系统取消原因 | 新增「信用分低于 60，账号受限」（用户 D13） | 让发布者与同行者知道发生了什么；其他用户只看到已取消。 |
| 规格承载 | 新增 `credit-enforcement`（ADDED），不改未归档 Delta（用户 D15） | 避免与 `user-credit` / `trip-cancellation` / `trip-companions` 抢同一 Requirement 块。 |
| 契约/迁移 | 暂定 0.20.0 + V25，P3 排他确认（用户 D17） | `add-ai-itinerary` 曾声明同号；按实际落地顺序排他。 |

## 验收信号

1. 用户在 48 小时后出发的行程退出（个人原因，当月首次），看到「预计 -5」，确认后信用分 80→75，账本有退出记录。
2. 退出页选择不可抗力 / 安全原因，退出成功且分数不变，记录待核实、不计入当月次数。
3. 恰好 7 天 / 3 天 / 72 小时 / 24 小时 / 12 小时分别扣 0 / -3 / -3 / -8 / -10；旅行中 -15；同月第 2 次出发前退出翻倍。
4. 信用分 65 经 -10 变为 55，自动建立限制记录；用户不能发布/申请/发体验/聊天/改资料，但可查看与举报。
5. 限制触发后，待处理申请被撤回、未结束同行关系被解除、未结束已发布行程被取消；这些清退不扣分。
6. 本人个人主页显示限制原因与「分数回到 60 分及以上自动解除」；他人五展示面只显示「限制中」徽标。
7. 分数回到 60 或更高自动解除；原申请与同行关系不恢复。
8. 不存在管理员页面/接口、人工核实/解除/封禁入口；用户端不存在加扣分明细。
9. `openspec validate add-credit-exit-restriction --strict` 通过；既有注册/登录/资料/行程/申请/聊天/体验/取消/信用展示不回归。

## 残余风险

| 风险 | 处理 |
|---|---|
| `user-credit` / `trip-cancellation` 未归档 | 新能力承载；不改其 Delta；P5 暂不执行。 |
| `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 冲突 | 本 change 不修改「退出同行」Requirement；聊天语义沿用当前代码。 |
| 系统取消 ONGOING 与发布者取消规则冲突 | 新增系统取消路径；P3 设计明确权限/状态；不改 `trip-cancellation` Delta。 |
| 自动清理跨域事务过大 | 同事务优先；P3 评估批量与索引；失败整体回滚；重试幂等。 |
| 限制原因泄漏给他人 | 契约按请求人裁剪；他人只拿 `credit_restricted`；E2E 断言无原因。 |
| 0 分裁断事件计数争议 | D14 已裁决按事件计入；P2 Delta 写明；单测覆盖。 |
| 无低信用演示数据 | P3 决定种子 / 夹具 / 直接记账；不新增管理员入口。 |
| 契约 / 迁移号撞号 | `add-ai-itinerary` 曾声明 0.20.0 + V25；P3 按实际落地顺序排他确认。 |
| 场景 46 条超过单 change 阈值 | 用户 D1 明确合并；P2 在同一 change 内拆 Requirement 组，不拆 change。 |
