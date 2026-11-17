# Consistency lint — add-trip-cancel

- **Change:** `add-trip-cancel`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-trip-cancel/`）
- **Timestamp:** 2026-11-17T12:20+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate add-trip-cancel --strict` → valid

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 5 / N/A 4

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

初版检查后已收口两处：`dov-ac-review.md` 补充「待处理申请者在『我申请的』看到申请已取消」的可观察断言（all-specs-review S-01 同源）；Delta R1 把「记录说明」限定为仅 `other` 原因（S-02）。剩余 5 条均为 P3 / P5 / G1 的提示性建议，不阻塞 G1。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | 根 `AGENTS.md` §UI design；`docs/knowledge/rules/quality/rules.md` | 宿主投影引用 `prototype-ui-alignment`，但权威区没有同名二级标题锚点（预存差异，非本 change 引入）；本 change 的 proposal / 评审均以普通路径与 `AGENTS.md` 引用，未写 `@rule:` | 由 rules-govern 另立变更处理锚点漂移；本 change 不修 | `.qoder/rules/project-rules.md` vs `docs/knowledge/rules/quality/rules.md` 二级标题清单 | AI-inference | [fact] |
| L-02 | SUGGESTION | p2 | Delta R3；`openspec/specs/trip-plans/spec.md`「浏览未结束的旅行计划」 | 「已取消不出现在默认列表」在 `trip-plans` 已存在，本 change 在新能力中再次声明，存在双权威风险 | 明确列表过滤口径归 `trip-plans`；`trip-cancellation` 只声明取消动作与联动结果；P5 归档时核对两处措辞一致 | `openspec/specs/trip-plans/spec.md:38-52` | spec | [fact] |
| L-03 | SUGGESTION | p2 | Delta R5；`TripPlanMapper.xml#selectExpiredIds`、`TripPlanServiceImpl.materializeIfExpired` | 到期物化只判断 `completed_at` 与结束日期；已取消行程若未排除，越过结束日期会被写入 `completed_at` 并发布结束事件，污染终态数据 | P3 设计排除 `cancelled_at` 非空；P4 补「取消行程越过结束日期后 `completed_at` 仍为空」回归 | `TripPlanMapper.xml:62-67`；`TripPlanServiceImpl:145-171` | code | [fact] |
| L-04 | SUGGESTION | p2 | `proposal.md` 残余风险；REQ-021 §3 Out of scope；#28 正文 | #28 的 5 条信用相关 AC 被 D1 排除，但 issue 仍开放；读者对照 issue 可能误判漏做 | G1 由 IO 确认 D1 范围；P5 `summary.md` 记录信用分另立 story；后续需求单独承接 | 用户 2026-11-17 裁决 D1；issue #28 | proposal | [fact] |
| L-05 | SUGGESTION | p2 | `proposal.md` 归档顺序；`deep-dive.md` ① | 契约 0.13.0 + V19 为暂定；`add-ai-itinerary` 计划 0.12.0 + V18，并行 `add-experience-photos` 亦待排号 | P3 定稿前复核实际号段；若被占用则顺延，并同步 `OpenApiTest` 版本断言 | `requirement-workspace/registry.md` REQ-017 / REQ-021 行 | config | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | `proposal.md` §Why：无取消态、假结束、申请悬空、列表/聊天/统计缺口 |
| P2 `## What Changes` | Pass | §What Changes 4 组 + §范围 In scope 10 项 |
| P3 Non-Goals | Pass | §Out of scope 6 项（信用分、删除/恢复、推送、原因公开、体验/退款、改写既有块） |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖后端状态/迁移/端点、申请、聊天、统计、前端三页、原型、契约、测试；上游 `trip-plans` / `trip-companions` 只读 |
| S1 Spec structure | Pass | `## ADDED Requirements` + `### Requirement` + `#### Scenario`；`openspec validate --strict` valid |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | 只保留权威区可解析的 `@rule:`（api-contract / package-structure / java-patterns / web-coding-style / sdd-artifacts）；`prototype-ui-alignment` 用普通路径 |
| S3 Requirement → proposal | Pass | 5 个 Requirement 与 proposal §范围 1:1；“trip-cancellation” 名真实 |
| S4 Given / When / Then | Pass | 20/20 Scenario 均具备 Given / When / Then（个别场景含多分支，沿用项目既有写法） |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario；20 个场景分挂 5 个 Requirement |
| S6 MODIFIED 基线存在 | N/A | 只有 ADDED，无 MODIFIED |
| S7 MODIFIED 未丢基线场景 | N/A | 同上 |
| C1 proposal → spec | Pass | In scope 10 项均有 Scenario 落点（见 `dov-ac-review.md` §Proposal → Delta 覆盖） |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径均存在；无不可达 `@rule:` |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃；信用分显式 out |
| p2-2 Delta 内部一致 | Pass | 「取消 → 关闭申请 / 只读聊天 / 保留历史 / 统计排除」与「禁止结束 / 再次取消 / 编辑 / 体验」互不矛盾 |
| p2-3 proposal 关键场景有落点 | Pass | REQ-021 20/20；#28 in-scope AC 10/10 |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- S6 / S7（无 MODIFIED / REMOVED）
- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）

## Fix suggestions by priority

1. **P3（should）：** 按 L-03 排除到期物化的取消行程，并补回归用例。
2. **P3（should）：** 原型先行（我的旅行入口、原因选择、取消态样式），再改实现。
3. **P3（should）：** 复核契约 / 迁移号段（L-05），定稿原因裁剪边界。
4. **G1（should）：** 由 IO 确认信用分排除（L-04）仍有效。
5. **P5 / rules-govern（later）：** 收敛列表口径双权威（L-02）与规则锚点漂移（L-01）。

## Residual risks

| 风险 | 说明 |
|---|---|
| 列表口径双权威 | `trip-plans` 与 `trip-cancellation` 都描述「已取消不出现在默认列表」；若措辞分叉，归档后可能出现两个判据 |
| 到期物化污染终态 | 取消行程若未排除，越过结束日期会写入 `completed_at`；状态推导仍显示已取消，但数据不一致 |
| 信用分 AC 缺口 | #28 的 5 条信用 AC 不在本 change；需后续 story 承接 |
| 本报告不覆盖代码质量 | P2 只校验规格一致性；实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: Qoder（AI agent）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-17
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `/sdd:g1-decision-record`（需 IO WAYNE + SA Jacky / Karena 具名签署）。
- 5 条 SUGGESTION 不阻塞 G1，分别落入 P3 设计/任务、P4 测试、P5 summary 与 rules-govern。
