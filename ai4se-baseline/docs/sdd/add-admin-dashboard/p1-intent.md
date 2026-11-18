# P1 意图记录 — add-admin-dashboard

- **Change：** `add-admin-dashboard`（REQ-023 / S25 管理后台概览统计）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Jacky（SA）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@b50e416`（与 `origin/main` 同步）

## 1. 阶段目标

把「管理后台需要一个基础统计仪表盘」的诉求收敛为一个可判定的 REQ-023、影响面与 OpenSpec 提案：六组只读计数（用户 / 行程 / 同行申请 / 旅行体验 / 举报 / 客服会话）、一个端点、一个页面，并明确「只统计、不改状态机」的边界。本 change 不新增数据表，因此没有 P0 数据基线变更。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-023-admin-dashboard.md`](../../../requirement-workspace/intents/REQ-023-admin-dashboard.md) | 原始诉求、现状差距 8 项、裁决 D1–D15、归档顺序 |
| Ready 需求 | [`requirements/REQ-023-admin-dashboard.md`](../../../requirement-workspace/requirements/REQ-023-admin-dashboard.md) | 六字段 + 2 组场景索引（13 条）+ 12 项 OQ 默认裁决 + DoR（BLOCKER 0） |
| 故事 | [`stories/add-admin-dashboard.story.md`](../../../requirement-workspace/stories/add-admin-dashboard.story.md)、[`stories.md`](../../../requirement-workspace/stories.md) | S25，管理后台迭代 4，3 点；保留原始诉求、AC、场景与口径说明 |
| 登记 | [`registry.md`](../../../requirement-workspace/registry.md) | REQ-023 行（p1-in-progress） |
| 提案 | [`proposal.md`](../../openspec/changes/add-admin-dashboard/proposal.md) | Why / What Changes / 六组指标口径 / 故事映射 / 范围 / 影响面 / 17 项决策 / 12 条验收信号 / 11 项残余风险 / 交付边界 |
| Delta | [`specs/admin-dashboard/spec.md`](../../openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md) | ADDED 5 Requirement / 13 Scenario |
| 工件评审 | [`proposal-review`](../../reviews/20261117-add-admin-dashboard-proposal-review.md)、[`spec-review`](../../reviews/20261117-add-admin-dashboard-spec-review.md) | 2026-11-17，结论待签署 |

## 3. 关键决策

- **单 change / 单能力：** `admin-dashboard`（ADDED）；一个端点 + 一个页面，不拆 change。
- **指标范围：** 用户（总数 / 角色 / 有效状态 / 近 7·30 天新增）、行程（总数 / 五态 / 新增）、同行申请（总数 / 五态）、旅行体验（总数 / 新增）、举报（四态）、客服会话（三态）。
- **端点：** 单个 `GET /api/admin/dashboard`，一次往返返回六组；复用 `admin-console` 的 `role=ADMIN` 校验与前端 `AdminGuard`。
- **页面：** `#/admin` 作为后台默认落地页；`AdminLayout` 增加「概览」Tab；侧栏与移动端入口改指 `#/admin`；用户 / 举报 / 客服卡可跳转，行程 / 申请 / 体验卡不可点。
- **账号口径：** 总数含 `ADMIN`；角色与有效状态分桶各自求和等于总数；封禁到期的 `BANNED` 计入 `ACTIVE`。
- **行程口径：** 复用既有四态推导（取消 > 已结束 > 旅行中 > 满员 > 招募中），含 `cancelled`；不新增 `status` 列。
- **新增口径：** 按 `created_at`；窗口为产品时区（Asia/Shanghai）自然日，含当天共 7 / 30 天。
- **稳定性：** 状态桶零填充；不缓存；手动刷新、不轮询。
- **契约 / 迁移：** 0.18.0；**无迁移**，不占用 V25。
- **依赖：** `add-admin-console`（P3 pass，未归档）必须先归档；本 change 不 MODIFIED 任何既有能力。

## 4. 校验

- `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`（无 WARNING）。
- `openspec show add-admin-dashboard --json --deltas-only` → `deltaCount: 5`；1 份 delta、5 Requirement、13 Scenario。
- 首轮 `--strict` 曾因单条 Requirement 正文超过 500 字符报 WARNING；已按「一条需求只陈述一组行为」拆为 5 条 Requirement，复跑通过。
- 未运行后端 / 前端测试：P1 尚无实现，按 `all-specs-review` 记 N/A。契约 lint 与 E2E 属 P4。
- 已核对：`openapi.yaml` 当前 0.17.0，本 change 预约 0.18.0；`db/migration` 最新为 `V24__normalize_demo_user_profiles.sql`，本 change 不新增迁移。

## 5. 签署

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `proposal.md` | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `proposal` 评审报告 | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `proposal` 评审报告 | 2 | Jacky（SA） | 2026-11-17 | 已批准 |
| Delta Spec | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `spec` 评审报告 | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `spec` 评审报告 | 2 | Jacky（SA） | 2026-11-17 | 已批准 |

> 当前开发者已由发起人于 2026-11-17 确认为 Jacky（SA）。按 `@rule:artifact-review-gate`，`proposal` 与 Delta Spec 由 WAYNE 签署，两份评审报告由 WAYNE + Jacky 签署；六处已于 2026-11-17 按发起人确认签齐，P2 解锁。

## 6. 提交与偏离记录

- 本记录与 P1 工件已随本次阶段提交入库（2026-11-17，未 push）；提交哈希以 `git log --oneline -1` 为准。
- 未触碰并行会话的 WIP：`RouteME/e2e/tests/profile.spec.ts`、`frontend/src/App.tsx`、`frontend/src/i18n/tripMessages.ts`、`frontend/src/profile/ProfileSetupPage.tsx`、`frontend/src/shell/AppShell.tsx` 的在途改动均未暂存、未修改。本 change 只新增文档 / 规格文件。
- 若 `App.tsx` / `AppShell.tsx` 的并行改动在 P4 前合入，实现时以合入后的版本为基线，避免覆盖。