# 本地验证报告：add-user-auth

- **日期：** 2026-11-16
- **范围：** 账号注册/登录/会话/退出（前端补充兴趣卡片选择器）的 P4 收口验证
- **环境：** Windows / Node 22 / Vite 8 / Vitest 5.1；后端目标环境 Spring Boot 4.1.2（Java 21）+ SQLite
- **说明：** 本轮验证在本机执行。首轮后端因 JVM 根证书未信任未能复跑、浏览器链路使用临时 mock API；归档日（2026-11-16）设置 `WINDOWS-ROOT` 信任库后后端复跑 154 项全绿，并在真实 Spring Boot + SQLite 实例上手动复验登录链路，结果已回填第 4、6 节。

## 1. 前端测试

```text
cd RouteME/frontend
npm test
```

```text
RUN  v5.1.0 D:/zha_training/RouteME/ai4se-baseline/RouteME/frontend

Test Files  9 passed (9)
     Tests  73 passed (73)
  Duration  510ms
```

- `identity/authForm.test.ts` 覆盖：完整注册表单、登录必填、注册专属规则、用户名/密码格式、昵称/学校、兴趣数量/长度/空值/重复、`addInterest` 的修剪/空值/重复/超长/第 6 个、`removeInterest`、预设标签上限、请求载荷与 `authErrorMessage`。
- 前端测试总数从 66 增至 73。

## 2. 前端构建

```text
cd RouteME/frontend
npm run build
```

```text
> tsc --noEmit && vite build
✓ 1520 modules transformed.
dist/index.html                   0.97 kB │ gzip:   0.66 kB
dist/assets/index-eKEHHiSw.css   37.55 kB │ gzip:   8.50 kB
dist/assets/index-Dadj52nG.js   866.53 kB │ gzip: 275.10 kB
✓ built in 841ms
```

- 构建成功；唯一告警是既有 bundle >500 kB（Ant Design 体积），与本次改动无关。

## 3. 契约

```text
cd RouteME
npx -y @redocly/cli lint openapi.yaml
```

```text
openapi.yaml: validated in 62ms
Woohoo! Your API description is valid. 🎉
You have 7 warnings.
```

- 0 error。7 条 warning：5 条为故意非法的 `rejected` 示例（`/trips` 的 stops/capacity、`/reports` 的 target_type、体验的 content/advice），2 条为 `/users` 与 `/users/demo` 未声明 4XX。
- `openapi.yaml` 本轮未修改，版本仍为 `0.6.0`。

## 4. 后端测试（归档日复跑，通过）

首次尝试 `.\mvnw.cmd -B -o test` 失败：

```text
[FATAL] Non-resolvable parent POM for routeme:routeme-backend:0.0.1-SNAPSHOT:
The following artifacts could not be resolved:
org.springframework.boot:spring-boot-starter-parent:pom:4.1.2 (absent):
Could not transfer artifact ... from/to central (https://repo.maven.apache.org/maven2):
(certificate_unknown) PKIX path building failed ...
unable to find valid certification path to requested target
```

- 根因是本机 JVM 未信任企业/系统根证书，而非依赖缺失；设置 Windows 根证书信任库后即可解析。
- 归档日复跑命令与结果（2026-11-16）：

```text
cd RouteME/backend
$env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"
.\mvnw.cmd -B -ntp test
```

```text
[INFO] Tests run: 154, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  25.619 s
```

- Flyway V1–V9 在 H2 与临时 SQLite 上均迁移成功；认证相关用例含 `AuthControllerTest` 13、`PasswordUtilsTest` 3、`AuthMigrationSqliteTest`、`OpenApiTest` 5。
- 早先 `-Dmaven.wagon.http.ssl.insecure=true` 等不安全开关无效且不应使用；改信任库是正确做法。
- 实现提交 `f5e984c` 的 `HANDOFF.md` 历史记录 151 项，本轮 154 项为归档日实测结果。

## 5. 浏览器走查（前端 5173 + 临时 mock API 8080）

| 步骤 | 结果 |
|---|---|
| 注册 | 填 `taguser` / `routeme-demo` / `标签同学` / `大三 · 视觉传达`，选 `摄影`、`咖啡`，添加自定义 `看展`；提交后 `POST /api/auth/register` → **201**，请求体 `interests` 为 `["看展","摄影","咖啡"]` |
| 注册后落地 | 进入首页，身份面板显示「标签同学」，`routeme.authToken` 与 `routeme.currentUserId=4` 写入 |
| 刷新恢复 | reload 后仍为登录态，身份面板显示「已登录」与「退出登录」 |
| 退出登录 | 点击「退出登录」→ `authToken` / `currentUserId` 清除，回到身份门 |
| 密码登录 | `taguser` / `routeme-demo` → 登录成功，首页与「已登录」状态恢复 |
| 切换演示身份 | 选择 `林见夏` → `authToken` 清除，身份面板不再显示「退出登录」 |
| 自定义标签取消 | `看展` 取消后仍保留为未选卡片；再次点击可复选，计数回到 1/5 |
| 选满 5 个 | 计数 `已选 5/5`；自定义输入与「添加」禁用，占位文案「已选满 5 个」；7 张未选卡片淡化 |
| 点击第 6 个 | 计数保持 5/5，显示「最多选择 5 个兴趣标签，请先取消一个」，不新增选择 |

- mock API 只实现本轮需要的 `/api/users`、`/api/users/demo`、`/api/auth/*` 与空列表；**不能替代真实后端联调**。

## 6. 未执行

- Playwright E2E：本次未新增/修改 E2E 用例，未运行。
- 真实 Spring Boot + SQLite 的注册/登录/刷新/退出已在本机起服后手动复验（`localhost:8080`），但未固化为自动化 E2E。

## 结论

前端构建与 73 项测试全绿，契约 0 error；后端在设置 Windows 根证书信任库后复跑 **154 项全绿**（`BUILD SUCCESS` 25.6s）。浏览器链路（注册 201、刷新恢复、退出清 token、密码登录、演示身份隔离、兴趣标签上限与自定义标签保留）按规格工作，本轮无遗留验证缺口。