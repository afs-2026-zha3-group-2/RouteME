# ATDD 设计：add-user-profile

- **Change:** `add-user-profile`（REQ-008，`user-profile` ADDED + `user-auth` MODIFIED）
- **依据：** [`proposal.md`](proposal.md)、[`specs/user-profile/spec.md`](specs/user-profile/spec.md)、[`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:web-testing`、`@rule:web-coding-style`、`@rule:api-contract`、`@rule:sdd-artifacts`
- **范围提醒：** 本 change 同时改后端、契约（0.7.0）、迁移（1 个）与前端页面；ATDD 覆盖 **API 验收 + 前端 UT + E2E 垂直切片**。不产出实现代码。
- **设计预览：** [`preview/profile-pages.html`](preview/profile-pages.html)（自包含评审页，不进入构建）：完善 / 编辑、个人主页、发布者入口 × 本人 / 他人 × 未完善 / 已完善 × 浅 / 深色 × 390 / 768 / 1440；交互契约仍以本文件 §2 与 `design.md` §7–§8 为准。

## 1. ATDD 分层范围

### 1.1 分层结论

| 层 | 本 change 的用法 |
|---|---|
| **API** | 新增 `UserProfileControllerTest`：读取 / 保存 / 头像上传、字段级 400、401 / 403、生日派生、他人视图不含生日；`AuthControllerTest` 追加注册收窄与旧字段忽略 |
| **UT（前端）** | 新增 `profileForm.test.ts`（必填汇总、兴趣 3–5、旅行方式单选、生日格式）与 `profileDisplay.test.ts`（学校 · 专业拼接、摘要回退）；沿用既有 Node 测试栈，不引入组件测试框架 |
| **UT（后端）** | `UserProfileRulesTest`：周岁 / 星座边界（表驱动）、完善状态派生、发布者摘要回退、头像类型嗅探 |
| **E2E** | 一条垂直切片：注册 → 完善页 → 保存 → 本人主页 → 他人从发布者入口查看；外加跳过 / 稍后补全、编辑、头像、演示只读 |

**推荐附加层（advisory，不设门禁）：** Security（`PUT` / 上传只作用于会话用户、生日不外泄）；Accessibility（字段错误可被读屏读出、键盘可达）；Compatibility（390 / 768 / 1440）。

### 1.2 场景分类

`user-profile`（24 场景）：

| # | 场景（Delta） | 层 | 依据 |
|---|---|---|---|
| E1 | 完整必填资料保存成功 | API + E2E | 201/200 + 资料已完善 + 字段回显 |
| E2 | 缺少必填字段 | API + UT | 400 `INVALID_INPUT` + 五项字段清单 + 前端不提交 |
| E3 | 选填字段留空 | API | 仅必填项也保存成功 |
| E4 | 非学生只填职业 | API + UT | 学校为空不报错；摘要回退到职业 |
| E5 | 旅行方式只能单选 | UT + E2E | 改选覆盖，不并存 |
| E6 | 展示年龄与星座 | API + UT | 生日 `2003-05-18` → 周岁 + 星座；他人响应无生日 |
| E7 | 生日为未来或格式非法 | API + UT | 400 `INVALID_INPUT` + 无部分写入 |
| E8 | 上传头像成功 | API + E2E | 返回可访问地址；主页与卡片展示 |
| E9 | 未上传头像 | UT + E2E | 回退昵称首字，无空框 |
| E10 | 头像文件类型或大小不合法 | API | 400 `INVALID_INPUT` + 已填字段不丢 |
| E11 | 少于 3 个兴趣 | UT + E2E | 阻止提交 + 「至少 3 个」 |
| E12 | 达到 5 个上限 | UT + E2E | 不新增 + 「最多 5 个」 |
| E13 | 自定义标签取消后仍可复选 | E2E | 取消后仍是未选卡片，可再选 |
| E14 | 注册后资料未完善 | API + E2E | `profile_complete=false` + 进入完善页 |
| E15 | 跳过完善页 | E2E | 可进首页；「我的」保留入口 |
| E16 | 稍后补全 | E2E | 从「我的」补全 → 已完善 + 主页完整 |
| E17 | 保存后进入本人主页 | E2E | 跳转 `#/users/{id}` + 展示保存值 / 年龄 / 星座 |
| E18 | 他人从发布者入口查看 | E2E | 卡片 / 详情 / 体验作者 → 他人主页；无编辑入口 |
| E19 | 查看未完善的资料 | API + E2E | 展示已有字段 + 未完善提示，不报错 |
| E20 | 学校与专业拼接展示 | UT + E2E | 「中山大学 · 地理科学」，用户不输入 `·` |
| E21 | 发布者未填学校 | UT + E2E | 摘要展示职业，无空行 / 占位符 |
| E22 | 本人更新资料 | API + E2E | 覆盖同一份资料；展示位立即生效 |
| E23 | 没有有效会话 | API | 401 `SESSION_INVALID` |
| E24 | 演示身份尝试保存 | API + E2E | 403；界面无编辑 / 完善入口 |

`user-auth`（MODIFIED「注册账号」，6 场景）：

| # | 场景 | 层 | 依据 |
|---|---|---|---|
| A1 | 注册成功后自动登录 | API + E2E | 201 + token + `profile_complete=false` + 进入完善页 |
| A2 | 用户名重复 | API 回归 | 409 `USERNAME_TAKEN` |
| A3 | 用户名格式非法 | API 回归 | 400 `INVALID_INPUT` |
| A4 | 密码长度非法 | API 回归 | 400 `INVALID_INPUT` |
| A5 | 昵称缺失或超长 | API | 400 `INVALID_INPUT` |
| A6 | 忽略旧版注册资料字段 | API | 携带学校 / 简介 / 兴趣 → 201 且字段被忽略 |

## 2. 生产代码前先写的检查

### 2.1 E2E（red）

新增 `RouteME/e2e/tests/profile.spec.ts`，先跑出失败，再进入实现：

| 用例名（English statement） | 覆盖 | 关键断言 |
|---|---|---|
| `registers and lands on the profile setup page` | A1、E14 | 注册后 URL `#/profile/setup`；无需再次输入用户名 / 密码 |
| `blocks the submit and names the missing required fields` | E2、E11 | 只填昵称与职业 → 不发 `PUT`；汇总「还有 5 项未完成」并列出字段名 |
| `saves a complete profile and opens the public profile` | E1、E6、E17、E20 | 保存后 URL `#/users/{id}`；展示「中山大学 · 地理科学」、年龄、星座 |
| `skips setup and completes the profile later from mine` | E15、E16 | 跳过 → 首页；「我的」出现「完善资料」；补全后状态变为已完善 |
| `edits the profile and updates the public page` | E22 | 改旅行方式并保存；本人主页立即显示新值，未新建第二份资料 |
| `opens a publisher profile from a trip card` | E18、E21 | 点击发布者（非整卡跳转）→ `#/users/{publisherId}`；无编辑按钮；摘要不空 |
| `shows an incomplete-profile notice instead of blank fields` | E19 | 未完善发布者 → 提示「该用户尚未完善资料」；不出现空白页 / 错误 |
| `uploads an avatar and keeps the nickname initial when absent` | E8、E9 | 上传后主页出现图片；不设置头像时显示昵称首字 |
| `limits interests and keeps a single travel style` | E5、E12、E13 | 5 个上限提示；取消自定义后仍可复选；旅行方式只保留最后一项 |
| `keeps demo identities read-only` | E24 | 演示身份无「完善资料 / 编辑资料」；`PUT` 返回 403 |

### 2.2 API 验收（red）

新增 `backend/src/test/java/routeme/controller/UserProfileControllerTest.java`：

| 用例 | 覆盖 | 断言 |
|---|---|---|
| `in_completeRequiredProfile_out_savedAndComplete` | E1 | 200；`profile_complete=true`；字段回显 |
| `in_missingRequiredFields_out_invalidInputWithFields` | E2 | 400；`fields` 含 `birthday/gender/city/interests/travel_style` |
| `in_optionalFieldsEmpty_out_saved` | E3 | 200；选填为 null / 空数组 |
| `in_jobOnlyWithoutSchool_out_saved` | E4 | 200；`school` 为空但保存成功 |
| `in_birthdayFutureOrMalformed_out_invalidInput` | E7 | 400；资料未变（先读后写比对） |
| `in_birthday_out_ageAndZodiacDerived` | E6 | 固定 `Clock` → 年龄 / 星座；他人读取无 `birthday` |
| `in_avatarJpeg_out_urlServed` | E8 | 200 + `avatar_url`；`GET` 该地址 200 `image/jpeg` |
| `in_avatarBadTypeOrOversize_out_invalidInput` | E10 | 400；其他字段保持原值 |
| `in_otherUserProfile_out_birthdayOmitted` | E6 / E19 | 不含 `birthday`；含 `profile_complete` |
| `in_demoSave_out_forbidden` | E24 | 403 |
| `in_noSessionSave_out_sessionInvalid` | E23 | 401 `SESSION_INVALID` |

`AuthControllerTest` 追加：`in_registerLegacyFields_out_ignored`（A6）、`in_register_out_profileIncomplete`（A1）；A2–A5 原有用例作为回归门禁。

### 2.3 前端 UT（red）

| 文件 | 用例 | 覆盖 |
|---|---|---|
| `identity/profileForm.test.ts`（新增） | `requires nickname, birthday, gender, city, interests and travel style`；`lists the missing field labels`；`keeps a single travel style`；`rejects fewer than three interests`；`caps interests at five`；`keeps a cancelled custom tag`；`rejects a future or malformed birthday` | E2、E4、E5、E7、E11、E12、E13 |
| `profile/profileDisplay.test.ts`（新增） | `joins school and major with a middot`；`falls back to job when school is empty`；`falls back to city when school and job are empty`；`omits the summary when all three are empty`；`returns the nickname initial when avatar is absent` | E9、E20、E21 |
| `identity/authForm.test.ts`（改） | 删除学校 / 兴趣 / 简介相关断言；保留用户名 / 密码 / 昵称 | A1、A3–A5 |

### 2.4 后端 UT（red）

`backend/src/test/java/routeme/model/UserProfileRulesTest.java`：

- `in_birthdayOnZodiacBoundary_out_expectedSign`（12 条边界，表驱动）
- `in_birthdayBeforeBirthdayInYear_out_ageMinusOne`（生日未到不涨岁）
- `in_profileWithAllRequired_out_complete` / `in_profileMissingOneRequired_out_incomplete`
- `in_publisherWithSchoolAndMajor_out_joined` / `in_publisherWithoutSchool_out_job` / `in_publisherWithoutAny_out_empty`
- `in_avatarPngOrJpegOrWebp_out_accepted` / `in_avatarGifOrText_out_rejected`

## 3. 本地 vs CI 门禁

| 门禁 | 命令 | 期望 |
|---|---|---|
| 契约可解析 | `cd RouteME/backend; .\mvnw.cmd -B test -Dtest=OpenApiTest` | 0.7.0、新路径 / 新 schema / 必填字段通过 |
| 后端单测 / 回归 | `cd RouteME/backend; .\mvnw.cmd -B test` | 全绿；新增 profile 用例与既有 154 项不回归 |
| 前端类型 / 构建 | `cd RouteME/frontend; npm run build` | 0 error |
| 前端单测 | `cd RouteME/frontend; npm test` | 全绿；新增 2 个文件 |
| E2E | 启动后端 `8080` + 前端 `5173` 后 `cd RouteME/e2e; npx playwright test tests/profile.spec.ts` | 新增 10 项全绿 |
| E2E 回归 | `cd RouteME/e2e; npx playwright test` | 既有 `trips` / `companions` / `experiences` 不回归（`auth.spec.ts` 属并行 change，若已在工作区则一并跑） |
| 手工 | 1440 / 768 / 390；浅色 / 深色；键盘 | 完善页与主页不溢出；错误可聚焦；保存后回显 |

不新增 CI 语义；沿用仓库既有命令。

## 4. 数据 / Fixtures 策略

- **注册账号：** `page.request.post('/api/auth/register', { data: { username: 'profile_' + Date.now(), password, nickname } })`；把返回的 `token` 与 `user.id` 写入 `localStorage` 后再 `reload()`。仅传三字段，同时验证注册收窄。
- **第二个身份（浏览者）：** 再注册一个 `viewer_${Date.now()}`，写入其 `userId` / `token`；用于「他人查看」与「他人只读」。
- **演示身份：** `addInitScript` 写 `routeme.currentUserId = 1`；用于 E24 与既有卡片入口。
- **未完善发布者：** 注册后不提交资料，直接用它发布一条行程（`POST /api/trips`，带 `X-User-Id`），再用浏览者打开。
- **头像文件：** 1×1 PNG / JPEG 的最小 `Buffer.from(<base64>, 'base64')`；超限用 `Buffer.alloc(2 * 1024 * 1024 + 1)`；非法类型用 `{ name: 'a.txt', mimeType: 'text/plain', buffer }`。不使用真实用户图片。
- **唯一性 / 清理：** 用户名带时间戳；不删除数据库记录，沿用既有演示库累积约定。
- **断言等待：** 资料保存后用 `expect.poll` 读 `GET /api/users/{id}/profile` 直到新值出现；头像用 `expect.poll` 轮询 `avatar_url`，不固定等待。

## 5. Non-goals 与反向验证

| 反向用例 | 断言 |
|---|---|
| RV-1 不改行程 / 申请 / 聊天 / 体验业务规则 | `TripController`、`ApplicationController`、`ChatController`、`ExperienceController` 无逻辑 diff；匹配分数与理由不变；卡片仍展示昵称 |
| RV-2 资料未完善不阻断既有功能 | 跳过后可打开首页、发布行程、查看详情、「我的」；无强制跳转中间件 |
| RV-3 生日不外泄 | 他人 `GET /api/users/{id}/profile` 与 `GET /api/users` 响应都不含 `birthday` |
| RV-4 演示身份只读 | 无编辑 / 完善入口；`PUT /api/users/me/profile` 与 `POST /api/users/me/avatar` 返回 403 |
| RV-5 不做可见性 / 相册 / 裁剪 | 无隐私开关、多图、裁剪器、背景图接口或控件 |
| RV-6 旧注册字段被忽略而非报错 | 注册请求带 `school/bio/interests/avatar_initial` 仍 201，且不写入资料 |
| RV-7 不做强制引导 | 资料未完善用户直接打开 `#/`、`#/mine` 不被重定向 |

## 6. NFR 测试（可选）

- **性能 / 容量：** 未指定 SLA → deferred。仅对头像做硬限制（≤2 MB、单文件、服务端生成文件名）。
- **安全：** 作为 advisory：类型嗅探（魔数）优先于 `Content-Type`；文件名不使用用户输入；访问路径只读；替换头像删除旧文件。
- **可访问性：** 作为 advisory：字段错误 `role="alert"` + `aria-describedby`；汇总提示可读；键盘可完成上传以外的全部字段；对比度沿用既有令牌。
- **兼容性：** 手工 390 / 768 / 1440 三档；不做多浏览器矩阵。

## 7. 交付边界

- **本设计产出：** 分层、24 + 6 场景映射、red 用例清单、门禁、fixtures、反向验证、NFR 取舍。
- **不产出：** 生产代码、E2E / API / UT 代码、契约与迁移文件；这些属 `/sdd:atdd-apply`。
- **下一步：** `/sdd:task-plan`（`design.md` + `tasks.md` + 对齐自检）。