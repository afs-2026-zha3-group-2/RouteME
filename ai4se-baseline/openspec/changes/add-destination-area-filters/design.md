# 设计：add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007；`trip-plans` MODIFIED、`trip-experiences` MODIFIED）
- **输入：** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)
- **基线：** 远程 `main@229411a`；`refine-inspiration-home` / `add-trip-publish` 未归档

## 结论

本 change 用一套 6 位行政区划码替换目的地的中文名标识，并在灵感首页两个视图落地省市级联/日期筛选；发布页目的地字段由 `add-trip-publish` 的并行目的地修订承载。设计重点是**数据契约单一来源**（字典）、**SQLite 重建迁移**、**两个视图共享筛选状态**、**搜索移除的跨 change 收敛**。

## 关键取舍

### D1 数据模型与迁移

| 方案 | 行为 | 结论 |
|---|---|---|
| 新增可空 `destination_code`，应用层校验 | 迁移简单，但库层无法保证非空，脏数据风险 | 否决 |
| 重建 `trip_plans`，`destination_code VARCHAR(6) NOT NULL` + 索引 | 符合 code 权威；SQLite 需新表→拷贝→drop→rename | 采用 |
| 同时存 `province_code`/`province_name` 列 | 冗余，需双写一致性 | 否决（从字典派生） |

- `destination` 名称列保留，作为标准名缓存；由后端按代码派生写入，不手改。
- `trip_experiences` 不加目的地列，继续 `JOIN trip_plans`。
- V10（V9 被 `add-user-auth` 占用）：16 城/别名/种子映射；未映射名称使迁移失败；外键处理见 D7。

### D2 区划字典

| 方案 | 行为 | 结论 |
|---|---|---|
| `element-china-area-data` v5（6 位码、含港澳台，数据约 2019/2020） | 与用户指定包一致；前端直接 import，后端生成同源 JSON 资源 | 采用 |
| v6 + 自维护港澳台 | 数据较新，但 2/4 位码，需自补港澳台 | 否决（码制不一致） |
| DB 表存字典 | 可查询，但增加迁移/同步成本 | 否决（静态只读资源足够） |

- 后端：`backend/src/main/resources/area/area-codes.json`（由 v5 数据生成）+ `AreaDictionary` 服务；提供 `findCity(code)`、`provinceOf(code)`、`displayNameOf`、`isValidCityCode`。
- 前端：`element-china-area-data@5` 的 `provinceAndCityData`，用 `areaOptions.ts` 归一化为 antd Cascader；直辖市二级 label 覆盖为省级名（如"北京市"），港澳台使用 v5 二级节点。
- 名称规则：普通城市=二级标准名；直辖市=省级名；港澳台="省级简称 · 二级名"；`province_name` 为展示名（普通省全名，港澳台简称）。

### D3 接口契约 0.7.0

| 方案 | 行为 | 结论 |
|---|---|---|
| 保留 `q`、新增 `destination_code` | 兼容旧调用，但与"搜索移除"冲突 | 否决 |
| 删除 `q`；`destination` 查询参数改 `destination_code`；响应新增 code/province 字段 | 与前端/筛选一致；契约需升版 | 采用 |
| 响应只返回 code，名称全前端解析 | 前端需重复字典；与"名称自动同步"冲突 | 否决 |

- `GET /api/trips`、`GET /api/matches`、`GET /api/experiences`：删除 `q`；`destination_code`（6 位二级）；体验新增 `date_from/date_to`。
- 响应 `TripSummaryResponse` / `TripDetailResponse` / `ExperienceResponse` / `MatchCandidateResponse`：新增 `destination_code`、`province_code`、`province_name`；`destination` 为标准名。
- `TripCreateRequest.destination` → `destination_code`：由 A 的目的地修订承载；B 只提供字典/实体/响应。

### D4 后端领域与查询

| 方案 | 行为 | 结论 |
|---|---|---|
| `TripPlan` 同时持有 code + 名称 | 查询/展示/匹配都可就地取值；名称由字典派生 | 采用 |
| 仅持有 name，查询时反查 code | 每次查询依赖字典；匹配易回退到名称比较 | 否决 |

- `TripPlan` 增加 `destinationCode`；`TripPlanEntity` 映射 `destination_code` + `destination`。
- `TripQuery`：`destination` → `destinationCode`；删除 `keyword`；`TripPlanMapper.xml` 改为 `t.destination_code = #{destinationCode}`，删除 `q` 条件。
- `TripExperienceMapper.xml`：目的地按 code；新增日期交集；删除 `q`。
- `TripMatch.of`：按 `destinationCode` 比较；理由文案「目的地相同」不变。
- `ExperienceServiceImpl`：删除 `matches(q)`/`listAll(q)` 的关键词逻辑；`listPage` 增加日期参数；`listAll` 若未使用则删除或保留无 q 版本。
- `AreaDictionary` 负责发布/查询的 code 校验与名称派生；未知 code → `INVALID_INPUT`。

### D5 前端筛选与展示

| 方案 | 行为 | 结论 |
|---|---|---|
| 保留原生 `<select>` + 地图 16 城 | 与全国/港澳台细分不一致 | 否决 |
| antd Cascader，值 `[provinceCode, cityCode]`，仅长度 2 生效 | 与"必须选到市"一致；选项可输入过滤 | 采用 |
| 只选省也触发筛选 | 与 D14 冲突 | 否决 |

- `FilterState.destination` → `destinationCode`（可空）；Cascader 值用 `string[]`，`length === 2` 才写入 `destinationCode`。
- `toTripFilters` 发送 `destination_code`；`describeFilters` 用字典渲染"广东省 / 珠海市"、港澳台"香港 · 香港岛"。
- `HomePage` 删除搜索框与 `q` 状态；`useExperiences` 增加 `destination_code` + `date_from/date_to`。
- `TripCard` 显示市名；`TripDetailPage` 显示"省 / 市"；`ExperienceCard` 沿用标准名且不显示日期。
- 发布页 `TripCreatePage` 目的地改 Cascader（A）；途经点/集合地点继续 `PlacePicker`。

### D6 搜索移除

| 方案 | 行为 | 结论 |
|---|---|---|
| 只去前端搜索框，保留后端 `q` | 契约/测试仍背搜索债 | 否决（用户要求全删） |
| 前端、后端、契约、测试全部删除 | 与 D10 一致；需同步 A/refine 的测试 | 采用 |

- 删除 `q` 的落点：`types.ts`、`api.ts`、`tripFilters.ts`、`HomePage.tsx`、`useExperiences.ts`、`tripMessages.ts`、后端三个 controller/service/query/mapper、`openapi.yaml`、前后端测试、E2E。
- A 的"按标题搜索"场景改为"默认列表/按目的地筛选可见"；refine 的搜索空态 E2E 由 owner 改。

### D7 迁移与外键

- SQLite 重建步骤：`PRAGMA foreign_keys=OFF` → 建 `trip_plans_new` → 拷贝/映射 → drop 旧表 → rename → 建索引 → 校验 → `PRAGMA foreign_keys=ON`。
- 迁移脚本用 CASE 映射：16 城短名/标准名 + 别名；种子 5 城是子集；未知名称用失败查询/触发器阻断（SQLite 无独立 RAISE；Flyway 脚本先校验无未知）。
- 迁移测试：临时 SQLite 文件库执行 V1–V10，断言 6 条种子行程 code/标准名正确、2 条体验仍关联、索引存在。

### D8 匹配口径

- `TripMatch.of` 的 `filterDestination` 改为 `filterDestinationCode`；与 `candidate.destinationCode` 比较；参照行程也用 `destinationCode`。
- `add-match-reason` 的 50 分权重与理由文案不变；补 `TripMatchTest` 回归。

### D9 错误与边界

- 非法/非二级/未知 code → 400 `INVALID_INPUT`；不产生行程。
- 只选到省：前端不写筛选；后端不会收到半成品 code。
- 未知旧名称迁移失败，不静默填空。
- 无结果：空态保留条件；体验视图同样。

## 风险与例外

- **v5 数据时效：** 数据约 2019/2020；MVP 接受静态字典，升级不改契约。
- **地图 16 城遗留数据：** 迁移映射覆盖 16 城/别名；已结束行程同样映射。
- **跨 change：** refine 先归档、A 后归档；本 change 不改发布 requirement、不改 refine 文件。
- **E2E 数据：** 真实 SQLite 会累积；用唯一标题/目的地/日期区间，不依赖搜索框。
- **NFR：** 用户确认不做性能/可观测性专项；P4 只做常规错误码/日志回归。

## 与 ATDD / tasks 的关系

- ATDD 只设计 API + E2E 层；纯函数（`tripFilters`、`areaOptions`、`TripMatch`）列为 `Defer UT`，在 P4 用单元测试覆盖。
- tasks 按 contract → backend → frontend → e2e → verify 分层，一条任务只落一层。
