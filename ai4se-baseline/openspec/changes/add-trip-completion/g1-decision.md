# G1 decision — add-trip-completion

- **Change id:** `add-trip-completion`（REQ-011 / S15 结束行程）
- **Gate:** G1（Align）
- **Inputs:**
  - Delta Spec：`openspec/changes/add-trip-completion/specs/trip-plans/spec.md`（MODIFIED 4 + ADDED 3）、`specs/trip-companions/spec.md`（MODIFIED 5）
  - AC / DoV 评审：`openspec/changes/add-trip-completion/dov-ac-review.md`（AC 4/4 Pass；DoV 5/5 Pass）
  - 一致性检查：`openspec/changes/add-trip-completion/consistency-lint.md`（Pass；0 BLOCKER / 0 WARNING / 5 SUGGESTION）
  - 提案：`openspec/changes/add-trip-completion/proposal.md`
  - 需求基线：`requirement-workspace/requirements/REQ-011-trip-completion.md`（26 场景，7 条 blocking OQ 全 resolved，DoR BLOCKER 0）
  - 校验：`openspec validate add-trip-completion --strict` → valid
- **Findings:**
  - **Scope：** 与提案一致，无静默扩张；范围含四态与日期流转、发布校验、结束权限与善后、旅行中申请规则、退出同行状态重算、提醒、列表/统计统一口径。
  - **Ambiguity：** 无未解决业务歧义；自动完成物化时机（D9）、提醒去重（OQ-10）、批量取消触发（OQ-11）为 P3 技术决策，已标 deferred 且有 owner。
  - **Conflict：** 无 BLOCKER；已消除「退出后满员回退」与「旅行中保持旅行中」的旧规格冲突（`退出同行` MODIFIED）；已补齐 S15-26 的「已结束口径」与「我的旅行聚合」归属。
  - **例外：** 双 capability（`trip-plans` + `trip-companions`）由 SA 明确追认。
- **Decision:** Pass
- **Conditions + owners:** 无阻断条件。跟踪项（非阻断）：
  - P3 定下自动完成物化与批量取消触发方案（owner：AO Jay）。
  - P4 补 `trip-experiences` 体验入口与 `user-profiles` 已完成统计的自动完成回归（owner：AO Jay）。
  - P4 同步契约 `ongoing` 与 `OpenApiTest` / 前端类型（owner：AO Jay）。
  - P5 归档前确认与 `add-match-reason` 的 `trip-companions` 归档顺序（owner：SA / SM）。
- **Approvers:** IO = Wanye；SA = Jacky、Karena（双 capability 例外已追认）
- **Timestamp:** 2026-11-16

## 结论

G1 **Pass**。Delta Spec 可作为 P3 设计与任务分解的规格基线；本记录不替代 G2 / G3。

## Post-G1 amendment（2026-11-16）

- **触发：** IO 询问「前端页面停留过期、仍显示旅行中并发起申请」的兜底。
- **Delta 补充：** `trip-plans` 四态 Requirement 新增「前端状态过期时以服务端判定为准」；`trip-companions` 提交申请新增「页面停留过期后申请被拒绝」。
- **实现方向（P3 输入）：** 所有读写入口统一经过幂等物化（到期写 `completed_at` + 同事务取消待处理申请）；列表查询前批量物化；前端收到 409 / `CHAT_READ_ONLY` 后刷新并提示。
- **影响：** `openspec validate --strict` 仍 valid；AC / DoV 结论不变（AC-3 新增一个高风险边界场景），G1 **Pass 维持**。
- **P3 前置决策（2026-11-16 IO 确认）：** D10 自动完成采用懒写入；D11 批量取消随状态物化同事务；D12 契约版本 0.9.0；D13 种子保留 + E2E 相对日期夹具。
