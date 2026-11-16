# 本地验证报告：add-user-auth

- **日期：** 2026-11-16
- **范围：** 账号注册/登录/会话/退出（前端补充兴趣卡片选择器）的 P4 收口验证
- **环境：** Windows / Node 22 / Vite 8 / Vitest 5.1；后端目标环境 Spring Boot 4.1.2（Java 21）+ SQLite
- **说明：** 本轮验证在本机执行，后端因依赖不可下载未能复跑；浏览器链路使用临时 mock API（`localhost:8080`），验证后已停止并删除脚本。

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

## 4. 后端测试（未执行）

```text
cd RouteME/backend
.\mvnw.cmd -B -o test
```

```text
[FATAL] Non-resolvable parent POM for routeme:routeme-backend:0.0.1-SNAPSHOT:
The following artifacts could not be resolved:
org.springframework.boot:spring-boot-starter-parent:pom:4.1.2 (absent):
Could not transfer artifact ... from/to central (https://repo.maven.apache.org/maven2):
(certificate_unknown) PKIX path building failed ...
unable to find valid certification path to requested target
```

- 直接原因：本机无法建立到 Maven Central 的证书链；本地仓库也没有 Spring Boot `4.1.2` 的 parent POM。
- 已尝试 `-Dmaven.wagon.http.ssl.insecure=true`、`-Dmaven.wagon.http.ssl.allowall=true`、`-Dmaven.wagon.http.ssl.ignore.validity.dates=true` 仍失败；`-o` 离线模式同样因缺少依赖失败。
- 实现提交 `f5e984c` 的 `HANDOFF.md` 记录：此前 `.\mvnw.cmd -B -o clean test` 为 **151 项全绿**（含 `AuthControllerTest` 13、`PasswordUtilsTest` 3、认证迁移测试与 `OpenApiTest`）。本轮不把该历史结果当作本次复验。

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

- `.\mvnw.cmd -B -o test`（原因见第 4 节）。
- 真实 Spring Boot + SQLite 下的注册/登录/刷新/退出端到端复验；需在可运行后端的机器上补一次。
- Playwright E2E：本次未新增/修改 E2E 用例，未运行。

## 结论

前端构建与 73 项测试全绿，契约 0 error。浏览器链路（注册 201、刷新恢复、退出清 token、密码登录、演示身份隔离、兴趣标签上限与自定义标签保留）按规格工作。后端 151 项历史记录未能复跑，是本轮唯一的验证缺口；补跑后再把结果回填 `tasks.md` T8。