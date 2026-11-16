# 设计：add-user-profile

- **Change:** `add-user-profile`（REQ-008，`user-profile` ADDED + `user-auth` MODIFIED）
- **依据：** [`proposal.md`](proposal.md)、[`specs/user-profile/spec.md`](specs/user-profile/spec.md)、[`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`atdd-design.md`](atdd-design.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)、`requirement-workspace/impact-brief.md` §12、`deep-dive.md`「REQ-008 增补」
- **规则：** `@rule:api-contract`、`@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:sdd-artifacts`
- **设计预览：** [`preview/profile-pages.html`](preview/profile-pages.html)（自包含评审页，不进入构建）；结构与状态见 §7–§8，样式沿用 `styles.css` 既有令牌。

## 1. 关键取舍

### D1 资料存在 `app_users` 的 8 个新列，不新建资料表

- **Context：** 一个账号恰好一份资料，资料与账号同生命周期；`app_users` 已有昵称、学校、简介、兴趣。拆表会引入 1:1 join、双写事务与「昵称为谁」的歧义。
- **Decision：** 新迁移 `V10__add_user_profile.sql` 给 `app_users` 增加 `avatar_url`、`birthday`、`gender`、`city`、`major`、`job`、`mbti`、`travel_style` 共 8 列，全部可空；不新增表、不改演示数据。
- **Rejected：** 新建 `user_profiles` 1:1 表（跨表一致性成本高于收益）；把资料写进 JSON 单列（无法约束枚举、无法按字段查询）；复用 `school` 存「学校 · 专业」（正是本次要修的输入问题）。
- **Consequence：** 资料读写是一个实体的字段更新；旧账号新列为 NULL，由派生逻辑视为缺失。

### D2 昵称唯一来源是 `app_users.nickname`

- **Context：** 注册收集昵称，完善页也允许改昵称；规格未说明二者关系（lint L-02）。
- **Decision：** 只有 `app_users.nickname` 一个字段。注册写入初值；完善页编辑同一字段；`GET /api/users`、`DemoUser`、资料响应、行程 / 体验发布者展示全部读这一列。不新增「资料昵称」。
- **Rejected：** 资料表再存一份昵称（两个值必然漂移）；完善页不允许改昵称（与「编辑资料」预期不符）。
- **Consequence：** 改昵称会同时改变发布者展示与 `avatar_initial` 的回退字符来源。

### D3 资料完善状态由必填字段派生，不落库

- **Context：** 规格要求状态是必填字段的函数，且不得与字段漂移；G1 条件要求 NULL / 空串都算缺失（lint L-04）。
- **Decision：** `profile_complete` 在读取时计算：昵称非空、生日合法、性别为枚举值、城市非空、兴趣 3–5 个、旅行方式为枚举值。空串、NULL、空白、非法日期都算缺失。资料响应与用户摘要共用同一个 `ProfileRules.complete(...)`。
- **Rejected：** 新增 `profile_complete` 列（需要每次保存同步维护，容易漂移）；用「生日是否为空」代替完整判定（会漏掉兴趣 / 旅行方式）。
- **Consequence：** 迁移无需回填；演示账号与迁移前账号自然为未完善；没有额外写路径。

### D4 年龄 / 星座服务端派生；生日只对本人返回

- **Context：** 规格要求响应给只读年龄与星座、他人不可见完整生日；星座边界必须可测。
- **Decision：** `UserProfileResponse` 含 `age`（周岁，`Period.between`）与 `zodiac`（12 段表驱动）；仅当 `X-User-Id == 目标用户` 时返回 `birthday`，他人响应省略该键（`@JsonInclude(NON_NULL)`）。当前日期取既有 `Clock` Bean，测试可注入固定时钟。
- **Rejected：** 前端计算（时区 / 客户端时间不可信、无法在 API 测试断言）；返回生日让前端算（违反隐私约束）；把年龄存列（每年都会错）。
- **Consequence：** 边界日期用表驱动单测；他人响应永不含生日；`GET /api/users` 列表也不含生日。

### D5 头像落盘 + 服务端生成文件名 + 只读图片端点

- **Context：** 真实上传但选填；仅 JPEG / PNG / WebP、≤2 MB；G1 要求固定目录、命名与访问路径（lint L-06）。Spring Boot 默认 multipart 上限是 1 MB，低于业务上限。
- **Decision：**
  - 目录：`routeme.profile.avatar-dir`，缺省 `../SqlLite/uploads/avatars`；启动时按 `SqliteDirectory` 同款方式建目录。
  - 命名：`{userId}-{16 位小写 hex}.{jpg|png|webp}`，扩展名由魔数判定，不信任 `Content-Type` 与原始文件名。
  - 访问：`GET /api/users/{userId}/avatar` 直接流式返回当前文件（`Cache-Control: public, max-age=31536000, immutable`）；无头像 404。列里存的 `avatar_url` 带版本参数 `/api/users/{id}/avatar?v={8 位 hex}`，换头像即换缓存键。
  - 限制：`spring.servlet.multipart.max-file-size: 2MB`、`max-request-size: 3MB`；超限映射 400 `INVALID_INPUT`；空文件拒绝。
  - 替换：先写新文件 → 更新列 → 删除旧文件；删除失败只记日志，不影响响应。
- **Rejected：** 存 Base64 进数据库（库膨胀、响应变慢）；用原始文件名（路径穿越与覆盖风险）；`/static/**` 直接映射目录（需要额外静态资源与缓存配置，且无法按用户 404）；返回 data URL（无法缓存、卡片体积大）。
- **Consequence：** 头像 URL 稳定可缓存；旧文件清理失败会留孤儿文件，属可接受运维风险。

### D6 读用 `X-User-Id`，写用 Bearer；演示身份 403

- **Context：** 既有读接口统一用 `X-User-Id`（`DemoUserService.require`），会话接口用 Bearer（`AuthService.requireUser`）。演示账户没有凭据，不可能持有 token。
- **Decision：**
  - `GET /api/users/{id}/profile`：要求 `X-User-Id`（与 `GET /api/users` 一致）；缺失 / 未知 → 401 `DEMO_USER_REQUIRED`；目标不存在 → 404 `USER_NOT_FOUND`。
  - `PUT /api/users/me/profile`、`POST /api/users/me/avatar`：要求 Bearer；token 无效 / 缺失时，若 `X-User-Id` 指向一个 `username IS NULL` 的演示账户 → 403 `FORBIDDEN`，否则 401 `SESSION_INVALID`。
  - 前端只对 `isAuthenticated` 渲染编辑 / 完善入口；演示身份永不显示。
- **Rejected：** 写也用 `X-User-Id`（任何人都能改别人资料）；演示身份返回 401（规格明确要求 403）；为演示账户建会话（无密码，破坏身份模型）。
- **Consequence：** 权限规则集中在 `UserProfileController`，单测覆盖 4 种组合（有 token / 无 token / 演示 header / 未知 header）。

### D7 契约升 0.7.0：扩展摘要 + 新增资料 schema，保留旧字段

- **Context：** `DemoUser` 现在把 `avatar_initial`、`school` 列为 required，注册请求要求 `school`、`interests`；学校改选填后不能继续要求。
- **Decision：**
  - `info.version: 0.7.0`。
  - `DemoUser`：`required` 改为 `[id, nickname, avatar_initial, bio, interests, profile_complete]`；新增可空 `avatar_url`、`city`、`major`、`job`；`school` 保留但可空（不删除，避免既有消费方断档）。`avatar_initial` 继续返回（无头像时的展示契约）。
  - 新增 `UserProfile`（公开字段 + `age` / `zodiac` / `profile_complete`，`birthday` 仅本人）与 `UserProfileUpdateRequest`（必填 6 项 + 选填 6 项，枚举见 §4）。
  - `AuthRegisterRequest`：`required` 收窄为 `[username, password, nickname]`；删除 `avatar_initial` / `school` / `bio` / `interests` 属性。服务端忽略旧字段（Spring Boot 默认关闭未知字段失败）。
  - `Error`：新增可选 `fields: { <field>: <reasonCode> }`，只在资料校验 400 时出现。
  - 新增错误码 `USER_NOT_FOUND`。
  - 同步更新 `OpenApiTest` 的版本与注册必填断言。
- **Rejected：** 直接删除 `school` / `avatar_initial`（会让 `trip-plans` / `trip-experiences` 的既有响应消费方与测试断档）；用错误文案传字段清单（不可断言、无法本地化）；注册请求继续要求 `school`（与 D3/D4 裁决冲突）。
- **Consequence：** 0.7.0 是加法 + 收窄的兼容升级；旧客户端带旧字段仍 201。

### D8 兴趣预设用「规范值 + 展示名」，不动匹配算法

- **Context：** AC 的 10 个兴趣名（自然风景 / 文化历史 / 看展）与行程标签（自然 / 历史 / 展览）不同名；匹配按精确字符串消费。G1 要求别名归一化但不改匹配（lint L-05）。
- **Decision：** 前端 `profileOptions.ts` 的预设项为 `{ value, label }`：`自然风景 → 自然`、`文化历史 → 历史`、`看展 → 展览`、`Citywalk → 城市漫步`（若标签表无对应值则保留原词），其余同名。**存储 `value`**，界面显示 `label`；自定义标签原样存储。匹配代码、行程标签表、理由文案都不改。
- **Rejected：** 后端加别名表改匹配理由（扩大为匹配改造，超出本 change）；只改展示文案不改存储（匹配仍对不上）；把行程标签改成 AC 词表（会改既有行程数据语义）。
- **Consequence：** 新用户兴趣与既有行程标签天然对齐；自定义标签仍可能对不上，属既有行为。用户资料页展示 AC 文案，响应里是规范值（测试同时断言两者）。

### D9 两个路由 + 注册后一次性落点，不做全局强制引导

- **Context：** 现有路由只有 home / create / detail / applications / mine / chat / share。规格要求注册后进入完善页、可跳过、可从「我的」补全；同时既有 E2E 与深链依赖「打开 `#/` 即进入首页」。
- **Decision：**
  - 新增 `#/profile/setup`（完善 / 编辑同一页）与 `#/users/{id}`（个人主页）。
  - 跳转只发生在 `handleAuthenticated(session)`：`session.user.profile_complete === false` → `#/profile/setup`，否则 `#/`。
  - **不在应用启动 / 路由变化时检查完善状态**；跳过按钮直接 `#/`；「我的」常驻资料卡入口。
- **Rejected：** 全局路由守卫强制完善（会破坏既有深链与并行 `auth.spec.ts`）；独立编辑路由（多一个页面，收益为零）；注册后停在首页再弹窗（无法满足「进入完善页」）。
- **Consequence：** 老账号与演示账号不会被拦截；`auth.spec.ts` 直接写 `localStorage` 后打开 `#/` 的行为不受影响。

### D10 发布者入口在卡片内用按钮，不用嵌套链接

- **Context：** `TripCard` 整卡是 `<a href="#/trips/{id}">`，卡内再放 `<a>` 会产生非法嵌套；`TripDetailPage` 的发布者行是 `<div>`；`ExperienceCard` 是 `<article>`。
- **Decision：** `TripCard` 的发布者胶囊改为 `<button type="button">`：`onClick` 先 `preventDefault` / `stopPropagation`，再 `window.location.hash = '#/users/{id}'`；样式重置为无边框透明。`TripDetailPage` 发布者行与 `ExperienceCard` 作者改为普通 `<a href="#/users/{id}">`。
- **Rejected：** 把整卡改成 `div` + 内部链接（键盘语义与既有 E2E 选择器都会变）；只在详情页加入口（规格要求卡片也有）；用 `onClick` + `role="link"`（不如原生按钮可靠）。
- **Consequence：** 卡片点击仍进详情；发布者点击进主页；E2E 断言 URL 是 `#/users/` 而非 `#/trips/`。

### D11 「我的」资料卡 = 唯一补齐入口；身份菜单复用摘要规则

- **Context：** 注册可跳过；`AppShell` 身份面板现在直接渲染 `currentUser.school`，新账号该值为空会出现空行。
- **Decision：** `MyTripsPage` 顶部新增资料卡：头像 + 昵称 + `publisherSummary` 或「资料未完善」提示 + 按钮（未完善「完善资料」/ 已完善「查看主页」+「编辑资料」）。`AppShell` 身份面板用同一 `publisherSummary`，为空时显示「资料未完善」而不是空行。
- **Rejected：** 新增独立「账户设置」页（超出范围）；把入口只放进身份菜单（规格指定「我的」）；在顶栏加第三处入口（重复）。
- **Consequence：** 入口唯一、文案单一来源；`AppShell` 的改动与并行 `add-user-logout` 会话重叠，合并时保留两边的菜单语义。

### D12 字段级错误用 `fields` 映射传稳定原因码

- **Context：** 规格要求「逐项指出缺失的必填字段」，但 `Error` 契约只有 `code`，`ErrorResponse` 只有 `code` 字段，且前端需要把错误放回对应控件。
- **Decision：** `ErrorResponse` 增加可空 `fields: Map<String,String>`；资料校验失败返回 400 `INVALID_INPUT` + `fields`，值为原因码：`REQUIRED` / `TOO_LONG` / `INVALID_DATE` / `OUT_OF_RANGE` / `TOO_FEW` / `TOO_MANY` / `DUPLICATE` / `INVALID_OPTION`。前端 `ApiError` 携带 `code` + `fields`，`profileForm.ts` 把原因码映射为中文文案；汇总提示由同一份 `fields` 生成。
- **Rejected：** 只在 `message` 里拼字段名（契约无 message、不可断言）；每个字段一个错误码（错误码爆炸）；前端重复实现整套校验作为唯一防线（服务端仍必须校验）。
- **Consequence：** 前端与后端各有一份校验，但共享原因码与字段名；API 测试直接断言 `fields` 的键集合。

## 2. 数据模型与迁移

### 2.1 新列（`V10__add_user_profile.sql`）

| 列 | 类型 | 可空 | 取值 / 约束 | 说明 |
|---|---|---|---|---|
| `avatar_url` | `VARCHAR(200)` | 是 | `/api/users/{id}/avatar?v=xxxxxxxx` | 无头像为 NULL |
| `birthday` | `VARCHAR(10)` | 是 | `YYYY-MM-DD`，1900-01-01 ≤ d ≤ 今天 | 仅本人响应返回 |
| `gender` | `VARCHAR(8)` | 是 | 男 / 女 / 其他 | 必填（业务层） |
| `city` | `VARCHAR(40)` | 是 | 1–40 字 | 必填（业务层） |
| `major` | `VARCHAR(80)` | 是 | 0–80 字 | 选填 |
| `job` | `VARCHAR(20)` | 是 | 预设值（学生 / 上班族 / 自由职业 / 其他）或「其他」的自填文本，1–20 字 | 选填 |
| `mbti` | `VARCHAR(4)` | 是 | 16 型之一 | 选填 |
| `travel_style` | `VARCHAR(12)` | 是 | 特种兵 / 休闲游 / 深度游 / 随性游 | 必填（业务层） |

`school`、`bio`、`interests` 继续使用既有列（V3 定义为 NOT NULL）：注册写入 `""` / `[]`，资料保存写入实际值。

### 2.2 派生规则

| 派生值 | 规则 | 位置 |
|---|---|---|
| `age` | `Period.between(birthday, LocalDate.now(clock)).getYears()` | `ProfileRules.age` |
| `zodiac` | 12 段表：摩羯 12-22→01-19、水瓶 01-20→02-18、双鱼 02-19→03-20、白羊 03-21→04-19、金牛 04-20→05-20、双子 05-21→06-21、巨蟹 06-22→07-22、狮子 07-23→08-22、处女 08-23→09-22、天秤 09-23→10-23、天蝎 10-24→11-22、射手 11-23→12-21 | `ProfileRules.zodiac` |
| `profile_complete` | §1 D3 的六项同时成立；NULL / 空串 / 空白 / 非法日期都算缺失 | `ProfileRules.complete` |
| 发布者摘要 | `school` 非空 → `school + (major 非空 ? " · " + major : "")`；否则 `job`；否则 `city`；否则空串 | 前端 `profileDisplay.publisherSummary`（展示）+ 后端资料响应提供字段 |

### 2.3 迁移与旧数据

- 8 条 `ALTER TABLE` 逐列添加，SQLite 支持；不建索引、不改既有行。
- 演示账号（1–3）新列为 NULL → `profile_complete=false`，`school` 保留旧文案「研一 · 地理科学」；只读。
- 迁移前注册账号同样为未完善；「我的」会显示「完善资料」入口。
- 不迁移、不改写演示数据的 `school` 文案。

## 3. 接口契约（0.7.0）

### 3.1 端点

| 方法 / 路径 | 鉴权 | 请求 | 成功 | 失败 |
|---|---|---|---|---|
| `GET /api/users/{userId}/profile` | `X-User-Id` | — | 200 `UserProfile` | 401 `DEMO_USER_REQUIRED`；404 `USER_NOT_FOUND` |
| `PUT /api/users/me/profile` | Bearer | `UserProfileUpdateRequest` | 200 `UserProfile`（含 `birthday`） | 400 `INVALID_INPUT` + `fields`；401 `SESSION_INVALID`；403 `FORBIDDEN` |
| `POST /api/users/me/avatar` | Bearer | `multipart/form-data`，字段 `file` | 200 `UserProfile`（含新 `avatar_url`） | 400 `INVALID_INPUT`；401；403 |
| `GET /api/users/{userId}/avatar` | 无（图片 `<img>`） | — | 200 `image/jpeg|png|webp` | 404 |

### 3.2 `UserProfile`

| 字段 | 类型 | 可空 | 说明 |
|---|---|---|---|
| `id` | int64 | 否 | |
| `nickname` | string | 否 | 唯一来源 `app_users.nickname` |
| `avatar_initial` | string | 否 | 回退字符，昵称首字 |
| `avatar_url` | string | 是 | 无头像时省略 |
| `birthday` | string | 是 | **仅本人**响应出现 |
| `age` | int | 是 | 无生日时省略 |
| `zodiac` | string | 是 | 无生日时省略 |
| `gender` | string | 是 | 未填时省略 |
| `city` | string | 是 | |
| `school` | string | 是 | 未填时省略 / 空串 |
| `major` | string | 是 | |
| `job` | string | 是 | |
| `mbti` | string | 是 | |
| `interests` | string[] | 否 | 0–5 |
| `travel_style` | string | 是 | |
| `bio` | string | 是 | |
| `profile_complete` | boolean | 否 | 派生 |

### 3.3 `UserProfileUpdateRequest`

| 字段 | 必填 | 规则 |
|---|---|---|
| `nickname` | 是 | trim 后 1–20 |
| `birthday` | 是 | `YYYY-MM-DD`，合法日期，1900-01-01 ≤ d ≤ 今天 |
| `gender` | 是 | `男` / `女` / `其他` |
| `city` | 是 | trim 后 1–40 |
| `interests` | 是 | 3–5 个；每个 trim 后 1–12；去重 |
| `travel_style` | 是 | `特种兵` / `休闲游` / `深度游` / `随性游` |
| `school` | 否 | ≤80 |
| `major` | 否 | ≤80 |
| `job` | 否 | trim 后 ≤20；预设值或「其他」的自填文本 | `TOO_LONG` |
| `mbti` | 否 | 16 型之一 |
| `bio` | 否 | ≤500 |

枚举与长度常量放后端 `ProfileConstant`（与 `AuthConstant` 并列），契约同值；前端 `profileOptions.ts` 同值。三者不一致视为契约缺陷。

### 3.4 `DemoUser` 摘要变化

- `required`：`id`、`nickname`、`avatar_initial`、`bio`、`interests`、`profile_complete`。
- 新增可空：`avatar_url`、`city`、`major`、`job`；`school` 保留但不再 required。
- 影响面：`GET /api/users`、`GET /api/users/demo`、行程 `publisher`、体验 `author`、`AuthSession.user`、`GET /api/auth/me`。全部由 `UserEntity.toDemoUser()` / `DemoUserResponse` 统一输出。

## 4. 校验矩阵

| 字段 | 必填 | 校验 | 失败原因码 |
|---|---|---|---|
| 昵称 | 是 | trim 1–20 | `REQUIRED` / `TOO_LONG` |
| 生日 | 是 | 格式 + 合法日期 + 范围 | `REQUIRED` / `INVALID_DATE` / `OUT_OF_RANGE` |
| 性别 | 是 | 枚举 | `REQUIRED` / `INVALID_OPTION` |
| 城市 | 是 | trim 1–40 | `REQUIRED` / `TOO_LONG` |
| 兴趣 | 是 | 数量 3–5；每项 1–12；去重 | `TOO_FEW` / `TOO_MANY` / `TOO_LONG` / `DUPLICATE` |
| 旅行方式 | 是 | 枚举 | `REQUIRED` / `INVALID_OPTION` |
| 学校 / 专业 | 否 | ≤80 | `TOO_LONG` |
| 职业 | 否 | trim 后 ≤20；预设值或「其他」自填文本 | `TOO_LONG` |
| MBTI | 否 | 16 型 | `INVALID_OPTION` |
| 简介 | 否 | ≤500 | `TOO_LONG` |

前端提交前先跑同一矩阵：有错则不调用 `PUT`，逐字段标错 + 汇总「还有 N 项未完成：a、b、c」。后端独立校验，不信任前端。

## 5. 头像处理

| 项 | 规则 |
|---|---|
| 类型 | 魔数判定 JPEG（`FF D8 FF`）/ PNG（`89 50 4E 47`）/ WebP（`RIFF....WEBP`）；与声明 `Content-Type` 不符时以魔数为准 |
| 大小 | `> 0` 且 `≤ 2 * 1024 * 1024`；Spring multipart 上限同步设为 2 MB |
| 文件名 | `{userId}-{SecureRandom 8 bytes hex}.{ext}`；不使用原始文件名 |
| 存储 | `routeme.profile.avatar-dir`（缺省 `../SqlLite/uploads/avatars`），启动时创建 |
| 地址 | `/api/users/{id}/avatar?v={8 hex}`；端点忽略 `v`，返回当前文件 |
| 替换 | 写新文件 → 更新 `avatar_url` → 删除旧文件（失败仅告警） |
| 回退 | `avatar_url` 为空时前端 `Avatar` 渲染 `avatar_initial`，任何展示位不留空框 |

## 6. 权限与安全

| 场景 | 行为 |
|---|---|
| 未进入（无 `X-User-Id`、无 token） | `GET profile` 401 `DEMO_USER_REQUIRED`；`PUT` / 上传 401 `SESSION_INVALID` |
| 已进入的注册用户读他人 | 200；无 `birthday`；`profile_complete` 可见 |
| 已进入的注册用户读自己 | 200；含 `birthday` |
| 本人保存 / 上传 | 200；只改自己 |
| 演示身份保存 / 上传 | 403 `FORBIDDEN`；界面无入口 |
| 目标用户不存在 | 404 `USER_NOT_FOUND` |
| 头像读取 | 无鉴权（`<img>` 无法带 header），只暴露图片字节 |
| 日志 | 不打印生日、token、文件内容；上传失败记录大小 / 魔数结果 / 用户 id |

## 7. 交互与展示契约

### 7.1 完善 / 编辑页（`#/profile/setup`）

```text
main.profile-page.profile-setup
  h2  完善个人资料 | 编辑资料
  Alert[role="alert"]        还有 N 项未完成：生日、性别、所在城市…（仅提交后出现）
  form[aria-label="个人资料"]
    section.profile-avatar   Avatar / img[alt="当前头像"]
                             button 上传头像 | 更换头像（选填，JPEG/PNG/WebP ≤2MB）
    field 昵称               Input[maxlength=20] *            aria-describedby
    field 生日               input[type=date][min=1900-01-01][max=今天] *
    field 性别               Radio.Group 男 / 女 / 其他 *
    field 所在城市           AutoComplete（CITY_NAMES，可自由输入）*
    field 学校               Input[maxlength=80]
    field 专业               Input[maxlength=80]
    field 职业               Select 学生 / 上班族 / 自由职业 / 其他（可清空）
    field MBTI               Select 16 型（可清空）
    field 旅行兴趣           InterestPicker *（计数 n/5；预设 10+；可自定义；取消保留）
    field 旅行方式           Radio.Group 特种兵 / 休闲游 / 深度游 / 随性游 *
    field 个人简介           TextArea[maxlength=500]
  footer                     button 保存资料（primary, loading）
                             button 跳过（首次完善）| a 取消（编辑）
```

### 7.2 个人主页（`#/users/{id}`）

```text
main.profile-page.profile-public
  header.profile-hero
    Avatar[lg]                有 avatar_url 用图片，否则首字
    h2                        昵称
    p                         25 岁 · 双子座（有生日时）
    p                         城市（已填时）
  Alert[type=info]            该用户尚未完善资料（profile_complete=false）
  actions                     本人 & 已登录：a 编辑资料 → #/profile/setup
  dl.profile-facts            学校与专业（「学校 · 专业」）| 职业 | MBTI | 旅行方式
  section.profile-interests   兴趣标签
  section.profile-bio         个人简介
  p.profile-empty             除昵称外无内容时：该用户还没有填写更多资料
```

### 7.3 入口

| 位置 | 元素 | 目标 |
|---|---|---|
| 注册成功（未完善） | 自动跳转 | `#/profile/setup` |
| 「我的」资料卡 | 未完善 →「完善资料」；已完善 →「查看主页」+「编辑资料」 | `#/profile/setup` / `#/users/{me}` |
| 行程卡发布者 | `button.tc-host`（阻止整卡跳转） | `#/users/{publisherId}` |
| 行程详情发布者行 | `a.publisher-row` | `#/users/{publisherId}` |
| 体验卡作者 | `a.exp-author` | `#/users/{authorId}` |
| 顶栏身份菜单 | 摘要行（`publisherSummary` 或「资料未完善」） | 不新增跳转（保持菜单语义） |

## 8. 文件与改动面

```text
backend/src/main/resources/db/migration/V10__add_user_profile.sql   新增：8 列
backend/src/main/resources/application.yaml                          multipart 2MB；avatar-dir
backend/src/main/java/routeme/constant/ProfileConstant.java          新增：枚举 / 长度
backend/src/main/java/routeme/model/ProfileRules.java                新增：年龄 / 星座 / 完善 / 摘要
backend/src/main/java/routeme/entity/UserEntity.java                 8 个字段 + toDemoUser/toUserAccount
backend/src/main/java/routeme/pojo/DemoUser.java                     +avatarUrl/profileComplete/city/major/job
backend/src/main/java/routeme/pojo/UserAccount.java                  record 构造同步
backend/src/main/java/routeme/pojo/UserProfile.java                  新增
backend/src/main/java/routeme/request/UserProfileUpdateRequest.java  新增
backend/src/main/java/routeme/request/AuthRegisterRequest.java       收窄为三字段
backend/src/main/java/routeme/response/DemoUserResponse.java         新字段
backend/src/main/java/routeme/response/UserProfileResponse.java      新增
backend/src/main/java/routeme/response/ErrorResponse.java            +fields
backend/src/main/java/routeme/controller/UserProfileController.java  新增：读 / 存 / 头像
backend/src/main/java/routeme/service/UserProfileService.java        新增
backend/src/main/java/routeme/service/impl/UserProfileServiceImpl.java 新增
backend/src/main/java/routeme/service/DemoUserService.java           createAccount 收窄
backend/src/main/java/routeme/service/impl/DemoUserServiceImpl.java  createAccount 收窄
backend/src/main/java/routeme/service/impl/AuthServiceImpl.java      注册瘦身
backend/src/main/java/routeme/handler/GlobalExceptionHandler.java    fields；上传超限 → 400
backend/src/main/java/routeme/exception/UserNotFoundException.java   新增
openapi.yaml                                                         0.7.0

frontend/src/types.ts                       UserProfile / DemoUser 扩展 / 注册收窄
frontend/src/api.ts                         loadUserProfile / saveMyProfile / uploadAvatar；ApiError
frontend/src/route.ts                       profileSetup / userProfile
frontend/src/App.tsx                        路由渲染；注册后一次性跳转
frontend/src/identity/AuthPanel.tsx         只留用户名 / 密码 / 昵称
frontend/src/identity/authForm.ts           移除学校 / 兴趣 / 简介
frontend/src/profile/ProfileSetupPage.tsx   新增
frontend/src/profile/ProfilePage.tsx        新增
frontend/src/profile/profileForm.ts         新增：校验 / 原因码 / 选项
frontend/src/profile/profileDisplay.ts      新增：拼接 / 摘要 / 回退
frontend/src/profile/InterestPicker.tsx     新增：从 AuthPanel 抽出的选择器
frontend/src/mine/MyTripsPage.tsx           资料卡入口
frontend/src/trips/TripCard.tsx             发布者按钮入口
frontend/src/trips/TripDetailPage.tsx       发布者链接 + 摘要
frontend/src/experiences/ExperienceCard.tsx 作者链接
frontend/src/shell/AppShell.tsx             身份面板摘要回退
frontend/src/shell/Avatar.tsx               有 avatar_url 时渲染图片
frontend/src/i18n/tripMessages.ts           新增文案键
frontend/src/styles.css                     完善页 / 主页 / 头像 / 错误态
```

**不改：** `openspec/specs/**`（归档时合并）、行程 / 申请 / 聊天 / 体验业务逻辑、匹配算法、`DemoUserService.require` 语义。

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 契约 0.6.0 → 0.7.0 打破 `OpenApiTest` 对 `school` / `interests` 的断言 | T2 同一提交更新版本与注册必填断言；新增资料 schema 断言 |
| Spring multipart 默认 1 MB 小于业务 2 MB | `application.yaml` 同步设 2 MB / 3 MB，并在 `GlobalExceptionHandler` 处理超限 → 400 |
| 旧账号 / 演示账号新列为 NULL，误判为已完善 | `ProfileRules.complete` 把 NULL / 空串 / 空白都算缺失；迁移测试覆盖演示账号 |
| 注册后跳转若做全局守卫，会破坏深链与并行 `auth.spec.ts` | 只在 `handleAuthenticated` 跳一次；其余路由不检查 |
| 卡片内发布者链接导致非法嵌套 `<a>` / 整卡跳转 | 用 `button` + `stopPropagation`；E2E 断言落在 `#/users/` |
| `TripCard` / `AppShell` / `styles.css` / `auth.spec.ts` 正被并行会话修改 | 只改本 change 需要的行；合并时保留并行内容；不回退他人未提交文件 |
| 头像替换留下孤儿文件 | 先写新文件后删旧文件；删除失败记日志；不阻塞请求 |
| 兴趣「规范值 vs 展示名」造成响应与界面不一致 | 响应存规范值、界面显示 label；单测同时断言两处；契约注释说明 |
| 服务端与前端枚举漂移 | 枚举常量三处同源（契约 / `ProfileConstant` / `profileOptions.ts`）；契约测试断言枚举 |
| 头像读取无鉴权 | 只暴露图片字节；不返回资料字段；文件名不可猜（随机段） |
| 保存部分写入 | 单事务内校验后一次更新；生日非法在写库前拒绝（API 测试先读后写比对） |

## 10. 验证方式

| 检查 | 命令 / 方式 |
|---|---|
| 契约 | `cd RouteME/backend; .\mvnw.cmd -B test -Dtest=OpenApiTest` |
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B test` |
| 前端构建 | `cd RouteME/frontend; npm run build` |
| 前端单测 | `cd RouteME/frontend; npm test` |
| E2E | 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/profile.spec.ts` |
| 迁移 | 用全新数据库启动一次，确认 V10 成功且演示账号可读；再对旧库启动确认未回填 |
| 手工 | 390 / 768 / 1440；浅色 / 深色；键盘走查；注册 → 完善 → 主页 → 他人查看；跳过 → 「我的」补全 |