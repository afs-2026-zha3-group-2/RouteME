# G1 decision — refine-service-close

- **Change id:** `refine-service-close`
- **Gate:** G1（Align）
- **Timestamp:** 2026-11-18（P2 末；IO + SA 当次会话签署）
- **Decision:** **Pass（无条件）**

> 本记录按 `docs/sdd/README.md` 的签署矩阵由 IO + SA 具名签署；C1–C5 为 P3–P4 跟踪项，不是 G1 附加条件。

## Input artifacts

| 工件 | 路径 | 结论 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-028-service-close.md` | 36 场景；blocking OQ 0；DoR BLOCKER 0 / WARNING 1 |
| 意图捕获 | `requirement-workspace/intents/REQ-028-service-close.md` | 原始意图、D1–D9、现状核对表 |
| 提案 | `openspec/changes/refine-service-close/proposal.md` | Why / What / Out of Scope / 决策 D1–D9 / 验收信号 / 取代声明 |
| Delta Spec | `openspec/changes/refine-service-close/specs/customer-service/spec.md` | ADDED 3 Requirement / 30 Scenario；`validate --strict` valid |
| AC / DoV 复核 | `openspec/changes/refine-service-close/dov-ac-review.md` | AC 4/4 Pass；DoV 5/5 Pass；映射 36/36 |
| 一致性检查 | `openspec/changes/refine-service-close/consistency-lint.md` | Pass（BLOCKER 0 / WARNING 1 已收口 / SUGGESTION 5 / N/A 6） |
| 工件评审（提案） | `docs/reviews/20261118-refine-service-close-proposal-review.md` | Pass（0 BLOCKER / 1 WARNING 已收口 / 4 SUGGESTION）；WAYNE + Lewis Liu 已签 |
| 工件评审（Delta） | `docs/reviews/20261118-refine-service-close-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION）；WAYNE + Lewis Liu 已签 |
| 阶段记录 | `docs/sdd/refine-service-close/p0-baseline.md`、`p1-intent.md` | P0 / P1 齐备 |

## Findings

| 维度 | 结论 | 说明 |
|---|---|---|
| Scope | Pass | 单一能力 `customer-service`（ADDED）；proposal §What Changes 7 条 ↔ Delta 3 Requirement；Out of Scope 6 条无对应 Requirement。用户结束三态、客服标记完成、待确认回迁、管理端下线、契约 / 迁移全部落位。 |
| Ambiguity | Pass | blocking 0；D1–D9 全部具名裁定。non-blocking：OQ-1（客服发言回迁）已按对称口径落成 M-2；OQ-2（用户端是否展示标记人）默认不展示并写成 MUST NOT；OQ-3 / OQ-4 / OQ-6 为 P3 的号位与文案。 |
| Conflict | Pass | 与 `add-admin-console` 的「用户 MUST NOT 自行关闭会话」有意翻转，已在 proposal 取代声明与 `deep-dive.md` 跨 REQ 表记录；与 `refine-service-workbench-live` / `refine-service-inbox-unread` / `refine-user-support-entry` 无冲突。Delta 内部四态闭集与消息回迁不矛盾。 |
| Baseline | N/A | 纯 ADDED，未覆盖已归档 Requirement。**但** `customer-service` Living Spec 尚不存在；归档顺序 MUST 为 `add-admin-console` → `refine-service-close`，并与其后 `refine-service-*` 增量协调。 |

## Conditions + owners

**无 G1 附加条件。** 以下 C1–C5 为 P3–P4 跟踪项：

| 跟踪项 | 说明 | Owner |
|---|---|---|
| C1 归档顺序 | 本 change MUST 排在 `add-admin-console` 之后归档；P5 把「用户结束取代客服结束」写入 Living Spec Requirement 正文 | Dev / SA |
| C2 契约与迁移号 | P3 先查 `origin/main` 最大迁移号与 `openapi.yaml` 版本，再定稿（暂定 0.25.0 + V30） | Dev |
| C3 文案与排序 | P3 定稿结束确认文案与 `RESOLVED` 在队列中的排序位置 | IO / SA |
| C4 E2E 改写 | P4 必须改写 `customer-service.spec.ts` `[C3]` 与 `admin.spec.ts` `[I3]` | Dev |
| C5 issue 缺陷处置 | 「客服点击结束会话没反应」不单独修复；交付说明重申按钮与接口已删除 | Dev |

## Approvers

| 角色 | 姓名 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|
| IO | WAYNE | 2026-11-18 | 发起人当次会话确认「批准 G1」 | Delta Spec 与 G1 结论 |
| SA | Jacky | 2026-11-18 | 发起人当次会话确认「批准 G1」 | Delta Spec 与 G1 结论（含 C1–C5 跟踪项） |

## Notes

- G1 = Pass（无条件）；C1–C5 不阻断推进，带入 P3 `design.md` / `tasks.md` 与 P4 验证。
- 质量检查报告与阶段记录见 `docs/ai4se-plugins/20261118-102457-quality-checklist-report.md` 与 `docs/sdd/refine-service-close/p2-spec.md`。
