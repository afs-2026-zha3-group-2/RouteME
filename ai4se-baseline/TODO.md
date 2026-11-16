# TODO

## REQ-001: Hello World Home Page

### Background

Project scaffolding verification: get a minimal working page running on the
target tech stack to confirm the frontend, backend, and database chain works
end to end.

### Requirement

Provide a home page that displays the text "Hello World". The text is not
hard-coded in the frontend; instead it:

1. Is stored in a SQLite database (a `greeting` table with one record).
2. Is served by the backend (Spring Boot / Java) via a `GET /api/greeting`
   endpoint that reads it from the database.
3. Is fetched by the frontend (React) home page, which calls the endpoint and
   displays the returned text.

### Tech Stack Constraints

- Frontend: React
- Backend: Spring Boot / Java
- Database: SQLite (embedded, no standalone database server required), Flyway
  migrations

### Acceptance Criteria

1. After starting the backend, the database file is created automatically and
   seeded with one "Hello World" record.
2. `GET /api/greeting` returns "Hello World".
3. After starting the frontend, visiting the home page shows the "Hello World"
   text fetched from the endpoint.

### Non-Goals

- Multi-language support or a configurable greeting management UI
- User accounts and permissions

---

> 以下 REQ-002/003/004 为 MVP 业务需求清单（业务语言）。BA 已完成 P0/P1（意图 → Ready 需求条目 → DoR 自检 → deep-dive → 影响面 → OpenSpec 业务提案 + 业务场景 spec）；P2 起的开发（契约/设计/任务/实现/验证）交 dev。权威业务素材：`records/discussion/2026-11-13/RouteMe_MVP_完整闭环_中文.md`。

## REQ-002: 旅行灵感浏览与行程发布（capability `trip-plans`）

### Background

RouteME 价值闭环的起点。验证核心假设：用户愿意发布可被他人理解的旅行计划，并能从别人的真实计划中获得灵感。

### Requirement（业务）

1. 演示用户从 2–3 个预设账户中选择身份进入系统（不做完整注册/验证码/找回密码）。
2. 旅行灵感首页以卡片展示公开行程（标题、目的地、日期、简单路线、兴趣标签、发布者昵称、已加入/计划人数、状态），支持按目的地与日期筛选，含空状态。
3. 发布行程：必填（标题、目的地、出发日期、结束日期、路线/行程描述、计划人数）+ 选填（集合区域、预算、兴趣标签、补充说明），含必填缺失与日期非法校验。
4. 行程详情：完整路线、日期人数、发布者简介与兴趣、当前同行者、同行申请入口（占位）、游后分享区（占位）。
5. 行程状态定义与展示：招募中 / 已满员 / 已结束（作为 REQ-003/004 的共享状态锚点）。

### Non-Goals

- 路线匹配打分、同行申请与处理、聊天、安全能力（→ REQ-003）；游后分享与参考发布（→ REQ-004）。
- AI 推荐、地图导航、实时定位、订票支付、实名认证、积分勋章、头像上传（→ P2 / 可降级为默认头像）。

### P1 产物

`requirement-workspace/intents/REQ-002-trip-plans.md`、`requirements/REQ-002-trip-plans.md`、`openspec/changes/add-trip-plans/`。

## REQ-003: 同行匹配、申请与旅行前沟通（capability `trip-companions`）

### Background

闭环的「发现同行者 → 建立连接 → 一起旅行」。验证核心假设：用户愿意基于具体路线申请同行；坚持「先有共同行程、再沟通」，避免沦为陌生人私聊工具。

### Requirement（业务）

1. 基础路线匹配（可解释规则：目的地相同 / 日期相同或相差一天 / 共同兴趣累计），展示匹配原因文案（可选百分比）；时间不足时降级为筛选 + 共同兴趣提示。
2. 同行申请：一句说明、提交、查看待处理/已接受/已拒绝/已取消、处理前取消；不能申请自己的行程、不能重复申请、已满员/已结束不能申请、只有发布者能处理。
3. 接受后人数联动：已加入人数增加，达上限时行程置「已满员」并停止接受。
4. 我的旅行：分组展示我发布的/我申请的/已匹配的/已完成的/可分享体验的。
5. 匹配后一对一文字沟通：文字消息 + 发送时间 + 消息列表，手动刷新或短轮询；仅已匹配者可进入；阻断时可降级为已匹配用户的同行留言区。
6. 最低安全能力：取消申请、退出同行、举报入口、不公开电话/证件/精确住址、首次见面选公共场所提示、告知亲友提示。

### Non-Goals

- 行程浏览/发布/详情（→ REQ-002）；游后分享与参考发布（→ REQ-004）。
- 复杂推荐算法、附近的人、实时位置、导航、紧急救援；WebSocket 实时、语音/视频/图片聊天、已读回执、推送通知（→ P2 / 明确不做）。

### P1 产物

`requirement-workspace/intents/REQ-003-trip-companions.md`、`requirements/REQ-003-trip-companions.md`、`openspec/changes/add-trip-companions/`。场景偏多，impact-brief 建议内部两阶段（匹配+申请 / 沟通+安全），仍为单一 capability change。

## REQ-004: 游后体验分享与参考此行程发布（capability `trip-experiences`）

### Background

闭环收口「分享体验 → 产生新灵感」。验证核心假设：游后分享能成为下一位用户的旅行灵感。

### Requirement（业务）

1. 游后分享：仅对「已结束且参加过」的行程；文字感想 + 路线强度（轻松/适中/较累）+ 一条给后来者的建议；图片为增强项，可降级为纯文字 + 内置封面。
2. 分享展示位：原计划详情页的游后分享区、灵感首页的「旅行体验」视图。
3. 参考此行程发布：预填目的地/路线描述/兴趣标签；日期/人数/集合地点必须重填；后端接口可降级为前端预填。

### Non-Goals

- 行程浏览/发布/详情（→ REQ-002）；匹配/申请/聊天/我的旅行/安全（→ REQ-003）。
- 短视频、直播、复杂内容社区、个性化推荐算法（→ P2 / 不做）。

### P1 产物

`requirement-workspace/intents/REQ-004-trip-experiences.md`、`requirements/REQ-004-trip-experiences.md`、`openspec/changes/add-trip-experiences/`。依赖 REQ-002（展示位/发布表单）与 REQ-003（已结束+参加过判定）。

## REQ-008: 浏览者查看发布者公开资料（capability `user-profiles`）

### Background

申请同行是高承诺动作。浏览者需要在申请前了解「对方是谁、喜欢怎么玩、是否适合同行」。现有行程卡片只展示发布者昵称，详情页虽有简介与兴趣，但没有统一资料视图、共同兴趣与旅行统计。

### Requirement（业务）

1. 双入口：行程卡片发布者区域与行程详情页发布者卡片；点击后在当前页打开公开资料弹窗，卡片入口不触发进入详情。
2. 资料弹窗：头像、昵称、身份/年级与专业或行业（MBTI 选填）、加入时间、简介、兴趣标签、共同兴趣提示（仅当有交集）、四项统计（发布行程/已完成/参与同行/游后分享）、隐私说明。
3. 统计口径：发布行程 = 我发布且未取消；已完成 = 我发布的已结束；参与同行 = 我被接受的申请数；游后分享 = 我发布的体验数。
4. 自我查看：发布者是当前用户时展示「这是你」。
5. 隐私边界：不展示电话、证件、精确住址、学校门牌与实时位置；资料弹窗不提供举报入口。

### Non-Goals

- 举报用户功能（未来迭代再评估）；聊天页资料入口；申请人列表/体验作者等其他用户资料入口。
- 资料编辑/维护与必填校验、头像上传、实名认证、信用体系。
- 修改 `trip-plans` / `trip-companions` / `trip-experiences` 既有业务规则。

### P1 产物

`requirement-workspace/intents/REQ-008-publisher-profile.md`、`requirements/REQ-008-publisher-profile.md`、`openspec/changes/add-user-profiles/`。只读消费前三者数据；演示数据新增 1 个非学生用户与其行程。

## REQ-007: 灵感首页按目的地（省市级联）与日期筛选（capability `trip-plans` + `trip-experiences`）

### Background

迭代 1 的用户故事：时间地点都不确定的学生希望按目的地和日期缩小范围，减少逐个翻看的成本。远程基线（`main@229411a`）的现状是筛选已基本实现，但目的地候选来自离线地图城市库 16 城、没有省市层级；「旅行体验」视图的日期筛选可见但不生效；搜索不在本迭代投入。V9 已被 `add-user-auth` 占用，契约已 0.6.0；`refine-inspiration-home`（REQ-005）同改两个 capability，`add-trip-publish` 拥有发布 requirement。

### Requirement（业务）

1. 目的地：省市级联（必须选到市，含港澳台），目的地以 6 位国标行政区划码为权威、名称与省名由后端按字典派生；发布页目的地字段归 `add-trip-publish` 目的地修订（只传代码），本 change 提供数据底座。
2. 日期：保留出发不早于/不晚于，按行程日期区间求交集；要选某个周六就把起止填成同一天。
3. 兴趣：多选、命中任一即保留（保留现状，不降级）。
4. 已应用筛选摘要与清除入口；无结果提示“换个条件试试”且不清空条件。
5. 「旅行体验」视图补齐目的地（代码）与日期区间筛选；体验卡不显示日期。
6. 移除关键词搜索（前端、后端 `q` 参数、契约与测试全部删除）；A 的搜索场景由本 change 改写，refine 的搜索测试交 owner。
7. 存量行程按地图城市库 16 城 + 别名 + 种子映射到代码，名称统一为标准名；**V11** 加列 `NOT NULL DEFAULT ''` + 回填 + 索引（不重建表，兼容 SQLite/H2 外键；V10 已被 user-profile 占用）；契约升 0.7.0。

### Non-Goals

- 关键词搜索恢复、按省筛选全省、自由输入地名、三级区划、地图选点作为目的地、境外地区。
- 发布 requirement 的 delta 作者化（归 `add-trip-publish`）、行程编辑、个性化推荐、按距离/预算筛选。
- 体验卡日期展示（已确认不显示）。
- 不改变匹配业务规则（仅把“目的地相同”的比较口径改为代码）。

### P1 产物

`requirement-workspace/intents/REQ-007-destination-area-filters.md`、`requirements/REQ-007-destination-area-filters.md`、`stories.md` 的 REQ-007 段、`stories/REQ-007-destination-area-filters.story.md`、`openspec/changes/add-destination-area-filters/`（proposal + 两份 delta）。依赖 `refine-inspiration-home`（同改两 requirement，先归档）与 `add-trip-publish`（发布页目的地字段，后归档）；归档顺序 `refine-inspiration-home` → 本 change → `add-trip-publish`，三者中只有本 change 属于本需求。

## REQ-011: S15 结束行程（旅行中 → 已结束）（capability `trip-plans` + `trip-companions`）

### Background

行程生命周期缺少「旅行中」：当前只有招募中 / 已满员 / 已结束三态，状态不看日期，发布者可以在旅行开始前就结束行程；结束后待处理申请会悬挂，首页仍会出现日期已过的行程。S15 要补完整生命周期，并让同行成员在结束后进入只读聊天与体验分享环节。

### Requirement（业务）

1. 四态：招募中 / 已满员 / 旅行中 / 已结束；优先级为已结束 > 旅行中 > 已满员 > 招募中。
2. 自动流转：开始日期当天 00:00 起为旅行中；结束日期次日 00:00 起自动为已结束。
3. 结束操作：仅发布者且仅旅行中可执行；二次确认；确认后旅行中 → 已结束；终态，不可撤销。
4. 结束善后：待处理申请自动取消；申请处理全部关闭；同行者与聊天历史保留；聊天只读并提示「该行程已结束」；发布者与已接受同行者可发表旅行体验。
5. 申请规则：旅行中仍可提交与接受；满员后状态仍为旅行中，新申请与接受关闭，既有待处理申请可拒绝不可接受；结束后全部关闭。
6. 提醒：距结束不足 3 小时（结束日期 21:00 起），在我的旅行与行程详情提醒发布者与已接受同行者；无 push。
7. 列表与统计：首页/匹配列表仍展示旅行中，排除已结束（含自动完成）；我的旅行与公开资料「已完成」采用同一口径。
8. 发布校验：开始日期不得早于今天；等于今天时发布即旅行中。

### Non-Goals

- 撤销结束 / 恢复行程；结束后删除或归档清理数据。
- 推送、短信、邮件、定时任务等外部通知渠道。
- 行程取消、改期改线、签到与实时定位；结束后的评价、评分与信用体系。
- 修改体验内容结构或统计接口形状。

### P1 产物

`requirement-workspace/intents/REQ-011-trip-completion.md`、`requirements/REQ-011-trip-completion.md`、`stories.md` 的 REQ-011 段、`stories/add-trip-completion.story.md`、`openspec/changes/add-trip-completion/`（proposal + 两份 delta）。与 `add-match-reason` 共享 `trip-companions`，同窗口归档需串行。
