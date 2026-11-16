# Handoff — requirement workspace → OpenSpec

- **Workdir path:** `requirement-workspace/` (override if relocated)
- **OpenSpec changes root:** `openspec/changes/`
- **Rule:** Copy or link stabilized requirements into a change package. This
  workdir is never the long-term Living Spec authority (`openspec/specs/`).

| Artifact | Destination | Notes |
|---|---|---|
| `requirements/` entries | `openspec/changes/<id>/` proposal inputs | After `/sdd:pre-spec-req` |
| Ready / analysis packs | change package or archive | Project convention |

## REQ → OpenSpec change 映射（MVP P1，业务语言）

| REQ | 能力（capability） | change | 意图 | Ready 条目 | 提案 + 业务场景 spec |
|---|---|---|---|---|---|
| REQ-002 | `trip-plans` | `add-trip-plans` | `intents/REQ-002-trip-plans.md` | `requirements/REQ-002-trip-plans.md` | `openspec/changes/add-trip-plans/` |
| REQ-003 | `trip-companions` | `add-trip-companions` | `intents/REQ-003-trip-companions.md` | `requirements/REQ-003-trip-companions.md` | `openspec/changes/add-trip-companions/` |
| REQ-004 | `trip-experiences` | `add-trip-experiences` | `intents/REQ-004-trip-experiences.md` | `requirements/REQ-004-trip-experiences.md` | `openspec/changes/add-trip-experiences/` |
| REQ-005 | `trip-plans`（MODIFIED）/ `trip-experiences`（MODIFIED） | `refine-inspiration-home` | `intents/REQ-005-inspiration-home.md` | `requirements/REQ-005-inspiration-home.md` | `openspec/changes/refine-inspiration-home/` |
| REQ-006 | `user-auth`（ADDED） | `add-user-logout` | `intents/REQ-006-user-logout.md` | `requirements/REQ-006-user-logout.md` | `openspec/changes/add-user-logout/`（依赖的 `add-user-auth` 已归档） |
| REQ-007 | `trip-plans`（MODIFIED）+ `trip-experiences`（MODIFIED） | `add-destination-area-filters` | `intents/REQ-007-destination-area-filters.md` | `requirements/REQ-007-destination-area-filters.md` | `openspec/changes/add-destination-area-filters/` |

- 共享分析：`deep-dive.md`（①–④ 四表，含 REQ-005 / REQ-006 / REQ-007 增补）、`impact-brief.md`（覆盖 002/003/004/005/006/007 需求集）。
- 故事清单：`stories.md`（S03 → `stories/refine-inspiration-home.story.md`；REQ-007 → `stories/REQ-007-destination-area-filters.story.md`）；REQ-006 为单 change 小增量，P1 未拆故事，由 proposal + delta spec 承接。
- 依赖排序（轻 DAG）：REQ-002 → REQ-003 → REQ-004；REQ-005 为首页浏览增量；REQ-006 依赖 `add-user-auth` 已归档；REQ-007 依赖 `refine-inspiration-home`（同改 `trip-plans` / `trip-experiences`）与 `add-trip-publish`（发布页目的地字段）。
- **REQ-007 归档顺序约束：** `refine-inspiration-home` → `add-destination-area-filters` → `add-trip-publish`；三个 change 中只有 `add-destination-area-filters` 属于本需求，其它两个由各自 owner 归档，本需求不主动归档它们。
- **REQ-007 范围边界：** 本 change 拥有数据底座（V10 + 6 位区划码 + 响应字段）+ 筛选/展示 + 体验日期 + 搜索移除；发布页目的地字段归 `add-trip-publish`（已授权只改目的地相关，不归档）；`refine-inspiration-home` 的搜索相关测试由它的 owner 更新。
- **`add-user-auth` 已于 2026-11-16 归档**（`openspec/changes/archive/2026-11-16-add-user-auth/`，Living Spec `openspec/specs/user-auth/`），`add-user-logout` 可在其后归档。
- **BA 交付边界：** 以上为 P0/P1 业务产物。P2 起（delta-craft / design / task-plan / apply / verify / archive，含代码、契约、迁移、技术设计、任务分解）交 dev。
- **P2 状态（REQ-005）：** G1 Pass（2026-11-16）；Delta 评审见 `openspec/changes/refine-inspiration-home/dov-ac-review.md`，一致性检查见同目录 `consistency-lint.md`，决策见 `g1-decision.md`。
- **P3 状态（REQ-005）：** Pass（2026-11-16）；ATDD 设计 `atdd-design.md`、技术设计 `design.md`（D1–D8，含默认视图仍消费 `GET /api/matches` 的事实记录）、任务清单 `tasks.md`（T1–T6 + 对齐自检 Pass）；质量报告 `docs/ai4se-plugins/20261116-100821-quality-checklist-report.md`。下一步 P4（`/sdd:atdd-apply`）。
- **P2 状态（REQ-007）：** G1 **Conditional**（2026-11-16，IO=WANYE / SA=JACKY、KARENA）；Delta 评审 `openspec/changes/add-destination-area-filters/dov-ac-review.md`（AC 5/5 + DoV 4 Pass/1 Partial），一致性 `consistency-lint.md`（Partial，BLOCKER 0），决策 `g1-decision.md`；条件 C1–C6 跟踪，归档顺序 `refine-inspiration-home` → 本 change → `add-trip-publish`。
- **P3 状态（REQ-007）：** Pass（2026-11-16）；`design.md` D1–D9、`atdd-design.md` 20 组场景、`tasks.md` T1–T11、对齐自检 Pass；质量报告 `docs/ai4se-plugins/20261116-111601-quality-checklist-report.md`；阶段记录 `docs/sdd/add-destination-area-filters/p3-design.md`。
- **P4 状态（REQ-007）：** **Conditional**（2026-11-16）；T1–T11 全部完成；后端 161 / 前端 78 / 契约 0 error；E2E 11 passed / 5 failed（既有债务，登记不修）；实现修订：V10 改为 `ADD COLUMN` 不重建表、antd Cascader 改自绘 `AreaCascader`（Edge 兼容）；记录 `docs/sdd/add-destination-area-filters/p4-verify.md` 与 `g2-decision.md`；下一步 P5 归档前置（等 `refine-inspiration-home` 先归档），提交待用户授权。
- **P1 状态（REQ-006）：** Pass（2026-11-16）；提案与 delta 见 `openspec/changes/add-user-logout/`，`openspec validate add-user-logout --strict` 通过；质量报告 `docs/ai4se-plugins/20261116-102110-quality-checklist-report.md`。
- **P2 状态（REQ-006）：** Pass（2026-11-16）；Delta 评审 `dov-ac-review.md`（AC 4/4 + DoV 5/5）、一致性检查 `consistency-lint.md`（Partial，BLOCKER 0 / WARNING 2）、决策 `g1-decision.md`（G1 Pass，条件 4 项）、质量报告 `docs/ai4se-plugins/20261116-103009-quality-checklist-report.md`。实现前先关闭 L-02（`add-user-auth` T6「演示身份不显示退出」）。下一步 P3（`/sdd:atdd-design` → `/sdd:task-plan`）。
