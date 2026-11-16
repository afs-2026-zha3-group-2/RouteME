# Story list — REQ-005（S03 灵感首页双视图）

- **来源：** `docs/prototype/stories.html`（MVP 17 条故事拆解）
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次状态迁移（本故事复用既有两份列表契约，只有页面视图状态迁移）
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S03 | 浏览招募中行程与旅行体验 | 浏览者 | P0 | 1 | 3 | 灵感首页 | REQ-005 | `refine-inspiration-home` | P3 Pass（2026-11-16），待 P4 |

## Traceability

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S03 | REQ-005 §4 #1–#10 | `openspec/changes/refine-inspiration-home/specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md` | `requirement-workspace/stories/refine-inspiration-home.story.md` |

## Notes

- 本故事只覆盖灵感首页的浏览与视图切换；发布行程（S06）、详情（S05）、体验发布（S16）、参考发布（S17）不在本故事内。
- S03 的底层能力原属 REQ-002 / REQ-004；REQ-005 只收敛其首页验收口径（默认视图、双视图空/加载态、状态非颜色区分），不重复定义行程或体验能力。
- Change 已定义后按 1:1 归属：S03 的 AC 1–4 与场景全部归属 `refine-inspiration-home`，无重复覆盖、无孤儿场景。
- 未接入外部 ALM；本表为仓库内权威故事清单，ALM Sync 状态记为 Pending。