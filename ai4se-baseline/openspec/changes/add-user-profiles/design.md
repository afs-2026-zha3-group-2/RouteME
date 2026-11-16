# Design — add-user-profiles

- **Change:** `add-user-profiles`（`user-profiles`，REQ-009）｜ **阶段：** P3
- **输入：** [`specs/user-profiles/spec.md`](specs/user-profiles/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`atdd-design.md`](atdd-design.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:prototype-ui-alignment`、`@rule:web-coding-style`

## 目标与边界

为浏览者提供「点击行程卡片/详情页发布者 → 公开资料弹窗」的只读能力。弹窗展示头像、昵称、身份/专业、加入时间、简介、兴趣、共同兴趣、四项统计与隐私说明；不展示账户凭据、电话/证件/精确住址/学校门牌/实时位置，不提供举报入口。资料读取不改变行程、申请、体验与账户的数据所有权。

## 决策

### D1 — 复用 main 已有的 `GET /api/users/{userId}/profile`，只扩展响应

- **Context：** main 的 `add-user-profile`（S18）已落地同名端点（`X-User-Id` 可读、`PUT /me/profile`、头像上传），返回白名单资料字段。本 change 不再新建第二个资料端点，避免同路由/同名类冲突。
- **Decision：** 复用 `GET /api/users/{userId}/profile`（传入 `X-User-Id`，与 main 一致），在该 `UserProfile` 响应上新增 `joined_at` 与 `stats` 两个可选字段；共同兴趣仍由前端用当前用户兴趣计算（D8）。
- **Rejected：** 新建 `GET /api/users/{id}/profile`（与 main 同路由语义重复）；复用 `/users` 全量列表（返回账户集合，不适合单用户视图）；复制一份 main 的同名 controller/service（编译冲突、双份隐私白名单）。
- **Consequence：** 资料读取沿用 main 的身份头约定；隐私边界仍由响应字段白名单保证；本 change 的契约差异只剩 `joined_at` + `stats`。

### D2 — 后端只新增统计聚合，复用 main 的 controller/service/response

- **Context：** main 已有 `controller/UserProfileController`、`service/UserProfileService(Impl)`、`response/UserProfileResponse`、`dataobject/UserProfile` 与 `UserNotFoundException`。
- **Decision：**
  - 保留 main 的 `UserProfileController`，仅在其 `profile()` 中注入统计并传入 `UserEntity.getCreatedAt()`。
  - 新增 `service/UserProfileStatsService` + `impl/UserProfileStatsServiceImpl`（只读聚合，不拥有表）。
  - `response/UserProfileResponse` 增加 `joinedAt`、`stats` 字段与四参 `from(...)` 重载；原二参工厂保持兼容（保存/上传路径不变）。
  - 新增 `response/ProfileStatsResponse`。
- **Rejected：** 把统计塞进 `UserProfileService`（main 的资料读写服务职责已满）；让统计 service 继承 `IService`（不拥有表）；新建同名 response 类（与 main 冲突）。
- **Consequence：** 资料读取与写入路径不变；统计只影响 GET 响应。

### D3 — 四项统计复用现有 service，请求时计算，不缓存

- **Context：** 统计口径已确认：发布行程 = 该用户发布的行程数（当前无取消状态）；已完成 = 该用户发布的已结束；参与同行 = 该用户被接受的申请数；游后分享 = 该用户发布的体验数。
- **Decision：** `UserProfileStatsServiceImpl` 注入 `TripPlanService`、`ApplicationService`、`ExperienceService`：
  - `published = findAllTrips().stream().filter(publisherId == id).count()`
  - `completed = 同过滤 + completedAt() != null`
  - `joined = applicationService.mine(id).stream().filter(TripApplication::isAccepted).count()`
  - `shared = experienceService.mine(id).size()`
- **Rejected：** 新增 mapper 分组 SQL（当前数据量小，过早优化）；缓存（与行程/申请/体验状态不一致）；修改各源能力返回计数（扩大变更面）。
- **Consequence：** 演示规模 O(n)；不新增表、不新增 XML；统计随源数据实时变化。

### D4 — 契约先行：OpenAPI 0.8.0（在 main 的 0.7.0 之上）

- **Decision：** `openapi.yaml` 升至 0.8.0；复用 main 的 `/users/{userId}/profile` 路径，`UserProfile` 增加可空的 `joined_at` 与 `stats`（**不加入 required**，保持 main 的必填字段不变），新增 `ProfileStats`（`published`/`completed`/`joined`/`shared` 全部必填）；`OpenApiTest` 在同一用例上扩展断言。
- **Response shape（在 main 字段之外的增量）：**
  ```text
  {
    ...main 的公开资料字段,
    joined_at: ISO-8601 字符串,
    stats: { published, completed, joined, shared }
  }
  ```
  仍不包含 `username`、`password_hash`、任何 token/会话字段。
- **Rejected：** 在 `DemoUser` schema 上扩展（会让账户列表也带统计）；把 `joined_at`/`stats` 设为必填（会改变 main 已在用的响应契约）。

### D5 — V11 种子数据：第 4 个演示用户 + 1 条行程

- **Context：** main 的 S18 已占用 `V10__add_user_profile.sql`（8 个可空列）；本 change 需在其后追加种子。
- **Decision：** 新增 `V11__seed_viewer_profile_user.sql`（只增不改）：
  - `app_users` id=4：昵称/头像/身份专业/简介/兴趣/`created_at`；`username`、`password_hash` 为 NULL（保持演示账户，不出现在注册登录路径）。
  - `trip_plans` id=7：publisher_id=4，状态 recruiting，字段与 V4 种子风格一致。
- **Rejected：** 修改 V3/V4（Flyway 只增不改）；改现有用户 1–3 的 `school`（破坏既有演示人设与测试预期）；继续用 V10（与 main 版本号重复，Flyway 拒绝）。
- **Consequence：** 身份门变为 4 个演示账户；首页多一条行程；需同步更新 `DemoDataMigrationSqliteTest`、`AuthMigrationSqliteTest`、`ProfileMigrationSqliteTest`、`trips.spec.ts`。

### D6 — 前端资料模块：Provider + Modal + 纯函数

- **Decision：**
  - `profiles/ProfileContext.tsx`：在 `App.tsx` 的已登录分支内包裹 `AppShell`，暴露 `openProfile(userId)`，并渲染单个 `ProfileModal`。
  - `profiles/ProfileModal.tsx`：Ant Design `Modal`，调用 main 的 `loadUserProfile(userId, currentUser.id)`；加载中 `Spin`，失败 `Alert`；底部仅「关闭」，无举报；展示 main 的公开字段 + `joined_at` / `stats`、共同兴趣、四项统计、隐私说明与「这是你」；样式用 `profile-modal-*` 作用域，避免与 main 的 `ProfilePage` 类名冲突。
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
- **Consequence：** main 的卡片发布者入口原本是跳 `#/users/{id}`，本 change 改为弹窗（REQ-009 双入口要求）；`e2e/tests/profile.spec.ts` 的发布者入口用例同步改为断言弹窗，公开主页路由仍保留并由该用例直接访问验证。

### D8 — 共同兴趣在前端计算，自我查看不展示

- **Decision：** `sharedInterests(currentUser.interests, profile.interests)`；当 `currentUser.id === profile.id` 或交集为空时返回空数组，不渲染提示。服务端不计算、不持久化共同兴趣。
- **Rejected：** 服务端按 `X-User-Id` 计算（重新耦合身份模式）；在 profile 响应中返回 `shared_interests`（需要身份，且同一资料对不同浏览者不同，缓存语义复杂）。
- **Consequence：** 资料端点可公开；共同兴趣的测试落在前端 UT/E2E。

### D9 — 错误与加载状态

- **Decision：** API 404 `USER_NOT_FOUND` → 弹窗提示「用户不存在」；其他错误 → 「资料加载失败」；加载中展示 `Spin`；失败时不保留上一次的资料（每次打开重置状态）。不要求重试按钮。
- **Rejected：** 失败时保留旧资料（会误导）；自动重试（超出本次范围）。

### D10 — 测试策略

- **API：** `UserProfileControllerTest`（MockMvc + H2）在 main 用例基础上扩展：公开字段、`joined_at`、四项统计、零统计、404、响应无凭据。
- **迁移：** `ProfileDataMigrationSqliteTest` 校验 V11 用户 4/行程 7；`ProfileMigrationSqliteTest` 改为 V1–V11、4 个演示账号。
- **E2E：** `profiles.spec.ts` 覆盖双入口、弹窗字段、共同兴趣、自我查看、隐私/举报/凭据缺席、失败态、既有举报回归；`profile.spec.ts` 的发布者入口改为弹窗断言；`trips.spec.ts` 身份门为 4 个演示账户。
- **UT（apply）：** `profileFormat.test.ts` 覆盖交集与时间格式化。
- **NFR：** 用户确认不做专项；仅保留基本可访问性/响应式检查。
- **合并后实测：** 后端 200 / 前端 110 / E2E 43（干净库）。

## 文件级影响

| 层 | 文件 |
|---|---|
| 契约 | `RouteME/openapi.yaml`（0.8.0，复用 main path + 新增 `joined_at`/`stats`/`ProfileStats`）、`backend/src/test/java/routeme/controller/OpenApiTest.java` |
| 后端 | `controller/UserProfileController.java`（扩展）、`service/UserProfileStatsService.java`、`service/impl/UserProfileStatsServiceImpl.java`、`response/UserProfileResponse.java`（扩展）、`response/ProfileStatsResponse.java` |
| 迁移 | `backend/src/main/resources/db/migration/V11__seed_viewer_profile_user.sql` |
| 后端测试 | `UserProfileControllerTest.java`、`ProfileDataMigrationSqliteTest.java`、`ProfileMigrationSqliteTest.java` |
| 前端 | `src/profiles/ProfileContext.tsx`、`ProfileModal.tsx`、`profileFormat.ts`、`profileFormat.test.ts`、`src/i18n/profileMessages.ts`、`src/api.ts`、`src/types.ts`、`src/App.tsx`、`src/trips/TripCard.tsx`、`src/trips/TripDetailPage.tsx`、`src/styles.css` |
| E2E | `e2e/tests/profiles.spec.ts`、`e2e/tests/profile.spec.ts`、`e2e/tests/trips.spec.ts` |
| 文档 | 本 change 的 design/tasks；P5 回写 `docs/knowledge/interfaces/README.md`、`architecture/README.md` |

## 风险与权衡

- 统计 O(n) 在演示规模可接受；若未来数据量增长，改为 mapper count 查询，不改变契约。
- 卡片覆盖链接与发布者按钮的 z-index 需要与 hover/动画共存；E2E 覆盖键盘与点击行为。
- V11 改变种子计数是预期副作用；测试同批更新，避免 CI 红。
- 迁移版本号与 main 的 V10 相邻，后续 change 必须从 V12 起，避免再次撞号。
- 公开端点沿用 main 的 `X-User-Id` 约定；任何新增字段都必须经过隐私/凭据审查。
