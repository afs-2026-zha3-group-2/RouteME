# 意图捕获 — REQ-020 灵感详情页同行者卡片化

- **候选能力：** `trip-plans`（MODIFIED：「查看行程详情与清晰的状态」的同行者展示口径）；`trip-companions` 只读消费（接受申请后进入同行者列表，不改变规则）
- **来源：** 用户当次指令「在灵感详情页，当前同行者是只展示了姓名，不是像发布者那样展示的card，看起来太丑了，需要进行修改」；并选择 SDD 流程（2026-11-17）
- **捕获日期：** 2026-11-17
- **分支：** 独立 worktree `.worktrees/refine-detail-companions`，分支 `feature/refine-detail-companions`，基线 `origin/main@6f9cb46`（P1 只写工件，无代码改动）
- **编号说明：** `origin/main` 当前最新登记为 REQ-019（`add-credit-account`），本需求顺延为 **REQ-020**；change-id 定为 `refine-detail-companions`
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话）

> 在灵感详情页，当前同行者是只展示了姓名，不是像发布者那样展示的card，看起来太丑了，需要进行修改

一句话：**把行程详情页「当前同行者」从纯姓名列表升级为与「发布者」同构的资料卡**，让同行者也能看到头像、学校 / 专业（或职业 / 城市）、简介与兴趣标签，并可点开公开资料；发布者已有独立资料卡，不再在同行者列表重复出现。

## 现状核对（2026-11-17，`origin/main@6f9cb46`）

| 预期能力 | 证据 | 结论 |
|---|---|---|
| 发布者用资料卡展示 | `RouteME/frontend/src/trips/TripDetailPage.tsx:468-496`（`publisher-row publisher-button` + `Avatar size="lg"` + 昵称 + `publisherSummary` + 简介 + 兴趣标签，整卡打开资料弹窗） | 已有可复用的视觉与交互模式 |
| 同行者只展示姓名 | `RouteME/frontend/src/trips/TripDetailPage.tsx:498-520`（`ul.detail-participants` 仅 `<span>{member.nickname}</span>` + 聊天链接） | 与发布者卡片视觉断裂，是本次要修的缺口 |
| 同行者数据已完整 | `RouteME/frontend/src/types.ts:21-30`（`DemoUser` 含 `school / major / job / city / bio / interests / avatar`）；`:119-125`（`TripDetail.participants: DemoUser[]`） | 前端已有全部展示字段，无需改接口 |
| 后端已返回完整资料 | `RouteME/backend/src/main/java/routeme/response/DemoUserResponse.java:10-36`；`RouteME/backend/src/main/java/routeme/service/impl/ApplicationServiceImpl.java:193-202` | 后端与契约均无需改动 |
| 参与者包含发布者 | `ApplicationServiceImpl.participants` 先加入 `publisherOf(trip)`，再加入已接受同行者；`openspec/specs/trip-plans/spec.md:195-199` 要求「当前同行者至少包含发布者本人」 | 当前列表会把发布者姓名重复展示一次；需要 MODIFIED 展示口径 |
| 契约把 participants 描述为同行者 | `RouteME/openapi.yaml:1890-1895` | 响应含义不变，仅前端展示方式变化 |
| 资料弹窗可复用 | `RouteME/frontend/src/profiles/ProfileContext.tsx:27-41`（全应用共用 `openProfile(userId)`）；`RouteME/frontend/src/shell/Avatar.tsx:12-46`（`sm / lg / xl` 三档，图片失败回退首字） | 同行者卡片可直接接入，无需新弹窗 |
| 原型当前是紧凑行 | `docs/prototype/ui.js:509-520`（`.companion` 行：头像 + 姓名 + 发起人 / 同行者 + 聊天）；`docs/prototype/styles.css:720-725` | 按 项目原型规则（`docs/prototype/prototype.html` + `styles.css`） 必须先改原型 |
| E2E 依赖旧列表 | `RouteME/e2e/tests/chat-entry.spec.ts:78-84`（`.detail-participants` 下的「聊天」链接） | 实现改名 / 改结构时需同步更新选择器 |
| 无独立后端 / 契约 / 迁移改动 | 上述证据 | 本需求是纯前端展示层 + 原型变更 |

## 用户裁决（2026-11-17）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | 列表范围 | **只展示同行者（不含发布者）**；发布者已有独立资料卡，不在同行者列表重复；没有同行者时展示空态提示 | 详情页需要 MODIFIED 展示口径；`joined_count` 统计口径不变 |
| D2 | 卡片信息密度 | **与发布者卡片一致**：头像 + 昵称 + 学校 / 专业（或职业 / 城市）+ 简介 + 兴趣标签；字段为空时按现有回退规则省略 | 复用 `publisherSummary` 与 `Avatar`；不新增字段 |
| D3 | 卡片交互 | **整卡打开资料弹窗**（`openProfile`）；聊天为卡片内独立入口，沿用既有可见条件 | 需要避免按钮嵌套链接；资料弹窗复用 |
| D4 | 开发位置 | **独立 worktree** 基于 `origin/main`，分支 `feature/refine-detail-companions` | 避开主工作区 `add-experience-photos` 未提交的原型改动 |

## 意图边界（初判）

- **覆盖：**
  - 行程详情页「当前同行者」改为资料卡列表，卡片结构与发布者卡片同构。
  - 每个同行者展示头像、昵称、学校 / 专业（或职业 / 城市）、简介与兴趣标签；字段缺失时省略，不出现空占位。
  - 整卡可点击打开该同行者的公开资料弹窗；聊天入口独立可见，条件与现状一致。
  - 发布者不在同行者列表重复展示；无其他同行者时展示可读空态。
  - 先改原型（`docs/prototype/ui.js` / `styles.css`），再改实现（`TripDetailPage.tsx` / `styles.css` / `tripMessages.ts`）。
  - 同步更新受影响的 E2E 选择器与断言，补同行者卡片的行为用例。
- **不覆盖：**
  - 后端、`openapi.yaml`、数据库迁移、同行者申请 / 接受 / 退出规则。
  - 发布者卡片本身的视觉与交互；`ProfileModal` 的内容与权限。
  - 首页行程卡、体验卡、我的旅行、申请处理页、聊天页的同行者展示。
  - 同行者排序规则（沿用后端返回顺序：发布者在最前，其余按申请时间）。
  - 新增角色、新增资料字段、头像上传、信用分等其它能力。

## 与现有 Living Spec / 能力的关系

- `trip-plans`「查看行程详情与清晰的状态」当前要求详情页展示「当前同行者」，且「当前同行者至少包含发布者本人」；本需求把**展示层**调整为「发布者资料卡 + 同行者资料卡（不含发布者）」，人数统计仍包含发布者（`joined_count`）。
- `trip-companions`「发布者处理申请并联动人数与状态」只读消费：接受申请后同行者进入列表，本需求不改状态机与人数规则。
- `user-profiles` / `ProfileModal` 只读复用：点击同行者卡片打开公开资料弹窗，不改端点与字段。
- `design-system`：沿用现有 `avatar` / `publisher-row` / `tag` / 卡片令牌，不新增色板语义。
- 无契约版本与迁移号变化。

## Discovery Decision

**Go（light intake，2026-11-17）。** 理由：候选能力一句话可说清（详情页同行者展示从纯姓名升级为发布者式资料卡）；与 `trip-plans` 的详情展示 Requirement 关系明确；现状证据完整（前端页面 / 类型 / 后端响应 / 契约 / 原型 / E2E 均可定位）；用户已就 D1–D4 裁决，无需升级完整 Discovery。
