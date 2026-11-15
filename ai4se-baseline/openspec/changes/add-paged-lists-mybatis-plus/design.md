# 设计：add-paged-lists-mybatis-plus

- **Change:** `add-paged-lists-mybatis-plus`｜ **依据：** [`proposal.md`](proposal.md)、`specs/{trip-plans,trip-experiences,design-system}/spec.md`、`DesignSystem` 增量（分页控件与布局完整性）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`

## 1. 关键取舍

### MyBatis-Plus 落在持久层，业务分层不变

```text
controller → service（业务规则）→ repository（端口）→ repository/impl（ServiceImpl）→ mapper（BaseMapper）→ 表
```

- 采用 `mybatis-plus-spring-boot4-starter:3.5.18` + `mybatis-plus-jsqlparser`（3.5.9 起分页拦截器独立成模块），已验证依赖树。
- `repository/impl/XxxRepositoryImpl extends AbstractRepositoryImpl<XxxMapper, XxxEntity> implements XxxRepository`：基类继承 `ServiceImpl` 并只放 `nextId` / `firstBy` 这类跨表重复查询，实现类只写端口方法，保住 controller/service 对 `repository` 端口的依赖（service 单测仍可 mock 端口）。
- **SQL 位置约定**：`@Select` / `@Update` 等注解里不写 SQL；单表条件、排序与「取一行」用 `LambdaQueryWrapper`（`nextId` 不再为每张表重复写 `SELECT MAX(id)`），跨表 join / 分组 / 分页写 `resources/mapper/*.xml`。
- 所有 mapper 接口显式标 `@Mapper`，与 `config/MybatisPlusConfig` 的 `@MapperScan` 并存（显式声明便于单文件阅读，扫描保证装配）。
- 删除 `dao` 包（7 个 `JdbcClient` 实现）。规则「mapper 与 dao 二选一」由此从 `dao` 切到 `mapper`，`entity` 保留为行对象层。
- 否决把业务 service 改名成 `ServiceImpl`：`TripPlanService`、`ApplicationService` 等承载业务规则，MyBatis-Plus 的 `ServiceImpl` 只做数据访问，两者职责不同；混名会让「业务规则」和「表操作」再次纠缠。
- 手工 id 生成（`MAX(id)+1`，演示环境低并发）保留，`@TableId(type = IdType.INPUT)`。

### 分页在数据库层，评分排序在应用层

| 端点 | 分页位置 | 理由 |
|---|---|---|
| `GET /api/trips` | SQL（`LIMIT/OFFSET`） | 过滤与排序字段全部在表中 |
| `GET /api/experiences` | SQL（join `trip_plans`） | 过滤字段在行程与体验两表 |
| `GET /api/matches` | 应用层切片 | 匹配分在 `TripMatch` 里算，SQL 无法排序；先算全量再切页 |

- `PaginationInnerInterceptor` 不固定 `DbType`，按 JDBC URL 自动识别（运行时 SQLite、测试 H2 都走 `LIMIT ? OFFSET ?`）。
- 每页上限 50，避免一次拉全表；默认 20。

### 参数与响应

```text
GET /api/trips?page=1&size=20&q=&destination=&date_from=&date_to=&tags=&sort=
200 { "items": [...], "page": 1, "size": 20, "total": 32, "total_pages": 2 }
400 { "code": "INVALID_INPUT" }   // page<1 或 size<1 或 size>50
```

- `param/PageParam`：解析与校验一处完成，`page` 缺省 1、`size` 缺省 20。
- `response/PageResponse<T>`：Java 泛型 record，Jackson 以 SNAKE_CASE 输出 `total_pages`。
- 不改变错误码集合与 401 行为；`X-User-Id` 校验仍在查询之前。

### 布局修复

- 「我的旅行」：用 `.mine-row`（grid：内容 1fr + 操作 auto）取代横向 `Space`；卡片宽度由列宽决定，四行等宽；≤640px 时操作区换到卡片下方。
- 详情页：拆成 `.detail-section`（标题 + 内容），统一 16px 间距；游后体验的操作按钮单独成行。
- 窄屏选项卡：不依赖 antd 的「更多」下拉（实测窄屏点不开），改为 `.mine-tabs .ant-tabs-nav-list { flex-wrap: wrap }` 换行展示，四项始终可见。
- 分页控件 `shell/Pager`：上一页 / 页码 / 下一页 / 每页条数 / 共 N 条，单页时不渲染。
- 网格容器统一 `grid-template-columns: minmax(0, 1fr)`，否则 antd Tabs 的 `nav-list` 会把页面撑出 390px 视口。

### 日志与产物落点

- `resources/logback-spring.xml`：`STDOUT`（控制台，ThresholdFilter INFO）、`TRACE_FILE`（`logs/routeme-trace.log`，全量）、`ERROR_FILE`（`logs/routeme-error.log`，阈值 ERROR）。
- 目录用 `LOG_PATH` 覆盖，应用级别用 `LOG_LEVEL_ROUTEME`（默认 INFO，排障时设 TRACE，SQL 只进文件不进终端）。
- `*.log` 与 `logs/` 计入 `.gitignore`；临时构建/测试日志不得落在仓库目录（验证时输出到 `$env:TEMP`）。

## 2. 数据结构与文件

```text
backend/src/main/java/routeme/
  entity/            GreetingEntity, UserEntity, TripPlanEntity, TripApplicationEntity,
                     TripExperienceEntity, ChatMessageEntity, ChatThreadEntity, ReportEntity（均为 MyBatis-Plus 实体）
  mapper/            GreetingMapper, UserMapper, TripPlanMapper, TripApplicationMapper,
                     TripExperienceMapper, ChatMessageMapper, ReportMapper（extends BaseMapper，均标 @Mapper）
  repository/        端口接口（不变）
  repository/impl/   XxxRepositoryImpl extends AbstractRepositoryImpl<XxxMapper, XxxEntity>
  config/            MybatisPlusConfig（@MapperScan + PaginationInnerInterceptor）
  param/             PageParam
  response/          PageResponse
backend/src/main/resources/mapper/
  TripPlanMapper.xml        未结束行程的分页查询（join app_users 支持昵称搜索）
  TripExperienceMapper.xml  体验分页查询（join trip_plans 支持目的地/标签/关键词）
  ChatMessageMapper.xml     会话列表聚合（按行程与对方分组）
```

- 实体字段与列名靠 `map-underscore-to-camel-case` 对齐；`stops` / `tags` / `interests` 仍是 JSON 文本，解析留在实体的 `toXxx()`。
- 自定义 SQL 只在三处 XML：两个分页 join 与一个会话聚合；其余全用 `LambdaQueryWrapper`，接口里没有注解 SQL。
- `application.yaml` 增加 `mybatis-plus.mapper-locations: classpath*:mapper/**/*.xml`（未配置时的默认值相同，显式写出便于评审）。

## 3. 前端契约与状态

```text
types.ts      Page<T> = { items: T[]; page: number; size: number; total: number; total_pages: number }
api.ts        loadMatches(userId, filters, page, size) / loadExperiences(userId, filters, page, size)
useMatches    状态增加 page / size / total，导出 setPage / setSize；filters 变化时 page 归 1
useExperiences 同上
shell/Pager   受控组件：{ page, size, total, totalPages, onChange }
```

- 首页只在 `state.status === 'ready'` 且 `total > size` 时渲染 `Pager`。
- 翻页后 `window.scrollTo` 到列表顶部（复用 `App` 已有的路由滚动行为，改为按列表锚点滚动）。
- 保持既有错误处理：`failed` 时展示 `code` 与重试按钮。

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| MyBatis-Plus 与 Boot 4 兼容性 | 先用 `dependency:tree` 验证 starter 3.5.18；首次 `mvnw test` 作为门禁 |
| H2 与 SQLite 的 SQL 差异 | 只用 `LIMIT/OFFSET`、`||` 拼接与 `LIKE`；两库均支持 |
| 分页后排序稳定性 | 所有排序追加 `id DESC` 作为最后一级，避免同分/同日期翻页抖动 |
| 契约改动破坏既有调用方 | 同步改前端、E2E 断言与 `OpenApiTest`；`/me/*` 保持数组 |
| 删除 `dao` 影响测试 | 7 个 dao 测试通过 `@SpringBootTest` 注入 `repository` 端口，端口不变即无需改写 |
| 布局回归 | 浏览器在 1440 / 1024 / 768 / 390 四档测量「溢出容器」「重叠」两类几何问题 |

## 5. 验证方式

| 检查 | 命令 |
|---|---|
| 后端单测 | `cd RouteME/backend; .\mvnw.cmd -B test` |
| 契约 lint | `cd RouteME; npx @redocly/cli lint openapi.yaml` |
| 前端单测与构建 | `cd RouteME/frontend; npm run build; npm test` |
| 手工核对 | 首页翻页、筛选重置、我的旅行四分组、详情页分区、390px 选项卡 |