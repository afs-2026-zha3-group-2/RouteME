# 变更提案：add-user-auth

- **需求来源：** 用户指令「把注册和登录功能加上」｜ **能力：** `user-auth`（ADDED）、`trip-plans`（MODIFIED）
- **规模：** M（后端新增 1 张表 + 4 个端点，前端新增登录/注册页与会话恢复；不动行程、申请、聊天、体验的既有业务规则）
- **规则：** `@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:sdd-artifacts`

## 问题

当前身份完全来自演示账户（`GET /api/users` + `X-User-Id`），任何人都能通过切换身份执行操作，注册用户无法带着自己的资料进入系统。产品需要一条真实可用的入口：用户能注册自己的账号、用用户名与密码登录、刷新页面后保持登录、主动退出；同时保留 3 个演示账户，保证答辩与联调不依赖注册数据。

## 范围

**In scope**

- 账号凭据：`app_users` 增加 `username`、`password_hash` 两列（演示账户保持为空，不能密码登录）。
- 注册：用户名（3–20 位字母/数字/下划线，唯一）、密码（8–64 位）、昵称（1–20 字）、学校、简介、兴趣标签（最多 5 个）→ 创建用户并直接登录。
- 登录：用户名 + 密码；密码以 PBKDF2-HMAC-SHA256（随机盐、12 万次迭代）存储与校验。
- 会话：登录/注册签发不透明随机 token（7 天有效），存 `auth_sessions` 表；`Authorization: Bearer <token>` 可读取当前用户与退出。
- 前端：身份门新增「登录 / 注册」表单，保留演示身份卡片；顶栏身份菜单显示当前账号并提供「退出登录」；刷新后按本地 token 恢复会话。
- 契约：`openapi.yaml` 新增 `/auth/register`、`/auth/login`、`/auth/me`、`/auth/logout` 与 `AuthSession` 等 schema，版本升至 0.6.0。

**Out of scope**

- 把全部业务端点从 `X-User-Id` 切换到 token 鉴权（本轮仅新增认证入口；见「残余风险」）。
- 找回密码、邮箱/手机验证、验证码、第三方登录、记住我时长选择、账号注销。
- 头像上传（继续使用昵称首字生成头像）、实名认证、权限角色。

## 影响面

| 位置 | 改动 |
|---|---|
| `backend/src/main/resources/db/migration/V9__add_user_credentials.sql` | `app_users` 加两列与唯一索引；新建 `auth_sessions` |
| `backend/.../entity/UserEntity.java`、`entity/AuthSessionEntity.java` | 凭据字段与会话行映射 |
| `backend/.../mapper/UserMapper.java`、`mapper/AuthSessionMapper.java` | 新增会话 mapper |
| `backend/.../pojo/AuthSession.java`、`request/AuthRegisterRequest.java`、`request/AuthLoginRequest.java`、`response/AuthSessionResponse.java` | 领域对象与契约出入参 |
| `backend/.../service/AuthService.java`、`service/impl/AuthServiceImpl.java`、`utils/PasswordUtils.java` | 注册/登录/会话校验与密码散列 |
| `backend/.../controller/AuthController.java`、`response/DemoUserResponse.java` | 4 个端点；响应复用用户资料 |
| `backend/.../exception/` | `UsernameTakenException`、`InvalidCredentialsException`、`SessionInvalidException` |
| `frontend/src/identity/` | 新增 `AuthPanel.tsx`、`authForm.ts`（纯函数 + 单测）；`IdentityGate` 接入 |
| `frontend/src/api.ts`、`types.ts`、`App.tsx`、`shell/AppShell.tsx` | 认证请求、会话恢复、顶栏退出登录 |
| `openapi.yaml`、`docs/knowledge/` | 契约与知识库登记 |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 密码存储 | PBKDF2-HMAC-SHA256，16 字节盐，120000 次迭代，格式 `pbkdf2$iter$salt$hash` | JDK 自带、无新依赖；避免明文与快速哈希 |
| 会话形态 | 数据库不透明 token（7 天），非 JWT | 可即时退出、实现简单、无需签名密钥管理 |
| 演示账户 | 保留，`username`/`password_hash` 为空 | 答辩与自动化测试不依赖注册；空凭据无法登录 |
| 业务鉴权 | 本轮仍用 `X-User-Id`，前端只把 token 用于身份恢复 | 控制改动面；token 化业务端点另开 change |

## 验收信号

1. `POST /api/auth/register` 成功返回 201 与会话；重复用户名返回 409 `USERNAME_TAKEN`。
2. `POST /api/auth/login` 正确密码返回 200；错误密码返回 401 `INVALID_CREDENTIALS`；演示账户不能密码登录。
3. `GET /api/auth/me` 携带有效 token 返回本人；缺失/过期/伪造 token 返回 401 `SESSION_INVALID`。
4. `POST /api/auth/logout` 后同一 token 再访问 `/auth/me` 返回 401。
5. 前端：注册后自动进入首页且显示新昵称；刷新仍保持登录；退出后回到身份门；演示身份仍可直接进入。
6. `npm run build`、`npm test`、`.\mvnw.cmd -B -o test` 全绿；`npx @redocly/cli lint openapi.yaml` 无 error。

## 残余风险

| 风险 | 处理 |
|---|---|
| 业务端点仍信任 `X-User-Id`，token 可被绕过 | 本轮明确记录；下一步 change 用拦截器把 `X-User-Id` 换成 token 解析 |
| 用户名唯一性在并发注册下依赖数据库唯一索引 | 唯一索引兜底；并发冲突映射为 `USERNAME_TAKEN` 由后续迭代补齐 |
| 无密码找回与验证码 | 与 MVP 边界一致；生产化前必须补齐 |