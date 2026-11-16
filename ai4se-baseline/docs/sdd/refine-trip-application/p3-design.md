# P3 设计记录 — refine-trip-application

- **Change：** `refine-trip-application`（REQ-010 / S08 提交同行申请）｜ **阶段：** P3（Design & decompose DoV）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支：** `feature/refine-trip-application`（独立 worktree，基于 `origin/main@b93f45b`）
- **前置：** G1 Pass（`g1-decision.md`，IO WAYNE / SA Jacky，2026-11-16T12:10+0800）

## 1. 阶段目标

把已签署的 8 个场景拆成可执行的 ATDD 验收、技术设计与任务清单：确认分层、先写哪些失败检查、本地 / CI 门禁、fixtures、Non-goals 反向验证，并证明 Spec ↔ Design ↔ Tasks ↔ ATDD 一致、无静默范围扩张。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/refine-trip-application/atdd-design.md) | E2E 覆盖 E1–E8；既有 API 回归；Defer UT 两个纯函数；6 条 E2E 用例；门禁、fixtures、RV-1–RV-6；NFR deferred |
| 技术设计 | [`design.md`](../../../openspec/changes/refine-trip-application/design.md) | D1–D9：内联申请区、状态派生顺序、原型分支、错误映射、撤回、样式令牌、零后端改动、测试先行、G1 条件落点 |
| 任务清单 | [`tasks.md`](../../../openspec/changes/refine-trip-application/tasks.md) | T1 tests → T2–T4 frontend → T5 verify → T6 archive；对齐自检 Pass |
| P3 质量报告 | [`docs/ai4se-plugins/20261116-125752-quality-checklist-report.md`](../../ai4se-plugins/20261116-125752-quality-checklist-report.md) | P3-1–P3-4 全 Pass；Overall Pass |
| 检查点日志 | [`docs/ai4se-plugins/20261116-125730-quality-checklist-checkpoints.md`](../../ai4se-plugins/20261116-125730-quality-checklist-checkpoints.md) | C1 `p3` / C2 `full-stage`（preanswered）；probe 公共路径 FOUND |

## 3. 关键设计裁决

- **D1 内联申请区：** 删除申请 `Modal`，保留撤回确认弹窗（原型 `askConfirm` 同为确认框）；发布者操作不变。
- **D2 状态派生顺序：** `publisher → pending → accepted → completed → full → apply`；申请状态优先于行程状态，保证满员后已匹配用户仍能聊天 / 退出。
- **D3 原型分支：** pending = 等待提示 + 撤回；accepted = 名单提示 + 沟通 + 退出；unavailable = 原因提示；apply = 说明框 + 提交 + 聊天说明；待处理不重复展示自己的说明。
- **D4 错误映射：** `DUPLICATE_APPLICATION` →「已申请，请等待回应」；`TRIP_NOT_OPEN` → 按刷新后的行程状态显示「人数已满」/「行程已结束」/「当前不可申请」；失败后刷新申请与行程。
- **D5 撤回：** 用返回的已取消申请更新状态，表单立即恢复，不整页刷新。
- **D6 样式：** 只补 `.detail-application` 作用域类，数值对齐原型，颜色只用令牌；覆盖筛选面板 `.label` 的大写样式。
- **D7 零后端：** `openapi.yaml`、`backend/**`、`db/migration/**`、`docs/prototype/**` 不改。
- **D8 测试：** 先改 E2E 并跑红；`applicationEntry.ts` + 同目录 Vitest 覆盖状态与错误映射；E2E 用语义选择器、无 `waitForTimeout`。

## 4. 对齐自检

| 检查 | Result | 证据 |
|---|---|---|
| 8 个 Scenario 均有 ATDD 行与任务 | Pass | `atdd-design.md` §1.2 E1–E8；`tasks.md` T1–T3 |
| Non-goals 有反向验证 | Pass | RV-1–RV-6；T1 / T5 |
| 无静默范围扩张 | Pass | D7；`design.md` §2「不改」清单 |
| 任务可执行、一层一条 | Pass | T1 tests、T2–T4 frontend、T5 verify、T6 archive；每条含命令与覆盖 |
| ATDD 先于实现 | Pass | T1 red E2E；T2 先写单测 red |
| G1 条件与 L-02 / L-03 / L-04 有落点 | Pass | `design.md` D9；`tasks.md` T1 / T6 |

**结论：Pass。** 无阻塞性不一致。

## 5. 质量检查

- 阶段：`p3`；范围：`full-stage`（C1/C2 预答，已写入检查点日志）。
- 结果：P3-1 Pass、P3-2 Pass、P3-3 Pass、P3-4 Pass；**Overall Pass**。
- `openspec validate refine-trip-application --strict` → `Change 'refine-trip-application' is valid`。
- 无阻塞缺口；P2 遗留的 L-02 / L-04 由 T6 承接，L-01 仍归 rules-govern。

## 6. 风险与后续

| 风险 | 处理 |
|---|---|
| 页面停留期间状态过期 | 失败后刷新申请 + 行程；E2E 用 `page.request` 制造三种服务端变化 |
| 两种 409 分支漏测 | duplicate 用例覆盖 `DUPLICATE_APPLICATION`；fills 用例覆盖 `TRIP_NOT_OPEN` |
| 已匹配用户满员后失去聊天 / 退出 | 状态顺序申请优先；单测覆盖 full + accepted |
| E2E 数据累积 | 唯一标题 + 可完成行程在末尾结束；按 id 直达详情 |
| Living Spec 合并只追加不替换 | T6 在 P5 / G3 前核对 8 场景与 5 个基线语义 |

## 7. 阶段结论与提交

- **阶段结论：Pass**，进入 P4（`/sdd:atdd-apply`，从 T1 `e2e/tests/companions.spec.ts` 的 red 用例开始）。
- **阶段提交：** 按用户当次要求，每阶段一次本地提交；P4 完成后先 `git pull` 再 push。本阶段提交信息为 `docs(p3): refine-trip-application add ATDD design tasks and P3 quality record`。
- **分支状态：** 基于 `origin/main@b93f45b`；P1 `7bfbf93`、P2 `4b8ff8c`、P3 为本条提交；P3 开始时 `ahead 2, behind 16`，按用户要求不中途 pull / push。
- **偏离：** 阶段性提交偏离 `@rule:git-commit-conventions`（verify / archive 两次提交），以用户当次显式指示为准，已在 `proposal.md` / `handoff.md` 记录。
