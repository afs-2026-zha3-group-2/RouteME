# REQ-028 — 旅行保障与小额借款（Ready 需求草稿）

- **能力：** `travel-finance`（ADDED）；只读依赖 `trip-plans` / `trip-companions`（同行资格）、`user-auth`（账号状态）、`user-credit`（账本范式，不复用其账户）
- **对应 OpenSpec change：** `add-travel-finance`
- **草稿日期：** 2026-11-17 ｜ **状态：** P4 implemented（2026-11-18 增补借款利息与逾期罚息；DoR BLOCKER 0）
- **故事来源：** 发起人 2026-11-17 原始诉求「i want new feature: able to buy insurance for accident / death / stomachache during travel from insurance company; able to loan small amount of money for travel support from bank; we charge 5% for service fee」（旅行金融迭代 1，故事点 5，落点「行程详情 / 旅行保障页 / 账号聚合页」）
- **证据：** `requirement-workspace/intents/REQ-028-travel-finance.md`；`docs/sdd/add-travel-finance/p0-baseline.md`；`RouteME/backend/src/main/java/routeme/entity/TripPlanEntity.java`；`RouteME/backend/src/main/java/routeme/entity/TripApplicationEntity.java`；`RouteME/backend/src/main/java/routeme/service/AccountStatusService.java`；`RouteME/backend/src/main/java/routeme/service/impl/AuthServiceImpl.java`；`RouteME/backend/src/main/resources/db/migration/V20__add_credit_account.sql`；`RouteME/frontend/src/route.ts`；`RouteME/frontend/src/App.tsx`；`RouteME/frontend/src/shell/AppShell.tsx`；`RouteME/frontend/src/trips/TripDetailPage.tsx`

## Discovery Decision

**Go（light intake，2026-11-17）。** 保险与借款共用同一份演示钱包、同一条 5% 收费口径、同一套订单与账本、同一个页面，属同一垂直切片；拆成两个 change 会复制钱包与收费逻辑。真实保险 / 银行对接、理赔、征信、钱包充值提现全部排除（D9 / D10）。本需求以「买得到、借得到、费收得到、账对得上」为验收边界。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-028 |
| statement | 系统 SHALL 为每个账号建立唯一演示钱包（初始余额 10,000 元），并允许「某条 `recruiting` / `full` / `ongoing` 行程的发布者或 `ACCEPTED` 同行者」用该钱包进入第三方旅行保险入口（RouteME 不承保、不定价），或申请 100–2,000 元整、期限 7 / 14 / 30 天的小额借款；借款 SHALL 从本金中扣除 5% 服务费后发放净额，并按本金 × 0.05%/日 × 期限计息、逾期按本金 × 0.1%/日 × 已开始逾期天数计罚息；所有余额变化 MUST 在同一事务内写入 append-only 钱包账本，且钱包余额 MUST 恒等于「初始余额 + 入账 − 出账」；用户 MUST NOT 能直接改写余额或绕过资格校验。 |
| actors | 行程发布者（可投保 / 可借）；`ACCEPTED` 同行者（可投保 / 可借）；非同行者 / 未登录访客（不可投保 / 不可借，仅见登录或资格提示）；系统（钱包、账本、第三方保险入口与状态回写、借款、5% 服务费、利息与罚息、到期派生；演示数据，不对接外部机构）。 |
| rationale | 发起人要求把「旅行中的保险与小额周转」放进 RouteME，并靠借款 5% 服务费与按日利息形成平台收入。当前仓库只有信用分账本与行程预算展示，没有任何余额、支付、保单或借贷模型；不先建钱包与账本，「借得到 / 还得起 / 5% 真被扣 / 利息与罚息算得对」都无法验证，后续的理赔、征信与真实金融机构对接也无处落。 |
| acceptance hints | 见 §4 场景 S29-1 ~ S29-33（钱包初始化与回填、余额只经账本、第三方入口与提供方、保障期与状态回写、5% 精确到分、利息 0.05%/日、逾期罚息 0.1%/日、金额与期限边界、净额发放、到期、单笔进行中、手动还款、入口与资格、账号状态、整数分、幂等、数据隔离）。 |
| links to evidence | 见 §6 Context 与 `intents/REQ-028-travel-finance.md` 的证据锚点表。 |

## 1. Intent

一句话：给每位旅行者一个演示钱包，让他能在自己要出发的行程里，通过 RouteME 的入口进入第三方旅行保险（RouteME 不承保、不定价），或者借 100–2,000 元应急；平台在借款端从本金扣 5% 服务费，按日计息，逾期按日计罚息，每一笔钱都能在钱包账本和借款记录里对上。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 行程发布者 | 可对自己发布且状态为 `recruiting` / `full` / `ongoing` 的行程打开第三方投保入口、申请借款；可查看自己的钱包、该行程保险状态与借款。 |
| `ACCEPTED` 同行者 | 与发布者同权限；仅限自己已加入的行程。 |
| `PENDING` / `REJECTED` 申请者、非同行者 | 不可投保、不可借款；页面展示资格说明而非表单。 |
| 未登录访客 | 不进入钱包与金融写路径；沿用壳层登录门。 |
| 系统 | 初始化并维护钱包与账本、第三方保险入口与状态回写、借款、5% 服务费、利息与罚息、到期与逾期派生、手动还款；**不做**核保、理赔、定价、放款审核、征信、真实保险 / 银行对接。 |
| 管理员 | 本切片**不存在**金融管理后台、订单审核或人工调账入口（D10）。 |

## 3. In / Out scope

**In scope**

- 数据底座：`user_wallet`（每用户一条余额）、`wallet_ledger`（append-only 余额流水）、`insurance_policy`（保单）、`travel_loan`（借款）；**不改** `app_users` 与 `user_credit_account`。
- 初始化：注册成功后在同一事务内建立钱包并置 1,000,000 分（10,000 元）；既有账号由迁移统一回填同一初始余额。
- 保险：第三方入口 + 状态回写；提供方名称与保单 / 理赔 / 紧急求助地址来自服务端配置；保障期取行程出发日 ~ 结束日；同一用户同一行程限 1 条；RouteME 不设计商品、不计算保费、不承保。
- 借款：本金 100–2,000 元整；期限 7 / 14 / 30 天；即时通过；5% 服务费从本金扣除、发放净额；利息 = 本金 × 0.05%/日 × 期限；应还 = 本金 + 利息；每人最多 1 笔 `ACTIVE`；支持手动全额还款；逾期按读取时刻派生，罚息 = 本金 × 0.1%/日 × 已开始逾期天数，还款时结清。
- 资格：仅行程发布者与该行程 `ACCEPTED` 同行者；仅 `recruiting` / `full` / `ongoing` 行程；投保 / 借款要求账号 `ACTIVE`，还款不受停用 / 封禁阻断。
- 页面：行程详情页与账号菜单提供入口；新增行程维度「旅行保障」页与账号维度聚合页，展示钱包余额、第三方保险状态、该行程 / 全部保险记录与借款。
- 账本：每次余额变化写一条流水（类型、金额方向、变更前 / 后余额、关联保单或借款、时间、幂等键）；余额与流水 MUST 同事务、可回算。
- 契约：`openapi.yaml` 升次版本，新增钱包 / 保险 / 借款端点与 schema；同步后端契约测试与前端类型。
- 迁移：新增 4 张表 + 2 次迁移（`V30` 建表与钱包回填、`V32` 增补借款利息与罚息）；双引擎（SQLite / H2）。
- 故事与登记：`stories.md` / `registry.md` / `handoff.md` 登记 REQ-028 → `add-travel-finance`。

**Out of scope**

- 真实保险公司 / 银行 / 支付网关 / 银行卡绑定 / KYC / 征信 / 真实放款。
- 理赔申请、审核、给付、拒赔、退保、保单批改、保额调整。
- 借款展期、分期、提前结清优惠、复利、罚息封顶、催收、征信上报、信用分加减。
- 钱包充值 / 提现 / 转账 / 多币种 / 汇率；任何形式的手工调账。
- 管理后台金融订单、风控后台、财务报表、发票。
- 通知 / 推送 / 邮件 / 短信。
- 改变行程状态机、申请规则、聊天权限、信用分规则。
- 担保人、共同借款、企业账户、未成年人与限额风控。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 钱包与账本

1. **S29-1 注册即得演示钱包** — Given 访客用未被占用的用户名注册成功，When 打开「旅行保障」页，Then 系统 SHALL 展示钱包余额「¥10,000.00」；注册失败（用户名重复 / 格式非法 / 密码非法）时 MUST NOT 留下钱包记录。
2. **S29-2 存量账号回填** — Given 账号在本次变更上线前已存在（含演示用户与既有注册账号），When 打开其「旅行保障」页，Then SHALL 展示余额 10,000 元，MUST NOT 出现空值、0 元或错误页。
3. **S29-3 钱包唯一且余额只经账本变化** — Given 用户已拥有钱包，When 用户重复登录、刷新页面或重复读取，Then 该用户 SHALL 仍只有一条钱包记录，余额 MUST NOT 因读取而改变；仓库中 MUST NOT 存在任何可由客户端直接改写余额的端点。
4. **S29-4 余额与账本可回算** — Given 用户钱包存在任意笔流水，When 按流水回算，Then 「初始余额 + 所有入账 − 所有出账」MUST 等于当前余额；每条流水 MUST 记录变更前余额、变更后余额、方向、金额、业务类型、关联业务与发生时间，且满足「变更前 ± 金额 = 变更后」。

### B. 保险购买

5. **S29-5 保障页展示行程上下文与第三方提供方** — Given 用户打开某条可交易行程的「旅行保障」页，Then SHALL 展示目的地、出发 / 结束日期、同行人数、实际保险提供方名称与保障类别，以及保单 / 理赔 / 紧急求助入口；RouteME MUST NOT 展示自有的保费、保额或商品价格。
6. **S29-6 借款 5% 服务费与利息精确到分** — Given 借款本金 1,000 元、期限 14 天，Then 服务费 SHALL 为 50 元、净额 950 元、利息 7 元、应还金额 1,007 元；服务费与利息 MUST 用整数运算四舍五入到分，不得出现浮点尾差；保险不向用户收平台费。
7. **S29-7 打开第三方投保入口** — Given 用户已通过资格校验，When 点击「前往第三方购买」，Then 服务端 SHALL 返回携带本次行程 `trip_id` 的第三方投保地址，客户端在新窗口打开；钱包余额、保险记录与流水 MUST 均不改变。
8. **S29-8 确认投保写入保障期** — Given 第三方确认投保且该行程尚无保险记录，When 状态回写成功，Then 生成 1 条状态为 `ACTIVE` 的记录，保障起始日 SHALL 等于行程出发日、结束日等于行程结束日；客户端传入的日期 MUST 被忽略。
9. **S29-9 同一行程同一用户仅一份** — Given 用户已有该行程的 `ACTIVE` 保险记录，When 重复调用状态回写，Then 系统 SHALL 返回同一条记录，MUST NOT 生成第二条记录或产生钱包流水。
10. **S29-10 余额边界只作用于借款与还款** — Given 用户余额为任意值，When 打开第三方投保入口或回写投保状态，Then 交易 SHALL 不受余额影响；Given 还款时余额低于合计应还金额，Then 系统 SHALL 拒绝且余额与借款状态均不变。
11. **S29-11 保险状态列表** — Given 用户已有投保记录，When 打开行程维度或账号聚合页，Then SHALL 按行程与确认时间展示提供方、保障起止日与状态（未购买 / 保障中 / 已结束）；未购买时 MUST 返回 `NOT_PURCHASED` 且记录为 null；用户 MUST NOT 看到他人的记录。
12. **S29-12 非同行者不能打开入口或回写** — Given 用户既不是该行程发布者，也不是该行程 `ACCEPTED` 同行者，When 尝试打开投保入口或调用状态回写，Then 系统 SHALL 返回 403 `FORBIDDEN`，MUST NOT 生成记录或改变钱包；页面 MUST NOT 提供可提交的投保按钮。
13. **S29-13 已结束 / 已取消行程不能投保** — Given 行程状态为 `completed` 或 `cancelled`，When 尝试打开投保入口或回写状态，Then 系统 SHALL 返回 409 `TRIP_NOT_OPEN`；仅 `recruiting` / `full` / `ongoing` 行程允许投保。

### C. 借款与还款

14. **S29-14 借款金额边界** — Given 用户申请借款，When 输入本金，Then 仅接受 100–2,000 元之间的整元金额；99 元、2,001 元、100.50 元等 MUST 被拒绝并给出可观察的校验错误，MUST NOT 发放。
15. **S29-15 期限边界** — Given 用户申请借款，Then 期限仅接受 7 / 14 / 30 天；其他天数 MUST 被拒绝。
16. **S29-16 净额发放与 5% 服务费** — Given 用户借款 1,000 元、期限 14 天，When 申请成功，Then 系统 SHALL 记录本金 1,000 元、服务费 50 元、发放净额 950 元、利息 7 元、应还金额 1,007 元；钱包 SHALL 增加 950 元并写入一条 95,000 分的入账流水，借款记录 MUST 同时保留本金 / 服务费 / 净额 / 利息 / 应还五个金额。
17. **S29-17 利息与应还金额** — Given 借款本金 1,000 元、期限 14 天，Then 利息 SHALL 按本金 × 0.05%/日 × 14 天 = 7 元计算，应还金额 SHALL 为 1,007 元；系统 MUST 用整数分四舍五入，MUST NOT 在应还金额上追加第二笔服务费。
18. **S29-18 到期时刻** — Given 借款在时刻 T 成功发放、期限 N 天，Then 到期时刻 SHALL 为 T + N 天；页面 SHALL 展示到期日期，且到期日 MUST 由服务端计算、不得由客户端传入。
19. **S29-19 每人最多 1 笔进行中借款** — Given 用户已有一笔 `ACTIVE` 借款，When 再次申请借款，Then 系统 SHALL 拒绝并提示需先还清；MUST NOT 生成第二笔 `ACTIVE` 借款。已还清（`REPAID`）后 SHALL 可再次申请。
20. **S29-20 手动还款结清** — Given 用户有一笔 `ACTIVE` 借款且余额不少于合计应还金额，When 用户确认还款，Then 钱包 SHALL 扣减本金 + 利息（+ 截至还款时刻的逾期罚息）、写入一条出账流水，借款状态 SHALL 变为 `REPAID` 并记录还款时间与实际罚息；还款 MUST NOT 再收服务费。
21. **S29-21 余额不足阻断还款** — Given 用户余额低于合计应还金额，When 尝试还款，Then 系统 SHALL 返回 409 `INSUFFICIENT_BALANCE`，钱包余额 MUST 不变，借款 MUST 仍为 `ACTIVE`。
22. **S29-22 逾期派生并累计罚息** — Given 借款仍为 `ACTIVE` 且当前时刻晚于到期时刻 N 个已开始日，When 读取借款，Then 展示状态 SHALL 为「已逾期」，罚息 SHALL 为本金 × 0.1% × N，合计应还 SHALL 为本金 + 利息 + 罚息；逾期 MUST NOT 自动扣款或封禁；用户还款时 SHALL 按合计应还结清并落库实收罚息。
23. **S29-23 非同行者不能借款** — Given 用户不是该行程发布者或 `ACCEPTED` 同行者，When 尝试申请借款，Then 系统 SHALL 拒绝，MUST NOT 生成借款或入账流水。
24. **S29-24 已结束 / 已取消行程不能借款** — Given 行程状态为 `completed` 或 `cancelled`，When 尝试申请借款，Then 系统 SHALL 拒绝；借款 MUST 绑定一条当时可用的行程。
25. **S29-25 借款列表** — Given 用户已有借款记录，When 打开行程维度或账号聚合页，Then SHALL 展示本金、服务费、净额、利息、应还金额、逾期罚息、合计应还、期限、发放时间、到期时间、状态（进行中 / 已还清 / 已逾期）；用户 MUST NOT 看到他人的借款。

### D. 入口、资格与账号状态

26. **S29-26 行程详情入口** — Given 用户打开某条行程详情，When 用户是发布者或 `ACCEPTED` 同行者且行程状态可交易，Then 页面 SHALL 展示「旅行安全保障」入口与当前保险状态，并可跳转到该行程的保障页；不满足资格时 MUST NOT 展示可交易入口，仅可展示说明。
27. **S29-27 账号菜单与聚合页** — Given 用户已登录，When 打开账号菜单，Then SHALL 存在「旅行保障」入口；进入后 SHALL 看到钱包余额、全部保险状态、全部借款与可交易行程的入口。
28. **S29-28 未登录与非同行者访问** — Given 未登录访客直接访问保障页，Then 系统 SHALL 要求登录；Given 已登录但非同行者直接访问某行程保障页，Then SHALL 展示无资格说明，MUST NOT 允许打开投保入口或提交借款。
29. **S29-29 账号状态限制** — Given 用户账号为 `SUSPENDED` 或 `BANNED`，When 尝试打开投保入口、回写状态或申请借款，Then 系统 SHALL 返回 403 `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED`；Given 账号为 `ACTIVE`，Then 允许按其余规则交易。
30. **S29-30 停用 / 封禁仍可还款** — Given 用户有 `ACTIVE` 借款且账号被停用或封禁，When 用户发起还款，Then 系统 SHALL 允许扣款并结清；账号状态 MUST NOT 使债务永久无法结清。

### E. 金额精度、幂等与隔离

31. **S29-31 整数分与无浮点误差** — Given 任意合法金额，Then 数据库与契约中的金额 SHALL 均为整数分（`*_cents`），币种 CNY；5% 服务费、利息与罚息 MUST 用整数运算四舍五入到分，MUST NOT 出现 `0.30000000000000004` 一类浮点尾差；借款本金 MUST 为整元。
32. **S29-32 重复提交至多扣款一次** — Given 用户双击借款 / 还款按钮或网络重试同一请求，When 第二次请求到达，Then 系统 SHALL 至多扣款一次，MUST NOT 生成第二笔 `ACTIVE` 借款或第二条对应流水；重复打开投保入口 MUST NOT 扣款，重复回写保险状态 MUST 幂等且只保留 1 条记录。
33. **S29-33 数据隔离** — Given 用户 A 已登录，When 用户 A 请求用户 B 的钱包、保单或借款数据，Then 系统 SHALL 拒绝或仅返回 A 自己的数据；任何列表端点 MUST NOT 混入他人记录。

## 5. Constraints

- **钱包口径（D1 / D8）：** 每用户 1 个钱包，初始余额 1,000,000 分（10,000 元）；余额单位为整数分，币种 CNY；余额唯一真相在 `user_wallet.balance_cents`，账本为 append-only 审计与回算依据。
- **服务费（D2）：** 保险由第三方定价与收费，RouteME 不向用户收平台费；借款 = 本金 × 5% 从发放额扣除，四舍五入到分（整数运算），不产生第二笔费用。
- **利息与罚息（D3）：** 利息 = 本金 × 0.05%/日 × 期限天数；逾期罚息 = 本金 × 0.1%/日 × 已开始逾期天数（到期后的任意一秒算第 1 天）；均四舍五入到分，进行中实时派生、还款时落库结清。
- **保险商品（D4）：** RouteME 不定义商品、保费或保额；提供方名称与保单 / 理赔 / 紧急求助地址来自 `routeme.insurance.*` 配置，默认演示占位。
- **保障期（D4）：** `coverage_start = 行程 start_date`，`coverage_end = 行程 end_date`，含首尾；行程已结束 / 取消不可投保；`EXPIRED` 读取时派生。
- **借款（D3）：** 本金 100–2,000 元整（10,000–200,000 分）；期限仅 7 / 14 / 30 天；即时通过；`disbursed_cents = principal_cents − service_fee_cents`；`interest_cents = principal × 5 × term_days / 10000`；`repay_cents = principal_cents + interest_cents`；到期时刻 = 发放时刻 + 期限；逾期为读取时派生，不落独立状态，罚息在还款时结清。
- **单笔进行中（D3）：** 每用户最多 1 笔 `ACTIVE` 借款；数据库部分唯一索引兜底，服务层同步校验。
- **资格（D5）：** 发布者 + 该行程 `ACCEPTED` 申请者；行程状态 `recruiting` / `full` / `ongoing`；借款必须绑定行程。
- **账号状态：** 购买 / 借款要求 `ACTIVE`（沿用 `AccountStatusService` 写守卫）；还款不受 `SUSPENDED` / `BANNED` 阻断。
- **幂等（D8）：** 保险以「用户 + 行程」唯一约束兜底；借款以「用户 + `ACTIVE`」唯一索引兜底；还款以状态迁移兜底；重复请求不得二次扣款。
- **数据模型：** `user_wallet`、`wallet_ledger`、`insurance_policy`、`travel_loan` 共 4 张表；不改 `app_users`、`user_credit_account`、`credit_ledger`；不新建商品目录表或订单表（保险记录 / 借款记录本身即业务记录）。
- **迁移与引擎：** 新增 2 个迁移（`V30` 建表 + 回填，`V32` 重建 `travel_loan` 增补利息 / 罚息），必须同时在 SQLite（生产）与 H2（测试）执行。
- **契约与迁移排他：** 基线 `openapi.yaml` 0.17.0、迁移头 `V23`；P3 先落 0.25.0 + `V30`，main 前进到 0.27.0 + `V31` 后按后到者顺延规则落定 **0.28.0 + `V32`**；`OpenApiTest` 断言版本。
- **测试边界：** 前端单测无 DOM（vitest node 环境）；费用 / 资格 / 状态文案等纯逻辑走 vitest，页面行为走 Playwright E2E。
- **原型：** rebase 后 `docs/prototype/v1` 已归档；本 change 不新增原型资产，页面行为以 Delta Spec、生产 UI 与 Playwright E2E 为准。
- **业务规则不可自行推断：** 任何未在本条目固化的口径（具体端点形状、字段命名、错误码、页面版式）只能按 §8 deferred 处理，不得在实现中临时决定。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 金融能力为零 | 全仓 grep `wallet / insurance / loan / premium / service_fee / balance_cents` → 除地图脚本注释外 0 命中 |
| 无钱包与账本 | `V20__add_credit_account.sql` 只有 `user_credit_account` + `credit_ledger`（信用分，不可当余额） |
| 行程状态可派生 | `TripPlanEntity.status(now)`：已取消 > 已结束 > 旅行中 > 已满员 > 招募中 |
| 同行关系判定 | `trip_applications.status = ACCEPTED`；发布者不在申请表 |
| 写守卫 | `AccountStatusService.assertCanWrite`，`ACTIVE` / `SUSPENDED` / `BANNED` |
| 注册单事务 | `AuthServiceImpl.register` → `DemoUserService.createAccount`；已内嵌 `CreditService.ensureAccount`，可同事务初始化钱包 |
| 金额惯例 | `budget_min_cents` / `budget_max_cents` 为整数分 |
| 迁移头 | 当前 `V32__add_loan_interest_penalty.sql`；基线为 `V23__add_travel_mode.sql` |
| 契约版本 | `openapi.yaml` `info.version: 0.28.0`；`OpenApiTest` 断言 |
| 前端路由 | `route.ts` 手写 hash 路由；`App.tsx` `renderContent`；详情页 `#/trips/{id}` |
| 账号菜单 | `AppShell.tsx` `rail-menu` 含「编辑资料」「退出」两项 |
| 详情页分区 | `TripDetailPage.tsx` `detail-section`：天气 / 途经点 / 发布者 / 同行者 / 体验 / 匹配 / 申请 |
| 测试基线 | 后端 661 / 前端 514 全绿（P4 记录） |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `travel-finance` | **ADDED** | 钱包与账本、第三方保险入口与状态回写、借款与还款、5% 服务费、利息与逾期罚息、资格、入口、金额精度与幂等 |
| `trip-plans` | 只读依赖 | 读取行程发布者、起止日期与状态；不改 Requirement |
| `trip-companions` | 只读依赖 | 读取 `ACCEPTED` 同行者判定；不改 Requirement |
| `user-auth` | 集成点 | 注册成功后同事务初始化钱包；不改「注册账号」Requirement 语义 |
| `user-credit` | 参照 | 复用账本范式（append-only + 前后快照 + 幂等键），不读写信用分账户 |
| `admin` | **不在本需求** | 无金融管理后台、订单审核、人工调账 |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved | 钱怎么流动？ | IO | D1：演示钱包，每用户一个余额 |
| blocking | resolved | 5% 服务费作用在哪？ | IO | D2：保险不向用户收费；借款从本金扣 5% |
| blocking | resolved | 借款金额、期限、利息与罚息？ | IO | D3：100–2,000 元整、7/14/30 天、0.05%/日利息、0.1%/日逾期罚息、单笔进行中 |
| blocking | resolved | 保险卖什么？ | IO | D4：第三方入口 + 状态回写，RouteME 不定义商品 / 保费 / 保额 |
| blocking | resolved | 谁可以买 / 借？ | IO | D5：发布者 + ACCEPTED 同行者，行程 recruiting/full/ongoing |
| blocking | resolved | 入口在哪？ | IO | D6：行程详情 + 账号菜单，另有账号聚合页 |
| blocking | resolved | 能力与 change 命名？ | SA | D7：`add-travel-finance` / `travel-finance` |
| blocking | resolved | 金额口径？ | SA | D8：整数分，借款整元 |
| blocking | resolved | 是否对接真实机构？ | IO | D9：不对接，demo |
| blocking | resolved | 明确不做什么？ | IO | D10：理赔、退保、分期 / 复利、充值提现、管理后台、通知、信用分影响 |
| non-blocking | resolved | 账号被封禁是否阻断还款？ | SA | 还款不受账号状态阻断（S29-30） |
| non-blocking | resolved | 契约版本号与迁移号（0.17.0 / V23 之后） | Dev | 已确认：0.28.0 + `V32`（main 0.27.0 + `V31` 之后顺延） |
| non-blocking | resolved | 端点形状、字段命名、错误码与页面版式 | SA | P3 已定稿：`TravelLoan` 含 `interest_cents` / `penalty_cents` / `total_repay_cents` |
| non-blocking | resolved | 原型截点（钱包卡 / 借款表单） | Dev | rebase 后 `docs/prototype/v1` 已归档，以生产 UI + E2E 为准 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | §1 一句话可对外表述 |
| 2 Actors defined | Pass | §2 六个角色 + 权限边界 |
| 3 Scope bounded | Pass | §3 in / out 均非空，D10 明确排除 |
| 4 Scenarios concrete | Pass | §4 共 33 条，均含可观察结果 |
| 5 Exception / boundary | Pass | S29-2 / 9 / 10 / 12 / 13 / 14 / 15 / 19 / 21 / 22 / 23 / 24 / 28 / 29 / 32 / 33 |
| 6 Results verifiable | Pass | 余额数值、费用拆分、保障期、到期时刻、状态迁移、列表字段均可断言 |
| 7 Dependencies / app-arch touchpoints | Pass | §5 依赖与契约 / 迁移排他；§7 能力表 |
| 8 Open-questions gate | Pass | blocking OQ 10 条全部 resolved；非阻塞 1 条已裁定 + 3 条 deferred 且有 owner |
| 9 Data contract decided | Pass | `deep-dive.md`「REQ-028 增补」① 四表给出 grain / 字段 / 状态迁移 |
| 10 Boundary enumerated | Pass | 同节 ② 覆盖余额不足、重复投保、重复借款、逾期、账号状态、非同行者、幂等 |
| 11 Cross-REQ aligned | Pass | 同节 ③ 与 `trip-plans` / `trip-companions` / `user-auth` / `user-credit` 全部 aligned，无未收敛 ✗ |
| 12 Notification / display contract decided | Pass | 同节 ④ 钱包卡、第三方保险面板、保险记录、借款列表、入口均有 display fields；无通知 |

**DoR 结论：** BLOCKER 0 / WARNING 0 / SUGGESTION 0（自检通过，可进入 impact / split）。