# P1 意图记录 — refine-trip-application

- **Change：** `refine-trip-application`（REQ-009 / S08 提交同行申请）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-trip-application`（独立 worktree，基于 `origin/main@b93f45b`）

## 1. 阶段目标

把「想加入的人留一句话申请加入行程」收敛为可判定的 REQ-009、影响面与 OpenSpec 提案；明确既有申请能力中「已存在」与「需补齐」的边界，避免重复实现后端规则。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-009-trip-application-entry.md`](../../requirement-workspace/intents/REQ-009-trip-application-entry.md) | 原始指令 / S08、现状核对、用户裁决 D1–D4、Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-009-trip-application-entry.md`](../../requirement-workspace/requirements/REQ-009-trip-application-entry.md) | 六字段 + 8 场景 + OQ + DoR（BLOCKER 0） |
| Deep-dive | [`deep-dive.md`「REQ-009 增补」](../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §13](../../requirement-workspace/impact-brief.md) | as-is→delta、blast radius、风险、拆分边界 |
| 提案 | [`proposal.md`](../../openspec/changes/refine-trip-application/proposal.md) | 问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | [`specs/trip-companions/spec.md`](../../openspec/changes/refine-trip-application/specs/trip-companions/spec.md) | MODIFIED「提交与取消同行申请」，1 Requirement / 8 Scenario |
| 质量报告 | [`docs/ai4se-plugins/20261116-115348-quality-checklist-report.md`](../../ai4se-plugins/20261116-115348-quality-checklist-report.md) | P1-1–P1-4 Pass；P1-5/P1-6 optional Skipped；Overall Pass |

## 3. 关键决策

- **入口：** 行程详情页内联申请区，替换现有弹窗；入口只在「他人 + 招募中 + 未满员 + 无 pending/accepted」展示。
- **说明：** 选填、≤120 字（用户裁决 D1）；留空生成 PENDING；不改后端校验与契约。
- **待处理态：** 严格按原型——等待回应提示 + 撤回申请（用户裁决 D2）；不使用字面「已申请，待处理」按钮。
- **重复申请：** 后端 `DUPLICATE_APPLICATION` → 前端「已申请，请等待回应」；不新增申请并刷新状态。
- **满员 / 已结束：** 入口不可用 + 「人数已满」/「行程已结束」；绕过前端时后端 409 `TRIP_NOT_OPEN`（现状已满足，保留回归）。
- **不改：** 后端实现、`openapi.yaml` 0.7.0、数据库迁移、原型文件；只改前端展示、文案与测试。
- **编号：** REQ-009 / `refine-trip-application`（用户裁决 D3）；`trip-companions`（MODIFIED）单 capability。

## 4. 校验

- `openspec validate refine-trip-application --strict` → `Change 'refine-trip-application' is valid`。
- `openspec status --change refine-trip-application` → `proposal` / `specs` 完成（2/4），`design` / `tasks` 属 P3。
- P1 质量检查 Overall Pass（required 4/4；无可阻断缺口）。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | P1 范围与排期确认（单 change、2 点、迭代 2） | 2026-11-16 |
| IO | Wanye | 需求来源与跨能力影响确认（仅 `trip-companions` MODIFIED，`trip-plans` 只读） | 2026-11-16 |
| AO | Jay | 承接 P2–P4 | 2026-11-16 |

**阶段结论：Pass**

## 6. 提交与偏离记录

- **阶段提交：** 用户当次明确要求「每个阶段一次提交，P4 之后推送；push 前先从远程更新代码，防止误删团队成员代码」。本阶段提交信息按 `docs/sdd/README.md` 使用 `docs(p1): refine-trip-application ...`；P1–P4 仅本地提交，P4 完成后先 `git pull` 再 push。
- **偏离：** 上述阶段提交做法偏离 Critical 规则 `@rule:git-commit-conventions`（一个 spec 只允许 verify / archive 两次提交）。以用户当次显式指示为准，偏离已在 `proposal.md` 残余风险与 `requirement-workspace/handoff.md` 记录。
- **范围偏离：** 无。S08 字面 AC「按钮变为已申请，待处理」被用户裁决 D2 覆盖为原型的等待提示 + 撤回；已在 REQ-009 §9 与 delta 场景中记录。
