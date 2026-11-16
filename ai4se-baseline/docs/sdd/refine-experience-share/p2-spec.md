# P2 规格记录 — refine-experience-share

- **Change：** `refine-experience-share`（REQ-004 / S16 发布游后体验）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-experience-share`（P1 提交 `38f7cf2`，已推送）

## 1. 阶段目标

把 P1 的 Delta 草稿复核为可签署的增量规格：确认与 Living Spec 不产生平行权威、场景可验证、既有场景名不丢失，并记录 G1 结论。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/trip-experiences/spec.md`](../../../openspec/changes/refine-experience-share/specs/trip-experiences/spec.md) | MODIFIED 3 Requirement / 12 Scenario |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/refine-experience-share/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、REQ-004 §4 8/8、Living Spec 基线 10/10 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/refine-experience-share/consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4（2 条当场收口） / N/A 6 |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/refine-experience-share/g1-decision.md) | Pass；IO Wanye / SA Wanye / AO Jay；无整改条件；7 项非阻断 follow-up |
| 重评报告 | [`proposal-review-2`](../../reviews/20261116-refine-experience-share-proposal-review-2.md)、[`spec-review-2`](../../reviews/20261116-refine-experience-share-spec-review-2.md) | 均 Pass；Wanye 批准 2026-11-16T16:35+08:00 |
| P2 质量报告 | [`20261116-165500-quality-checklist-report.md`](../../ai4se-plugins/20261116-165500-quality-checklist-report.md) | P2 required 3/3 Pass；P2-4 Pass；Overall Pass |

## 3. 关键裁决与修订

- **ADDED → MODIFIED（L-01）。** P1 初稿新增「游后分享页说明体验去向与分享边界」；核对 Living Spec 发现已有 `### Requirement: 我的旅行分享入口与分享边界`（「已完成分组区分已分享与未分享」「分享页面提示隐私边界」两场景）。新增会形成两个权威，故删除 ADDED、并入该 Requirement：保留 2 个既有场景名 + 新增「分享页展示行程概览」「分享页说明体验去向」。proposal 同步：能力由「MODIFIED + ADDED」改为「MODIFIED」，What Changes / 范围 / 影响面 / 决策四处改写。
- **P0 规模勘误（L-02）。** Living Spec 是 7 Requirement / 22 Scenario，P0 记录误写 4 / 16，已改正；`stories.md` 追溯表同步。
- **拒绝职责边界（spec 评审 S-01）。** 服务端仍是唯一拒绝方（`EXPERIENCE_NOT_ALLOWED` 403）；前端只按 `status` / `participants` 渲染两种提示，不新增后端判定。
- **契约不变。** `openapi.yaml` 0.8.1、`POST /api/trips/{tripId}/experiences`、10–400 / ≤120 校验、upsert 语义、`trip_experiences` 表均不改。
- **四态兼容。** `add-trip-completion`（`main@25b60f7`）把状态扩为 `recruiting` / `full` / `ongoing` / `completed`；「未结束」文案覆盖 `ongoing`。

## 4. 校验

- `openspec validate refine-experience-share --strict` → `Change 'refine-experience-share' is valid`。
- `openspec show refine-experience-share --json --deltas-only` → `deltaCount: 3`，3 × `MODIFIED`，`spec=trip-experiences`。
- AC/DoV：无 blocking gap，G1-ready。
- 一致性 lint：Pass；L-01 / L-02 当场收口，L-03 / L-04 留 P3。
- P2 质量检查：Overall Pass。

## 5. 签署（G1）

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与跨能力影响：`trip-experiences`（MODIFIED）替换已归档能力的 3 条 Requirement；`trip-plans` 只读 | 2026-11-16 |
| SA | Wanye | 规格与验收口径：hero、去向三条、边界两条、两种不可用提示、内置封面、隐私红线 | 2026-11-16 |
| AO | Jay | 承接 P3–P4 实现与 follow-up 收口 | 2026-11-16 |
| VL | Neal | P4 独立验证（未到） | — |
| SM | 待签署 | P1 范围与排期确认 | 待签署 |

**G1 结论：Pass**（`g1-decision.md`，2026-11-16T16:35+0800）。签署来源：用户在 2026-11-16 会话中给出 IO=Wanye、SA=Wanye 并选定 Pass。

## 6. G1 后续项（非条件，不阻断）

| 项 | Owner | 时机 |
|---|---|---|
| hero「同行人数」固定为 `trip.participants.length` | Jay（AO） | P3 `design.md` |
| 「体验条数不变」的断言载体 | Jay（AO） | P3 `atdd-design.md` / P4 |
| 未结束提示状态文案取 `statusLabel()` | Jay（AO） | P3 / P4 |
| 「分享页面提示隐私边界」名称保留、内容扩充，写入归档说明 | Jay（AO）+ Wanye（SA） | P5 / G3 |
| 同步 E2E `keeps experience entry points honest` 用例 | Jay（AO） | P4 同批提交 |
| 后端 `ExperienceControllerTest` / `ExperienceServiceTest` 回归保留 | Jay（AO） | P4 验证 |
| 分享页 1440 / 768 / 390 × 浅 / 深色 视觉走查与截图 | Jay（AO） | P4 |

## 7. 阶段结论与提交

- **阶段结论：Pass**，进入 P3。
- **阶段提交：** `docs(p2): refine-experience-share align delta spec and record G1`；push 前 `git pull --rebase origin main`。
- **偏离：** 无。P1 初稿的「ADDED」已在 P2 收敛为「MODIFIED」，不属于范围偏离（交付面未增删）。