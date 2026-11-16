# P1 意图记录 — refine-safety-report

- **Change：** `refine-safety-report`（REQ-012 / S14 同行安全提示与举报）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@294f487`（本地，未推送）

## 1. 阶段目标

把「与陌生人同行的学生看到基本安全边界与求助入口」收敛为可判定的 REQ-012、影响面与 OpenSpec 提案；明确 `add-trip-companions` 已交付的举报底座与本需求只补的展示口径（三条提示、回执文案、本人行程入口、身份保密与紧急求助说明），避免重复实现后端规则。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-012-safety-report.md`](../../../requirement-workspace/intents/REQ-012-safety-report.md) | 原始指令 / S14、13 项现状核对、用户裁决 D1–D4、Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-012-safety-report.md`](../../../requirement-workspace/requirements/REQ-012-safety-report.md) | 六字段 + 7 场景 + OQ（3 项非阻塞 deferred）+ DoR（BLOCKER 0） |
| Deep-dive | [`deep-dive.md`「REQ-012 增补」](../../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §15](../../../requirement-workspace/impact-brief.md) | as-is→delta、blast radius、artifact impact、风险、拆分边界 |
| 故事 | [`stories.md`「REQ-012（S14）」](../../../requirement-workspace/stories.md) | S14 / 迭代 3 / P0 / 1 点 / 详情页 + 聊天页；无独立故事文件 |
| 登记与交接 | [`registry.md`](../../../requirement-workspace/registry.md)、[`handoff.md`](../../../requirement-workspace/handoff.md) | REQ-012 行、编号说明、REQ → change 映射、共享分析覆盖范围 |
| 提案 | [`proposal.md`](../../../openspec/changes/refine-safety-report/proposal.md) | 问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-safety-report/specs/trip-companions/spec.md) | MODIFIED「我的旅行聚合与最低安全能力」，1 Requirement / 9 Scenario（保留 3 个基线名 + 新增 6） |
| 工件评审 | [`proposal-review`](../../reviews/20261116-refine-safety-report-proposal-review.md)、[`spec-review`](../../reviews/20261116-refine-safety-report-spec-review.md) | 均 Pass，无 BLOCKER；已由 Jacky 批准 |
| 质量报告 | [`20261116-154500-quality-checklist-report.md`](../../ai4se-plugins/20261116-154500-quality-checklist-report.md) | P1-1–P1-4 Pass；P1-5/P1-6 optional Skipped；Overall Pass |

## 3. 关键决策

- **安全提示形态（D1）：** 详情页按原型三条文本列表（公共场所 + 本行程集合区域 / 告知亲友并约定报平安 / 不公开电话证件住址并拒绝转账或索要证件）；聊天页一行同义提示（含集合区域或「待确认」）。集合区域复用 `trip-plans.meeting_area`，空值时按页面语境回退。
- **举报原因（D2）：** 沿用 `ReportRequest.reason` 四值（harassment / fake / safety / other），不扩枚举、不升契约、不改后端校验。
- **本人行程入口（D3）：** 详情页「举报这条行程」仅在他人行程渲染；安全提示照常展示。聊天页「举报这位用户」常驻（含已结束只读聊天）。
- **回执文案：** 固定「已收到，我们会处理」，由前端 `tripMessages` 决定，后端 `POST /api/reports` 与 `ReportReceipt` 不变。
- **边界说明：** 举报弹窗补「我们不会向对方透露你的身份」与「如果你正处于危险中，请先联系当地警方或学校保卫处。平台举报不能替代紧急求助。」
- **不改：** 后端实现、`openapi.yaml` 0.8.1、数据库迁移、原型文件；只改前端展示、文案与测试。`SafetyNote` 需保留体验发布页（`ShareExperiencePage`）无举报按钮的简化调用。
- **编号（D4 修正）：** 起草时为 REQ-011；同日 `main` 已把 S15 结束行程登记为 REQ-011（`add-trip-completion`），按「后到者顺延」改为 **REQ-012**；`trip-companions`（MODIFIED）单 capability。

## 4. 校验

- `openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`。
- Delta 场景数 9：`分区展示我的旅行`、`待处理申请提醒`、`安全提示常驻`（内容收敛为三条文本）、`聊天页展示安全提示`、`举报入口与举报对象`、`本人行程不出现举报入口`、`提交举报并收到回执`、`提交失败可读且可重试`、`安全区不展示隐私字段`。
- Living Spec 基线场景名全部保留（校验器要求 MODIFIED 不得丢弃既有场景名）。
- P1 质量检查 Overall Pass（required 4/4）。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jacky | P1 工件评审批准（proposal / spec 均 Pass）与承接 P2–P4 | 2026-11-16 |
| IO | 待确认 | 需求来源与跨能力影响确认（`trip-companions` MODIFIED，`trip-plans` 只读） | 待签署 |
| SA | 待确认 | 安全提示 / 举报口径与回归范围确认 | 待签署 |
| SM | 待确认 | P1 范围与排期确认（单 change、1 点、迭代 3） | 待签署 |

**阶段结论：Pass（required 4/4；非 Gate 决策）。** 下一步 P2 `/sdd:delta-craft` → AC/DoV 复核 → G1。

## 6. 提交与偏离记录

- **阶段提交：** 按 `docs/sdd/README.md` 使用 `docs(p1): refine-safety-report ...`；按用户当次指示**只本地提交、不 push**（本地 `main` 还包含并行会话未推送的提交 `294f487`，由该会话决定发布时机）。
- **冲突处理：** `deep-dive.md` / `impact-brief.md` 在并行会话的 stash 恢复中曾进入 `UU` 冲突态；本次按「两边都保留」重建——S15（REQ-011）增补原样保留，本需求增补改名 REQ-012 后追加，校验为纯新增 diff。
- **编号偏离：** D4 原定 REQ-011，因同日撞号改为 REQ-012，已在意图 / Ready 条目 / registry / handoff / stories / 提案中同步。
- **范围偏离：** 无。故事 3 条 AC 全部落入场景，仅「举报原因按目标类型分表」按用户裁决 D2 记为后续候选（out of scope）。