# P2 规格记录 — add-growth-level

- **Change：** `add-growth-level`（REQ-033 / S34 用户成长等级 LV1–LV5；编号四次顺延）｜ **阶段：** P2（Delta 收敛 + AC/DoV + 一致性检查 + G1）
- **日期：** 2026-11-18 ｜ **记录人：** Jay（AO）
- **基线：** `origin/main@8992853`（P2 阶段），其后合并至 `origin/main@f2bad40`（契约 0.26.0 / 迁移头 `V31__report_credit_deduction.sql`，#29 已并入）

## 1. 阶段目标

把 P1 的 Delta 草稿收敛为可签署的规格：确认 41 场景与 proposal 的追溯、评估同义场景合并、完成 AC / DoV 评审与一致性 lint，并取得 G1（Align）结论。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta（收敛后） | [`specs/user-growth/spec.md`](../../../openspec/changes/add-growth-level/specs/user-growth/spec.md) | 纯 ADDED：9 Requirement / 41 Scenario；`openspec validate add-growth-level --strict` = valid |
| AC / DoV 评审 | [`dov-ac-review.md`](../../../openspec/changes/add-growth-level/dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ-033 §4 八组 41 场景映射表；同义场景合并评估（结论：维持 41）；IO / SA 残余关注 |
| 一致性 lint | [`consistency-lint.md`](../../../openspec/changes/add-growth-level/consistency-lint.md) | Pass；0 BLOCKER / 0 WARNING / 4 SUGGESTION / 3 N/A |
| G1 决策记录 | [`g1-decision.md`](../../../openspec/changes/add-growth-level/g1-decision.md) | **Conditional**（IO=WAYNE / SA=Jacky，2026-11-18）；C1 / C2 留 P3 design |

## 3. Delta 收敛说明

- **范围：** 纯 ADDED，无 MODIFIED / REMOVED；capability 仍为单一个 `user-growth`，未新增第二条能力。
- **场景数：** 维持 41 条。P1 spec 评审的 SUGGESTION 要求 P2 评估同义场景合并；逐组核对后仅两处「同义不合并」——发布经验「编辑/重复提交」vs「删除后重建」（后者覆盖删除路径与幂等键存活）、举报「同一举报只扣一次」vs「并发举报只扣一次」（顺序重试 vs 并发竞态，合并会丢并发门槛）。其余场景前置条件不同，不做合并。评估明细见 `dov-ac-review.md` §3。
- **两处口径 defer P3：** ① 重复处理已成立举报的响应形态；② 他人响应的字段级可见性。Delta 只约束可观察结果（至多扣一次；他人不返回经验值），实现形态由 P3 `design.md` 决定（G1 C1 / C2）。
- **工具约束：** `openspec validate --strict` 会对 specs 文件首个 `## ` 之前的说明文本报 WARNING（归档不会带入主规格），因此未在 `spec.md` 头部保留 P2 收敛记录；收敛结论统一记录在本文件与 `dov-ac-review.md`。

## 4. AC / DoV 摘要

| 组 | 结果 | 说明 |
|---|---|---|
| AC-1 ~ AC-4 | 4/4 Pass | 每条 Requirement ≥ 3 Scenario；断言均为返回值 / 流水 / 展示文本 / 既有错误码；边界与负向齐全；无模糊词 |
| DoV-1 ~ DoV-5 | 5/5 Pass | 范围与 proposal 一致；歧义已列明并归属 P3；角色关注点记录；未声称实现完成；41/41 场景可追溯 |

## 5. 一致性 lint 摘要

- **Verdict：Pass**（0 BLOCKER / 0 WARNING / 4 SUGGESTION / 3 N/A；Tasks / Design / C2 因工件未产出记 N/A）。
- SUGGESTION 交办：L-01 治理项（`prototype-ui-alignment` / `rule-precedence` 在权威区无 heading，与本 change 无关）；L-02 P4 验证报告补「13 条验收信号 ↔ 证据」对照；L-03 P3 design 需显式写业务事件事务边界；L-04 P3 tasks 统一引用 Delta 场景名。

## 6. G1 结论

- **Decision：Conditional**（Align 通过，附 C1 / C2）。
- **C1：** P3 `design.md` 明确重复处理已成立举报的响应形态（沿用既有异常 vs 静默 no-op），P3 设计评审复核；owner Jay，复核 WAYNE。
- **C2：** P3 `design.md` 明确他人响应的字段级可见性（本人返回经验与距下一级；他人省略；批量只返回等级），P3 设计评审复核；owner Jay，复核 WAYNE。

## 7. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta 收敛结果、AC / DoV 与 lint 报告、G1 条件 C1 / C2 | 2026-11-18 |
| SA | Jacky | 同上（展示与文案边界、上限口径） | 2026-11-18 |

## 8. 提交记录

- P2 产物（Delta 校验、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`、本记录、`registry.md` / `docs/sdd/README.md` 状态）随阶段提交 `docs(p2): add-growth-level converge delta with AC/DoV, lint and G1` 落盘（`bf74658`），并 push 到 `origin/feature/add-growth-level`。
- 2026-11-18 合并 `origin/main@f2bad40`（含 #29）后，编号由 REQ-030 / S31 顺延为 **REQ-033 / S34**；契约 / 迁移基线更新为 0.26.0 + V31，本 change 落定 0.30.0 + V34；G1 Decision / Conditions / Approvers 按内容不变沿用。
