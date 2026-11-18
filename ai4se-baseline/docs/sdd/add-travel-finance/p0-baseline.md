# P0 基线 — add-travel-finance

- **Change：** `add-travel-finance`
- **能力：** `travel-finance`（ADDED）
- **分支：** `feature/add-travel-finance`（由 `origin/main` 创建）
- **基线提交：** `origin/main@822471c`（rebase 后；P0 时点为 `origin/main@b50e416`）
- **记录日期：** 2026-11-17（2026-11-18 rebase 与保险返工后更新）
- **记录人：** Karena（当前开发者，已向发起人确认）
- **需求编号：** REQ-028（发起人 2026-11-17 提出；P0 时点现有最大编号为 REQ-023，rebase 后按「后到者顺延」登记为 REQ-028 / S29）

## 0. 复审说明（2026-11-18）

保险由「站内商品 + 保费 + 保险 5% 服务费」收敛为「第三方投保入口 + 状态回写」。P0 基线的测试与迁移数据按 rebase 后的实际状态更新：契约 **0.25.0**、Flyway head **`V30`**、后端 **618** tests、前端 **482** tests。G-02 / G-04 的描述随之调整，但缺口编号保留以维持与 P1 / P3 / P4 的可追溯性。

## 1. 仓库基线

| 项 | 值 | 证据 |
|---|---|---|
| 后端栈 | Spring Boot 4.1.2、Java 21、MyBatis-Plus 3.5.18、SQLite + Flyway | `RouteME/backend/pom.xml` |
| 前端栈 | React 19、Vite 8、Ant Design 6、vitest（node 环境，无 jsdom） | `RouteME/frontend/package.json`、`frontend/vite.config.ts` |
| 契约 | `openapi.yaml` `info.version: 0.25.0`；由 `OpenApiTest` 断言 | `RouteME/openapi.yaml`、`backend/src/test/java/routeme/controller/OpenApiTest.java` |
| 迁移 | `V1` … `V30__add_travel_finance.sql`；空库与 `V17` / `V19` 起点均可迁移到最新 | `backend/src/main/resources/db/migration/` |
| 后端测试 | 618 tests / 0 failure / 0 error / 0 skip（`mvnw.cmd -B -ntp clean verify`） | 2026-11-18 返工后 |
| 前端测试 | 482 tests / 60 files 全绿（`npm test -- --run`） | 2026-11-18 返工后 |
| 身份模型 | 客户端用 `X-User-Id`；只有后台 / 帮助 / 客服端点要求 bearer token | `frontend/src/api.ts`、`AppShell`、`openapi.yaml` |
| 金额口径 | 已有金额字段用整数分（`budget_min_cents` / `budget_max_cents`） | `backend/.../entity/TripPlanEntity.java`、`pojo/TripPlan.java` |
| 数据库兼容 | 生产 SQLite，测试 H2（`jdbc:h2:mem`）；迁移必须双引擎可执行 | `backend/src/test/resources/`、迁移测试 |

## 2. 与本变更相关的现状

### 2.1 旅行与参与关系

- `trip_plans` 保存发布者、目的地、起止日期、人数、状态派生来源；`TripPlan.status(now)` 按「已取消 > 已结束 > 旅行中 > 已满员 > 招募中」派生。
- 参与关系只存在于 `trip_applications`：`status = ACCEPTED` 即同行者；发布者本身不在申请表中。
- 因此「可使用旅行保障的人」= 行程发布者 + 该行程 `ACCEPTED` 申请者。
- 行程可用的时间窗口由 `start_date` / `end_date` 与当前时间派生；`completed` / `cancelled` 行程不应再产生新的投保回写或借款。
- 同行人数按「参与者 − 发布者」计，与行程详情「同行者」列表口径一致。

### 2.2 账户与写权限

- `app_users.status` 取 `ACTIVE` / `SUSPENDED` / `BANNED`；`AccountStatusService.assertCanWrite(userId, scope)` 是唯一写守卫入口。
- `SUSPENDED` 阻断 `BUSINESS`；`BANNED` 阻断全部；举报（`REPORT`）与客服（`SUPPORT`）有独立口径。
- 注册在 `AuthServiceImpl.register` 的同一事务内初始化信用账户（`CreditService.ensureAccount`），可直接复用该事务模式初始化钱包。

### 2.3 前端壳层与路由

- 路由是手写 hash 路由：`frontend/src/route.ts` 的 `parseRoute` / `routeToHash`，`App.tsx` 的 `renderContent` 决定页面。
- 导航在 `frontend/src/shell/AppShell.tsx`：桌面左侧 rail、移动底部 tabbar、账号入口菜单。
- 行情详情页 `frontend/src/trips/TripDetailPage.tsx` 已按 `detail-section` 分区（天气、途经点、发布者、同行者、体验、匹配、申请）。
- API 客户端集中在 `frontend/src/api.ts`，类型集中在 `frontend/src/types.ts`；文案集中在 `frontend/src/i18n/`。

### 2.4 现有领域词汇

- P0 时全仓扫描 `wallet` / `insurance` / `loan` / `premium` / `service_fee` / `balance_cents`：除地图第三方脚本注释外 0 命中。
- 现有 `credit` 是「信用分账户 + 账本」，只读、无余额、无支付能力；不能当作钱包复用。
- 现有 `budget_min_cents` / `budget_max_cents` 只是行程预算展示，不是用户余额。
- 仓库没有任何第三方保险提供方配置或外部入口约定。

## 3. 缺口

| id | 缺口 | 后果 |
|---|---|---|
| G-01 | 没有用户钱包与余额，也没有余额变更账本 | 无法放款、无法验证「余额不足」、无法证明 5% 真被扣 |
| G-02 | 没有旅行保险入口与状态记录 | 用户不知去哪投保，RouteME 也无法展示「本次行程是否已投保」 |
| G-03 | 没有借款与还款模型 | 旅行周转金额无法申请、发放、到期与结清 |
| G-04 | 没有服务费口径与业务流水 | 借款 5% 无法计算、展示或审计（保险不向用户收平台费） |
| G-05 | 没有旅行保障入口、页面与路由 | 用户无法在行程详情或账号菜单进入服务 |
| G-06 | 没有金融写入的资格校验与测试夹具 | 非同行者、已结束行程、封禁账号的边界不可验证 |

## 4. 基线带来的约束

1. **单一 capability：** 保险入口与借款共用钱包、账本、资格与同一组页面，合并为 `travel-finance` 一个能力；不新建两个 change。
2. **金额单位：** 数据库与契约统一用整数分（`*_cents`）；借款只接受整元金额，使 5% 始终是整数分，避免四舍五入歧义；保险不出现金额字段。
3. **双引擎迁移：** 新迁移必须同时在 SQLite（生产）与 H2（测试）通过；不使用部分唯一索引，改用可空列唯一索引（`active_user_id`）表达「每人最多 1 笔进行中」。
4. **契约排他：** 合并 `origin/main` 后 main 为 `0.24.0` + `V29`；本 change 落定 **`0.25.0` + `V30`**，不再预占 0.18.0 / V24。
5. **身份是 demo 级：** 沿用 `X-User-Id`，不实现支付密码、二次验证、KYC 或真实银行 / 保险对接；第三方投保入口通过配置指向 `example.com` 占位页。
6. **账户状态：** 投保入口 / 状态回写 / 借款必须要求 `ACTIVE`；还款是结清债务，不应因 `SUSPENDED` / `BANNED` 被永久阻断。
7. **前端测试边界：** 前端单测无 DOM；纯逻辑（费用计算、资格派生、状态文案）走 vitest，页面行为走 Playwright E2E。
8. **无回归：** 现有行程、申请、聊天、体验、举报、信用、管理后台的基线必须保持全绿（当前 618 / 482）。
9. **合规边界：** RouteME 不设计保险产品、不定价、不承保、不参与理赔；不保存保单号 / 证件 / 银行卡 / 保费 / 保额。

## 5. 结论

基线可运行、测试全绿、相关现状已定位。`travel-finance` 与现有信用 / 预算概念没有重叠，缺口 G-01 ~ G-06 构成本变更的垂直切片。**P0 Pass**，进入 P1 意图与提案。

## 6. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0 | 未提交 | 等待 P1 工件与签署一并留痕 |
| rebase | `822471c` | 合并 `origin/main`；契约与迁移号顺延为 0.25.0 + V30 |
| 返工 | 未提交 | 保险改为第三方入口 + 状态回写；测试 618 / 482 |