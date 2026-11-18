# G1 decision — add-ai-itinerary

- **Change id:** `add-ai-itinerary`（REQ-017 / 迭代 2 AI 智能行程推荐）
- **Gate:** G1（Align）
- **Inputs:**
  - Delta Spec：`openspec/changes/add-ai-itinerary/specs/ai-itinerary/spec.md`（ADDED，8 Requirement / 36 Scenario）+ `specs/trip-plans/spec.md`（ADDED，1 Requirement / 5 Scenario）
  - AC / DoV 评审：`openspec/changes/add-ai-itinerary/dov-ac-review.md`（AC 4/4 Pass；DoV 5/5 Pass；发起人 AC1–AC18 映射 18/18；DoD 19/19；8 条规格解释裁决）
  - 一致性检查：`openspec/changes/add-ai-itinerary/consistency-lint.md`（Pass；0 BLOCKER / 0 WARNING / 5 SUGGESTION）
  - 提案：`openspec/changes/add-ai-itinerary/proposal.md`（P1 评审 Pass，WAYNE 已签）
  - 需求来源：发起人完整 User Story（2026-11-17，含技术边界与保存字段清单）；`requirement-workspace/registry.md` REQ-017
  - P0 基线：`docs/sdd/add-ai-itinerary/p0-baseline.md`（G-01~G-07；契约 0.11.0 → 0.12.0、Flyway V17 → V18）
  - 校验：`openspec validate add-ai-itinerary --strict` → valid；`openspec show --deltas-only` → `deltaCount: 9`
- **Findings:**
  - **Scope：** 与提案一致，无静默扩张。范围为「输入旅行条件 → AI 推荐 → 地图/天气验证 → 用户确认并保存路线」垂直切片；同行匹配 / 邀请同行 / 游后分享 / 实时价格 / 跨城多目的地 / 独立 AI 行程管理页已显式排除。
  - **Ambiguity：** 无未解决业务歧义。天气阈值（雨天 ≥60% / 高温 ≥32°C 或 UV ≥8 / 低温 ≤10°C）、编号口径、保存两段式顺序、降预算语义、天气窗口（约 16 天）、时长档位均已由 dov 裁决判定。保存失败语义（L-01）、天气权威路径（L-02）、AI 重试策略（L-03）、E2E 替身口径（L-04）、详情加性渲染（L-05）为 P3 技术决策，已标 deferred 且有 owner。
  - **Conflict：** 无 BLOCKER。技术边界（AI 不虚构坐标 / 路线 / 距离 / 时间 / 天气 / 价格）由 R2 / R3 / R4 / R6 / R7 的 MUST NOT 约束与后端输出契约兜底；`trip-plans` 只 ADDED 保存链接行为，不触碰未归档 `refine-trip-map` 的 MODIFIED 目标，无归档顺序冲突。
  - **例外：** 双 capability（`ai-itinerary` 新能力 + `trip-plans` ADDED 块）粒度经评审确认；P5 归档时 `trip-plans` 追加合并不覆盖既有 Requirement。真实 key 不入仓库（`ai-local.yml` gitignore + 环境变量占位），经发起人批准，符合 `@rule:no-hardcoded-secrets`。
- **Decision:** Pass
- **Conditions + owners:** 无阻断条件。跟踪项（非阻断）：
  - P3 `design.md` 定保存失败语义 / 天气权威路径 / AI 非法输出重试策略 / 详情页加性渲染（L-01 / L-02 / L-03 / L-05，owner：AO Jay）。
  - P3 `atdd-design.md` 定三外部服务替身口径，CI 与离线环境不依赖真实 key（L-04，owner：AO Jay）。
  - P4 运行 `trips.spec.ts` 回归 + 本 change 新增 E2E + 后端 `mvnw.cmd verify` + 前端 vitest（owner：AO Jay）。
  - P5 归档前与 `refine-trip-map` 核对 `trip-plans` 合并顺序（本次按发起人指示暂不归档；owner：AO Jay + SA Neal）。
- **Approvers:** IO = WAYNE；SA = Neal（发起人 2026-11-17 弹窗确认「批准（WAYNE + Jay + Neal）」，授权代签；签署明细见 `docs/reviews/20261117-add-ai-itinerary-spec-review.md`）
- **Timestamp:** 2026-11-17

## 结论

G1 **Pass**。Delta Spec（9 Requirement / 41 Scenario）可作为 P3 设计与任务分解的规格基线；本记录不替代 G2。

## Post-G1 amendment

无。若 P3 发现契约字段形状或场景语义需要调整，按 `@rule:artifact-review-gate` 重评 Delta 并追加本小节。