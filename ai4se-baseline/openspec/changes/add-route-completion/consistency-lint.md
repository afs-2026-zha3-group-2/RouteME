# Consistency lint — add-route-completion

- **Change:** `add-route-completion`
- **Phase:** p2（Delta 收敛、G1 前）
- **Focus:** 默认范围（change 包 + 既有 Living Spec 依赖面 `user-profile` / `user-profiles` / `trip-plans` / `trip-companions`）
- **Date:** 2026-11-18 ｜ **Artifact level:** 2（proposal + specs；无 design / tasks）
- **Verdict: Pass** ｜ **Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 / N/A 6

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority |
|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION（已消解） | p2 | `specs/route-completion/spec.md` 头部计数 / proposal「Impact」 | P1 起草时把 Delta 场景数误记为 19（REQ 提示 S31-3 与 S31-15 在 Delta 合并为同一场景，实际 18） | 已在 P2 更正 Delta 头部、proposal、p1-intent 与 spec 评审报告（追加变更摘要），无需进一步动作 | `[fact]` | spec |
| L-02 | SUGGESTION（P3 承接） | p2 | Delta「资料响应兼容与访问控制」 | 契约层细节（`UserProfile.required` 的具体写法、示例值、契约版本 `0.26.0`）未在 Delta 展开 | P3 契约定稿时写入 `openapi.yaml` 并同步 `OpenApiTest`；Delta 已定「恒返回并列入 `required` / 可空可省略」的行为口径 | `[inference]` | spec |
| L-03 | SUGGESTION | p2 | `openspec/specs/route-completion/`（不存在） | `route-completion` 为新能力，Living Spec 尚不存在 | P5 归档时新建 Living Spec；本 change 的归档需排在 `add-credit-account` / `add-travel-finance` 等已合并但未归档的 change 之后，无冲突 | `[fact]` | spec |
| L-04 | SUGGESTION（显式推迟） | p2 | Delta「数据充足判定与统计范围」 | 未来聚合算法（单行程均值 vs 打卡点加权）与样本门槛的进一步细化未定 | 已由 proposal「Out of Scope」显式推迟到后续卡片；若未来口径与本 Delta 冲突，先改规格 | `[fact]` | proposal |
| L-05 | SUGGESTION（P3/P4 验证） | p2 | Delta「预留路线完成度字段与数据不足口径」 | 「数据不足时省略字段」依赖 `UserProfileResponse` 类级 `@JsonInclude(NON_NULL)`；若 P3 改成逐字段覆盖或其他序列化策略，需回写 Delta | P4 用 API 断言锁定「数据不足时 JSON 不含 `route_completion_rate`、含 `route_completion_state = insufficient`」 | `[inference]` | code |

## Checklist results

### Proposal rules（P1–P4）

| # | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 非空：issue #45 诉求、仓库零实现证据、打卡数据源缺失与垂直切片理由 |
| P2 `## What Changes` | Pass | 6 组变更与 6 条 Requirement 对应（第 6 组「登记」为流程项） |
| P3 Non-Goals / Out-of-scope | Pass | `## Out of Scope` 8 条，具体到打卡 / 聚合算法 / 表 / 迁移 / 展示面 / 其他能力 |
| P4 Impact self / upstream / downstream | Pass | 后端响应与派生（self）、资料装配路径与 `openapi`（upstream）、前端消费者 / 测试 / Living Spec（downstream）均列出 |

### Spec rules（S1–S5）

| # | Result | Note |
|---|---|---|
| S1 结构符合 OpenSpec | Pass | `## ADDED Requirements` + `### Requirement` + `#### Scenario`；`openspec validate --strict` valid |
| S2 引用前缀 | Pass | Delta 无引用前缀；proposal 仅用 `@rule:` |
| S2b `@knowledge:` 可达 | N/A | 未使用 |
| S2c `@rule:` 可达 | Pass | 6 个 `@rule:`（api-contract / java-patterns / web-coding-style / security-baseline / tdd-cycle / sdd-artifacts）均在 `rules/_INDEX.md` |
| S3 Requirement 追溯提案 | Pass | 6 条 Requirement 一一对应 What Changes；无孤儿 |
| S4 Given / When / Then | Pass | 18/18 场景三段齐备（P2 补齐 12 处缺失的 `When`） |
| S5 孤儿场景 | Pass | 无 |

### Tasks / Design rules

| # | Result | Note |
|---|---|---|
| T1–T3 | N/A | `tasks.md` 尚未产出（P3） |
| D1–D3 | N/A | `design.md` 尚未产出（P3） |

### Shared / cross-artifact（C1 / C2 / C6）

| # | Result | Note |
|---|---|---|
| C1 proposal → spec | Pass | 提案 6 组变更 ↔ 6 Requirement；「登记」为流程项不产生 Requirement |
| C2 spec → tasks | N/A | 无 tasks |
| C6 `@rule` 可达 | Pass | 见 S2c |
| 同一能力两处不兼容 | Pass | 既有 `user-profile` / `user-profiles` Living Spec 未被改写；Delta 只追加能力，不 MODIFIED / REMOVED |
| 模糊 / 不可测 AC | Pass | 无「正常工作 / 合理」类表述；阈值、文案、错误码均可断言 |

### phase=p2 checks

| # | Result | Note |
|---|---|---|
| 1 提案范围 vs Delta 范围 | Pass | 无静默扩张；Out of Scope 项在 Delta 未出现 |
| 2 Delta 内部一致（actors / constraints / scenarios） | Pass | 本人 / 他人同口径；`insufficient` 文案与「不显示百分比」一致；独立性约束与展示面无冲突 |
| 3 关键场景在 Delta 有落点或显式推迟 | Pass | 空值序列化与 `required` 已于 P2 定稿；聚合算法 / 契约示例 / 视觉色阶为显式 P3 或后续卡片推迟 |
| 4 tasks 方向检查 | N/A | 无 tasks |
| 5 无法追溯的 Requirement | Pass | 无 |

## Residual risks

- 本版本全部用户为 `insufficient`；`good` / `neutral` / `watch` 依赖夹具或接口拦截验证，真实数据路径待打卡聚合卡片。
- 契约版本 `0.26.0` 依赖合并顺序；被在途 change 抢占时整体顺延并同步 `OpenApiTest`。
- 若 P3 改变序列化策略（逐字段覆盖或统一 `null`），Delta 与本报告的口径需回写并重评。
- P3 视觉细节（`neutral` / `insufficient` 色阶、行高）未定，需按原型先行并走查四宽度 × 深浅色。

## Reviewer metadata

- Agent 检查：2026-11-18；人工签署：无（本报告不是 Gate，无需签署位；G1 由 IO + SA 另行具名）。

## Next（non-Gate）

- `/sdd:g1-decision-record`（IO = WAYNE，SA = Jacky / Karena 具名签署）或继续 `/sdd:p2`（P2 质量报告与阶段记录）。
