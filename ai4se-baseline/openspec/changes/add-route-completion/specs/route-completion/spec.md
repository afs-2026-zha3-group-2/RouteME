# route-completion 增量规格（add-route-completion）

## ADDED Requirements

### Requirement: 预留路线完成度字段与数据不足口径

系统 SHALL 在 `GET /api/users/{userId}/profile` 响应中为本人读取与他人读取同时返回两个只读字段：`route_completion_rate`（0–100 的整数，或空值）与 `route_completion_state`（`good` / `neutral` / `watch` / `insufficient`）。当前版本没有任何人工打卡数据源，系统 MUST 对所有用户返回 `route_completion_rate = null` 与 `route_completion_state = insufficient`；系统 MUST NOT 使用已结束行程数量、资料统计（`stats`）或任何临时规则伪造完成度数值。两个新增字段 MUST 为可空，且 MUST NOT 改变既有字段的值与含义。

#### Scenario: 接口返回预留字段

- **Given** 任意已存在的用户（本人或他人）
- **When** 调用 `GET /api/users/{userId}/profile`
- **Then** 响应同时包含 `route_completion_rate` 与 `route_completion_state`
- **And** 两个字段均为只读，客户端无法通过任何请求体改写

#### Scenario: 本期恒为数据不足

- **Given** 当前版本没有人工打卡与完成度聚合数据源（包括演示用户与存在已结束行程的用户）
- **When** 读取任意用户资料
- **Then** `route_completion_rate` 为 `null`
- **And** `route_completion_state` 为 `insufficient`
- **And** 不出现任何由已结束行程数、`stats` 或演示数据推算出的百分比

### Requirement: 数据充足判定与统计范围

系统 SHALL 仅在用户已结束行程数量 ≥1 且存在有效完成度数值时，视为「数据足够」并按数值派生状态；否则状态 MUST 为 `insufficient`。「已结束行程」MUST 指状态为 `completed` 的行程；进行中、尚未开始与已取消的行程 MUST NOT 计入样本。未来的完成度聚合口径 MUST 覆盖用户作为发布者或 `ACCEPTED` 同行者参与的已结束行程；本版本不实现该聚合。

#### Scenario: 足够数据门槛

- **Given** 未来的完成度聚合数据可用
- **When** 用户已结束行程数量 ≥1 且存在有效完成度数值
- **Then** 系统按阈值派生信誉状态
- **And** 已结束行程数量为 0 或数值为空时，状态为 `insufficient`

#### Scenario: 只统计已结束行程

- **Given** 用户只有进行中、尚未开始或已取消的行程
- **When** 判定完成度数据是否足够
- **Then** 这些行程不计入样本
- **And** 状态为 `insufficient`

### Requirement: 阈值派生与后端权威

系统 SHALL 按以下规则派生 `route_completion_state`：`route_completion_rate ≥ 80` → `good`；`70 ≤ route_completion_rate < 80` → `neutral`；`0 ≤ route_completion_rate < 70` → `watch`；数值为空或数据不足 → `insufficient`。完成度数值 MUST 为 0–100 的整数；非法数值（非整数、负数或大于 100）MUST 降级为 `insufficient`，MUST NOT 落入 `good`。状态派生 MUST 只由后端完成；前端 MUST NOT 复制阈值、MUST NOT 根据页面数据计算状态。

#### Scenario: 信誉良好边界

- **Given** 完成度数值为 80
- **Then** 状态为 `good`
- **And** 数值为 100 时同样为 `good`

#### Scenario: 中性区间边界

- **Given** 完成度数值为 70 或 79
- **Then** 状态为 `neutral`
- **And** 不展示「信誉良好」或「请留意行程完成情况」

#### Scenario: 警惕边界

- **Given** 完成度数值为 69 或 0
- **Then** 状态为 `watch`

#### Scenario: 非法数值降级

- **Given** 上游给出非整数、负数或大于 100 的完成度数值
- **Then** 系统不展示该数值
- **And** 状态降级为 `insufficient`
- **And** 不会落入 `good`

#### Scenario: 状态由后端派生

- **Given** 任意完成度数值
- **When** 前端渲染个人主页
- **Then** 前端只根据后端返回的 `route_completion_state` 选择文案
- **And** 前端代码不存在 80 / 70 等阈值判断或二次计算状态的逻辑

### Requirement: 个人主页展示路线完成度

系统 SHALL 在用户个人主页 hero 区（信用行附近）展示一行「路线完成度」。当状态为 `good` 时 MUST 显示「路线完成度 NN% · 信誉良好」；状态为 `watch` 时 MUST 显示「路线完成度 NN% · 请留意行程完成情况」；状态为 `neutral` 时 MUST 只显示「路线完成度 NN%」且不附加信誉标签；状态为 `insufficient` 时 MUST 只显示「暂无足够完成记录」且不显示任何百分比。文案 MUST NOT 出现「骗子」「危险用户」「不可信」等定性结论。本版本 MUST NOT 在资料弹窗、行程卡、行程详情页或任何列表页新增该展示。

#### Scenario: 个人主页展示入口

- **Given** 用户打开任意用户（本人或他人）的个人主页
- **Then** hero 信用行附近展示一行「路线完成度」
- **And** 资料弹窗、行程卡、行程详情页与列表页不出现该展示

#### Scenario: 信誉良好展示

- **Given** 后端返回 `route_completion_state = good` 且 `route_completion_rate = 85`
- **Then** 页面显示「路线完成度 85% · 信誉良好」

#### Scenario: 中性展示

- **Given** 后端返回 `route_completion_state = neutral` 且 `route_completion_rate = 75`
- **Then** 页面显示「路线完成度 75%」
- **And** 不附加任何信誉标签

#### Scenario: 警惕展示与措辞边界

- **Given** 后端返回 `route_completion_state = watch` 且 `route_completion_rate = 55`
- **Then** 页面显示「路线完成度 55% · 请留意行程完成情况」
- **And** 页面不出现「骗子」「危险用户」「不可信」等定性结论

#### Scenario: 数据不足展示

- **Given** 后端返回 `route_completion_state = insufficient`
- **Then** 页面只显示「暂无足够完成记录」
- **And** 不显示 0% 或任何默认百分比
- **And** 不显示「信誉良好」或「请留意行程完成情况」

#### Scenario: 本人 / 他人同口径

- **Given** 本人查看自己的个人主页，且浏览者查看同一资料
- **Then** 两侧完成度字段与文案一致
- **And** 本版本不提供编辑或隐藏开关

### Requirement: 与信用分、资料统计及成长等级相互独立

路线完成度 MUST NOT 读取或写入信用分账户与信用账本，MUST NOT 改写资料统计（`stats`），MUST NOT 新增或读取 LV1–LV5 成长等级字段。读取资料时，完成度 MUST NOT 改变 `credit_score`、`credit_level`、`credit_restricted` 等信用字段的值，MUST NOT 修改 `stats`，MUST NOT 产生任何信用账本记录。

#### Scenario: 与信用分独立

- **Given** 任意用户的资料响应
- **Then** `credit_score` / `credit_level` / `credit_restricted` 等既有字段与变更前完全一致
- **And** 完成度派生不读取、不写入 `user_credit_account` 与 `credit_ledger`
- **And** 一次完成度读取不产生任何信用账本记录

#### Scenario: 与资料统计、成长等级独立

- **Given** 任意用户
- **Then** `stats` 中的 `published` / `completed` / `joined` / `shared` 保持不变，且不被用作完成度数值
- **And** 本版本不新增、不读取 LV1–LV5 成长等级字段

### Requirement: 资料响应兼容与访问控制

两个新增字段 MUST 为可空，且 MUST NOT 破坏既有前端消费者对 `UserProfile` 的解析。未登录或未知用户的既有 401 与 404 行为 MUST 保持不变。`openapi.yaml` MUST 同步更新 `UserProfile` schema 与示例，并通过契约测试与规格校验。

#### Scenario: 既有访问控制与兼容

- **Given** 未登录用户或未知用户
- **When** 读取资料
- **Then** 既有 401（如 `DEMO_USER_REQUIRED` 或会话无效）与 404（`USER_NOT_FOUND`）行为保持不变
- **And** 既有前端消费者在新增字段可空的情况下仍能正常解析
- **And** `openapi.yaml` 已同步更新并通过契约测试与 Redocly 校验
