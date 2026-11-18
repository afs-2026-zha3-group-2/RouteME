# P3 阶段记录 — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`（Issue #29 / REQ-028 / S29）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-18 ｜ **记录人：** Lewis（SM，当前开发者）
- **基点：** `origin/main@822471c`（已并入 `5cb67ff`）；分支 `feature/add-report-credit-deduction`

## 1. 阶段目标

把 G1 Conditional 的 36 条 Delta 场景转成可执行的 ATDD 设计与任务分解：先补管理端举报处置原型截点，再产出 API / E2E 分层、D1–D10 技术决策、T1–T12 任务与 9/9 对齐自检；G1 的 C1（用户管理页处罚回归）与 C2（401 / 403 / 404）在本阶段落到 T10。

## 2. 产出

| 工件 | 路径 | 结论 |
|---|---|---|
| 原型截点 | [`docs/prototype/admin-report-resolve.html`](../../prototype/admin-report-resolve.html) | 三态（处理中 / 已成立 / 已驳回）+ OTHER 档位 + 三段预览 + 浅深色；令牌与实现 `styles.css` 同值 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-report-credit-deduction/atdd-design.md) | API A1–A18 / E2E E1–E9 / 反向 R1–R5；NFR 经用户确认不纳入 |
| 技术设计 | [`design.md`](../../../openspec/changes/add-report-credit-deduction/design.md) | D1–D10；契约 `0.25.0`、迁移 `V30`；`ReportViolationEnum` + `CreditService.snapshot` |
| 任务分解 | [`tasks.md`](../../../openspec/changes/add-report-credit-deduction/tasks.md) | T1–T12；Alignment self-check 9/9 Pass |
| 设计评审 | [`docs/reviews/20261118-add-report-credit-deduction-design-review.md`](../../reviews/20261118-add-report-credit-deduction-design-review.md) | Verdict Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION；工件 Lewis + Jay，报告 WAYNE + Lewis |
| 任务评审 | [`docs/reviews/20261118-add-report-credit-deduction-tasks-review.md`](../../reviews/20261118-add-report-credit-deduction-tasks-review.md) | Verdict Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION；工件 Lewis + Jay，报告 WAYNE + Lewis |
| P3 质量报告 | [`docs/ai4se-plugins/20261118-110618-quality-checklist-report.md`](../../ai4se-plugins/20261118-110618-quality-checklist-report.md) | P3 必选项 4/4 Pass；Overall Pass |

## 3. 设计决策摘要

| # | 决策 | 被否决 |
|---|---|---|
| D1 | 新建 `ReportViolationEnum`，不复用 `BanReasonEnum` | 复用并加扣分字段 |
| D2 | 请求只传 `violation_type` / `other_deduction`；未知字段忽略 | 保留 `action` / 客户端传分值 |
| D3 | `reports` 加 `violation_type` / `applied_deduction`（可空，正数扣减额） | 只在账本存类型 / 新建表 |
| D4 | 新增 `CreditService.snapshot`（只读，缺失 80，不建账户） | 详情调用 `read` 产生写副作用 |
| D5 | `ReportedUser` 共享 schema 增 `credit_score` / `credit_level` | 新建详情专用 schema / 列表留空 |
| D6 | 先条件更新报告，再 `book`；幂等键兜底 | 先记账 / 悲观锁 |
| D7 | 成立时 `resolution_action=null`，驳回保留 `REJECT` | 成立写 `KEEP` |
| D8 | 当前分来自服务端，扣分映射双端同值；按 0 截断 | 详情下发规则表 / 预览端点 |
| D9 | 表单状态改为 `outcome` / `note` / `violationType` / `otherDeduction` | 保留旧字段 |
| D10 | 契约 `0.25.0` + 迁移 `V30`；P4 开工前复核占用 | 不改契约 / 新建表 |

## 4. 校验

- `openspec validate add-report-credit-deduction --strict` → valid（design / tasks 不影响 Delta 校验）。
- 对齐自检：Spec → Tasks、ATDD → Tasks、Design → Tasks 全通过（9/9）。
- 原型：浅 / 深色与 1440 / 1024 / 768 / 390 断点自查；三态切换与 OTHER 档位预览可操作。
- 未运行：Redocly（契约尚未改，T1 执行时跑）；E2E（P4）。

## 5. 签署

| 对象 | 签署位 | 批准人 | 日期 |
|---|---|---|---|
| `design.md` + `atdd-design.md` | 1 / 2 | Lewis（SM） | 2026-11-18 |
| `design.md` + `atdd-design.md` | 2 / 2 | Jay（AO） | 2026-11-18 |
| `tasks.md` | 1 / 2 | Lewis（SM） | 2026-11-18 |
| `tasks.md` | 2 / 2 | Jay（AO） | 2026-11-18 |
| 两份评审报告 | 1 / 2 | WAYNE（IO） | 2026-11-18 |
| 两份评审报告 | 2 / 2 | Lewis（SM） | 2026-11-18 |

**结论：P3 Pass。** 可进入 P4（`/sdd:atdd-apply`）。

## 6. 带入 P4 的跟踪项

| 项 | 说明 | Owner |
|---|---|---|
| 契约 / 迁移号 | `0.25.0` + `V30`；开工前复核远端占用，被占则顺延 | Dev |
| T4 / T9 分批 | T4 按 A1–A7 / A9–A18 两批；T9 先 E1–E4 再 E5–E9 | Dev |
| 前后端映射一致 | `ReportViolationEnum` 与 `reportViolation.ts` 用同一组样例断言 | Dev |
| 历史数据 | 历史举报 `violation_type` / `applied_deduction` 为 null；E7 / T4 覆盖 | Dev |
| 列表扩展 | `ReportedUser` 新增可空信用字段；列表不展示（S-1） | Dev |
| E2E 隔离 | 全新库 + 8081 / 5174 + 独立 `--output`；造数写入 p4-apply | Dev |
| G1 C1 / C2 | T10 关闭；C3 已签、C4 归档顺序 | Dev / SA |

## 7. 提交记录

P3 产物一次性提交（`docs(p3): ...`），按阶段提交约定只包含本阶段产物；提交后先 `git pull` 再 `git push`。
