# 变更提案：add-trip-cancel

- **触发：** issue #28「[P0] 取消行程」（迭代 2 ｜ 故事点 3 ｜ 落点：我的旅行 / 行程详情页）＋ 用户 2026-11-17 的范围与展示口径裁决 D1–D6
- **需求条目：** `requirement-workspace/requirements/REQ-019-trip-cancel.md`
- **意图捕获：** `requirement-workspace/intents/REQ-019-trip-cancel.md`
- **能力：** `trip-cancellation`（ADDED）
- **规模：** M（状态机扩展 + 取消端点与迁移 + 跨能力申请/聊天/统计善后 + 前端两处入口与原因选择）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:sdd-artifacts`、`prototype-ui-alignment`
- **基线：** `origin/main@c1c238a`（worktree `feature/add-trip-cancel`）。已归档：`add-trip-plans`、`add-trip-companions`、`add-trip-experiences`、`bootstrap-hello-world`、`add-paged-lists-mybatis-plus`、`apply-prototype-visual-design`；`add-user-auth` 已解档（Delta 已并入 Living Spec）；进行中：`refine-inspiration-home`、`add-destination-area-filters`、`add-match-reason`、`add-trip-completion`、`refine-trip-application`、`refine-trip-chat`、`refine-safety-report`、`refine-trip-map`、`add-ai-itinerary`、`add-user-profile`、`add-user-profiles`、`add-trip-publish`、`add-user-logout`、`remove-home-greeting-note`。
- **归档顺序：** 不替换任何既有 Requirement 块，归档为纯新增能力；与在途 change 无同块冲突。契约 / 迁移号与 `add-ai-itinerary`（0.12.0 + V18）及并行 `add-experience-photos` 串行。

## Why

当前行程只有「招募中 / 已满员 / 旅行中 / 已结束」四态，状态由完成时间、人数与日期推导（`TripPlan.java:59-70`），**没有取消态**。发布者无法出行时只能「标记为已结束」，这会把一条从未发生的行程伪装成已完成，并让已接受同行者进入「发表体验」环节；待处理申请也不会因取消而关闭，首页查询只排 `completed_at`，聊天只对 `COMPLETED` 只读，发布者统计也不区分取消。

`trip-plans` 的 Living Spec 已写明「已结束与已取消行程 MUST NOT 出现在默认列表」，但代码里没有取消态，这条约束不可观测（历史评审 ASR-IH-02 已记录该漂移）。issue #28 要求补齐取消状态机与取消后的产品闭环。

**范围裁决（用户 2026-11-17）：** #28 正文中的信用分、信用记录、扣分规则、免扣分申请与管理员审核属于其他 story，**不在本 change**；本 change 只交付取消行程主目标。

## What Changes

- **`trip-cancellation`（ADDED，5 Requirement / 20 Scenario）：**
  1. 发布者取消自己的行程（仅发布者、仅 RECRUITING / FULL、终态）。
  2. 取消原因与二次确认（8 项原因；「其他原因」说明必填 ≤100 字；确认写明不可恢复与影响）。
  3. 取消后的行程可见性（首页/匹配列表排除；详情与我的旅行显示「已取消」；原因仅发布者与 ACCEPTED 同行者可见）。
  4. 取消后的同行与聊天关闭（PENDING 自动取消；ACCEPTED 保留；聊天只读并提示「该行程已取消」；新申请拒绝）。
  5. 取消后的其他操作与统计（不能结束/再次取消/编辑集合信息；不能发表体验；发布行程统计排除取消；重复取消幂等）。
- **状态与数据：** `TripStatus` 增加 `cancelled`，判定优先于日期与人数；`trip_plans` 新增取消时间、原因、说明三列。
- **列表与消费点：** 开放列表查询排除取消；我的旅行四组不变、补「已取消」文案；聊天只读扩展；发布行程统计排除取消；体验资格沿用「仅已结束」。
- **契约：** `status` 增加 `cancelled`；新增 `POST /api/trips/{tripId}/cancel`；详情新增取消字段（原因与说明按请求人裁剪）。
- **前端：** 详情页危险操作区与我的旅行「我发布的」行内新增「取消行程」；原因选择 + 二次确认；取消态徽标与原因展示；聊天只读提示。**原型先行**：我的旅行入口、原因选择与取消态样式需先补进 `docs/prototype/`。

## 问题（现状差距）

1. **缺 CANCELLED。** `TripStatusEnum` 只有四态；`TripPlan.status()` 由 `completedAt` / 日期 / 人数推导，取消无法表达。
2. **列表不排取消。** `TripPlanMapper.xml:13-14` 只排 `completed_at`；取消行程仍会出现在首页与到期物化扫描。
3. **无取消端点与原因字段。** `TripController` 无 cancel；`trip_plans` 无 reason / note 列。
4. **无入口。** 详情页与我的旅行都没有取消操作；原型只有详情页一处。
5. **申请不联动。** `ApplicationServiceImpl` 只在 `TripCompletedEvent` 时批量取消 PENDING；取消不会关闭申请。
6. **聊天只认已结束。** `ChatServiceImpl:114` 仅对 `COMPLETED` 只读。
7. **统计含取消。** `UserProfileStatsServiceImpl` 的「发布行程」为本人全部行程数，与 TODO.md:124「我发布且未取消」不一致。

## 范围

**In scope**

- 行程第五态 `CANCELLED`，终态；取消优先于日期与人数推导。
- 取消权限：仅发布者；仅 `RECRUITING` / `FULL`。
- 取消原因 8 项与「其他原因」必填说明（1–100 字）。
- 二次确认：不可恢复 + 首页下架 / 申请关闭 / 同行者可见。
- 取消入口：详情页 + 我的旅行「我发布的」行内（D2）。
- 取消善后：PENDING 自动取消；ACCEPTED 保留；聊天只读；申请入口关闭。
- 展示：详情与我的旅行「已取消」；原因按角色裁剪（D3）；无体验入口。
- 口径：首页/匹配列表排除；发布行程统计排除取消；我的旅行四组不变（D5）。
- 契约与迁移：`status` 增加 `cancelled`；取消端点；取消三字段；新增迁移。
- 原型：详情页沿用现有入口；补我的旅行入口、原因选择、取消态样式（原型先行）。

**Out of scope**

- 信用分、信用记录、扣分规则、免扣分申请、管理员审核（D1，属其他 story）。
- 删除行程、恢复 / 重新开启、改期改线。
- 推送、短信、邮件等外部通知。
- 取消原因的公开展示、申诉与审核流程。
- 已取消行程的体验发布、评价、退款或补偿。
- 改写 `trip-plans` / `trip-companions` 既有 Requirement 块中与取消无关的行为。

## 关键决策（摘要）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 信用分 | **不做**；信用分 / 信用记录 / 免扣分申请 / 管理员审核属其他 story；#28 中相关 AC 不在本 change 验收 |
| D2 | 取消入口 | 详情页 + 我的旅行「我发布的」行内；原型需先行 |
| D3 | 原因可见性 | 仅发布者与 ACCEPTED 同行者；PENDING 与其他用户只见「已取消」 |
| D4 | 「其他原因」说明 | 必填，1–100 字，前后端同时校验 |
| D5 | 我的旅行归组 | 沿用四组；取消行程留在「我发布的」/「已匹配同行」，显示「已取消」 |
| D6 | 编号与能力 | REQ-019 / `add-trip-cancel` / 新能力 `trip-cancellation`（ADDED） |

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-cancellation/spec.md` | 归档时新增该能力（5 Requirement / 20 Scenario） |
| `openspec/specs/trip-plans/spec.md` | 不改写；「浏览未结束的旅行计划」已要求取消行程不出现在默认列表 |
| `openspec/specs/trip-companions/spec.md` | 不改写；申请与聊天只读复用既有状态机与错误码 |
| `RouteME/backend/.../enums/TripStatusEnum.java`、`pojo/TripPlan.java` | 增加 CANCELLED 与取消优先的状态推导 |
| `RouteME/backend/.../entity/TripPlanEntity.java`、`resources/db/migration/V19__*.sql` | 取消三列与读写映射 |
| `RouteME/backend/.../service/impl/TripPlanServiceImpl.java` | 取消方法、权限与状态校验、原因校验 |
| `RouteME/backend/.../service/TripPlanService.java`、`controller/TripController.java` | 取消服务契约与端点 |
| `RouteME/backend/.../service/impl/ApplicationServiceImpl.java` | 取消后批量关闭 PENDING；新申请拒绝 |
| `RouteME/backend/.../service/impl/ChatServiceImpl.java` | 取消后只读并提示「该行程已取消」 |
| `RouteME/backend/.../service/impl/UserProfileStatsServiceImpl.java` | 发布行程统计排除取消 |
| `RouteME/backend/.../resources/mapper/TripPlanMapper.xml` | 开放列表与到期物化查询排除取消 |
| `RouteME/frontend/src/trips/TripDetailPage.tsx`、`mine/MyTripsPage.tsx` | 取消入口、原因选择、二次确认、取消态与原因展示 |
| `RouteME/frontend/src/chat/ChatPage.tsx`、`types.ts`、`i18n/tripMessages.ts` | 取消态类型、聊天提示与文案 |
| `RouteME/openapi.yaml` | `status` 增加 `cancelled`；取消端点与取消字段；次版本递增 |
| `docs/prototype/ui.js`、`main.js`、`store.js`、`styles.css` | 原型先行：我的旅行入口、原因选择、取消态样式 |
| 测试 | 状态推导、取消权限、原因校验、申请自动取消、聊天只读、统计、可见性、E2E 两条取消主路径 |

## 需求与证据

- 故事来源：issue #28「[P0] 取消行程」（迭代 2，3 点，落点：我的旅行 / 行程详情页）。
- 现状证据：`TripStatusEnum`（四态）、`TripPlan.status()`（无取消）、`TripPlanMapper.xml:13-14`（只排已结束）、`TripPlanServiceImpl.complete()`（无取消）、`ApplicationServiceImpl:235`（仅结束事件批量取消）、`ChatServiceImpl:114`（仅 COMPLETED 只读）、`UserProfileStatsServiceImpl:42-52`（发布行程含取消）、`MyTripsServiceImpl:50-61`（四组无取消文案）、`openapi.yaml` 0.11.0（四态）。
- 已具备能力：`CHAT_READ_ONLY` / `TRIP_NOT_OPEN` / `FORBIDDEN` / `INVALID_INPUT` / `EXPERIENCE_NOT_ALLOWED` 错误码；申请状态机的「待处理 → 已取消」；体验资格仅 COMPLETED。
- 用户裁决：D1–D6 见上；blocking OQ 0，DoR BLOCKER 0。

## Effort / size

- **相对规模：** M。状态推导与迁移较小；主要成本在取消善后的跨能力联动（申请 / 聊天 / 统计）、原因可见性裁剪、两处前端入口与原型先行。
- **建议实施顺序：** ① 迁移 + 状态推导 + 契约 → ② 取消服务与端点（权限/状态/原因校验）→ ③ 申请自动取消与聊天只读 → ④ 列表与统计口径 → ⑤ 原型 + 前端入口/原因/确认/展示 → ⑥ 回归与 E2E。

## Spec ID

`add-trip-cancel`，业务增量规格见 `specs/trip-cancellation/spec.md`。

## 残余风险与偏离记录

- **信用分未交付：** #28 的 15 条验收标准中，涉及扣分、信用记录、免扣分申请与管理员审核的 5 条不在本 change；在 registry / stories / 提案中显式记录，避免被误判为漏做。
- **契约 / 迁移号段：** 暂定 0.13.0 + V19；若 `add-ai-itinerary`（0.12.0 + V18）或并行 `add-experience-photos` 先落地，版本号顺延，不改验收语义。
- **原型扩展：** 我的旅行取消入口与原因选择超出当前原型；按 `prototype-ui-alignment` 先改原型再改实现，原型变更纳入 P3 / P4 证据。
- **状态叠加：** `add-trip-completion` 的四态尚未归档；本 change 不替换其 Requirement 块，但代码需在同一状态推导中组合取消优先级，P4 回归必须覆盖四态 + 取消。
- **原因裁剪：** 详情响应按请求人裁剪取消原因，需避免摘要 / 缓存复用导致泄漏；P3 设计明确边界。
