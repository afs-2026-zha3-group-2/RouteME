# 任务：add-user-profiles

- **依据：** [`spec.md`](specs/user-profiles/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；契约先行；按 P3 / P4 / P5 阶段提交（用户要求每阶段 commit + pull + push）。

## 任务清单

### T1 [contract] 契约先行

- [x] `openapi.yaml` 升至 0.8.0：复用 main 已有 `GET /users/{userId}/profile`（`X-User-Id`），`UserProfile` 增加可空 `joined_at`/`stats`，新增 `ProfileStats`。
- [x] `OpenApiTest` 在 main 用例上扩展：`UserProfile` 含 `joined_at`/`stats` 且不入 required、`ProfileStats` 四项必填；Redocly 0 error（9 warning）。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`
**覆盖：** R2/R3/R5 的契约字段与错误码

### T2 [backend] 迁移与种子数据

- [x] `V12__seed_viewer_profile_user.sql`（只增不改；V10 = main 的资料列、V11 = `add-destination-area-filters` 的目的地代码）：`app_users` id=4（上班族 · 互联网行业 · INFP，`username`/`password_hash` NULL，固定 `created_at`）+ `trip_plans` id=7（publisher_id=4，recruiting）。
- [x] `ProfileDataMigrationSqliteTest` 校验用户 4/行程 7 与凭据列为 NULL。
- [x] 更新 `ProfileMigrationSqliteTest`（V1–V12、4 个演示账号）；`DemoDataMigrationSqliteTest` / `AuthMigrationSqliteTest` 已在 main 侧容纳 4 个账号。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=ProfileDataMigrationSqliteTest,ProfileMigrationSqliteTest test`
**覆盖：** R2/R3 的数据前提；G1 种子数据条件

### T3 [backend] 响应扩展与统计服务

- [x] `response/UserProfileResponse`：在 main 字段之后追加 `joined_at`（`String`）与嵌套 `ProfileStatsResponse`；保留 main 的二参工厂，新增四参 `from(...)`；不包含 username/password_hash/token。
- [x] 新增 `service/UserProfileStatsService` + `service/impl/UserProfileStatsServiceImpl`（不继承 IService，不新表/不新 SQL）。

**验证：** `cd RouteME/backend; .\mvnw.cmd -DskipTests compile`
**覆盖：** R2/R3/R5

### T4 [backend] 统计口径与 404

- [x] 统计：`TripPlanService.findAllTrips`（发布/已完成）、`ApplicationService.mine`（已接受）、`ExperienceService.mine`（数量）；不缓存、不新增 SQL。
- [x] 复用 main 的 `DemoUserService.getById` + `UserEntity.getCreatedAt()`；用户不存在由 main 的 `UserNotFoundException`（404 `USER_NOT_FOUND`）负责。

**验证：** `cd RouteME/backend; .\mvnw.cmd -DskipTests compile`
**覆盖：** R3 全部统计场景；R4 404

### T5 [backend] 资料接口扩展

- [x] 保留 main 的 `controller/UserProfileController`；`profile()` 注入 `UserProfileStatsService` 并传入 `target.getCreatedAt()`。
- [x] 响应序列化不包含账户凭据字段；`PUT /me/profile` 与头像上传行为不变。

**验证：** `cd RouteME/backend; .\mvnw.cmd -DskipTests compile`
**覆盖：** R1–R5 的 API 入口

### T6 [backend] 接口测试

- [x] `UserProfileControllerTest`（MockMvc + H2）：在 main 用例上新增 `joined_at` + 四项统计断言（种子用户 2 → 3/1/2/1）；仍覆盖零统计、404、无 username/password_hash/token。
- [x] 统计夹具：未接受申请、未发布体验不计入；新建零数据账户四项为 0。

**验证：** `cd RouteME/backend; .\mvnw.cmd -Dtest=UserProfileControllerTest test`
**覆盖：** R3/R4/R5（API 层）

### T7 [frontend] 类型、请求与文案

- [x] `types.ts`：`UserProfile`、`ProfileStats`。
- [x] `api.ts`：复用 main 的 `loadUserProfile(userId, callerId)`（GET，带 `X-User-Id`）。
- [x] `i18n/profileMessages.ts`：标题、字段标签、统计标签、共同兴趣、这是你、隐私说明、加载/失败文案、关闭。

**验证：** `cd RouteME/frontend; npm run typecheck`
**覆盖：** R1–R5 的前端入口与文案

### T8 [frontend] 纯函数与单测

- [x] `profiles/profileFormat.ts`：`sharedInterests(current, other)`（自我查看/空交集返回空）、`formatJoinedAt(iso, now)`（相对时间阈值）。
- [x] `profiles/profileFormat.test.ts`：有/无交集、自我查看、时间边界（今天/昨天/N 天/N 月/N 年）。

**验证：** `cd RouteME/frontend; npm test`
**覆盖：** R2 共同兴趣/加入时间；ATDD Defer-UT

### T9 [frontend] 资料弹窗与 Provider

- [x] `profiles/ProfileContext.tsx`：`openProfile(userId)` + 单个 `ProfileModal`；在 `App.tsx` 已登录分支包裹 `AppShell`。
- [x] `profiles/ProfileModal.tsx`：AntD Modal；加载 `Spin`、失败 `Alert`、无旧资料；展示头像/昵称/身份专业/加入时间/简介/兴趣/共同兴趣/四项统计/隐私说明/「这是你」；底部仅关闭，无举报、无编辑。
- [x] 失败映射：`USER_NOT_FOUND` → 用户不存在；其他 → 资料加载失败。

**验证：** `cd RouteME/frontend; npm run build`
**覆盖：** R1/R2/R4/R5 的 UI

### T10 [frontend] 双入口与样式

- [x] `TripCard` 根节点改 `<article>` + `tc-overlay` 链接；发布者改 `<button className="tc-host">`，点击打开资料且不触发卡片跳转；键盘可达。
- [x] `TripDetailPage` 发布者区块改 `<button className="publisher-row publisher-button">`。
- [x] `styles.css` 按 prototype S02 与现有令牌补 `.profile-modal-*`、`.profile-stats`/`.profile-stat`、`.privacy-note`、`.tag.hit`、`.badge.no-dot`、`.tc-overlay`、`.publisher-button`；不与 main 的 `ProfilePage` 类名冲突；浅色/深色、1440/1024/768/390 无横向溢出。

**验证：** `cd RouteME/frontend; npm run build`
**覆盖：** R1 双入口；R2 展示面；G1 `TripCard` 条件

### T11 [e2e] 端到端验收

- [x] 新增 `profiles.spec.ts`：卡片入口不跳详情、详情入口、弹窗字段、共同兴趣有无、自我查看、隐私/举报/凭据缺席、失败态、既有举报回归。
- [x] 更新 `profile.spec.ts`：发布者入口由跳主页改为断言弹窗，并保留直接访问 `#/users/{id}` 的主页验证。
- [x] 更新 `trips.spec.ts`：身份门 4 个演示账户，补第 4 个用户断言。
- [x] 唯一标题/选择器，不假设列表顺序。

**验证：** 前后端启动（全新库 `SPRING_DATASOURCE_URL=jdbc:sqlite:target/e2e-clean.db`）后 `cd RouteME/e2e; npx playwright test`
**覆盖：** R1–R5 用户路径与 Non-goals 反向验证

### T12 [verify] 全量验证与报告

- [x] Redocly、`.\mvnw.cmd -B verify`（200）、`npm run build`、`npm test`（110）、`npx playwright test`（43，干净库）全绿。
- [x] 写 `docs/ai4se-plugins/<ts>-local-verify-report.md`（P4，含合并 main 后的复验记录）。

> P4 结果：合并 main 后全部本地命令绿；此前记录的 5 条「main 既有陈旧用例」已随 main 的 E2E 更新消失，只剩发布者入口语义变化带来的 2 条用例，已按本 change 的弹窗行为改写。

**验证：** 上述命令全绿
**覆盖：** 全部验收场景

### T13 [docs] 知识库与登记（P5）

- [ ] `docs/knowledge/interfaces/README.md` 补「复用 main profile 端点的 `joined_at`/`stats` 扩展」；`architecture/README.md` 补 `user-profiles` 能力与 V12。
- [ ] `requirement-workspace/registry.md` 更新 REQ-009 为 verified（G2/G3 后）。
- [ ] 记录原型隐私文案与本 change 裁决文案的差异；原型举报按钮保留为未来迭代设计。

**验证：** 相对链接 0 断链；术语与 spec 一致
**覆盖：** 文档交付

## 提交计划

| # | 阶段 | 内容 | 说明 |
|---|---|---|---|
| 1 | P1 | 需求、impact/deep-dive、proposal/spec、P1 质量报告 | 已提交并推送 `feature/add-user-profiles` |
| 2 | P2 | Delta Spec 评审、consistency lint、G1 决策 | 已提交并推送 |
| 3 | P3 | ATDD/design/tasks + P3 质量报告 | 本阶段提交；按用户规则 commit + pull + push |
| 4 | P4 | 实现、测试、契约、迁移、本地验证报告（G2 由 VL 签署） | 本阶段提交；按用户规则 commit + pull + push |
| 5 | P5 | 归档、Living Spec、知识库、G3（SA 签署） | 归档提交 |

> 说明：项目规则 `@rule:git-commit-conventions` 规定一个 spec 仅 verify/archive 两次提交；用户本次显式要求每个 SDD 阶段提交并推送，按用户指示执行并在交付说明记录偏离。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | 结果 | 证据 |
|---|---|---|
| 每条 Requirement 都有任务覆盖 | Pass | R1→T5/T9/T10/T11；R2→T1/T3/T4/T7/T8/T9/T10/T11；R3→T1/T2/T4/T6/T11；R4→T3/T5/T6/T9/T11；R5→T1/T3/T6/T9/T11 |
| 设计约束可落地 | Pass | D1→T1/T5；D2→T3/T4/T5；D3→T4；D4→T1；D5→T2；D6→T7/T9；D7→T10；D8→T8/T9；D9→T9；D10→T6/T8/T11/T12 |
| ATDD 的 API/E2E 层都有任务 | Pass | API→T1/T6；E2E→T11；UT→T8；迁移→T2 |
| 非目标已排除 | Pass | 举报、聊天页资料入口、资料编辑、敏感字段、NFR 专项均无实现任务；T11 含反向验证 |
| G1 非阻塞条件有落点 | Pass | 身份模式→D1/T1/T5；种子测试→T2；TripCard→T10；加入时间格式→T8；种子任务→T2；原型文案差异→T13；与 main 的 S18 重叠→D1/D2/D5 + T1–T5 |
