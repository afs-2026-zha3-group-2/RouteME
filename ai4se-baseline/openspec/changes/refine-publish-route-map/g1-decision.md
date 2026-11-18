# G1 decision — refine-publish-route-map

- **Gate:** G1（Align）
- **Change id:** `refine-publish-route-map`（REQ-029 / S30 发布行程改用地图路线编辑器）
- **Inputs:**
  - `openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md`（MODIFIED 1 Requirement / 18 Scenario；`openspec validate --strict` valid）
  - `openspec/changes/refine-publish-route-map/dov-ac-review.md`（AC 4/4 Pass + DoV 5/5 Pass；基线保留 7/7）
  - `openspec/changes/refine-publish-route-map/consistency-lint.md`（Pass；0 BLOCKER / 0 WARNING / 7 SUGGESTION / 4 N/A）
  - `openspec/changes/refine-publish-route-map/proposal.md`（D1–D9 / AC-1 ~ AC-10）
  - `requirement-workspace/requirements/REQ-029-publish-route-map.md`（11 场景，blocking OQ 0，DoR BLOCKER 0）
- **Findings:**
  - **Scope:** 单 capability `trip-plans` MODIFIED；零后端 / 契约 0.22.0 不变 / 无迁移；不新增能力、不改详情页口径、不修探索页既有缺陷。无范围扩张或静默缩水。
  - **Ambiguity:** 无 blocking 歧义；「占位名拦截 UX」与「共享件 props / 状态归属」为 P3 非阻塞项（owner: Dev），不影响 Delta 的可判定性。
  - **Conflict:** 与 Living Spec 无冲突——基线 7 场景 7/7 原文保留，正文第 1 段逐字保留，新增 3 段为纯追加。与未归档的 `refine-trip-map` / `add-trip-publish` 修改同一 Requirement，归档必须串行，本 change 为发布页路线段权威。
  - **Residual risk:** 面板复用边界、`MODE_LABELS` 被就地改值的串味风险、`trips.spec.ts` 重写与 `map.spec.ts` 既有债务的边界、`AppShell` / `tripMessages` 并行改动；均纳入 P3 / P4。
- **Decision:** **Pass**
- **Conditions + owners:** 无门禁条件（无条件 Pass）。非门禁 follow-up：
  1. P3 `design.md` 定共享件边界与模式泛型，明确 `MODE_LABELS` 不被就地改值（owner: Dev）。
  2. P3 定占位名校验的可判定形式与就地改名落点（owner: Dev / SA）。
  3. P4 只重写 `trips.spec.ts`，把 `map.spec.ts` 同类选择器记为既有债务（owner: Dev）。
- **Approvers:** IO=WAYNE；SA=Karena（非当前开发者）
- **Timestamp:** 2026-11-18

## 签署记录

| 角色 | 姓名 | 结论 | 时间 | 来源 |
|---|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-18 | 发起人当次会话指示「run p2」，沿用「全部批准」授权 |
| SA | Karena | Pass | 2026-11-18 | 同上；SA 取非当前开发者成员，避免开发者自签 Gate |

## Next

- P3：`/sdd:atdd-design` → `/sdd:task-plan`（先定共享件边界与占位名校验，再写 `design.md` / `tasks.md`）。
- 本记录不是 P3 设计结论，不替代后续 Gate。