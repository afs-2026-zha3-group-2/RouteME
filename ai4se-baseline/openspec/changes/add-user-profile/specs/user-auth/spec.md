# user-auth 增量规格（add-user-profile）

## MODIFIED Requirements

### Requirement: 注册账号

系统 SHALL 允许访客用用户名与密码注册账号，并 MUST 校验用户名格式与唯一性、密码长度与昵称；注册成功后 MUST 立即以新账号登录，并把账号标记为「资料未完善」、引导至个人资料完善页。注册 MUST NOT 再收集学校、专业、旅行兴趣、MBTI 或个人简介；这些字段由 `user-profile` 的个人资料完善页收集。

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
- **When** 访客提交少于 3 位、超过 20 位或含非字母数字下划线的用户名
- **Then** 系统返回 400 与 `INVALID_INPUT`

#### Scenario: 密码长度非法
- **When** 访客提交少于 8 位或超过 64 位的密码
- **Then** 系统返回 400 与 `INVALID_INPUT`

#### Scenario: 昵称缺失或超长
- **When** 访客提交空昵称或超过 20 字的昵称
- **Then** 系统返回 400 与 `INVALID_INPUT`
- **And** 不创建账号

#### Scenario: 忽略旧版注册资料字段
- **Given** 客户端仍在注册请求中携带学校、简介或兴趣字段
- **When** 访客提交注册
- **Then** 系统 SHALL 忽略这些字段
- **And** 资料的完整填写仍以个人资料完善页为准