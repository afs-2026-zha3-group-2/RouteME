# Consistency lint — refine-service-close

- **Change:** `refine-service-close`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-service-close/` + `requirement-workspace/` REQ-028 相关条目）
- **Timestamp:** 2026-11-18T10:35+08:00
- **Artifact level:** 2（`proposal.md` + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec validate refine-service-close --strict` → `Change 'refine-service-close' is valid`

## Verdict

**Pass** — BLOCKER 0 / WARNING 1（已收口）/ SUGGESTION 5 / N/A 6

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 未收口 WARNING | No（L-01 当场修正 Delta 结构） |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | WARNING（已收口） | p2 | Delta 文件首段（`## ADDED Requirements` 之前） | 取代声明写在第一个 `##` 之前，OpenSpec 警告「Text above the first section is not carried into the main spec by archive」；归档时会丢失 | 已删除 Delta 首段说明，取代声明保留在 `proposal.md`「与既有规格的关系」；`validate --strict` 复跑 valid | Delta 文件头；`openspec validate` 输出 | spec | [fact] |
| L-02 | SUGGESTION | p2 | Ready §4（36 条）↔ Delta（30 Scenario） | 两层编号不等长（A-2+A-4、G-3+G-5 合并，D-3 / D-4 / D-5 拆并），逐条对号容易误读为「场景丢失」 | 已在 `dov-ac-review.md` 给出 36 → 30 逐条映射；P3 起引用统一用「Requirement + Scenario 名」 | 两份文件实际条数 | spec | [fact] |
| L-03 | SUGGESTION | p2 | Delta `customer-service` ↔ `openspec/specs/` | `customer-service` 尚未进入 Living Spec；本 Delta 为 ADDED，归档时若 `add-admin-console` 的旧 Requirement 先落地，语义可能被覆盖 | 归档顺序 MUST 为 `add-admin-console` → `refine-service-close`；P5 归档时把取代关系写入 Living Spec | `openspec/specs/` 目录；`add-admin-console/specs/customer-service/spec.md` | spec | [fact] |
| L-04 | SUGGESTION | p2 | Ready §8 OQ-4 / OQ-6 ↔ Delta 场景 | 结束确认文案与 `RESOLVED` 在队列中的排序位置未定；P4 前若不定会出现「行为对、文案或排序不一致」 | P3 `design.md` 定稿文案与排序（建议 `RESOLVED` 与 `CLOSED` 同组倒序） | Ready §8；Delta「管理端筛选与待确认可见」 | spec | [inference] |
| L-05 | SUGGESTION | p2 | Ready §5「契约与迁移排他」↔ `handoff.md` | 契约 0.25.0 + V30 为暂定；并行 change 可能占用 | P3 设计先查 `origin/main` 最大迁移号与 `openapi.yaml` 版本，再回写 registry | `openapi.yaml` 0.24.0；migration 最大号 V29 | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 现状三段（结束权在管理端 / 等待期无法退出 / 管理端体验不一致），带代码证据 |
| P2 `## What Changes` / `## Out of Scope` | Pass | In 7 条 + Out 6 条 |
| P3 Non-Goals | Pass | 评价、超时、历史列表、系统消息、issue 缺陷独立修复、接待策略均显式排除 |
| P4 Impact self / upstream / downstream | Pass | 覆盖后端、数据、契约、前端、测试、文档；上游 `user-support` / `user-auth` / `trip-companions` |
| S1 Spec structure | Pass | `## ADDED Requirements` + `### Requirement` + `#### Scenario`；首段无正文；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | Pass | proposal 的 `@rule:` 均沿用既有规则；Delta 无 `@knowledge:` 引用 |
| S3 Requirement → proposal | Pass | 3/3 ADDED Requirement 可映射到 proposal §What Changes，无孤儿 Requirement |
| S4 Given / When / Then | Pass | 30/30 Scenario 三要素齐备 |
| S5 Scenario 归属 | Pass | 每个 Scenario 都在某个 Requirement 之内 |
| C1 proposal → spec | Pass | 用户结束、客服标记、待确认回迁、管理端下线、用户端展示、数据 / 契约、规格承载 7 条全部有承接 |
| C2 spec → tasks | N/A | 无 `tasks.md`（P3） |
| C6 引用可达 | Pass | 无 `@knowledge:` / `@rule:` 断链 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩范围；Out of Scope 6 条无对应 Requirement |
| p2-2 Delta 内部一致 | Pass | 四态闭集；`RESOLVED → HANDLING` 清空 `resolved_*`；`closed_by` 只记用户；不自动关闭；三处彼此不矛盾 |
| p2-3 关键场景 / 约束有落点 | Pass | 36/36 映射见 `dov-ac-review.md`；Out of Scope 在 proposal 与本报告双处显式 |
| p2-4 tasks 方向校验 | N/A | 无 `tasks.md` |
| p2-5 不可追溯 Requirement | Pass | 无 |

## N/A / skipped

- `tasks.md` 相关（T1–T3、C2、p2-4）：P3 产出。
- `design.md` 相关（D1–D3）：P3 产出。
- Living Spec 基线保留检查：本 change 纯 ADDED，不覆盖已归档 Requirement；但 `customer-service` Living Spec 尚不存在，归档顺序约束见 L-03。

## 修复建议（按优先级）

1. **无 BLOCKER。**
2. **WARNING L-01 已在 P2 当场修正**（删除 Delta 首段说明），修正后 `openspec validate refine-service-close --strict` 复跑仍为 valid。
3. SUGGESTION：L-02 已在 `dov-ac-review.md` 收口映射；L-03 ~ L-05 带入 P3 `design.md` / `tasks.md`，不阻断 G1。

## Residual risks

- 契约 / 迁移号可能随合并顺序顺延；P3 必须排他确认并回写 `registry.md`。
- `customer-service` 的 Living Spec 由 `add-admin-console` 首先建立；本 change 的取代声明必须以 P5 归档时的 Requirement 正文为准，不能只留在 proposal。
- 「待用户确认不自动关闭」会让会话长期停留；这是用户裁决 D6 的接受结果，不设监控指标。
