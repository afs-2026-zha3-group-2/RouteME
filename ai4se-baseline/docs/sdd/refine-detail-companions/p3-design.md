# P3 — refine-detail-companions（REQ-020 同行者卡片化设计）

- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者）｜ **阶段：** P3 Pass
- **Change：** `refine-detail-companions`
- **工件：** [`atdd-design.md`](../../openspec/changes/refine-detail-companions/atdd-design.md)、[`design.md`](../../openspec/changes/refine-detail-companions/design.md)、[`tasks.md`](../../openspec/changes/refine-detail-companions/tasks.md)

## 1. 输入

| 输入 | 路径 | 结论 |
|---|---|---|
| Delta Spec | `openspec/changes/refine-detail-companions/specs/trip-plans/spec.md` | MODIFIED 1 Requirement / 12 Scenario |
| G1 | `openspec/changes/refine-detail-companions/g1-decision.md` | Pass（IO=WAYNE / SA=Jacky），D1 语义替换已批准 |
| P2 lint | `openspec/changes/refine-detail-companions/consistency-lint.md` | Pass；6 条 SUGGESTION 中 L-01（空态文案）、L-02（组件测试分层）、L-03（`publisherSummary` 命名）由 P3 落定 |
| 测试规则 | `docs/knowledge/rules/testing/rules.md#web-testing` | 纯逻辑 Vitest + Playwright；组件层 Testing Library 在仓库不可用 |

## 2. P3 落定的争议点

| 编号 | 争议 | 结论 |
|---|---|---|
| L-01 | 空态文案 | `tripMessages.detailParticipantsEmpty = '还没有其他同行者。'`；不复用 `detailParticipantsPending` |
| L-02 | 是否补 Testing Library 组件测试 | 不补。仓库 `vitest` 为 node 环境且只收 `src/**/*.test.ts`，无 jsdom / Testing Library；阻断项由纯逻辑单测 + E2E 满足，缺口登记为残余风险 |
| L-03 | `publisherSummary` 命名 | 保持原名复用，不新增同义别名；P4 在组件顶部注释说明 |
| — | NFR 测试 | 用户确认不纳入本 change（2026-11-17） |

## 3. ATDD 设计摘要

- 12 条场景全部落在 E2E；API 层只保留一条反向守卫 A1（`participants` 仍含发布者 / 字段完整），守住零契约 Non-goal。
- 3 条基线场景（状态徽标 / 申请入口 / 游后分享区）不改代码，由既有 E2E 回归覆盖。
- Red 顺序：E2E 新用例（Red A）→ `chat-entry.spec.ts` 选择器（Red B）→ `companions.test.ts`（Red C）→ 原型 → 实现 → 样式。
- fixtures：id 2 发布、id 1 与 id 4 同行、注册的稀疏用户验证仅昵称、id 3 旁观。
- 组件层无新增测试，已记录理由与残余风险。

## 4. 设计取舍

| 编号 | 取舍 | 结论 |
|---|---|---|
| D1 | 展示范围 | 前端按 `trip.publisher.id` 过滤，不改后端 `participants` 与人数口径 |
| D2 | 卡片密度 | 复用 `.publisher-*` 排版类，新增样式只做容器与卡片壳 |
| D3 | 交互 | 整卡 `button` 打开 `openProfile`；聊天 `a` 为兄弟节点，不嵌套 |
| D4 | 逻辑边界 | `tripCompanions(participants, publisherId)` 过滤 / 去重 / 保序；`length === 0` 走空态 |
| D5 | 样式收敛 | 摘出 `.detail-stops`、删除两处 `.detail-participants` 规则、新样式追加末段；无十六进制色值 |
| D6 | 测试分层 | 纯逻辑单测 + E2E，不引入 Testing Library |
| D7 | 原型先行 | 先改 `docs/prototype/ui.js` 的 `compPanel` 与 `styles.css`，`.companion` 保留给身份切换弹窗 |

## 5. 任务与顺序

T1 原型 → T2 纯逻辑（Red→Green）→ T3 卡片与详情接入 → T4 样式收敛 → T5 E2E 新用例 → T6 既有选择器同步 → T7 回归与验证报告 → T8 文档。

执行顺序按 ATDD：**T5 / T6 先写并跑红** → T1 原型 → T2 → T3 → T4 → T7 → T8。完整清单见 `tasks.md`。

## 6. 工件评审与签署

| 工件 | 报告 | 结论 | 签署 |
|---|---|---|---|
| `design.md` | `docs/reviews/20261117-refine-detail-companions-design-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION） | Lewis Liu + Jacky（工件）、WAYNE + Lewis Liu（报告） |
| `tasks.md` | `docs/reviews/20261117-refine-detail-companions-tasks-review.md` | Pass（0 BLOCKER / 0 WARNING / 3 SUGGESTION） | Lewis Liu + Jacky（工件）、WAYNE + Lewis Liu（报告） |

## 7. 质量报告

- `docs/ai4se-plugins/20261117-133025-quality-checklist-report.md`（P3 Overall Pass；P3-1 ~ P3-4 全 Pass）。
- 检查点日志：`docs/ai4se-plugins/20261117-133002-quality-checklist-checkpoints.md`。

## 8. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | `6b6038d` | `docs(p1): refine-detail-companions add REQ-020 proposal and delta` |
| P2 | `afb3bac` | `docs(p2): refine-detail-companions refine the delta and record G1` |
| P3 | 待提交 | `docs(p3): refine-detail-companions design the companion cards and tasks` |

## 9. 下一阶段

- P4：`/sdd:atdd-apply` → 先原型后实现 → 前端单测 / 构建 / E2E → `docs/ai4se-plugins/<ts>-local-verify-report.md` → G2（VL 签署）。
- 合并 `origin/main` 后抽查 `styles.css` 中 `.detail-companions` / `.companion-card` 是否仍在。
