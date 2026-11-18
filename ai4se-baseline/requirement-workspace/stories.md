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

# Story list — REQ-021（issue #28 取消行程）

> 编号说明：REQ-019 / S19 由 `add-credit-account` 占用、REQ-020 由并行 `refine-detail-companions` 预留；本故事顺延为 REQ-021 / S21。

- **来源：** issue #28 `[P0] 取消行程`（迭代 2 / P0 / 3 点 / 落点页面：我的旅行 / 行程详情页）；原型 `docs/prototype/ui.js:410`、`main.js:646`、`store.js:240-248`
- **Change：** `add-trip-cancel`（`trip-cancellation` ADDED）
- **口径：** 一条故事 = 两个页面入口 + 一份取消契约 + 一次状态迁移（招募中/已满员 → 已取消）
- **范围：** 只含取消行程主目标；#28 中的信用分、信用记录、免扣分申请与管理员审核属其他 story（用户裁决 D1），不在本表。
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S21 | 取消行程（招募中/已满员 → 已取消） | 行程发布者 | P0 | 2 | 3 | 行程详情 / 我的旅行 | REQ-021 | `add-trip-cancel` | P4 passed（2026-11-17） |

## Traceability（REQ-021）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S21 | REQ-021 §4 S21-1 ~ S21-20 | `openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md`（ADDED，5 条需求 / 20 场景） | `requirement-workspace/stories/add-trip-cancel.story.md` |

## Notes（REQ-021）

- 本故事只覆盖取消状态机与取消后的产品闭环；信用分、信用记录、扣分、免扣分申请与管理员审核不在本故事内（D1）。
- 新能力 `trip-cancellation` 单 capability；不改写 `trip-plans` / `trip-companions` 既有 Requirement 块，避免与未归档的 `add-trip-completion` / `refine-trip-application` / `refine-trip-chat` 三方同时改同一块。
- 用户裁决 D2–D5：入口在详情页 + 我的旅行；原因仅发布者与 ACCEPTED 同行者可见；「其他原因」说明必填 ≤100 字；我的旅行沿用四组并显示「已取消」。
- 原型已在 P3 补齐详情页 + 我的旅行入口与取消态样式（`@rule:prototype-ui-alignment`）。
- 契约 `status` 新增 `cancelled`；契约 0.13.0 + 迁移 V19（V18 由在途 `add-credit-account` / `add-ai-itinerary` 占用，按合并顺序串行）。
- 未接入外部 ALM；ALM Sync 状态记为 Pending。

---

# Story list — REQ-027（issue #32 安全学习恢复信用分）

> 编号说明：REQ-019 / S19 由 `add-credit-account` 占用、REQ-020 由并行 `refine-detail-companions` 预留、REQ-021 / S21 为 `add-trip-cancel`，REQ-022 / S22 由 `add-trip-weather` 占用。经四次合并顺延：REQ-023 被 `add-experience-like-credit` 占用；同步 `origin/main@3db5b14` 时 REQ-024 / S25 被 `add-traveler-recommendation` 占用；同步 `origin/main@acf1b1f` 时 REQ-025 / S25 / S26 被 `add-credit-exit-restriction` 占用；同步 `origin/main@0f4ab14` 时 REQ-026 / S27 / 契约 `0.22.0` 被 `add-admin-dashboard` 占用。本故事最终定为 **REQ-027 / S28**（契约 `0.23.0` / `V27__add_credit_learning.sql`）。

- **来源：** issue #32 `[P0] 安全学习恢复信用分`（信用系统迭代 4 / Story 6 / 5 点 / 落点页面：安全学习页）
- **Change：** `add-credit-recovery`（`user-credit` ADDED Requirements，追加恢复段）
- **口径：** 一条故事 = 一个新页面（安全学习）+ 一组考试端点 + 一次分数迁移（< 60 → 60）+ 一个拦截点（发布行程）
- **范围：** 含恢复段与低分限制端（用户裁决 D1 / D6）；扣分 / 加分事件（#29–#31）、自动封禁、人工封禁解封、管理后台题库维护（#23）不在本故事内。
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S28 | 安全学习恢复信用分（< 60 → 60） | 受限用户（信用分 < 60） | P0 | 信用系统迭代 4 | 5 | 安全学习页 | REQ-027 | `add-credit-recovery` | P3 Pass（2026-11-17，G1 Pass）；P4 Pass（2026-11-17） |

## Traceability（REQ-027）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S28 | REQ-027 §4 R-1 ~ R-27 | `openspec/changes/add-credit-recovery/specs/user-credit/spec.md`（ADDED：7 Requirement / 29 Scenario） | 无独立故事文件：以意图 + proposal + Delta 承接（与 REQ-012 / REQ-019 同口径） |

## Notes（REQ-027）

- **不拆子故事：** 「参加考试 → 判分通过 → 补到 60 → 限制解除」是同一垂直切片；拆开会出现「能考试但不能恢复」或「能恢复但没被拦过」的不可验收半成品。
- **限制端复用统一守卫（D1 / D6）：** 故事把「低于 60 被限制」当作前提；合并 `origin/main@acf1b1f` 后按用户裁决，限制端跟随 `add-credit-exit-restriction` 的 `CreditRestrictionGuard`（`score < 60` 或存在生效中限制即受限），本变更只交付恢复端与发布页引导入口，不再自建门禁。
- **限制范围是全部写入口（D6）：** 发布行程、提交 / 接受 / 撤回申请、聊天、发布体验等写操作统一返回 403 `CREDIT_RESTRICTED`；浏览与筛选、查看详情与聊天记录、举报、修改本人资料不被拒绝。
- **配额双真相：** 考试次数看考试会话（每月 2 次，开始即计次）、恢复次数看 `credit_ledger`（每月 1 次），不建计数表（D3 / D5）；自然月按 `Asia/Shanghai`（D4）。
- **前置依赖：** 扣分事件（#29–#31）未落地，演示需种子账号造分；原型无安全学习页，P3 先补截点（`@rule:prototype-ui-alignment`）。
- **归档顺序：** `openspec/specs/` 尚无 `user-credit`，本 change MUST 排在 `add-credit-account` 之后归档。
- **P3 产出（2026-11-17）：** 原型截点 `docs/prototype/credit-learning.html`（四态 + 深色 + 三组演示场景）、`atdd-design.md`（A1–A29：API 24 / 仅 E2E 2 / Defer UT 3）、`design.md`（D1–D14）、`tasks.md`（T1–T13，契约 T1 在最前，覆盖 29/29）；阶段记录 `docs/sdd/add-credit-recovery/p3-design.md`。
- **P3 工件评审（2026-11-17）：** `docs/reviews/20261117-add-credit-recovery-{proposal,spec,design,tasks}-review.md` 四份均 **Pass**（BLOCKER 0 / WARNING 10 全已收口）；评审中修正 2 处事实错误（T2 的 `V21` 升级基线、Maven `-Dtest` 的 `+` 分隔符）、1 处规格与实现冲突（R6「MUST 立即展示」→「进入 / 重新进入时取数」）、3 处设计缺口（先配额后资格、阈值单点、原因码文案归属 D14）；报告已由 WAYNE + Lewis Liu 签署，工件第二签署 Jay 已签（2026-11-17）。
- **P3 裁决：** G1 期间按起草态推进，2026-11-17 已补签为 Pass（IO=WAYNE / SA=Jacky）并进入 P4；OQ-5 只存完成标记 + 结果（不建逐题明细表）；OQ-6 用 `#/credit/learning` 独立页、入口仅「发布行程被拦截提示」；并发不引入 `SELECT ... FOR UPDATE`（SQLite 无行锁语法，改用 `credit_ledger` 幂等键唯一索引 + `recorded(key)` 预判）。
- **P4 产出（2026-11-17，`/sdd:atdd-apply`）：** T1–T13 全绿。契约 `0.19.0`（3 端点 / 4 schema / 6 错误码 / `POST /api/trips` 403 `CREDIT_SCORE_BELOW_60`）+ `V25__add_credit_learning.sql`（单表 + `(user_id, month_key)` 索引，双引擎、旧库 V20 升级覆盖）；后端 `CreditLearningService`（会话 / 学习完成 / 判分）+ `CreditReason`（D14）+ `CreditGateService.assertCanPublish`（仅 `TripController.create` 调用）；前端 `credit/learningState.ts`（`phase` / `toViewModel` / `quizProgress` / `errorMessage`）+ `credit/LearningPage.tsx`（五态 `intro/quiz/result/done/eligible`，`sessionStorage` 续考）+ `trips/publishGuard.ts`（`creditGuard` / `generic` 分流 + 专用 Alert「去安全学习」）；E2E `credit-learning.spec.ts` 3/3（45 → 拦截 → 学习 → 60 → 放行全闭环 / 62 无需恢复 / 45 分遍历首页、我的、聊天无入口）。门禁：后端 **348/348**、前端 **308/308（40 文件）**、`typecheck` + `build` 通过、`openspec validate --strict` valid、Redocly 0 error / 19 warning；阶段记录 `docs/sdd/add-credit-recovery/p4-apply.md`；待 `/sdd:local-verify` 与 G2。
- 未接入外部 ALM；ALM Sync 状态记为 Pending。

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

---

# Story list — REQ-018（S19–S24 管理后台）

- **来源：** 用户 2026-11-17 提供的 6 条管理后台 User Story（含优先级、迭代、故事点、落点页面、AC 与 Given/When/Then）
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次核心操作；6 条故事共享账号状态、举报记录与客服会话数据，合并为一个 change
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S19 | 查看并查询平台所有注册用户 | 平台管理员 | P0 | 1 | 3 | 用户管理页 | REQ-018 | `add-admin-console` | P3 Pass（2026-11-17） |
| S20 | 暂停、封禁或恢复用户账号 | 平台管理员 | P0 | 1 | 3 | 用户详情页 | REQ-018 | `add-admin-console` | P3 Pass（2026-11-17） |
| S21 | 查看并筛选平台举报 | 平台管理员 | P0 | 2 | 3 | 举报管理页 | REQ-018 | `add-admin-console` | P3 Pass（2026-11-17） |
| S22 | 人工审核并处理举报 | 平台管理员 | P0 | 2 | 5 | 举报详情页 | REQ-018 | `add-admin-console` | P3 Pass（2026-11-17） |
| S23 | 联系人工客服 | 平台用户 | P0 | 3 | 3 | 帮助与反馈 / 客服会话页 | REQ-018 | `add-admin-console` | P3 Pass（2026-11-17） |
| S24 | 接入并回复用户会话 | 平台客服 | P0 | 3 | 5 | 客户服务页 | REQ-018 | `add-admin-console` | P3 Pass（2026-11-17） |

## Traceability（REQ-018）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S19 | REQ-018 §4 S19-1 ~ S19-12 | `openspec/changes/add-admin-console/specs/admin-console/spec.md` | `requirement-workspace/stories/add-admin-console.story.md` |
| S20 | REQ-018 §4 S20-1 ~ S20-10 | 同上 | 同上 |
| S21 | REQ-018 §4 S21-1 ~ S21-5 | 同上 | 同上 |
| S22 | REQ-018 §4 S22-1 ~ S22-6 | 同上 | 同上 |
| S23 | REQ-018 §4 S23-1 ~ S23-7 | `openspec/changes/add-admin-console/specs/customer-service/spec.md` | 同上 |
| S24 | REQ-018 §4 S24-1 ~ S24-8 | 同上 | 同上 |
| 全部 | 注册邮箱 / 角色服务端固定 | `openspec/changes/add-admin-console/specs/user-auth/spec.md` | 同上 |

## Notes（REQ-018）

- 6 条故事属于同一后台闭环，合并为一个 change；P3 `tasks.md` 按迭代 1 / 2 / 3 分组，允许分三次交付。
- S1 给出的「7 类具体封禁理由 + 其他原因」在记录中展开为 8 项；举报原因仍为现有四类，二者不是同一枚举。
- 「暂停发布行程」按 S20 口径归入 `SUSPENDED`，不单设处罚类型。
- MVP 不提供永久删除账号或内容；处罚只改状态，既有行程、体验、聊天、举报保留。

---

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

---

# Story list — REQ-023（原 REQ-022；issue #30 旅行体验获赞增加信用分）

- **来源：** GitHub issue #30 `[P0] 旅行体验获赞增加信用分`（正文：优先级 P1 / 信用系统迭代 2 / Story 3 / 5 点 / 落点页面：旅行体验 / 信用记录）
- **Change：** `add-experience-like-credit`（`trip-experiences` ADDED：体验点赞；`user-credit` ADDED：体验获赞阶梯加分）
- **口径：** 一条故事 = 两个点赞展示面（首页体验卡 / 详情游后体验区）+ 两份能力增量（点赞数据与接口 + 获赞信用结算）+ 一次可观察的分数变化
- **编号说明：** 本故事来自信用系统迭代 2 的 Story 3（issue #30），不属于原型 S01–S17；为避免与 issue #22「S22 AI 推荐路线」等既有编号冲突，本表不新造 S 编号，使用「信用迭代2-S3」。
- **优先级说明：** issue 标题为 `[P0]`，正文写「优先级 P1」；本表并列记录两者，不单方面改写 issue。
- **需求编号说明：** P1 起草时登记为 REQ-022；合并 main 时该号已被 `add-trip-weather` 占用，按「后到者顺延」改为 **REQ-023**（2026-11-17）。

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| 信用迭代2-S3 | 旅行体验获赞增加信用分 | 体验作者（受益）/ 已登录用户（点赞） | P0（标题）/ P1（正文） | 信用系统迭代 2 | 5 | 旅行体验（点赞）/ 信用记录（按 D2 不做可见明细） | REQ-023 | `add-experience-like-credit` | P4 Pass（2026-11-17；后端 342 / 前端 306 / 受影响 E2E 12 全绿；合并 main 后顺延契约 0.18.0 + V24；本地验证 Pass，G2 待 Neal） |

## Traceability（REQ-023）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| 信用迭代2-S3 | REQ-023 §4 L-1 ~ L-8 / T-1 ~ T-10 / D-1 ~ D-3 / E-1 ~ E-3 | `openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md`、`specs/user-credit/spec.md`（均为 ADDED） | 无独立故事文件：以 proposal + Delta 承接（与 REQ-012 / REQ-014 同口径） |

## Notes（REQ-023）

- **不拆子故事：** 点赞与结算必须同批交付；只有点赞无法验收 T 组场景，只有结算没有触发源（用户裁决 D1）。
- **信用记录落点：** issue 写「旅行体验 / 信用记录」；按用户裁决 D2，信用加分明细不做可见面，分数变化在既有五个信用展示面体现。
- **不并入扣分故事：** issue #29（举报扣分）、#31（退出同行扣分）、#32（安全学习恢复）属信用系统迭代 2 的其他 Story，另开 change。
- **月度口径：** Asia/Shanghai 自然月（D3），按实发消耗（D4），截断不结转。
- **归档顺序：** `user-credit` 与 `trip-experiences` 的 Living Spec 尚未包含 `add-credit-account` / `add-experience-photos` 等在途 delta；本故事归档需排在其后。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。

---

# Story list — REQ-022 — 目的地天气与出行提醒（迭代 2 / P1）

- **故事：** S22 目的地天气与出行提醒（发起人 2026-11-17 用户故事；优先级 P1；迭代 2；3 点；落点页面：路线创建页 / 行程详情页）
- **需求编号说明：** `main` 已占用 REQ-001 ~ REQ-021（REQ-020 由并行 `refine-detail-companions` 占用），本需求按「后到者顺延」登记为 **REQ-022**。
- **垂直切片：** 只负责「目的地 + 日期 → 获取天气 → 展示天气 → 给出基础出行提醒」；「天气 + 预算 + 兴趣 → AI 自动生成 / 调整旅行方案」属 `add-ai-itinerary`，不在本故事。
- **技术边界：** Open-Meteo 提供真实天气；RouteMe 只做归一与固定规则提醒；高德负责地图真相；AI 不参与本故事。
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S22 | 目的地天气与出行提醒 | 规划旅行的用户 | P1 | 迭代 2 | 3 | 路线创建页 / 行程详情页 | REQ-022 | `add-trip-weather` | P1 drafted（2026-11-17） |

## Traceability（REQ-022）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S22 | REQ-022 §4 S22-1 ~ S22-16 | `openspec/changes/add-trip-weather/specs/trip-weather/spec.md`（ADDED：6 Requirement / 28 Scenario） | 无独立故事文件：以 proposal + Delta 承接（与 REQ-012 / REQ-014 / REQ-019 同口径） |

## Notes（REQ-022）

- **不拆故事：** 「选目的地与日期 → 看天气 → 看提醒」是同一垂直切片；拆开只会在发布页得到「有天气没提醒」或反之的不完整验收。
- **两处落点共享一个组件：** 发布页与详情页使用同一张天气卡与同一后端口径，避免两页给出不同结论。
- **不做 AI 联动：** 天气参与推荐属 `add-ai-itinerary`；本故事只沉淀天气能力与固定提醒规则，后续 AI 推荐直接复用同一端点与提醒函数。
- **多日行程：** 只展示旅行首日并标注日期；逐天预报另开需求。
- **依赖：** 无外部依赖；`add-ai-itinerary` 的天气代理（未提交）在本 change 落地后应改为复用，P4 合并时核对。

---

# Story list — REQ-031（实时通知中心与未读计数）

- **来源：** 发起人 2026-11-17 在 `#/chat` 的观察——「申请到达 / 我的申请被接受 / 收到新消息都没有实时提示，也没有显示收到几条通知的红点」；2026-11-18 追加要求：扩展为覆盖八类业务事件的完整通知中心；优先级 P0；迭代 3；8 点（S32-1 ~ S32-8 各 1 点）；落点页面：全局壳层、通知中心、聊天页、行程详情、信用记录、举报详情、账号菜单、客服
- **Change：** `add-realtime-notifications`（`notifications` ADDED：8 Requirement / 36 Scenario）
- **口径：** 一条故事 = 一条垂直切片（记录 → 八类事件接入 → 计数 → 通知中心与跳转 → 实时投递），拆为 S32-1 ~ S32-8 八个可独立验收的步骤
- **需求编号说明：** 2026-11-17 起草时登记为 REQ-023；`main` 上 REQ-023 已被 `add-experience-like-credit` 占用，2026-11-18 扩围时按「后到者顺延」改为 **REQ-031 / S32**
- **更新时间：** 2026-11-18

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S32-1 | 记录八类通知并保证去重与保留 | 平台用户 | P0 | 迭代 3 | 1 | 全局壳层 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-2 | 行程生命周期通知 | 发布者 / 同行者 | P0 | 迭代 3 | 1 | 行程详情 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-3 | 申请到达与裁决通知 | 发布者 / 申请者 | P0 | 迭代 3 | 1 | 申请处理 / 行程详情 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-4 | 聊天与信用通知 | 会话双方 / 信用变动用户 | P0 | 迭代 3 | 1 | 聊天页 / 信用记录 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-5 | 举报、账号、客服与系统通知 | 举报人 / 受限账号 / 客服用户 | P0 | 迭代 3 | 1 | 举报详情 / 账号 / 客服 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-6 | 通知中心、筛选与跳转 | 平台用户 | P0 | 迭代 3 | 1 | 通知中心 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-7 | 未读计数与标读规则 | 平台用户 | P0 | 迭代 3 | 1 | 全局壳层 / 通知中心 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |
| S32-8 | 实时投递与失败隔离 | 平台用户 | P0 | 迭代 3 | 1 | 全局壳层 | REQ-031 | `add-realtime-notifications` | P4 verified（2026-11-18） |

## Traceability（REQ-031）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S32-1 | REQ-031 §4 S32-1 ~ S32-4 | `openspec/changes/add-realtime-notifications/specs/notifications/spec.md`（ADDED：通知记录与生命周期） | `stories/add-realtime-notifications.story.md` |
| S32-2 | REQ-031 §4 S32-5 ~ S32-8、S32-12、S32-19 | 同上（行程生命周期事件） | 同上 |
| S32-3 | REQ-031 §4 S32-9 ~ S32-12、S32-22 | 同上（申请与裁决事件） | 同上 |
| S32-4 | REQ-031 §4 S32-13 ~ S32-15、S32-31 | 同上（聊天、信用、举报与账号事件、未读计数与标读规则） | 同上 |
| S32-5 | REQ-031 §4 S32-16 ~ S32-20 | 同上（聊天、信用、举报与账号事件、客服与系统事件） | 同上 |
| S32-6 | REQ-031 §4 S32-21 ~ S32-24、S32-28 | 同上（通知中心与跳转） | 同上 |
| S32-7 | REQ-031 §4 S32-25 ~ S32-32 | 同上（计数与标读） | 同上 |
| S32-8 | REQ-031 §4 S32-33 ~ S32-36 | 同上（实时与失败隔离） | 同上 |

## Notes（REQ-031）

- **不拆 change：** 八类事件共享同一张表、同一份计数口径、同一个通知中心与推送通道；拆分只会得到「有通知没入口」或「有入口没内容」的半成品。
- **只读依赖既有能力：** 行程、申请、聊天、信用、举报、账号、客服与资料服务的业务规则保持不变，本 change 只在既有成功路径上追加通知；因此不 MODIFY `trip-companions`（其 Delta 未归档）。
- **拒信也通知（D5）：** 发起人只点名「被接受」，但沉默地拒绝是更差的失败模式；Delta 把 reject 显式写成场景。
- **类型跳转：** 由后端下发 `target.kind`，前端不自行猜测；目标失效时只提示不跳转。
- **刻意排除：** 通知偏好、保留策略、搜索、邮件 / 短信 / OS 推送、浏览器关闭时的推送、WebSocket 与消息队列。
- **降级口径：** 推送只是延迟优化，REST 列表才是真相；断线、后端重启、推送失败都不改变计数，也不影响业务动作本身。

---

# Story list — REQ-025（退出同行扣分与低信用自动限制）

- **来源：** 用户当次会话 P0 卡片「[P0] 退出同行扣减信用分」；Story 4（信用系统迭代 2 / 5 点）与 Story 5（信用系统迭代 3 / 3 点）
- **Change：** `add-credit-exit-restriction`（`credit-enforcement` ADDED）
- **口径：** 两条故事共享同一 change 与同一信用执行链；S25 负责退出扣分与待核实，S26 负责 <60 限制与自动清理/解除；验收分开。
- **编号：** 起草时记为 S22 / S23、REQ-022；合并 main 时 REQ-022 / S22 已由 `add-trip-weather` 占用、REQ-023 由 `add-experience-like-credit` 占用，按「后到者顺延」改为 **REQ-025 / S25 / S26**。
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S25 | 退出同行扣减信用分 | 已接受同行者 | P0 | 信用系统迭代 2 | 5 | 行程详情 / 我的旅行 / 聊天 | REQ-025 | `add-credit-exit-restriction` | P4 implemented（2026-11-17） |
| S26 | 低信用分自动限制账号 | 受限用户 / 平台 | P0 | 信用系统迭代 3 | 3 | 个人主页 / 五展示面 / 被拦截提示 | REQ-025 | `add-credit-exit-restriction` | P4 implemented（2026-11-17） |

## Traceability（REQ-025）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S25 | REQ-025 §4 S25-1 ~ S25-22 | `openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md`（ADDED，P2 已定稿） | `requirement-workspace/stories/add-credit-exit-restriction-exit.story.md` |
| S26 | REQ-025 §4 S26-1 ~ S26-24 | 同上 | `requirement-workspace/stories/add-credit-exit-restriction-restriction.story.md` |

## Notes（REQ-025）

- **不拆 change：** 用户 D1 明确一个 change 覆盖两个故事；退出扣分是限制的主要触发源，拆开无法在一次验收内看到「扣分 → <60 → 限制」。
- **不拆 S25：** 原因 / 预计影响 / 六档扣分 / 月度 / 待核实是一条垂直切片；拆开会出现不可验收的半成品。
- **不拆 S26：** 触发 / 只读 / 清理 / 展示 / 自动解除是同一条限制生命周期；拆开会出现半状态。
- **管理端排除：** 管理员核实、人工封禁、申诉与后台页面均不在本 change（D3）；待核实保持 pending。
- **明细排除：** 用户端不展示加扣分明细（D4）；只看分数、等级、限制状态与本人原因。
- **Delta 归属：** 新能力 `credit-enforcement`；不改未归档的 `user-credit` / `trip-cancellation` / `trip-companions` Delta（D15）。

---

# Story list — REQ-026（S27 管理后台概览统计）

- **来源：** 用户 2026-11-17 需求「admin account which provide basic dashboard for statistics and count of different users etc」
- **Change：** `add-admin-dashboard`（`admin-dashboard` ADDED：5 Requirement / 13 Scenario）
- **口径：** 一条故事 = 一个页面 + 一份只读契约 + 一次聚合查询；只统计，不改任何业务状态机
- **编号说明：** `stories.md` 现有最大编号为 S24（S19 在 REQ-018 与 REQ-019 各有一条历史重号，属并行登记遗留），本故事顺延为 **S27**（合并 main 后 S25 / S26 已由 `add-credit-exit-restriction` 占用，原登记 S25）
- **更新时间：** 2026-11-17

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S27 | 查看平台概览统计 | 平台管理员 | P0 | 管理后台迭代 4 | 3 | 管理后台概览页 `#/admin` | REQ-026 | `add-admin-dashboard` | P1 drafted（2026-11-17） |

## Traceability（REQ-026）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S27 | REQ-026 §4（change spec 历史编号 S25-1 ~ S25-13） | `openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md`（ADDED：5 Requirement / 13 Scenario） | `requirement-workspace/stories/add-admin-dashboard.story.md` |

## Notes（REQ-026）

- **不拆故事：** 「看数字 → 进入处理页」是同一垂直切片；只做接口或只做页面都不可验收。
- **六组共享一次请求：** 避免首屏六个请求与部分失败；也不引入缓存与轮询。
- **三组不可跳转：** 行程 / 申请 / 体验没有后台列表页，卡片只展示数字，不放假入口。
- **口径依赖既有能力：** 账号有效状态复用 `admin-console` 的惰性恢复；行程状态复用 `TripPlan.status` 的四态推导；本故事不重复定义。
- **边界：** 趋势图、时间范围选择、导出、自动刷新与更多维度统计均不在本故事。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。

---

# Story list — REQ-029（S30 发布行程在地图上规划路线）

- **来源：** 发起人 2026-11-18 验收反馈「旅行地图有点冗余，但它在地图上显示路线、添加目的地的能力很好，用它替掉发布行程里的简单路线」
- **Change：** `refine-publish-route-map`（`trip-plans` MODIFIED：1 Requirement / 18 Scenario）
- **口径：** 一条故事 = 发布页一个段落（路线规划）+ 一条既有提交链路（`stops` + `travel_mode`）；不新增能力、不改契约、不加迁移
- **编号说明：** 合并说明（2026-11-18）：`main` 上 **REQ-027 / S28** 已由 `add-credit-recovery`（安全学习恢复信用分）占用、**REQ-028 / S29** 由 `add-travel-finance` 占用，本故事按「后到者顺延」改为 **REQ-029 / S30**
- **更新时间：** 2026-11-18

---

# Story list — REQ-028（旅行保障与小额借款 / 旅行金融迭代 1）

> 合并说明（2026-11-18）：本 change 已 rebase 到 `origin/main@822471c`；编号由 REQ-024 / S25 顺延为 **REQ-028 / S29**，契约 **0.25.0** + 迁移 **`V30`**；故事行与追溯表同步顺延。同日保险收敛为「第三方入口 + 状态回写」，Delta 为 10 Requirement / 40 Scenario。

- **故事：** S29 旅行保障与小额借款（发起人 2026-11-17 原始诉求；优先级 P0；迭代 1；5 点；落点页面：行程详情 / 旅行保障页 / 账号聚合页）
- **需求编号说明：** `main` 在 rebase 后已占用 REQ-001 ~ REQ-027，本需求按「后到者顺延」登记为 **REQ-028**、故事 **S29**（原 REQ-024 / S25）。
- **Change：** `add-travel-finance`（`travel-finance` ADDED）
- **垂直切片：** 只负责「钱包 → 第三方保险入口与状态回写 / 借小额 → 收 5% 服务费 → 还款 / 到期」；理赔、退保、罚息、充值提现、管理后台、通知与信用分影响不在本故事。
- **规则口径：** 保险由第三方提供方定价与承保，RouteMe 只提供入口并回写状态、不向用户收平台费；借款本金扣 5% 后发放净额；每人 1 个钱包、最多 1 笔进行中借款；仅行程发布者与 `ACCEPTED` 同行者可用。

# Story list — REQ-030（S31 举报违规扣减信用分）

- **来源：** GitHub Issue #29「[P0] 举报违规扣减信用分」（信用系统迭代 1 / Story 2 / 3 点 / 落点页面：举报详情页 / 用户信用记录）
- **Change：** `add-report-credit-deduction`（`user-credit` ADDED + `admin-console` MODIFIED）
- **口径：** 一条故事 = 举报成立表单（违规类型 + 违规原因）+ 一份信用扣分结算 + 一次低分联动；账号处罚动作从举报页移除（用户管理页保留）。
- **编号说明：** 合并 `origin/main` 时 REQ-028 / S29 已被 `add-travel-finance` 占用、REQ-029 / S30 又由 `refine-publish-route-map` 占用，本需求按「后到者顺延」改为 **REQ-030 / S31**（change id 不变）。
- **更新时间：** 2026-11-18

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S30 | 发布行程在地图上规划路线 | 发布者 | P0 | 迭代 3 | 3 | 发布行程 · 路线规划段 | REQ-029 | `refine-publish-route-map` | P4 implemented（2026-11-18） |
| S29 | 旅行保障与小额借款 | 行程发布者 / 已加入同行者 | P0 | 旅行金融 1 | 5 | 行程详情 / 旅行保障页 / 账号聚合页 | REQ-028 | `add-travel-finance` | P4 implemented（2026-11-18） |
| S31 | 举报违规扣减信用分 | 平台管理员 | P0 | 信用系统迭代 1 | 3 | 举报详情页 / 用户信用记录 | REQ-030 | `add-report-credit-deduction` | P4 implemented（2026-11-18） |

## Traceability（REQ-030）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S30 | REQ-029 §4 S30-1 ~ S30-11（+ 基线 7 场景保留） | `openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md`（MODIFIED：1 Requirement / 18 Scenario） | `requirement-workspace/stories/refine-publish-route-map.story.md` |

## Notes（REQ-030）

- **不拆故事：** 「加点 → 排序 → 看到路线 → 提交」是同一条垂直切片；只换面板不做提交校验，会把占位名带进详情页。
- **复用探索页面板：** `已选途经点`、`出行方式`、`重新生成旅行路线`、`已按直线显示路线`、`行程顺序` 五块直接复用；差异只来自注入的 `modes` / `modeLabels` 与降级文案。
- **不引入坐标：** 编辑期 `RouteWaypoint[]` 只在内存，提交仍为 `stops: string[]`；契约 0.22.0 与 `trip_plans` 表不变。
- **页面保留：** 只移除一级导航入口；`#/map` 与省 / 市深链不删。
- **占位名边界：** 探索页不落库，坐标名只是临时显示；发布侧由提交校验承担，不改 `pointFallbackName` 本体。
- **边界：** 路线持久化 / 收藏 / 分享、同行者匹配进发布页、AI 规划页改造均不在本故事。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。

## Traceability（REQ-028）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S29 | REQ-028 §4 S29-1 ~ S29-33 | `openspec/changes/add-travel-finance/specs/travel-finance/spec.md`（ADDED，P2 定稿） | `requirement-workspace/stories/add-travel-finance.story.md` |

## Notes（REQ-028）

- **不拆故事：** 钱包、第三方保险入口与状态、借款、5% 收费与账本必须同批交付；拆开后会出现「能买不能借」「状态对不上账」的不完整验收。
- **单 capability：** 保险入口与借款共用钱包、资格与页面，合并为 `travel-finance`；不新建第二个金融 change。
- **金额口径：** 整数分；借款只接受整元，保证 5% 恒为整数分，避免浮点与四舍五入争议；保险不出现金额字段。
- **保留边界：** 真实保险机构 API / 核保 / 理赔、真实银行对接、征信、退保、罚息、钱包充值提现、管理后台金融视图与通知均排除（D10 / D12）。
- **依赖：** `trip-plans` / `trip-companions` 只读；`user-auth` 注册事务内初始化钱包；`user-credit` 仅作账本范式参照，不读写信用分。

## Traceability（REQ-030）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S31 | REQ-030 §4 R-1 ~ R-26 | `openspec/changes/add-report-credit-deduction/specs/user-credit/spec.md` + `specs/admin-console/spec.md` | 无独立故事文件：以意图 + proposal + Delta 承接（与 REQ-012 / REQ-019 同口径） |

## Notes（REQ-030）

- **不拆故事：** 违规类型选择、扣分记账与低分联动是同一条垂直切片；拆开无法端到端验收。
- **账号处置解耦：** 举报页不再暂停 / 封禁；用户管理页保留既有能力（D1）。
- **记录可见性：** 只写账本并在举报详情留痕，不做用户端 / 管理端信用明细页（D2）。
- **低分限制：** 复用既有 `CreditChangedEvent`，不新增限制逻辑（D3）。
- **边界：** 举报提交端原因枚举、其他扣分 / 加分事件、月度扣分上限、通知均不在本故事。

- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending.
