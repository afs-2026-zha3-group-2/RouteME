# P2 规格记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-023 / 实时通知与未读计数）｜ **阶段：** P2（Proposal → Delta Spec）
- **日期：** 2026-11-17 ｜ **记录人：** Karena（当前开发者，已向发起人确认）
- **前置：** P1 提案与评审报告已签（`docs/reviews/20261117-add-realtime-notifications-proposal-review.md` §6，2026-11-17T16:38+0800）

## 1. 阶段目标

把提案的范围收成可判定的增量规格：每条 Requirement 用可观察结果陈述，26 条场景覆盖 REQ-023 §4 的全部条目，且不把 SSE、表名、类名等实现选择写进规格。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/notifications/spec.md`](../../../openspec/changes/add-realtime-notifications/specs/notifications/spec.md) | ADDED 6 Requirement / 26 Scenario |
| 规格评审 | [`20261117-add-realtime-notifications-spec-review.md`](../../reviews/20261117-add-realtime-notifications-spec-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（S-01 提示条未落场景、S-02 失败隔离只写在申请类、S-03 契约需回指 Requirement） |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/add-realtime-notifications/dov-ac-review.md) | AC 5/5、DoV 5/5、REQ 26/26 全覆盖 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-realtime-notifications/consistency-lint.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-realtime-notifications/g1-decision.md) | Pass（无条件；IO=WAYNE / SA=Karena，2026-11-17T16:48+0800） |
| 阶段记录 | 本文件 | G1 前的规格口径与校验 |

### Requirement ↔ 场景 ↔ 故事

| Requirement | 场景数 | 对应 REQ-023 §4 | 故事 |
|---|---|---|---|
| 申请与裁决产生持久化通知 | 5 | S23-1 ~ S23-4、S23-26 | S23-1 / S23-2 |
| 聊天消息产生通知 | 2 | S23-5、S23-6 | S23-5 |
| 未读计数与通知列表 | 4 | S23-7 ~ S23-10 | S23-3 |
| 实时投递 | 5 | S23-11 ~ S23-15 | S23-4 |
| 标读范围 | 5 | S23-16 ~ S23-20 | S23-3 |
| 壳层指示与直达 | 5 | S23-21 ~ S23-25 | S23-4 / S23-5 |

## 3. 规格口径

- **技术中立：** 规格只说「按用户的服务器推送通道」「未读计数由已读时间为空的记录派生」，不指定 `SseEmitter`、表名或端点路径；这些选择留给 P3。
- **可断言：** 每条场景都有可数结果（行数、计数拆分、3 秒窗口、恰好减一、0 徽标、≤900 px 同口径）。
- **不做的事：** 不改 `trip-companions` 的任何 Requirement（D1）；不写通知历史页、偏好、邮件 / OS 推送（提案 out-of-scope）。
- **待 P3 收口：** S-01 提示条、S-02 失败隔离在消息路径的断言、S-03 契约端点与 Requirement 的对照；以及契约 0.18.0 / 迁移 `V30` 的排他确认与 3 秒延迟的测量点。

## 4. 校验

- `openspec validate add-realtime-notifications --strict` → `Change 'add-realtime-notifications' is valid`。
- `openspec show add-realtime-notifications --json --deltas-only` → `deltaCount=6`、`spec=notifications`、`operation=ADDED`、场景合计 26。
- 本阶段无代码、无契约、无迁移变更，后端 / 前端测试沿用 P0 基线（434 / 344 全绿），不重跑。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta Spec 与提案一致（`notifications` ADDED；26 场景） | 2026-11-17 |
| AO | Karena | 承接 P3–P4 | 2026-11-17 |

**阶段结论：Pass**（Delta Spec 由 WAYNE 签；规格评审报告由 WAYNE + Karena 签，见 `docs/reviews/20261117-add-realtime-notifications-spec-review.md` §6，2026-11-17T16:44+0800）。G1 见 [`g1-decision.md`](../../../openspec/changes/add-realtime-notifications/g1-decision.md)。

## 6. 提交

- 阶段提交：`docs(p2): add-realtime-notifications delta spec and spec review`（Delta + 规格评审 + 本记录 + registry / handoff / 索引更新）。
- 同一提交携带 P1 的签署记录（`docs/reviews/20261117-add-realtime-notifications-proposal-review.md` §6、`docs/sdd/add-realtime-notifications/p1-intent.md` §5）：签署在 P1 提交之后才落笔，故与 P2 同批入库，避免对已推送的 P1 提交做 force-push。