# 设计 — refine-my-trips

- **Change：** `refine-my-trips`（REQ-015 / S11 我的旅行）
- **输入：** Delta Spec `specs/trip-companions/spec.md`（1 Requirement / 11 Scenario）、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`、原型 `docs/prototype/ui.js` `mine()`、`docs/prototype/styles.css` `.seg` / `.mine-row` / `.mr-*`
- **日期：** 2026-11-16

## 1. 设计目标

把「四组聚合 + 待处理提醒」做成一屏可扫描的状态面板：页头给出待处理摘要与发布入口；四段带计数切换；每行 84px 封面 + 标题与状态 + 单行元信息 + 备注 + 右侧动作；提醒与动作都指向具体行程；页面重新可见或动作完成后自动同步。控件只用 antd 与既有令牌，不引入第二套视觉。

## 2. 页面结构

```text
main.trip-page
├─ section.page-head
│  ├─ div：h1.page-title「我的旅行」 + p.page-sub（待处理摘要 + 入口）
│  └─ a.btn.primary「发布新行程」 → #/trips/new
├─ section.mine-profile-card（保留既有资料卡，见 D10）
├─ Segmented.mine-seg（role=radio，四段带计数）
├─ div.mine-list
│  └─ article.mine-row [data-group]
│     ├─ span.mr-cover.cover-<tone>（目的地名 + aria-hidden 装饰）
│     ├─ div.mr-main
│     │   ├─ h3.mr-title：a → #/trips/{id} + StatusBadge
│     │   ├─ div.mr-meta：目的地 · 日期区间 · 人数 · 出发日
│     │   └─ p.mr-note（状态备注 / 申请说明 / 已分享标记）
│     └─ div.mr-actions：a.btn / button.btn
└─ 分组空态（EmptyState：标题 + 说明 + 主 CTA）
```

- 完成组保留「发表 / 修改我的体验」按钮，沿用 `loadMyExperiences` 判定。
- 窄屏（≤640px）：`.mine-row` 改为单列，`.mr-actions` 换行到卡片下方并左对齐。

## 3. 组件与状态

| 组件 | 职责 | 不做 |
|---|---|---|
| `MyTripsPage` | 取数、分组状态、动作调用、同步副作用、渲染 | 不写分组规则、不写日期格式化 |
| `mineTrips.ts`（新） | 纯逻辑：计数、提醒目标、行动作、日期 / 出发日标签、备注 | 不发请求、不读 DOM |
| `Segmented`（antd） | 四段切换与计数标签 | 不自绘 `.seg` |
| `StatusBadge`（既有） | 行程状态文字 + 形状图标 | 不改样式 |
| `EmptyState`（既有） | 分组空态 | 不新增第二套空态组件 |

### 3.1 纯逻辑接口

```ts
export type MineTab = 'published' | 'applied' | 'matched' | 'completed';

export function groupCounts(data: MyTrips): Record<MineTab, number>;
export function pendingCountFor(data: MyTrips, tripId: number): number; // 缺省 0
export function pendingTargetTripId(data: MyTrips): number | null;      // 第一个 count > 0
export function formatDateRange(start: string, end: string): string;    // 11月20日 → 11月22日
export function dayLabel(iso: string): string;                          // 周三出发 / 日期待定
export function actionsFor(group: MineTab, context: RowContext): MineAction[];
export type MineAction = 'view' | 'applications' | 'complete' | 'cancel' | 'chat' | 'leave' | 'share';
```

- `actionsFor` 只返回动作键，文案与 href 由页面映射；`applications` 的计数由 `pendingCountFor` 提供。
- `pendingTargetTripId` 以 `pending_applications` 的顺序为准（后端按 `published` 顺序输出）；无待处理返回 `null`。
- 所有函数无副作用，node 环境 vitest 直接断言。

### 3.2 页面状态

| state | 类型 | 说明 |
|---|---|---|
| `tab` | `MineTab` | 默认 `published`；不写 URL（原型也不写），刷新回默认 |
| `data` | `MyTrips \| null` | 聚合响应 |
| `experiences` | `Experience[]` | 已完成组的已分享判定 |
| `error` | `string \| null` | 首屏失败展示 Alert + 重试；后续静默失败不清空旧数据 |
| `busyId` | `string \| null` | 行内动作 loading（`${action}-${id}`） |

### 3.3 同步副作用

```ts
useEffect(() => {
  const onVisible = () => { if (document.visibilityState === 'visible') void reload(true); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  return () => { /* remove both */ };
}, [reload]);
```

- `reload(silent)`：`silent=true` 时不清空 `data`、不切换骨架，失败时保留旧数据。
- 用 `useRef` 记录 in-flight，重复事件共享同一个 Promise（L-03 去抖）。
- 页内动作成功后调用 `reload(true)`；`tab` 切换不请求。

## 4. 数据契约

### 4.1 后端

```java
public record PendingApplicationCount(long tripId, int count) {}

public record MyTripsResponse(
        List<TripSummaryResponse> published,
        List<TripApplicationResponse> applied,
        List<TripSummaryResponse> matched,
        List<TripSummaryResponse> completed,
        int pendingApplicationCount,
        List<PendingApplicationCount> pendingApplications) {}
```

- `MyTripsServiceImpl` 在既有 `published` stream 上收集：`listForPublisher(trip.id(), userId)` 过滤 pending，计数 > 0 才加入列表；`pendingApplicationCount` 改为该列表求和（同一来源，避免二次查询与两条口径）。
- 无待处理时返回**空数组**（不是 null）；字段顺序按 `published` 顺序。
- 前端对旧后端兼容：`data.pending_applications ?? []`，字段缺失时提醒入口不渲染、「处理申请」不带数量。
- 不改分组规则、mapper、状态机、权限。

### 4.2 契约

- `openapi.yaml` `MyTrips` 增加 `pending_applications`（数组，item `$ref PendingApplicationCount`），`required` 仍为原 5 项；版本递增次版本。
- `PendingApplicationCount`：`required: [trip_id, count]`，`count` 最小 1。
- 前端 `types.ts` 的 `MyTrips` 增加 `pending_applications: PendingApplicationCount[]`。
- `OpenApiTest` 断言新 schema 与 required；`MyTripsControllerTest` 断言两种身份下的数组内容。

## 5. 行为细则

### 5.1 分组

| 分组 | 判定（沿用后端） | 行内容 |
|---|---|---|
| `published` | `publisherId == me` | 状态徽标；未结束显示「处理申请（N）」；`ongoing` 显示「结束行程」 |
| `applied` | 我的申请（全部状态） | 状态徽标 + 申请说明；`pending` 显示「撤回」；`accepted` 且未结束显示「聊天」；`accepted` 且已结束显示「写体验」 |
| `matched` | 非本人 + 已接受 + 未结束 | 集合区域与同行人数；「与发起人沟通」「行程」「退出同行」 |
| `completed` | 参加过 + 已结束 | 已分享与否；「发表游后体验 / 修改我的体验」「查看」 |

### 5.2 提醒

- 副标题：`pendingTotal > 0` → 「发布、申请、同行与已完成的行程都在这里。你有 {n} 条申请等待处理。」并渲染「去处理」按钮；否则「……目前没有待处理的申请。」
- 「去处理」href = `#/trips/{pendingTargetTripId}/applications`；`pendingTargetTripId === null` 时不渲染按钮（防御 L-02）。
- 行内「处理申请 · N」用 `pendingCountFor`，与页头同源。

### 5.3 备注文案

| 分组 | 备注 |
|---|---|
| `published` | `ongoing`：「行程进行中，结束后可以写下体验。」；`completed` 且已分享：「你已留下游后体验，它会出现在灵感首页。」；`completed` 未分享：「行程已结束，还没有写下你的体验。」；否则无备注 |
| `applied` | 申请状态 + 申请说明（空则「未填写申请说明」） |
| `matched` | 「集合：{meeting_area 或 待确认} · 同行 {n} 人」 |
| `completed` | 已分享：「你的体验已回到灵感首页。」；未分享：「写下真实强度和一条建议，闭环才算真正闭合。」 |

### 5.4 动作失败

- `TRIP_NOT_OPEN`（结束 / 退出时行程已结束）：`message.info` 提示并 `reload(true)`。
- `APPLICATION_NOT_PENDING`（撤回时已被处理）：`message.info` + `reload(true)`。
- 其它错误：行内 `Alert`（页面顶部）展示错误码，保留旧数据可重试。

## 6. 文案（`tripMessages.ts`）

| key | 文案 |
|---|---|
| `mineSubtitle` | 发布、申请、同行与已完成的行程都在这里。 |
| `minePendingInline` | 你有 {n} 条申请等待处理。 |
| `minePendingNone` | 目前没有待处理的申请。 |
| `minePendingAction` | 去处理（保留） |
| `mineTabPublished` / `mineTabApplied` / `mineTabMatched` / `mineTabCompleted` | 我发布的 / 我申请的 / 已匹配同行 / 已完成旅行 |
| `mineView` | 查看 |
| `mineApplications` | 处理申请 |
| `mineCancelApplication` | 撤回 |
| `mineChat` | 与发起人沟通 |
| `mineLeave` | 退出同行 |
| `mineNoteMeeting` | 集合：{area} · 同行 {n} 人 |
| `mineNoteNoExperience` | 行程已结束，还没有写下你的体验。 |
| `mineNoteShared` | 你已留下游后体验，它会出现在灵感首页。 |
| `mineNoteOngoing` | 行程进行中，结束后可以写下体验。 |
| `mineEmptyPublishedTitle/Text/Cta` | 你还没有发布行程 / 把心里那条路线写出来，它既是行程，也是一封给同路人的邀请。/ 发布第一条行程 |
| `mineEmptyAppliedTitle/Text/Cta` | 你还没有申请过行程 / 在灵感首页找到目的地和日期相近的计划，留一句话就可以申请同行。/ 去看看行程 |
| `mineEmptyMatchedTitle/Text/Cta` | 还没有已匹配的同行 / 申请被接受后，行程会出现在这里，并开放与发起人的文字沟通。/ 发现同行者 |
| `mineEmptyCompletedTitle/Text` | 还没有完成的旅行 / 结束行程后，这里会出现你参加过的旅行。 |

- 文案集中在本文件；组件不拼接句子（`{n}` 用函数式消息或 `replace`，与本仓库现有写法一致）。
- 删除只被本页使用的旧键（如 `mineEmpty`），先 grep 调用点。

## 7. 样式

- `.mine-row`：`grid-template-columns: 84px minmax(0, 1fr) auto; gap: 16px; padding: 14px; border-radius: var(--r-lg); background: var(--surface); border: 1px solid var(--line); box-shadow: var(--sh-1)`；hover 抬升 2px。
- `.mr-cover`：`height: 66px; border-radius: 12px; overflow: hidden`；内部沿用 `.cover-*` 渐变与目的地文字。
- `.mr-title` / `.mr-meta` / `.mr-note` / `.mr-actions`：字号与颜色取既有令牌（`--ink`、`--ink-3`、`--surface-2`、`--line`）。
- `.mine-seg`：仅调 `margin-top` 与宽度；胶囊外观由既有 `.ant-segmented*` 规则提供（原型 `.seg` 的等价实现，D2）。
- `@media (max-width: 640px)`：`.mine-row` 单列；`.mr-actions` `flex-wrap: wrap; justify-content: flex-start`。
- 不新增硬编码色值；不改全局令牌。

## 8. 可访问性

- `Segmented` 自带 `role=radio` 与键盘支持；`aria-label="我的旅行分组"`。
- 计数写在标签文本中（如「我发布的 3」），不只靠颜色。
- 行标题是链接；动作是 `button` / `a`，`aria-label` 带行程标题（如「查看 {title}」）。
- 封面 `aria-hidden`；备注是文本，不只用图标。
- 空态标题用 `h3`，说明与 CTA 可聚焦。

## 9. 测试设计

| 层 | 用例 | 判据 |
|---|---|---|
| 单测 `mineTrips.test.ts` | 计数（空 / 多组）、提醒目标（有序 / 无）、行动作（四种分组 × 状态组合）、日期区间与出发日（正常 / 跨月 / 空） | 纯函数返回值 |
| 单测 `coverTone.test.ts` | 同一目的地在不同调用返回同色；已知目的地固定映射 | 稳定性 |
| 后端 `MyTripsControllerTest` | 发布者 / 同行者两种身份的 `pending_applications` 内容与空数组 | JSONPath |
| 契约 `OpenApiTest` | `MyTrips.pending_applications` 与 `PendingApplicationCount` schema、required | schema 断言 |
| E2E `mine.spec.ts` | M1 四段与计数；M2 提醒跳转与行内计数；M3 我申请的撤回；M4 已匹配退出；M5 已完成写体验；M6 重新可见同步 | Playwright |
| 回归 | `companions.spec.ts`（角色断言改 `radio`）、`experiences.spec.ts`（同理）、`auth` / `profile` 不受影响 | 全绿 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色，四段各一张 | 无溢出、无重叠、对比度 ≥4.5:1 |

## 10. 已知偏离与风险

| id | 内容 | 处理 |
|---|---|---|
| D10 | 原型无 `.mine-profile-card`，本页保留 | `add-user-profile` 规格与 `profile.spec.ts` 依赖；在 P4 报告记录 known deviation |
| R1 | `Segmented` 角色 `radio` 影响两处 E2E | 同批更新断言，P4 跑三套 |
| R2 | 与 `refine-experience-share` 并行改完成组 | 归档顺序登记；P4 rebase 后跑 `experiences.spec.ts` |
| R3 | `coverTone` 抽取与 S16 的同类抽取可能冲突 | 两个 change 都从 `TripCard` 抽同一函数；合并时取其一，保留函数名与行为 |
| R4 | 可见性事件在无头浏览器不触发 | E2E 用 `dispatchEvent(new Event('focus'))`；人工走查补一档 |
| R5 | 四组数据量增长导致列表变长 | 原型不分页；用户自身数据规模有限，超出时按后续 story 处理 |