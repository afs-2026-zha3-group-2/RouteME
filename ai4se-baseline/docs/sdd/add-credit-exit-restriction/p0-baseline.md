# P0 基线记录 — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`（能力 `credit-enforcement` ADDED）｜ **需求：** REQ-024 ｜ **故事：** Story 4「退出同行扣减信用分」+ Story 5「低信用分自动限制账号」
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-17
- **记录人：** Lewis Liu（当前开发者）
- **分支：** `feature/add-credit-exit-restriction`（从 `main@ec360dc` 切出）

## 1. 阶段目标

确认「退出同行扣分 + 信用分低于 60 自动限制」可以开工：退出链路、信用账户与账本、五个信用展示面、行程取消代码、只读守卫缺口、测试与管道现状均在仓库里可查；本 change 用新增能力 `credit-enforcement` 承载业务规则，不改未归档的 `user-credit` / `trip-cancellation` / `trip-companions` Delta。

## 2. 范围裁决（用户 2026-11-17）

| id | 议题 | 裁决 |
|---|---|---|
| D1 | 卡片范围 | **一个 change 覆盖两个故事**：Story 4 退出同行扣减信用分 + Story 5 低信用分自动限制账号；需求登记为 **REQ-024**，故事文件分两份。 |
| D2 | 自动限制与 D1 冲突 | **以 Story 5 为准，推翻 REQ-019 D1** 的「本迭代不引入自动封禁（< 60）」；本 change 正式实现低于 60 自动限制，并在需求与规格中记录 D1 被取代。 |
| D3 | 管理端 | **不做任何管理员能力**：不建管理员角色、后台接口或页面；不可抗力 / 安全原因退出暂不扣分并记为「待核实」，管理员核实与人工封禁另开 change；接受核实前一直不扣分。 |
| D4 | 用户可见信息 | **不展示加扣分明细**；只展示当前信用分、等级、限制状态与限制原因（原因仅本人可见）；「信用记录」按信用状态理解，不提供逐条流水列表。 |
| D5 | 恢复机制 | 限制由当前分数派生；**分数回到 ≥60 自动解除**；不做人工解除；「如何恢复」入口待定，安全学习不在本 change，不放置不可点击的占位链接。 |
| D6 | 退出入口 | **三个入口统一**：行程详情页、我的旅行、聊天页都走新的退出原因选择 + 预计信用影响告知 + 二次确认流程。 |
| D7 | 出发时间基准 | **集合时间优先**：`meeting_time` 有值时以它为「出发」；未填时回退到 `start_date` 00:00（Asia/Shanghai）。 |
| D8 | 月度计数 | 按**退出动作所在自然月**计数；只有已生效的出发前退出扣分计入；待核实退出不计入；待核实后来变为扣分时，按核实当时该月已有扣分次数取下一序号（不是第一次则翻倍）；不追溯调整其他已结算退出；旅行中退出与 ≥7 天免责退出不计入。 |
| D9 | 限制范围 | **只读账号 + 保留举报/安全入口**：可查看首页、详情、我的旅行、个人主页、信用状态与聊天历史；不可发布新行程、不可申请加入、不可发布/编辑体验、不可编辑行程、不可发送聊天消息、不可编辑资料/头像；举报与安全入口保留。 |
| D10 | 限制可见性 | **本人可见完整原因；他人可见限制状态**：五个信用展示面都显示「限制中」徽标，但不展示具体原因；完整原因只在本人个人主页。 |
| D11 | 限制触发联动 | 触发时**自动撤回全部待处理申请**、**解除全部未结束行程（招募中/已满员/旅行中）的已接受同行关系**、**自动取消全部未结束的已发布行程**；这些系统清退**不按退出扣分、不计入当月次数**；已完成/已取消行程保留历史。 |
| D12 | 解除后恢复 | **不恢复**原申请与同行关系；分数回到 ≥60 解除限制后，用户需重新申请或被重新接受。 |
| D13 | 自动取消原因 | 在取消原因字典新增**系统原因「信用分低于 60，账号受限」**；发布者与已接受同行者可见，其他用户只看到「已取消」。 |
| D14 | 零值计数 | 月度次数按**扣分事件**计入，包含被 0 分下限裁断、实际变化为 0 的退出扣分事件；≥7 天免责与待核实免责不计入。 |
| D15 | 规格承载 | **新增能力 `credit-enforcement`（ADDED）**；`user-credit` / `trip-companions` / `trip-cancellation` 只作依赖，不改它们的未归档 Delta；一个 REQ-024 + 两个故事。 |
| D16 | 流程 | 不做 P5、不归档；P0–P4 每个阶段一次提交；P4 完成后统一 `git pull` → 合并 `main` → push → 删除 `feature/add-credit-exit-restriction`；签署按预选：当前开发者 Lewis Liu、SM Lewis、IO WAYNE、design 第二签署 Jay、tasks 第二签署 Neal、G2 Neal，每个工件写完仍停下来确认。 |
| D17 | 契约与迁移 | 当前 `openapi.yaml` 0.14.0、Flyway head V20；本 change **暂定 0.19.0 + V25**，P3 按实际落地顺序排他确认；若 `add-ai-itinerary` 先落则顺延。 |

## 3. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`：`design-system` / `hello-world` / `trip-companions` / `trip-experiences` / `trip-plans` / `user-auth`；`openspec list` 显示 20 个未归档 change；`openspec/config.yaml` | 存在；`user-credit` 与 `trip-cancellation` 尚未进入 Living Spec，只在未归档 change 中 |
| 信用能力现状 | `openspec/changes/add-credit-account/specs/user-credit/spec.md`（7 Requirement / 26 Scenario）；`add-credit-account` 为 Complete 但未归档 | `user-credit` 的 ADDED Delta 仍属在途 change，本 change 不能安全写 MODIFIED |
| 信用数据 | `V20__add_credit_account.sql`：`user_credit_account` + `credit_ledger`（append-only、前后快照、幂等键唯一、CHECK 等式） | 账户与账本已落地；无「限制」表或字段 |
| 信用记账 | `CreditService.book(...)`：0–100 裁断、实际生效量、零变化留痕、幂等键重复不再改动、账户与账本同事务 | 可直接作为退出扣分与限制触发的写入口；当前无业务事件调用方 |
| 信用展示 | 五个展示面：`ProfilePage` / `ProfileModal` / `TripDetailPage` 发布者行 / `TripCard` / `ApplicationsPage`；批量接口 `GET /api/users/credits?ids=...`；`creditDisplay.ts` 只派生分数 + 等级 | 展示面已存在；没有限制状态、限制原因或自动解除说明字段 |
| 退出同行（后端） | `ApplicationServiceImpl.leave(tripId, userId)`：拒绝发布者、要求 ACCEPTED、`TripPlanService.removeCompanion` 减人数、申请置 `LEFT`；`POST /api/trips/{tripId}/leave` | 退出成功即结束；无原因、无预计影响、无信用记账、无限制判断 |
| 退出同行（前端） | `TripDetailPage.tsx:694`、`MyTripsPage.tsx:492,507`（Modal）、`ChatPage.tsx:127-140` + `ChatMain.tsx:70-74` | 三个入口；详情/我的旅行用 Modal，聊天页用 `window.confirm`；都没有原因与信用影响 |
| 退出同行（活规格） | `openspec/specs/trip-companions/spec.md:97-117`「退出同行」；`openspec/changes/refine-trip-chat/specs/trip-companions/spec.md` 已 MODIFIED 为「退出后保留聊天」；当前代码也保留聊天 | 活规格与未归档 Delta 存在已知差异；本 change 不修改「退出同行」Requirement，避免三方冲突 |
| 行程取消（代码） | `TripPlanServiceImpl.cancel(tripId, publisherId, request)`：仅发布者、仅 `RECRUITING` / `FULL`；写 `cancelledAt` / `cancelReason` / `cancelNote`；发 `TripCancelledEvent`；`ApplicationServiceImpl.onTripCancelled` 批量取消 PENDING | 代码已在 main；但**不能取消 `ONGOING`**，系统级自动取消需要新路径 |
| 取消原因字典 | `TripCancelReasonEnum` 8 项：`personal` / `time_changed` / `plan_changed` / `not_enough_people` / `weather` / `illness` / `safety` / `other` | 无系统原因；前端与契约需同步扩展 |
| 取消规格 | `openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md`（5 Requirement / 20 Scenario）；`add-trip-cancel` 为 Complete 但未归档 | 本 change 不修改该 Delta；系统自动取消写在新能力中，复用取消服务与事件 |
| 只读守卫 | 发布行程 `TripPlanService.create`、申请 `ApplicationServiceImpl.apply`、体验 `ExperienceService`、聊天 `ChatServiceImpl`、资料 `UserProfileServiceImpl.save` 均无「信用限制」判断 | 五类写入口都需要新增守卫；举报与安全入口不在拦截范围 |
| 聊天只读现状 | `ChatServiceImpl` 仅在 `COMPLETED` / `CANCELLED` 时拒绝发送 | 限制状态需要独立错误，不能混用行程终态 |
| 管理员能力 | 全仓无角色列、无后台端点、无后台页面；`REQ-019` D2 已把管理端整体推迟 | 本 change 不建管理端；待核实只能保持 pending |
| 契约 | `openapi.yaml` `version: 0.14.0`；已有 `POST /api/trips/{tripId}/leave`、`GET /api/users/credits`、`GET /api/users/{userId}/profile` | 需新增限制字段、限制错误码与系统取消原因；升次版本 |
| 迁移 | Flyway head `V20__add_credit_account.sql`；`V25` 未占用 | 本 change 暂定 `V25`，P3 排他确认 |
| 工具链 | Node `v24.18.0`、npm `11.16.0`、Java `21.0.11`、Maven `3.10.0`、OpenSpec `1.16.1` | 满足构建；PowerShell 下直接 `npm` / `npx` 可能报 `AuthorizationManager check failed`，使用 `npm.cmd` / `npx.cmd` 验证通过 |
| CI / CD | `.github/workflows/ci.yml` / `cd.yml`；`main@ec360dc` 带 `build-ec360dc` 标签 | 管道可用；本 change 走同一管道 |
| 既有信用测试 | `CreditServiceImplTest`（初始分 / 等级 / 裁断 / 零值 / 幂等）；`CreditMigrationSqliteTest`（双引擎迁移） | 可作为退出扣分与限制触发的回归基线 |

## 4. 现状缺口（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | 退出没有原因选择与预计信用影响告知 | 三个前端入口只有确认文案 | Story 4 的「正式退出前必须明确告知」无法满足 |
| G-02 | 退出不扣分、不写信用记录 | `ApplicationServiceImpl.leave` 无 `CreditService` 调用 | 扣分阶梯、旅行中 -15、账本记录均无处落 |
| G-03 | 没有月度累进计数 | 无按自然月统计退出扣分的查询或字段 | 第 2 次起翻倍无法实现 |
| G-04 | 没有免责退出「待核实」状态 | 退出只有 `LEFT` 一种结果，账本无待核实语义 | 不可抗力/安全原因无法「暂不扣分」并留痕 |
| G-05 | 没有「<60 自动限制」模型与记录 | 无限制表、无限制字段、无 `CREDIT_SCORE_BELOW_60` | Story 5 的触发、记录、展示、解除均无承载 |
| G-06 | 没有限制触发的联动清理 | 无自动撤回/解除/取消逻辑 | D11 的只读账号状态无法闭环 |
| G-07 | 没有五类写入口的只读守卫 | 发布/申请/体验/聊天/资料均无限制判断 | 受限用户仍可继续写操作 |
| G-08 | 没有限制原因与自动解除说明 | 五个展示面只有分数 + 等级 | 本人看不到原因，他人看不到「限制中」 |
| G-09 | 没有低信用演示数据或可复现触发路径 | 所有种子账号 80 分；无管理员扣分入口 | E2E 与人工验收需要 P3 设计测试路径 |
| G-10 | 现有取消只支持招募中/已满员 | `TripPlanServiceImpl.cancel` 的状态校验 | 旅行中的已发布行程无法被系统自动取消 |
| G-11 | 取消原因字典没有系统原因 | `TripCancelReasonEnum` 8 项 | D13 的系统取消原因需要扩展后端、契约与前端映射 |
| G-12 | 自动解除后没有恢复路径 | 无恢复逻辑；D12 已裁决不恢复 | 需求需明确「不恢复、需重新申请」，避免被误读为缺陷 |
| G-13 | 待核实没有管理端出口 | 本 change 明确不做管理端 | 需求需把「核实」写成未来 change 的行为，当前只保证 pending 与暂不扣分 |
| G-14 | 人工封禁与自动限制无法在同一模型区分 | 无任何封禁模型 | 需求需明确本 change 只产生自动限制记录；人工封禁后续 change 另建 |
| G-15 | 信用限制与既有 `user-credit` / `trip-cancellation` Delta 的所有权冲突 | 两者都未归档 | 用新能力 `credit-enforcement` 承载，避免 MODIFIED 抢块 |

## 5. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate add-credit-exit-restriction --strict` | change 结构合法性与 Delta 一致性 |
| 契约 | `cd ai4se-baseline/RouteME; npx.cmd -y @redocly/cli lint openapi.yaml` | 0 error |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm.cmd run build` | 含 `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm.cmd test` | vitest run |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp verify` | H2 + SQLite，含迁移与契约测试 |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx.cmd playwright test` | 需本地前后端运行；低信用场景的测试路径 P3 定 |

## 6. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`docs/sdd/` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`web-coding-style`、`web-testing` |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` ready；`all-specs-review` 在 `.agents/skills/` |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 在 `main` 运行；本 change 走同一管道 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。**

## 7. 阶段产出

- 本记录：`docs/sdd/add-credit-exit-restriction/p0-baseline.md`
- 分支：`feature/add-credit-exit-restriction`（从 `main@ec360dc`）
- 未新增代码、OpenSpec Delta 或业务规格；P1 起才进入提案与规格。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| 当前开发者 | Lewis Liu | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-17 |
| SM | Lewis | 准入 P1；REQ-024 进入本迭代排期 | 2026-11-17 |
| IO | WAYNE | REQ-024 需求来源（Story 4 + Story 5）；D1 被 Story 5 取代；管理端不在本 change | 2026-11-17 |

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：退出原因、预计影响、扣分阶梯、旅行中 -15、月度翻倍、待核实、<60 限制、只读范围、自动撤回/解除/取消、自动解除、不恢复关系、无管理端、无明细。
- G-01 ~ G-15 可追溯到代码、契约、未归档 Delta 与原型证据。
- 能力边界：新增 `credit-enforcement`（ADDED），依赖 `user-credit` / `trip-companions` / `trip-cancellation`；不修改三者的未归档 Delta。
- 契约与迁移号在 P3 按实际落地顺序排他确认；`V25` 与 `0.19.0` 只是暂定。

