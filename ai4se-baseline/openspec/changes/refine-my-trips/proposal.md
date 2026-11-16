# 变更提案：refine-my-trips

- **需求来源：** 用户故事 S11「我的旅行」（issue #13，P0 / 迭代 2 / 2 点 / 落点页面：我的旅行页）｜ **需求条目：** `requirement-workspace/requirements/REQ-013-my-trips.md`
- **能力：** `trip-companions`（MODIFIED）
- **规模：** S（一个页面的结构重排 + 一个只读聚合字段 + 两处 E2E 角色断言）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:artifact-review-gate`、`@rule:git-commit-conventions`、`@rule:web-coding-style`（含「组件选型 Ant Design 优先」）、`@rule:api-contract`、`@rule:web-testing`、`@rule:pii-scrubbing`；视觉基准：`docs/prototype/ui.js` `mine()` + `docs/prototype/styles.css` `.seg` / `.mine-row` / `.mr-*`
- **基线：** `origin/main@f6da5da`（工作树 `RouteME-s11`，分支 `feature/refine-my-trips`）。已归档：`add-trip-plans`、`add-trip-companions`、`add-trip-experiences`、`add-user-auth`、`add-user-profile`、`add-user-profiles`、`add-trip-publish`、`add-trip-completion` 等。进行中：`refine-experience-share`（同改「我的旅行」完成组入口）、`refine-inspiration-home`、`add-destination-area-filters`、`add-match-reason`、`refine-trip-application`、`refine-safety-report`、`add-user-logout`。
- **归档顺序：** `refine-experience-share` 与本 change 都改「我的旅行」的展示面（前者改完成组体验入口，后者改整页结构）。本 change 的 delta 以当前页面为基线，归档时应晚于或同批于 `refine-experience-share`，并在 P5 复核两处文案不冲突。

## Why

`add-trip-companions` 已把四组聚合接口与页面交付并归档：`GET /api/me/trips` 返回我发布的 / 我申请的 / 已匹配 / 已完成，页面用 antd `Tabs` + `TripCard compact` 展示。但 S11 的落点页面与原型、与已交付能力之间仍有六处缺口：

- **骨架不符原型。** 原型是 `page-head`（标题 + 副标题 + 「发布新行程」）+ 带计数的四段 `.seg` + `.mine-row`（84px 目的地封面、标题与状态徽标、单行元信息、备注、右侧动作列）；实现是裸标题 + 资料卡 + `Tabs` + 104px 封面条的大卡片，一屏只能看到两三条。
- **提醒可能跳错。** `pending_application_count > 0` 时「去处理」固定跳 `published[0]`；待处理申请在另一条行程时会进入错误的申请列表。
- **已交付能力在聚合页不可达。** 撤回申请、退出同行、查看行程、处理申请都已存在（`cancelApplication` / `leaveTrip` / `ApplicationsPage`），但聚合页只暴露「结束行程」「聊天」「写体验」；「我申请的」整行是链接，没有撤回。
- **状态不同步。** 页面只在挂载时取数；长时间停留、跨标签页或在详情页操作后回到本页，四组与待处理数可能是旧的。
- **AC 无证据。** 现有 E2E 只断言 `#/mine` 的标题与两个 tab 存在。
- **聚合接口缺按行程计数。** 要渲染原型的「申请 · N」并把提醒定位到具体行程，前端需要后端给出按行程的待处理数。

## What Changes

- `trip-companions`（MODIFIED）：「我的旅行聚合与最低安全能力」保留 4 条基线场景名，补 8 条场景，明确四段与计数、行内动作、提醒定位、重新可见同步与窄屏对齐。
- 前端：`MyTripsPage` 按原型重排（`page-head` + `Segmented` 四段带计数 + `.mine-row` 行式列表 + 分组空态）；行内动作按「已交付能力」补齐；待处理提醒指向具体行程；`visibilitychange` / `focus` 重新拉取。
- 新增 `mine/mineTrips.ts` 纯逻辑：分组计数、提醒目标、行动作可用性、日期区间 / 出发日标签（node 环境可测）。
- 后端：`MyTripsResponse` 新增只读 `pending_applications: [{trip_id, count}]`，与既有总数同源；不改分组规则、状态机、权限或表结构。
- 契约：`openapi.yaml` 的 `MyTrips` 增加可选 `pending_applications`，`required` 不变；`OpenApiTest` 增断言。
- 测试：新增 `mineTrips.test.ts` 与 `e2e/tests/mine.spec.ts`；更新 `companions.spec.ts` / `experiences.spec.ts` 中受分段控件角色影响的断言。
- 不改：`TripCard` / 体验卡 / 详情页视觉，四组定义，行程状态推导，`ApplicationsPage` 逻辑。

## 问题（现状差距）

1. **骨架。** `MyTripsPage` 无副标题、无发布按钮、无计数分段；行用 `TripCard compact`（封面 104px + 路线 + 标签 + 进度条），与原型 `.mine-row` 的信息密度不同。
2. **提醒。** `Alert` 的 action 固定 `data.published[0].id`；无「申请 · N」行内入口。
3. **动作。** 我发布的只有「结束行程」；我申请的只有状态徽标；已匹配只有「聊天」；已完成没有「查看」。原型对应的撤回、退出、查看、处理申请入口缺失。
4. **同步。** `useEffect(() => reload(), [reload])` 只在挂载时触发。
5. **证据。** `companions.spec.ts:145-147` 只断言标题与两个 tab。
6. **接口。** `MyTripsResponse` 只有总待处理数。

## 范围

**In scope**

- 页头：标题、副标题（待处理摘要）、「发布新行程」主按钮。
- 四段带计数的分段切换，默认「我发布的」。
- `.mine-row` 行式列表：84px 目的地色调封面、标题 + 状态徽标、元信息（目的地 · 日期区间 · 人数 · 出发日）、备注、右侧动作列；≤640px 动作换行。
- 行内动作：查看、处理申请（含待处理数）、结束行程、撤回申请、与发起人沟通、退出同行、发表 / 修改体验。
- 待处理提醒：总数 + 指向具体行程的入口；无待处理时只显示说明。
- 状态同步：`visibilitychange`（可见）与 `focus` 重取；页内动作成功后重取。
- 分组空态与主 CTA。
- 保留 `.mine-profile-card` 与完成组体验入口。
- 后端只读字段 `pending_applications` + 契约 + 测试。
- 为 `trip-companions` 写 MODIFIED delta：保留 4 条基线场景，新增 8 条。

**Out of scope**

- 编辑 / 删除行程（无路由与接口）。
- 「参考此行程发布」（S17 / issue #19）。
- 行程卡、体验卡、详情页视觉重做。
- 四组的分组规则、申请状态机、行程四态与体验资格。
- 分页 / 搜索 / 排序。
- 推送 / 邮件通知。
- 自绘分段控件或第二套 UI 组件库。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/frontend/src/mine/MyTripsPage.tsx` | 重排页面：页头、分段、行式列表、空态、提醒定位、动作列、可见性同步 |
| `RouteME/frontend/src/mine/mineTrips.ts`（新增） | 纯逻辑：计数、提醒目标、行动作、日期 / 出发日标签 |
| `RouteME/frontend/src/mine/mineTrips.test.ts`（新增） | 上述纯逻辑的 node 单测 |
| `RouteME/frontend/src/i18n/tripMessages.ts` | 新增副标题 / 动作 / 空态 / 提示文案；清理被替代的 `mineEmpty` 等 |
| `RouteME/frontend/src/styles.css` | `.mine-row` 改三列网格，新增 `.mr-cover` / `.mr-meta` / `.mr-note` / `.seg-count` 等价样式；窄屏断点 |
| `RouteME/frontend/src/types.ts` | `MyTrips.pending_applications` |
| `RouteME/backend/.../response/MyTripsResponse.java` | 新增 `List<PendingApplicationCount> pendingApplications` |
| `RouteME/backend/.../service/impl/MyTripsServiceImpl.java` | 由既有 pending stream 收集按行程计数 |
| `RouteME/backend/.../response/PendingApplicationCount.java`（新增） | `tripId` + `count` 只读记录 |
| `RouteME/backend/.../controller/MyTripsControllerTest.java` | 断言新增字段与分组不变 |
| `RouteME/openapi.yaml` / `OpenApiTest` | `MyTrips.pending_applications` schema 与断言 |
| `RouteME/e2e/tests/mine.spec.ts`（新增） | 四组、计数、提醒、动作、同步 |
| `RouteME/e2e/tests/companions.spec.ts` / `experiences.spec.ts` | 分段控件角色断言 `tab` → `radio` |
| Living Spec `openspec/specs/trip-companions/spec.md` | 归档阶段用本 change 的 delta 替换「我的旅行聚合与最低安全能力」块 |

## 关键决策

| id | 决策 | 理由 |
|---|---|---|
| D1 | 页面骨架按原型：`page-head` + 带计数分段 + `.mine-row` 84px 行式列表 | 直接满足「一屏看到所有状态」，并落实 `design-system` 的「我的旅行列表对齐」 |
| D2 | 分段用 antd `Segmented`，不复制原型 `.seg` DOM | 规则要求 antd 优先；`styles.css` 的 `.ant-segmented*` 已按原型胶囊样式对齐 |
| D3 | 行内动作只落地已交付能力；编辑 / 删除 / 参考发布不做 | 无路由或接口，属其它故事；避免半成品入口 |
| D4 | 待处理数按行程由后端返回，提醒据此定位 | 前端无法从总数推断是哪条行程；只读聚合，无迁移 |
| D5 | 同步用可见性 / 焦点事件，不用轮询 | 与聊天页的短轮询区别开，避免空闲请求；行为可测 |
| D6 | 保留 `.mine-profile-card` | `add-user-profile` 规格与 E2E 依赖；原型先行差异记为 known deviation |

## 验收信号

| AC（issue #13） | 可观察信号 |
|---|---|
| 分区展示四组 | 四个分段可见且各带条数；切换后列表内容属于该组 |
| 待处理可点击提醒 | 页头显示总数；「去处理」与行内「处理申请 · N」都打开存在待处理申请的行程的申请处理页 |
| 与详情页状态一致 | 在详情页接受 / 取消 / 退出后回到本页，四组与计数更新（无需手动刷新浏览器） |
| 每条可跳转 | 行标题与「查看」都打开 `#/trips/{id}` |
| 窄屏不重叠 | ≤640px 时动作换行到卡片下方，无溢出 / 遮挡 |

## 残余风险

| 风险 | 缓解 |
|---|---|
| 分段控件角色从 `tab` 变 `radio` 破坏既有 E2E | 同批更新两处断言，并在 P4 运行 `companions` / `experiences` / `mine` 三套 |
| 与 `refine-experience-share` 并行改同一页面 | 本 change 只改结构与动作列，不复制其分享入口文案；归档前复核；两者不同分支，冲突在 P4 首次 `git pull` 时解决 |
| `pending_applications` 让聚合响应变大 | 只含待处理数 > 0 的行程；规模由用户自身发布量决定；无分页需求 |
| 可见性事件在测试环境不可靠 | 纯逻辑外的同步行为由 `window.dispatchEvent(new Event('focus'))` 在 E2E 触发；单测只覆盖纯逻辑 |
| 删除 `mineEmpty` 等文案影响其它页面 | 先 grep 调用点；只删除本页独占键 |

## 提交与偏离

- 按用户当次要求：P0–P4 每阶段一次提交，提交信息 `docs(p<N>): refine-my-trips …` / `feat(p4): …`；push 前先 `git pull --rebase origin main`。
- 该做法是 `@rule:git-commit-conventions` 的当次显式偏离（规则只允许 verify / archive 两次提交），已在 P1 记录与 handoff 中登记。