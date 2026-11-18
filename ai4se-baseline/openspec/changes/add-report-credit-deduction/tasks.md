# Tasks — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`｜ **阶段：** P3｜ **日期：** 2026-11-18
- **设计输入：** [`design.md`](design.md)（D1–D10）、[`atdd-design.md`](atdd-design.md)（A1–A18 / E1–E9 / R1–R5）
- **契约 / 迁移：** `openapi.yaml` `0.24.0` → `0.25.0`；Flyway `V29` → `V30__report_credit_deduction.sql`（P4 开工前复核占用）

## P4 执行顺序

> 契约先行 → 迁移 → 后端 → 前端 → E2E → 门禁 → 记录。每个任务先写失败用例（ATDD / TDD），再实现。
> 任务编号 1.x 为 OpenSpec checkbox 格式；P3 评审报告中的 T1–T12 与本表一一对应。

- [ ] 1.1 契约先行：`openapi.yaml` 升 `0.25.0`；改 `AdminReportResolveRequest`、扩 `ReportedUser`、扩 `AdminReportDetail`；同步前端 `types.ts` / `api.ts`（A4 / A15 / A16 / A18；产物：`openapi.yaml`、`types.ts`；验证：Redocly 0 error）
- [ ] 1.2 迁移 `V30__report_credit_deduction.sql`（两列可空）；`ReportEntity` / `Report` 映射（A5 / A16 / R4；产物：迁移 + entity / pojo；验证：SQLite + H2、`V29 → V30` 升级）
- [ ] 1.3 新增 `ReportViolationEnum`（8 码值 + 固定扣分 + OTHER 校验）；新增 `CreditService.snapshot`（只读、缺失 80）（A1 / A2 / A3 / A10 / A15；验证：映射 / 档位 / 不写库 UT）
- [ ] 1.4 重写 `AdminReportServiceImpl.resolve`：类型校验 → 计算 → 条件更新 → `book`；移除 `applyPenalty` / 账号状态调用；详情 / 列表补信用与违规字段（A1–A7 / A9–A11 / A13–A18 / R2 / R5；验证：`AdminReportControllerTest`）
- [ ] 1.5 并发与低分联动集成测试：A8（2 线程）、A12（80 -30 → 限制 + 清退）、A14（已受限不重复）（验证：1 条账本 / 1 条限制 / 清退断言）
- [ ] 1.6 前端扣分映射与表单：新增 `reportViolation.ts`；重写 `reportActionForm.ts`（E2 / E3 / E4 / E6；验证：两个 TS 单测）
- [ ] 1.7 详情页改造：移除处罚动作 / 封禁字段；新增违规类型 / OTHER 档位 / 三段预览 / 信用分与等级 / 处理历史违规字段 / 历史动作只读（E1 / E3 / E4 / E5 / E6 / E7 / R1；验证：组件或 E2E）
- [ ] 1.8 文案与样式：`adminMessages.ts` 新增文案；`styles.css` 加 `.admin-deduction-preview`（E1 / E3 / E4；验证：4 宽度 × 浅深色无横向溢出）
- [ ] 1.9 E2E 新 spec：`admin-report-credit.spec.ts`（E1–E7 / E9 / R1 / R3；验证：隔离库 + 8081 / 5174 全绿）
- [ ] 1.10 E2E 回归（G1 C1 / C2）：`admin.spec.ts` 用户管理页暂停 / 封禁 / 更新 / 恢复；举报旧断言改写；401 / 403 路径（E8 / A17；验证：回归全绿，C1 / C2 关闭）
- [ ] 1.11 门禁：后端 `./mvnw verify`、前端 `npm run test` + `typecheck` + `build`、Redocly、`openspec validate --strict`（全绿；失败项归因）
- [ ] 1.12 P4 记录与台账：`docs/sdd/add-report-credit-deduction/p4-apply.md`、`docs/ai4se-plugins/<ts>-local-verify-report.md`、registry / handoff / README（台账与代码一致；G2 待 VL）

## 覆盖自检

- **Spec → Tasks：** `user-credit` 3 Requirement → 1.2–1.5；`admin-console` 1 Requirement → 1.4、1.7–1.10；G1 C1 → 1.10；C2 → 1.4 / 1.10。
- **ATDD → Tasks：** API A1–A18 → 1.3–1.5、1.10；E2E E1–E9 → 1.7–1.10；反向 R1–R5 → 1.4 / 1.7 / 1.9 / 1.10。
- **Design 决策落点：** D1 / D2 → 1.1 / 1.3 / 1.4；D3 → 1.2；D4 / D5 → 1.3 / 1.4；D6 → 1.4 / 1.5；D7 → 1.2 / 1.4 / 1.7；D8 / D9 → 1.6 / 1.7；D10 → 1.1 / 1.2。
- **无越界任务：** 不含信用明细页、通知、历史补扣、用户举报原因枚举、月度上限。

## Alignment self-check（Spec ↔ Design ↔ Tasks ↔ ATDD）

| # | 检查 | 结果 | 说明 |
|---|---|---|---|
| 1 | 每个 Delta Requirement 至少 1 个任务 | Pass | 3 + 1 Requirement 均有任务承接 |
| 2 | 每个 ATDD API / E2E 场景有任务 | Pass | A1–A18、E1–E9、R1–R5 全覆盖 |
| 3 | 任务不超出 Spec 范围 | Pass | 无明细页 / 通知 / 补扣 / 枚举变更任务 |
| 4 | Design 决策均有任务落点 | Pass | D1–D10 见上 |
| 5 | 契约 / 迁移先于业务代码 | Pass | 1.1、1.2 在最前 |
| 6 | 验证尾任务存在 | Pass | 1.11 门禁、1.12 记录 |
| 7 | G1 C1 / C2 有承接 | Pass | 1.10（E8 / A17） |
| 8 | 历史数据与回归有任务 | Pass | 1.2 / 1.4 / 1.7 / 1.10 |
| 9 | 单任务 ≤ 约 2h | Pass | 12 个任务均为单层改动；1.4 / 1.9 最大，可按场景再拆执行 |

**结论：Pass。** 可进 P4；NFR 测试默认不纳入（见 `atdd-design.md` §6），如需纳入先补该节。
