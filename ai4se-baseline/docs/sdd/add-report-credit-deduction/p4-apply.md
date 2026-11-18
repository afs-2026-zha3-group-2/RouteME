# P4 阶段记录 — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`（Issue #29 / REQ-029 / S30）｜ **阶段：** P4（Implement & verify）
- **日期：** 2026-11-18 ｜ **记录人：** Lewis（SM，当前开发者）
- **分支：** `feature/add-report-credit-deduction`；基线已并入 `origin/main@822471c`
- **契约 / 迁移：** `openapi.yaml` `0.26.0`；`V31__report_credit_deduction.sql`

## 1. 阶段目标

按 `atdd-design.md`（A1–A18 / E1–E9 / R1–R5）与 `tasks.md`（1.1–1.12）完成实现：举报成立时按违规类型自动扣信用分并写账本，举报页只保留「违规类型 + 违规原因」，账号处置留在用户管理页；完成门禁、E2E 与 P4 台账。

## 2. 产出

| 层 | 产物 | 验证 |
|---|---|---|
| 契约 | `openapi.yaml` `0.26.0`：`AdminReportResolveRequest`（`outcome/note/violation_type/other_deduction`）、`ReportedUser` 增 `credit_score/credit_level`、`AdminReportDetail` 增 `violation_type/applied_deduction` | Redocly valid（0 error / 25 既有 warning，无本 change 路径） |
| 迁移 | `V31__report_credit_deduction.sql`（两列可空） | 全新隔离库与 H2 均 V1–V31 重放成功 |
| 后端 | `ReportViolationEnum`（8 类 + `OTHER` 四档）、`CreditService.snapshot`（只读、缺失 80、不建账户）、`AdminReportServiceImpl.resolve` 重写（类型校验 → `min(deduction, before)` → 条件更新 → `book` → 明细）、移除处罚动作 / 封禁字段写入 | `AdminReportControllerTest` 26、`ReportViolationEnumTest` 6、`CreditServiceSnapshotTest` 2、`ReportCreditConcurrencyTest` 1 |
| 后端（D-4 扩展） | `AccountStatusService`：BANNED 允许更新封禁 / 恢复；用户管理页新增「更新封禁」 | `AdminUserControllerTest` / `AccountStatusServiceTest` 全绿；E2E `[I1] bans…` 覆盖 |
| 前端 | `types.ts`、`reportViolation.ts`（双端同值映射）、`reportActionForm.ts`（新状态与校验）、`AdminReportDetailPage`（违规类型 / OTHER 档位 / 三段预览 / 详情信用 / 历史违规字段 / 旧动作只读）、`adminMessages.ts`、`styles.css`（`.admin-deduction-*` 仅主题令牌） | `typecheck` + 515 tests / 63 files + `build`（合并 `origin/main@2bf9148` 后复验） |
| E2E | 新增 `admin-report-credit.spec.ts`（E1–E7 / E9 / R1 / R3）；改写 `admin.spec.ts` 举报用例；用户管理页暂停 / 封禁 / 更新封禁 / 恢复回归 | 两份 spec **17/17**（6 + 11） |
| 文档 | `tasks.md` 勾选 1.1–1.12 + 执行偏差 D-1–D-6；本记录；`docs/ai4se-plugins/20261118-114448-local-verify-report.md` | — |

## 3. 关键实现口径

- **扣分只由服务端派生**：请求不可传分值；`applied_deduction` 记录实际扣减（正数），`0` 表示已截断；账本 `applied_delta` 仍为负数。
- **并发**：先以 `status=PROCESSING` 条件更新报告，成功者再 `book`；幂等键 `REPORT_VIOLATION:<reportId>` 兜底；并发用例证明 1 成功 / 1 冲突 / 1 条账本。
- **低分联动**：复用 `CreditChangedEvent → CreditEnforcementServiceImpl.onCreditChanged`；A12 覆盖 80 −30 → 50 触发限制并清退，A14 覆盖已受限不重复。
- **历史数据**：旧举报 `violation_type` / `applied_deduction` 为 null，前端降级「—」；`resolution_action` 仅非空时以「历史处罚动作」只读展示。
- **账号状态**：扣分不改账号状态（E5 / R2）；账号处置只在用户管理页。

## 4. G1 条件关闭

| 条件 | 状态 | 证据 |
|---|---|---|
| C1 用户管理页处罚回归（暂停 / 封禁 / 更新封禁 / 恢复） | **Closed** | E2E `[I1]` 两条用例；D-4 补齐 BANNED 的「更新封禁 / 恢复」并加后端用例 |
| C2 401 / 403 / 404 / 409 回归 | **Closed** | `AdminReportControllerTest` 权限与状态守卫用例；E2E `[I1]` 403 / `[I2]` 409 |
| C3 D1 替换追认 | Closed（G1 签署时） | `g1-decision.md` |
| C4 归档顺序 | 待 P5 | MUST 排在 `add-admin-console` 与 `add-credit-account` 之后 |

## 5. 执行偏差

见 `tasks.md`「执行偏差记录（P4）」D-1–D-6。其中 **D-4 为范围扩展**：举报页移除处罚动作后，BANNED 在后台失去唯一更新入口；经用户 2026-11-18 裁决，在用户管理页补齐「更新封禁 / 恢复」，属关闭 G1 C1 的最小必要改动。

## 6. 门禁结果

| 项 | 命令 | 结果 |
|---|---|---|
| 后端 | `./mvnw.cmd -B -o verify` | **640 tests / 93 classes，0 failures / 0 errors**，BUILD SUCCESS（合并 `origin/main@2bf9148` 后复验） |
| 前端类型 | `npm run typecheck` | Pass |
| 前端单测 | `npm run test` | **515 tests / 63 files** Pass（合并后复验） |
| 前端构建 | `npm run build` | Pass（仅既有主 chunk >500 kB 警告） |
| E2E | `npx playwright test tests/admin-report-credit.spec.ts tests/admin.spec.ts` | **17/17**（合并后复验；隔离库 + 后端 8082 / Vite 5174） |
| 契约 | `npx --yes @redocly/cli lint openapi.yaml` | valid（0 error / 26 既有 warning） |
| 规格 | `npx openspec validate add-report-credit-deduction --strict` | valid（归档顺序 INFO 为已知约束） |

## 7. 待签与后续

| 项 | 说明 | Owner |
|---|---|---|
| G2 | 本地验证证据齐备，`g2-decision.md` 未创建；模型不得代签 | VL（Neal） |
| 全量 E2E | 本轮只跑本 change 与受影响 admin 回归（17 条），未跑全量 | Dev / P5 |
| 归档 | MUST 排在 `add-admin-console` 与 `add-credit-account` 之后 | P5 |

## 8. 提交记录

P4 产物一次性提交：`feat(p4): add-report-credit-deduction report violation credit deduction`；提交后 `git pull --no-rebase --no-edit` 再 `git push`。提交范围仅本阶段产物（后端 / 前端 / E2E / 契约 / 迁移 / 文档 / 台账），不含无关改动。

## 9. 合并 origin/main 与复验

- 第一次合并 `origin/main@23c1088`（5 个提交，含 AI 单页对话与 `CreditRestrictionGate`）；无代码冲突；复验后端 596 / 前端 492 / E2E 17/17。
- 第二次合并 `origin/main@2bf9148`（8 个提交，含 `add-travel-finance`）；冲突仅 4 份需求工作区台账（`deep-dive.md` / `impact-brief.md` / `registry.md` / `stories.md`），均保留双方内容。
- 号位顺延（后到者）：`add-travel-finance` 先占 **REQ-028 / S29 / V30 / 0.25.0**，本 change 改为 **REQ-029 / S30 / V31 / 0.26.0**（change id 不变）：`V30__report_credit_deduction.sql` → `V31__report_credit_deduction.sql`；意图 / Ready 文件由 `REQ-028-*` 更名为 `REQ-029-*`；活跃文档与 `OpenApiTest` 版本断言同步。
- 合并后复验：后端 **640/640（93 classes）**、前端 **515/515（63 files）** + `typecheck` + `build`、E2E **17/17**（本 change 6 + admin 11，隔离库全新 Flyway V1–V31）、`openspec validate --strict` valid、Redocly valid（0 error / 26 既有 warning）。
