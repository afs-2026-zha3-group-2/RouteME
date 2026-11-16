# 任务：add-destination-area-filters

- **依据：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **Owner：** AO（Jay）
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11；先 Red 再 Green。
- **约束：** 一条任务只落一层；不改 `add-trip-publish` / `refine-inspiration-home` 的文件（A 的 5 条任务在它自己的 `tasks.md`）；不新增 CI 语义。

## 任务清单

### T1 [contract] 契约 0.7.0 与 OpenApiTest

- [x] `openapi.yaml`：版本 0.7.0；`GET /api/trips`、`/api/matches`、`/api/experiences` 删除 `q`；`destination` 查询参数改 `destination_code`；体验新增 `date_from`/`date_to`。
- [x] 响应 schema 新增 `destination_code`、`province_code`、`province_name`；`destination` 为标准名；`TripCreateRequest` 改 `destination_code`（A 的目的地修订字段；B 在契约文件中协同先行，发布页实现仍在 A 的 tasks）。
- [x] `OpenApiTest` 断言上述参数/字段与版本。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -B test`
**覆盖：** 响应返回代码与省名、列表接口无关键词参数、发布页非法代码（A 的契约面）

### T2 [backend] 区划字典与派生

- [x] 生成 `backend/src/main/resources/area/area-codes.json`（v5 数据，6 位码、含港澳台；含省 code/名称/展示名、市 code/名称、直辖市/港澳台标记）。
- [x] 新增 `AreaDictionary`：`isValidCityCode`、`findCity`、`provinceOf`、`displayNameOf`；名称/省名派生。
- [x] 单元测试 `AreaDictionaryTest`（P4 单元 TDD）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test`
**覆盖：** 二级节点代码唯一、直辖市/港澳台名称、响应返回代码与省名

### T3 [backend] V10 迁移与回填

- [x] `V10__add_destination_area_code.sql`：`ALTER TABLE trip_plans ADD COLUMN destination_code VARCHAR(6) NOT NULL DEFAULT ''`；CASE 回填 16 城/别名/种子；`destination` 回填标准名；索引。未知名称触发 NOT NULL 失败，不重建表、不触碰外键。
- [x] 迁移测试：临时 SQLite 执行 V1–V10，断言 seed code/标准名、体验仍关联、`destination_code` NOT NULL、索引存在；H2 上下文启动通过。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test`（AreaCodeMigrationSqliteTest + H2 Spring 上下文）

### T4 [backend] 领域/查询/匹配按代码

- [x] `TripPlan` 增加 `destinationCode`；`TripPlanEntity` 映射 `destination_code` + `destination`；`TripPlanService` 查询/响应改造。
- [x] `TripQuery`：删除 `keyword`，`destination` → `destinationCode`；`TripPlanMapper.xml` 按 code 过滤、删除 `q`。
- [x] `TripMatch.of` 按 code 比较；`TripController` / `MatchController` 参数改 `destination_code`，删除 `q`；响应新增 code/province。
- [x] `TripControllerTest` / `MatchControllerTest` / `TripPlanServicePersistenceTest` / `TripMatchTest` 回归。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test`
**覆盖：** 按城市筛选、日期/兴趣/组合、排序、响应字段、匹配"目的地相同"

### T5 [backend] 体验筛选与无搜索

- [x] `ExperienceController`/`ExperienceService`/`ExperienceServiceImpl`：删除 `q`；新增 `destination_code` + `date_from/date_to`；按关联行程 code/日期过滤。
- [x] `TripExperienceMapper.xml`：目的地 code、日期交集、删除 `q`；响应新增 code/province。
- [x] `ExperienceControllerTest`/`ExperienceServiceTest` 回归。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test`
**覆盖：** 体验按目的地/日期/组合筛选、体验分页与筛选并用、体验视图无关键词

### T6 [frontend] 区划选项与展示工具

- [x] `frontend/package.json` 增加 `element-china-area-data@5`（6 位码、含港澳台）。
- [x] 新增 `frontend/src/area/areaOptions.ts`：v5 → 省市级联选项；直辖市二级 label 覆盖为省级名；港澳台二级保留；提供 code→展示名/省名 helper。
- [x] 新增 `frontend/src/area/AreaCascader.tsx`：自绘两列省市级联面板（替代 antd Cascader，规避 Edge 浮层定位与页面滚动条抖动）；点外部/ESC 关闭，已选可清除。
- [x] 单元测试 `areaOptions.test.ts`（P4 单元 TDD）。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** 字典覆盖范围、直辖市级联选项、港澳台名称

### T7 [frontend] 首页筛选 UI 与搜索移除

- [x] `HomePage.tsx`：删除搜索框与 `q` 状态；目的地 Select → AreaCascader（自绘两列，选中市写入 code）；摘要、清除、空态保留。
- [x] `tripFilters.ts`/`types.ts`/`api.ts`：`FilterState.destination` → `destinationCode`；`toTripFilters` 发 `destination_code`；删除 `q`；摘要用字典渲染。
- [x] `tripFilters.test.ts`/`api.test.ts` 更新（倒置、只选省、摘要、无 q）。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** 按城市筛选、只选省不应用、级联两列选择、日期/兴趣/组合、摘要/清除/空态、无搜索框

### T8 [frontend] 展示与体验视图

- [x] `TripCard` 显示市名；`TripDetailPage` 显示"省 / 市"；港澳台"省 · 二级"。
- [x] `ExperienceCard` 标准名、不显示日期；`useExperiences` 发 `destination_code` + `date_from/date_to`，删除 `q`；`tripMessages.ts` 清理搜索占位/补文案。
- [x] 组件/纯函数测试更新。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** 体验卡地名口径/无日期、体验按目的地/日期筛选、体验空态

### T9 [e2e] 两个视图的验收

- [x] `e2e/tests/trips.spec.ts`：AreaCascader 选"广东省/珠海市"、只选省不生效、日期/周六、摘要/清除/空态、无搜索框。
- [x] `e2e/tests/experiences.spec.ts`：体验目的地/日期筛选、体验卡无日期、空态、无搜索框；本 change 的用例不依赖搜索框，`refine-inspiration-home` 的搜索空态用例由它的 owner 改写。
- [x] 回归 smoke：匹配、我的旅行、聊天、体验发布；不删除 seed。

**验证：** `cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts`
**覆盖：** 场景 1/5/6/7/11/12/13/14/15/16/17/18

### T10 [docs] 知识库与阶段记录

- [x] 更新 `docs/knowledge/interfaces`/`domain`/`architecture` 中目的地/契约/迁移口径（P4/P5 回写）。
- [x] 在 `docs/sdd/add-destination-area-filters/p3-design.md` 记录 P3 签署；P4 后写 `p4-verify.md`。

**验证：** 人工核对链接与命令可复现
**覆盖：** 文档一致性

### T11 [verify] 全量回归

- [x] `cd RouteME/backend; .\mvnw.cmd -B clean test`。
- [x] `cd RouteME/frontend; npm run build; npm test`。
- [x] `cd RouteME; npx @redocly/cli lint openapi.yaml`。
- [x] `cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts`。
- [x] 手工 1440/390：AreaCascader、摘要、体验卡、无搜索框、无"市辖区"；记录真实输出到 local-verify 报告。

**验证：** 上述命令全绿；报告贴真实命令与输出摘要
**覆盖：** 全部场景 + 非目标反向验证

## 条件跟踪（G1 C1–C6）

| 条件 | 落点 |
|---|---|
| C1 refine 先归档并改搜索测试 | 外部 owner；本 change T9 不依赖 refine 测试 |
| C2 A 的目的地修订 5 条任务在 B 数据底座后执行；A 后归档/重评 G1/G2 | T1/T2/T3 提供底座；A 的 tasks.md 执行 |
| C3 V10 外键 | T3 |
| C4 匹配 code 回归 | T4 |
| C5 Living Spec"关键词"术语收敛 | 归档合并（P5） |
| C6 契约 0.7.0/删 q/响应字段 | T1 |

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | Result | Evidence |
|---|---|---|
| `trip-plans` 3 Requirement 的场景均有 ATDD 行与任务 | Pass | ATDD §2 #1–#13；T1–T9 |
| `trip-experiences` 1 Requirement 的场景均有 ATDD 行与任务 | Pass | ATDD §2 #14–#18；T1、T5、T8、T9 |
| Non-goals 有反向验证 | Pass | ATDD §6；T9/T11 |
| 无静默范围扩张 | Pass | 发布页归 A；refine 不改；T10 只回写本 change 文档 |
| 任务不越过 Delta 范围 | Pass | 无发布 UI/代码任务（A 的 5 条在 A 的 tasks） |
| 任务一层一条、可执行 | Pass | T1 contract；T2–T5 backend；T6–T8 frontend；T9 e2e；T10 docs；T11 verify |
| 最后一条为验证/回归 | Pass | T11 |
| ATDD 先于实现 | Pass | T1/T9 先写失败验收；T2–T8 实现；T11 回归 |
| 契约先行 | Pass | T1 在 backend/frontend 之前 |

**结论：Pass。** 未发现 Spec ↔ Design ↔ Tasks ↔ ATDD 的阻塞性不一致。
