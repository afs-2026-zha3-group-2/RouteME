# P2 — refine-publish-route-map（REQ-027 / S28 发布行程改用地图路线编辑器）

- **日期：** 2026-11-18 ｜ **记录人：** Jacky（当前开发者）｜ **阶段：** P2 Pass（G1 Pass）
- **Change：** `refine-publish-route-map`
- **Delta：** `openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md`（MODIFIED 1 Requirement / 18 Scenario）
- **G1：** `openspec/changes/refine-publish-route-map/g1-decision.md`（Pass，IO=WAYNE / SA=Karena）

## 1. 输入

| 输入 | 路径 | 结论 |
|---|---|---|
| 提案 | `openspec/changes/refine-publish-route-map/proposal.md` | P1 已签（WAYNE） |
| P1 Delta | `openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md` | MODIFIED 1 Requirement / 18 Scenario；基线 7 场景原文保留 |
| 需求条目 | `requirement-workspace/requirements/REQ-027-publish-route-map.md` | 11 场景 S28-1 ~ S28-11；blocking OQ 0；DoR BLOCKER 0 |
| 故事 | `requirement-workspace/stories/refine-publish-route-map.story.md`、`requirement-workspace/stories.md` | S28，迭代 3，3 点 |
| Living Spec 基线 | `openspec/specs/trip-plans/spec.md`「发布可被他人理解的旅行计划」 | 7 个基线场景；正文第 1 段逐字保留 |
| 只读依赖 | `openspec/specs/design-system/spec.md` | 无 Delta；导航条未列举旅行地图 |

## 2. Delta 收敛

- **头部说明：** 补「MODIFIED = 在既有数量与顺序约束上追加编辑器、出行方式、降级与占位名约束；7 个基线场景原文保留」，让归档读者一眼看出是纯追加。
- **模式段可观察化：** 原文「编辑器 MUST 接受调用方传入的 `modes` / `modeLabels`」是 prop 级表述；改为「发布页 MUST 显示三档 / 探索页 MUST 保持三档 / 两处 MUST NOT 串味」。约束语义不变，prop 形状移交 P3 `design.md`。
- **场景数：** 保持 18 = 基线 7 + 新增 11；基线 7 条脚本比对 `preserved 7/7`、`missing []`。
- `openspec validate refine-publish-route-map --strict` → `Change 'refine-publish-route-map' is valid`；`openspec show --json --deltas-only` → `deltaCount: 1` / `MODIFIED`。

## 3. AC / DoV 复核

`openspec/changes/refine-publish-route-map/dov-ac-review.md`：

- **AC 4/4 Pass**：可测 AC、可观察、负向 / 边界齐备、无实现细节伪装（P2 已把 prop 级表述改为可观察口径）。
- **DoV 5/5 Pass**：范围一致、歧义 resolved / deferred、角色关注点记录、未主张已实现、11/11 场景可追溯。
- **基线保留 7/7**：全部原文保留；正文第 1 段逐字保留，新增 3 段为纯追加；无删除、无改写。

## 4. 一致性 lint

`openspec/changes/refine-publish-route-map/consistency-lint.md`：

- **Verdict：Pass** — 0 BLOCKER / 0 WARNING / 7 SUGGESTION / 4 N/A。
- SUGGESTION：
  - L-01 `TravelMode`（含 `walking`）与 `TripTravelMode`（三档）的类型边界（P3）
  - L-02 `MODE_LABELS.driving = 驾车` 不得就地改值，否则探索页串味（P3）
  - L-03 `map.spec.ts` 的 `china-map` / `city-map` 属既有债务，本 change 只重写 `trips.spec.ts`（P4）
  - L-04 第 2 段还有集合地点的 `AmapPlacePicker`，替换途经点时不得误删（P3 / P4）
  - L-05 占位名校验用前缀 + 坐标模式，避免漏判与误伤（P3 / P4）
  - L-06 公共交通城市名复用 `cityForSearch`，不用只覆盖少数城市的离线地名库（P3）
  - L-07 生成按钮文案随状态切换，E2E 用 `amap-route-generate` 定位（P4）

## 5. G1（`openspec/changes/refine-publish-route-map/g1-decision.md`）

| 角色 | 姓名 | 结论 | 时间 | 来源 |
|---|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-18 | 发起人当次会话指示「run p2」，沿用「全部批准」授权 |
| SA | Karena | Pass | 2026-11-18 | 同上；SA 取非当前开发者成员 |

- **Decision：Pass（无条件）**。
- 范围：单 capability MODIFIED；零后端 / 契约 0.22.0 / 无迁移。
- 冲突：与 Living Spec 无冲突（7/7 原文保留）；与未归档 `refine-trip-map` / `add-trip-publish` 改同一 Requirement，归档串行，本 change 为发布页路线段权威。
- 非门禁 follow-up：P3 定共享件边界与模式泛型、占位名校验与改名落点；P4 限定测试重写范围。

## 6. 质量记录

- 本阶段以 `dov-ac-review.md` 与 `consistency-lint.md` 为质量证据；未生成 `docs/ai4se-plugins/` 质量清单报告（本次未运行 sdd 插件质量清单）。
- 校验命令与输出已记录在 §2、§3、§4。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | 未提交 | 提案、Delta、评审报告与 workspace 记录均为工作区改动 |
| P2 | 未提交 | 本记录、AC/DoV、一致性检查与 G1 决策待随阶段入库 |

## 8. 下一阶段

- P3：`/sdd:atdd-design` → `/sdd:task-plan`。
- P3 前置：
  1. 共享件边界（哪些状态留在 `MapExplorerPage`、哪些进共享件）与模式泛型方案。
  2. 占位名校验形式与就地改名落点。
  3. 降级文案注入方式（共享件 prop 还是统一中性文案）。
  4. `AppShell` / `tripMessages` 并行改动的合并顺序。