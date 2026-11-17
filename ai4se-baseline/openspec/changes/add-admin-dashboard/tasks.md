# 任务：add-admin-dashboard

- **Change：** `add-admin-dashboard`（REQ-023 / S25）｜ **Owner：** Jacky（SA，当前开发者）
- **输入：** [`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)、Delta Spec（5 / 13）、`g1-decision.md`（C1–C6）
- **顺序原则：** 契约先行 → 后端红测 → 后端聚合与控制器 → 前端纯函数 → 请求 / 页面 / 图表 → 路由与导航 → E2E → 文档 → 回归。
- **验证命令统一在 §2**；每条任务只列本条最相关的代号。

## 1. 任务清单

| id | 任务 | 落点 | 依赖 | 验收 | 验证 |
|---|---|---|---|---|---|
| T1 | 契约：`openapi.yaml` 0.18.0；新增 `GET /admin/dashboard`（`BearerToken`、200 + `Cache-Control` 头、401 / 403）；`AdminDashboard` + 6 个计数 schema（`required` 全集 + `additionalProperties: false`）；200 示例含全部键。同步 `OpenApiTest`：版本两处、`ADMIN_CONSOLE_PATHS` 增项与操作数 16 → 17、六组键集合、`generated_at` 类型 | contract | — | `OpenApiTest` 先 Red 后 Green；`openspec validate --strict` 仍 valid | C1 |
| T2 | 后端验收 Red：`AdminDashboardControllerTest`（`@Import(FixedClockTestConfig)`）覆盖 A1–A8 —— 200 结构、零填充、401 / 403 / 受限管理员、封禁到期、取消行程、五类申请状态、总数自洽、7 / 30 天五条边界、写入后立即反映 + `no-store` | backend | T1 | 失败信息指向「端点不存在 / 字段缺失」，非环境错误 | C2 |
| T3 | 后端响应模型：`AdminDashboardResponse` + `AdminDashboardUsers` / `Trips` / `Applications` / `Experiences` / `Reports` / `ServiceSessions` 六个计数 record；字段名与契约一致（Java 侧 camelCase 由 Jackson `SNAKE_CASE` 输出） | backend | T1 | 序列化结果键名与 §3.1 完全一致 | C2 |
| T4 | 后端聚合服务：`AdminDashboardService` / `AdminDashboardServiceImpl` —— 单 `clock.instant()`、六次 `selectList(null)`、`LinkedHashMap` 零填充、`AccountStatusService.effectiveStatus`、`TripPlan.status(now)`、7 / 30 天窗口、`total` 与分桶同源；**不调用** `findAllTrips()` / `materializeExpired()` | backend | T2 / T3 | A4–A8 绿；无 N+1、无写库 | C2 |
| T5 | 后端控制器：`AdminDashboardController` —— `adminPrincipalService.requireAdmin(authorization)`、返回 200 并写入 `Cache-Control: no-store`；无查询参数 | backend | T4 | A1–A3 绿 | C2 |
| T6 | 前端纯函数 Red：`admin/dashboard/dashboardFormat.ts`（`percentOf` / `stackSegments` / `donutSegments` / `windowRatio` / `formatCount`）与 `route.ts`（`#/admin` ⇄ `adminDashboard`）；同目录 `dashboardFormat.test.ts` + `route.test.ts` 补充 | frontend | T1 | U3 / U4 先 Red 后 Green | C3 |
| T7 | 前端请求与类型：`types.ts` 增 `AdminDashboard` 及六个子类型（字段保持 snake_case）、`api.ts` 增 `loadAdminDashboard(token)` | frontend | T1 | 类型检查通过；响应键与契约一一对应 | C3 |
| T8 | 前端页面与图表：`admin/dashboard/AdminDashboardPage.tsx`（loading / ready / error、手动刷新、无轮询、0 显示为 0）、`AdminMetricCard.tsx`、`adminMessages` 文案、`styles.css` 六卡与堆叠条 / 环形（内联 SVG，无新依赖）、可访问性 `role="img"` + `aria-label` | frontend | T6 / T7 | 六卡渲染；390px 单列无横向滚动；M1 / M2 / M4 / M5 前置条件就绪 | C3 |
| T9 | 路由与导航：`route.ts` 解析与 `routeToHash`、`App.tsx` 在 `AdminGuard` 内挂载、`AdminLayout` 的 `AdminTab` 加 `dashboard` 且置首、`AppShell` 侧栏与移动端入口改指 `#/admin` | frontend | T8 | `#/admin` 可达；非管理员不渲染内容也不发请求 | C3 |
| T10 | E2E：`e2e/tests/admin.spec.ts` 追加 M1–M5 —— 默认落地与六卡、跳转边界、非管理员零请求、500 注入后重试、`page.clock` 快进 60 秒不轮询 | e2e | T9 | 5 条全绿 | C4 |
| T11 | 文档收口：`docs/knowledge/interfaces/README.md` 增「RouteME 管理后台概览」小节与 `/admin/dashboard` 行（版本 0.18.0）；PR 描述贴契约 diff | docs | T5 / T9 | 链接可点；接口表含新行 | C5 |
| T12 | 回归与走查：后端全量、前端 typecheck + build + 单测、E2E 全量、1440 / 768 / 390 × 浅 / 深色（含 0 值、长数字、深色对比度） | verify | T10 / T11 | 全绿；走查截图留档 | C6 |

## 2. 验证命令

| 代号 | 命令 | 判据 |
|---|---|---|
| C1 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest`（可选：`cd ai4se-baseline/RouteME; npx @redocly/cli lint openapi.yaml`） | 测试通过；Redocly 0 error（若运行） |
| C2 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 全绿；新增用例覆盖 A1–A8 与 U1–U2 |
| C3 | `cd ai4se-baseline/RouteME/frontend; npm run typecheck; npm run build; npm test` | 类型零错误；构建通过；单测全绿（U3 / U4） |
| C4 | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/admin.spec.ts` | M1–M5 全绿（需后端 + 前端已启动） |
| C5 | `cd ai4se-baseline; npx --no-install openspec validate add-admin-dashboard --strict` | valid（5 / 13） |
| C6 | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 与基线对比，无新增失败 |

## 3. 对齐自检（Delta → Design → Tasks → ATDD）

| Delta Scenario | Design | Tasks | ATDD |
|---|---|---|---|
| 管理员读取概览统计 | §3、§4.2 | T1 / T2 / T3 / T4 / T5 | A1 |
| 非管理员与未认证被拒绝 | §3、§4.1 | T2 / T5 | A2 |
| 写入后立即反映 | §3、§4.1 | T2 / T4 | A3 |
| 空库返回固定零值 | §4.2 | T2 / T4 | A4 / U1 |
| 封禁到期的账号计入正常 | §4.3 | T2 / T4 | A5 |
| 已取消行程与全部申请状态都计入 | §4.4 | T2 / T4 | A6 |
| 总数与分桶自洽 | §4.2 | T2 / T4 | A7 / U1 |
| 新增计数按产品时区自然日窗口 | §4.5 | T2 / T4 | A8 / U2 |
| 管理员进入后台默认看到概览 | §5.1、§5.3 | T8 / T9 / T10 | M1 |
| 指标卡与跳转边界 | §5.3 | T8 / T10 | M2 |
| 非管理员直接访问被拒绝 | §5.1、§5.2 | T9 / T10 | M3 |
| 加载失败可重试 | §5.2 | T8 / T10 | M4 |
| 手动刷新且不自动轮询 | §5.2 | T8 / T10 | M5 |

- **无遗漏：** 13 / 13 场景均有 Design、Tasks、ATDD 落点。
- **无静默扩张：** 任务中没有趋势图、缓存 / 物化、导出、新表 / 迁移 / 索引、新列表页、自动轮询、图表库依赖。
- **口径单点：** 有效状态只在 T4 调 `AccountStatusService`；行程五态只在 T4 调 `TripPlan.status(now)`；窗口只在 T4 计算；前端（T6 / T8）不出现状态推导或窗口判断。
- **契约先行：** T1 先于 T3–T10；前端类型（T7）对齐契约后才写页面（`@rule:api-contract`）。
- **只读约束：** T4 明确禁止 `findAllTrips()` / `materializeExpired()`；T2 用「GET 前后不写 `completed_at`」的反向检查兜底。

## 4. 风险与回退

| 风险 | 回退 |
|---|---|
| 契约号段 0.18.0 被在途 change 预约 | 顺延次版本并同步 `OpenApiTest` 两处断言与本文档 |
| 六表全扫在共享库上变慢 | 演示规模先接受；记录在 `design.md` §4.6，增长后另开需求，不临时加索引 |
| E2E 使用虚拟时钟与既有定时器冲突 | 退回 `test.setTimeout(90_000)` 真实等待，并在用例注释写明原因 |
| 共享库使 E2E 数字不稳定 | 只断言结构与数值域；精确值留在 API / 纯函数层 |
| `AdminLayout` / `AppShell` 被其他并行会话修改 | 只改与本 change 相关的行（Tab 联合、TABS 顺序、两处 `href`），不重排他处 |
| `add-admin-console` 归档顺序阻塞 | P5 前先归档 `add-admin-console`（C6），不在本 change 内提前建 Living Spec |

## 5. 执行清单（openspec 任务追踪）

- [x] **T1 契约：`openapi.yaml` 0.18.0 + `/admin/dashboard` + 7 schema + `OpenApiTest`**
- [x] **T2 后端验收 Red：`AdminDashboardControllerTest` A1–A8**
- [x] **T3 后端响应模型：`AdminDashboardResponse` + 六个计数 record**
- [x] **T4 后端聚合服务：单时刻、六次查询、零填充、有效状态、五态、窗口**
- [x] **T5 后端控制器：`requireAdmin` + `no-store`**
- [x] **T6 前端纯函数 Red：`dashboardFormat` + `route`**
- [x] **T7 前端请求与类型：`types.ts` + `loadAdminDashboard`**
- [x] **T8 前端页面与图表：六卡、堆叠条、环形、文案、样式**
- [x] **T9 路由与导航：`#/admin` 落地、Tab 置首、入口改指**
- [x] **T10 E2E：M1–M5**
- [x] **T11 文档：接口知识库登记 `/admin/dashboard`**
- [x] **T12 回归与走查：后端全量、前端 typecheck/build/test、E2E、三档 × 双主题**