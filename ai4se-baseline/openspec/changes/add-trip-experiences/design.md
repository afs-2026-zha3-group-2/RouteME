# 设计：add-trip-experiences

- **Change:** `add-trip-experiences`（`trip-experiences`，REQ-004）｜ **依据：** [`spec.md`](specs/trip-experiences/spec.md)、[`atdd-design.md`](atdd-design.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`

## 1. 关键取舍

### 一条体验 = (trip_id, author_id) 唯一，再次提交即修改

- 原型 `saveExperience` 先查 `myExperience(tripId)`，存在则更新，否则新增；本 change 用数据库唯一约束 `UNIQUE(trip_id, author_id)` + 服务端 upsert 固化，避免并发重复。
- 「参加过」直接复用 `ApplicationService.participants(tripId)`（发布者 + 已接受同行者），不重复定义；`canShare = trip.status == COMPLETED && participants.contains(user)`。
- 不新建「分享者」关系表：同行关系仍是 `trip_applications` 的投影。

### 参考此行程发布放在前端预填，不新增后端 copy 接口

- 入口为 `#/trips/new?from={tripId}`；发布页读取源行程，预填 `destination`、`stops`、`tags`，清空 `title`、`start_date`、`end_date`、`capacity`、`meeting_area`、`note`、预算。
- 需求 §4.7 明确「日期、人数、集合地点必须重填」，因此**不复制 `capacity`**（与原型 `draftFromSource` 的差异已在 proposal 记录，原型视为待修）。
- 不新增后端接口：创建仍走 `POST /trips`，避免跨能力复制发布逻辑。

### 纯文字 + 内置封面

- 本迭代不做图片上传；体验卡封面按目的地使用既有 CSS 渐变/图形，不引入二进制存储。
- `trip_experiences` 不含图片列，后续增强再迁移。

### 首页双视图

- 首页保留 `/matches` 的计划视图，新增「旅行体验」视图；体验列表来自 `GET /experiences`，与计划视图共用关键词/目的地/兴趣筛选控件，排序固定为发布时间倒序（原型）。
- 体验卡展示行程摘要（标题/目的地/日期）+ 作者 + 强度 + 感受摘要 + 建议 + 「参考此行程发布」。

## 2. 数据模型

```text
trip_experiences
  id INTEGER PRIMARY KEY
  trip_id INTEGER NOT NULL            -- FK trip_plans.id
  author_id INTEGER NOT NULL          -- FK app_users.id
  content VARCHAR(400) NOT NULL
  intensity VARCHAR(20) NOT NULL      -- RELAXED / MODERATE / TIRING
  advice VARCHAR(120) NOT NULL
  created_at VARCHAR(40) NOT NULL
  updated_at VARCHAR(40) NOT NULL
  UNIQUE (trip_id, author_id)
```

- 迁移：`V8__create_trip_experiences.sql`；`V9` 起留给后续 change。
- 种子：按原型 2 条体验——trip 1（珠海摄影，已结束）作者 user 2，`MODERATE`；trip 2（清远露营，已结束）作者 user 3，`TIRING`。作者均为该行程已接受同行者。
- 时间语义：`created_at` 首次发布，`updated_at` 最近一次保存；列表按 `updated_at` 倒序（修改后的体验回到前面）。

## 3. 接口面（`openapi.yaml` 为权威）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/experiences` | 全部体验（含行程摘要与作者）；`q`、`destination`、`tags`，按 `updated_at` 倒序 |
| GET | `/trips/{tripId}/experiences` | 某行程的体验列表（升序发布） |
| POST | `/trips/{tripId}/experiences` | 发布或修改我的体验；首次 201，更新 200 |
| GET | `/me/experiences` | 我的体验（我的旅行「已完成」入口用） |

新增错误码：`EXPERIENCE_NOT_ALLOWED`(403)、`EXPERIENCE_NOT_FOUND`(404，预留)；复用 `INVALID_INPUT`(400)、`DEMO_USER_REQUIRED`(401)、`TRIP_NOT_FOUND`(404)。

请求体 `ExperienceWriteRequest`：`content`（必填，10–400）、`intensity`（枚举 relaxed/moderate/tiring）、`advice`（必填，≤120）。
响应 `Experience`：`id`、`trip`（TripPlan 摘要）、`author`（DemoUser）、`content`、`intensity`、`advice`、`created_at`、`updated_at`。

## 4. 后端结构

```text
routeme/
├── controller/  ExperienceController
├── service/     ExperienceService
├── dao/         TripExperienceRepository、TripExperienceRow
├── model/       TripExperience、ExperienceIntensity
└── dto/         ExperienceWriteRequest、ExperienceResponse
```

- `TripExperience.create/update` 做 trim 与长度校验（感受 10–400、建议 1–120），抛 `InvalidInput`；强度由枚举解析，非法值 400。
- `ExperienceService.upsert(tripId, authorId, request)`：`@Transactional`，先校验 `canShare`，再查 `(trip, author)` 决定 insert/update。
- 查询组装：行程摘要复用 `TripPlanService.require` + `publisherOf`，作者用 `UserRepository`；筛选逻辑放在 `ExperienceService`（关键词命中标题/目的地/感受/建议，标签任一命中）。
- 不改 `trip-plans` 仓储的写方法；只读 `TripPlanRepository`。

## 5. 前端结构

```text
src/
├── route.ts                    新增 #/share/{tripId} 与 #/trips/new?from={tripId}
├── home/HomePage.tsx           视图切换（旅行计划 / 旅行体验）+ 体验列表
├── experiences/
│   ├── ShareExperiencePage.tsx 发布/修改（感受、强度、建议、隐私提示）
│   ├── ExperienceCard.tsx      内置封面 + 强度 + 摘要 + 参考发布
│   └── experienceForm.ts       纯函数校验与强度文案
├── trips/TripDetailPage.tsx    游后体验区 + 发表/修改入口 + 参考发布
├── trips/TripCreatePage.tsx    ?from= 预填与清空
└── mine/MyTripsPage.tsx        已完成分组：已分享标记 + 发表/修改入口
```

- 页面只做渲染与事件；资格与校验以后端返回为准，前端只控制入口可见性。
- 内置封面用 CSS 类按目的地着色，不新增图片资源。
- 「参考此行程发布」在详情、体验卡、我的旅行都可触发，统一跳 `#/trips/new?from=`。

## 6. 被否决的方案

| 方案 | 否决原因 |
|---|---|
| 每条体验独立表 + 图片列 | 本迭代不做上传；先保持纯文字最小表 |
| 后端 `POST /trips/{id}/copy` | 复制发布逻辑会与 `POST /trips` 漂移；前端预填已满足需求 |
| 允许每人多条体验 | 原型一条可修改，避免详情区堆叠同一人 |
| 体验列表按创建时间排序 | 修改后内容更新却排到后面，与「最新灵感」相悖；用 `updated_at` |
| 把体验塞进 `TripPlan` 响应 | 计划接口只服务计划视图，体验有独立筛选语义 |