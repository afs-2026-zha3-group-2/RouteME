# Artifact review — add-growth-level / Design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 设计评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review：**
  - [`design.md`](../../openspec/changes/add-growth-level/design.md)（D1–D14 / 数据 / 事件挂接 / 契约 / 迁移 / 并发）
  - [`atdd-design.md`](../../openspec/changes/add-growth-level/atdd-design.md)（A1–A26 / E1–E8 / R1–R4；NFR 不纳入）
  - 原型：[`growth-level.html`](../prototype/growth-level.html) + `docs/preview/add-growth-level/` 8 图
- **Supporting inputs：**
  - Delta：`specs/user-growth/spec.md`（9 Requirement / 41 Scenario）
  - G1：`g1-decision.md`（Conditional；C1 重复处理响应形态 / C2 字段级可见性）
  - 现状（只读核对）：`ExperienceServiceImpl.upsert`（`@Transactional`，返回 `created`）、`ExperienceLikeServiceImpl.like`（`@Transactional`，`created` 分支已有 `rewardService.award` 先例）、`AdminReportServiceImpl.resolve`（`@Transactional`，非 `PROCESSING` 抛 `ReportNotProcessingException`）、`UserProfileController`（`/profile` + `/credits` 批量 `MAX_CREDIT_IDS = 50`）、迁移头 `V31`、契约 `0.26.0`

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | `design.md` D4 | 三处业务事件同事务结算：Delta 未写「成长结算失败是否阻断业务操作」，设计选择回滚，但 ATDD 无失败注入用例 | P4 在发布 / 举报用例补「结算异常 → 业务回滚」断言，或在 p4-apply 显式记录不测理由 | [inference] |
| S-2 | SUGGESTION（保留） | `rules/process/rules.md#tdd-cycle` | `design.md` D11 | 存量回填示意使用 `:now` 命名参数；Flyway 不支持绑定参数，SQLite / H2 时间函数不同 | P4 改用 `CURRENT_TIMESTAMP` 或方言分支落地，并在 `GrowthMigrationSqliteTest` 双引擎验证 | [fact] |
| S-3 | SUGGESTION（保留） | `rules/architecture/rules.md#api-contract` | `design.md` D7 / D8 | 他人响应与 LV5 本人响应都会省略 `exp_to_next`；前端若按「字段缺失 = 满级」判断会把他人误判为 LV5 | 满级必须以 `max_level` 判断；A22 / E8 断言他人无 `exp` 键、LV5 本人 `max_level = true` | [inference] |
| S-4 | SUGGESTION（保留） | `rules/architecture/rules.md#java-patterns` | `design.md` D5 | 当日额度和依赖 `occurred_at` 字符串比较；若本地偏移与 UTC 混写会跨日误判 | 流水时间统一 `Instant.toString()`（UTC `Z`）；日界换算为 UTC 后查询；A15 断言 UTC 16:00 日界 | [inference] |
| S-5 | SUGGESTION（保留） | `rules/quality/rules.md#web-coding-style` | `design.md` D10 | 6 处展示面共用 `GrowthBadge`，但列表与本人进度的数据来源不同（批量端点 / `/profile.growth`） | P4 明确 `useGrowthLevels` 只接受他人 id 集合；本人进度只从 profile 读取，避免列表请求覆盖本人数据 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 成长与信用两套账本完全分离；等级纯函数派生不落库；单一 `GrowthService.book` 入口 |
| B Quality | N/A | P3 无实现 |
| C Testing | Pass | ATDD 覆盖 API / E2E / 反向；并发、截断、历史不回填、G1 C1 / C2 均有落点 |
| D Security | Pass | 无客户端写端点；字段级可见性由服务端分支控制；批量端点仅返回 level |
| E Process | Pass | 原型先行（P3 完成 + 8 图零溢出）、契约 / 迁移先于实现、NFR 经用户确认不纳入 |
| F Documentation | Pass | D1–D14 均含背景 / 选择 / 被拒方案；契约样例与迁移差异已写 |
| G Traceability | Pass | D1–D14 → tasks 1.2–1.11 → A / E / R 场景链路完整；G1 C1 → D6、C2 → D8 |

## Residual risks

- D4 同事务给发布 / 点赞 / 举报新增失败点；由幂等键与既有测试回归缓解（S-1）。
- D11 的 SQLite / H2 方言差异可能迫使迁移改写法；P4 双引擎验证（S-2）。
- 6 处展示面视觉漂移依赖 P4 四宽度 × 双主题走查；P3 截图仅作基准。
- 契约 `0.27.0` / 迁移 `V32` 仍可能被远端占用；P4 开工前复核。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `design.md` + `atdd-design.md` | 1 / 2（当前开发者） | Jay | 2026-11-18 |
| `design.md` + `atdd-design.md` | 2 / 2（非当前开发者、非 WAYNE） | Karena | 2026-11-18 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE | 2026-11-18 |
| 本评审报告 | 2 / 2（当前开发者） | Jay | 2026-11-18 |
