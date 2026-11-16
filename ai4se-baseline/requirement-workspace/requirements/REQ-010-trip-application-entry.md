# REQ-010 — 提交同行申请（S08）（Ready 需求条目）

- **能力：** `trip-companions`（MODIFIED）
- **对应 OpenSpec change：** `refine-trip-application`
- **Ready 日期：** 2026-11-16 ｜ **状态：** drafted（P1）
- **故事口径：** 迭代 2 ｜ 2 点 ｜ 落点页面：行程详情页 ｜ 垂直切片：一个页面 + 一次状态变化（可申请 → 待处理）
- **证据：** 用户指令与原型故事 `docs/prototype/stories.html` S08（3 条 AC + Given/When/Then）；`docs/prototype/ui.js` `actionBox`；`docs/prototype/store.js` `canApply`；`RouteME/frontend/src/trips/TripDetailPage.tsx`；`RouteME/frontend/src/i18n/tripMessages.ts`；`RouteME/frontend/src/api.ts`；`RouteME/backend/src/main/java/routeme/service/impl/ApplicationServiceImpl.java`；`RouteME/backend/src/test/java/routeme/service/ApplicationServiceTest.java`；`RouteME/openapi.yaml` 0.7.0；Living Spec `openspec/specs/trip-companions/spec.md`；`requirement-workspace/intents/REQ-010-trip-application-entry.md`

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-010 |
| statement | 让想加入的人在他人招募中且未满员的行程详情页填写一句说明（选填、≤120 字）并提交同行申请，生成待处理申请；申请入口随身份与行程状态正确切换，重复申请与满员 / 已结束由后端拒绝并给出可读提示，提交后展示待处理状态并可在发布者处理前撤回。 |
| actors | 想加入的人（申请者）、行程发布者、系统（后端规则与状态展示） |
| rationale | 申请能力已在 Living Spec 与后端存在，但前端入口是弹窗、重复申请只显示错误码、待处理态与原型脱节，用户无法在一屏内完成「判断 → 留一句话 → 提交 → 等待/撤回」。 |
| acceptance hints | 见 §4 场景：内联申请区、提交进入待处理、本人无入口、重复申请提示、满员 / 已结束拒绝、撤回后恢复可申请、页面停留期间状态变化。 |
| links to evidence | 见上方证据路径；申请状态机与后端规则以 `trip-companions` Living Spec 为准，行程状态与人数以 `trip-plans` Living Spec 为准。 |

## 1. Intent

一句话：让**想加入的人**在他人**招募中且未满员**的行程详情页，直接在原型的内联申请区里留一句说明（选填）并提交同行申请；系统生成一条**待处理**申请，申请区随即变成「等发布者回应」的提示与撤回入口；如果自己发布、重复申请、或行程已满 / 已结束，入口不可用或提交被拒绝，并给出可读原因。因为「申请同行」是一次高承诺动作，用户需要在一屏里确认「我发的说明会被谁看到、现在是什么状态、还能不能撤回」，而不是面对弹窗、独立状态 Tag 和 `DUPLICATE_APPLICATION` 这类错误码。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 想加入的人（申请者） | 可对他人招募中且未满员的行程提交一次有效申请（pending 或 accepted 期间不能重复提交）；可撤回自己的 pending 申请；可查看当前申请状态。 |
| 行程发布者 | 自己发布的行程不展示申请入口；可查看与处理收到的申请（接受 / 拒绝），该能力不在本需求内改动。 |
| 系统（后端） | 在服务端拒绝本人申请、重复申请、已满员 / 已结束 / 已取消行程的申请，不只依赖前端隐藏；错误码沿用 `FORBIDDEN`、`DUPLICATE_APPLICATION`、`TRIP_NOT_OPEN`。 |
| 访客（未进入） | 先回到身份门，不展示行程详情与申请入口。 |

不新增角色；申请仍由发布者审核，不自动加入团队。

## 3. In / Out scope

**In scope**

- 行程详情页的申请入口改为原型的内联申请区：说明选填（≤120 字）、提交按钮、聊天权限说明。
- 入口可见性：仅「非本人 + 招募中 + 未满员 + 无 pending / accepted 申请」展示可提交表单。
- 提交申请：调用既有 `POST /api/trips/{tripId}/applications`，说明留空或仅空白视为未填写；成功后生成 PENDING。
- 待处理态：提交后申请区显示「申请已提交，等待 {发布者昵称} 回应。处理前你可以随时撤回。」与「撤回申请」；刷新页面后仍显示待处理。
- 撤回申请：沿用既有 `POST /api/applications/{id}/cancel`；撤回后若行程仍可申请，恢复内联申请区。
- 重复申请：后端返回 `DUPLICATE_APPLICATION` 时，前端提示「已申请，请等待回应」，不新增申请，并把页面状态刷新为待处理 / 已匹配。
- 满员 / 已结束：入口不可用并显示原型理由（「人数已满」/「行程已结束」）；绕过前端提交时后端返回 409 `TRIP_NOT_OPEN`，前端显示当前不可申请并按需刷新行程状态。
- 本人发布：不展示申请入口；发布者的「查看同行的申请」「标记为已结束」等操作保持现状。
- 为 `trip-companions` 写一份 MODIFIED delta spec，保留既有「提交与取消同行申请」的 5 个场景并补齐入口 / 待处理展示场景。

**Out of scope**

- 自动加入团队、跳过发布者审核、提交后立即开放聊天。
- 申请说明改为必填、调整 120 字上限、富文本 / 附件 / 图片。
- 新增后端端点、数据库迁移、申请状态机变更、`openapi.yaml` 版本变更。
- 行程卡片上的申请入口、批量申请、申请提醒 / 推送 / 站内信。
- 发布者处理申请（接受 / 拒绝 / 批量）与「我的旅行」分组、聊天、退出同行。
- 其他页面（首页卡片、我的旅行、聊天）的视觉重做。

## 4. Scenarios + AC hints（SHALL 式，可观察）

1. **可申请行程展示内联申请区** — Given 一条他人发布的「招募中且未满员」行程，当前用户没有 pending 或 accepted 申请，When 用户打开行程详情，Then 页面 SHALL 在操作区展示内联申请表单：说明输入（选填、120 字以内）、提交按钮「提交同行申请」，以及「提交后对方接受才会开放聊天」的说明；MUST NOT 使用弹窗承载申请表单。
2. **提交申请并进入待处理** — Given 上述行程，When 用户填写说明或留空后提交，Then 系统 SHALL 生成一条 PENDING 申请；申请区 SHALL 变为「申请已提交，等待 {发布者昵称} 回应。处理前你可以随时撤回。」并展示「撤回申请」；页面刷新后 MUST 仍显示待处理，而不是重新出现申请表单。
3. **说明选填与长度** — Given 用户在申请表单留空或只输入空白，When 提交，Then 系统 SHALL 接受并生成 PENDING（说明为空）；Given 用户输入超过 120 字，When 提交，Then 前端 MUST 阻止超长输入或提示最多 120 字，且不生成申请。
4. **本人发布的行程不显示申请入口** — Given 用户打开自己发布的行程，When 查看操作区，Then 系统 MUST NOT 展示申请表单或「申请同行」入口；发布者的申请处理与结束行程入口保持可用。
5. **重复申请被拦截并提示** — Given 用户对该行程已有 pending 或 accepted 申请（包括页面停留期间在其他标签页已提交），When 用户再次提交，Then 后端 MUST 返回 `DUPLICATE_APPLICATION` 且不新增申请；前端 SHALL 提示「已申请，请等待回应」，并把申请区刷新为待处理 / 已匹配状态。
6. **满员或已结束不可申请** — Given 行程为「已满员」或「已结束」，When 用户打开详情，Then 申请入口 MUST 不可用，并 SHALL 展示「人数已满」或「行程已结束」的原因；When 用户绕过前端直接提交，Then 后端 MUST 拒绝且不生成申请（无有效申请时为 409 `TRIP_NOT_OPEN`；已有有效申请时为 409 `DUPLICATE_APPLICATION`），前端 SHALL 展示当前不可申请并刷新行程状态。
7. **撤回后恢复可申请** — Given 用户有一条 pending 申请且行程仍招募中、未满员，When 用户确认撤回，Then 申请状态 SHALL 变为「已取消」，申请区 SHALL 恢复为内联申请表单。
8. **页面停留期间状态变化** — *（异常 / 边界）* Given 用户打开可申请行程后停留，期间行程被接受至满员或被发布者标记为已结束，When 用户提交申请，Then 后端 MUST 拒绝，前端 SHALL 显示可读的不可申请原因，并在刷新后不再展示申请表单。

## 5. Constraints（仅事实，不含技术方案）

- 申请说明选填，最长 120 字；后端 trim 后空字符串存为 `null`；不新增必填校验（用户裁决 D1）。
- 复用 `POST /api/trips/{tripId}/applications` 与 `POST /api/applications/{applicationId}/cancel`；不新增端点、不迁移数据、不升契约版本。
- 后端拒绝规则以现状为准：本人 → 403 `FORBIDDEN`；pending / accepted → 409 `DUPLICATE_APPLICATION`；非 recruiting → 409 `TRIP_NOT_OPEN`；后端的检查顺序是「本人 → 重复 → 非 recruiting」，因此满员时若已有有效申请，错误码为 `DUPLICATE_APPLICATION`，两者都必须展示为可读原因。
- 入口只在行程详情页；不做行程卡片入口（原型 S05 / S08 的落点为详情页）。
- 待处理态严格按原型：等待回应提示 + 撤回申请；不使用字面「已申请，待处理」按钮（用户裁决 D2）。
- 重复申请提示文案固定为「已申请，请等待回应」；满员 / 结束原因文案按原型「人数已满」/「行程已结束」。
- 视觉遵循 `docs/prototype/prototype.html` 与 `docs/prototype/styles.css`（Qoder 项目规则投影 `prototype-ui-alignment`）；实现侧令牌取 `frontend/src/styles.css` 的 `:root` 与 `[data-theme="dark"]`，组件不写十六进制色值。
- 申请表单与撤回入口需键盘可达；错误与状态提示需可被读屏软件读出。
- 不新增依赖、不改设计系统；既有接受 / 拒绝 / 聊天 / 退出 / 我的旅行行为不得回归。

## 6. Context

`add-trip-companions` 已于 2026-11-15 归档，Living Spec `openspec/specs/trip-companions/spec.md` 的「提交与取消同行申请」已经定义了本需求要遵守的全部业务规则；后端 `ApplicationServiceImpl.apply` 与 `ApplicationServiceTest` 也已覆盖本人、重复、满员与重申请场景。当前差距集中在**前端入口与状态展示**：`TripDetailPage` 用 `Modal` 承载表单，重复申请把 `api.ts` 抛出的错误码直接放进 `Alert`，提交后的状态是独立的 Tag 区块。原型 `ui.js` 的 `actionBox` 给出的却是内联表单、等待回应提示与撤回按钮。用户明确要求「前端页面严格按照 prototype 来做」，并裁决说明保持选填、待处理态严格按原型。因此本需求是一次**单页面、单 capability 的展示增量**，不重做申请状态机，也不改后端规则。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-companions` | MODIFIED | 扩展现有「提交与取消同行申请」：补入口状态、内联申请区、待处理展示、重复与满员 / 结束的可读反馈；保留既有 5 个场景与状态机。 |
| `trip-plans` | 不变（消费方） | 行程状态（recruiting / full / completed）与人数仍由 `trip-plans` 单一写入；本需求只读消费。 |
| 接口契约 `openapi.yaml` | 不变 | 0.7.0 已定义 `message` 选填 ≤120 与 `DUPLICATE_APPLICATION` / `TRIP_NOT_OPEN`；本需求不新增字段或错误码。 |
| 数据库 / 迁移 | 不变 | 无新表、无迁移、无状态列变更。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | 申请说明必填还是选填？ | 用户 | 裁决 D1：选填，保持现状；留空生成 PENDING。 |
| blocking | resolved | 提交后的待处理态用什么形态？ | 用户 | 裁决 D2：严格按原型——等待回应提示 + 撤回申请，不使用字面「已申请，待处理」按钮。 |
| blocking | resolved | 申请入口落在哪里？ | 用户 / 原型 | 用户要求严格按原型；原型 S05 / S08 的入口只在行程详情页，行程卡片不放入口。 |
| blocking | resolved | 编号与 change 命名？ | 用户 | 裁决 D3：REQ-010 / `refine-trip-application`，能力 `trip-companions`（MODIFIED）。 |
| non-blocking | deferred | 「我的旅行 → 我申请的」是否同步改成「已申请，待处理」文案？ | Design | 后续解决：本需求只要求可查看状态；既有状态 Tag 已能表达 pending，视觉重做归后续迭代。 |
| non-blocking | deferred | 发布者是否收到申请提醒 / 推送？ | Dev | 后续解决：MVP 无通知能力；本需求只保证发布者能在申请列表看到申请与说明。 |
| non-blocking | deferred | 被拒绝 / 取消后再次申请是否要提示「上次被拒绝」？ | BA | 后续解决：现状允许再次申请；历史提示不改变本需求验收。 |

**blocking 项 = 0 未 resolved**，满足进入 impact / split 的硬门。

## 9. 用户裁决记录（2026-11-16）

| id | 议题 | 裁决 | 对 AC 的影响 |
|---|---|---|---|
| D1 | 说明必填性 | **选填，保持现状** | 场景 3 只校验长度；不改后端校验 |
| D2 | 待处理态 | **严格按原型**：等待提示 + 撤回申请 | 覆盖 S08 AC 的字面「按钮变为已申请，待处理」；状态可见由提示与「我的旅行」共同满足 |
| D3 | 编号 / 命名 | **REQ-010 / `refine-trip-application`** | 单 change、单 capability；分支名与 change-id 一致 |
| D4 | 起始分支 | **独立 worktree，基于 `origin/main`** | 不依赖 `add-user-profiles` 未合并分支 |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why，外部可读） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（申请者 / 发布者 / 系统 / 访客） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1 且指向既有能力 / 后续变更 | 通过 |
| — | resolved | §4 Scenarios | ④场景具体可观察，≥2（共 8 条） | 通过 |
| — | resolved | §4 #5–#8 | ⑤含异常 / 边界（重复、满员 / 结束、撤回、页面停留期间状态变化） | 通过 |
| — | resolved | §4 | ⑥结果可验证（PENDING、待处理提示、重复文案、409 拒绝、入口恢复） | 通过 |
| — | resolved | §5 / §7 | ⑦依赖与应用架构触点已识别（`trip-companions`、`trip-plans` 只读、契约不变、无迁移） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking = 0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：申请粒度、字段、状态流转与来源已列；无新概念 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：本人 / 重复 / 满员 / 已结束 / 撤回 / 重申请分支齐全 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：状态与人数锚点 `trip-plans`，申请锚点 `trip-companions`，本需求只消费 | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：申请区、待处理、不可申请原因、重复提示、撤回入口齐全 | 通过 |

**DoR BLOCKER 计数 = 0；A0 ⑨–⑫ 全过。** 增补表见 `requirement-workspace/deep-dive.md`「REQ-010 增补」。
