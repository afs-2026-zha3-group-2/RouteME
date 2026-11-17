# RouteME 路觅

大学生旅行灵感与同行匹配应用：浏览/发布旅行计划、看可解释的匹配原因、申请同行、发布者处理申请、匹配后一对一聊天、结束后分享游后体验并「参考此行程发布」。

- **后端** Spring Boot 4.1.2 / Java 21 / SQLite + Flyway（测试用 H2）/ MyBatis-Plus 3.5.18
- **前端** React 19 + Vite 8 + Ant Design 6
- **契约** [openapi.yaml](openapi.yaml)（v0.5.0，前后端唯一事实源）
- **规格** [openspec/specs](../openspec/specs)（hello-world / trip-plans / trip-companions / trip-experiences）

## 旅行地图（高德 JS API 2.0）

地图、搜索、规划与同行者展示已从离线 SVG 切换到高德 JS API 2.0；全国城市与景点由高德数据提供，不再维护中国/省/市 SVG。

| 位置 | 组件 / 服务 | 职责 |
|---|---|---|
| `frontend/src/map/amap` | `AmapContainer` | 加载 JS API、Map 实例、缩放/定位/全屏 |
| | `PlaceSearchBox` | 城市、景点、地址搜索（加载/空/错误状态） |
| | `WaypointPanel` + `ItineraryPanel` | 途经点拖拽排序、删除、清空、出行方式、距离与时间 |
| | `RouteLayer` | 高德路线折线 + 起终点/编号 Marker，与列表联动 |
| | `TravelerMatchPanel` | 85% 同路 / 3 位同行者的聚合与详情弹窗 |
| | `AmapService` | 搜索、逆地理、步行/驾车/骑行路线（RouteMe 数据模型） |
| | `companions` + `mockCompanions` | 同行者 Mock 数据模型与重合度计算（UI 不写死百分比） |
| backend | `AmapProxyController` | `/api/amap/**` 与 `/_AMapService/**` 同源代理，补 Web 服务 Key / 安全密钥 |

### 环境变量

| 变量 | 位置 | 说明 |
|---|---|---|
| `VITE_AMAP_JS_KEY` | `frontend/.env.local` | 高德 **Web 端（JS API）** Key，会出现在浏览器脚本中 |
| `VITE_AMAP_SECURITY_CODE` | 可选 | 仅在 `VITE_AMAP_PROXY_PATH=off` 直连时使用；推荐留空走代理 |
| `VITE_AMAP_PROXY_PATH` | 可选，默认 `/api/amap` | 前端 REST 代理前缀；`/_AMapService` 固定作为 JS API 安全代理一级路由 |
| `AMAP_WEB_SERVICE_KEY` | 后端环境变量或 `backend/amap-local.yml` | 高德 **Web 服务** Key（或配合安全密钥使用的 JS Key） |
| `AMAP_SECURITY_JS_CODE` | 后端环境变量或 `backend/amap-local.yml` | 高德 JS API 安全密钥 `securityJsCode`，只在后端使用 |

`backend/amap-local.yml` 与 `frontend/.env.local` 已被 git 忽略；示例见 `frontend/.env.example`。生产环境不要把 Web 服务 Key 或 `securityJsCode` 写进前端产物。

> 若高德控制台提示 `USERKEY_PLAT_NOMATCH` / `INVALID_USER_SCODE`，说明 Key 平台与用途不匹配或缺少安全密钥：请使用 Web 服务 Key，或把该 JS Key 对应的 `securityJsCode` 配到 `AMAP_SECURITY_JS_CODE`。

### Mock 边界

- 真实：地图瓦片、地点搜索、地理编码、步行/驾车/骑行路线、距离与预计时间。
- Mock：同行者资料、日期、偏好、共同景点与重合度（`mockCompanions.ts`，由 `companions.ts` 计算并收窄）；路线生成本身不依赖 Mock。
- 保存路线当前写入浏览器 `localStorage`（`savedRoutes.ts`），字段包含 POI ID、名称、经纬度、顺序、出行方式、日期、距离与预计时间；接入后端后替换 `saveRoute` 即可。

## 后端结构

```text
backend/src/main/java/routeme/
├── controller/    Web 层（XxxController）
├── param/         入参解析（TripQueryParam / PageParam）
├── service/       业务接口（拥有数据表的继承 IService<XxxEntity>，方法带 Javadoc）
├── service/impl/  ServiceImpl<XxxMapper, XxxEntity> 实现，事务边界
├── mapper/        MyBatis-Plus 映射（BaseMapper + @Mapper）
├── entity/        表结构映射实体（XxxEntity，@TableName）
├── pojo/          领域对象 record（业务语义，无持久化注解）
├── request/ response/   契约入参 / 出参 record
├── enums/ constant/ config/ exception/ handler/ utils/
└── annotation/ aspect/ interceptor/ mq/ sql/    预留占位
```

- `entity` 与 `pojo` 分工：实体随表变（只被 mapper 与 `service/impl` 使用），领域 record 随业务变（跨层传递）。
- SQL 位置：注解里不写 SQL；单表条件用 `LambdaQueryWrapper`，跨表 join / 分组 / 分页写 `backend/src/main/resources/mapper/*.xml`。
- 日志：Lombok `@Slf4j`，`logback-spring.xml` 输出 `STDOUT` / `TRACE_FILE` / `ERROR_FILE`，文件落在 `backend/logs/`（已忽略）。

- SQL 位置：注解里不写 SQL；单表条件用 `LambdaQueryWrapper`，跨表 join / 分组 / 分页写 `backend/src/main/resources/mapper/*.xml`。
- 日志：Lombok `@Slf4j`，`logback-spring.xml` 输出 `STDOUT` / `TRACE_FILE` / `ERROR_FILE`，文件落在 `backend/logs/`（已忽略）。

## 目录结构

```text
ai4se-baseline/RouteME/
├── backend/            Spring Boot 服务（/api）
│   ├── src/main/resources/db/migration/   Flyway V1–V8
│   └── src/main/resources/mapper/         复杂查询 XML
├── frontend/           React SPA（开发时 /api 代理到 8080）
├── e2e/                Playwright 端到端（本地门禁）
├── SqlLite/            本地 SQLite 数据目录（*.db 已被 git 忽略）
├── logs/               运行日志（已忽略）
└── openapi.yaml        接口契约
```

> 交付物只有一个 jar：CD 会把前端 `dist` 打进 `backend/src/main/resources/static`，再打包成可执行 jar。

## 本地运行

前置：JDK 21、Node.js 22、Maven 用仓库自带 `mvnw`（无需全局安装）。

```powershell
# 1) 后端（必须从 backend 目录启动，数据库相对路径才是 ../SqlLite/）
cd ai4se-baseline/RouteME/backend
# 地图环境变量：可写进 backend/amap-local.yml（已忽略）或直接 export
# AMAP_WEB_SERVICE_KEY / AMAP_SECURITY_JS_CODE
.\mvnw.cmd spring-boot:run          # http://localhost:8080

# 2) 前端
cd ai4se-baseline/RouteME/frontend
npm install                          # 不要用 npm ci，见「常见问题」
# 地图环境变量：把 .env.example 复制为 .env.local 并填 VITE_AMAP_JS_KEY
npm run dev                          # http://localhost:5173，/api 代理到 8080
```

打开 <http://localhost:5173>，用种子账号登录（`linjianxia` / `chenyu` / `sunian` / `zhouye`，密码均为 `123456`）。

冒烟接口：`GET /api/greeting`、`GET /api/users`、`GET /api/trips`、`GET /api/experiences`。

## SQLite 数据

| 场景 | 路径 | 说明 |
|---|---|---|
| 本地开发（`mvnw spring-boot:run`，CWD=backend） | `ai4se-baseline/RouteME/SqlLite/routeme.db` | 默认 `jdbc:sqlite:../SqlLite/routeme.db` |
| 独立 jar（任意目录） | 由 `SPRING_DATASOURCE_URL` 决定 | 建议 `jdbc:sqlite:./routeme.db`；缺目录会自动创建 |
| 测试 | H2 内存库 | 临时 SQLite 文件另跑 `V1–V8` 迁移校验 |

`SqliteDirectory` 在启动前按数据源 URL 创建父目录，因此首次运行不会出现 `SQLITE_CANTOPEN`。用 `SPRING_DATASOURCE_URL` 可指向任意位置。

重置种子数据：停止后端 → 删除 `SqlLite/routeme.db` → 重启，Flyway 会重新迁移并写入种子数据（4 个种子账户及其行程、申请、聊天与体验）。

## 测试与校验

```powershell
cd ai4se-baseline/RouteME/backend;  .\mvnw.cmd -B verify          # 132 tests（H2 + SQLite）
cd ai4se-baseline/RouteME/frontend; npm run build; npm test       # 34 tests + 类型检查
cd ai4se-baseline/RouteME;          npx -y @redocly/cli lint openapi.yaml   # 0 error
cd ai4se-baseline/RouteME/e2e;      npx playwright test           # 11 个用例，需前后端已启动
```

Playwright 不进 CI，是本地门禁；E2E 会在开发库新增带唯一标题/内容的行程与体验，断言不依赖总数。

## 单文件 jar（无 Docker）

不需要 Docker 就能得到「页面 + API 同源」的产物：

```powershell
cd ai4se-baseline/RouteME/frontend; npm run build
mkdir ..\backend\src\main\resources\static -Force
Copy-Item -Recurse -Force dist\* ..\backend\src\main\resources\static\
cd ..\backend; .\mvnw.cmd -B -ntp -DskipTests package
java -jar target\routeme-backend-0.0.1-SNAPSHOT.jar
# 打开 http://localhost:8080
```

`backend/src/main/resources/static/` 是构建输出，已被 git 忽略；CD 里用同样的步骤自动完成。

## CI / CD（全部在 GitHub，无外部服务）

```text
CI  .github/workflows/ci.yml   push/PR：backend verify、frontend build+test
CD  .github/workflows/cd.yml   CI 在 main 全绿后：构建单文件 jar + dist，上传工件并发布 GitHub Release
```

| 流水线 | Job | 内容 |
|---|---|---|
| CI | Backend (Java 21) | `./mvnw -B -ntp verify`（132 tests，H2 + SQLite） |
| CI | Frontend (Node 22) | npm 11 + `npm install` + `build` + `test`（34 tests） |
| CD | Build and publish release | 构建前端 dist → 打进 Spring Boot `static` → 打包 jar → 上传工件 → `gh release create build-<sha>` |

- **不使用 Docker、不使用 Render 或任何第三方部署平台**：GitHub Actions 负责构建、测试与交付，交付物是 GitHub Release 附件。
- 每次 `main` 绿灯自动产出 Release `build-<sha>`（若标签已存在只上传工件，不重复发布），可在 **Releases** 页或 Actions 运行页的 Artifacts 下载。
- GitHub 不提供 Java 运行时托管，因此没有公网地址；演示用下面的「单文件 jar」在本地跑，或用任意机器托管该 jar。

### 下载并本地演示

```powershell
# 从 GitHub Releases 下载 routeme-standalone-<sha>.jar，然后：
$env:SPRING_DATASOURCE_URL="jdbc:sqlite:./routeme.db"   # 可选，默认用 ../SqlLite/routeme.db
java -jar routeme-standalone-<sha>.jar
# 打开 http://localhost:8080 —— 页面与 /api 同源，无需再跑前端
```

jar 里已包含前端静态文件，`SqliteDirectory` 会在启动前自动创建数据库目录，首次运行不会报 `SQLITE_CANTOPEN`。

**为什么不能「全部用 GitHub」部署**：GitHub Actions 是构建/测试/交付平台，没有 Java 应用运行时；GitHub Pages 只能托管纯静态站点，无法运行 Spring Boot 后端。所以本仓库的 CD 收敛为「构建 + Release 交付」，运行在本地或你已有的服务器。

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| `npm ci` 报 lockfile 不同步 / `Missing: @rolldown/binding-*` | 锁文件缺平台可选依赖；本地与 CI 统一用 `npm install` |
| Linux 上 npm 报 `Exit handler never called!` | Node 22 自带 npm 10.9.9 的已知问题；先 `npm install -g npm@11` |
| 后端启动报 YAML 解析失败 | `application.yaml` 缩进必须 2/4/6 空格，`datasource` 子项是 4 空格 |
| 端口占用 | `PORT` / `server.port` 可用环境变量覆盖；前端开发端口在 `vite.config.ts` |
| 启动报 `SQLITE_CANTOPEN` | 数据库父目录不存在；`SqliteDirectory` 已自动创建，仍失败时检查 `SPRING_DATASOURCE_URL` 是否指向只读位置 |

## 相关文档

- 知识库入口 [docs/knowledge/_INDEX.md](../docs/knowledge/_INDEX.md)
- 运行与 CI/CD 细节 [operations/README.md](../docs/knowledge/operations/README.md)
- 契约 [openapi.yaml](openapi.yaml) ｜ 数据库迁移 [db/migration](backend/src/main/resources/db/migration)
- 原型 [docs/prototype/index.html](../docs/prototype/index.html)