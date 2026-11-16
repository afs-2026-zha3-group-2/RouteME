# Consistency lint — refine-experience-share

- **Change:** `refine-experience-share`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/refine-experience-share/`）
- **Timestamp:** 2026-11-16T16:50+0800
- **Artifact level:** 2（proposal + 1 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1 可用；`openspec validate refine-experience-share --strict` → valid；`openspec show refine-experience-share --json --deltas-only` → `deltaCount: 3`（均 `MODIFIED`）

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 4（2 条已在 P2 收口，2 条留待 P3 / P4）/ N/A 6

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

初稿把分享页说明写成 ADDED「游后分享页说明体验去向与分享边界」，检查发现 Living Spec 已有 `### Requirement: 我的旅行分享入口与分享边界`（含「分享页面提示隐私边界」场景），ADDED 会与既有权威并行。已在 P2 改为第三条 MODIFIED（保留 2 个既有场景名 + 新增 2 个），proposal 与 P0/P1 记录同步，重评见 `docs/reviews/20261116-refine-experience-share-{proposal,spec}-review-2.md`。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | Delta 初稿 `## ADDED Requirements`「游后分享页说明体验去向与分享边界」 | 与 Living Spec 既有 Requirement「我的旅行分享入口与分享边界」重叠：既有 Requirement 已声明分享页常驻隐私边界提示，新增 Requirement 会形成两个权威 | 已改为 MODIFIED 第三条 Requirement，保留 2 个既有场景名并新增 2 个 | `openspec/specs/trip-experiences/spec.md:150-165` | spec | [fact] |
| L-02 | SUGGESTION | p2 | `docs/sdd/refine-experience-share/p0-baseline.md`「长期规格权威」行 | Living Spec 规模写成「4 Requirement / 16 Scenario」，实际为 7 / 22（文件含「体验列表分页参数」「参考此行程发布」「我的旅行分享入口与分享边界」三块） | 已改为 7 / 22 | `Select-String "^### Requirement:"` → 7；`"^#### Scenario:"` → 22 | docs | [fact] |
| L-03 | SUGGESTION | p2 | Delta「分享页展示行程概览」 | 「同行人数」未指明字段（`participants.length` 含发布者 vs `joined_count` 不含），P3 与 P4 可能各取一套，导致 hero 与卡片人数不一致 | P3 `design.md` 固定为 `trip.participants.length`（与原型 `S.count()` 同口径），并在组件测试断言 | 原型 `ui.js` `share()` `S.count(t.id) + ' 人同行'`；`trip.participants` 已在 `ShareExperiencePage` 使用 | spec | [inference] |
| L-04 | SUGGESTION | p2 | proposal「验收信号」6 与 Delta「再次提交即修改」 | 「体验条数不变」未指定观测载体（首页卡片计数 / 详情列表长度 / 接口返回），P4 可能只断言文案 | P3 `atdd-design.md` 指定以详情页 `.experience-list li` 数量与首页卡片数量为断言载体 | `TripDetailPage` 体验列表结构；`e2e/tests/experiences.spec.ts` 现有卡片计数断言 | spec | [inference] |

**收口状态：** L-01（Delta 改为 3 条 MODIFIED；proposal「能力」「What Changes」「影响面」「决策」四处同步）、L-02（P0 记录规模改正）已在 P2 收口并复验 `validate --strict`。L-03、L-04 留待 P3 设计与任务。

## 检查明细

### Proposal rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| P1 | `## Why` present and non-empty | Pass | `proposal.md`「## Why」段，四段缺口描述 |
| P2 | `## What Changes` present and non-empty | Pass | `## What Changes` 4 条：能力 / 前端 / 测试 / 契约不变 |
| P3 | Non-Goals / Out-of-scope present and non-empty | Pass | 「Out of scope」6 条，均为精确边界（图片上传、双栏布局、S17、后端 / 契约、编辑历史、隐私采集） |
| P4 | Impact covers self / upstream / downstream | Pass | 「影响面」：self = 分享页 / 体验卡 / `tripMessages` / `styles.css`；upstream = `trip-plans` 只读；downstream = 单测 / E2E / Living Spec 归档 |

### Spec rules

| # | Rule | Result | Evidence |
|---|---|---|---|
| S1 | Spec structure follows project OpenSpec schema | Pass | `## MODIFIED Requirements` + 3 × `### Requirement:` + 12 × `#### Scenario:`；`validate --strict` valid |
| S2 | Citation prefixes stay in agreed set | Pass | 提案仅用 `@rule:`；Delta 无引用前缀 |
| S2b | `@knowledge:` paths resolve | N/A | 无 `@knowledge:` 引用 |
| S2c | `@rule:<ID>` resolves to rules file | Pass | 提案出现的 5 个 ID 均命中规则正文：`spec-first` / `sdd-artifacts` / `web-coding-style` / `web-testing` / `pii-scrubbing` |
| S3 | Every Requirement traces to proposal What Changes | Pass | 3 条 Requirement ↔ `## What Changes` 第 1 条的三个分句 |
| S4 | Scenarios use Given / When / Then | Pass | 12/12 三要素齐全 |
| S5 | Scenarios belong to a numbered Requirement | Pass | 12/12 挂在对应 `### Requirement` 下 |

### Shared / cross-artifact

| # | Check | Result | Evidence |
|---|---|---|---|
| X-1 | 交叉引用 / ID 指向不存在的段落或能力 | Pass | proposal / Delta 的路径与能力名均存在；change 目录含 `proposal.md`、`specs/trip-experiences/spec.md`、`dov-ac-review.md`、本报告 |
| X-2 | 同一能力 / 需求在两处表述不兼容 | Pass（修复后） | 修复前 ADDED 与 Living Spec「我的旅行分享入口与分享边界」并行；修复后为 MODIFIED 替换 |
| X-3 | 验收标准空泛不可测 | Pass | 提示字面量、条数不变、hero 五项、封面条与目的地名均可观察 |
| C1 | proposal → spec：What Changes 被 Spec Requirement 覆盖 | Pass | 3 个分句各对应 1 条 Requirement；「契约 / 后端 / 迁移不变」为声明性不改，按定义不需要 Delta |
| C2 | spec → tasks：每 Requirement 至少 1 task | N/A | `tasks.md` 属 P3 |
| C3 | 术语一致（分享页 / 体验卡 / 发布者 / 已接受同行者） | Pass | Delta 与 proposal 用词一致；`ongoing` 用中文「旅行中」并注明四态 |
| C4 | 与 Living Spec 既有场景名冲突 | Pass | 10 个既有场景名原样保留，新增 2 个不与既有重名 |
| C5 | 与未归档 change 的范围冲突 | Pass | `refine-inspiration-home` 改列表视图、`add-destination-area-filters` 改筛选、`add-trip-completion` 改状态机；本 change 只加封面条与分享页说明，无同文件同行为改写 |

## Residual risks

- 3 条 Requirement 同时被替换，归档时需一次合并 3 块；若与 `refine-inspiration-home` / `add-destination-area-filters` 同窗口归档，`trip-experiences` 会被多个 delta 触碰，必须串行。
- 体验卡封面改变首页卡片高度，`experiences.spec.ts` 的骨架与计数断言需同批复验。
- 两套不可用文案与既有 E2E 单句断言冲突，P4 必须同批更新。

## Next

- L-03 / L-04 进 P3：`design.md` 固定同行人数口径、`atdd-design.md` 固定条数与封面的断言载体。
- 无阻塞项；G1 可在 IO / SA 具名签署后通过。
## R2 追加检查（2026-11-16 20:55）

**Verdict: Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 2（均留 P3 / P4）。

| id | 级别 | 位置 | 问题 | 处理 |
|---|---|---|---|---|
| R2-L-01 | SUGGESTION | Delta「我的旅行分享入口与分享边界」 | 布局句与行为句写在同一 Requirement，句子偏长 | 保留（同一页面同属一个分组）；P3 design.md 拆成「布局」与「说明」两个设计条目 |
| R2-L-02 | SUGGESTION | 提案「决策」网格类名 | 复用 `.publish-grid` 的命名语义偏差 | P3 记录复用理由；第三个页面复用再抽别名 |

- Delta 场景数 12 → 13（新增「分享页布局与原型一致」），既有场景名全部保留。
- `openspec validate refine-experience-share --strict` → valid；`--deltas-only` → `deltaCount: 3`（均 MODIFIED）。
- 与 Living Spec 无并行权威：仍在同一条 Requirement 内扩充。