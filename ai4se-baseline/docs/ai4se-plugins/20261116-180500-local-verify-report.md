# Local verify report — refine-my-trips

- **Date:** 2026-11-16 (Asia/Shanghai)
- **Change:** `refine-my-trips`（REQ-013 / S11 我的旅行）
- **Branch / worktree:** `feature/refine-my-trips` @ `D:\software\training\TATP\RouteMe\RouteME-s11`（base `origin/main@588ef9e`）
- **Environment:** Windows 11；Node `v24.18.0`；npm `11.16.0`；OpenJDK `21.0.11`；OpenSpec CLI `1.16.1`
- **Isolated services:** backend `PORT=8081` + `SPRING_DATASOURCE_URL=jdbc:sqlite:<worktree>/.tmp-e2e/routeme.db`；frontend `5174`/`5180`（`ROUTEME_API_TARGET=http://localhost:8081`）；E2E `ROUTEME_E2E_BASE_URL` / `ROUTEME_E2E_API_BASE`

## 1. 命令与结果

| 层 | 命令 | 结果 |
|---|---|---|
| 规格 | `openspec validate refine-my-trips --strict` | `Change 'refine-my-trips' is valid` |
| 规格结构 | `openspec show refine-my-trips --json --deltas-only` | `deltaCount: 1`、`spec: trip-companions`、`operation: MODIFIED` |
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B -ntp test` | **231 tests, 0 failures, 0 errors, 0 skipped**；BUILD SUCCESS |
| 后端聚焦 | `-Dtest=MyTripsControllerTest,OpenApiTest` | 12 tests 全绿（含新增 `pending_applications` 断言） |
| 前端静态 | `cd RouteME/frontend; npm run typecheck` | 退出码 0 |
| 前端单测 | `npm test` | **18 files / 153 tests passed**（新增 `mineTrips.test.ts` 5 组、`coverTone.test.ts` 3 组） |
| 前端构建 | `npm run build` | 成功；仅既有 chunk >500kB 警告 |
| E2E 新增 | `npx playwright test tests/mine.spec.ts` | **8 passed** |
| E2E 回归 | `npx playwright test tests/companions.spec.ts` | **8 passed**（分段控件断言改为 `.ant-segmented-item`） |
| E2E 全量 | `npx playwright test`（fresh SQLite） | **62 passed / 0 failed** |

## 2. 覆盖对照

| AC（issue #13） | 证据 |
|---|---|
| 分区展示四组 | `mine.spec.ts` M1 四段可见 + 计数 + 默认分组；`groupCounts` 单测 |
| 待处理可点击提醒 | M2「去处理」跳存在待处理申请的行程；行内「处理申请 · N」同目标；`pendingTargetTripId` 单测 |
| 与详情页状态一致 | M3 撤回、M4 退出、M5 完成写体验、M6 `focus` 后自动同步；页内动作 `reload(true)` |
| 每个条目可跳转 | 行标题链接 + 「查看」按钮；M1/M2 断言行与详情路由 |
| 窄屏不裁切/不重叠 | M8 390 视口 `mr-actions` 换行到 `mr-main` 之下；`mine-seg` 横向可滚动（scrollWidth 464 > clientWidth 350） |
| 安全与举报不回退 | `companions.spec.ts` 8/8 全绿（安全提示、举报回执、聊天只读） |

## 3. 人工走查

| 视口 | 浅色 | 深色 | 结论 |
|---|---|---|---|
| 1440 | ✅ | ✅ | 页头 / 资料卡 / 提醒 / 四段 / 行式列表；动作同列右对齐 |
| 768 | ✅ | ✅ | 分段一行完整；动作不换行、不遮挡 |
| 390 | ✅ | ✅ | 封面 + 主列，动作换到卡片下方；分段可横向滚动，标题可读 |

截图保存在会话工作区（`mine-1440-light/dark`、`mine-768-light`、`mine-390-light/dark`），不入库以避免二进制膨胀。

## 4. 与计划的偏差

| 项 | 偏差 | 处理 |
|---|---|---|
| 截图入库 | `tasks.md` T6 原写 `docs/preview/refine-my-trips/` | 改为存会话工作区并在本报告说明；不改变验收结论 |
| E2E 端口 | 本地 5173/5174/8080 被并行会话占用 | `vite.config.ts` 增加 `ROUTEME_API_TARGET`，`playwright.config.ts` 增加 `ROUTEME_E2E_BASE_URL`，`profile.spec.ts` 增加 `ROUTEME_E2E_API_BASE`（默认值不变） |
| E2E 数据自清理 | 新增 spec 造 10+ 条行程会挤占首页分页 | `mine.spec.ts` 用 `afterEach` 结束自己造的行程；全量套件在 fresh DB 上 62/62 |
| 390 分段 | `Segmented` 四段在 390 超宽 | 横向滚动 + 隐藏滚动条；满足 `design-system`「可横向滚动、不可读」场景 |
| 资料卡 | 原型无 `.mine-profile-card` | 保留（`add-user-profile` 规格与 `profile.spec.ts` 依赖），记为 known deviation |

## 5. 残余风险

- 并行 change `refine-experience-share` 会改同一页面的完成组体验入口；归档前需 rebase 后重跑 `experiences.spec.ts`。
- `trips.spec.ts` / `companions.spec.ts` 会往本地库累积行程；本地验证用独立 DB，CI 使用内存库不受影响。
- 契约 `pending_applications` 为可选字段；旧前端忽略、新前端 `?? []` 兼容。

## 6. 结论

**Overall Pass。** 后端 231、前端 153、E2E 62 全绿；规格 valid；三档视口与双主题走查通过。可进入 G2。