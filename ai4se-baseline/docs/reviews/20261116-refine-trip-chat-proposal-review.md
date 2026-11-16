# All specs review — refine-trip-chat（proposal）

- **Verdict: Pass**
- **Scope:** focus=full（artifact-review-gate 的 proposal 轮次）；root=`ai4se-baseline`；timestamp=2026-11-16
- **Artifact under review:** [`openspec/changes/refine-trip-chat/proposal.md`](../../openspec/changes/refine-trip-chat/proposal.md)
- **Supporting inputs:** `requirement-workspace/requirements/REQ-010-trip-chat-meeting.md`（25 场景）、`requirement-workspace/intents/REQ-010-trip-chat-meeting.md`、`requirement-workspace/stories/refine-trip-chat.story.md`、`requirement-workspace/impact-brief.md` §13
- **Evidence:**
  - `openspec validate refine-trip-chat --strict` → `[ERROR] Change must have at least one delta. No deltas found.`（P1 预期：Delta Spec 属 P2 产出；CI 未调用该命令，不阻断流水线）
  - 未运行后端 / 前端 / E2E 测试：本阶段无代码与契约改动（N/A，不计入结论）
  - 事实核对：`ChatServiceImpl#requireMatched` 仅认 `ACCEPTED`；`ChatMessageMapper.xml#selectThreads` 只按 `chat_messages` 聚合；`ApplicationServiceImpl#leave` 置 `CANCELLED`；`MyTripsServiceImpl` matched 与 `UserProfileStatsServiceImpl` joined 均只认 `isAccepted`

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| S-1 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `openapi.yaml`（P3/P4 待写） | `meeting_time` 是本地墙上时间、无时区，但 `api-contract` 对时间戳习惯用 `_at` + UTC 表达，读者可能误读为 UTC | schema `description` 明确写「local wall-clock, no timezone」，并给出 `2026-11-20T08:30:00` 示例 | [inference] |
| S-2 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `openapi.yaml` 集合更新端点 | 提案只写了 400 / 422 口径，未要求端点附成功与 4xx 示例 | P3 `tasks.md` 明确该端点需带 success + 400 + 422 示例 | [fact] |
| S-3 | SUGGESTION | `rules/process/rules.md#spec-first` | 提案「双 capability 说明」 | 一个 change 跨 `trip-companions` 与 `trip-plans` 两个能力，与「一个 change 一个能力」的默认口径不一致 | 维持现状（与 `add-destination-area-filters`、`add-user-profile` 一致），归档前补 SA 具名追认 | [fact] |
| S-4 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | Delta Spec（P2 待写） | 提案与需求条目尚未给出「25 场景 → Delta Requirement」的显式映射 | P2 `dov-ac-review.md` 输出场景映射表，覆盖 25/25 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 4 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 契约版本 `0.8.0 → 0.9.0` 已声明；新增字段/端点/枚举均列为契约任务；400/422 口径已写入 |
| B Quality | Skipped | 无代码改动；提案只声明落点，未涉及实现风格 |
| C Testing | Skipped | 无代码改动；测试计划已覆盖权限、持久化、轮询、集合校验与编辑 |
| D Security | Pass | 拒绝在服务端执行（非仅隐藏入口）；未涉及电话/证件/住址；未新增凭据 |
| E Process | Pass | 提案 → Delta → 任务 → 实现顺序明确；冲突按 `rule-precedence` 记录并说明被降级一方 |
| F Documentation | Pass | 中文正文 + 英文标识符；相对路径；未引用行号；规则锚点正确 |
| G Traceability | Pass | in-scope 与 REQ-010 §4 场景可对齐；4 条故事与 4 组场景一一对应 |

## 结论说明

- 本轮的实质修订点已并入提案：① 明确 `GET /api/me/chat-partners` 只按消息历史聚合、需补齐「已匹配但无消息」的会话（否则场景 #1 无法实现）；② 明确 `left` 的消费点与「我申请的」展示标签；③ 明确 400/422 口径。
- 未发现 BLOCKER 或 WARNING；4 条 SUGGESTION 均可落到 P2 / P3 工件，不需要回退提案。

## Residual risks

- `left` 状态改变聊天准入的语义，属活规格 MODIFIED；若 SA 在 G1 不追认，本 change 需回到 P1 重新裁定。
- 左栏会话补齐涉及后端组合逻辑（可沟通配对 + 历史会话），实现复杂度高于「复用现有接口」，P4 需为其补单测。
- 原型缺少集合时间与集合编辑入口，P3 必须先改原型；若原型评审不通过，实现不得先行。

## Next remediations（non-Gate）

- `/sdd:delta-craft`（P2）：写 `specs/trip-companions/spec.md`（MODIFIED ×2）与 `specs/trip-plans/spec.md`（MODIFIED ×2 + ADDED ×1），输出 `dov-ac-review.md` 场景映射与 `consistency-lint.md`。
- `/sdd:atdd-design` → `/sdd:task-plan`（P3）：先出原型改动与预览，再写 `design.md` / `tasks.md`。
- `/sdd:atdd-apply`（P4）：按 TDD 实现，E2E 覆盖「发送 → 重新进入 → 仍可见」「未匹配被拒」「集合编辑生效」。

## 审批

> 本次 proposal 评审结论为 **Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 4）。
> 审批签名待 AO 确认后由人工追加「批准人 / 批准时间」，本文件不改写评审结论。

- **批准人：** Jay（AO）
- **批准时间：** 2026-11-16
- **批准范围：** 批准 proposal 进入 P2（Delta Spec），不包含 G1 通过。
