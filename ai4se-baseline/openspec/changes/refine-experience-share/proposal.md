# 变更提案：refine-experience-share

- **需求来源：** 用户故事 S16「发布游后体验」（issue #18，P1 / 迭代 3 / 3 点 / 落点页面：游后分享页）｜ **需求条目：** `requirement-workspace/requirements/REQ-004-trip-experiences.md`
- **能力：** `trip-experiences`（MODIFIED + ADDED）
- **规模：** S（两个既有页面与一张卡片的展示增量；无后端、契约、迁移变更）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`；视觉基准：`docs/prototype/prototype.html` + `docs/prototype/styles.css`（原型 `ui.js` `share()` / `expCard()`）
- **基线：** `main@25b60f7`（含 `add-trip-completion` 的四态生命周期）。已归档：`add-trip-experiences`（REQ-004 基线）、`add-trip-plans`、`add-trip-companions`、`add-user-auth`、`add-user-profile`、`add-user-profiles`。进行中：`refine-inspiration-home`、`add-destination-area-filters`、`add-match-reason`、`add-trip-completion`、`refine-safety-report`、`add-trip-publish`。
- **归档顺序：** 与 `refine-inspiration-home`、`add-destination-area-filters`、`add-trip-completion` 同改 `trip-experiences` 或行程状态口径，同窗口归档需串行。

## Why

`add-trip-experiences` 已把 S16 的主干交付并归档：资格校验（已结束 + 发布者或已接受同行者，服务端拒绝）、发布与修改（同一用户同一行程只有一条）、详情页「游后真实体验」区、灵感首页「旅行体验」视图、纯文字 + 三档强度 + 一条建议。但故事落点页面与长期规格之间仍有四处缺口：

- **分享页结构缺一半。** 原型 `share()` 在表单上方给出行程 hero（封面、标题、目的地、日期、同行人数、状态徽标），右侧说明「你的体验会去哪里」三条与「分享边界」两条；实现只有一个返回链接、一段状态行与两句 `Alert`。学生进入页面时看不到这条体验会落在哪两个视图，也看不到哪些内容不能写。
- **体验卡没有内置封面。** Living Spec 已声明「体验卡展示项目内置封面而不是空白占位」，`ExperienceCard` 仍是纯文本卡片；首页「旅行体验」与其他卡片的视觉密度不一致。
- **资格提示不可区分。** 服务端对「行程未结束」与「未参加」都返回 `EXPERIENCE_NOT_ALLOWED`，前端也只显示一句「只有已结束、并且你实际参加过的行程才能发表体验」；Living Spec 的两条拒绝场景分别要求提示「只有已结束的行程才能分享」与「只有实际参加过的人才能分享」。
- **AC 缺可执行证据。** `e2e/tests/experiences.spec.ts` 覆盖了发布、两处展示、参考发布与入口诚实性，但没有断言「重复提交即修改」与「未参加者入口隐藏 / 直达被拒」。

## What Changes

- `trip-experiences`（MODIFIED）：「对已结束且参加过的行程发布游后体验」增加两种不可用原因的可区分提示（未结束含招募中 / 满员 / 旅行中；已结束但非发布者且非已接受）；「游后体验的内容口径与纯文字降级」把「内置封面」写实为体验卡上的目的地色调封面条。
- `trip-experiences`（ADDED）：「游后分享页说明体验去向与分享边界」新 Requirement——分享页 MUST 展示行程 hero、体验去向三条与分享边界两条。
- 前端：`ShareExperiencePage` 增加行程 hero、「你的体验会去哪里」三条、「分享边界」两条与拆分后的资格提示；`ExperienceCard` 增加内置封面条；`tripMessages` 承载全部文案；`styles.css` 只补封面条与说明列表的布局。
- 测试：新增分享页资格提示的组件测试；E2E 增补「重复提交即修改」「未参加者无入口且直达被拒」「体验卡含内置封面」。
- 契约 / 后端 / 迁移：**不变**。`POST /api/trips/{tripId}/experiences`、`EXPERIENCE_NOT_ALLOWED`（403）、10–400 / ≤120 字校验与 `trip-experiences` 表均保持原样；资格判定继续由服务端执行。

## 问题（现状差距）

1. **落点页面缺结构。** `ShareExperiencePage` 只有 `detail-back` + 标题 + 行程状态行 + `SafetyNote` + 一行 `experienceGoesTo` 提示 + 一行 `shareBoundaryTitle`/`experiencePrivacy`；原型还有封面 hero、去向三条、边界两条。
2. **体验卡与规格不一致。** `ExperienceCard` 无封面节点，`styles.css` 也没有 `.exp-cover`；Living Spec 的封面声明无法验证。
3. **不可用原因混在一起。** `ShareExperiencePage` 用 `canShare = status === 'completed' && participant` 一个布尔量，`!canShare` 分支只渲染 `experienceNotAllowed`；用户无法判断是行程还没结束还是自己没参加。
4. **AC 无回归网。** 重复提交走 `upsert`（200 + 更新），未被 E2E 断言；「未参加者」只在入口渲染层被隐式覆盖。

## 范围

**In scope**

- 分享页行程 hero：内置封面（目的地色调）、标题、目的地、日期区间、同行人数、状态徽标；窄屏（390）不溢出。
- 分享页「你的体验会去哪里」三条：出现在原行程详情页、进入灵感首页「旅行体验」、别人可「参考此行程发布」。
- 分享页「分享边界」两条：不写同行者电话 / 学校班级 / 住宿地址；只写真实走过的部分，未走到的注明。
- 体验卡内置封面：`ExperienceCard` 增加封面条（目的地哈希到既有五色 `cover-*` 令牌），无图片时也不留空白占位。
- 资格提示区分：行程未结束（`recruiting` / `full` / `ongoing`）→「行程结束后才能发表体验」+ 当前状态；已结束但非发布者且非已接受 →「只有参加过的同行者才能发表体验」。两者都不渲染表单。
- 为 `trip-experiences` 写 MODIFIED（2 条既有 Requirement 收敛）+ ADDED（1 条分享页说明 Requirement）的 delta spec，保留 Living Spec 既有场景名。
- E2E：重复提交即修改（体验条数不增、内容更新）、未参加者详情页无入口且直达 `#/share/{id}` 被拒、体验卡含内置封面；组件测试覆盖两种资格提示。

**Out of scope**

- 图片上传与图片存储（仍为增强项，本迭代不做；`e2e` 继续断言没有上传入口）。
- 分享页双栏 `form-grid` 与强度卡片化改造（保留 antd `Radio.Group`，与「组件选型 Ant Design 优先」一致）。
- 「参考此行程发布」（S17）的预填字段与必填重填规则。
- 后端资格规则、错误码 / 契约版本、数据库迁移。
- 体验编辑历史、删除体验、点赞 / 评论 / 图文社区。
- 采集或展示电话、证件、精确住址等隐私字段。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/frontend/src/experiences/ShareExperiencePage.tsx` | 增加行程 hero、「你的体验会去哪里」三条、「分享边界」两条；`canShare` 拆为「未结束」「未参加」两个分支并渲染对应提示 |
| `RouteME/frontend/src/experiences/ExperienceCard.tsx` | 增加内置封面条（目的地色调 + 目的地名），封面不依赖图片资源 |
| `RouteME/frontend/src/i18n/tripMessages.ts` | 分享页标题 / 副标题、hero 同行人数、去向三条、边界两条、两种不可用提示；移除被替代的单段文案 |
| `RouteME/frontend/src/styles.css` | 新增 `.share-hero` / `.exp-cover` / 说明列表的布局与令牌引用；不重做视觉 |
| `RouteME/frontend/src/experiences/*.test.ts(x)` | 新增 `ShareExperiencePage` 资格提示与 hero 渲染测试 |
| `RouteME/e2e/tests/experiences.spec.ts` | 重复提交即修改、未参加者无入口且直达被拒、体验卡封面 |
| `trip-plans`（上游，只读） | 只读 `status`（四态）与目的地 / 日期 / 人数；不改状态推导 |
| 后端 / `openapi.yaml` / 迁移 | **无改动**：资格、校验与错误码已存在；保留 `ExperienceControllerTest` / `ExperienceServiceTest` 回归 |
| Living Spec `openspec/specs/trip-experiences/spec.md` | 归档阶段用本 change 的 delta 替换 2 条 Requirement 并追加 1 条；既有场景名全部保留 |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 分享页布局 | 保留单列 antd 表单，补 hero 与两段说明列表 | 双栏 `form-grid` 是原型桌面形态；现有页面在 390 宽下已是单列，改双栏会牵动既有样式与 E2E |
| 体验卡封面 | 目的地哈希到既有五色 `cover-*` 令牌的色条 | 与 `TripCard` 同一套内置封面，零图片资源，满足 Living Spec |
| 不可用原因 | 前端按 `trip.status` 与 `participants` 拆分提示；服务端错误码不变 | 契约与后端已足够表达拒绝；拆分文案是展示口径问题，不升契约 |
| 重复提交 | 维持 `upsert`（再次提交即修改） | 故事 AC 允许「提示或允许编辑最新一条」，现有实现取更简单的一条 |
| 分享边界文案 | 沿用原型的「电话 / 学校班级 / 住宿地址」与「只写真实走过的部分」 | 与 `@rule:pii-scrubbing` 一致，且不采集任何隐私字段 |
| capability 粒度 | 单一 `trip-experiences`（MODIFIED + ADDED） | 分享页、体验卡与资格提示同属该能力，不新增平行权威 |

## 验收信号

1. 进入 `#/share/{id}`（具备资格），页面顶部展示行程 hero：内置封面、标题、目的地、日期区间、同行人数与状态徽标；1440 / 768 / 390 均不横向溢出。
2. 同一页面展示「你的体验会去哪里」三条与「分享边界」两条，文案为文本列表而非仅颜色或图标。
3. 未结束行程（招募中 / 已满员 / 旅行中）直达分享页显示「行程结束后才能发表体验」并注明当前状态；已结束但未参加显示「只有参加过的同行者才能发表体验」；两者都不渲染表单，也不出现提交按钮。
4. 具备资格时，详情页与我的旅行仍只在「已结束 + 参加者」出现「发表游后体验」/「修改我的体验」；他人未参加行程的详情页不出现入口。
5. 灵感首页「旅行体验」每张体验卡展示内置封面条（含目的地名），无图片时也不留空白。
6. 同一用户对同一行程再次提交后，体验条数不变、内容更新为最新，详情页与首页同步展示新内容。
7. `openspec validate refine-experience-share --strict` 通过；前端 `npm run typecheck` / `npm test`、后端 `ExperienceControllerTest` / `ExperienceServiceTest`、`e2e/tests/experiences.spec.ts` 全绿。
8. 分享页、体验卡与文案不采集、不展示电话、证件、精确住址等隐私字段。

## 残余风险

| 风险 | 处理 |
|---|---|
| 体验卡加封面改变首页栅格高度 | 回归 `e2e/tests/experiences.spec.ts` 的体验视图 / 骨架用例；封面固定高度，不参与布局计算 |
| 资格提示拆分后旧断言失效 | 现有 E2E 断言单句 `只有已结束、并且你实际参加过的行程才能发表体验`，需与实现同批改为两套文案 |
| 与 `add-trip-completion` 四态耦合 | 未结束提示覆盖 `recruiting` / `full` / `ongoing`，状态名取自 `statusLabel()` 单一来源 |
| 与未归档的 `refine-inspiration-home` / `add-destination-area-filters` 同改体验展示面 | 归档顺序串行；本 change 只加封面条，不改筛选与分页 |
| 分享页说明与实际落点漂移 | 三条去向写在 `tripMessages`，与详情页 / 首页 / 参考发布入口同源 |
| 阶段提交与发布时机 | 分支 `feature/refine-experience-share`；每个阶段一次提交，push 前先 `git pull --rebase`；阶段性 push 后 CI 以构建与单测为准，E2E 仍本地执行 |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。`specs/trip-experiences/spec.md`（Delta）、`design.md`、`atdd-design.md`、`tasks.md`、代码与验证属 P2 / P3 / P4；Living Spec 合并在归档阶段完成，本 change 不归档。