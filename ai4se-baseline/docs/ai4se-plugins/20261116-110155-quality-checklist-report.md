# Quality Checklist Report: p2

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:\zha_training\RouteME\ai4se-baseline
**Stages:** p2
**Change:** `add-user-profile`（REQ-007）
**Focus:** full-stage

## Summary

### p2

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P2-1 | yes | Pass | `openspec/changes/add-user-profile/specs/user-profile/spec.md`（7 Requirement / 24 Scenario；ADDED）+ `specs/user-auth/spec.md`（1 Requirement / 6 Scenario；MODIFIED「注册账号」，保留全部 4 个基线场景）；`openspec validate add-user-profile --strict` = valid |
| P2-2 | yes | Pass | `openspec/changes/add-user-profile/dov-ac-review.md`（AC 4/4 Pass；DoV 5/5 Pass；REQ-007 17/17 场景映射；Living Spec 基线场景保留 4/4；无阻塞） |
| P2-3 | yes* | Pass | `openspec/changes/add-user-profile/g1-decision.md`（Pass；IO=Wanye，SA=Jacky/Karena；Conditions 9 项含 owner；双 capability 例外待 SA 具名追认） |
| P2-4 | no | Pass | `openspec/changes/add-user-profile/consistency-lint.md`（phase=p2；Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 6；CLI 校验通过） |

**Stage Overall:** Pass（4/4 项 Pass，含可选项 P2-4）

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages (p2) | Pass | 无 required Fail / Partial；一致性检查给出 Pass（6 条落地建议，其中迁移空值语义为 P3 must） |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| advisory | `consistency-lint.md` L-01：发布者展示新增头像 / 主页入口 / 摘要回退，但未给 `trip-plans` / `trip-experiences` 写 Delta | SA + AO | P3 `design.md` 声明展示契约归属，确认基线卡片 / 详情场景不被削弱 |
| advisory | `consistency-lint.md` L-02：昵称同时出现在注册与完善页，未声明单一来源 | AO | P3 `design.md` 声明 `app_users.nickname` 为唯一来源 |
| advisory | `consistency-lint.md` L-03：`DemoUser` 的 `avatar_initial` / `school` 与新头像 / 可空学校并存，0.7.0 兼容期未定 | AO + Dev | P3 / P4 定义新旧字段关系，契约 diff 进 PR |
| advisory | `consistency-lint.md` L-04：迁移给既有 `app_users` 加列，旧账号与演示账号的空值语义未声明 | AO | P3 任务让新列可空，完善状态派生把 NULL / 空串视为缺失，并补测试 |
| advisory | `consistency-lint.md` L-05：兴趣词表与行程标签不一致 | AO + BA | P3 `design.md` 定义别名 / 映射，不改匹配算法 |
| advisory | `consistency-lint.md` L-06：头像存储目录、文件名与访问路径未设计 | AO + Dev | P3 `design.md` 固定路径与命名，P4 补非法文件与越权测试 |
| gate condition | 双 capability（`user-profile` ADDED + `user-auth` MODIFIED）需 SA 具名追认 | SA | G1 记录后 / 归档前完成，写入归档摘要 |
| advisory | 未运行 `openspec validate --changes --strict` 的全绿基线 | — | 当前 `add-trip-publish`、`refine-inspiration-home` 因 `trip-plans` MODIFIED 遗漏基线场景失败；与本 change 无关，`add-user-profile` 单 change 与 6 份 Living Spec 均通过 |

## Notes

- Optional / not-run / out-of-focus items marked Skipped do not block Overall Pass；本阶段无可选项跳过。
- Overall aggregates in-focus required items only.
- This report is not a Gate decision.
- P2 期间为闭合追溯补了两个场景：「学校与专业拼接展示」「旅行方式只能单选」；均来自 REQ-007 §4 #7 / #9，未新增需求。
- P2 前已按用户裁决完成细化：学校由必填改为选填（D2 追加），新增选填「职业」（D6）；必填集合为昵称、生日、性别、所在城市、兴趣（≥3）、旅行方式。
- 双 capability 例外与 REQ-005 同口径：注册收窄是「注册 → 完善 → 主页」状态迁移的起点，拆成两个 change 会切断垂直切片；归档前需 SA 追认。
- G1 记录沿用 2026-11-15 / 2026-11-16 既有 G1 的具名角色名单；若名单变更需更新 `g1-decision.md`。
- P2 scope only：未产出 `design.md` / `tasks.md` / 业务代码 / 契约 / 迁移；实现属 P3 / P4。