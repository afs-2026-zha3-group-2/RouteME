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

---

# Story list — REQ-007（S18 完善个人资料并生成个人主页）

- **来源：** 用户提供的故事与 16 条验收标准（2026-11-16）；扩展原型 S02「查看他人的昵称、简介与旅行兴趣」
- **口径：** 一条故事 = 一个页面 + 一份接口契约 + 一次状态迁移（资料未完善 → 资料已完善）
- **更新时间：** 2026-11-16

| Story | Title | 角色 | Priority | Iteration | Points | Page | Parent REQ | Change | Status |
|---|---|---|---|---|---|---|---|---|---|
| S18 | 完善个人资料并生成个人主页 | 新用户 | P0 | 1 | 3 | 个人资料完善页 / 个人主页 | REQ-007 | `add-user-profile` | P1 drafted（2026-11-16） |

## Traceability（REQ-007）

| Story | Requirement scenarios | Change spec | Story file |
|---|---|---|---|
| S18 | REQ-007 §4 #1–#17 | `openspec/changes/add-user-profile/specs/user-profile/spec.md`（ADDED，7 条需求）、`specs/user-auth/spec.md`（MODIFIED「注册账号」） | `requirement-workspace/stories/add-user-profile.story.md` |

## Notes（REQ-007）

- 原型 S02 只覆盖「看别人的昵称、简介与兴趣」的资料弹窗；S18 把它扩展成完整资料 + 个人主页，S02 的浏览诉求仍被满足。
- 头像必填的原始 AC 已被用户裁决 D1 覆盖为选填；必填清单以 REQ-007 §5 为准。
- 本故事不改行程、申请、聊天、体验的业务规则，只新增发布者 / 作者入口。
- 双 capability（`user-profile` ADDED + `user-auth` MODIFIED）按 REQ-005 先例，归档前需 SA 追认例外。