# Consistency lint — add-experience-photos

- **Change：** `add-experience-photos`
- **Phase：** `p2`
- **Focus：** full change（`openspec/changes/add-experience-photos/`）
- **Timestamp：** 2026-11-17
- **Artifact level：** 2（`proposal.md` + `specs/trip-experiences/spec.md`；无 `tasks.md` / `design.md`）
- **Tooling：** `openspec` 1.16.1；`openspec validate add-experience-photos --strict` → `valid`；`show --deltas-only` → `deltaCount: 5`（ADDED 2 + MODIFIED 3）

## Verdict

**Partial** — BLOCKER 0 / WARNING 1 / SUGGESTION 2 / N/A 4。

唯一 WARNING 是归档阶段的 Living Spec `Purpose` 漂移，不影响 G1 对 Delta 的判断；建议 G1 以条件 C1 承接（P5 更新 Purpose）。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | WARNING | p5 | Living Spec `Purpose`（`openspec/specs/trip-experiences/spec.md:5`） | Purpose 仍写「体验为纯文字 + 内置封面」；本 change 合并后应为「纯文字 + 可选图片 + 内置封面」 | P5 `/sdd:living-merge` 时同步更新 Purpose；G1 以条件 C1 承接 | Living Spec 第 5 行；Delta ADDED 2 + MODIFIED 3 | spec | [fact] |
| L-02 | SUGGESTION | p3 | Delta ADDED「未登录上传被拒绝」 | 只写 401，未固定错误码；现有错误码枚举含 `DEMO_USER_REQUIRED` / `SESSION_INVALID` | P3 `design.md` 按端点固定 401 错误码，并与 `openapi.yaml` 同步 | `openapi.yaml:2280-2285` | spec | [fact] |
| L-03 | SUGGESTION | p3 | proposal「影响面」契约 / 迁移两行 | 版本号与迁移号未定，且与 `add-ai-itinerary`（计划 0.12.0 + V18）可能撞车 | P3 统一排号；冲突则顺延 0.13.0 + V19 | `registry.md` REQ-017 | proposal | [fact] |

## 检查明细

### Proposal rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| P1 | `## Why` present and non-empty | Pass | 「Why」四段现状缺口 |
| P2 | `## What Changes` present and non-empty | Pass | 5 条：ADDED 2 + MODIFIED 3 + 前端 / 后端 / 契约 / 原型 / 测试 |
| P3 | Out-of-scope present and non-empty | Pass | 6 条精确边界（行程封面、聊天、头像、审核、对象存储、S17 复制图片） |
| P4 | Impact covers self / upstream / downstream | Pass（P2 补行） | self = 契约 / 后端 / 前端 / 原型；upstream = `trip-plans` / `user-profile` 只读；downstream = 测试 / Living Spec / requirement workspace |

### Spec rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| S1 | Spec structure follows project OpenSpec schema | Pass | ADDED 2 + MODIFIED 3；23 Scenario；`validate --strict` valid |
| S2 | Citation prefixes stay in agreed set | Pass | Delta 无引用前缀；proposal 仅 `@rule:` |
| S2b | `@knowledge:` paths resolve | N/A | 无 `@knowledge:` 引用 |
| S2c | `@rule:<ID>` resolves | Pass | 5 个 ID 均命中：`spec-first` / `sdd-artifacts` / `web-coding-style` / `web-testing` / `pii-scrubbing` |
| S3 | Every Requirement traces to proposal What Changes | Pass | 5 条 Requirement ↔ What Changes 的 ADDED / MODIFIED 分句 |
| S4 | Scenarios use Given / When / Then | Pass | 23/23 三要素齐全 |
| S5 | Scenarios belong to a numbered Requirement | Pass | 23/23 挂在对应 Requirement 下 |

### Shared / cross-artifact

| # | Check | Result | Evidence |
|---|---|---|---|
| X-1 | 交叉引用 / ID 指向不存在的段落或能力 | Pass | capability `trip-experiences` 存在；Requirement 名与 Living Spec 一致 |
| X-2 | 同一能力 / 需求在两处表述不兼容 | Pass | 图片为可选增强；纯文字、内置封面、发布资格不变 |
| X-3 | 验收标准空泛不可测 | Pass | 数量、顺序、403 / 400 / 401、EXIF、24h 清理、卡片封面均可断言 |
| C1 | proposal → spec：What Changes 被 Spec Requirement 覆盖 | Pass | 5 条 Requirement 覆盖 5 条 What Changes |
| C2 | spec → tasks：每 Requirement 至少 1 task | N/A | `tasks.md` 属 P3 |
| C6 | `@rule:` reachability | Pass | 5/5 命中 |

### phase=p2 checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Proposal scope vs Delta scope — no silent expansion / drop | Pass | ADDED 1 → 2 属结构拆分；场景 20 → 23 为补齐预览 / 401 / 归属分支 |
| 2 | Delta capabilities internally consistent | Pass | actors / constraints / scenarios 一致；无平行 Requirement |
| 3 | Key scenarios / constraints from proposal have a home | Pass | REQ-018 §4 9/9 映射（`dov-ac-review.md` §3） |
| 4 | tasks do not contradict Delta | N/A | 无 `tasks.md` |
| 5 | Requirements that cannot trace to proposal | Pass | 无孤儿 Requirement |
| 6 | Apply P/S/T/D + C1/C2/C6 | Pass | 见上表 |

### N/A / skipped

- Tasks rules T1–T3：无 `tasks.md`（P3 产出）。
- Design rules D1–D3：无 `design.md`（P3 产出）。
- C2 spec → tasks：同上。
- S2b `@knowledge:`：无引用。

## Residual risks

- **归档顺序：** `refine-experience-share` 未归档且同改 `trip-experiences`；本 change 的 Delta 合并必须排在其后，并与 `refine-inspiration-home` / `add-destination-area-filters` 串行。
- **Purpose 漂移：** L-01；P5 更新 Purpose，G1 以条件 C1 承接。
- **图像处理依赖：** EXIF 全量剥离需引入库；P3 记录许可证与失败降级（`dov-ac-review.md` R-01）。
- **无自动审核：** D8；依赖举报入口，产品残余风险。
- **E2E 共享目录：** 上传用例依赖真实文件；沿用隔离产物目录与独立 SQLite。

## Reviewer metadata

- **评审：** AI agent（`/sdd:consistency-lint` phase=p2）
- **人工确认：** 待 G1（IO=WAYNE / SA=Jacky、Karena）确认 L-01 作为条件 C1
- **日期：** 2026-11-17

## Next

- `/sdd:g1-decision-record`（IO / SA 具名签署）；或继续 `/sdd:p2` 收口 L-02 / L-03。
- 本报告不是 G1 决策，也不改写任何权威规格。
