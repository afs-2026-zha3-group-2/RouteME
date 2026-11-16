# P2 规格记录 — refine-trip-map

- **Change：** `refine-trip-map`｜ **阶段：** P2（Spec → G1）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

Delta Spec 定稿：MODIFIED 4 + ADDED 1 / 46 Scenario；AC/DoV 复核与一致性检查通过；G1 签署。

## 2. 产出

- `specs/trip-plans/spec.md`（WAYNE 签 2026-11-16）
- `dov-ac-review.md`：AC 8/8 + DoV 5/5
- `consistency-lint.md`：0 BLOCKER / 0 WARNING / 2 SUGGESTION（带入 P3）
- `docs/reviews/20261116-refine-trip-map-spec-review.md`：Pass（WAYNE + Jay 签 2026-11-16）
- `g1-decision.md`：**Pass（Conditional C1）**，IO=WAYNE / SA=Karena 签 2026-11-16

## 3. 基线保留证据

node 脚本逐 Requirement 核对（Living + add-trip-publish + refine-trip-chat）：发布 18/18、详情 6/6、地图上下文 5/5 + 1 显式取代（「未选目的地时不展示途经点地图」→「未选目的地时展示全省概览」）、维护 5/5；missing=[]。

## 4. 条件与指示

- **C1（归档顺序）：** P5 须 `add-trip-publish` / `refine-trip-chat` 先归档。
- **发起人指示（2026-11-16 P2 签署时重申）：** `refine-trip-map` 不归档；S06 / S07  likewise 不归档。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta 工件 + G1 | 2026-11-16 |
| SA | Karena | 规格与验收口径 + G1 | 2026-11-16 |
| AO | Jay | 记录与 P3–P4 承担 | 2026-11-16 |

**阶段结论：Pass（G1 Conditional C1）。** 下一步 P3：design / atdd / tasks。

## 6. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | `c6b0216` |
| P1 | `5f28d81` |
| P2 | 本阶段提交 |