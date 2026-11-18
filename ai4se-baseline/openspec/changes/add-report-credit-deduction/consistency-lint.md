# Consistency lint — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`｜ **Phase：** p2（Delta 收敛，G1 前）
- **Focus：** 全量 change（`proposal.md` + `specs/user-credit/spec.md` + `specs/admin-console/spec.md`）
- **Timestamp：** 2026-11-18
- **Artifact level：** 2（proposal + specs；`tasks.md` / `design.md` 尚未产出 → T / D / C2 为 N/A）
- **Roots：** `ai4se-baseline/openspec/changes/add-report-credit-deduction/`；活规格 `openspec/specs/`（`admin-console` / `user-credit` 尚未归档）

## Verdict

**Partial**｜BLOCKER 0 / WARNING 2 / SUGGESTION 2 / N/A 6

WARNING 均不阻塞 G1，但需在 P3 tasks / ATDD 中显式承接。

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority |
|---|---|---|---|---|---|---|---|
| W-1 | WARNING | p2 | `proposal.md` R-23；`specs/admin-console/spec.md` | 「用户管理页能力不变」没有独立 Delta 场景，只以「这些能力保留在用户管理页」一句承接；反向追溯（proposal → Delta）较弱 | P3 `tasks.md` 增加「用户管理页暂停 / 封禁 / 更新 / 恢复回归」任务，ATDD 加回归用例 | proposal §2 R-23；`admin-console` Requirement 第 2 段 | [fact] |
| W-2 | WARNING | p2 | `proposal.md` R-24 / R-25；`specs/admin-console/spec.md` | 401 `UNAUTHORIZED` / 403 `FORBIDDEN` / 404 `REPORT_NOT_FOUND` 未在本 Delta 重述，依赖基线 `admin-console` 权限与状态守卫 Requirement | P3 ATDD / 回归用例显式覆盖三种状态码，确认基线语义未因本次改造回退 | proposal §2 R-24 / R-25；`admin-console` Requirement 仅显式保留 409 | [inference] |
| S-1 | SUGGESTION | p2 | `specs/user-credit/spec.md`「七类固定扣分」 | 7 类固定扣分合写为一条场景，文字列举多组断言 | P3 参数化用例逐类断言 7 组映射 | 同场景 And 行 | [fact] |
| S-2 | SUGGESTION | p2 | `specs/user-credit/spec.md`「成立扣分并生成记录」 | 同时断言举报状态变为 `RESOLVED`，跨能力断言 | 状态断言放 `admin-console` / 集成用例，分数与账本断言放 `user-credit` | 同场景 Then 行 | [inference] |

## 检查表

### Proposal rules

| # | Result | Evidence |
|---|---|---|
| P1 `## Why` 非空 | Pass | `proposal.md` §Why：三条链路互不相连 |
| P2 `## What Changes` 非空 | Pass | §What Changes：9 条 In scope |
| P3 `## Out of Scope` 非空且具体 | Pass | §Out of Scope：7 条（原因枚举、明细页、处罚动作、月度上限、其他事件、历史补扣、第二套 UI） |
| P4 Impact 覆盖 self / upstream / downstream | Pass | §Impact 文件级清单 + §5 Affected capabilities（`credit-enforcement` / `trip-plans` / `user-credit` 依赖） |

**本回合修正：** 原「问题 / 范围 / 影响面」标题改为 `## Why` / `## What Changes` / `## Out of Scope` / `## Impact`，与既有 change 及 lint 规则一致；DoR 自检中的「§问题 / §范围」引用同步改为新标题。

### Spec rules

| # | Result | Evidence |
|---|---|---|
| S1 结构符合 OpenSpec schema | Pass | ADDED / MODIFIED + Requirement + Scenario；`validate --strict` valid |
| S2 引用前缀合法 | Pass | 两份 Delta 无 `@knowledge:` / `@rule:` 前缀引用 |
| S2b / S2c 路径与规则可达 | N/A | 无引用前缀 |
| S3 Requirement 追溯到 proposal What Changes | Pass | 3 + 1 Requirement 均落在 In scope 条目 |
| S4 Scenario 使用 Given / When / Then | Pass | 16 + 20 条全部具备三要素 |
| S5 Scenario 归属编号 Requirement | Pass | 无孤立场景 |

### Tasks / Design

| # | Result | Reason |
|---|---|---|
| T1–T3 | N/A | `tasks.md` 未产出（P3） |
| D1–D3 | N/A | `design.md` 未产出（P3） |
| C2 spec → tasks | N/A | 同上 |

### Cross-artifact

| # | Result | Evidence |
|---|---|---|
| C1 proposal → spec 覆盖 | Pass（带注记） | R-1 ~ R-22、R-26 有直接场景；R-23 ~ R-25 为显式 deferral（见 W-1 / W-2） |
| C6 `@rule:` 可达 | Pass | `spec-first` / `sdd-artifacts` / `api-contract` / `java-patterns` / `web-coding-style` / `tdd-cycle` / `prototype-ui-alignment` 均可在 `docs/knowledge/rules/*/rules.md` 解析 |
| 跨引用 / ID 指向存在章节 | Pass | 本回合修正 proposal DoR 的失效章节引用；Delta 内跨能力引用 `user-credit` 可解析 |
| 同一 Requirement 两处不兼容 | Pass | 本回合统一「驳回说明」措辞；「处理说明」定义一致 |
| AC 模糊不可测 | Pass | 无「运行正常 / 尽快」类表述 |

### phase=p2 检查

| # | Result | Evidence |
|---|---|---|
| 1 Proposal 范围 vs Delta 范围一致 | Pass | D1–D5 与 In / Out of scope 一一对应；无静默扩缩 |
| 2 Delta 能力内部一致 | Pass | 违规类型、扣分、账本、低分联动、表单解耦互不矛盾 |
| 3 Proposal 关键场景有落点或显式 deferral | Pass | 26 条 R 场景均有落点；R-23 ~ R-25 见 W-1 / W-2 |
| 4 tasks 不矛盾 | N/A | 无 tasks |
| 5 无法追溯的 Delta Requirement | Pass | 无 |
| 6 P/S/T/D + C1/C2/C6 | Pass（见上） | — |

## 本回合修正

1. `proposal.md` 核心标题改为 `Why` / `What Changes` / `Out of Scope` / `Impact`；状态行更新为 P2（`admin-console` 20 Scenario）。
2. `proposal.md` DoR 自检的章节引用同步修正。
3. `specs/admin-console/spec.md` 增加历史举报空值降级要求与「历史举报降级展示」场景（19 → 20）。
4. `specs/admin-console/spec.md`「举报不成立」输入措辞改为「驳回说明」。

## Residual risks

- `admin-console` 与 `user-credit` 均未归档：本 change 的 MODIFIED Delta 在归档阶段会被拒绝，归档 MUST 排在 `add-admin-console` 与 `add-credit-account` 之后。
- D1 替换 `add-admin-console` 的 2 条基线场景（成立并处罚 / 已受限处置），需 G1 由 SA 具名追认；不接受则回到 pre-spec 重新讨论举报页是否保留账号处罚。
- 历史举报 `violation_type` / `applied_deduction` 为空：P4 需按新增场景做空值渲染与接口兼容。
- 低分清退行为由既有 `credit-enforcement` 负责；合并 `origin/main@822471c` 后 `activateRestriction` 仍取消待处理申请、解除同行关系、取消未完成行程，本 change 只回归不加实现。

## Reviewer metadata

- Agent：Qoder（SDD P2 consistency-lint）
- Human sign-off：待 G1（IO = WAYNE；SA = Jacky / Karena）
- 日期：2026-11-18

## Next（非 Gate）

`/sdd:g1-decision-record` 或继续 `/sdd:p2`。W-1 / W-2 在 P3 tasks 承接后可视为关闭。
