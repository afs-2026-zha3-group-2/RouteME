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
