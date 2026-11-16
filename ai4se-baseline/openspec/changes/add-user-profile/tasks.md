# 任务：add-user-profile

- **依据：** [`specs/user-profile/spec.md`](specs/user-profile/spec.md)、[`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** AO（Jay）；SA 复核契约与迁移；Dev 支持头像存储
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8。T1 先写失败验收（red）；T2 / T3 先于 T4；T6 先于 T7。
- **契约：** `openapi.yaml` 0.6.0 → 0.7.0；新增资料读 / 存 / 头像 3 个端点，注册请求收窄。
- **迁移：** 2 个（`V10__add_user_profile.sql` 加 8 列、全可空；`V13__seed_demo_user_profiles.sql` 只为 4 个演示账号回填资料）。
- **并行提醒：** `AppShell.tsx`、`styles.css`、`i18n/tripMessages.ts`、`e2e/tests/auth.spec.ts` 可能正被其它会话修改；只改本 change 需要的行，不回退他人未提交内容。

## 任务清单

### T1 [tests] 先补失败验收（E2E + API + UT）

- [x] 新增 `RouteME/e2e/tests/profile.spec.ts`，先写 10 个用例（red）：
  - `registers and lands on the profile setup page`
  - `blocks the submit and names the missing required fields`
  - `saves a complete profile and opens the public profile`
  - `skips setup and completes the profile later from mine`
  - `edits the profile and updates the public page`
  - `opens a publisher profile from a trip card`
  - `shows an incomplete-profile notice instead of blank fields`
  - `uploads an avatar and keeps the nickname initial when absent`
  - `limits interests and keeps a single travel style`
  - `keeps demo identities read-only`
- [x] fixtures：注册只传 `username/password/nickname`（唯一名 `profile_${Date.now()}`）；第二身份 `viewer_${Date.now()}`；演示身份写 `routeme.currentUserId = 1`；头像用 1×1 PNG `Buffer.from(base64, 'base64')`，超限用 `Buffer.alloc(2*1024*1024+1)`，非法类型用 `text/plain`。
- [x] 新增 `backend/src/test/java/routeme/controller/UserProfileControllerTest.java` 骨架：E1–E4、E6–E10、E19、E22–E24 共 11 个用例（见 `atdd-design.md` §2.2）。
- [x] 新增 `backend/src/test/java/routeme/model/UserProfileRulesTest.java`：星座 12 边界、生日未到不涨岁、完善状态、摘要回退、魔数嗅探。
- [x] 新增 `frontend/src/identity/profileForm.test.ts` 与 `frontend/src/profile/profileDisplay.test.ts`；同步删除 `authForm.test.ts` 中学校 / 兴趣 / 简介断言。
- [x] `AuthControllerTest` 追加 `in_registerLegacyFields_out_ignored`、`in_register_out_profileIncomplete`。
- [x] 运行新 spec / 新测试，记录预期失败（无端点、无路由、注册仍要求学校）。

**验证：** `cd RouteME/e2e; npx playwright test tests/profile.spec.ts`（red）；`cd RouteME/backend; .\mvnw.cmd -B test -Dtest=UserProfileControllerTest`（red）；`cd RouteME/frontend; npm test`（red）
**覆盖：** E1–E24、A1、A5、A6、RV-1–RV-7（以断言形式先落）

### T2 [contract] 契约升 0.7.0

- [x] `openapi.yaml`：`info.version: 0.7.0`；新增 `UserProfile`、`UserProfileUpdateRequest`；新增 4 个路径（3 JSON + 1 图片）；`Error` 增加可选 `fields`；新增 `USER_NOT_FOUND`。
- [x] `DemoUser`：required 改为 `[id, nickname, avatar_initial, bio, interests, profile_complete]`；新增 `avatar_url`、`city`、`major`、`job`；`school` 保留可空。
- [x] `AuthRegisterRequest`：required 收窄为 `[username, password, nickname]`；移除 `avatar_initial/school/bio/interests`。
- [x] 更新 `OpenApiTest`：版本 0.7.0；注册必填三字段；新增资料 schema / 路径 / 枚举 / `fields` 断言。
- [x] 枚举与契约对齐：性别 3、职业 4、旅行方式 4、MBTI 16、兴趣数量 3–5。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test -Dtest=OpenApiTest`
**覆盖：** D7、A6；E2 / E6 / E8 / E23 / E24 的契约面

### T3 [db] 新增迁移与迁移测试

- [x] 新增 `backend/src/main/resources/db/migration/V10__add_user_profile.sql`：8 条 `ALTER TABLE app_users ADD COLUMN`（`avatar_url`、`birthday`、`gender`、`city`、`major`、`job`、`mbti`、`travel_style`），全部可空。
- [x] 不新增表、不建索引、不回填、不改演示行；`school` / `bio` / `interests` 继续使用既有 NOT NULL 列。
- [x] 新增 / 扩展迁移测试（参照 `AuthMigrationSqliteTest`）：V10 后演示账号新列为 NULL、旧 `school` 文案保留；V13 回填后 4 个演示账号资料列齐全（`ProfileMigrationSqliteTest` / `ProfileDataMigrationSqliteTest`）。
- [x] 新增 `V13__seed_demo_user_profiles.sql`：为 id 1–4 回填 `birthday` / `gender` / `city` / `job` / `mbti` / `travel_style`，使演示账号 `profile_complete=true`；周野（id 4）的 `school` 编码拆到 `job` / `mbti` 并置空 `school`。
- [x] 用全新数据库启动一次，确认 V1–V13 顺序通过。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test -Dtest=*MigrationSqliteTest`
**覆盖：** D1、D3、L-04（空值语义）

### T4 [backend] 资料领域：常量、派生、读写、头像

- [x] 新增 `ProfileConstant`：字段长度、性别 / 职业 / 旅行方式 / MBTI 枚举、兴趣 3–5、头像 2 MB 与允许类型。
- [x] 新增 `ProfileRules`：`age`、`zodiac`（12 段表）、`complete`、`summary`（与前端同规则）。
- [x] `UserEntity` 增加 8 个字段与 getter/setter；`toDemoUser()` / `toUserAccount()` 同步（`DemoUser` 增加 `avatarUrl` / `profileComplete` / `city` / `major` / `job`）。
- [x] 新增 `UserProfileUpdateRequest`、`UserProfile`、`UserProfileResponse`；新增 `UserProfileService` / `UserProfileServiceImpl`：读取（本人含生日 / 他人省略）、保存（校验 → 单事务更新）、头像（写文件 → 更新列 → 删旧文件）。
- [x] 新增 `UserProfileController`：`GET /api/users/{id}/profile`、`PUT /api/users/me/profile`、`POST /api/users/me/avatar`、`GET /api/users/{id}/avatar`。
- [x] `application.yaml`：`spring.servlet.multipart.max-file-size: 2MB`、`max-request-size: 3MB`、`routeme.profile.avatar-dir`；启动时创建目录。
- [x] `GlobalExceptionHandler`：`ErrorResponse` 增加 `fields`；`MaxUploadSizeExceededException` → 400 `INVALID_INPUT`；新增 `UserNotFoundException`（404 `USER_NOT_FOUND`）。
- [x] 权限：Bearer 优先；无 token 且 `X-User-Id` 指向 `username IS NULL` 的演示账户 → 403；其余无 token → 401 `SESSION_INVALID`。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test -Dtest=UserProfileControllerTest,UserProfileRulesTest`
**覆盖：** E1–E10、E19、E22–E24、RV-3、RV-4、L-06

### T5 [backend] 注册瘦身与用户摘要扩展

- [x] `AuthRegisterRequest` 收窄为 `username` / `password` / `nickname`；`AuthServiceImpl.register` 去掉 `requireSchool` / `optionalText(bio)` / `cleanInterests`，学校写 `""`、简介写 `""`、兴趣写 `[]`。
- [x] `DemoUserService.createAccount` 去掉 `school/bio/interests` 参数；`DemoUserServiceImpl` 同步。
- [x] 注册响应 `AuthSession.user.profile_complete = false`；`avatar_initial` 仍取昵称首字。
- [x] 旧字段（`school` / `bio` / `interests` / `avatar_initial`）被忽略而非 400（Spring 默认忽略未知字段；加测试固定行为）。
- [x] `DemoUserResponse` / `UserEntity.toDemoUser()` 输出新增摘要字段；确认 `GET /api/users`、`/users/demo`、`/auth/me` 一致。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B test -Dtest=AuthControllerTest,OpenApiTest`
**覆盖：** A1–A6、E14、E19、RV-6

### T6 [frontend] 数据层与文案

- [x] `types.ts`：`DemoUser` 增加 `avatar_url?` / `profile_complete` / `city?` / `major?` / `job?`，`school` 可空；新增 `UserProfile`、`UserProfileUpdateRequest`；`AuthRegisterRequest` 收窄为三字段。
- [x] `api.ts`：新增 `loadUserProfile(userId, callerId)`、`saveMyProfile(token, body)`、`uploadAvatar(token, file)`；`request()` 抛 `ApiError`（`code` + `fields`）。
- [x] `route.ts`：新增 `profileSetup`、`userProfile`（`#/profile/setup`、`#/users/{id}`）与互转；补 `route.test.ts`。
- [x] `profile/profileOptions.ts`：性别 / 职业 / 旅行方式 / 16 型 MBTI；兴趣预设 `{ value, label }`（自然风景→自然、文化历史→历史、看展→展览、Citywalk→城市漫步），与契约枚举同值。
- [x] `profile/profileForm.ts`：`emptyProfileForm`、`validateProfileForm`（必填 6 项、生日格式与范围、兴趣 3–5、旅行方式单选）、原因码 → 文案、`toUpdateRequest`。
- [x] `profile/profileDisplay.ts`：`publisherSummary`（学校 · 专业 → 职业 → 城市 → 空串）、`hasPublicContent`。
- [x] `i18n/tripMessages.ts`：新增资料页 / 主页 / 错误 / 入口文案键；不删除既有键。
- [x] `identity/authForm.ts`：移除学校 / 兴趣 / 简介；`toRegisterRequest` 只传三字段；同步 `authForm.test.ts`。

**验证：** `cd RouteME/frontend; npm run build; npm test`
**覆盖：** E2、E4、E5、E7、E11、E12、E20、E21、A1–A5、D8

### T7 [frontend] 页面与入口

- [x] 新增 `profile/ProfileSetupPage.tsx`：按 `design.md` §7.1 的结构；`input[type=date]` 生日、AutoComplete 城市、Radio 性别 / 旅行方式、Select 职业 / MBTI、抽取的 `InterestPicker`；提交前本地校验；`fields` 回填；汇总 `Alert`；跳过 / 取消；保存成功跳本人主页。
- [x] 新增 `profile/ProfilePage.tsx`：按 §7.2；本人显示「编辑资料」，他人只读；`profile_complete=false` 显示提示；无内容显示空态。
- [x] 新增 `profile/InterestPicker.tsx`：从 `AuthPanel` 抽出，保留「取消后自定义标签仍可复选」与 5 个上限。
- [x] `App.tsx`：渲染两个新路由；`handleAuthenticated` 仅在 `profile_complete === false` 时跳 `#/profile/setup`；**不加全局守卫**。
- [x] `mine/MyTripsPage.tsx`：资料卡（头像 + 昵称 + 摘要 / 未完善提示 + 完善 / 查看 / 编辑入口）。
- [x] `trips/TripCard.tsx`：发布者胶囊改 `button`（`stopPropagation` + `#/users/{id}`），整卡仍进详情。
- [x] `trips/TripDetailPage.tsx`：发布者行改链接 + 头像 + `publisherSummary`；`experiences/ExperienceCard.tsx` 作者改链接。
- [x] `shell/Avatar.tsx`：有 `avatar_url` 渲染 `<img>`，否则首字；`shell/AppShell.tsx` 身份面板摘要用 `publisherSummary`，为空显示「资料未完善」。
- [x] `styles.css`：完善页 / 主页 / 头像图片 / 字段错误 / 汇总提示；390 / 768 / 1440 与深色模式。
- [x] 视觉对照 [`preview/profile-pages.html`](preview/profile-pages.html)：三页 × 本人 / 他人 × 未完善 / 已完善 × 浅 / 深色 × 390 / 768 / 1440。

**验证：** `cd RouteME/frontend; npm run build`；`cd RouteME/e2e; npx playwright test tests/profile.spec.ts`
**覆盖：** E8、E9、E13、E15–E18、E20–E22、E24、RV-1、RV-2、RV-4、RV-5、RV-7

### T8 [verify] 全量回归、迁移与手工核对

- [x] `cd RouteME/backend; .\mvnw.cmd -B test`（含 `OpenApiTest`、`UserProfileControllerTest`、`UserProfileRulesTest`、迁移测试；既有 154 项不回归）。
- [x] `cd RouteME/frontend; npm run build; npm test`（既有 9 文件 + 新增 2 文件全绿）。
- [x] `cd RouteME/e2e; npx playwright test tests/profile.spec.ts`（10 项全绿）；再跑 `npx playwright test`（`trips` / `companions` / `experiences` 不回归；若并行 `auth.spec.ts` 已在工作区一并跑）。
- [x] 迁移双路径：全新库启动 + 旧库启动（V10 不回填老账号；V13 只为 4 个演示账号回填；演示账号仍只读、`school` 旧文案除周野外保持不变）。
- [x] 手工：注册 → 完善 → 保存 → 本人主页；他人从卡片 / 详情 / 体验进入；未完善发布者降级；跳过 → 「我的」补全；演示身份无入口；390 / 768 / 1440；浅 / 深色；键盘与读屏；与 [`preview/profile-pages.html`](preview/profile-pages.html) 逐页对照。
- [x] 反向核对：`TripController` / `ApplicationController` / `ChatController` / `ExperienceController` 无逻辑 diff；匹配分数与理由不变；他人响应无 `birthday`；注册带旧字段仍 201。
- [x] 真实输出写入 `docs/ai4se-plugins/<timestamp>-local-verify-report.md`。
- [x] 归档前提醒：SA 具名追认双 capability 例外；归档时新建 `user-profile` Living Spec 并用 MODIFIED 替换 `user-auth`「注册账号」（保留 4 个基线场景）。

**验证：** 上述命令全绿；迁移与手工结果写入 local-verify 报告
**覆盖：** 全部 26 + 6 场景、RV-1–RV-7、G1 条件 2–8

### T9 [frontend] 侧栏分组与账号菜单（VL 追加）

- [x] `shell/AppShell.tsx`：主导航按「浏览 / 我的」分组渲染；底部为账号入口（头像 + 昵称 + `publisherSummary`，为空显示「资料未完善」），点击展开菜单（「编辑我的资料」→ `#/profile/setup`、分隔线、「退出登录」→ `onLogout`）；删除底部「价值闭环」卡片与「演示环境 · 数据保存在本机」说明。
- [x] 菜单用 `position: fixed` 按账号行 `getBoundingClientRect()` 定位（侧栏 `overflow-y: auto` 会裁剪绝对定位子树），与行底边对齐、距侧栏 10px、宽 188px，浮于内容之上；滚动 / 缩放时重算位置；Esc、外部点击、选中动作关闭，Esc 归还焦点，上下方向键在菜单项间移动。
- [x] `styles.css`：侧栏改为实色面，分组标题 / 分组分隔线与选中态改用 `--lagoon` 混合色（浅色与深色各取可读文字色）；账号入口沿用导航悬停样式，以 `[aria-expanded=\"true\"]` 表示展开并旋转箭头；菜单 `--surface` + `--line-2` 描边（深色 `--surface-2`）+ `--sh-3`，与 `.id-panel` 同一层级语言；≤900px 仍整条收起、底部标签栏保留三个入口。
- [x] `specs/design-system/spec.md`：MODIFIED「应用外壳与导航」，新增账号入口 / 账号菜单 / 关闭账号菜单场景，保留原四个场景（共 7 个）。
- [x] 视觉：浅 / 深色 × 1440 / 390 截图核对；`auth.spec.ts`「我的旅行」链接与 `profile.spec.ts` 全量不回归。

**验证：** `cd RouteME/frontend; npm run typecheck; npm test; npm run build`；`cd RouteME/e2e; npx playwright test`
**覆盖：** design-system「应用外壳与导航」7 个场景

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | Result | Evidence |
|---|---|---|
| `user-profile` 26 个 Scenario 均有 ATDD 行与任务 | Pass | E1–E26 见 `atdd-design.md` §1.2；D1–D12；T1–T8 |
| `user-auth` 6 个 Scenario 有落点 | Pass | A1–A6；T1（测试）、T2（契约）、T5（实现） |
| `design-system`「应用外壳与导航」7 个 Scenario 有落点 | Pass | T9；`specs/design-system/spec.md`（MODIFIED，保留原 4 个场景） |
| 基线场景不丢 | Pass | MODIFIED 保留 4 个既有场景；T5 只收窄字段与校验，不删登录 / 重复 / 格式 / 密码用例 |
| Non-goals 有反向验证 | Pass | RV-1–RV-7；T1（断言）、T8（复核） |
| 无静默范围扩张 | Pass | 未加入裁剪、相册、可见性、演示编辑、兴趣词表统一、私信、改密码 |
| 任务不越过 Delta 范围 | Pass | 无裁剪 / 压缩 / 多图 / 隐私开关 / 强制引导任务 |
| 契约先行 | Pass | T2 先于 T4；`OpenApiTest` 门禁；契约 0.7.0 同 PR |
| 迁移先行 | Pass | T3 先于 T4；全可空 + 迁移测试 |
| 任务一层一条、可执行 | Pass | T1 tests、T2 contract、T3 db、T4–T5 backend、T6–T7 frontend、T8 verify |
| 最后一条为验证 / 回归 | Pass | T8 |
| ATDD 先于实现 | Pass | T1 先写 red；T2–T7 实现；T8 回归 |
| 设计决策与 ATDD 一致 | Pass | D10 对应 E18 / E21；D9 对应 E14–E17；D5 对应 E8–E10；D8 对应 E11–E13 |
| G1 条件落入任务 | Pass | 展示契约（D10 / T7）、昵称唯一（D2 / T4）、契约 0.7.0（D7 / T2）、迁移空值（D3 / T3）、兴趣词表（D8 / T6）、头像存储（D5 / T4）、归档核对（T8） |
| 并行会话文件不被回退 | Pass | 并行提醒；T7 只改必要行；不回退 `AppShell.tsx` / `e2e/tests/auth.spec.ts` |

**结论：Pass。** 未发现 Spec ↔ Design ↔ Tasks ↔ ATDD 的阻塞性不一致。

## P4 完成记录（2026-11-16）

- 实现提交 `2423c01`；T1–T8 全部完成，验证结果见 [`docs/sdd/add-user-profile/p4-verify.md`](../../../docs/sdd/add-user-profile/p4-verify.md) 与 [`docs/ai4se-plugins/20261116-120800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-120800-local-verify-report.md)。
- 与任务原文的偏差（均已在 P4 记录）：
  - 契约保持 `0.7.0`（`add-trip-publish` 已 bump；`OpenApiTest` 断言 0.7.0），未重复升版。
  - E2E 唯一名使用 `p/pub/view/inc{base36}{counter}`（≤20 字符），未用 `profile_${Date.now()}`。
  - `UserProfileControllerTest` 落地 14 项（任务估 11/13 项），额外覆盖演示身份 403 与头像读取。
  - 头像保存后按目录前缀 `{userId}-` 定位文件；`avatar_initial` 在保存昵称时重新派生。
  - `trips.spec.ts` 宿主名断言改为 `toContainText`（卡片新增学校 · 专业摘要）。
- G2 仍待 VL 签署：[`g2-decision.md`](g2-decision.md)。