# 变更提案：refine-trip-map

- **需求来源：** REQ-016 用户验收反馈（2026-11-16）：「地图无法使用、组件劣质、没有放大缩小全屏、点击地点没有显示出地图、途径点与集合区域无法添加多个」，附导航风参考图（详情即地图 + 行程安排条）｜ **编号登记：** `requirement-workspace/registry.md` REQ-016
- **能力：** `trip-plans`（MODIFIED 4 + ADDED 1）
- **规模：** M（前端地图视觉与交互重做 + 详情页路线地图；契约 0.11.0 + 后端 + V17 迁移的多值集合区域）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:artifact-review-gate`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:git-branching-and-pr`；视觉基准：发起人提供参考图（2026-11-16，导航 App 风：编号水滴 pin、蓝色路线白 casing、公园绿地、河流、图例卡、右侧缩放/全屏控制条、底部行程安排条）
- **基线：** `main@6d2116b`。有效增量基线：`add-trip-publish`（地图上下文，未归档）、`refine-trip-chat`（集合信息，未归档，契约 0.10.0 / V16）。
- **归档顺序：** 发起人指示 S06（`add-trip-publish`）/ S07（`add-match-reason`）暂不归档；本 change  likewise 不归档。与 `add-destination-area-filters` / `refine-safety-report` 同窗口归档时需串行（同改 `openapi.yaml` 与详情页）。

## Why

导航风 SVG 地图一期（`6f03261`）已交付拖拽 / 缩放 / 全屏 / 点选，但用户验收仍判定「不可用、太丑」。实测（8080 + 5173，`main@6d2116b`）把反馈拆成六个可复现缺口（详见 `docs/sdd/refine-trip-map/p0-baseline.md` §5）：

- **详情页没有地图。** `TripDetailPage` 只有文本途经点列表，点击列表项无反应；参考图的核心形态（详情即导航地图 + 底部行程安排条）完全缺失。这是「点击某处地点没有显示出地图」的主因。
- **视觉是示意图而非导航地图。** 网格路 + 矩形色块公园 + 圆点标记；没有编号水滴 pin、路线白 casing、绿地树形、河流带宽、图例卡与右侧控制条，与参考图差距大。
- **点击反馈不可靠。** 空白点击实测未出现候选浮层；POI 点击直接入列表、无信息卡预览，用户感知为「点击没有效果」。
- **集合区域单值替换。** 契约 `meeting_area: string`，选第二个地点会替换第一个；用户要求可添加多个。
- **多途经点缺可执行证据。** 源码可连加（实测「广州塔」「北京路」），但 E2E 只断言加 1 个，上限（8）无提示断言；用户侧「无法添加多个」的感知需要回归网与上限反馈来闭环。
- **规格与实现漂移。** `add-trip-publish` 增量写「未选目的地不渲染地图」，实现已渲染全省概览；需要把全省概览 + 城市聚焦收编进规格。

## What Changes

- `trip-plans`（MODIFIED「发布表单的默认值与地图上下文」）：地图视觉与交互口径重写——导航风底图（绿地 / 河流 / 白色道路 / 分区名）、编号水滴 pin 与蓝色路线白 casing、图例卡、右侧竖排控制条（放大 / 缩小 / 全屏 / 回范围）、比例尺；未选目的地渲染全省概览（可点城市），选定后聚焦该市；任何点击都有可见反馈：POI → 地点信息卡（加入路线 / 设为集合区域动作按上下文），空白 → 最近候选浮层；拖拽 / 滚轮 / 按钮缩放 / 全屏保留。
- `trip-plans`（ADDED「行程详情路线地图」）：详情页渲染只读路线地图（编号 pin + 路线 + 图例 + 控制条）与底部行程安排条（序号徽标 + 地点名 + 相邻点直线距离估算）；点击途经点列表 / 行程条 / 地图 pin 聚焦该点并打开地点卡；目的地无离线点位或途经点不在地名库时降级为文本列表并说明。
- `trip-plans`（MODIFIED「发布可被他人理解的旅行计划」）：`meeting_area` 单字符串改为 `meeting_areas` 数组（选填，≤3 个、每个 ≤100 字、去重），两端同口径校验；其余发布约束不变。
- `trip-plans`（MODIFIED「查看行程详情与清晰的状态」）：集合区域按多值展示（列表），空数组 / null 仍「待确认」。
- `trip-plans`（MODIFIED「发布者维护集合信息」）：编辑对象改为 `meeting_areas` + `meeting_time`，错误码口径不变（400 / 403 / 409）。
- 契约 `openapi.yaml` 升 **0.11.0**：`TripSummary` / `TripCreateRequest` / `TripMeetingRequest` 的 `meeting_area` 替换为 `meeting_areas`（array of string，maxItems 3，items maxLength 100，nullable）；`OpenApiTest` 同步断言。
- 后端：`V17__meeting_areas.sql`（新增 `meeting_areas` TEXT 列，JSON 数组；把既有 `meeting_area` 非空值回填为单元素数组；旧列保留一个版本不删，读写只认新列）；entity / pojo / request / response / `TripPlanServiceImpl` / `TripPlanMapper.xml` / 种子数据同步。
- 前端：`PlaceMap` 视觉与浮层重做；`PlacePicker` 集合区域改 `mode="multi"`（max 3）；`TripCreatePage` / `TripDetailPage` / `MyTripsPage` / `chatMeeting` / `tripForm` / `meetingForm` / `types` / `tripMessages` 多值接线；`styles.css` 末尾追加新地图令牌与样式（不改既有选择器语义）。
- 测试：前端单测补多值集合表单 / 校验、地图视口逻辑回归；E2E 增补「连加多个途经点 + 上限提示」「空白点击候选浮层」「详情页地图 + 点击聚焦」「多集合区域发布 / 编辑 / 三处展示」。

## 范围

**In scope**

- 发布页与详情页共用同一 `PlaceMap` 组件的导航风重做（浅 / 深主题令牌驱动）。
- 详情页路线地图 + 行程安排条 + 点击聚焦 + 地点卡（只读，不在详情页改路线）。
- 点击反馈：POI 信息卡、空白最近候选浮层（最多 3 个候选，可一键加入）。
- 多集合区域：契约 / 迁移 / 后端 / 发布表单 / 详情编辑弹窗 / 详情展示 / 聊天安全条 / 我的旅行摘要，全链路多值。
- 多途经点：保留 2–8 校验，补上限提示与 E2E 连加断言。
- 全省概览收编进规格（消除 G-06 漂移）。

**Out of scope**

- 在线地图瓦片 / 厂商 key / 真实地理编码（发起人裁决沿用方案 1 离线 SVG）。
- 路线沿道路吸附 / 转弯导航（路线仍为点序连线，加白 casing 与圆角平滑）。
- 地点真实照片（离线无资产；地点卡用目的地色调内置封面 + 地点字形，与 `TripCard` 封面同源）。
- 地图上的「同路匹配」气泡（属 S07 / `add-match-reason` 范围，不混入）。
- 每途经点游玩时长 / 时间段编辑（契约 stops 仍为名称数组；行程条只展示序号 / 名称 / 距离估算）。
- 详情页路线编辑、途经点拖拽排序。
- 旧 `meeting_area` 列的物理删除（保留一个版本，P5 归档后再议）。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/openapi.yaml` | 0.11.0；三处 `meeting_area` → `meeting_areas`；示例同步 |
| `backend/.../db/migration/V17__meeting_areas.sql` | 新列 + 回填；不重建表 |
| `backend/.../entity/TripPlanEntity.java`、`pojo/TripPlan.java`、`request/*`、`response/*`、`service/impl/TripPlanServiceImpl.java`、`mapper/TripPlanMapper.xml` | 多值读写与校验（≤3 / ≤100 / 去重 / trim） |
| `backend/.../OpenApiTest.java`、`TripControllerTest.java`、`TripCompletionApiTest.java` | 版本与字段断言同步 |
| `frontend/src/map/PlaceMap.tsx`、`mapView.ts`、`placeCatalog.ts` | 视觉重做 + 浮层交互 + 只读模式 prop；视口逻辑保留 |
| `frontend/src/map/PlacePicker.tsx` | 集合区域 multi（max 3）；候选浮层与地点卡动作回调 |
| `frontend/src/trips/TripCreatePage.tsx`、`tripForm.ts`、`tripOptions.ts` | `meetingAreas: string[]`；`MAX_MEETING_AREAS=3` |
| `frontend/src/trips/TripDetailPage.tsx`、`meetingForm.ts` | 路线地图 + 行程条 + 聚焦；编辑弹窗多值 |
| `frontend/src/trips/TripCard.tsx`、`mine/MyTripsPage.tsx`、`chat/chatMeeting.ts`、`types.ts`、`i18n/tripMessages.ts` | 多值展示摘要 |
| `frontend/src/styles.css` | 末尾追加导航风地图样式与令牌（含深色） |
| `frontend/src/**/*.test.ts`、`e2e/tests/trips.spec.ts` | 单测与 E2E 增补 |
| `e2e/tests/companions.spec.ts` | API helper 的 `meeting_area` 改 `meeting_areas`（实测仅此处直接构造该字段） |
| `docs/knowledge/architecture/README.md`、`_LOG.md` | P4 后回写地图小节 |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 地图方案 | 方案 1 离线 SVG（发起人裁决） | 无网络 / 无 key 可演示；地名库即校验权威 |
| 集合区域契约 | `meeting_areas` 数组替换 `meeting_area`（发起人裁决），0.11.0 | 单一口径；旧列保留一版做回填来源，避免双字段优先级 |
| 集合区域上限 | 3 个、每个 ≤100 字、trim 去重 | 与「集合点候选」语义匹配；校验两端同口径 |
| 空值口径 | 请求接受 null 或数组；响应统一归一为数组（未填 = `[]`）；展示层 `[]` → 「待确认」 | 避免 null / [] 双口径漂移；契约字段仍 nullable 以兼容旧客户端 |
| 点击反馈 | POI → antd 风格地点卡（内置封面 + 名称 + 类型 + 动作按钮）；空白 → 最近 3 候选浮层 | 任何点击都有可见结果，闭环「点击没有效果」 |
| 详情地图 | 只读 + 聚焦交互；行程条在地图下方 | 参考图形态；编辑仍走发布 / 集合编辑入口，不扩权 |
| 视觉令牌 | 扩 `--map-*`（land 米白 / park 绿 / water 蓝 / road 白 / route 蓝 / pin 珊瑚红），深色同套 | 与参考图配色一致且主题可切换；antd 组件优先（Button / Tooltip / Popover 语义） |
| 全省概览 | 收编进 MODIFIED，替换「未选目的地不渲染」 | 实现已交付且体验更好；消除平行权威 |
| 距离估算 | 投影坐标 × 比例系数（现有 `scaleKm` 同源）标注「约」 | 离线无路径规划；诚实标注估算 |

## 验收信号

1. 详情页 `#/trips/{id}`（目的地有离线点位）渲染路线地图：编号 pin 按 stops 顺序、蓝色路线白 casing、图例卡、右侧控制条；下方行程安排条列出全部途经点与相邻「约 x km」。
2. 点击详情途经点列表项 / 行程条 / 地图 pin：地图聚焦该点并弹出地点卡；不在地名库的途经点降级文本列表且有说明。
3. 发布页与详情页地图均可拖拽、滚轮 / 按钮缩放、全屏（Esc 退出）、回范围；1440 / 768 / 390 × 浅 / 深不溢出不失真。
4. 发布页点击 POI 弹出地点卡，「加入路线」后 chips 序号递增；连续加入 ≥2 个成功；加满 8 个后再加给出上限提示；空白点击出现候选浮层且可加入。
5. 发布页集合区域可连加 2–3 个（chips 多值），第 4 个被拒并提示；单个 >100 字被拒；发布后详情页 / 聊天安全条 / 我的旅行均展示全部集合区域。
6. 发布者编辑集合区域为多个后三处同步；非发布者 403、已结束 409、超长 / 超量 400，口径不变。
7. `openapi.yaml` 0.11.0 Redocly 0 error；`OpenApiTest` / 后端 verify / 前端 build+test / `openspec validate refine-trip-map --strict` / E2E 全绿。
8. 旧数据（V16 既有 `meeting_area`）升级后以单元素 `meeting_areas` 展示，不丢值。

## 残余风险

| 风险 | 处理 |
|---|---|
| 与并行 change 同改 `openapi.yaml` / `styles.css` / 详情页 | 单文件冲突靠 `git pull --rebase` 吸收；样式只末尾追加；V17 号段已核对无预留 |
| 归档顺序：MODIFIED「发布表单的默认值与地图上下文」目标尚在 `add-trip-publish` 增量 | `openspec validate --strict` 现报 INFO「Archive would refuse…not found」；登记为 G1 条件 C1：P5 归档须 `add-trip-publish` / `refine-trip-chat` 先于本 change；基线口径说明放 design.md，不放 delta 前言 |
| 用户侧旧 jar 感知与源码行为不一致 | push 后 CD 重建 release；P4 验证以源码 dev server 为准并在报告注明 |
| E2E 地图坐标点击脆弱 | pin / 浮层 / 控制条全部带 `data-testid` 与 aria-label，断言走语义定位 |
| 地点卡 / 候选浮层在窄屏越界 | 浮层定位 clamp 到 shell 内；390 走查 |
| 旧列保留造成读写歧义 | 读写只认 `meeting_areas`；Mapper XML 同步；OpenApiTest 断言新字段 |

## 交付边界

本提案为 P1 产物。Delta Spec / AC/DoV / G1 属 P2；design / atdd / tasks 属 P3；代码与验证 / G2 属 P4；Living Spec 合并与归档属 P5——本 change 按发起人指示不归档。