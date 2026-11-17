# AC / DoV review — add-trip-cancel

- **Change:** `add-trip-cancel`（`trip-cancellation` ADDED，REQ-019 / issue #28）
- **Reviewed artifact:** [`specs/trip-cancellation/spec.md`](specs/trip-cancellation/spec.md)（5 Requirement / 20 Scenario；ADDED）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-019-trip-cancel.md`、`requirement-workspace/intents/REQ-019-trip-cancel.md`、`requirement-workspace/impact-brief.md` §19、`requirement-workspace/deep-dive.md`「REQ-019 增补」、`openspec/specs/trip-plans/spec.md`（浏览排除已取消）、`openspec/specs/trip-companions/spec.md`（申请与聊天）、`docs/prototype/ui.js` / `main.js` / `store.js`
- **Timestamp:** 2026-11-17T12:10+0800
- **Reviewer:** Qoder（AI agent）
- **Tooling:** `openspec validate add-trip-cancel --strict` → `Change 'add-trip-cancel' is valid`

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | 5 Requirement → 20 Scenario（R1 5 / R2 4 / R3 3 / R4 4 / R5 4） | 覆盖权限、状态、原因、确认、列表、申请、聊天、我的旅行、统计、幂等 |
| AC-2 ACs are observable | Pass | 场景断言可见结果：入口是否展示、状态文字、原因可见性、申请状态、聊天只读、分页总数、统计数字、错误码 | 无「正常工作 / 快速 / 正确」类空泛表述 |
| AC-3 Negative / edge cases called out | Pass | 非发布者、旅行中/已结束/已取消、未选原因、说明为空/超长、PENDING 与 ACCEPTED 分支、并发取消、旧数据兼容 | 覆盖越权、非法状态、输入边界与并发 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只写用户可见行为与契约结果（入口、状态、原因、错误码、统计）；未指定组件库、表结构、请求库或文件位置 | P3 设计仍可自由选择实现 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | `proposal.md` §范围 In scope 10 项 ↔ 5 Requirement；§Out of scope 6 项无对应需求 | 信用分 / 信用记录 / 免扣分 / 管理员审核明确 out（D1） |
| DoV-2 Ambiguities listed or resolved | Pass | 下方「规格解释裁决 1–7」；REQ-019 §8 blocking OQ = 0 | 入口、可见性、说明、归组、编号均已裁决 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | IO：信用分 AC 被 D1 排除；SA：新能力与列表口径归属；AO：物化排除、原因裁剪、原型先行 |
| DoV-4 No business implementation claimed done | Pass | 本阶段只改 Delta Spec；代码仅作为 as-is 证据 | `proposal.md` 残余风险明确 P3 / P4 才实现 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 下方「Requirement mapping」20/20；#28 AC in-scope 10/10 | 无孤儿场景，无规格外行为 |

**Blocking gaps:** 无。G1-ready from the review's perspective；是否签署由 IO / SA 决定。

## Requirement mapping（REQ-019 §4 → Delta Spec）

| REQ-019 场景 | Delta Scenario | 覆盖判定 |
|---|---|---|
| S19-1 发布者取消招募中行程 | R1 / 发布者取消招募中的行程 | 完整（状态、取消字段、列表排除） |
| S19-2 发布者取消已满员行程 | R1 / 发布者取消已满员的行程 | 完整 |
| S19-3 非发布者不能取消 | R1 / 非发布者不能取消行程 | 完整（无入口、403、状态不变） |
| S19-4 非可取消状态拒绝 | R1 / 非可取消状态不能取消行程 | 完整（409、状态不变） |
| S19-5 详情页入口条件 | R1 / 取消入口按资格显示 | 完整（两处入口） |
| S19-6 我的旅行入口条件 | R1 / 取消入口按资格显示 | 完整（两处入口） |
| S19-7 原因必选 | R2 / 取消原因必选 | 完整（前后端拒绝） |
| S19-8 原因字典 8 项 | R2 Requirement 陈述 + 取消原因必选 | 完整（8 项逐字列出） |
| S19-9 其他原因说明 | R2 / 其他原因需要说明 | 完整（空 / 超长 / 合法） |
| S19-10 二次确认内容与返回 | R2 / 取消前的二次确认、取消确认不产生变化 | 完整 |
| S19-11 确认后状态迁移 | R1 / 发布者取消招募中 / 已满员 | 完整（记录时间与原因；other 记录说明） |
| S19-12 首页与匹配列表排除 | R3 / 已取消行程不出现在首页与匹配列表 | 完整（含分页总数） |
| S19-13 申请关闭与 PENDING 自动取消 | R4 / 待处理申请自动取消、取消后不再接受申请 | 完整（含「我申请的」可见结果） |
| S19-14 ACCEPTED 保留 | R4 / 已接受同行者保留 | 完整 |
| S19-15 聊天只读 | R4 / 已取消行程的聊天只读 | 完整（历史可读、发送拒绝、提示） |
| S19-16 禁止结束/再次取消/编辑集合 | R5 / 取消后不能结束或再次取消、取消后不能编辑集合信息 | 完整 |
| S19-17 无体验入口 | R5 / 已取消行程不能发表体验 | 完整（页面 + 服务端拒绝） |
| S19-18 我的旅行历史与徽标 | R3 / 详情与我的旅行展示已取消 | 完整（四组不变、不进已完成） |
| S19-19 原因可见性 | R3 / 取消原因按角色可见 | 完整（发布者 + ACCEPTED；其他仅状态） |
| S19-20 统计 / 幂等 / 兼容 | R5 / 发布行程统计排除取消、取消后不能结束或再次取消 | 完整（统计、并发、旧数据） |

## Living Spec 基线保留

本 change 只有 `ADDED`，没有 `MODIFIED` / `REMOVED` Requirement 块，不替换任何既有 Living Spec 场景；基线保留检查为 **N/A**。`trip-plans` 的「浏览未结束的旅行计划」已含「已取消不出现在默认列表」，本 change 让该约束首次可观测，但不改写其正文。

## Proposal → Delta 覆盖

| Proposal In scope | Delta 落点 |
|---|---|
| 第五态 CANCELLED 与终态 | R1 / 发布者取消招募中 / 已满员 |
| 仅发布者、仅 RECRUITING / FULL | R1 / 非发布者、非可取消状态 |
| 8 项原因与「其他」说明 | R2 / 取消原因必选、其他原因需要说明 |
| 二次确认与不可恢复 | R2 / 取消前的二次确认、取消确认不产生变化 |
| 详情页 + 我的旅行入口 | R1 / 取消入口按资格显示 |
| PENDING 自动取消、申请关闭 | R4 / 待处理申请自动取消、取消后不再接受申请 |
| ACCEPTED 保留、聊天只读 | R4 / 已接受同行者保留、已取消行程的聊天只读 |
| 列表排除、我的旅行展示、原因可见性 | R3 / 三个场景 |
| 禁止结束 / 再次取消 / 编辑集合 / 体验 / 统计 | R5 / 四个场景 |
| 契约与迁移 | 由 P3 设计落 `openapi.yaml` + `V19`；Delta 只约束可观察结果 |

## 规格解释裁决

1. **新能力 ADDED 而非改写既有块。** `trip-plans` / `trip-companions` 的同名 Requirement 正被 `add-trip-completion` / `refine-trip-application` / `refine-trip-chat` 三个未归档 change 同时修改；若本 change 再 MODIFIED，会形成四方覆盖。取消动作与取消侧约束落在新能力 `trip-cancellation`，列表过滤口径仍归 `trip-plans`（P5 归档时核对措辞一致）。
2. **信用分整体排除。** 用户 2026-11-17 裁决 D1：#28 的 5 条信用相关 AC 不在本 change；G1 时由 IO 确认该范围仍有效。
3. **入口两处。** 用户裁决 D2：详情页 + 我的旅行「我发布的」行内；原型当前只有详情页入口，按 `prototype-ui-alignment` 先改原型再改实现（P3）。
4. **原因可见性。** 用户裁决 D3：仅发布者与 ACCEPTED 同行者可见原因与说明；PENDING 与其他用户只看到「已取消」。接口需在服务端按请求人裁剪，不能依赖前端隐藏。
5. **我的旅行归组。** 用户裁决 D5：沿用四组；取消行程留在「我发布的」/「已匹配同行」并显示「已取消」，不新增分组。
6. **到期物化必须排除取消。** `TripPlanMapper.xml#selectExpiredIds` 与 `materializeIfExpired` 当前只认 `completed_at`；P3 明确排除 `cancelled_at` 非空的行程，否则取消行程越过结束日期会被写入 `completed_at`（all-specs-review W-03）。
7. **契约 / 迁移号段暂定。** 0.13.0 + V19；`add-ai-itinerary` 计划 0.12.0 + V18，P3 前复核（all-specs-review S-03）。

## 残余风险

| 风险 | Owner | 说明 |
|---|---|---|
| #28 信用分 AC 被 D1 排除 | IO | G1 时确认该范围仍有效；后续 story 承接信用分 |
| 新能力与 `trip-plans` 列表口径双权威 | SA | P5 归档时核对「已取消不出现在默认列表」两处措辞一致 |
| 到期物化未排除取消 | AO | P3 设计 + P4 回归：取消行程越过结束日期后 `completed_at` 仍为空 |
| 原因裁剪泄漏 | AO | P3 设计明确详情响应组装边界；摘要不携带原因 |
| 原型未先行 | AO | P3 先改 `ui.js` / `main.js` / `store.js` / `styles.css`，再实现 |
| 契约 / 迁移号段冲突 | AO | P3 定稿前复核，必要时顺延 |

## Next

- 进入 `/sdd:consistency-lint`（P2）检查 proposal / Delta / 跨工件一致性。
- 之后由 IO / SA 决定 G1；本评审不是 Gate 决策，也不代表实现已完成。
