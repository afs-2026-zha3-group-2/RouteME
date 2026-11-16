# G1 decision — refine-my-trips

- **Change id:** `refine-my-trips`（REQ-015 / S11 我的旅行）
- **Gate:** G1（Align）
- **Inputs:**
  - Delta Spec：`openspec/changes/refine-my-trips/specs/trip-companions/spec.md`（MODIFIED，1 Requirement / 11 Scenario）
  - AC / DoV 评审：`openspec/changes/refine-my-trips/dov-ac-review.md`（AC 4/4 Pass；DoV 5/5 Pass；REQ-015 映射 12/12；基线保留 4/4）
  - 一致性检查：`openspec/changes/refine-my-trips/consistency-lint.md`（Pass；0 BLOCKER / 0 WARNING / 4 SUGGESTION）
  - 提案：`openspec/changes/refine-my-trips/proposal.md`
  - 需求基线：`requirement-workspace/requirements/REQ-015-my-trips.md`（12 场景，5 条 OQ 全 resolved，DoR BLOCKER 0）
  - 校验：`openspec validate refine-my-trips --strict` → valid；`openspec show --deltas-only` → `deltaCount: 1`
- **Findings:**
  - **Scope：** 与提案一致，无静默扩张；范围为页面结构、行内动作、提醒定位、状态同步与只读聚合字段；编辑 / 删除 / 参考发布 / 分页 / 轮询已显式排除。
  - **Ambiguity：** 无未解决业务歧义。请求去抖（L-03）、`pending_applications` 空数组语义（L-02）、已分享分支（S-01）为 P3 技术决策，已标 deferred 且有 owner。
  - **Conflict：** 无 BLOCKER。已消除「提醒固定跳第一条已发布行程」与 AC 2 的冲突；已确认与 `design-system` 的列表对齐约束一致。
  - **例外：** 单 capability（`trip-companions`）内 MODIFIED，无需双 capability 追认；保留 `.mine-profile-card` 记为 known deviation。
- **Decision:** Pass
- **Conditions + owners:** 无阻断条件。跟踪项（非阻断）：
  - P3 定下请求去抖与 `pending_applications` 空数组语义（owner：AO Jay）。
  - P3 在 ATDD 设计写明已分享 / 未分享分支与 E2E 角色断言变更位置（owner：AO Jay）。
  - P4 运行 `mine.spec.ts` + `companions.spec.ts` + `experiences.spec.ts` 三套回归（owner：AO Jay）。
  - P5 归档前与 `refine-experience-share` 对齐完成组文案（owner：AO Jay + SA Neal）。
- **Approvers:** IO = WAYNE；SA = Neal
- **Timestamp:** 2026-11-16

## 结论

G1 **Pass**。Delta Spec 可作为 P3 设计与任务分解的规格基线；本记录不替代 G2 / G3。

## Post-G1 amendment

无。若 P3 发现契约字段形状需要调整，按 `@rule:artifact-review-gate` 重评 Delta 并追加本小节。