# Artifact review — add-route-completion / Delta Spec

- **Verdict: Pass（建议）**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`specs/route-completion/spec.md`](../../openspec/changes/add-route-completion/specs/route-completion/spec.md)
- **Supporting inputs:**
  - [`requirements/REQ-031-route-completion.md`](../../requirement-workspace/requirements/REQ-031-route-completion.md)（19 场景 S32-1 ~ S32-19）
  - [`intents/REQ-031-route-completion.md`](../../requirement-workspace/intents/REQ-031-route-completion.md)（D1–D8）
  - [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-031 增补」①–④
  - [`impact-brief.md`](../../requirement-workspace/impact-brief.md) §30
  - GitHub issue #45 原文
- **Evidence:**
  - `openspec validate add-route-completion --strict` → `Change 'add-route-completion' is valid`
  - `openspec show add-route-completion --json` → 6 个 Delta 条目，均为 `route-completion`；合计 6 Requirement / 19 Scenario
  - 基线核实：`UserProfileResponse`、`ProfilePage`、`creditDisplay`、`openapi.yaml`、`V31` 迁移头、`c516d76`（推荐引擎移除）
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`；`rules/architecture/rules.md#api-contract`

## Requirement ↔ Scenario mapping

| Requirement | Scenarios | REQ-031 场景 |
|---|---|---|
| 预留路线完成度字段与数据不足口径 | 接口返回预留字段 / 本期恒为数据不足 | S32-1 / S32-2 |
| 数据充足判定与统计范围 | 足够数据门槛 / 只统计已结束行程 | S32-4 / S32-5 |
| 阈值派生与后端权威 | 信誉良好边界 / 中性区间边界 / 警惕边界 / 非法数值降级 / 状态由后端派生 | S32-6 ~ S32-10 |
| 个人主页展示路线完成度 | 展示入口 / 信誉良好 / 中性 / 警惕与措辞 / 数据不足 / 本人他人同口径 | S32-3、S32-11 ~ S32-16 |
| 与信用分、资料统计及成长等级相互独立 | 与信用分独立 / 与统计与成长等级独立 | S32-17 / S32-18 |
| 资料响应兼容与访问控制 | 既有访问控制与兼容 | S32-19 |

**Mapping:** 19/19 全覆盖；无孤儿场景；无未被场景覆盖的 Requirement（「数据充足判定」与「阈值派生」的纯规则由 S32-4 ~ S32-9 覆盖）。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/documentation/rules.md#sdd-artifacts` | Requirement「数据充足判定与统计范围」的 S32-4 / S32-5 | 场景以「未来聚合数据可用」为前置，本版本无法端到端复现完整 happy path | P2 AC/DoV 将 S32-4 ~ S32-9 映射到后端派生纯函数单测（合成输入）；P4 不主张 UI 端到端覆盖未来聚合 | [inference] |
| F-2 | SUGGESTION（P3 承接） | `rules/documentation/rules.md#sdd-artifacts` | Requirement「个人主页展示路线完成度」 | `neutral` 与 `insufficient` 的视觉样式（色阶 / 行高 / 是否带 badge）未在 Delta 定稿 | P3 preview 定稿；`watch` 不使用危险红；1440·1024·768·390 × 深浅色走查 | [inference] |
| F-3 | SUGGESTION（P2/P3 承接） | `rules/architecture/rules.md#api-contract` | Requirement「预留路线完成度字段与数据不足口径」 | 空值序列化（`null` 还是省略）未定；前端需双兼容 | P2 / P3 定稿 `UserProfile` schema 的 `nullable` 与示例；前端按「缺失或 null = 数据不足」处理 | [fact] |
| F-4 | SUGGESTION（已消解） | `rules/process/rules.md#spec-first` | Requirement「个人主页展示路线完成度」 | issue AC 10 提到「推荐列表可以展示简化标签，用户主页或详情页可以查看具体完成度」，Delta 仅保留个人主页 | 推荐引擎已于 `c516d76` 移除；用户裁决 D3 本期不做列表；「或」语义由个人主页满足；未来可复用同一状态码 | [fact] |
| F-5 | SUGGESTION（P2 承接） | `rules/testing/rules.md#web-testing` | Requirement「与信用分、资料统计及成长等级相互独立」 | 独立性目前只有服务级断言描述，未定具体回归测试点 | P2 AC/DoV 映射到 API 回归（信用字段与 `stats` 不变）+ 账本无新增记录断言 | [inference] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5（1 已消解 / 4 由 P2–P3 承接）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | ADDED 单能力；不 MODIFIED / REMOVED 既有能力；仅扩展 `UserProfile` 响应，数据所有权仍属 `user-profile` / `user-profiles` 响应承载 |
| B Quality | N/A | P1 无实现 |
| C Testing | N/A（计划已列） | 派生边界（80 / 79 / 70 / 69 / 0 / null / 非法）、API 字段、前端映射与独立性回归均已在 Delta 中可观察 |
| D Security | Pass | 只读字段；无写入端点；不读写信用账本；401 / 404 不变；不引入任何定性结论 |
| E Process | Pass | Delta 与提案 / Ready / deep-dive / impact 同批；`validate --strict` valid；未触碰代码、契约或迁移 |
| F Documentation | Pass | SCENARIO 使用 Given / When / Then；状态码与文案固定；MUST / MUST NOT 明确；无机器绝对路径 |
| G Traceability | Pass | 19 场景 ↔ 6 Requirement ↔ REQ-031 §4 ↔ 提案验收信号可追；无孤儿 |

## Residual risks

- 本版本所有用户均为 `insufficient`，四档 UI 只能通过夹具 / 接口拦截模拟验证；若后续不补演示数据，`good` / `watch` 的真实数据路径无法在本地走通。
- 未来聚合算法若采用「打卡点加权」而非「单行程均值」，本 Delta 的展示语义仍成立，但样本门槛与聚合口径需在后续卡片中补充场景。
- 契约版本 0.27.0 依赖合并顺序；若被在途 change 抢占，需整体顺延并同步 `OpenApiTest`。
- 文案固定为「信誉良好 / 请留意行程完成情况 / 暂无足够完成记录」；若产品要求改文案，需同步 i18n 与 E2E 断言。

## Next remediations（non-Gate）

- `/sdd:delta-craft`：复核 AC/DoV，确认空值序列化与独立性回归的测试映射。
- `/sdd:atdd-design` → `/sdd:task-plan`：派生单测边界、展示预览与 E2E 分层。
- 无 Gate 结论；本报告不构成 G1。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| Delta Spec | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人确认批准 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 同上 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Neal（当前开发者） | 2026-11-18 | 发起人确认当前开发者 | 结论与签署位 |

## 变更摘要（P2，2026-11-18）

- 本报告审计的 Delta 已在 P2 有两个变化：（1）计数更正——Delta 实际为 6 Requirement / **18** Scenario（起草时误记为 19；REQ 的 S32-3 与 S32-15 在 Delta 合并为同一场景，属事实性更正，不改语义）；（2）序列化口径按 P2 裁决语义修订（数据不足时省略 `route_completion_rate`；`route_completion_state` 恒返回并列入 `required`），语义变更已由 [`-review-2`](20261118-add-route-completion-spec-review-2.md) 重新评审，本报告结论仅对修订前文本有效。P3 前合并 `origin/main@8992853` 后，按用户裁决二次顺延为 **REQ-031 / S32**、契约 0.27.0；场景与口径未变，仅编号 / 版本事实更新。
