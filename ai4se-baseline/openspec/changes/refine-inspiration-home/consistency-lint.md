# Consistency lint — refine-inspiration-home

- **Change:** `refine-inspiration-home`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-inspiration-home/`）
- **Timestamp:** 2026-11-16T09:57+08:00
- **Artifact level:** 2（proposal + 2 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 不可用 → 手工 checklist；整体结论上限为 **Partial**

## Verdict

**Partial** — BLOCKER 0 / WARNING 2 / SUGGESTION 3 / N/A 8

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | Yes (L-01, L-02) |
| Manual run cap | Partial |

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | WARNING | p2 | `proposal.md` §决策「变更粒度」；`specs/trip-plans/spec.md` + `specs/trip-experiences/spec.md` | 一个 change 修改两个 capability，与 `@rule:sdd-artifacts`「一个 change 只改一个 capability；跨能力就拆成两个 change」存在张力；该规则的阻断点是「归档前」而非 G1 | 归档前由 SA 追认「同一页面垂直切片的双 capability 例外」并写入 `summary.md`，或按 capability 拆分 change；G1 阶段不阻塞 | `docs/knowledge/rules/documentation/rules.md`（`sdd-artifacts` 检查项：一个 change 是否只改一个 capability / 归档前） | rule | [fact] |
| L-02 | WARNING | p2 | `specs/trip-plans/spec.md` Requirement「浏览未结束的旅行计划」及其 Scenario「已结束与已取消行程不出现在默认视图」 | 规格要求「已取消」行程不出现，但 `TripStatus` 与 `openapi.yaml` 的枚举只有 `recruiting / full / completed`，系统无法产生「已取消」行程；该条款不可观测，且属既有 Living Spec / 契约文档漂移 | 归档合并时统一为「已结束」或明确说明不存在取消态；本 change 不新增状态机、不改数据模型 | `frontend/src/types.ts`（`TripStatus`）、`openapi.yaml`（`status.enum`）、`openspec/specs/trip-plans/spec.md` | spec + code | [fact] |
| L-03 | SUGGESTION | p2 | `specs/trip-experiences/spec.md` Requirement「灵感首页的旅行体验视图」 | Requirement 正文未提「展示体验数量」，但 Scenario「切换到旅行体验视图」断言了数量；归档合并后正文与场景的信息量不一致 | 归档合并时把「展示体验数量」补入 Requirement 正文，或把该断言降为可选增强 | `specs/trip-experiences/spec.md` | spec | [fact] |
| L-04 | SUGGESTION | p2 | `e2e/tests/experiences.spec.ts` vs `frontend/src/experiences/ExperienceCard.tsx` | E2E 选择器 `.experience-card` 与组件类名 `.exp-card` 不一致；当前体验视图 E2E 无法命中卡片，与 proposal §验收信号 7「相关 E2E 通过」冲突 | P3 / apply 修复选择器（或给组件补语义类名），并纳入任务清单 | `e2e/tests/experiences.spec.ts`、`frontend/src/experiences/ExperienceCard.tsx`、`frontend/src/styles.css` | code | [fact] |
| L-05 | SUGGESTION | p2 | `specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md` | 「至少一种非颜色信号」只给示例，未固定具体信号；若直接按颜色深浅实现，仍会落在「只靠颜色」的边界 | P3 `design.md` / ATDD design 固定一种 DOM 可断言信号，并在 E2E 断言中体现 | `specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md` | proposal | [inference] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` / P2 `## What Changes` / P3 Non-Goals / P4 Impact | Pass | 提案使用中文等价小节（§问题 / §范围 / §影响面），语义完整；影响面覆盖自身、上游（Living Spec）与下游（测试 / E2E） |
| S1 Spec structure | Partial | `## MODIFIED Requirements` + `### Requirement` + `#### Scenario` 符合既有 Delta 结构；`openspec validate --strict` 因 CLI 缺失未运行 |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | `@rule:web-coding-style`、`@rule:sdd-artifacts` 均可解析；无未知前缀 |
| S3 Requirement → proposal | Pass | 两条 Requirement 均来自 proposal §范围 |
| S4 Given / When / Then | Pass | 15/15 Scenario 三要素齐全 |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario |
| C1 proposal → spec | Pass | proposal In scope 8 项均有 Requirement / Scenario 落点 |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则路径可解析 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃 |
| p2-2 Delta 内部一致 | Pass | 默认视图、状态表达、空 / 加载态在两条 Delta 中口径一致 |
| p2-3 proposal 关键场景有落点 | Pass | 见 `dov-ac-review.md` §需求映射，10/10 |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- `openspec validate --strict`（CLI 不可用）
- T1 / T2 / T3（无 `tasks.md`）
- D1 / D2 / D3（无 `design.md`）
- C2（无 `tasks.md`）
- p2-4（无 `tasks.md`）

## Fix suggestions by priority

1. **归档前（must）**：SA 对 L-01 的双 capability 例外作出追认或拆分决定，并写入 `summary.md`。
2. **归档合并时（should）**：收敛 L-02 的「已取消」表述；补齐 L-03 的数量口径。
3. **P3 / apply（should）**：修复 L-04 的 E2E 选择器；按 L-05 在设计阶段固定非颜色信号。

## Residual risks

| 风险 | 说明 |
|---|---|
| 手工 lint 未覆盖 OpenSpec schema 的机器校验 | 归档前若安装 CLI，应补跑 `openspec validate --strict` |
| L-01 若 SA 不追认例外 | 归档时需拆成两个 change，`dov-ac-review.md` 的页面级验收口径需重写 |
| L-02 契约与枚举漂移可能扩散到其他 capability | 建议作为独立的文档修正 change，不在本 change 内改状态机 |
| L-04 说明既有 E2E 可能长期未运行或已被选择器漂移掩盖 | P3 首次回归时需确认体验视图 E2E 的真实基线 |

## Reviewer metadata

- Reviewer: opencode（AI agent）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-16
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `/sdd:g1-decision-record`（先处理 L-01 / L-02 的归档前归属），或继续 `/sdd:p2`。
- L-01 / L-02 均不阻塞 G1 的验收口径；应在 G3 / 归档前关闭。