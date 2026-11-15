# 任务：add-paged-lists-mybatis-plus

- **依据：** [`spec.md`](specs/trip-plans/spec.md)、[`spec.md`](specs/trip-experiences/spec.md)、[`spec.md`](specs/design-system/spec.md)、[`design.md`](design.md)
- **约束：** 契约任务先于两端；实体与 mapper 先于 repository 适配；布局任务只改表现层。

## 任务清单

### T1 [contract] 契约先行

- [x] `openapi.yaml` 升到 `0.5.0`：`/trips`、`/matches`、`/experiences` 增加 `page`、`size` 参数，响应改为 `Page*`；新增 `PageTripPlan`、`PageMatchCandidate`、`PageExperience` schema 与成功 / 非法参数 example。
- [x] `OpenApiTest` 断言三个列表响应的 `items` / `total_pages` 与参数声明。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml`（0 error）；`.\mvnw.cmd -Dtest=OpenApiTest test`
**覆盖：** 分页参数与响应（5 场景）、体验分页（2 场景）

### T2 [backend] MyBatis-Plus 落地

- [x] `pom.xml` 增加 `mybatis-plus-spring-boot4-starter:3.5.18`；`application.yaml` 增加 `mybatis-plus.mapper-locations`。
- [x] `config/MybatisPlusConfig`：`@MapperScan("routeme.mapper")` + `PaginationInnerInterceptor`（不固定 DbType）。
- [x] `entity` 改为 MyBatis-Plus 实体（`@TableName` / `@TableId(INPUT)` / getter+setter / `toXxx()`），新增 `ChatMessageEntity`、`ChatThreadEntity`、`ReportEntity`。

**验证：** `.\mvnw.cmd -B -q compile`
**覆盖：** 持久层迁移（proposal In scope）

### T3 [backend] mapper 与 ServiceImpl 适配

- [x] `mapper` 包 7 个 `BaseMapper`；`TripPlanMapper`、`TripExperienceMapper` 的分页查询放 `resources/mapper/*.xml`，其余用 `LambdaQueryWrapper`。
- [x] `repository/impl` 7 个 `ServiceImpl` 适配类实现既有端口；删除 `dao` 包。
- [x] 端口新增分页方法：`TripPlanRepository.findOpenPage`、`TripExperienceRepository.findPage`。
- [x] 评审修复：mapper 接口全部标 `@Mapper`；移除全部 `@Select` 注解 SQL（`selectNextId` / `selectFirst` / 会话聚合），后者改为 `LambdaQueryWrapper` 或 `ChatMessageMapper.xml`；新增 `AbstractRepositoryImpl` 收敛 `nextId` / `firstBy`；删除 `mapper/.gitkeep` 与其它已有文件的 `.gitkeep`。
- [x] 日志与产物：`logback-spring.xml` 改为 `STDOUT` / `TRACE_FILE` / `ERROR_FILE`，目录用 `LOG_PATH`、级别用 `LOG_LEVEL_ROUTEME`；清理散落在 `RouteME/logs/` 的日志，`.gitignore` 补 `logs/`，构建/测试日志输出到系统临时目录。

**验证：** `.\mvnw.cmd -B clean test`（139 项）；启动后 `backend/logs/` 只出现 `routeme-trace.log` 与 `routeme-error.log`
**覆盖：** 持久层迁移、日志落点

### T4 [backend] 分页参数、响应与端点

- [x] `param/PageParam`：默认 1 / 20、上限 50、非法值 `INVALID_INPUT`；`slice(List)` 供应用层切页。
- [x] `response/PageResponse<T>`：`items`、`page`、`size`、`total`、`total_pages`。
- [x] `TripController.list`、`MatchController.list`、`ExperienceController.list` 返回分页对象；`/me/*` 保持数组。
- [x] 排序统一追加 `id DESC` 作为尾键。

**验证：** `.\mvnw.cmd -B test`
**覆盖：** 分页参数与响应（5 场景）、体验分页（2 场景）

### T5 [frontend] 契约类型、分页控件与状态

- [x] `types.ts` 增加 `Page<T>`；`api.ts` 三个列表函数接受 `page`/`size` 并返回 `Page<T>`。
- [x] `shell/Pager.tsx`：上一页 / 页码 / 下一页 / 每页条数 / 共 N 条；单页不渲染。
- [x] `useMatches`、`useExperiences` 增加 `page`、`size`、`total`，筛选变化回到第 1 页。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** 分页控件（4 场景）

### T6 [frontend] 首页与体验视图接入分页

- [x] 首页行程网格与体验网格底部渲染 `Pager`；翻页后滚动到列表顶部。
- [x] 空状态、加载骨架、错误提示在分页后仍正确。

**验证：** 浏览器：32 条行程分 2 页；筛选变化回到第 1 页
**覆盖：** 分页浏览、筛选重置（trip-plans）

### T7 [frontend] 布局修复

- [x] 「我的旅行」改 `.mine-row`（卡片 1fr + 操作 auto），四个分组等宽；窄屏操作换行。
- [x] 详情页拆 `.detail-section`，统一 16px 间距；游后体验操作独立成行。
- [x] 窄屏 `Tabs` 可横向滚动；卡片文本截断保留省略号，底部信息不被遮挡。

**验证：** 浏览器 1440 / 1024 / 768 / 390 四档：无溢出容器、无重叠
**覆盖：** 布局完整性（4 场景）

### T8 [docs] 知识库与收口

- [x] `docs/knowledge/architecture/README.md` 更新持久层（mapper + ServiceImpl）与分页口径；`_LOG.md` 追加记录。
- [x] 写 `summary.md` 与本地验证报告。

**验证：** 相对链接可点开、术语与 delta spec 一致
**覆盖：** 文档交付

### T9 [verify] 全量验证

- [x] `.\mvnw.cmd -B test`、`npx @redocly/cli lint openapi.yaml`、`npm run build`、`npm test`。
- [x] 浏览器核对首页分页、我的旅行、详情页与窄屏选项卡。

**验证：** 上述命令全绿；验证报告记录真实输出
**覆盖：** 全部场景