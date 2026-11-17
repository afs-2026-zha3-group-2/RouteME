# P0 基线核对（R2）— refine-trip-map 三级地图架构重做

- **Change：** `refine-trip-map`（REQ-016，沿用同一 change，**不新增 changes**）｜ **阶段：** P0（R2 轮）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-trip-map` @ `2bf89cb`（R1 P4 已 push）；`origin/main@6d2116b` 为祖先，无新增提交。
- **触发：** 发起人第二轮验收提示词＋六联参考图（`docs/preview/refine-trip-map-image.png`，已入库）：要求**三级地图架构**（ChinaMap→ProvinceMap→CityTravelMap）、独立 SVG Layer、路线生成与行程同步、同行者匹配面板（数据模型驱动 Mock）、全国数据驱动扩展（10 城 MVP、广州主 Demo、其余 fallback）、面包屑与层级切换（非无限 Zoom）、指定配色；沿用离线 SVG 与当前技术栈，不接在线瓦片/付费 API。

## 1. 基线现状（R1 交付后）

| 项 | 现状 | 证据 |
|---|---|---|
| 契约 | 0.11.0（`meeting_areas` 多值） | `RouteME/openapi.yaml`、OpenApiTest 7/7 |
| 迁移 | V17（head v17） | 开发库 Flyway 日志 |
| 后端 | verify 246/246 | R1 验证报告 `20261116-234500` |
| 前端 | build ✓ / 211 tests | 同上 |
| E2E | 81/81（fresh SQLite） | 同上 |
| 地图 | 单组件 `PlaceMap.tsx`（740 行）：省级轮廓+城市散点+高速连线；城市级网格路/矩形公园/圆点 pin；`cityProjection` 局部投影 | `frontend/src/map/PlaceMap.tsx` |
| 地图入口 | 仅发布页 PlacePicker 内嵌＋详情页只读；无独立探索页 | `App.tsx` 路由表无 map |
| 数据 | `placeCatalog.ts` 静态全量（广东 14 城+港澳+POI），无分层懒加载 | 静态 import 链 |
| 匹配 | 后端 `/api/matches`（score/percentage/reasons/basis）仅首页/详情推荐块；地图上无同行者 | `types.ts Match`、`useMatches.ts` |
| 区划字典 | `element-china-area-data`（34 省/375 市，含代码） | `area/areaOptions.ts` |
| 导航 | rail 四入口（灵感/发布/我的/消息） | `shell/AppShell.tsx NAV_ITEMS` |

## 2. 服务与工具链

- 后端 8080（terminal 2，V17 开发库）、前端 dev 5173（terminal 3）运行中；Playwright Chromium 可用。
- Node v24.18.0 / OpenJDK 21.0.11 / openspec CLI 1.16.x / Redocly CLI 可用。

## 3. 缺口清单（R2，对照提示词 11 节）

| # | 缺口 | 提示词节 |
|---|---|---|
| G2-01 | 无中国地图层（省级区域 hover/selected/点击/搜索） | §2 |
| G2-02 | 无独立省级地图（仍省轮廓+城市间无意义连线） | §3 |
| G2-03 | 城市地图非分层架构（Road/Water/Park/Poi/Route/Traveler 六 Layer 缺失）， monolithic 组件 | §4/§10 |
| G2-04 | 无「≥2 景点生成路线」动作与统计（数量/预计距离/预计时间/顺序同步） | §5 |
| G2-05 | 地图无同行者面板（重合度/共同景点/日期/偏好/资料/邀请）；百分比不得硬编码 UI | §6 |
| G2-06 | 无全国数据驱动结构（Province/City/POI/Route Data＋按级懒加载）；10 城 MVP 与 fallback 缺失 | §7/§10 |
| G2-07 | 无面包屑（中国 > 省 > 市）与层级切换语义（Zoom≠换层） | §8 |
| G2-08 | 配色与参考图指定令牌不一致（路线需蓝→紫渐变） | §9 |
| G2-09 | 旧 `PlaceMap` 省轮廓+连线形态需退役清理（发起人「清理已完成的分支功能」） | 本轮指示 |
| G2-10 | 发布/详情/e2e 依赖旧地图语义（data-city/all、全省只聚焦、候选浮层），需兼容改造不破坏功能 | 本轮指示 |

## 4. 约束与裁决沿用

- 不新增 OpenSpec change：R2 工件以 `-r2` / `-review-2` 后缀追加于 `refine-trip-map`（先例：`refine-experience-share/g2-decision-r2.md`）。
- 不归档（refine-trip-map / S06 / S07）；G1 条件 C1 归档顺序延续。
- 每阶段一次提交；push 前 `git pull --rebase`。
- 离线 SVG MVP：不接 Google/高德/百度/Mapbox/Leaflet 瓦片；为未来接入预留 `MapProvider` 边界（design 登记）。
- 分支清理核对：本地仅 `main` 与 `feature/refine-trip-map`，无已合并待删分支；「清理」落实为退役旧地图实现（G2-09）。

## 5. 准入结论

基线可用、缺口可判定 → 进入 P1（R2 proposal 增补）。