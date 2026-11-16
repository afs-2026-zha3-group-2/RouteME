# Consistency lint — refine-safety-report（rev2）

- **Change:** `refine-safety-report`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-safety-report/`）
- **Timestamp:** 2026-11-16T16:30+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1 可用；`openspec validate refine-safety-report --strict` → valid；`openspec show refine-safety-report --json` → `deltaCount: 2`（`trip-companions` ADDED + REMOVED）
- **Supersedes:** rev1（2026-11-16T16:25+0800，`trip-companions` MODIFIED，9 场景）。rev1 的 Pass 与 L-01–L-05 逐条结论随裁决 D5 一并作废；其中 L-03（`## Why` 与「问题」重复）与 L-05（`received=true` 可观察项）作为仍适用项带入 rev2。

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4（2 条当场收口，2 条留待 P3 / P4）/ N/A 7

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

rev2 的检查重点是「需求侧删除」是否在 proposal、Delta、故事与需求条目四处同步，而不是 rev1 的「提示如何拆分」。proposal 与 Delta 已按 D5 改写；L2-01 / L2-02 当场收口，L2-03（体验发布页回归守卫）与 L2-04（E2E 旧断言与回执态 primary 按钮）留待 P4。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L2-01 | SUGGESTION | p2 | `proposal.md`「范围 / In scope」 | rev1 的 ①–③ 条要求三条提示与聊天一行提示，与 D5 直接冲突；若保留，`openspec show` 与实现侧都会读到两套权威 | 删除提示相关条目，补「两个页头入口 + 不渲染提示区」，并把 In scope 重编为 ①–⑧ | `REQ-012` rev2 §3；Delta 场景「详情页页头举报入口」「聊天页页头举报入口」 | proposal | [fact] |
| L2-02 | SUGGESTION | p2 | `proposal.md`「影响面」Living Spec 行 | rev1 写「MODIFIED 替换、保留 4 个既有场景名」，与 rev2 的 REMOVED + ADDED（保留 3、移除 1、新增 6）不符 | 改为「REMOVED 旧块 + ADDED 新块；保留 3 个基线场景、移除『安全提示常驻』、新增 6 个」 | `consistency-lint` S1；`dov-ac-review.md`「基线核对」 | proposal | [fact] |
| L2-03 | SUGGESTION | p3 | `SafetyNote` 去向 | 提示从详情页 / 聊天页下线，但体验发布页（`ShareExperiencePage`）仍需要「发布前提醒」；若把组件当死代码删除，该页会出现空白区 | P3 `design.md` 明确：`SafetyNote` 只保留体验发布页形态（无 `onReport`），或改为该页局部提示，并在 P4 diff 核对 | `RouteME/frontend/src/experiences/ShareExperiencePage.tsx`；`preview/safety-report.html`「体验发布页（不变）」 | design | [inference] |
| L2-04 | SUGGESTION | p4 | `RouteME/e2e/tests/companions.spec.ts` L136 / L137 | L136 断言旧回执「举报已收到，我们会记录处理。」；L137 用 `.ant-modal-footer .ant-btn-primary` 关闭回执，而 rev2 回执态只剩一个「关闭」按钮，其是否 primary 未定 | 回执文案与 `tripMessages` 同批改为「已收到，我们会处理」；确认回执态唯一按钮为 primary，或把 L137 改为按名称点击 | `companions.spec.ts:134-137`；`ReportModal.tsx` 回执态 | test | [fact] |
| L2-05 | SUGGESTION | p3 | Delta 场景「提交举报并收到回执」Then | 仍只写「系统记录该举报并返回已接收」，未把 `received=true` 落成可观察项 | P3 `atdd-design.md` 写明「`received=true` → 回执态」并加断言 | `openapi.yaml` `ReportReceipt`；REQ-012 rev2 §4 #4 | spec | [inference] |

**收口状态：** L2-01（In scope 重编为 ①–⑧，删除三条提示 / 聊天一行提示，补页头入口与「不渲染提示区」）、L2-02（Living Spec 行改为 REMOVED + ADDED 口径）已在 rev2 直接改提案正文并复验 `validate --strict`。L2-03 / L2-04 留待 P3 / P4，L2-05（原 L-05）留待 P3。

## 检查明细

### Proposal rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| P1 | `## Why` present and non-empty | Pass | `proposal.md` `## Why`：现状入口埋在安全区底部、回执文案不符、弹窗缺保密与求助说明、本人行程可自举报 |
| P2 | `## What Changes` present and non-empty | Pass | 4 条：两个页头入口、提示下线、弹窗与回执文案、体验发布页不变 |
| P3 | Non-Goals / Out-of-scope present and non-empty | Pass | 「Out of scope」：工单 / 词表扩容 / 契约 / 求助热线 / 资料弹窗 / 重新引入提示 |
| P4 | Impact covers self / upstream / downstream | Pass | self = `ReportModal` / 两个页面 / `tripMessages` / 组件下线；upstream = `meeting_area` 仅既有事实行；downstream = 单测 / E2E 旧断言 / Living Spec 归档 |

### Spec rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| S1 | Spec structure follows project OpenSpec schema | Pass | `## REMOVED Requirements`（1，含 Reason / Migration）+ `## ADDED Requirements`（1，9 × `#### Scenario:`）；`validate --strict` valid |
| S2 | Citation prefixes stay in agreed set | Pass | 提案仅用 `@rule:`；Delta 无引用前缀 |
| S2b | `@knowledge:` paths resolve | N/A | 无 `@knowledge:` 引用 |
| S2c | `@rule:<ID>` resolves to rules file | Pass | 本次出现的 5 个 ID 全部命中规则正文二级标题：`spec-first` / `sdd-artifacts` / `web-coding-style` / `pii-scrubbing` / `git-commit-conventions` |
| S3 | Every Requirement traces to proposal What Changes | Pass | ADDED「同行举报入口与回执」← `## What Changes` 第 1–3 条；REMOVED 块 ← 第 2 条「提示下线」 |
| S4 | Scenarios use Given / When / Then | Pass | 9/9 场景三要素齐全 |
| S5 | Scenarios belong to a numbered Requirement | Pass | 9/9 挂在 `### Requirement: 同行举报入口与回执` 下 |

### Shared / cross-artifact

| # | Check | Result | Evidence |
|---|---|---|---|
| X-1 | 交叉引用 / ID 指向不存在的段落或能力 | Pass | 提案 / Delta 的路径与能力名均存在；`refine-safety-report` 目录含 `proposal.md` + `specs/trip-companions/spec.md` + 评审报告 + `preview/` |
| X-2 | 同一能力 / 需求在两处表述不兼容 | Pass | REMOVED 块只写 Reason / Migration 不描述行为，ADDED 块是唯一行为权威；两者名称不同，不构成平行权威 |
| X-3 | 验收标准空泛不可测 | Pass | 入口文案、回执文案、失败提示、弹窗两段说明均为字面量或可见状态 |
| C1 | proposal → spec：What Changes 被 Spec Requirement 覆盖 | Pass | 4 条 What Changes 中 3 条映射到 ADDED Requirement；第 4 条（体验发布页不变）属回归守卫，按定义为「不改」 |
| C2 | spec → tasks：每 Requirement 至少 1 task | N/A | level 2，无 `tasks.md` |
| C6 | `@knowledge:` / `@rule:` reachability | Pass | 见 S2c；无 `@knowledge:` |

### phase=p2 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| Q-1 | Proposal scope vs Delta scope — no silent expansion or drop | Pass | 提案 In scope ①–⑧ ↔ Delta 9 场景；Out of scope 各项在 Delta 中无对应场景（工单 / 词表扩容 / 契约升级 / 资料弹窗举报 / 求助热线 / 重新引入提示） |
| Q-2 | Delta capabilities internally consistent（actors / constraints / scenarios） | Pass | 单 capability；ADDED Requirement 的 MUST NOT（不展示提示、不采集隐私、本人行程不出现入口）与 9 场景逐条对应 |
| Q-3 | Key scenarios / constraints from proposal have a home in Delta | Pass | 8 条验收信号 ↔ 9 场景：信号 1–7 各自命中；信号 8（validate + 测试全绿）属 P4 验证信号，不进 Delta |
| Q-4 | tasks 与 Delta 意图不矛盾 | N/A | 无 `tasks.md` |
| Q-5 | 无法追溯到提案的 Requirement / delta | Pass | 无孤儿 Requirement / 孤儿场景；REMOVED 块的迁移去向已在 Migration 写明 |

### Tasks / Design rules

| # | Rule | Result |
|---|---|---|
| T1 / T2 / T3 | tasks 体量、验证收尾、越界 | N/A（无 `tasks.md`） |
| D1 / D2 / D3 | 决策编号、Context、被否方案 | N/A（无 `design.md`；提案「决策」表已含理由列，但不属 Design 规则管辖） |

## 修复建议（按优先级）

1. **G1 前（可选，均不阻塞）：** L2-01 / L2-02 已改正；G1 只需按 rev2 现状确认，并同时确认 rev1 的 Pass 作废。
2. **P3：** L2-05 落进 `atdd-design.md`（`received=true` 断言）；L2-03 落成 `SafetyNote` 去留决策。
3. **P4：** L2-04 同步 E2E 回执断言与关闭按钮定位。

## Residual risks

- 本报告不构成 Gate 结论；G1 rev2 仍需具名 IO + SA 重新签署，rev1 的 Wanye / Karena 签署不覆盖 D5。
- 「安全提示常驻」在 rev2 被真正移除；归档说明必须写明是有意删除（D5），否则 Living Spec 追溯会像漏迁移。
- 提案与 Delta 的「本人行程无举报入口」依赖前端判定发布者身份；若 `trip-plans` 后续引入协作者等新角色，该场景需复评。
- 页头入口在窄屏与长标题下的换行行为需 P4 用 390 / 768 / 1440 三档验证。
- E2E 未纳入 CI，回执文案变更后的回归依赖本地执行。

## Reviewer

- **Agent:** Qoder（AI agent）｜ **Date:** 2026-11-16
- **Human sign-off:** pending（G1 rev2 具名 IO + SA）
- **Next（non-Gate）：** `/sdd:g1-decision-record`（需具名 IO + SA 重签）或继续 `/sdd:p2` 处理上述建议。