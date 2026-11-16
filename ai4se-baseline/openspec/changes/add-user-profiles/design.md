# Design — add-user-profiles

- **Change:** `add-user-profiles`（`user-profiles`，REQ-005）｜ **阶段：** P3
- **输入：** [`specs/user-profiles/spec.md`](specs/user-profiles/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`atdd-design.md`](atdd-design.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:prototype-ui-alignment`、`@rule:web-coding-style`

## 目标与边界

为浏览者提供「点击行程卡片/详情页发布者 → 公开资料弹窗」的只读能力。弹窗展示头像、昵称、身份/专业、加入时间、简介、兴趣、共同兴趣、四项统计与隐私说明；不展示账户凭据、电话/证件/精确住址/学校门牌/实时位置，不提供举报入口。资料读取不改变行程、申请、体验与账户的数据所有权。

## 决策

### D1 — 公开资料为独立只读端点，不要求身份头

- **Context：** 现有身份模型同时存在演示账户（`X-User-Id`）与注册账户（Bearer 会话）；若 profile 端点依赖身份头，会把资料读取耦合到两种身份模式。
- **Decision：** 新增 `GET /api/users/{id}/profile`，不要求 `X-User-Id` 或 `Authorization`；只返回公开字段与统计。共同兴趣由前端用当前用户兴趣计算（D8）。
- **Rejected：** 在 `/trips` 响应内嵌完整资料（列表查询放大、契约分散）；复用 `/users` 全量列表（返回账户集合，不适合单用户视图）；要求身份头（无业务必要，且增加双模式分支）。
- **Consequence：** 端点公开可读；隐私边界由响应字段白名单保证，而非权限。

### D2 — 后端分层：新 controller + 纯聚合 service

- **Context：** 现有 `DemoUserController` 负责账户列表与 `/users/demo`；`MyTripsService` 是「不拥有表」的聚合先例。
- **Decision：**
  - `controller/UserProfileController`：`@RequestMapping("/api/users")` + `@GetMapping("/{id}/profile")`。
  - `service/UserProfileService`（接口，不继承 `IService`）+ `service/impl/UserProfileServiceImpl`。
  - `response/UserProfileResponse`（扁平公开字段 + 嵌套 `ProfileStatsResponse`）。
  - `exception/UserNotFoundException`（`USER_NOT_FOUND`，404）。
  - `UserProfileServiceImpl` 在 service/impl 内调用 `DemoUserService.getById`（继承自 `IService`）取得 `UserEntity`，用 `toDemoUser()` + `getCreatedAt()`；不把实体暴露到 controller。
- **Rejected：** 给 `DemoUser` record 增加 `createdAt`（会波及所有构造点与既有测试）；让 `UserProfileService` 继承 `IService`（不拥有表）；直接在 controller 注入 mapper（跨层）。
- **Consequence：** 新端点与账户列表解耦；`DemoUserService` 无需新增方法。

### D3 — 四项统计复用现有 service，请求时计算，不缓存

- **Context：** 统计口径已确认：发布行程 = 该用户发布的行程数（当前无取消状态）；已完成 = 该用户发布的已结束；参与同行 = 该用户被接受的申请数；游后分享 = 该用户发布的体验数。
- **Decision：** `UserProfileServiceImpl` 注入 `TripPlanService`、`ApplicationService`、`ExperienceService`：
  - `published = findAllTrips().stream().filter(publisherId == id).count()`
  - `completed = 同过滤 + completedAt() != null`
  - `joined = applicationService.mine(id).stream().filter(TripApplication::isAccepted).count()`
  - `shared = experienceService.mine(id).size()`
- **Rejected：** 新增 mapper 分组 SQL（当前数据量小，过早优化）；缓存（与行程/申请/体验状态不一致）；修改各源能力返回计数（扩大变更面）。
- **Consequence：** 演示规模 O(n)；不新增表、不新增 XML；统计随源数据实时变化。

### D4 — 契约先行：OpenAPI 0.7.0

- **Decision：** `openapi.yaml` 升至 0.7.0，新增 path、`UserProfile`、`ProfileStats`、`UserNotFound` 响应；`OpenApiTest` 校验路径、必填字段与错误码。
- **Response shape：**
  ```text
  {
    id, nickname, avatar_initial, school, bio, interests, joined_at,
    stats: { published, completed, joined, shared }
  }
  ```
  不包含 `username`、`password_hash`、任何 token/会话字段。
- **Rejected：** 在 `DemoUser` schema 上扩展（会让账户列表也带统计）；复用 `DemoUserResponse`（缺少 `joined_at`/`stats`）。

### D5 — V10 种子数据：第 4 个演示用户 + 1 条行程

- **Context：** V9 已被 `user-auth` 占用；现有迁移测试固定 3 个用户/6 条行程。
- **Decision：** 新增 `V10__seed_viewer_profile_user.sql`（只增不改）：
  - `app_users` id=4：昵称/头像/身份专业/简介/兴趣/`created_at`；`username`、`password_hash` 为 NULL（保持演示账户，不出现在注册登录路径）。
  - `trip_plans` id=7：publisher_id=4，状态 recruiting，字段与 V4 种子风格一致。
- **Rejected：** 修改 V3/V4（Flyway 只增不改）；改现有用户 1–3 的 `school`（破坏既有演示人设与测试预期）。
- **Consequence：** 身份门变为 4 个演示账户；首页多一条行程；需同步更新 `DemoDataMigrationSqliteTest`、`AuthMigrationSqliteTest`、`trips.spec.ts`。

### D6 — 前端资料模块：Provider + Modal + 纯函数

- **Decision：**
  - `profiles/ProfileContext.tsx`：在 `App.tsx` 的已登录分支内包裹 `AppShell`，暴露 `openProfile(userId)`，并渲染单个 `ProfileModal`。
  - `profiles/ProfileModal.tsx`：Ant Design `Modal`，加载中 `Spin`，失败 `Alert`；底部仅「关闭」，无举报；展示 D4 的公开字段、共同兴趣、四项统计、隐私说明与「这是你」。
  - `profiles/profileFormat.ts`：`sharedInterests(current, other)`、`formatJoinedAt(iso, now)`（相对时间，阈值：今天/昨天/N 天前/N 个月前/N 年前）；纯函数，供 UT。
  - `i18n/profileMessages.ts`：文案集中管理；隐私文案按 G1 裁决。
- **Rejected：** 每个页面各自持有弹窗状态（Home/MyTrips/Detail 三处重复）；把 profile 文案塞进 `tripMessages`（职责混杂）；引入新 UI 库/图标库（antd 已足够）。

### D7 — 卡片与详情入口重构，避免嵌套交互元素

- **Context：** `TripCard` 根节点是 `<a>`；直接在其中放 `<button>` 会产生嵌套交互元素。
- **Decision：**
  - `TripCard` 根节点改为 `<article className="trip-card">`；新增覆盖式 `<a className="tc-overlay" href="#/trips/{id}" aria-label={title}>`；发布者改为 `<button type="button" className="tc-host" onClick={() => openProfile(publisher.id)}>`，通过 `position: relative; z-index` 置于覆盖层之上。
  - `TripDetailPage` 发布者区块改为 `<button type="button" className="publisher-row publisher-button">`，点击打开弹窗；其余内容不变。
  - 键盘：发布者按钮可 Tab 聚焦、Enter/Space 触发；覆盖链接保留原生链接语义。
- **Rejected：** 在 `<a>` 内放 `<span role="button">`（语义与键盘行为不完整）；把整张卡片改成 `div role="link"`（丢失原生链接行为）；只在详情页加入口（不满足双入口）。
- **Consequence：** `TripCard` 的 JSX 结构与 `styles.css` 的 `.trip-card` 定位需要小幅调整；卡片主体仍可整块点击。

### D8 — 共同兴趣在前端计算，自我查看不展示

- **Decision：** `sharedInterests(currentUser.interests, profile.interests)`；当 `currentUser.id === profile.id` 或交集为空时返回空数组，不渲染提示。服务端不计算、不持久化共同兴趣。
- **Rejected：** 服务端按 `X-User-Id` 计算（重新耦合身份模式）；在 profile 响应中返回 `shared_interests`（需要身份，且同一资料对不同浏览者不同，缓存语义复杂）。
- **Consequence：** 资料端点可公开；共同兴趣的测试落在前端 UT/E2E。

### D9 — 错误与加载状态

- **Decision：** API 404 `USER_NOT_FOUND` → 弹窗提示「用户不存在」；其他错误 → 「资料加载失败」；加载中展示 `Spin`；失败时不保留上一次的资料（每次打开重置状态）。不要求重试按钮。
- **Rejected：** 失败时保留旧资料（会误导）；自动重试（超出本次范围）。

### D10 — 测试策略

- **API：** `UserProfileControllerTest`（MockMvc + H2）覆盖公开字段、`joined_at`、四项统计、零统计、404、响应无凭据。
- **迁移：** `ProfileDataMigrationSqliteTest` 校验 V10 用户 4/行程 7；更新 `DemoDataMigrationSqliteTest`、`AuthMigrationSqliteTest` 计数。
- **E2E：** `profiles.spec.ts` 覆盖双入口、弹窗字段、共同兴趣、自我查看、隐私/举报/凭据缺席、失败态、既有举报回归；更新 `trips.spec.ts` 身份门为 4 个演示账户。
- **UT（apply）：** `profileFormat.test.ts` 覆盖交集与时间格式化。
- **NFR：** 用户确认不做专项；仅保留基本可访问性/响应式检查。

## 文件级影响

| 层 | 文件 |
|---|---|
| 契约 | `RouteME/openapi.yaml`（0.7.0）、`backend/src/test/java/routeme/controller/OpenApiTest.java` |
| 后端 | `controller/UserProfileController.java`、`service/UserProfileService.java`、`service/impl/UserProfileServiceImpl.java`、`response/UserProfileResponse.java`、`response/ProfileStatsResponse.java`、`exception/UserNotFoundException.java` |
| 迁移 | `backend/src/main/resources/db/migration/V10__seed_viewer_profile_user.sql` |
| 后端测试 | `UserProfileControllerTest.java`、`ProfileDataMigrationSqliteTest.java`、`DemoDataMigrationSqliteTest.java`、`AuthMigrationSqliteTest.java` |
| 前端 | `src/profiles/ProfileContext.tsx`、`ProfileModal.tsx`、`profileFormat.ts`、`profileFormat.test.ts`、`src/i18n/profileMessages.ts`、`src/api.ts`、`src/types.ts`、`src/App.tsx`、`src/trips/TripCard.tsx`、`src/trips/TripDetailPage.tsx`、`src/styles.css` |
| E2E | `e2e/tests/profiles.spec.ts`、`e2e/tests/trips.spec.ts` |
| 文档 | 本 change 的 design/tasks；P5 回写 `docs/knowledge/interfaces/README.md`、`architecture/README.md` |

## 风险与权衡

- 统计 O(n) 在演示规模可接受；若未来数据量增长，改为 mapper count 查询，不改变契约。
- 卡片覆盖链接与发布者按钮的 z-index 需要与 hover/动画共存；E2E 覆盖键盘与点击行为。
- V10 改变种子计数是预期副作用；测试同批更新，避免 CI 红。
- 公开端点仅返回白名单字段；任何新增字段都必须经过隐私/凭据审查。
