# Consistency lint — add-user-logout

- **Change:** `add-user-logout`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-user-logout/`）
- **Timestamp:** 2026-11-16T10:55+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1 可用；`openspec validate add-user-logout --strict` → valid

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 3 / N/A 5

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

初版 lint 的 L-01（同一 `user-auth` capability 两处退出权威描述）已随 `add-user-auth` 归档并改用 MODIFIED 而消解：`openspec/specs/user-auth/spec.md` 成为唯一基线，本 change 替换其 Requirement 块并原样保留既有 3 个场景，不存在并行退出需求。剩余 3 条均为归档 / P3 的提示性建议，不阻塞 G1。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `../add-user-auth/tasks.md` T6、`design.md` 第 74 行、`summary.md` 第 12 行 | 该 change 写有「演示身份不显示退出」，与本 Delta Spec 的场景「退出入口对所有身份可见」相反；该 change 的正文是历史快照，不应改写，但后续读者可能误读为仍然有效 | 在 `summary.md`（P5）/ G3 记录中注明该表述已被本 change 取代；`tasks.md`（P3）不加改写该 change 正文的任务 | 三处原文；`specs/user-auth/spec.md` 场景 5 | spec | [fact] |
| L-02 | SUGGESTION | p2 | `specs/user-auth/spec.md` Requirement 标题「会话校验与退出」 | Requirement 名同时覆盖会话校验与退出两个关注点，10 个场景中 3 个属校验、7 个属退出；名称本身不是歧义，但读者可能期待「退出」独立成条 | `design.md`（P3）声明：能力名保持「会话校验与退出」（对齐 Living Spec），退出行为由后 7 个场景定义；不新增平行 Requirement | Delta Spec；`openspec/specs/user-auth/spec.md` 同名 Requirement | spec | [fact] |
| L-03 | SUGGESTION | p2 | `proposal.md` §残余风险；Living Spec 合并 | MODIFIED 会整体替换 Living Spec 的 Requirement 块；当前 delta 已保留 3 个基线场景，但归档合并时仍需人工核对合并结果，避免正文语义被无意收窄 | G3 / living-merge 前检查合并后仍有 10 个场景且会话语义完整；把该检查写入 `tasks.md`（P3）收口任务 | Delta Spec 第 7 行 vs `openspec/specs/user-auth/spec.md` 第 55 行 | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | `proposal.md` §问题，说明演示身份无出口的断点 |
| P2 `## What Changes` | Pass | §范围 In scope 7 条 |
| P3 Non-Goals | Pass | §范围 Out of scope 4 条，具体（不新增端点 / 不自助注销 / 不改演示身份数量） |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖前端菜单与 `App`、`user-auth` 基线、契约消费与测试触点 |
| S1 Spec structure | Pass | `## MODIFIED Requirements` + `### Requirement` + `#### Scenario`；`openspec validate add-user-logout --strict` valid |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | `proposal.md` 的 `@rule:web-coding-style` / `@rule:sdd-artifacts` / `@rule:security-baseline` 均可解析；Delta Spec 无未知引用 |
| S3 Requirement → proposal | Pass | MODIFIED Requirement 的职责与 proposal §范围第 1–6 条一致 |
| S4 Given / When / Then | Pass | 10/10 Scenario 三要素齐全（2 个纯 When/Then 场景为会话校验既有写法） |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario；3 个基线场景 + 7 个退出场景均挂在同一 Requirement 下 |
| S6 MODIFIED 基线存在 | Pass | `openspec/specs/user-auth/spec.md` 存在同名 Requirement；delta 未改 Requirement 名，校验通过 |
| S7 MODIFIED 未丢基线场景 | Pass | 3 个既有场景全部保留（有效 token / 无效或过期 / 退出登录），「退出登录」仅补充断言 |
| C1 proposal → spec | Pass | In scope 7 项均有 Scenario 落点（见 `dov-ac-review.md` §Proposal → Delta 覆盖） |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径均存在 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃 |
| p2-2 Delta 内部一致 | Pass | 「已进入 → 退出 → 身份门 → 重新进入」状态链在 10 个场景中一致 |
| p2-3 proposal 关键场景有落点 | Pass | REQ-006 §4 九条场景 9/9（见 `dov-ac-review.md` §Requirement mapping） |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）
- `openspec validate --all --strict`（当前仅 `add-trip-publish` 因 `trip-plans` MODIFIED 场景遗漏失败，属并发进行的其他 change；`refine-inspiration-home` 在本轮归档后已通过；单 change 校验已通过）

## Fix suggestions by priority

1. **P3（should）**：按 L-02 在 `design.md` 声明能力名与退出场景的关系。
2. **P3（should）**：把 L-03 的「合并后 10 场景 + 会话语义完整」检查写入 `tasks.md` 收口任务。
3. **P5 / G3（should）**：按 L-01 在 `summary.md` / G3 记录归档 T6 / design / summary 的旧表述已被取代。

## Residual risks

| 风险 | 说明 |
|---|---|
| 读者只翻归档记录 | 归档 T6 / design / summary 仍写「演示身份不显示退出」；靠 G3 记录与当前 Living Spec 消除歧义 |
| MODIFIED 合并被简化 | 若归档工具只处理新增场景而忽略正文替换，会话语义可能回退；L-03 的检查用于兜底 |
| 本报告不覆盖代码质量 | P2 只校验规格一致性；实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: opencode（AI agent）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-16
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `/sdd:g1-decision-record`。
- 3 条 SUGGESTION 不阻塞 G1，分别落入 P3 `design.md` / `tasks.md` 与 P5 `summary.md`。