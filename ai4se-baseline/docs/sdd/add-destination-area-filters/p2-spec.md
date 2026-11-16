# P2 规格记录 — add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把提案收敛为可验证的 Delta Spec，完成 AC/DoV 复核与一致性检查，并记录 G1 决策。

## 2. 产出

| 工件 | 路径 | 结果 |
|---|---|---|
| Delta Spec — `trip-plans` | [`specs/trip-plans/spec.md`](../../openspec/changes/add-destination-area-filters/specs/trip-plans/spec.md) | 3 Requirement / 20 Scenario；`openspec validate --strict` valid |
| Delta Spec — `trip-experiences` | [`specs/trip-experiences/spec.md`](../../openspec/changes/add-destination-area-filters/specs/trip-experiences/spec.md) | 1 Requirement / 13 Scenario；valid |
| AC / DoV review | [`dov-ac-review.md`](../../openspec/changes/add-destination-area-filters/dov-ac-review.md) | AC 5/5 Pass；DoV 4 Pass + 1 Partial（外部依赖） |
| Consistency lint | [`consistency-lint.md`](../../openspec/changes/add-destination-area-filters/consistency-lint.md) | Partial；BLOCKER 0 / WARNING 4 / SUGGESTION 1 |
| G1 decision | [`g1-decision.md`](../../openspec/changes/add-destination-area-filters/g1-decision.md) | **Conditional** |

## 3. G1 结论与条件

**Conditional**；IO=WANYE、SA=JACKY/KARENA、AO=JAY、VL=NEAL、SM=LEWIS。

| # | 条件 | Owner |
|---|---|---|
| C1 | refine-inspiration-home 的搜索空态 E2E 改写并先归档 | AO / BA |
| C2 | add-trip-publish 目的地修订 5 条任务在 B 数据底座后执行；A 后归档并重评 G1/G2 | AO / SA |
| C3 | V11 迁移与外键在 P3 design 验证 | Dev |
| C4 | 匹配打分改 code 比较，补 add-match-reason 回归 | Dev |
| C5 | Living Spec"关键词"术语在归档合并收敛 | AO / BA |
| C6 | 契约 0.7.0、删 `q`、响应新增 code/province 在 P3 tasks 先行 | Dev |

## 4. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | 需求边界与跨能力影响 | 2026-11-16 |
| SA | Jacky、Karena | Delta 口径、AC/DoV 与 G1 Conditional | 2026-11-16 |
| AO | Jay | 承接 P3–P4；执行 C3/C4/C6 | 2026-11-16 |

**阶段结论：Conditional（可进 P3，C1–C6 跟踪）**
