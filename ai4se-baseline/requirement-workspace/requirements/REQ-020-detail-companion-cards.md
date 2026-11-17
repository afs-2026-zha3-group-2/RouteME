# REQ-020 — 灵感详情页同行者卡片化（Ready 需求条目）

- **能力：** `trip-plans`（MODIFIED：「查看行程详情与清晰的状态」的同行者展示口径）；`trip-companions` 只读消费
- **对应 OpenSpec change：** `refine-detail-companions`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **来源：** 用户当次指令「在灵感详情页，当前同行者是只展示了姓名，不是像发布者那样展示的card，看起来太丑了，需要进行修改」；用户裁决 D1–D4（见 §9）
- **证据：** `requirement-workspace/intents/REQ-020-detail-companion-cards.md`；`RouteME/frontend/src/trips/TripDetailPage.tsx:468-520`；`RouteME/frontend/src/profile/profileDisplay.ts:26-28`；`RouteME/frontend/src/types.ts:21-30,119-125`；`RouteME/backend/src/main/java/routeme/service/impl/ApplicationServiceImpl.java:193-202`；`RouteME/openapi.yaml:1890-1895`；`docs/prototype/ui.js:509-520`；`docs/prototype/styles.css:712-725`；`RouteME/e2e/tests/chat-entry.spec.ts:78-84`；`openspec/specs/trip-plans/spec.md:191-199`

## Discovery Decision

**Go（light intake，2026-11-17）。** 能力边界单一：只改 `trip-plans` 的详情页同行者展示口径，不涉及后端、契约、迁移与同行规则；展示字段全部来自既有 `DemoUser`，资料弹窗与头像组件可直接复用；用户已就范围、信息密度、交互与开发位置作出裁决。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-020 |
| statement | 行程详情页的「当前同行者」SHALL 从纯姓名列表改为与发布者同构的资料卡：每张卡展示头像、昵称、学校 / 专业（或职业 / 城市）、简介与兴趣标签；整卡可打开该同行者的公开资料；聊天入口独立可用；发布者 MUST NOT 在同行者列表重复出现，无其他同行者时展示可读空态。 |
| actors | 浏览者 / 已登录用户（查看同行者卡片与公开资料）、发布者与已接受同行者（可用聊天入口）、同行者本人（看到自己的卡片，无自我聊天入口）、系统（按既有 participants 顺序返回，不新增接口）。 |
| rationale | 当前详情页把同行者压成一行姓名，与发布者资料卡视觉断裂，用户无法感知「和谁一起走」；同行者资料本就在响应中，升级为卡片能提升信任与匹配判断，且不需要新增后端能力。 |
| acceptance hints | 见 §4：同行者卡片展示、字段回退、整卡开资料、聊天入口、发布者不重复、空态、人数与排序、权限回归、响应式与双主题、原型先行。 |
| links to evidence | 见上方证据路径与 §6 Context。 |

## 1. Intent

一句话：**让「当前同行者」看起来和「发布者」一样可信**——每位同行者一张资料卡，头像、昵称、学校 / 专业（或职业 / 城市）、简介与兴趣标签都在卡上；点卡片看公开资料，点聊天进入会话；发布者只在自己的资料卡出现一次，没人同行时明确说「还没有其他同行者」。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 浏览者 / 未申请用户 | 可查看同行者卡片与公开资料；无聊天入口（沿用现状）。 |
| 申请处理中 / 已拒绝 / 已取消用户 | 可查看同行者卡片与公开资料；无聊天入口（沿用现状）。 |
| 发布者 | 可查看全部同行者卡片；可对每位同行者显示聊天入口。 |
| 已接受同行者 | 可查看全部同行者卡片；可对其他同行者与发布者显示聊天入口（沿用现状）；自己卡片不显示自我聊天。 |
| 已退出同行者 | 仍可查看详情与同行者卡片；聊天入口按现有「退出后仅与发布者保留会话」口径，不因本需求扩大。 |
| 系统 | 继续由 `participants` 返回「发布者 + 已接受同行者」；本需求只改变展示，不新增端点、字段与规则。 |

不新增角色；不改申请、接受、退出与聊天准入规则。

## 3. In / Out scope

**In scope**

- 详情页「当前同行者」区：把 `ul.detail-participants` 纯姓名列表改为资料卡列表。
- 卡片字段：头像（`Avatar size="lg"`）、昵称、学校 / 专业（或职业 / 城市，沿用 `publisherSummary` 回退）、简介（非空时展示）、兴趣标签（非空时展示）。
- 卡片交互：整卡主体可打开该同行者的公开资料弹窗；聊天入口为独立可聚焦控件，可见条件与现状一致。
- 列表范围：排除发布者（发布者已有独立资料卡）；无其他同行者时展示可读空态。
- 人数与排序：区标题保持「当前同行者」，人数仍按 `joined_count / capacity` 展示（含发布者）；卡片顺序沿用后端返回顺序。
- 原型先行：先改 `docs/prototype/ui.js` 的 `compPanel` 与 `docs/prototype/styles.css` 的同行者样式，再改实现。
- 文案：新增同行者空态文案；复用现有「聊天」文案。
- 样式：新增同行者卡片样式，复用现有 `avatar` / `publisher-row` / `tag` / 卡片令牌；浅色 / 深色与 1440 / 1024 / 768 / 390 宽度不横向溢出。
- 测试：更新 `chat-entry.spec.ts` 对旧 `.detail-participants` 的依赖，新增同行者卡片、资料弹窗、空态与聊天入口的 E2E 断言。

**Out of scope**

- 后端、`openapi.yaml`、数据库迁移、`participants` 顺序与含义。
- 同行申请、接受 / 拒绝、退出同行、聊天准入规则。
- 发布者资料卡本身的视觉与交互；`ProfileModal` 的内容、权限与资料字段。
- 首页行程卡、体验卡、我的旅行、申请处理页、聊天页的同行者展示。
- 头像上传、资料编辑、信用分等其它能力。
- 同行者排序规则变更、分页、搜索、筛选。
- 新增「同行者详情页」或独立路由。

## 4. Scenarios + AC hints（SHALL 式，可观察）

1. **C-1 同行者卡片展示** — Given 一条行程含发布者与 2 位已接受同行者，When 任意已登录用户打开详情页，Then「当前同行者」区 SHALL 展示 2 张同行者资料卡（不含发布者），And 发布者 SHALL 只在上方「发布者」资料卡出现一次，MUST NOT 在同行者列表重复。
2. **C-2 卡片字段与发布者同构** — Given 某同行者有头像、学校 / 专业、简介与兴趣标签，When 查看其卡片，Then 卡片 SHALL 同时展示头像、昵称 + 学校 / 专业、简介与兴趣标签；Given 该同行者没有简介或兴趣标签，Then 对应字段 SHALL 省略，MUST NOT 出现空占位、空标签或「undefined / null」文本。
3. **C-3 摘要回退** — Given 同行者没有学校与专业但有职业，Then 昵称后 SHALL 展示职业；Given 没有学校 / 专业 / 职业但有城市，Then SHALL 展示城市；Given 四者都为空，Then 卡片 SHALL 只展示头像与昵称，MUST NOT 出现分隔符悬空。
4. **C-4 整卡打开公开资料** — Given 用户查看某位同行者的卡片，When 点击卡片主体（头像或资料区），Then SHALL 打开该同行者的公开资料弹窗（`openProfile`），MUST NOT 发生页面跳转或打开聊天；关闭弹窗后 SHALL 回到原详情页位置。
5. **C-5 聊天入口独立可用** — Given 查看者是发布者或已接受同行者，When 查看其他同行者卡片，Then 卡片 SHALL 提供独立「聊天」入口，点击 SHALL 进入 `#/chat/{tripId}/{memberId}`；Given 查看者是未申请 / 待处理 / 已拒绝 / 已取消用户，Then 卡片 MUST NOT 提供聊天入口；Given 查看者就是该同行者本人，Then 其卡片 MUST NOT 出现自我聊天入口。
6. **C-6 发布者不在列表 / 空态** — Given 一条行程只有发布者、没有其他已接受同行者，When 打开详情页，Then「当前同行者」区 SHALL 展示可读空态提示，MUST NOT 展示空列表、发布者姓名或破损卡片；Given 之后有同行者被接受，Then 刷新详情页 SHALL 展示新的同行者卡片。
7. **C-7 人数与排序不变** — Given 一条计划 4 人、已加入 3 人（发布者 + 2 位同行者）的行程，When 打开详情页，Then 页头「已加入 3/4 人」与区标题人数口径 SHALL 保持不变（含发布者）；同行者卡片顺序 SHALL 与后端返回顺序一致（发布者在最前，其余按申请时间），本需求不重排。
8. **C-8 无后端与契约变化** — Given 本需求上线，When 检查接口与数据库，Then `TripDetailResponse.participants` 的字段与顺序 MUST NOT 变化，MUST NOT 新增端点、字段、迁移或契约版本变更；同行者卡片只消费既有 `DemoUser`。
9. **C-9 响应式与双主题** — Given 在 1440 / 1024 / 768 / 390 宽度与浅色 / 深色主题下查看详情页，Then 同行者卡片 SHALL 正常换行 / 堆叠，MUST NOT 出现横向溢出、文字截断导致的不可读或按钮被遮挡。
10. **C-10 原型先行与令牌一致** — Given 本需求进入实现，Then `docs/prototype/ui.js` / `styles.css` SHALL 先展示同行者资料卡与空态，再改实现；实现 SHALL 复用现有颜色 / 间距令牌，MUST NOT 写十六进制色值或魔法像素。

### 4.1 与现有能力的映射

| 本条目场景 | 现有能力 / 规格 | 关系 |
|---|---|---|
| C-1 / C-6 / C-7 | `trip-plans`「查看行程详情与清晰的状态」 | MODIFIED 展示口径：发布者资料卡 + 同行者资料卡（不含发布者）；人数统计不变 |
| C-2 / C-3 | `user-profile` 资料字段与 `publisherSummary` 回退规则 | 只读复用，不新增字段 |
| C-4 | `user-profiles` / `ProfileModal` | 只读复用 `openProfile(userId)` |
| C-5 | `trip-companions`「匹配后的一对一文字沟通」 | 可见条件与路由不变，只改卡片内入口位置 |
| C-8 | 现有 `TripDetailResponse` 与 `openapi.yaml` | 零变更；反向约束 |
| C-9 / C-10 | `design-system` 与 项目原型规则（`docs/prototype/prototype.html` + `styles.css`） | 复用令牌，先改原型 |

## 5. Constraints（仅事实，不含技术方案）

- **唯一数据源：** 同行者资料来自 `TripDetail.participants: DemoUser[]`，字段为 `avatar_initial / avatar_url / nickname / school / major / job / city / bio / interests`；不新增请求。
- **发布者在 participants 中：** 后端 `participants` 返回「发布者在最前 + 已接受同行者」，前端展示时过滤掉 `trip.publisher.id`；`joined_count` 仍包含发布者，页头数字不变。
- **资料弹窗复用：** 全应用共用 `ProfileContext.openProfile(userId)`；同行者卡片直接调用，不新建弹窗。
- **可交互元素不嵌套：** 卡片主体（资料入口）与聊天入口 MUST 为并列的可聚焦控件，不能把链接嵌在按钮内。
- **聊天可见条件不变：** `member.id !== currentUser.id && (isPublisher || entry.kind === 'accepted')`；本需求不扩大或收紧。
- **原型先行：** 按 项目原型规则（`docs/prototype/prototype.html` + `styles.css`），先改 `docs/prototype/ui.js` 的 `compPanel` 与 `docs/prototype/styles.css`，再改实现；颜色与间距使用现有令牌。
- **不改：** 后端、契约、迁移、同行规则、发布者卡片、`ProfileModal`、首页 / 我的旅行 / 聊天页展示。
- **E2E 选择器：** 旧 `.detail-participants` 会被替换或重构，`chat-entry.spec.ts` 的聊天入口断言需同步更新，不保留失效选择器。

## 6. Context

详情页目前把发布者做成完整资料卡（`publisher-row`），却把同行者压成一行姓名 + 聊天链接（`ul.detail-participants`）。用户在验收时直接指出这种视觉断裂「看起来太丑」。同行者资料（学校 / 专业 / 职业 / 城市 / 简介 / 兴趣 / 头像）已经随 `TripDetailResponse.participants` 返回，`ProfileModal` 也支持任意用户 id，因此这次只需把展示层升级为同构卡片，不需要后端投入。发布者已在独立区展示，继续在同行者列表重复出现会加剧噪音，因此按 D1 排除。原型当前给同行者的是紧凑 `.companion` 行，按项目规则必须先改原型再改实现。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-plans` | MODIFIED | 「查看行程详情与清晰的状态」的同行者展示口径：资料卡、排除发布者、空态；人数与排序不变。 |
| `trip-companions` | 不变（只读消费） | 接受申请后进入 `participants`；聊天准入与状态机不变。 |
| `user-profiles` / `ProfileModal` | 不变（只读复用） | 卡片点击复用 `openProfile`；端点、字段与权限不变。 |
| `design-system` | 变更（页面级） | 新增同行者卡片样式与空态；复用现有令牌与头像尺寸。 |
| 接口契约 `openapi.yaml` | 不变 | `participants` 字段与含义不变。 |
| 数据库 / 迁移 | 不变 | 无新增字段或表。 |
| 测试资产 | 变更 | `chat-entry.spec.ts` 选择器更新；新增同行者卡片、资料弹窗、空态、权限与响应式用例。 |
| 原型 `docs/prototype/` | 变更 | `compPanel` 改为资料卡列表 + 空态；新增卡片样式。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | 同行者列表是否包含发布者？ | 用户 | D1：只展示同行者，发布者不在列表重复（2026-11-17）。 |
| blocking | resolved | 卡片展示哪些字段？ | 用户 | D2：与发布者卡片一致（头像、昵称 + 学校 / 专业或职业 / 城市、简介、兴趣标签），空字段省略（2026-11-17）。 |
| blocking | resolved | 点击卡片做什么？ | 用户 | D3：整卡打开公开资料弹窗；聊天为独立入口（2026-11-17）。 |
| blocking | resolved | 在哪个工作区开发？ | 用户 | D4：独立 worktree 基于 `origin/main`，分支 `feature/refine-detail-companions`（2026-11-17）。 |
| non-blocking | resolved | 人数统计是否随列表排除发布者而变化？ | 用户 / 现状 | 不变：`joined_count` 仍含发布者，页头数字与容量口径不动（D1）。 |
| non-blocking | resolved | 同行者排序是否调整？ | 用户 / 现状 | 不调整：沿用后端返回顺序（发布者最前，其余按申请时间），列表仅过滤发布者。 |
| non-blocking | resolved | 空态文案与样式？ | 设计 / 实现 | P3 按原型定稿；语义为「还没有其他同行者」，不展示空列表或发布者姓名。 |
| non-blocking | deferred | 是否需要为 TripDetailPage 增加组件级单测？ | Dev | P3 决定；至少保证 E2E 覆盖卡片、资料弹窗、空态与聊天入口。 |
| non-blocking | deferred | 故事点如何估？ | SM | 纯前端展示层 + 原型 + E2E；由 SM 在排期时确认。 |

**blocking 项 = 0 未 resolved**，满足进入 impact / split 的硬门。

## 9. 用户裁决记录（2026-11-17）

| id | 议题 | 裁决 | 对 AC 的影响 |
|---|---|---|---|
| D1 | 列表范围 | **只展示同行者（不含发布者）** | C-1 / C-6 / C-7：发布者不重复；空态可见；人数口径不变 |
| D2 | 卡片信息密度 | **与发布者卡片一致**；字段为空时省略 | C-2 / C-3：字段与回退规则 |
| D3 | 卡片交互 | **整卡打开资料弹窗**；聊天为独立入口 | C-4 / C-5：资料弹窗 + 聊天路由；不嵌套可交互元素 |
| D4 | 开发位置 | **独立 worktree** 基于 `origin/main` | 交付与提交范围可控；不影响主工作区在途改动 |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why，外部可读） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（浏览者 / 申请中 / 发布者 / 同行者 / 已退出 / 系统） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1 | 通过 |
| — | resolved | §4 | ④场景具体可观察，共 10 条 | 通过 |
| — | resolved | §4 C-2 / C-3 / C-5 / C-6 / C-9 | ⑤异常与边界（字段缺失、空态、无权限、自我、响应式） | 通过 |
| — | resolved | §4 | ⑥结果可验证（卡片数量、字段、弹窗、路由、空态、人数、契约零变化） | 通过 |
| — | resolved | §5 / §7 | ⑦依赖与应用架构触点已识别（`trip-plans`、`trip-companions`、`user-profiles`、契约不变、原型） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking = 0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：复用 `DemoUser`，无新增字段 / 状态迁移 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：发布者过滤、空态、字段回退、聊天权限、自我、响应式 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：REQ-003 / 009 / 013 / 015 的展示与权限口径已对齐 | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：详情页卡片、空态、资料弹窗、聊天入口已逐面定义 | 通过 |
| SUGGESTION | deferred | §4 C-9 | 响应式只在 E2E / 人工走查覆盖，不做视觉回归工具 | P3 / P4 走查三档宽度与双主题 |
| SUGGESTION | deferred | metadata | 故事点未估 | SM 排期时确认 |

**DoR BLOCKER 计数 = 0；A0 ⑨–⑫ 全过。** 增补表见 `requirement-workspace/deep-dive.md`「REQ-020 增补」。
