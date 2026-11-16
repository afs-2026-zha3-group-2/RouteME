# 交接说明：add-user-auth

> 状态：**部分实现（后端完成度高于前端）**。原作者已按用户要求停止推进，后续由接手人继续。
> 最后更新：2026-11-16

## 1. 已完成并可验证

### 后端（全部完成，`.\mvnw.cmd -B -o clean test` → 151 项全绿）

| 项 | 落点 |
|---|---|
| 迁移 | `backend/src/main/resources/db/migration/V9__add_user_credentials.sql`（`app_users` 加 `username` / `password_hash` + 唯一索引；新建 `auth_sessions`） |
| 常量 | `constant/AuthConstant.java`（用户名正则、密码 8–64、昵称/学校/简介/标签上限、会话 7 天、token 32 字节） |
| 密码 | `utils/PasswordUtils.java`（PBKDF2-HMAC-SHA256、16 字节盐、120000 次迭代、`pbkdf2$iter$salt$hash`、常量时间比较、Base64URL 无填充 token） |
| 领域对象 | `pojo/UserAccount.java`、`pojo/AuthSession.java` |
| 实体/mapper | `entity/AuthSessionEntity.java`、`mapper/AuthSessionMapper.java`；`entity/UserEntity.java` 增加凭据字段与 `toUserAccount()` |
| 出入参 | `request/AuthRegisterRequest.java`、`request/AuthLoginRequest.java`、`response/AuthSessionResponse.java` |
| 异常 | `UsernameTakenException`(409)、`InvalidCredentialsException`(401)、`SessionInvalidException`(401) |
| 服务 | `service/AuthService.java` + `service/impl/AuthServiceImpl.java` |
| 端点 | `controller/AuthController.java`：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`POST /api/auth/logout` |
| 演示身份隔离 | `GET /api/users/demo`（只返回无用户名的 3 个预设账户）；`DemoUserService.findAllDemo()` |
| 契约 | `openapi.yaml` 升至 **0.6.0**：4 个认证路径、`AuthRegisterRequest` / `AuthLoginRequest` / `AuthSession` schema、`BearerToken` 参数、错误码新增 `USERNAME_TAKEN` / `INVALID_CREDENTIALS` / `SESSION_INVALID`；目的地由固定枚举改为 `maxLength: 40` 自由文本 |
| 测试 | `controller/AuthControllerTest`(13)、`service/impl/…`、`utils/PasswordUtilsTest`(3)、`migration/AuthMigrationSqliteTest`、`OpenApiTest#authContractDeclared` |

已覆盖行为：注册成功即登录、用户名大小写不敏感去重、用户名/密码/标签校验、错误密码、演示账户不能密码登录、有效 token 读当前用户、缺失/伪造 token、退出后 token 失效、注册账号不出现在演示列表。

### 前端（基本完成，`npm run build` + `npm test` → 66 项通过）

| 项 | 落点 |
|---|---|
| 纯函数 | `identity/authForm.ts`（校验、`parseInterests`、`toRegisterRequest`、`authErrorMessage`） |
| 单测 | `identity/authForm.test.ts`（10 例） |
| 表单 | `identity/AuthPanel.tsx`（登录/注册切换、错误与提交态） |
| 身份门 | `identity/IdentityGate.tsx` 嵌入 AuthPanel，保留 3 张演示卡片 |
| 请求层 | `api.ts`：`loadDemoUsers`、`registerAccount`、`loginAccount`、`loadSessionUser`、`logoutAccount`；`types.ts`：`AuthSession`、`AuthRegisterRequest` |
| 会话生命周期 | `App.tsx`：`routeme.authToken` 恢复会话、失败即清除、`handleAuthenticated`、`logout`、切换到演示身份时结束会话 |
| 顶栏 | `shell/AppShell.tsx`：登录态展示 `已登录` + 「退出登录」 |
| 样式 | `styles.css`：`.gate-auth` / `.auth-panel` / `.auth-tabs` / `.id-current` / `.id-logout` / `.id-panel-label` / `.gate-divider` |
| 文案 | `i18n/tripMessages.ts`：`auth*` 约 25 条 |

**注意**：本机开发环境的后端需重启后 `V9` 迁移才会生效（`SqlLite/routeme.db` 已存在旧表结构）。

## 2. 尚未完成 / 接手后应先做的事

1. **浏览器端到端走查未做**（本轮只跑通单测与构建）。请按 `tasks.md` T6 手动验证：注册 → 刷新保持登录 → 退出 → 演示身份进入 → 用注册账号发布行程。
2. **业务端点仍未 token 化**：`/trips`、`/applications`、`/messages` 等继续信任 `X-User-Id`（见 proposal「残余风险」）。要把 `X-User-Id` 换成 `Authorization` 解析，建议新增拦截器 + `ActorArgumentResolver`，并同步改 `api.ts` 的 `request()`。
3. **`tasks.md` 的复选框尚未勾选**（原作者未回填）。请按实际完成情况回填，尤其是 T1–T5 已完成项。
4. **`summary.md` 未写**。归档前需要补：实现摘要、`mvnw`/`npm` 真实输出、浏览器走查记录、残余风险。
5. **知识库未登记**：`docs/knowledge/architecture/README.md` 需补 `auth_sessions` 表与 4 个端点；`docs/knowledge/_LOG.md` 需追加一行（建议 id：`kb.routeme.user-auth`）。
6. **`openapi.yaml` 的 `redocly lint` 未跑**：`cd RouteME; npx @redocly/cli lint openapi.yaml`，确认 0 error。
7. **CI/CD**：提交后查看 GitHub Actions；CD 会发 `build-<sha>` release。

## 3. 接手注意（易踩的坑）

- `AuthController#register/login` 内部复用 `authService.requireUser(token)` 取用户资料；若改动会话签发顺序要同步改这两处。
- `AuthServiceImpl.login` 对「用户不存在 / 无密码凭据 / 密码错误」统一抛 `INVALID_CREDENTIALS`，**不要**为排障拆成不同错误码（会泄露账号是否存在）。
- 演示账户的 `username` / `password_hash` 必须保持 `NULL`：`findAllDemo()` 依赖 `username IS NULL` 判定，若给演示账户补用户名，身份门会少卡片。
- 密码散列迭代次数改大时，`PasswordUtilsTest` 会变慢（当前 120000 ≈ 0.4s/3 例）；如需提速可只在测试里降低迭代数，但**不要**改生产默认值。
- 前端 `authToken` 是「登录态」唯一来源；`currentUserId` 仍单独存 `localStorage`。切换到演示身份时必须同时清 token，否则顶栏会误显示「已登录」。

## 4. 交接相关文件

- 提案：`proposal.md`
- 设计：`design.md`（数据模型、业务规则、前端流程、测试策略）
- 任务与覆盖场景：`tasks.md`
- 增量规格：`specs/user-auth/spec.md`、`specs/trip-plans/spec.md`
- 验证命令：`ai4se-baseline/docs/feedback/verification-commands.md`

## 5. 建议的下一步执行顺序

```text
1) 重启后端，确认 V9 迁移成功
2) 浏览器走查注册/登录/刷新/退出/演示身份
3) 回填 tasks.md 与写 summary.md
4) 补 docs/knowledge 两处登记
5) npx @redocly/cli lint openapi.yaml
6) 归档到 openspec/changes/archive/YYYY-MM-DD-add-user-auth/
```