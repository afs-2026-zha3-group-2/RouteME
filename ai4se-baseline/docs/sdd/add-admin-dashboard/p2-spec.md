# P2 规格记录 — add-admin-dashboard

- **Change：** `add-admin-dashboard`（REQ-023 / S25 查看平台概览统计）｜ **阶段：** P2（Delta Spec & G1）
- **日期：** 2026-11-17 ｜ **记录人：** Jacky（SA，当前开发者）
- **分支 / 基点：** `main`（P1 提交 `ff619fd`，基于 `b50e416`）

## 1. 阶段目标

把 P1 提案收敛为可实现的增量规格，并用 AC / DoV、一致性与 G1 三个检查确认：六组计数与页面的范围无静默扩张、口径只定义一次、13 条场景可判定，并锁定「只读聚合、零填充、不缓存」「有效状态按读取口径」「行程复用既有五态推导」三条硬约束。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/admin-dashboard/spec.md`](../../../openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md) | ADDED 5 Requirement / 13 Scenario；纯新增，不改写既有能力 |
| AC / DoV 评审 | [`dov-ac-review.md`](../../../openspec/changes/add-admin-dashboard/dov-ac-review.md) | AC 5/5 Pass、DoV 5/5 Pass、REQ 映射 13/13、故事 AC 12/12 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-admin-dashboard/consistency-lint.md) | Pass；0 BLOCKER / 0 WARNING / 7 SUGGESTION / 4 N/A |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-admin-dashboard/g1-decision.md) | **Pass**；IO = WAYNE，SA = Karena；条件 C1–C6 |
| 质量报告 | [`20261117-171200-quality-checklist-report.md`](../../ai4se-plugins/20261117-171200-quality-checklist-report.md) | P2-1 ~ P2-3 Pass；P2-4 Pass；P2-5 N/A；Overall Pass |
| P1 评审（引用） | [`proposal-review`](../../reviews/20261117-add-admin-dashboard-proposal-review.md)、[`spec-review`](../../reviews/20261117-add-admin-dashboard-spec-review.md) | 均 Pass，WAYNE + Jacky 签署齐备 |

## 3. 关键收敛

- **纯 ADDED。** 概览是全新能力；`trip-plans` / `user-auth` / `trip-companions` / `trip-experiences` 一个 Requirement 块都不改，P5 只新增 `admin-dashboard`。
- **单端点单页面。** `GET /api/admin/dashboard` 一次返回六组；`#/admin` 作为后台默认落地页；不为六组各开端点或 schema。
- **统计即时算、不缓存。** 每次请求即时查询；不引入物化表、快照或定时任务；「写入后再次请求数字变化」写成场景。
- **有效状态是读取口径。** `BANNED` 且解封时间已过计入 `ACTIVE`，不触发写回；用户总数含 `ADMIN`，角色与有效状态分桶之和都等于总数。
- **行程状态不落库。** 复用「取消 > 已结束 > 旅行中 > 满员 > 招募中」的既有推导，不新增 `status` 列；已取消行程计入总数与 `cancelled` 桶。
- **窗口固定为自然日。** 近 7 / 30 天 = 产品时区（Asia/Shanghai）当天 + 前 6 / 29 个自然日，含当天；按 `created_at`，不用滚动小时。
- **零填充与跳转边界。** 所有状态键固定返回，0 不省略；用户 / 举报 / 客服卡可跳，行程 / 申请 / 体验卡只展示数字（后台无对应列表页）。
- **契约增量、无迁移。** `openapi.yaml` 0.17.0 → 0.18.0；不新增表 / 列 / 索引 / 种子，不占用迁移号。

## 4. 校验

- `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`，无 WARNING。
- `openspec show add-admin-dashboard --json --deltas-only` → `deltaCount: 5`；1 份 delta、5 Requirement、13 Scenario。
- 场景计数：`#### Scenario:` 13 条；5 条 Requirement 均 ≥ 1 条场景。
- 引用可达性：提案 8 个 `@rule:` 锚点 8/8 解析到 `docs/knowledge/rules/**/rules.md`。
- 契约 / 迁移核对：`openapi.yaml` 当前 0.17.0，仓库内无其它 0.18.0 预约；`db/migration` 最新为 `V24__normalize_demo_user_profiles.sql`（属并行会话），本 change 不新增迁移。
- 未运行后端 / 前端测试：P2 尚无可执行实现，按 `all-specs-review` 记 N/A；契约 lint、单测与 E2E 属 P4。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta 归属 `admin-dashboard`、六组指标范围、`#/admin` 落地与跳转边界 | 2026-11-17 |
| SA | Karena | 场景可判定、有效状态 / 五态推导 / 自然日窗口口径可验证 | 2026-11-17 |
| 当前开发者 | Jacky（SA） | 承接 P3–P4；G1 条件 C1–C6 | 2026-11-17 |

**阶段结论：Pass（G1 Pass）**

## 6. 提交与原计划差异

- 阶段提交：`docs(p2): add-admin-dashboard AC/DoV, consistency lint and G1`（仅 P2 工件；不含并行会话的在途改动）。
- 范围差异：无。
- 未决项：G1 条件 C1–C6 已指派，无遗留阻塞；`add-admin-console` 归档顺序为 P5 硬前置。