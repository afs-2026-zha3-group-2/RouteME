# REQ-012 — 同行举报入口与回执（S14）（Ready 需求条目）

- **能力：** `trip-companions`（REMOVED + ADDED）
- **对应 OpenSpec change：** `refine-safety-report`
- **编号说明：** 起草时为 REQ-011；同日 `main` 已把 S15 结束行程登记为 REQ-011（`add-trip-completion`），按「后到者顺延」改为 **REQ-012**。
- **修订记录：** rev1（2026-11-16）建立「三条提示 + 举报」；rev2（2026-11-16）依裁决 D5 移除详情页 / 聊天页全部安全提示，举报入口提到页头右上，并同步修订 S14 故事 AC。
- **Ready 日期：** 2026-11-16 ｜ **状态：** drafted（P1，rev2）
- **故事口径：** 迭代 3 ｜ 1 点 ｜ 落点页面：行程详情页 + 聊天页 ｜ 垂直切片：两个页面 + 复用一份举报契约 + 一次状态变化（举报表单 → 回执）
- **证据：** 用户指令与原型故事 `docs/prototype/stories.html` S14（rev2「举报入口与回执」，3 条 AC + Given/When/Then）；设计预览 `openspec/changes/refine-safety-report/preview/safety-report.html`（B · 页头右上）；`docs/prototype/ui.js` `reportModal()`；`RouteME/frontend/src/safety/ReportModal.tsx`；`RouteME/frontend/src/trips/TripDetailPage.tsx`；`RouteME/frontend/src/chat/ChatPage.tsx`；`RouteME/frontend/src/i18n/tripMessages.ts`；`RouteME/frontend/src/api.ts`；`RouteME/backend/src/main/java/routeme/controller/ReportController.java`；`RouteME/backend/src/main/java/routeme/service/impl/ReportServiceImpl.java`；`RouteME/backend/src/test/java/routeme/controller/ReportControllerTest.java`；`RouteME/openapi.yaml` 0.8.1；Living Spec `openspec/specs/trip-companions/spec.md`；`requirement-workspace/intents/REQ-012-safety-report.md`

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-012 |
| statement | 让与陌生人同行的学生在他人行程详情页与聊天页的页头就地举报行程或对方；提交后拿到「已收到，我们会处理」的明确回执；本人行程不出现举报入口。详情页 / 聊天页不再展示安全提示（裁决 D5）。 |
| actors | 与陌生人同行的学生（浏览者 / 申请者 / 同行者）、行程发布者、系统（记录举报与展示回执） |
| rationale | 举报能力已在 REQ-003 落地，但弹窗缺身份保密与紧急求助说明、回执文案与 AC 不符、详情页对本人行程也渲染举报按钮，且入口埋在安全区底部；学生遇到不适时找不到一个明确可点的求助入口。裁决 D5 同时移除安全提示，页面因此需要一个独立、稳定的入口位置。 |
| acceptance hints | 见 §4 场景：详情页与聊天页页头举报入口及对象、身份保密与紧急求助说明、提交回执「已收到，我们会处理」、本人行程无举报入口、失败可读且可重试、入口不以颜色或图标单独表达、弹窗不含隐私字段。 |
| links to evidence | 见上方证据路径；举报契约与隐私红线以 `trip-companions` Living Spec 与 `openapi.yaml` 0.8.1 为准；设计基准见 `openspec/changes/refine-safety-report/preview/safety-report.html`（B · 页头右上）。 |

## 1. Intent

一句话：让**与陌生人同行的学生**在**行程详情页**和**聊天页**的页头右上角都能找到一个明确可点的举报入口——详情页举报「这条行程」、聊天页举报「这位用户」——提交后弹窗进入回执态，明确说「已收到，我们会处理」；本人发布的行程不出现举报入口。因为「和没见过的人出门」是一次高风险决定，用户需要的是**一个随时能找到的求助入口 + 一句确定被收到的回执**，而不是埋在长页面底部的入口。裁决 D5 同时决定详情页与聊天页不再承载安全提示文案。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 与陌生人同行的学生（浏览者 / 申请者 / 同行者） | 可举报他人行程（详情页页头）与聊天对象（聊天页页头）；不能举报自己的行程。 |
| 行程发布者 | 自己发布的行程不展示「举报这条行程」；页面同样不展示安全提示。 |
| 系统 | 记录举报（`POST /api/reports`），返回 `received=true` 供前端展示回执；MVP 不做处置闭环、不向被举报方透露举报人身份。 |
| 访客（未进入） | 先回到身份门，不展示详情页 / 聊天页及其举报入口。 |

不新增角色；举报不改变申请、聊天、行程状态。

## 3. In / Out scope

**In scope**

- 详情页页头右上角（与状态标签同一行）渲染「举报这条行程」，仅当当前用户不是发布者时出现；窄屏换行到标题下方，不得隐藏。
- 聊天页页头右上角（头像对侧）渲染「举报这位用户」，常驻（含已结束只读聊天）。
- 详情页与聊天页**不再渲染安全提示**：三条列表、聊天页一行文本及其集合区域回退文案（「尚未填写，出发前请在聊天中确认」/「待确认」）一并下线（裁决 D5）。
- 举报入口为**文本按钮**，MUST NOT 只用颜色或图标表达；键盘可达、读屏可读。
- 举报弹窗内容：举报对象（行程标题 / 对方昵称）、原因（沿用现有四类）、补充说明（选填 ≤200 字）、说明「我们不会向对方透露你的身份」、提示「如果你正处于危险中，请先联系当地警方或学校保卫处。平台举报不能替代紧急求助。」
- 提交成功：弹窗进入回执态，文案「已收到，我们会处理」；关闭后不改动任何业务状态。
- 提交失败：展示可读失败提示，保留已选原因与已填说明以便重试。
- 隐私红线回归：页面与弹窗不展示电话、证件、精确住址。
- 体验发布页保留现有「发布前提醒」，不出现举报入口（回归守卫）。
- 为 `trip-companions` 移除旧需求块「我的旅行聚合与最低安全能力」（其场景含安全提示，MODIFIED 无法删场景），并新增「同行举报入口与回执」，保留「我的旅行」两个场景与举报、回执、失败重试、隐私场景。

**Out of scope**

- 举报后台工单、处置状态与时限、处理结果通知 / 回执查询、封禁、申诉。
- 重新引入安全提示、边界文案或帮助中心内容（本 change 明确移除；如需要另开需求）。
- 举报原因词表扩容或按目标类型分表；`openapi.yaml` 版本变更；后端校验规则变更。
- 新增求助热线、紧急联系人、位置共享、行程分享链接、实名认证、信用体系。
- 资料弹窗（REQ-009）的举报按钮；体验发布页安全提示改版（保留现状；故事落点只有详情页与聊天页）。
- 采集或展示电话、证件、精确住址等隐私字段。
- 后端端点、数据库迁移、状态机变更；行程 / 申请 / 聊天 / 体验业务规则。

## 4. Scenarios + AC hints（SHALL 式，可观察）

1. **详情页页头举报入口** — Given 用户打开他人发布的行程详情，When 页面加载完成，Then 页头 SHALL 在状态标签同一行右侧渲染文本按钮「举报这条行程」；页面 MUST NOT 渲染安全提示区；入口 MUST NOT 只靠颜色或图标表达，且键盘可达、读屏可读。
2. **聊天页页头举报入口** — Given 已匹配用户进入与该行程的聊天，When 页面加载完成，Then 页头 SHALL 在头像对侧渲染文本按钮「举报这位用户」；已结束行程的只读聊天同样展示；页面 MUST NOT 渲染安全提示条。
3. **举报弹窗内容** — Given 用户点击任一举报入口，When 弹窗打开，Then SHALL 标明举报对象（行程标题 / 对方昵称），并展示四类原因（骚扰或不当言行 / 虚假信息 / 安全风险 / 其他）、选填说明（≤200 字）、「我们不会向对方透露你的身份」与紧急求助说明。
4. **提交举报并收到回执** — Given 用户在弹窗中选定原因（可补充说明 ≤200 字），When 提交，Then 系统 SHALL 记录该举报并返回 `received=true`，弹窗 SHALL 进入回执态并展示「已收到，我们会处理」；MVP MUST NOT 要求处置闭环或向被举报方透露举报人。
5. **本人行程不出现举报入口** — Given 用户打开自己发布的行程，When 查看页头，Then MUST NOT 出现「举报这条行程」；页面 MUST NOT 出现安全提示区，其余功能照常。
6. **提交失败可读且可重试** — *（异常 / 边界）* Given 网络或服务端错误，When 用户提交举报，Then 弹窗 SHALL 展示可读失败提示并保留已选原因与已填说明；重试成功后仍进入回执态，MUST NOT 产生重复回执展示或多条可见记录。
7. **隐私字段不出现在举报弹窗** — Given 用户打开举报弹窗，When 阅读全部文案，Then MUST NOT 出现电话、证件、精确住址等隐私字段的采集或展示；弹窗只要求用户自行判断、不索取这些信息。

## 5. Constraints（仅事实，不含技术方案）

- 回执文案固定为「已收到，我们会处理」（S14 AC）。
- 举报原因沿用 `ReportRequest.reason` 四值：`harassment`（骚扰或不当言行）、`fake`（虚假信息）、`safety`（安全风险）、`other`（其他）；不新增枚举值（用户裁决 D2）。
- 补充说明选填，≤200 字，与 `openapi.yaml` 0.8.1 一致；不新增必填校验。
- 复用 `POST /api/reports`（`X-User-Id` 身份 + `target_type` ∈ {trip, user}）；不新增端点、不改迁移、不升契约版本。
- 举报只记录，不做处置闭环；不向被举报方透露举报人身份。
- 本人行程隐藏举报入口（用户裁决 D3）；详情页与聊天页不展示安全提示（用户裁决 D5）。
- 举报入口必须文本可读（按钮或链接），不允许仅靠颜色、图标或悬停提示表达（S14 AC #3）；键盘可达、读屏可读。
- 入口位置固定为页头右上（用户裁决 D5）：详情页与状态标签同行右侧，聊天页与头像相对；窄屏可换行，不得隐藏或折叠进菜单。
- 集合区域仍在「行程安排 · 集合」事实行展示；集合区域缺失时该行显示「未填写」，不再有专门的安全提示回退。
- 视觉与文案遵循 `docs/prototype/ui.js` `reportModal()` 与 `openspec/changes/refine-safety-report/preview/safety-report.html`（B · 页头右上）；实现侧令牌取 `frontend/src/styles.css` 的 `:root` 与 `[data-theme="dark"]`，组件不写十六进制色值。
- 不新增依赖、不改设计系统；`trip-plans`、`trip-companions` 的既有业务规则与测试不得回归。

## 6. Context

`add-trip-companions` 已于 2026-11-15 归档，Living Spec 的「我的旅行聚合与最低安全能力」已定义安全提示、举报入口、回执与隐私红线；`ReportController` / `ReportServiceImpl` / `ReportControllerTest` 已覆盖提交、拒绝非法目标与原因。当前差距全在**前端展示**：`ReportModal` 缺身份保密与紧急求助说明，回执文案与 AC 不一致，详情页对本人行程也渲染举报按钮，举报入口位于安全区底部。裁决 D5 进一步移除详情页与聊天页的全部安全提示，把入口提到页头右上，因此本需求由「提示 + 举报」收敛为**两个页头的举报入口增量 + 弹窗文案修正**，不重做举报记录与处置能力；体验发布页的「发布前提醒」保持现状。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-companions` | REMOVED + ADDED | 旧需求块「我的旅行聚合与最低安全能力」含安全提示场景，MODIFIED 不能删除场景名，故整块移除并新增「同行举报入口与回执」：保留「我的旅行」两个场景、举报回执、失败重试与隐私红线，加入页头入口与对象标注。 |
| `trip-plans` | 不变（消费方） | 详情页「集合」事实行仍只读 `meeting_area` 与行程状态；不改字段、不改状态推导。 |
| 接口契约 `openapi.yaml` | 不变 | 0.8.1 已定义 `/reports`、`target_type` / `reason` 枚举与 `note ≤200`；本需求不新增字段或错误码。 |
| 数据库 / 迁移 | 不变 | 无新表、无迁移、无列变更。 |
| 设计系统 `design-system` | 不变 | 只复用现有面板、按钮与弹窗样式及令牌；不新增组件规范。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | 安全提示保持单段还是按原型拆三条？ | 用户 | 裁决 D1：按原型三条文本列表；聊天页一行同义提示。**已被 D5 取代。** |
| blocking | resolved | 举报原因是否按原型分目标类型？ | 用户 | 裁决 D2：沿用现有四类，不改契约与后端枚举。 |
| blocking | resolved | 本人发布的行程是否显示举报入口？ | 用户 | 裁决 D3：隐藏举报按钮；页面同样不展示安全提示（D5）。 |
| blocking | resolved | 编号与 change 命名？ | 用户 | 裁决 D4：REQ-012 / `refine-safety-report`；能力 `trip-companions` 以 REMOVED + ADDED 落 delta。 |
| blocking | resolved | 安全提示与举报入口的最终形态？ | 用户 | 裁决 D5：移除详情页 / 聊天页全部提示，举报入口置于页头右上（B · 页头右上）。 |
| non-blocking | deferred | 举报是否需要处置状态或回执查询？ | Dev / BA | 后续解决：MVP 只记录；AC 明确不做后台工单系统。 |
| non-blocking | deferred | 是否在聊天页展示举报对象的资料 / 共同兴趣？ | Design | 后续解决：归 REQ-009 资料弹窗；本需求只做举报对象标注。 |
| non-blocking | deferred | 是否需要在别处补回安全边界文案？ | Design / BA | 后续解决：本 change 移除提示；如需补回，另开需求评估发布页或新手引导。 |

**blocking 项 = 0 未 resolved**，满足进入 impact / split 的硬门。

## 9. 用户裁决记录（2026-11-16）

| id | 议题 | 裁决 | 对 AC 的影响 |
|---|---|---|---|
| D1 | 安全提示形态 | ~~按原型三条文本列表；详情页带集合区域，聊天页一行~~ **已被 D5 取代** | 场景 1 / 2 撤回 |
| D2 | 举报原因词表 | **沿用现有四类** | 场景 3；不改枚举与契约 |
| D3 | 本人行程举报入口 | **隐藏** | 场景 5 |
| D4 | 编号 / 命名 | **REQ-012 / `refine-safety-report`** | 单 change；能力改为 REMOVED + ADDED |
| D5 | 安全提示与入口形态 | **移除详情页三条提示与聊天页一行提示；举报入口置于页头右上（B）** | 取代 D1；场景 1 / 2 / 5；Delta Spec 整块重建 |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why，外部可读） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（学生 / 发布者 / 系统 / 访客） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1 且指向既有能力 / 后续变更 | 通过 |
| — | resolved | §4 Scenarios | ④场景具体可观察，≥2（共 7 条） | 通过 |
| — | resolved | §4 #5–#7 | ⑤含异常 / 边界（本人行程、提交失败重试、隐私字段不出现） | 通过 |
| — | resolved | §4 | ⑥结果可验证（页头入口文案、回执「已收到，我们会处理」、无举报按钮、无提示区） | 通过 |
| — | resolved | §5 / §7 | ⑦依赖与应用架构触点已识别（`trip-companions`、`trip-plans` 只读、契约不变、无迁移） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking = 0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：举报记录与页头入口挂载点已列；无新概念 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：本人 / 失败 / 只读聊天 / 隐私字段齐全 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：举报锚点 `trip-companions`，集合区域锚点 `trip-plans`，资料弹窗举报仍属 out | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：两个页头入口、弹窗对象 / 原因 / 说明 / 边界说明 / 回执齐全 | 通过 |

**DoR BLOCKER 计数 = 0；A0 ⑨–⑫ 全过。** 增补表见 `requirement-workspace/deep-dive.md`「REQ-012 增补」。