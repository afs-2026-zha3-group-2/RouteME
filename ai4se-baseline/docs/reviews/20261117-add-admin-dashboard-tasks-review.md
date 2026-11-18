# Tasks 评审报告 — add-admin-dashboard

- **工件：** `openspec/changes/add-admin-dashboard/tasks.md`（rev1，P3 首版）
- **change-id：** `add-admin-dashboard`
- **需求条目：** `requirement-workspace/requirements/REQ-023-admin-dashboard.md`（REQ-023 / S25）
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（focus = full；规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:web-testing`、`@rule:java-testing`、`@rule:git-branching-and-pr`；基线 `main@a2ee518`）
- **评审输入：** `tasks.md`；`design.md`、`atdd-design.md`（均已签署 2026-11-17）；Delta Spec（5 / 13）；`proposal.md`；`g1-decision.md`（C1–C6）；`OpenApiTest.java` 当前版本断言与 `16L` 管理员操作数；`backend/mvnw.cmd`、`e2e/playwright.config.ts`、`docs/knowledge/interfaces/README.md`
- **工具校验：** `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`；任务行 12 / 执行清单 12，逐条对应

## 1. 结论

**Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 3）

任务按「契约 → 后端红测 → 响应模型 → 聚合服务 → 控制器 → 前端纯函数 → 请求 / 类型 → 页面 → 路由导航 → E2E → 文档 → 回归」切片，一条任务一层，每层带落点、依赖、验收与验证代号。Delta 13 / 13 场景在 Design、Tasks、ATDD 三处均有落点；口径单点、只读约束、契约先行都在任务里可检查。对齐自检 Pass，可进入 P4。

## 2. Findings

| id | Severity | Rule | Location | Issue | Suggested fix | Authority | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| S-01 | SUGGESTION | `rules/testing/rules.md#web-testing` | `tasks.md` T2；`atdd-design.md` A4 | 「空库返回固定零值」在带种子数据的 `@SpringBootTest` 里没有真正的空库；若实现者按字面去清库，会引入脆弱夹具 | T2 只断言「六组键齐全 + 每个值为 ≥0 整数」，零填充数学交给 U1 纯函数；不为此改动全局测试数据 | `[fact]` | Jacky | 待 P4 |
| S-02 | SUGGESTION | `rules/process/rules.md#artifact-review-gate` | `tasks.md` T9；`shell/AppShell.tsx`、`App.tsx` | 这两处正被其他并行会话修改（工作区已有未提交改动），T9 若整文件暂存会把别人的 WIP 带进本 change 的提交 | 实现时只暂存与本 change 相关的行（Tab 联合、TABS 顺序、两处 `href`、`adminDashboard` 分支），提交前用 `git diff --cached` 复核 | `[fact]` | Jacky | 待 P4 |
| S-03 | SUGGESTION | `rules/testing/rules.md#web-testing` | `tasks.md` T12 | 「E2E 全量」在本地耗时较长，容易在 PR 前被跳过 | 先跑 `tests/admin.spec.ts` 单条闭环，再跑全量；结果与命令写进 P4 报告，不删减用例 | `[inference]` | Jacky | 待 P4 |

**Counts：** BLOCKER 0 / WARNING 0 / SUGGESTION 3 → **Pass**

## 3. 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | 结论 | 证据 |
|---|---|---|
| 13 / 13 场景有 Design 落点 | Pass | `design.md` §3–§5；`tasks.md` §3 映射表 |
| 13 / 13 场景有 Tasks 落点 | Pass | §3 映射表；12 条任务无孤儿 |
| 13 / 13 场景有 ATDD 落点 | Pass | `atdd-design.md` §1.1 A1–A8 / M1–M5 |
| 一条任务一层 | Pass | 落点列只有 `contract` / `backend` / `frontend` / `e2e` / `docs` / `verify` |
| 契约先行 | Pass | T1 先于 T3–T10；T7 类型对齐后才写 T8 |
| 口径单点 | Pass | 有效状态 / 五态 / 窗口只在 T4；T6 / T8 无推导 |
| 只读约束 | Pass | T4 明确禁用 `findAllTrips()` / `materializeExpired()`；T2 有反向检查 |
| 非目标无扩张 | Pass | 无趋势、缓存、导出、迁移、索引、新列表页、轮询、图表库 |
| 验证命令真实可跑 | Pass | `mvnw.cmd`、`npm run typecheck/build/test`、`npx playwright test`、`openspec validate` 均为仓库既有脚本；`16L → 17` 与 `0.17.0 → 0.18.0` 已对照 `OpenApiTest.java` |
| 风险与回退 | Pass | §4 六项，含契约号段、E2E 虚拟时钟、并行会话冲突、归档顺序 |

## 4. 残余风险

- **并行会话冲突。** `App.tsx`、`AppShell.tsx` 当前有他人未提交改动；T9 需按行暂存（S-02）。
- **契约号段 0.18.0。** 若被在途 change 预约，需顺延并同步两处版本断言。
- **E2E 未入 CI。** 沿用现状，P4 报告记录本地命令与结果。
- **`add-admin-console` 未归档。** P5 前先归档（C6）。
- **全表扫描。** 已记录在 `design.md` §4.6，本轮不加索引。

## 5. 下一步（非 Gate）

- 按 `@rule:artifact-review-gate` 收集签署：`tasks.md` 由当前开发者 + 1 名非当前开发者且非 WAYNE 的成员签署；本报告由 WAYNE + 当前开发者签署。
- 签齐后执行 `/sdd:quality-checklist`（P3），再写 `docs/sdd/add-admin-dashboard/p3-design.md` 与 P3 质量报告。
- 进入 P4 时按 T1 → T12 顺序，先契约与红测。

## 6. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 | 状态 |
|---|---|---|---|---|---|---|
| `tasks.md` | 工件 1（当前开发者） | Jacky（SA） | 2026-11-17 | 发起人确认 | 12 条任务、验证命令、对齐自检 | 已批准 |
| `tasks.md` | 工件 2（非当前开发者、非 WAYNE） | Karena（SA） | 2026-11-17 | 发起人确认 | 12 条任务、验证命令、对齐自检 | 已批准 |
| 本报告 | 报告 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人确认 | 评审结论与 S-01 ~ S-03 | 已批准 |
| 本报告 | 报告 2（当前开发者） | Jacky（SA） | 2026-11-17 | 发起人确认 | 评审结论与 S-01 ~ S-03 | 已批准 |

> 当前开发者：Jacky（SA）。第二签署人 Karena 不是当前开发者、也不是 WAYNE，符合矩阵。四条记录齐备，P3 质量检查解锁。