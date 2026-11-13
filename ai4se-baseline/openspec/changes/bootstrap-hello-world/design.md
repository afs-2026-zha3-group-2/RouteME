# 设计：bootstrap-hello-world

## 关键取舍

### 运行时 SQLite，测试 H2，共用一套迁移

- 运行时用 `jdbc:sqlite:./data/routeme.db`，测试用 `jdbc:h2:mem:`。两套数据库跑同一组 `db/migration` 脚本。
- 迁移 SQL 因此只写两边都接受的语法：`INTEGER PRIMARY KEY` + 显式 `INSERT` 固定 id，不使用任一数据库的方言自增语法。
- 另有一个 SQLite 直连测试，用临时文件库执行同一组迁移，保证「CI 里的 SQLite 真的能建表、能查到 Hello World」，而不只是 H2 通过。

### 不引入 JPA，使用 JDBC Client

`greetings` 只有读取一条记录的需求，JPA 会额外带来方言、实体映射与 `ddl-auto` 风险。改用 Spring `JdbcClient`，仓储实现放在 `dao`，行对象 `GreetingRow` 不出 `dao` 包。

### 单例资源路径 `/greeting`

`@rule:api-contract` 要求资源名用复数，但问候语是单例资源（表中恰好一条），`/greeting` 是名词而非动词。此处按 REQ-001 的验收路径执行，并在契约描述里写明单例原因。

### 根包 `routeme`

`@rule:package-structure` 写的是「根包固定 `staffing`」，那是上一作业的领域名。本次经确认按产品名使用 `routeme`，层包结构（controller/service/dao/model/dto/exception）不变。本文件即该例外的记录。

### 引入 Ant Design

`@rule:web-coding-style` 默认不引入 UI 组件库；本次由需求方明确指定 Ant Design 作为 RouteME 的 UI 框架，属于经确认的例外。样式仍以 CSS 变量为令牌，组件内不写十六进制色值。

### ECharts 暂不引入

选型确认为 ECharts，但本次没有图表需求。先记录选型，避免出现未被使用的依赖；首个图表需求出现时再安装并补测试。

### CI 范围

GitHub Actions 两个 job：后端 `./mvnw -B verify`（含 H2 与 SQLite 测试），前端 `npm ci` + 构建 + Vitest。Playwright 浏览器下载耗时长，本次不进入 CI。

前端 job 固定 Node 22：本机 npm 11 会把 rolldown 的平台可选依赖判为锁文件缺项，Node 22 自带的 npm 10 能正常执行 `npm ci`；本地开发用 `npm install` 安装。

## 被否决的方案

| 方案 | 否决原因 |
|---|---|
| 运行时也用 H2 文件库 | 需求明确运行库为 SQLite，H2 只作测试库 |
| Flyway 分 SQLite/H2 两套迁移目录 | 两份脚本容易漂移，违背「同一变更一套迁移」的初衷 |
| 用 JPA + Hibernate 社区 SQLite 方言 | 为单表读取引入方言与实体映射，收益不足 |
| 前端状态管理库（Redux 等） | 单个只读页面，hook 足够 |

## 风险

- SQLite 并发写入受限：当前接口只读，连接池上限设为 1，避免文件锁冲突；出现写需求时再评估。
- Flyway 的 SQLite 支持在 12.x 拆到独立模块 `flyway-database-nc-sqlite`，版本必须与 `flyway-core` 一致，升级时同批改。
- 单例 `/greeting` 与复数资源规约不同，已在契约与本节记录，后续新增资源仍按复数执行。
