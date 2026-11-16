# Consistency lint — refine-safety-report

- **Change:** `refine-safety-report`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-safety-report/`）
- **Timestamp:** 2026-11-16T16:25+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1 可用；`openspec validate refine-safety-report --strict` → valid；`openspec show refine-safety-report --json --deltas-only` → `deltaCount: 1`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 5（3 条已在 P2 收口，2 条留待 P3 / P5）/ N/A 7

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

初版检查发现 proposal 缺 `## Why` / `## What Changes`（`openspec show` 报 `Change must have a Why section`，`validate --strict` 不拦），已在 P2 补齐并按 `@rule:artifact-review-gate` 复用 P1 的 `Pass` 评审报告（追加「变更摘要」）。补齐后 P1–P4 全通过。剩余 5 条里，L-01 / L-02 / L-04 属提案措辞与事实记录错误，已在 P2 直接改正（不改变范围、决策与验收信号）；L-03（`## Why` 与「问题」重复）留待归档时收敛，L-05（`received=true` 可观察项）留待 P3 落进 `atdd-design.md`。均不阻塞 G1。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md`「范围 / In scope」第 7 条、「影响面」Living Spec 行 | 两处都只写「保留『我的旅行』既有两个场景」，未说明另外 2 个基线场景（「安全提示常驻」「提交举报并收到回执」）同样保留、但内容收敛。归档时易被读成「只替换安全部分、我的旅行原样不动」，误判替换范围 | 改为「保留 Living Spec 的 4 个既有场景名：2 个『我的旅行』场景原样保留，『安全提示常驻』与『提交举报并收到回执』内容收敛」 | Delta 实际 9 Scenario = 4 基线名 + 5 新增；`openspec/specs/trip-companions/spec.md:148-165` | proposal | [fact] |
| L-02 | SUGGESTION | p2 | `proposal.md`「残余风险」集合区域行 | 该行标题写「统一回退文案」，正文却列出两套不同字面量（详情「尚未填写，出发前请在聊天中确认」／聊天「待确认」），字面上自相矛盾；「决策」表也没有这一行，读者无法判断是「统一」还是「按页面分别定义」 | 改为「按页面语境分别定义两套回退文案（详情 / 聊天），统一放 `tripMessages` 单一来源」，并在「决策」表补一行；与 Delta「安全提示常驻」「聊天页展示安全提示」的 Given/Then 对齐 | `proposal.md`「残余风险」表第 3 行；Delta 场景 3 / 4 的回退字面量；P1 评审 P-03 | proposal | [fact] |
| L-03 | SUGGESTION | p2 | `proposal.md` `## Why`（L9–11）与「问题」（L20–28） | 两段是同一批事实的两次陈述（现状差距、回执文案、弹窗缺说明、本人行程按钮），新增 `## Why` 后重复度更高；后续改一处忘另一处会产生提案内部漂移 | 归档前把 `## Why` 收敛为 3–4 行摘要，细节留在「问题」；或让「问题」首句引用 `## Why` | 两段逐句比对（安全提示 / 回执 / 身份保密与紧急求助 / 本人行程入口四点重复） | proposal | [fact] |
| L-04 | SUGGESTION | p2 | `proposal.md`「残余风险」最后一行 | 写「用户当次要求『完成 P1 即可提交推送』」，与 P1 实际执行不符：P1 按用户指示**只本地提交、未 push**（本地 `main` 仍含并行会话未推送提交） | 改为「用户指示 P1 只本地提交、不 push；与 `@rule:git-commit-conventions` 的阶段提交时机一致，仅发布时机由用户决定」 | `docs/sdd/refine-safety-report/p1-intent.md` §6「提交与偏离记录」；`git log origin/main..HEAD` | proposal | [fact] |
| L-05 | SUGGESTION | p2 | Delta 场景「提交举报并收到回执」Then 第 1 句 | 只写「系统记录该举报并返回已接收」，未把 `received=true` 落成可观察项；REQ-012 §4 #4 与 `openapi.yaml` 0.8.1 `ReportReceipt` 都以此为契约信号，P3 设计可能漏掉对标志位的断言，只断言 UI 回执文案 | P3 `atdd-design.md` 明确「`received=true` → 回执态」的映射并加单测断言；或在 P5 合并 Living Spec 时补一句 | `requirement-workspace/requirements/REQ-012-safety-report.md` §4 #4；`openapi.yaml` `ReportReceipt`；Delta 场景 7 | spec | [inference] |

**收口状态：** L-01（提案「范围」第 7 条 + 「影响面」Living Spec 行改写为「4 个既有场景名，其中 2 个内容收敛」）、L-02（残余风险行改为「按页面语境分别定义两套回退文案」；未新增决策行，因为这是文案来源选择而非用户裁决）、L-04（残余风险行改为「P1 只本地提交、不 push」）已在 P2 直接改提案正文并复验 `validate --strict`。L-03、L-05 按上表留待归档 / P3。

## 检查明细

### Proposal rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| P1 | `## Why` present and non-empty | Pass（修复后） | `proposal.md:9-11`；修复前 `openspec show` 报 `Change must have a Why section` |
| P2 | `## What Changes` present and non-empty | Pass（修复后） | `proposal.md:13-18`：4 条，逐条对应 capability / 契约 / 前端 |
| P3 | Non-Goals / Out-of-scope present and non-empty | Pass | 「Out of scope」6 条，均为精确边界（工单 / 词表扩容 / 契约 / 求助热线 / 资料弹窗 / 迁移），无「不做不相关的事」式空话 |
| P4 | Impact covers self / upstream / downstream | Pass | 「影响面」：self = `SafetyNote` / `ReportModal` / 两个页面 / `tripMessages` / `styles.css`；upstream = `trip-plans.meeting_area` 只读；downstream = 单测 / E2E 旧断言 / Living Spec 归档 |

### Spec rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| S1 | Spec structure follows project OpenSpec schema | Pass | `## MODIFIED Requirements` + `### Requirement:` + 9 × `#### Scenario:`，与 `add-trip-companions` / `refine-trip-application` 同构；`validate --strict` valid |
| S2 | Citation prefixes stay in agreed set | Pass | 提案仅用 `@rule:`；Delta 无引用前缀 |
| S2b | `@knowledge:` paths resolve | N/A | 无 `@knowledge:` 引用 |
| S2c | `@rule:<ID>` resolves to rules file | Pass | 本次出现的 5 个 ID 全部命中规则正文二级标题：`spec-first` / `sdd-artifacts` / `web-coding-style` / `pii-scrubbing` / `git-commit-conventions` |
| S3 | Every Requirement traces to proposal What Changes | Pass | Delta 单 Requirement「我的旅行聚合与最低安全能力」← `## What Changes` 第 1 条 |
| S4 | Scenarios use Given / When / Then | Pass | 9/9 场景三要素齐全 |
| S5 | Scenarios belong to a numbered Requirement | Pass | 9/9 挂在 `### Requirement: 我的旅行聚合与最低安全能力` 下 |

### Shared / cross-artifact

| # | Check | Result | Evidence |
|---|---|---|---|
| X-1 | 交叉引用 / ID 指向不存在的段落或能力 | Pass | 提案 / Delta 的路径与能力名均存在；`refine-safety-report` 目录仅 `proposal.md` + `specs/trip-companions/spec.md`（+ 本报告与 AC/DoV 复核） |
| X-2 | 同一能力 / 需求在两处表述不兼容 | Pass | 提案「范围」①–⑦ 与 Delta Requirement 正文语义一致；未与已归档 `add-trip-companions` 的 Living Spec 块产生平行权威（本 change 用 MODIFIED 替换） |
| X-3 | 验收标准空泛不可测 | Pass | 回执、回退、入口、失败提示均为字面量或可见状态；无「友好 / 快速 / 正确」类表述 |
| C1 | proposal → spec：What Changes 被 Spec Requirement 覆盖 | Pass | 4 条 What Changes 中 3 条映射到 Delta（展示 / 举报 / 隐私）；第 2 条 `trip-plans` 只读与第 3 条「契约 / 后端 / 迁移不变」属声明性「不改」，按定义不需要 Delta Requirement |
| C2 | spec → tasks：每 Requirement 至少 1 task | N/A | level 2，无 `tasks.md` |
| C6 | `@knowledge:` / `@rule:` reachability | Pass | 见 S2c；无 `@knowledge:` |

### phase=p2 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| Q-1 | Proposal scope vs Delta scope — no silent expansion or drop | Pass | 提案 In scope ①–⑦ ↔ Delta 9 场景；Out of scope 各项在 Delta 中无对应场景（工单 / 词表扩容 / 契约升级 / 资料弹窗举报 / 求助热线） |
| Q-2 | Delta capabilities internally consistent（actors / constraints / scenarios） | Pass | 单 capability、单 Requirement；actors 隐含为「浏览者 / 申请者 / 同行者 / 发布者」，与「本人行程不出现举报入口」不冲突；约束（四类原因 / ≤200 字 / 不透露举报人 / 不采集隐私字段）在场景中有落点 |
| Q-3 | Key scenarios / constraints from proposal have a home in Delta | Pass | 8 条验收信号 ↔ 9 场景：信号 1–7 各自命中；信号 8（validate + 测试全绿）属 P4 验证信号，不进 Delta，属预期 |
| Q-4 | tasks 与 Delta 意图不矛盾 | N/A | 无 `tasks.md` |
| Q-5 | 无法追溯到提案的 Requirement / delta | Pass | 无孤儿 Requirement / 孤儿场景 |

### Tasks / Design rules

| # | Rule | Result |
|---|---|---|
| T1 / T2 / T3 | tasks 体量、验证收尾、越界 | N/A（无 `tasks.md`） |
| D1 / D2 / D3 | 决策编号、Context、被否方案 | N/A（无 `design.md`；提案「决策」表已含理由列，但不属 Design 规则管辖） |

## 修复建议（按优先级）

1. **G1 前（可选，均不阻塞）：** L-01 / L-02 / L-04 已在 P2 改正，无需再审；G1 只需按现状确认。
2. **P3：** L-05 落进 `atdd-design.md`（`received=true` 断言）。
3. **P5 / 归档前：** L-03 收敛 `## Why` 与「问题」的重复叙述；归档说明里写清「安全提示常驻 / 提交举报并收到回执」是名称保留、内容收敛（与 spec 评审 S-01 同一事项）。

## Residual risks

- 本报告不构成 Gate 结论；G1 仍需具名 IO + SA 签署。
- 「安全提示常驻」沿用基线场景名但内容已收敛（spec 评审 S-01）：若归档说明缺失，Living Spec 追溯会像漏改；本报告不修改 Living Spec。
- 提案与 Delta 的「本人行程无举报入口」依赖前端判定发布者身份；若 `trip-plans` 后续引入协作者等新角色，该场景需复评（当前无该概念）。
- 集合区域展示质量取决于 `trip-plans.meeting_area` 填充率；空值回退只覆盖显示层，不改变数据完整性。
- E2E 未纳入 CI，回执文案变更后的回归依赖本地执行。

## Reviewer

- **Agent:** Qoder（AI agent）｜ **Date:** 2026-11-16
- **Human sign-off:** pending（G1 具名 IO + SA）
- **Next（non-Gate）：** `/sdd:g1-decision-record`（需具名 IO + SA）或继续 `/sdd:p2` 处理上述建议。