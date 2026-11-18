# Consistency lint — add-realtime-notifications

- **Change：** `add-realtime-notifications`（`notifications` ADDED，REQ-023）
- **Phase：** `p2` ｜ **Timestamp：** 2026-11-17T16:47+0800 ｜ **Reviewer：** AI agent（Code Mode）

## Verdict

**Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 3 / N/A 4）

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Status |
|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md` §范围 / 验收信号 4 ↔ `specs/notifications/spec.md` | 提案的「短提示（D14）」在 Delta 无独立场景，验收信号 4 却以「出现提示条」收口 | P3 `design.md` 定提示条件与可断言口径，`tasks.md` / E2E 落一条；若不做，同批修正提案 in-scope 与验收信号 4 | `[spec]` | 待 P3 |
| L-02 | SUGGESTION | p2 | `specs/notifications/spec.md` R1 | 失败隔离只写在申请类 Requirement，消息类共用同一写入路径但没有对应场景 | P3 把「通知失败不影响业务」写成对所有生产方生效的约束，并为消息路径补反向断言 | `[design]` | 待 P3 |
| L-03 | SUGGESTION | p2 | `specs/notifications/spec.md` R3 / R4 / R5 / R6 ↔ `openapi.yaml` 0.17.0 | Delta 技术中立，未写端点与 schema；契约增量若不在 P3 建锚点，`OpenApiTest` 的新增断言会缺少规格来源 | P3 `design.md` 增加「端点 → Requirement → 场景」对照表；contract 任务标注对应 Requirement | `[contract]` | 待 P3 |

## Checklist coverage

| 检查 | 结论 | 证据 |
|---|---|---|
| Delta 使用 ADDED / MODIFIED / REMOVED 且与提案一致 | Pass | 仅 ADDED 1 个 capability / 6 Requirement；提案 In scope 8 项逐一对应（`dov-ac-review.md`「Proposal → Delta 覆盖」） |
| 场景可判定、无实现细节 | Pass | `dov-ac-review.md` AC-1 / AC-3 |
| 术语一致（行程 / 申请 / 会话 / 未读） | Pass | 与 `trip-companions` 及既有界面用词一致；无同义轮换 |
| 数值口径唯一 | Pass | 3 秒 / 50 条 / 减一 / ≤900 px 各只定义一次 |
| 契约影响已声明 | Pass | 提案声明 4 条新路径 + 次版本递增到 0.18.0；L-03 要求 P3 建锚点 |
| 数据影响已声明 | Pass | 1 张新表 + 迁移 `V30`；索引 `(recipient_id, read_at)`；H2 / SQLite 双引擎要求已写 |
| 与 Living Spec 无冲突 | Pass | `trip-companions` / `trip-plans` / `design-system` 均未改写；`notifications` 尚不存在 |
| 与在途 change 的冲突已登记 | Pass | 契约 0.18.0 / 迁移 `V30` 为「当前最大值 + 1」，未与任何在途 change 的号段重叠；P3 排他复核（提案 D12 / R-7） |
| 安全与密钥 | Pass | 无新增密钥；流身份用 `user_id` 查询参数，与既有 `X-User-Id` 同级，已在提案残余风险登记 |
| 文案位置 | Pass | 通知文案与时间格式落 `frontend/src/notifications/` 与 `i18n`，P3 定 |

## N/A / skipped

| 检查 | 原因 |
|---|---|
| 数据库迁移评审（字段级） | 本阶段无迁移文件；P3 / P4 评审 |
| 权限 / 角色可见性 | 通知只对收件人本人可见，授权沿用既有用户端点口径；细粒度鉴权属真实鉴权 change |
| 文件上传 / PII | 不涉及上传；通知只带昵称与行程标题 |
| 原型比对 | 既有原型无通知界面；本 change 按 antd + 既有令牌新增，P3 出预览后比对 |

## Fix suggestions by priority

1. **P3 必做：** L-01 提示条口径、L-02 失败隔离的跨生产方约束、L-03 契约锚点，写进 `design.md` / `tasks.md`。
2. **P4 必做：** 契约与迁移落地后复核 `OpenApiTest` 断言与迁移双引擎。
3. **P5 可做：** `summary.md` 统一记录「短期 demo 取舍」（内存 emitter、查询参数身份、50 条展示上限）。

## Residual risks

- 与在途 change 无功能重叠；号段为「当前最大值 + 1」，仍可能在 P4 前被抢占（提案 R-7 / D12）。
- 提示条与失败隔离的表述分散在提案与 Delta 两处，P3 收敛为单一口径。

## Reviewer metadata

- 输入：`proposal.md`、Delta Spec（6 / 26）、`dov-ac-review.md`、REQ-023、P0 基线、`openapi.yaml` 0.17.0、`db/migration/V1`–`V23`。
- 结论不代表 G1；G1 见 `g1-decision.md`。

## Next

- Pass → `g1-decision.md`；L-01 / L-02 / L-03 落 P3。