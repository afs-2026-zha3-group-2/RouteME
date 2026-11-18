# ATDD 设计：add-admin-dashboard

- **Change：** `add-admin-dashboard`（`admin-dashboard` ADDED，REQ-023 / S25）
- **输入：** Delta Spec（5 Requirement / 13 Scenario）、[`design.md`](design.md)、`proposal.md`、`docs/reviews/20261117-add-admin-dashboard-spec-review.md`
- **分层：** 后端接口（API）/ 端到端（E2E）/ 纯逻辑（Defer-UT，交 P4 单元 TDD）/ 人工走查
- **契约先行：** 所有验收检查以 `openapi.yaml` 0.18.0 为唯一字段事实源；先改契约再写实现（`@rule:api-contract`）

## 1. 本次纳入的 ATDD 层

只规划 **API** 与 **E2E** 两层；纯逻辑项只登记为 **Defer-UT**（`/sdd:atdd-apply` 时的单元 TDD），本文件不展开单测套件。

| 层 | 范围 | 判定信号 |
|---|---|---|
| API | 单个只读端点 `GET /api/admin/dashboard` 的状态码、字段结构、零填充、口径、窗口、无缓存 | WHEN/THEN 是 HTTP 请求 + 状态码 / 响应体，无需 UI |
| E2E | `#/admin` 落地、六卡与图表、跳转边界、非管理员零请求、失败重试、不轮询 | THEN 断言页面可见行为或跨页跳转 |
| Defer-UT | 分桶与零填充的纯数学、`dashboardFormat` 纯函数、路由解析 | 无 I/O、无 UI 的内存变换 |

### 1.1 场景 → 层映射（13 / 13）

| # | Delta 场景 | 层 | 验收点 |
|---|---|---|---|
| A1 | 管理员读取概览统计 | API | 200；六组 + `generated_at` 齐全；每组键集合与 §3.1 一致 |
| A2 | 非管理员与未认证被拒绝 | API | `role=USER` → 403 `ADMIN_REQUIRED`；无 token → 401；两者响应体无任何统计键 |
| A3 | 写入后立即反映 | API | 两次请求之间插入 1 行程 + 1 举报 → `trips.total`、`reports.total` 各 +1；响应头 `Cache-Control` 含 `no-store` |
| A4 | 空库返回固定零值 | API + Defer-UT | 构造某组为零时全部键存在且为 `0`；不返回 `{}`；分桶数学由纯函数覆盖 |
| A5 | 封禁到期的账号计入正常 | API | `BANNED` + 过期 `ban_expires_at` → `ACTIVE` +1、`BANNED` 不增 |
| A6 | 已取消行程与全部申请状态都计入 | API | 取消一条招募中行程 → `cancelled` +1、`recruiting` −1、`total` 不变；五种申请状态各自 +1 |
| A7 | 总数与分桶自洽 | API | `users.total = Σby_role = Σby_status`；`trips / applications / reports / service_sessions` 各自 `total = Σby_status` |
| A8 | 新增计数按产品时区自然日窗口 | API + Defer-UT | 固定时钟下五条边界记录归属正确（今天 00:00 / 前 6 天 00:00 / 前 7 天 00:00 前一秒 / 前 29 天 00:00 / 前 30 天 00:00 前一秒） |
| M1 | 管理员进入后台默认看到概览 | E2E | 点击「管理后台」→ URL `#/admin`；六卡与 `dashboard-updated-at` 可见 |
| M2 | 指标卡与跳转边界 | E2E | 用户 / 举报 / 客服卡可点并进入对应页；行程 / 申请 / 体验卡无 `href`，点击 URL 不变 |
| M3 | 非管理员直接访问被拒绝 | E2E | `role=USER` 打开 `#/admin` → 无权限提示；`page.on('request')` 未捕获 `/api/admin/dashboard` |
| M4 | 加载失败可重试 | E2E | 注入 500 → `dashboard-error`；点重试 → 恢复 `dashboard-page` |
| M5 | 手动刷新且不自动轮询 | E2E | `page.clock.install()` 后快进 60 秒，统计请求数仍为 1；点「刷新」后 +1 且更新时间变化（`playwright.config.ts` 默认 30 秒超时，真实等待不可行；被其他定时器干扰时退回 `test.setTimeout(90_000)`） |

### 1.2 Defer-UT 清单（P4 单元 TDD，不在本文件展开）

| id | 对象 | 待覆盖的纯逻辑 |
|---|---|---|
| U1 | `AdminDashboardServiceImpl` 分桶辅助 | 零填充键序、空列表全 0、`merge` 后 `total = Σ` |
| U2 | 同上 | 7 / 30 天窗口判定函数：边界前一毫秒、边界当刻、未来时间、`created_at` 为 `null` |
| U3 | `dashboardFormat.ts` | `percentOf` 除零、`stackSegments` 键序与 0 段、`donutSegments` 累计偏移、`windowRatio` 封顶、`formatCount` |
| U4 | `route.ts` | `#/admin` ⇄ `adminDashboard`，既有 `#/admin/**` 不变 |

## 2. 先于生产代码写下的验收物

严格按「契约 → 验收检查 → 实现」：

1. **契约**：`openapi.yaml` 先加 `/admin/dashboard`、7 个 schema、0.18.0；`OpenApiTest` 的版本 / 路径 / 键集合断言先红。
2. **API 验收检查**：`AdminDashboardControllerTest` 先写 A1–A8 的请求与断言（含固定时钟配置），此时因端点不存在而红。
3. **E2E 验收检查**：`e2e/tests/admin.spec.ts` 追加 M1–M5，先以 `data-testid` 断言编写，运行得到「元素不存在」的失败，而不是超时。
4. **实现**：后端服务 → 控制器 → 前端类型 / 请求 → 页面 → 路由与导航 → 样式。
5. **纯逻辑**：U1–U4 在实现过程中按 Red → Green → Refactor 补齐。

**Red 的可接受证据：** 失败信息必须指向缺失行为（404 路由、字段缺失、元素未找到），不能是环境错误、未启动服务或选择器拼写错误。

## 3. 本地与 CI 门禁

不新增第二套 CI 语义，沿用 `@rule:web-testing` 与仓库现有脚本：

| 检查 | 命令 | 阻断点 |
|---|---|---|
| 后端测试 | `mvn -f backend/pom.xml test`（或仓库既有等价命令） | pr-merge |
| 前端类型 | `npm run typecheck`（`frontend/`） | pr-merge |
| 前端构建 | `npm run build`（`frontend/`） | pr-merge |
| 前端单测 | `npm test`（`frontend/`） | pr-merge |
| 端到端 | `npx playwright test`（`e2e/`，需后端 + 前端已启动） | **本地执行**；现状未入 CI，P4 报告记录命令与结果 |
| 契约校验 | `OpenApiTest`（随 `mvn test`） | pr-merge |

- PR 必须附契约 diff（`openapi.yaml`）。
- 界面改动至少跑通 `admin.spec.ts` 中受影响的概览用例；共享库导致断言不稳定时，改断言而不是跳过用例。

## 4. 数据与夹具策略

| 层 | 策略 |
|---|---|
| API（`@SpringBootTest` + `MockMvc` + `@Transactional`） | 每个用例自行插入夹具并回滚；`@Import(FixedClockTestConfig)` 固定 `2026-11-16T09:00:00Z`（北京 17:00） |
| API 取值 | 共享库含种子数据，因此**不断言绝对值**：先读一次基线，再插入 / 修改，断言增量与不变量 |
| API 时间夹具 | 直接写 `created_at` 字符串：`2026-11-16T00:00:00+08:00`、`2026-11-10T00:00:00+08:00`、`2026-11-10T00:00:00+08:00` 前一秒、`2026-10-18T00:00:00+08:00`、`2026-10-18T00:00:00+08:00` 前一秒 |
| API 账号夹具 | 复用 `setUserStatusViaApi` / 直接更新 `ban_expires_at`，覆盖「封禁已过期」与「封禁未过期」两条 |
| API 行程夹具 | 复用 `createTripViaApi` 后取消，或直接插行；必须保留 `capacity / joined_count / cancelled_at / completed_at` 以便 `status(now)` 判定 |
| E2E | 复用 `loginAsAdmin` / `loginAsAccount` / `createUserViaApi`；真实后端；**只断言结构与数值域**（六卡存在、数字为 ≥0 整数、更新时间可解析） |
| E2E 错误态 | `page.route('**/api/admin/dashboard', ...)` 注入 500，仅用于 M4，不替换正常路径 |
| E2E 隔离 | 不新增全局种子；需要「非管理员」时用 `createUserViaApi` + `loginAsAccount` |
| 清理 | API 全回滚；E2E 不删共享数据（沿用现状），断言不依赖绝对值 |

## 5. 非目标反向验证

每条提案 Non-goal 至少一条反向检查（优先 API / E2E）：

| 非目标 | 反向检查 | 层 |
|---|---|---|
| 不做趋势 / 时间序列 | `AdminDashboard` 及子 schema `additionalProperties: false`，且不存在 `series` / `trend` / `history` / 时间桶数组字段；E2E 无时间轴、无日期范围控件 | API + E2E |
| 不做缓存 / 物化 | A3（写入后立即反映）+ `Cache-Control: no-store`；连续两次请求之间数据变化必须可见 | API |
| 不做定时任务 | 代码评审确认无 `@Scheduled`；API 反向检查：GET 前后 `trip_plans.completed_at` 不被改写（不触发 `materializeExpired`） | API + 代码评审 |
| 不新增表 / 列 / 迁移 / 索引 | P4 diff 中 `db/migration/` 无新增文件；`openapi` 与实体字段无新增持久化列 | 代码评审 |
| 不新增列表页 | `route.test.ts` 断言 `/admin/trips`、`/admin/applications`、`/admin/experiences` 仍为 `notFound`；E2E 三类卡不可点 | Defer-UT + E2E |
| 不自动轮询 / 推送 | M5：60 秒内请求数不变；代码中无 `setInterval` / EventSource / WebSocket | E2E + 代码评审 |
| 不返回 PII | `additionalProperties: false` + 键集合断言，响应不含 `nickname` / `email` / `avatar_url` / 明细 ID | API |
| 前端不重算状态 | E2E 只读展示；代码评审确认前端无状态推导分支、无窗口计算 | 代码评审 |

## 6. NFR 测试（可选，待确认）

- 本 change 未声明 SLA / QPS / 并发目标；`design.md` §4.6 只记录 6 条全表查询的现状与后续另开需求的边界。
- **已确认（2026-11-17，发起人）：不纳入** NFR 自动化（性能 / 压测 / 可观测性）。若后续要求性能基线，另立条目，不在本 change 内临时加脚本。

## 7. 明确不纳入自动化

- 真实数据规模下的查询耗时（无 SLA；演示库规模不具代表性）。
- 1440 / 768 / 390 × 浅 / 深色的视觉走查（人工，P4 报告记录）。
- 图表配色对比度的工具化审计（沿用既有主题令牌，人工走查确认）。
- 共享库中种子的绝对值（E2E 只断言结构与数值域）。