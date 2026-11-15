> ⚠️ **已作废 / OBSOLETE（2026-11-15）** — 本文运行说明（`MailGateway`、`ReviewReminderService`、`staffing.mv.db`、H2 Console、`V5`/`V6` 演示数据、travel-review、review-reminders 扫描等）针对**已移除的 "staffing" 应用**，与当前唯一应用 **RouteME 路觅** 无关。RouteME 的运维说明尚未在此登记。
> 保留仅作历史参考，**不得作为 RouteME 的运维证据**。`_LOG.md` 与 `rules/` 不受影响。

# Operations knowledge

Ops, monitoring, incident, and release notes.

## 通知与复审提醒运行说明

- 邮件发送通过 `MailGateway` 适配：默认 `LoggingMailGateway` 只记录收件人与摘要，不连接真实 SMTP；接入真实邮件服务时替换该 Bean。
- 发送异常由 `NotificationService.record` 捕获并记为 `failed`，业务事务不回滚；失败记录在 `GET /api/notifications` 可见，并可用 `POST /api/notifications/{id}/retry` 重试。
- 复审提醒由 `ReviewReminderService` 扫描：复审到期日取自 `travel_reviewed_at + 6 个月`，到期前 30 天向“全体资源协调员”发送一封；同一候选人同一到期日只发一封（`payload` 中的候选人 + 到期日去重）。
- 演示数据 `V5` 预置一条失败的复审提醒（吴迪，到期日 2026-11-07），用于展示失败列表与重试；`V6` 回填该候选人的复审日期，使其状态推导为过期。
- 复审完成入口：`POST /api/candidates/{id}/travel-review`，将最近复审日期置为当天并顺延六个月。
- 演示环境不提供定时任务；提醒扫描由协调员在通知页手动触发（`POST /api/notifications/review-reminders/scan`），生产环境接入调度器时复用同一服务方法。

## 前端工具链基线

`frontend/` 的依赖版本以本节为准，升级前先核对本表。

| 依赖 | 版本基线 | 说明 |
|---|---|---|
| `vite` | ^8.3.5（实测 8.3.8） | Vite 8 内置 Rolldown，**不再依赖 esbuild** |
| `@vitejs/plugin-react` | ^6.3.0 | 与 Vite 8 配套 |
| `vitest` | ^5.1.0 | 配置文件从 `vitest/config` 导入 `defineConfig` |
| `typescript` | ^5.9 | `npm run build` 先执行 `tsc --noEmit` |
| `react` / `react-dom` | ^19 | — |

- 配置文件固定 `frontend/vite.config.ts`，不再使用 `vite.config.mjs`。
- `/api` 代理指向 `http://localhost:8080`；后端未启动时出现 `ECONNREFUSED` 属正常。
- 现有 5 个测试文件均为纯函数测试，**不安装** `jsdom` 与 `@testing-library`；新增 DOM 测试时再补。

### 已知故障：`Cannot read directory ... Access is denied`

**症状**

```text
X [ERROR] Cannot read directory "../../../../../../..": Access is denied.
X [ERROR] Could not resolve "...\frontend\vite.config.ts"
failed to load config from ...\frontend\vite.config.ts
```

**根因**：`vite` 7.x 依赖 `esbuild`；本机 Windows 下 esbuild 0.28.x 解析配置文件时会向上遍历到盘符根目录被拒，导致连已存在的配置文件都无法加载。Vite 8 改用 Rolldown，不经过 esbuild，因此不会触发。

**排查顺序**

1. 读取 `node_modules/vite/package.json` 确认主版本为 8，并检查 `node_modules/esbuild` **不存在**。
2. 若 `esbuild` 仍在，说明依赖树仍是 Vite 7：把 `package.json` 的 `vite`、`@vitejs/plugin-react`、`vitest` 对齐上表后执行 `npm install`（会移除 esbuild 及旧依赖）。
3. 确认配置文件为 `vite.config.ts`，且从 `vitest/config` 导入 `defineConfig`。
4. 三项验证：`npm run build`、`npm test`、`npm run dev`；dev 启动后访问 `http://localhost:5173/` 应为 HTTP 200。

**不要**回退到 Vite 7 + esbuild 组合。“依赖装齐、版本自洽”不代表可运行，必须以上述三项验证为准。

## RouteME 后端运行与验证

```text
Windows     cd RouteME/backend; .\mvnw.cmd -B verify          # 全量测试（H2 + SQLite）
Windows     cd RouteME/backend; .\mvnw.cmd spring-boot:run    # 启动 8080
其他平台     ./mvnw -B verify / ./mvnw spring-boot:run
```

- 数据文件 `RouteME/SqlLite/routeme.db`（默认 `jdbc:sqlite:../SqlLite/routeme.db`，可用 `SPRING_DATASOURCE_URL` 覆盖；容器内为 `/data/routeme.db`）；Flyway 启动时应用 `V1`–`V8`（greetings、app_users、trip_plans、trip_applications、chat_messages、reports、trip_experiences），迁移只增不改；重置演示数据时停止后端并删除该文件后重启。
- 冒烟：`GET /api/greeting`、`GET /api/users`、`GET /api/trips`、`GET /api/experiences`（其余 `/trips*`、`/me/*`、`/matches*` 需 `X-User-Id`，1–3 为演示账户）。
- 契约校验：`cd RouteME; npx @redocly/cli lint openapi.yaml`（0 error），或 `cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`。
- 前端：`cd RouteME/frontend; npm run build; npm test`。
- 端到端：后端与前端启动后 `cd RouteME/e2e; npx playwright test`（11 个用例；本地门禁，CI 不跑 Playwright）。

## CI / CD

```text
CI  .github/workflows/ci.yml   push/PR：backend verify、frontend build+test、Docker 镜像构建校验
CD  .github/workflows/cd.yml   CI 在 main 全绿后：打包 jar + dist 工件，触发 Render deploy hook
```

- **CI（已跑通）**：三个 job —— `backend`（JDK 21，`./mvnw -B -ntp verify`）、`frontend`（Node 22 + npm 11，`npm install` + `build` + `test`）、`docker`（Buildx 构建 `ai4se-baseline/RouteME/Dockerfile`，不推送，验证部署产物可构建）。
- **CD（Render，单容器）**：`render.yaml` 定义 web 服务 `routeme`（`runtime: docker`，health check `/api/greeting`，`autoDeploy: false`）。镜像内前端 `dist` 打进 Spring Boot `static/`，同域提供页面与 `/api`，SQLite 落在 `/data/routeme.db`（镜像声明 `VOLUME /data`；免费实例无持久盘，重启即回到种子数据）。
- **账号与凭证**：Render 账号、Blueprint 创建与 Deploy Hook 由仓库所有者本人完成（邮箱验证与账号所有权），步骤见 [RouteME/README.md](../../RouteME/README.md#cdrender需要你完成账号与密钥)；密钥只放 GitHub Secrets，不落仓库。
- **启用步骤**：Render → New → Blueprint → 选本仓库（读取 `render.yaml`）→ 创建服务 → Settings → Deploy Hook → 复制 URL → GitHub 仓库 Settings → Secrets and variables → Actions → 新增 `RENDER_DEPLOY_HOOK_URL`。未配置该 secret 时 CD 只打包并给出 warning，不判失败。
- **触发顺序**：push `main` → CI 全绿 → CD `workflow_run` 打包并 `curl -X POST $RENDER_DEPLOY_HOOK_URL` → Render 按同一 Dockerfile 重建上线。`autoDeploy: false` 保证 Render 不会抢在 CI 之前发布未验证提交。
- **回滚**：Render → Deploys → 选上一成功部署 → Redeploy；数据库为临时盘，回滚不涉及数据迁移。

## 本地启动与数据基线

```text
后端   cd backend; .\mvnw.cmd spring-boot:run     # http://localhost:8080
前端   cd frontend; npm run dev                    # http://localhost:5173，/api 代理到 8080
```

- H2 Console：`http://localhost:8080/h2-console`，JDBC URL `jdbc:h2:file:./data/staffing;MODE=PostgreSQL;AUTO_SERVER=TRUE`，用户名 `sa`、密码留空；`web-allow-others=false`，仅本机可访问。
- `V8__reset_demo_data.sql` 在首次升级时清空业务表并重灌演示基线，保留 `app_users`；基线内容与 E2E 依赖见 [domain/README.md](../domain/README.md#demo-data-baseline)。
- 重置演示数据：停止后端，删除 `backend/data/staffing.mv.db`（及 `staffing.lock.db` / `staffing.trace.db`），重新启动即从 `V1` 全量迁移到 `V8`。删除前先备份，文件库是唯一持久化副本。

## 人员数据交换运行说明

契约字段、状态码与分页参数以 [interfaces/README.md](../interfaces/README.md#候选池分页与导入导出契约) 为准；本节只记运行侧约束。

- 编码约定：CSV 一律 UTF-8 + BOM（Excel 直接打开不乱码），行分隔符 CRLF；XLSX 一律单 sheet、首行加粗并冻结。导出列与导入模板同源。
- 限制与注意：multipart 使用 Spring 默认 1MB 上限（约 5,000 行 CSV）。导入/导出不触发通知、名单只读等接口级约束见 [interfaces/README.md](../interfaces/README.md#候选池分页与导入导出契约)。
- 演示文件：候选池页面「批量导入」选择 `records/data/candidates-valid.csv` 或 `.xlsx`（8 行正常数据）；`candidates-invalid.csv` / `.xlsx` 含重复编号、非法职级与缺失日期，用于展示失败清单。文件中的编号为 `DEMO-*` 演示值，不含真实 PII。

## 前端交互约定

- 导航按 `需求 / 人才 / 结果 / 洞察` 四组呈现（`AppShell` 的 `NAV_GROUPS`），当前项带 `aria-current="page"`；原型草稿已随 `optimize-ui-experience` 删除，仓库内不再保留 `docs/prototypes/`。
- 破坏性操作（停用候选人、关闭需求、撤回推荐）统一走 `ConfirmDialog`：说明后果、支持 `busy` 禁用，取消不调用后端；释放与申请释放沿用带原因的 `Modal`。
- 加载态用 `Skeleton`、空态用 `EmptyState`、分页用 `Pager`（页大小 20 / 50 / 100，纯函数在 `utils/pager.ts`）；Toast 分 `success / warning / error` 三档，导入存在失败行时用 `warning`。
- `Modal` 打开时聚焦对话框、Tab 在内部循环、卸载后焦点回到触发元素，`Escape` 关闭；断点与动效取值以 [architecture/README.md](../architecture/README.md#设计令牌对照表) 的令牌表为准，`prefers-reduced-motion` 下过渡降至 0。

## RouteME 本地启动与验证

```text
后端   cd RouteME/backend; .\mvnw.cmd spring-boot:run    # http://localhost:8080
前端   cd RouteME/frontend; npm run dev                  # http://localhost:5173，/api 代理到 8080
```

- 首次启动自动创建 `backend/data/routeme.db`，Flyway 应用 `V1__create_greetings.sql`、`V2__seed_greeting.sql`；`GET /api/greeting` 应返回 `{"id":1,"message":"Hello World"}`。
- 重置数据库：停止后端，删除 `backend/data/routeme.db`，重启后重新迁移。
- 后端测试 `mvnw.cmd test`：接口测试走 H2 内存库，`*SqliteTest` 用临时 SQLite 文件库跑同一组迁移，CI 同样覆盖 SQLite。
- 前端验证 `npm run build`（`tsc --noEmit && vite build`）与 `npm test`（Vitest 纯函数测试），不依赖后端启动。
- 前端依赖安装：CI 与 Docker 镜像固定 Node 22 + `npm install -g npm@11` 后执行 `npm install`（npm 10.9.9 在 Linux 解析 rolldown 可选依赖会崩 “Exit handler never called”）；锁文件 `resolved` 必须是 `registry.npmjs.org`，不得提交公司 Artifactory 地址。
- 构建产物 `dist/assets/index-*.js` 约 612 kB，来源是 Ant Design 整包；保留警告不静默调高阈值，出现路由级拆分需求时再分包。
- 本机 TLS：该开发机 Maven 经 TLS 代理下载依赖，代理根证书已导入 JDK `cacerts`（alias `forward-trust-root`）；换机器或换 JDK 需重做一次，CI 使用公有 CA 不受影响。
