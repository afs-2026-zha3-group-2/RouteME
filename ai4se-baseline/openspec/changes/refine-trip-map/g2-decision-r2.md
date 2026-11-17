# G2 decision（R2）— refine-trip-map

- **Change id:** `refine-trip-map`（REQ-016，R2 三级地图架构）
- **Gate:** G2（Verify）R2 轮
- **Inputs:**
  - 实现：ChinaMap/ProvinceMap/CityTravelMap 三级独立组件（URL 为层级权威，Zoom≠换层）＋六 SVG Layer＋路线生成/统计/行程同步＋同行者纯函数重合度/面板/邀请接线＋24 城数据模块按城懒加载＋统一 fallback＋发布级联/详情只读兼容＋旧 PlaceMap 退役（D19 令牌）。
  - 本地验证：`docs/ai4se-plugins/20261117-013000-local-verify-report.md`（后端 verify 246/246；前端 tsc 0 errors＋230/230＋build 24 城市 chunk；E2E 90/90 fresh SQLite；openspec strict valid）。
  - 走查：1440/768/390 × 浅/深 9 张截图入 `docs/preview/r2-*.png`；验收 §11 完整闭环（中国→广东→广州→4 景点→路线①②③④→75% 同路 3 位同行者→共同景点/日期→邀请→trip 4）；控制台无 error（E17 机器断言）。
  - ATDD：`atdd-design.md` E11–E18 全数落地并 Pass；R1 E1–E10 兼容通过。
  - 任务：`tasks.md` T13–T24 全部完成（勾选清单同源）。
- **Findings:**
  - **架构：** 三级以独立组件切换表达；省级无城市连线；城市六 Layer 独立 `<g>`；重数据按城 import()（build 产物 24 独立 chunk 佐证）；新增城市只加数据模块＋registry 登记。
  - **诚实性：** 重合度=round(shared/route.length×100) 纯函数（75%/25% 由数据计算，UI 无硬编码）；距离/时间标「预计」（步行 4.5 km/h）；Mock 同行者邀请给演示提示不伪造成功；真实 userId/tripId 接资料页与详情申请。
  - **缺陷闭环：** 日期翻篇暴露 `updateMeeting` 无参 `status()` 真实时钟缺陷→改 `clock.instant()`（生产修复）；Chat/Match 测试类补固定时钟；PlacePicker internalNav 修复面包屑回层被外部 city 锁定覆盖；三轮 e2e 失败全部闭环（详见 verify report §4）。
  - **契约：** R2 无契约变更（openapi 0.11.0 不动）；后端仅时钟一致性修复，Delta 未偏离。
  - **回归：** 全量 E2E 90/90（含 companions/chat/mine/profiles/auth/experiences）；R1 多值集合/详情路线条/降级语义保留。
- **Decision:** **Pass with documented debts**（已签署）
  - 债务 1：E2E 向开发库累积行程，本地全量需 fresh DB（备份 `routeme-dev-backup-20261117-r2-run3.db` 后重建）；CI 用 H2 不受影响。
  - 债务 2：E2E 不在 CI 流水线（既有 WARNING 延续）。
  - 观察项：种子行程固定日期随真实时钟翻篇退出招募列表；测试侧已日期稳健化＋固定时钟，生产时钟缺陷已修；种子日期相对化另立 change 跟踪。
- **Conditions + owners:** 无阻断条件。跟踪项：
  - G1 条件 C1 延续：归档顺序须 `add-trip-publish` / `refine-trip-chat` 先于本 change（owner：Jay；P5 执行时核）。
  - 后续：E2E 独立测试库或清理钩子（owner：Jay）。
  - 后续：种子行程日期相对化（owner：Jay + Neal）。
- **Approvers:** AO = Jay；VL = Neal；IO = WAYNE（沿用 R1 P4/G2 批准矩阵）
- **Timestamp:** 2026-11-17

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| 本决议 | G2 AO | Jay（AO） | 2026-11-17 |
| 本决议 | G2 VL | Neal（VL） | 2026-11-17 |
| 本决议 | G2 IO | WAYNE（IO） | 2026-11-17 |

## 结论

G2-r2 **Pass**（2 条既有债务＋1 观察项，均已记录）。本记录不替代 G3；按发起人指示**不执行 P5、不归档**。签署后执行 P4 阶段提交 → pull --rebase → push。