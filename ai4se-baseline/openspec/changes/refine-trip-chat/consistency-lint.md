# Consistency lint — refine-trip-chat

- **Change:** `refine-trip-chat`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-trip-chat/`）
- **Timestamp:** 2026-11-16T15:40+0800
- **Artifact level:** 2（proposal + 2 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate refine-trip-chat --strict` → `Change 'refine-trip-chat' is valid`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 6

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

跨 capability 检查：`trip-companions`（3 Requirement / 21 Scenario）与 `trip-plans`（3 Requirement / 22 Scenario）职责边界一致——聊天只读行程、集合字段由 `trip-plans` 单一写入；`left` 状态在两条能力间的口径一致（聊天准入包含、已匹配分组与统计排除）。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `specs/trip-plans/spec.md`「发布可被他人理解的旅行计划」 | Delta 新增「集合区域 ≤ 100 字」的显式约束，而活规格原文未写长度；契约 `meeting_area` 已是 `maxLength: 100`，属补记既有行为 | 保留；P3 `design.md` 注明该约束来自既有契约，不是新行为 | `openapi.yaml` `meeting_area`；`tripForm` 校验 | [fact] |
| L-02 | SUGGESTION | p2 | `specs/trip-companions/spec.md`「退出同行」 | 状态名在中文写「已退出」、提案写 `left`，契约枚举尚未登记；若 P3/P4 用 `LEFT`/`left` 混写会产生漂移 | P3 `design.md` 与 `openapi.yaml` 统一为小写 `left`，前端标签统一「已退出」 | 提案「关键裁定」；契约 `ApplicationStatusEnum` | [inference] |
| L-03 | SUGGESTION | p2 | `specs/trip-companions/spec.md`「匹配后的一对一文字沟通」 | 「会话列表」与「一对一沟通」写在同一条需求内，职责略有混合 | 保留（避免为一个页面入口新增 Requirement）；P3 在 `design.md` 说明列表与主区同属一个页面、共用同一权限判定 | Delta Spec；原型 `ui.js` `chat()` | [fact] |
| L-04 | SUGGESTION | p2 | `specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」 | 安全提示场景同时覆盖详情页与聊天页，现有 `SafetyNote` 组件与聊天安全条存在重复渲染风险 | P3 `design.md` 明确：详情页沿用 `SafetyNote`，聊天页使用集合安全条，二者不叠加 | 现有 `SafetyNote`、`ChatPage` 结构 | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 提案 §问题 四条，均可对到具体现状差距 |
| P2 `## What Changes` | Pass | §范围 In scope 8 条 |
| P3 Non-Goals | Pass | §范围 Out of scope 8 条，含实时推送、富媒体、完整行程编辑 |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖契约、迁移、后端、前端、原型、测试 |
| S1 Spec structure | Pass | 两个 delta 均使用 `## MODIFIED/ADDED Requirements` + `### Requirement` + `#### Scenario`；`--strict` 通过 |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | 提案的 `@rule:rule-precedence`、`@rule:prototype-ui-alignment`、`@rule:api-contract`、`@rule:pii-scrubbing` 均可解析 |
| S3 Requirement → proposal | Pass | 6 条需求与提案 In scope 一一对应 |
| S4 Given / When / Then | Pass | 43/43 场景齐全；`Enter 发送与 Shift+Enter 换行` 含两组 When/Then |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario |
| S6 MODIFIED 基线存在 | Pass | 5 个 MODIFIED Requirement 在 `openspec/specs/` 均有同名块 |
| S7 MODIFIED 未丢基线场景 | Pass | 聊天 4/4、退出 3/3、我的旅行 4/4、发布 7/7、详情 4/4 全部保留 |
| C1 proposal → spec | Pass | 见 `dov-ac-review.md` §3，25/25 |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径存在 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃 |
| p2-2 Delta 内部一致 | Pass | 准入（发布者 / 已接受 / 已退出）、只读（已结束）、编辑（招募中 / 已满员）三组口径互不矛盾 |
| p2-3 proposal 关键场景有落点 | Pass | REQ-010 §4 25 条 25/25 |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）
- `openspec validate --all --strict`（仓库内其他并行 change 存在历史告警，本报告只对 `refine-trip-chat` 单 change 负责）

## Fix suggestions by priority

1. **P3（should）**：L-02 在 `design.md` 与契约中统一 `left` 枚举与「已退出」标签。
2. **P3（should）**：L-04 在 `design.md` 指明详情页 `SafetyNote` 与聊天安全条的分工。
3. **P3（nice）**：L-01 / L-03 以一行说明记录在 `design.md`，无需改动规格。

## Residual risks

| 风险 | 说明 |
|---|---|
| MODIFIED 合并被简化 | 归档合并时需人工核对：5 个 Requirement 的场景数不低于基线（4/3/4/7/4） |
| 双 capability | 本 change 跨两个能力，归档前需 SA 具名追认 |
| 本报告不覆盖代码质量 | P2 只校验规格一致性；实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: Qoder（AI agent）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-16
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `/sdd:g1-decision-record`。
- 4 条 SUGGESTION 不阻塞 G1，分别落入 P3 `design.md` 与归档前核对。
