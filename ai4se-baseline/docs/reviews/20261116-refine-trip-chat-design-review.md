# Design review — refine-trip-chat

- **Verdict: Pass**
- **Scope:** focus=full（artifact-review-gate 的 Design 轮次）；root=`ai4se-baseline`；timestamp=2026-11-16
- **Artifact under review:** [`design.md`](../../openspec/changes/refine-trip-chat/design.md)（D1–D15）
- **Supporting inputs:** `proposal.md`、两份 Delta Spec、`atdd-design.md`、`g1-decision.md`（10 条条件）、`consistency-lint.md`、`20261116-refine-trip-chat-spec-review-2.md`
- **Evidence:**
  - 现状核对：`TripStatusEnum` wireValue 为 `recruiting` / `full` / `completed`；`ApplicationStatusEnum` 为 `pending` / `accepted` / `rejected` / `cancelled`，DB 存 `name()`、出参走 `wireValue()`
  - `TripPlan` 为不可变 record，`create()` 内做集合区域长度校验，`MAX_MEETING_AREA_LENGTH = 100` 已存在；`TripController` 现有 `GET /{tripId}`、`POST /{tripId}/complete`
  - `TripDetail.participants`（`DemoUser[]`）已由 `GET /api/trips/{id}` 返回，仅含发布者与 `ACCEPTED` 同行者
  - `ChatPartner.last_message` 契约与前端类型均可空，支持无消息会话
  - `OpenAPI 3.0.3`，`nullable: true` 用法正确
  - 原型：`.chat-layout` 288px 两栏、≤980px 单列横滚、≤390px 气泡 88%、3 秒轮询、头部四动作（退出仅非发布者且未关闭）、集合安全条文案均已核对
  - 原型先行已通过浏览器验证：编辑弹窗保存成功、三处展示更新、控制台无 error；截图 `docs/preview/trip-departure-info-after-edit.png`

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | WARNING | `rules/architecture/rules.md#api-contract` / `rules/quality/rules.md#prototype-ui-alignment` | D6 头部动作 | 「退出同行」只写「仅同行者且未结束」，未给数据来源；`ChatPartner` 不含当前用户申请状态，已退出（`LEFT`）用户将仍看到按钮并在点击时收到 403，违反场景「头部动作按身份与状态显示」 | **已修复**：改为 `!isPublisher && trip.status !== 'completed' && trip.participants.some(u => u.id === currentUser.id)`，复用已加载的 `TripDetail.participants`，不新增契约字段；`atdd-design.md` UT-3 同步补「LEFT 不显示」断言 |
| F-2 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | D5 排序 | 只按 `tripId` 倒序做二级键，同一行程存在多个无消息会话时顺序不稳定 | **已修复**：二级排序补 `otherId` 倒序 |
| F-3 | SUGGESTION | `rules/architecture/rules.md#api-contract` | D12 校验归属 | 只写「`TripMeetingRules` 后端纯类」，未给包路径与 record 更新方式，P4 可能另起一套风格 | **已修复**：定 `routeme/pojo/TripMeetingRules`、`TripPlan#withMeetingInfo`、复用 `TripCatalogConstant.MAX_MEETING_AREA_LENGTH` |
| F-4 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | D3 | 「契约枚举小写 `left`」与 DB 存值口径未区分，易被误读为需要数据迁移 | **已修复**：D3 明确 DB 存 `LEFT`（`name()`）、API 返回 `left`（`wireValue()`），不迁移 |
| F-5 | SUGGESTION | `rules/process/rules.md#artifact-review-gate` | G1 条件 4 | G1 原文写「success + 400 + 422 示例」，与 2026-11-16 用户裁决的错误码口径不一致 | 不修改 G1 正文（保留 Gate 历史）；以 `spec-review-2.md` 与 D13 为唯一口径，P4 验证报告记录该偏离 |
| F-6 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | D11 | 写成「`tripMessages.applicationLabel` 增加 `left`」，但 `tripMessages` 只是文案对象，无此函数；实际 `applicationLabel` 在 `TripDetailPage` / `MyTripsPage` / `ApplicationsPage` 三处各自复制 | **已修复**：D11 改为新增 `frontend/src/trips/applicationStatus.ts` 并统一三处引用；`tasks.md` T10 落点同步修正（原标题点指向不相关的 `tripStatus.ts`） |
| F-7 | WARNING | `rules/quality/rules.md#prototype-ui-alignment` | D1 | 只写「三处响应增加 `meeting_time`」，但契约的 `TripPlan`（列表/摘要）现状不含 `meeting_area`，而 Delta 要求「我的旅行·已匹配」同时展示集合区域与集合时间 | **已修复**（P4 T1 执行时发现）：D1 改为 `TripPlan` 同时增加 `meeting_area` 与 `meeting_time`；`TripDetail` / `TripCreateRequest` 增加 `meeting_time` |

**Counts:** BLOCKER 0 / WARNING 3（均已修复）/ SUGGESTION 4 → **Pass**（以修复后状态评审）

## G1 条件逐条映射

| # | G1 条件 | 设计落点 | 结论 |
|---|---|---|---|
| 1 | 统一「已退出」状态 | D3 + D11（D3 明确 `name()`/`wireValue()` 双口径） | 覆盖 |
| 2 | `SafetyNote` 与聊天安全条不叠加 | D6 末条 | 覆盖 |
| 3 | 原型先行（四处展示 + 编辑入口） | 头部说明 + D14 + 预览截图 | 覆盖（已完成） |
| 4 | 契约：local wall-clock、端点示例 | D1 | 覆盖（示例口径按 D13，见 F-5） |
| 5 | 会话列表补齐需单测 | D5 + `atdd-design.md` A1/UT；`tasks.md` T5 | 覆盖 |
| 6 | E2E 四项覆盖 | `atdd-design.md` E2E-3 / E2E-4 / E2E-5 / E2E-8 / E2E-13 | 覆盖 |
| 7 | `left` 不改既有口径 | D3 五个消费点 | 覆盖 |
| 8 | SA 追认双 capability | 未在 P3 处理 | 转 P5（G3 前） |
| 9 | SA + IO 追认冲突裁决 | 未在 P3 处理 | 转 P5（G3 前） |
| 10 | 归档合并场景数核对 | 未在 P3 处理 | 转 P5 `living-merge` |

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 契约/迁移/服务/前端分层清楚；不引入新错误码；`LEFT` 复用既有枚举机制；更新端点为幂等整体替换 |
| B Quality | Pass | 校验归属服务端权威 + 前端体验层；空值语义（缺省即清空）写死；排序稳定 |
| C Testing | Pass | D 条目与 A1–A10 / UT-1–UT-7 / E2E-1–E2E-13 可对应；UT-3 已补 LEFT 断言 |
| D Security | Pass | 准入与编辑权限均在服务端判定；拒绝不回传对方消息；不新增隐私字段 |
| E Process | Pass（含 1 处流程偏差，见下） | 原型先行、G1 条件逐条映射；偏差如实记录 |
| F Documentation | Pass | 中文正文 + 英文标识符；无行号引用；路径可点 |
| G Traceability | Pass | 6 Requirement / 43 Scenario 均有设计落点；25 条 REQ 场景映射不变 |

## 流程偏差（如实记录）

- `tasks.md` 在 design 评审与批准之前已写出（先写 tasks 后补评审），偏离 `@rule:artifact-review-gate` 的「每份工件评审后再进入下一步」。
- 影响评估：任务表只引用 design 的 D 编号与既有文件路径，未引入新决策；本次评审发现的 F-1/F-3 已同步回改 `tasks.md`（T6 落点补 `TripMeetingRules` / `withMeetingInfo`）。
- 纠正措施：本报告与 `tasks-review.md` 同日提交，design 与 tasks 作为一组同时请 AO 批准后才进入 P4；后续 change 严格按「design 评审批准 → 再写 tasks」顺序执行。

## Residual risks

- 退出语义（`LEFT` 仍可聊）与活规格相反，依赖 SA（Jacky）+ IO（Wanye）在 G3 前具名追认；未追认则不能归档。
- `trip_applications` 无 `(trip_id, applicant_id)` 唯一约束，退出后重新申请会产生两条记录；本 change 保留历史、不折叠，「我申请的」可能同时出现「已退出」与「已匹配同行」。
- 错误码口径与 `@rule:api-contract` 的 422 描述长期不一致；本 change 只记录偏离，回写规则需走 `/sdd:rules-govern`。

## Next remediations（non-Gate）

- 与 `tasks-review.md` 一并提交 AO 批准，然后进入 P4。
- P4 首条任务 T1 起即按 D13 口径实现，验证报告记录偏离。
