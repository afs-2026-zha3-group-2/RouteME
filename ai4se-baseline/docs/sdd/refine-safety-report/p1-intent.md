# P1 意图记录 — refine-safety-report（rev2）

- **Change：** `refine-safety-report`（REQ-012 / S14 同行举报入口与回执）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）｜ **修订：** rev2（裁决 D5）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@294f487`（本地，未推送）

## 1. 阶段目标

把「与陌生人同行的学生在详情页与聊天页立刻找到求助入口」收敛为可判定的 REQ-012、影响面与 OpenSpec 提案；明确 `add-trip-companions` 已交付的举报底座，本需求只补页头入口、回执文案、本人行程边界与弹窗的两句边界说明。rev2 按裁决 D5 移除详情页 / 聊天页全部安全提示，避免重复实现后端规则，也避免页面继续承载已被撤回的文案。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-012-safety-report.md`](../../../requirement-workspace/intents/REQ-012-safety-report.md) | 原始指令 / S14、13 项现状核对、用户裁决 D1–D5（D1 被 D5 取代）、Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-012-safety-report.md`](../../../requirement-workspace/requirements/REQ-012-safety-report.md) | rev2：六字段 + 7 场景 + OQ（3 项非阻塞 deferred）+ DoR（BLOCKER 0） |
| Deep-dive | [`deep-dive.md`「REQ-012 增补」](../../../requirement-workspace/deep-dive.md) | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md` §15](../../../requirement-workspace/impact-brief.md) | as-is→delta、blast radius、artifact impact、风险、拆分边界 |
| 故事 | [`stories.md`「REQ-012（S14）」](../../../requirement-workspace/stories.md) + `docs/prototype/stories.html` S14 rev2 | S14 / 迭代 3 / P0 / 1 点 / 详情页 + 聊天页；AC 已按 D5 改写 |
| 登记与交接 | [`registry.md`](../../../requirement-workspace/registry.md)、[`handoff.md`](../../../requirement-workspace/handoff.md) | REQ-012 行、编号说明、REQ → change 映射、共享分析覆盖范围 |
| 提案 | [`proposal.md`](../../../openspec/changes/refine-safety-report/proposal.md) | rev2：问题 / 范围 ①–⑧ / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-safety-report/specs/trip-companions/spec.md) | rev2：REMOVED 1 + ADDED 1，9 Scenario（3 基线迁移 + 6 新增）；`validate --strict` valid |
| 设计预览 | [`preview/safety-report.html`](../../../openspec/changes/refine-safety-report/preview/safety-report.html) | A / B / C 三种入口位置 + 对照形态；用户选定 B · 页头右上 |
| 工件评审 | [`proposal-review-2`](../../reviews/20261116-refine-safety-report-proposal-review-2.md)、[`spec-review-2`](../../reviews/20261116-refine-safety-report-spec-review-2.md) | rev2 均 Pass，Jacky（AO）2026-11-16T16:35 批准；rev1 两份报告保留并标注作废 |
| 质量报告 | [`20261116-154500-quality-checklist-report.md`](../../ai4se-plugins/20261116-154500-quality-checklist-report.md) | rev1：P1-1–P1-4 Pass；rev2 待复核 |

## 3. 关键决策

- **安全提示（D5，取代 D1）：** 详情页三条文本提示与聊天页一行提示**整块移除**；`meeting_area` 仍在既有「集合」事实行展示，不再有专门的安全提示回退文案。
- **举报入口位置（D5）：** 详情页页头右上（与状态标签同一行）、聊天页页头右上（头像对侧）；窄屏换行，不得隐藏或折叠进菜单；入口为文本按钮，不只靠颜色 / 图标表达。
- **举报原因（D2）：** 沿用 `ReportRequest.reason` 四值（harassment / fake / safety / other），不扩枚举、不升契约、不改后端校验。
- **本人行程入口（D3）：** 详情页「举报这条行程」仅在他人行程渲染，本人行程页面同时不展示安全提示；聊天页「举报这位用户」常驻（含已结束只读聊天）。
- **回执文案：** 固定「已收到，我们会处理」，由前端 `tripMessages` 决定，后端 `POST /api/reports` 与 `ReportReceipt` 不变。
- **边界说明：** 举报弹窗补「我们不会向对方透露你的身份」与「如果你正处于危险中，请先联系当地警方或学校保卫处。平台举报不能替代紧急求助。」
- **不改：** 后端实现、`openapi.yaml` 0.8.1、数据库迁移；只改前端展示、文案与测试。体验发布页（`ShareExperiencePage`）的「发布前提醒」保持现状，不出现举报按钮。
- **编号（D4 修正）：** 起草时为 REQ-011；同日 `main` 已把 S15 结束行程登记为 REQ-011（`add-trip-completion`），按「后到者顺延」改为 **REQ-012**；`trip-companions` 以 REMOVED + ADDED 落 delta。

## 4. 校验

- `openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`。
- Delta 结构（rev2）：`## REMOVED Requirements` 1 块（我的旅行聚合与最低安全能力，含 Reason / Migration）+ `## ADDED Requirements` 1 块（同行举报入口与回执）。
- Delta 场景数 9：`分区展示我的旅行`、`待处理申请提醒`（基线迁移）、`详情页页头举报入口`、`聊天页页头举报入口`、`举报弹窗内容`、`本人行程不出现举报入口`、`提交举报并收到回执`（基线迁移）、`提交失败可读且可重试`、`举报弹窗不展示隐私字段`。
- 基线迁移：Living Spec 4 场景中保留 3、移除 1（`安全提示常驻`，按 D5 有意删除）；`openspec show --json` → `deltaCount: 2`。
- P1 质量检查 rev1 Overall Pass（required 4/4）；rev2 待复核。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jacky | P1 工件评审批准（rev1 proposal / spec 均 Pass）与承接 P2–P4；rev2 待批准 | 2026-11-16 |
| IO | 待确认 | 需求来源与跨能力影响确认（`trip-companions` REMOVED + ADDED，`trip-plans` 只读） | 待签署 |
| SA | 待确认 | 举报口径、提示移除与回归范围确认（rev2） | 待签署 |
| SM | 待确认 | P1 范围与排期确认（单 change、1 点、迭代 3） | 待签署 |

**阶段结论：rev1 Pass（required 4/4）；rev2 待复核。** 下一步按 `@rule:artifact-review-gate` 重审 proposal / spec，再走 G1 重签。

## 6. 提交与偏离记录

- **阶段提交：** 按 `docs/sdd/README.md` 使用 `docs(p1): refine-safety-report ...`；按用户当次指示**只本地提交、不 push**（本地 `main` 还包含并行会话未推送的提交 `294f487`，由该会话决定发布时机）。
- **冲突处理：** `deep-dive.md` / `impact-brief.md` 在并行会话的 stash 恢复中曾进入 `UU` 冲突态；本次按「两边都保留」重建——S15（REQ-011）增补原样保留，本需求增补改名 REQ-012 后追加，校验为纯新增 diff。
- **编号偏离：** D4 原定 REQ-011，因同日撞号改为 REQ-012，已在意图 / Ready 条目 / registry / handoff / stories / 提案中同步。
- **范围偏离（rev2）：** 裁决 D5 撤回 rev1 的三条提示与聊天一行提示，S14 故事 AC 与 REQ-012 §1–§9 同步改写；Delta 由 MODIFIED 改为 REMOVED + ADDED。rev2 属实质性范围变更，需重新走工件评审与 G1 重签，不能复用 rev1 的 `Pass`。