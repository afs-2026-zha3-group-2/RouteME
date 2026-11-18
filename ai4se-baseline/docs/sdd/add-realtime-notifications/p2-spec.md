# P2 规格记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-031 / 实时通知中心与未读计数）｜ **阶段：** P2（Proposal → Delta Spec）
- **日期：** 2026-11-17（首版）；2026-11-18（八类扩围） ｜ **记录人：** Karena（当前开发者，已向发起人确认）
- **前置：** P1 提案与评审报告已签（`docs/reviews/20261117-add-realtime-notifications-proposal-review.md` §6，2026-11-17T16:38+0800）；扩围见 `docs/reviews/20261118-add-realtime-notifications-expansion-review.md`

## 1. 阶段目标

把提案的范围收成可判定的增量规格：每条 Requirement 用可观察结果陈述，场景覆盖 REQ-031 §4 的全部条目，且不把 SSE、表名、类名、端点路径等实现选择写进规格。

首版收成 6 Requirement / 26 Scenario（三类事件）；扩围后收成 **8 Requirement / 36 Scenario**（八类事件 + 通知中心 + 计数与标读 + 实时与失败隔离）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | [`specs/notifications/spec.md`](../../../openspec/changes/add-realtime-notifications/specs/notifications/spec.md) | ADDED 8 Requirement / 36 Scenario |
| 规格评审 | [`20261117-add-realtime-notifications-spec-review.md`](../../reviews/20261117-add-realtime-notifications-spec-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（S-01 提示条未落场景、S-02 失败隔离只写在申请类、S-03 契约需回指 Requirement） |
| 扩围复核 | [`20261118-add-realtime-notifications-expansion-review.md`](../../reviews/20261118-add-realtime-notifications-expansion-review.md) | Pass；0 BLOCKER / 0 WARNING / 2 SUGGESTION（均已收口） |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/add-realtime-notifications/dov-ac-review.md) | AC 6/6、DoV 5/5、REQ 36/36 全覆盖 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-realtime-notifications/consistency-lint.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（均已在 P3 收口） |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-realtime-notifications/g1-decision.md) | Pass（无条件；IO=WAYNE / SA=Karena，2026-11-17T16:48+0800；扩围沿用） |
| 阶段记录 | 本文件 | G1 前的规格口径与校验 |

### Requirement ↔ 场景 ↔ 故事

| Requirement | 场景 | 对应 REQ-031 §4 | 故事 |
|---|---|---|---|
| 通知记录、类型与生命周期 | S32-1 ~ S32-4 | S32-1 ~ S32-4 | S32-1 |
| 行程生命周期事件 | S32-5 ~ S32-8 | S32-5 ~ S32-8 | S32-2 |
| 申请与裁决事件 | S32-9 ~ S32-12 | S32-9 ~ S32-12 | S32-3 |
| 聊天、信用、举报与账号事件 | S32-13 ~ S32-17 | S32-13 ~ S32-17 | S32-4 / S32-5 |
| 客服与系统事件 | S32-18 ~ S32-20 | S32-18 ~ S32-20 | S32-5 |
| 通知中心与跳转 | S32-21 ~ S32-24 | S32-21 ~ S32-24 | S32-6 |
| 未读计数与标读规则 | S32-25 ~ S32-32 | S32-25 ~ S32-32 | S32-7 |
| 实时投递与失败隔离 | S32-33 ~ S32-36 | S32-33 ~ S32-36 | S32-8 |

## 3. 规格口径

- **技术中立：** 规格只说「按用户的服务器推送通道」「未读计数由已读时间为空的记录派生」「后端下发的目标」，不指定 `SseEmitter`、表名、端点路径或组件名；这些选择留给 P3。
- **可断言：** 每条场景都有可观察结果（行数、`by_type` 八项、3 秒窗口、恰好减一、0 徽标、跳转 URL、不可用提示）。
- **八类完整性：** 类型枚举固定为八个大写值，事件为 snake_case；计数响应的八个键恒出现，零值不省略。
- **只增不删：** 业务状态变化不得删除既有通知；标读不得改写业务状态。
- **不做的事：** 不改 `trip-companions` 的任何 Requirement（D1）；不写偏好、搜索、保留策略、邮件 / OS 推送（提案 out-of-scope）。
- **P3 收口：** S-01 提示条、S-02 失败隔离跨生产方、S-03 契约端点与 Requirement 对照；契约 0.27.0 / 迁移 `V32__add_notifications.sql` 的排他确认与 3 秒延迟的测量点。

## 4. 校验

- `openspec validate add-realtime-notifications --strict` → `Change 'add-realtime-notifications' is valid`。
- Delta 结构：`spec=notifications`、`operation=ADDED`、8 个 Requirement、36 个 Scenario，场景编号 S32-1 ~ S32-36 与 REQ-031 §4 一一对应。
- 本阶段无代码、无契约、无迁移变更，后端 / 前端测试沿用 P0 基线（434 / 344 全绿），不重跑。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | Delta Spec 与提案一致（`notifications` ADDED；36 场景） | 2026-11-17 / 2026-11-18 |
| AO | Karena | 承接 P3–P4 | 2026-11-17 |

**阶段结论：Pass**（Delta Spec 由 WAYNE 签；规格评审报告由 WAYNE + Karena 签，见 `docs/reviews/20261117-add-realtime-notifications-spec-review.md` §6，2026-11-17T16:44+0800；扩围复核见 `docs/reviews/20261118-add-realtime-notifications-expansion-review.md` §6）。G1 见 [`g1-decision.md`](../../../openspec/changes/add-realtime-notifications/g1-decision.md)。

## 6. 提交

- 阶段提交：`docs(p2): add-realtime-notifications delta spec and spec review`（Delta + 规格评审 + 本记录 + registry / handoff / 索引更新）。
- 扩围改写与 P3 / P4 的文档同步随实现分支一并提交，不单独 force-push 既有提交。