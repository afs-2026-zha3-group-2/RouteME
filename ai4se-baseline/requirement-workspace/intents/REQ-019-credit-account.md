# Intent capture — 信用分账户与等级展示（信用系统迭代 1 / Story 1）

- **捕获日期：** 2026-11-17
- **来源：** 用户当次会话提供的 P0 用户故事「信用分账户与等级展示」（迭代：信用系统迭代 1；故事点 2；落点页面：用户个人主页 / 管理后台用户详情页）
- **候选编号：** REQ-019（P1 起草时原为 REQ-018；合并 `origin/main` 后发现该号已被 `add-experience-photos`（游后体验图片上传）占用，按项目「后到者顺延」惯例顺延为 **REQ-019**）
- **能力 / change 候选：** `user-credit`（ADDED）/ `add-credit-account`
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话要点）

> 我打算做这个信用分功能，先做这个信用分账户与等级展示，我们进入 p1。

故事原文：作为平台用户，我希望查看自己的信用分和信用等级，以便了解自己当前在 RouteMe 平台的信用状态。

### 信用分规则（用户原文）

1. 新注册用户初始信用分为 80 分。
2. 信用分最低为 0 分，最高为 100 分。
3. 信用分发生变化后实时重新计算信用等级。
4. 每次信用分变化必须生成信用记录。
5. 信用记录包含：变更原因、变更分值、变更前分数、变更后分数、操作时间和关联业务。
6. 用户不能自行修改信用分。

### 信用等级（用户原文）

| 信用分 | 信用等级 |
|---|---|
| 90–100 | 信用优秀 |
| 80–89 | 信用良好 |
| 60–79 | 信用一般 |
| 30–59 | 信用较低 |
| 0–29 | 信用风险 |

信用等级必须同时显示具体分数和等级文字，不能仅使用颜色表示。

### 验收标准（用户原文）

1. 新用户注册成功后信用分初始化为 80。
2. 用户个人主页展示「信用分：XX / 100」和信用等级。
3. 管理后台用户列表及用户详情展示当前信用分。
4. 管理后台支持按信用分排序和信用等级筛选。
5. 信用分不得超过 100 或低于 0。
6. 信用分变化后用户端和管理端保持一致。

### 场景（前置 / 操作 / 预期）

前置：用户刚完成注册 → 操作：进入个人主页 → 预期：系统展示「信用分：80 / 100 · 信用良好」。

### 垂直切片口径（用户原文）

用户创建 → 初始化信用账户 → 展示信用状态。

## 证据锚点（现状核对，2026-11-17 / main@cf3ed76）

| 证据 | 路径 | 说明 |
|---|---|---|
| 空白基线 | 全仓 grep `信用分 / 信誉分 / credit_score / reputation` | **0 命中**：代码、契约、迁移、Living Spec、知识库均无信用/信誉分实现 |
| 用户表 | `RouteME/backend/src/main/resources/db/migration/V3__create_demo_users.sql`、`V10__add_user_profile.sql` | `app_users` 只有昵称 / 首字头像 / 学校 / 简介 / 兴趣 + 资料八列；**无分数列、无角色列** |
| 注册链路 | `RouteME/backend/src/main/java/routeme/service/impl/AuthServiceImpl.java`（`register`） | 注册 = 校验用户名/密码/昵称 → `DemoUserService.createAccount` → 发会话；单事务，可插入信用账户初始化 |
| 账号创建 | `RouteME/backend/src/main/java/routeme/service/DemoUserService.java` | 账号写入的唯一入口，注册与演示账号共用 |
| 个人主页接口 | `RouteME/backend/src/main/java/routeme/controller/UserProfileController.java`、`service/impl/UserProfileServiceImpl.java`、`response/UserProfileResponse.java` | `GET /api/users/{userId}/profile`；响应含 `joinedAt` + `stats`；本人/他人差异只有生日 |
| 个人主页页面 | `RouteME/frontend/src/profile/ProfilePage.tsx` | `#/users/{id}`；hero（头像 / 昵称 / 完善徽标 / 年龄星座 / 城市 / chips）+ 资料卡；单次 `loadUserProfile` |
| 前端契约类型 | `RouteME/frontend/src/types.ts`（`UserProfile`）、`RouteME/frontend/src/api.ts`（`loadUserProfile`） | 需要同步新增只读字段 |
| 文案 | `RouteME/frontend/src/i18n/tripMessages.ts`（`profile*` 段） | 新增等级 / 分数文案的落点 |
| 既有账号 | `V3__create_demo_users.sql`、`V12__seed_viewer_profile_user.sql`、`V13__seed_demo_user_profiles.sql`、`V14__seed_demo_account_credentials.sql`、`V15__seed_viewer_account_credentials.sql` | 现有 4 个演示用户（id 1–3 + id 4 周野）+ 已注册账号，均需回填信用账户 |
| 管理端 | 全仓 grep `admin / 管理后台` | **0 命中**：无角色列、无后台端点、无后台页面 |
| 契约版本 | `RouteME/openapi.yaml` `info.version` | 0.11.0；`UserProfile` schema 在 `components.schemas` |
| 迁移头 | `RouteME/backend/src/main/resources/db/migration` | main 上最新为 `V17__meeting_areas.sql`；在途 `refine-trip-map`（REQ-016）声明 V17、`add-ai-itinerary`（REQ-017）声明 V18 |
| 原型 | `docs/prototype/stories.html`（「实名认证、复杂信用体系、举报后台处置」列为 MVP 之外）、`docs/prototype/discovery-cn.html`（「信誉体系、徽章与创作者工具」列为后续） | 本需求是 MVP 之后新增的信用系统迭代 1，原型无对应页面骨架 |
| 相关 Living Spec | `openspec/specs/user-auth/spec.md`「注册账号」 | 现行注册需求不含信用分；是否同步 MODIFIED 见 OQ-6 |
| 未归档相关 change | `openspec/changes/add-user-profile/`（`user-profile` ADDED）、`openspec/changes/add-user-profiles/`（`user-profiles` ADDED） | 个人主页响应由这两条未归档 change 拥有，本需求在其上继续加字段 |

## 现状差距（P1 需收敛）

1. **完全没有信用数据底座**：无账户表、无流水表、无派生等级、无初始值来源。
2. **个人主页无信用展示**：`ProfilePage` 只有身份与资料，无「信用分：XX / 100 · 信用良好」。
3. **注册链路不建账户**：注册只建账号与会话，AC1 无处落。
4. **历史账号无信用分**：4 个演示用户与既有注册账号读取主页会出现「无分数」的空洞。
5. **「用户不能自行修改」无结构性保障**：现有资料保存接口是唯一写入口，必须明确信用分不属于用户可写字段。
6. **「每次变化必生成记录」无承载**：没有账本，也没有记账服务；本切片虽无业务事件，但越界裁断与快照约束需要有落点。
7. **管理端三条 AC 无落点**：全仓没有管理员角色、后台接口或后台页面（见 D2 裁决与 Out of scope）。

## 本次明确排除

- 管理后台：用户列表 / 用户详情 / 按分排序 / 按等级筛选（见 D2，另开故事）。
- 任何产生分变的业务事件：发布体验获赞加分、出发前退出扣分、旅行中退出扣分、举报核实扣分、月度上限、自动封禁与安全学习。
- 信用分规则说明页、分数变化历史页、申诉入口、通知与推送。
- 他人主页之外的展示触点（行程卡、资料弹窗、申请列表、我的旅行资料卡）。
- 编辑 / 回滚 / 后台手工改分；任何面向客户端的写分接口。
- 等级色板、徽章图案与视觉重做（沿用 design-system 既有令牌）。

## Discovery Decision

**Go（light intake）。** 一句话可表述：「给每个账号建一份信用账户（初始 80、区间 0–100），在个人主页按五档等级展示『信用分：XX / 100 · 等级文字』，并把『不可越界 / 不可自改 / 每次变化留痕』落成结构性约束」。

- 能力归属：新增 `user-credit`（ADDED）；个人主页响应只做只读字段扩展，展示口径写在 `user-credit`。
- 现有资产：`user-credit` 全新；`user-profile` / `user-profiles` 为未归档依赖（只读引用 + 字段扩展）。
- 管理端：代码零基础，按 D2 推迟，AC3–AC4 与 AC6 的管理端一半在规格中标注推迟。

## 用户裁决（2026-11-17）

| 编号 | 议题 | 裁决 |
|---|---|---|
| D1 | 分数区间与等级冲突 | **以本次故事为准**：0–100；90–100 信用优秀 / 80–89 信用良好 / 60–79 信用一般 / 30–59 信用较低 / 0–29 信用风险。历史会话中的「信誉分 0–120、六档、低于 60 自动封禁」方案作废，本需求不引入自动封禁。 |
| D2 | 管理端范围 | **本轮只做用户端**：交付「注册初始化账户 + 个人主页展示 + 后端账户底座」；管理端列表 / 详情 / 排序 / 筛选整体另开故事，AC 在规格中标注推迟。 |
| D3 | 数据模型 | **账户表 + 账本表**：`user_credit_account`（当前分数，唯一真相）+ `credit_ledger`（流水，含前 / 后分数快照）。 |
| D4 | 展示可见性 | **本人与他人主页都显示分数与等级**（与故事字面一致，为后续同行信任展示打底）；**加分扣分明细不对外展示**。 |
| D5 | 历史回填 | **统一回填 80**：现有 4 个演示用户与已注册账号全部 80，等级均为「信用良好」。 |
| D6 | 记账通道 | **本故事落地记账服务**：0–100 裁断、前后快照、账本原子写入、幂等键字段预留，配单测；暂无业务事件调用。 |
| D7 | 接口归属 | **扩展个人主页响应**：`GET /api/users/{userId}/profile` 增加只读信用字段，页面零额外往返。 |
| D8 | 命名口径 | change = `add-credit-account`；capability = `user-credit`；表 = `user_credit_account` / `credit_ledger`。 |
| D9 | `user-auth` 归属（P2 前补裁） | **不改 `user-auth`**：「注册成功后初始化信用账户」写在 `user-credit`，保持单 capability，归档无需双 capability 例外追认。 |
| D10 | 等级契约取值（P2 前补裁） | **英文码 + 前端映射**：接口返回 `excellent` / `good` / `fair` / `low` / `risk`，展示文案由前端 i18n 映射为「信用优秀 … 信用风险」；阈值只在服务端一处实现。 |
| D11 | 零变化留痕（P2 前补裁） | **留一条零值记录**：变化被边界完全裁断（实际生效 0）时仍写 `applied_delta = 0` 的记录，保留事件痕迹与幂等键，分数不变。 |
