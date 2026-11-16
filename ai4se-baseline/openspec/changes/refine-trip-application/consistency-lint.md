# Consistency lint — refine-trip-application

- **Change:** `refine-trip-application`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-trip-application/`）
- **Timestamp:** 2026-11-16T12:05+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1 可用；`openspec validate refine-trip-application --strict` → valid

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 5

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

初版检查发现 proposal / 增量在「满员 / 结束」错误码上可能被读成只返回 `TRIP_NOT_OPEN`，已在 Delta 场景 6 与 proposal 验收信号 5 补上「已有有效申请时按 `DUPLICATE_APPLICATION` 拒绝」的分支；proposal 影响面补充 `trip-plans` 只读上游行；registry 状态与 P1 实际结论对齐。剩余 4 条均为 G1 / P3 / P5 的提示性建议，不阻塞 G1。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md` 头部规则行；`REQ-010` §5；本分支 `docs/knowledge/rules/quality/rules.md` | Qoder 宿主规则投影引用 `prototype-ui-alignment` 与 `rule-precedence`，但本分支权威区没有这两个二级标题锚点（预存差异，非本 change 引入）；若保留 `@rule:` 写法会成为断链 | 本 change 已改为「原型路径 + 宿主投影名」与「以用户当次指示为准」，不写 `@rule:prototype-ui-alignment` / `@rule:rule-precedence`；是否把两条规则补进权威区由 rules-govern 另行处理 | `.qoder/rules/project-rules.md`（未跟踪宿主投影）vs `docs/knowledge/rules/quality/rules.md` / `process/rules.md` 的二级标题清单 | AI-inference | [fact] |
| L-02 | SUGGESTION | p2 | `specs/trip-companions/spec.md`（MODIFIED） | MODIFIED 会整体替换 Living Spec 的「提交与取消同行申请」块；当前已保留 5 个基线场景，但归档合并仍需人工核对 | 在 P3 `tasks.md` 增加一条收口任务：合并后 Living Spec 仍有 8 个场景、原 5 个场景语义完整；G3 前复核 | Delta 5 个基线场景 vs `openspec/specs/trip-companions/spec.md` 第 37–67 行 | spec | [fact] |
| L-03 | SUGGESTION | p2 | `dov-ac-review.md` §规格解释裁决 4；`specs/trip-companions/spec.md` 场景 6 | 后端检查顺序为「本人 → 重复 → 非 recruiting」，满员时若已有有效申请会先返回 `DUPLICATE_APPLICATION`；若 E2E 只断言 `TRIP_NOT_OPEN` 会漏测错误码优先级 | P3 / P4 的测试矩阵同时覆盖：满员无申请 → `TRIP_NOT_OPEN`；满员且已有 pending → `DUPLICATE_APPLICATION`；两者都不新增申请 | `ApplicationServiceImpl.apply` 第 59–67 行 | code | [fact] |
| L-04 | SUGGESTION | p2 | `requirement-workspace/requirements/REQ-010-trip-application-entry.md` §9 D2；S08 原型故事 | S08 字面 AC 写「提交后按钮变为已申请，待处理」，用户裁决 D2 改为原型的等待提示 + 撤回；读者对照原型故事时可能误判为漏实现 | G1 时由 IO 确认 D2 覆盖仍有效；P5 `summary.md` 记录该 AC 的最终口径 | 用户 2026-11-16 裁决；`docs/prototype/stories.html` S08；`docs/prototype/ui.js` `actionBox` | proposal | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | `proposal.md` §问题，说明弹窗 / 错误码 / 状态 Tag 与原型脱节（项目既有提案体例，按 `add-user-logout` 同口径判定） |
| P2 `## What Changes` | Pass | §范围 In scope 8 条 |
| P3 Non-Goals | Pass | §范围 Out of scope 6 条，具体（不自动加入、不改必填、不加卡片入口、不做通知） |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖详情页 / 文案 / 样式 / 测试、`trip-plans` 只读上游、`trip-companions` 与 Living Spec、后端 / 契约 / 迁移不变 |
| S1 Spec structure | Pass | `## MODIFIED Requirements` + `### Requirement` + `#### Scenario`；`openspec validate --strict` valid |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | 移除不可达的 `@rule:prototype-ui-alignment` / `@rule:rule-precedence` 后，仅保留 `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:git-commit-conventions`，均可在权威区解析 |
| S3 Requirement → proposal | Pass | MODIFIED Requirement 的职责与 proposal §范围第 1–7 条一致 |
| S4 Given / When / Then | Pass | 8/8 Scenario 均具备 Given / When / Then（部分场景含多个 Then / And，符合既有写法） |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario；8 个场景全部挂在「提交与取消同行申请」下 |
| S6 MODIFIED 基线存在 | Pass | `openspec/specs/trip-companions/spec.md` 存在同名 Requirement；delta 未改 Requirement 名 |
| S7 MODIFIED 未丢基线场景 | Pass | 5 个既有场景全部保留（提交待处理 / 本人 / 重复 / 满员结束 / 取消），仅补充入口、文案与恢复表单断言 |
| C1 proposal → spec | Pass | In scope 8 项均有 Scenario 落点（见 `dov-ac-review.md` §Proposal → Delta 覆盖） |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径均存在；不可达引用已移除 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃 |
| p2-2 Delta 内部一致 | Pass | 「可申请 → 提交 → 待处理 → 撤回 → 可申请」与「本人 / 重复 / 满员 / 结束 / 页面停留期间」分支互不矛盾 |
| p2-3 proposal 关键场景有落点 | Pass | REQ-010 §4 八条场景 8/8（见 `dov-ac-review.md` §Requirement mapping） |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）

## Fix suggestions by priority

1. **P3（should）：** 按 L-02 在 `tasks.md` 增加 Living Spec 合并收口任务（8 场景 + 5 基线语义）。
2. **P3 / P4（should）：** 按 L-03 在测试矩阵覆盖 `TRIP_NOT_OPEN` 与 `DUPLICATE_APPLICATION` 两种拒绝分支。
3. **G1（should）：** 按 L-04 由 IO 确认 D2 覆盖 S08 字面 AC 仍有效。
4. **Rules-govern（later）：** 按 L-01 评估是否把 `prototype-ui-alignment` / `rule-precedence` 补进权威区，消除宿主投影与权威区的漂移。

## Residual risks

| 风险 | 说明 |
|---|---|
| 宿主规则投影与权威区漂移 | 本分支权威区缺少两条 Qoder 投影规则；本 change 已避免 `@rule:` 断链，但其他文档仍可能引用不存在的锚点 |
| MODIFIED 合并被简化 | 若归档工具只处理新增场景而忽略正文替换，基线 5 个场景可能回退；L-02 的收口任务用于兜底 |
| S08 字面 AC 与 D2 的差异 | 以用户 D2 为准；G1 由 IO 具名确认，P5 `summary.md` 记录最终口径 |
| 本报告不覆盖代码质量 | P2 只校验规格一致性；实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: Qoder（AI agent）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-16
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `/sdd:g1-decision-record`（需 IO WAYNE + SA Jacky / Karena 具名签署）。
- 4 条 SUGGESTION 不阻塞 G1，分别落入 P3 `tasks.md` / P4 测试矩阵 / G1 / rules-govern。
