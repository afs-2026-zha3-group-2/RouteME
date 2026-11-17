# P3 阶段记录 — add-credit-recovery

- **Change：** `add-credit-recovery`（REQ-027 / S28 安全学习恢复信用分）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者）
- **基点：** 分支 `feature/add-credit-recovery`（基于 `origin/main@ec360dc`）
- **前置偏差：** ~~**G1 为 Pending**~~ → **2026-11-17 已签：G1 Pass（无条件，IO=WAYNE / SA=Jacky）**。P3 曾在 Pending 期间按用户裁定以「起草态」推进，现已关闭该偏差。

> **过程快照：** 需求 / 故事编号、契约与迁移号、403 错误码已随 P4 合并与四次号位顺延（第四次 `origin/main@0f4ab14`）统一为 REQ-027 / S28 / `0.23.0` / `V27` / `CREDIT_RESTRICTED`；本文保留 P3 当时口径（自建 `CreditGateService`），变更明细见 `p4-apply.md` §8。

## 1. 阶段目标

把已完成 P2 的 Delta（7 Requirement / 29 Scenario）收敛为可执行的实现方案：补原型截点 → ATDD 分层 → 技术设计（D1–D14）→ 带复选框与验证命令的任务清单（T1–T13）→ 四份工件评审，并完成 Spec ↔ ATDD ↔ Design ↔ Tasks 四向对齐自检。

## 2. 产出

| 工件 | 路径 | 结论 |
|---|---|---|
| 原型截点 | [`docs/prototype/credit-learning.html`](../../../docs/prototype/credit-learning.html)（408 行） | 独立页，四态（学习 / 答题 / 结果 / 已恢复）+ 无需恢复态；三组演示场景可切；深色模式；样式内联，**未触碰 stash 中的 6 个 prototype 文件** |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-credit-recovery/atdd-design.md) | A1–A29 与 Delta 29 Scenario 一一对应（API 24 / 仅 E2E 2 / Defer UT 3，A18 兼 UT）；含 6 个后端测试类 + 1 个 E2E spec 的先红清单、门禁表、夹具策略、8 行 Non-goals 反向验证 |
| 技术设计 | [`design.md`](../../../openspec/changes/add-credit-recovery/design.md) | D1–D14 决策总览（每条含否决理由）+ V27 建表 SQL + 后端分层落点 + 4 段流程伪代码 + 契约 0.23.0 + 前端文件表 + 6 条风险 + 6 项对齐自检 |
| 任务清单 | [`tasks.md`](../../../openspec/changes/add-credit-recovery/tasks.md) | T1–T13（contract 1 / backend 6 / frontend 4 / e2e 1 / docs 1），每任务 `- [ ]` + 验证命令 + A 编号；覆盖映射 29/29 无孤儿任务 |
| 工件评审 | `docs/reviews/20261117-add-credit-recovery-{proposal,spec,design,tasks}-review.md` | 4 份均 **Pass**（BLOCKER 0）；共 20 条 findings（WARNING 10 全已收口 / SUGGESTION 10）；修正 2 处事实错误（`V21` 基线、`-Dtest` 分隔符）与 1 处规格-实现冲突（R6「立即展示」） |

## 3. 本阶段裁决

| 编号 | 议题 | 裁决 | 依据 |
|---|---|---|---|
| P3-D1 | G1 未签能否开工 | **按起草态推进**：工件照常产出并全部标注「G1 Pending，签署后生效」；不代签、不伪造结论 | 用户裁定；规则未禁止「起草态先行」，但 P4 开工前必须补签 |
| P3-D2 | 学习进度持久化（OQ-5） | **只存完成标记 + 结果**：`learning_completed_at`、抽中题号、作答、得分、判定；刷新不额外扣次数 | 用户裁定；不建逐题明细表（design D1） |
| P3-D3 | 页面路由（OQ-6 前半） | **`#/credit/learning` 独立页**，沿用既有 hash 路由 | 用户裁定 |
| P3-D4 | 页面入口（OQ-6 后半） | **仅「发布行程被拦截时的提示」**；不在首页、个人主页信用行、左侧导航加入口 | 用户裁定；对应 design D12 |
| P3-D5 | 契约与迁移号 | **`0.23.0 + V27`**（`0.15.0 + V21` 已被 `add-ai-itinerary` 登记）；合并前若前者放弃则复核一次 | design D10 + §1 号位说明 |
| P3-D6 | 并发控制手法 | **不引入 `SELECT ... FOR UPDATE`**：SQLite 无行锁语法，V20 已定「单份 SQL 兼容 SQLite/H2」；改用 `credit_ledger.idempotency_key` 唯一索引 + `recorded(key)` 预判 | design D8；R7 的并发场景仍可满足 |

## 4. 关键技术结论（详见 `design.md`）

- **唯一拦截面**：`CreditGateService.assertCanPublish` 只在 `TripController.create` 调用，`TripPlanService` 其余入口零改动；`app_users` 不加限制列。
- **恢复口径**：`delta = 60 - before` 经 `CreditService.book` 落账本（`SAFETY_LEARNING_RECOVERY` / `relatedId = sessionId`），不使用固定加分；会话结果与记账同事务。
- **月度唯一**：幂等键 `learning-recovery:<userId>:<monthKey>` 一份键承担「每月 1 次恢复」与「并发只生效一次」；考试次数由会话表 `(user_id, month_key)` 计数派生，不建计数表。
- **时间窗口**：`CreditMonth.monthKey(Instant)` 复用 `TripTimeZoneConstant.ZONE`（Asia/Shanghai），SQL 内不做月份换算。
- **契约**：3 端点 / 4 schema / 6 错误码；`LearningQuestion` 与 `LearningAnswerDetail` 的属性集合**不含答案**，由 `OpenApiTest` 精确断言。
- **前端**：`learningState.ts` 承担全部状态派生与错误文案，界面组件不写业务 if；视觉令牌全部取自原型，复用两栏结构。

## 5. 校验

- `npx --no-install openspec validate add-credit-recovery --strict` → **valid**（评审中修订 Delta R6 的取数时机限定句后重跑通过）。
- 对齐自检：Spec 29 ↔ ATDD 29 ↔ Tasks 覆盖 29/29 ↔ Design D1–D14，7 项全 Pass（见 `tasks.md` 末节）。
- 号位排他：`0.23.0 + V27` 与 `add-ai-itinerary`（`0.15.0 + V21`）不冲突；`openspec/changes/` 下 23 个目录中仅二者涉及信用/契约号。
- 原型未触碰 `stash@{0}`（`wip-prototype-before-credit-recovery`，6 个文件），合并时不会产生冲突。

## 6. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| 当前开发者 | Lewis Liu | `design.md` / `tasks.md` 第一签署位 | 2026-11-17 |
| 第二签署（design） | Jay | `design.md` D1–D14 | 2026-11-17 |
| 第二签署（tasks） | Jay | `tasks.md` T1–T13 + 覆盖映射 | 2026-11-17 |
| IO + SA | WAYNE / Jacky | **G1 结论已由 Pending 改为 Pass（无条件）**（`g1-decision.md`），原起草态偏差关闭 | 2026-11-17 |

**阶段结论：** P3 **Pass**（G1 Pass + 4 份工件评审 Pass + 四份工件签署齐备）。

## 7. 带入 P4 的跟踪项

| 项 | 说明 |
|---|---|
| G1 补签 | 最高优先：未取得具名签署前不得提交 T1 契约改动 |
| T1 契约先红 | `OpenApiTest` 必须先断言 4 schema 与 6 错误码，再改后端 |
| 迁移双路径 | `CreditLearningMigrationSqliteTest` 覆盖全新库 V1–V27 与旧库（V20）升级 |
| 时区边界 | A21 / A23 用 `2026-11-30T23:30Z`（北京 12-01 07:30）与 `2026-11-30T16:00Z` 两组 |
| 并发用例 | A29 在 H2 双线程跑；SQLite 侧只做结构断言（库级锁不适合并发单测） |
| E2E 不在 CI | 沿用既有残余风险；`credit-learning.spec.ts` 在 P4 本地全量回归 |
| 视觉回归 | 无截图产物；按 DOM / 计算样式文本化核对原型四态与深色模式 |
| 号位复核 | 合并前确认 `add-ai-itinerary` 是否仍占用 `0.15.0 + V21` |

## 8. 提交记录

本阶段**未提交**。新增：`openspec/changes/add-credit-recovery/{atdd-design,design,tasks}.md`、`docs/prototype/credit-learning.html`、`docs/reviews/20261117-add-credit-recovery-{proposal,spec,design,tasks}-review.md`、本记录；同步修改：`requirement-workspace/{registry,stories,handoff}.md`、`docs/sdd/README.md`、`specs/user-credit/spec.md`（R6 限定句）、`proposal.md`（P3 回填）。
