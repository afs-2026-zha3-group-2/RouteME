# Design review（R2）— refine-trip-map

- **对象：** `openspec/changes/refine-trip-map/design.md` §R2（D14–D22）
- **日期：** 2026-11-16 ｜ **评审人：** WAYNE（IO）＋ Jay（AO）

## 检查

| 检查 | 结论 |
|---|---|
| 三级独立组件＋Zoom≠换层 | Pass：D14/D15 路由权威＋组件切换；useMapViewport 只改 viewBox |
| 禁 monolithic | Pass：六 Layer 纯组件＋hook＋controls/面包屑/面板/统计/行程拆分；CityTravelMap 仅组合 |
| 数据驱动＋懒加载 | Pass：D16 registry 动态 import；index 轻量静态；新增城市只加数据；procedural 控工作量 |
| 诚实口径 | Pass：D17 重合度/预计纯函数；邀请真实行程或演示提示 |
| 不破坏现有 | Pass：D18 facade 保留搜索/校验语义；珠海等 legacy 同构模块；详情 strip/聚焦/降级保留 |
| 视觉 | Pass：D19 参考图令牌＋渐变＋优先级；深色同套 |
| 退役清理 | Pass：D20 删 PlaceMap、mapView 保留数学；样式替换不残留 |
| 未来扩展 | Pass：D21 MapProvider 接口仅登记 |
| 可测性 | Pass：D22 testid/单测/e2e/bundle 断言齐备 |

## Findings

| # | 级别 | 内容 | 处理 |
|---|---|---|---|
| 1 | advisory | 34 省低多边形手工 path 工作量大 | 允许粗示意（参考图同口径）；centroid/label 数据化 |
| 2 | advisory | legacy 城市转换需保留别名以兼容 e2e 手输 | T14 明确别名迁移清单（香洲码头/九洲港等） |
| 3 | advisory | 发布页级联写目的地与 cascader 双入口 | 登记：两入口同写 destinationCode 状态，cascader 仍权威显示 |

## 结论

**Pass**（3 advisory 带入 T14/T19/T20）。签署：design 工件 Jay + Neal；本报告 WAYNE + Jay。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| design.md（§R2） | 工件 1 | Jay（AO） | 2026-11-16 |
| design.md（§R2） | 工件 2 | Neal（VL，非当前开发者且非 WAYNE） | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |