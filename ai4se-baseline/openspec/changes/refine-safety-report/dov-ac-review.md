# AC / DoV review — refine-safety-report

- **Change:** `refine-safety-report`（`trip-companions` MODIFIED，REQ-012 / S14）
- **Reviewed artifact:** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（1 Requirement / 9 Scenario；MODIFIED）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-012-safety-report.md`、`requirement-workspace/intents/REQ-012-safety-report.md`、`requirement-workspace/impact-brief.md` §15、`requirement-workspace/deep-dive.md`「REQ-012 增补」、`requirement-workspace/stories.md` S14、`openspec/specs/trip-companions/spec.md`（Living Spec 基线）、`docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()`、`RouteME/frontend/src/safety/{SafetyNote.tsx,ReportModal.tsx}`、`RouteME/frontend/src/{trips/TripDetailPage.tsx,chat/ChatPage.tsx,i18n/tripMessages.ts}`、`openapi.yaml` 0.8.1 `ReportRequest` / `ReportReceipt`
- **Timestamp:** 2026-11-16T16:20+0800
- **Reviewer:** Qoder（AI agent）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate refine-safety-report --strict` → `Change 'refine-safety-report' is valid`；`openspec show refine-safety-report --json --deltas-only` → `deltaCount: 1`（`trip-companions` MODIFIED）

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | `specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」→ 9 Scenario | 覆盖分区与提醒（基线）、详情页三条提示、聊天页一行提示、举报入口与对象、本人行程无入口、提交回执、失败重试、隐私字段 |
| AC-2 ACs are observable | Pass | 场景断言均为可见 / 可读结果：列表三条文本（含「本行程集合区域：{集合区域}」）、空值回退「尚未填写，出发前请在聊天中确认」、聊天页「待确认」、回执「已收到，我们会处理」、弹窗两段固定说明 | 无「正常工作 / 快捷 / 友好」类空泛表述；回执与回退文案均为字面量 |
| AC-3 Negative / edge cases called out | Pass | Scenario「本人行程不出现举报入口」（否定入口 + 提示照常）、「提交失败可读且可重试」（网络 / 服务端错误、保留输入、无重复回执）、「安全区不展示隐私字段」（隐私红线） | 三个高风险边界各有独立场景；空集合区域在两条提示场景内分别给出回退字面量 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只约束「展示什么、提交后看到什么」，未规定组件拆分、状态库、样式类名；`SafetyNote` / `ReportModal` 仅出现在评审输入，不进入 Requirement 正文 | 唯一技术性约束「不只用颜色或图标表达」来自 S14 AC 原文，属可观察的无障碍要求 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches the change proposal | Pass | `proposal.md`「范围 In scope」①–⑦ 与 Delta 9 场景一一对应；proposal「Out of scope」中的后台工单、原因词表扩容、契约升级、资料弹窗举报按钮在 Delta 中均无对应场景 | 无静默扩张：`trip-plans.meeting_area` 只读消费，未在 Delta 中重定义字段或状态推导 |
| DoV-2 Ambiguities listed or resolved | Pass | 集合区域两条回退字面量、回执文案、四类原因中文标签、本人行程入口均已在 P1 由用户裁决 D1–D4 定稿并写入 Requirement 正文 | 残余待 P3 收口项（中文标签 ↔ 枚举值映射、黑名单词表）已在 spec 评审 S-02 / S-03 记录，不阻塞 G1 |
| DoV-3 Role concerns noted (IO / SA) for residual risk | Pass | 本文件「Residual risk」段；G1 决策记录需 IO + SA 具名签署 | IO：`trip-companions` MODIFIED 对已归档 `add-trip-companions` 的替换边界；SA：提示口径、无障碍与隐私红线回归范围 |
| DoV-4 No business implementation claimed as done | Pass | Delta 全文为 SHALL / MUST 句式；`RouteME/frontend/**` 未在本 change 内改动（`git status` 仅含并行会话的后端 / 分页文件） | P2 不产出代码；实现与测试在 P4 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 见下表「REQ-012 §4 → Delta Scenario」7/7 全覆盖，无孤儿场景 | 两个基线场景（分区展示我的旅行、待处理申请提醒）属 Living Spec 保留项，非本需求新增 |

## REQ-012 §4 → Delta Scenario 追溯

| REQ-012 §4 | Delta Scenario | 状态 |
|---|---|---|
| #1 详情页三条安全提示常驻 | 安全提示常驻 | 覆盖（三条文本 + 集合区域 + 空值回退 + 读屏可读 + 非颜色 / 图标） |
| #2 聊天页安全提示 | 聊天页展示安全提示 | 覆盖（一行文本 + 「待确认」回退 + 已结束只读聊天） |
| #3 举报入口与对象 | 举报入口与举报对象 | 覆盖（详情页「举报这条行程」/ 聊天页「举报这位用户」+ 对象 + 四类原因 + ≤200 说明 + 身份保密 + 紧急求助） |
| #4 提交举报并收到回执 | 提交举报并收到回执 | 覆盖（记录 + `received` + 回执「已收到，我们会处理」+ 无处置闭环 + 不透露举报人） |
| #5 本人行程不出现举报入口 | 本人行程不出现举报入口 | 覆盖（提示照常 + 入口不出现） |
| #6 提交失败可读且可重试 | 提交失败可读且可重试 | 覆盖（可读失败 + 保留原因与说明 + 重试后单一回执） |
| #7 隐私字段不出现在安全区与举报弹窗 | 安全区不展示隐私字段 | 覆盖（三处文案均不采集 / 不展示电话、证件、精确住址） |

**映射结论：7/7 覆盖，无孤儿场景。**

## Living Spec 基线保留核对

| Living Spec 基线场景（`openspec/specs/trip-companions/spec.md` L148–165） | Delta 中是否保留 | 说明 |
|---|---|---|
| 分区展示我的旅行 | 保留 | 内容未改 |
| 待处理申请提醒 | 保留 | 内容未改 |
| 安全提示常驻 | 保留（名称不变，内容收敛为三条文本列表） | 校验器要求 MODIFIED 不得丢弃既有场景名；内容变化已在 spec 评审 S-01 记录，留待 P5 归档时加一句替换说明 |
| 提交举报并收到回执 | 保留 | 回执文案由「举报已收到，我们会记录处理。」改为「已收到，我们会处理」 |

**基线保留：4/4。** 新增 5 个场景（聊天页展示安全提示、举报入口与举报对象、本人行程不出现举报入口、提交失败可读且可重试、安全区不展示隐私字段），合计 9。

## Residual risk

- **IO：** Delta 替换「我的旅行聚合与最低安全能力」整块，归档顺序若与其它改动同一 capability 的 change 重叠，需串行归档；本 change 依赖的 `add-trip-companions` 已归档，无未归档前置。
- **SA：** 「安全提示常驻」名称保留但内容已收敛（spec 评审 S-01），归档说明缺失会让 Living Spec 追溯看起来像漏改；无障碍断言（读屏可读、非颜色 / 图标）需在 P4 有可执行验证手段，而不只是文案承诺。
- **实施侧：** 回执文案变更会打破 `RouteME/e2e/tests/companions.spec.ts` 约 L130 的旧断言，必须与 `tripMessages` 同批更新；E2E 未纳入 CI，回归依赖本地执行。
- **数据侧：** 集合区域取自 `trip-plans.meeting_area`，空值回退只是显示层兜底；存量行程的填充质量不受本 change 约束。

## Verdict

**Pass** — AC 4/4 Pass，DoV 5/5 Pass，REQ-012 §4 映射 7/7，Living Spec 基线 4/4 保留。无 BLOCKER；可在 G1 具备具名 IO + SA 签署后推进。