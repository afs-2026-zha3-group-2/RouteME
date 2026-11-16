# user-auth 增量规格

## ADDED Requirements

### Requirement: 注册账号

系统 SHALL 允许访客用用户名与密码注册账号，并 MUST 校验用户名格式与唯一性、密码长度、昵称与兴趣标签数量；注册成功后 MUST 立即以新账号登录。

#### Scenario: 注册成功后自动登录
- **Given** 用户名 `linxia` 尚未被使用
- **When** 访客提交合法用户名、密码、昵称与兴趣标签
- **Then** 系统创建账号并返回会话 token 与用户资料
- **And** 前端直接进入首页，显示新昵称

#### Scenario: 用户名重复
- **Given** 用户名 `linxia` 已存在
- **When** 访客用同一用户名注册
- **Then** 系统返回 409 与 `USERNAME_TAKEN`
- **And** 不创建账号

#### Scenario: 用户名格式非法
- **When** 访客提交少于 3 位、超过 20 位或含非字母数字下划线的用户名
- **Then** 系统返回 400 与 `INVALID_INPUT`

#### Scenario: 密码长度非法
- **When** 访客提交少于 8 位或超过 64 位的密码
- **Then** 系统返回 400 与 `INVALID_INPUT`

### Requirement: 用户名密码登录

系统 SHALL 允许已注册账号用用户名与密码登录；密码 MUST 以加盐散列形式存储，系统 MUST NOT 以明文保存或返回密码。

#### Scenario: 正确凭据登录
- **Given** 账号 `linxia` 已注册
- **When** 用户提交正确的用户名与密码
- **Then** 系统返回 200、会话 token 与用户资料

#### Scenario: 错误密码
- **Given** 账号 `linxia` 已注册
- **When** 用户提交错误密码
- **Then** 系统返回 401 与 `INVALID_CREDENTIALS`
- **And** 不签发会话

#### Scenario: 演示账户不能密码登录
- **Given** 演示账户没有用户名与密码凭据
- **When** 调用方尝试用任意用户名/密码登录
- **Then** 系统返回 401 与 `INVALID_CREDENTIALS`

### Requirement: 会话校验与退出

系统 SHALL 用不透明随机 token 表示登录会话，并在读取当前用户与退出时校验其有效性与过期时间；退出后该 token MUST NOT 再被接受。

#### Scenario: 用有效 token 读取当前用户
- **Given** 用户已登录并持有有效 token
- **When** 携带 `Authorization: Bearer <token>` 请求当前用户
- **Then** 返回该用户的昵称、学校、简介与兴趣

#### Scenario: 无效或过期 token
- **When** 请求未携带 token，或 token 不存在/已过期
- **Then** 系统返回 401 与 `SESSION_INVALID`

#### Scenario: 退出登录
- **Given** 用户持有有效 token
- **When** 用户退出登录
- **Then** 系统删除该会话并返回 204
- **And** 同一 token 再次请求当前用户返回 401

### Requirement: 演示身份保留

系统 SHALL 保留 3 个预设演示账户，允许不注册直接进入；演示身份 MUST NOT 拥有用户名密码凭据，且 MUST NOT 影响注册账号的数据隔离。

#### Scenario: 演示身份进入
- **Given** 用户停留在身份门
- **When** 用户选择任一演示账户卡片
- **Then** 系统以该演示身份进入首页
- **And** 不创建会话 token

#### Scenario: 注册账号与演示账号并存
- **Given** 系统中同时存在演示账户与注册账号
- **When** 用户切换身份或登录
- **Then** 两种身份的行程、申请与聊天仍按各自 userId 隔离