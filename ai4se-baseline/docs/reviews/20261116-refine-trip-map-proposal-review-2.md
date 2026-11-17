# Proposal review（R2）— refine-trip-map

- **对象：** `openspec/changes/refine-trip-map/proposal.md` §R2 增补
- **日期：** 2026-11-16 ｜ **评审人：** WAYNE（IO）＋ Jay（AO）
- **输入：** 发起人第二轮提示词（11 节）＋六联参考图；`p0-baseline-r2.md` G2-01–G2-10。

## 检查

| 检查 | 结论 |
|---|---|
| 缺口→变更映射 | Pass：G2-01→ChinaMap；G2-02→ProvinceMap；G2-03→六 Layer；G2-04→路线生成；G2-05→同行者面板；G2-06→数据驱动+fallback；G2-07→面包屑/换层语义；G2-08→令牌；G2-09→旧 PlaceMap 退役；G2-10→兼容接线 |
| 核心产品逻辑对齐 | Pass：地图服务「选目的地→选景点→生成路线→发现同行者→建立连接」；探索页承载全链路，发布/详情复用城市层 |
| 不破坏现有功能 | Pass：首页/契约/后端不变；legacy 广东城市转同构数据模块；e2e 语义断言随架构更新列入 tasks |
| 离线 MVP 约束 | Pass：无在线瓦片/付费 API；MapProvider 边界仅登记不实现 |
| Mock 诚实性 | Pass：百分比纯函数计算、距离/时间标「预计」、无真实行程的邀请给演示提示 |
| 范围可控 | Pass：10 城 MVP＋广州主 Demo；程序化 Layer 控制工作量；out-of-scope 明确 |
| 与 R1 关系 | Pass：R2 为同 change 增补（不新增 changes）；R1 多值集合/详情地图语义保留并被城市层继承 |

## Findings

| # | 级别 | 内容 | 处理 |
|---|---|---|---|
| 1 | advisory | 中国省形为示意低多边形，非精确行政边界 | 已列 out-of-scope；参考图同口径 |
| 2 | advisory | 发布页未选目的地时挂 ChinaMap 级联选目的地，改变 R1「全省概览只聚焦」语义 | P2 delta 需 MODIFIED 该场景并更新 e2e E3；属本轮有意演进 |
| 3 | advisory | 同行者 Mock 与后端 /api/matches 并存两套口径 | design 需说明：地图面板用城市 travelers 模型（路线重合），推荐块仍用后端 match（兴趣/日期）；不混用 |
| 4 | advisory | 懒加载索引静态仍含全部 POI 坐标 | 体积小（名称/别名/坐标），重数据（Layer/travelers）懒加载；符合提示词「不一次性加载全国 POI 和道路数据」的道路/图层口径 |

## 结论

**Pass**（4 advisory，均已在 proposal/design 承接方向登记）。提请签署：proposal 工件 WAYNE；本报告 WAYNE + Jay。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| proposal.md（§R2） | 工件 1 | WAYNE（IO） | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |