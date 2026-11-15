# 变更摘要：add-paged-lists-mybatis-plus

## Intent

修复用户提出的三类问题：列表没有分页、持久层重复且缺少复用能力、卡片与详情页出现错位/重叠/遮挡。把持久层迁到 MyBatis-Plus（`mapper` + `ServiceImpl`），为三个列表端点加分页，并重做「我的旅行」与详情页的布局与间距。

## What shipped

- **持久层（后端）**：`pom.xml` 增加 `mybatis-plus-spring-boot4-starter:3.5.18` 与 `mybatis-plus-jsqlparser`（3.5.9 起分页拦截器独立成模块）；`entity` 改为 MyBatis-Plus 实体（`@TableName` / `@TableId(INPUT)`），新增 `ChatMessageEntity`、`ChatThreadEntity`、`ReportEntity`；新增 `mapper` 包 7 个 `BaseMapper`（全部标 `@Mapper`）；新增 `repository/impl` 7 个 `XxxRepositoryImpl`（基类 `AbstractRepositoryImpl` 继承 `ServiceImpl`）替换全部手写 `JdbcClient` 的 `dao`（已删除）。
- **SQL 位置**：接口里没有 `@Select` / `@Update` 等注解 SQL。单表条件、排序与「取一行」用 `LambdaQueryWrapper`（`nextId` 不再每张表重复写 `SELECT MAX(id)`）；跨表 join / 分组写在 `TripPlanMapper.xml`、`TripExperienceMapper.xml`、`ChatMessageMapper.xml`。
- **日志**：`logback-spring.xml` 的 appender 改为 `STDOUT`（阈值 INFO）、`TRACE_FILE`（`logs/routeme-trace.log`，全量）、`ERROR_FILE`（`logs/routeme-error.log`，仅 ERROR）；目录可用 `LOG_PATH`、级别可用 `LOG_LEVEL_ROUTEME` 覆盖（排障设 TRACE，SQL 只进文件）。`*.log` 与 `logs/` 已忽略，散落在 `RouteME/logs/` 与 backend 根目录的临时日志已清理。
- **分页**：`config/MybatisPlusConfig` 注册 `@MapperScan` + `PaginationInnerInterceptor`（上限 50，不固定 DbType，SQLite 与 H2 通用）；`param/PageParam` 与 `response/PageResponse<T>`；`/trips`、`/matches`、`/experiences` 返回 `{items, page, size, total, total_pages}`，`/me/*` 与 `/trips/{id}/experiences` 仍为数组。
- **契约**：`openapi.yaml` 升至 `0.5.0`，新增 `Page` / `Size` 参数与 `TripPage` / `MatchPage` / `ExperiencePage` schema、更新 `/trips` 成功示例。
- **前端分页**：`types.Page<T>`、`api` 三处列表函数带 `page`/`size`、`shell/usePaging`（筛选变化立即回到第 1 页，且不产生多余请求）、`shell/paging.pageWindow`（页码窗口，含单测）、`shell/Pager`（共 N 条 / 页码 / 上一页 / 下一页 / 每页条数，单页不渲染）。
- **布局修复**：「我的旅行」由横向 `Space` 改为 `.mine-row`（卡片 1fr + 操作 auto，`TripCard compact` 变体），四组卡片等宽、按钮同行不重叠，≤640px 操作区换行到卡片下方；详情页拆为 `.detail-section`（路线 / 发布者 / 同行者 / 游后体验 / 匹配度 / 操作），统一 16px 间距，「发表游后体验」独立成行；窄屏选项卡改为换行展示，第四项不再被裁切。
- **测试**：后端 132 → 139（新增 `/trips` 分页窗口与非法参数、`/matches` 切页与 `size=51`、`/experiences` 切页与 `size=0`、`GreetingMapper` 的 SQLite 实测）；前端 42 → 47（`pageWindow` 5 例）。

## Verify highlights

- `cd RouteME/backend; .\mvnw.cmd -B clean test` → `Tests run: 139, Failures: 0, Errors: 0`。
- 启动后 `backend/logs/` 仅生成 `routeme-trace.log` 与空的 `routeme-error.log`（旧 `CONSOLE`/`FILE` appender 已移除）；`LOG_LEVEL_ROUTEME=TRACE` 时 TRACE 行只出现在文件、不进终端。
- `cd RouteME; npx @redocly/cli lint openapi.yaml` → 契约合法（0 error，6 warning）。
- `cd RouteME/frontend; npm run build` → 退出码 0；`npm test` → 7 文件 / 47 项通过。
- 运行时接口：`/api/matches?page=1&size=5` → `items=5, total=32, total_pages=7`；`page=2` 返回第二批；`/api/experiences?size=3` → `total=9, total_pages=3`；`/api/trips?size=51` → 400。
- 浏览器几何检查（1440 / 1024 / 768 / 390 × 首页 / 我的旅行 / 详情）：`scrollWidth` 均 ≤ 视口，未被裁切容器遮挡的溢出元素为 0；首页每页 20 张卡片并有分页条；「我的旅行」行宽一致（1440 下 1120 行 / 1059 卡片 + 47 操作）；390 下四个选项卡全部可见且可点击。

## Residual risks

| 风险 | 处理 |
|---|---|
| `/matches` 分页在应用层切页（匹配分不在 SQL） | `design.md` §1 记录理由；数据量增长时需要把打分下沉到 SQL 或物化 |
| Playwright E2E 未执行 | 仅做了选择器对齐（`.trip-card-link` → `.trip-card`）；E2E 依赖真实后端与本地数据，未纳入本次门禁 |
| 演示库累积 30+ 条 E2E 数据 | 分页已能承载；测试数据隔离仍待单独 change |
| antd Tabs 的「更多」下拉在窄屏不可点开 | 改用换行展示，四个选项卡始终可见 |
| 手工 id（`MAX(id)+1`）在并发下可能重复 | 演示环境接受；生产化时改为数据库自增或序列 |

## Links

- Proposal / Design / Tasks：同目录 `proposal.md`、`design.md`、`tasks.md`
- Delta specs：`specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md`、`specs/design-system/spec.md`
- 验证报告：`docs/ai4se-plugins/20261115-231000-local-verify-report.md`