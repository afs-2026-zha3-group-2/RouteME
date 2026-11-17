# Artifact review — add-traveler-recommendation / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`proposal.md`](../../openspec/changes/add-traveler-recommendation/proposal.md)
- **Supporting inputs:**
  - [`requirements/REQ-024-traveler-recommendation.md`](../../requirement-workspace/requirements/REQ-024-traveler-recommendation.md)（16 场景 S24-1 ~ S24-16，blocking OQ 0，DoR BLOCKER 0）
  - [`intents/REQ-024-traveler-recommendation.md`](../../requirement-workspace/intents/REQ-024-traveler-recommendation.md)（证据锚点 + 用户裁决 D1–D7）
  - [`p0-baseline.md`](../../docs/sdd/add-traveler-recommendation/p0-baseline.md)（缺口 G-01 ~ G-09）
  - 规则：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/architecture/rules.md#api-contract`、`#package-structure`；`rules/quality/rules.md#web-coding-style`；`rules/testing/rules.md#java-testing`、`#web-testing`
  - 现状核实：`MatchController.java`（仅 `/matches` 两条路径）、`MatchServiceImpl.java`（`latestOpenByPublisher` 参照、按 `createdAt` 同分排序）、`TripMatch.java`（无分项得分）、`TripDetailPage.tsx`（详情页只有单条匹配块）、`mockCompanions.ts`（硬编码 `overlapPercent`）、`openapi.yaml` 0.18.0

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/quality/rules.md#naming-conventions` | 决策表 D5 / 影响面 | `TravelerRecommendation` 与既有 `MatchCandidate` 命名易混（一个候选是行程、一个是人） | P2 Delta 中用「推荐项 = 用户 + 其行程」的措辞固定语义；P3 设计明确不复用 `MatchCandidate` | [inference] |
| F-2 | SUGGESTION（P3 承接） | `rules/testing/rules.md#web-testing` | 「Out of scope」与「影响面」 | 仓库无 jsdom / Testing Library，组件测试只能在 E2E 覆盖 | P3 ATDD 明确「纯函数单测 + E2E 覆盖四态」，不引入新测试依赖 | [fact] |
| F-3 | SUGGESTION（P2 承接） | `rules/process/rules.md#spec-first` | 「范围」与残余风险第 2 条 | 共同兴趣来源选择「行程标签 ∩ 我的兴趣」，需在 Delta 里写成可判定条件 | P2 Delta 为「共同兴趣」补一条 Given/When/Then，明确标签来源 | [fact] |
| F-4 | SUGGESTION（已记录） | `rules/architecture/rules.md#api-contract` | 「契约」与「影响面」 | 0.19.0 顺延需与并行 change 的号段核对 | P4 落地前重新 `git pull` 并核对 `info.version`；冲突时顺延并同步 `OpenApiTest` | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `trip-recommendations`（ADDED）；不改写 `trip-companions`；接口与 UI 解耦 |
| B Quality | N/A | P1 无实现；提案已声明规则与阈值集中在一个纯函数 |
| C Testing | N/A（计划已列） | 提案已列规则纯函数、接口行为、契约、前端纯函数与 E2E |
| D Security | Pass | 只读接口；复用 `X-User-Id` 演示身份；只返回公开资料摘要，不暴露联系方式 |
| E Performance | Pass | 演示规模一次性返回；残余风险已记录分页 / 缓存缺口 |
| F Documentation | Pass | 正文中文、标识符英文；证据路径可点开；范围与非范围明确 |
| G Traceability | Pass | AC-1 ~ AC-16 → S24-1 ~ S24-16 → G-01 ~ G-09 可追溯 |

## Residual risks

- 与首页 `/matches` 的展示语义容易混淆；P3 需要用不同标题与文案区分「这条行程为什么匹配我」与「还可以和谁同行」。
- 共同兴趣来源若后续改为用户资料兴趣，需在 `breakdown` 内替换口径但不改契约形状。
- 地图探索 Mock 面板仍保留硬编码百分比；已显式列为 out of scope，P5 归档时复查是否需要单独 change。
- 推荐规模上量后需要分页或 Top-N；当前数组响应是演示规模的简化。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1 | WAYNE（IO） | 2026-11-17 | 发起人本次会话确认默认签署人 | 提案范围与 in/out-of-scope |
| 本评审报告 | 1 / 2 | WAYNE（IO） | 2026-11-17 | 发起人本次会话确认默认签署人 | 结论与签署位 |
| 本评审报告 | 2 / 2 | Jay（AO，当前开发者） | 2026-11-17 | 发起人本次会话确认默认签署人 | 结论与签署位 |