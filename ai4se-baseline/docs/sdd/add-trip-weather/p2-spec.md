# P2 规格记录 — add-trip-weather

- **Change：** `add-trip-weather`（REQ-022 / 目的地天气与出行提醒）｜ **阶段：** P2（Delta Spec & G1）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/add-trip-weather`（P1 提交 `e84ef98`）

## 1. 阶段目标

把 P1 提案收敛为可实现的增量规格，并用 AC / DoV、一致性与 G1 三个检查确认：范围无静默扩张、阈值口径唯一、每条场景可观察，并明确「不伪造天气」与「失败不阻断业务」两条硬约束。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/trip-weather/spec.md`](../../../openspec/changes/add-trip-weather/specs/trip-weather/spec.md) | ADDED 6 Requirement / 28 Scenario；纯新增，不改写既有能力 |
| AC / DoV 评审 | [`dov-ac-review.md`](../../../openspec/changes/add-trip-weather/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、REQ 映射 16/16、用户 AC 14/14 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-trip-weather/consistency-lint.md) | Pass；0 BLOCKER / 0 WARNING / 4 SUGGESTION / 4 N/A |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-trip-weather/g1-decision.md) | **Pass**；IO = WAYNE，SA = Jacky；条件 C1–C6 |
| 规格评审 | [`20261117-add-trip-weather-spec-review.md`](../../reviews/20261117-add-trip-weather-spec-review.md) | Pass；0 BLOCKER / 0 WARNING / 2 SUGGESTION |
| 质量报告 | [`20261117-203000-quality-checklist-report.md`](../../ai4se-plugins/20261117-203000-quality-checklist-report.md) | P2-1 ~ P2-4 Pass；P2-5 N/A；Overall Pass |

## 3. 关键收敛

- **纯 ADDED。** 天气是全新能力；`trip-plans` / `design-system` 一个 Requirement 块都不改，规避与在途 change 的覆盖冲突。
- **阈值唯一。** 降雨（50% / 1 mm，加强 80% / 10 mm）、高温 30°C、UV 6、低温 10°C、温差 10°C、强风 30 km/h 只在一处定义；前端不得复制判断。
- **越界是业务状态。** 200 + `available:false` + `reason`；不进入失败重试路径，也不允许拿当前天气顶替。
- **UV 缺失不是 0。** 响应 `null`，页面不展示 UV 行，不生成 UV 提醒。
- **失败隔离写成约束。** 天气失败只影响天气区；发布提交与详情浏览照常。
- **坐标口径固定。** 请求坐标优先，否则区划解析 + 缓存；不使用途经点坐标。

## 4. 校验

- `openspec validate add-trip-weather --strict` → `Change 'add-trip-weather' is valid`。
- `openspec show add-trip-weather --json --deltas-only` → `deltaCount: 6`、`spec: trip-weather`、`operation: ADDED`。
- 场景计数：6 Requirement / 28 Scenario（`#### Scenario:` 28 条）。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta 归属 `trip-weather`、纯 ADDED、阈值与失败口径 | 2026-11-17 |
| SA | Jacky | 场景可判定、越界与 UV 缺失口径可验证 | 2026-11-17 |
| AO | Jay | 承接 P3–P4 | 2026-11-17 |

**阶段结论：Pass（G1 Pass）**

## 6. 提交与原计划差异

- 阶段提交：`docs(p2): add-trip-weather delta spec and G1 for weather API`；push 前 `git pull --rebase origin main`。
- 范围差异：无。
- 未决项：G1 条件 C1–C6 已指派，无遗留阻塞。