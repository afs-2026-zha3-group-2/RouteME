# Artifact review — add-route-completion / design

- **Verdict: Pass（建议）**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`design.md`](../../openspec/changes/add-route-completion/design.md)（D1–D12）
- **Supporting inputs:**
  - [`specs/route-completion/spec.md`](../../openspec/changes/add-route-completion/specs/route-completion/spec.md)（6 Requirement / 18 Scenario）
  - [`atdd-design.md`](../../openspec/changes/add-route-completion/atdd-design.md)（A1–A18）
  - [`tasks.md`](../../openspec/changes/add-route-completion/tasks.md)（T0–T9 + 对齐自检 9/9）
  - [`g1-decision.md`](../../openspec/changes/add-route-completion/g1-decision.md)（Pass）
  - [`dov-ac-review.md`](../../openspec/changes/add-route-completion/dov-ac-review.md)、[`consistency-lint.md`](../../openspec/changes/add-route-completion/consistency-lint.md)
  - 预览：[`route-completion-row.html`](../../sdd/add-route-completion/preview/route-completion-row.html)
- **Evidence:**
  - 基线核实：`UserProfileResponse` 类级 `@JsonInclude(NON_NULL)`；`application.yaml` `spring.jackson.property-naming-strategy: SNAKE_CASE`；`openapi.yaml` 0.26.0；迁移头 `V31`。
  - `openspec validate add-route-completion --strict` → valid（P3 期间未改 Delta）。
  - 规则核对：`@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:prototype-ui-alignment`（原型 v1 令牌）。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P4 承接） | `rules/architecture/rules.md#api-contract` | D1 `UserProfileResponse` record 末尾追加两组件 | 构造器签名变化会影响所有调用点（`profile` / `save` / `uploadAvatar`） | T3 全量编译；`mvnw verify` 捕获遗漏的 `new UserProfileResponse(...)` | [fact] |
| F-2 | SUGGESTION（P4 承接） | `rules/testing/rules.md#tdd-cycle` | D2 `evaluate(Integer rate, int completedTripCount)` | `Integer` 入参使「非整数」在类型层不可表达；Delta 的「非整数降级」由契约 `type: integer` 兜底 | 单测覆盖 null / -1 / 101；在 P4 记录说明非整数在类型层天然被拒 | [inference] |
| F-3 | SUGGESTION（P4 承接） | `rules/process/rules.md#prototype-ui-alignment` | D8 / D9 预览与 `styles.css` | 预览为自包含令牌副本；实现若不映射到 `styles.css` 既有令牌会形成第二套色板 | T6 只引用 `:root` / `[data-theme="dark"]` 变量；P4 源码检索禁止十六进制 | [fact] |
| F-4 | SUGGESTION（合并顺序） | `rules/architecture/rules.md#api-contract` | D4 / D12 契约 0.27.0 | 版本依赖合并顺序；在途 change 可能先占用 | PR 前复核 `origin/main` 版本与迁移头；被抢占则整体顺延并同步 `OpenApiTest` | [inference] |
| F-5 | SUGGESTION（P4 承接） | `rules/testing/rules.md#web-testing` | D4 `route_completion_state` 入 `required` | 新增字段入 `required` 对旧消费者无破坏，但需契约测试锁定，避免后续字段被移除 | `OpenApiTest` 断言 `required` 含 state、不含 rate | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability；后端派生单点 + 响应两字段 + 前端一行；无表 / 迁移 / 端点；与信用、统计、成长等级零耦合 |
| B Quality | N/A | P3 无实现 |
| C Testing | Pass（映射齐） | A1–A18 与 T1–T7 一一对应；UT / API / E2E 分层与 ATDD 一致 |
| D Security | Pass | 只读字段；无写入口；失败安全降级；不读写信用账本 |
| E Process | Pass | 原型先行；design / tasks / ATDD / G1 同批；对齐自检 9/9 |
| F Documentation | Pass | 决策带拒绝理由；影响面逐文件；风险有缓解 |
| G Traceability | Pass | 6 Requirement ↔ 18 Scenario ↔ A1–A18 ↔ T0–T9 可追 |

## Residual risks

- 契约版本 0.27.0 依赖合并顺序；被抢占时整体顺延。
- 本版本全部用户 `insufficient`，三档非空态依赖 E2E 拦截 / 夹具。
- 预览为静态局部，真实页面行距需 T6 在四宽度 × 深浅色下复核。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Neal（当前开发者） | 2026-11-18 | 发起人确认当前开发者 | 全文 |
| `design.md` | 2 / 2（非当前开发者、非 WAYNE） | Jay（AO） | 2026-11-18 | 发起人确认 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人确认批准 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Neal（当前开发者） | 2026-11-18 | 发起人确认当前开发者 | 结论与签署位 |
