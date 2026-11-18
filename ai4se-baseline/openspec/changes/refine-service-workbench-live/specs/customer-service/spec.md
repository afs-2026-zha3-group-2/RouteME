# customer-service 增量规格（refine-service-workbench-live）

## ADDED Requirements

### Requirement: 客服工作台实时可见与待接入提醒

管理后台 SHALL 让管理员无需手动刷新即可看到用户新发起的客服会话与消息。客服队列 MUST 按固定间隔静默轮询（页面隐藏时暂停），并保持当前筛选与分页；后台页签「客户服务」MUST 显示 `WAITING` 会话数量徽标；存在待接入会话时，队列页 MUST 显示「有会话正在等待接入」横幅与跳转到「等待接入」筛选的快捷入口。

#### Scenario: 新会话自动出现在队列
- **Given** 管理员已打开 `#/admin/service`
- **When** 用户在此之后发起客服会话并发送一条消息
- **Then** 不点击「刷新」也不切换筛选，队列在轮询周期内出现该会话
- **And** 「客户服务」页签出现待接入数量徽标

#### Scenario: 队列页提示等待接入
- **Given** 存在至少一个 `WAITING` 会话
- **When** 管理员以「全部状态」查看队列
- **Then** 顶部显示「有会话正在等待接入（N）」
- **And** 点击「只看等待接入」后筛选切换为 `WAITING`

### Requirement: 接入前可读用户消息

管理后台 SHALL 允许管理员在接入（`WAITING → HANDLING`）之前读取用户已发送的消息，便于判断是否需要即时响应。接入动作 MUST 只改变会话状态与接入人，MUST NOT 作为读取消息的前置条件。

#### Scenario: 未接入时查看消息
- **Given** 用户已发起会话并发送消息，会话状态为 `WAITING`
- **When** 管理员在队列中选中该会话
- **Then** 会话面板展示用户消息内容
- **And** 管理员仍可选择「接入会话」
