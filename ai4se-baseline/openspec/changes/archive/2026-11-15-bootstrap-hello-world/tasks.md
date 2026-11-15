# 任务：bootstrap-hello-world

任务按落点分组，契约任务在前，前后端任务在后；每条任务给出验证方式。

## contract

- [x] T1 定稿 `RouteME/openapi.yaml`：`GET /greeting` 的 200 / 404 / 500 与 `Greeting`、`Error` schema。
  验证：`backend` 的 `OpenApiTest` 解析文件并断言路径与 `required`。

## backend

- [x] T2 生成 Spring Boot 4.1.2 骨架（Java 21、Maven Wrapper），调整依赖：`webmvc`、`jdbc`、`flyway`、`sqlite-jdbc`、`flyway-database-nc-sqlite`，测试依赖 `h2`。
  验证：`mvnw.cmd -B -q compile`。
- [x] T3 写迁移 `V1__create_greetings.sql`、`V2__seed_greeting.sql`，两套数据库共用。
  验证：`SqliteMigrationTest`（临时 SQLite 文件库执行迁移并读取问候语）。
- [x] T4 分层实现：`controller` → `service` → `dao`，`model` / `dto` / `exception` 配套；统一错误处理器按契约映射 404 与 500。
  验证：`GreetingControllerTest`（H2 + MockMvc）覆盖 200 与 404。
- [x] T5 服务层单元测试：用内存桩验证「有记录」与「无记录」两个场景。
  验证：`GreetingServiceTest`。
- [x] T6 契约测试：解析 `openapi.yaml`，断言关键路径与必填字段。
  验证：`OpenApiTest`。
- [x] T7 运行全量后端测试。
  验证：`mvnw.cmd clean test`。

## frontend

- [x] T8 搭建 Vite 8 + React 19 + TypeScript + Ant Design 工程，脚本含 `typecheck` / `build` / `test`。
  验证：`npm run build`。
- [x] T9 实现 `api.ts` 请求出口、`types.ts` 契约类型、`home` 业务模块与 HomePage，文案进 `i18n/messages.ts`。
  验证：`npm run typecheck` + `npm run dev` 打开首页看到 Hello World；截图 `docs/assets/home-hello-world.png`。
- [x] T10 纯函数测试：请求成功解析与错误码透传。
  验证：`npm test`。

## docs

- [x] T11 回写 `docs/knowledge/architecture/README.md`（RouteME 拓扑与分层）与 `docs/knowledge/operations/README.md`（本地启动、CI）。
  验证：相对链接可点开。

## ci

- [x] T12 新增 `.github/workflows/ci.yml`：backend job 与 frontend job。
  验证：YAML 可解析；本地按同样命令跑通。
