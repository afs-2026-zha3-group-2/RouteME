# P2 规格记录 — add-trip-completion

- **Change：** `add-trip-completion`（REQ-011 / S15）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16 ｜ **记录：** `/sdd:p2` 会话

## 1. 阶段目标

把 P1 提案收敛为可验证的 Delta Spec，完成 AC/DoV 评审、一致性检查与 G1 对齐签署。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec — 行程 | [`specs/trip-plans/spec.md`](../../openspec/changes/add-trip-completion/specs/trip-plans/spec.md) | MODIFIED 4（浏览未结束 / 发布 / 详情状态 / 发布者结束）+ ADDED 3（四态与日期流转 / 即将结束提醒 / 已结束口径统一） |
| Delta Spec — 同行 | [`specs/trip-companions/spec.md`](../../openspec/changes/add-trip-completion/specs/trip-companions/spec.md) | MODIFIED 5（提交与取消申请 / 处理申请 / 聊天 / 退出同行 / 我的旅行聚合） |
| AC / DoV 评审 | [`dov-ac-review.md`](../../openspec/changes/add-trip-completion/dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；S15-1~26 全部 traceable |
| 一致性检查 | [`consistency-lint.md`](../../openspec/changes/add-trip-completion/consistency-lint.md) | phase=p2；Pass；0 BLOCKER / 0 WARNING / 5 SUGGESTION |
| G1 决策 | [`g1-decision.md`](../../openspec/changes/add-trip-completion/g1-decision.md) | **Pass**；IO=WAYNE、SA=Jacky / Karena；双 capability 例外已追认 |
| P2 质量报告 | [`docs/ai4se-plugins/20261116-145842-quality-checklist-report.md`](../../docs/ai4se-plugins/20261116-145842-quality-checklist-report.md) | P2-1 ~ P2-4 Pass；Overall Pass |
| 校验 | `openspec validate add-trip-completion --strict` | valid |

## 3. P2 补齐的规格缺口

1. **S15-26 归属：** 新增 `trip-plans`「已结束口径的统一消费」，并在 `trip-companions`「我的旅行聚合与最低安全能力」补自动完成收录与旅行中归属场景。
2. **旧规格冲突：** `trip-companions`「退出同行」重写——未开始的满员行程退出后回退招募中，旅行中退出保持旅行中。
3. **只读消费方：** `trip-experiences` / `user-profiles` 不新增 delta，作为 P4 回归项显式记录。

## 4. G1 签署

| 角色 | 姓名 | 结论 | 日期 |
|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-16 |
| SA | Jacky / Karena | Pass（双 capability 例外追认） | 2026-11-16 |

**G1：Pass。** 无阻断条件；跟踪项见 `g1-decision.md`。

## 5. 下一步

- P3：`/sdd:atdd-design` → `/sdd:task-plan`。
- P3 必须先定：自动完成物化方案（懒写入 / 读时投影）、待处理申请批量取消触发、契约 `ongoing` 版本号。

## 6. G1 后补记（2026-11-16）

- IO 指出「页面停留过期仍可申请」的风险；Delta 补充两个边界场景（`trip-plans` 四态、`trip-companions` 提交申请）。
- P3 前置决策已确认：D10 懒写入；D11 批量取消随物化同事务；D12 契约 0.9.0；D13 种子保留 + E2E 相对日期夹具。
- 统一物化入口：单条 `require` 内部物化；列表查询前批量物化；所有写操作先经过该入口；前端收到 409 / `CHAT_READ_ONLY` 后刷新。
- G1 Pass 维持；`openspec validate --strict` 仍 valid。
