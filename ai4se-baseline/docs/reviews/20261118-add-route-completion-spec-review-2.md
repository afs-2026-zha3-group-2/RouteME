# Artifact review — add-route-completion / Delta Spec（修订 2）

- **Verdict: Pass（建议）**
- **Scope:** focus=spec（P2 delta-craft 语义修订重评）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`specs/route-completion/spec.md`](../../openspec/changes/add-route-completion/specs/route-completion/spec.md)（修订后）
- **触发原因：** P1 评审 F-1 / F-3 将「空值序列化口径」与「`route_completion_state` 契约强度」留给 P2；2026-11-18 用户裁决：数据不足时**省略** `route_completion_rate`（沿用类级 `@JsonInclude(NON_NULL)`），`route_completion_state` **恒返回并列入 `UserProfile.required`**
- **Supporting inputs:**
  - [`REQ-031-route-completion.md`](../../requirement-workspace/requirements/REQ-031-route-completion.md)（P2 同步：S32-1 / S32-2 / S32-19 与 Constraints 数据口径）
  - [`proposal.md`](../../openspec/changes/add-route-completion/proposal.md)（P2 同步：What Changes / 独立性与兼容 / Impact / D1 / 验收信号 1–2）
  - [`dov-ac-review.md`](dov-ac-review.md)（AC 4/4 + DoV 5/5）
  - [`consistency-lint.md`](consistency-lint.md)（Pass，0 BLOCKER / 0 WARNING）
  - 基线代码：`UserProfileResponse` 类级 `@JsonInclude(JsonInclude.Include.NON_NULL)`；`openapi.yaml` `UserProfile.required` 只列恒出现字段
- **Evidence:**
  - `openspec validate add-route-completion --strict` → `Change 'add-route-completion' is valid`
  - `openspec show add-route-completion --json` → 6 个 Delta 条目均为 `route-completion`；Requirement 6 / Scenario 18
  - 场景三段式：18/18 场景均含 Given / When / Then（P2 补齐 12 处缺失的 `When`）
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`；`rules/architecture/rules.md#api-contract`

## 本次修订差异（修订前 → 修订后）

| 位置 | 修订前 | 修订后 |
|---|---|---|
| Requirement「预留路线完成度字段与数据不足口径」 | 两字段「同时返回」；`rate = null` | `route_completion_state` MUST 恒出现；`route_completion_rate` 仅数据足够时出现，数据不足 MUST 省略（值语义为空）；MUST NOT 以 `0` 或默认百分比填充 |
| Scenario「接口返回预留字段」 | Then 响应同时包含两字段 | Then 含 `route_completion_state`；有有效数值时同时含 `route_completion_rate`，数据不足省略 |
| Scenario「本期恒为数据不足」 | `route_completion_rate` 为 `null` | 响应不包含 `route_completion_rate`（值语义为空，MUST NOT 返回 `0`） |
| Requirement「资料响应兼容与访问控制」 | 两字段可空 | `rate` 可空且数据不足省略；`state` 恒返回并列入 `UserProfile.required`；前端把缺失与 `null` 同等视为数据不足 |
| Scenario「既有访问控制与兼容」 | 新增字段可空仍可解析 | `rate` 缺失时仍可解析；`openapi` 声明 `state` 入 `required`、`rate` 可空可省略 |
| 全部 18 场景 | 部分场景缺 `When` | 18/18 补齐 Given / When / Then |
| 计数 | 头部及提案误记 19 场景 | 更正为 18（S32-3 与 S32-15 合并为一个场景） |

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P3 承接） | `rules/architecture/rules.md#api-contract` | Requirement「资料响应兼容与访问控制」 | `openapi.yaml` 的 `required` 写法、示例值与版本号（预计 `0.27.0`）未在本 Delta 展开 | P3 契约定稿写入并同步 `OpenApiTest`；Delta 行为口径不变 | [inference] |
| F-2 | SUGGESTION（P4 验证） | `rules/testing/rules.md#web-testing` | Requirement「预留路线完成度字段与数据不足口径」 | 「省略字段」依赖类级 `@JsonInclude(NON_NULL)`；若实现改为逐字段覆盖会偏离 | P4 API 断言锁定「数据不足时 JSON 不含 `route_completion_rate`、含 `route_completion_state = insufficient`」 | [inference] |
| F-3 | SUGGESTION（P3 承接） | `rules/documentation/rules.md#sdd-artifacts` | Requirement「个人主页展示路线完成度」 | `neutral` / `insufficient` 的色阶与行高仍未定稿 | P3 preview 定稿；1440 / 1024 / 768 / 390 × 深浅色走查；`watch` 不用危险红 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 仍是单 capability ADDED；序列化口径与既有 `UserProfile` 约定一致，无新表 / 迁移 / 端点 |
| B Quality | N/A | P2 无实现 |
| C Testing | N/A（计划已列） | 派生边界、字段出现 / 省略、四态文案与独立性回归均可观察 |
| D Security | Pass | 只读字段；无写入端点；不读写信用账本；401 / 404 不变；无定性结论 |
| E Process | Pass | 语义修订已重新评审；DoV / lint 均 Pass；未触碰代码、契约或迁移 |
| F Documentation | Pass | Given / When / Then 齐备；状态码与文案固定；MUST / MUST NOT 明确 |
| G Traceability | Pass | 18 场景 ↔ 6 Requirement ↔ REQ-031（19 提示，1 处合并）↔ 提案验收信号 10 条可追 |

## Residual risks

- 全部用户为 `insufficient`，三档非空态依赖夹具 / 接口拦截；真实数据路径待打卡聚合卡片。
- 契约版本 `0.27.0` 依赖合并顺序；被抢占时整体顺延并同步 `OpenApiTest`。
- 若未来产品要求「始终返回 `null`」而非省略，需要新的语义修订并重评本报告。

## Next remediations（non-Gate）

- `/sdd:g1-decision-record`：IO = WAYNE，SA = Jacky / Karena 具名签署。
- `/sdd:atdd-design` → `/sdd:task-plan`：派生单测边界、展示预览与 E2E 分层。
- 无 Gate 结论；本报告不构成 G1。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| Delta Spec（修订后） | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人确认批准 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 同上 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Neal（当前开发者） | 2026-11-18 | 发起人确认当前开发者 | 结论与签署位 |
