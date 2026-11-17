# AC/DoV 复核 — refine-trip-map（P2）

- **Change：** `refine-trip-map`｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）
- **输入：** proposal 验收信号 1–8；Delta `specs/trip-plans/spec.md`（5 Requirement / 46 Scenario）

## 1. AC → 场景映射（8/8）

| AC | 摘要 | 承接场景 | 结论 |
|---|---|---|---|
| AC1 | 详情路线地图 + 行程安排条 | ADDED「详情渲染路线地图与行程安排条」 | Pass |
| AC2 | 点击聚焦 + 地点卡 + 降级 | ADDED「点击途经点聚焦并弹出地点卡」「无离线点位时降级文本列表」 | Pass |
| AC3 | 两页缩放 / 全屏 / 视口走查 | MODIFIED「缩放平移与全屏」+ ADDED「详情地图缩放与全屏」 | Pass |
| AC4 | POI 卡 / 连加 / 上限 / 空白候选 | MODIFIED「地图点击总有可见反馈」「途经点连加与上限反馈」 | Pass |
| AC5 | 多集合发布 + 三处展示 | MODIFIED 发布「填写集合信息后成功发布」「多个集合区域去重与 trim」「集合区域超量时拒绝发布」+ 详情「展示集合区域与集合时间」 | Pass |
| AC6 | 编辑多值 + 错误码 | MODIFIED 维护「发布者编辑集合信息」「集合信息校验失败时不保存」「非发布者…」「已结束…」 | Pass |
| AC7 | 工具链全绿 | DoV §3 验证链路（P4 执行） | Pass（口径可执行） |
| AC8 | 旧数据不丢值 | MODIFIED 详情「旧数据集合区域升级不丢值」 | Pass |

## 2. DoV 检查（5/5）

| id | 检查 | 结论 | 证据 |
|---|---|---|---|
| D1 | 每条 AC ≥1 可判定场景 | Pass | §1 映射 8/8 |
| D2 | 场景 Given/When/Then 可观察 | Pass | 46 场景均为 UI / API 可观察行为；无「体验更好」类不可判定表述 |
| D3 | 边界与错误码显式 | Pass | ≤3 / ≤100 / 2–8 / 400 INVALID_INPUT / 403 FORBIDDEN / 409；null/[] 归一口径在 proposal 决策 |
| D4 | 无平行权威 | Pass | 全省概览以「取代」声明收编旧场景；地图视觉口径单一来源为本 delta |
| D5 | 基线场景保留 | Pass | 机器核对：发布 18/18、详情 6/6、地图上下文 5/5（+1 显式取代）、维护 5/5；未改 Requirement 的场景留在 Living |

## 3. 验证链路（P4 执行，与 P0 §3 同源）

`openspec validate --strict` / Redocly lint / `mvnw -B -ntp verify`（OpenApiTest 0.11.0 + meeting_areas 断言）/ 前端 build+test / E2E 全量 / 1440·768·390 × 浅·深走查。

**结论：AC 8/8 + DoV 5/5，进入一致性检查与 G1。**

---

## R2 增补（2026-11-16，三级地图架构）

- **输入：** proposal §R2 验收信号 9–14；Delta 增至 9 Requirement / 66 Scenario（MODIFIED 4 + ADDED 5）。

### R2 AC → 场景映射（6/6）

| AC | 摘要 | 承接场景 | 结论 |
|---|---|---|---|
| AC9 | 三级切换（中国→省→城市） | ADDED 探索「中国地图选省」「省级地图选城市且无连线」「城市旅行地图六 Layer」 | Pass |
| AC10 | 路线生成＋编号同步＋预计统计 | ADDED 路线「少于两个…」「生成路线后编号与列表同步」「统计卡标预计」「移除景点即时同步」 | Pass |
| AC11 | 同行者气泡/面板/资料/邀请 | ADDED 同行者「聚合气泡由数据计算」「面板展示共同景点与偏好」「查看资料与发起邀请」「无真实行程…演示提示」 | Pass |
| AC12 | 面包屑回层＋Zoom 不换层＋搜索直达 | ADDED 探索「面包屑逐级返回」「搜索省或市直达」+ MODIFIED「面包屑回层与 Zoom 不换层」 | Pass |
| AC13 | fallback＋10 城 MVP | ADDED 探索「无数据城市 fallback」「MVP 十城可进入」+ MODIFIED「目的地无城市数据时统一 fallback」 | Pass |
| AC14 | 现有功能回归不破 | R1 AC1–AC8 场景保留＋E2E 全量（P4 执行） | Pass |

### R2 DoV（5/5）

| id | 检查 | 结论 |
|---|---|---|
| D1 | 每 AC ≥1 可判定场景 | Pass（6/6） |
| D2 | 可观察 | Pass：路由 hash、Layer DOM、百分比数值、fallback 文案均可断言 |
| D3 | 边界显式 | Pass：≥2 生成门槛、≤8 途经点、重合度=共同/路线长、预计标注、Mock 邀请不伪造 |
| D4 | 无平行权威 | Pass：R1「全省概览」场景显式取代为三级级联；地图视觉口径单一来源本 delta |
| D5 | 基线保留 | Pass：R2 仅取代 R1 新增场景（全省概览/暂无离线点位），Living 基线场景（发布 18/详情 6/维护 5）未删；机器核对 missing=[] |

**R2 结论：AC 14/14 + DoV 5/5，进入 G1-r2。**