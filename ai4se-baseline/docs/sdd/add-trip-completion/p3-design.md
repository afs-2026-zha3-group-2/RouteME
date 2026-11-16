# P3 设计记录 — add-trip-completion

- **Change：** `add-trip-completion`（REQ-011 / S15）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-16 ｜ **记录：** `/sdd:p3` 会话
- **基线：** `main@9ee38e1`（已合并远程 32 个提交；S15 编号顺延为 REQ-011）

## 1. 阶段目标

把已验证的 Delta Spec 拆成可执行的 ATDD 设计、技术设计与任务清单，并完成对齐自检。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../openspec/changes/add-trip-completion/atdd-design.md) | E1–E15 → API / E2E 层；固定 Clock 与相对日期夹具；Non-goals 反向验证；NFR deferred |
| 技术设计 | [`design.md`](../../openspec/changes/add-trip-completion/design.md) | D1–D13：Asia/Shanghai 业务日、四态推导、懒写入物化、事件解耦、结束权限、申请资格、列表/统计、提醒、契约 0.9.0、前端、发布校验、测试 |
| 任务清单 | [`tasks.md`](../../openspec/changes/add-trip-completion/tasks.md) | T1–T11；每层含 Owner / 验证命令 / 覆盖场景；T1 Red、T11 回归；对齐自检 Pass |
| P3 质量报告 | [`docs/ai4se-plugins/20261116-151405-quality-checklist-report.md`](../../docs/ai4se-plugins/20261116-151405-quality-checklist-report.md) | P3-1 ~ P3-4 全 Pass；Overall Pass |
| 校验 | `openspec validate add-trip-completion --strict` | valid |

## 3. 关键技术决策

1. **业务日时区：** Asia/Shanghai；时间戳仍 UTC。
2. **四态推导：** `TripPlan.status(Instant now)`；优先级 已结束 > 旅行中 > 已满员 > 招募中。
3. **自动完成：** 懒写入（条件更新 `completed_at = plannedEnd`），列表/详情/写操作前物化；无定时任务。
4. **批量取消：** `TripCompletedEvent` + 同事务监听器，避免 `trip-plans` 反向依赖 `trip-companions`。
5. **申请资格：** 未结束且未满员可申请/接受；满员仅可拒绝；结束后全部关闭。
6. **提醒：** 响应字段 `ending_soon`（结束日期 21:00 起），前端按资格渲染。
7. **契约：** 0.9.0，新增 `ongoing` 与 `ending_soon`，错误码不变。
8. **测试：** 固定 Clock（后端）+ 相对日期（E2E）；不依赖种子 3/4 的日期漂移。

## 4. 风险与后续

- 懒写入事务/事件边界是 P4 的首要验证点（T3）。
- E2E 改造量集中在 `trips.spec.ts` 的结束用例与首页状态断言（T10）。
- NFR（物化性能、并发、提醒去重）deferred，P4 验证报告记录。

**阶段结论：P3 DoV Pass（4/4）。** 下一步 P4 `/sdd:atdd-apply`，从 T1 的 Red 用例开始。
