# RouteME 路觅

大学生旅行灵感与同行匹配应用：浏览/发布旅行计划、看可解释的匹配原因、申请同行、发布者处理申请、匹配后一对一聊天、结束后分享游后体验并「参考此行程发布」。

- **后端** Spring Boot 4.1.2 / Java 21 / SQLite + Flyway（测试用 H2）
- **前端** React 19 + Vite 8 + Ant Design 6
- **契约** [openapi.yaml](openapi.yaml)（v0.4.0，前后端唯一事实源）
- **规格** [openspec/specs](../openspec/specs)（hello-world / trip-plans / trip-companions / trip-experiences）

## 目录结构

```text
ai4se-baseline/RouteME/
├── backend/            Spring Boot 服务（/api）
│   └── src/main/resources/db/migration/   Flyway V1–V8
├── frontend/           React SPA（开发时 /api 代理到 8080）
├── e2e/                Playwright 端到端（本地门禁）
├── SqlLite/            本地 SQLite 数据目录（*.db 已被 git 忽略）
├── openapi.yaml        接口契约
└── Dockerfile          单镜像：前端 dist + 后端 jar
```

## 本地运行

前置：JDK 21、Node.js 22、Maven 用仓库自带 `mvnw`（无需全局安装）。

```powershell
# 1) 后端（必须从 backend 目录启动，数据库相对路径才是 ../SqlLite/）
cd ai4se-baseline/RouteME/backend
.\mvnw.cmd spring-boot:run          # http://localhost:8080

# 2) 前端
cd ai4se-baseline/RouteME/frontend
npm install                          # 不要用 npm ci，见「常见问题」
npm run dev                          # http://localhost:5173，/api 代理到 8080
```

打开 <http://localhost:5173>，选择一个演示身份（林见夏 / 陈屿 / 苏念，对应 `X-User-Id` 1–3）。

冒烟接口：`GET /api/greeting`、`GET /api/users`、`GET /api/trips`、`GET /api/experiences`。

## SQLite 数据

| 场景 | 路径 | 说明 |
|---|---|---|
| 本地默认 | `ai4se-baseline/RouteME/SqlLite/routeme.db` | `spring.datasource.url` 默认 `jdbc:sqlite:../SqlLite/routeme.db`；可用 `SPRING_DATASOURCE_URL` 覆盖 |
| Docker | `/data/routeme.db` | 镜像内 `VOLUME /data`，本地 `docker run -v routeme-data:/data` 可持久化 |
| Render 免费实例 | `/data/routeme.db` | 无持久盘，实例重建即清空并回到 Flyway 种子数据 |
| 测试 | H2 内存库 | 临时 SQLite 文件另跑 `V1–V8` 迁移校验 |

重置演示数据：停止后端 → 删除 `SqlLite/routeme.db` → 重启，Flyway 会重新迁移并写入种子数据（3 个账户、6 条行程、7 条申请、4 条聊天、2 条体验）。

## 测试与校验

```powershell
cd ai4se-baseline/RouteME/backend;  .\mvnw.cmd -B verify          # 132 tests（H2 + SQLite）
cd ai4se-baseline/RouteME/frontend; npm run build; npm test       # 34 tests + 类型检查
cd ai4se-baseline/RouteME;          npx -y @redocly/cli lint openapi.yaml   # 0 error
cd ai4se-baseline/RouteME/e2e;      npx playwright test           # 11 个用例，需前后端已启动
```

Playwright 不进 CI，是本地门禁；E2E 会在开发库新增带唯一标题/内容的行程与体验，断言不依赖总数。

## Docker

```powershell
cd ai4se-baseline/RouteME
docker build -t routeme .
docker run --rm -p 8080:8080 -v routeme-data:/data routeme
# 打开 http://localhost:8080（页面与 /api 同源）
```

镜像内先构建前端 `dist`，再打进 Spring Boot `static/`，所以只需要一个服务、一个端口。

## CI（已跑通）

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)，push `main` 与 PR 触发：

| Job | 内容 |
|---|---|
| Backend (Java 21) | `./mvnw -B -ntp verify` |
| Frontend (Node 22) | npm 11 + `npm install` + `build` + `test` |
| Docker image | Buildx 构建镜像（不推送），保证部署产物可构建 |

## CD（Render，需要你完成账号与密钥）

流水线已就绪：[`.github/workflows/cd.yml`](../../.github/workflows/cd.yml) 在 CI 于 `main` 全绿后打包 `jar + dist` 工件，并调用 Render Deploy Hook；[`render.yaml`](../../render.yaml) 定义服务。

**账号与凭证需要你本人操作**（涉及邮箱验证、服务条款与账号所有权，我不能代注册或代持密钥）：

1. 打开 <https://render.com> → **Get Started** → 选 **GitHub** 登录并授权（免费，无需信用卡）
2. Dashboard → **New → Blueprint** → 选择 `afs-2026-zha3-group-2/RouteME` → Render 读取根目录 `render.yaml` → **Apply**
3. 等待首次部署完成，得到地址 `https://<service>.onrender.com`
4. 服务页 → **Settings → Deploy Hook** → 复制 URL
5. GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**
   - Name：`RENDER_DEPLOY_HOOK_URL`
   - Secret：粘贴第 4 步的 URL（不要发到聊天或提交进仓库）

完成后任意 push 到 `main`：CI 全绿 → CD 打包 → 触发 Render 重建上线。未配置 secret 时 CD 只打包并给出 warning，不会误报部署成功。

免费实例限制：15 分钟无访问会休眠（首次访问冷启动）、无持久盘（SQLite 每次重建回到种子数据）、内存 512 MB。需要保留用户数据：把 `render.yaml` 的 `plan` 改为 `starter` 并取消 `disk` 三行注释（挂载 `/data`）。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| `npm ci` 报 lockfile 不同步 / `Missing: @rolldown/binding-*` | 锁文件缺平台可选依赖；本地、CI、Docker 统一用 `npm install` |
| Linux 上 npm 报 `Exit handler never called!` | Node 22 自带 npm 10.9.9 的已知问题；先 `npm install -g npm@11` |
| 后端启动报 YAML 解析失败 | `application.yaml` 缩进必须 2/4/6 空格，`datasource` 子项是 4 空格 |
| 端口占用 | `PORT` / `server.port` 可用环境变量覆盖；前端开发端口在 `vite.config.ts` |
| CI Docker job 失败 | 看 Buildx 日志；通常是前端依赖安装或 jar 名变化（`routeme-backend-0.0.1-SNAPSHOT.jar`） |

## 相关文档

- 知识库入口 [docs/knowledge/_INDEX.md](../docs/knowledge/_INDEX.md)
- 运行与 CI/CD 细节 [operations/README.md](../docs/knowledge/operations/README.md)
- 契约 [openapi.yaml](openapi.yaml) ｜ 数据库迁移 [db/migration](backend/src/main/resources/db/migration)
- 原型 [docs/prototype/index.html](../docs/prototype/index.html)