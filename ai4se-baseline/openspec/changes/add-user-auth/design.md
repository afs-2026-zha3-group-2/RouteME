# 设计：add-user-auth

## 1. 数据模型

```sql
-- V9__add_user_credentials.sql
ALTER TABLE app_users ADD COLUMN username VARCHAR(20);
ALTER TABLE app_users ADD COLUMN password_hash VARCHAR(200);
CREATE UNIQUE INDEX ux_app_users_username ON app_users (username);

CREATE TABLE auth_sessions (
    token VARCHAR(80) NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    expires_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_users (id)
);
```

- 演示账户的 `username` / `password_hash` 为 `NULL`，只保留「演示身份」入口。
- 时间沿用现有 `VARCHAR(40)` + ISO-8601（`Instant.toString()`）约定。
- 唯一索引允许多个 `NULL`（SQLite/H2 默认 `NULLS DISTINCT`），不影响 3 个演示账户。

## 2. 后端分层

| 层 | 类 | 职责 |
|---|---|---|
| controller | `AuthController` | 4 个端点、`Bearer` 头解析、HTTP 状态映射 |
| request | `AuthRegisterRequest`、`AuthLoginRequest` | 与契约入参一一对应 |
| response | `AuthSessionResponse` | `{ token, expires_at, user }` |
| pojo | `AuthSession` | 会话领域对象（token、userId、createdAt、expiresAt） |
| service | `AuthService` | 注册、登录、按 token 取用户、退出 |
| service/impl | `AuthServiceImpl extends AbstractServiceImpl<AuthSessionMapper, AuthSessionEntity>` | 业务规则与事务；用户表通过 `UserMapper` 读写 |
| entity | `UserEntity`（加字段）、`AuthSessionEntity` | 表映射，实体不出 `service/impl` |
| mapper | `UserMapper`、`AuthSessionMapper` | `BaseMapper`，注解不写 SQL |
| utils | `PasswordUtils` | PBKDF2 散列/校验、token 生成 |

## 3. 业务规则

**注册**

1. 用户名 `trim` 后匹配 `^[A-Za-z0-9_]{3,20}$`，否则 400 `INVALID_INPUT`。
2. 密码长度 8–64，否则 400 `INVALID_INPUT`。
3. 昵称 `trim` 后 1–20 字；学校 ≤80；简介 ≤500；兴趣标签去空、去重、≤5 个、每个 ≤12 字。
4. 用户名已存在（大小写不敏感比较用 `LOWER(username)`）→ 409 `USERNAME_TAKEN`。
5. 新用户 id = `MAX(id)+1`（沿用 `nextId`），`avatar_initial` 取昵称首字；创建后立即签发会话。

**登录**

1. 查询 `LOWER(username) = LOWER(?)`；用户不存在或 `password_hash` 为空 → 401 `INVALID_CREDENTIALS`（不区分「用户不存在 / 密码错误」）。
2. `PasswordUtils.matches` 失败 → 401 `INVALID_CREDENTIALS`。
3. 成功后签发新会话；同一用户允许多个有效 token（多端登录）。

**会话**

- token：32 字节 `SecureRandom` → Base64URL（无填充），有效期 7 天。
- `requireUser(token)`：token 非空、存在、`expires_at > now`；否则 401 `SESSION_INVALID`。
- 退出：删除该 token 行（幂等：不存在也返回 204）。

## 4. 前端流程

```text
App 启动
  ├─ localStorage.routeme.authToken 存在
  │    └─ GET /api/auth/me → 成功：currentUserId = user.id
  │                          失败：清除 token，进入身份门
  └─ 否 → 身份门（AuthPanel：登录 / 注册 / 演示身份）
注册/登录成功 → 保存 token + currentUserId → 首页
退出登录 → POST /api/auth/logout（尽力而为）→ 清除本地 token 与 currentUserId
```

- `AuthPanel` 为受控表单，纯校验放在 `authForm.ts`（可在 Vitest 中单测）。
- 身份门保留 3 张演示卡片；演示身份不写 token。
- 顶栏身份面板：当前账号显示「已登录」，并提供「退出登录」；演示身份不显示退出。

## 5. 契约

```yaml
POST /auth/register  → 201 AuthSession
POST /auth/login     → 200 AuthSession
GET  /auth/me        → 200 DemoUser        (Authorization: Bearer)
POST /auth/logout    → 204                 (Authorization: Bearer)
```

错误码：`INVALID_INPUT` 400、`USERNAME_TAKEN` 409、`INVALID_CREDENTIALS` 401、`SESSION_INVALID` 401。

## 6. 测试策略

- `PasswordUtilsTest`：散列不等于明文、同一密码两次散列不同、正确/错误密码校验、token 长度与唯一性。
- `AuthControllerTest`（MockMvc + H2）：注册成功、重复用户名、非法用户名/密码、登录成功、错误密码、演示账户登录失败、`/me` 成功、无 token/伪造 token、退出后失效。
- `AuthMigrationSqliteTest`：临时 SQLite 执行全部迁移，断言两列与 `auth_sessions` 存在且演示账户凭据为空。
- 前端 `authForm.test.ts`：用户名/密码/昵称/标签校验与提交载荷。