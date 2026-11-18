# P2 阶段记录 — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`（Issue #29 / REQ-028 / S29 举报违规扣减信用分）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-18 ｜ **记录人：** Lewis（SM，当前开发者）
- **基点：** `origin/main@822471c`（P1 提交后合并），分支 `feature/add-report-credit-deduction`

## 1. 阶段目标

把 P1 的 26 条提案场景收敛为可判定的 Delta，补齐历史数据与驳回语义两处边界，完成 AC/DoV 复核与一致性检查，形成待签的 G1 输入。

## 2. 产出

| 工件 | 路径 | 结论 |
|---|---|---|
| Delta（`user-credit`） | [`specs/user-credit/spec.md`](../../../openspec/changes/add-report-credit-deduction/specs/user-credit/spec.md) | ADDED 3 Requirement / 16 Scenario；`validate --strict` valid |
| Delta（`admin-console`） | [`specs/admin-console/spec.md`](../../../openspec/changes/add-report-credit-deduction/specs/admin-console/spec.md) | MODIFIED 1 Requirement / 20 Scenario（P2 新增历史降级场景） |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/add-report-credit-deduction/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass；映射 R-1 ~ R-26 全覆盖 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-report-credit-deduction/consistency-lint.md) | **Partial**（BLOCKER 0 / WARNING 2 / SUGGESTION 2 / N/A 6） |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-report-credit-deduction/g1-decision.md) | **Conditional**（C1–C4；IO = WAYNE / SA = Jacky，2026-11-18） |

## 3. 本阶段收敛

| 议题 | 处理 | 落点 |
|---|---|---|
| 历史举报无新字段 | Requirement 增加「空值降级展示、不报错」，新增「历史举报降级展示」场景 | `admin-console` Scenario 20 |
| 驳回输入措辞 | 「填写违规原因」改为「填写驳回说明」，与处理说明定义一致 | `admin-console`「举报不成立」 |
| Proposal 标题规范 | 核心标题改为 `Why` / `What Changes` / `Out of Scope` / `Impact`，DoR 引用同步 | `proposal.md` |
| 迁移号顺延 | 合并 `origin/main@822471c` 后头为 `V29`，预计 `V30`；契约仍 `0.24.0` → 预计 `0.25.0` | proposal / REQ-028 / impact §25 / P1 记录 / README |

## 4. 校验

- `openspec validate add-report-credit-deduction --strict` → `Change 'add-report-credit-deduction' is valid`；INFO：`admin-console` 活规格不存在，归档阶段拒绝（归档顺序约束已登记）。
- Scenario 计数：`user-credit` 16 + `admin-console` 20 = 36；提案 26 条 R 场景全部有落点。
- 基线复核（`origin/main@822471c`）：`activateRestriction` 仍取消待处理申请、解除同行关系、取消未完成行程；`onCreditChanged` 跨 60 语义未变（阈值来自 `CreditExitCalculator.RESTRICTION_THRESHOLD`）。
- `@rule:` 引用可达：`spec-first` / `sdd-artifacts` / `api-contract` / `java-patterns` / `web-coding-style` / `tdd-cycle` / `prototype-ui-alignment` 均在 `docs/knowledge/rules/*/rules.md` 可解析。

## 5. G1 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta Spec、G1 Conditional 结论与 C1–C4 | 2026-11-18 |
| SA | Jacky | Delta Spec、D1 替换追认、G1 Conditional 结论与 C1–C4 | 2026-11-18 |

**G1 结论：Conditional。** 条件 C1（用户管理页处罚回归任务）/ C2（401 / 403 / 404 回归用例）由 Dev 在 P3 承接；C3（D1 替换追认）已随本记录签署完成；C4（归档顺序）为 P5 约束。

## 6. 带入 P3 的跟踪项

| 项 | 说明 | Owner |
|---|---|---|
| W-1 / W-2 承接 | `tasks.md` 增加用户管理页处罚回归任务；ATDD 覆盖 401 / 403 / 404 | Dev |
| 契约与迁移排他 | `0.24.0` → 预计 `0.25.0`；`V29` → 预计 `V30` | Dev |
| OQ-1 违规类型枚举 | 复用 `BanReasonEnum` 或新建 `ReportViolationType`；映射只在一处 | Dev |
| OQ-2 报告字段 | `violation_type` / `applied_deduction`；`resolution_action` 历史只读 | Dev |
| OQ-3 已处理详情布局 | 违规原因全文与处理结果分行 | IO / Dev |
| 原型截点 | 管理端举报处置界面不在原型 v1；先补截点 | Dev / IO |
| 低分联动回归 | 只回归，不新增限制实现 | Dev |
| 归档顺序 | 排在 `add-admin-console` 与 `add-credit-account` 之后 | Dev |

## 7. 提交记录

P2 产物一次性提交（`docs(p2): ...`），按阶段提交约定只包含本阶段产物；提交后先 `git pull` 再 `git push`。
