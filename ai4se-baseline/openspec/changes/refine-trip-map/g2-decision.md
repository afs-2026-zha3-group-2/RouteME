# G2 decision — refine-trip-map

- **Change id:** `refine-trip-map`（REQ-016 地图导航风重做 / 详情路线地图 / 多集合区域）
- **Gate:** G2（Verify）
- **Inputs:**
  - 实现：契约 0.11.0（`meeting_areas` 数组替换）＋V17 迁移回填＋后端多值全链路；前端导航风 SVG 地图（方案1）＋发布页多途经点/多集合＋详情页路线地图/行程条/聚焦＋聊天/我的旅行多值展示
  - 本地验证：`docs/ai4se-plugins/20261116-234500-local-verify-report.md`（后端 verify 246/246；前端 build＋211/211；E2E 81/81 fresh SQLite；Redocly valid 15 warnings 基线；openspec strict valid）
  - 走查：1440/768/390 × 浅/深 6 张截图入 `docs/preview/refine-trip-map-*.png`；Browser 交互走查全符合、控制台无 error
  - ATDD：`atdd-design.md` E1–E10 全数落地并 Pass
  - 任务：`tasks.md` T1–T12 全部完成（勾选清单同源）
- **Findings:**
  - **功能：** 缩放/滚轮/拖拽/全屏/Esc、pin 地点卡「加入路线」、空白候选浮层、全省概览城市只聚焦、8途经点上限、3集合区域上限与 100 字校验、详情编号水滴＋蓝路线＋行程条聚焦＋只读卡＋降级文案、旧单值回填展示，均按 Delta 46 场景实现。
  - **视觉：** 走查首轮发现省级投影致城市点位挤团；增补 D13 城市局部投影（22..78 铺满）＋地名常显＋小屏比例尺隐藏后，截图达到参考图导航风观感；距离估算仍走真实投影，口径不变。
  - **缺陷闭环：** PlaceMap 聚焦被自身重置 effect 撤销（E3 暴露）已修；Java `trim()`→`strip()` 对齐 U+3000（spec F-3）已修并复跑。
  - **契约：** `meeting_area`→`meeting_areas` 为替换式破坏变更，经 P1 用户裁决批准；响应归一数组；`OpenApiTest` 断言旧键不存在。
  - **回归：** 全量 E2E 81/81（含 companions 11、chat、mine、profiles、auth、experiences）；identity gate 过期断言按 `68d17ae` 登录门修订（测试侧，不改产品语义）。
- **Decision:** **Pass with documented debts**
  - 债务 1：E2E 向开发库累积行程，本地全量需 fresh DB（备份 `SqlLite/routeme-dev-backup-20261116-2300.db` 后重建×3）；CI 用 H2 不受影响。
  - 债务 2：E2E 不在 CI 流水线（既有 WARNING 延续）。
  - 观察项：`experiences.spec.ts` 一例在全量首轮因 focus reload 出现 detach 偶发；单跑与最终全量均 Pass。
- **Conditions + owners:** 无阻断条件。跟踪项：
  - G1 条件 C1 延续：归档顺序须 `add-trip-publish` / `refine-trip-chat` 先于本 change（owner：Jay；P5 执行时核）。
  - 后续：E2E 独立测试库或清理钩子（owner：Jay）。
  - 后续：experiences focus-reload 偶发如复现再修（owner：Jay + Neal）。
- **Approvers:** VL = Neal；AO = Jay（IO WAYNE 于 p4-verify 签契约口径）
- **Timestamp:** 2026-11-16

## 结论

G2 **Pass**（2 条既有债务＋1 观察项，均已记录）。本记录不替代 G3；按用户当次要求**不执行 P5、不归档** `refine-trip-map`、S06（`add-trip-publish`）、S07（`add-match-reason`）。