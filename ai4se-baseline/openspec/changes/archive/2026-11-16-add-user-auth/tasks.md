# 任务：add-user-auth

- **依据：** [`spec.md`](specs/user-auth/spec.md)、[`design.md`](design.md)
- **约束：** 一条任务只落一层；不改动行程/申请/聊天/体验的业务规则；每条任务给出验证方式。

## 任务清单

### T1 [backend] 数据模型与迁移

- [x] `V9__add_user_credentials.sql`：`app_users` 增加 `username`、`password_hash`，建唯一索引；建 `auth_sessions`。
- [x] `UserEntity` 增加凭据字段；新增 `AuthSessionEntity`、`AuthSessionMapper`、`pojo/AuthSession`。

**验证：** `.\mvnw.cmd -B -o test`（含迁移测试）

### T2 [backend] 密码与会话工具

- [x] `utils/PasswordUtils`：PBKDF2-HMAC-SHA256（16 字节盐、120000 次迭代）、`hash`、`matches`、`newToken`。

**验证：** `PasswordUtilsTest`

### T3 [backend] 注册/登录/会话服务

- [x] `request/AuthRegisterRequest`、`request/AuthLoginRequest`、`response/AuthSessionResponse`。
- [x] `exception/UsernameTakenException`、`InvalidCredentialsException`、`SessionInvalidException`。
- [x] `service/AuthService` + `service/impl/AuthServiceImpl`：注册校验、唯一性、登录、签发/校验/删除 token。

**验证：** `AuthServiceTest` / `AuthControllerTest`

### T4 [backend] 认证端点

- [x] `controller/AuthController`：`/api/auth/register`、`/login`、`/me`、`/logout`。
- [x] `openapi.yaml` 新增路径与 schema，版本 0.6.0；`OpenApiTest` 断言新路径存在。

**验证：** `AuthControllerTest`、`npx @redocly/cli lint openapi.yaml`（2026-11-16：0 error / 7 warning；warning 为 5 条故意非法的 rejected 示例与 `/users`、`/users/demo` 无 4XX 响应，均为既有设计）

### T5 [frontend] 认证表单与会话恢复

- [x] `identity/authForm.ts` + 单测：用户名/密码/昵称校验、预设兴趣与上限常量、`addInterest`/`removeInterest`、请求载荷。
- [x] `identity/AuthPanel.tsx`：登录/注册切换、错误与提交态；兴趣卡片选择器（12 个预设 + 自定义标签，最多 5 个，自定义标签取消后保留可复选）。
- [x] `IdentityGate` 接入 AuthPanel，保留演示身份卡片。
- [x] `api.ts` 增加 `register`、`login`、`loadSession`、`logout`；`types.ts` 增加会话类型。

**验证：** `npm test`、`npm run build`

### T6 [frontend] 会话生命周期与顶栏

- [x] `App.tsx` 启动时按 `routeme.authToken` 恢复会话；无效则清除。
- [x] `AppShell` 身份面板显示登录态并提供退出登录；演示身份不显示退出。
- [x] 退出后回到身份门。

**验证：** 浏览器走查注册 → 刷新 → 退出 → 演示身份进入

### T7 [docs] 文档与收口

- [x] `docs/knowledge/architecture/README.md` 登记认证表与端点。
- [x] `docs/knowledge/_LOG.md` 追加记录。
- [x] `summary.md`（实现与验证结果）。

**验证：** 链接可打开；术语与 spec 一致

### T8 [verify] 全量验证

- [x] `cd RouteME/frontend; npm run build; npm test`（2026-11-16：9 个测试文件 / 73 个测试通过；`tsc --noEmit` + `vite build` 成功，仅 chunk >500 kB 警告）
- [x] `cd RouteME/backend; $env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"; .\mvnw.cmd -B -ntp test`（2026-11-16 归档日复跑：**154 项通过**，0 failure / 0 error / 0 skipped，`BUILD SUCCESS` 25.6s；含 Flyway V1–V9、`AuthControllerTest` 13、`PasswordUtilsTest` 3、`AuthMigrationSqliteTest`、`OpenApiTest`。设置 Windows 根证书信任库后 PKIX 问题消失，无需不安全 SSL 开关）
- [x] 浏览器：注册新账号、错误密码、刷新保持、退出、演示身份进入。（2026-11-16，mock API 走查；注册 201、刷新恢复会话、退出清 token、密码登录、切演示身份清 token）

**验证：** 前端命令全绿 + 后端 154 项全绿 + 浏览器检查记录（P5 归档前已补齐后端复跑）

## 覆盖场景

注册成功 / 重复用户名 / 非法用户名 / 非法密码 / 登录成功 / 错误密码 / 演示账户不可密码登录 / 会话恢复 / 会话失效 / 退出登录 / 演示身份保留。