# G1 decision（R2）— refine-trip-map

- **Change id:** `refine-trip-map`（REQ-016，R2 三级地图架构）
- **Gate:** G1（Spec）R2 轮
- **Inputs:** proposal §R2（WAYNE 签）；Delta 9 Requirement / 66 Scenario；`dov-ac-review.md` §R2（AC 14/14 + DoV 5/5）；`openspec validate refine-trip-map --strict` valid（仅 C1 归档顺序 INFO）。
- **Findings:**
  - 三级架构以独立组件切换表达，Zoom≠换层，消除「无限放大同一 SVG」反模式。
  - 同行者百分比纯函数计算、Mock 存数据模块、邀请接真实行程或演示提示——诚实性口径可判定。
  - 懒加载边界明确：重数据按城 `import()`；轻量索引静态（名称/别名/坐标）。
  - legacy 广东城市保留同构数据模块，R1 多值集合/详情语义不被破坏。
  - 基线保留：R2 仅取代 R1 新增场景，Living 基线未删（机器核对 missing=[]）。
- **Decision:** **Pass（Conditional C1 延续）**
  - C1：P5 归档须 `add-trip-publish` / `refine-trip-chat` 先于本 change（validate INFO 同源）。
  - 无新增阻断条件。
- **Approvers:** IO = WAYNE；SA = Karena；AO = Jay（记录）
- **Timestamp:** 2026-11-16

## 结论

G1-r2 **Pass（Conditional C1）**。按发起人指示不归档；下一步 P3-r2（design/atdd/tasks）。