# G1 decision — refine-trip-chat

- **Gate:** G1（Align）
- **Change:** `refine-trip-chat`（`trip-companions` MODIFIED + `trip-plans` MODIFIED，REQ-013）
- **Timestamp:** 2026-11-16T15:45+0800
- **Recorded by:** Qoder（AI agent），按 Jay（AO / current developer）2026-11-16「批准，进入 P2」指令记录；用户同次确认名册 SM=Lewis / AO=Jay / IO=WAYNE / SA=Jacky / VL=Neal

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、关键裁定与冲突裁决齐全；双 capability 已声明 |
| Delta Spec — `trip-companions` | [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md) | 3 Requirement / 21 Scenario（全部 MODIFIED）；`openspec validate refine-trip-chat --strict` valid |
| Delta Spec — `trip-plans` | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 3 Requirement / 22 Scenario（2 MODIFIED + 1 ADDED）；同上 valid |
| Living Spec baseline | `openspec/specs/trip-companions/spec.md`、`openspec/specs/trip-plans/spec.md` | 5 个 MODIFIED 同名块存在；基线场景 4/3/4/7/4 全部保留 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；场景覆盖 25/25 |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 4 |
| Requirements | `requirement-workspace/requirements/REQ-013-trip-chat-meeting.md` | §4 25 条场景；§8 blocking OQ = 0；DoR BLOCKER = 0 |
| Intent | `requirement-workspace/intents/REQ-013-trip-chat-meeting.md` | Discovery Decision `Go`；含用户裁决表 |
| Stories | `requirement-workspace/stories/refine-trip-chat.story.md` | S12-1～S12-4，与 25 场景可追溯 |
| Impact brief | `requirement-workspace/impact-brief.md` §13 | as-is 盘点、逐资产 delta、blast radius、风险与拆分边界 |
| Prototype evidence | `docs/prototype/ui.js` `chat()` / `mine()` / `tripDetail()` / `tripForm()`；`styles.css` `.chat-*` | 聊天页视觉与交互基准；集合时间与集合编辑入口待补原型 |
| Implementation evidence | `ChatServiceImpl`、`ChatMessageMapper.xml`、`ApplicationServiceImpl#leave`、`MyTripsServiceImpl`、`UserProfileStatsServiceImpl`、`frontend/src/chat/ChatPage.tsx` | 准入只认 `ACCEPTED`；会话列表只按消息聚合；退出置 `CANCELLED`；matched/joined 只认 `isAccepted` |
| Contract evidence | `RouteME/openapi.yaml` v0.8.0 | `meeting_area` 已有、无 `meeting_time`、申请状态四值、无集合更新端点 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-013 一致：聊天页两栏重构、准入与退出语义、集合时间字段与三处展示、发布者维护集合信息；不含完整行程编辑与实时能力 | `proposal.md` §范围；`dov-ac-review.md` DoV-1；`consistency-lint.md` p2-1 |
| Ambiguity | 无未决歧义：左栏无消息排序、退出后标签、集合时间语义（本地墙上时间、日期部分 ≤ 结束日期）、400/422 口径均已写死 | `dov-ac-review.md` DoV-2；`specs/trip-plans/spec.md` |
| Conflict | 存在一处**已裁决的规格冲突**：用户要求「退出同行后仍可继续聊天」，与活规格「退出即关闭聊天」相反；按 `@rule:rule-precedence` 第 1 层以用户指示为准，Delta 用 MODIFIED 覆盖两条需求并写明新旧差异 | `proposal.md` §关键裁定「冲突裁决」；`specs/trip-companions/spec.md` |
| Traceability | REQ-013 §4 25 条 25/25 有 Delta 落点；基线场景 22 条全部保留；故事 4 条与场景组一一对应 | `dov-ac-review.md` §3；`consistency-lint.md` S7 |
| Residual risk | 退出语义变更需 SA 追认；双 capability 需追认；会话列表补齐涉及后端组合逻辑；原型缺集合时间与编辑入口 | `dov-ac-review.md` §4；`consistency-lint.md` §Residual risks |

## Decision

**Pass（条件式）**

理由：范围与 REQ-013 一致，25 条场景全部可判定且有落点，基线场景零丢失，`openspec validate --strict` 通过；唯一高风险项（退出语义）已在提案与 Delta 写明并按规则记录冲突，只剩具名追认与实现期约束。

## Conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 统一「已退出」状态：契约枚举小写 `left`，后端 `ApplicationStatusEnum.LEFT`，前端标签「已退出」（lint L-02） | AO（Jay） | P3 `design.md` + P4 |
| 明确详情页 `SafetyNote` 与聊天页集合安全条不叠加渲染（lint L-04） | AO（Jay） | P3 `design.md` |
| 原型先行：集合时间（发布表单 / 详情 / 聊天安全条 / 我的旅行）与集合编辑入口先落 `docs/prototype/`，并出评审预览 | AO（Jay） | P3 |
| 契约：`meeting_time` 标注 local wall-clock 无时区；集合更新端点带 success + 400 + 422 示例（proposal S-1/S-2） | AO（Jay） | P3 `tasks.md` / P4 |
| 会话列表补齐需单测：无消息的已匹配配对也返回，且排序稳定 | AO（Jay） | P4 |
| E2E 覆盖：发送 → 重新进入仍可见（升序 + 时间）、仅 PENDING 被拒、退出后仍可聊、集合编辑生效 | AO（Jay） | P4 |
| `left` 不改变既有口径：matched 与 joined 仍只认 `ACCEPTED`；`existsActive` 不拦 `left`；同行者列表不含 `left` | AO（Jay） | P4 |
| 归档前 SA 具名追认双 capability 例外（`trip-companions` + `trip-plans`） | SA（Jacky） | P5 / G3 前 |
| 归档前 SA 具名追认「退出同行」与「匹配后的一对一文字沟通」两条 MODIFIED 的冲突裁决 | SA（Jacky）+ IO（WAYNE） | P5 / G3 前 |
| 归档合并核对：5 个 Requirement 场景数不低于基线（4/3/4/7/4），且 MODIFIED 正文被整体替换 | AO + SA | P5 `living-merge` |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | WAYNE |
| SA | Jacky |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：用户 2026-11-16 当次确认「SM - LEWIS / AO - JAY / IO - WAYNE / SA - JACKY / VL - NEAL，按这个来签」。本文件只记录 G1 结果，不代表 G2 / G3。

## Next

- Decision = Pass → `/sdd:p3`（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- 4 条 lint SUGGESTION 与 2 条评审 SUGGESTION 全部落入 P3 `design.md` / `tasks.md`；无阻塞项。
