# Intent capture — 退出同行扣分与低信用自动限制（REQ-024 / 信用系统迭代 2–3）

- **捕获日期：** 2026-11-17
- **来源：** 用户当次会话提供的 P0 卡片「[P0] 退出同行扣减信用分」，同时包含 Story 4（退出同行扣减信用分，信用系统迭代 2，5 点）与 Story 5（低信用分自动限制账号，信用系统迭代 3，3 点）
- **候选编号：** REQ-024（起草时记为 REQ-022；合并 `origin/main` 时 REQ-022 / S22 已被 `add-trip-weather` 占用、REQ-023 被 `add-experience-like-credit` 占用，按「后到者顺延」改为 REQ-024）
- **能力 / change 候选：** `credit-enforcement`（ADDED）/ `add-credit-exit-restriction`
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话要点）

> 我现在要做一个卡，新开一个 change，按照现有的 docs 和 SDD 的方法进行，P0–P5，先不要提交 P5，也不要进行归档，每个阶段提交一次。

故事 4 原文：作为已经加入行程的同行者，我希望在无法继续参加旅行时能够退出同行，同时根据退出时间承担相应的信用影响，以减少临时退出对其他同行者造成的影响。

故事 5 原文：作为平台管理员，我希望系统在用户信用分低于安全阈值时自动限制账号，以便降低低信用用户继续影响旅行社交安全的风险。

## 故事 4：退出同行扣分规则（用户原文）

| 退出时间 | 扣分 |
|---|---|
| 出发前 7 天及以上 | 0 |
| 出发前 3–7 天 | -3 |
| 出发前 24–72 小时 | -5 |
| 出发前 12–24 小时 | -8 |
| 出发前 12 小时内 | -10 |
| 旅行中退出 | -15 |

补充规则：

1. 同一自然月第 2 次及之后的「出发前退出」处罚翻倍，对应 -6 / -10 / -16 / -20。
2. 旅行中退出固定 -15，不参与翻倍。
3. 出发前 7 天及以上退出只记录事实，不扣分。
4. 选择「不可抗力」或「安全原因」时暂不扣分，进入管理员核实；管理员核实属实时不扣分，且不计入当月退出次数；核实不属实时按照实际退出时间扣分，并计入当月退出次数。
5. 正式退出前必须明确告知用户本次预计信用影响。
6. 退出原因必选：个人原因 / 不可抗力 / 安全原因；安全原因引导举报。

场景（前置 / 操作 / 预期）：

> 前置：用户已 ACCEPTED 加入行程，信用分为 80，距离出发还有 48 小时，当月首次退出 → 操作：用户确认退出同行 → 预期：退出成功，信用分扣除 5 分，由 80 变为 75，并生成退出信用记录。

垂直切片口径：退出同行 → 判断距离出发时间 → 扣分 → 生成信用记录。

## 故事 5：低信用自动限制（用户原文）

触发规则：

1. 用户信用分低于 60 时自动触发信用限制。
2. 触发限制时不需要管理员手动操作。
3. 系统必须记录触发原因：`CREDIT_SCORE_BELOW_60`。
4. 用户能够看到当前信用分及信用限制原因。
5. 信用限制与管理员因严重违规执行的人工封禁必须分别记录。

限制范围（用户原文）：

- 不能发布新的旅行计划。
- 不能申请加入新的旅行。
- 不能发布新的旅行体验。
- 保留查看历史行程和信用记录的能力。
- 保留联系客服和进入安全学习的能力。

场景（前置 / 操作 / 预期）：

> 前置：用户信用分为 65 → 操作：举报成立并扣除 10 分 → 预期：信用分变为 55，系统自动触发信用限制，用户无法继续发布或申请行程，并看到恢复入口。

垂直切片口径：信用分跌破 60 → 自动限制账号 → 提供恢复入口。

## 用户本次会话裁决（2026-11-17）

| 编号 | 议题 | 裁决 |
|---|---|---|
| D1 | 卡片范围 | 一个 change 覆盖 Story 4 + Story 5；一个 REQ-024 + 两个故事文件。 |
| D2 | 自动限制与 D1 冲突 | 以 Story 5 为准，推翻 REQ-019 D1「本迭代不引入自动封禁（<60）」；本 change 正式实现。 |
| D3 | 管理端 | 不做任何管理员能力；不可抗力/安全原因退出暂不扣分并记为「待核实」；管理员核实与人工封禁另开 change；接受核实前一直不扣分。 |
| D4 | 用户可见信息 | 不展示加扣分明细；只展示当前分数、等级、限制状态与限制原因（原因仅本人可见）；不提供逐条流水。 |
| D5 | 恢复机制 | 限制由当前分数派生；分数回到 ≥60 自动解除；不做人工解除；「如何恢复」入口待定，安全学习不在本 change，不放占位链接。 |
| D6 | 退出入口 | 详情页、我的旅行、聊天页三个入口统一走原因选择 + 预计影响告知 + 二次确认。 |
| D7 | 出发基准 | `meeting_time` 有值时以它为「出发」；未填时回退 `start_date` 00:00（Asia/Shanghai）。 |
| D8 | 月度计数 | 按退出动作所在自然月；只有已生效出发前退出扣分计入；待核实不计入；待核实后来变为扣分时按核实当时该月已有扣分次数取下一序号（不是第一次则翻倍）；不追溯调整其他已结算退出；旅行中与 ≥7 天免责不计入。 |
| D9 | 限制范围 | 只读账号 + 保留举报/安全入口：可查看首页、详情、我的旅行、个人主页、信用状态与聊天历史；不可发布新行程、申请加入、发布/编辑体验、编辑行程、发送聊天消息、编辑资料/头像。 |
| D10 | 限制可见性 | 本人可见完整原因；他人可见「限制中」徽标（五个信用展示面），但不展示具体原因。 |
| D11 | 限制触发联动 | 自动撤回全部待处理申请、解除全部未结束行程的已接受同行关系、自动取消全部未结束的已发布行程；系统清退不扣分、不计入当月次数；已完成/已取消保留历史。 |
| D12 | 解除后恢复 | 不恢复原申请与同行关系；需重新申请或被重新接受。 |
| D13 | 自动取消原因 | 新增系统原因「信用分低于 60，账号受限」；发布者与已接受同行者可见，其他用户只看到已取消。 |
| D14 | 零值计数 | 月度次数按扣分事件计入，包含被 0 分下限裁断为实际 0 的退出扣分事件；≥7 天免责与待核实免责不计入。 |
| D15 | 规格承载 | 新增能力 `credit-enforcement`（ADDED）；`user-credit` / `trip-companions` / `trip-cancellation` 只作依赖，不改未归档 Delta。 |
| D16 | 流程 | 不做 P5、不归档；P0–P4 每阶段一次提交；P4 完成后统一 pull → 合并 main → push → 删除分支；签署按预选名册，每个工件写完仍停下确认。 |
| D17 | 契约与迁移 | 当前 0.14.0 + V20；本 change 暂定 0.15.0 + V21，P3 排他确认。 |

## 证据锚点（现状核对，2026-11-17 / main@ec360dc）

| 证据 | 路径 | 说明 |
|---|---|---|
| 信用账户 | `RouteME/backend/src/main/java/routeme/entity/UserCreditAccountEntity.java`、`mapper/UserCreditAccountMapper.java` | 每用户一条，0–100；`V20__add_credit_account.sql` 建表并回填 80 |
| 信用账本 | `RouteME/backend/src/main/java/routeme/entity/CreditLedgerEntity.java`、`CreditServiceImpl.book` | append-only、前/后快照、实际生效量、幂等键、零值留痕 |
| 信用展示 | `ProfilePage.tsx`、`ProfileModal.tsx`、`TripDetailPage.tsx`、`TripCard.tsx`、`ApplicationsPage.tsx`、`useUserCredits.ts`、`creditDisplay.ts` | 五个展示面；只展示分数 + 等级；批量只读端点 `GET /api/users/credits` |
| 退出同行后端 | `ApplicationServiceImpl.leave`、`ApplicationController`、`TripPlanService.removeCompanion` | 要求 ACCEPTED、减人数、申请置 `LEFT`；不碰信用 |
| 退出同行前端 | `TripDetailPage.tsx:694`、`MyTripsPage.tsx:492,507`、`ChatPage.tsx:127-140`、`ChatMain.tsx:70-74` | 三个入口；无原因、无预计影响；聊天页用 `window.confirm` |
| 退出同行活规格 | `openspec/specs/trip-companions/spec.md:97-117` | 二次确认后退出；`refine-trip-chat` 未归档 Delta 已改为保留聊天；本 change 不改该 Requirement |
| 行程取消 | `TripPlanServiceImpl.cancel`、`TripCancelledEvent`、`ApplicationServiceImpl.onTripCancelled`、`TripCancelReasonEnum` | 仅发布者、仅 RECRUITING/FULL；8 项原因；PENDING 自动取消 |
| 取消规格 | `openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md` | 5 Requirement / 20 Scenario；未归档 |
| 只读守卫 | `TripPlanService.create`、`ApplicationServiceImpl.apply`、`ExperienceService`、`ChatServiceImpl`、`UserProfileServiceImpl.save` | 均无信用限制判断 |
| 管理端 | 全仓无角色列、后台端点、后台页面 | 本 change 不做；待核实只能保持 pending |
| 契约 | `RouteME/openapi.yaml` | 0.14.0；已有 leave / credits / profile；无限制字段与错误码 |
| 迁移 | `RouteME/backend/src/main/resources/db/migration` | V20 为 head；V21 未占用 |
| 工具链 | Node 24.18.0 / Java 21.0.11 / OpenSpec 1.16.1 | PowerShell 下用 `npm.cmd` / `npx.cmd` |

## 现状差距（P1 需收敛）

1. 退出没有原因、没有预计信用影响、没有扣分与账本记录。
2. 没有月度累进计数与免责待核实状态。
3. 没有 <60 自动限制模型、记录、只读守卫、限制展示与自动解除。
4. 没有限制触发后的自动撤回/解除/取消联动。
5. 现有取消只支持招募中/已满员，不能取消旅行中的已发布行程。
6. 取消原因字典没有系统原因；契约 / 前端映射需扩展。
7. 没有管理员能力与低信用演示数据；测试路径需在 P3 设计。

## 本次明确排除

- 任何管理员角色、后台接口、后台页面、人工核实操作、人工封禁记录。
- 管理员核实属实时/不属实时的人工操作入口；本 change 只保证「待核实」与暂不扣分，核实逻辑作为未来 change 的领域能力预留，不暴露给客户端。
- 加扣分明细、原因、时间、历史记录列表；「信用记录」按信用状态理解。
- 安全学习页面 / 客服系统 / 可点击的恢复入口；「如何恢复」入口待定。
- 已完成/已取消历史关系的恢复；解除限制后不恢复原申请与同行关系。
- 通知 / 推送 / 邮件 / 站内信。
- 人工封禁与自动限制的统一管理后台；人工封禁另开 change。
- 体验获赞加分、举报核实扣分的完整业务流程（举报核实只作为未来触发源被引用）。

## Discovery Decision

**Go（light intake）。** 一句话可表述：「在既有退出同行流程上增加原因选择与预计信用影响，按出发时间扣分并留痕；信用分跌破 60 时自动进入只读限制，清退未结束关系与行程，分数回到 60 自动解除」。

- 能力归属：新增 `credit-enforcement`（ADDED），承载退出扣分与限制规则；`user-credit` 提供账户/账本，`trip-companions` 提供退出关系，`trip-cancellation` 提供行程取消。
- 现有资产：`CreditService.book` 可直接复用；五个信用展示面可扩展；退出与取消服务已有。
- 管理端：零基础，整体排除；待核实保持 pending。
- 风险：`user-credit` / `trip-cancellation` 未归档，不能写 MODIFIED；用新能力避免抢块。

## 下一步

`/sdd:pre-spec-req` → Ready 条目（六字段 + 场景 + DoR）→ 嵌入式 impact → `/sdd:proposal-split` + `/sdd:story-split`。
