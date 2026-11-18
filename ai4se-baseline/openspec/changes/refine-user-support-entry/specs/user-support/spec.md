# user-support 增量规格（refine-user-support-entry）

## ADDED Requirements

### Requirement: 用户侧独立客服入口

系统 SHALL 为普通用户提供独立的客服入口（`#/support`），该页面 MUST 只承载人工客服会话，MUST NOT 展示举报编号、举报状态或管理员处理备注。入口 MUST 在宽屏侧栏「我的」分组以「联系客服」呈现，MUST 在窄屏提供悬浮入口，MUST 在账号菜单提供同名入口；底部导航 MUST NOT 为客服新增格子。

#### Scenario: 从侧栏进入客服
- **Given** 已登录的普通用户
- **When** 用户点击侧栏「联系客服」
- **Then** 进入 `#/support`，页面标题为「联系客服」
- **And** 页面不出现「我的举报」区块

#### Scenario: 窄屏使用悬浮入口
- **Given** 视口宽度不超过 900px 的普通用户
- **When** 用户在非客服页点击悬浮客服按钮
- **Then** 进入 `#/support`

#### Scenario: 直接深链客服页
- **Given** 已登录用户
- **When** 用户直接打开 `#/support`
- **Then** 页面展示当前客服会话，或展示「开始对话」入口

### Requirement: 帮助与反馈已下线

系统 SHALL NOT 提供「帮助与反馈」页面或入口：侧栏与后台页签 MUST NOT 出现「帮助与反馈」，旧深链 `#/help` MUST 落到不存在页。该约束对普通用户与管理员同样生效。

#### Scenario: 普通用户看不到入口
- **Given** 已登录的普通用户
- **When** 用户查看侧栏导航
- **Then** 导航中不出现「帮助与反馈」

#### Scenario: 管理员也看不到入口
- **Given** role 为 `ADMIN` 的账号
- **When** 管理员查看侧栏与后台页签
- **Then** 两处都不出现「帮助与反馈」

#### Scenario: 旧深链已失效
- **Given** 任意已登录账号
- **When** 打开 `#/help`
- **Then** 显示不存在页（行程不存在）
