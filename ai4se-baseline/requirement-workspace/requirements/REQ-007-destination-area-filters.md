# REQ-007 — 灵感首页按目的地（省市级联）与日期筛选（Ready 需求条目）

- **能力：** `trip-plans`（MODIFIED）；`trip-experiences`（MODIFIED）
- **对应 OpenSpec change：** `add-destination-area-filters`（单 change，两份 delta）
- **Ready 日期：** 2026-11-16 ｜ **状态：** drafted ｜ **远程基线：** `main@229411a`
- **优先级 / 迭代：** P0 ｜ 迭代 1（第 2–3 天）｜ 故事点 2 ｜ 落点页面：灵感首页
- **编号说明：** 远程已占用 REQ-005（`refine-inspiration-home`）与 REQ-006（`add-user-logout`），本需求使用 REQ-007。
- **Discovery Decision：** `Go`（2026-11-16）— 候选一句话成立：在灵感首页补齐"目的地省市级联 + 日期区间"筛选，把目的地改为 6 位行政代码，并移除本迭代不做的搜索。
- **证据：** `requirement-workspace/intents/REQ-007-destination-area-filters.md`（原始故事、现状核对、D1–D23 决策记录）

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-007 |
| statement | 让"时间地点都不确定"的学生在灵感首页按"省 → 市"选择目的地、按出发日期区间缩小范围，减少逐个翻看的成本；同时移除本迭代不做的搜索框，并让「旅行体验」视图的日期筛选真正生效。 |
| actors | 浏览者（筛选行程/体验）、发布者（发布页选择目的地，发布页字段由 `add-trip-publish` 目的地修订承担） |
| rationale | 现有目的地候选来自离线地图城市库（16 城，无省市层级），体验视图的日期筛选"看得见但不生效"，搜索框又占用了首屏且本迭代不投入；把筛选做扎实才能支撑"少翻看、快决策"。 |
| acceptance hints | 见 §4（目的地级联、日期交集、兴趣 OR、已应用摘要/清除、空态保留、体验日期、搜索移除、迁移、省名展示）。 |
| links to evidence | `intents/REQ-007-*.md` §4–§5；Living Spec `trip-plans`（§搜索、筛选与排序）、`trip-experiences`（§灵感首页的旅行体验视图）；代码证据见 §6。 |

## 1. Intent

一句话：把灵感首页的目的地筛选从"离线地图城市库（16 城）下拉"升级为**全国省市二级级联（必须选到市，含港澳台）**，目的地以 **6 位国标行政区划码**为权威存储、中文名由字典自动同步、省名由后端返回展示名；保留并验证日期区间交集与兴趣 OR 筛选；补齐「旅行体验」视图的日期筛选；**移除搜索框及其前端/后端/契约实现**——因为搜索不在本迭代范围，而目的地与日期才是学生缩小范围的主路径。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 浏览者（任意已进入用户，含演示身份与注册账号） | 在灵感首页筛选行程与体验；可清除条件；不因筛选产生写操作。 |
| 发布者（任意已进入用户） | 在发布行程页选择目的地；必须选到市才能提交；目的地名称由系统生成，用户不能自由输入。发布页字段归 `add-trip-publish` 目的地修订。 |

无独立权限体系；筛选与发布对所有身份一致。

## 3. In / Out scope

**In scope（本 change `add-destination-area-filters`）**

- **数据底座**：目的地 6 位国标行政区划码为权威；`destination` 名称列保留并由后端按代码同步；新增 `province_code` + `province_name`（展示名）；`trip_experiences` 不新增目的地列。
- **数据库迁移 V10**：`ALTER TABLE trip_plans ADD COLUMN destination_code VARCHAR(6) NOT NULL DEFAULT ''`；按地图城市库 16 城（含别名）与现有种子 5 城映射回填；`destination` 回填标准名；建索引。不重建表，兼容 SQLite/H2 与既有外键；应用层拒绝空串/未知代码。
- **目的地筛选**：省市级联（自绘两列面板，P4 实现修订），二级联动，**必须选到市**；全国数据**含港澳台**；不允许自由输入。
- **目的地展示**：卡片显示市名；详情页与筛选摘要显示"省 / 市"；直辖市用省级名（"北京市"），不出现"市辖区"；港澳台显示"香港 · 中西區"式"省级简称 · 二级名"（港澳二级沿用 v5 原文）。
- **日期筛选**：保留"出发不早于 / 出发不晚于"，按行程日期区间求交集；单边可用；起止同日即"选某一天/某个周六"；起止倒置自动交换。
- **兴趣筛选**：多选、命中任一即保留（回归验证，不降级）。
- **摘要与空态**：已应用筛选摘要与一键清除；无结果提示"换个条件试试"且**不清空已选条件**。
- **「旅行体验」视图**：目的地（代码）+ 日期区间筛选，按关联行程日期区间求交集；体验卡**不显示日期**。
- **移除搜索**：前端搜索框与传参、后端 `q` 参数与 SQL 条件、契约参数与相关测试全部删除。
- **A 的发布页目的地字段（协作，不在本 change delta）**：目的地从 `PlacePicker` 改 Cascader、请求改 `destination_code`、校验与 E2E/design 更新；已获授权只改目的地相关，**不归档**。

**Out of scope**

- 关键词搜索（本迭代整体移除，后续如需恢复另开 REQ）。
- 按"省"筛选/搜索全省（必须选到市）。
- 自由输入地名、地图选点、三级区划（区/县）、港澳台以外的境外地区。
- 发布页 UI/请求字段的 delta 作者化（归 `add-trip-publish` 目的地修订；本 change 只提供数据底座与筛选/展示）。
- 行程编辑、个性化推荐、附近的人、按距离/预算筛选。
- 体验卡日期展示（已确认不显示）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### 目的地

1. **选择城市后只保留该市行程** — Given 首页存在珠海市与其他城市行程，When 用户在目的地级联选择"广东省 / 珠海市"，Then 列表 SHALL 只保留 `destination_code = 440400` 的行程，并显示"已应用筛选：广东省 / 珠海市"与清除入口。
2. **必须选到市** — Given 用户只展开或只选到"广东省"，When 未选到市，Then 系统 SHALL NOT 应用目的地筛选（列表保持全量），摘要中不出现目的地。
3. **直辖市展示** — Given 用户选择"北京市 / 市辖区"，When 行程出现在卡片与详情页，Then 卡片与详情 SHALL 显示"北京市"，MUST NOT 出现"市辖区"。
4. **港澳台展示** — Given 用户选择"香港特别行政区 / 中西區"，When 查看卡片与筛选摘要，Then SHALL 显示"香港 · 中西區"；详情页同样以"省级简称 · 二级名"展示。
5. **省名由后端返回** — Given 任意一条行程详情/列表响应，When 前端渲染省名，Then 响应 SHALL 包含 `province_code` 与 `province_name`（展示名：普通省"广东省"，港澳台"香港"/"澳门"），前端 MUST NOT 自行截短。
6. **存量迁移** — Given 数据库中存在旧名称（地图城市库 16 城及别名，含种子"珠海/清远/广州/深圳/佛山"），When V10 迁移执行，Then 每条行程 SHALL 获得对应 6 位代码并把名称回填为标准名，MUST NOT 留下未映射记录。
7. **发布页必须选到市（A 承担）** — Given 用户处于发布行程页，When 未选目的地或只选到省就提交，Then 系统 SHALL 拒绝发布并提示必须选择到城市；When 选到市并提交，Then 后端 SHALL 按代码生成标准名称并保存。
8. **非法代码拒绝（A 承担）** — Given 发布请求携带不存在或非二级的 `destination_code`，When 后端校验，Then SHALL 拒绝并提示目的地不合法，且不产生行程。

### 日期

9. **日期区间交集** — Given 行程有出发/结束日期，When 用户设置出发不早于与/或出发不晚于，Then 系统 SHALL 只保留行程日期区间与所选区间有交集的行程；只设一边时按单边过滤。
10. **"周六"= 起止同日** — Given 用户只想找某个周六，When 把出发不早于与出发不晚于都填成该周六，Then 只返回日期区间覆盖该日的行程。
11. **起止倒置自动交换** — Given 用户把起止日期填反，When 发起查询，Then 系统 SHALL 以较小值为起点、较大值为终点（沿用现有行为）。
12. **体验视图日期生效** — Given 用户位于「旅行体验」视图，When 设置日期区间，Then 只返回关联行程日期区间与所选区间有交集的体验；无结果时展示空态。
13. **体验卡不显示日期** — Given 一条体验卡，When 用户查看卡片，Then 卡片 SHALL NOT 显示关联行程日期或体验发布时间；日期筛选仍按场景 12 生效。

### 组合与状态

14. **兴趣多选 OR** — Given 用户选择多个兴趣标签，When 筛选列表，Then 行程命中任一已选标签 SHALL 被保留。
15. **无结果保留条件** — Given 已选条件没有任何命中，When 列表为空，Then 系统 SHALL 提示"换个条件试试"与发布引导，且已选条件仍可见、可清除，MUST NOT 自动清空。
16. **清除全部** — Given 首页已应用多个条件，When 用户点击清除全部条件，Then 所有条件被清空并恢复默认列表，摘要同步清空。
17. **搜索框不存在** — Given 用户进入灵感首页，When 页面渲染，Then SHALL NOT 出现搜索框；前端 MUST NOT 发送 `q`；`GET /api/trips`、`GET /api/matches`、`GET /api/experiences` MUST NOT 再声明 `q` 参数；其它功能（匹配、我的旅行、聊天、体验发布）不受影响。

## 5. Constraints（仅事实，不含技术方案）

- 依赖 REQ-002 `trip-plans` 的行程实体、首页列表；依赖 REQ-004 `trip-experiences` 的体验列表与展示位；发布页目的地字段依赖 `add-trip-publish` 的目的地修订。
- 目的地数据契约：**6 位国标行政区划码**、省市二级、**含港澳台**、二级必须可区分（香港→18 区；澳门→8 堂区；台湾→7 市，v5 真实数据）。
- 名称契约：`destination` 名称由代码派生，用户不可编辑；统一字典标准名；直辖市用省级名；港澳台用"省级简称 · 二级名"；`province_name` 由后端返回展示名。
- 筛选契约：目的地按代码等值匹配；日期按"行程区间 ∩ 所选区间 ≠ 空"；兴趣按 OR；三者可组合。
- 搜索移除的跨 change 依赖：`add-trip-publish` 的"按标题搜索"场景与发布 E2E 已获授权由本 change 修改；`refine-inspiration-home` 的搜索相关测试由其 owner 更新；本 change 不改 `refine-inspiration-home` 的文件。
- 存量映射：地图城市库 16 城（珠海/广州/深圳/佛山/清远/中山/江门/肇庆/惠州/东莞/阳江/湛江/韶关/汕头/香港/澳门）+ 常见别名 + 现有种子 5 城；未映射名称使迁移失败，不得静默丢弃。
- `trip_experiences` 通过 `trip_id` 关联行程，不新增目的地列；体验筛选与展示均消费行程的目的地代码/名称与日期。
- **版本：** V9 已被 `add-user-auth` 占用，本需求迁移用 **V10**；契约已 `0.6.0`，本需求升 **0.7.0**。
- **并发变更约束：** `refine-inspiration-home`（REQ-005）同改 `trip-plans` / `trip-experiences`；`add-trip-publish` 拥有发布 requirement；`add-match-reason` 改 `trip-companions`。归档顺序 `refine-inspiration-home` → 本 change → `add-trip-publish`；三者中只有本 change 属于本需求，其它由各自 owner 归档。
- 匹配能力（`trip-companions`）为消费方：业务规则不变，但"目的地相同"的打分比较必须改为按代码比较（列入实现触点，不计入本 REQ 的能力变更面）。
- 区划数据包：`element-china-area-data` v5（6 位码、含港澳台，数据约 2019/2020）；MVP 接受静态字典，后续可升级。

## 6. Context

这条需求来自迭代 1 的用户故事（"时间地点都不确定的学生 → 按目的地和日期缩小范围"）。远程基线（`main@229411a`）的现状是：搜索、目的地、日期、兴趣四项筛选都已端到端实现，但目的地候选来自离线地图城市库（16 城，无省市层级）；「旅行体验」视图的日期输入框可见却不生效；搜索框在本迭代没有投入计划。用户据此决定：把目的地升级为全国省市级联（含港澳台、代码化），补齐体验日期筛选，并整体移除搜索。发布页目的地字段由 `add-trip-publish` 的目的地修订承载，本 change 只提供数据底座与筛选/展示。证据与逐条决策见 `intents/REQ-007-destination-area-filters.md`。

## 7. Affected capabilities

| 能力 | 变更 | 说明 |
|---|---|---|
| `trip-plans` | MODIFIED | 目的地数据契约（6 位代码 + 派生名称 + 省名）、首页筛选（级联/日期/摘要/清除/空态）、卡片与详情的地名展示、移除关键词搜索。发布 requirement 不在本 change 修改范围。 |
| `trip-experiences` | MODIFIED | 「旅行体验」视图新增目的地代码 + 日期区间筛选；体验卡与详情沿用新名称口径；体验卡不显示日期。 |
| `add-trip-publish`（协作，非本 change 能力） | 目的地相关修订 | 发布页目的地改 Cascader、请求改 `destination_code`、校验/E2E/design 更新；不归档。 |
| `refine-inspiration-home`（协作，非本 change 能力） | 搜索测试由 owner 更新 | 本 change 不改它的文件；其搜索空态 E2E 需在搜索移除后改写。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | 目的地存名称、存"省/市"还是存代码？ | BA/SA | 确认：只存 6 位国标代码；名称列保留但由后端按代码自动同步（D5/D8）。 |
| blocking | resolved | 是否允许只选省、是否允许自由输入？ | BA | 确认：必须选到市；全国数据含港澳台；不允许自由输入（D3/D4/D14）。 |
| blocking | resolved | 体验视图是否要补日期筛选？ | BA | 确认：补齐，按关联行程日期区间交集（D1）。 |
| blocking | resolved | 搜索框只去前端还是连后端一起删？ | BA/SA | 确认：前后端、契约、测试一并删除；A 的搜索场景由本 change 改写，refine 的搜索测试交 owner（D10/D21）。 |
| blocking | resolved | 存量中文名怎么迁移？ | BA/SA | 确认：按地图城市库 16 城 + 别名 + 种子 5 城映射到 6 位代码，名称回填标准名；V10 加列 NOT NULL + 回填（兼容 SQLite/H2，不重建表）（D11/D12/D17）。 |
| blocking | resolved | 直辖市与港澳台显示什么名字？ | BA | 确认：直辖市用省级名；港澳台"省级简称 · 二级名"（D8/D9）。 |
| blocking | resolved | 省名由接口返回还是前端解析？ | BA/SA | 确认：后端返回 `province_code` + `province_name`（展示名），前端不截短（D18）。 |
| blocking | resolved | 体验卡是否显示日期？ | BA | 确认：不显示（D19）。 |
| blocking | resolved | 发布页目的地字段归谁？ | BA/SA | 确认：归 `add-trip-publish` 目的地修订；本 change 不修改发布 requirement，只提供数据底座（D7/D13/D15/D23）。 |
| blocking | resolved | 归档顺序与归属？ | BA/SA | 确认：`refine-inspiration-home` → 本 change → `add-trip-publish`；只归档本 change（D20）。 |
| non-blocking | deferred | 区划数据包未来升级到更新年份？ | Dev | 后续解决：MVP 用 v5；升级不改代码契约。 |
| non-blocking | deferred | SQLite/H2 迁移时如何处理 `trip_experiences` 外键？ | Dev | 已用 ADD COLUMN 方案避开外键；迁移测试覆盖 SQLite + H2，不得丢失体验数据。 |
| non-blocking | deferred | 搜索未来是否恢复、何时恢复？ | BA | 后续解决：本迭代明确不做；恢复时另开 REQ。 |
| non-blocking | deferred | `refine-inspiration-home` owner 何时更新搜索相关测试？ | AO/BA | 外部条件：本 change G1 记录依赖，不阻塞本 change 的 P1/P2 规格。 |

blocking 项 = 0 未 resolved，满足进入 impact/split 的硬门。

## 交付分工（避免与其它 change 冲突）

| 归属 | 范围 |
|---|---|
| 本 change `add-destination-area-filters`（REQ-007） | V10 数据底座、6 位码/字典/响应字段、首页筛选（级联/日期/摘要/空态）、卡片/详情/体验展示、体验日期筛选、搜索移除、本 change 的测试。 |
| `add-trip-publish`（别人的 change，已授权只改目的地相关，不归档） | 发布页目的地 Cascader、请求 `destination_code`、发布校验、目的地相关 E2E/design/spec。 |
| `refine-inspiration-home`（别人的 change，不改其文件） | 其搜索相关 E2E/tasks 由它的 owner 更新；本 change 只在 G1 记录依赖。 |
| `add-match-reason`（别人的 change） | 业务规则不变；本 change 只把匹配比较口径改为代码，需回归其"目的地相同"场景。 |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（浏览者 / 发布者；含注册账号） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1（搜索、按省筛选、自由输入、三级区划、发布 delta） | 通过 |
| — | resolved | §4 | ④场景具体可观察（共 17 条） | 通过 |
| — | resolved | §4 #2/#8/#11/#13/#15/#17 | ⑤含异常/边界（只选省、非法代码、日期倒置、无结果、体验卡无日期、无搜索框） | 通过 |
| — | resolved | §4 | ⑥结果可验证（列表变化、摘要文案、空态、接口参数、省名字段均可观察） | 通过 |
| — | resolved | §5/§7 | ⑦依赖与应用架构触点已识别（trip-plans / trip-experiences / trip-companions / add-trip-publish / refine） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking=0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：目的地 code/name/province、筛选条件、迁移映射已定义 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：目的地/日期/兴趣/搜索/迁移/发布分支齐全 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：trip-plans 为 anchor；refine/A/match 消费点已列 | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：筛选器、摘要、卡片、详情、体验卡、发布页、空态字段齐全 | 通过 |

**DoR BLOCKER 计数 = 0。** deep-dive ⑨–⑫ 见 `requirement-workspace/deep-dive.md`（REQ-007 段）。
