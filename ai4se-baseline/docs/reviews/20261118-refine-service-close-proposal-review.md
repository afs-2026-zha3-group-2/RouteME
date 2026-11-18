# Artifact review — refine-service-close / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 提案评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`proposal.md`](../../openspec/changes/refine-service-close/proposal.md)（D1–D9 / 28 Scenario / 6 条验收信号）
- **Supporting inputs:**
  - [`requirements/REQ-028-service-close.md`](../../requirement-workspace/requirements/REQ-028-service-close.md)、[`intents/REQ-028-service-close.md`](../../requirement-workspace/intents/REQ-028-service-close.md)
  - [`specs/customer-service/spec.md`](../../openspec/changes/refine-service-close/specs/customer-service/spec.md)（用于反向核对提案与 Delta 是否分叉）
  - [`registry.md`](../../requirement-workspace/registry.md)、[`stories.md`](../../requirement-workspace/stories.md)（S29）、[`handoff.md`](../../requirement-workspace/handoff.md)
  - [`add-admin-console/specs/customer-service/spec.md`](../../openspec/changes/add-admin-console/specs/customer-service/spec.md)（被取代的旧表述）
- **Evidence:**
  - 规则核对：`rules/process/rules.md#spec-first`（问题 / 范围 / Actors / 场景 / 约束 / 证据 / 能力影响 / OQ 八段齐全）、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`
  - 证据复核：`ServiceSessionStatusEnum` 实为三态；`ServiceController` 无 close；`AdminServiceController.close` 仅 `HANDLING`；`openapi.yaml` `info.version` = `0.24.0`；migration 最大号 = `V29__credit_exit_application.sql`；`openspec/specs/` 无 `customer-service`
  - E2E 依赖复核：`customer-service.spec.ts:202-206` 调用管理端 close；`admin.spec.ts:666-668` 点击管理端「结束会话」
  - `openspec validate refine-service-close --strict` → `Change 'refine-service-close' is valid`
  - 质量检查：`docs/ai4se-plugins/20261118-100200-quality-checklist-report.md`（P1 Overall Pass）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | WARNING（已收口） | `rules/documentation/rules.md#sdd-artifacts` | `## Capabilities` | 初稿把 ADDED 写成「Modified Capabilities」下的普通描述、New Capabilities 写「无」，与 OpenSpec 的 Delta 类型（ADDED Requirements）容易混淆，也让读者误以为能力名是新建的 | 已改为「`customer-service`（ADDED Requirements）」并明确「不新建能力名；既有 Requirement 来自未归档 change」 | [fact] |
| F-2 | SUGGESTION（已收口） | `rules/process/rules.md#spec-first` | 首部「规模」与 Impact 表 | 初稿写「约 20 Scenario」，实际 Delta 为 28 Scenario | 已统一为 28 | [fact] |
| F-3 | SUGGESTION（保留） | `rules/process/rules.md#artifact-review-gate` | §验收信号 / §风险 | 契约版本 0.25.0 与迁移 V30 为暂定，P3 需排他确认；提案已标注但未给排他步骤 | P3 设计文档必须写明「先查 `origin/main` 最大迁移号与契约版本，再定稿」；若被抢占按后到者顺延 | [inference] |
| F-4 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | §Out of Scope 与 §决策 | issue 「客服点击结束会话没反应」不单独修复，依赖按钮下线；若未来有人只读 issue 可能误以为缺陷被忽略 | 交付说明与 P4 记录重申「按钮与接口已删除，原缺陷路径不存在」 | [fact] |
| F-5 | SUGGESTION（保留） | `rules/process/rules.md#spec-first` | §与既有规格的关系 | 取代声明写在 proposal 中，Delta 顶部不再重复（OpenSpec 会警告首段文本不会归档） | P5 归档时必须把「取代」写进 Living Spec 的 Requirement 正文或 Notes；已在 P2 记录为待办 | [inference] |

**Counts:** BLOCKER 0 / WARNING 1（已收口）/ SUGGESTION 4（1 已收口 / 3 保留）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单一能力 `customer-service`；状态机四态闭集；用户结束与客服标记两条写路径分离；不改 `user-support` / `user-auth` / `trip-companions` |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（场景可测） | 28 条 Delta 场景均含可观察结果（状态、`resolved_*` / `closed_*`、错误码、徽标口径） |
| D Security | Pass | 用户只能结束本人会话（404）；未登录 401；客服无结束路径；管理端 close 删除后无后门 |
| E Process | Pass | D1–D9 全部具名裁定；In / Out scope 非空；`validate --strict` 通过 |
| F Documentation | Pass | 证据表逐条可复核；无绝对机器路径 |
| G Traceability | Pass | D1–D9 → Delta 3 Requirement / 28 Scenario → REQ-028 36 场景 → S29；唯一缺口是 Ready 与 Delta 不是一一对应，P2 用 DoV/AC 映射补齐 |

## Residual risks

- `customer-service` 未归档，本 change 只能 ADDED；归档时若 `add-admin-console` 先落地，必须在其后合并，避免旧 Requirement 覆盖新语义。
- 待用户确认状态没有超时关闭，长期挂起是用户裁决 D6 的接受结果；监控指标不在本 change。
- 管理端 close 删除后，任何外部脚本若仍调用会得到 404；仓库内已确认只有两条 E2E 依赖，P4 改写。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | D1–D9 / §范围 / §决策 / §验收信号 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-18 | 发起人当次会话确认（当前开发者 = Lewis Liu） | 结论与签署位 |
