# G1 decision — add-growth-level

- **Gate：** G1（Align）
- **Change：** `add-growth-level`（`user-growth` ADDED；REQ-031 / S32，编号两次顺延）
- **Input artifacts：**
  - Delta：[`specs/user-growth/spec.md`](specs/user-growth/spec.md)（9 Requirement / 41 Scenario；`openspec validate add-growth-level --strict` = valid）
  - AC / DoV：[`dov-ac-review.md`](dov-ac-review.md)（AC 4/4 Pass；DoV 5/5 Pass；41 场景映射齐全；G1-ready）
  - 一致性：[`consistency-lint.md`](consistency-lint.md)（Pass；0 BLOCKER / 0 WARNING / 4 SUGGESTION / 3 N/A）
  - 工件评审：`docs/reviews/20261118-add-growth-level-proposal-review.md`、`docs/reviews/20261118-add-growth-level-spec-review.md`（均 Pass 建议；WAYNE + Jay 已签 2026-11-18）
- **Check conclusions：**
  - **Scope：** Delta 与 proposal §What Changes 一致（9 Requirement ↔ 10 条变更点）；Out of Scope（明细页 / 排行榜 / 通知 / 权益 / 管理端 / 中文头衔 / 回填 / #45 / #29 副作用归属）在 Delta 无对应条目，无静默扩缩。
  - **Ambiguity：** 两处实现口径未在 Delta 写死——① 重复处理已 `RESOLVED` 举报的响应形态（沿用既有异常 vs 静默 no-op）；② 他人响应的字段级可见性（本人返回经验 / 他人省略 / 批量只返回等级）。Delta 只约束可观察结果（至多扣一次；他人不返回经验值），归属 P3 design。
  - **Conflict：** 无 BREAKING 冲突；与 #29（`add-report-credit-deduction`，`AdminReportServiceImpl.resolve` 并列副作用）、#45（`add-route-completion`，独立故事 REQ-031 / S32）为并行关系，衔接点已在 `deep-dive.md` / `impact-brief.md` §30 记录。
- **Decision：Conditional**（Align 通过，附两项 P3 前置条件）
- **Conditions + owners：**
  - **C1：** P3 `design.md` 明确重复处理已成立举报的响应形态（沿用既有异常 vs 静默 no-op），并在 P3 设计评审中复核。—— owner：Jay；复核：WAYNE；期限：P3 设计评审前。
  - **C2：** P3 `design.md` 明确他人响应的字段级可见性（本人返回经验与距下一级；他人省略经验；批量只返回等级），并在 P3 设计评审中复核。—— owner：Jay；复核：WAYNE；期限：P3 设计评审前。
- **Approvers：** IO = WAYNE；SA = Jacky
- **Timestamp：** 2026-11-18（Asia/Shanghai）

> **编号更新（2026-11-18）：** 合并 `origin/main@f2bad40` 后，REQ-030 / S31 已由 `add-report-credit-deduction`（#29）占用，本 change 顺延为 **REQ-031 / S32**；Decision、Conditions 与 Approvers 均按内容不变沿用。
