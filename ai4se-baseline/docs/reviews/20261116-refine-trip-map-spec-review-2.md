# Spec review（R2）— refine-trip-map

- **对象：** `openspec/changes/refine-trip-map/specs/trip-plans/spec.md`（R2 后 9 Requirement / 66 Scenario）
- **日期：** 2026-11-16 ｜ **评审人：** WAYNE（IO）＋ Jay（AO）

## 检查

| 检查 | 结论 |
|---|---|
| MODIFIED/ADDED 结构 | Pass：MODIFIED 4（地图上下文/发布/详情/维护）+ ADDED 5（详情路线地图 R1＋探索/路线/同行者/数据 R2）；每 Requirement ≥1 Scenario |
| 场景可判定 | Pass：路由 hash、Layer 名、百分比计算式、fallback 文案、预计标注均可观察断言 |
| 取代声明 | Pass：R1「全省概览」「暂无离线点位」两场景显式取代为三级级联与统一 fallback；差异段写明 |
| 基线保留 | Pass：机器核对 Living＋未归档增量基线场景 missing=[]（发布 18/详情 6/维护 5；地图上下文基线 5 经 R1 取代链保留） |
| 诚实性 | Pass：重合度纯函数、预计距离/时间、Mock 邀请演示提示不伪造成功 |
| 懒加载与扩展 | Pass：重数据按城 import()；新增城市只加数据；索引轻量静态 |
| strict 校验 | Pass：valid；仅 C1 归档顺序 INFO（预期）；>500 字 WARNING 已修（正文精简、细节下沉场景） |

## Findings

| # | 级别 | 内容 | 处理 |
|---|---|---|---|
| 1 | advisory | 「搜索索引轻量静态」场景需 bundle 检查手段 | P3 design 登记：以 build 产物 chunk 名单断言（city chunks 独立） |
| 2 | advisory | 详情 TravelerLayer 与推荐块 match 口径并存 | design 说明两口径不混用（路线重合 vs 兴趣/日期） |
| 3 | advisory | 发布页面包屑回层会重置目的地市 | 语义登记：回省层保留省、清市；e2e 覆盖 |

## 结论

**Pass**（3 advisory 带入 P3）。提请签署：Delta 工件 WAYNE；本报告 WAYNE + Jay；G1-r2 IO WAYNE + SA Karena。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| specs/trip-plans/spec.md（R2） | 工件 1 | WAYNE（IO） | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |
| g1-decision-r2.md | G1 IO | WAYNE（IO） | 2026-11-16 |
| g1-decision-r2.md | G1 SA | Karena（SA） | 2026-11-16 |