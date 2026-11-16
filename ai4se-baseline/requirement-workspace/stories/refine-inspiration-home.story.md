# S03 — 浏览招募中行程与旅行体验

- **Parent REQ：** REQ-005 `requirement-workspace/requirements/REQ-005-inspiration-home.md`
- **Change：** `refine-inspiration-home`
- **Priority：** P0 ｜ **Iteration：** 1（第 2–3 天）｜ **Points：** 3
- **Page：** 灵感首页
- **Source：** `docs/prototype/stories.html` S03
- **Status：** P4 Pass（2026-11-16），待 PR / G2

## Story statement

作为**还没有明确目的地**的学生，我希望看到别人公开的行程和真实体验，以便获得旅行灵感。

## AC summary

1. 默认进入「招募中的行程」；卡片含标题、目的地、起止日期、路线摘要、标签、发布者昵称、已加入 / 计划人数、状态。
2. 可切到「旅行体验」视图，看到已结束行程的分享。
3. 列表为空时显示空状态与「去发布行程」引导；加载中显示骨架或加载态。
4. 已满员、已结束在视觉上可与招募中区分，且不能只靠颜色表达。

## Acceptance scenario

- **Given** 数据中存在 6 条行程
- **When** 打开首页
- **Then** 卡片信息完整；切换视图后内容随之变化。

## Requirement traceability

| Story AC | REQ-005 scenario | Change spec scenario |
|---|---|---|
| AC1 默认招募中 + 卡片字段 | §4 #1、#2、#10 | `trip-plans` / 默认视图为招募中的行程；默认列表与卡片信息 |
| AC2 旅行体验视图 | §4 #3、#10 | `trip-experiences` / 切换到旅行体验视图 |
| AC3 空状态 + 加载态 | §4 #6、#7、#8 | `trip-plans` / 无结果时展示空状态并保留条件；`trip-experiences` / 体验空态、体验视图加载态 |
| AC4 状态非颜色区分 | §4 #4、#5 | `trip-plans` / 已满员与招募中可区分；`trip-experiences` / 体验卡标识来源行程已结束 |
| 6 条数据场景 | §4 #2、#10 | `trip-plans` 默认列表；`trip-experiences` 切换视图 |

## Size / split note

- 3 点，页面级垂直切片，不再拆分。
- 一个页面（灵感首页）+ 既有接口契约（默认视图 `GET /api/matches`、体验视图 `GET /api/experiences`，无新增；`/api/matches` 是 REQ-003 既有契约且只返回未结束行程，见 `design.md` D8）+ 一次页面视图状态迁移（招募中的行程 ⇄ 旅行体验）。
- 不把「行程卡改造」与「体验卡改造」拆成两个水平切片：单独交付任一半都无法完成「切换视图后内容随之变化」的端到端验收。

## Out of scope

- 发布行程、行程详情、同行申请、聊天、游后分享发布。
- 新增后端端点、数据库迁移或行程状态机变更。
- 体验视图补齐日期 / 排序筛选、个性化推荐、图片上传、地图导航。