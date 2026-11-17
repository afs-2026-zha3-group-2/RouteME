# tasks 评审报告 — add-experience-photos

- **工件：** `openspec/changes/add-experience-photos/tasks.md`
- **change-id：** `add-experience-photos`
- **评审日期：** 2026-11-17
- **评审方式：** `all-tasks-review`（规则：`@rule:artifact-review-gate`、`@rule:sdd-artifacts`、`@rule:web-testing`、`@rule:spec-first`）
- **评审输入：** G1 Delta（23 Scenario）；`design.md`（D1–D13）；`atdd-design.md`（A1–A7 / E1–E5 / R1–R4 / U1–U4）；`tasks.md` §9 对齐自检；现有 CI（backend `mvnw verify`、frontend `build && test`）

## 评审结论

**Pass**

12 个任务覆盖 5 条 Requirement / 23 个 Scenario，D1–D13 无悬空，ATDD 两层与 Defer UT 均有落点；任务单层、契约先行、每任务带可执行验证命令；无 out-of-scope 与新增 CI 产品。评审发现的 1 条 WARNING 已在 P3 修正，3 条 SUGGESTION 留 P4 执行时确认。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 处理 | 状态 |
|---|---|---|---|---|---|---|
| T3-01 | WARNING | `@rule:web-testing` | T11 验证命令 | 原写 `npm run typecheck && npm test && npm run build`，在 Windows PowerShell 下 `&&` 不可用，命令无法直接执行 | 改为分步执行并注明「PowerShell 用分号或分开执行」 | 已修正 |
| T3-02 | SUGGESTION | `@rule:web-testing` | T10 | E2E 命令未写工作目录，易在仓库根误执行 | 增加「在 `ai4se-baseline/RouteME/e2e` 目录执行」 | 已修正 |
| T3-03 | SUGGESTION | `@rule:prototype-ui-alignment` | T7 | 原型核对只写「浏览器逐屏截图」，未定义留证形式 | P4 在 `p4-apply.md` 记录截图路径与 1440 / 1024 / 768 / 390 × 浅 / 深色结论 | 留 P4 |
| T3-04 | SUGGESTION | `@rule:spec-first` | T1 | 契约错误示例需同时覆盖 401 / 403 / 400 三类，避免只写成功示例 | P4 执行 T1 时按 `design.md` §2 错误码表逐条补示例 | 留 P4 |
| T3-05 | SUGGESTION | `@rule:sdd-artifacts` | T12 | `local-verify` 报告时间戳格式未固定 | 按 `docs/ai4se-plugins/<yyyymmdd-HHMMSS>-local-verify-report.md` 命名 | 留 P4 |

## 校验证据

- 任务 → Requirement 映射：ADDED 2 条（9 Scenario）+ MODIFIED 3 条（14 Scenario）= 23，全部有任务承接（`tasks.md` §9 S1–S5）。
- 任务 → Decision：D1–D13 全部有落点（S6）。
- 任务 → ATDD：A1–A7 / E1–E5 / R1–R4 全覆盖，U1–U4 只在 P4 实现（S10）。
- 任务层次：T1 契约 / T2 数据 / T3 纯逻辑 / T4–T6 后端 / T7–T9 前端 / T10 E2E / T11 验证 / T12 文档（S7）。
- 依赖图：后端链 T1→T6 串行；T7 可并行；T8 / T9 依赖 T5 与 T7；T11 为唯一全量门禁（§8）。
- 无 `pom.xml` / `package.json` 新增依赖；未新增 CI 产品；E2E 不入 CI（S12）。

## 残余风险

- E2E 不在 CI，上传用例依赖本地隔离环境；回归靠 T11 本地执行。
- T7 原型与 T8 / T9 实现存在视觉偏差风险，按 4 宽度 × 2 主题核对。
- 契约 / 迁移排号可能在 P4 期间被 `add-ai-itinerary` 抢占，T12 负责顺延。
- 浏览器缓存 24h 与删除语义的已知限制由 design 记录。

## 批准记录

- **批准人（tasks）：** Jay（AO）+ Jacky（SA）
- **批准时间：** 2026-11-17
- **批准来源：** 用户在 2026-11-17 会话中确认「全部批准」，第二签署人选定 Jacky
- **签署位：** 当前开发者 Jay + 1 名非 Jay 且非 WAYNE 的成员（`@rule:artifact-review-gate`）
- **报告签署：** WAYNE + Jay — 2026-11-17
- **批准范围：** 批准 tasks 作为 P4 执行计划；T3-03 / T3-04 / T3-05 在执行时确认。
