# G1 决策 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（`notifications` ADDED，REQ-023 / 实时通知与未读计数）
- **阶段：** P2 → P3 的准入决策（Proposal + Delta Spec 通过后进入设计）
- **Decision：** **Pass**（无条件）
- **Timestamp：** 2026-11-17T16:48+0800

## 1. 决策

Delta Spec `openspec/changes/add-realtime-notifications/specs/notifications/spec.md`（ADDED 6 Requirement / 26 Scenario）与提案、REQ-023、5 条故事一致，AC 覆盖 26/26，DoV 5/5，一致性检查 0 BLOCKER / 0 WARNING。准予进入 P3（`design.md` / `atdd-design.md` / `tasks.md`）。

## 2. 证据

| 类别 | 路径 | 结论 |
|---|---|---|
| 提案 | `openspec/changes/add-realtime-notifications/proposal.md` | P1 评审 Pass（`docs/reviews/20261117-add-realtime-notifications-proposal-review.md`，WAYNE 签） |
| Delta Spec | `openspec/changes/add-realtime-notifications/specs/notifications/spec.md` | `openspec validate --strict` = valid；`deltaCount=6`；26 场景 |
| AC / DoV | `openspec/changes/add-realtime-notifications/dov-ac-review.md` | AC 5/5、DoV 5/5、REQ 26/26 |
| 一致性 | `openspec/changes/add-realtime-notifications/consistency-lint.md` | Pass（0 BLOCKER / 0 WARNING / 3 SUGGESTION） |
| 规格评审 | `docs/reviews/20261117-add-realtime-notifications-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 3 SUGGESTION），WAYNE + Karena 签 |
| 阶段记录 | `docs/sdd/add-realtime-notifications/p2-spec.md` | Pass |
| 基线 | `docs/sdd/add-realtime-notifications/p0-baseline.md` | 后端 434 / 前端 344 全绿 |

## 3. 带条件进入 P3 的事项（非阻断）

| id | 事项 | P3 落点 |
|---|---|---|
| L-01 / S-01 | 「短提示（D14）」尚未有 Delta 场景 | `design.md` 定触发条件与断言口径；`tasks.md` + E2E 落一条 |
| L-02 / S-02 | 失败隔离只写在申请类 Requirement | `design.md` 写成跨生产方约束；消息路径补反向断言 |
| L-03 / S-03 | 契约增量需回指 Requirement | `design.md` 出「端点 → Requirement → 场景」对照表 |
| D12 | 契约 0.18.0 / 迁移 `V24` 的排他性 | P3 用 `grep` 复核后写进 `design.md` |
| 测量点 | 「3 秒内」的测量口径 | `design.md` 固定「服务端写入完成 → 客户端 store 更新」 |

## 4. 不在本决策内

- 实现、契约、迁移、验证（P4）。
- Living Spec 合并与归档（P5）。
- 真实鉴权、通知历史 / 偏好、邮件 / OS 推送（提案 Out of scope）。

## 5. 签署

| 角色 | 姓名 | 结论 | 时间 |
|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-17T16:48+0800 |
| SA | Karena | Pass | 2026-11-17T16:48+0800 |
| AO | Karena | 承接 P3–P4 | 2026-11-17T16:48+0800 |

- G1 由 IO + SA 签署（`docs/sdd/README.md`「阶段与产出」）；本记录只记录已发生的裁定，不预填结论。