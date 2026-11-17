# 变更提案：refine-detail-companions

- **需求来源：** 用户验收反馈「在灵感详情页，当前同行者是只展示了姓名，不是像发布者那样展示的card，看起来太丑了，需要进行修改」（2026-11-17）｜ **需求条目：** `requirement-workspace/requirements/REQ-020-detail-companion-cards.md`
- **能力：** `trip-plans`（MODIFIED：「查看行程详情与清晰的状态」的同行者展示口径）；`trip-companions` / `user-profiles` 只读消费
- **规模：** S（1 个详情页展示区 + 原型 + E2E；零后端 / 契约 / 数据库迁移；无新路由、无新页面、无新端点）
- **规则：** 项目原型规则（`docs/prototype/prototype.html` + `styles.css`，先改原型再改实现）、`@rule:web-coding-style`、`@rule:naming-conventions`、`@rule:web-testing`、`@rule:tdd-cycle`、`@rule:git-branching-and-pr`、`@rule:sdd-artifacts`

## 问题

行程详情页目前把「发布者」做成完整资料卡（头像、昵称 + 摘要、简介、兴趣标签，整卡可打开公开资料），却把「当前同行者」压成一行姓名 + 聊天链接（`TripDetailPage.tsx:498-520`）。这带来三个问题：

- **视觉断裂：** 同一页里发布者是卡片、同行者是纯文本，用户直接反馈「看起来太丑」，也无法感知同行者的学校 / 专业、简介与兴趣。
- **信息浪费：** `TripDetailResponse.participants` 已经返回完整的 `DemoUser`（学校 / 专业 / 职业 / 城市 / 简介 / 兴趣 / 头像），`ProfileModal` 也支持任意用户 id；数据齐全，只是没有展示。
- **发布者重复：** 后端 `participants` 先放发布者再加入已接受同行者，当前列表会把发布者姓名重复展示一次，与上方「发布者」资料卡重复。

本变更只做这条链的展示层垂直切片：**同行者资料卡 + 发布者去重 + 空态 + 资料弹窗 + 独立聊天入口**。同行申请 / 接受 / 退出 / 聊天准入与后端均不变。

## 范围

**In scope**

- `trip-plans`（MODIFIED）：「查看行程详情与清晰的状态」的同行者展示口径。
- 详情页「当前同行者」改为资料卡列表：头像、昵称、学校 / 专业（或职业 / 城市，沿用 `publisherSummary` 回退）、简介（非空）、兴趣标签（非空）。
- 整卡主体打开该同行者的公开资料弹窗（`openProfile`）；聊天入口为卡片内独立的可聚焦控件，可见条件与现状一致。
- 列表过滤发布者（发布者只保留上方资料卡）；无其他同行者时展示可读空态。
- 人数与排序不变：`joined_count / capacity` 仍含发布者；卡片顺序沿用后端返回顺序。
- 原型先行：先改 `docs/prototype/ui.js` 的 `compPanel` 与 `docs/prototype/styles.css`，再改实现。
- 文案与样式：新增同行者空态文案；新增卡片样式，复用现有 `avatar` / `publisher-row` / `tag` / 卡片令牌。
- 测试：更新 `chat-entry.spec.ts` 对 `.detail-participants` 的依赖；新增同行者卡片、资料弹窗、空态、聊天入口与响应式断言。
- 登记：`registry.md` / `handoff.md` 记录 REQ-020 → `refine-detail-companions`。

**Out of scope**

- 后端、`openapi.yaml`、数据库迁移、`participants` 字段 / 顺序 / 含义。
- 同行申请、接受 / 拒绝、退出同行、聊天准入规则。
- 发布者资料卡本身的视觉与交互；`ProfileModal` 的内容、权限与资料字段。
- 首页行程卡、体验卡、我的旅行、申请处理页、聊天页的同行者展示。
- 头像上传、资料编辑、信用分等其它能力。
- 同行者排序规则变更、分页、搜索、筛选；独立「同行者详情页」或新路由。

## 影响面

| 位置 | 改动 |
|---|---|
| `frontend/src/trips/TripDetailPage.tsx` | 同行者区从 `ul.detail-participants` 改为资料卡列表；过滤发布者；空态；卡片主体开资料、聊天独立入口 |
| `frontend/src/i18n/tripMessages.ts` | 新增同行者空态文案；复用「聊天」文案 |
| `frontend/src/styles.css` | 新增同行者卡片 / 空态样式；收敛旧 `.detail-participants` 规则（两处）；复用既有令牌 |
| `frontend/src/profile/profileDisplay.ts` | 只读复用 `publisherSummary`，不改逻辑 |
| `frontend/src/profiles/ProfileContext.tsx` | 只读复用 `openProfile`，不改逻辑 |
| `frontend/src/shell/Avatar.tsx` | 只读复用 `lg` 头像，不改逻辑 |
| `docs/prototype/ui.js` | `compPanel` 改为「过滤发布者 + 资料卡 + 空态」 |
| `docs/prototype/styles.css` | 新增同行者卡片 / 空态原型样式 |
| `e2e/tests/chat-entry.spec.ts` | 更新聊天入口选择器 |
| `e2e/tests/`（新增或扩展现有用例） | 同行者卡片、资料弹窗、空态、发布者不重复、聊天权限、响应式 |
| `openspec/changes/refine-detail-companions/specs/trip-plans/spec.md` | MODIFIED：1 Requirement / 基线场景保留 + 新增同行者展示场景 |
| `openspec/specs/trip-plans/spec.md` | 归档时替换对应 Requirement 块 |
| 后端 / 契约 / 迁移 | **无 diff** |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 列表范围（D1） | 只展示同行者，不含发布者 | 发布者已有独立资料卡；避免同页重复；空态明确 |
| 卡片信息密度（D2） | 与发布者卡片同构；字段为空时省略 | 视觉一致；数据已在 `DemoUser`；不新增字段 |
| 卡片交互（D3） | 整卡主体打开资料弹窗；聊天为并列独立入口 | 与发布者一致；避免按钮嵌套链接的可访问性问题 |
| 开发位置（D4） | 独立 worktree `feature/refine-detail-companions`，基于 `origin/main` | 避开主工作区在途的原型改动；阶段提交可控 |
| 数据来源 | 只消费 `TripDetailResponse.participants` | 唯一真相；不新增请求 / 缓存 / DTO |
| 发布者过滤位置 | 前端按 `trip.publisher.id` 过滤 | 不改后端 `participants` 语义；人数统计不变 |
| 摘要回退 | 复用 `publisherSummary`（学校 · 专业 → 职业 → 城市 → 空串） | 与发布者卡片同一规则；避免两套拼接口径 |
| 人数口径 | `joined_count / capacity` 不变（含发布者） | 既有契约与文案不改；卡片数量不要求等于人数 |
| 排序 | 沿用后端返回顺序 | 不改同行规则；避免引入前端排序口径 |
| 是否新增后端 / 契约 | 否 | 纯展示层；`participants` 字段完整；零迁移 |
| 样式合并策略 | 旧 `.detail-participants` 规则收敛；新样式追加到 `styles.css` 末段 | 该文件多人并行修改热点，追加式合并降低 merge 丢样式风险 |
| 测试策略 | E2E 覆盖卡片 / 资料弹窗 / 空态 / 聊天 / 响应式；组件单测由 P3 决定 | 既有 `frontend/src/trips` 无页面级组件测试；先保证用户路径可验证 |

## 验收信号

1. 一条含发布者 + 2 位已接受同行者的行程，详情页展示 2 张同行者资料卡（不含发布者），发布者只在上方资料卡出现一次。
2. 同行者卡片展示头像、昵称 + 学校 / 专业（或职业 / 城市）、简介与兴趣标签；空简介 / 空兴趣不出现空占位或 `undefined / null`。
3. 点击卡片主体打开该同行者的公开资料弹窗，不跳转、不打开聊天；关闭后回到原详情页。
4. 发布者 / 已接受同行者可在其他同行者卡片看到独立「聊天」入口并进入对应会话；未申请 / 待处理 / 已拒绝 / 已取消用户看不到聊天入口；本人卡片无自我聊天。
5. 只有发布者时，同行者区展示可读空态，不展示空列表或发布者姓名。
6. 页头「已加入 n/capacity」与区标题人数口径保持含发布者；卡片顺序与后端返回一致。
7. `TripDetailResponse.participants`、`openapi.yaml`、Flyway、种子数据均无 diff；无新增端点 / 字段 / 版本。
8. 1440 / 1024 / 768 / 390 宽度与浅 / 深色主题下无横向溢出、按钮不被遮挡。
9. 原型先于实现更新，且实现复用现有颜色 / 间距令牌，无十六进制色值与魔法像素。
10. `openspec validate refine-detail-companions --strict` 通过；既有行程 / 申请 / 聊天 / 体验 / 举报 / 信用分不回归。

## 残余风险

| 风险 | 处理 |
|---|---|
| Living Spec「当前同行者至少包含发布者本人」与 D1 冲突 | Delta MODIFIED 明确「发布者资料卡 + 同行者列表（不含发布者）」；人数仍含发布者；P2 G1 由 IO / SA 确认 |
| `styles.css` 多人并行修改在 merge 时丢样式 | 新样式追加到文件末段；删除旧 `.detail-participants` 两处规则；merge 后抽查关键类 |
| E2E 选择器悬空 | 更新 `chat-entry.spec.ts`；新增断言优先使用语义定位（`getByRole` / 文本），不依赖纯层级 |
| 卡片内按钮与链接嵌套 | 卡片主体 `<button>` + 聊天并列 `<a>`；P3 设计 / P4 键盘走查确认 |
| 字段缺失导致空占位 | 按 `publisherSummary` 回退 + 条件渲染；E2E 覆盖空简介 / 空兴趣用户 |
| 发布者过滤后列表为空被误认为缺陷 | 明确空态文案与位置；E2E 覆盖「只有发布者」行程 |
| 响应式 / 深色主题溢出 | P4 逐屏 1440 / 1024 / 768 / 390 × 浅 / 深色走查 |
| 原型未先改 | P3 / P4 先改 `docs/prototype` 并浏览器验证，再改实现 |
| 与在途 `add-experience-photos` / `refine-trip-map` 的 `styles.css` 交叉 | 只追加新规则、收敛旧规则；合并 `origin/main` 后复跑前端与 E2E |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。Delta Spec 的 AC / DoV 复核、`design.md`、`atdd-design.md`、`tasks.md`、代码、原型与验证属 P2 / P3 / P4；Living Spec 合并在归档阶段完成。
