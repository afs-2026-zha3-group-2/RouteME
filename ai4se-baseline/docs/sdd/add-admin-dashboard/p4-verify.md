# P4 — add-admin-dashboard（REQ-023 管理后台概览实现与验证）

- **日期：** 2026-11-17 ｜ **记录人：** Jacky（SA，当前开发者）｜ **阶段：** P4 实现完成，本地验证 Pass；G2 待签署
- **Change：** `add-admin-dashboard` ｜ **分支：** `main`
- **P3 设计提交：** `11077c5` ｜ **基线：** `b50e416`
- **G2：** [`openspec/changes/add-admin-dashboard/g2-decision.md`](../../openspec/changes/add-admin-dashboard/g2-decision.md)

## 1. 实现落点

| 文件 | 改动 |
|---|---|
| `backend/.../response/AdminDashboardResponse.java` + `AdminDashboardUsers` / `Trips` / `Applications` / `Experiences` / `Reports` / `ServiceSessions` | 新增 7 个计数 record；字段 camelCase，由 Jackson `SNAKE_CASE` 输出为契约键名 |
| `backend/.../service/AdminDashboardService.java` / `service/impl/AdminDashboardServiceImpl.java` | 单 `clock.instant()`、六次 `selectList(null)`、`LinkedHashMap` 零填充、复用 `AccountStatusService.effectiveStatus` 与 `TripPlan.status(now)`；7 / 30 天窗口按 `TripTimeZoneConstant.ZONE` 的自然日；`total` 与分桶同源；不调用 `findAllTrips()` / `materializeExpired()` |
| `backend/.../controller/AdminDashboardController.java` | 新增 `GET /api/admin/dashboard`：`requireAdmin` → 200 + `Cache-Control: no-store`，无查询参数 |
| `backend/.../pojo/TripPlan.java` | 仅把状态 javadoc 由四态更正为五态（含 `cancelled`），行为不变 |
| `backend/.../controller/OpenApiTest.java` | 版本两处 0.18.0、`ADMIN_CONSOLE_PATHS` 16 → 17、七组 schema 键集合、`generated_at` 类型 |
| `openapi.yaml` | 0.17.0 → 0.18.0；新增 `/admin/dashboard`（200 + 头、401 / 403）与 7 个 schema（`required` 全集 + `additionalProperties: false`）+ 全键示例 |
| `frontend/src/types.ts` / `api.ts` | `AdminDashboard` 及六个子类型（保持 snake_case）；`loadAdminDashboard(token)` |
| `frontend/src/admin/dashboard/dashboardFormat.ts` / `.test.ts` | 纯函数 `percentOf` / `stackSegments` / `donutSegments` / `windowRatio` / `formatCount` 与 19 条单测 |
| `frontend/src/admin/dashboard/AdminDashboardPage.tsx` | loading / ready / error 三态、手动刷新、无轮询；六卡与跳转边界；0 值与错误重试 |
| `frontend/src/admin/dashboard/AdminMetricCard.tsx` | 指标卡、图例、堆叠条、环形（内联 SVG）、米尺；`role="img"` + `aria-label` |
| `frontend/src/route.ts` / `route.test.ts` | `#/admin` ⇄ `adminDashboard`；既有 `#/admin/**` 不变 |
| `frontend/src/App.tsx` / `admin/AdminLayout.tsx` / `shell/AppShell.tsx` | `AdminGuard` 内挂载页面；后台 Tab 增「概览」并置首；两处「管理后台」入口由 `#/admin/users` 改指 `#/admin` |
| `frontend/src/i18n/adminMessages.ts` / `styles.css` | 概览文案；六卡 / 堆叠 / 环形 / 米尺样式与 `--admin-chart-1..5` / `--admin-chart-track`，图例文字改用 `--ink-2` 满足 AA |
| `e2e/tests/admin.spec.ts` | 追加 M1–M5（默认落地与六卡、跳转边界、非管理员零请求、500 重试、快进 60 秒不轮询）；I1 入口改由概览进入 |
| `docs/knowledge/interfaces/README.md` | 新增「RouteME 管理后台概览」小节与 `/admin/dashboard` 行（0.18.0） |

## 2. 验证结果

详见 [`docs/ai4se-plugins/20261117-180500-local-verify-report.md`](../../docs/ai4se-plugins/20261117-180500-local-verify-report.md)。

| 层 | 结果 |
|---|---|
| 规格 | `openspec validate add-admin-dashboard --strict` → valid（5 / 13） |
| 契约 | `OpenApiTest` 12 / 12 |
| 后端 API | `AdminDashboardControllerTest` 12 / 12（A1–A8） |
| 后端聚合 | `AdminDashboardServiceImplTest` 6 / 6（U1 / U2） |
| 后端全量 | 453 tests / 3 failures（均为并行 V24 profile WIP）；排除后 430 / 430，BUILD SUCCESS |
| 前端单测 / 类型 / 构建 | 47 files / 357 tests；0 error；构建成功（2.11s） |
| E2E 后台 | `admin.spec.ts` 10 / 10（M1–M5 + I1–I3） |
| E2E 全量 | 143 tests / 108 passed / 35 failed（全部归因 HEAD 漂移、并行 WIP 或地图环境债务） |
| 走查 | 1440 / 768 / 390 × 浅 / 深色：无横向滚动、6 卡 / 4 堆叠 / 2 环形 / 2 米尺、对比度 6.94:1 / 6.39:1、0 值与长数字正常 |

## 3. Red → Green

- **契约 Red：** HEAD 内容 + 新 `OpenApiTest` → 12 run / 1 failure + 2 errors，`expected: <0.18.0> but was: <0.17.0>`，admin 路径缺失。
- **API Red：** HEAD 内容 + 新 `AdminDashboardControllerTest`（无控制器）→ 12 / 12 失败，`Status expected:<200> but was:<404>`。
- **纯函数 Red：** `Cannot find module './dashboardFormat'`；`route.test.ts` 2 失败，`notFound` ≠ `adminDashboard`。
- **E2E Red：** HEAD 前端 + 新 M1–M5 → 5 条失败（URL 仍为 `#/admin/users`、`dashboard-page` / `dashboard-error` / 守卫文案未找到），无超时。
- **Green：** 实现后端到前端后，上述四层全部转绿。

## 4. 反向复核

- `openapi.yaml` 仅新增 1 个路径与 7 个 schema；未改既有路径与 schema。
- 聚合只读：GET 前后不写 `completed_at`（A3 反向断言）；无缓存、无轮询、无迁移 / 索引 / 新表。
- 图表只有快照分布与两个窗口计数，无趋势 / 时间序列；`package.json` 未新增依赖。
- 可点击边界：仅用户、举报、客服三卡为 `<a>`；行程 / 申请 / 体验为 `<section>`，无 `href`、无 `tabIndex`、无点击。
- 状态口径单点：账号有效状态、行程五态、7 / 30 天窗口均只在服务端计算。

## 5. G2 签署表

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | 待签署 | 复核本地验证报告、Red/Green 证据与失败归因 | — |
| AO | 待签署 | 交付实现、测试与验证报告 | — |
| IO | 待签署 | 认可范围与验收口径（沿用 G1） | — |
| SA | Jacky（SA，当前开发者） | 实现符合 D1 展示口径与零写库边界 | 2026-11-17 |
| SM | 待签署 | 看板状态可推进到 P4 / 本地 Pass | — |

> 本地验证已 Pass，但 G2 的 VL / AO / IO / SM 签署尚未收集；未收集前不推进 P5，不合并到远端。

## 6. 条件与残余风险

- **共享服务：** 主工作区 8080 仍为旧版本，需重启才提供 `/api/admin/dashboard`；验证全程使用隔离 8081 + 临时库与 Vite 5199。
- **并行 WIP：** 后端 3 条 V24 profile 失败、`auth.spec.ts` 7 条、`credit.spec.ts` 1 条与地图 / 发布 18 条均非本 change 引入；本 change 的提交按 hunk 选择性暂存，不带走并行改动。
- **组件层无单测：** 仓库无 jsdom / Testing Library，卡片渲染回归依赖 E2E。
- **样式热点：** `styles.css` / `App.tsx` / `AppShell.tsx` 与其他会话共用，后续合并需抽查 `--admin-chart-*`、`.admin-*`、两处 `#/admin` 入口仍在。
- **P5：** `add-admin-console` 必须先于本 change 归档；P5 按既定要求暂不执行。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | `ff619fd` | `docs(p1): add-admin-dashboard proposal, delta spec and P1 review` |
| P2 | `a2ee518` | `docs(p2): add-admin-dashboard AC/DoV, consistency lint and G1` |
| P3 | `11077c5` | `docs(p3): add-admin-dashboard design, ATDD, tasks and quality check` |
| P4 实现 | 本条提交 | `feat(p4): add-admin-dashboard aggregate the admin overview`（含验证报告与 G2 记录） |

## 8. 下一阶段

- 收集 G2 签署（VL / AO / IO / SM）→ 签署通过后按 PR 流程合入；P5 待 `add-admin-console` 归档后再执行。