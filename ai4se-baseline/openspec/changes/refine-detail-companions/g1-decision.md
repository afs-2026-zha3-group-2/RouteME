# G1 decision — refine-detail-companions

- **Gate:** G1（Align）
- **Change id:** `refine-detail-companions`（REQ-020 灵感详情页同行者卡片化）
- **Inputs:**
  - `openspec/changes/refine-detail-companions/specs/trip-plans/spec.md`（MODIFIED 1 Requirement / 12 Scenario；`openspec validate --strict` valid）
  - `openspec/changes/refine-detail-companions/dov-ac-review.md`（AC 4/4 Pass + DoV 5/5 Pass；基线保留 4/4：1 修改 / 3 原样）
  - `openspec/changes/refine-detail-companions/consistency-lint.md`（Pass；0 BLOCKER / 0 WARNING / 6 SUGGESTION / 5 N/A）
  - `openspec/changes/refine-detail-companions/proposal.md`
  - `requirement-workspace/requirements/REQ-020-detail-companion-cards.md`（10 场景，blocking OQ 0，DoR BLOCKER 0）
- **Findings:**
  - **Scope:** 单 capability `trip-plans` MODIFIED；`trip-companions` / `user-profiles` 只读消费；零后端 / 契约 / 迁移；无范围扩张或静默缩水。
  - **Ambiguity:** 无 blocking 歧义；空态精确文案与组件测试分层为 P3 非阻塞项（owner: Dev）。
  - **Conflict:** D1 将 Living Spec 基线「当前同行者至少包含发布者本人」替换为「发布者不在同行者列表重复」；该语义变更已获批准，人数统计仍包含发布者。
  - **Residual risk:** `styles.css` 多人并行修改热点、E2E `.detail-participants` 选择器需同步、原型先行；均纳入 P3 / P4 任务。
- **Decision:** **Pass**
- **Conditions + owners:** 无（无条件 Pass）。非门禁建议：P3 落定空态文案与组件测试分层（owner: Dev / SA）；P4 收敛 `styles.css` 旧规则并同步 E2E 选择器（owner: Dev）。
- **Approvers:** IO=WAYNE；SA=Jacky
- **Timestamp:** 2026-11-17T12:15+08:00

## 签署记录

| 角色 | 姓名 | 结论 | 时间 | 来源 |
|---|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-17 | 发起人当次会话确认 |
| SA | Jacky | Pass | 2026-11-17 | 发起人当次会话确认 |

## Next

- P3：`/sdd:atdd-design` → `/sdd:task-plan`（原型先行；`design.md` / `tasks.md` 评审 + 签署）。
- 本记录不是 P3 设计结论，不替代后续 Gate。
