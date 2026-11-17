# Consistency lint — refine-detail-companions

- **Change:** `refine-detail-companions`
- **Phase:** `p2`
- **Focus:** `openspec/changes/refine-detail-companions/`（proposal + Delta + `dov-ac-review.md`）↔ Living Spec `trip-plans` / `trip-companions` / `design-system` ↔ `requirement-workspace`（REQ-020 / deep-dive / impact-brief §20）
- **Timestamp:** 2026-11-17T12:10+08:00
- **Artifact level:** 2（`proposal.md` + 1 Delta Spec；无 `design.md` / `tasks.md`）
- **Tooling:** `openspec` CLI 可用；`openspec validate refine-detail-companions --strict` → `Change 'refine-detail-companions' is valid`；`openspec show --json` 对中文「## 问题」标题返回 `Change must have a Why section`（项目既有约定差异，不据此判 Fail）

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 6 / N/A 5

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | Delta Scenario「没有其他同行者时的空态」 | 只约定「可读空态」，未固定文案与落点 | P3 在 `tripMessages` 定按键与文案，E2E 断言可见文本；不改变「不展示空列表 / 发布者姓名」的结论 | `requirement-workspace/requirements/REQ-020-detail-companion-cards.md` §8 | spec | [fact] |
| L-02 | SUGGESTION | p2 | Delta Requirement「同行者资料卡」↔ `profileDisplay.ts:26-28` | 复用 `publisherSummary` 语义成立，但函数名为发布者命名，归档后可能引起「同行者是否应另写一套」的误读 | P3 可在调用处注释或补一个语义别名；不在本 change 扩大改名 | `RouteME/frontend/src/profile/profileDisplay.ts` | spec | [inference] |
| L-03 | SUGGESTION | p2 | `dov-ac-review.md`「组件测试分层」 | 仓库无 `TripDetailPage` 组件测试；当前计划以 E2E 为主 | P3 ATDD 决定是否补 Testing Library，并说明 E2E-only 理由 | `RouteME/frontend/src/trips/`、`RouteME/e2e/tests/chat-entry.spec.ts:78-84` | proposal | [fact] |
| L-04 | SUGGESTION | p2 | `RouteME/frontend/src/styles.css:1265-1268,2691-2707` | `.detail-participants` 存在两处旧规则；P4 若只删一处会留死样式或布局漂移 | P4 收敛两处旧规则，新增卡片样式追加到文件末段；合并 `origin/main` 后抽查 | 当前 `styles.css`；历史 merge 丢样式事故 | code | [fact] |
| L-05 | SUGGESTION | p2 | `proposal.md` 标题结构 ↔ `openspec show --json` | 项目使用中文「## 问题」而非 `## Why`，导致 `show --json` 报错；`validate --strict` 不受影响 | 记录为工具 / 文档约定差异；后续 `/sdd:rules-govern` 或 OpenSpec 适配统一，不在本 change 处理 | `openspec validate --strict` valid；`openspec show --json` 报错 | spec | [fact] |
| L-06 | SUGGESTION | p2 | Delta Scenario「同行申请入口按资格显示」 | 该基线场景包含两组 Given / When / Then，格式与其余场景不一致（Living Spec 原样保留） | 保持原样以避免改变基线语义；若 P5 归一化，需在归档说明标注场景数变化 | `openspec/specs/trip-plans/spec.md:207-213` | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | 对应中文「## 问题」：发布者卡片 vs 同行者纯姓名、信息浪费、发布者重复；非空（项目既有约定，全部 change 一致） |
| P2 `## What Changes` | Pass | 对应「## 范围」In scope 9 条 + 「## 影响面」13 行 |
| P3 Non-Goals | Pass | 对应「## 范围」Out of scope 7 条，具体到后端 / 契约 / 迁移、同行规则、其它页面、资料能力、排序与独立路由 |
| P4 Impact self / upstream / downstream | Pass | 自身（`TripDetailPage` / `styles.css` / `tripMessages` / 原型）、上游（`participants` / `publisherSummary` / `openProfile`）、下游（E2E / `docs/sdd` / 评审） |
| S1 Spec structure | Pass | `## MODIFIED Requirements` + `### Requirement` + `#### Scenario`；`validate --strict` valid |
| S2 / S2b / S2c 引用前缀 | Pass | 提案 `@rule:` 均指向存在锚点（原型规则改用 `docs/prototype` 路径）；Delta 无 `@knowledge:` / `@rule:` |
| S3 Requirement → proposal What Changes | Pass | 唯一 Requirement「查看行程详情与清晰的状态」对应提案 `trip-plans` MODIFIED |
| S4 Given / When / Then | Pass | 12/12 Scenario 三要素齐备（含基线两组式场景） |
| S5 Scenario 归属 | Pass | 每个 Scenario 都在唯一 Requirement 之内 |
| C1 proposal → spec | Pass | In scope 9 条 → 1 Requirement 全覆盖；Out of scope 全部无对应 Requirement |
| C2 spec → tasks | N/A | 无 `tasks.md`（P3） |
| C6 引用可达 | Pass | 无 `@knowledge:` / `@rule:` 断链 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 scope | Pass | 提案与 Delta 范围一致；无静默扩 / 缩 |
| p2-2 internal consistency | Pass | 发布者过滤、人数口径、排序、聊天权限、空态在 Requirement 与 Scenario 中一致 |
| p2-3 proposal scenarios / constraints in Delta | Pass | C-1 ~ C-10 全部有落点；C-8 / C-10 在 Requirement 正文反向约束 |
| p2-4 tasks direction | N/A | 无 `tasks.md` |
| p2-5 traceability | Pass | 10/10 场景映射见 `dov-ac-review.md` |

## Living Spec 基线保留

- `trip-plans`「查看行程详情与清晰的状态」基线 4 场景：**1 条 MODIFIED / 3 条原样保留**。
- 唯一语义替换：原句「当前同行者至少包含发布者本人」→「发布者不在同行者列表重复」（D1）。该替换已写入 Delta Requirement 正文与「查看行程详情」Scenario，需 G1 具名确认。
- `trip-companions` / `user-profiles` / `design-system` 无 Delta，未覆盖其 Requirement。

## N/A / skipped

- `tasks.md` 相关（T1–T3、C2、p2-4）：P3 产出。
- `design.md` 相关（D1–D3）：P3 产出。
- `all-specs-review`：P3 全链完成后执行；本 lint 不替代它。

## 修复建议（按优先级）

1. **无 BLOCKER。**
2. **无 WARNING。**
3. SUGGESTION：L-01 / L-02 / L-03 / L-04 带入 P3 `design.md` 与 `tasks.md`；L-05 / L-06 记录为约定差异，不阻断 G1。

## Residual risks

- D1 替换 Living Spec 基线口径是本 change 唯一的产品语义变更；若 SA 要求保留「至少包含发布者本人」，需改回并调整 UI 方案（同行者区需包含发布者资料卡）。
- 空态文案与组件测试分层尚未定稿；若 P3 遗漏，P4 E2E 会出现「有卡无空态断言」或「卡片交互只靠 E2E」的覆盖缺口。
- `styles.css` 多人并行修改热点；P4 合并 `origin/main` 后若丢样式，同行者卡片会退化为无样式列表。
- `chat-entry.spec.ts` 的 `.detail-participants` 选择器在 P4 必须同步更新，否则该用例会悬空失败。

## Reviewer metadata

- Reviewer: AI agent（P2 consistency lint）
- Human sign-off: 待 G1（IO / SA）
- Date: 2026-11-17

## Next

- `/sdd:g1-decision-record`（IO + SA 具名签署）；或继续 `/sdd:p2` 处理 SUGGESTION。
- 本报告不是 Gate 结论，不替代 G1。
