# Consistency lint — add-trip-completion（phase=p2）

- **Change：** `add-trip-completion`（REQ-011 / S15）
- **Phase：** p2 ｜ **Focus：** change folder（proposal + delta specs）
- **Artifact level：** 2（proposal + specs；无 `tasks.md` / `design.md`）
- **时间：** 2026-11-16 ｜ **Reviewer：** `/sdd:consistency-lint`（agent）；人类签署待 G1

## Verdict

| Verdict | BLOCKER | WARNING | SUGGESTION | N/A |
|---|---|---|---|---|
| **Pass** | 0 | 0 | 5 | T1–T3、D1–D3、C2 |

## Checks

| 组 | 检查 | 结果 | 证据 / 说明 |
|---|---|---|---|
| Proposal P1 | `## Why` 存在且非空 | Pass | 现状三态、无日期流转、待处理申请悬挂 |
| Proposal P2 | `## What Changes` 存在且非空 | Pass | 三行变更 + 影响面表 |
| Proposal P3 | Out of scope 存在且非空 | Pass | 撤销、推送、取消、评价、统计接口形状 |
| Proposal P4 | Impact 覆盖 self / upstream / downstream | Pass | 「需求与证据」显式列出上游依赖 / 下游消费；影响面表为 self |
| Spec S1 | Delta 结构符合 OpenSpec schema | Pass | `## MODIFIED Requirements` / `## ADDED Requirements`；`openspec validate --strict` valid |
| Spec S2 | 引用前缀在约定集合内 | Pass | 仅 proposal 使用 `@rule:`；delta spec 无未知前缀 |
| Spec S2b | `@knowledge:` 路径可解析 | N/A | 未使用 `@knowledge:` |
| Spec S2c | `@rule:<ID>` 可达 | Pass | `docs/knowledge/rules/_INDEX.md` 列出 `api-contract` / `package-structure` / `java-patterns` / `web-coding-style` / `sdd-artifacts` |
| Spec S3 | 每个 Requirement 可追溯到 proposal What Changes | Pass | 四态、流转、结束、善后、申请、退出、提醒、列表/统计均有对应条目 |
| Spec S4 | 场景使用 Given / When / Then | Pass | 全部场景 |
| Spec S5 | 场景属于编号 Requirement | Pass | 无孤儿场景 |
| Tasks T1–T3 | 任务粒度 / 验证尾项 / 不越界 | N/A | 本阶段无 `tasks.md`（P3 产出） |
| Design D1–D3 | 决策编号 / 背景 / 备选 | N/A | 本阶段无 `design.md`（P3 产出） |
| Cross C1 | proposal → spec：What Changes 被 spec 覆盖 | Pass | In scope 10 项全部有 Requirement / 场景承接 |
| Cross C2 | spec → tasks：每个 Requirement 至少一个任务 | N/A | 无 tasks.md |
| Cross C6 | `@knowledge:` / `@rule:` 可达 | Pass | `_INDEX.md` 索引可达；无 `@knowledge:` |
| p2-1 | Proposal 范围 vs Delta 范围无静默扩张或丢失 | Pass | 无新增能力；退出同行与统一口径为提案「申请规则 / 列表与统计」的下沉细化 |
| p2-2 | Delta capabilities 内部一致（角色 / 约束 / 场景） | Pass | 两 capability 对「已结束」「未结束」「满员」定义一致；状态优先级唯一 |
| p2-3 | 提案关键场景 / 约束在 Delta 有归属或显式延后 | Pass | D9 / OQ-10 / OQ-11 显式 deferred 至 P3，其余全有场景 |
| p2-4 | tasks 与 Delta 方向不冲突 | N/A | 无 tasks.md |
| p2-5 | 无法追溯到提案的 Requirement | Pass | 无 |
| p2-6 | 应用 P/S/T/D + C1/C2/C6 | Pass | 见上 |

## Findings（SUGGESTION）

| id | Severity | Location | Issue | Suggested fix | Authority | Tag |
|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | `trip-experiences` / `user-profiles` | 两能力无 delta，仅依赖 `trip-plans` 的四态定义；P4 若不回归，体验入口与统计口径可能漏验 | P4 增加自动完成后的体验入口与「已完成」统计回归用例，并在验证报告显式引用本 change | spec | [inference] |
| L-02 | SUGGESTION | `MatchServiceImpl` / `TripPlanService.latestOpenByPublisher` | 现有匹配参照按 `completed_at IS NULL` 取「未结束」，四态后会把自动完成行程当作参照物 | P3 设计、P4 改为统一的「已结束」判定 | code | [fact] |
| L-03 | SUGGESTION | `openapi.yaml` / `OpenApiTest` | `status` 新增 `ongoing` 后，契约枚举与测试断言需同批更新，否则 CI 必红 | P3 确定契约版本，P4 同一提交更新枚举、测试与前端类型 | code | [fact] |
| L-04 | SUGGESTION | `TripPlanMapper.xml` | 未结束列表仍用 `completed_at IS NULL`，无法排除到期自动完成 | P4 按「已结束」口径改造查询（可用 `end_date >= today` 或物化完成时间） | code | [fact] |
| L-05 | SUGGESTION | `ApplicationServiceImpl.decide()` | 结束后仍可拒绝既有申请，与「结束后接受与拒绝全部关闭」冲突 | P4 增加「行程已结束 → 拒绝处理」分支并补 API 用例 | code | [fact] |

## N/A / skipped

- T1–T3（无 `tasks.md`）、D1–D3（无 `design.md`）、C2（无 `tasks.md`）。
- S2b（未使用 `@knowledge:`）。

## Residual risks

1. **双 capability 例外：** `trip-plans` + `trip-companions` 同时修改，归档前需 SA 具名追认。
2. **自动完成物化时机：** 纯推导 / 懒写入未定（D9），P3 必须给出可测试的实现方案。
3. **提醒去重：** MVP 不持久化已读（OQ-10）。
4. **只读消费方回归：** 体验与统计无 delta，依赖 P4 回归用例兜底。
5. **匹配参照实现漂移：** 现有 `latestOpenByPublisher` 与四态不一致（L-02），P3 / P4 需跟踪。

## Next（non-Gate）

- `/sdd:g1-decision-record`（需 IO + SA 具名）或继续 `/sdd:p2`。
- 本报告不是 Gate 结论，不替代 G1 决策。

## 补记（2026-11-16，G1 后）

- Delta 新增两个过期状态边界场景（`trip-plans` 四态、`trip-companions` 提交申请），仍通过 `openspec validate --strict`。
- 新增 L-06（SUGGESTION）：懒写入方案下，若任一写操作未经过统一物化入口，就会在「页面停留过期」窗口内错误放行；P3 设计必须把物化收敛到单一入口（单条 `require` + 列表查询前批量），禁止各业务分支自行判日期。
- 无新增 BLOCKER / WARNING，Verdict 维持 Pass。
