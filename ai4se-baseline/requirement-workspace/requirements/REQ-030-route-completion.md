# REQ-030 — 路线完成度（Ready 需求草稿）

- **能力：** `route-completion`（ADDED）；只读依赖 `user-profile` / `user-profiles`（资料响应）、`trip-plans` / `trip-companions`（未来已结束行程口径）；**不读写** `user-credit`、资料统计与成长等级
- **对应 OpenSpec change：** `add-route-completion`
- **草稿日期：** 2026-11-18 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **编号说明：** 起草时按 `origin/main@aa320dc` 顺位登记为 REQ-029 / S30（场景 S30-1 ~ S30-19）；同日发现并行 change `add-growth-level`（issue #44）已登记同号，按用户裁决（2026-11-18）改为 **REQ-030 / S31**（场景同步改为 S31-1 ~ S31-19）；change-id / 能力名不变。
- **故事来源：** GitHub issue #45「路线完成度」（P1 / 迭代 3 / 3 点；落点页面：用户主页 / 推荐列表 / 行程详情）
- **证据：** `requirement-workspace/intents/REQ-030-route-completion.md`；`RouteME/backend/src/main/java/routeme/response/UserProfileResponse.java`；`RouteME/backend/src/main/java/routeme/controller/UserProfileController.java`；`RouteME/frontend/src/profile/ProfilePage.tsx`；`RouteME/frontend/src/profile/creditDisplay.ts`；`RouteME/frontend/src/types.ts`；`RouteME/openapi.yaml`

## Discovery Decision

**Go（light intake，2026-11-18）。** 能力可一句话表述为「后端返回路线完成度数值与信誉状态码，个人主页按后端结果展示」。与信用分（`user-credit`）、资料统计（`stats`）、成长等级（LV1–LV5，尚不存在）均不重叠；人工打卡与聚合算法明确排除（D1 / 排除项）。本需求以「字段预留 + 阈值派生 + 个人主页展示入口」为验收边界。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-030 |
| statement | 系统 SHALL 在 `GET /api/users/{userId}/profile` 响应中返回只读的「路线完成度」数值与信誉状态码；完成度数值 MUST 仅来源于用户已结束行程的有效完成数据（未来人工打卡聚合），当前版本无数据源时 MUST 返回空数值 + `insufficient` 状态，MUST NOT 返回伪造或临时计算的数值；信誉状态 MUST 由后端按「≥80 良好 / 70–79 中性 / <70 留意 / 无足够数据不足」派生；前端 MUST 只做状态码到文案的映射与展示，MUST NOT 自行按阈值计算标签；完成度 MUST 与信用分、资料统计、成长等级完全独立。 |
| actors | 浏览者（查看他人个人主页）；资料本人（查看自己个人主页，同口径）；系统（返回只读字段与派生状态，无数据时返回数据不足）；管理员不参与本切片。 |
| rationale | issue #45 要求为浏览者提供「过去行程实际完成情况 + 信誉提示」，以识别经常完成旅行计划的用户。但人工打卡与真实完成率尚未实现，因此本期先把字段、接口与展示入口落地，并把阈值与文案规则固化，避免未来接入时再改契约与界面；同时必须与信用分、成长等级、资料统计保持独立，防止混用。 |
| acceptance hints | 见 §4 场景 S31-1 ~ S31-19（字段预留与数据不足、阈值边界、后端派生、前端只映射、个人主页四态展示、独立性与兼容性）。 |
| links to evidence | 见 §6 Context 与 `intents/REQ-030-route-completion.md` 的证据锚点。 |

## 1. Intent

一句话：在任何人的公开资料页上，多出一行「路线完成度」——未来它来自这个人每次旅行结束后的打卡完成率；当前版本所有人都会看到「暂无足够完成记录」，但接口字段、四档状态与个人主页展示位已经就位，等打卡能力上线后直接填数。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 浏览者 | 已登录后查看任意用户个人主页；只能看到对方公开资料中的完成度状态，不得看到任何打卡明细或他人隐私数据。 |
| 资料本人 | 查看自己的个人主页；完成度与浏览者看到的同口径（D8），本切片不提供编辑入口。 |
| 系统 | 返回 `route_completion_rate`（0–100 整数或空）与 `route_completion_state`（`good` / `neutral` / `watch` / `insufficient`）；无数据源时统一返回空 + `insufficient`。 |
| 管理员 | 本切片无管理端页面、配置、人工修正或申诉入口。 |

## 3. In / Out scope

**In scope**

- 契约：`GET /api/users/{userId}/profile` 响应增加两个只读字段：`route_completion_rate`（integer 0–100，可空）与 `route_completion_state`（英文状态码）；`openapi.yaml` 更新 `UserProfile` schema 与示例。
- 后端：新增完成度状态派生逻辑（输入：完成度数值 + 已结束行程样本数；输出：状态码）；本期数据源为空，所有用户返回 `rate = null` + `state = insufficient`。
- 前端：`UserProfile` 类型增加两字段；个人主页 hero 在信用行下方新增完成度展示行；四态文案映射（信誉良好 / 中性不标签 / 请留意行程完成情况 / 暂无足够完成记录）；仅做字典映射，不做阈值判断。
- 独立性：完成度字段不读取、不写入信用分（`credit_score` / `credit_level` / `credit_ledger`）、资料统计（`stats`）、成长等级；信用行与统计展示保持原样。
- 测试：后端派生逻辑单测（四档 + 边界 + 数据不足 + 异常输入）；API 断言字段存在且类型正确；前端映射函数单测；个人主页 E2E（数据不足态 + 四态模拟）。
- 文档：OpenSpec Delta、`docs/sdd/add-route-completion/` 阶段记录、`registry` / `handoff` / `stories` 登记。

**Out of scope**

- 人工打卡、位置校验、有效打卡点定义、单行程完成度计算、用户级聚合算法（后续独立卡片）。
- 任何临时 / 占位 / 演示完成度数值（D1）。
- 推荐列表、行程详情页、资料弹窗、行程卡、申请列表等展示面（D3；未来可复用同一状态码）。
- 数据库表、迁移、写入端点、人工修正、申诉、管理端。
- 修改信用分、成长等级（LV1–LV5）、资料统计。
- 通知 / 推送 / 邮件 / 短信；举报或封禁联动。
- 重建已从 main 移除的同行者推荐引擎。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 接口字段与数据不足

1. **S31-1 接口预留字段** — Given 任意已存在用户，When 调用 `GET /api/users/{userId}/profile`，Then 响应 SHALL 同时包含 `route_completion_rate` 与 `route_completion_state` 两个只读字段；字段 MUST 同时出现在本人读取与他人读取的响应中。
2. **S31-2 本期恒为数据不足** — Given 当前版本没有任何人工打卡数据源（包括演示用户与存在已结束行程的用户），When 读取任意用户资料，Then `route_completion_rate` MUST 为 `null`，`route_completion_state` MUST 为 `insufficient`；系统 MUST NOT 用已结束行程数、资料统计或任何临时规则伪造百分比。
3. **S31-3 数据不足不显示百分比** — Given 用户状态为 `insufficient`，When 打开其个人主页，Then 完成度区域 MUST 只显示「暂无足够完成记录」，MUST NOT 显示任何百分比数字，MUST NOT 显示「信誉良好」或「请留意行程完成情况」。
4. **S31-4 足够数据门槛** — Given 未来聚合数据可用，When 用户已结束行程数量 ≥1 且存在有效完成度数值，Then 系统 SHALL 按数值派生状态；Given 已结束行程数量为 0，或数值为空，Then 状态 MUST 为 `insufficient`。
5. **S31-5 只统计已结束行程** — Given 用户只有进行中、尚未开始或已取消的行程，When 派生完成度，Then 这些行程 MUST NOT 计入样本；本期此类用户 MUST 返回 `insufficient`。

### B. 阈值派生（后端）

6. **S31-6 信誉良好边界** — Given 完成度数值为 80，Then 状态 SHALL 为 `good`；数值为 100 时 SHALL 同样为 `good`。
7. **S31-7 中性区间边界** — Given 完成度数值为 70 或 79，Then 状态 SHALL 为 `neutral`；中性状态 MUST NOT 展示「信誉良好」或「请留意行程完成情况」。
8. **S31-8 警惕边界** — Given 完成度数值为 69 或 0，Then 状态 SHALL 为 `watch`。
9. **S31-9 非法数值降级** — Given 上游给出非整数、负数或大于 100 的完成度数值，Then 系统 MUST NOT 展示该数值；状态 MUST 降级为 `insufficient`（或按 P3 定义的等价安全口径），MUST NOT 落入 `good`。
10. **S31-10 状态由后端派生** — Given 任意完成度数值，When 前端渲染，Then 前端 MUST 只根据后端返回的 `route_completion_state` 选择文案；前端代码 MUST NOT 存在 80 / 70 等阈值判断或根据页面数据二次计算状态。

### C. 个人主页展示

11. **S31-11 个人主页展示入口** — Given 用户打开任意用户（本人或他人）的个人主页，Then hero 区 SHALL 在信用行附近展示一行「路线完成度」；本切片 MUST NOT 在资料弹窗、行程卡、行程详情或列表页新增该展示。
12. **S31-12 信誉良好展示** — Given 后端返回 `state = good` 且 `rate = 85`，Then 页面 SHALL 显示「路线完成度 85% · 信誉良好」。
13. **S31-13 中性展示** — Given 后端返回 `state = neutral` 且 `rate = 75`，Then 页面 SHALL 显示「路线完成度 75%」，MUST NOT 附加任何信誉标签。
14. **S31-14 警惕展示与措辞边界** — Given 后端返回 `state = watch` 且 `rate = 55`，Then 页面 SHALL 显示「路线完成度 55% · 请留意行程完成情况」；页面 MUST NOT 出现「骗子」「危险用户」「不可信」等定性结论。
15. **S31-15 数据不足展示** — Given 后端返回 `state = insufficient`，Then 页面 SHALL 显示「暂无足够完成记录」；MUST NOT 显示 0% 或任何默认百分比。
16. **S31-16 本人 / 他人同口径** — Given 本人查看自己的个人主页，When 与浏览者查看同一资料对比，Then 两侧完成度字段与文案 SHALL 一致；本切片不提供编辑或隐藏开关。

### D. 独立性、兼容与边界

17. **S31-17 与信用分独立** — Given 任意用户的资料响应，Then `credit_score` / `credit_level` / `credit_restricted` 等既有字段 MUST 与变更前完全一致；完成度派生 MUST NOT 读取或写入 `user_credit_account` / `credit_ledger`；一次完成度读取 MUST NOT 产生任何信用账本记录。
18. **S31-18 与资料统计、成长等级独立** — Given 任意用户，Then `stats`（`published` / `completed` / `joined` / `shared`）MUST 保持不变且 MUST NOT 被用作完成度数值；本切片 MUST NOT 新增或读取 LV1–LV5 成长等级字段。
19. **S31-19 既有访问控制与兼容** — Given 未登录或未知用户，When 读取资料，Then 既有 401（`DEMO_USER_REQUIRED` / 会话无效）与 404（`USER_NOT_FOUND`）行为 MUST 保持不变；Given 既有前端消费者，Then 新增字段 MUST 为可空且不破坏既有解析；`openapi.yaml` MUST 同步更新并通过 `OpenApiTest` 与 Redocly 校验。

## 5. Constraints

- **数据口径（D1 / D2）：** 本期无人工打卡数据源；`route_completion_rate` 恒为 `null`、`route_completion_state` 恒为 `insufficient`；不得用 `stats.completed`、已结束行程数或任何临时规则替代。未来数据充足条件 = 已结束行程 ≥1 条且存在有效完成度数值。
- **阈值（issue / D5）：** `rate ≥ 80` → `good`；`70 ≤ rate < 80` → `neutral`；`0 ≤ rate < 70` → `watch`；`rate = null` 或样本不足 → `insufficient`。数值为 0–100 整数。
- **展示形态（D5）：** 标签 + 百分比；`insufficient` 只显示「暂无足够完成记录」；`neutral` 只显示百分比；文案固定为「信誉良好」「请留意行程完成情况」「暂无足够完成记录」。
- **统计范围（D6，未来）：** 仅用户作为发布者或 `ACCEPTED` 同行者参与的 `completed` 行程；进行中、未开始、已取消 MUST NOT 计入。
- **字段落点（D7）：** 仅 API 响应字段；不改表、不新增迁移、无写入端点；未来聚合上线后再评估存储。
- **独立性：** 不读写 `user-credit`、`stats`、成长等级；不得触发信用分、举报、封禁、通知。
- **契约与版本：** 当前 `openapi.yaml` `info.version: 0.25.0`；本 change 预计顺延为 **0.26.0**，P3 按合并顺序排他确认；`OpenApiTest` 版本断言同步。
- **展示面（D3）：** 仅个人主页 `ProfilePage` hero；本期不新增资料弹窗、详情页、列表入口。
- **原型：** v1 已归档（禁止结构性改动）、v2 为六屏设计板且无完成度元素；按 `docs/prototype/prototype.html` 的视觉语言与生产 UI 既有 `.profile-credit` 行模式扩展，P3 以 preview / E2E 截图作为界面证据。
- **测试边界：** 前端单测无 DOM（vitest node 环境）；状态映射与文案走纯函数单测，页面行为走 Playwright E2E；后端派生逻辑走 JUnit。
- **业务规则不可自行推断：** 未在本条目固化的口径只能按 §8 deferred 处理，不得在实现中临时决定。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 资料响应已含信用分、`joinedAt`、`stats` 与状态 | `backend/src/main/java/routeme/response/UserProfileResponse.java` |
| 资料端点 | `backend/src/main/java/routeme/controller/UserProfileController.java`（`GET /users/{userId}/profile`） |
| 个人主页 hero 与信用行 | `frontend/src/profile/ProfilePage.tsx`（`.profile-credit`） |
| 状态码 → 文案映射范式 | `frontend/src/profile/creditDisplay.ts`、`frontend/src/i18n/tripMessages.ts` |
| 前端类型与取数 | `frontend/src/types.ts`（`UserProfile`）、`frontend/src/api.ts`（`loadUserProfile`） |
| 契约与版本 | `RouteME/openapi.yaml`（`/users/{userId}/profile`、`UserProfile`、`info.version: 0.25.0`） |
| 已结束行程语义 | `openspec/changes/add-trip-completion/`（S15：`completed_at`、`completed` 状态） |
| 同行者语义 | Living Spec `openspec/specs/trip-companions/spec.md`（`ACCEPTED` 申请者） |
| 推荐引擎已移除 | `c516d76`（删除 `MatchController` / `RecommendationController` / `TravelMatch` 等） |
| 无既有完成度实现 | 全仓 grep `完成度 / completion_rate / route_completion` → 仅地图注释与历史文档无关命中 |
| 测试基线 | P0 记录：后端 / 前端全绿（见 `docs/sdd/add-route-completion/p0-baseline.md`，P4 前补齐） |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `route-completion` | **ADDED** | 完成度字段预留、数据充足门槛、阈值派生、个人主页展示口径、独立性约束 |
| `user-profile` / `user-profiles` | 只读依赖 / 集成点 | 复用其资料响应承载新增只读字段；不改其 Requirement 语义（两者均未归档） |
| `trip-plans` / `trip-companions` | 只读依赖（未来） | 未来聚合读取「已结束行程」与 `ACCEPTED` 同行关系；本期不计算 |
| `user-credit` | **独立** | 不读不写；仅在响应中与信用字段并列展示 |
| `design-system` | 复用 | 复用 `.profile-credit` 行、`badge`、色阶与间距令牌，不新增主题 |
| `admin` | **不在本需求** | 无管理端配置、修正或申诉 |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved | 本期完成度数值从哪里来？ | IO | D1：仅预留 + 数据不足，不造假数据 |
| blocking | resolved | 多少条已结束行程算足够？ | IO | D2：≥1 条且存在有效完成度数值 |
| blocking | resolved | 「推荐列表」落点？ | IO | D3：本期不做列表（推荐引擎已移除） |
| blocking | resolved | 展示形态？ | IO | D5：标签 + 百分比；数据不足只显示文案 |
| blocking | resolved | 展示面？ | IO | 仅个人主页（ProfilePage）；弹窗 / 详情 / 列表本期不做 |
| blocking | resolved | 未来统计范围？ | IO | D6：发布者 + `ACCEPTED` 同行者；仅已结束行程 |
| blocking | resolved | 预留字段落在哪一层？ | SA | D7：仅接口字段，不落库、无迁移 |
| blocking | resolved | 编号与命名？ | SA | D4：REQ-030 / S31 / `add-route-completion` / `route-completion` |
| non-blocking | resolved | 本人 / 他人是否同口径？状态码还是文案？ | SA | D8：同口径；后端返回英文状态码，前端 i18n 映射（沿用 `credit_level`） |
| non-blocking | deferred | 契约版本号（0.25.0 之后） | Dev | P3 按合并顺序排他确认（预计 0.26.0） |
| non-blocking | deferred | 字段命名、示例、错误码与序列化细节 | SA | P2 / P3 定稿；需求只固化可观察行为 |
| non-blocking | deferred | 未来聚合算法（单行程均值 vs 打卡点加权）与打卡采集 | IO | 后续独立卡片；本 change 不实现 |
| non-blocking | deferred | 原型 / P3 界面证据形式 | Dev | v1 已归档；按生产 UI 扩展，P3 用 preview + E2E 截图 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | §1 一句话可对外表述 |
| 2 Actors defined | Pass | §2 四个角色 + 权限边界 |
| 3 Scope bounded | Pass | §3 in / out 均非空；D1 / D3 明确排除 |
| 4 Scenarios concrete | Pass | §4 共 19 条，均含可观察结果 |
| 5 Exception / boundary | Pass | S31-2 / 3 / 4 / 5 / 9 / 15 / 19 |
| 6 Results verifiable | Pass | 字段存在性、状态码、文案、百分比、既有字段不变均可断言 |
| 7 Dependencies / app-arch touchpoints | Pass | §5 契约 / 版本排他；§7 能力表 |
| 8 Open-questions gate | Pass | blocking OQ 8 条全部 resolved；非阻塞 1 条已裁定 + 4 条 deferred 且有 owner |
| 9 Data contract decided | Pass | `deep-dive.md`「REQ-030 增补」① 给出派生字段、输入、状态与来源 |
| 10 Boundary enumerated | Pass | 同节 ② 覆盖无数据、样本不足、阈值边界、非法数值、展示面排除、独立性与兼容 |
| 11 Cross-REQ aligned | Pass | 同节 ③ 与 `user-profile` / `user-profiles` / `user-credit` / `trip-plans` / `trip-companions` / `design-system` 全部 aligned |
| 12 Notification / display contract decided | Pass | 同节 ④ 个人主页四态展示字段齐全；无通知 |

**DoR 结论：** BLOCKER 0 / WARNING 0 / SUGGESTION 0（自检通过，可进入 impact / split）。
