# Consistency lint — add-user-profiles

- **Change:** `add-user-profiles`（capability `user-profiles`，REQ-008）
- **Phase:** p2
- **Focus:** proposal / delta spec / dov-ac-review / REQ-008 / impact / deep-dive
- **Timestamp:** 2026-11-16（+0800）
- **Artifact level:** 2（proposal + specs；tasks/design 尚未生成）

## Verdict

**Pass**（BLOCKER 0 / open WARNING 0 / SUGGESTION 2 / N/A 3）

- 说明：L-1 WARNING 已在本次 lint 中按原型基线修复，open WARNING 计为 0。
- 本报告不是 G1 决策，也不构成 Living Spec 权威。

## Findings

| id | severity | location | issue | suggested_fix | evidence | authority | fact/inference |
|---|---|---|---|---|---|---|---|
| L-1 | WARNING（resolved） | `specs/user-profiles/spec.md` 资料弹窗 Requirement | 自我查看时是否展示「共同兴趣」未写明；原型 `profileModal()` 在 `isMe` 时隐藏该提示 | 已补「发布者为当前用户本人时 MUST NOT 展示共同兴趣提示」及对应 Scenario | `docs/prototype/ui.js` `profileModal()`；spec 资料弹窗 Requirement | spec + prototype | [fact] |
| L-2 | SUGGESTION | `proposal.md` §规模与交付 | 新增第 4 个演示用户与行程属交付/测试数据，未在 Delta Spec 中作为业务 Requirement | 在 P3 `tasks.md` 中作为迁移与测试数据任务落点，不升格为业务需求 | proposal In scope 最后一条；deep-dive ① 统计为 0 分支 | proposal | [inference] |
| L-3 | SUGGESTION | `specs/user-profiles/spec.md` 加入时间 | 未固定「加入时间」的展示格式（相对时间/日期） | P3 设计按原型选择相对时间或可读日期；AC 只要求与实际加入时间一致 | prototype S02「加入于 …」 | spec + prototype | [fact] |

## N/A / skipped

| 检查 | 原因 |
|---|---|
| Proposal P1/P2 英文标题 `## Why` / `## What Changes` | 项目既有 proposal 使用「## 问题 / ## 范围 / ## 影响面」中文标题，语义等价；按项目既有结构判定 Pass，不因英文标题名误报 |
| Tasks T1–T3 / C2 spec→tasks | `tasks.md` 尚未生成（P3 产物） |
| Design D1–D3 | `design.md` 尚未生成（P3 产物） |
| Spec S2/S2b/S2c/C6 引用可达性 | Delta Spec 未使用 `@knowledge:` / `@rule:` 引用，N/A |

## Phase p2 checks

| 检查 | 结果 | 说明 |
|---|---|---|
| 1 Proposal scope vs Delta Spec scope | Pass | In/Out 与 5 条 Requirement 对应；无静默扩张或遗漏 |
| 2 Delta capabilities internally consistent | Pass | 双入口、自我查看、共同兴趣（含自我排除）、统计口径、隐私边界相互一致 |
| 3 Key scenarios / constraints have a home | Pass | REQ-008 §4 十条全部落点；种子数据作为交付任务（L-2） |
| 4 tasks direction check | N/A | 无 tasks.md |
| 5 Untraceable requirements | Pass | 5 条 Requirement 均可追溯到 proposal / REQ-008 |
| 6 P/S/T/D + C1/C2/C6 | Pass/N/A | Proposal 实质齐全；Spec 结构、Scenario 结构、Given/When/Then 均通过；C2/C6 N/A |

## Residual risks

| 风险 | Owner | 说明 |
|---|---|---|
| 统计为请求时实时聚合，并发状态变化可能有瞬时差异 | Dev | MVP 可接受；不引入缓存 |
| 身份模式分叉为演示账户与注册账户 | SA/Dev | P3 设计确认 profile 读取同时支持两种身份方式 |
| 新增第 4 个演示用户/行程改变种子计数 | Dev | 同步更新两个迁移测试与 E2E 身份门断言 |
| `TripCard` 嵌套交互元素 | Dev | 重构卡片点击结构，阻止发布者点击触发卡片跳转 |
| `school` 字段名与「身份/专业」语义不一致 | Dev | UI 文案统一；不做破坏性重命名 |

## Reviewer metadata

- Reviewer: agent（Qoder）
- Human sign-off: pending（G1）
- Date: 2026-11-16

## Next（non-Gate）

`/sdd:g1-decision-record`（需人工签署）或继续 `/sdd:p2` 处理人工澄清。

## Post-lint note（P3 clarification）

- 2026-11-16：P3 核对发现 `trip-plans` 无「已取消」状态，Delta Spec 统计口径已按当前能力澄清（发布行程统计全部已发布行程；未来引入取消时再排除）。该澄清不新增 BLOCKER/WARNING，本报告 P2 结论仍为 Pass。
