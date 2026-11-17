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

# Story list — REQ-004（S16 发布游后体验）

- **来源：** 原型故事 `docs/prototype/stories.html` S16「发布游后体验」及其 4 条 AC；issue #18 `[P1] S16 发布游后体验`（迭代 3 / P1 / 3 点 / 落点页面：游后分享页）
- **Change：** 基线 `add-trip-experiences`（已归档，REQ-004）；本故事 R2 = `refine-experience-share`（`trip-experiences` MODIFIED + ADDED）
- **口径：** 一条故事 = 一个页面（游后分享页）+ 复用一份体验契约 + 一次状态迁移（已结束行程 → 体验已发布 / 已修改）

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S16 | 发布游后体验 | 完成旅行的用户 | P1 | 3 | 3 | 游后分享页 | REQ-004 | `refine-experience-share` | P4 Pass / G2 Pass / CI-CD Pass（2026-11-16，`build-e2abd4e`）；R2 布局对齐原型 P4 Pass / G2 Pass / CI-CD Pass（2026-11-16，`build-6ff2d21`），待 P5 |

## Traceability（REQ-004 / S16）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S16 | REQ-004 §4 #1–#8；`openspec/specs/trip-experiences/spec.md` 7 Requirement / 22 Scenario（基线） | `openspec/changes/refine-experience-share/specs/trip-experiences/spec.md`（MODIFIED 3） | 无独立故事文件：原型 S16 已提供 4 条 AC，本 change 以 proposal + delta 承接 |

## Notes（REQ-004 / S16）

- 主干能力（资格校验、两处展示、重复提交即修改、纯文字 + 三档强度 + 一条建议）已由 `add-trip-experiences` 归档交付；本故事 R2 只收敛展示口径：分享页 hero、「你的体验会去哪里」三条、「分享边界」两条、体验卡内置封面、两种不可用提示。
- 图片上传按 AC 记为增强项，本迭代不做；E2E 继续断言分享页没有上传入口。
- 图片上传增强项于 2026-11-17 单独立项为 REQ-018 / change `add-experience-photos`（P1，待 split）：两步上传 + 本地磁盘，≤6 张 / 单张 ≤5MB，首页体验卡保持内置封面，仅详情页与分享页展示图片；「本迭代不做」的口径只适用于 `refine-experience-share`。
- 「同一行程重复发布」按 AC 取更简单的一条：同一用户对同一行程只有一条体验，再次提交即修改（`upsert`），体验条数不变。
- 不可用原因在前端区分（未结束 / 未参加），服务端仍以 `EXPERIENCE_NOT_ALLOWED`（403）拒绝；不升 `openapi.yaml`、不改数据库迁移。

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

# Story list — REQ-012（S14 同行举报入口与回执）

- **来源：** 原型故事 `docs/prototype/stories.html` S14 rev2「举报入口与回执」及其 3 条 AC（迭代 3 / P0 / 1 点 / 落点页面：详情页 + 聊天页）；用户裁决 D5（移除全部安全提示）
- **Change：** `refine-safety-report`（`trip-companions` REMOVED + ADDED）
- **口径：** 一条故事 = 两个既有页面 + 复用一份举报契约 + 一次状态迁移（举报表单 → 回执）
- **编号说明：** 2026-11-16 起草时为 REQ-011；同日 `main` 将 S15 结束行程登记为 REQ-011（`add-trip-completion`），按「后到者顺延」改为 **REQ-012**。
- **修订：** rev1 为「安全提示与举报」；rev2 依裁决 D5 移除提示、入口提到页头右上，标题与 AC 同步改写。

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S14 | 举报入口与回执 | 与陌生人同行的学生 | P0 | 3 | 1 | 详情页 / 聊天页 | REQ-012 | `refine-safety-report` | P4 Pass（2026-11-16，已两次合并 `main`；G2 待 VL Neal） |

## Traceability（REQ-012）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S14 | REQ-012 rev2 §4 #1–#7 | `openspec/changes/refine-safety-report/specs/trip-companions/spec.md`（REMOVED 1 + ADDED 1） | 无独立故事文件：原型 S14 rev2 已提供 AC，本 change 以 proposal + delta 承接（与 REQ-010 同口径） |

## Notes（REQ-012）

- 本故事只覆盖详情页与聊天页页头的举报入口与回执；体验发布页（`ShareExperiencePage`）的「发布前提醒」保留现状且不出现举报入口，举报后台处置、求助热线与位置共享不在本故事内。
- 安全提示按裁决 D5 **全部下线**：详情页三条文本列表、聊天页一行提示与两套集合区域回退文案都不再由详情页 / 聊天页承载；`meeting_area` 仍在既有「行程安排 · 集合」事实行展示。体验发布页的提示形态单独保留。
- 举报的**能力底座**由已归档的 `add-trip-companions` 提供；本故事只收敛展示口径（页头入口位置、本人行程边界、回执文案）与弹窗的两句边界说明，不重复定义举报记录与隐私红线。
- 用户裁决 D1–D5：D1（三条提示）已被 D5 取代；D2 举报原因沿用现有四类、不升契约；D3 本人行程隐藏举报入口；D4 编号 REQ-012 / `refine-safety-report`；D5 移除提示、入口置于页头右上（B）。
- 子目标一句话可说明且端到端可观察（进入他人详情 / 聊天 → 页头找到举报 → 提交 → 拿到「已收到，我们会处理」），故不再拆分。

---

# Story list — REQ-010（S12 同行消息与集合确认）

- **来源：** 用户 2026-11-16 会话（SDD P1 输入）+ 原型 `docs/prototype/ui.js` `chat()`
- **口径：** 一条故事 = 一条可验收的垂直切片（页面 + 契约 + 状态迁移），允许前后端同批交付
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S12-1 | 聊天页按原型重构（会话列表 + 主区 + 头部动作 + 短轮询） | 已匹配同行者 | P0 | 1 | M | 同行消息 | REQ-010 | `refine-trip-chat` | P1 drafted |
| S12-2 | 退出同行后保留会话并可继续沟通 | 已匹配同行者 | P0 | 1 | S | 同行消息 / 我的旅行 | REQ-010 | `refine-trip-chat` | P1 drafted |
| S12-3 | 集合时间字段与三处展示 | 发布者 / 同行者 | P0 | 1 | M | 发布行程 / 行程详情 / 同行消息 / 我的旅行 | REQ-010 | `refine-trip-chat` | P1 drafted |
| S12-4 | 发布者维护集合区域与集合时间 | 发布者 | P0 | 1 | S | 行程详情 | REQ-010 | `refine-trip-chat` | P1 drafted |

### REQ-013 Traceability

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S12-1 | REQ-010 §4 #1–#14、#16 | `specs/trip-companions/spec.md`（MODIFIED「匹配后的一对一文字沟通」） | `stories/refine-trip-chat.story.md` |
| S12-2 | REQ-010 §4 #15 | `specs/trip-companions/spec.md`（MODIFIED「退出同行」） | 同上 |
| S12-3 | REQ-010 §4 #17–#22 | `specs/trip-plans/spec.md`（MODIFIED 发布 + 详情展示） | 同上 |
| S12-4 | REQ-010 §4 #23–#25 | `specs/trip-plans/spec.md`（ADDED「发布者维护集合信息」） | 同上 |

### REQ-013 Notes

- 本 change 修改了活规格 `trip-companions` 的「退出同行」与「匹配后的一对一文字沟通」两条需求；归档时用 MODIFIED 替换对应 Requirement 块。
- 集合区域不需要新增字段；集合时间为新增字段，沿用「本地日期 + 时间、无时区」语义。
- 并行约束：需先改原型（集合时间与集合编辑入口）再改实现（`@rule:prototype-ui-alignment`）。
- 统计口径不变：「已退出」不计入「参与同行」。
# Story list — REQ-014（S17 参考此行程发布）

- **来源：** 原型故事 `docs/prototype/stories.html` S17「参考此行程发布」及其 4 条 AC（P1 / 迭代 3 / 2 点 / 落点页面：发布行程页）
- **Change：** 无新建。复用已归档 / verified 的 `add-trip-experiences`（REQ-004）
- **口径：** 一条故事 = 一个发布页 + 复用一份发布契约 + 一次派生（源行程 → 新计划，无归属）
- **编号说明：** 接在 REQ-012 之后登记为 **REQ-014**；`add-trip-experiences` 已覆盖「参考此行程发布」，本故事按「已验证交付」收口。

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S17 | 参考此行程发布 | 被体验打动的浏览者 | P1 | 3 | 2 | 发布行程页 | REQ-014 | 无（复用 `add-trip-experiences` / REQ-004） | Verified（2026-11-16，已验证交付收口） |

## Traceability（REQ-014）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S17 | REQ-014 §4 #1–#6 | 无 Delta；权威为 Living Spec `openspec/specs/trip-experiences/spec.md:133-148`「参考此行程发布以产生新灵感」（2 场景 1:1 映射 REQ-014 #3 / #4） | 无独立故事文件：原型 S17 已提供 AC，本需求以 P1 意图 + Ready 条目承接 |

## Notes（REQ-014）

- 本故事覆盖两个入口（已结束行程详情、体验卡）、三字段预填、必填字段不沿用与「新计划无归属」；体验内容的发布 / 修改规则归 REQ-004。
- **「体验详情」按体验卡验收：** 现行产品没有独立体验详情页，Living Spec 用词为「体验卡」；新增详情页属后续需求。
- **「集合地点必须重新填写」按「不得沿用原行程取值」验收：** `trip-plans` 明确集合区域选填（`spec.md:151`）；本需求不把集合区域升级为必填。
- **无代码 / 契约 / 迁移 / 测试改动：** 参考发布为纯前端预填，`TripCreateRequest` 无来源字段；证据见 `intents/REQ-014-reference-publish.md`。
- 用户裁决 D1（已验证交付收口）/ D2（记录人 Jacky）/ D3（编号 REQ-014）。

# Story list — REQ-015（S11 我的旅行）

- **来源：** issue #13 `[P0] S11 我的旅行`；`docs/prototype/stories.html` S11
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次状态迁移（本故事复用 `GET /api/me/trips`，只新增一个只读聚合字段；页面状态迁移为「进入页面 → 切换分组 → 行内动作」）
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S11 | 一屏看到发布、申请、匹配与已结束 | 全部 | P0 | 2 | 2 | 我的旅行页 | REQ-015 | `refine-my-trips` | P1 drafted（2026-11-16） |

## Traceability（REQ-015）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S11 | REQ-015 §4 #1–#12 | `openspec/changes/refine-my-trips/specs/trip-companions/spec.md`（MODIFIED「我的旅行聚合与最低安全能力」） | `requirement-workspace/stories/refine-my-trips.story.md` |

## Notes

- 本故事只覆盖「我的旅行」聚合视图；发布行程（S06）、详情（S05）、申请处理（S09）、取消申请（S10）、退出同行（S13）、结束行程（S15）、体验分享（S16）、参考发布（S17）均不在本故事内，只作为行内入口被调用。
- 四组划分与状态推导沿用 `MyTripsServiceImpl` 与 `trip-plans` 的四态，本故事不重复定义。
- 原型中的「编辑 / 删除 / 参考发布」不在本迭代落地：前两者无路由与接口，后者属 S17。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。

# Story list — REQ-019（信用分账户与等级展示）

- **来源：** 用户当次会话提供的 P0 故事「信用分账户与等级展示」（信用系统迭代 1 / Story 1 / 2 点 / 落点页面：用户个人主页 + 管理后台用户详情页）
- **Change：** `add-credit-account`（`user-credit` ADDED：7 Requirement / 22 Scenario）
- **口径：** 一条故事 = 一个展示面（个人主页）+ 一份只读契约扩展 + 一次状态迁移（无信用账户 → 初始 80 分账户）
- **编号说明：** 本故事不在 `docs/prototype/stories.html` 的 S01–S18 内（原型把「信用体系」列为 MVP 之外），按延续序列记为 **S19** 以便与既有故事表并列。
- **需求编号说明：** P1 起草时原为 REQ-018；合并 `origin/main`（2026-11-17，`77ab02b`）后该号由 `add-experience-photos`（游后体验图片上传）占用，按项目「后到者顺延」惯例改为 **REQ-019**。
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S19 | 信用分账户与等级展示 | 平台用户 | P0 | 信用系统迭代 1 | 2 | 个人主页 | REQ-019 | `add-credit-account` | P1 drafted（2026-11-17） |

## Traceability（REQ-019）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S19 | REQ-019 §4 C-1 ~ C-16 | `openspec/changes/add-credit-account/specs/user-credit/spec.md`（ADDED：7 Requirement / 22 Scenario） | 无独立故事文件：以 proposal + Delta 承接（与 REQ-012 / REQ-014 同口径） |

## Notes（REQ-019）

- **不拆子故事：** 「用户创建 → 初始化账户 → 展示信用状态」是同一垂直切片；拆开只会得到「只有接口没有展示」的不可验收半成品。
- **管理端 AC 推迟：** 故事 AC3 / AC4 与 AC6 的管理端一半按裁决 D2 推迟，另开故事；本故事不覆盖，Delta 中以「管理后台信用分视图与计分明细的边界」显式约束。
- **不含计分事件：** 体验获赞加分、退出扣分、举报核实扣分、月度上限与封禁均属后续故事；本故事只交付账户与展示底座。
- **依赖：** `user-profile` / `user-profiles` 尚未归档；本故事只追加只读字段，不改其 Requirement 语义。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。
