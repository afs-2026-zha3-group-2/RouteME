# Story list — REQ-005（S03 灵感首页双视图）/ REQ-007（目的地与日期筛选）/ REQ-008（个人资料 S18）

- **来源：** `docs/prototype/stories.html`（MVP 17 条故事拆解）
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次状态迁移（本故事复用既有两份列表契约，只有页面视图状态迁移）
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S03 | 浏览招募中行程与旅行体验 | 浏览者 | P0 | 1 | 3 | 灵感首页 | REQ-005 | `refine-inspiration-home` | P4 Pass（2026-11-16），待 PR / G2 |

## Traceability

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S03 | REQ-005 §4 #1–#10 | `openspec/changes/refine-inspiration-home/specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md` | `requirement-workspace/stories/refine-inspiration-home.story.md` |

## Notes

- 本故事只覆盖灵感首页的浏览与视图切换；发布行程（S06）、详情（S05）、体验发布（S16）、参考发布（S17）不在本故事内。
- S03 的底层能力原属 REQ-002 / REQ-004；REQ-005 只收敛其首页验收口径（默认视图、双视图空/加载态、状态非颜色区分），不重复定义行程或体验能力。
- Change 已定义后按 1:1 归属：S03 的 AC 1–4 与场景全部归属 `refine-inspiration-home`，无重复覆盖、无孤儿场景。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。

---

# Story list — REQ-008（S18 完善个人资料并生成个人主页）

- **来源：** 用户提供的故事与 16 条验收标准（2026-11-16）；扩展原型 S02「查看他人的昵称、简介与旅行兴趣」
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次状态迁移（资料未完善 → 资料已完善）
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S18 | 完善个人资料并生成个人主页 | 新用户 | P0 | 1 | 3 | 个人资料完善页 / 个人主页 | REQ-008 | `add-user-profile` | P1 drafted（2026-11-16） |

## Traceability（REQ-008）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S18 | REQ-008 §4 #1–#17 | `openspec/changes/add-user-profile/specs/user-profile/spec.md`（ADDED，7 条需求）、`specs/user-auth/spec.md`（MODIFIED「注册账号」） | `requirement-workspace/stories/add-user-profile.story.md` |

## Notes（REQ-008）

- 原型 S02 只覆盖「看别人的昵称、简介与兴趣」的资料弹窗；S18 把它扩展成完整资料 + 个人主页，S02 的浏览诉求仍被满足。
- 头像必填的原始 AC 已被用户裁决 D1 覆盖为选填；必填清单以 REQ-008 §5 为准。
- 本故事不改行程、申请、聊天、体验的业务规则，只新增发布者 / 作者入口。
- 双 capability（`user-profile` ADDED + `user-auth` MODIFIED）按 REQ-005 先例，归档前需 SA 追认例外。

---

## REQ-007 — 灵感首页按目的地（省市级联）与日期筛选

- **来源：** `requirement-workspace/requirements/REQ-007-destination-area-filters.md`
- **Change：** `add-destination-area-filters`（两份 delta：`trip-plans`、`trip-experiences`）
- **拆分模式：** Workflow（数据底座 → 筛选/展示 → 体验日期 → 搜索移除）
- **范围：** 只含本 change（数据底座 + 筛选/展示 + 体验日期 + 搜索移除）；发布页目的地字段归 `add-trip-publish` 目的地修订（A），不在此故事列表。

| Story | Title | 角色 | Priority | Iteration | Size | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S1 | 目的地数据底座与区划字典（V11 + 6 位码 + 响应字段） | 浏览者/发布者 | P0 | 1 | M | 首页/详情 | REQ-007 | `add-destination-area-filters` | P1 drafted |
| S2 | 首页目的地省市级联筛选与地名展示 | 浏览者 | P0 | 1 | M | 灵感首页 | REQ-007 | `add-destination-area-filters` | P1 drafted |
| S3 | 旅行体验视图日期筛选与卡片口径 | 浏览者 | P0 | 1 | S | 灵感首页 | REQ-007 | `add-destination-area-filters` | P1 drafted |
| S4 | 移除关键词搜索（前端/后端/契约/测试） | 浏览者 | P0 | 1 | S | 灵感首页 | REQ-007 | `add-destination-area-filters` | P1 drafted |

### REQ-007 Traceability

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S1 | REQ-007 §4 #6、§4 #5 | `specs/trip-plans/spec.md`“省市二级行政区划字典与目的地代码” | `stories/REQ-007-destination-area-filters.story.md` |
| S2 | REQ-007 §4 #1–#4、#9–#11、#14–#16 | `specs/trip-plans/spec.md`“按目的地与日期筛选行程” | 同上 |
| S3 | REQ-007 §4 #12–#13 | `specs/trip-experiences/spec.md`“灵感首页的旅行体验视图” | 同上 |
| S4 | REQ-007 §4 #17 | `specs/trip-plans/spec.md`“本迭代不提供关键词搜索” | 同上 |

### REQ-007 Notes

- **发布页目的地字段（A）：** 归 `add-trip-publish` 目的地修订；本 change 只提供数据底座（`destination_code`/字典/响应字段）与筛选/展示。
- **归档顺序：** `refine-inspiration-home` → `add-destination-area-filters` → `add-trip-publish`；三者中只有本 change 属于 REQ-007。
- **搜索测试：** A 的搜索/目的地场景由本 change 改写；`refine-inspiration-home` 的搜索空态测试交其 owner。
- **原始故事点：** 2；本拆分为 S/M 相对规模，供排期参考，不改变原始故事点记录。

---

# Story list — REQ-011（S15 结束行程）

- **来源：** 用户提供的 S15 故事、10 条业务规则与 12 条验收标准（2026-11-16）
- **Change：** `add-trip-completion`（`trip-plans` MODIFIED + ADDED、`trip-companions` MODIFIED）
- **拆分模式：** Workflow（四态与自动流转 → 结束操作与善后 → 申请/聊天/体验回归）
- **口径：** 一条故事 = 一个状态机扩展 + 一次状态迁移（旅行中 → 已结束）

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S15 | 结束行程 | 行程发布者 | P0 | 3 | 1 | 我的旅行 / 行程详情 | REQ-011 | `add-trip-completion` | P4 Pass（2026-11-16，本地） |

## Traceability（REQ-011）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S15 | REQ-011 §4 S15-1 ~ S15-26 | `openspec/changes/add-trip-completion/specs/trip-plans/spec.md`、`specs/trip-companions/spec.md` | `requirement-workspace/stories/add-trip-completion.story.md` |

## Notes（REQ-011）

- 本故事只覆盖行程生命周期与结束善后；体验内容结构、统计接口形状、推送渠道不在本故事内。
- 双 capability（`trip-plans` + `trip-companions`）按 REQ-005 / REQ-007 / REQ-008 先例，归档前需 SA 具名追认例外。
- 与 `add-match-reason` 共享 `trip-companions`，同窗口归档需串行。
- 原始故事点 1，不再拆分；四态与结束操作必须同批交付，否则验收无法闭环。

---

# Story list — REQ-012（S14 同行安全提示与举报）

- **来源：** 原型故事 `docs/prototype/stories.html` S14「看到安全提示与举报入口」及其 3 条 AC（迭代 3 / P0 / 1 点 / 落点页面：详情页 + 聊天页）
- **Change：** `refine-safety-report`（`trip-companions` MODIFIED）
- **口径：** 一条故事 = 两个既有页面 + 复用一份举报契约 + 一次状态迁移（举报表单 → 回执）
- **编号说明：** 2026-11-16 起草时为 REQ-011；同日 `main` 将 S15 结束行程登记为 REQ-011（`add-trip-completion`），按「后到者顺延」改为 **REQ-012**。

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S14 | 看到安全提示与举报入口 | 与陌生人同行的学生 | P0 | 3 | 1 | 详情页 / 聊天页 | REQ-012 | `refine-safety-report` | P1 drafted（2026-11-16） |

## Traceability（REQ-012）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S14 | REQ-012 §4 #1–#7 | `openspec/changes/refine-safety-report/specs/trip-companions/spec.md` | 无独立故事文件：原型 S14 已提供 AC，本 change 以 proposal + delta 承接（与 REQ-010 同口径） |

## Notes（REQ-012）

- 本故事只覆盖详情页与聊天页的安全提示、举报入口与回执；体验发布页复用同一提示组件但不在落点内，证据发布页入口、举报后台处置、求助热线与位置共享不在本故事内。
- 安全提示与举报的**能力底座**由已归档的 `add-trip-companions` 提供；本故事只收敛展示口径（三条文本、集合区域、回执文案、本人行程入口）与边界说明，不重复定义举报记录与隐私红线。
- 用户裁决 D1–D4：按原型三条文本列表（详情页带集合区域、聊天页一行）；举报原因沿用现有四类、不升契约；本人行程隐藏举报入口；编号 REQ-012 / `refine-safety-report`。
- 子目标一句话可说明且端到端可观察（进入详情 / 聊天 → 读三条提示 → 举报 → 拿到「已收到，我们会处理」），故不再拆分。

---

# Story list — REQ-013（S11 我的旅行）

- **来源：** issue #13 `[P0] S11 我的旅行`；`docs/prototype/stories.html` S11
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次状态迁移（本故事复用 `GET /api/me/trips`，只新增一个只读聚合字段；页面状态迁移为「进入页面 → 切换分组 → 行内动作」）
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S11 | 一屏看到发布、申请、匹配与已结束 | 全部 | P0 | 2 | 2 | 我的旅行页 | REQ-013 | `refine-my-trips` | P1 drafted（2026-11-16） |

## Traceability（REQ-013）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S11 | REQ-013 §4 #1–#12 | `openspec/changes/refine-my-trips/specs/trip-companions/spec.md`（MODIFIED「我的旅行聚合与最低安全能力」） | `requirement-workspace/stories/refine-my-trips.story.md` |

## Notes

- 本故事只覆盖「我的旅行」聚合视图；发布行程（S06）、详情（S05）、申请处理（S09）、取消申请（S10）、退出同行（S13）、结束行程（S15）、体验分享（S16）、参考发布（S17）均不在本故事内，只作为行内入口被调用。
- 四组划分与状态推导沿用 `MyTripsServiceImpl` 与 `trip-plans` 的四态，本故事不重复定义。
- 原型中的「编辑 / 删除 / 参考发布」不在本迭代落地：前两者无路由与接口，后者属 S17。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。
