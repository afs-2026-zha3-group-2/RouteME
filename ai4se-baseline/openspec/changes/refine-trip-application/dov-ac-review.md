# AC / DoV review — refine-trip-application

- **Change:** `refine-trip-application`（`trip-companions` MODIFIED，REQ-010 / S08）
- **Reviewed artifact:** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（1 Requirement / 8 Scenario；MODIFIED）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-010-trip-application-entry.md`、`requirement-workspace/intents/REQ-010-trip-application-entry.md`、`requirement-workspace/impact-brief.md` §13、`requirement-workspace/deep-dive.md`「REQ-010 增补」、`openspec/specs/trip-companions/spec.md`（Living Spec 基线）、`docs/prototype/ui.js` `actionBox` / `store.js` `canApply`
- **Timestamp:** 2026-11-16T12:00+0800
- **Reviewer:** Qoder（AI agent）
- **Tooling:** `openspec validate refine-trip-application --strict` → `Change 'refine-trip-application' is valid`

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | `specs/trip-companions/spec.md`「提交与取消同行申请」→ 8 Scenario | 覆盖入口、提交、待处理、本人、重复、满员 / 结束、撤回、页面停留期间状态变化 |
| AC-2 ACs are observable | Pass | 场景断言可见结果：内联表单、PENDING、等待提示、撤回按钮、重复文案、入口不可用原因、409 错误码、刷新后状态 | 无「正常工作 / 快速 / 正确」类空泛表述 |
| AC-3 Negative / edge cases called out | Pass | Scenario「不能申请自己发布的行程」「不能重复申请」「已满员或已结束的行程不能申请」「说明选填且不超过 120 字」「页面停留期间行程状态变化」 | 覆盖本人、重复、满员 / 结束、超长说明、前端快照与服务端状态不一致 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只写用户可见行为与契约结果（是否展示表单、是否生成申请、错误码、刷新后状态）；「内联而非弹窗」也是可观察行为 | 未指定组件库、状态库、请求库或文件结构；P3 设计仍可自由选择实现 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | `proposal.md` §范围 8 条 in-scope ↔ 8 Scenario；§Out of scope 无对应需求 | 未加入自动加入团队、必填说明、卡片入口、通知、批量申请；未改后端 / 契约 / 迁移 |
| DoV-2 Ambiguities listed or resolved | Pass | 下方「规格解释裁决 1–6」 | 无未决 blocking 歧义；「已申请，请等待回应」与原型 mock 文案的差异已按用户 AC 收敛 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | IO：S08 字面「按钮变为已申请，待处理」被用户 D2 覆盖；SA：MODIFIED 覆盖范围与基线保留；AO：E2E 选择器与错误码分支 |
| DoV-4 No business implementation claimed done | Pass | 本阶段只改 Delta Spec；现有 `TripDetailPage` / `ApplicationServiceImpl` 仅作为 as-is 证据 | `proposal.md` §交付边界明确 P3/P4 才实现 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 下方「需求映射」8/8 + 「基线保留」5/5 | REQ-010 §4 八条场景全部有 Delta 落点；Living Spec 5 个既有场景保留 |

**Blocking gaps:** 无。G1-ready from the review's perspective；是否签署由 IO / SA 决定。

## Requirement mapping（REQ-010 §4 → Delta Spec）

| REQ-010 场景 | Delta Scenario | 覆盖判定 |
|---|---|---|
| #1 可申请行程展示内联申请区 | 「可申请行程展示内联申请区」 | 完整（含说明选填、120 字、提交按钮、聊天说明、非弹窗） |
| #2 提交申请并进入待处理 | 「提交申请并进入待处理」 | 完整（PENDING、等待提示 + 撤回、刷新保持、发布者可见） |
| #3 说明选填与长度 | 「说明选填且不超过 120 字」 | 完整（空 / 空白接受；超长阻止或提示） |
| #4 本人发布的行程不显示申请入口 | 「不能申请自己发布的行程」 | 完整（无入口、服务端拒绝、发布者入口保持） |
| #5 重复申请被拦截并提示 | 「不能重复申请」 | 完整（服务端拒绝、不新增、「已申请，请等待回应」、刷新待处理 / 已匹配） |
| #6 满员或已结束不可申请 | 「已满员或已结束的行程不能申请」 | 完整（入口不可用、原因、服务端拒绝；已含重复优先的错误码分支） |
| #7 撤回后恢复可申请 | 「处理前取消申请」 | 完整（已取消、发布者待处理数减少、恢复表单） |
| #8 页面停留期间状态变化 | 「页面停留期间行程状态变化」 | 完整（服务端拒绝、可读原因、刷新后无表单） |

## Living Spec 基线保留（MODIFIED 覆盖检查）

| `openspec/specs/trip-companions/spec.md` 既有场景 | Delta Scenario | 判定 |
|---|---|---|
| 提交申请并进入待处理 | 「提交申请并进入待处理」 | 保留并补充内联申请区、等待提示 + 撤回、刷新保持；原断言（PENDING、发布者可见资料与说明）未削弱 |
| 不能申请自己发布的行程 | 「不能申请自己发布的行程」 | 保留并补充「不展示入口」与「发布者入口保持」 |
| 不能重复申请 | 「不能重复申请」 | 保留拒绝语义；提示文案按用户 AC 改为「已申请，请等待回应」 |
| 已满员或已结束的行程不能申请 | 「已满员或已结束的行程不能申请」 | 保留服务端拒绝；原因细化为「人数已满」/「行程已结束」，并注明重复优先的错误码 |
| 处理前取消申请 | 「处理前取消申请」 | 保留「已取消」与发布者待处理数减少；补充恢复表单 |

Requirement 正文的原始约束（招募中且未满员、说明选填 ≤120、阻止本人 / 重复 / 满员 / 已结束）全部保留；新增的只是入口与展示要求。

## Proposal → Delta 覆盖

| Proposal In scope | Delta 落点 |
|---|---|
| 内联申请区（说明、提交、聊天说明） | Scenario「可申请行程展示内联申请区」 |
| 入口仅对可申请行程展示 | Scenario「可申请行程展示内联申请区」「不能申请自己发布的行程」「已满员或已结束的行程不能申请」 |
| 提交生成 PENDING，待处理态 + 刷新保持 | Scenario「提交申请并进入待处理」 |
| 重复申请提示「已申请，请等待回应」 | Scenario「不能重复申请」 |
| 满员 / 结束入口不可用 + 后端 409 | Scenario「已满员或已结束的行程不能申请」 |
| 撤回后恢复内联申请区 | Scenario「处理前取消申请」 |
| 页面停留期间状态变化 | Scenario「页面停留期间行程状态变化」 |
| `trip-companions` MODIFIED delta | `specs/trip-companions/spec.md`（`## MODIFIED Requirements`） |

## 规格解释裁决

1. **MODIFIED 而非 ADDED。** `add-trip-companions` 已归档，`openspec/specs/trip-companions/spec.md`「提交与取消同行申请」是唯一权威基线。本 change 用 MODIFIED 整体替换该 Requirement 块，并保留其 5 个场景，避免出现两套并行的申请入口描述。
2. **「已申请，请等待回应」以用户 AC 为准。** 原型 `store.js` 的 mock 门禁文案是「已申请，等待回应」，相差一个「请」字；该字符串在原型页面不展示，本 change 将其作为服务端错误映射文案，不构成视觉偏离。
3. **待处理态按原型，不使用字面「已申请，待处理」按钮。** 用户裁决 D2 覆盖 S08 字面 AC：提交后展示「申请已提交，等待 {昵称} 回应」+「撤回申请」；状态仍可在详情页与「我的旅行 → 我申请的」查看。
4. **满员 / 结束的错误码优先级。** 后端检查顺序是「本人 → 重复 → 非 recruiting」；满员时若当前用户已有有效申请，会先返回 `DUPLICATE_APPLICATION`。Delta 场景 6 明确两种错误码都算拒绝，测试不能只断言 `TRIP_NOT_OPEN`。
5. **入口只在详情页。** 原型 S05 / S08 的入口都在详情页「下一步」区；本 change 不做卡片入口，避免扩成列表交互。
6. **不改后端 / 契约 / 迁移。** 申请规则、`message` 选填 ≤120 与两个 409 错误码已经存在；本 change 只补前端展示与服务端错误映射，后端回归测试保留。

## 残余风险

| 风险 | Owner | 说明 |
|---|---|---|
| S08 字面 AC「按钮变为已申请，待处理」被 D2 覆盖 | IO | 用户已在 2026-11-16 裁决；G1 时请 IO 确认该覆盖仍有效 |
| MODIFIED 整体替换 Living Spec 的「提交与取消同行申请」块 | SA | Delta 已保留 5 个既有场景；`openspec validate --strict` 通过；G1 请 SA 核对基线保留 5/5 |
| 页面停留期间前端 `canApply` 为旧快照 | AO | 提交失败后必须 `reload()` 行程并刷新申请状态；E2E 场景 8 覆盖 |
| E2E 从弹窗改为内联表单 | AO | 更新 `companions.spec.ts` 的按钮、placeholder、状态断言；同时保留满员 / 结束后端拒绝用例 |
| 错误码到中文文案的映射层 | AO | 只在页面 / 消息层映射 `DUPLICATE_APPLICATION` 与 `TRIP_NOT_OPEN`，不改 `api.ts` 的通用错误行为 |

## Next

- 进入 `/sdd:consistency-lint`（P2）检查 Delta / Proposal / Tasks / Design 规则表与跨工件一致性。
- 之后由 IO / SA 决定 G1；本评审不是 Gate 决策，也不代表实现已完成。
