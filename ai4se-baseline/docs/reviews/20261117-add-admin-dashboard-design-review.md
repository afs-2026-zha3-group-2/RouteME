# Design 评审报告 — add-admin-dashboard

- **工件：** `openspec/changes/add-admin-dashboard/design.md`、`openspec/changes/add-admin-dashboard/atdd-design.md`（rev1，P3 首版）
- **change-id：** `add-admin-dashboard`
- **需求条目：** `requirement-workspace/requirements/REQ-023-admin-dashboard.md`（REQ-023 / S25）
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（focus = full；规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:security-baseline`、`@rule:pii-scrubbing`、`@rule:document-conventions`；基线 `main@a2ee518`）
- **评审输入：** `design.md`、`atdd-design.md`；Delta Spec（5 / 13）；`proposal.md`；`g1-decision.md`（C1–C6）；`docs/reviews/20261117-add-admin-dashboard-spec-review.md`（S1-06）；as-is 代码 `controller/Admin{User,Report,Service}Controller.java`、`service/AdminPrincipalService.java`、`service/AccountStatusService.java`、`pojo/TripPlan.java`、`entity/*.java`、`mapper/*.java`、`db/migration/{V3,V5,V7,V8,V19,V21}*.sql`、`route.ts`、`AdminLayout.tsx`、`AdminGuard.tsx`、`shell/AppShell.tsx`、`api.ts`、`openapi.yaml` 0.17.0、`e2e/playwright.config.ts`
- **工具校验：** `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`（5 Requirement / 13 Scenario）；本阶段不产生实现代码，`mvn test` / `npm test` 为 N/A

## 1. 结论

**Pass**（BLOCKER 0 / WARNING 1（评审中已修）/ SUGGESTION 4）

设计把 Delta 的 5 条 Requirement 落成「一个只读端点 + 一个页面」的最小切面：一个 `Instant`、六次列表查询、同源分桶、零填充、复用既有有效状态与行程五态判定；前端只做格式化与渲染，图表只表达快照分布。ATDD 覆盖 13 / 13 场景，API 与 E2E 分层符合 `layer-inference` 的首匹配顺序，非目标各有反向检查。C1–C6 均有落点。可进入 P4。

## 2. Findings

| id | Severity | Rule | Location | Issue | Suggested fix | Authority | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| W-01 | WARNING | `rules/testing/rules.md#web-testing` | `atdd-design.md` M5；`e2e/playwright.config.ts` | M5 原写「停留 60 秒」，但仓库 Playwright 全局 `timeout: 30_000`，该用例必然超时失败，等于设计了一条跑不过的验收 | 改为 `page.clock.install()` + 快进 60 秒；被其他定时器干扰时退回 `test.setTimeout(90_000)`；`design.md` §7 同步 | `[fact]`（配置文件） | Jacky | **已修**（rev1 评审中） |
| S-01 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` §3.2 | G1 C2 写「用 `enum` 锁定全部状态键」，但 OpenAPI 3.0.3 不能对对象键名使用 `enum`；设计改用 `required` 全集 + `additionalProperties: false` + `OpenApiTest` 字面断言 | 保留现方案；`design.md` 已加「C2 合规说明」；P4 必须断言六组键集合字面值，并在 G2 证据中引用该说明 | `[fact]` | Jacky | 已说明 |
| S-02 | SUGGESTION | `rules/security/rules.md#security-baseline` | `design.md` §2、§3 | 授权在 Controller 调 `AdminPrincipalService.requireAdmin`，与既有三个管理端 Controller 一致；规则措辞「授权在服务边界执行」可被读成 Service 层校验 | 保持与既有管理端一致（controller 层统一入口）；G2 代码评审确认所有 `/api/admin/**` 都经 `requireAdmin`；若后续规则收紧，再补 Service 级参数校验 | `[inference]` | Jacky | 接受现状 |
| S-03 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` §4.1 | 不开启事务，只承诺「组内自洽」，跨组不保证同一数据库快照；Delta 也只要求组内 `total = Σ` | 在 `AdminDashboardService.overview()` Javadoc 写明保证边界，避免后人「顺手加事务」改变只读端点语义 | `[inference]` | Jacky | 待 P4 |
| S-04 | SUGGESTION | `rules/quality/rules.md#web-coding-style` | `design.md` §5.2 | 请求竞态写「递增 token 或仅最后一次响应生效」两种写法，实现时可能出现两种口径 | P4 固定一种（建议「仅最后一次响应生效 + 卸载标记」），并把选择写进代码注释 | `[inference]` | Jacky | 待 P4 |

**Counts：** BLOCKER 0 / WARNING 1（已修）/ SUGGESTION 4 → **Pass**

## 3. 分维度结论

| 维度 | 结论 | 证据 |
|---|---|---|
| A 架构 / 契约 | Pass | 端点与 schema 齐全，字段 `snake_case`、`generated_at` 为 `_at` UTC；分层沿用 `controller → service → mapper`；未引入 repository 双轨；`TripPlan.status` / `AccountStatusService` 复用而非复制（`@rule:api-contract`、`@rule:java-patterns`） |
| B 质量 / 命名 | Pass | `AdminDashboardController` / `Service` / `ServiceImpl` / `Response` / `AdminDashboardPage` / `loadAdminDashboard` / `dashboardFormat.ts` 均符合既有命名；前端业务逻辑落在 `admin/dashboard/*.ts`，组件只渲染（`@rule:naming-conventions`、`@rule:web-coding-style`） |
| C 测试 / ATDD | Pass（W-01 已修） | 13 / 13 场景分层；API 用固定时钟 + 增量断言；E2E 只断言结构；非目标反向检查 8 条；命令沿用仓库脚本（`@rule:java-testing`、`@rule:web-testing`） |
| D 安全 / 隐私 | Pass | 服务端 `requireAdmin` 为安全边界；`AdminGuard` 只是前端兜底且明确不发请求；响应只含计数与 `generated_at`，无 PII；无硬编码密钥（`@rule:security-baseline`、`@rule:pii-scrubbing`） |
| E 过程 / 工件 | Pass | 单 capability、单 change；`design.md` 记录取舍、被否决方案、风险与例外；Delta 命名修正只改格式并复用上份 `Pass` 报告（`@rule:sdd-artifacts`、`@rule:artifact-review-gate`） |
| F 文档 | Pass | 正文中文、标识符英文；相对路径；引用代码写路径 + 符号，不写行号；规则用锚点（`@rule:document-conventions`） |
| G 追踪 | Pass | Proposal In scope 10 项 → Delta 5 Requirement / 13 Scenario → design §3–§5 → ATDD 13 行 → tasks（待写）路径清晰；C1–C6 逐条对照；无孤儿场景 |

## 4. G1 条件对照

| 条件 | 落点 | 判定 |
|---|---|---|
| C1 固定一个 `Instant`、批量推导、禁止 N+1 | `design.md` §4.1：单 `now`、六次 `selectList`、禁止逐行查询；§4.6 记录 6 条 SELECT | 满足 |
| C2 `generated_at` 必填、状态键锁定、0.18.0 复核 | §3、§3.1、§3.2（含 C2 说明）、§6 | 满足（S-01 说明） |
| C3 P4 测试覆盖零填充 / 封禁到期 / 窗口边界 / 取消行程 / 自洽 / 403 / 非管理员零请求 | `design.md` §7、`atdd-design.md` §1.1 A2–A8 / M3 | 满足 |
| C4 记录查询条数与索引现状，不新增索引 / 迁移 | §4.6 六表清单（已对照 `V11` / `V19` / `V21` 实际索引） | 满足 |
| C5 概览 Tab 置首、入口改指 `#/admin`、只手动刷新 | §5.1、§5.2 | 满足 |
| C6 P5 前确认 `add-admin-console` 已归档并统一五态措辞 | §4.4（P4 改注释）、§9 风险表 | 满足 |

## 5. Delta 命名修正（P3 入口，不改语义）

- `specs/admin-dashboard/spec.md` 中响应组名与字段名由 camelCase 改为 `@rule:api-contract` 要求的 snake_case：`service_sessions`、`generated_at`、`by_role`、`by_status`、`new_last_7_days`、`new_last_30_days`；场景中 `users.byStatus.*` 同步为 `users.by_status.*`。
- 状态枚举键大小写按 S1-06 保留（账号 / 举报 / 会话大写，行程 / 申请小写），`design.md` §3.1 已固定完整键表。
- 依 `@rule:artifact-review-gate`「只改错字、链接或格式且不改变语义的修订，可复用上一份 `Pass` 报告」，`docs/reviews/20261117-add-admin-dashboard-spec-review.md` 已追加「变更摘要」，结论与既有签署保持有效；`openspec validate --strict` 复跑 valid。

## 6. 残余风险

- **全表扫描随数据增长变慢。** 已记录六表索引现状（§4.6），本轮不新增索引；增长后另开需求。
- **跨组非同一快照。** 只保证组内自洽；并发极高的瞬间，两个分组的数字可能来自相邻时刻（见 S-03）。
- **E2E 未入 CI。** 沿用现状，P4 报告记录本地命令与结果；共享库使绝对值不可断言（ATDD §4）。
- **`add-admin-console` 未归档。** `openspec/specs/admin-console/` 尚不存在；P5 归档前必须确认先归档（C6）。
- **契约号段 0.18.0 可能被在途 change 预约。** P4 定稿前复核（C2）。
- **`TripPlan.status(Instant)` 注释仍写「四态」。** P4 改注释，不改逻辑。

## 7. 下一步（非 Gate）

- 按 `@rule:artifact-review-gate` 收集签署：`design.md` / `atdd-design.md` 由当前开发者 + 1 名非当前开发者且非 WAYNE 的成员签署；本报告由 WAYNE + 当前开发者签署。
- 签齐后写 `tasks.md`（契约 → 后端 → 前端 → E2E → 验证），再跑一次 `all-specs-review` 并收集 tasks 签署。
- 实现阶段：先契约（0.18.0）与红测，再后端聚合、前端页面、E2E。

## 8. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 | 状态 |
|---|---|---|---|---|---|---|
| `design.md` + `atdd-design.md` | 工件 1（当前开发者） | Jacky（SA） | 2026-11-17 | 发起人确认 | 工件全文：设计目标、契约、后端聚合、前端页面、测试策略 | 已批准 |
| `design.md` + `atdd-design.md` | 工件 2（非当前开发者、非 WAYNE） | Karena（SA） | 2026-11-17 | 发起人确认 | 工件全文：同上 | 已批准 |
| 本报告 | 报告 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人确认 | 评审结论与 S-01 ~ S-04（W-01 已修） | 已批准 |
| 本报告 | 报告 2（当前开发者） | Jacky（SA） | 2026-11-17 | 发起人确认 | 评审结论与 S-01 ~ S-04（W-01 已修） | 已批准 |

> 当前开发者：Jacky（SA）。第二签署人 Karena 不是当前开发者、也不是 WAYNE，符合矩阵。四条记录齐备，tasks 工件解锁。本记录不代替 G2 / G3。