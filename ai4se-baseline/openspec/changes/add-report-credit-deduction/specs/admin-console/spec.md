# admin-console 增量规格（add-report-credit-deduction）

## MODIFIED Requirements

### Requirement: 举报详情与处理

系统 SHALL 提供举报详情页（`#/admin/reports/{reportId}`），展示举报原因、举报人、被举报用户、被举报用户当前信用分数与等级、被举报内容，并 MUST 允许跳转到对应用户、行程或体验详情。当举报来自行程聊天时，详情 MUST 标注来源为聊天举报，展示该会话所属行程的概要与举报人、被举报人在该行程下的完整聊天记录；当举报对象为旅行计划时，详情 MUST 标注来源为行程举报，展示该行程的标题、目的地、起止日期、状态与发布者。聊天记录 MUST 按发送时间升序展示，且 MUST 只包含该举报人与被举报人的消息，MUST NOT 暴露同一行程下其他用户的会话。管理员点击「开始处理」后状态 MUST 由 `PENDING` 迁移到 `PROCESSING`；打开详情 MUST NOT 改变状态；对非 `PENDING` 举报执行开始处理 MUST 返回 409 `REPORT_NOT_PENDING`。

处理 MUST 填写处理说明（成立时为违规原因，不成立时为驳回说明；必填，≤500 字）。成立时 MUST 选择 8 类违规类型之一（`HARASSMENT` / `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` / `OTHER`），`OTHER` MUST 再选择 -5 / -10 / -20 / -30 之一；系统 MUST 按 `user-credit` 的举报违规扣分规则计算扣分，并在同一事务内把举报置为 `RESOLVED` 并写入信用记录；处理前详情 MUST 展示被举报用户「当前分数 → 本次扣分 → 处理后分数」，处理后分数 MUST 按 0 截断。举报处置 MUST NOT 改变被举报用户的账号状态，MUST NOT 在举报页提供暂停 / 封禁 / 更新封禁 / 恢复入口（这些能力保留在用户管理页）。不成立时置 `REJECTED`，MUST NOT 扣分或写入信用记录。对非 `PROCESSING` 举报执行处理 MUST 返回 409 `REPORT_NOT_PROCESSING`；被举报用户不可推导时 MUST 返回 400 `INVALID_INPUT` 且举报保持 `PROCESSING`。

处理记录 MUST 保留；已处理详情 MUST 展示所选违规类型、本次实际扣分、处理人、处理时间与违规原因；历史已处理举报的处罚动作字段 MUST 只作为历史值只读展示，MUST NOT 作为新数据处理。举报人 MUST 能看到受理与最终状态。

#### Scenario: 开始处理

- **Given** 举报状态为 `PENDING`
- **When** 管理员打开举报详情并点击「开始处理」
- **Then** 举报状态 MUST 变为 `PROCESSING`
- **And** 记录处理管理员与开始处理时间
- **And** `PROCESSING` 举报可由任一管理员继续处理

#### Scenario: 重复开始处理被拒绝

- **Given** 举报状态不是 `PENDING`
- **When** 管理员再次点击「开始处理」
- **Then** 系统 MUST 返回 409 `REPORT_NOT_PENDING`
- **And** 举报状态保持不变

#### Scenario: 查看举报上下文与当前信用

- **Given** 一条举报指向某用户、行程或体验，被举报用户信用分为 80
- **When** 管理员打开举报详情
- **Then** 展示举报原因、举报人、被举报用户、被举报用户当前信用分数与等级、被举报内容
- **And** 可跳转到被举报用户或相关内容详情

#### Scenario: 聊天举报展示会话记录

- **Given** 用户 A 在行程 T 的聊天页以用户 B 为对象提交举报
- **When** 管理员打开该举报详情
- **Then** 详情标注来源为聊天举报
- **And** 展示行程 T 的标题、目的地、起止日期、状态与发布者
- **And** 按发送时间升序展示 A 与 B 在行程 T 下的完整聊天记录
- **And** 不展示同一行程下 A 或 B 与其他用户的会话

#### Scenario: 行程举报展示行程概要

- **Given** 用户在行程详情页以行程 T 为对象提交举报
- **When** 管理员打开该举报详情
- **Then** 详情标注来源为行程举报
- **And** 展示行程 T 的标题、目的地、起止日期、状态与发布者
- **And** 不展示聊天记录

#### Scenario: 成立表单只保留违规类型与违规原因

- **Given** 举报状态为 `PROCESSING`
- **When** 管理员选择「成立」
- **Then** 表单 MUST 只展示违规类型选择（含 `OTHER` 档位）与违规原因输入
- **And** MUST NOT 展示处罚动作（`KEEP` / `SUSPEND` / `BAN` / `UPDATE_BAN`）与封禁理由 / 解封时间

#### Scenario: 违规类型必选

- **Given** 管理员准备提交成立处理
- **When** 未选择违规类型即提交
- **Then** 前端 MUST NOT 提交
- **And** 服务端 MUST 返回 400 `INVALID_INPUT`，举报状态与分数不变

#### Scenario: 其他原因档位必选

- **Given** 管理员选择了 `OTHER`
- **When** 未选择 -5 / -10 / -20 / -30 档位即提交
- **Then** 前端 MUST NOT 提交
- **And** 服务端 MUST 返回 400 `INVALID_INPUT`

#### Scenario: 成立预览三段

- **Given** 被举报用户当前 80 分、管理员选择扣 15 分的违规类型
- **When** 打开成立处理表单
- **Then** MUST 展示「当前分数 80 → 本次扣分 15 → 处理后分数 65」

#### Scenario: 预览按 0 截断

- **Given** 被举报用户当前 5 分、管理员选择扣 10 分的违规类型
- **When** 查看预览
- **Then** 处理后分数 MUST 展示 0
- **And** MUST 说明按 0 截断

#### Scenario: 不成立无扣分预览

- **Given** 管理员选择「不成立」
- **When** 表单切换为驳回
- **Then** MUST NOT 展示扣分预览与违规类型选择

#### Scenario: 举报成立并扣分

- **Given** 举报状态为 `PROCESSING`、被举报用户信用分 80
- **When** 管理员选择「发布虚假行程信息」、填写违规原因并确认成立
- **Then** 举报状态 MUST 变为 `RESOLVED`
- **And** 被举报用户信用分 MUST 变为 65
- **And** MUST 生成一条关联该举报的 `REPORT_VIOLATION` 信用记录
- **And** 扣分与举报处理 MUST 在同一事务内完成，任一失败则整体回滚

#### Scenario: 被举报用户已受限时仍只扣分

- **Given** 举报状态为 `PROCESSING`，被举报用户已处于 `SUSPENDED` / `BANNED` 或信用自动限制中
- **When** 管理员确认举报成立
- **Then** 举报状态 MUST 变为 `RESOLVED`
- **And** 按违规类型扣分并写入信用记录
- **And** 账号状态 MUST 保持原状，MUST NOT 执行暂停 / 封禁 / 更新封禁 / 恢复

#### Scenario: 成立后账号状态不变

- **Given** 被举报用户为 `ACTIVE`
- **When** 举报成立并完成扣分
- **Then** 账号状态 MUST 保持 `ACTIVE`
- **And** 即使请求携带历史处罚字段，MUST NOT 执行任何账号状态迁移

#### Scenario: 已处理详情展示违规类型与扣分

- **Given** 举报已被处理为 `RESOLVED` 并完成扣分
- **When** 管理员重新打开举报详情
- **Then** MUST 展示所选违规类型、本次实际扣分、处理人、处理时间与违规原因
- **And** 历史处罚动作字段只能作为历史值只读展示

#### Scenario: 举报不成立

- **Given** 举报状态为 `PROCESSING` 且管理员判定举报不成立
- **When** 管理员填写违规原因并选择驳回
- **Then** 举报状态 MUST 变为 `REJECTED`，被举报用户状态与分数不变
- **And** MUST NOT 生成信用记录
- **And** 处理记录保留

#### Scenario: 处理说明必填

- **Given** 管理员准备处理一条举报
- **When** 处理说明（成立时为违规原因，不成立时为驳回说明）为空
- **Then** 系统 MUST NOT 提交处理
- **And** 举报状态保持不变

#### Scenario: 处理记录保留且举报人可见

- **Given** 举报已被处理为 `RESOLVED` 或 `REJECTED`
- **When** 管理员再次查看列表，或举报人打开「我的举报」
- **Then** 举报仍存在且保留处理结果
- **And** 举报人看到「已受理」与最终状态
- **And** 举报人看不到管理员处理备注与被举报人的处罚 / 扣分细节

#### Scenario: 被举报用户不可推导

- **Given** 举报对象无法推导出被举报用户
- **When** 管理员确认成立
- **Then** 系统 MUST 返回 400 `INVALID_INPUT`
- **And** 举报 MUST 保持 `PROCESSING`，MUST NOT 扣分或写入信用记录
