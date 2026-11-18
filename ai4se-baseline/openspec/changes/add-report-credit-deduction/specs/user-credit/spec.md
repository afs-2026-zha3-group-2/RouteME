# user-credit 增量规格（add-report-credit-deduction）

## ADDED Requirements

### Requirement: 举报违规类型与扣分规则

系统 SHALL 在管理员确认举报成立时，按所选违规类型自动派生信用扣分：`HARASSMENT`（骚扰或不当言论）-10、`FAKE_TRIP`（发布虚假行程信息）-15、`FRAUD_RISK`（存在诈骗或金钱风险）-30、`ILLEGAL_CONTENT`（发布色情、暴力或其他违规内容）-20、`IMPERSONATION`（冒充他人或身份信息可疑）-20、`NO_SHOW_DISRUPTION`（恶意放鸽子 / 扰乱同行活动）-10、`PRIVACY_LEAK`（泄露他人隐私信息）-30；`OTHER`（其他原因）MUST 由管理员在 -5 / -10 / -20 / -30 中选择一个档位。扣分值 MUST 由服务端按类型派生，客户端 MUST NOT 通过请求字段指定任意扣分值；违规类型缺失、未知或 `OTHER` 未选合法档位时 MUST 返回 400 `INVALID_INPUT`，且 MUST NOT 改变举报状态或分数。

#### Scenario: 七类固定扣分

- **Given** 举报处于 `PROCESSING`，被举报用户信用分 80
- **When** 管理员选择 `HARASSMENT` 并确认成立
- **Then** 系统 SHALL 扣减 10 分，分数变为 70
- **And** 选择 `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` 时 SHALL 分别扣减 15 / 30 / 20 / 20 / 10 / 30 分

#### Scenario: 其他原因四档

- **Given** 管理员选择 `OTHER`
- **When** 选择 -5 / -10 / -20 / -30 之一并确认成立
- **Then** 系统 SHALL 按所选档位扣分
- **And** 未选档位或选择其他数值时 MUST 返回 400 `INVALID_INPUT`，举报保持 `PROCESSING`、分数不变

#### Scenario: 违规类型缺失

- **Given** 成立处理请求未携带违规类型
- **When** 管理员提交处理
- **Then** 系统 MUST 返回 400 `INVALID_INPUT`
- **And** 举报状态与信用分 MUST 保持不变，MUST NOT 生成信用记录

#### Scenario: 非法违规类型或档位

- **Given** 请求携带未知违规类型，或 `OTHER` 之外的档位值
- **When** 提交处理
- **Then** 系统 MUST 返回 400 `INVALID_INPUT`
- **And** MUST NOT 扣分、MUST NOT 改变举报状态

#### Scenario: 扣分值由服务端派生

- **Given** 请求携带自定义扣分值字段
- **When** 管理员确认成立
- **Then** 服务端 MUST 忽略该字段，并按违规类型派生扣分
- **And** 账本 `applied_delta` MUST 等于派生值（或 0 分截断后的实际值）

### Requirement: 举报违规扣分记账、截断与幂等

系统 SHALL 在举报成立（`RESOLVED`）时，经统一记账服务写入一条信用记录并扣减被举报用户信用分：`reason_code` MUST 为 `REPORT_VIOLATION`，`related_type` MUST 为 `REPORT`，`related_id` MUST 为举报编号，幂等键 MUST 为 `REPORT_VIOLATION:<reportId>`。同一举报 MUST 最多产生一次扣分；`REJECTED` MUST NOT 扣分；分数 MUST 保持在 0–100，最低截断为 0，截断后实际变化量为 0 时 MUST 仍保留一条零值记录；被举报用户没有信用账户时 MUST 先按初始 80 分建立账户再扣分；扣分 MUST NOT 受体验获赞月度 +20 加分上限约束。

#### Scenario: 成立扣分并生成记录

- **Given** 被举报用户信用分 80，举报处于 `PROCESSING`
- **When** 管理员选择「发布虚假行程信息」并确认成立
- **Then** 举报 SHALL 变为 `RESOLVED`
- **And** 分数 SHALL 变为 65
- **And** SHALL 生成一条 `REPORT_VIOLATION` 信用记录，`related_id` 为举报编号，变更前 80 / 实际 -15 / 变更后 65

#### Scenario: 不成立不扣分

- **Given** 举报处于 `PROCESSING`
- **When** 管理员判定不成立（`REJECTED`）
- **Then** 举报 SHALL 变为 `REJECTED`
- **And** 分数 MUST 不变，MUST NOT 生成信用记录

#### Scenario: 同一举报只扣一次

- **Given** 举报已 `RESOLVED`
- **When** 再次提交处理
- **Then** 系统 MUST 返回 409 `REPORT_NOT_PROCESSING`
- **And** MUST NOT 产生第二次扣分或第二条记录

#### Scenario: 并发处理只生效一次

- **Given** 两个请求并发处理同一举报且均通过状态前置校验
- **When** 记账执行
- **Then** 只 SHALL 有一个请求成功
- **And** 账本 MUST 只有一条该举报记录，分数 MUST 只变化一次

#### Scenario: 0 分截断仍留记录

- **Given** 被举报用户信用分 0，管理员选择 -10 的违规类型
- **When** 确认成立
- **Then** 分数 SHALL 保持 0
- **And** 账本 `applied_delta` SHALL 为 0
- **And** MUST 仍生成一条信用记录并关联举报编号

#### Scenario: 记录字段完整

- **Given** 一次成立扣分
- **When** 读取信用记录
- **Then** `reason_code` SHALL 为 `REPORT_VIOLATION`
- **And** `related_type` SHALL 为 `REPORT`，`related_id` SHALL 为举报编号
- **And** 记录 SHALL 包含变更前分数、实际变更量、变更后分数与发生时间

#### Scenario: 不受月度加分上限影响

- **Given** 同一被举报用户在同一自然月已有多条扣分
- **When** 再次成立扣分
- **Then** 扣分 MUST 全额生效
- **And** MUST NOT 受体验获赞月度 +20 上限约束

#### Scenario: 账户缺失按初始分建立

- **Given** 被举报用户没有信用账户
- **When** 管理员确认成立
- **Then** 系统 SHALL 先按初始 80 分建立账户，再执行扣分
- **And** MUST NOT 报错或跳过扣分

### Requirement: 举报违规扣分的低分联动

举报扣分 MUST 经统一记账服务发布信用变化事件，由既有低分限制链路消费：分数从 60 及以上跌破 60 时 MUST 自动建立信用限制并按既有规则清退未结束行程与待处理申请；分数恰好为 60 时 MUST NOT 触发限制；用户已处于限制中时再次扣分 MUST 只扣分，MUST NOT 重复建立限制或重复清退。本能力 MUST NOT 新增第二套限制判定、限制状态表或限制阈值。

#### Scenario: 跌破 60 自动限制

- **Given** 被举报用户信用分 80
- **When** 一次 -30 的举报扣分使分数变为 50
- **Then** 系统 SHALL 沿用既有链路自动建立限制记录，原因为 `CREDIT_SCORE_BELOW_60`
- **And** 按既有规则清退未结束行程与待处理申请
- **And** 本能力 MUST NOT 新增限制实现

#### Scenario: 恰好 60 不触发限制

- **Given** 被举报用户信用分 70
- **When** 一次 -10 的举报扣分使分数变为 60
- **Then** MUST NOT 触发自动限制
- **And** 用户写权限保持不变

#### Scenario: 已受限用户再次扣分

- **Given** 用户已处于自动限制中
- **When** 新的举报成立并扣分
- **Then** 分数 SHALL 继续扣减
- **And** 限制记录 MUST NOT 重复建立，MUST NOT 重复清退
