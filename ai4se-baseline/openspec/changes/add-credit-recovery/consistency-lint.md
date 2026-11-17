# Consistency lint — add-credit-recovery

- **Change:** `add-credit-recovery`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-credit-recovery/` + `requirement-workspace/` REQ-024 相关条目）
- **Timestamp:** 2026-11-17T00:00+08:00
- **Artifact level:** 2（`proposal.md` + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec` CLI 可用；`openspec validate add-credit-recovery --strict` → `Change 'add-credit-recovery' is valid`

## Verdict

**Pass** — BLOCKER 0 / WARNING 1（已收口）/ SUGGESTION 5 / N/A 6

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 未收口 WARNING | No（L-01 当场修正 Delta） |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | WARNING（已收口） | p2 | Delta R3「未完成学习不能提交」↔ R5「当月第 3 次考试被拒绝」 | 原场景写「考试次数不被消耗」，与 R5「每自然月最多开始 2 次考试，无论通过与否都计次」直接冲突：开始即计次，提交被拒时不可能是「未消耗」 | 已改为「该次考试已在开始时计次，MUST NOT 因本次拒绝而退还次数；不占用当月恢复次数」，`validate --strict` 复跑仍 valid | Delta R3 / R5 原文 | spec | [fact] |
| L-02 | SUGGESTION | p2 | `REQ-024` §5「契约与迁移排他」↔ `handoff.md` / `registry.md` | REQ-024 原写「P3 确认版本号与 V21」，但 `handoff.md` 已记 `add-ai-itinerary`（REQ-017）顺延 **0.15.0 + V21**；若照原措辞落地会撞号 | REQ-024 已改为「V21 已被 `add-ai-itinerary` 登记，本变更预计顺延 0.19.0 + V25，P3 排他确认」；P3 `design.md` 必须写下确认结论 | `handoff.md` 「`add-ai-itinerary` 顺延 0.15.0 + V21」；`registry.md` REQ-017 行 | spec | [fact] |
| L-03 | SUGGESTION | p2 | `proposal.md` §2（25 条）↔ `REQ-024` §4（27 条）↔ Delta（29 Scenario） | 三层编号不等长，且 REQ-024 中 `R-24` 排在 `R-16` 之后（按主题分组重排），逐条对号容易误读为「有场景丢失」 | 已在 `dov-ac-review.md`「编号体系口径」写清 25 = 27 − 2 新增（R-26 / R-27）、29 = 27 + 2 拆分（R-8 / R-17）；P3 起引用一律用 `Requirement + Scenario 名` | 三份文件实际条数 | spec | [fact] |
| L-04 | SUGGESTION | p2 | `REQ-024` §8 OQ-5 ↔ 提案影响面「新增学习会话表 + 作答记录表」 | 学习进度是否持久化未决，直接决定会话表是否需要「当前题序 / 已完成学习标记」等字段；若 P3 才决定，迁移可能返工 | P3 `design.md` 第一件事关掉 OQ-5（建议：只存「学习完成时间戳 + 最终结果」，不存中途题序） | 需求 §8；提案影响面第 1 行 | spec | [inference] |
| L-05 | SUGGESTION | p2 | `REQ-024` §8 OQ-6 ↔ Delta R1「响应可用于引导用户进入安全学习页」 | Delta 要求拦截响应「可用于引导」，但提示文案与安全学习页路由未定，P4 前若不定会出现「后端给码值、前端无入口」 | P3 定路由（建议 `/credit/learning`）+ `tripMessages` 文案；E2E 断言码值到页面的完整跳转 | Delta R1 场景 1 | spec | [inference] |
| L-06 | SUGGESTION | p2 | Delta R6「既有五个展示面」↔ `openspec/specs/` | `openspec/specs/` 下没有 `user-credit`，五个展示面由未归档的 `add-credit-account`（其 r2 将展示面 1 → 5）提供；本 Delta 以「既有」引用，归档时可能指向不存在的基线 | 归档顺序 MUST 为 `add-credit-account` → `add-credit-recovery`；P5 归档说明引用本条 | `openspec/specs/` 目录清单；`registry.md` REQ-019 r2 记录 | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## 问题` | Pass | 现状三段（限制端不存在 / 恢复端为空 / 前置事件未落地），非空且带 grep 证据 |
| P2 `## 范围` | Pass | In scope 11 条 + Out of scope 7 条 |
| P3 Non-Goals | Pass | Out of scope 具体到能力与触点（扣分事件 / 管理后台 / 人工封禁 / 明细可见 / 通知） |
| P4 Impact self / upstream / downstream | Pass | 「## 影响面」覆盖后端 + 数据 + 契约 + 前端 + 文档；上游 `user-credit` 记账能力与被拦的发布行程入口 |
| S1 Spec structure | Pass | `## ADDED Requirements` + `### Requirement` + `#### Scenario`；首个 `##` 之前无正文；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | Pass | 提案 `@rule:` 均指向存在的规则锚点；Delta 无 `@knowledge:` 引用 |
| S3 Requirement → proposal | Pass | 7/7 ADDED Requirement 均可映射到提案 In scope，无孤儿 Requirement |
| S4 Given / When / Then | Pass | 29/29 Scenario 三要素齐备 |
| S5 Scenario 归属 | Pass | 每个 Scenario 都在某个 Requirement 之内 |
| C1 proposal → spec | Pass | In scope 11 条 → 7 Requirement 全覆盖；「其他功能不限制」以 R1 场景 4 显式承接 |
| C2 spec → tasks | N/A | 无 `tasks.md`（P3） |
| C6 引用可达 | Pass | 无 `@knowledge:` / `@rule:` 断链 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩范围：扣分事件、管理后台、人工封禁、明细可见均无 Requirement；D1–D7 全部落位 |
| p2-2 Delta 内部一致 | Pass | 「开始即计次」与「未完成提交不退还次数」在 L-01 收口后一致；恢复上限 60、`delta = 60 - score_before`、月度 2 次考试 / 1 次恢复、时区三条互不矛盾；R4（记账）与 R5（配额）职责分离 |
| p2-3 关键场景 / 约束有落点 | Pass | 27/27 映射见 `dov-ac-review.md`；Out of scope 在 `## 范围` 与本报告双处显式 |
| p2-4 tasks 方向校验 | N/A | 无 `tasks.md` |
| p2-5 不可追溯 Requirement | Pass | 无 |

## N/A / skipped

- `tasks.md` 相关（T1–T3、C2、p2-4）：P3 产出。
- `design.md` 相关（D1–D3）：P3 产出。
- Living Spec 基线保留检查：本 change 纯 ADDED，未覆盖既有 Requirement；但 `user-credit` Living Spec 尚不存在（`add-credit-account` 未归档），归档顺序约束见 L-06。

## 修复建议（按优先级）

1. **无 BLOCKER。**
2. **WARNING L-01 已在 P2 当场修正**（Delta R3 场景 3），修正后 `openspec validate add-credit-recovery --strict` 复跑仍为 valid。
3. SUGGESTION：L-02 已在 REQ-024 §5 改措辞；L-03 ~ L-06 全部带入 P3 `design.md` / `tasks.md`，不阻断 G1。

## Residual risks

- 契约 / 迁移号仍可能随合并顺序再顺延（`add-ai-itinerary` 已占 0.15.0 + V21，其后还有 `refine-detail-companions` 等并行线）；P3 必须排他确认并回写 `registry.md`。
- 恢复链路先于扣分链路交付，线上没有自然触发路径；演示须造分，`credit_ledger` 里会出现非产品事件产生的记录，P5 归档说明需提示「配额按账本派生」的口径依赖。
- 题库 20 题抽 10 的子集组合有限（C(20,10) 较大，但单题可被记忆传播），MVP 接受；若 P3 加题，R3 的「20 题」断言需同步改。
- 学习进度若不持久化，用户刷新页面即丢进度；P3 关 OQ-5 时需与 R3「保留学习进度」的断言对齐（当前 Delta 写「保留已产生的学习进度」，未限定跨请求）。

## Reviewer metadata

- 执行：Qoder（SDD P2 / consistency-lint，phase=p2）
- 人工签署：待 G1（IO + SA）
- 日期：2026-11-17

## Next

- `phase=p2` → G1 决策记录（`g1-decision.md`，Decision 待具名签署）
