# P2 规格记录 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **能力：** `trip-companions`（MODIFIED）+ `trip-plans`（MODIFIED）｜ **需求：** REQ-013
- **阶段：** P2（Spec align / G1）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把已批准的提案落成可判定的增量规格，完成 AC / DoV 复核与一致性检查，并在 G1 由 IO 与 SA 具名确认范围与冲突裁决。

## 2. 阶段产出

| 工件 | 路径 | 结果 |
|---|---|---|
| Delta Spec — `trip-companions` | [`specs/trip-companions/spec.md`](../../../openspec/changes/refine-trip-chat/specs/trip-companions/spec.md) | 3 Requirement / 21 Scenario（全部 MODIFIED） |
| Delta Spec — `trip-plans` | [`specs/trip-plans/spec.md`](../../../openspec/changes/refine-trip-chat/specs/trip-plans/spec.md) | 3 Requirement / 22 Scenario（2 MODIFIED + 1 ADDED） |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/refine-trip-chat/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、场景覆盖 25/25 |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/refine-trip-chat/consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4 |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/refine-trip-chat/g1-decision.md) | Pass（条件式，10 项条件与 owner） |
| 规格评审 | [`docs/reviews/20261116-refine-trip-chat-spec-review.md`](../../reviews/20261116-refine-trip-chat-spec-review.md)（第 1 次）、[`spec-review-2.md`](../../reviews/20261116-refine-trip-chat-spec-review-2.md)（错误码订正后重评） | 均为 Pass |
| 质量报告 | `docs/ai4se-plugins/<ts>-quality-checklist-report.md` | P2，见报告 |

## 3. Spec 覆盖摘要

| 能力 | Requirement | 类型 | 场景数 |
|---|---|---|---|
| `trip-companions` | 匹配后的一对一文字沟通 | MODIFIED | 11 |
| `trip-companions` | 退出同行 | MODIFIED | 5 |
| `trip-companions` | 我的旅行聚合与最低安全能力 | MODIFIED | 5 |
| `trip-plans` | 发布可被他人理解的旅行计划 | MODIFIED | 11 |
| `trip-plans` | 查看行程详情与清晰的状态 | MODIFIED | 6 |
| `trip-plans` | 发布者维护集合信息 | ADDED | 5 |

- **基线保留：** 5 个 MODIFIED 块原有场景 4 / 3 / 4 / 7 / 4 条全部保留。
- **命令证据：** `openspec validate refine-trip-chat --strict` → `Change 'refine-trip-chat' is valid`。

## 4. 关键裁定（P2 固化）

| 裁定 | 内容 |
|---|---|
| 聊天准入 | 发布者，或申请状态为「已接受 / 已退出」；其余（含仅 PENDING、被拒、取消、未申请）拒绝并说明 |
| 退出语义 | 退出记录为可追溯「已退出」，保留会话与读写；matched / joined 仍只认 `ACCEPTED`；「我申请的」新增「已退出」标签 |
| 集合时间 | 本地墙上时间、可空、日期部分不晚于结束日期（2026-11-16 订正：字段类错误 400、非发布者 403、已结束 409，不引入 422，见 `spec-review-2.md`） |
| 集合维护 | 仅发布者、仅集合区域与集合时间、仅招募中与已满员 |
| 会话列表 | 必须覆盖「已匹配但无消息」的会话，按最近消息倒序、无消息排末尾 |

## 5. 冲突记录（`@rule:rule-precedence`）

用户 2026-11-16 裁决「退出同行后仍可继续聊天」，与活规格 `trip-companions`「退出同行」的「关闭聊天」相反。按权威顺序第 1 层以用户指示为准；被降级的是活规格原文，Delta 以 MODIFIED 覆盖并在正文写明新旧差异。归档前需 SA（Jacky）与 IO（WAYNE）具名追认。

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | 需求来源与退出语义裁决确认 | 2026-11-16 |
| SA | Jacky | 六条需求与 25 场景映射、条件式 G1 通过 | 2026-11-16 |
| AO | Jay | 承担设计、实现与验证 | 2026-11-16 |

**阶段结论：Pass（G1 Pass 条件式）**

## 7. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | 待提交（`docs(p0): refine-trip-chat baseline stage and sign-off`） |
| P1 | 待提交（`docs(p1): refine-trip-chat proposal and intent record`） |
| P2 | 本条提交（`docs(p2): refine-trip-chat delta spec and g1 decision`） |

> 提交动作待用户确认后执行；提交信息按 `docs/sdd/README.md` 的 `p0`–`p4` 扩展，规则冲突已在 P1 记录。

## 8. 准入 P3 的条件

- 原型先行：集合时间与集合编辑入口先落到 `docs/prototype/`，并产出可评审预览。
- `design.md` 落实 G1 条件 C1–C4（`left` 枚举、`SafetyNote` 分工、原型先行、契约示例）。
- `atdd-design.md` 为 25 条场景给出 API / E2E 分层与夹具，`tasks.md` 任务一条只落一层。
