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