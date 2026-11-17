# Consistency lint — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`
- **Phase：** p2（Delta 评审后、G1 前）
- **Focus：** full
- **Timestamp：** 2026-11-17
- **Artifact level：** 2（proposal + specs；`design.md` / `tasks.md` 未到 P3）
- **Root：** `ai4se-baseline`

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 3 / N/A 5。

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| WARNING | 0 |
| SUGGESTION | 3 |
| N/A | 5 |

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority |
|---|---|---|---|---|---|---|---|
| S-1 | SUGGESTION | p2 | `proposal.md` Impact「openapi.yaml」/「迁移」行 | 契约 0.20.0 与迁移 V25 是暂定；`add-ai-itinerary` 曾声明同号 | P3 按实际落地顺序排他确认；若先落则顺延 0.16.0 + V22 | proposal Impact；P0 baseline D17 | [fact] |
| S-2 | SUGGESTION | p2 | Delta「退出原因与预计信用影响」/「受限账号只读与保留能力」 | 本 Delta 不改「退出同行」聊天语义；活规格（关闭聊天）与未归档 `refine-trip-chat`（保留聊天）仍有已知差异 | 本 change 不触碰聊天；P5 归档前由 SA 对活规格与未归档 Delta 做具名追认 | `openspec/specs/trip-companions/spec.md:97-117`；`refine-trip-chat` Delta | [inference] |
| S-3 | SUGGESTION | p2 | Delta「受限账号只读与保留能力」第 1 段 | 写操作用「……等其它写操作」兜底；P3 需要把服务端守卫清单与前端入口清单一一列出，避免漏拦 | P3 `design.md` 给出 guard 清单（发布/编辑/取消/结束/申请/撤回/退出/体验/聊天/资料头像）；P4 测试逐项覆盖 | Delta Req6；REQ-025 D9 | [fact] |

## Proposal rules（P1–P4）

| # | Rule | Result | Evidence |
|---|---|---|---|
| P1 | `## Why` present and non-empty | Pass | proposal §Why |
| P2 | `## What Changes` present and non-empty | Pass | proposal §What Changes |
| P3 | Non-Goals / Out-of-scope present and non-empty | Pass | proposal §Out of Scope（9 项） |
| P4 | Impact covers self / upstream / downstream | Pass | proposal §Impact（信用/行程/同行/体验/资料/聊天/契约/迁移） |

## Spec rules（S1–S5）

| # | Rule | Result | Evidence |
|---|---|---|---|
| S1 | Spec structure follows project OpenSpec schema | Pass | `## ADDED Requirements` + 9 `### Requirement` + 46 `#### Scenario`；`openspec validate --strict` valid |
| S2 | Citation prefixes in agreed set | Pass | Delta 未使用 `@knowledge:` / `@rule:` 引用；proposal 头部使用已知规则 ID |
| S2b | `@knowledge:` paths resolve | N/A | 无 `@knowledge:` 引用 |
| S2c | `@rule:<ID>` resolves | Pass | proposal 头部 `@rule:spec-first` / `api-contract` / `java-patterns` / `web-coding-style` / `security-baseline` / `tdd-cycle` / `prototype-ui-alignment` / `sdd-artifacts` 均在 `docs/knowledge/rules/_INDEX.md` |
| S3 | Every Requirement traces to proposal What Changes | Pass | C1 映射见下 |
| S4 | Scenarios use Given / When / Then | Pass | 46 个 Scenario 均含 Given/When/Then（部分含 And） |
| S5 | Scenarios belong to a numbered Requirement | Pass | 9 条 Requirement 下均有 Scenario，无孤儿 |

## Tasks / Design rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| T1–T3 | Tasks rules | N/A | `tasks.md` 未到 P3 |
| D1–D3 | Design rules | N/A | `design.md` 未到 P3 |

## Shared / cross-artifact

| # | Check | Result | Evidence |
|---|---|---|---|
| C1 | proposal → spec: What Changes covered by Spec Requirements | Pass | 退出原因/告知 → Req1；扣分 → Req2/3；时间基准 → Req1/2；待核实 → Req4；限制触发 → Req5；只读 → Req6；自动清理 → Req7；展示/解除 → Req8；无管理端/事务 → Req9。数据/契约条目属 Impact，不是行为 Requirement |
| C2 | spec → tasks: each Requirement ≥1 task | N/A | `tasks.md` 未到 P3 |
| C6 | `@knowledge:` / `@rule:` reachability | Pass | proposal 规则 ID 可解析；Delta 无引用 |
| — | Same capability / requirement stated incompatibly | Pass | 未发现同能力两处矛盾 |
| — | Vague / untestable AC | Pass | 46 场景均可断言 |

## phase=p2 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Proposal scope vs Delta scope — no silent expansion/drop | Pass | proposal 9 组 ↔ Delta 9 Requirement；Out of Scope 与 Delta 一致 |
| 2 | Delta capabilities internally consistent | Pass | actors（同行者/受限用户/他人/系统/无管理员）、constraints、scenarios 一致 |
| 3 | Key scenarios/constraints from proposal have a home | Pass | 六档、旅行中 -15、翻倍、待核实、<60、只读、自动清理、自动解除、系统取消原因均有 Requirement |
| 4 | tasks.md exists — direction check | N/A | 未到 P3 |
| 5 | Requirements cannot trace to proposal | Pass | 9/9 可追；无孤儿 |

## N/A / skipped

- Tasks rules（T1–T3）：无 `tasks.md`。
- Design rules（D1–D3）：无 `design.md`。
- C2（spec → tasks）：无 `tasks.md`。
- S2b（`@knowledge:` 路径）：无引用。
- phase=p2 #4（tasks 方向检查）：无 `tasks.md`。

## Fix suggestions（by priority）

1. **P3 必做：** 排他确认契约 / 迁移号；给出服务端守卫清单与前端入口清单（S-1 / S-3）。
2. **P5 前：** SA 对 `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 的聊天语义做具名追认（S-2）。
3. **P3 承接：** 待核实领域方法与低信用测试数据路径。

## Residual risks

- 契约 / 迁移号撞号会阻塞 P3 任务排序。
- 自动清理跨域事务较大；P3 需评估批量与索引，P4 锁定无半状态。
- 待核实退出没有管理端出口；本 change 只保证 pending。
- 低信用演示数据 / E2E 触发路径未定。

## Reviewer metadata

- Reviewer：Qoder（P2 consistency-lint，手工等价执行）
- Human sign-off：待 G1 IO / SA
- Date：2026-11-17

## Next（non-Gate）

- `/sdd:g1-decision-record`（IO=WAYNE / SA=Jacky 待具名确认）或继续 `/sdd:p2`。
- 本报告不是 G1 决策，不改写权威规格。
