# P3 设计记录 — add-trip-cancel

- **Change：** `add-trip-cancel`（REQ-019 / issue #28）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-17 ｜ **记录人：** Neal（VL）
- **分支：** `feature/add-trip-cancel`（worktree `.worktrees/add-trip-cancel`）

## 1. 阶段目标

把已签署的 Delta Spec 落成可执行的技术设计、ATDD 验收设计与任务切片；原型先行，为 P4 提供无歧义实现路径。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 技术设计 | [`design.md`](../../openspec/changes/add-trip-cancel/design.md) | D1–D9：V19 三列、状态优先级、取消条件更新 / 事件、终态互斥、查询与统计、原因裁剪、契约 0.13.0、前端入口、原型先行、测试与回滚 |
| ATDD 设计 | [`atdd-design.md`](../../openspec/changes/add-trip-cancel/atdd-design.md) | API / E2E / UT 分层；E1–E21 映射；固定 Clock、种子与相对日期；门禁；Non-goals 反向验证 |
| 任务清单 | [`tasks.md`](../../openspec/changes/add-trip-cancel/tasks.md) | T0 原型 + T1–T10；每条含 Owner、覆盖、文件、验证命令；对齐自检 Pass |
| 原型改动 | `docs/prototype/data.js`、`ui.js`、`main.js`、`store.js`、`styles.css` | 8 项原因、取消弹窗、我的旅行入口、已取消原因展示、`.action-note.danger`；`node --check` 四文件通过 |
| 设计/任务评审 | [`docs/reviews/20261117-add-trip-cancel-design-tasks-review.md`](../../docs/reviews/20261117-add-trip-cancel-design-tasks-review.md) | Partial；BLOCKER 0 / WARNING 3（P4 验证）/ SUGGESTION 4；签署已完成 |
| P3 质量报告 | [`docs/ai4se-plugins/20261117-120520-quality-checklist-report.md`](../../docs/ai4se-plugins/20261117-120520-quality-checklist-report.md) | P3-1 ~ P3-4 全 Pass；Overall Pass |

## 3. 关键决策

- **D1：** `trip_plans` 增加 `cancelled_at / cancel_reason / cancel_note`；`TripPlan.status` 取消优先。
- **D2：** 取消用条件更新（`cancelled_at IS NULL AND completed_at IS NULL`），成功后发布 `TripCancelledEvent`；监听器复用 `cancelPending`。
- **D3：** 结束、物化、申请、处理、退出、编辑集合、聊天发送全部拒绝取消态。
- **D4：** 开放列表与到期物化排除取消；我的旅行保留取消；统计排除取消。
- **D5：** 原因与说明仅在服务端按「发布者或 ACCEPTED」裁剪；摘要不携带原因。
- **D6：** 契约 0.13.0；五态枚举、`TripDetail` 取消字段、`TripCancelRequest`、`POST /trips/{tripId}/cancel`。
- **D7：** 详情页与我的旅行共用 `TripCancelModal`；ACCEPTED 保留聊天入口。
- **D8：** 原型先行已完成；P4 按原型逐屏对齐。
- **D9：** 固定 Clock + SQLite 迁移测试 + 并发条件更新；回滚保留取消列。

## 4. 评审与签署

- 设计/任务评审：**Partial**（BLOCKER 0；W-01 号段、W-02 我的旅行分组、W-03 说明字段交互落 P4；S-01–S-04 落 T2/T6/T7/T8/T9）。
- 签署：`design.md` / `tasks.md` = Neal + Jay；评审报告 = WAYNE + Neal（2026-11-17）。

## 5. 质量检查

- `openspec validate add-trip-cancel --strict` → valid。
- P3 质量报告：P3-1 / P3-2 / P3-3 / P3-4 全 Pass；Overall Pass。
- 原型四文件 `node --check` 通过；无新增依赖。

## 6. 下一步

- P4：`/sdd:atdd-apply`，从 T1 的 Red 用例开始；先跑 `mvn test` 目标用例确认失败，再按 T2–T9 实现。
- P4 验证需关闭 W-01–W-03，并覆盖 E1–E21。
