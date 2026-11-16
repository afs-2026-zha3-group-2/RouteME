# 一致性检查 — refine-trip-map（P2）

- **日期：** 2026-11-16｜ **记录人：** Jay（AO）｜ **方法：** 机器核对 + 人工对照（delta / Living / 未归档增量 / openapi / 实现 / E2E）

## 检查项

| id | 检查 | 结论 | 证据 / 处理 |
|---|---|---|---|
| L1 | delta ↔ 契约计划口径 | Pass | `meeting_areas` maxItems 3 / items maxLength 100 / nullable ↔ delta ≤3 / ≤100 / 空值归一；0.11.0 与 OpenApiTest 同步列入影响面 |
| L2 | 基线场景保留 | Pass | node 脚本逐 Requirement 核对：18+6+5+5=34 保留 + 地图上下文 1 显式取代；missing=[] |
| L3 | 归档模拟 | Conditional | `validate --strict` valid，但 INFO：MODIFIED「发布表单的默认值与地图上下文」在 Living not found → **条件 C1**：P5 归档须 `add-trip-publish` / `refine-trip-chat` 先行 |
| L4 | delta ↔ 现状实现漂移（预期内） | SUGGESTION | 全省概览「点击城市聚焦不写途经点」vs 现状点击城市入 stops；单值 meeting_area vs 数组。均为本 change 目标行为，P3 tasks 必须含对应改造任务（T 前端地图 / T 契约后端） |
| L5 | 既有 E2E 语义兼容 | SUGGESTION | `trips.spec.ts`「map supports zoom…」断言 `.map-callout` + 「加入路线」；新浮层需保留该语义或同批更新断言（P3 atdd 明确） |
| L6 | 号段 / 单文件冲突 | Pass | V17 无预留；openapi / styles.css 冲突靠 pull --rebase 与末尾追加策略 |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 2（L4/L5，均有 P3 落点）/ Conditional 1（C1 归档顺序）。

**结论：Pass（条件 C1 带入 G1）。**

---

## R2 一致性检查（2026-11-16）

| 检查 | 结论 |
|---|---|
| design D14–D22 ↔ Delta 9 Requirement | Pass：探索/路线/同行者/数据四 ADDED 与两 MODIFIED 均有落点 |
| atdd E11–E18/U6–U9 ↔ 66 场景 | Pass：无孤儿场景（R1 35 基线回归＋R2 31 新覆盖） |
| tasks T13–T24 ↔ design | Pass：每任务单层＋真实验证命令；顺序 data→core→levels→city→match→page→integration→visual→ut→e2e→verify |
| 术语 | Pass：CityTravelMap/六 Layer/重合度/预计/fallback 全文统一 |
| 平行权威 | Pass：placeCatalog facade 单一索引权威；旧 PlaceMap 退役列入 T21 |
| Counts | BLOCKER 0 / WARNING 0 / SUGGESTION 2（沿用 L4/L5）/ Conditional 1（C1） |

**R2 结论：Pass（C1 延续带入 G1-r2）。**