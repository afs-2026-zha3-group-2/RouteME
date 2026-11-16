# G1 decision — add-user-profiles

- **Gate:** G1（Align）
- **Change:** `add-user-profiles`（capability `user-profiles`，REQ-009）
- **Timestamp:** 2026-11-16T10:26+0800
- **Recorded by:** Qoder（记录人工决策）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | In/Out scope、原型对齐决议、effort/size 齐全 |
| Delta Spec | [`specs/user-profiles/spec.md`](specs/user-profiles/spec.md) | 5 Requirement / 20 Scenario；双入口、公开资料、共同兴趣、统计口径、读取异常、隐私与账户凭据边界 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 5/5 Pass；DoV 4 Pass + 1 Partial（无阻塞；残余风险均有 owner） |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Pass；BLOCKER 0、open WARNING 0；2 条 SUGGESTION 留待 P3 |
| Requirements | [`REQ-009-publisher-profile.md`](../../../requirement-workspace/requirements/REQ-009-publisher-profile.md) | blocking OQ = 0、DoR BLOCKER = 0、A0 ⑨–⑫ 通过 |
| Impact / Deep-dive | [`impact-brief.md`](../../../requirement-workspace/impact-brief.md)、[`deep-dive.md`](../../../requirement-workspace/deep-dive.md) | REQ-009 增补齐全；无 Blocker |
| Prototype evidence | `docs/prototype/ui.js` `profileModal()` / `hostPanel`、`store.js` `stats()`、`styles.css` | 视觉与信息结构基线；举报按钮按用户指示排除 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-009 一致：双入口、公开资料弹窗、共同兴趣、四项统计、自我查看、隐私边界；举报、聊天页资料入口、资料编辑、敏感字段已排除 | `proposal.md` §范围 |
| Ambiguity | 统计口径、字段语义（学生/上班族/MBTI 选填）、自我查看、隐私文案、种子数据均已 resolved；自我查看不展示共同兴趣已按原型补入 | `dov-ac-review.md`、`consistency-lint.md` L-1 |
| Conflict | 原型 S02 与本次范围的差异已收口：举报不做、聊天页入口不做、隐私文案调整、卡片发布者入口新增 | `proposal.md#原型对齐决议` |
| Traceability | 5 条 Requirement 均可追溯到 REQ-009 §4 十条场景与 proposal In scope | `dov-ac-review.md#需求映射` |
| Residual risk | 统计实时聚合、身份模式分叉（演示/注册）、种子数据计数、`TripCard` 嵌套交互、`school` 字段名语义 | `dov-ac-review.md#残余风险`、`consistency-lint.md#残留风险` |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞项：

| 项 | Owner | 处理时机 |
|---|---|---|
| profile 读取同时支持演示账户（`X-User-Id`）与注册账户登录会话 | SA/Dev | P3 设计确认 |
| 同步更新 `DemoDataMigrationSqliteTest`、`AuthMigrationSqliteTest` 与 E2E 身份门断言 | Dev | P3/P4 |
| `TripCard` 发布者区域改为可点击且不触发卡片跳转，避免嵌套 `<a>/<button>` | Dev | P3/P4 |
| 「加入时间」展示格式按原型选择相对时间或可读日期 | Dev | P3 设计 |
| 新增第 4 个演示用户与行程作为迁移与测试数据任务，不升格为业务 Requirement | Dev | P3 tasks |
| 原型隐私文案与本次裁决文案不一致 | BA/Dev | P5 回写原型或知识库时同步 |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：用户于 2026-11-16 在会话中明确确认 G1 Pass，并提供团队角色名单与具名签署人。

## Post-G1 clarifications

| 日期 | 澄清 | 影响 |
|---|---|---|
| 2026-11-16（P3） | `trip-plans` 当前只有招募中/已满员/已结束，没有「已取消」状态；用户确认按当前能力澄清：发布行程统计当前全部已发布行程，「已取消不计入」作为未来状态规则保留 | Delta Spec 统计口径措辞调整；测试矩阵不再要求实例化「已取消」场景；不改变 G1 决策与范围 |
