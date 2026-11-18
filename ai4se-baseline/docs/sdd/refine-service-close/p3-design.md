# P3 阶段记录 — refine-service-close

- **Change：** `refine-service-close`（`customer-service` ADDED）｜ **需求：** REQ-028 ｜ **故事：** S29
- **阶段：** P3（ATDD 设计 / 技术设计 / 任务拆分）｜ **日期：** 2026-11-18
- **记录人：** Lewis Liu（当前开发者）
- **分支：** `feature/refine-service-close`（基线 `origin/main@9a13fe4`）

## 1. 阶段目标

把已签 Delta（3 Requirement / 31 Scenario）落成可执行的 ATDD 设计、技术设计与任务清单，并完成 Spec ↔ Design ↔ Tasks ↔ ATDD 对齐自检。

## 2. 输入

| 工件 | 路径 | 状态 |
|---|---|---|
| Delta Spec | `openspec/changes/refine-service-close/specs/customer-service/spec.md` | 31 Scenario；`validate --strict` valid |
| 提案 | `openspec/changes/refine-service-close/proposal.md` | 已签（WAYNE） |
| G1 | `openspec/changes/refine-service-close/g1-decision.md` | Pass（无条件），IO=WAYNE / SA=Jacky |
| 需求 | `requirement-workspace/requirements/REQ-028-service-close.md` | 36 场景；DoR BLOCKER 0 |

## 3. 产出

| 工件 | 路径 | 规模 |
|---|---|---|
| ATDD 设计 | `openspec/changes/refine-service-close/atdd-design.md` | 31 场景 → API 24 / E2E 11 / Defer UT 4 组；含 Non-goals 反向验证 |
| 技术设计 | `openspec/changes/refine-service-close/design.md` | 状态机 6 迁移、契约 0.25.0、V30、前后端变更、T1–T12 决策 |
| 任务清单 | `openspec/changes/refine-service-close/tasks.md` | T1–T11 + 前置 + 对齐自检 |

## 4. P3 开工前的 Delta 增补

复核概览契约时发现：`AdminDashboardServiceSessions.by_status` 为三键且 `additionalProperties: false`，而 `add-admin-dashboard` Delta 要求「不省略任何状态键 / 总数 = 分桶之和」。新增 `RESOLVED` 后必须扩桶，否则运行期 `merge` 会写出第四键、违反契约。

- 处理：Delta 增补 1 条 Scenario「概览统计包含待用户确认分桶」，30 → 31；proposal / dov-ac-review / consistency-lint（L-06）/ g1-decision（Post-G1 addendum）/ p2-spec 同步回写。
- 用户裁决：概览加「待用户确认」第四段（2026-11-18）。
- `openspec validate --strict` 复跑 valid。
- G1 Decision 不变（Pass 无条件）。

## 5. 设计要点

| 主题 | 定稿 |
|---|---|
| 状态机 | `WAITING` / `HANDLING` / `RESOLVED` / `CLOSED`；6 条合法迁移；闭集外 409 |
| 用户结束 | `POST /api/service/sessions/{sessionId}/close`；三态 CAS；`closed_by=用户 id`；重复 409 `SESSION_CLOSED` |
| 客服标记完成 | `POST /api/admin/service/sessions/{sessionId}/resolve`；仅 `HANDLING`；`resolved_*` 留痕；直接生效 |
| 管理端 close | 端点删除（旧路径 404）、按钮移除 |
| 消息回迁 | `RESOLVED` 下任一方发言 → `HANDLING` 并清空 `resolved_*`；同事务；并发关闭时 409 |
| `current` | `openSession` 扩三态，待确认不再被误判为已结束 |
| 数据 | `V30`：`resolved_at VARCHAR(40)` / `resolved_by INTEGER` |
| 契约 | 0.25.0；`ServiceSessionStatus` 四值；`resolved_at` 可空；概览 `by_status` 四键 |
| 文案（OQ-4） | 三态按钮统一「结束会话」；确认弹窗按状态区分；待确认提示固定；管理端「标记处理完成」 |
| 排序（OQ-6） | `WAITING` 置顶升序；其余（含 `RESOLVED`）按创建时间倒序 |
| 徽标 | 仍只统计 `WAITING` |

完整决策 T1–T12 见 `design.md` §9。

## 6. 排他确认

| 项 | 证据 | 结论 |
|---|---|---|
| 契约版本 | `origin/main@9a13fe4` 的 `openapi.yaml` `version: 0.24.0` | 本 change 用 **0.25.0** |
| 迁移号 | `origin/main@9a13fe4` 迁移最大号 `V29__credit_exit_application.sql` | 本 change 用 **V30** |
| 基线同步 | 已 `git merge origin/main`（2 提交，仅 `AmapService.ts` / AI 规划相关，无本 change 相关文件冲突） | 设计基于最新 main |
| 归档顺序 | `customer-service` 未进 Living Spec | MUST 排在 `add-admin-console` 之后（P5 不执行） |

## 7. 对齐自检

`tasks.md`「对齐自检」表全部 Pass：

- Delta 31 场景 → ATDD 31 行（U1–U9 / A1–A11 / S1–S11）。
- Design 覆盖 6 条迁移、2 个新端点、1 个删除端点、留痕字段、概览四桶。
- Tasks T1–T11 逐项承接设计；Red 顺序与 ATDD §3 一致。
- 无静默扩范围：唯一增量是概览第四段，已补 Delta 并由用户确认。

## 8. 评审与签署

| 工件 | 评审报告 | 工件签署 | 报告签署 | 状态 |
|---|---|---|---|---|
| `design.md` | `docs/reviews/20261118-refine-service-close-design-review.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE | WAYNE + 当前开发者 | 已签署（Lewis Liu + Jacky；WAYNE + Lewis Liu） |
| `tasks.md` | `docs/reviews/20261118-refine-service-close-tasks-review.md` | 当前开发者 + 1 名非当前开发者且非 WAYNE | WAYNE + 当前开发者 | 已签署（Lewis Liu + Jacky；WAYNE + Lewis Liu） |

- 当前开发者：Lewis Liu。
- 第二签署人：Jacky（SA），非当前开发者且非 WAYNE。
- 四份签署均于 2026-11-18 经发起人当次会话确认「四份全部批准」。

## 9. 质量检查（P3）

- `docs/ai4se-plugins/20261118-110510-quality-checklist-checkpoints.md`（checkpoint）。
- `docs/ai4se-plugins/20261118-110551-quality-checklist-report.md`：P3-1 Pass、P3-2 Pass、P3-3 Pass、P3-4 Pass；**Overall Pass**（required 4/4）。

## 10. 下一步

1. 取得 design / tasks 工件签署（当前开发者 + 第二签署人）与两份评审报告签署（WAYNE + 当前开发者），回填两份报告与本节。— 已完成（2026-11-18）
2. 执行 P3 质量检查，回填 §9。— 已完成（Overall Pass，required 4/4）
3. 提交 P3 阶段（`docs(p3): refine-service-close add atdd/design/tasks`）。
4. 进入 P4：T1–T11 实现、测试、E2E 改写与本地验证；G2 由 VL 签署。
