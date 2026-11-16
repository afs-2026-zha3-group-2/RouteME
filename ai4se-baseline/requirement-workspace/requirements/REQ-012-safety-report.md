# REQ-012 — 同行安全提示与举报（S14）（Ready 需求条目）

- **能力：** `trip-companions`（MODIFIED）
- **对应 OpenSpec change：** `refine-safety-report`
- **编号说明：** 起草时为 REQ-011；同日 `main` 已把 S15 结束行程登记为 REQ-011（`add-trip-completion`），按「后到者顺延」改为 **REQ-012**。
- **Ready 日期：** 2026-11-16 ｜ **状态：** drafted（P1）
- **故事口径：** 迭代 3 ｜ 1 点 ｜ 落点页面：行程详情页 + 聊天页 ｜ 垂直切片：两个页面 + 复用一份举报契约 + 一次状态变化（举报表单 → 回执）
- **证据：** 用户指令与原型故事 `docs/prototype/stories.html` S14（3 条 AC + Given/When/Then）；`docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()`；`RouteME/frontend/src/safety/SafetyNote.tsx`；`RouteME/frontend/src/safety/ReportModal.tsx`；`RouteME/frontend/src/trips/TripDetailPage.tsx`；`RouteME/frontend/src/chat/ChatPage.tsx`；`RouteME/frontend/src/i18n/tripMessages.ts`；`RouteME/frontend/src/api.ts`；`RouteME/backend/src/main/java/routeme/controller/ReportController.java`；`RouteME/backend/src/main/java/routeme/service/impl/ReportServiceImpl.java`；`RouteME/backend/src/test/java/routeme/controller/ReportControllerTest.java`；`RouteME/openapi.yaml` 0.8.1；Living Spec `openspec/specs/trip-companions/spec.md`；`requirement-workspace/intents/REQ-012-safety-report.md`

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-012 |
| statement | 让与陌生人同行的学生在行程详情页与聊天页读到三条可读的安全边界（公共场所集合、把行程告知亲友、不公开电话 / 证件 / 住址），并能就地举报行程或对方；提交后拿到「已收到，我们会处理」的明确回执，本人行程不出现举报入口。 |
| actors | 与陌生人同行的学生（浏览者 / 申请者 / 同行者）、行程发布者、系统（记录举报与展示回执） |
| rationale | 安全提示与举报能力已在 REQ-003 落地，但提示是一段话、「告知亲友」缺失、回执文案与 AC 不符、弹窗缺身份保密与紧急求助说明，且本人行程也能举报自己；学生无法从页面确认「边界是什么、举报有没有被收到」。 |
| acceptance hints | 见 §4 场景：详情页三条提示（含集合区域）、聊天页一行提示、举报入口与对象、身份保密与紧急求助说明、提交回执「已收到，我们会处理」、本人行程无举报入口、失败可读且可重试、提示纯文本可读。 |
| links to evidence | 见上方证据路径；举报契约与隐私红线以 `trip-companions` Living Spec 与 `openapi.yaml` 0.8.1 为准；集合区域以 `trip-plans` 的 `meeting_area` 为准。 |

## 1. Intent

一句话：让**与陌生人同行的学生**在**行程详情页**和**聊天页**读到三条可读事实——「首次见面请选公共场所（本行程集合区域：…）」「把目的地、日期和同行人昵称告知亲友」「平台不公开电话、证件与精确住址」——并在两处就地举报行程或对方；提交后弹窗进入回执态，明确说「已收到，我们会处理」；本人发布的行程不出现举报入口。因为「和没见过的人出门」是一次高风险决定，用户需要的是**可复述的边界 + 一个点得动的求助入口 + 一句确定被收到的回执**，而不是一段混在一起的说明文字或只靠警告色表达的提示。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 与陌生人同行的学生（浏览者 / 申请者 / 同行者） | 可读详情页与聊天页的安全提示；可举报他人行程（详情页）与聊天对象（聊天页）；不能举报自己的行程。 |
| 行程发布者 | 安全提示照常可见；自己发布的行程不展示「举报这条行程」。 |
| 系统 | 记录举报（`POST /api/reports`），返回 `received=true` 供前端展示回执；MVP 不做处置闭环、不向被举报方透露举报人身份。 |
| 访客（未进入） | 先回到身份门，不展示详情页 / 聊天页及其提示与举报入口。 |

不新增角色；举报不改变申请、聊天、行程状态。

## 3. In / Out scope

**In scope**

- 详情页安全提示改为三条文本列表（替换单段 `safetyBody`）：
  1. 首次见面请选公共场所。本行程集合区域：{meeting_area}；集合区域为空时显示「尚未填写，出发前请在聊天中确认」。
  2. 把目的地、日期和同行人昵称告知亲友，并约定报平安的时间。
  3. 平台不公开电话、证件与精确住址。任何转账、借贷或索要证件的请求都应拒绝。
- 聊天页安全提示改为一行同义文本：「首次见面请选择公共场所 · 集合区域：{meeting_area 或 待确认} · 不要转账或提供证件信息」。
- 两处提示均为**文本**（列表 / 段落），MUST NOT 只用颜色或图标表达；列表与按钮对读屏可读、键盘可达。
- 详情页举报入口文案「举报这条行程」，仅当当前用户不是发布者时渲染；聊天页举报入口「举报这位用户」常驻（含已结束只读聊天）。
- 举报弹窗内容：举报对象（行程标题 / 对方昵称）、原因（沿用现有四类）、补充说明（选填 ≤200 字）、说明「我们不会向对方透露你的身份」、提示「如果你正处于危险中，请先联系当地警方或学校保卫处。平台举报不能替代紧急求助。」
- 提交成功：弹窗进入回执态，文案「已收到，我们会处理」；关闭后不改动任何业务状态。
- 提交失败：展示可读失败提示，保留已选原因与已填说明以便重试。
- 隐私红线回归：页面不展示电话、证件、精确住址。
- 为 `trip-companions` 写一份 MODIFIED delta spec，替换「我的旅行聚合与最低安全能力」，保留「我的旅行」既有两个场景。

**Out of scope**

- 举报后台工单、处置状态与时限、处理结果通知 / 回执查询、封禁、申诉。
- 举报原因词表扩容或按目标类型分表；`openapi.yaml` 版本变更；后端校验规则变更。
- 新增求助热线、紧急联系人、位置共享、行程分享链接、实名认证、信用体系。
- 资料弹窗（REQ-009）的举报按钮；体验发布页安全提示改版（保留现状；故事落点只有详情页与聊天页）。
- 采集或展示电话、证件、精确住址等隐私字段。
- 后端端点、数据库迁移、状态机变更；行程 / 申请 / 聊天 / 体验业务规则。

## 4. Scenarios + AC hints（SHALL 式，可观察）

1. **详情页三条安全提示常驻** — Given 用户打开任意行程详情，When 页面加载完成，Then 安全区 SHALL 以文本列表展示三条事实：公共场所集合（含本行程集合区域）、把行程告知亲友并约定报平安时间、不公开电话 / 证件 / 住址并拒绝转账或索要证件；MUST NOT 只靠颜色或图标表达；集合区域为空时 SHALL 显示「尚未填写，出发前请在聊天中确认」。
2. **聊天页安全提示** — Given 已匹配用户进入与该行程的聊天，When 页面加载完成，Then SHALL 在消息区上方展示一行文本：公共场所 + 集合区域（或「待确认」）+ 不要转账或提供证件信息；已结束行程的只读聊天同样展示。
3. **举报入口与对象** — Given 用户查看他人行程详情或在聊天页与对方沟通，When 查看安全区，Then 详情页 SHALL 提供「举报这条行程」、聊天页 SHALL 提供「举报这位用户」；打开后弹窗 SHALL 标明举报对象（行程标题 / 对方昵称），并展示「我们不会向对方透露你的身份」与紧急求助说明。
4. **提交举报并收到回执** — Given 用户在弹窗中选定原因（可补充说明 ≤200 字），When 提交，Then 系统 SHALL 记录该举报并返回 `received=true`，弹窗 SHALL 进入回执态并展示「已收到，我们会处理」；MVP MUST NOT 要求处置闭环或向被举报方透露举报人。
5. **本人行程不出现举报入口** — Given 用户打开自己发布的行程，When 查看安全区，Then 三条安全提示 SHALL 照常展示，且 MUST NOT 出现「举报这条行程」。
6. **提交失败可读且可重试** — *（异常 / 边界）* Given 网络或服务端错误，When 用户提交举报，Then 弹窗 SHALL 展示可读失败提示并保留已选原因与已填说明；重试成功后仍进入回执态，MUST NOT 产生重复回执展示或多条可见记录。
7. **隐私字段不出现在安全区与举报弹窗** — Given 用户查看详情页安全区、聊天页提示或举报弹窗，When 阅读全部文案，Then MUST NOT 出现电话、证件、精确住址等隐私字段的采集或展示；提示只要求用户不公开这些信息。

## 5. Constraints（仅事实，不含技术方案）

- 回执文案固定为「已收到，我们会处理」（S14 AC）。
- 举报原因沿用 `ReportRequest.reason` 四值：`harassment`（骚扰或不当言行）、`fake`（虚假信息）、`safety`（安全风险）、`other`（其他）；不新增枚举值（用户裁决 D2）。
- 补充说明选填，≤200 字，与 `openapi.yaml` 0.8.1 一致；不新增必填校验。
- 复用 `POST /api/reports`（`X-User-Id` 身份 + `target_type` ∈ {trip, user}）；不新增端点、不改迁移、不升契约版本。
- 举报只记录，不做处置闭环；不向被举报方透露举报人身份。
- 本人行程隐藏举报入口（用户裁决 D3）；安全提示仍显示。
- 安全提示必须文本可读（列表 / 段落），不允许仅靠颜色、图标或悬停提示表达（S14 AC）。
- 视觉与文案遵循 `docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()`；实现侧令牌取 `frontend/src/styles.css` 的 `:root` 与 `[data-theme="dark"]`，组件不写十六进制色值。
- 不新增依赖、不改设计系统；`trip-plans`、`trip-companions` 的既有业务规则与测试不得回归。

## 6. Context

`add-trip-companions` 已于 2026-11-15 归档，Living Spec 的「我的旅行聚合与最低安全能力」已定义安全提示、举报入口、回执与隐私红线；`ReportController` / `ReportServiceImpl` / `ReportControllerTest` 已覆盖提交、拒绝非法目标与原因。当前差距全在**前端展示**：`SafetyNote` 是一段 `safetyBody` 文案，缺「告知亲友」，无集合区域与转账 / 证件索取；`ReportModal` 缺身份保密与紧急求助说明，回执文案与 AC 不一致；详情页对本人行程也渲染举报按钮。原型 `safetyPanel()` / `chat-safety` / `reportModal()` 给出了三条安全事实与举报文案基准，用户已裁决严格按原型形态、原因词表保持现状、本人行程隐藏举报。因此本需求是**两个页面、单 capability 的展示增量**，不重做举报记录与处置能力。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-companions` | MODIFIED | 替换「我的旅行聚合与最低安全能力」：保留「我的旅行」两个场景，把安全提示拆成三条 / 一行文本并补回执文案、本人行程入口与失败提示。 |
| `trip-plans` | 不变（消费方） | 只读 `meeting_area` 与行程状态；不改字段、不改状态推导。 |
| 接口契约 `openapi.yaml` | 不变 | 0.8.1 已定义 `/reports`、`target_type` / `reason` 枚举与 `note ≤200`；本需求不新增字段或错误码。 |
| 数据库 / 迁移 | 不变 | 无新表、无迁移、无列变更。 |
| 设计系统 `design-system` | 不变 | 只复用现有面板 / 提示样式与令牌；不新增组件规范。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | 安全提示保持单段还是按原型拆三条？ | 用户 | 裁决 D1：按原型三条文本列表；聊天页一行同义提示。 |
| blocking | resolved | 举报原因是否按原型分目标类型？ | 用户 | 裁决 D2：沿用现有四类，不改契约与后端枚举。 |
| blocking | resolved | 本人发布的行程是否显示举报入口？ | 用户 | 裁决 D3：隐藏举报按钮，安全提示照常显示。 |
| blocking | resolved | 编号与 change 命名？ | 用户 | 裁决 D4：REQ-012 / `refine-safety-report`，能力 `trip-companions`（MODIFIED）。 |
| non-blocking | deferred | 举报是否需要处置状态或回执查询？ | Dev / BA | 后续解决：MVP 只记录；AC 明确不做后台工单系统。 |
| non-blocking | deferred | 是否在聊天页展示举报对象的资料 / 共同兴趣？ | Design | 后续解决：归 REQ-009 资料弹窗；本需求只做举报对象标注。 |
| non-blocking | deferred | 安全提示是否需要折叠以节省纵向空间？ | Design | 后续解决：三条文本常驻更符合「不能只靠颜色或图标」；折叠会削弱常驻性。 |

**blocking 项 = 0 未 resolved**，满足进入 impact / split 的硬门。

## 9. 用户裁决记录（2026-11-16）

| id | 议题 | 裁决 | 对 AC 的影响 |
|---|---|---|---|
| D1 | 安全提示形态 | **按原型三条文本列表**；详情页带集合区域，聊天页一行 | 场景 1 / 2；替换 `safetyBody` |
| D2 | 举报原因词表 | **沿用现有四类** | 场景 4；不改枚举与契约 |
| D3 | 本人行程举报入口 | **隐藏** | 场景 5 |
| D4 | 编号 / 命名 | **REQ-012 / `refine-safety-report`** | 单 change、单 capability |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why，外部可读） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（学生 / 发布者 / 系统 / 访客） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1 且指向既有能力 / 后续变更 | 通过 |
| — | resolved | §4 Scenarios | ④场景具体可观察，≥2（共 7 条） | 通过 |
| — | resolved | §4 #5–#7 | ⑤含异常 / 边界（本人行程、提交失败重试、隐私字段不出现） | 通过 |
| — | resolved | §4 | ⑥结果可验证（三条提示文案、集合区域回退、回执「已收到，我们会处理」、无举报按钮） | 通过 |
| — | resolved | §5 / §7 | ⑦依赖与应用架构触点已识别（`trip-companions`、`trip-plans` 只读、契约不变、无迁移） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking = 0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：举报记录、安全提示展示面与集合区域来源已列；无新概念 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：本人 / 失败 / 只读聊天 / 集合区域缺失 / 隐私字段齐全 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：举报锚点 `trip-companions`，集合区域锚点 `trip-plans`，资料弹窗举报仍属 out | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：详情页三条、聊天页一行、弹窗对象 / 原因 / 说明 / 边界说明 / 回执齐全 | 通过 |

**DoR BLOCKER 计数 = 0；A0 ⑨–⑫ 全过。** 增补表见 `requirement-workspace/deep-dive.md`「REQ-012 增补」。