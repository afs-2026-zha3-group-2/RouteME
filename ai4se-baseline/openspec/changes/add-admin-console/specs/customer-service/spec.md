# customer-service 增量规格（add-admin-console）

## ADDED Requirements

### Requirement: 帮助与反馈入口与我的举报状态

系统 SHALL 提供帮助与反馈页（`#/help`），其中 MUST 包含「联系人工客服」与「我的举报」两个入口/区块。「我的举报」MUST 列出当前用户提交的举报编号（`R-{id}`）、举报对象、提交时间与当前状态，状态 MUST 为 `PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED`，并 MUST 让举报人看到举报已受理与最终处理结果。该页 MUST 只展示当前用户自己的举报，MUST NOT 展示举报人身份、管理员处理备注或其他用户的举报。

#### Scenario: 进入帮助与反馈
- **Given** 已登录用户遇到账号、举报或平台使用问题
- **When** 用户打开 `#/help`
- **Then** 页面展示「联系人工客服」与「我的举报」两个区块

#### Scenario: 查看我的举报状态
- **Given** 当前用户提交过一条举报且已被处理
- **When** 用户打开「我的举报」
- **Then** 列表展示举报编号、对象、提交时间与最终状态
- **And** 处理中的举报展示「已受理」
- **And** 不展示管理员处理备注或其他用户的举报

### Requirement: 人工客服会话生命周期

系统 SHALL 允许用户在帮助与反馈页发起人工客服会话；发起后会话状态 MUST 为 `WAITING`。同一用户同时 MUST NOT 拥有多个 `WAITING` 或 `HANDLING` 会话；已有未结束会话时再次发起 MUST 返回该会话而不是创建新会话。客服接入后状态 MUST 变为 `HANDLING`；客服结束会话后状态 MUST 变为 `CLOSED`。`CLOSED` 后用户 MUST 能重新发起新的会话，旧会话 MUST 保留历史。用户 MUST NOT 自行关闭会话。

#### Scenario: 发起人工客服
- **Given** 用户没有未结束的客服会话
- **When** 用户点击「联系人工客服」
- **Then** 系统创建一条 `WAITING` 会话
- **And** 用户可以立即发送问题描述
- **And** 用户看到「等待客服接入」

#### Scenario: 重复发起返回既有会话
- **Given** 用户已有一条 `WAITING` 或 `HANDLING` 会话
- **When** 用户再次点击「联系人工客服」
- **Then** 系统返回既有会话
- **And** 不创建第二条未结束会话

#### Scenario: 客服接入后状态变化
- **Given** 会话状态为 `WAITING`
- **When** 客服接入
- **Then** 用户侧在 3 秒轮询内看到状态变为 `HANDLING`
- **And** 用户可以继续发送消息

#### Scenario: 会话结束
- **Given** 会话状态为 `HANDLING`
- **When** 客服结束会话
- **Then** 会话状态变为 `CLOSED`
- **And** 用户看到会话已结束，输入框不可用
- **And** 用户 MUST NOT 自行关闭会话

#### Scenario: 结束后重新发起
- **Given** 用户上一条客服会话已 `CLOSED`
- **When** 用户再次点击「联系人工客服」
- **Then** 系统创建新的 `WAITING` 会话
- **And** 旧会话仍可查看历史

### Requirement: 客服消息与短轮询

系统 SHALL 允许 `WAITING` 与 `HANDLING` 会话的双方发送 1–500 字文本消息；消息 MUST 持久化、按发送时间升序展示，并通过 3 秒短轮询同步给另一方。空白消息或超过 500 字的消息 MUST 被拒绝且不产生记录。`CLOSED` 会话 MUST 只读；系统 MUST 在会话结束后停止轮询。消息发送者身份 MUST 由服务端根据当前身份与 `role` 判定，客户端 MUST NOT 自报「客服」身份。

#### Scenario: 发送消息并收到回复
- **Given** 会话状态为 `HANDLING`
- **When** 用户发送一条文本，客服随后回复
- **Then** 双方消息按发送时间升序展示
- **And** 用户与客服均在 3 秒内看到对方的新消息

#### Scenario: 空白或超长消息被拒绝
- **Given** 用户在客服会话输入框
- **When** 提交空白消息或超过 500 字的内容
- **Then** 系统拒绝发送并给出提示
- **And** 不产生消息记录

#### Scenario: CLOSED 会话只读
- **Given** 会话状态为 `CLOSED`
- **When** 用户或客服尝试发送消息
- **Then** 系统拒绝并返回 409 `SESSION_CLOSED`
- **And** 历史消息仍可读取

#### Scenario: 客户端不能自报客服身份
- **Given** 普通用户在发送消息时携带 `senderRole=STAFF` 或伪造客服 ID
- **When** 服务端处理消息
- **Then** 服务端 MUST 忽略该字段
- **And** 消息仍记为当前用户发送

### Requirement: 客服会话历史保留

系统 MUST 保留每条客服会话及其全部消息，`CLOSED` 后 MUST NOT 删除会话或消息。客服工作台 MUST 能查看任一历史会话的完整消息；用户 MUST 能查看自己历史会话的消息。会话与消息 MUST 与本需求之外的行程聊天数据隔离，不得出现在「同行消息」或行程聊天列表中。

#### Scenario: 历史会话仍可查看
- **Given** 用户存在已结束的客服会话
- **When** 用户或客服打开该会话
- **Then** 完整历史消息可读取

#### Scenario: 与行程聊天隔离
- **Given** 用户同时有行程聊天与客服会话
- **When** 用户查看「同行消息」或客服工作台
- **Then** 行程聊天只出现在同行消息，客服消息只出现在客服会话
- **And** 两侧互不混入