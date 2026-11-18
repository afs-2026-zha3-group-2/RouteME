# Consistency lint — add-ai-itinerary

- **Change:** `add-ai-itinerary`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-ai-itinerary/`）
- **Timestamp:** 2026-11-17
- **Artifact level:** 2（proposal + 2 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate add-ai-itinerary --strict` → valid；`deltaCount: 9`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 5 / N/A 5

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `specs/ai-itinerary/spec.md` R8 + `specs/trip-plans/spec.md` R9 | 快照保存与行程创建是两次请求，非事务；中间失败会留下无行程链接的快照 | `design.md` 写明失败语义：快照为用户资产保留，发布页可携 id 重试；不做跨接口事务、不做孤儿清理（dov 裁决 4 已定口径） | dov-ac-review 裁决 4 | spec | [fact] |
| L-02 | SUGGESTION | p2 | `specs/ai-itinerary/spec.md` R3 | 天气有两条获取路径（预览 GET + generate 内自取），时间差可能口径漂移 | `design.md` 定 generate 响应天气为权威，生成成功后右栏天气卡切换到响应天气；预览仅供生成前展示 | proposal 决策「天气参与方式」 | spec | [fact] |
| L-03 | SUGGESTION | p2 | `specs/ai-itinerary/spec.md` R2「AI 输出非法时按失败处理」 | 未写后端对非法 JSON 是否自动重试 | `design.md` 定重试策略（建议不自动重试，前端 Retry 驱动；或一次自动重试并记日志），错误码 `AI_INVALID_OUTPUT` 口径不变 | proposal 残余风险 | spec | [inference] |
| L-04 | SUGGESTION | p2 | `proposal.md` 影响面测试行 | E2E 若依赖真实 DeepSeek / 高德 / Open-Meteo，CI 与离线环境不稳定 | `atdd-design.md` 定替身口径：后端外部 HTTP 接口化 + 测试替身；E2E 用路由拦截或后端替身配置，CI 不依赖真实 key | P0 §3 验证链路 | proposal | [fact] |
| L-05 | SUGGESTION | p2 | `specs/trip-plans/spec.md` R9「详情页展示 AI 来源标识与摘要」 | 标识与摘要为详情页新增渲染，需确认不削弱既有详情场景断言 | `design.md` 写明为加性渲染（既有字段与状态徽标不变）；P4 跑 `trips.spec.ts` 回归 | Living `trip-plans` 详情 Requirement | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | proposal §Why 六处缺口 + P0 源码证据 |
| P2 `## What Changes` | Pass | §What Changes 11 条 + §范围 In scope 5 组 |
| P3 Non-Goals | Pass | §范围 Out of scope 7 项，具体 |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖契约 / 迁移 / 后端 / 前端 / 测试 / 知识库 |
| S1 Spec structure | Pass | `## ADDED Requirements` + `### Requirement` + `#### Scenario`；validate --strict valid |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | `@rule:` 均可在权威区解析（spec-first / sdd-artifacts / artifact-review-gate / tdd-cycle / api-contract / no-hardcoded-secrets / web-coding-style / web-testing / git-branching-and-pr） |
| S3 Requirement → proposal | Pass | 9 Requirement 与 proposal What Changes 一一对应 |
| S4 Given / When / Then | Pass | 41/41 Scenario 均具备 Given / When / Then |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario |
| S6 MODIFIED 基线存在 | N/A | 本 change 无 MODIFIED（全 ADDED） |
| S7 MODIFIED 未丢基线场景 | N/A | 同上；既有发布 / 详情行为由「普通发布不受影响」场景与 P4 回归兜底 |
| C1 proposal → spec | Pass | In scope 5 组均有 Scenario 落点（dov-ac-review AC 18/18 + DoD 19/19） |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径均存在 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃 |
| p2-2 Delta 内部一致 | Pass | 编号口径（裁决 8）与「解析失败提示更换」互洽；预算未填不提示超支与「AI 估算恒标」互洽；天气权威路径（L-02）待 P3 收口 |
| p2-3 proposal 关键场景有落点 | Pass | AC1–AC18 18/18 |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- S6 / S7（无 MODIFIED）
- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）

## Fix suggestions by priority

1. **P3（should）：** L-01 / L-02 / L-03 / L-05 落入 `design.md`（保存失败语义 / 天气权威路径 / AI 重试策略 / 详情加性渲染）。
2. **P3（should）：** L-04 落入 `atdd-design.md`（替身口径与 CI 无 key 运行）。

## Residual risks

| 风险 | 说明 |
|---|---|
| 双 capability 归档合并 | P5 归档时 `ai-itinerary` 为新能力整目录合并；`trip-plans` ADDED 块追加，不覆盖既有 Requirement |
| 与并行 change 的契约 / 样式漂移 | openapi 单文件与 styles.css 末尾追加策略；push 前 pull |
| 本报告不覆盖代码质量 | 实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: Jay（AO）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-17
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `g1-decision.md`（需 IO WAYNE + SA Neal 具名签署）。