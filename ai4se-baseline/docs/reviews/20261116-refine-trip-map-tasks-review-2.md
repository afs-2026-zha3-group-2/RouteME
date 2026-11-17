# Tasks review（R2）— refine-trip-map

- **对象：** `openspec/changes/refine-trip-map/tasks.md` §R2（T13–T24）
- **日期：** 2026-11-16 ｜ **评审人：** WAYNE（IO）＋ Jay（AO）

## 检查

| 检查 | 结论 |
|---|---|
| 每任务单层 | Pass：data/map-core/map-levels/map-city/match/page/integration/visual/ut/e2e/verify |
| 顺序可行 | Pass：索引→城市模块→core→levels→city→match→page→接线→视觉→ut→e2e→verify |
| 验证命令真实 | Pass：npm test/build、playwright、全链路（仓库既有命令） |
| 场景覆盖 | Pass：T13–T24 承接 66 场景（atdd §R2 同源） |
| 兼容与清理 | Pass：T20 facade/接线保 R1 语义；T21 退役 PlaceMap |
| out-of-scope 未入任务 | Pass：在线瓦片/真实 Routing/每城页面均无任务 |

## Findings

| # | 级别 | 内容 | 处理 |
|---|---|---|---|
| 1 | advisory | T14 城市模块数量多（10 MVP＋12 legacy） | 程序化 layers＋转换脚本化控制体量；广州手工优先 |
| 2 | advisory | T23 e2e 更新面大（trips.spec 地图断言） | 语义 testid 先行（T15–T17），断言随改随跑 |

## 结论

**Pass**（2 advisory）。签署：tasks 工件 Jay + Neal；本报告 WAYNE + Jay。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| tasks.md（§R2） | 工件 1 | Jay（AO） | 2026-11-16 |
| tasks.md（§R2） | 工件 2 | Neal（VL，非当前开发者且非 WAYNE） | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |