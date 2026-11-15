# 设计：add-trip-plans

- **Change:** `add-trip-plans`（`trip-plans`，REQ-002）｜ **依据：** [`spec.md`](specs/trip-plans/spec.md)、[`atdd-design.md`](atdd-design.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:java-coding-style`、`@rule:web-coding-style`

## 1. 关键取舍

### 演示身份：预设账户 + `X-User-Id`

- `app_users` 预置 3 个账户；前端把选中的 `user_id` 存 localStorage，所有请求带 `X-User-Id`。
- 不做 session / token / 密码；身份门只负责选择与切换。
- 风险已知：header 可伪造。演示环境接受，`security-baseline` 要求的真实认证在 P2 之后替换。

### 状态是投影值，不是可随意写入的列

`status` 不入库，由领域对象按下列顺序推导：

```text
completed_at != null                 → completed（已结束）
joined_count >= capacity             → full（已满员）
其余                                  → recruiting（招募中）
```

- 好处：REQ-003 只需维护 `joined_count`，不需要跨能力写状态；REQ-004 只读 `completed_at`。
- 结束行程 = 写 `completed_at`；不接受额外状态字段，避免双写。

### 契约先行，错误体保持只有 `code`

- 先改 `openapi.yaml`，再改两端（`@rule:api-contract`）。
- 后端只返回 `{ "code": "INVALID_INPUT" }` 这类错误体；字段级提示由前端表单校验承担，前后端共用同一份约束表（spec §发布约束），后端作为兜底。
- 被否决：在 400 响应里返回 `fields` 映射——会让错误体出现两套结构，和现有 `Error` schema 冲突。

### 列表不分页

当前数据量为个位数，MVP 不做分页/无限滚动；接口一次返回全部未结束行程。分页一旦引入属于破坏性变更，按主版本处理。

### 路由自己实现，不引入 router 库

`#/`、`#/trips/new`、`#/trips/{id}` 三个路由用 `src/route.ts` 的纯函数解析（可单测），`App.tsx` 订阅 `hashchange`。避免为一个三路由应用引入新依赖。

## 2. 数据模型

```text
app_users
  id INTEGER PRIMARY KEY        -- 1..3，显式插入
  nickname TEXT, avatar_initial TEXT, school TEXT, bio TEXT
  interests TEXT                -- JSON 数组
  created_at TEXT               -- RFC3339 UTC

trip_plans
  id INTEGER PRIMARY KEY        -- 显式插入，测试可预期
  publisher_id INTEGER          -- FK app_users.id
  title TEXT, destination TEXT
  start_date TEXT, end_date TEXT          -- YYYY-MM-DD（日历日期，不是时刻）
  stops TEXT                              -- JSON 数组，≥2 个
  meeting_area TEXT, note TEXT
  budget_min_cents INTEGER, budget_max_cents INTEGER   -- 可空，元×100
  tags TEXT                                -- JSON 数组，≤5
  capacity INTEGER                         -- 2..12
  joined_count INTEGER                     -- 含发布者，创建时 = 1
  completed_at TEXT                        -- 可空；非空即已结束
  created_at TEXT, updated_at TEXT
```

- SQLite 与 H2 共用一套迁移：只用 `INTEGER PRIMARY KEY`、`TEXT`、`INTEGER` 与显式 id 插入（沿用 bootstrap 决定）。
- 列表字段用 JSON 字符串存储、在行对象里解析；不引入 JSON 扩展函数。
- 迁移编号：本 change 用 `V3__create_demo_users.sql`、`V4__seed_demo_trips.sql`；`V5` / `V6` 预留给 REQ-003 / REQ-004，避免并行冲突。
- `joined_count` 的**唯一写入方**是 `trip-plans`；REQ-003 接受申请时通过 `TripPlanService` 增加，不直接改表。

## 3. 接口面（`openapi.yaml` 为权威）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/users` | 3 个演示账户（身份门与发布者资料） |
| GET | `/trips` | 未结束行程列表；参数 `q`、`destination`、`date_from`、`date_to`、`tags`（逗号分隔，任一命中）、`sort=date\|new`（默认 `date`） |
| GET | `/trips/{id}` | 详情：行程 + 发布者资料 + 当前同行者 |
| POST | `/trips` | 发布行程；成功 201 返回详情 |
| POST | `/trips/{id}/complete` | 发布者标记已结束；成功 200 返回详情 |

错误码：`INVALID_INPUT`(400)、`DEMO_USER_REQUIRED`(401)、`FORBIDDEN`(403)、`TRIP_NOT_FOUND`(404)、`TRIP_NOT_OPEN`(409)、`INTERNAL_ERROR`(500)。

字段约定：`snake_case`；时间为 RFC3339 UTC 的 `*_at`；日历日期用 `date`；金额整数分 `*_cents`；状态枚举小写 `recruiting \| full \| completed`；`id` 为 `integer/int64`。

## 4. 后端结构

```text
routeme/
├── controller/  DemoUserController、TripController（路由、绑定、状态码）
├── service/     DemoUserService、TripPlanService、TripPlanQueryService
├── dao/         UserRepository、TripPlanRepository、UserRow、TripPlanRow
├── model/       DemoUser、TripPlan（含 status 投影与校验）
├── dto/         UserResponse、TripCreateRequest、TripSummaryResponse、TripDetailResponse
└── exception/   InvalidInput、Forbidden、NotFound、Conflict 与统一处理器
```

- 查询条件用 `TripQuery`（dto）：`q`、`destination`、`dateFrom`、`dateTo`、`tags`、`sort`；筛选与排序在服务层组合，SQL 只做等值与范围。
- 日期区间语义按原型：`end_date >= date_from` 且 `start_date <= date_to`（交集）。
- 排序：`date` 按 `start_date` 升序、同日期按 `created_at` 倒序；`new` 按 `created_at` 倒序。
- 校验：标题长度、途经点数量、人数范围、预算区间、日期顺序在 `TripPlan` 工厂方法内完成，抛 `InvalidInput`。
- 详情同行者：当前只含发布者；REQ-003 落地后由同一端口补齐。

## 5. 前端结构

```text
src/
├── api.ts            新增 loadUsers / loadTrips / loadTrip / createTrip / completeTrip
├── types.ts          契约类型（snake_case 字段原样保留）
├── route.ts          纯函数：parseRoute / toHash（可单测）
├── App.tsx           hash 路由 + 身份门 + 顶栏身份切换
├── trips/
│   ├── HomePage.tsx          列表、筛选栏、空状态、加载骨架
│   ├── TripCreatePage.tsx    发布表单与字段校验
│   ├── TripDetailPage.tsx    详情、状态徽标、申请入口占位、分享区占位
│   ├── tripFilters.ts        纯函数：筛选/排序（可单测）
│   ├── tripStatus.ts         状态文字与徽标映射
│   └── useTrips.ts / useTrip.ts
├── identity/IdentityGate.tsx 3 个账户选择
└── i18n/messages.ts          全部文案
```

- 组件只做渲染与事件绑定；筛选/排序/校验在纯函数里，Vitest 覆盖。
- 状态文字始终渲染（不只靠颜色）；申请入口按 `recruiting && !full && publisher_id !== currentUser` 决定可见与禁用。
- 发布表单字段级错误由前端校验函数给出，规则与 `spec.md` §发布约束一致；提交失败只按契约 `code` 提示。

## 6. 被否决的方案

| 方案 | 否决原因 |
|---|---|
| 用 JPA / Hibernate | 沿用 bootstrap 的 JDBC 选择；项目不需要实体映射 |
| 把 `status` 存成列并由 companions 回写 | 双写与并发覆盖；投影值更简单 |
| 400 返回字段级错误映射 | 错误体出现第二套结构，破坏 `Error` schema |
| 引入 react-router | 三个路由不值一个新依赖；纯函数解析足够 |
| 列表分页 | MVP 数据量小；后续加分页按破坏性变更处理 |
| 按匹配度排序在本 change 实现 | 打分属 REQ-003，避免重复能力 |

## 8. 风险

- `X-User-Id` 可伪造：仅演示；`security-baseline` 的真实认证替换列入残留风险。
- 前后端校验重复：约束表只在 `spec.md` 定义一次，两端测试引用同一组边界值；漂移由 API 测试兜底。
- SQLite 并发写：MVP 只有发布与结束两个写操作，低并发；沿用现有连接池配置。
- `joined_count` 冗余：REQ-003 必须通过服务方法更新，禁止直接改表（写进 REQ-003 的设计约束）。

## 9. 提交策略（例外记录）

`@rule:git-commit-conventions` 要求一个 change 只在 verify 与 archive 各提交一次。本 change 按需求方要求「每完成一步提交并推送」，规划（delta/G1/ATDD/design/tasks）与实现（T1–T13）分别提交。已推送历史不改写（规则禁止对 `main` force push），因此：

- 以 `9b5928b`（`docs: record local verify report for add-trip-plans`）作为 verify 提交凭据；
- 归档结果单独提交 `chore(archive): add-trip-plans ...`；
- 后续 change 恢复「verify + archive 两次提交」，除非需求方再次明确要求分步提交。