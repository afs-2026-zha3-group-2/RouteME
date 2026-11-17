# G1 decision — add-trip-weather

- **Gate:** G1（Align）
- **Change:** `add-trip-weather`（`trip-weather` ADDED，REQ-022 / S22 目的地天气与出行提醒）
- **Timestamp:** 2026-11-17T20:45+0800
- **Recorded by:** Jay（AO）；评审意见由 AI agent 起草，批准由具名人员按矩阵签署

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | Why / What Changes / 问题 G-01~G-08 / In-Out scope / D1–D7 / 影响面 / 残余风险齐全 |
| Delta Spec — `trip-weather` | [`specs/trip-weather/spec.md`](specs/trip-weather/spec.md) | 6 Requirement / 28 Scenario；ADDED；`openspec validate add-trip-weather --strict` valid |
| Living Spec baseline | `openspec/specs/trip-plans/spec.md`、`design-system/spec.md` | 不改写任何既有 Requirement 块；“新增能力”方式归档 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ 映射 16/16；用户 AC 14/14；无阻塞 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 4 |
| P1 quality report | `docs/ai4se-plugins/20261117-201500-quality-checklist-report.md` | P1 Overall Pass（required 4/4） |
| P2 quality report | `docs/ai4se-plugins/20261117-203000-quality-checklist-report.md` | P2 Overall Pass（P2-1 ~ P2-4） |
| Requirements | `requirement-workspace/requirements/REQ-022-trip-weather.md` | 16 场景；blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-022-trip-weather.md` | 候选能力 ADDED；Discovery Decision `Go` |
| Impact brief | `requirement-workspace/impact-brief.md` §22 | as-is 盘点、delta、blast radius、风险、拆分边界 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-022 增补」 | ①–④ 四表 + 展示探针 |
| Upstream evidence | Open-Meteo `v1/forecast` 官方文档 | daily 变量、`timezone` 必填、`forecast_days` 0–16、错误 400 + `reason` |
| Implementation evidence | `git grep -i "open-meteo\|weather"`（`backend/src/main` + `frontend/src`） | 仅命中「天气或不可抗力原因」文案；无天气端点或组件 |
| User decisions | 2026-11-17 D1–D4 | 后端归属本 change；坐标口径；两处落地；当前开发者 Jay |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-022 一致：天气获取、坐标解析、提醒规则、两页展示、窗口与状态；无 AI、无逐天预报、无通知、无落库 | `proposal.md` §范围；`dov-ac-review.md` §Proposal → Delta 覆盖 |
| Ambiguity | 无未决歧义：首日口径、越界为业务状态、UV 缺失不等于 0、阈值固定，均已裁决 | `dov-ac-review.md` §规格解释裁决 1–5 |
| Conflict | 无阻塞冲突；与 `add-ai-itinerary` 的天气代理重叠登记为风险并要求 P3 定合并顺序 | `consistency-lint.md`；`proposal.md` §残余风险 1 |
| Traceability | REQ-022 16/16 有 Delta 落点；用户 14 条 AC 14/14；提案 In scope 6 项均有 Requirement | `dov-ac-review.md` §Requirement mapping |
| Residual risk | 天气代理重叠、坐标精度、上游可用性与额度、阈值未校准、契约号段 | `dov-ac-review.md` §残余风险 R-1 ~ R-5 |

## Decision

**Pass**

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | `design.md` 明确与 `add-ai-itinerary` 的天气代理合并顺序与复用方式（本 change 为权威） | Jay | P3 design / P4 合并 |
| C2 | 天气卡状态枚举（`idle` / `loading` / `ready` / `unavailable` / `error`）与提醒返回顺序写进设计 | Jay | P3 design |
| C3 | 契约版本 0.16.0 在 P4 定稿前复核；若被占用则顺延并同步 `OpenApiTest` | Jay | P4 |
| C4 | 阈值常量集中在后端一处，前端不得复制阈值判断 | Jay | P3 / P4 |
| C5 | 越界进入「暂无该日期天气预报」路径，不进入失败重试路径 | Jay | P3 / P4 |
| C6 | P5 `summary.md` 统一坐标精度的唯一表述（L-03） | Jay | P5 |

## Approvers

| 角色 | 姓名 | 状态 |
|---|---|---|
| IO | WAYNE | 已签（2026-11-17） |
| SA | Jacky | 已签（2026-11-17） |
| 当前开发者 | Jay（AO） | 已确认（2026-11-17） |
| VL | Neal | 不适用（G1 签署矩阵为 IO + SA） |
| SM | Lewis | 不适用（G1 签署矩阵为 IO + SA） |

签署来源：发起人 2026-11-17 指示「按名册默认记签署」，按 `docs/sdd/README.md#角色名册` 记录 IO = WAYNE、SA = Jacky；本记录不代替 G2 / G3 的独立签署。

## Next

- Decision = Pass → P3（`design.md` → `atdd-design.md` → `tasks.md` → 质量检查）。
- C1 / C2 / C4 / C5 落 P3 设计与 P4 实现；C3 落 P4；C6 落 P5。