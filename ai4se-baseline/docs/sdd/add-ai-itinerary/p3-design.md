# P3 设计记录 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（REQ-017 / AI 智能行程推荐：基于地点、预算和天气生成游玩路线）｜ **阶段：** P3（design / atdd / tasks）
- **日期：** 2026-11-17｜ **记录人：** Jay（AO）（发起人 2026-11-17 确认；第二签署人 Neal（VL））

## 1. 阶段目标

把 G1 通过的 Delta Spec（9 Requirement / 41 Scenario）落成可执行设计与任务：G1 跟踪项 L-01~L-05 全部收口；测试先行（TDD red → green）；CI 不依赖真实 key。

## 2. 产出

| 工件 | 结论 |
|---|---|
| `openspec/changes/add-ai-itinerary/design.md` | 后端配置/错误码/四接口契约/V18；前端三栏页/纯逻辑模块/transit 扩展/保存闭环；L-01~L-05 收口（§2） |
| `openspec/changes/add-ai-itinerary/atdd-design.md` | E1–E41 场景映射；U1–U7 / B1–B12 / A1–A12 分层；替身口径（后端 base-url 替身 + Playwright 拦截，Marker 按 JS Key 分级） |
| `openspec/changes/add-ai-itinerary/tasks.md` | T1 red → T2 契约 → T3 天气 → T4 AI → T5 快照链接 → T6 纯逻辑 → T7 页面闭环 → T8 全量验证；T9 归档不执行 |
| `docs/reviews/20261117-add-ai-itinerary-design-review.md` | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（D-01 GET 读接口加性接受 / D-02 transit 夹具真实核对 / D-03 Marker 分级覆盖记录） |
| `docs/reviews/20261117-add-ai-itinerary-tasks-review.md` | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（T-01 替身放 test 源码 / T-02 共享文件先 pull / T-03 fresh SQLite 证据记录） |

## 3. 关键设计决策（摘要）

1. **L-01 保存失败语义：** 快照为用户资产保留，发布失败携 `?ai={id}` 重试，不做跨接口事务。
2. **L-02 天气权威：** generate 响应天气为权威，右栏生成成功后切换；forecast 仅预览/重试。
3. **L-03 AI 重试：** 非法输出即 `AI_INVALID_OUTPUT`（502），不自动重试，前端 Retry 驱动。
4. **L-04 替身口径：** 后端 base-url 指向测试替身控制器；E2E `page.route` 拦截 AI/天气/高德 REST；CI 无 key；Marker 断言按 `VITE_AMAP_JS_KEY` 分级。
5. **L-05 详情加性渲染：** 「AI 推荐」徽标 + 摘要只在 `ai_itinerary_id` 非空渲染，失败只隐藏摘要；`trips.spec.ts` 回归兜底。
6. **契约：** 0.12.0 四接口（generate / forecast / 快照 POST / 快照 GET，D-01 接受第四个读接口）+ `ai_itinerary_id` 可空字段；V18 新表 + 加列。
7. **transit 扩展：** `TravelMode` 增 `transit`（代理白名单已含），`parseTransitLeg` 独立解析；既有模式不变。
8. **key 安全：** `application.yaml` 环境变量占位 + gitignore `ai-local.yml`；真实 key P4 本地写入不提交。

## 4. 签署

| 对象 | 签署位 | 批准人 | 日期 |
|---|---|---|---|
| design.md + atdd-design.md | 工件 1 | Jay（AO） | 2026-11-17 |
| design.md + atdd-design.md | 工件 2 | Neal（VL） | 2026-11-17 |
| tasks.md | 工件 1 | Jay（AO） | 2026-11-17 |
| tasks.md | 工件 2 | Neal（VL） | 2026-11-17 |
| design 评审报告 | 报告 1 | WAYNE（IO） | 2026-11-17 |
| design 评审报告 | 报告 2 | Jay（AO） | 2026-11-17 |
| tasks 评审报告 | 报告 1 | WAYNE（IO） | 2026-11-17 |
| tasks 评审报告 | 报告 2 | Jay（AO） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准（Jay + Neal + WAYNE）」，授权代签本轮全部 10 个签署位（含两份报告各自的工件签署位）。

**阶段结论：Pass。** 下一步 P4：按 T1–T8 实现与本地验证，G2（VL Neal）签署。

## 5. 提交与验证记录

- **validate（本轮实测）：** `openspec validate add-ai-itinerary --strict` → valid；`deltaCount: 9`。
- **阶段提交：** `docs(p3): add-ai-itinerary design, atdd and tasks for AI itinerary recommendation`；提交前核对分支 `feature/add-ai-itinerary`，只 stage 本 change 路径；push 前 `git pull --no-rebase --autostash origin main`（P2 偏离③口径，避免重写已推送历史）。
- **附带收编：** p2-spec.md §6 偏离③（push 整合记录）随本阶段提交入库。
- **偏离④（merge 编辑器）：** `git pull --no-rebase` 触发 vim 交互阻塞；结束编辑器进程后以 `git commit --no-edit` 完成 merge（`3f70ae5`）并推送（`9bb41b0..3f70ae5`）。后续 pull 统一加 `--no-edit`（或 `GIT_EDITOR=true`）避免交互。工作区剩余 AMap / preview 改动属并行会话，未 stage、未触碰。