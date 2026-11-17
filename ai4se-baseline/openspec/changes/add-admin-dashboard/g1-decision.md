# G1 decision — add-admin-dashboard

- **Gate:** G1（Align）
- **Change:** `add-admin-dashboard`（`admin-dashboard` ADDED，REQ-023 / S25 查看平台概览统计）
- **Timestamp:** 2026-11-17T17:10+0800
- **Recorded by:** Jacky（SA，当前开发者）；评审意见由 AI agent 起草，批准由具名人员按矩阵签署

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | Why / What Changes / 六组指标口径 / In-Out scope / 17 条决策 / 影响面 / 11 项残余风险齐全 |
| Delta Spec — `admin-dashboard` | [`specs/admin-dashboard/spec.md`](specs/admin-dashboard/spec.md) | 5 Requirement / 13 Scenario；ADDED；`openspec validate add-admin-dashboard --strict` → valid，`deltaCount: 5` |
| Living Spec baseline | `openspec/specs/{trip-plans,user-auth,trip-companions,trip-experiences}/spec.md` | 不改写任何既有 Requirement 块；本 change 只读取既有状态推导与权限模型 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 5/5 Pass；DoV 5/5 Pass；REQ 映射 13/13；故事 AC 12/12；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 7 / N/A 4 |
| P1 proposal review | `docs/reviews/20261117-add-admin-dashboard-proposal-review.md` | Pass；WAYNE（IO）+ Jacky（SA）签署齐备 |
| P1 spec review | `docs/reviews/20261117-add-admin-dashboard-spec-review.md` | Pass；WAYNE（IO）+ Jacky（SA）签署齐备 |
| Requirements | `requirement-workspace/requirements/REQ-023-admin-dashboard.md` | 13 场景；blocking OQ 0；DoR BLOCKER 0 |
| Intent | `requirement-workspace/intents/REQ-023-admin-dashboard.md` | 候选能力 ADDED；Discovery Decision `Go` |
| User decision | 2026-11-17「admin account which provide basic dashboard for statistics and count of different users etc」 | 六组指标范围与 `#/admin` 落地页已由用户确认 |
| Implementation evidence | `frontend/src/route.ts`、`shell/AppShell.tsx`、`admin/AdminLayout.tsx`、`controller/Admin*Controller.java`、`pojo/TripPlan.java`、`service/AccountStatusService.java`、`V21__admin_console.sql` | `#/admin` 无路由、后台无概览页、无 `dashboard` 端点；行程五态与账号惰性解封为既有口径 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-023 一致：六组只读计数 + `#/admin` 概览页；无趋势图、无缓存 / 物化、无导出、无新表 / 迁移、无新列表页 | `proposal.md` §范围；`dov-ac-review.md` §Proposal → Delta 覆盖 |
| Ambiguity | 无未决歧义：7 / 30 天为 Asia/Shanghai 自然日含当天；用户总数含 `ADMIN`；封禁到期按读取口径计入 `ACTIVE`；行程五态复用既有推导；零值不省略 | `dov-ac-review.md` §规格解释裁决 1–7 |
| Conflict | 无阻塞冲突；依赖 `add-admin-console`（`p3-pass` 未归档）先归档，已在提案第 9 行与残余风险登记 | `consistency-lint.md` L-07 |
| Traceability | REQ-023 13/13 有 Delta 落点；故事 S25 12 条 AC 12/12；提案 In scope 10 项中 9 项在 Delta、第 10 项（契约 / 测试）显式属 P4 | `dov-ac-review.md` §Requirement mapping / §Story AC mapping |
| Residual risk | N+1 有效状态、总数与分桶不自洽、索引缺失、字符串时间解析、契约号段、Tab 落点、E2E 未入 CI | `dov-ac-review.md` §残余风险 R-1 ~ R-7 |

## Decision

**Pass**

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | `design.md` 明确单次请求固定一个 `Clock` / `Instant`，有效状态与行程状态批量推导，禁止逐行 N+1（R-1 / L-06） | Jacky | P3 design |
| C2 | 契约固定：`generatedAt` 必填 ISO-8601；`AdminDashboard` schema 用 `enum` 锁定全部状态键（账号 / 举报 / 会话大写，行程 / 申请小写）；0.18.0 定稿前复核号段（R-5 / L-02 / L-04） | Jacky | P3 / P4 |
| C3 | P4 测试覆盖：零填充、封禁到期前后、7 / 30 天窗口在 Asia/Shanghai 00:00 的边界、取消行程从「招募中」移入「已取消」、`total = 分桶之和`、受限管理员 403、非管理员不发起 `/api/admin/**`（R-2 / R-4 / L-03） | Jacky | P4 |
| C4 | 设计记录查询条数与索引现状；不新增索引 / 迁移，数据增长后另开需求（R-3 / L-05） | Jacky | P3 |
| C5 | 「概览」Tab 置于首位、入口改指 `#/admin` 写进 `design.md`；页面只手动刷新，不轮询（L-01） | Jacky | P3 |
| C6 | P5 归档前确认 `add-admin-console` 已归档且 `admin-console` Living Spec 存在；同时把「四态」统一为「五态（含已取消）」（L-06 / L-07） | Jacky | P5 |

## Approvers

| 角色 | 姓名 | 状态 |
|---|---|---|
| IO | WAYNE | 已签（2026-11-17） |
| SA | Karena | 已签（2026-11-17） |
| 当前开发者 | Jacky（SA） | 已确认（2026-11-17）；按矩阵不自签 SA 位 |
| VL | Neal | 不适用（G1 签署矩阵为 IO + SA） |
| SM | Lewis | 不适用（G1 签署矩阵为 IO + SA） |

签署来源：发起人 2026-11-17 确认 G1 批准人为 IO = WAYNE、SA = Karena；因当前开发者 Jacky 本身是 SA，按 `docs/sdd/README.md#工件签署矩阵` 由另一名 SA 签署。本记录不代替 G2 / G3 的独立签署。

## Next

- Decision = Pass → P3（`design.md` → `atdd-design.md` → `tasks.md` → 质量检查）。
- C1 / C4 / C5 落 P3 设计；C2 / C3 落 P3 契约与 P4 测试；C6 落 P5 归档。