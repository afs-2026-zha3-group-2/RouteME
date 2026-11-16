# REQ-007 意图捕获 — 灵感首页按目的地与日期筛选

- **捕获日期：** 2026-11-16 ｜ **远程基线复核：** `main@229411a`（2026-11-16）
- **来源：** 用户故事（P0 ｜ 迭代 1 第 2–3 天 ｜ 故事点 2 ｜ 落点页面：灵感首页）
- **上游：** 用户在 `/sdd:p1` 会话中提交故事与验收标准；拉取远程最新代码后复核并修订
- **编号说明：** 远程已占用 REQ-005（`refine-inspiration-home`，首页双视图）与 REQ-006（`add-user-logout`），本需求改用 **REQ-007**
- **Discovery Decision：** `Go` — 候选一句话成立：在灵感首页补齐"目的地省市级联 + 日期区间"筛选，把目的地改为 6 位行政代码，并移除本迭代不做的搜索。

## 1. 原始用户故事

> 作为时间地点都不确定的学生，我希望按目的地和日期缩小范围，以便减少逐个翻看的成本。

## 2. 原始验收标准

1. 选择目的地后只保留该目的地的行程，并显示"已应用筛选"提示与清除入口
2. 选择日期区间后只返回与该区间有交集的行程
3. 兴趣标签可多选，命中任一即保留；时间不足时可降级为只展示标签、不参与筛选
4. 无结果时提示"换个条件试试"，不清空已选条件

## 3. 原始场景

- **前置：** 首页存在多个目的地
- **操作：** 选择珠海 + 周六
- **预期：** 仅剩满足条件的行程且筛选条件可见可清除

## 4. 现状核对（远程基线 229411a）

| 项 | 现状 | 结论 |
|---|---|---|
| 搜索 | 前端搜索框 + 后端 `q` + SQL LIKE 全链路仍在；`refine-inspiration-home` 的 E2E 用搜索制造空态，`add-trip-publish` 的发布用例按标题搜索 | 用户决定整体移除；`add-trip-publish` 相关场景已获授权修改，`refine-inspiration-home` 的搜索测试由其 owner 更新 |
| 目的地候选 | 前端 `map/placeCatalog` 的 16 城（广东 14 + 香港/澳门），`DESTINATIONS = CITY_NAMES`；发布页目的地/途经点/集合地点均用 `PlacePicker` | 目的地改为全国省市级联 Cascader（含港澳台，必须选到市）；途经点/集合地点保留地图选点 |
| 目的地存储 | `trip_plans.destination VARCHAR(20)` 中文名；后端只校验非空 | 改为 6 位行政区划代码权威 + 标准名派生；新增 `province_code`/`province_name` |
| 出发不早于 / 不晚于 | 前端日期输入 + 后端按行程日期区间求交集 | 保留；"周六"= 起止填同一天 |
| 兴趣 | 前端多选 + 后端标签 OR 匹配 | 保留，无需降级 |
| 已应用筛选 / 清除 | 前端摘要 + 清除按钮 + 空态保留条件 | 保留，摘要文案按省/市/港澳台口径调整 |
| 体验视图日期 | 筛选条可见，但前端不传日期、后端无日期参数 | 需补齐，否则为"假筛选" |
| 迁移 / 契约 | `add-user-auth` 已归档并占用 V9；`add-user-profile` 占用 V10；契约已 `0.6.0` | 本需求迁移改 **V11**，契约升 **0.7.0** |
| 进行中的同域 change | `refine-inspiration-home`（REQ-005，P3 Pass）同改 `trip-plans`/`trip-experiences`；`add-trip-publish` 拥有发布需求；`add-match-reason` 改 `trip-companions` | 归档顺序 `refine-inspiration-home` → 本 change → `add-trip-publish`；三者中只有本 change 属于本需求 |

**关键事实：** "兴趣"不是纯前端实现——前端只负责多选与传参，真正的过滤由后端 `TripPlanMapper.xml` / `TripExperienceMapper.xml` 的 SQL 完成（多标签 `OR`，命中任一即保留）。

## 5. 本轮决策记录（逐条，均为用户确认）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 筛选范围 | 灵感首页「行程」视图与「旅行体验」视图都要支持目的地 + 日期区间筛选 |
| D2 | 日期语义 | 保持"出发不早于 / 出发不晚于"自由区间，按行程日期区间求交集；要选"周六"就把起止填成同一个周六 |
| D3 | 目的地形态 | 用省市级联选择器（antd Cascader），必须选到市才应用筛选 |
| D4 | 目的地数据范围 | 全国省市二级数据，**必须含港澳台**，不允许自由输入 |
| D5 | 目的地存储口径 | 只存 6 位国标行政区划码；`destination` 名称列保留，但由后端按代码自动同步（code 权威） |
| D6 | 港澳台二级结构 | 沿用 v5 真实数据：香港→18 区，澳门→8 堂区，台湾→7 市 |
| D7 | 改造范围 | 首页筛选器 + 发布页目的地字段都改为省市级联；途经点/集合地点继续用地图选点。发布页目的地字段归 `add-trip-publish` 的目的地相关修订，本 change 不修改发布 requirement |
| D8 | 名称口径 | 统一使用区划字典标准名（如"珠海市"）；直辖市用省级名（"北京市"），不出现"市辖区" |
| D9 | 展示口径 | 卡片只显示市名；详情页与筛选摘要显示"省 / 市"；港澳台显示"香港 · 中西區"；体验卡不显示日期 |
| D10 | 搜索 | 本迭代把搜索框、前端传参、后端 `q` 参数、契约参数与相关测试**全部移除**；`add-trip-publish` 的"按标题搜索"场景改写为"首页列表/按目的地筛选可见"（已获授权）；`refine-inspiration-home` 的搜索相关测试由其 owner 更新 |
| D11 | 存量数据 | **V11** 迁移新增代码列；按地图城市库 16 城（含别名）与现有种子 5 城精确映射；名称列回填标准名 |
| D12 | 非空约束 | 为代码列加 `NOT NULL`；因 SQLite/H2 外键拦截重建表，实现改为 `ADD COLUMN ... NOT NULL DEFAULT ''` + 回填，不重建表（P4 实现修订） |
| D13 | 发布入参 | 发布行程只传 `destination_code`，名称由后端查字典生成并校验；该字段的实现归 `add-trip-publish` 的目的地修订，本 change 提供数据底座 |
| D14 | 省级搜索/筛选 | 不做"按省名搜索"，不支持"只选省筛全省"；必须选到市 |
| D15 | 交付形态 | 本 change 单 change、两份 delta（`trip-plans`、`trip-experiences`）；**不修改发布 requirement**；发布页目的地字段由 `add-trip-publish` 承载 |
| D16 | 需求编号 | 改用 **REQ-007**（REQ-005/006 已被远程占用） |
| D17 | 迁移与契约版本 | 迁移 **V11**（V10 被 user-profile 占用、V9 被 auth 占用）；契约升 **0.7.0** |
| D18 | 省名返回 | 后端返回 `province_code` + `province_name`（展示名：普通省"广东省"，港澳台"香港"/"澳门"），前端不再截短 |
| D19 | 体验卡日期 | 体验卡**不显示日期**，日期筛选仍然生效 |
| D20 | 归档顺序与归属 | `refine-inspiration-home` → `add-destination-area-filters` → `add-trip-publish`；三者中只有本 change 属于本需求，其它由各自 owner 归档，本需求不主动归档它们 |
| D21 | 搜索测试归属 | `add-trip-publish` 的搜索/目的地相关场景与 E2E 已获授权由本 change 修改；`refine-inspiration-home` 的搜索相关测试交其 owner |
| D22 | 区划数据包 | 选用 `element-china-area-data` v5（6 位码、含港澳台，数据约 2019/2020）；MVP 接受静态字典，后续可升级 |
| D23 | 发布页面边界 | 发布 UI/请求字段的改动不写入本 change 的 delta；本 change 只定义数据底座与筛选/展示，发布字段由 `add-trip-publish` 的目的地修订覆盖 |

**被推翻的早期选项（留痕）：**
- 曾选择"保留固定 8 城 + 支持自定义输入 + 新目的地自动出现"，在改为全国省市级联后由 D4 取代。
- 曾选择"筛选只列地图 16 城、不改发布"，后因全国范围与港澳台细分无法与地图城市库一致，改为 D7（改发布）。
- 曾选择"完全不改发布功能"，后改为 D7（发布页目的地字段改 Cascader；途经点/集合地点保留地图）。
- 曾选择"搜索只去前端/保留后端"，后改为 D10（前后端、契约、测试全部移除）。

## 6. 证据路径

- 前端筛选器与发布：`RouteME/frontend/src/home/HomePage.tsx`、`trips/tripFilters.ts`、`i18n/tripMessages.ts`、`trips/TripCreatePage.tsx`、`map/PlacePicker.tsx`、`map/placeCatalog.ts`、`trips/tripOptions.ts`
- 前端请求层：`RouteME/frontend/src/api.ts`、`trips/useMatches.ts`、`experiences/useExperiences.ts`
- 后端查询与发布：`RouteME/backend/src/main/java/routeme/{controller,service,request,param,mapper}/**`、`resources/mapper/{TripPlanMapper,TripExperienceMapper}.xml`
- 数据与迁移：`RouteME/backend/src/main/resources/db/migration/V4__seed_demo_trips.sql`、`V8__create_trip_experiences.sql`、`V9__add_user_credentials.sql`
- 现有规格：`openspec/specs/trip-plans/spec.md`（§搜索、筛选与排序）、`openspec/specs/trip-experiences/spec.md`（§灵感首页的旅行体验视图）
- 进行中的同域 change：`openspec/changes/refine-inspiration-home/`（REQ-005）、`openspec/changes/add-trip-publish/`、`openspec/changes/add-match-reason/`、`openspec/changes/add-user-logout/`（REQ-006）
- 现有测试：`backend/src/test/java/routeme/controller/{TripControllerTest,ExperienceControllerTest,OpenApiTest}.java`、`frontend/src/{trips/tripFilters.test.ts,api.test.ts}`、`e2e/tests/{trips,experiences}.spec.ts`
- 区划数据依赖说明：`https://github.com/Plortinus/element-china-area-data`（v5 含港澳台、6 位码；v6 不含港澳台、2/4 位码）
