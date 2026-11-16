# Consistency lint — add-destination-area-filters（phase=p2）

- **Change:** `add-destination-area-filters`（REQ-007）
- **Phase:** p2
- **Focus:** 全量（proposal + 两份 delta；无 tasks/design）
- **Timestamp:** 2026-11-16T11:05+0800
- **Artifact level:** 2（proposal + specs；`tasks.md` / `design.md` 尚未产出）
- **Tooling:** `openspec validate add-destination-area-filters --strict` → valid；其余为人工 checklist（verdict 上限 Partial）

## Verdict

**Partial** — BLOCKER 0 / WARNING 4 / SUGGESTION 1 / N/A 3。

## Findings

| id | severity | location | issue | suggested_fix | evidence | authority | fact/inference |
|---|---|---|---|---|---|---|---|
| L-01 | WARNING | `proposal.md` 头部 `@rule:*` | `@rule:api-contract` 等按 pack 的 S2c 规则应解析到 `<ID>.md`，项目实际把规则放在 `docs/knowledge/rules/*/rules.md` 的分组文件中，无法按文件名直接解析 | 保留项目既有 `@rule:<ID>` 约定，或在规则索引补锚点；不阻塞本 change | `docs/knowledge/rules/_INDEX.md`、`quality/rules.md` 等 | proposal | [fact] |
| L-02 | WARNING | `openspec/changes/add-trip-publish/g1-decision.md`、`g2-decision.md` | A 的 G1/G2 记录基于目的地修订前范围（G1 记 11 Scenario；修订后 13 Scenario；G2 记 T1–T5 完成），与当前 A 的 delta/tasks 不一致 | A 的 owner 在目的地修订完成后重评 G1/G2；A 归档前必须处理 | A 的 G1/G2 与 `specs/trip-plans/spec.md` | spec | [fact] |
| L-03 | WARNING | `openspec/changes/refine-inspiration-home/tasks.md`、`e2e/tests/experiences.spec.ts` | refine 的 `guides an empty search...` 用例依赖搜索框；本 change 移除搜索后该用例失效 | refine 的 owner 改成用目的地/日期筛选制造空态；本 change G1 记为条件 | refine tasks T1、`experiences.spec.ts` | spec | [fact] |
| L-04 | WARNING | `openspec/specs/trip-plans/spec.md`「筛选变化重置分页」 | 现状场景仍写"用户修改关键词、目的地…"，与「本迭代不提供关键词搜索」存在术语漂移 | 本 change 的新筛选 requirement 已显式声明"关键词不再属于筛选项"；归档合并时由 refine/本 change 的 owner 收敛该句 | Living Spec + 本 change `按目的地与日期筛选行程` | spec | [fact] |
| L-05 | SUGGESTION | `proposal.md` | 保留了"问题/范围"与"Why/What Changes"两套标题，略有重复 | 保留项目既有"问题/范围"作为细节，Why/What Changes 作为 lint 入口；后续可统一 | proposal | proposal | [inference] |

## N/A / skipped

| 检查 | 原因 |
|---|---|
| P/S/T/D 的 Tasks 规则（T1–T3） | `tasks.md` 尚未产出（P3） |
| Design 规则（D1–D3） | `design.md` 尚未产出（P3） |
| S2b `@knowledge:` 路径 | 本 change 未使用 `@knowledge:` |

## Fix suggestions（按优先级）

1. **先处理 L-02/L-03 的 owner 条件**（不修改别人的 change，只记录；G1 条件项）。
2. L-01 属项目规则引用约定，保留现状并在 G1 说明即可。
3. L-04 在归档合并时收敛；本 change 的 requirement 已显式 supersede。
4. L-05 可选，不阻塞。

## Residual risks

- `refine-inspiration-home`（0/19 tasks）未归档，且同改两 requirement；本 change 的 delta 已保留其首页双视图场景，但归档顺序必须先它后本 change。
- `add-trip-publish` 目的地修订未实现（5 条待完成任务），其 G1/G2 需重评；本 change 的数据底座是其前置。
- V10 重建 `trip_plans` 的外键处理与匹配 code 比较回归，需在 P3 design/tasks 中落实。
- 区划数据包 v5 数据约 2019/2020，MVP 接受；升级不改契约。

## Reviewer metadata

- Agent: Qoder
- Human sign-off: pending（G1）
- Date: 2026-11-16

## Next（non-Gate）

- `/sdd:g1-decision-record`（需 IO/SA 具名签署）或继续 `/sdd:p2`。
- 本报告不是 Gate 结果；BLOCKER 0，WARNING 由 owner 在归档前收敛。
