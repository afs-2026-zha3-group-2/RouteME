# Artifact review — add-credit-account / design

- **Verdict: Pass**
- **Scope:** focus=design（`@rule:artifact-review-gate` 的 P3 技术设计评审）；root=`ai4se-baseline`；timestamp=2026-11-17
- **Artifact under review:** [`design.md`](../../openspec/changes/add-credit-account/design.md)（D1–D12）
- **Supporting inputs:** [`specs/user-credit/spec.md`](../../openspec/changes/add-credit-account/specs/user-credit/spec.md)、[`atdd-design.md`](../../openspec/changes/add-credit-account/atdd-design.md)、[`g1-decision.md`](../../openspec/changes/add-credit-account/g1-decision.md)、原型 `docs/prototype/ui.js` / `styles.css`
- **Evidence:**
  - 规则核对：`rules/architecture/rules.md#api-contract`、`#package-structure`、`#java-patterns`；`rules/quality/rules.md#naming-conventions`、`#web-coding-style`；`rules/security/rules.md#security-baseline`、`#pii-scrubbing`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/documentation/rules.md#documentation-conventions`；`rules/process/rules.md#spec-first`
  - 表结构核对：`V3__create_demo_users.sql`（`app_users` 现状）、`V9__add_user_credentials.sql`（凭据列）、`V16`/`V17`（时间与集合字段口径）、`auth_sessions` 的 UTC ISO-8601 时间写法
  - 迁移测试命名核对：`backend/src/test/java/routeme` 下实际存在 `OpenApiTest`、`AreaCodeMigrationSqliteTest`、`ProfileDataMigrationSqliteTest` 等；**无** `MigrationTest` 这类泛名
  - 契约现状：`openapi.yaml` `version: 0.11.0`；`UserProfile` 现有 `required: [id, nickname, avatar_initial, interests, profile_complete]`
  - 原型：`docs/prototype/ui.js` `profileModal` 已加 `.profile-credit` 行，`styles.css` 已有五档低饱和色阶

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（已收口） | `rules/architecture/rules.md#api-contract` | design §3 契约 | `UserProfile` 新增两字段必须进 `required`，否则 `@JsonInclude(NON_NULL)` 会静默省略，破坏「任意用户不出现缺失值」 | 已在设计 §3 明确 `required` 含 `credit_score` / `credit_level`，并写明「非可空」；P4 契约测试断言 required 与 enum 集合 | [fact] |
| F-2 | SUGGESTION（已收口） | `rules/architecture/rules.md#java-patterns` | design §2 `book` 流程 | 幂等键冲突时返回值未定义（返回事件后分数还是当前分数，并发下可能不同） | 已写成「直接返回当前 `UserCredit`（不重复扣加）」；返回当前账户真值而非理论值 | [inference] |
| F-3 | SUGGESTION（P4 承接） | `rules/architecture/rules.md#package-structure` | design §2 / §6 | 读路径 `ensureAccount` 会在首次读取时写库，属「读中含写」的结构事实 | 仅在迁移与注册都正常时不触发；P4 验证报告需记录该结构事实与触发条件（不回退设计） | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3（2 已收口 / 1 P4 承接）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | `controller → service → mapper` 分层；`CreditService` 被 `AuthServiceImpl` / `UserProfileServiceImpl` 复用属既有 service→service 模式；无 controller→dao 捷径 |
| B Quality | Pass | 命名与既有 `XxxEntity` / `XxxMapper` / `XxxService` 一致；决策表含备选与放弃理由 |
| C Testing | Pass | 设计把 API / E2E / UT 三层与 ATDD 表对齐；契约 enum 与 DB CHECK 双保险 |
| D Security | Pass | 无写分端点；信用明细不对外；日志不落明细 |
| E Process | Pass | 契约 / 迁移先于两端；`V18` 与 `0.12.0` 已按用户裁决占用 |
| F Documentation | Pass | 字段名、表名、类名与契约一致；无绝对机器路径 |
| G Traceability | Pass | D1–D12 均可映射到 tasks T1–T10 |

## Residual risks

- 契约 `0.12.0` 与迁移 `V18` 与在途 REQ-017 / REQ-018 撞号：本 change 先行，二者合并时顺延。
- 读路径懒建账户的并发与写放大：`INSERT OR IGNORE` + 迁移覆盖，正常情况下不触发。
- 零值账本记录可能被后续统计误用：统计需按 `applied_delta <> 0` 过滤。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `design.md` | 1 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | D1–D12 全文 |
| `design.md` | 2 / 2（非当前开发者且非 WAYNE） | Jay | 2026-11-17 | 发起人当次会话指定 | D1–D12 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
