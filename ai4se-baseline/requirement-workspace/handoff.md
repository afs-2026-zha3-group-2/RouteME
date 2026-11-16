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
| REQ-005 | `user-profiles` | `add-user-profiles` | `intents/REQ-005-publisher-profile.md` | `requirements/REQ-005-publisher-profile.md` | `openspec/changes/add-user-profiles/` |

- 共享分析：`deep-dive.md`（①–④ 四表 + REQ-005 增补）、`impact-brief.md`（REQ-002/003/004 + REQ-005 增补）。
- 依赖排序（轻 DAG）：REQ-002 → REQ-003 → REQ-004；REQ-005 独立，只读消费前三者的行程/申请/体验数据。
- **BA 交付边界：** 以上为 P0/P1 业务产物。P2 起（delta-craft / design / task-plan / apply / verify / archive，含代码、契约、迁移、技术设计、任务分解）交 dev。
