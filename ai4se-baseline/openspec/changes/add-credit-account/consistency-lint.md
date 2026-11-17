# Consistency lint — add-credit-account

- **Change:** `add-credit-account`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-credit-account/` + `requirement-workspace/` REQ-019 相关条目）
- **Timestamp:** 2026-11-17T11:23+08:00
- **Artifact level:** 2（`proposal.md` + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec` CLI 可用；`openspec validate add-credit-account --strict` → `Change 'add-credit-account' is valid`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4 / N/A 6

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md` 影响面「迁移」行 ↔ `specs/user-credit/spec.md` | 提案用 `V*__add_credit_account.sql` 占位，Delta 不引用具体迁移号（设计上正确，但需 P3 收口） | P3 `design.md` 定迁移号与「建表 + 回填同一迁移」，`tasks.md` 把契约 / 迁移排在两端之前 | `db/migration` 头为 `V17__meeting_areas.sql`；REQ-016 / REQ-017 在途声明 V17 / V18 | spec | [fact] |
| L-02 | SUGGESTION | p2 | `specs/user-credit/spec.md` R4「分数与等级文字同时展示」 | 「含 `/ 100` 上限」是展示格式约定，未指定文案模板的落点 | P3 在 `tripMessages` 统一「信用分：{score} / 100」与等级映射，E2E 断言整串 | Delta R4 场景 4；`frontend/src/i18n/tripMessages.ts` | spec | [fact] |
| L-03 | SUGGESTION | p2 | `proposal.md` 验收信号 5 / 7 ↔ Delta R5 | 提案未把 D10 的五个码值写进验收信号，只写在影响面与决策 | P4 契约测试断言 `credit_level ∈ {excellent, good, fair, low, risk}`；E2E 断言中文展示串 | proposal 决策「等级契约取值（D10）」 | spec | [inference] |
| L-04 | SUGGESTION | p2 | `response/UserProfileResponse.java` 的跨 change 归属 | 本 change 与未归档的 `add-user-profile` / `add-user-profiles` 都改同一响应对象；Delta 之间无冲突，但实现合并有先后 | P3 `design.md` 记录合并顺序：后合者只追加字段、不改既有字段语义；回归跑 `profile` / `profiles` E2E | `openspec/changes/add-user-profile/`、`add-user-profiles/` | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 对应中文标题「## 问题」：现状空白 + 后续计分事件无处落，非空（项目既有约定，全部 change 一致） |
| P2 `## What Changes` | Pass | 对应「## 范围」In scope 8 条 + 「## 影响面」11 行 |
| P3 Non-Goals | Pass | 对应「## 范围」Out of scope 7 条，具体到能力与触点（管理后台 / 计分事件 / 明细页 / 他人主页外触点 / 通知 / 第二套组件库） |
| P4 Impact self / upstream / downstream | Pass | 「## 影响面」覆盖自身（后端 + 数据 + 契约 + 前端）、上游（注册链路、`user-profile` 响应）、下游（E2E / 知识库 / 阶段记录） |
| S1 Spec structure | Pass | `## ADDED Requirements` + `### Requirement` + `#### Scenario`；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | Pass | 提案引用 `@rule:` 均为存在的规则锚点；Delta 无 `@knowledge:` 引用 |
| S3 Requirement → proposal | Pass | 7/7 ADDED Requirement 均可映射到提案 In scope，无孤儿 Requirement |
| S4 Given / When / Then | Pass | 22/22 Scenario 三要素齐备 |
| S5 Scenario 归属 | Pass | 每个 Scenario 都在某个 Requirement 之内 |
| C1 proposal → spec | Pass | In scope 8 条 → 7 Requirement 全覆盖（管理端以 R7 边界承接） |
| C2 spec → tasks | N/A | 无 `tasks.md`（P3） |
| C6 引用可达 | Pass | 无 `@knowledge:` / `@rule:` 断链 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩范围：管理端、计分事件、明细页均无对应 Requirement；D1–D11 均已落位 |
| p2-2 Delta 内部一致 | Pass | 分数区间 0–100、五档阈值、裁断、等式、零变化记录互不矛盾；R2 与 R6 分工明确（守分数 / 守账本） |
| p2-3 关键场景 / 约束有落点 | Pass | 16/16 场景映射见 `dov-ac-review.md`；推迟项在 R7 + proposal Out of scope 双处显式 |
| p2-4 tasks 方向校验 | N/A | 无 `tasks.md` |
| p2-5 不可追溯 Requirement | Pass | 无 |

## N/A / skipped

- `tasks.md` 相关（T1–T3、C2、p2-4）：P3 产出。
- `design.md` 相关（D1–D3）：P3 产出。
- Living Spec 基线保留检查：本 change 纯 ADDED，未覆盖既有 Requirement（`user-auth` 按 D9 不动）。

## 修复建议（按优先级）

1. **无 BLOCKER。**
2. **无 WARNING。**
3. SUGGESTION：L-01 / L-02 / L-03 / L-04 均带入 P3 `design.md` 与 `tasks.md`，不阻断 G1。

## Residual risks

- 契约版本号（0.11.0 → ?）与迁移号（V17 之后）仍与在途 REQ-016 / REQ-017 存在撞号可能；P3 必须排他确认。
- D10 的英文码只在提案与本报告记录，尚未进入 `openapi.yaml`；P4 前若漏写 enum，会出现「后端返回中文、前端映射英文码」的错配。
- 管理端三条 AC 的推迟依赖 IO / SM 另行立需求；若被当作本 change 遗漏，归档说明需再次引用 D2。

## Reviewer metadata

- 执行：Qoder（SDD P2 / consistency-lint，phase=p2）
- 人工签署：待 G1（IO + SA）
- 日期：2026-11-17

## Next

- `phase=p2` → `/sdd:g1-decision-record`（需 IO + SA 具名签署）
