# Local verify report — add-admin-dashboard（P4 / G2 输入）

- **Change:** `add-admin-dashboard`（REQ-023 / S25 管理后台概览统计）
- **Branch:** `main`（P1 `ff619fd`、P2 `a2ee518`、P3 `11077c5`；基线 `b50e416`）
- **日期:** 2026-11-17 ｜ **记录人:** Jacky（SA，当前开发者）
- **Environment:** Windows 11；Node v24.22.1；OpenJDK 21.0.11；隔离后端 `localhost:8081`（临时 SQLite `%TEMP%\routeme-e2e-dashboard\dashboard.db`，Flyway V1–V24）；前端 Vite `localhost:5199`（`ROUTEME_API_TARGET=http://localhost:8081`）；Playwright Chromium。主工作区共享后端 8080 / 前端 5173 未触碰。

## 1. 命令与结果

| 层 | 命令（工作目录） | 结果 |
|---|---|---|
| 规格 | `npx --no-install openspec validate add-admin-dashboard --strict`（ai4se-baseline/） | `Change 'add-admin-dashboard' is valid`（5 Requirement / 13 Scenario） |
| 契约测试 | `.\mvnw.cmd -B -ntp test -Dtest=OpenApiTest`（backend/） | **12 tests / 0 failures**：版本 0.18.0、`ADMIN_CONSOLE_PATHS` 17 个操作、七组 schema 键集合 |
| 后端 API | `.\mvnw.cmd -B -ntp test -Dtest=AdminDashboardControllerTest`（backend/） | **12 tests / 0 failures**（A1–A8） |
| 后端聚合 | `.\mvnw.cmd -B -ntp test -Dtest=AdminDashboardServiceImplTest`（backend/） | **6 tests / 0 failures**（U1 / U2） |
| 后端全量 | `.\mvnw.cmd -B -ntp test`（backend/） | **453 tests / 3 failures**；3 条均为并行会话的 V24 profile 断言（见 §4） |
| 后端回归（排除外部 WIP） | `.\mvnw.cmd -B -ntp test "-Dtest=!UserProfileControllerTest,!ProfileDataMigrationSqliteTest,!ProfileMigrationSqliteTest"`（backend/） | **430 tests / 0 failures / 0 skipped**，BUILD SUCCESS |
| 前端单测 | `npm test`（frontend/） | **47 files / 357 tests passed**（新增 `dashboardFormat.test.ts` 与 `route.test.ts` 补充） |
| 前端类型 | `npm run typecheck`（frontend/） | 0 errors |
| 前端构建 | `npm run build`（frontend/） | 成功（2.11s，1623 modules）；仅既有主 chunk 1,612.37 kB / gzip 504.52 kB 警告 |
| E2E 新增 + 既有后台 | `npx playwright test tests/admin.spec.ts`（e2e/，`ROUTEME_E2E_BASE_URL=http://localhost:5199`） | **10 passed**（M1–M5 + I1–I3） |
| E2E 全量 | `npx playwright test`（e2e/，同一隔离栈） | **143 tests / 108 passed / 35 failed**（13.9m），逐项归因见 §4 |
| 视觉走查 | Playwright 截图 `docs/preview/req023-dashboard-{1440,768,390}-{light,dark}.png` + `req023-dashboard-long-{1440,390}-light.png` | 三档 × 双主题无横向滚动；六卡、四条堆叠、两环形、两米尺齐全；控制台 0 error |

## 2. Red → Green（TDD / ATDD 证据）

在 `%TEMP%\req023-red\` 的 **HEAD `11077c5` 内容快照**上运行新验收物，证明失败来自缺失行为而非环境：

| 阶段 | 观察 |
|---|---|
| Red A（契约） | HEAD `openapi.yaml`（0.17.0）+ 新 `OpenApiTest`：`Tests run: 12, Failures: 1, Errors: 2`；`info.version ==> expected: <0.18.0> but was: <0.17.0>`，`/admin/dashboard` 与七组 schema 路径不存在 |
| Red B（后端 API） | HEAD 内容 + 新 `AdminDashboardControllerTest`（故意不放控制器）：`Tests run: 12, Failures: 12`，首条 `java.lang.AssertionError: Status expected:<200> but was:<404>` |
| Red C（前端纯函数） | HEAD 内容 + 新 `dashboardFormat.test.ts`：`Cannot find module './dashboardFormat'`（0 test）；`route.test.ts` 2 failed，`expected { name: 'notFound' } to deeply equal { name: 'adminDashboard' }` |
| Red D（E2E） | HEAD 前端（临时 Vite 5198 + 隔离后端 8081）+ 新 `admin.spec.ts` M 组：**5 failed** —— M1 `toHaveURL(/#\/admin$/)`（HEAD 的「管理后台」仍指向 `#/admin/users`）；M2 / M5 `dashboard-page` 元素未找到；M3 `没有访问权限` 未找到；M4 `dashboard-error` 未找到。全部为元素 / URL 缺失，无环境错误与超时 |
| Green | 契约 → 响应 record → 聚合服务 → 控制器 → 纯函数 → 类型 / 请求 → 页面 / 图表 → 路由导航 → E2E，上述用例全部转绿（§1） |

## 3. 验收场景 → 用例对照

| Delta 场景 | 用例 | 结果 |
|---|---|---|
| 管理员读取概览统计 | A1、M1、M2 | Pass |
| 非管理员与未认证被拒绝 | A2、M3 | Pass |
| 写入后立即反映 | A3（新建行程 / 举报后 GET 立即变化，GET 前后不写 `completed_at`） | Pass |
| 空库返回固定零值 | A4 / U1 | Pass |
| 封禁到期的账号计入正常 | A5 | Pass |
| 已取消行程与全部申请状态都计入 | A6 | Pass |
| 总数与分桶自洽 | A7 / U1 | Pass |
| 新增计数按产品时区自然日窗口 | A8 / U2（边界前一毫秒、边界当刻、未来时间、`created_at=null`） | Pass |
| 管理员进入后台默认看到概览 | M1（管理后台入口 → `#/admin`、首 Tab「概览」、六卡、更新时间） | Pass |
| 指标卡与跳转边界 | M2（仅用户 / 举报 / 客服三卡为链接；行程 / 申请 / 体验不可点） | Pass |
| 非管理员直接访问被拒绝 | M3（守卫文案可见，且 0 条 dashboard 请求） | Pass |
| 加载失败可重试 | M4（注入 500 → 错误态 → 重试恢复） | Pass |
| 手动刷新且不自动轮询 | M5（`page.clock` 快进 60 秒，稳定后不再新增请求） | Pass |

## 4. 回归结果与失败归因

全量 E2E：**108 passed / 35 failed**。失败全部落在 7 个本 change 未触碰的文件：

| 失败组 | 数量 | 归因与证据 |
|---|---|---|
| `auth.spec.ts` | 7 | **HEAD 既有红**：HEAD 的 `auth.spec.ts` 断言「已登录 / 退出登录 / id-switch-label」，HEAD 的 `AppShell.tsx` 三者都不存在（`git show` 逐项核对）；属既有功能与用例漂移 |
| `credit.spec.ts` | 1 | 用例断言未认证 `GET /api/admin/users` → 404，实际 401；`add-admin-console`（`4308955`）已把该路由改为需鉴权，而 `credit.spec.ts` 仍保留 404 期望；该文件与断言在 HEAD 未改动 |
| `map.spec.ts` | 9 | 缺高德 JS API / Web 服务 Key（`backend/amap-local.yml` 缺失），`china-map` / `city-map` / POI 均不渲染 |
| `trips.spec.ts` | 9 | 同上：地图 / 地点选择器依赖高德；另有种子出发日（2026-11-16）翻篇导致招募列表变化 |
| `profiles.spec.ts` | 5 | V24 改写演示资料（期望「研一 · 地理科学」但库内已变），且同批次前序用例累积「参与同行」到 4 |
| `profile.spec.ts` + `mine.spec.ts` | 3 | 并行会话的资料 WIP：`.mine-profile-card` / 「我的旅行」标题尚未在共享工作区落地 |
| `detail-companions.spec.ts` | 1 | 同上 V24 职业字段漂移，回退断言不再触发 |
| 其余 | 0 | 本 change 的 `admin.spec.ts` 10/10；`companions`、`experiences`、`detail-*` 其余用例全绿 |

结论：本 change 影响的全部用例（概览、指标卡跳转、守卫、重试、刷新、后台 I1–I3）通过；35 条失败可归因于 HEAD 既有漂移、并行 WIP 与本机地图环境债务，不构成回归。

## 5. 视觉与可访问性走查

| 检查 | 结果 |
|---|---|
| 1440 / 768 / 390 × 浅 / 深色 | 均无横向滚动（`scrollWidth == clientWidth`）；桌面 3 列、平板 2 列、手机单列 |
| 图表 | 每档 6 卡 / 4 堆叠条 / 2 环形 / 2 米尺；`role="img"` + `aria-label`，图例同时给出名称、数字、占比 |
| 对比度 | 图例与更新时间文字 `--ink-2`：浅色 **6.94:1**、深色 **6.39:1**（WCAG AA ≥ 4.5）；修正前 `--ink-3` 仅 4.09:1 |
| 极长数字 | 7 位总数 / 6 位分桶经 `1,234,567` 千分位渲染；1440 与 390 均无溢出 |
| 0 值 | 空桶仍列出键与 `0`，占比 `0%`（无 `NaN`）；环形为完整灰色底环、堆叠条为空轨道，圆心显示 `0` |
| 控制台 | 三档 × 双主题 0 条 error |

## 6. Non-goals 反向复核

- **无趋势 / 时间序列**：页面只有一次快照的 6 卡分布图与 7 / 30 天两个计数；无折线、无时间轴。
- **无图表依赖**：`frontend/package.json` 未改，环形 / 堆叠 / 米尺均为内联 SVG + CSS。
- **无迁移 / 索引 / 新表**：`db/migration/**` 无本 change 新增文件；`openapi.yaml` 仅新增路径与 7 个 schema（+300 −1）。
- **只读**：服务只做六次 `selectList(null)`，未调用 `findAllTrips()` / `materializeExpired()`；控制器写 `Cache-Control: no-store` 且无查询参数；页面无轮询、无缓存层。
- **口径单点**：有效账号状态复用 `AccountStatusService.effectiveStatus`；行程五态复用 `TripPlan.status(now)`；7 / 30 天窗口只在服务端计算，前端不做状态推导。
- **零扩张**：未新增列表页、导出、权限模型或主题。

## 7. 验证期修正

| # | 发现 | 处理 |
|---|---|---|
| 1 | 图例「占比」与更新时间用 `--ink-3`，实测对比度 4.09:1，低于 AA | 改为 `--ink-2`，复测 6.94:1 / 6.39:1；涉及 `.admin-chart-legend li`、`.admin-chart-legend-percent`、`.admin-meter-ratio`、`.admin-donut-center span`、`.admin-dashboard-updated` |
| 2 | `adminMessages` 残留未使用的 `dashboardTotal` / `dashboardNoData` | 删除，避免死文案 |
| 3 | React StrictMode 双调用 effect，M5 若断言「恰好 1 次请求」会误报 | 改为断言「稳定后不再新增请求」，符合「不轮询」的真实语义 |
| 4 | 主工作区共享后端 8080 版本陈旧，`/api/admin/dashboard` 返回 404 | E2E 与走查全部改用隔离栈（8081 + 临时库、Vite 5199），未重启共享服务 |

## 8. 数据卫生

- 后端 8081 使用临时 SQLite（`%TEMP%\routeme-e2e-dashboard\dashboard.db`），E2E 写入不落开发库。
- 主工作区并行会话的未完成改动（`e2e/tests/profile.spec.ts`、`frontend/src/i18n/tripMessages.ts`、`frontend/src/profile/ProfileSetupPage.tsx`、`App.tsx` / `AppShell.tsx` 的非本 change hunk、`V24__normalize_demo_user_profiles.sql`、两份 application yml、`weather-create-*.png`）均未纳入本次验证结论，也不会随本 change 提交。
- 临时 Red 快照位于 `%TEMP%\req023-red\`（不在仓库内），node_modules 为目录联接，可稍后直接删除。

## 9. 待办 / 残余风险

- **共享 8080 需重启**才能提供 0.18.0 概览端点；在此之前本机仅隔离 8081 可用。
- 后端 3 条 V24 profile 失败为并行会话数据 / 迁移 WIP，本 change 未触碰；待其收口后全量应回到全绿。
- `auth.spec.ts`（7）与 `credit.spec.ts`（1）为 HEAD 既有用例漂移，建议各自 change 修复，不并入本 change。
- 地图 / 发布类 18 条 E2E 依赖本机 `amap-local.yml` 与相对化种子日期，属既有环境债务。
- 组件层无 jsdom / Testing Library 基础设施，卡片渲染回归依赖 E2E。
- `styles.css` / `App.tsx` / `AppShell.tsx` 是并行修改热点；本 change 的提交需按 hunk 选择性暂存（已准备 `p4-App.tsx.patch` / `p4-AppShell.tsx.patch`）。