# Consistency lint — add-admin-dashboard

- **Change：** `add-admin-dashboard`（`admin-dashboard` ADDED，REQ-023 / S25）
- **Phase：** `p2` ｜ **Artifact level：** 2（proposal + Delta Spec；无 `design.md` / `tasks.md`）
- **Timestamp：** 2026-11-17T17:08+0800 ｜ **Reviewer：** AI agent（OpenCode）
- **输入：** `proposal.md`、`specs/admin-dashboard/spec.md`（5 Requirement / 13 Scenario）、`dov-ac-review.md`、`requirement-workspace/requirements/REQ-023-admin-dashboard.md`、`RouteME/openapi.yaml` 0.17.0、`V3` / `V4` / `V5` / `V8` / `V21` 迁移、`pojo/TripPlan.java`、`service/AccountStatusService.java`、`frontend/src/admin/AdminLayout.tsx`

## Verdict

**Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 7 / N/A 4）

无矛盾、无断链。7 条 SUGGESTION 全部是「口径已对、落点需在后续阶段写死」的清晰度问题，不阻断 G1。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Status |
|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md` In scope 8 与 §逐文件改动 `AdminLayout.tsx`；Delta「管理后台概览页」 | 提案把「后台导航『概览』Tab 置于首位」列为 In scope，Delta 只写「入口落到 `#/admin`」的可观察行为，未提 Tab。Tab 属导航布局，不宜写成验收断言，但当前没有任何工件承接这条范围项 | P3 `design.md` 明确 `AdminTab` 增加 `dashboard` 并置首；P5 归档时把提案该项改写为行为口径，避免范围项悬空 | `proposal` `[fact]` | 待 P3 |
| L-02 | SUGGESTION | p2 | Delta Requirement「概览计数结构与零填充」 | `generatedAt` 被 MUST 要求，但 13 条场景无一条断言它；页面场景只断言「最近更新时间」，属前端展示 | P3 契约 schema 标注 `generatedAt` 为必填 ISO-8601；P4 `OpenApiTest` / 控制器测试断言字段存在且可解析 | `spec` `[fact]` | 待 P3 |
| L-03 | SUGGESTION | p2 | Delta Requirement「管理后台概览统计端点与访问控制」 | 「受限管理员（`SUSPENDED` / `BANNED`）MUST 按既有管理端错误码拒绝」是硬约束，但场景只覆盖 `role=USER` 与无身份两种，未覆盖受限管理员 | P4 控制器测试补一条：`ADMIN` + `SUSPENDED` / `BANNED` → 403，且不是 200 空数据 | `spec` `[fact]` | 待 P4 |
| L-04 | SUGGESTION | p2 | Delta 三处 `byStatus`；`openapi.yaml` | 状态键大小写依赖既有 wire 值：账号 / 举报 / 会话为 `ACTIVE` / `PENDING` / `WAITING`，行程 / 申请为 `recruiting` / `pending`。Delta 用示例形式表达，未声明「字面键即最终契约键」 | P3 在 `AdminDashboard` schema 用 `enum` 固定全部键名；P4 以契约测试锁定，禁止实现侧改名 | `code` `[fact]` | 待 P3 |
| L-05 | SUGGESTION | p2 | `V3` / `V4` / `V5` / `V8` / `V21` 迁移 | 仅 `reports(status, created_at)` 与 `customer_service_sessions(status, created_at)` 有复合索引；`app_users`、`trip_plans`、`trip_applications`、`trip_experiences` 按状态或 `created_at` 统计会全表扫描 | P3 记录每次请求的查询条数与索引现状；演示规模可接受，不新增索引；真实增长后另开需求 | `code` `[fact]` | 待 P3 |
| L-06 | SUGGESTION | p2 | `proposal.md` §六组指标口径「行程」；Delta「概览统计的账号与行程口径」 | 提案写「复用既有**四态**推导」却列出五个状态；`TripPlan.status` 在 `V19` 取消能力后已是五态（含 `CANCELLED`）。另外，统计若逐行调用 `status(now)`，必须对全表共用同一个 `now`，否则跨零点可能破坏「总数 = 分桶之和」 | P3 设计写明单次请求固定一个 `Instant`；P5 把「四态」表述统一为「五态（含已取消）」 | `proposal` `[fact]` | 待 P3 |
| L-07 | SUGGESTION | p2 | `proposal.md` 归档顺序；Delta Requirement 1 | Delta 复用 `admin-console` 的管理员权限校验，但 `openspec/specs/admin-console/` 尚不存在，`add-admin-console` 仍为 `p3-pass` 未归档。当前只靠提案第 9 行声明先后顺序 | P5 归档前核对 `add-admin-console` 已归档且 `admin-console` Living Spec 存在；否则本 change 暂缓归档 | `proposal` `[fact]` | 待 P5 |

## Checklist coverage

| 检查 | 结论 | 证据 |
|---|---|---|
| P1 `## Why` 存在且有实质内容 | Pass | 四条缺口 + 源码行号证据 |
| P2 `## What Changes` 存在且有实质内容 | Pass | 6 条变更项，含端点、页面、导航、契约、前端、测试 |
| P3 Out-of-scope 存在且具体 | Pass | 8 条，均为可判定边界（趋势、轮询、缓存、导出、新表、权限模型改动等） |
| P4 影响面覆盖自身 / 上游 / 下游 | Pass | §影响面三行 + 逐文件改动表 |
| S1 Delta 符合 OpenSpec schema | Pass | `openspec validate add-admin-dashboard --strict` → valid，`deltaCount: 5` |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | 仅 `@rule:` 8 个；8/8 在 `docs/knowledge/rules/**/rules.md` 有对应 `## <id>` |
| S3 每条 Requirement 可追溯到 What Changes | Pass | C1 9/9（第 10 项契约与测试明确属 P4，不要求 Delta 场景） |
| S4 场景 Given / When / Then 完整 | Pass | 13/13 |
| S5 无悬空 Scenario | Pass | 13 条全部挂在编号 Requirement 下 |
| phase=p2：提案范围 vs Delta 范围无静默扩张 / 遗漏 | Pass | Out of scope 8 项在 Delta 无对应场景；In scope 除布局 Tab（L-01）与 P4 交付项外均有落点 |
| Delta 内部角色 / 约束 / 场景自洽 | Pass | 管理员 / 非管理员 / 未认证 / 受限管理员四类主体互斥；`total` 与分桶关系三处一致 |
| 关键约束有落点或显式延后 | Pass | 无缓存、零填充、时区窗口、有效状态、行程推导均有 MUST；布局与契约细节显式延后到 P3 / P4 |
| 术语一致 | Pass | 「概览」「有效状态」「新增」「自然日窗口」全篇同词；仅提案「四态」为陈旧表述（L-06） |
| 数值口径唯一 | Pass | 7 / 30 天定义只在 Delta Requirement 4 写一次；提案 §六组指标口径的引用与之一致 |
| 契约影响已声明 | Pass | 0.17.0 → 0.18.0；复用 `BearerToken`；仓库内无其它 0.18.0 预约 |
| 数据影响已声明 | Pass | 明确「无迁移、不占用 V25」，与 Out of scope 一致 |
| 与 Living Spec 无冲突 | Pass | 本 change 不改写任何既有 Requirement；仅依赖未归档的 `add-admin-console`（L-07） |
| 安全 / 隐私 | Pass | 响应禁止昵称 / 邮箱 / 头像；复用管理员会话；只读端点不引入写路径 |
| 与在途 change 的冲突已登记 | Pass | 归档顺序 + §残余风险均已写明 `add-admin-console` 依赖 |

## N/A / skipped

| 检查 | 原因 |
|---|---|
| 数据库迁移评审 | 本 change 无迁移、无新表 / 列 / 索引 |
| Tasks 规则 T1–T3 | `tasks.md` 属 P3，当前 artifact level 2 |
| Design 规则 D1–D3 | `design.md` 属 P3，当前不存在 |
| 原型比对 | `docs/prototype/` 无概览页；本 change 为新增页面，按既有 `AdminLayout` 与 shadcn 令牌实现 |

## Fix suggestions by priority

1. **P3 必做：** 单次请求固定一个 `Instant`、`generatedAt` 必填、`AdminDashboard` schema 用 `enum` 锁定全部状态键（L-02 / L-04 / L-06）。
2. **P3 必做：** `design.md` 承接「概览」Tab 落点与查询条数 / 索引说明（L-01 / L-05）。
3. **P4 必做：** 补受限管理员 403 断言，并断言 `generatedAt` 可解析（L-02 / L-03）。
4. **P5 可做：** 统一「四态」表述、核对 `add-admin-console` 归档顺序（L-06 / L-07）。

## Residual risks

- 六组聚合每次请求全量扫描；演示规模可接受，但数据增长后需要快照或索引，属另开需求。
- `created_at` / `ban_expires_at` 以字符串存储，窗口与到期比较依赖解析一致；P4 需用固定 `Clock` 覆盖 00:00 与到期前后。
- 有效状态是读取口径而非写回；概览与治理页可能在同一秒看到不同结果，需靠同一 `Clock` 口径收敛。
- `admin-console` 未归档，权限模型尚无 Living Spec 文本；归档顺序是本 change 的硬前置。
- E2E 未纳入 CI，`admin-dashboard.spec.ts` 仍为本地执行。

## Reviewer metadata

- 结论不代表 G1；G1 见 `g1-decision.md`。
- 本报告为 `sdd-consistency-lint`（phase=p2，artifact level 2）的机械检查结果，`dov-ac-review.md` 负责 AC / DoV 判定，两者不互相替代。

## Next

- Pass → `/sdd:g1-decision-record`；L-01 ~ L-06 落 P3 / P4，L-07 落 P5。