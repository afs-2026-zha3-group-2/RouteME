# admin-console 增量规格（add-admin-console）

## ADDED Requirements

### Requirement: 管理员身份与后台访问控制

系统 SHALL 在 `app_users` 上维护 `role`（`USER` / `ADMIN`，默认 `USER`）与 `status`（`ACTIVE` / `SUSPENDED` / `BANNED`，默认 `ACTIVE`）。系统 MUST 在迁移中提供至少一个可登录的 `ADMIN` 种子账号，其初始凭据只在交付说明登记、MUST NOT 硬编码在规格或前端。所有 `/api/admin/**` 端点 MUST 在服务端校验当前身份的 `role=ADMIN`；非管理员 MUST 收到 403 `ADMIN_REQUIRED`，未提供身份 MUST 收到 401。管理员账号被暂停或封禁时 MUST 同样适用「受限账号的功能边界」，MUST NOT 因 `role=ADMIN` 绕过账号状态限制。前端 MUST 只在管理员身份下展示「管理后台」入口，并 MUST NOT 让非管理员通过直接输入 `#/admin/**` 进入后台页面。管理员身份 MUST 只由服务端数据决定，客户端 MUST NOT 通过请求体或请求头自选角色。

#### Scenario: 管理员进入后台
- **Given** 当前身份在 `app_users` 中 `role=ADMIN` 且 `status=ACTIVE`
- **When** 管理员打开「管理后台」入口
- **Then** 系统展示用户管理、举报管理、客户服务三个后台入口
- **And** 三个入口都可打开对应页面

#### Scenario: 非管理员被拒绝
- **Given** 当前身份 `role=USER`
- **When** 用户访问 `#/admin/users` 或调用 `GET /api/admin/users`
- **Then** 前端展示无权限页面，不渲染任何用户数据
- **And** 后端返回 403 `ADMIN_REQUIRED`

#### Scenario: 客户端不能自选管理员角色
- **Given** 客户端在注册或资料请求中携带 `role=ADMIN` 或 `status=ACTIVE`
- **When** 服务端处理请求
- **Then** 服务端 MUST 忽略这些字段
- **And** 新账号仍为 `role=USER`、`status=ACTIVE`

### Requirement: 用户列表与搜索

系统 SHALL 提供用户管理页（`#/admin/users`），分页展示平台全部注册用户，字段 MUST 包含用户 ID、头像、昵称、邮箱、注册时间与账号状态；邮箱未填写时 MUST 显示「未填写」。系统 MUST 支持按用户 ID（精确匹配）、昵称（包含匹配）或邮箱（包含匹配）搜索，并 MUST 支持按账号状态筛选；搜索为空时 MUST 返回全部用户。列表默认按注册时间倒序、ID 倒序排列。

#### Scenario: 展示全部注册用户
- **Given** 数据库中存在多名 `ACTIVE`、`SUSPENDED`、`BANNED` 用户
- **When** 管理员进入用户管理页
- **Then** 列表展示用户 ID、头像、昵称、邮箱、注册时间与状态
- **And** 三种状态的用户都能出现在列表中

#### Scenario: 按用户 ID 搜索
- **Given** 平台存在 ID 为 206 的用户
- **When** 管理员在搜索框输入 `206`
- **Then** 列表只展示该用户
- **And** 其他用户不出现

#### Scenario: 按昵称或邮箱搜索
- **Given** 平台存在昵称包含「 testing 」、邮箱为 `lin@example.com` 的用户
- **When** 管理员分别输入昵称片段与邮箱片段
- **Then** 两次搜索都能命中对应用户
- **And** 邮箱匹配不区分大小写

#### Scenario: 按状态筛选与分页
- **Given** 平台同时存在 `ACTIVE` 与 `BANNED` 用户
- **When** 管理员选择 `BANNED` 筛选并翻到第二页
- **Then** 列表只展示 `BANNED` 用户
- **And** 分页信息与总条数保持一致

### Requirement: 用户详情与关联内容

系统 SHALL 提供用户详情页（`#/admin/users/{userId}`），汇总展示该用户的个人资料、账号状态与处罚信息、发布的旅行计划、发表的旅行体验，以及该用户作为举报人或被举报人的举报记录；每条行程、体验与举报 MUST 可跳转到对应详情或后台详情。用户不存在时 MUST 返回 404 `USER_NOT_FOUND`。

#### Scenario: 查看个人资料与账号状态
- **Given** 管理员打开某个用户的详情页
- **When** 页面加载完成
- **Then** 展示昵称、头像、邮箱、学校、城市、专业、职业、简介、兴趣、注册时间与账号状态
- **And** 被处罚用户同时展示处理原因、封禁理由与解封时间

#### Scenario: 查看旅行计划与旅行体验
- **Given** 某用户发布过行程并发表过体验
- **When** 管理员查看该用户详情
- **Then** 分别列出该用户的旅行计划与旅行体验
- **And** 点击条目可跳转到对应详情

#### Scenario: 查看相关举报
- **Given** 某用户既是举报人又被他人举报
- **When** 管理员查看该用户详情
- **Then** 相关举报按举报人 / 被举报人标注方向列出
- **And** 每条可跳转到举报详情

### Requirement: 账号状态迁移与处罚

系统 SHALL 支持且仅支持以下账号状态迁移：`ACTIVE → SUSPENDED`、`ACTIVE → BANNED`、`SUSPENDED → BANNED`、`SUSPENDED → ACTIVE`。暂停与封禁 MUST 二次确认并填写处理原因；封禁 MUST 选择 8 项预定义封禁理由之一（选「其他原因」时补充说明必填）并给出未来的解封时间。非法迁移 MUST 返回 409 `INVALID_STATUS_TRANSITION`；管理员 MUST NOT 对自身执行暂停或封禁。封禁到期后系统 MUST 按 `ACTIVE` 放行，并在下一次状态变更时落库为 `ACTIVE`。处罚 MUST NOT 删除用户既有数据；MVP MUST NOT 提供永久删除账号或内容的能力。

#### Scenario: 暂停账号
- **Given** 用户状态为 `ACTIVE`
- **When** 管理员选择「暂停账号」、填写处理原因并确认
- **Then** 用户状态变为 `SUSPENDED`
- **And** 记录处理原因、操作管理员与操作时间
- **And** 该用户原有数据保持不变

#### Scenario: 封禁账号
- **Given** 用户状态为 `ACTIVE` 或 `SUSPENDED`
- **When** 管理员选择「封禁账号」、选择 8 项封禁理由之一（`HARASSMENT` / `FAKE_TRIP` / `FRAUD_RISK` / `ILLEGAL_CONTENT` / `IMPERSONATION` / `NO_SHOW_DISRUPTION` / `PRIVACY_LEAK` / `OTHER`）、填写未来解封时间与处理原因并确认
- **Then** 用户状态变为 `BANNED`
- **And** 用户个人资料页展示封禁理由与解封时间
- **And** 未选择理由、未填原因或解封时间不在未来时 MUST NOT 提交
- **And** 选择 `OTHER` 而未填补充说明时 MUST NOT 提交

#### Scenario: 恢复账号
- **Given** 用户状态为 `SUSPENDED`
- **When** 管理员选择「恢复账号」并确认
- **Then** 用户状态变为 `ACTIVE`
- **And** 该用户的四类写操作恢复可用

#### Scenario: 非法迁移被拒绝
- **Given** 用户状态为 `BANNED`
- **When** 管理员尝试恢复为 `ACTIVE`，或对 `ACTIVE` 用户再次执行恢复
- **Then** 系统返回 409 `INVALID_STATUS_TRANSITION`
- **And** 用户状态保持不变

#### Scenario: 封禁到期自动恢复
- **Given** 用户状态为 `BANNED` 且解封时间已过
- **When** 系统读取该用户或该用户再次执行写操作
- **Then** 有效状态为 `ACTIVE`
- **And** 用户个人资料页不再展示封禁内容
- **And** 该用户的下一次写操作 MUST 不再返回 403 `ACCOUNT_BANNED`

#### Scenario: 管理员不能处罚自己
- **Given** 管理员正在操作自己的账号
- **When** 管理员尝试暂停或封禁自己
- **Then** 系统返回 409 `CANNOT_TARGET_SELF`
- **And** 管理员账号状态保持不变

### Requirement: 受限账号的功能边界

系统 MUST 在服务端拒绝受限账号的写操作：`SUSPENDED` 用户 MUST NOT 发布行程、申请同行、发送聊天消息或发布旅行体验，拒绝时返回 403 `ACCOUNT_SUSPENDED`；`BANNED` 用户 MUST NOT 执行任何业务写操作（含发布、申请、聊天、体验、举报与客服消息），拒绝时返回 403 `ACCOUNT_BANNED`。`SUSPENDED` 与 `BANNED` 用户 MUST 仍可登录、浏览公开内容并读取自己的数据；`BANNED` 用户 MUST 能在个人资料页看到封禁信息。限制 MUST 由服务端执行，MUST NOT 只依赖前端隐藏按钮。

#### Scenario: SUSPENDED 用户四类写操作被拒绝
- **Given** 用户状态为 `SUSPENDED`
- **When** 该用户尝试发布行程、申请同行、发送聊天消息或发布旅行体验
- **Then** 四个请求都被服务端拒绝并返回 403 `ACCOUNT_SUSPENDED`
- **And** 不产生行程、申请、消息或体验记录
- **And** 该用户仍可浏览行程与读取自己的数据

#### Scenario: BANNED 用户只读
- **Given** 用户状态为 `BANNED`
- **When** 该用户登录并尝试任意业务写操作
- **Then** 写操作被服务端拒绝并返回 403 `ACCOUNT_BANNED`
- **And** 登录、浏览与读取自己的数据仍可用
- **And** 登录后任意页面顶部展示封禁理由与解封时间

#### Scenario: 处罚不删除既有数据
- **Given** 用户已有行程、体验、聊天与举报记录
- **When** 管理员暂停或封禁该用户
- **Then** 原有记录仍可通过详情页、聊天页与后台查询到
- **And** 系统不提供永久删除账号或内容的入口

### Requirement: 封禁信息展示

系统 MUST 在用户个人资料页与全站页面顶部展示当前有效的封禁理由与解封时间，文案 MUST 能让用户理解处罚范围与恢复时间；`SUSPENDED` 账号 MUST 在同样的位置看到暂停提示，但 MUST NOT 展示管理员处理原因或封禁备注。账号恢复 `ACTIVE` 后 MUST NOT 再展示封禁内容。管理端的用户详情 MUST 同步展示处理原因、封禁理由、解封时间与最近操作时间。

#### Scenario: 用户资料页展示封禁信息
- **Given** 用户状态为 `BANNED` 且存在封禁理由与解封时间
- **When** 该用户或其他用户打开其个人资料页
- **Then** 页面展示封禁理由与解封时间
- **And** 不展示举报人身份或管理员处理备注

#### Scenario: 受限用户登录后在任意页面看到提示
- **Given** 用户状态为 `BANNED` 且存在封禁理由与解封时间
- **When** 该用户登录并进入首页、行程列表、聊天或发布页中的任意页面
- **Then** 页面顶部展示「账号已被封禁」、封禁理由与解封时间
- **And** 个人资料页不重复出现第二条相同提示
- **And** 状态为 `SUSPENDED` 的用户在同样位置看到「账号已被暂停」

#### Scenario: 恢复后不再展示
- **Given** 用户曾因封禁到期或管理员恢复而回到 `ACTIVE`
- **When** 打开该用户个人资料页
- **Then** 页面不再展示封禁理由与解封时间

### Requirement: 举报队列与筛选

系统 SHALL 在用户提交举报时把举报状态初始化为 `PENDING`。举报管理页（`#/admin/reports`）MUST 展示举报编号（`R-{id}`）、举报人、被举报用户、举报对象、举报类型、举报时间与处理状态；举报对象 MUST 支持用户、旅行计划与旅行体验；`被举报用户` MUST 按对象类型推导：用户对象为本人、旅行计划对象为发布者、旅行体验对象为作者。处理状态 MUST 为 `PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED`；系统 MUST 支持按状态筛选，并按举报时间倒序展示。

#### Scenario: 新举报进入待处理队列
- **Given** 用户提交一条举报
- **When** 管理员进入举报管理页
- **Then** 该举报出现在列表中且状态为 `PENDING`
- **And** 列表展示举报编号、举报人、被举报用户、对象、类型、时间与状态

#### Scenario: 按状态筛选
- **Given** 平台同时存在 `PENDING`、`PROCESSING`、`RESOLVED` 与 `REJECTED` 举报
- **When** 管理员选择任一状态筛选
- **Then** 列表只展示该状态的举报
- **And** 选择「全部」时恢复完整列表

#### Scenario: 举报对象与编号稳定
- **Given** 举报对象分别为用户、旅行计划与旅行体验
- **When** 管理员查看列表
- **Then** 三类对象都正确展示对象类型与被举报用户
- **And** 同一举报的编号 `R-{id}` 在列表与详情中保持一致

### Requirement: 举报详情与处理

系统 SHALL 提供举报详情页（`#/admin/reports/{reportId}`），展示举报原因、举报人、被举报用户与被举报内容，并 MUST 允许跳转到对应用户、行程或体验详情。当举报来自行程聊天时，详情 MUST 标注来源为聊天举报，展示该会话所属行程的概要与举报人、被举报人在该行程下的完整聊天记录；当举报对象为旅行计划时，详情 MUST 标注来源为行程举报，展示该行程的标题、目的地、起止日期、状态与发布者。聊天记录 MUST 按发送时间升序展示，且 MUST 只包含该举报人与被举报人的消息，MUST NOT 暴露同一行程下其他用户的会话。管理员点击「开始处理」后状态 MUST 由 `PENDING` 迁移到 `PROCESSING`；打开详情 MUST NOT 改变状态；对非 `PENDING` 举报执行开始处理 MUST 返回 409 `REPORT_NOT_PENDING`。处理 MUST 填写处理结果或备注：成立时在暂停与封禁之间选择处置并与 `RESOLVED` 同事务提交，不成立时置 `REJECTED`；对非 `PROCESSING` 举报执行处理 MUST 返回 409 `REPORT_NOT_PROCESSING`。处理记录 MUST 保留；举报人 MUST 能看到受理与最终状态。

#### Scenario: 开始处理
- **Given** 举报状态为 `PENDING`
- **When** 管理员打开举报详情并点击「开始处理」
- **Then** 举报状态变为 `PROCESSING`
- **And** 记录处理管理员与开始处理时间
- **And** `PROCESSING` 举报可由任一管理员继续处理

#### Scenario: 重复开始处理被拒绝
- **Given** 举报状态不是 `PENDING`
- **When** 管理员再次点击「开始处理」
- **Then** 系统返回 409 `REPORT_NOT_PENDING`
- **And** 举报状态保持不变

#### Scenario: 查看举报上下文
- **Given** 一条举报指向某用户、行程或体验
- **When** 管理员打开举报详情
- **Then** 展示举报原因、举报人、被举报用户与被举报内容
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

#### Scenario: 举报成立并处罚
- **Given** 举报状态为 `PROCESSING`、被举报用户为 `ACTIVE` 且管理员判定举报成立
- **When** 管理员选择暂停或封禁、填写处理结果并确认
- **Then** 被举报用户状态按所选处罚迁移
- **And** 举报状态变为 `RESOLVED`
- **And** 处罚与举报处理在同一事务内完成，任一失败则整体回滚

#### Scenario: 被举报用户已处于受限状态
- **Given** 举报状态为 `PROCESSING`，被举报用户当前为 `SUSPENDED` 或 `BANNED`
- **When** 管理员判定举报成立并确认处置
- **Then** 用户为 `SUSPENDED` 时可选维持暂停或升级为封禁
- **And** 用户为 `BANNED` 时只更新封禁理由与解封时间，状态保持 `BANNED`
- **And** 两种情况下举报状态都变为 `RESOLVED`，且处罚与处理在同一事务内完成

#### Scenario: 举报不成立
- **Given** 举报状态为 `PROCESSING` 且管理员判定举报不成立
- **When** 管理员填写处理结果并选择驳回
- **Then** 举报状态变为 `REJECTED`，被举报用户状态不变
- **And** 处理记录保留

#### Scenario: 处理备注必填
- **Given** 管理员准备处理一条举报
- **When** 处理结果或备注为空
- **Then** 系统 MUST NOT 提交处理
- **And** 举报状态保持不变

#### Scenario: 处理记录保留且举报人可见
- **Given** 举报已被处理为 `RESOLVED` 或 `REJECTED`
- **When** 管理员再次查看列表，或举报人打开「我的举报」
- **Then** 举报仍存在且保留处理结果
- **And** 举报人看到「已受理」与最终状态
- **And** 举报人看不到管理员处理备注与被举报人的处罚细节

### Requirement: 客服工作台

系统 SHALL 提供客户服务页（`#/admin/service`），展示 `WAITING`、`HANDLING`、`CLOSED` 三类客服会话。客服 MUST 能将 `WAITING` 会话接入为 `HANDLING`；接入后双方 MUST 能双向发送文本消息；会话详情 MUST 展示当前用户的基础账号信息（昵称、ID、头像、邮箱、账号状态、注册时间）、与该用户相关的举报记录，以及当前会话的完整历史消息。客服 MUST 能主动结束 `HANDLING` 会话，结束后状态变为 `CLOSED`；`CLOSED` 会话 MUST 保留历史且双方 MUST NOT 继续发送消息。并发接入同一条 `WAITING` 会话时，仅第一个请求成功，其余 MUST 返回 409 `SESSION_ALREADY_HANDLING`；对非 `HANDLING` 会话执行结束 MUST 返回 409 `SESSION_NOT_HANDLING`。

#### Scenario: 查看三类会话
- **Given** 平台存在 `WAITING`、`HANDLING` 与 `CLOSED` 会话
- **When** 客服进入客户服务页
- **Then** 三类会话都可被筛选查看
- **And** `WAITING` 会话显示等待时长或创建时间

#### Scenario: 接入会话
- **Given** 一条 `WAITING` 会话
- **When** 客服点击「接入」
- **Then** 会话状态变为 `HANDLING`
- **And** 记录接入客服与接入时间
- **And** 用户侧可看到客服已接入

#### Scenario: 双向对话
- **Given** 会话状态为 `HANDLING`
- **When** 客服或用户发送一条 1–500 字文本
- **Then** 消息持久化并按发送时间升序展示
- **And** 另一方在 3 秒轮询内看到该消息

#### Scenario: 查看用户资料与相关举报
- **Given** 客服打开一条 `HANDLING` 会话
- **When** 会话详情加载完成
- **Then** 展示该用户的基础账号信息与账号状态
- **And** 列出该用户作为举报人或被举报人的举报记录
- **And** 展示当前会话的完整历史消息

#### Scenario: 结束会话
- **Given** 会话状态为 `HANDLING`
- **When** 客服点击「结束会话」并确认
- **Then** 会话状态变为 `CLOSED`
- **And** 双方只能查看历史，不能继续发送消息

#### Scenario: 结束后可查看历史
- **Given** 会话状态为 `CLOSED`
- **When** 客服或用户再次打开该会话
- **Then** 完整历史消息仍可读取
- **And** 输入框不可用