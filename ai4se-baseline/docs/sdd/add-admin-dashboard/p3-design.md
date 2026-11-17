# P3 设计记录 — add-admin-dashboard

- **Change：** `add-admin-dashboard`（REQ-023 / S25 查看平台概览统计）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-17 ｜ **记录人：** Jacky（SA，当前开发者）
- **分支 / 基点：** `main`（P2 提交 `a2ee518`，基于 `ff619fd`）

## 1. 阶段目标

把 P2 的 5 条 Requirement / 13 条场景落成可执行的设计与任务：一个只读端点、一次请求一个时刻、六次列表查询、零填充固定键；前端只做格式化与渲染，图表只表达快照分布。同时记录查询条数与索引现状（C4）、把「概览」置于后台首位并改指 `#/admin`（C5），并确认契约 0.18.0 的键名与状态词表（C2）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 设计 | [`design.md`](../../../openspec/changes/add-admin-dashboard/design.md) | 组件与职责、契约与键名表、后端聚合、前端六卡、测试策略、8 条被否决方案、C1–C6 对照 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-admin-dashboard/atdd-design.md) | 13 / 13 场景分层（API 8 / E2E 5）、Defer-UT 4 项、本地与 CI 门禁、夹具策略、8 条非目标反向检查 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-admin-dashboard/tasks.md) | 12 条任务，一条一层（contract / backend / frontend / e2e / docs / verify） |
| 设计与 tasks 评审 | [`design-review`](../../reviews/20261117-add-admin-dashboard-design-review.md)、[`tasks-review`](../../reviews/20261117-add-admin-dashboard-tasks-review.md) | 均 Pass；design 的 WARNING 1 在评审中已修，SUGGESTION 4 + 3 |
| 质量报告 | [`20261117-173213-quality-checklist-report.md`](../../ai4se-plugins/20261117-173213-quality-checklist-report.md) | P3-1 ~ P3-4 全部 Pass；Overall Pass |
| 检查点 | [`20261117-173133-quality-checklist-checkpoints.md`](../../ai4se-plugins/20261117-173133-quality-checklist-checkpoints.md) | C1 = p3、C2 = full-stage；probe 无缺失 |
| 规格修正（引用） | [`spec-review`](../../reviews/20261117-add-admin-dashboard-spec-review.md) | wire 字段 camelCase → snake_case，语义未变，复用原 `Pass` 并追加变更摘要 |

## 3. 关键设计决策

- **单端点、单时刻。** `GET /api/admin/dashboard` 在一次请求里读取 `clock.instant()`，六张表各一次 `selectList(null)`；总数与分桶来自同一份内存列表，不做 N+1、不做两次查询。
- **只读优先于复用便利。** 不调用 `TripPlanService.findAllTrips()`：它带 `@Transactional` 且先 `materializeExpired()` 写库。改为直接读 `TripPlanMapper` 后调 `TripPlan.status(now)`，保持端点只读。
- **口径不复制。** 账号状态只调 `AccountStatusService.effectiveStatus`（封禁到期 → `ACTIVE`）；行程只调 `TripPlan.status(now)`（取消 > 已结束 > 旅行中 > 满员 > 招募中）。设计里没有第二套判定。
- **零填充固定键。** 六组 `by_*` 用 `LinkedHashMap` 先放全部键 = 0；`required` 全集 + `additionalProperties: false` 在契约中锁定键集合；`OpenApiTest` 字面断言六组键。
- **键名两套既有词表。** 账号 / 举报 / 会话用大写 `code()`，行程 / 申请用小写 `wireValue()`；不新造第三套，避免与用户侧列表不一致。
- **窗口按自然日。** `Asia/Shanghai` 当天 + 前 6 / 29 天，区间左闭右闭到 `now`；只看 `created_at`，不看状态变更时间。
- **图表无新依赖。** 堆叠条用 flex 百分比、环形用内联 SVG；只画本次快照分布，无时间轴、无趋势（提案 Out of scope）。
- **可点边界。** 用户 / 举报 / 客服卡为 `<a>`；行程 / 申请 / 体验卡为 `<section>`，无 `href`、不可聚焦。
- **手动刷新。** `useEffect` 只依赖 `reloadKey` / `token`；无 `setInterval`、无推送；失败态给重试。
- **契约 0.18.0。** 新路径 + 7 个 schema + `Cache-Control: no-store`；`OpenApiTest` 版本两处、管理员路径与操作数 16 → 17。

## 4. 校验

- `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`（5 Requirement / 13 Scenario）。
- 对齐自检：13 / 13 场景在 Delta → Design → Tasks → ATDD 四处均有落点；12 条任务无孤儿；口径单点与只读约束可检查。
- 任务结构：任务行 12、执行清单 `- [ ]` 12；每行带落点层、依赖、验收、验证代号。
- 契约事实核对：`OpenApiTest` 当前 `0.17.0` 两处、`assertEquals(16L, adminOperations)`；任务 T1 明确改为 `0.18.0` 与 `17`。
- 索引事实核对：`reports (status, created_at)`、`customer_service_sessions (status, created_at)` 存在；`app_users` / `trip_plans` / `trip_applications` / `trip_experiences` 无概览所需复合索引，已在 `design.md` §4.6 记录。
- 未运行后端 / 前端测试：P3 不产生实现代码，`mvn test` / `npm test` 记 N/A；契约 lint、单测与 E2E 属 P4。
- NFR 范围：发起人 2026-11-17 确认不纳入性能 / 可观测性自动化，`atdd-design.md` §6 已记录。

## 5. 签署

| 对象 | 签署位 | 批准人 | 日期 |
|---|---|---|---|
| `design.md` + `atdd-design.md` | 工件 1（当前开发者） | Jacky（SA） | 2026-11-17 |
| `design.md` + `atdd-design.md` | 工件 2（非当前开发者、非 WAYNE） | Karena（SA） | 2026-11-17 |
| `tasks.md` | 工件 1（当前开发者） | Jacky（SA） | 2026-11-17 |
| `tasks.md` | 工件 2（非当前开发者、非 WAYNE） | Karena（SA） | 2026-11-17 |
| 设计评审报告 | WAYNE + 当前开发者 | WAYNE（IO）、Jacky（SA） | 2026-11-17 |
| tasks 评审报告 | WAYNE + 当前开发者 | WAYNE（IO）、Jacky（SA） | 2026-11-17 |

**阶段结论：Pass（P3 4 / 4 required Pass）**

## 6. 提交与原计划差异

- 阶段提交：`docs(p3): add-admin-dashboard design, ATDD, tasks and quality check`（仅 P3 工件与规格命名修正；不含并行会话的在途改动）。
- 范围差异：无。Delta 只做 wire 字段 snake_case 命名修正，语义与场景不变。
- 未决项：契约号段 0.18.0 需 P4 定稿前复核；`add-admin-console` 归档为本 change 归档的硬前置（C6）；E2E 未入 CI 沿用现状。