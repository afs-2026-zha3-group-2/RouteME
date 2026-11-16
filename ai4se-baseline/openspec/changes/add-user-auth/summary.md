# Change summary — add-user-auth

## Intent

REQ-004：把「输入一个昵称就能用」的演示身份，升级为可注册、可登录、可退出的真实账号体系；密码只存加盐散列，会话用不透明 Bearer token，刷新后能恢复登录态，同时保留 3 个只读演示身份供评审直接体验。

## What shipped

- **契约**：`openapi.yaml` 升至 `0.6.0`，新增 `POST /api/auth/register`、`POST /api/auth/login`、`GET /api/auth/me`、`POST /api/auth/logout`，以及 `AuthRegisterRequest` / `AuthLoginRequest` / `AuthSession` schema 与 `BearerToken` 安全方案；错误码新增 `USERNAME_TAKEN`（409）、`INVALID_CREDENTIALS`（401）、`SESSION_INVALID`（401）。
- **数据**：`V9__add_user_credentials.sql` 给 `app_users` 增加 `username` / `password_hash` 与唯一索引，新建 `auth_sessions`（token 主键、`user_id` 外键、`created_at` / `expires_at`）。演示账户的两列保持 `NULL`，因此不能走密码登录。
- **后端**：`constant/AuthConstant`（用户名 3–20 位、密码 8–64 位、昵称 20、学校 80、简介 500、兴趣 5×12、会话 7 天、token 32 字节）；`utils/PasswordUtils`（PBKDF2-HMAC-SHA256、16 字节盐、120000 次迭代、`pbkdf2$iter$salt$hash` 格式、Base64URL token）；`pojo/UserAccount`、`pojo/AuthSession`、`entity/AuthSessionEntity`、`mapper/AuthSessionMapper`；`AuthService` / `AuthServiceImpl` 负责注册校验、唯一性、登录、签发/校验/删除 token；`AuthController` 暴露 4 个端点（注册 201、登录 200、`me` 200、退出 204）；3 个异常子类接入 `GlobalExceptionHandler`。演示用户列表改为只返回 `username IS NULL` 的记录，注册用户不会混入演示身份卡片。
- **前端**：`identity/authForm.ts` 集中表单校验与请求载荷；`identity/AuthPanel.tsx` 提供登录/注册切换、字段级与提交级错误、提交态；`IdentityGate` 接入表单并保留演示身份卡片；`api.ts` 新增 `registerAccount` / `loginAccount` / `loadSessionUser` / `logoutAccount`；`App.tsx` 启动时按 `routeme.authToken` 恢复会话（无效即清除），退出后回到身份门；`AppShell` 身份面板对真实账号显示「已登录」与「退出登录」，演示身份不显示退出；切到演示身份会尽量注销旧 token。
- **兴趣标签选择器（本轮补充）**：注册表单的兴趣从逗号分隔文本框改为卡片选择器。12 个预设标签（摄影、海边、美食、徒步、露营、展览、夜景、骑行、咖啡、音乐、建筑、城市漫步）与用户自定义标签共用同一网格；自定义标签与预设样式一致（无「自定」角标），取消选择后仍保留为未选卡片，方便误点后复选。上限 5 个：达到 5 个后自定义输入与「添加」按钮禁用，未选卡片淡化；继续点未选卡片会显示「最多选择 5 个兴趣标签，请先取消一个」。计数以 `已选 n/5` 展示，只有已选标签进入 `interests`。
- **测试**：后端实现提交 `f5e984c` 时记录 151 项全绿（`AuthControllerTest` 13、`PasswordUtilsTest` 3、认证服务/迁移/OpenApi 契约）；前端本轮为 9 个测试文件 / 73 个测试（`authForm.test.ts` 覆盖 `addInterest` / `removeInterest`、空值/重复/超长/第 6 个、预设标签上限与请求载荷）。
- **知识库**：`docs/knowledge/architecture/README.md` 补 V9、契约 0.6.0、`AuthService`、`auth_sessions` 与认证端点；`docs/knowledge/_LOG.md` 追加 `kb.routeme.user-auth`。

## Verify highlights

- **前端（2026-11-16 实测）**：`npm test` → 9 files / 73 tests passed；`npm run build` → `tsc --noEmit` + `vite build` 成功（1520 modules，仅 chunk >500 kB 警告）。
- **浏览器走查（2026-11-16，Vite 5173 + 本地 mock API 8080）**：
  - 注册 `taguser`（昵称「标签同学」），选 `摄影`、`咖啡` 并添加自定义 `看展`；点击「注册并进入」→ `POST /api/auth/register` 201，会话落地首页，请求 `interests` 为 `["看展","摄影","咖啡"]`。
  - 刷新后由 token 恢复会话；身份面板显示「已登录」+「退出登录」。
  - 退出登录：`authToken` / `currentUserId` 清除并回到身份门。
  - 密码登录成功，面板重新显示登录态；切换演示身份 `林见夏` 后 `authToken` 清除且不再显示退出。
  - 兴趣选择器：自定义 `看展` 取消后卡片仍在，可再次选中；选满 5 个后计数为 `已选 5/5`、自定义输入与「添加」禁用、7 张未选卡片淡化，点第 6 张出现上限提示且选择数不变。
- **后端**：本轮**未复跑**。`.\mvnw.cmd -B -o test` 在本机失败于 Maven Central 证书链（`PKIX path building failed`），本地仓库也缺 Spring Boot `4.1.2` 依赖；此前实现提交 `f5e984c` 的记录为 `.\mvnw.cmd -B -o clean test` 151 项全绿。
- **契约**：`openapi.yaml` 本轮未改动，仍是实现提交时的 `0.6.0`；2026-11-16 复跑 `npx @redocly/cli lint openapi.yaml` → 有效，0 error / 7 warning（5 条为故意非法的 `rejected` 示例，2 条为 `/users`、`/users/demo` 未声明 4XX；均为既有取舍）。

## Residual risks

| 风险 | 处理 |
|---|---|
| 后端测试未在本轮环境复跑 | 需在证书可用或依赖已缓存的机器上补跑 `.\mvnw.cmd -B -o test`，结果补记到 `tasks.md` T8 |
| 浏览器走查使用临时 mock API | 真实 Spring Boot + SQLite 的注册/登录/退出链路仍需一次端到端复验 |
| `auth_sessions` 过期记录无主动清理 | 校验时按 `expires_at` 拒绝；量级变大后再加定时清理 |
| 会话 token 存 `localStorage`，无 httpOnly Cookie | MVP 取舍；XSS 风险随前端依赖收敛，后续安全 change 再评估 |
| 其余业务端点仍用 `X-User-Id` | 认证先覆盖身份入口；端点鉴权替换留给后续 change |
| 前端 bundle >500 kB | 既有 Ant Design 体积问题，与本次改动无关，记录待拆包 |
| 契约 7 条 Redocly warning | 5 条解释 400 行为的故意非法示例 + 2 条演示端点未声明 4XX；保留以说明契约边界 |

## Links

- Spec：`openspec/changes/add-user-auth/specs/user-auth/spec.md`
- Design / Tasks：同目录 `design.md`、`tasks.md`
- 实现提交：`f5e984c`（feat(routeme): add account register and login with session handoff for add-user-auth）
- 验证报告：`docs/ai4se-plugins/20261116-101702-local-verify-report.md`
- 后续补充：本轮 `AuthPanel` 兴趣卡片选择器、`authForm.ts` 预设/自定义标签模型与文案（未提交）