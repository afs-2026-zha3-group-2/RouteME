# 本地验证报告：add-paged-lists-mybatis-plus

- **日期：** 2026-11-15
- **范围：** 后端持久层（MyBatis-Plus）、三个列表端点分页、前端分页控件与「我的旅行 / 详情页」布局修复
- **环境：** Windows / Spring Boot 4.1.2（Java 21）/ MyBatis-Plus 3.5.18 / Vite 8 / SQLite 运行时 + H2 测试

## 1. 后端测试

```text
cd RouteME/backend
.\mvnw.cmd -B test
```

```text
Tests run: 133, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

- 新增：`TripControllerTest`（分页窗口、越界页、`page=0`/`size=51` → 400）、`MatchControllerTest`（`size=1` 切页与 `size=51`）、`ExperienceControllerTest`（`page=2&size=1`、`size=0`）、`GreetingMapperSqliteTest`（临时 SQLite 文件库 + MyBatis-Plus 映射）。
- 迁移影响：`dao` / `repository` 移除后，持久化断言改为 `service/ApplicationServicePersistenceTest`、`service/ExperienceServicePersistenceTest`、`service/TripPlanServicePersistenceTest`（注入 service 接口）；三个迁移测试保留在 `routeme.migration`。

## 2. 契约

```text
cd RouteME
npx @redocly/cli lint openapi.yaml
```

```text
openapi.yaml: validated in 50ms
Woohoo! Your API description is valid. 🎉
You have 6 warnings.
```

- 0 error；warning 为既有示例级提示。

## 3. 前端

```text
cd RouteME/frontend
npm run build   → BUILD_EXIT=0
npm test        → Test Files 7 passed (7) / Tests 47 passed (47)
```

- 新增 `shell/paging.test.ts`：`pageWindow` 短列表、中间页折叠、首尾窗口、无页（0 / NaN）。

## 4. 运行时接口（真实 SQLite 数据，X-User-Id=1）

| 请求 | 结果 |
|---|---|
| `GET /api/matches?page=1&size=5` | `items=5, page=1, size=5, total=32, total_pages=7` |
| `GET /api/matches?page=2&size=5` | 返回第二批（首条与第 1 页不同） |
| `GET /api/experiences?page=1&size=3` | `items=3, total=9, total_pages=3` |
| `GET /api/trips?size=51` | HTTP 400 |

## 5. 浏览器几何检查

视口 1440 / 1024 / 768 / 390，路由 `#/`、`#/mine`、`#/trips/1`，共 12 组：

| 检查 | 结果 |
|---|---|
| `documentElement.scrollWidth` ≤ 视口 | 全部满足（1430 / 1014 / 758 / 380） |
| 未被 `overflow: hidden` 容器裁剪的溢出元素 | 0 |
| 首页分页条 | 四档视口均存在；1440 下「共 32 条 / 1 / 2 / 每页 20 条」 |
| 我的旅行行宽度 | 1440：行 1120、卡片 1059、操作 47，三者同行不重叠 |
| 我的旅行分页 | 该页为聚合列表，无分页控件（符合设计） |
| 390 下的选项卡 | 四个选项卡全部可见（换行展示），点击「已完成」后渲染 17 行 |
| 390 下的行布局 | 行宽 352，操作区在卡片下方（`top` 大于卡片底部） |
| 详情页分区 | 五个 `.detail-section`，间距 16px，无区块重叠；「发表游后体验」位于体验区操作行 |

## 6. 评审修复复验（同日 23:15）

| 项目 | 结果 |
|---|---|
| 注解 SQL | `@Select` / `@Insert` / `@Update` / `@Delete` 出现次数：**0**（`grep` 全量源码） |
| `@Mapper` | 7 个 mapper 接口全部标注；`@MapperScan` 保留 |
| 复杂 SQL 落点 | `resources/mapper/` 三份 XML：`TripPlanMapper.xml`、`TripExperienceMapper.xml`、`ChatMessageMapper.xml`（会话聚合从 `@Select` 迁入） |
| 简单查询 | `nextId` / `firstBy` 收敛到 `AbstractServiceImpl`（`ServiceImpl` 基类），用 `LambdaQueryWrapper` + 单行分页，无 `SELECT MAX(id)` 文本 |
| `.gitkeep` | 删除 `mapper/`、`docs/ai4se-plugins/`、`vendor/ai4se-plugins/agents/` 三处（同目录已有文件）；空占位包与 `SqlLite/` 保留 |
| 日志 appender | `logback-spring.xml` 仅 `STDOUT` / `TRACE_FILE` / `ERROR_FILE`；启动后 `backend/logs/` 生成 `routeme-trace.log` 与 `routeme-error.log`（后者 0 字节），旧 `routeme-backend.log` 不再产生 |
| `LOG_LEVEL_ROUTEME=TRACE` | 实测 TRACE 行写入 `routeme-trace.log`，控制台仍只到 INFO |
| 散落日志 | 删除 `ai4se-baseline/RouteME/logs/`；`.gitignore` 增补 `logs/`；构建/测试日志改写到 `$env:TEMP` |
| 后端测试 | `.\mvnw.cmd -B clean test` → 133 项全绿 |
| 前端 | `npm run build` 退出码 0；`npm test` → 47 项全绿 |
| 运行时 | `/api/matches?size=4` → total 32；`/api/me/chat-partners` → 9（XML 聚合生效）；`/api/greeting` → Hello World |
| 页面 | 首页 20 卡 + 分页条；我的旅行 34 行、四项卡可见、无溢出；详情 5 个分区、3 个操作按钮 |

## 7. 结构收敛复验（同日 23:47，commit `95033f4`）

| 项目 | 结果 |
|---|---|
| `repository` / `dao` 包 | 已删除；`routeme.repository.*`、`routeme.dao.*` 在源码与 XML 中出现 0 次 |
| `service` 形态 | 9 个接口（拥有表的 `extends IService<XxxEntity>`）+ `service/impl` 8 个 `XxxServiceImpl` + `AbstractServiceImpl` |
| `@Mapper` | 7 个 mapper 全部标注 |
| `entity` 与 `pojo` 分离 | `entity` 8 个 `@TableName` 实体；`pojo` 12 个领域 record（含 `PageResult`）；`routeme.pojo.*Entity` 残留 0 次 |
| service 注释 | 9 个接口的每个方法均有 `/** ... @param ... @return ... */`；实现类只用类级注释 |
| 注解 SQL | `@Select` / `@Insert` / `@Update` / `@Delete` 出现 0 次 |
| `@Slf4j` | `GlobalExceptionHandler` 改用 Lombok `@Slf4j`；全仓库无 `LoggerFactory` |
| 后端测试 | `.\mvnw.cmd -B clean test` → **133 项全绿** |
| 运行时 | `/api/trips?size=5` total 32；`/api/matches?size=3` total 32；`/api/experiences?size=2` total 9；`/api/me/chat-partners` 9；`/api/trips/4/messages?with=3` 4 条；`/api/greeting` Hello World |
| 前端 | `npm run build` 退出码 0；`npm test` 47 项全绿；首页 20 卡 + 分页条，我的旅行 34 行无溢出 |

- 顺带修复：`partners()` 原复用带权限校验的 `conversation()`，会让已退出行程的历史会话整体 403；现拆出无校验的私有 `messages()`，`conversation()` 仍先校验。

## 8. CI/CD 验证（GitHub Actions）

| 工作流 | 结果 |
|---|---|
| CI run #74（commit `95033f4`） | **success** —— `Backend (Java 21)` success、`Frontend (Node 22)` success |
| CD run #9（同 commit） | **success** —— `Build and publish release` success |
| Release | `build-95033f4` 已发布，资产 `routeme-standalone-95033f4e156a3922ac43d0e08533999bb693f775.jar`、`routeme-frontend-dist.zip` |
| 历史对照 | `51d61df`、`0c49fdd`、`a664046` 的 CI 与 CD 均为 success |

- CI 步骤：`./mvnw -B -ntp verify`（backend）、`npm install && npm run build && npm test`（frontend）。
- CD 由 CI 成功后触发：构建前端 dist → 打进 backend static → 打包单 jar → 上传工件 + 发布 GitHub Release。

## 9. 未执行

- `cd RouteME/e2e; npx playwright test`：E2E 依赖本地真实数据且不在 CI 内；本次仅把卡片选择器由 `.trip-card-link` 更新为 `.trip-card`。
- 并发写入下的 id 唯一性验证：仍为演示用「最大 id + 1」。

## 结论

后端 133 项、前端 47 项测试全绿，契约 lint 0 error；分页在数据库（`/trips`、`/experiences`）与应用层（`/matches`）按设计生效，四档视口无溢出、无重叠，卡片与操作区对齐。持久层收敛为 `service` / `service/impl` / `mapper` / `entity` / `pojo`，注释与 `@Slf4j` 齐备。CI run #74 与 CD run #9（commit `95033f4`）均绿，release `build-95033f4` 已产出。残余风险见 `summary.md`。