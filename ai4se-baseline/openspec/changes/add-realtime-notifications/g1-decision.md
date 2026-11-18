# G1 决策 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（`notifications` ADDED，REQ-029 / 实时通知中心与未读计数）
- **阶段：** P2 → P3 的准入决策（Proposal + Delta Spec 通过后进入设计）
- **Decision：** **Pass**（无条件）
- **Timestamp：** 2026-11-17T16:48+0800；2026-11-18 扩围复核（同一 change，不另开 PR）

## 1. 决策

Delta Spec `openspec/changes/add-realtime-notifications/specs/notifications/spec.md`（ADDED 8 Requirement / 36 Scenario）与提案、REQ-029、8 条故事一致，AC 覆盖 36/36，DoV 5/5，一致性检查 0 BLOCKER / 0 WARNING。准予进入 P3（`design.md` / `atdd-design.md` / `tasks.md`）。

2026-11-18 发起人要求把范围从「三类事件的提示」扩展为「八类业务事件的完整通知中心」。扩围后重新执行 AC / DoV / 一致性检查，结论仍为 Pass；扩围过程记录在 `proposal.md`「变更历史」、`dov-ac-review.md` AC-6 与 `p4-implementation.md`。

## 2. 证据

| 类别 | 路径 | 结论 |
|---|---|---|
| 提案 | `openspec/changes/add-realtime-notifications/proposal.md` | P1 评审 Pass（`docs/reviews/20261117-add-realtime-notifications-proposal-review.md`，WAYNE 签）；2026-11-18 扩围改写 |
| Delta Spec | `openspec/changes/add-realtime-notifications/specs/notifications/spec.md` | `openspec validate --strict` = valid；8 Requirement / 36 Scenario |
| AC / DoV | `openspec/changes/add-realtime-notifications/dov-ac-review.md` | AC 6/6、DoV 5/5、REQ 36/36 |
| 一致性 | `openspec/changes/add-realtime-notifications/consistency-lint.md` | Pass（0 BLOCKER / 0 WARNING / 3 SUGGESTION，均已收口） |
| 规格评审 | `docs/reviews/20261117-add-realtime-notifications-spec-review.md` + `docs/reviews/20261118-add-realtime-notifications-expansion-review.md` | Pass；扩围复核 0 BLOCKER / 0 WARNING |
| 阶段记录 | `docs/sdd/add-realtime-notifications/p2-spec.md` | Pass |
| 基线 | `docs/sdd/add-realtime-notifications/p0-baseline.md` | 后端 434 / 前端 344 全绿（合并 `main@357f5e2` 前的基线） |

## 3. 带条件进入 P3 的事项（非阻断）

| id | 事项 | P3 落点 |
|---|---|---|
| L-01 / S-01 | 「短提示（D14）」尚未有 Delta 场景 | `design.md` §6.1 / §6.5 定触发条件与断言口径；`tasks.md` T13 + E2E M8 |
| L-02 / S-02 | 失败隔离只写在申请类 Requirement | Delta S30-36 扩展为八类生产方；`design.md` §5.2；`NotificationFailureIsolationTest` |
| L-03 / S-03 | 契约增量需回指 Requirement | `design.md` §7 出「端点 → Requirement → 场景」对照表 |
| D12 | 契约 0.26.0 / 迁移 `V31__add_notifications.sql` 的排他性 | P3 用 `grep` 复核后写进 `design.md` §3 |
| 测量点 | 「3 秒内」的测量口径 | `design.md` §5.7 固定「生产方响应返回 → 客户端徽标更新」 |
| 扩围 | 八类事件、通知中心页、目标跳转、优先级、去重 | `proposal.md` D1–D18；`design.md` §5 – §6；`tasks.md` T1–T16 |

## 4. 不在本决策内

- 实现、契约、迁移、验证（P4）。
- Living Spec 合并与归档（P5）。
- 真实鉴权、通知偏好 / 搜索 / 保留策略、邮件 / OS 推送（提案 Out of scope）。
- 深色主题走查（壳层主题切换已由 `main@357f5e2` 移除，证据只保留浅色三档）。

## 5. 签署

| 角色 | 姓名 | 结论 | 时间 |
|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-17T16:48+0800 |
| SA | Karena | Pass | 2026-11-17T16:48+0800 |
| AO | Karena | 承接 P3–P4 | 2026-11-17T16:48+0800 |

- G1 由 IO + SA 签署（`docs/sdd/README.md`「阶段与产出」）；本记录只记录已发生的裁定，不预填结论。
- 2026-11-18 的扩围由发起人直接指示，沿用同一 G1 结论；扩围后的规格复核见 §2 的 expansion review。