# P2 规格记录 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（REQ-017 / AI 智能行程推荐：基于地点、预算和天气生成游玩路线）｜ **阶段：** P2（Delta Spec → G1）
- **日期：** 2026-11-17｜ **记录人：** Jay（AO）（发起人 2026-11-17 确认；第二签署人 Neal（VL））

## 1. 阶段目标

把 P1 Delta 草稿逐条复核为可判定规格基线：AC/DoV 复核 → 一致性检查 → G1（IO + SA 具名签署），作为 P3 设计与任务分解的规格权威。

## 2. 产出

| 工件 | 结论 |
|---|---|
| `openspec/changes/add-ai-itinerary/specs/ai-itinerary/spec.md` | ADDED 8 Requirement / 36 Scenario（P1 定稿，本轮复核未改语义） |
| `openspec/changes/add-ai-itinerary/specs/trip-plans/spec.md` | ADDED 1 Requirement / 5 Scenario（只加保存链接行为，不改既有发布 / 详情） |
| `openspec/changes/add-ai-itinerary/dov-ac-review.md` | AC 4/4 + DoV 5/5 Pass；AC1–AC18 映射 18/18；DoD 19/19；8 条规格解释裁决 |
| `openspec/changes/add-ai-itinerary/consistency-lint.md` | Pass；0 BLOCKER / 0 WARNING / 5 SUGGESTION（L-01~L-05 延后 P3） |
| `docs/reviews/20261117-add-ai-itinerary-spec-review.md` | Pass；0 BLOCKER / 0 WARNING / 2 SUGGESTION（延后 P3） |
| `openspec/changes/add-ai-itinerary/g1-decision.md` | G1 Pass；无阻断条件、无归档顺序条件 |

## 3. 关键裁决（dov 8 条，摘要）

1. 雨天 = 降雨概率 ≥60%（测试替身口径）；室内占比 + Tips 关键词断言。
2. 高温 ≥32°C 或 UV ≥8 → 防晒补水；低温 ≤10°C → 外套 / 温差。
3. POI 解析失败标「未定位」+ 更换入口；路线按已解析子集；已解析 <2 阻断保存；不伪造坐标。
4. 保存两段式：先 POST 快照 → 携 id 跳发布页预填 → POST /api/trips；失败快照保留可重试，不做跨接口事务。
5. 「AI 帮我降低预算」= 携 reduceBudget 重生成，不自动循环。
6. 天气窗口今天起约 16 天，超窗 400 可读拒绝。
7. 时长档位（半天 / 1 天 / 2 天）影响提示词数量与按天分组；E2E 只断言 ≥2 POI。
8. Marker 编号 = 列表顺序号；未定位不渲染 Marker 但保留序号。

## 4. P3 跟踪项（G1 非阻断条件，owner Jay）

- `design.md`：L-01 保存失败语义 / L-02 天气权威路径（generate 响应为权威）/ L-03 AI 非法输出重试策略 / L-05 详情页加性渲染。
- `atdd-design.md`：L-04 三外部服务替身口径，CI 与离线不依赖真实 key。
- P4：`trips.spec.ts` 回归 + 新增 E2E + `mvnw.cmd verify` + vitest。

## 5. 签署

| 对象 | 签署位 | 批准人 | 日期 |
|---|---|---|---|
| Delta Spec（两份） | 工件 1 | WAYNE | 2026-11-17 |
| spec 评审报告 | 报告 1 | WAYNE | 2026-11-17 |
| spec 评审报告 | 报告 2 | Jay（AO） | 2026-11-17 |
| g1-decision.md | G1 IO | WAYNE | 2026-11-17 |
| g1-decision.md | G1 SA | Neal（VL） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准（WAYNE + Jay + Neal）」，授权代签全部 5 个签署位。

**阶段结论：G1 Pass。** 下一步 P3：design.md / atdd-design.md / tasks.md + 评审 + Jay / Neal 工件签。

## 6. 提交与验证记录

- **validate（本轮实测）：** `openspec validate add-ai-itinerary --strict` → valid；`openspec show add-ai-itinerary --deltas-only --json` → `deltaCount: 9`。
- **阶段提交：** `docs(p2): add-ai-itinerary delta spec and G1 for AI itinerary recommendation`；提交前核对当前分支为 `feature/add-ai-itinerary`（P1 偏离教训），只 stage 本 change 路径；push 前 `git pull --rebase --autostash origin main`。
- **附带收编：** p1-intent.md §6 偏离记录②（P1 提交落 main 已 merge 收编）随本阶段提交入库。