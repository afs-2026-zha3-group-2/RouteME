# 变更提案：add-route-completion

- **需求来源：** GitHub issue #45「路线完成度」（作者 Jaha0711，指派 Neal802；P1 / 迭代 3 / 3 点）｜ **需求条目：** `requirement-workspace/requirements/REQ-030-route-completion.md`｜ **意图：** `requirement-workspace/intents/REQ-030-route-completion.md`
- **能力：** `route-completion`（ADDED）；只读依赖 `user-profile` / `user-profiles`（资料响应承载）；未来只读 `trip-plans` / `trip-companions`
- **规模：** S（0 张表 + 0 次迁移；契约 `UserProfile` 追加 2 个只读字段 + 1 个后端派生单点 + 个人主页 hero 1 行 + 文案 / 类型 / 测试；无管理端、无新路由）
- **规则：** `@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:sdd-artifacts`；原型对齐见 `docs/prototype/README.md`（v1 已归档、v2 为设计板，本元素按生产 UI 既有模式扩展）

## Why

issue #45 要求让正在找旅行搭子的人看到「其他用户过去行程的实际完成情况 + 信誉提示」，以识别经常完成旅行计划的人、并对长期发布但完成度较低的人保持警惕。当前仓库没有任何路线完成度实现（全仓 grep `完成度 / completion_rate / route_completion` 仅命中地图注释与历史文档），个人资料响应只有信用分、`joinedAt` 与资料统计。

但真实完成度依赖行程途经点的人工打卡（例如计划 10 个有效打卡点、完成 8 个 → 该行程 80%），人工打卡、位置校验与聚合算法在 issue 中明确「后续单独开卡，本故事暂不实现」。因此本变更只做第一段垂直切片：把字段、状态派生与展示入口先落地，当前版本统一返回「数据不足」，未来打卡上线后直接接线，不改契约与界面。

同时必须守住三条独立性：路线完成度与信用分（`user-credit`）完全独立、与资料统计（`stats`）独立、与 LV1–LV5 成长等级（issue #44，尚未实现）完全独立；标签由后端返回，前端不得自行按阈值计算。

## What Changes

- **接口字段预留：** `GET /api/users/{userId}/profile` 响应追加两个只读字段：`route_completion_rate`（0–100 整数或 `null`）与 `route_completion_state`（`good` / `neutral` / `watch` / `insufficient`）；本人读取与他人读取同口径。当前版本无数据源，所有用户返回 `null` + `insufficient`，不得用已结束行程数或 `stats` 伪造数值。
- **数据充足判定：** 仅当用户已结束行程 ≥1 条且存在有效完成度数值时视为数据足够；仅统计 `completed` 行程，进行中 / 尚未开始 / 已取消不计入；未来聚合覆盖用户作为发布者或 `ACCEPTED` 同行者参与的已结束行程。
- **阈值派生（后端单点）：** `rate ≥ 80` → `good`；`70 ≤ rate < 80` → `neutral`；`0 ≤ rate < 70` → `watch`；`rate = null` 或样本不足 → `insufficient`；非法数值（非整数 / <0 / >100）降级为 `insufficient`。前端只做状态码 → 文案字典映射，不得复制 80 / 70 阈值。
- **个人主页展示：** `ProfilePage` hero 信用行附近新增一行「路线完成度」：`good` 显示「路线完成度 NN% · 信誉良好」；`watch` 显示「路线完成度 NN% · 请留意行程完成情况」；`neutral` 只显示「路线完成度 NN%」；`insufficient` 只显示「暂无足够完成记录」。不得出现「骗子」「危险用户」「不可信」等定性结论。
- **独立性与兼容：** 不读写信用账户 / 账本、不改 `stats`、不新增或读取成长等级字段；新增字段可空，既有 401 / 404 行为不变；`openapi.yaml` 同步 `UserProfile` schema 与示例（契约版本 P3 排他确认，预计 0.26.0）。
- **登记：** `registry.md` / `handoff.md` / `stories.md`（S31）登记 REQ-030 → `add-route-completion`；`docs/sdd/add-route-completion/` 阶段记录。

## Out of Scope

- 人工打卡、位置校验、有效打卡点定义、单行程完成度计算与用户级聚合算法（后续独立卡片）。
- 任何临时 / 占位 / 演示完成度数值（D1：本期只返回数据不足）。
- 推荐列表、行程详情页、资料弹窗、行程卡、申请列表等展示面（D3：同行者推荐引擎已于 `c516d76` 移除，本期不做列表；未来可复用同一状态码）。
- 数据库表、迁移、写入端点、人工修正、申诉、管理端配置。
- 修改信用分（`user-credit`）、资料统计（`stats`）、成长等级（LV1–LV5）。
- 通知 / 推送 / 邮件 / 短信；举报或封禁联动。
- 重建已从 main 移除的同行者推荐 / 匹配引擎。

## Impact

| 位置 | 改动 |
|---|---|
| `backend/src/main/java/routeme/response/UserProfileResponse.java` | 追加 `routeCompletionRate`、`routeCompletionState` 两个只读字段（序列化名 `route_completion_rate` / `route_completion_state`） |
| 后端派生（新增小类 / 常量，名称 P3 定） | 单点实现「数据充足判定 + 阈值派生」；本期资料装配时返回 `null` + `insufficient` |
| 后端资料读取路径 | `UserProfileController` / `UserProfileService` 装配响应时补两字段；不新增端点 |
| `RouteME/openapi.yaml` | `UserProfile` schema 追加两字段与示例；版本 P3 排他确认（预计 `0.26.0`） |
| `frontend/src/types.ts` | `UserProfile` 增加两字段（可选 / 可空） |
| `frontend/src/profile/ProfilePage.tsx` | hero 信用行附近新增「路线完成度」行；四态文案与百分比展示 |
| `frontend/src/i18n/tripMessages.ts` | 新增「路线完成度」「信誉良好」「请留意行程完成情况」「暂无足够完成记录」 |
| `frontend/src/styles.css` | 复用 `.profile-credit` 行高 / 色阶令牌；补完成度行的正 / 中 / 警示三档低饱和色 |
| 后端测试 | 派生单测（80 / 79 / 70 / 69 / 0 / null / 非法）；资料 API 字段断言；信用字段与 `stats` 不变回归 |
| 前端测试 | 状态 → 文案纯函数单测；个人主页四态渲染（无 DOM 渲染层走纯函数） |
| E2E | `route-completion.spec.ts`：数据不足态、四态模拟（接口拦截或夹具）、本人 / 他人同口径、信用行与弹窗不变 |
| `openspec/changes/add-route-completion/specs/route-completion/spec.md` | ADDED（6 Requirement / 19 Scenario） |
| Living Spec | 归档时新增 `openspec/specs/route-completion/spec.md` |
| 数据 / 迁移 / 管理端 / 路由 | **无改动**（D7 无表无迁移；D3 无列表入口；无新路由） |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 数据口径（D1） | 仅预留 + 数据不足：所有用户 `null` + `insufficient`，不造假数据；后端仍实现阈值派生 | 最贴合 issue「先完成字段、接口和 UI 展示入口，打卡后续独立实现」；避免用已结束行程冒充有效完成 |
| 数据阈值（D2） | ≥1 条已结束行程且存在有效完成度数值 | 未来数据足够的可判定门槛；少于 1 条直接数据不足 |
| 展示面（D3） | 仅个人主页 `ProfilePage`；推荐列表 / 弹窗 / 详情 / 列表本期不做 | 推荐引擎已在 `c516d76` 移除；issue 的「用户主页或详情页」由个人主页满足；不重建推荐引擎 |
| 编号 / 命名（D4） | REQ-030 / S31 / `add-route-completion` / `route-completion` | `origin/main@aa320dc` 已用至 REQ-028 / S29；REQ-029 / S30 由并行 `add-growth-level`（issue #44）登记，按用户裁决顺延为 REQ-030 / S31 |
| 展示形态（D5） | 标签 + 百分比；数据不足只显示「暂无足够完成记录」；中性档只显示百分比 | 让浏览者既看到数值又看到信誉结论；中性不贴标签符合 issue AC 6 |
| 统计范围（D6） | 发布者 + `ACCEPTED` 同行者参与的已结束行程 | 作为同行者履约同样代表「经常完成旅行计划」 |
| 字段落点（D7） | 仅接口字段，不落库、不新增迁移、无写入端点 | 本期无写入方；先建表属于死重，未来聚合上线后再评估存储 |
| 本人 / 他人口径（D8） | 同口径返回与展示；状态码英文 + 前端 i18n 字典映射 | 沿用 `credit_level` 既有实践；后端是标签唯一权威，前端不做阈值判断 |
| 数值安全 | 非法数值（非整数 / <0 / >100）降级 `insufficient`，不得落入 `good` | 失败安全：宁可显示数据不足，不误标信誉良好 |

## 验收信号

1. 任意用户（本人 / 他人）调用 `GET /api/users/{userId}/profile`，响应同时包含 `route_completion_rate` 与 `route_completion_state` 两个只读字段。
2. 当前版本读取任意用户（含演示用户与有已结束行程的用户），`route_completion_rate` 恒为 `null`、`route_completion_state` 恒为 `insufficient`；不出现任何伪造百分比。
3. 派生单测覆盖 `rate = 80 / 79 / 70 / 69 / 0 / null / 非法值`：80→`good`、79→`neutral`、70→`neutral`、69→`watch`、0→`watch`、null→`insufficient`、非法→`insufficient`。
4. 打开任意用户个人主页，hero 信用行附近展示一行「暂无足够完成记录」，不显示 0% 或任何默认百分比；不出现「信誉良好」或「请留意行程完成情况」。
5. 通过夹具 / 接口拦截模拟 `good` / `neutral` / `watch` 时，页面分别显示「路线完成度 85% · 信誉良好」「路线完成度 75%」「路线完成度 55% · 请留意行程完成情况」；无「骗子」「危险用户」「不可信」等措辞。
6. 前端代码不存在 80 / 70 阈值常量或根据页面数据计算状态的逻辑；状态到文案只有字典映射。
7. 任意用户资料响应中的 `credit_score`、`credit_level`、`credit_restricted` 与 `stats` 与变更前一致；读取资料不产生任何信用账本记录。
8. 资料弹窗、行程卡、行程详情页与列表页不出现路线完成度展示；既有 401 / 404 行为不变。
9. `openspec validate add-route-completion --strict` 通过；`OpenApiTest` 与 Redocly 校验通过（契约版本 P3 确认）。
10. 个人主页在 1440 / 1024 / 768 / 390 宽度与浅 / 深色主题下无横向溢出，信用行版式不变。

## 残余风险

| 风险 | 处理 |
|---|---|
| 「预留」被实现成假数据或临时计算 | D1 写死；Delta 明确禁止；验收信号 2 覆盖 |
| 前端自行算标签（违反 issue AC 12） | Delta 规定只做字典映射；验收信号 6 检查无阈值常量 |
| 与信用分 / 统计 / 成长等级误接 | Delta 独立性 Requirement + 验收信号 7；回归断言 |
| 契约版本与在途 change 撞号 | 基线 0.25.0；P3 按合并顺序排他确认（预计 0.26.0） |
| 展示行与 hero 版式冲突 | 复用 `.profile-credit` 行模式；验收信号 10 四宽度 × 深浅色 |
| 「推荐列表」被误解为本期范围 | D3 写死；proposal / Delta / 故事三处一致 |
| 未来聚合口径漂移 | D2 / D6 固化；聚合算法仍属后续卡片，本 change 不预留表或端点 |
| 资料弹窗等既有面被误改 | Delta 明确 out of scope；E2E 断言弹窗与统计不变 |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。Delta Spec、`design.md`、`atdd-design.md`、`tasks.md`、代码、契约与验证属 P2 / P3 / P4 起的阶段；Living Spec 合并在归档阶段完成。
