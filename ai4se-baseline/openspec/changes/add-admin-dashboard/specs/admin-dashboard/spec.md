# admin-dashboard 增量规格（add-admin-dashboard）

## ADDED Requirements

### Requirement: 管理后台概览统计端点与访问控制

系统 SHALL 提供仅管理员可访问的只读端点 `GET /api/admin/dashboard`。非管理员 MUST 返回 403 `ADMIN_REQUIRED`，未提供身份 MUST 返回 401；受限管理员（`SUSPENDED` / `BANNED`）MUST 按既有管理端错误码拒绝。响应 MUST NOT 包含昵称、邮箱、头像或任何其他可识别到个人的明细字段。统计 MUST 在每次请求时即时计算，MUST NOT 返回缓存结果，也 MUST NOT 依赖定时任务维护的物化数据。

#### Scenario: 管理员读取概览统计
- **Given** 当前身份 `role=ADMIN` 且账号处于 `ACTIVE`
- **When** 管理员请求 `GET /api/admin/dashboard`
- **Then** 系统返回 200 与六组计数
- **And** 每组都包含该组约定的全部状态键

#### Scenario: 非管理员与未认证被拒绝
- **Given** 当前身份 `role=USER`，或请求未提供身份
- **When** 请求 `GET /api/admin/dashboard`
- **Then** `role=USER` 返回 403 `ADMIN_REQUIRED`
- **And** 未提供身份返回 401
- **And** 两种情况下响应都不包含任何统计数据

#### Scenario: 写入后立即反映
- **Given** 管理员已读取过一次概览统计
- **When** 系统新增一条行程、一条举报后管理员再次请求
- **Then** 行程与举报的计数按增量变化
- **And** 响应不包含上次请求的缓存数字

### Requirement: 概览计数结构与零填充

响应 MUST 以固定键返回 `users`、`trips`、`applications`、`experiences`、`reports`、`service_sessions` 六组与 `generated_at`（统计生成时刻）；计数为 0 时 MUST 返回 0，MUST NOT 省略键或返回空对象。用户组 MUST 含 `total`、`by_role`、`by_status`、`new_last_7_days`、`new_last_30_days`；行程组 MUST 含 `total`、`by_status` 与两个新增字段；申请组 MUST 含 `total` 与 `by_status`；体验组 MUST 含 `total` 与两个新增字段；举报组与客服会话组 MUST 含 `total` 与 `by_status`。组名与字段名按 `@rule:api-contract` 使用 snake_case。

#### Scenario: 空库返回固定零值
- **Given** 六类数据表均为空
- **When** 管理员请求概览统计
- **Then** 六组计数的所有字段都返回 0
- **And** 不省略任何状态键，也不返回空对象

### Requirement: 概览统计的账号与行程口径

用户总数 MUST 包含 `ADMIN` 账号，且 MUST 等于角色分桶之和与有效状态分桶之和。账号状态 MUST 使用有效状态：`BANNED` 且解封时间已过的账号 MUST 计入 `ACTIVE`。行程状态 MUST 复用用户侧既有的推导规则（已取消优先于已结束，已结束优先于旅行中，旅行中优先于已满员，已满员优先于招募中），MUST NOT 新增持久化状态列或另写一套判定；已取消行程 MUST 计入总数并落入 `cancelled`。同行申请、举报与客服会话 MUST 按各自已持久化的状态列分桶，每组总数 MUST 等于该组分桶之和。

#### Scenario: 封禁到期的账号计入正常
- **Given** 一个账号 `status=BANNED` 且解封时间早于当前时刻
- **When** 管理员请求概览统计
- **Then** 该账号计入 `users.by_status.ACTIVE`
- **And** 不计入 `users.by_status.BANNED`

#### Scenario: 已取消行程与全部申请状态都计入
- **Given** 存在一条已取消行程，以及覆盖五种状态的同行申请
- **When** 管理员请求概览统计
- **Then** 已取消行程计入行程总数与 `cancelled` 桶
- **And** 五种申请状态各自出现在对应桶中
- **And** 申请总数等于五桶之和

#### Scenario: 总数与分桶自洽
- **Given** 任意数量的账号、行程、申请、体验、举报与会话
- **When** 管理员请求概览统计
- **Then** 用户总数等于角色分桶之和，也等于有效状态分桶之和
- **And** 行程、申请、举报与会话的总数各自等于其状态分桶之和

### Requirement: 概览统计的新增计数窗口

新增计数 MUST 以记录创建时间为准，MUST NOT 使用状态变更时间。窗口 MUST 按产品统一时区（Asia/Shanghai）的自然日计算：`new_last_7_days` 覆盖当天与之前 6 个自然日，`new_last_30_days` 覆盖当天与之前 29 个自然日；两者 MUST 包含当天，且 MUST 覆盖请求时刻。

#### Scenario: 新增计数按产品时区自然日窗口
- **Given** 三条记录分别在产品时区「今天 00:00 之后」「今天 00:00 之前 8 天」「今天 00:00 之前 31 天」
- **When** 管理员请求概览统计
- **Then** 第一条同时计入 `new_last_7_days` 与 `new_last_30_days`
- **And** 第二条只计入 `new_last_30_days`
- **And** 第三条两者都不计入

### Requirement: 管理后台概览页

`#/admin` SHALL 作为管理后台的默认落地页，展示六组指标卡与最近更新时间。用户、举报、客服卡 MUST 可跳转到 `#/admin/users`、`#/admin/reports`、`#/admin/service`；行程、同行申请、体验卡 MUST NOT 渲染为可点击或可聚焦链接。页面 MUST 提供手动刷新，MUST NOT 自动轮询或订阅推送。请求失败 MUST 展示可读错误与重试入口；计数为 0 MUST 展示 0，MUST NOT 以空白卡替代。非管理员 MUST NOT 看到概览内容，直接访问 MUST 展示无权限提示且 MUST NOT 发起任何 `/api/admin/**` 请求。

#### Scenario: 管理员进入后台默认看到概览
- **Given** 当前身份 `role=ADMIN`
- **When** 管理员点击「管理后台」入口
- **Then** 页面落到 `#/admin`
- **And** 展示六组指标卡与最近更新时间

#### Scenario: 指标卡与跳转边界
- **Given** 概览页已加载完成
- **When** 管理员查看六组指标卡
- **Then** 用户、举报、客服卡可点击并分别进入对应的管理页面
- **And** 行程、同行申请、旅行体验卡只展示数字，不提供跳转

#### Scenario: 非管理员直接访问被拒绝
- **Given** 当前身份 `role=USER`
- **When** 用户直接输入 `#/admin`
- **Then** 页面展示无权限提示，不渲染任何统计数字
- **And** 网络面板中没有 `/api/admin/dashboard` 请求

#### Scenario: 加载失败可重试
- **Given** 统计请求返回 5xx 或网络失败
- **When** 概览页渲染结果
- **Then** 页面展示可读错误与「重试」入口
- **And** 点击重试会重新发起一次统计请求

#### Scenario: 手动刷新且不自动轮询
- **Given** 概览页已加载完成
- **When** 管理员停留 60 秒不操作
- **Then** 页面不发起周期请求
- **And** 点击「刷新」后才重新请求并更新数字与最近更新时间