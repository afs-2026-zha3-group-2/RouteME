# P3 设计记录 — refine-my-trips

- **Change：** `refine-my-trips`（REQ-013 / S11 我的旅行）｜ **阶段：** P3（Design & task plan）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-my-trips`（P2 提交 `3391f61`）

## 1. 阶段目标

把 11 条 Delta 场景落成可实现、可验证的设计与任务：页面结构、纯逻辑接口、数据契约、同步副作用、文案键、样式与测试分层，同时保证不改分组规则、状态机与表结构。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 设计 | [`design.md`](../../../openspec/changes/refine-my-trips/design.md) | D1–D10；页面结构、纯逻辑接口、契约、行为细则、文案、样式、可访问性、测试、风险 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/refine-my-trips/atdd-design.md) | E1–E11 场景映射；U1–U5 单测；B1–B4 后端/契约；M1–M8 E2E；人工走查 |
| 任务 | [`tasks.md`](../../../openspec/changes/refine-my-trips/tasks.md) | T1–T7，含落点、依赖、验证命令与对齐自检 |
| 设计评审 | [`design-review`](../../reviews/20261116-refine-my-trips-design-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION |
| 任务评审 | [`tasks-review`](../../reviews/20261116-refine-my-trips-tasks-review.md) | Pass；0 BLOCKER / 0 WARNING / 2 SUGGESTION |
| 全量评审 | [`all-specs-review`](../../reviews/20261116-refine-my-trips-all-specs-review.md) | Pass；0 BLOCKER / 0 WARNING / 6 SUGGESTION |
| P3 质量报告 | [`20261116-174500-quality-checklist-report.md`](../../ai4se-plugins/20261116-174500-quality-checklist-report.md) | P3-1 ~ P3-4 Pass；Overall Pass |

## 3. 关键设计决策

- **单页结构（D1）。** `page-head` + `Segmented` 四段 + `.mine-row`（84px 封面 / 主列 / 动作列）；保留资料卡。
- **纯逻辑外置（§3.1）。** 计数、提醒目标、行动作与日期标签放 `mine/mineTrips.ts`，组件只渲染；node 环境可测。
- **契约只增（§4）。** `pending_applications: [{trip_id, count}]`，`required` 不变，空数组语义，旧后端 `?? []` 兼容。
- **提醒同源（§5.2）。** 页头「去处理」与行内「处理申请 · N」都取自同一字段，避免两条口径。
- **同步去重（§3.3）。** `visibilitychange` + `focus` 共用一个 in-flight Promise，分组切换不请求。
- **样式最小化（§7）。** 复用 `.cover-*`、`StatusBadge`、`EmptyState` 与既有令牌；只新增 `.mr-*` 与 ≤640px 断点。
- **`coverTone` 抽取（T3）。** 从 `TripCard` 抽到 `trips/coverTone.ts`，本页与卡片共用同一哈希；与 `refine-experience-share` 的同名抽取在合并时取其一。

## 4. 对齐自检（vs Delta Spec）

| Delta Scenario | 设计落点 | 任务 | ATDD |
|---|---|---|---|
| 分区展示我的旅行 | §2、§5.1 | T3 / T4 | E1 / M1 |
| 分组内容与计数一致 | §5.1 | T2 / T3 | E2 / B1 |
| 行内动作按分组提供 | §5.1 | T3 / T4 | E3 / U3 / M3–M5 |
| 待处理申请提醒 | §5.2 | T2 / T4 | E4 / B1–B3 / M2 |
| 无待处理申请 | §5.2 | T3 / T4 | E5 / U2 / M7 |
| 重新可见时同步状态 | §3.3 | T5 | E6 / M6 |
| 页内动作后同步状态 | §3.3 | T4 / T5 | E7 / M3–M5 |
| 分组空态给出主操作 | §2 | T4 | E8 |
| 窄屏动作不遮挡 | §7 | T5 | E9 / M8 |
| 安全提示常驻 | §10 | T6 | E10 |
| 提交举报并收到回执 | §10 | T6 | E11 |

- **无静默扩张：** `design.md` §10 列出不动的部分；`tasks.md` 无编辑 / 删除 / 参考发布 / 分页 / 轮询任务。
- **无遗漏场景：** 11 条场景全部有设计、任务与验收落点。

## 5. 测试与验证计划

| 层 | 命令 | 判据 |
|---|---|---|
| 单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | U1–U5 + 既有用例全绿 |
| 前端构建 | `npm run build` | `tsc --noEmit` + vite build 通过 |
| 后端 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 含 `OpenApiTest` / `MyTripsControllerTest` |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/mine.spec.ts tests/companions.spec.ts tests/experiences.spec.ts tests/profile.spec.ts` | M1–M8 + 回归全绿 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深 | 截图 6 张，无溢出、无重叠、动作同列 |

## 6. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO（作者） | Jay | 设计与任务可执行；承接 T1–T6 | 2026-11-16 |
| VL（审批） | Neal | 设计取舍、测试分层与验收判据 | 2026-11-16 |
| SM | Lewis | 排期确认 | 2026-11-16 |

**阶段结论：Pass（P3-1 ~ P3-4 全 Pass）。** 下一步 P4：实现 T1–T6 → 本地验证 → G2。

## 7. 阶段提交

- 提交信息：`docs(p3): refine-my-trips design atdd and task plan`
- push 前 `git pull --rebase origin main`；本阶段只提交本 change 路径。