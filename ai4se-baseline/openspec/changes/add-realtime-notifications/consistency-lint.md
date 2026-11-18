# Consistency lint — add-realtime-notifications

- **Change：** `add-realtime-notifications`（`notifications` ADDED，REQ-028）
- **Phase：** `p2` ｜ **Timestamp：** 2026-11-17T16:47+0800；2026-11-18 扩围复核 ｜ **Reviewer：** AI agent（Code Mode）

## Verdict

**Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 3 / N/A 4）

- 首版（四类事件 / 6 Requirement / 26 Scenario）结论为 Pass；2026-11-18 扩围到八类 / 8 Requirement / 36 Scenario 后重新执行同一检查表，结论不变。
- 3 条 SUGGESTION 已在 P3 收口（见「Findings」的 Status 列）。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Status |
|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md` §范围 / 验收信号 4 ↔ `specs/notifications/spec.md` | 提案的「短提示（D14）」在 Delta 无独立场景，验收信号 4 却以「出现提示条」收口 | P3 `design.md` 定提示条件与可断言口径，`tasks.md` / E2E 落一条 | `[spec]` | 已收口：`design.md` §6.1 `shouldToast` / §6.5；T13；M8 |
| L-02 | SUGGESTION | p2 | `specs/notifications/spec.md` R1 | 失败隔离只写在申请类 Requirement，消息类共用同一写入路径但没有对应场景 | P3 把「通知失败不影响业务」写成对所有生产方生效的约束，并为消息路径补反向断言 | `[design]` | 已收口：Delta S29-36 覆盖八类生产方；`design.md` §5.2；`NotificationFailureIsolationTest` |
| L-03 | SUGGESTION | p2 | `specs/notifications/spec.md` R3–R6 ↔ `openapi.yaml` | Delta 技术中立，未写端点与 schema；契约增量若不在 P3 建锚点，`OpenApiTest` 的新增断言会缺少规格来源 | P3 `design.md` 增加「端点 → Requirement → 场景」对照表；contract 任务标注对应 Requirement | `[contract]` | 已收口：`design.md` §7；`tasks.md` T1 |

## Checklist coverage

| 检查 | 结论 | 证据 |
|---|---|---|
| Delta 使用 ADDED / MODIFIED / REMOVED 且与提案一致 | Pass | 仅 ADDED 1 个 capability / 8 Requirement；提案 In scope 10 项逐一对应（`dov-ac-review.md`「Proposal → Delta 覆盖」） |
| 场景可判定、无实现细节 | Pass | `dov-ac-review.md` AC-1 / AC-3；场景只描述可观察结果 |
| 术语一致（行程 / 申请 / 会话 / 未读 / 举报 / 客服 / 账号） | Pass | 与既有能力及界面用词一致；八个类型使用固定大写枚举，正文用中文标签 |
| 数值口径唯一 | Pass | 3 秒 / 恰好减一 / 八类零值不省略 / 1 次 50 条各只定义一次；「50 条」只出现在契约与设计，不在规格正文重复 |
| 契约影响已声明 | Pass | 提案声明 4 条新路径 + `/reports/mine` + 次版本递增到 0.25.0；`design.md` §7 建锚点 |
| 数据影响已声明 | Pass | 1 张新表 + 迁移 `V30__add_notifications.sql`；唯一索引 `(recipient_id, dedupe_key)` 与索引 `(recipient_id, read_at)`；H2 / SQLite 双引擎要求已写 |
| 与 Living Spec 无冲突 | Pass | `trip-companions` / `trip-plans` / `user-credit` / `admin-reports` / `design-system` 均未改写；`notifications` 尚不存在 |
| 与在途 change 的冲突已登记 | Pass | 契约 0.25.0 / 迁移 `V30__add_notifications.sql` 为「合并 main 后最大值 + 1」，未与任何在途 change 的号段重叠；P3 排他复核（D12 / §3） |
| 安全与密钥 | Pass | 无新增密钥；流身份用 `user_id` 查询参数，与既有 `X-User-Id` 同级，已在提案残余风险登记 |
| 文案位置 | Pass | 22 段通知文案在后端 `NotificationTextUtils`；前端只保留类型标签、空态、不可用提示等界面文案 |
| 隐私边界 | Pass | 账号通知只含状态、结构化原因标签与恢复时间；举报通知只含编号与结论；不含管理员备注或他人数据（S29-17） |
| 需求编号一致性 | Pass | 需求 / 故事 / registry / 知识库统一为 REQ-028 / S29；旧 REQ-023 通知条目已删除，REQ-023 仅保留 `add-experience-like-credit` |

## N/A / skipped

| 检查 | 原因 |
|---|---|
| 数据库迁移评审（字段级） | 本阶段无迁移文件；P3 / P4 评审（`V30__add_notifications.sql` 已由 `NotificationMigrationSqliteTest` 与 H2 全量测试覆盖） |
| 权限 / 角色可见性 | 通知只对收件人本人可见，授权沿用既有用户端点口径；细粒度鉴权属真实鉴权 change |
| 文件上传 / PII | 不涉及上传；通知只带昵称、行程标题、举报编号、结构化原因标签 |
| 原型比对 | 既有原型无通知界面；本 change 按 antd + 既有令牌新增，P4 出浅色三档截图 |

## Fix suggestions by priority

1. **P3 必做（已完成）：** L-01 提示条口径、L-02 失败隔离的跨生产方约束、L-03 契约锚点，写进 `design.md` / `tasks.md`。
2. **P4 必做（已完成）：** 契约与迁移落地后复核 `OpenApiTest` 断言与迁移双引擎；八类钩子逐域用例。
3. **P5 可做：** `summary.md` 统一记录「短期 demo 取舍」（内存 emitter、查询参数身份、50 条展示上限、不清理历史行）。

## Residual risks

- 与在途 change 无功能重叠；号段为「合并 main 后最大值 + 1」，仍可能在合并前被抢占。
- 八类通知的接入点分散在八个服务，遗漏风险由钩子用例与 E2E 交叉覆盖；新增第九类时必须同时更新枚举、文案、目标与筛选 UI。

## Reviewer metadata

- 输入：`proposal.md`、Delta Spec（8 / 36）、`dov-ac-review.md`、REQ-028、P0 基线、`openapi.yaml` 0.25.0、`db/migration/V1`–`V30`。
- 结论不代表 G1；G1 见 `g1-decision.md`。

## Next

- Pass → `g1-decision.md`；L-01 / L-02 / L-03 已在 P3 收口。