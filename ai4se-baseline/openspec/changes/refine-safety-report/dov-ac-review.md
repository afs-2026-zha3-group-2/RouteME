# AC / DoV review — refine-safety-report（rev2）

- **Change:** `refine-safety-report`（`trip-companions` REMOVED + ADDED，REQ-012 / S14）
- **Reviewed artifact:** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（REMOVED 1 Requirement / ADDED 1 Requirement / 9 Scenario）
- **Supersedes:** rev1（2026-11-16T16:20+0800，`trip-companions` MODIFIED，1 Requirement / 9 Scenario）。rev1 结论**作废**：其规格强制详情页三条提示与聊天页一行提示，已被裁决 D5 撤回。
- **Inputs:** [`proposal.md`](proposal.md)（rev2）、`requirement-workspace/requirements/REQ-012-safety-report.md`（rev2）、`requirement-workspace/intents/REQ-012-safety-report.md`、`requirement-workspace/impact-brief.md` §15、`requirement-workspace/deep-dive.md`「REQ-012 增补」、`docs/prototype/stories.html` S14（rev2「举报入口与回执」）、[`preview/safety-report.html`](preview/safety-report.html)（B · 页头右上）、`openspec/specs/trip-companions/spec.md`（Living Spec 基线）、`docs/prototype/ui.js` `reportModal()`、`RouteME/frontend/src/safety/ReportModal.tsx`、`RouteME/frontend/src/{trips/TripDetailPage.tsx,chat/ChatPage.tsx,i18n/tripMessages.ts}`、`openapi.yaml` 0.8.1 `ReportRequest` / `ReportReceipt`
- **Timestamp:** 2026-11-16T16:28+0800
- **Reviewer:** Qoder（AI agent）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`；`openspec show refine-safety-report --json` → `deltaCount: 2`（`trip-companions` ADDED + REMOVED）

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | `specs/trip-companions/spec.md`「同行举报入口与回执」→ 9 Scenario | 覆盖分区与提醒（迁移保留）、详情页 / 聊天页页头入口、弹窗内容、本人行程无入口、提交回执、失败重试、隐私字段 |
| AC-2 ACs are observable | Pass | 场景断言均为可见 / 可读结果：页头文本按钮文案、页面不出现安全提示区、回执「已收到，我们会处理」、弹窗两段固定说明 | 无「正常工作 / 快捷 / 友好」类空泛表述；回执与弹窗说明均为字面量 |
| AC-3 Negative / edge cases called out | Pass | Scenario「本人行程不出现举报入口」（否定入口 + 无提示区）、「提交失败可读且可重试」（网络 / 服务端错误、保留输入、无重复回执）、「举报弹窗不展示隐私字段」 | 三处高风险边界各有独立场景；两个入口场景各含「不展示安全提示」的否定断言，防止 D5 被实现侧悄悄回滚 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只约束「入口在哪、文案是什么、提交后看到什么」，未规定组件拆分、状态库或样式类名 | 位置以「状态标签同一行右侧 / 头像对侧」描述，属可观察的布局契约（D5 裁决），不是实现细节 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches the change proposal | Pass | proposal rev2「范围 In scope」①–⑧ 与 Delta 9 场景一一对应；「Out of scope」中的后台工单、原因词表扩容、契约升级、资料弹窗举报按钮、重新引入提示在 Delta 中均无对应场景 | 无静默扩张：`trip-plans.meeting_area` 只作为既有「集合」事实行只读，不进入 Delta |
| DoV-2 Ambiguities listed or resolved | Pass | 入口位置、本人行程边界、回执文案、四类原因中文标签均由 D2 / D3 / D5 定稿并写入 Requirement 正文 | 残余 P3 收口项（中文标签 ↔ 枚举值映射、黑名单词表）不影响 G1 |
| DoV-3 Role concerns noted (IO / SA) for residual risk | Pass | 见「Residual risk」段 | IO：整块 REMOVED 已归档能力的需求；SA：移除提示的产品风险与无障碍回归范围 |
| DoV-4 No business implementation claimed as done | Pass | Delta 全文为 SHALL / MUST 句式；本 change 未改 `RouteME/frontend/**` | P2 不产出代码；实现与测试在 P4 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 见下表「REQ-012 rev2 §4 → Delta Scenario」7/7 全覆盖，无孤儿场景 | 两个「我的旅行」场景属基线迁移保留，非本需求新增 |

## REQ-012 rev2 §4 → Delta Scenario 追溯

| REQ-012 rev2 §4 | Delta Scenario | 状态 |
|---|---|---|
| #1 详情页页头举报入口 | 详情页页头举报入口 | 覆盖（页头右侧按钮文案 + 无提示区 + 非颜色 / 图标 + 键盘读屏） |
| #2 聊天页页头举报入口 | 聊天页页头举报入口 | 覆盖（头像对侧按钮文案 + 只读聊天同样展示 + 无提示条） |
| #3 举报弹窗内容 | 举报弹窗内容 | 覆盖（对象 + 四类原因 + ≤200 说明 + 身份保密 + 紧急求助） |
| #4 提交举报并收到回执 | 提交举报并收到回执 | 覆盖（记录 + 已接收 + 回执「已收到，我们会处理」+ 无处置闭环 + 不透露举报人） |
| #5 本人行程不出现举报入口 | 本人行程不出现举报入口 | 覆盖（入口不出现 + 无提示区 + 其余功能照常） |
| #6 提交失败可读且可重试 | 提交失败可读且可重试 | 覆盖（可读失败 + 保留原因与说明 + 重试后单一回执） |
| #7 隐私字段不出现在举报弹窗 | 举报弹窗不展示隐私字段 | 覆盖（弹窗文案不采集 / 不展示电话、证件、精确住址） |

**映射结论：7/7 覆盖，无孤儿场景。**

## Living Spec 基线核对（REMOVED + ADDED 路径）

| Living Spec 基线场景（`openspec/specs/trip-companions/spec.md` L148–165） | 迁移结果 | 说明 |
|---|---|---|
| 分区展示我的旅行 | 迁移保留 | 内容未改 |
| 待处理申请提醒 | 迁移保留 | 内容未改 |
| 安全提示常驻 | **不再保留** | 裁决 D5 移除全部提示；REMOVED 块已写明 Reason / Migration |
| 提交举报并收到回执 | 迁移保留 | 回执文案在 rev1 已改为「已收到，我们会处理」，本次沿用 |

**迁移结果：4 个基线场景中保留 3 个、移除 1 个（安全提示常驻）；新增 6 个（详情页页头入口、聊天页页头入口、举报弹窗内容、本人行程不出现举报入口、提交失败可读且可重试、举报弹窗不展示隐私字段）。REMOVED + ADDED 合计 9 场景。**

> 说明：rev1 采用 MODIFIED，因校验器禁止 MODIFIED 丢弃既有场景名，只能靠「名称保留、内容改写」绕过；D5 需要真正删掉提示场景，故改为 REMOVED + ADDED，让删除在归档 diff 中显式可见。

## Residual risk

- **IO：** 整块 REMOVED 已归档的「我的旅行聚合与最低安全能力」，同一 capability 若还有其它未归档 change，必须串行归档；归档说明需写明「安全提示常驻」被有意移除，而不是漏迁移。
- **SA：** 移除三条提示是产品风险决策（学生不再在页面上读到公共集合 / 告知亲友 / 不公开证件三条边界）；无障碍断言（键盘可达、读屏可读、非颜色 / 图标）在提示移除后只约束举报入口，需在 P4 有可执行验证手段。
- **实施侧：** `SafetyNote` 从详情页 / 聊天页下线，但体验发布页（`ShareExperiencePage`）的「发布前提醒」必须保持现状，不能随组件一起删除；回执文案变更会打破 `RouteME/e2e/tests/companions.spec.ts` L136 的旧断言「举报已收到，我们会记录处理。」，必须与 `tripMessages` 同批更新；该 E2E 的 L134 用 `/举\s*报/` 匹配入口，B 位置不影响匹配，但 L137 依赖 `.ant-modal-footer .ant-btn-primary` 关闭回执，P4 需核对回执态唯一的「关闭」是否为 primary。
- **视觉侧：** 页头入口在窄屏与长标题下会换行，需在 390 / 768 / 1440 三档验证不溢出、不被挤压成图标。

## Verdict

**Conditional Pass（待具名重签）** — AC 4/4 Pass，DoV 5/5 Pass，REQ-012 rev2 §4 映射 7/7，基线迁移 3 保留 / 1 移除 / 6 新增，无 BLOCKER。rev1 的 G1 结论已作废，需 IO Wanye 与 SA Karena 就 D5 口径重新签署后方可进入 P3。