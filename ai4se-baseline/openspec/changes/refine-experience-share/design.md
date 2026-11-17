# 设计 — refine-experience-share

- **Change：** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16 / issue #18）
- **阶段：** P3（Design）｜ **日期：** 2026-11-16 ｜ **作者：** Jay（AO）
- **G1：** Pass（`g1-decision.md`，IO / SA = WAYNE）
- **规则：** `@rule:web-coding-style`（组件写法 / 样式 / 可访问性 / 文案与国际化）、`@rule:web-testing`、`@rule:pii-scrubbing`、`@rule:spec-first`
- **视觉基准：** `docs/prototype/ui.js` `share()` / `expCard()`；`docs/prototype/styles.css`（`.share-hero` / `.safety-list` / `.exp-card`）

## 1. 设计范围

只改前端展示层与 E2E：分享页（`ShareExperiencePage`）、体验卡（`ExperienceCard`）、配色工具（`coverTone`）、资格判定（新纯函数）、文案（`tripMessages`）、样式（`styles.css`）、E2E（`experiences.spec.ts`）。后端、`openapi.yaml`、数据库迁移零改动。

## 2. 决策

| id | 决策 | 理由 | 影响 |
|---|---|---|---|
| D1 | 分享页保持单列 antd 表单，只在表单上方加 hero、在表单中部加「你的体验会去哪里」与「分享边界」两段文本列表 | 原型 `form-grid` 是桌面双栏；现有页面在 390 宽已是单列，改双栏会牵动既有样式与 E2E；AC 只要求「说明存在且为文本」 | `ShareExperiencePage` + 3 条新 CSS 规则 |
| D2 | hero 的「同行人数」取 `trip.participants.length` | 与原型 `S.count(t.id)` 同口径（含发布者），且 `TripDetailPage` 的参加者列表同一来源 | 避免 `joined_count`（不含发布者）与详情参加者数不一致 |
| D3 | 内置封面复用行程卡的 `cover-*` 五色哈希 | 同一目的地在行程卡与体验卡颜色一致；零图片资源 | 抽出 `coverTone()` 到 `trips/coverTone.ts`，`TripCard` 与 `ExperienceCard` 共用 |
| D4 | 体验卡封面为固定高度色条 + 目的地名，`aria-hidden` | 封面是装饰，目的地名已在卡内出现；固定高度不改变既有栅格节奏 | `.exp-cover` 64px；`ExperienceCard` 顶部新增节点 |
| D5 | 资格判定抽成纯函数 `shareEligibility(trip, userId)`，返回 `ready` / `notCompleted(status)` / `notParticipant` | 分享页与详情页入口需要同一口径；纯函数可在 node 环境的 vitest 里覆盖三态 | 新增 `experiences/shareEligibility.ts` + `.test.ts`；`TripDetailPage` 的 `canShare` 改用它 |
| D6 | 不可用提示按「先状态、后身份」顺序判定：未结束优先 | 未结束行程讨论参加资格没有意义；原型的拒绝页也只有一句总述 | 两种提示互斥，各带一句说明 |
| D7 | 服务端仍是唯一拒绝方 | `@rule:security-baseline`「授权在服务边界判定」；前端只做说明 | 不新增错误码；`EXPERIENCE_NOT_ALLOWED` 403 与既有测试保留 |
| D8 | 「重复提交即修改」不改行为，只补 E2E | 故事 AC 允许「提示或允许编辑最新一条」，`upsert` 已满足更简单的一条 | 无代码改动；E2E 断言体验条数 |
| D9 | 走查以 1440 / 768 / 390 × 浅 / 深色为准，不新增自动化视觉回归 | 仓库无视觉回归工具；既有 change 同口径 | P4 记录截图与结论 |

## 3. 组件与数据

### 3.1 `trips/coverTone.ts`（新增）

```ts
const COVER_TONES = ['lagoon', 'coral', 'jade', 'dusk', 'amber'] as const;

export function coverTone(destinationCode: string): string {
  let hash = 0;
  for (const char of destinationCode) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 9973;
  }
  return COVER_TONES[hash % COVER_TONES.length];
}
```

`TripCard` 删除本地 `COVER_TONES` / `coverTone`，改为 import；`ExperienceCard` 用 `experience.trip.destination_code` 取同一色调。

### 3.2 `experiences/shareEligibility.ts`（新增）

```ts
export type ShareEligibility =
  | { kind: 'ready' }
  | { kind: 'notCompleted'; status: TripStatus }
  | { kind: 'notParticipant' };

export function shareEligibility(
  trip: Pick<TripDetail, 'status' | 'participants'>,
  userId: number,
): ShareEligibility;
```

判定顺序：`status !== 'completed'` → `notCompleted`；`participants` 不含 `userId` → `notParticipant`；否则 `ready`。

`ShareExperiencePage` 与 `TripDetailPage` 共用：详情页把 `const canShare = isCompleted && participant` 改为 `shareEligibility(trip, currentUser.id).kind === 'ready'`（`isCompleted` 仍用于「参考此行程发布」入口）。

### 3.3 `ShareExperiencePage` 结构

```text
返回链接
Card
  ├ share-hero
  │   ├ share-hero-cover cover-<tone>   （aria-hidden）
  │   ├ 标题 + 目的地 · 日期区间 · N 人同行
  │   └ StatusBadge
  ├ 标题（把这次旅行留给下一个人 / 修改我的游后体验）+ 副标题
  ├ SafetyNote
  ├ share-note「你的体验会去哪里」→ ul.safety-list（3 条）
  ├ 真实感受（TextArea，10–400）
  ├ 路线强度（Radio.Group，三档）
  ├ 给后来者的一条建议（Input，≤120）
    ├ share-note「分享边界」→ ul.safety-list（2 条）
  ├ 失败 Alert（可选）
  └ 发布 / 保存修改 + 取消
```

不可用分支（替换现有单一 `!canShare`）：

```text
notCompleted  → Alert.warning(tripMessages.experienceNotCompleted,
                              `${tripMessages.experienceNotCompletedHint}${statusLabel(trip.status)}`)
notParticipant→ Alert.warning(tripMessages.experienceNotParticipant,
                              tripMessages.experienceNotParticipantHint)
```

两者都保留「回到行程详情」按钮，不渲染表单。

### 3.4 `ExperienceCard` 结构

```text
article.exp-card
  ├ div.exp-cover cover-<tone>（aria-hidden）→ 目的地名
  ├ div.exp-head（作者 / 目的地 / 强度）
  ├ p.exp-quote
  ├ div.exp-advice
  └ div.exp-foot
```

## 4. 文案（`tripMessages` 单一来源）

| key | 值 | 用途 |
|---|---|---|
| `experienceShareHeading` | 把这次旅行留给下一个人 | 未分享时的页面标题 |
| `experienceShareHeadingEdit` | 修改我的游后体验 | 已分享时的页面标题 |
| `experienceShareSub` | 真实的强度和建议，比美图更能帮到下一位同学。发布后会出现在原行程与灵感首页。 | 副标题 |
| `experienceCompanionsSuffix` | 人同行 | hero 计数后缀（前缀为 `trip.participants.length`） |
| `experienceGoesToTitle` | 你的体验会去哪里 | 去向列表标题 |
| `experienceGoesToItems` | ① 出现在这条行程的详情页，和原路线放在一起。② 进入灵感首页的「旅行体验」列表，被还没决定去哪里的同学看到。③ 别人可以点「参考此行程发布」，把它变成自己的新计划。 | 去向三条 |
| `experienceBoundaryTitle` | 分享边界 | 边界列表标题（沿用 `shareBoundaryTitle`，重命名以归组） |
| `experienceBoundaryItems` | ① 不要写入同行者的电话、学校班级或住宿地址。② 只写你真实走过的部分，没走到的可以注明。 | 边界两条 |
| `experienceNotCompleted` | 行程结束后才能发表体验 | 未结束标题 |
| `experienceNotCompletedHint` | 当前状态： | 与 `statusLabel()` 拼接 |
| `experienceNotParticipant` | 只有参加过的同行者才能发表体验 | 未参加标题 |
| `experienceNotParticipantHint` | 这条行程已经结束，但你不是发布者或已接受的同行者。 | 未参加说明 |

删除被替代的键：`experienceNotAllowed`、`experienceGoesTo`、`experiencePrivacy`、`shareBoundaryTitle`（改为 `experienceBoundaryTitle`）。

## 5. 样式（`styles.css`）

| 选择器 | 规则 |
|---|---|
| `.share-hero` | flex 行，`gap: 14px`，`align-items: center`，卡片内顶部块；768 以下允许换行 |
| `.share-hero-cover` | 宽 96px、高 64px、`border-radius: var(--r)`，复用 `cover-*` 背景 |
| `.share-hero-body` | 纵向 flex，标题 15.5px，元信息次要色 |
| `.share-note` | 内边距 12px 14px，`border: 1px solid var(--line)`，`border-radius: var(--r)`，背景 `var(--surface-2)`；标题 `.share-note-title` 12.5px 加粗 |
| 列表 | 复用既有 `.safety-list` / `.safety-list li`（✔ 前缀、12.5px），不新增列表样式 |
| `.exp-cover` | 高 64px，`display:flex`，`align-items:flex-end`，`padding: 10px 14px`，`border-radius: var(--r) var(--r) 0 0`，复用 `cover-*` 背景；文字 12.5px 半透明 |

不新增颜色令牌；全部引用既有 `--surface` / `--line` / `--r` / `cover-*`。

## 6. 可访问性

- 封面为装饰：`aria-hidden="true"`；目的地名在 hero 文本与卡片 `exp-head` 各出现一次（不重复读屏关键信息）。
- 去向 / 边界为真实 `<ul>` / `<li>`，不使用图片或仅颜色表达。
- 不可用提示用 antd `Alert`（`role="alert"`），标题 + 说明两段文本。
- 按钮、输入框沿用 antd，不新增自定义控件。

## 7. 测试设计（对应 `atdd-design.md`）

| 层 | 文件 | 覆盖 |
|---|---|---|
| 单测（node / vitest） | `experiences/shareEligibility.test.ts` | `ready` / `notCompleted`（含 `ongoing`）/ `notParticipant` 三态 |
| 单测（既有） | `experiences/experienceForm.test.ts` | 不回归字数与建议校验 |
| E2E | `e2e/tests/experiences.spec.ts` | hero 与说明存在、两种不可用提示、重复提交条数不变、体验卡封面、既有发布 / 参考发布流程 |

测试环境是 `environment: 'node'` 且只收 `src/**/*.test.ts`；本 change 不为一次展示改动引入 jsdom / Testing Library，可判定的资格逻辑抽成纯函数，UI 结构交给 E2E（详见 `atdd-design.md` §1）。

## 8. 不改的东西

- `ExperienceController` / `ExperienceService` / `pojo/TripExperience` / `openapi.yaml` / 迁移。
- `TripDetailPage` 的体验展示区结构（只改 `canShare` 的来源）。
- `SafetyNote`、`ReportModal`（`refine-safety-report` 的范围）。
- 首页体验视图的筛选、分页与骨架（`refine-inspiration-home` / `add-destination-area-filters` 的范围）。

## 9. 风险与回退

| 风险 | 缓解 |
|---|---|
| 体验卡封面改变卡片高度，骨架断言波动 | 固定 64px；E2E 只断言 `.exp-card` 存在与文本，不比高度 |
| `coverTone` 抽取影响行程卡 | 纯搬运，哈希与色调数组不变；`trips.spec.ts` 与首页 E2E 回归 |
| 两种不可用文案与旧断言冲突 | 同批改 E2E，保留原句作为 `notParticipant` 的近似表达（新句更短） |
| 深色模式下 `cover-*` 对比度 | 复用既有令牌，走查时截图确认 |

回退：单文件 revert（`git revert`）即可恢复原分享页与卡片，无数据迁移依赖。

## 10. R2：布局与样式对齐原型（2026-11-16 21:00）

- **依据：** proposal.md「R2」、p0-baseline.md §9、原型 share() 与 styles.css。
- **原则：** 复用发布页的双栏壳与面板写法，只补分享页特有的卡片选择器、列表与图标；不改行为与文案语义。

### 10.1 结构

`	ext
main.form-page.share-page
  ├ a.detail-back「行程详情」
  ├ div.page-head
  │   ├ div → h2.page-title（把这次旅行留给下一个人 / 修改我的游后体验）
  │   │        p.page-sub（experienceShareSub）
  ├ div.share-hero
  │   ├ span.share-hero-cover.cover-<tone>（76×60，aria-hidden）
  │   ├ span.share-hero-body → b{title} + span{destination · M月D日 · 周X · N 人同行}
  │   └ StatusBadge
  └ div.publish-grid
      ├ div.publish-main
      │   ├ Card.panel「真实感受」      → label + counter + TextArea + 错误文本
      │   ├ Card.panel「路线强度」      → ul.intensity-picker（3 × label.int-card > input[type=radio]）
      │   └ Card.panel「给后来者的一条建议」→ label + Input + 错误文本 + 操作（发布 / 取消）
      └ aside.publish-side
          ├ Card.panel.share-panel「你的体验会去哪里」→ ul.share-list（3 条，带图标）
          └ Card.panel.share-panel.safety「分享边界」 → ul.share-list（2 条，带图标）
`

- **网格复用：** .publish-grid / .publish-main / .publish-side 与发布页同一套（1.5fr / minmax(300px,.9fr)，≤900px 单列，侧栏 sticky）。理由：已有折叠与粘顶规则，避免第二套网格与断点漂移；第三个页面复用再抽 .form-grid 别名（R2-L-02）。
- **面板：** Card.panel + h3.panel-title（与 TripCreatePage 一致），标题前放 15px 图标。

### 10.2 强度卡片（组件选型例外）

按 @rule:web-coding-style 先比对 antd：Segmented 语义是「切换视图」、Radio.Group 只能渲染单选点，均无法表达原型的卡片（标题 + 说明 + 选中底色）。因此**自绘** label.int-card，内部放原生 <input type="radio" class="int-radio">：

- 可键盘操作（Tab / 方向键）、可被读屏识别为单选，getByRole('radio') 仍可命中，既有 E2E 不变。
- 选中态：input:checked + span 不适用（结构为 input + b + span），改用 label:has(input:checked) 加 .on 类，或由 React 状态加 on 类——采用后者（draft.intensity === option.value），样式类与 	one 组合。
- INTENSITY_OPTIONS 增加 	one: 'jade' | 'amber' | 'coral'（原型 D.INTENSITY 的 tone）。

### 10.3 图标

新增 experiences/shareIcons.tsx：

| name | 用途 | 来源 |
|---|---|---|
| spark | 真实感受面板标题 | 原型 P.spark |
| oute | 路线强度标题 / 去向「原行程详情页」 | P.route |
| info | 建议面板标题 | P.info |
| compass | 去向面板标题 / 去向「首页旅行体验」 | P.compass |
| copy | 去向「参考此行程发布」 | P.copy |
| shield | 分享边界标题 | P.shield |
| check | 边界两条 | P.check |
| send | 主按钮 | P.send |
| left | 返回链接 | P.left |

统一 iewBox="0 0 20 20"、stroke="currentColor"、stroke-width 1.7、ria-hidden；尺寸由 CSS（.share-icon 15px）。

### 10.4 日期格式

新增 	rips/tripDateFormat.ts：

`	s
export function formatMonthDay(iso: string): string;   // 2026-11-06 → 11月6日
export function weekdayLabel(iso: string): string;     // 2026-11-06 → 周五
`

TripCard 的本地 ormatDate / dayLabel 改为调用它们（dayLabel = ${weekdayLabel(iso)}出发），hero 用 ormatMonthDay + weekdayLabel。单测 	ripDateFormat.test.ts 覆盖合法 / 非法 / 跨月。

### 10.5 样式

| 选择器 | 规则 |
|---|---|
| .share-hero | 调整封面为 76×60 / order-radius: 12px；margin-bottom: 0（由 grid 间距控制） |
| .share-hero-body span | 12.5px，ar(--ink-3) |
| .intensity-picker | grid-template-columns: repeat(3, minmax(0,1fr))；gap: 10px；≤680px 改单列 |
| .int-card | padding: 14px；order: 1.5px solid var(--line)；ackground: var(--surface-2)；order-radius: var(--r)；cursor: pointer；	ransition: transform .18s, border-color .18s, background .18s |
| .int-card:hover | 	ranslateY(-2px)；order-color: var(--lagoon) |
| .int-card.on.jade/.amber/.coral | 复用原型 color-mix 底色与文字色 |
| .int-card:focus-within | ox-shadow: var(--ring) |
| .int-radio | position: absolute; opacity: 0; width: 1px; height: 1px;（保持可聚焦） |
| .share-list | 与 .safety-list 同排版，但前缀换成 15px 图标（grid-template-columns: 17px minmax(0,1fr)） |
| .share-panel .ant-card-body | 复用 .publish-panel 的 18px 内边距（加 share-panel 与 publish-panel 同类名） |

### 10.6 可访问性

- 卡片选择器：原生 radio + <label> 文本；:focus-within 可见焦点环；ria-describedby 指向说明（experienceIntensityHint）。
- 图标 ria-hidden；面板标题文本本身可读。
- 双栏在 DOM 顺序上仍是「主列表单 → 侧栏说明」，读屏顺序与视觉一致。

### 10.7 测试影响

- E2E：getByRole('radio', { name: /较累/ }).check() 不变；新增 .int-card.on、.publish-grid 列数、.share-list svg、页头标题与副标题断言。
- 行程卡：	rips.spec.ts 的日期文本断言回归（格式不变：M月D日 / 周X出发）。