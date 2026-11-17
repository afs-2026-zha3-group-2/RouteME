# user-auth 增量规格（add-admin-console）

## MODIFIED Requirements

### Requirement: 注册账号

系统 SHALL 允许访客用用户名与密码注册账号，并 MUST 校验用户名格式与唯一性、密码长度与昵称；注册成功后 MUST 立即以新账号登录，并把账号标记为「资料未完善」、引导至个人资料完善页。注册 MUST NOT 再收集学校、专业、旅行兴趣、MBTI 或个人简介；这些字段由 `user-profile` 的个人资料完善页收集。注册界面 MUST 要求连续输入两次密码，第二次为空或与第一次不一致时 MUST NOT 提交注册请求。注册表单 MUST 提供**选填**邮箱字段：填写时 MUST 校验邮箱格式，并在去除首尾空白、转为小写后保持唯一；未填写时 MUST 允许注册，邮箱以 `NULL` 保存。新账号的 `role` MUST 由服务端固定为 `USER`、`status` MUST 固定为 `ACTIVE`，客户端 MUST NOT 指定角色或初始状态。

#### Scenario: 注册成功后自动登录
- **Given** 用户名 `linxia` 尚未被使用
- **When** 访客提交合法的用户名、密码与昵称
- **Then** 系统创建账号并返回会话 token 与用户资料
- **And** 用户资料标记为资料未完善
- **And** 前端进入个人资料完善页，不要求再次输入用户名或密码

#### Scenario: 用户名重复
- **Given** 用户名 `linxia` 已存在
- **When** 访客用同一用户名注册
- **Then** 系统返回 409 与 `USERNAME_TAKEN`
- **And** 不创建账号

#### Scenario: 用户名格式非法
- **Given** 访客在注册表单填写用户名
- **When** 访客提交少于 3 位、超过 20 位或含非字母数字下划线的用户名
- **Then** 系统返回 400 与 `INVALID_INPUT`

#### Scenario: 密码长度非法
- **Given** 访客在注册表单填写密码
- **When** 访客提交少于 8 位或超过 64 位的密码
- **Then** 系统返回 400 与 `INVALID_INPUT`

#### Scenario: 两次输入的密码不一致
- **Given** 访客在注册表单中已输入一次密码
- **When** 第二次输入的密码与第一次不一致或留空
- **Then** 前端在确认密码字段下提示「两次输入的密码不一致」或「请再次输入密码」
- **And** 不发送注册请求

#### Scenario: 昵称缺失或超长
- **Given** 访客在注册表单填写昵称
- **When** 访客提交空昵称或超过 20 字的昵称
- **Then** 系统返回 400 与 `INVALID_INPUT`
- **And** 不创建账号

#### Scenario: 忽略旧版注册资料字段
- **Given** 客户端仍在注册请求中携带学校、简介或兴趣字段
- **When** 访客提交注册
- **Then** 系统 SHALL 忽略这些字段
- **And** 资料的完整填写仍以个人资料完善页为准

#### Scenario: 邮箱选填
- **Given** 邮箱不是注册必填项
- **When** 访客提交合法用户名、密码与昵称但将邮箱留空
- **Then** 系统创建账号且邮箱保存为 `NULL`
- **And** 注册成功并进入资料完善页

#### Scenario: 邮箱格式非法或重复
- **Given** 访客填写的邮箱缺少 `@` / 域名，或同一邮箱（忽略大小写与首尾空白）已被使用
- **When** 访客提交注册
- **Then** 格式非法返回 400 `INVALID_INPUT`
- **And** 邮箱重复返回 409 `EMAIL_TAKEN`
- **And** 不创建账号

#### Scenario: 客户端不能指定角色或初始状态
- **Given** 注册请求携带 `role=ADMIN`、`status=BANNED` 或等价字段
- **When** 服务端处理注册
- **Then** 服务端 MUST 忽略这些字段
- **And** 新账号仍为 `role=USER`、`status=ACTIVE`