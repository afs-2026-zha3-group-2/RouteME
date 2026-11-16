# Story list — REQ-005（S03 灵感首页双视图）/ REQ-007（目的地与日期筛选）

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

## REQ-007 — 灵感首页按目的地（省市级联）与日期筛选

- **来源：** `requirement-workspace/requirements/REQ-007-destination-area-filters.md`
- **Change：** `add-destination-area-filters`（两份 delta：`trip-plans`、`trip-experiences`）
- **拆分模式：** Workflow（数据底座 → 筛选/展示 → 体验日期 → 搜索移除）
- **范围：** 只含本 change（数据底座 + 筛选/展示 + 体验日期 + 搜索移除）；发布页目的地字段归 `add-trip-publish` 目的地修订（A），不在此故事列表。

| Story | Title | 角色 | Priority | Iteration | Size | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S1 | 目的地数据底座与区划字典（V10 + 6 位码 + 响应字段） | 浏览者/发布者 | P0 | 1 | M | 首页/详情 | REQ-007 | `add-destination-area-filters` | P1 drafted |
| S2 | 首页目的地省市级联筛选与地名展示 | 浏览者 | P0 | 1 | M | 灵感首页 | REQ-007 | `add-destination-area-filters` | P1 drafted |
| S3 | 旅行体验视图日期筛选与卡片口径 | 浏览者 | P0 | 1 | S | 灵感首页 | REQ-007 | `add-destination-area-filters` | P1 drafted |
| S4 | 移除关键词搜索（前端/后端/契约/测试） | 浏览者 | P0 | 1 | S | 灵感首页 | REQ-007 | `add-destination-area-filters` | P1 drafted |

### REQ-007 Traceability

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S1 | REQ-007 §4 #6、§4 #5 | `specs/trip-plans/spec.md`“省市二级行政区划字典与目的地代码” | `stories/REQ-007-destination-area-filters.story.md` |
| S2 | REQ-007 §4 #1–#4、#9–#11、#14–#16 | `specs/trip-plans/spec.md`“按目的地与日期筛选行程” | 同上 |
| S3 | REQ-007 §4 #12–#13 | `specs/trip-experiences/spec.md`“灵感首页的旅行体验视图” | 同上 |
| S4 | REQ-007 §4 #17 | `specs/trip-plans/spec.md`“本迭代不提供关键词搜索” | 同上 |

### REQ-007 Notes

- **发布页目的地字段（A）：** 归 `add-trip-publish` 目的地修订；本 change 只提供数据底座（`destination_code`/字典/响应字段）与筛选/展示。
- **归档顺序：** `refine-inspiration-home` → `add-destination-area-filters` → `add-trip-publish`；三者中只有本 change 属于 REQ-007。
- **搜索测试：** A 的搜索/目的地场景由本 change 改写；`refine-inspiration-home` 的搜索空态测试交其 owner。
- **原始故事点：** 2；本拆分为 S/M 相对规模，供排期参考，不改变原始故事点记录。