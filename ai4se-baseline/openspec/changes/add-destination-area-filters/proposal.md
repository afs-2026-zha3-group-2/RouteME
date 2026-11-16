# 变更提案：add-destination-area-filters

- **触发：** 迭代 1 用户故事「作为时间地点都不确定的学生，我希望按目的地和日期缩小范围，以便减少逐个翻看的成本」（P0 ｜ 故事点 2 ｜ 落点：灵感首页）＋ 用户在 `/sdd:p1` 中确认的 D1–D23 决策（含远程基线 229411a 复核）
- **需求条目：** `requirement-workspace/requirements/REQ-007-destination-area-filters.md`
- **能力：** `trip-plans`（MODIFIED）、`trip-experiences`（MODIFIED）
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:sdd-artifacts`
- **基线：** 远程 `main@229411a`。`add-paged-lists-mybatis-plus`、`apply-prototype-visual-design`、`add-user-auth` 已归档；`refine-inspiration-home`（REQ-005，P3 Pass）、`add-trip-publish`、`add-match-reason`、`add-user-logout`（REQ-006）进行中。
- **归档顺序：** `refine-inspiration-home` → 本 change → `add-trip-publish`。三者中只有本 change 属于 REQ-007；其它由各自 owner 归档，本 change 不主动归档它们。

## Why

灵感首页的目的地候选与离线地图城市库绑定（16 城、无省市层级），「旅行体验」视图的日期筛选不生效，搜索不在本迭代投入；把目的地与日期筛选做扎实，才能减少学生逐个翻看的成本。

## What Changes

- `trip-plans`：目的地改为 6 位行政区划码 + 省市级联筛选 + 标准名/省名展示；移除关键词搜索。
- `trip-experiences`：旅行体验视图补目的地代码 + 日期区间筛选；体验卡不显示日期；移除关键词搜索。
- 数据底座：V11 迁移、区划字典、响应字段；发布页目的地字段由 `add-trip-publish` 目的地修订承载。

## 问题

1. **目的地没有省市层级。** 前端候选来自离线地图地名库 `map/placeCatalog` 的 16 城（广东 14 + 香港/澳门），`DESTINATIONS = CITY_NAMES`；后端 `trip_plans.destination VARCHAR(20)` 存中文名，只校验非空。用户无法按"省 → 市"定位，也无法覆盖港澳台细分。
2. **体验视图的日期筛选是"假筛选"。** 筛选条在「旅行体验」视图照常渲染，但 `useExperiences` 不传日期，`GET /api/experiences` 也不接收日期参数；用户填了日期列表不变。
3. **搜索框不在本迭代投入。** 搜索已贯通前端、后端 `q` 参数、SQL LIKE 与契约；本迭代决定整体移除。`add-trip-publish` 的"按标题搜索"场景与 `refine-inspiration-home` 的搜索空态 E2E 会受影响：前者已授权由本 change 改写，后者交其 owner。
4. **名称与代码未分离。** 目的地名称是唯一标识，无法支撑行政区划字典、直辖市（"市辖区"）与港澳台（香港 18 区/澳门 8 堂区/台湾 7 市）的规范展示；V9 已被 auth 占用，契约已 0.6.0。

## What Changes（详细范围）

## 范围

**In scope（本 change）**

- **数据底座：** 6 位国标行政区划码为权威；省市二级；含港澳台；`destination` 名称列保留并由后端按代码同步为标准名；新增 `province_code` + `province_name`（展示名）；`trip_experiences` 不新增目的地列。
- **数据库迁移 V11：** `ALTER TABLE trip_plans ADD COLUMN destination_code VARCHAR(6) NOT NULL DEFAULT ''`；按地图城市库 16 城（含别名）与现有种子映射回填；`destination` 回填标准名；建立索引。不重建表，兼容 SQLite/H2 与既有外键。
- **首页筛选：** 目的地改为省市级联（必须选到市）；保留日期区间交集与兴趣 OR；"已应用筛选"摘要按省/市口径展示；清除全部；无结果空态保留条件。
- **体验视图筛选：** 目的地改为代码 + 新增日期区间，按关联行程日期区间求交集；体验卡不显示日期。
- **地名展示：** 卡片显示市名（直辖市显示省级名，如"北京市"）；详情与筛选摘要显示"省 / 市"；港澳台显示"香港 · 中西區"式"省级简称 · 二级名"；省名由后端返回展示名。
- **移除搜索：** 前端搜索框与 `q` 状态、后端三个接口的 `q` 参数与 SQL 条件、契约参数、相关单测/E2E 全部删除。
- **契约：** `openapi.yaml` 升 **0.7.0**：删除 `q`；查询参数改 `destination_code`；行程/体验响应新增 `destination_code`、`province_code`、`province_name`；体验列表新增 `date_from/date_to`。
- **协作（不在本 change delta）：** 发布页目的地字段（`PlacePicker` → 省市级联面板、请求 `destination_code`、发布校验、目的地 E2E/design/spec）归 `add-trip-publish` 目的地修订；已获授权只改目的地相关，不归档。

**Out of scope**

- 关键词搜索（本迭代整体移除，不做替代；后续恢复另开 REQ）。
- 按"省"筛选/搜索全省（必须选到市）。
- 自由输入地名、地图选点作为目的地、三级区划（区/县）、港澳台以外境外地区。
- 发布 requirement 的 delta 作者化（归 `add-trip-publish`）；行程编辑；个性化推荐、附近的人、按距离/预算筛选。
- 体验卡日期展示（已确认不显示）。
- 不改变匹配的业务规则；仅把"目的地相同"的比较口径从名称改为代码。

## 关键决策（摘要）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 覆盖视图 | 行程视图 + 旅行体验视图都支持目的地/日期筛选 |
| D2 | 日期语义 | 保留出发不早于/不晚于；交集；"周六"= 起止同日 |
| D3 | 目的地交互 | 省市级联，必须选到市 |
| D4 | 数据范围 | 全国省市二级，含港澳台，不允许自由输入 |
| D5 | 存储 | 只存 6 位国标码；名称列保留并由后端同步（code 权威） |
| D6 | 港澳台二级 | 香港→18 区；澳门→8 堂区；台湾→7 市（v5 真实数据） |
| D7 | 改造范围 | 首页筛选器 + 发布页目的地字段；发布字段归 A，地图留给途经点/集合地点 |
| D8 | 名称 | 统一字典标准名；直辖市用省级名，不出现"市辖区" |
| D9 | 展示 | 卡片市名；详情/摘要"省 / 市"；港澳台"省 · 二级"；体验卡不显示日期 |
| D10 | 搜索 | 前后端、契约、测试全部移除；A 的场景由本 change 改写，refine 的测试交 owner |
| D11 | 存量 | V11；按地图 16 城 + 别名 + 种子映射回填标准名 |
| D12 | 约束 | V11 加列 NOT NULL（DEFAULT '' + 回填，跨 SQLite/H2）；应用层拒绝空串 |
| D13 | 发布入参 | 只传 `destination_code`，后端生成名称（A 实现） |
| D14 | 省级 | 不做按省搜索/筛选 |
| D15 | 交付 | 本 change 单 change 两份 delta；不修改发布 requirement |
| D16 | 编号 | REQ-007（REQ-005/006 已占用） |
| D17 | 版本 | V11；契约 0.7.0 |
| D18 | 省名 | 后端返回 `province_name` 展示名 |
| D19 | 体验卡 | 不显示日期 |
| D20 | 归档 | refine → 本 change → A；只归档本 change |
| D21 | 搜索测试 | A 的目的地/搜索场景本 change 改；refine 交 owner |
| D22 | 数据包 | `element-china-area-data` v5（6 位码、含港澳台，数据较旧） |
| D23 | 发布边界 | 发布 UI/请求字段不写入本 change delta |

## 影响面

| 位置 | 改动 |
|---|---|
| `backend/src/main/resources/db/migration/V11__*.sql` | 加列 `destination_code` 非空、16 城/别名映射回填、标准名、索引；不重建表 |
| `backend/src/main/java/routeme/{pojo,entity,request,response,param,service,service/impl,controller,mapper}` | 目的地代码化、名称/省名派生；删除 `q`；体验日期参数；匹配按代码比较 |
| `backend/src/main/resources/mapper/{TripPlanMapper,TripExperienceMapper}.xml` | 目的地按代码过滤；删除关键词条件；体验日期交集 |
| `backend/src/main/resources/**`（新增） | 区划字典资源（与前端同源，含港澳台、6 位码） |
| `frontend/src/{home/HomePage.tsx,trips/tripFilters.ts,trips/tripOptions.ts,trips/TripCard.tsx,experiences/*,api.ts,types.ts,i18n/tripMessages.ts,styles.css}` | 级联选择器；移除搜索；日期/摘要/展示；体验日期；体验卡不显示日期 |
| `frontend/src/map/**` | 保留给途经点/集合地点；目的地不再使用 `PlacePicker` |
| `frontend/src/trips/TripCreatePage.tsx`（A 协作） | 目的地从 `PlacePicker` 改省市级联面板；请求改 `destination_code` |
| `openspec/changes/add-trip-publish/{specs,design.md,tasks.md}`、`e2e/tests/trips.spec.ts`（A 协作） | 目的地相关场景/设计/E2E 更新；不归档 |
| `RouteME/openapi.yaml` | 契约升 0.7.0、参数与字段调整 |
| `backend/src/test/**`、`frontend/src/**/*.test.ts(x)`、`e2e/tests/**` | 断言与用例同步更新，新增边界用例 |
| `docs/knowledge/**` | 归档阶段回写（P1 不改） |

### Self / Upstream / Downstream

| 维度 | 影响 |
|---|---|
| Self | `trip-plans` 的目的地数据契约、首页筛选、卡片/详情展示；`trip-experiences` 的体验视图日期/目的地筛选与展示 |
| Upstream | `refine-inspiration-home`（REQ-005，同改两 requirement，先归档）；`add-paged-lists-mybatis-plus`、`apply-prototype-visual-design`、`add-user-auth` 已归档，作为基线 |
| Downstream | `trip-companions` 匹配改为按 code 比较；`add-trip-publish` 发布页目的地字段改 `destination_code`（后归档） |

## 验收信号

1. 选择"广东省 / 珠海市"并把起止都填成同一个周六：列表只剩日期覆盖该周六的珠海行程；摘要显示"已应用筛选：广东省 / 珠海市 · 出发不早于 … · 出发不晚于 …"；点击清除后恢复默认列表。
2. 只选到"广东省"未选市：目的地筛选不生效，摘要不出现目的地；关闭级联后不发起额外查询。
3. 响应返回 `destination_code`、`destination`（标准名）、`province_code`、`province_name`（展示名）；直辖市显示"北京市"，页面不出现"市辖区"；香港显示"香港 · 中西區"。
4. 「旅行体验」视图填日期后列表变化，且与关联行程日期区间交集一致；体验卡不显示日期；无结果时显示空态并保留条件。
5. 首页不存在搜索框；`GET /api/trips`、`GET /api/matches`、`GET /api/experiences` 不再声明 `q`；匹配、我的旅行、聊天、体验发布回归通过。
6. V11 迁移后种子行程的代码与标准名正确，地图城市库 16 城与别名均可映射，`trip_experiences` 数据与关联不丢；不存在未映射行程。
7. 匹配列表仍能出现"目的地相同"理由（按代码比较）。
8. 发布页（A）目的地为省市级联面板；提交后返回 `destination_code` 与标准名；非法代码返回 400 `INVALID_INPUT`；途经点/集合地点仍用地图选点。
9. `refine-inspiration-home` 的搜索相关测试由 owner 更新后，两个 change 的 E2E 均通过。
10. `.\mvnw.cmd -B test`、`npm test`、`npm run build`、`npx playwright test` 全绿；`npx @redocly/cli lint openapi.yaml` 0 error。

## 规模与工作量

- **Size：** L（数据契约 + 迁移 + 前后端 + 契约 + 测试全链路）。
- **Effort 估算：** 数据底座（V11 + 字典 + 响应字段）2–3 人日；筛选/展示 1–2 人日；体验日期 + 搜索移除 1 人日；A 的发布目的地修订与 E2E 另计 1 人日。
- **可增量交付：** 数据底座完成后即可独立演示"选省市级联 → 列表变化"；体验日期与搜索移除不阻塞数据底座。

## Spec ID

`add-destination-area-filters`，增量规格见 `specs/trip-plans/spec.md` 与 `specs/trip-experiences/spec.md`。发布 requirement 不在本 change 修改；发布页目的地相关改动见 `add-trip-publish` 的目的地修订。
