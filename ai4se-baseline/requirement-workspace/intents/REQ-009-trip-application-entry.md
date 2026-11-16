# 意图捕获 — REQ-009 提交同行申请（S08）

- **候选能力：** `trip-companions`（MODIFIED — 申请入口状态与待处理展示）
- **来源：** 用户指令「作为想加入的人，我看到一个行程，我想要加入，所以希望点击申请后加入该行程团队，并且我希望留一句话说明，以便让发起人判断我是否合适」；原型故事 `docs/prototype/stories.html` S08「提交同行申请」及其 3 条 AC；2026-11-16 用户对 4 项范围问题的答复
- **捕获日期：** 2026-11-16
- **分支 / Worktree：** `feature/refine-trip-application`，基于 `origin/main@b93f45b` 的独立 worktree（当前主工作区仍在处理 `feature/add-user-profiles` 的 merge）

## 原始意图（一句话）

作为想加入的人，我希望在他人「招募中且未满员」的行程详情页填写一句说明并提交同行申请，生成一条待处理申请；提交后我能看到「已申请、等待回应」的当前状态，并在发布者处理前撤回。

## 为什么（价值假设）

`add-trip-companions` 已归档并进入 Living Spec，后端已具备提交、取消、接受、拒绝、满员联动与聊天权限。但当前前端把申请做成**弹窗**，与原型的内联申请区不一致；重复申请时只把 `DUPLICATE_APPLICATION` 错误码原样显示；提交后的状态区是独立的 Tag 区块，而不是原型「下一步」面板里的等待提示与撤回按钮。结果是 S08 的体验在「入口 → 提交 → 待处理 → 撤回」这条最短链路上与原型脱节，用户无法确认「我到底申请成功没有、下一步该做什么」。本需求验证的假设是：**把申请入口与待处理态按原型收敛后，浏览者能在一屏内完成「判断 → 留一句话 → 提交 → 等待/撤回」，而不需要理解弹窗或错误码。**

## 现状核对（2026-11-16，`origin/main@b93f45b`）

| 事实 | 证据 | 结论 |
|---|---|---|
| 后端已拒绝申请自己的行程 | `ApplicationServiceImpl.apply` 先判 `publisherId == applicantId` → 403 `FORBIDDEN` | 已有，保留 |
| 后端已拒绝重复申请（pending / accepted） | `existsActive` → 409 `DUPLICATE_APPLICATION` | 已有，保留；缺前端友好文案 |
| 后端已拒绝满员 / 已结束 / 已取消 | `trip.status() != RECRUITING` → 409 `TRIP_NOT_OPEN` | 已有，保留 |
| 说明为选填且 ≤120 字 | `normalizeMessage`；`openapi.yaml` 0.7.0 `message nullable maxLength 120` | 沿用，不改契约 |
| 本人行程不展示申请按钮 | `TripDetailPage` 的 `canApply` 排除 `isPublisher` | 已有，保留 |
| 满员 / 已结束前端隐藏入口 | `canApply` 排除 `full` / `completed`，显示「当前不可申请 / 这条行程已结束」 | 已有，文案与原型不同 |
| 申请入口是弹窗 | `TripDetailPage` 的 `Modal` + `Input.TextArea` | **与原型不一致，需改** |
| 重复申请错误只显示码 | `api.ts` 抛 `Error(body.code)`；页面 `Alert description={actionError}` | **需映射为「已申请，请等待回应」** |
| 提交后状态 | 独立 `application-status` Tag「申请待处理」+ 说明 + 取消按钮 | **与原型「等待回应提示 + 撤回申请」不一致，需改** |
| 原型入口 | `ui.js` `actionBox`：内联 `apply-form`（一句申请说明、120 字、提交同行申请、聊天说明） | 视觉与交互基准 |
| 原型待处理 | `ui.js`：警告提示「申请已提交，等待 {昵称} 回应。处理前你可以随时撤回。」+「撤回申请」 | 视觉与交互基准 |

## 用户裁决（2026-11-16）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | 申请说明必填还是选填 | **选填，保持现状** | 不新增后端校验；留空提交生成 PENDING；不改 Living Spec 的「选填」口径 |
| D2 | 待处理态形态 | **严格按原型**：内联申请区；提交后显示等待回应提示 + 撤回申请 | 不使用字面「已申请，待处理」按钮；「可查看当前状态」由等待提示与「我的旅行 → 我申请的」共同满足 |
| D3 | 编号与命名 | **REQ-009 / `refine-trip-application`** | 能力 `trip-companions`（MODIFIED）；一条分支一个 change |
| D4 | 起始分支 | **独立 worktree，基于 `origin/main`** | 不阻塞另一会话的 `add-user-profiles` merge |

## 意图边界（初判）

- **覆盖：**
  - 详情页的申请入口改为原型的内联申请区；仅对「他人 + 招募中 + 未满员 + 无 pending/accepted 申请」展示。
  - 申请说明选填、≤120 字；提交生成 PENDING。
  - 提交成功后申请区变为待处理态：等待发布者回应提示 + 撤回申请；刷新后仍为待处理。
  - 重复申请（已有 pending / accepted）被后端拒绝，前端提示「已申请，请等待回应」，不新增申请。
  - 满员 / 已结束：入口不可用并显示原型理由；绕过前端提交时后端同样拒绝（409 `TRIP_NOT_OPEN`）。
  - 撤回后（行程仍可申请）恢复内联申请区。
  - 本人发布的行程不显示申请入口；发布者的申请处理入口不变。
- **不覆盖：**
  - 自动加入团队、跳过发布者审核、即时聊天权限。
  - 申请说明改为必填、字数上限调整、富文本 / 附件。
  - 新增后端端点、数据库迁移、申请状态机变更、契约版本变更。
  - 行程卡片上的申请入口、批量申请、申请提醒 / 推送。
  - 发布者处理申请（接受 / 拒绝 / 批量）、我的旅行分组与聊天（沿用既有能力）。

## 与现有 Living Spec / 能力的关系

- `trip-companions` 的 Living Spec「提交与取消同行申请」已经写明：招募中且未满员、说明选填 ≤120、阻止本人 / 重复 / 满员 / 已结束。本需求不新增业务规则，只把**入口状态与展示**补成可验收的增量，因此以 **MODIFIED** 表达，保留既有 5 个场景。
- `trip-plans` 仍拥有行程状态与人数：`recruiting / full / completed` 与 `joined_count`。本需求只读消费，不改状态推导。
- `openapi.yaml` 0.7.0 已定义 `message` 选填 ≤120 与 `DUPLICATE_APPLICATION` / `TRIP_NOT_OPEN` 错误码，本需求**预期不改契约**。
- 原型 `docs/prototype/ui.js` 的 `actionBox` 与 `store.js` 的 `canApply` 是视觉与交互基准；不复制其 mock 数据与演示控制（视觉基准 `docs/prototype/prototype.html` + `styles.css`）。

## Discovery Decision

`Go` — 入口、说明必填性、待处理形态与编号均已由用户裁决；后端规则与契约已存在；落点页面（行程详情）与可观察结果（PENDING、待处理提示、重复提示、满员 / 结束拒绝）明确；无非阻塞项会改变应用架构边界。日期：2026-11-16。
