# Design & tasks review — add-trip-cancel

- **Verdict: Partial**（BLOCKER 0 / WARNING 3（均落 P4 验证）/ SUGGESTION 4）｜ **签署：已完成（WAYNE + Neal + Jay，2026-11-17）**
- **Scope：** `openspec/changes/add-trip-cancel/design.md`、`atdd-design.md`、`tasks.md`、`docs/prototype/` 取消相关改动
- **Inputs：** Delta Spec（5 Requirement / 20 Scenario）、`proposal.md`、`dov-ac-review.md`、`g1-decision.md`、`requirements/REQ-021-trip-cancel.md`、as-is 代码（TripPlan / TripPlanServiceImpl / TripPlanMapper / TripController / ChatServiceImpl / ExperienceServiceImpl / UserProfileStatsServiceImpl / 前端 6 文件）
- **Timestamp：** 2026-11-17T13:00+0800
- **Reviewer：** Qoder（AI agent）

## 1. 结论

设计覆盖 5 个 Requirement 与 20 个 Scenario，任务按「原型 → 后端 Red → 迁移 / 领域 → 取消服务 → 终态互斥 → 查询 / 统计 → 契约 / 响应 → 前端 → E2E → 回归」切片；ATDD 边界清晰，E1–E21 均有层归属。无阻塞缺口；3 条 WARNING 均为 P4 必须验证的实现风险。

## 2. Findings

| id | Severity | Location | Issue | Suggested fix | Owner |
|---|---|---|---|---|---|
| W-01 | WARNING | `design.md` D6；`openapi.yaml` | 契约 0.13.0 + V19 为暂定；`add-ai-itinerary` 计划 0.12.0 + V18，并行 change 可能占号 | P4 定稿前复核；被占用则整体顺延并同步 `OpenApiTest` | Neal |
| W-02 | WARNING | `design.md` D4；`MyTripsServiceImpl` | `matched` 的 `status != COMPLETED` 会自动保留取消行程，容易被误改为排除；`completed` 必须只取 `COMPLETED` | P4 在 `MyTripsControllerTest` 断言：取消行程在 published / matched 保留、completed 不含 | Neal |
| W-03 | WARNING | `design.md` D7；`TripCancelModal` | 说明字段是否常显需与原型一致；若实现只在 `other` 时显示，E2E 选择器与必填校验要同步 | P4 以原型为准；`other` 必填 1–100 字，非 `other` 可空；E2E 覆盖空 / 超长 | Neal |
| S-01 | SUGGESTION | `TripDetailResponse.from` | 签名增加 `includeCancelDetail`，5 处调用点需同步；编译期可暴露 | P4 逐点补参；取消接口传 true，其他人按角色计算 | Neal |
| S-02 | SUGGESTION | `applicationEntry.ts` | 取消态必须先于 pending 判断；ACCEPTED 需保留聊天、隐藏退出 | P4 增加 `cancelled` kind + Vitest 覆盖 | Neal |
| S-03 | SUGGESTION | `ChatPage` | 只读文案目前固定「该行程已结束」，取消需显示「该行程已取消」 | P4 按 `trip.status` 分支；E2E 断言 | Neal |
| S-04 | SUGGESTION | `TripPlanStatusTest` / `TripMatchTest` | `TripPlan` record 加 3 个组件后测试工厂需补参 | 已写入 design D1 impact 与 tasks T2 | Neal |

## 3. Spec → Design → Tasks → ATDD 覆盖

| Requirement | Design | Tasks | ATDD | 判定 |
|---|---|---|---|---|
| 发布者取消自己的行程 | D1/D2/D3/D5/D6/D7 | T2/T3/T4/T6/T7/T8 | E1–E5、E10、E15 | 完整 |
| 取消原因与二次确认 | D1/D2/D6/D7/D8 | T3/T6/T7/T9 | E6–E9 | 完整 |
| 已取消行程的可见性 | D4/D5/D6/D7 | T5/T6/T7/T8 | E10/E11/E19/E20 | 完整 |
| 取消后的同行与聊天关闭 | D2/D3/D4 | T3/T4/T5/T8/T9 | E12–E15 | 完整 |
| 取消后的其他操作与统计 | D3/D4/D6/D7 | T4/T5/T7/T8 | E16–E19 | 完整 |

## 4. 关键实现核对

- `TripPlan.status` 取消优先级、`endingSoon` 非 ONGOING 为 false：D1。
- 取消条件更新同时排除 `cancelled_at` 与 `completed_at`：D2；结束 / 物化同样排除取消：D3。
- `selectExpiredIds`、`completeIfAbsent`、`openTripFilter`、`latestOpenByPublisher` 四处排除：D3/D4。
- 原因裁剪只在 `TripDetailResponse.from` 一处组装，控制器统一算权限：D5。
- 前端入口两处共用 `TripCancelModal`，ACCEPTED 保留聊天：D7。
- 原型先行四文件已完成，`node --check` 全部通过：D8 / T0。

## 5. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `design.md` | 工件 1 | Neal（VL） | 2026-11-17 |
| `design.md` | 工件 2 | Jay（AO） | 2026-11-17 |
| `tasks.md` | 工件 1 | Neal（VL） | 2026-11-17 |
| `tasks.md` | 工件 2 | Jay（AO） | 2026-11-17 |
| 本报告 | 报告 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 2 | Neal（VL） | 2026-11-17 |

批准来源：发起人 Neal 2026-11-17 指示「签字然后继续推进」，按名册记录 Neal / Jay / WAYNE 的签署位。批准范围：`design.md`、`atdd-design.md`、`tasks.md`、原型取消改动与本评审报告。

## 6. Next

- W-01–W-03 落 P4 验证；S-01–S-04 落 T2/T6/T7/T8/T9。
- P3 质量检查通过后提交 P3；随后进入 P4（`/sdd:atdd-apply`，从 T1 的 Red 用例开始）。
