# AC / DoV review — refine-my-trips

- **Change:** `refine-my-trips`（`trip-companions` MODIFIED，REQ-015 / S11）
- **Reviewed artifact:** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（1 Requirement / 11 Scenario；MODIFIED）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-015-my-trips.md`、`requirement-workspace/intents/REQ-015-my-trips.md`、`requirement-workspace/impact-brief.md` §16、`requirement-workspace/deep-dive.md`「REQ-015 增补」、`openspec/specs/trip-companions/spec.md`（Living Spec 基线）、`openspec/specs/design-system/spec.md`、`docs/prototype/ui.js` `mine()`
- **Timestamp:** 2026-11-16T17:30+0800
- **Reviewer:** Jay（AO）
- **Tooling:** `openspec validate refine-my-trips --strict` → `Change 'refine-my-trips' is valid`；`openspec show --deltas-only` → `deltaCount: 1`

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | Delta「我的旅行聚合与最低安全能力」→ 11 Scenario | 覆盖四段与计数、分组内容、行内动作、提醒定位、无待处理、重新可见、页内动作、空态、窄屏，以及两条既有安全场景 |
| AC-2 ACs are observable | Pass | 场景断言可见结果：分段与计数、默认分组、按钮文案与数量、跳转目标、同步后的列表变化、窄屏无重叠 | 无「正常工作 / 快速 / 正确」类表述 |
| AC-3 Negative / edge cases called out | Pass | 「无待处理申请」（不渲染空入口）、「分组空态给出主操作」、「窄屏动作不遮挡」、「分组内容与计数一致」 | 覆盖无待处理、空分组、窄屏与服务端分组口径 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只写用户可见行为与目标路由；「处理申请入口指向具体行程」是行为，不是组件选择 | 未指定 `Segmented` / CSS 类名 / 请求库 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | `proposal.md` In scope 9 条 ↔ 11 Scenario；Out of scope 无对应需求 | 未加入编辑 / 删除 / 参考发布 / 分页 / 轮询 |
| DoV-2 Ambiguities listed or resolved | Pass | REQ-015 §5 的 OQ-1 ~ OQ-5 全部 resolved | 无 blocking 歧义；「同步」的触发条件已写成可观察事件 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | IO：四组定义不由本 change 重定义；SA：MODIFIED 覆盖与基线保留；AO：E2E 角色断言与提醒目标 |
| DoV-4 No business implementation claimed done | Pass | 只改 Delta；现有实现仅作 as-is 证据 | `proposal.md` 的「What Changes」明确 P3 / P4 才落地 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 下方「需求映射」12/12 + 「基线保留」4/4 | REQ-015 §4 十二条场景全部有落点；Living Spec 4 个既有场景名保留 |

**Blocking gaps:** 无。G1-ready from the review's perspective；是否签署由 IO / SA 决定。

## Requirement mapping（REQ-015 §4 → Delta Spec）

| REQ-015 场景 | Delta Scenario | 覆盖判定 |
|---|---|---|
| #1 四段与计数 | 「分区展示我的旅行」 | 完整（四段、计数、默认分组） |
| #2 分组内容正确 | 「分组内容与计数一致」 | 完整（已匹配 / 已完成 / 申请状态的边界） |
| #3 条目可跳转 | 「分区展示我的旅行」第 3 条 | 完整（每个条目可跳转） |
| #4 我发布的动作 | 「行内动作按分组提供」 | 完整（查看 / 处理申请 / 待处理数 / 结束行程） |
| #5 我申请的撤回 | 「行内动作按分组提供」 | 完整（待处理时撤回；撤回后刷新为已取消） |
| #6 已匹配动作 | 「行内动作按分组提供」 | 完整（沟通 / 行程 / 退出） |
| #7 已完成动作 | 「行内动作按分组提供」 | 完整（发表或修改体验 + 查看） |
| #8 提醒指向具体行程 | 「待处理申请提醒」 | 完整（总数、入口目标、行内同数） |
| #9 无待处理提示 | 「无待处理申请」 | 完整（说明 + 不渲染入口） |
| #10 重新可见同步 | 「重新可见时同步状态」 | 完整（标签页可见 / 窗口焦点） |
| #11 页内动作后同步 | 「页内动作后同步状态」 | 完整（结束 / 撤回 / 退出后重取） |
| #12 窄屏与空态 | 「分组空态给出主操作」「窄屏动作不遮挡」 | 完整（空态 CTA 与 ≤640px 换行） |

## Living Spec 基线保留（MODIFIED 覆盖检查）

| `openspec/specs/trip-companions/spec.md` 既有场景 | Delta Scenario | 判定 |
|---|---|---|
| 分区展示我的旅行 | 「分区展示我的旅行」 | 保留并补充「带计数分段、默认我发布的」；原断言（四分区 + 条目可跳转）未削弱 |
| 待处理申请提醒 | 「待处理申请提醒」 | 保留并补充「入口指向具体行程、行内同数」 |
| 安全提示常驻 | 「安全提示常驻」 | 原文保留，未改写 |
| 提交举报并收到回执 | 「提交举报并收到回执」 | 原文保留，未改写 |

Requirement 正文的安全约束（详情页与聊天页提示、举报入口与回执、不公开电话 / 证件 / 精确住址）逐字保留；新增的只是「我的旅行」页面结构与同步要求。

## Proposal → Delta 覆盖

| Proposal In scope | Delta 落点 |
|---|---|
| 页头（标题 / 待处理摘要 / 发布按钮） | 「分区展示我的旅行」「待处理申请提醒」 |
| 四段带计数、默认我发布的 | 「分区展示我的旅行」「分组内容与计数一致」 |
| 行式列表与窄屏换行 | 「窄屏动作不遮挡」 |
| 行内动作（查看 / 处理 / 结束 / 撤回 / 沟通 / 退出 / 写体验） | 「行内动作按分组提供」 |
| 待处理提醒定位 + 无待处理说明 | 「待处理申请提醒」「无待处理申请」 |
| 重新可见 / 页内动作同步 | 「重新可见时同步状态」「页内动作后同步状态」 |
| 分组空态与主 CTA | 「分组空态给出主操作」 |
| 保留资料卡与完成组体验入口 | 「行内动作按分组提供」的已完成行 + proposal D6 |
| `pending_applications` 只读字段 | 不改变 Delta 语义；由 `proposal.md` 影响面与 `OpenApiTest` 覆盖 |

## 规格解释裁决

1. **「一屏」的判定：** 不做像素级断言；以「四段可见 + 行式列表一屏至少 4 条（1440 宽）」为人工走查口径，E2E 只断言结构与计数。
2. **「同步」的触发：** 明确为 `visibilitychange → visible` 与 `window focus`；分组切换、行内展开都不触发新请求，避免放大请求量。
3. **「处理申请」入口：** 行内入口与页头提醒都跳 `#/trips/{id}/applications`；若该行程已结束后端会关闭处理，按钮是否隐藏按行程状态决定（沿用 `add-trip-completion`）。
4. **「已完成」分组的分享入口：** 沿用 `refine-experience-share` 的「发表游后体验 / 修改我的体验」文案与 `loadMyExperiences` 判定，本 change 不复制其资格规则。
5. **资料卡：** 原型没有 `.mine-profile-card`；因 `add-user-profile` 规格与 E2E 依赖，保留为 known deviation（proposal D6）。
6. **`pending_applications` 兼容性：** `required` 仍为原 5 项；新字段可选，旧客户端忽略即可；`openapi.yaml` 递增次版本。

## 残余风险

| 角色 | 风险 | 缓解 |
|---|---|---|
| IO（WAYNE） | Delta 整块替换 Living Spec 的「我的旅行聚合与最低安全能力」可能丢安全约束 | 基线 4 场景逐字保留；P5 归档前 diff 复核 |
| SA（Neal） | 「同步」在无头 E2E 中依赖事件派发，可能测不到真实浏览器行为 | E2E 用 `page.evaluate(() => window.dispatchEvent(new Event('focus')))` + 接口改动制造状态变化；人工走查补一档 |
| AO（Jay） | 与 `refine-experience-share` 并行改同一页面 | 归档顺序登记；P4 `git pull` 后跑 `experiences.spec.ts` 回归 |
| AO（Jay） | 行内动作增多导致窄屏拥挤 | `design-system` 的「我的旅行列表对齐」作为验收项，P4 三档走查 |

## Next

- `phase=p2` → `consistency-lint.md` → `g1-decision.md`（IO WAYNE + SA Neal 具名签署）。