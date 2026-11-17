# P3 阶段记录 — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`（能力 `credit-enforcement` ADDED）｜ **需求：** REQ-022 ｜ **故事：** S22 + S23
- **阶段：** P3（Design & decompose）｜ **日期：** 2026-11-17
- **记录人：** Lewis Liu（当前开发者）
- **分支：** `feature/add-credit-exit-restriction`

## 1. 阶段目标

把 G1 通过的 Delta 转成可执行的 ATDD 设计、技术设计与任务清单，并完成原型先行与设计/任务工件评审；P3 不写业务代码。

## 2. P3 产出

| 类型 | 路径 | 说明 |
|---|---|---|
| ATDD 设计 | `openspec/changes/add-credit-exit-restriction/atdd-design.md` | API A1–A5 / E2E E1–E3 / Defer UT / fixtures / gates / non-goals + 反向验证 |
| 技术设计 | `openspec/changes/add-credit-exit-restriction/design.md` | D1–D20 + V21 数据模型 + 依赖图 + 退出/限制/系统取消 + 契约 0.15.0 + 前端 + 测试 + 风险 |
| 任务清单 | `openspec/changes/add-credit-exit-restriction/tasks.md` | T0–T14 + Owner + 复选框 + 验证命令 + 对齐自检 10/10 |
| 原型 | `docs/prototype/main.js` / `store.js` / `ui.js` / `data.js` / `styles.css` | 退出原因 + 预计影响弹窗、限制徽标、本人原因、拦截提示、系统取消原因、模拟限制（原型专用） |
| 预览 | `docs/sdd/add-credit-exit-restriction/preview/exit-credit.html` | 1440 / 390 × 浅/深色；退出弹窗 + 本人限制 + 他人徽标 + 拦截 + 系统取消 |
| 设计评审 | `docs/reviews/20261117-add-credit-exit-restriction-design-review.md` | Pass（0 / 0 / 5），Lewis Liu + Jay 签 |
| 任务评审 | `docs/reviews/20261117-add-credit-exit-restriction-tasks-review.md` | Pass（0 / 0 / 4），Lewis Liu + Neal 签 |
| 质量报告 | `docs/ai4se-plugins/20261117-160000-quality-checklist-report.md`（+ checkpoints） | P3 Overall Pass |

## 3. ATDD 摘要

- **API：** 退出预览 / 扣分 / 待核实 / 月度边界 / 限制触发与记录 / 只读 403 / 自动清理 / 自动解除 / 无管理端；低信用由测试内 `CreditService.book` 触发，不新增测试写接口。
- **E2E：** 三入口退出弹窗、80→75、待核实、旅行中 -15；五展示面徽标、本人原因、他人无原因、被拦截操作、系统取消原因；限制展示用 `page.route` 模拟。
- **Defer UT：** 计算器边界、月度序号、待核实、guard、纯展示函数、Modal 状态机（P4 TDD）。
- **Gates：** 契约 Redocly 0 error；后端 `mvnw verify`；前端 build/test；E2E 本地；CI 沿用现状（E2E 不在 CI，P4 记录债务）。

## 4. 技术设计摘要

- **能力 / 依赖：** 新能力 `credit-enforcement`；`CreditRestrictionGuard` 为叶子；`CreditService.book` 发布 `CreditChangedEvent`，`CreditEnforcementService` 同步监听；无循环依赖。
- **数据：** `credit_exit_event` + `credit_restriction`（active_flag 唯一）+ `trip_applications.status_reason`；账本复用；系统取消复用 `cancelled_at` / `cancel_reason`。
- **退出：** `GET /trips/{tripId}/leave-preview?reason=` + `POST /trips/{tripId}/leave`（body `{reason}`，200 `LeaveResult`）；服务端重算；六档左闭右开；`meeting_time` 优先；月度按退出月；待核实零值留痕；幂等键 `exit:{userId}:{tripId}`。
- **限制：** `before >= 60 && after < 60` 触发；`before < 60 && after >= 60` 解除；触发时撤回 PENDING、解除未结束 ACCEPTED、取消未结束已发布行程；系统清退不扣分；`CREDIT_RESTRICTED` 403。
- **系统取消：** `TripCancelReasonEnum` 加 `credit_restricted`（systemOnly）；`TripCancelledEvent.cancelReason`；`cancelByCreditRestriction` 允许 ONGOING。
- **展示：** `UserCreditEntry.credit_restricted`；`UserProfile.credit_restricted` + 本人 `credit_restriction_reason`；五展示面徽标；无明细。
- **前端：** `CreditProvider` / `TripLeaveModal` / `CreditRestrictedNotice`；三入口复用；原生 select；无第二套组件库。

## 5. 任务摘要

| 组 | 任务 |
|---|---|
| 契约 / 迁移 | T1 契约 0.15.0；T2 V21 |
| 领域 / 服务 | T3 计算器；T4 事件与限制监听；T5 退出预览/编排/`reviewExit`；T6 系统取消与 status_reason |
| 守卫 / 响应 | T7 只读守卫；T8 响应字段 |
| 前端 / E2E | T9 类型/API/CreditProvider；T10 退出弹窗三入口；T11 五展示面与拦截；T12 系统取消与 E2E |
| 收口 | T13 回归与本地验证；T14 G2 与 P4 记录 |

## 6. 原型与预览

- `docs/prototype` 已加：退出原因 + 预计影响弹窗、`限制中` 徽标、本人原因/自动解除说明、发布/分享/聊天拦截、系统取消原因、`模拟信用限制（原型）`。
- `preview/exit-credit.html` 覆盖 1440 / 390 × 浅/深色；静态展示，不触发真实接口。
- 静态检查：`node --check` 通过 `main.js` / `store.js` / `ui.js` / `data.js`。

## 7. 工件评审与签署

| 工件 | 报告 | 结论 | 工件签署 | 报告签署 |
|---|---|---|---|---|
| `design.md` | `docs/reviews/20261117-add-credit-exit-restriction-design-review.md` | Pass（0 / 0 / 5） | Lewis Liu + Jay（2026-11-17） | WAYNE + Lewis Liu（2026-11-17） |
| `tasks.md` | `docs/reviews/20261117-add-credit-exit-restriction-tasks-review.md` | Pass（0 / 0 / 4） | Lewis Liu + Neal（2026-11-17） | WAYNE + Lewis Liu（2026-11-17） |

## 8. 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| # | 检查 | 结果 |
|---|---|---|
| 1 | 46 Scenario 均有 Design 落点 | Pass |
| 2 | A1–A5 / E1–E3 覆盖 API / E2E | Pass |
| 3 | 每条 Task 单层 + Owner + 验证命令 | Pass |
| 4 | 契约 / 迁移排在两端之前 | Pass |
| 5 | 无静默扩范围 | Pass |
| 6 | 系统清退不扣分 | Pass |
| 7 | 低信用测试不新增写接口 | Pass |
| 8 | 原型先行 | Pass |
| 9 | 契约 / 迁移号可排他 | Pass（P4 前置确认） |
| 10 | 未归档 Delta 不被修改 | Pass |

## 9. 阶段结论

**P3 Pass。** ATDD / 技术设计 / 任务清单 / 原型 / 预览齐备；design 与 tasks 工件评审已按矩阵签署；P3 未写业务代码。下一步 P4：`/sdd:atdd-apply`（T1 契约 → T2 迁移 → T3–T8 后端 → T9–T12 前端/E2E → T13 回归 → T14 G2）。

## 10. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0 | `41c173d` | 基线 + 范围裁决 |
| P1 | `13c63d8` | REQ-022 / 提案 / Delta 草稿 / 两故事 / P1 评审 |
| P2 | `c790357` | Delta 定稿 / AC-DoV / consistency-lint / G1 |
| P3 | 本次提交 | ATDD / design / tasks / 原型 / 预览 / design+tasks 评审 / P3 报告 |

## 11. 准入 P4 的条件

- 契约 0.15.0 + V21 排他确认；若 `add-ai-itinerary` 先落则顺延 0.16.0 + V22。
- 先写 Red：A1–A5 API 测试 / E1–E3 E2E / `CreditExitCalculatorTest` / `CreditRestrictionGuardTest`。
- `CreditService.book` 事件监听器 Spring 上下文启动验证；无循环依赖。
- 自动清理事务与并发集成测试；系统清退不扣分。
- 低信用测试只用 `CreditService.book` + `page.route`；不新增管理员/测试写接口。
- 原型预览在 P4 走查 1440 / 390 × 浅/深色；P4 不改原型。
