> ⚠️ **部分作废 / PARTIALLY OBSOLETE（2026-11-15）** — 本文拓扑与运行时描述（`V1`–`V8` 迁移、26 个端点、`X-User-Id` 认证桩、review-reminders、`staffing.Application` 等）针对**已移除的 "staffing" 应用**，与当前唯一应用 **RouteME 路觅** 不符；仅少数行（如第 15 / 71 / 83 行）提及 RouteME。RouteME 的架构描述尚未在此登记。
> 保留仅作历史参考，**staffing 部分不得作为 RouteME 的架构证据**。`_LOG.md` 与 `rules/` 不受影响。

# Architecture knowledge

System architecture, C4, and topology notes.

## Declared layers

依赖方向、包分类与类名后缀的权威是 `@rule:package-structure`
([rules/architecture/rules.md](../rules/architecture/rules.md#package-structure))；本节只记录本仓库声明的层，不复制规则正文。

```text
controller → service（IService 接口）→ service/impl（ServiceImpl）→ mapper（BaseMapper）→ entity
controller / service → request / response / pojo / constant；config 仅装配
```

- 本仓库当前应用是 RouteME：`RouteME/backend/src/main/java/routeme/`，层包直接位于根包下，不建业务域目录层；规则里的 `staffing` 是上一作业的示例根包。
- 持久化只用 `mapper`（MyBatis-Plus），不再建 `repository` / `dao`；`manager` 仅在确有第三方封装或需要多服务组合时建立。
- 非 Web 小项目才按特性平铺；本项目为 Web 型，固定全局按层。跨层捷径需 ADR 或例外记录。
- The React frontend lives in `frontend/` per `@rule:web-coding-style`, outside Java packages.

## Application topology

```text
browser / Playwright (frontend/, e2e/)
        |  HTTP + X-User-Id header
        v
backend/   Spring Boot 4.1 (Java 21), port 8080, wire prefix /api
  controller -> service -> dao (JDBC) -> H2 file database
        |            |
        |            +-> RosterSummaryService -> DatabaseRosterSummaryService（名单读取）
        |            +-> MailGateway -> LoggingMailGateway（邮件 Outbox 适配）
        +-> Flyway migrations (db/migration, forward-only, V1-V8)
openapi.yaml   contract source of truth（`npm run lint:api` 校验）
```

- 运行时：单进程由 `staffing.Application` 启动；Jackson 使用 `SNAKE_CASE` 且省略空字段；**没有定时任务**，复审提醒由 `POST /api/notifications/review-reminders/scan` 触发扫描。
- 持久化：H2 文件库 `./data/staffing`（PostgreSQL 模式）；Flyway 应用 `V1`-`V8`；Hibernate 只做 schema 校验（`ddl-auto=validate`）；仓储是 `dao` 接口背后的 JDBC 实现，命名 `DatabaseXxxRepository`。H2 Console 在 `/h2-console`，本机可连。
- 身份（本地桩）：`X-User-Id` 由 `ActorArgumentResolver` 解析为 `staffing.model.UserAccount`；系统角色为 `project_owner` 与 `resource_coordinator`；生产前必须替换为真实认证。
- 可见性：在 service 层强制，UI 只做隐藏。项目负责人只看自己项目下的需求；协调员只看 `owner_coordinator_id` 为自己的需求。
- 名单读取端口：`RosterSummaryService` 由 `DatabaseRosterSummaryService` 基于已确认推荐实现；change C 落地后零值实现已移除。
- 通知端口：`MailGateway.send(Notification)`，本地适配器为 `LoggingMailGateway`；发送失败只记录 `failed` 并可在通知页重试，不阻断业务。
- HTTP 面：27 个端点，覆盖身份/字典、项目与需求、名单、候选池、人员统计、筛选与答复、推荐与终审、通知；权威清单在 `interfaces/README.md`，schema 在 `openapi.yaml`。
- 前端（已落地）：React 19 + TypeScript + Vite 8，位于 `frontend/`；`src/` 含 `api.ts`、`types.ts`、`route.ts`、`App.tsx`、`main.tsx`、`components/`、业务目录（`home`、`demands`、`projects`、`candidates`、`reports`、`screening`、`review`、`roster`、`notifications`）、`i18n/`、`utils/`；默认路由 `#/home`（首页仪表盘），旧深链 `#/demands/new` 显式回退需求列表，`#/demands?project=N` 携带项目筛选；工具链基线见 `operations/README.md`。
- 前端组件层：`components/` 提供 `AppShell`（横向 flex 壳层：全高深色侧栏 `#13213c` 220↔64px 折叠，品牌置顶 + 导航五组「工作台 / 需求 / 人才 / 结果 / 洞察」+ 底部版本点注；工作区内顶栏：搜索 / 铃铛 / 用户菜单，身份切换在用户菜单内）、`Modal`（焦点陷阱与回焦）、`ConfirmDialog`、`Skeleton`、`EmptyState`、`Pager`（编号分页 10/20/50）、`RowActionsMenu`（行内单主操作 + ··· 菜单）、`Toast`（右上角四档语气、按级时长、失败可重试）、`ErrorBanner`、`Field`、`SkillView`（标签 2+N）、`StatusBadge`（五档状态色，closed 红）；纯函数在 `utils/`（`pager` 含 `pageItems`、`format`、`download`）与 `ui/feedback.ts`（`toneFor`/`durationFor`）。
- 设计系统（change align-v2-design-system / align-v2-layout）：`styles.css` 按 tokens → base → shell → components → pages → responsive 分区；主色 `#2563eb`、页面背景 `#f8fafc`、行悬停 `#f8fbff`；动效分层（交互 160ms、侧栏 220ms、图表首次 500ms）；断点 1024（侧栏收起）/ 768（表格卡片化）/ 640（顶栏紧凑）；保留 `--color-*` 兼容别名与 `prefers-reduced-motion`；V2 布局组件：hero / mini-stat / 卡内 tabs / notice-list 行式通知 / route-chip / head-actions / 口径说明卡，均复用既有令牌与响应式类。
- 端到端：`e2e/playwright.config.ts` 与 `e2e/tests/*.spec.ts`，13 个 spec / 59 条用例，覆盖需求登记（弹窗四步向导）、需求编辑与评分、候选池、导入导出与分页、筛选、推荐终审、名单计数、通知 Outbox（行式）、协调员只读、人员统计报表（双图并排 + 口径说明）与 UI 体验（导航分组、确认弹窗、焦点回焦、390×844 无溢出、reduced motion），以及 V2 设计系统验收（侧栏折叠、顶栏入口、编号分页、行操作菜单键盘、标签 +N、Toast 位置、图表图例/提示框、768 卡片化）与 V2 布局验收 `v2-layout.spec.ts`（壳层拓扑与用户菜单、首页仪表盘聚合口径/空数据/深链、需求 tabs 计数与项目筛选、新建需求弹窗与旧深链回退、通知行式字段与重试、项目弹窗/需求数/查看需求、详情编辑入口与名单卡、mini-stat 缺口着色/排除 3 列/出差明细/route-chip）。
- 仓库布局：`backend/`（Java 服务）、`frontend/`（React + Vite + TypeScript）、`e2e/`（Playwright）、`openapi.yaml`（契约）、`docs/knowledge/`（本知识库）、`openspec/`（规格与变更）。

## 设计令牌对照表

取值权威：用户显式规范（REQ-013）> V2 原型（仅提供布局与组件模式）。口径权威：`openspec/specs/ui-experience/spec.md`（视觉令牌与状态色 / 响应式与动效等 Requirement）；实现权威：`frontend/src/styles.css` 的 `:root`。改色或改时长时三处 MUST 同批核对更新（本表即核对清单，evolve EV-R-3 采纳产物）。

| 类别 | CSS 变量 | 取值 | Living Spec 口径 |
|---|---|---|---|
| 主色 | `--primary` / `--primary-hover` / `--primary-soft` | `#2563eb` / `#1d4ed8` / `#eff6ff` | 主色与操作层级：主操作蓝，禁黑色主按钮 |
| 状态色 | `--success` / `--warning` / `--danger` / `--info` | `#10b981` / `#f59e0b` / `#ef4444` / `#3b82f6` | 状态色映射：绿（已确认/有效）、橙（待终审/待处理）、红（关闭/驳回/失败）、蓝（进行中） |
| 状态色浅底/深字 | `--*-soft` / `--*-text` | 如 `--danger-soft: #fef2f2`、`--danger-text: #b91c1c` | 危险操作红字而非大面积红底 |
| 图表五色 | `--primary` / `--cyan` / `--success` / `--warning` / `--violet` | 蓝 / 青 `#06b6d4` / 绿 / 琥珀 / 紫 `#8b5cf6` | 报表图表呈现：统一五色 + 图例 |
| 文本 | `--text` / `--muted` / `--faint` | `#111827` / `#6b7280` / `#9ca3af` | 正文 / 次要 |
| 边框与背景 | `--border` / `--bg` / `--card` | `#e5e7eb` / `#f8fafc` / `#ffffff` | 边框 / 页面背景 / 卡片 |
| 壳层 | `--sidebar` / `--sidebar-2` / `--row-hover` | `#13213c` / `#1e293b` / `#f8fbff` | 深色侧栏 220↔64px；行悬停 `#f8fbff` |
| 间距 | `--space-1`…`--space-7` | 4 / 8 / 12 / 16 / 20 / 24 / 32px | 内容区 max-width 1600px + 左右 24px |
| 圆角 | `--radius`（及 sm/md/lg/xl） | 12px（8 / 12 / 16 / 20px） | 卡片圆角 12 |
| 动效 | `--dur-fast` / `--dur-sidebar` / `--dur-chart` | 160ms / 220ms / 500ms | 交互 ≤200ms（基线 160ms）、侧栏 200–240ms、图表首次 400–600ms；reduced-motion 全关 |
| 断点 | 媒体查询（非变量） | 1024 / 768 / 640px | ≤1024 收侧栏、≤768 表格卡片化、≤640 顶栏紧凑 |

- 兼容别名：`--color-*`（如 `--color-primary`、`--color-danger-bg`）与 `--danger-bg` / `--success-bg` / `--warning-bg` 均指向新令牌，旧代码可继续引用；新增样式 MUST 用新令牌名。
- 状态徽标落点：`StatusBadge`（五档，closed 红）；Toast 四级时长在 `ui/feedback.ts` 的 `durationFor`（成功/信息 3s、警告 5s、失败 8s），不在 CSS 令牌内。

## RouteME 应用拓扑（2026-11-13）

`RouteME/` 是同一仓库内的第二个应用，与上面的 staffing 应用互不依赖，共用本知识库与规则。

```text
browser (RouteME/frontend, React 19 + Vite 8 + Ant Design)
        |  /api（dev: Vite proxy → 8080）
        v
RouteME/backend   Spring Boot 4.1.2 (Java 21) :8080
  controller → service (IService 接口) → service/impl (ServiceImpl) → mapper (BaseMapper) → entity → SQLite SqlLite/routeme.db
  Flyway migrations: backend/src/main/resources/db/migration（V1-V9，只增不改）
RouteME/openapi.yaml   契约 SoT（info.version 0.6.0）
```

- 根包 `routeme`：`@rule:package-structure` 的 `staffing` 根包是上一作业的领域名，RouteME 按产品名建包，层包与依赖方向不变；例外记录在 `openspec/changes/archive/2026-11-15-bootstrap-hello-world/design.md`。
- 地图选点（2026-11-16）：`frontend/src/map/` 是离线地点能力，`placeCatalog`（广东城市与常见 POI 的固定地名库 + 投影/搜索/最近点）→ `PlaceMap`（SVG 示意地图，点击吸附最近地点）→ `PlacePicker`（搜索建议 + 地图点选 + 已选编号）。目的地、途经点与集合区域共用这一层；手输必须命中地点库，否则提示“地图上搜不到”。后端 `TripPlan` 只要求目的地非空且 ≤40 字，不再限制固定城市列表。

### RouteME 后端包结构（2026-11-15 定稿）

`RouteME/backend/src/main/java/routeme/` 按层分包，包名与类名后缀一一对应：

| 包 | 现有成员 | 职责 |
|---|---|---|
| controller | 11 个 `XxxController` | 路由、参数绑定与校验、DTO↔领域转换、状态码映射 |
| param | `TripQueryParam`、`PageParam` | 入参解析（标签拆分、排序取值、分页校验、默认值），无业务判断 |
| service | `ApplicationService`、`AuthService`、`ChatService`、`DemoUserService`、`ExperienceService`、`GreetingService`、`MatchService`、`MyTripsService`、`ReportService`、`TripPlanService`（均为接口） | 业务规则与编排；拥有数据表的接口继承 `IService<XxxEntity>`，纯计算 / 聚合服务（`MatchService`、`MyTripsService`）不继承 |
| service/impl | 10 个 `XxxServiceImpl` + `AbstractServiceImpl` | `extends ServiceImpl<XxxMapper, XxxEntity>` 实现接口，事务边界在这里；`AbstractServiceImpl` 只放 `nextId` / `firstBy` 这类跨表重复取数 |
| mapper | 8 个 `XxxMapper extends BaseMapper`，全部标 `@Mapper` | MyBatis-Plus 映射；**注解里不写 SQL**：简单条件用 `LambdaQueryWrapper`，复杂 join / 分组写 `resources/mapper/*.xml`（`TripPlanMapper.xml`、`TripExperienceMapper.xml`、`ChatMessageMapper.xml`） |
| pojo | 领域 record `TripPlan`、`TripPlanDraft`、`TripApplication`、`TripExperience`、`TripMatch`、`ChatThread`、`ChatMessage`、`Greeting`、`Report`、`DemoUser`、`MatchCandidate`、`PageResult`、`UserAccount`、`AuthSession` | 业务语义 record，无持久化注解；与 `entity` 分工：领域对象随业务变 |
| entity | `GreetingEntity`、`TripPlanEntity`、`TripApplicationEntity`、`TripExperienceEntity`、`ChatMessageEntity`、`ChatThreadEntity`、`ReportEntity`、`UserEntity`、`AuthSessionEntity` | 表结构映射实体（`@TableName` / `@TableId(INPUT)` + `toXxx()`），只被 mapper 与 `service/impl` 引用，向上转 pojo 领域对象 |
| request | `ApplicationCreateRequest`、`AuthLoginRequest`、`AuthRegisterRequest`、`ChatMessageRequest`、`ExperienceWriteRequest`、`ReportRequest`、`TripCreateRequest`、`TripQuery` | 入参 record，与 `openapi.yaml` 入参 schema 一一对应 |
| response | `AuthSessionResponse`、`ChatMessageResponse`、`ChatPartnerResponse`、`DemoUserResponse`、`ErrorResponse`、`ExperienceResponse`、`ExperienceSaveResponse`、`GreetingResponse`、`MatchCandidateResponse`、`MatchResponse`、`MyTripsResponse`、`PageResponse`、`ReportReceiptResponse`、`TripApplicationResponse`、`TripDetailResponse`、`TripSummaryResponse` | 出参 record 与错误体，与 `openapi.yaml` 出参 schema 一一对应 |
| vo | 空占位 | 响应形状与 `pojo` 领域对象显著不同时才启用 |
| enums | `ApplicationStatusEnum`、`TripStatusEnum`、`ExperienceIntensityEnum` | 业务枚举（wire 值 + 显示文案） |
| constant | `AuthConstant`、`TripCatalogConstant` | 静态字典与阀值（目的地、长度/容量/标签/认证字段上限） |
| config | `ClockConfig`、`MybatisPlusConfig`、`SqliteDirectory` | Spring 装配，无业务判断；`MybatisPlusConfig` 注册 `@MapperScan` 与分页拦截器（上限 50，不固定 DbType） |
| exception | `BusinessException`（基类，带 `code` + `HttpStatus`）与 15 个子类（`InvalidInputException`、`TripNotFoundException`、`ForbiddenActionException`、`UsernameTakenException`、`InvalidCredentialsException`、`SessionInvalidException` 等） | 业务异常，全部以 `Exception` 结尾 |
| handler | `GlobalExceptionHandler` | 唯一 `@RestControllerAdvice`：`BusinessException` + 框架解析异常 + 兵底 `Exception`，三个方法覆盖全部错误映射；日志用 Lombok `@Slf4j` |
| utils | `JsonListUtils`、`PasswordUtils` | 无状态工具，叶子包 |
| annotation / aspect / interceptor / mq / sql | 空占位（`.gitkeep`） | 为 AOP、拦截器、消息队列与 SQL 片段预留；持久化映射统一用 `mapper`，没有 `dao` / `repository` |

- 后缀约定：`XxxController`、`XxxParam`、`XxxService`、`XxxServiceImpl`、`XxxMapper`、`XxxEntity`、`XxxEnum`、`XxxConstant`、`XxxRequest`/`XxxQuery`（request）、`XxxResponse`/`XxxResult`（response）、`XxxVo`、`XxxUtils`、`XxxConfig`、`XxxException`；看到后缀即可定位包。
- **entity 与 pojo 不是一个东西**：`entity` 只放表结构映射（随表变），`pojo` 只放业务语义 record（随业务变）；跨层只传 `pojo`，实体不出 `service/impl`。
- **service 注释**：每个 service 接口方法 MUST 写 `/** ... @param ... @return ... */` Javadoc；实现类只写类级注释说明实现要点（SQL 分页、事务边界、复用关系），不重复接口注释。
- MyBatis-Plus 三段式：controller → `service`（接口，拥有表的继承 `IService<XxxEntity>`）→ `service/impl`（`extends ServiceImpl<XxxMapper, XxxEntity>`）→ `mapper`（`BaseMapper`，带 `@Mapper`）→ 表。`repository` 与 `dao` 已删除（与 `service`、`mapper` 职责重合）。
- SQL 位置约定：**注解（`@Select` / `@Update` 等）不写 SQL**；单表条件与排序用 `LambdaQueryWrapper`，跨表 join、分组、聚合与分页写 `resources/mapper/*.xml`。
- 日志：`resources/logback-spring.xml` 定义 `STDOUT`（控制台，阈值 INFO）、`TRACE_FILE`（全量，`logs/routeme-trace.log`）与 `ERROR_FILE`（仅 ERROR，`logs/routeme-error.log`）；日志目录用 `LOG_PATH` 覆盖，应用日志级别用 `LOG_LEVEL_ROUTEME`（默认 INFO，临时排查可设 TRACE）。日志统一落在 `backend/logs/`，`*.log` 与 `logs/` 均被 `.gitignore` 忽略，不得在工作区根目录留下临时日志；代码统一用 Lombok `@Slf4j`，不手写 `LoggerFactory`。
- 异常两段式：业务异常继承 `exception/BusinessException`（构造时给契约错误码与 `HttpStatus`），`handler/GlobalExceptionHandler` 只写 3 个 `@ExceptionHandler`；新增错误码只加子类，不改处理器。
- 2026-11-15 定稿动作：枚举类加 `Enum` 后缀并从 `constant` 移入 `enums`（`TripCatalog` → `TripCatalogConstant`）；`XxxRow` 更名 `XxxEntity` 并移入 `entity`；`XxxRepository` 接口移入 `repository`，`DatabaseXxxRepository` 更名 `XxxDao` 留在 `dao`；`JsonListCodec` 更名 `JsonListUtils` 移入 `utils`；`TripQueryParams` 更名 `TripQueryParam` 移入 `param`；恢复 `annotation`/`aspect`/`interceptor`/`mapper`/`mq`/`sql`/`vo` 占位包与 `resources/logback-spring.xml`。`mvnw -B -o clean test` 132 项全绿。
- 2026-11-15 定稿动作（续）：`dto` 拆为 `request`（6 个入参）/`response`（14 个出参），`ExperienceSaveResult` → `ExperienceSaveResponse`；异常统一为 `BusinessException` + 12 个子类并加 `Exception` 后缀（`TripNotOpen`→`TripNotOpenException` 等），`ApiErrorHandler` 重写为 `handler/GlobalExceptionHandler`，处理点从 14 个方法兼为 3 个。
- 真实同义包仍禁止：`do` / `bo` / `req` / `resp` 不建；`pojo`（数据对象）与 `request` / `response`（传输对象）职责不同；`param`（入参解析）与 `request`（入参 record）职责不同，两者并存；`constant`（字典/阀值）与 `enums`（枚举）不混放。
- 运行时 SQLite、测试 H2 内存库，共用一组迁移脚本；SQL 只用两库通用语法（`INTEGER PRIMARY KEY` + 显式 id 插入），避免两份迁移漂移。
- `GET /api/greeting` 是单例资源（表内单条记录），为复数资源规约的已记录例外；`GreetingServiceImpl` 用 `firstBy` 取首行。
- 持久层（2026-11-15）：`mybatis-plus-spring-boot4-starter:3.5.18` + `mybatis-plus-jsqlparser`（3.5.9 起分页拦截器拆到此模块）；`map-underscore-to-camel-case` 负责列名映射，`@TableId(type = INPUT)` 保留「最大 id + 1」的演示用 id 策略。
- 2026-11-15 结构收敛（用户裁决）：删除 `repository` 与 `dao`（与 `service`、`mapper` 职责重合），`service` 改为接口、实现移入 `service/impl`（`extends ServiceImpl<XxxMapper, XxxEntity>`）；`model` 并入 `pojo`，而 `entity` 保持独立（表结构映射与领域对象分离）；`TripPlanQueryService` 的过滤下沉到 `TripPlanMapper.xml`，接口新增 `selectOpenList` 供匹配使用。
- 分页口径：`page` 从 1 起、`size` 默认 20、上限 50（`param/PageParam`，非法值 400 `INVALID_INPUT`）；响应 `response/PageResponse` 为 `{items,page,size,total,total_pages}`。`/trips` 与 `/experiences` 在 SQL 层分页（`LIMIT/OFFSET`），`/matches` 先算匹配分再在应用层切页；`/me/*` 与 `/trips/{id}/experiences` 仍返回数组。排序末尾统一追加 `id DESC` 保证翻页稳定。
- 前端业务状态在 `src/home/useGreeting.ts`，请求只走 `src/api.ts`，文案在 `src/i18n/messages.ts`；Ant Design 由需求方指定引入。
- 行程能力（`trip-plans`，2026-11-15）：`app_users` + `trip_plans`（V3/V4）；状态由 `completed_at` 与 `joined_count`/`capacity` 投影；搜索/目的地/日期区间/标签/排序在 `TripPlanMapper.xml` 完成；前端 `src/home/HomePage.tsx`（列表）、`src/trips/`（发布、详情、表单与筛选纯函数）、`src/identity/IdentityGate.tsx`；接口见 `interfaces/README.md`。
- 同行能力（`trip-companions`，2026-11-15）：`trip_applications`/`chat_messages`/`reports`（V5–V7）；无独立 companions 表，同行关系 = 发布者 + `ACCEPTED` 申请；`ApplicationService` 在事务内调用 `TripPlanService.addCompanion/removeCompanion` 单一写入 `joined_count`；`MatchService`/`TripMatch` 只读行程；`ChatService` 由「已接受」推导权限；前端 `src/trips/ApplicationsPage.tsx`、`src/mine/MyTripsPage.tsx`、`src/chat/ChatPage.tsx`、`src/safety/`。
- 体验能力（`trip-experiences`，2026-11-15）：`trip_experiences`（V8，`UNIQUE(trip_id, author_id)`）；`ExperienceService` 复用 `ApplicationService.participants` 判资格并在同一 `(trip, author)` 上 upsert；列表按 `updated_at` 倒序；参考发布由前端 `?from=` 预填、不新增 copy 接口；前端 `src/experiences/`（分享页、体验卡、校验纯函数）、首页视图切换、详情体验区、`TripCreatePage` 预填。
- 账号认证（`user-auth`，2026-11-16）：Living Spec `openspec/specs/user-auth/spec.md`（归档 `openspec/changes/archive/2026-11-16-add-user-auth/`）。`app_users` 增 `username` / `password_hash`，新增 `auth_sessions`（V9）；`AuthController` 提供 `/api/auth/register|login|me|logout`，`AuthService` 负责注册校验、PBKDF2-HMAC-SHA256 密码与 7 天不透明 Bearer token；演示账户两列为 `NULL`，不能密码登录，`/api/users/demo` 只返回演示记录。前端 `identity/authForm.ts`（校验、预设兴趣、`addInterest`/`removeInterest`）、`identity/AuthPanel.tsx`（登录/注册 + 兴趣卡片选择器：12 个预设 + 自定义，最多 5 个，仅已选标签提交）、`App.tsx` 的 token 恢复与退出；其余业务端点仍以 `X-User-Id` 识别身份。
- 设计系统（`design-system`，2026-11-15）：变更包 `openspec/changes/apply-prototype-visual-design/`；`RouteME/frontend/src/styles.css` 的 `:root` 与 `[data-theme="dark"]` 是视觉取值的实现权威（颜色、圆角、阴影、字体、间距、断点），`src/theme.ts` 以同值色板映射 Ant Design `ConfigProvider`，两处 MUST 同批修改；新增样式只引用令牌，不散落硬编码色值。
- 应用外壳（`shell/`，2026-11-15）：`shell/AppShell`（固定顶栏 + 左侧导航 + ≤900px 底部标签栏 + 跳过导航链接）、`shell/useColorMode`（`data-theme` + localStorage `routeme.colorMode`，初值跟随系统偏好）、`shell/Avatar`、`shell/EmptyState`；`trips/TripCard` 由首页与我的旅行共用；视觉原型见 `docs/prototype/styles.css` 与 `ui.js`，取舍（导航项、统计口径、不引入第二套样式方案）见 change 的 `design.md`。
- CI：仓库根 `.github/workflows/ci.yml`，backend `./mvnw -B verify`，frontend `npm ci && npm run build && npm test`；Playwright 端到端（`RouteME/e2e`）按 bootstrap 决定不进 CI，作为本地门禁。
