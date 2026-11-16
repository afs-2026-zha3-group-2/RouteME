# Delta Spec 评审报告（rev2）— refine-safety-report

- **工件：** `openspec/changes/refine-safety-report/specs/trip-companions/spec.md`（rev2）
- **change-id：** `refine-safety-report` ｜ **能力：** `trip-companions`（REMOVED 1 + ADDED 1）
- **需求条目：** `requirement-workspace/requirements/REQ-012-safety-report.md`（REQ-012 / S14，rev2）
- **评审日期：** 2026-11-16
- **评审轮次：** 第 2 次（同日）。rev1 报告见 [`20261116-refine-safety-report-spec-review.md`](20261116-refine-safety-report-spec-review.md)，其 Pass 结论只覆盖 rev1 的 MODIFIED 9 场景，**不适用于 rev2**。
- **触发原因：** 用户裁决 D5 要求真正删除两条提示场景。`openspec` 校验器禁止 MODIFIED 块丢弃既有场景名（`dist/core/specs-apply.js:401`，`current spec contains scenario(s) not present in the modified block`），因此 Delta 由 MODIFIED 改为 **REMOVED + ADDED**。这是结构性变更，必须重新评审与批准。
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:pii-scrubbing`）
- **评审输入：** Delta 正文（rev2）；Living Spec `openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」（4 场景基线）；`requirement-workspace/requirements/REQ-012-safety-report.md`（rev2 §3–§5）；[`proposal.md`](../../openspec/changes/refine-safety-report/proposal.md)（rev2）；[`dov-ac-review.md`](../../openspec/changes/refine-safety-report/dov-ac-review.md)（rev2）；[`consistency-lint.md`](../../openspec/changes/refine-safety-report/consistency-lint.md)（rev2）；`preview/safety-report.html`（B）
- **工具校验：** `openspec validate refine-safety-report --strict` → valid；`openspec show refine-safety-report --json` → `deltaCount: 2`，ADDED 需求 9 场景

## 评审结论

**Pass**

Delta 结构正确：`## REMOVED Requirements` 只带 Reason / Migration 不描述行为，`## ADDED Requirements` 是唯一行为权威，两者名称不同，不构成平行权威。9 个场景覆盖 REQ-012 rev2 §4 的 7 条验收外加 2 条基线迁移，三要素（Given / When / Then）齐全，无空泛表述。评审中发现 2 条措辞 / 对等性缺陷，已在本次当场收口；2 条留给 P3 / P4。无 BLOCKER。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 状态 |
|---|---|---|---|---|---|---|
| S2-01 | SUGGESTION | `@rule:sdd-artifacts` | REMOVED 块 `**Migration**` | 原文写「提示相关场景（安全提示常驻、聊天页展示安全提示）不再保留」，但 Living Spec 基线只有 4 个场景，其中并无「聊天页展示安全提示」（那是 rev1 delta 自造的场景名）。Migration 作为归档指引列出不存在于基线的场景名，会让归档人误以为漏删 | 只列基线实际存在的「安全提示常驻」，并注明「D5 有意删除，非漏迁移」 | **已当场收口** |
| S2-02 | SUGGESTION | `@rule:spec-first` | ADDED「聊天页页头举报入口」 | Requirement 正文写「举报入口 MUST NOT 仅靠颜色或图标表达」，详情页场景也带「键盘与读屏可达」的 And，但聊天页场景缺同款 And——同一约束在两个入口上的可验证性不对等，P4 容易只测详情页 | 聊天页场景补 `- **And** 入口不只靠颜色或图标表达，键盘与读屏可达` | **已当场收口** |
| S2-03 | SUGGESTION | `@rule:spec-first` | ADDED「提交举报并收到回执」 | Then 仍以「返回已接收」描述 `received=true`，未落成可观察项；P4 若只断言文案不校验响应字段，回执态可能在后端未真正记录时也成立 | P3 `atdd-design.md` 写明 `received=true` → 回执态的映射，并在单测中断言 | 留 P3（同 consistency-lint L2-05） |
| S2-04 | SUGGESTION | `@rule:web-coding-style` | ADDED「详情页页头举报入口」 | 「页头在状态标签同一行右侧」与中文正文的窄屏要求（换行不隐藏）未在场景里给出等价断言；P4 写 390 / 768 / 1440 三档测试时缺少判定依据 | P3 `atdd-design.md` 明确三档断言：1440 / 768 行内可见，390 位于标题下方且仍可见 | 留 P3 / P4 |

## 与 Living Spec 基线的迁移核对

| 基线场景（`openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」） | 迁移结果 | 依据 |
|---|---|---|
| 分区展示我的旅行 | 保留（内容未改） | ADDED 同名场景 |
| 待处理申请提醒 | 保留（内容未改） | ADDED 同名场景 |
| 安全提示常驻 | **移除**（D5） | REMOVED 块 Reason + Migration |
| 提交举报并收到回执 | 保留（回执文案沿用 rev1 修订） | ADDED 同名场景 |

**合计：基线 4 → 保留 3、移除 1；新增 6（详情页页头入口、聊天页页头入口、举报弹窗内容、本人行程不出现举报入口、提交失败可读且可重试、举报弹窗不展示隐私字段）。ADDED 共 9 场景。**

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| 每份工件有对应评审报告 | 是（本文件）；rev1 报告保留不覆盖 |
| Delta 结构合法（REMOVED 含 Reason / Migration、ADDED 含完整场景） | 是；`validate --strict` valid |
| 是否用 REMOVED 掩盖了本应保留的行为 | 否：移除范围恰为提示场景，我的旅行 / 回执 / 隐私均迁入新块 |
| 是否越界定义后端 / 契约 | 否：全文无端点和字段变更，四值原因与 `note ≤200` 只作既有约束引用 |
| 隐私红线是否仍可验证 | 是：独立场景「举报弹窗不展示隐私字段」 |
| 场景是否只靠颜色 / 图标表达验收 | 否：两个入口场景均要求文本按钮 + 键盘读屏可达 |

## 残余风险

- 「安全提示常驻」的移除必须由归档说明显式记录（D5 有意删除），否则 Living Spec 追溯会像漏迁移。
- REMOVED 已归档能力的需求块属跨能力影响，需 IO 具名确认；同一 capability 的其它未归档 change 必须串行归档。
- 聊天页与详情页的入口位置依赖页面既有页头结构，若后续页头改版，两个场景需复评。

## 批准记录

- **批准人：** Jacky（AO）
- **批准时间：** 2026-11-16T16:35+08:00
- **批准范围：** 批准本 Delta Spec（rev2）并进入下一步；S2-01 / S2-02 已当场收口，S2-03 留 P3、S2-04 留 P3 / P4，均不阻断。
- **说明：** 本批准只覆盖工件评审，不等于 G1 通过。G1 rev2 仍需 IO Wanye / SA Karena 就 D5 具名重签（见 `g1-decision.md`「Revision 2」）。