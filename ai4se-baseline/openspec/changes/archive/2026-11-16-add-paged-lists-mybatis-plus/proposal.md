# 变更提案：add-paged-lists-mybatis-plus

- **触发：** 用户反馈「列表没有分页」「卡片/组件没有对齐，出现覆盖、错位、重叠、遮挡」「请使用 MyBatis-Plus 与分页，简化 service/mapper（例如 ServiceImpl）」
- **能力：** `trip-plans`（MODIFIED）、`trip-experiences`（MODIFIED）、`design-system`（ADDED）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:sdd-artifacts`

## 问题

1. **列表没有分页。** `GET /api/matches`、`GET /api/trips`、`GET /api/experiences` 一次返回全部命中项；灵感首页与「旅行体验」视图把所有行程/体验一次性渲染成网格。演示库经 E2E 累积后招募中行程已有 30+ 条，「我的旅行」四个分组分别有 34 / 12 / 3 / 17 条，页面无限拉长，首页首屏之外全是卡片。
2. **持久层重复。** 每个表都有 `dao`（`JdbcClient` 手写 SQL）与 `repository`（接口）两份实现文件，增删字段要同时改 SQL、行对象解析与参数绑定，重复且易漂移；没有可复用的分页能力。
3. **布局缺陷。** 「我的旅行」把行程卡与按钮放在同一个横向 `Space` 里，行程卡作为 inline-flex 子项被压到 255–474px 不等宽，同一列表内卡片宽度不一致、右侧大片留白；窄屏下 `Tabs` 四项被裁切，第四项不可见也不可滚动；详情页各段落只有 8px 间距，游后体验的操作按钮紧贴正文，视觉上与前一段落粘连。

## 范围

**In scope**

- **持久层迁移**：引入 `mybatis-plus-spring-boot4-starter`；`entity` 改为 MyBatis-Plus 实体（`@TableName` / `@TableId`）；新增 `mapper` 包（`XxxMapper extends BaseMapper`）；用 `repository/impl` 下的 `ServiceImpl<Mapper, Entity>` 适配类替换全部 `dao`；删除 `dao` 包与手写 SQL。
- **分页**：`MybatisPlusInterceptor` + `PaginationInnerInterceptor`；新增 `PageParam`（`page` 从 1 起、`size` 默认 20、上限 50，非法值 400 `INVALID_INPUT`）与 `PageResponse<T>`（`items` / `page` / `size` / `total` / `total_pages`）。
- **契约**：`GET /api/trips`、`GET /api/matches`、`GET /api/experiences` 增加 `page`、`size` 参数，响应从数组改为分页对象；`openapi.yaml` 升级 `0.5.0` 并补 `Page*` schema 与两个 example。
- **前端**：新增 `shell/Pager`（上一页 / 页码 / 下一页 / 每页条数 / 共 N 条）；首页与体验视图接入分页并在筛选变化时回到第 1 页；行程卡在分页网格中保持等高。
- **布局修复**：「我的旅行」改为纵向列表行（卡片 + 右侧操作区，宽度一致）；详情页改为分区卡片（信息 / 同行者 / 游后体验 / 操作），统一 16px 段落间距；窄屏 `Tabs` 可横向滚动，不再裁切；体验卡与空状态对齐。

**Out of scope**

- `GET /me/trips`、`GET /me/experiences`、`GET /me/applications`、`GET /trips/{id}/experiences` 保持数组返回：它们是「我的」聚合与单行程上下文，条目数量由一次旅行决定。
- 搜索/筛选语义、排序键、匹配打分、状态推导、错误码集合不变。
- 不引入分页游标、不实现无限滚动、不做服务端缓存。
- 不重命名业务语义：`XxxService` 仍是业务契约（接口），`XxxServiceImpl` 只是其 MyBatis-Plus 实现；`XxxEntity` 与领域 record 继续分开。
- 不修复 `apply-prototype-visual-design` 之外的视觉重构（配色、外壳结构不变）。

## 原型对齐决议

| 冲突点 | 原型 | 本 change 裁决 |
|---|---|---|
| 列表是否需要分页 | 原型数据量小，无分页控件 | 需要分页；原型未覆盖，以本 change 的 `design-system` 增量规格为准 |
| 「我的旅行」行布局 | 原型是 `mine-row`（84px 封面 + 内容 + 操作） | 按原型行式布局重做，修复现行 `Space` 挤压 |
| 详情页信息密度 | 原型用 `panel` 分区 | 按原型分区，段落间距 16px |

## 影响面

| 位置 | 改动 |
|---|---|
| `backend/pom.xml` | 新增 MyBatis-Plus starter |
| `backend/src/main/java/routeme/{entity,mapper,pojo,service,service/impl,config,param,response,controller}` | 实体注解化、mapper、service 接口 + ServiceImpl 实现、分页拦截器、`PageParam` / `PageResponse`、三个列表端点 |
| `backend/src/main/java/routeme/{dao,repository}/**` | 删除（与 `mapper`、`service` 职责重合） |
| `backend/src/main/resources/application.yaml`、`mapper/*.xml` | MyBatis-Plus 配置与分页查询 SQL |
| `openapi.yaml`、`redocly.yaml` | 契约 0.5.0、分页 schema 与参数 |
| `frontend/src/shell/Pager.tsx`、`trips/useMatches.ts`、`experiences/useExperiences.ts`、`api.ts`、`types.ts`、`home/HomePage.tsx`、`mine/MyTripsPage.tsx`、`trips/TripDetailPage.tsx`、`styles.css` | 分页控件、分页状态、列表行布局、详情分区、窄屏 Tabs |
| `docs/knowledge/**` | 持久层与分页口径、验证命令 |

## 验收信号

1. `.\mvnw.cmd -B test` 全绿；新增分页用例覆盖「首页 page=1 size=5 → total 与 total_pages 正确」「page 超界返回空 items」「size>50 或 page<1 → 400 `INVALID_INPUT`」「默认不传参时 size=20」。
2. `npm run build` 与 `npm test` 全绿；`describeFilters` 等既有纯函数行为不变。
3. 首页在第 1 页只渲染 `size` 张卡片，切换页码后卡片变化且首屏回到列表顶部；筛选变化回到第 1 页。
4. 「我的旅行」四个分组内的卡片等宽、与操作按钮同行不重叠；390px 下四个选项卡都可点击。
5. 详情页在 1440px 与 390px 下无元素溢出容器、无重叠；游后体验操作按钮与正文间距 ≥16px。
6. 契约 lint 0 error（`npx @redocly/cli lint openapi.yaml`）。

## Spec ID

`add-paged-lists-mybatis-plus`，增量规格见 `specs/` 下三份 delta。