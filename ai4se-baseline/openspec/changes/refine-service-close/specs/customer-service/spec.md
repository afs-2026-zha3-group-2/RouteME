# customer-service 增量规格（refine-service-close）

## ADDED Requirements

### Requirement: 用户结束客服会话

系统 SHALL 允许用户在客服会话未结束时自行结束会话。`WAITING`、`HANDLING` 与待用户确认（`RESOLVED`）三种状态 MUST 均可结束；结束前 MUST 由前端二次确认，取消确认时 MUST NOT 改变任何数据。结束 MUST 写入 `closed_at` 与 `closed_by`（用户 id），并 MUST 使会话状态变为 `CLOSED`；`CLOSED` 后双方消息只读，历史消息 MUST 保留。用户 MUST NOT 结束他人会话；重复结束 MUST 被拒绝且 MUST NOT 覆盖既有 `closed_*`。

#### Scenario: 等待接入时结束（取消排队）

- **Given** 当前用户的会话状态为 `WAITING`
- **When** 用户点击「结束会话」并确认
- **Then** 会话状态变为 `CLOSED`
- **And** `closed_at` 有值，`closed_by` 为用户 id
- **And** 管理端队列中该会话显示「已结束」

#### Scenario: 处理中结束

- **Given** 会话状态为 `HANDLING`
- **When** 用户点击「结束会话」并确认
- **Then** 会话状态变为 `CLOSED`
- **And** 双方消息区变为只读
- **And** 历史消息全部保留

#### Scenario: 待用户确认时结束

- **Given** 会话状态为 `RESOLVED`
- **When** 用户点击「结束会话」并确认
- **Then** 会话状态变为 `CLOSED`
- **And** 既有 `resolved_at` / `resolved_by` 保留
- **And** `closed_at` / `closed_by` 写入

#### Scenario: 确认弹窗可取消

- **Given** 用户点击「结束会话」
- **When** 用户在确认弹窗选择取消
- **Then** 会话状态、`resolved_*` 与 `closed_*` 均不改变

#### Scenario: 只能结束本人会话

- **Given** 用户 A 已登录，会话属于用户 B
- **When** A 调用结束接口
- **Then** 返回 404
- **And** 用户 B 的会话状态与审计字段均不改变

#### Scenario: 未登录不能结束

- **Given** 请求没有 Bearer 凭证
- **When** 调用结束接口
- **Then** 返回 401 `SESSION_INVALID`
- **And** 会话状态不变

#### Scenario: 重复结束被拒绝

- **Given** 会话已经是 `CLOSED`
- **When** 用户再次调用结束接口
- **Then** 返回 409 `SESSION_CLOSED`
- **And** 既有 `closed_at` / `closed_by` 不被覆盖

#### Scenario: 三个未结束状态都有结束入口

- **Given** 会话处于 `WAITING`、`HANDLING` 或 `RESOLVED`
- **When** 用户打开 `#/support`
- **Then** 会话头 SHALL 显示「结束会话」按钮
- **And** 确认弹窗文案按状态区分（`WAITING` 提示结束后取消排队）

#### Scenario: 结束后可重新发起

- **Given** 用户上一条客服会话已 `CLOSED`
- **When** 用户点击「重新发起会话」
- **Then** 创建新的 `WAITING` 会话
- **And** 旧会话历史仍可按 id 读取

### Requirement: 客服标记处理完成与待用户确认

系统 SHALL 允许客服在 `HANDLING` 状态把会话标记为「处理完成」。标记 MUST 使状态变为 `RESOLVED`（待用户确认），并 MUST 写入 `resolved_at` 与 `resolved_by`；该动作 MUST 直接生效，不需要二次确认。非 `HANDLING` 状态 MUST NOT 允许标记；重复标记 MUST 被拒绝且 MUST NOT 覆盖既有 `resolved_*`。`RESOLVED` 状态下用户或客服发送消息 MUST 使会话回到 `HANDLING`，并 MUST 清空 `resolved_at` / `resolved_by`。系统 MUST NOT 因超时自动关闭 `RESOLVED` 会话。客服 MUST NOT 拥有结束会话的能力或接口。

#### Scenario: 处理中标记完成

- **Given** 会话状态为 `HANDLING`
- **When** 客服点击「标记处理完成」
- **Then** 会话状态变为 `RESOLVED`
- **And** `resolved_at` 与 `resolved_by` 写入
- **And** 接口立即成功，无二次确认

#### Scenario: 非处理中不可标记

- **Given** 会话状态为 `WAITING` 或 `CLOSED`
- **When** 客服调用标记完成接口
- **Then** 返回 409 `SESSION_NOT_HANDLING`
- **And** 会话状态与 `resolved_*` 均不改变

#### Scenario: 重复标记被拒绝

- **Given** 会话状态已经是 `RESOLVED`
- **When** 客服再次标记完成
- **Then** 返回 409
- **And** 既有 `resolved_at` / `resolved_by` 不被覆盖

#### Scenario: 用户看到待确认提示与结束入口

- **Given** 会话状态为 `RESOLVED`
- **When** 用户打开 `#/support`
- **Then** 会话头显示「待用户确认」与「客服已标记处理完成，如问题已解决请结束会话」类提示
- **And** 显示「结束会话」按钮
- **And** 用户端 MUST NOT 展示标记完成的客服身份
- **And** 系统 MUST NOT 自动结束会话

#### Scenario: 用户发言恢复处理中

- **Given** 会话状态为 `RESOLVED`
- **When** 用户发送一条 1–500 字消息
- **Then** 消息落库并可见
- **And** 会话状态回到 `HANDLING`
- **And** `resolved_at` / `resolved_by` 清空

#### Scenario: 客服发言恢复处理中

- **Given** 会话状态为 `RESOLVED`
- **When** 客服发送一条 1–500 字消息
- **Then** 消息落库并可见
- **And** 会话状态回到 `HANDLING`
- **And** `resolved_at` / `resolved_by` 清空

#### Scenario: 待确认下双方 3 秒可见

- **Given** 会话状态为 `RESOLVED`，一方发送消息
- **When** 另一方页面轮询
- **Then** 3 秒内看到新消息
- **And** 看到状态恢复为「处理中」

#### Scenario: 管理端没有结束入口

- **Given** 客服打开任一状态的会话
- **When** 查看会话头动作区
- **Then** MUST NOT 出现「结束会话」按钮
- **And** `HANDLING` 时只出现「标记处理完成」

#### Scenario: 标记完成按钮仅处理中可见

- **Given** 会话处于 `WAITING`、`RESOLVED` 或 `CLOSED`
- **When** 客服查看会话头动作区
- **Then** MUST NOT 出现「标记处理完成」
- **And** 仅 `HANDLING` 时出现且点击直接生效

#### Scenario: 管理端筛选与待确认可见

- **Given** 客服打开客户服务队列
- **When** 展开状态筛选
- **Then** 选项包含「全部状态 / 等待接入 / 处理中 / 待用户确认 / 已结束」
- **And** 选择「待用户确认」可列出 `RESOLVED` 会话并打开详情

#### Scenario: 待接入徽标不计入待确认

- **Given** 存在 `RESOLVED` 会话但没有 `WAITING` 会话
- **When** 查看后台页签徽标
- **Then** 徽标 MUST NOT 计入 `RESOLVED`

### Requirement: 会话状态机与留痕

会话状态 MUST 只取 `WAITING` / `HANDLING` / `RESOLVED` / `CLOSED` 四值，迁移 MUST 限定为 `WAITING → HANDLING`、`WAITING → CLOSED`、`HANDLING → RESOLVED`、`HANDLING → CLOSED`、`RESOLVED → HANDLING`、`RESOLVED → CLOSED`。同一用户同时 MUST NOT 拥有多条未结束会话；`GET /api/service/sessions/current` 与幂等创建 MUST 同时识别 `WAITING` / `HANDLING` / `RESOLVED`。`closed_by` MUST 只记录用户 id；`resolved_by` MUST 只记录客服 id。`CLOSED` 会话 MUST 拒绝新消息并保留完整历史；客服会话与行程聊天 MUST 保持隔离。

#### Scenario: 合法迁移闭集

- **Given** 会话处于任一状态
- **When** 发起不在闭集内的迁移
- **Then** 系统拒绝并返回 409
- **And** 状态不变

#### Scenario: 每用户最多一条未结束会话

- **Given** 用户已有 `WAITING`、`HANDLING` 或 `RESOLVED` 会话
- **When** 用户再次发起客服会话
- **Then** 返回既有会话
- **And** 不创建第二条未结束会话

#### Scenario: current 覆盖待确认

- **Given** 用户会话状态为 `RESOLVED`
- **When** 调用 `GET /api/service/sessions/current`
- **Then** 返回该会话
- **And** MUST NOT 返回空

#### Scenario: 恢复处理中清空留痕

- **Given** 会话由 `RESOLVED` 回到 `HANDLING`
- **When** 读取会话
- **Then** `resolved_at` 与 `resolved_by` 为空

#### Scenario: 结束操作人只记用户

- **Given** 用户结束了一次会话
- **When** 读取会话审计字段
- **Then** `closed_by` 为用户 id
- **And** 客服没有任何写入 `closed_by` 的路径

#### Scenario: 已结束不可发言

- **Given** 会话状态为 `CLOSED`
- **When** 用户或客服发送消息
- **Then** 返回 409 `SESSION_CLOSED`
- **And** 历史消息仍可读取

#### Scenario: 历史会话保留

- **Given** 会话已 `CLOSED`
- **When** 管理端或本人按 id 读取
- **Then** 完整消息、`resolved_*` 与 `closed_*` 均保留

#### Scenario: 契约状态与字段一致

- **Given** 前后端读取客服会话
- **When** 契约校验执行
- **Then** `ServiceSessionStatus` 包含 `RESOLVED`
- **And** 摘要与详情包含可空 `resolved_at`
- **And** 用户端与客服端字段同名

#### Scenario: 概览统计包含待用户确认分桶

- **Given** 存在 `RESOLVED` 会话
- **When** 管理员请求概览统计
- **Then** `service_sessions.by_status` MUST 包含 `RESOLVED` 键
- **And** 该会话计入 `RESOLVED` 桶
- **And** `service_sessions.total` MUST 等于四个分桶之和

#### Scenario: 管理端 close 路径下线

- **Given** 旧客户端仍调用 `POST /api/admin/service/sessions/{sessionId}/close`
- **When** 请求到达服务端
- **Then** 返回 404
- **And** 会话状态不变

#### Scenario: 客服会话与行程聊天隔离

- **Given** 用户同时有客服会话与行程聊天
- **When** 分别查看两类消息
- **Then** 两类消息不混入对方列表
