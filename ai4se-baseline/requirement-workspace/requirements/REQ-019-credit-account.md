# REQ-019 — 信用分账户与等级展示（Ready 需求草稿）

- **能力：** `user-credit`（ADDED）；依赖 `user-profile`（未归档，只读字段扩展）
- **对应 OpenSpec change：** `add-credit-account`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** 用户当次会话 `[P0] 信用分账户与等级展示`（信用系统迭代 1，故事点 2，落点页面「用户个人主页 / 管理后台用户详情页」）
- **证据：** `requirement-workspace/intents/REQ-019-credit-account.md`；`openspec/specs/user-auth/spec.md`「注册账号」；`openspec/changes/add-user-profile/specs/user-profile/spec.md`；`RouteME/backend/src/main/java/routeme/service/impl/AuthServiceImpl.java`；`RouteME/backend/src/main/java/routeme/response/UserProfileResponse.java`；`RouteME/frontend/src/profile/ProfilePage.tsx`

## Discovery Decision

**Go（light intake，2026-11-17）。** 能力边界单一：新增 `user-credit` 拥有信用账户、等级派生、账本与记账服务；个人主页只做只读字段扩展。管理端代码零基础，按 D2 推迟到另开故事；本需求的 Out of scope 显式列出推迟的 AC。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-019 |
| statement | 系统 SHALL 为每个账号建立唯一信用账户：新注册账号初始 80 分，既有账号回填 80 分；信用分 MUST 落在 0–100 闭区间；系统 SHALL 由分数实时派生五档信用等级，并在个人主页（本人与他人同一口径）同时展示「信用分：XX / 100」与等级文字；用户 MUST NOT 能通过任何客户端入口修改信用分；每次分数变化 MUST 在同一事务内写入一条信用记录（原因 / 实际变更分值 / 变更前 / 变更后 / 时间 / 关联业务），且「变更前 + 实际变更分值 = 变更后」。 |
| actors | 平台用户（本人，读自己的信用状态）；浏览者 / 其他已登录用户（读他人公开信用状态）；系统内部事件（分数变化的唯一驱动方，本切片无业务事件）。 |
| rationale | 平台希望用可解释的信用分承载「同行信任」，但当前完全没有信用数据底座：新账号没有初始分、老账号没有回填、个人主页没有展示、也没有任何「不可越界 / 不可自改 / 变化留痕」的结构性保障。没有账户与账本，后续加分（体验获赞）与扣分（退出、举报核实）都无处落。 |
| acceptance hints | 见 §4 场景 C-1 ~ C-21（注册初始化、历史回填、账户唯一、五档边界、分数与等级同时展示、本人 / 他人可见、明细不可见、资料未完善仍展示、不可自改、多入口一致、变化留痕、越界裁断、等级实时重算、零变化留痕、任意用户不出现缺失值、用户不存在沿用既有错误、弹窗 / 详情发布者 / 行程卡 / 申请者行展示）。 |
| links to evidence | 见 §6 Context 与 `intents/REQ-019-credit-account.md` 的证据锚点表。 |

## 1. Intent

一句话：给每个账号配一份「像账本一样可信」的信用状态——注册即有 80 分，老账号统一补齐；个人主页把「信用分：80 / 100 · 信用良好」写清楚（分数 + 文字，不只靠颜色），谁来看都一致；分数只能在 0–100 之间，只能由系统事件改动，每一次改动都留一条可回算的记录。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 平台用户（本人） | 可读自己的信用分与等级；**不可**写、不可改、不可回滚；不可见自己的加扣分明细（本切片无明细页）。 |
| 浏览者 / 其他已登录用户 | 可在该用户个人主页读其信用分与等级（D4）；不可见其加扣分明细、不可见账本与原因。 |
| 未登录访客 | 不进入个人主页业务读路径（沿用壳层登录门）；无信用分读取能力。 |
| 系统内部事件（后续故事） | 未来唯一可驱动分数变化的一方；本切片只交付记账服务，**不接入任何业务事件**。 |
| 管理员 | 本切片**不存在**管理员角色、后台端点与后台页面（D2）。 |

## 3. In / Out scope

**In scope**

- 数据底座：`user_credit_account`（每用户一条，当前分数为唯一真相）+ `credit_ledger`（每次变化一条，append-only，含前 / 后快照）。
- 初始化：注册成功后在同一事务内建立信用账户并置 80；既有账号（4 个演示用户 + 已注册账号）由迁移统一回填 80。
- 等级派生：按 D1 五档由分数在读取时实时派生，不落库为独立状态。
- 展示：个人主页（`#/users/{id}`）对本人与他人同一口径展示「信用分：XX / 100 · 等级文字」；页面 MUST 同时输出分数与文字。
- **展示面扩展（2026-11-17 发起人追加）：** 除个人主页外，以下四个展示面同样展示同口径信用状态：资料弹窗（`ProfileModal`）、行程详情页发布者行、灵感首页行程卡发布者行、申请处理页申请者行；列表类展示面 MUST 一次批量取数。
- 只读保障：不存在任何面向客户端的写分入口；资料保存接口 MUST 忽略 / 不接受信用分字段。
- 记账服务：内部能力，负责 0–100 裁断、前 / 后快照、账本与账户同事务写入、幂等键预留，并配单元测试；本切片无业务事件调用方。
- 契约：`GET /api/users/{userId}/profile` 响应新增只读信用字段（字段名与形态由 P2 契约定稿）；`openapi.yaml` 升次版本。
- 迁移：新增一张账户表与一张流水表 + 一次回填；`app_users` 不加分数字段（D3）。

**Out of scope**

- **管理端全部内容（D2 推迟）：** 管理后台用户列表、用户详情、按信用分排序、按信用等级筛选、管理员身份与权限模型；对应 AC3 / AC4，以及 AC6「管理端一致」的后半句。
- 任何产生分变的业务事件：体验获赞阶梯加分、加分月度上限、出发前退出扣分阶梯、旅行中退出扣分、举报核实扣分、自动封禁（< 60）、安全学习恢复。
- 分数调整 / 回滚 / 后台手工改分 / 申诉通道。
- 信用分规则说明页、分数变化历史页（明细对用户不可见）。
- 我的旅行资料卡与顶栏的信用展示（本次不覆盖）；聊天页等其他未列出界面同样保持不展示。
- 通知 / 推送 / 邮件；等级色板与徽章视觉重做（沿用 `design-system` 令牌）。
- 分数精度、四舍五入规则（本切片只有整数分）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 账户创建与初始化

1. **C-1 注册即得初始分** — Given 访客用未被占用的用户名注册成功，When 打开自己的个人主页，Then 页面 SHALL 展示「信用分：80 / 100 · 信用良好」。
2. **C-2 注册事务内建账户** — Given 注册请求成功返回会话，When 立即读取该用户信用，Then 系统 SHALL 已存在该用户的信用账户且分数为 80；注册失败（用户名重复 / 格式非法 / 密码非法）时 MUST NOT 留下信用账户。
3. **C-3 历史账号回填** — Given 账号在本次变更上线前已存在（含 4 个演示用户与既有注册账号），When 读取其个人主页，Then 系统 SHALL 展示 80 分与「信用良好」，MUST NOT 出现空值、0 分或错误页。
4. **C-4 账户唯一且幂等** — Given 用户已拥有信用账户，When 用户重复登录、刷新主页或再次读取资料，Then 该用户 SHALL 仍只有一条信用账户记录，分数 MUST NOT 因读取而改变。

### B. 等级派生与展示口径

5. **C-5 五档边界** — 给定分数为 100 / 90 / 89 / 80 / 79 / 60 / 59 / 30 / 29 / 0 时，When 读取个人主页，Then 等级 SHALL 依次为「信用优秀 / 信用优秀 / 信用良好 / 信用良好 / 信用一般 / 信用一般 / 信用较低 / 信用较低 / 信用风险 / 信用风险」（区间含上界、含下界，无空档）。
6. **C-6 分数与等级同时展示** — Given 用户信用分为 80，When 打开个人主页，Then 页面 SHALL 同时输出具体分数「80 / 100」与等级文字「信用良好」；MUST NOT 只用颜色、图标或纯数值表达等级。
7. **C-7 本人可见** — Given 用户已登录并打开自己的个人主页，Then SHALL 看到自己的信用分与等级。
8. **C-8 他人可见、明细不可见** — Given 浏览者打开某用户的个人主页，Then SHALL 看到该用户的信用分与等级（与本人口径一致）；页面 MUST NOT 展示任何加 / 扣分明细、原因、时间或历史记录，也 MUST NOT 提供查看入口。
9. **C-9 资料未完善仍展示** — Given 用户尚未完成资料（`profile_complete = false`），When 打开其个人主页，Then 信用分与等级 SHALL 照常展示，MUST NOT 因资料不完整而隐藏或报错。

### C. 只读与一致性

10. **C-10 用户不能自行修改** — Given 用户已登录，When 用户调用任何面向客户端的接口并尝试携带信用分字段（如保存资料请求里附加分数），Then 系统 SHALL 忽略该字段且分数不变；系统 MUST NOT 提供任何可由客户端调用的写分端点。
11. **C-11 多入口一致** — Given 同一次会话中，When 用户先后通过个人主页、重新进入个人主页、他人视角访问同一用户主页读取信用状态，Then 分数与等级 SHALL 完全一致（同一数据源、无缓存分叉）。

### D. 变化、留痕与边界

12. **C-12 变化必留痕且可回算** — Given 某用户当前 80 分，When 系统内部事件将分数改为 75，Then 系统 SHALL 在同一事务内写入一条信用记录，包含变更原因、实际变更分值（-5）、变更前分数（80）、变更后分数（75）、操作时间与关联业务标识；记录 MUST 满足「变更前 + 实际变更分值 = 变更后」。
13. **C-13 越界裁断取实际值** — Given 用户当前 98 分，When 一次 +5 的变化被提交，Then 分数 SHALL 停在 100，信用记录中的变更前 SHALL 为 98、变更后 SHALL 为 100、实际变更分值 SHALL 为 +2（记录实际生效量，不是理论值）；对称地，当前 3 分遇 -10 MUST 停在 0 并记录 -3。
14. **C-14 等级随分数实时重算** — Given 用户当前 89 分（信用良好），When 一次 +1 变化生效后打开个人主页，Then SHALL 展示 90 分与「信用优秀」；等级 MUST NOT 出现滞后或需要额外刷新才更新。
15. **C-15 零变化也留痕** — Given 用户当前 100 分，When 一次理论 +5 的变化被提交，Then 分数 SHALL 仍为 100；系统 MUST 仍写入一条信用记录（变更前 100 / 实际变化量 0 / 变更后 100），用于保留事件痕迹。

### E. 边界与异常（输入完整性）

16. **C-16 任意存在用户都不出现缺失值** — Given 任意存在的账号（新注册 / 演示 / 历史 / 资料未完善），When 读取其个人主页，Then 响应 SHALL 始终包含 0–100 的整数分数与五个等级之一，MUST NOT 出现 `null`、缺失键、空白占位或因此触发的页面错误；用户不存在时 SHALL 沿用既有 `USER_NOT_FOUND` 行为不变。
17. **C-17 资料弹窗展示** — Given 用户从行程卡 / 详情页点开「旅行者资料」弹窗，When 加载完成，Then 弹窗 SHALL 展示「信用分：XX / 100 · 等级文字」，与个人主页完全一致，且无明细 / 历史入口。
18. **C-18 详情页发布者展示** — Given 用户打开行程详情，When 加载完成，Then 「发布者」区 SHALL 展示发布者的同口径信用状态（本人也同口径）。
19. **C-19 行程卡展示** — Given 用户浏览灵感首页行程卡，When 列表加载完成，Then 每张卡的发布者行 SHALL 展示同口径信用状态，且当前页所有卡片共用一次信用状态查询。
20. **C-20 申请处理页展示** — Given 发布者打开申请处理页，When 列表加载完成，Then 每位申请者行 SHALL 展示同口径信用状态，且当前页所有申请者共用一次查询。
21. **C-21 未列出界面不展示** — Given 用户访问聊天页、顶栏或我的旅行资料卡，When 页面加载完成，Then MUST NOT 出现信用分或等级。

## 5. Constraints

- **口径（D1）：** 0–100 闭区间；五档 90 / 80 / 60 / 30；不引入自动封禁、不引入 0–120 方案；等级由分数派生，不单独存储。
- **数据（D3）：** 分数唯一真相在 `user_credit_account`；账本 append-only，含 `score_before` / `score_after` / `applied_delta` / `reason_code` / `related_type` + `related_id` / `occurred_at` / 幂等键（唯一约束，允许为空）。不改 `app_users`。
- **零变化留痕（D11）：** 变化被边界完全裁断（实际生效 0）时仍写一条 `applied_delta = 0` 的记录，等式仍成立；该记录占用幂等键但不改变分数。
- **等级契约（D10）：** 接口返回固定英文码（`excellent` / `good` / `fair` / `low` / `risk`），展示文案由前端 i18n 映射为「信用优秀 … 信用风险」；五档阈值只在服务端一处实现。
- **能力归属（D9）：** 「注册后初始化信用账户」写在 `user-credit`，不改 `user-auth`「注册账号」的 Requirement 语义。
- **初始化（D5）：** 注册事务内建账户置 80；既有账号迁移回填 80（4 个演示用户 + 已注册账号）。
- **展示（D4 / D7）：** 个人主页响应扩展只读字段；本人与他人同一口径；明细不对外；主页零额外往返（沿用单次 `loadUserProfile`）。
- **展示面扩展（2026-11-17）：** 资料弹窗复用已有个人资料响应；详情页 / 行程卡 / 申请处理页通过批量只读接口一次取数（≤50 个用户），不为每个条目单独请求。
- **只读（D6 / 故事规则 6）：** 无客户端写分端点；用户提交的分数字段必须被忽略。
- **依赖：** `GET /api/users/{userId}/profile` 与 `UserProfileResponse` 由未归档 change `add-user-profile`（REQ-008）与 `add-user-profiles`（REQ-009）拥有；本需求在其上做**只读字段追加**，不改变既有字段语义与本人 / 他人差异（仅生日）。
- **契约与迁移排他：** `openapi.yaml` 当前 0.11.0；在途 `add-ai-itinerary`（REQ-017）已声明 0.12.0 + `V18`，`refine-trip-map`（REQ-016）声明 V17。本需求的契约版本号与迁移号 MUST 在 P3 按合并顺序排他确认，不得与在途 change 撞号。
- **无原型骨架：** `docs/prototype` 未包含信用分页面；按 `@rule:prototype-ui-alignment` 需在 P3 先补原型截点再由实现对齐。
- **业务规则不可自行推断：** 任何未在本条目固化的口径（管理端形态、事件分值、月度上限、封禁阈值）都只能按 §8 的 deferred 处理，不得在实现中临时决定。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 信用分实现为零 | 全仓 grep `信用分 / 信誉分 / credit_score / creditScore / reputation` → 0 命中（含 backend / frontend / openapi / openspec / docs） |
| 用户表无分数、无角色 | `V3__create_demo_users.sql`、`V10__add_user_profile.sql`（仅资料八列） |
| 注册链路单事务、可插账户初始化 | `AuthServiceImpl.register` → `DemoUserService.createAccount` → `issue(user.id())` |
| 个人主页单次读取 | `ProfilePage.tsx` `useEffect` + `loadUserProfile(userId, currentUser.id)` |
| 响应已有可空字段惯例 | `UserProfileResponse` 使用 `@JsonInclude(NON_NULL)` + `includeBirthday` 区分本人 / 他人 |
| 4 个演示用户 + 已注册账号需回填 | `V3` / `V12` / `V13` / `V14` / `V15` 种子迁移 |
| 管理端不存在 | 全仓 grep `admin / 管理后台` → 0 命中；`app_users` 无 role 列 |
| 最新迁移为 V17 | `db/migration` 目录（`V17__meeting_areas.sql`） |
| 原型无信用体系 | `docs/prototype/stories.html`（列为 MVP 之外）、`discovery-cn.html`（列为后续） |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `user-credit` | **ADDED** | 信用账户、初始值与回填、五档等级派生、个人主页展示口径、只读约束、账本与记账服务、越界裁断 |
| `user-profile` | 依赖（未归档） | 个人主页响应追加只读信用字段；Requirement 语义不变 |
| `user-profiles` | 依赖（未归档） | 浏览者读他人主页沿用同一响应；本需求只追加字段 |
| `user-auth` | 集成点（待 P2 判定） | 「注册成功后初始化信用账户」写在 `user-credit`；是否同步 MODIFIED `user-auth`「注册账号」由 P2 delta-craft 决定（OQ-6） |
| `admin`（不存在） | **不在本需求** | 管理端推迟（D2） |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved | 分数区间 / 等级阈值与历史「信誉分 0–120」方案冲突，以哪个为准？ | IO | D1：以本次故事为准，0–120 作废 |
| blocking | resolved | 管理端三条 AC 本轮是否落地？ | IO / SA | D2：本轮只做用户端，管理端另开故事 |
| blocking | resolved | 分数与流水怎么存？ | SA | D3：账户表 + 账本表 |
| blocking | resolved | 个人主页信用状态对谁可见？ | IO | D4：本人与他人同口径，明细不展示 |
| blocking | resolved | 既有账号初始分怎么处理？ | IO | D5：统一回填 80 |
| blocking | resolved | 本切片无事件，记账能力做到哪一步？ | SA | D6：交付记账服务（裁断 + 快照 + 幂等键预留 + 单测），不接事件 |
| blocking | resolved | 信用字段随主页响应还是独立端点？ | SA | D7：扩展个人主页响应 |
| non-blocking | resolved | 是否同步 MODIFY `user-auth`「注册账号」 | SA | D9：不改；「注册后建账户」写在 `user-credit`，保持单 capability |
| non-blocking | resolved | 等级字段在契约中的取值形态 | SA | D10：英文码 `excellent` / `good` / `fair` / `low` / `risk` + 前端 i18n 映射 |
| non-blocking | resolved | 实际生效量为 0 时是否留痕 | SA | D11：留一条 `applied_delta = 0` 的记录 |
| non-blocking | deferred | 管理端列表 / 详情 / 排序 / 筛选的接口形状与管理员身份模型 | SA | 后续解决；D2 已推迟为独立故事 |
| non-blocking | deferred | 契约版本号与迁移号（0.11.0 → ? / V17 之后） | Dev | 后续解决；受 REQ-016 / REQ-017 在途占用约束，P3 排他确认 |
| non-blocking | deferred | 分数规则说明页 / 明细页 / 申诉入口 | IO | 后续解决；本切片明细对用户不可见 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | §1 一句话可对外表述 |
| 2 Actors defined | Pass | §2 五个角色 + 权限边界 |
| 3 Scope bounded | Pass | §3 in / out 均非空，推迟的 AC 显式列出 |
| 4 Scenarios concrete | Pass | §4 共 21 条，均含可观察结果 |
| 5 Exception / boundary | Pass | C-10 ~ C-16、C-21（自改、越界、零变化、缺失值、用户不存在、未列出界面不展示） |
| 6 Results verifiable | Pass | 展示串、边界表、裁断数值、记录等式均可断言 |
| 7 Dependencies / app-arch touchpoints | Pass | §5 依赖与契约 / 迁移排他；§7 能力表 |
| 8 Open-questions gate | Pass | blocking OQ 7 条全部 resolved；非阻塞：3 条 P2 前已裁定（D9–D11），2 条 deferred 且有 owner |
| 9 Data contract decided | Pass | `deep-dive.md`「REQ-019 增补」① 两表给出 grain / 字段 / 状态迁移 |
| 10 Boundary enumerated | Pass | 同节 ② 覆盖缺失账户、越界、并发、重复事件、非法输入等分支 |
| 11 Cross-REQ aligned | Pass | 同节 ③ 与 `user-profile` / `user-profiles` / `user-auth` 全部 aligned，无未收敛 ✗ |
| 12 Notification / display contract decided | Pass | 同节 ④ 个人主页两处 surface 均有 display fields，无明细入口 |

**DoR 结论：** BLOCKER 0 / WARNING 0 / SUGGESTION 0（自检通过，可进入 impact / split）。
