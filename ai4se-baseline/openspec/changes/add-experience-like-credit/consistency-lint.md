# Consistency lint — add-experience-like-credit

- **Change:** `add-experience-like-credit`
- **Phase:** p2（Delta 已签、G1 前）
- **Focus:** 默认范围（change 包 + Living Spec `trip-experiences` + 未归档 `add-credit-account` 的 `user-credit` Delta）
- **Date:** 2026-11-17 ｜ **Artifact level:** 2（proposal + specs；无 design / tasks）
- **Verdict: Pass** ｜ **Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 / N/A 7

## Findings

| id | severity | phase | location | issue | suggested_fix | evidence | authority |
|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `openspec/specs/trip-experiences/spec.md` Purpose | Purpose 只描述「发布 / 展示 / 参考发布」，未提点赞；点赞为新增能力，不构成矛盾 | P5 合并时可选更新 Purpose（如「体验可被点赞」）；不阻塞 G1 | `[fact]` | spec |
| L-02 | SUGGESTION | p2 | `openspec/specs/user-credit/`（不存在） | `user-credit` Living Spec 尚未由 `add-credit-account` 归档生成 | 保持 P5 归档顺序约束：本 change 晚于 `add-credit-account` | `[fact]` | spec |
| L-03 | SUGGESTION | p2 | 两份 Delta 的字段 / 错误码表述 | `like_count` / `liked_by_me` 为候选契约字段；「体验不存在」404 错误码未登记 | P3 契约定稿后回写 Delta（若需）；契约测试与前端类型同步 | `[fact]` | proposal |
| L-04 | SUGGESTION | p2 | `user-credit` Delta「体验获赞加分的月度上限」 | issue 的「本月已 +18，应发 +5，实发 +2」示例与「每档 +1」不自洽；Delta 采用 `min(应发, 月度剩余, 分数余量)` 通用截断，每档应发恒为 +1 | G1 记录该口径解释；不要求复现 issue 示例数值 | `[fact]` | AI-inference |
| L-05 | SUGGESTION | p2 | proposal 两 capability + 评审 F-1 | 单 change 跨 `trip-experiences` / `user-credit` 与 `@rule:sdd-artifacts` 的 one-capability 习惯存在偏离；Delta 内部无冲突 | 交由 G1 的 SA 裁决（proposal 评审 F-1 已记 WARNING），lint 不重复计级 | `[fact]` | proposal |

## Checklist results

### Proposal rules（P1–P4）

| # | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 非空，说明信用底座无调用方与点赞能力为零 |
| P2 `## What Changes` | Pass | 2 + 3 Requirement 与数据 / 契约 / 前端 / 原型逐项列出 |
| P3 Non-Goals / Out-of-scope | Pass | `## 范围` 的 **Out of scope** 非空且具体 |
| P4 Impact self / upstream / downstream | Pass | `## 影响面` 覆盖后端 / 数据 / 契约 / 前端 / 原型 / 不影响面 |

### Spec rules（S1–S5）

| # | Result | Note |
|---|---|---|
| S1 结构符合 OpenSpec | Pass | 两份 Delta 均为 `## ADDED Requirements` + `### Requirement` + `#### Scenario` |
| S2 引用前缀 | Pass | Delta 无引用；proposal 仅用 `@rule:` |
| S2b `@knowledge:` 可达 | N/A | 无 |
| S2c `@rule:` 可达 | Pass | 6 个 `@rule:` 均在 `rules/_INDEX.md`；`prototype-ui-alignment` 已改为路径表述 |
| S3 Requirement 追溯提案 | Pass | 5 Requirement 一一对应 What Changes |
| S4 Given / When / Then | Pass | 24 场景均具备 |
| S5 孤儿场景 | Pass | 无 |

### Tasks / Design rules

| # | Result | Note |
|---|---|---|
| T1–T3 | N/A | `tasks.md` 尚未产出（P3） |
| D1–D3 | N/A | `design.md` 尚未产出（P3） |

### Shared / cross-artifact（C1 / C2 / C6）

| # | Result | Note |
|---|---|---|
| C1 proposal → spec | Pass | 提案 5 项变更均有对应 Requirement |
| C2 spec → tasks | N/A | 无 tasks |
| C6 `@rule` 可达 | Pass | 见 S2c |
| 同一能力两处不兼容 | Pass | `trip-experiences` 基线 7 Requirement / 22 Scenario 未被改写；`user-credit` 与 `add-credit-account` 7 Requirement 不重名 |
| 模糊 / 不可测 AC | Pass | 无「正常工作」类表述 |

### phase=p2 checks

| # | Result | Note |
|---|---|---|
| 1 提案范围 vs Delta 范围 | Pass | 无静默扩张 / 丢弃 |
| 2 Delta 内部一致（actors / constraints / scenarios） | Pass | 点赞者 / 作者 / 系统结算边界一致 |
| 3 关键场景在 Delta 有落点或显式推迟 | Pass | 端点形态 / 错误码 / 并发保障为显式 P3 推迟（见 DoV-2） |
| 4 tasks 方向检查 | N/A | 无 tasks |
| 5 无法追溯的 Requirement | Pass | 无 |

## Residual risks

- `user-credit` Living Spec 依赖 `add-credit-account` 先归档；若归档顺序变化，Living 合并会缺账户底座。
- 若 P3 契约定稿改名（`like_count` / `liked_by_me`）或新增错误码，Delta 与评审报告需补一次变更摘要。
- 双 capability 偏离与月度并发严格性仍需 G1 / P3 处理。

## Reviewer metadata

- Agent 检查：2026-11-17；人工签署：无（本报告不是 Gate，无需签署位；G1 由 IO + SA 另行具名）。

## Next（non-Gate）

- `/sdd:g1-decision-record`（IO Wanye + SA Jacky / Karena 具名签署）或继续 `/sdd:p2`（P2 质量报告与阶段记录）。
