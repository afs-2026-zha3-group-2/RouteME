# REQ-018 — 管理后台：用户管理 / 举报处置 / 人工客服（S19–S24）（Ready 需求条目）

- **能力：** `admin-console`（ADDED）、`customer-service`（ADDED）、`user-auth`（MODIFIED「注册账号」）
- **对应 OpenSpec change：** `add-admin-console`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** 用户 2026-11-17 提供的 6 条管理后台 User Story（含 AC、Given/When/Then、垂直切片口径）
- **故事编号：** S19–S24（原型 `docs/prototype/stories.html` 现有最大编号为 S18，本需求顺延）
- **证据：** `requirement-workspace/intents/REQ-018-admin-console.md`；`openspec/specs/user-auth/spec.md`；`openspec/specs/trip-companions/spec.md`；`RouteME/backend/.../entity/UserEntity.java`、`ReportEntity.java`；`RouteME/backend/.../controller/ReportController.java`；`RouteME/backend/.../db/migration/V7__create_reports.sql`、`V6__create_chat_messages.sql`；`RouteME/frontend/src/route.ts`、`App.tsx`、`chat/ChatPage.tsx`、`mine/MyTripsPage.tsx`；`RouteME/openapi.yaml` 0.11.0；`RouteME/SqlLite/routeme.db`（369 users / 110 trips / 13 reports / 6 experiences / 13 chat messages，2026-11-17）

## Discovery Decision

**Go（light intake，2026-11-17）。** 6 条故事共享同一套账号状态、举报记录与客服会话数据，页面之间通过用户 / 举报 / 会话详情互相跳转；拆成 3 个 change 会产生重复的 V19 迁移、权限守卫与状态枚举。按用户确认合并为单 change `add-admin-console`，P3 任务再按迭代 1–3 分组。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-018 |
| statement | 平台 SHALL 提供仅管理员可访问的管理后台：分页查询全部注册用户并查看其资料、行程、体验与举报；按 `ACTIVE / SUSPENDED / BANNED` 暂停、封禁或恢复账号，并让受限账号在服务端被拒绝写操作；按 `PENDING / PROCESSING / RESOLVED / REJECTED` 处理举报，成立时暂停或封禁、不成立时驳回；并让用户与客服通过 `WAITING / HANDLING / CLOSED` 的人工客服会话双向沟通、结束后只读并可再次发起。处罚 MUST NOT 删除既有数据，MVP MUST NOT 提供永久删除能力。 |
| actors | 平台管理员 / 客服（`role=ADMIN`）、普通用户（`role=USER`，含 `ACTIVE` / `SUSPENDED` / `BANNED`）、举报人、被举报用户、系统（权限校验、状态迁移、轮询、事务） |
| rationale | 当前平台只有用户侧能力：没有管理员身份、账号状态、举报处置与人工客服；举报提交后无状态、无结果，369 个账号的处置只能手改 SQLite；用户遇到账号或举报问题无求助入口。 |
| acceptance hints | Delta Spec 共 61 个场景，下表按故事列 49 条索引；核心可观察信号是：403 `ADMIN_REQUIRED`、搜索结果、四类写操作 403、8 项封禁理由 + 解封时间、举报状态迁移与事务、客服三类队列与 3s 轮询、`CLOSED` 只读。 |
| links to evidence | 见上方证据路径；契约以 `openapi.yaml` 0.13.0 为准；Living Spec 合并后见 `openspec/specs/admin-console/`、`openspec/specs/customer-service/`。 |

## 1. Intent

一句话：给 RouteMe 补上**平台侧治理闭环**——管理员能查到任何一个注册用户（含邮箱与状态），能暂停 / 封禁 / 恢复账号且处罚立即在服务端生效；能按状态处理举报，成立就处罚、不成立就驳回，并让举报人看到结果；用户遇到问题时能联系人工客服，客服在工作台接入、对话、查看用户资料与相关举报、结束会话。所有处罚只改状态，不删数据。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 平台管理员 / 客服（`role=ADMIN`） | 可访问全部 `/api/admin/**`；查看用户、举报、客服会话；暂停 / 封禁 / 恢复账号；处理举报；接入与结束客服会话。不能暂停或封禁自己。 |
| 普通用户（`role=USER`，`ACTIVE`） | 使用既有全部功能；可提交举报、联系人工客服、查看自己的举报状态。 |
| 普通用户（`SUSPENDED`） | 仍可登录、浏览、读取自己的数据、联系客服；不能发布行程、申请同行、发送聊天消息、发布旅行体验。 |
| 普通用户（`BANNED`） | 仍可登录与只读浏览，个人资料页展示封禁理由与解封时间；所有业务写操作被拒绝；解封时间到达后恢复 `ACTIVE`。 |
| 举报人 | 提交举报；在「我的举报」看到已受理与最终状态；看不到管理员备注与其他用户举报。 |
| 被举报用户 | 被管理员查看与处罚；看不到举报人身份与管理员备注。 |
| 未登录 / 无身份 | 访问后台返回 401；不进入用户侧受保护页面。 |

不新增 `STAFF` 角色：MVP 中 `ADMIN` 即客服。

## 3. In / Out scope

**In scope**

1. `app_users.role`（`USER` / `ADMIN`）+ V19 种子 `admin` 账号 + 后台入口与服务端权限校验。
2. 用户列表：ID、头像、昵称、邮箱、注册时间、状态；按 ID / 昵称 / 邮箱搜索；状态筛选；分页。
3. 用户详情：资料、状态与处罚、发布的行程、发表的体验、相关举报；内容跳转。
4. 状态迁移：`ACTIVE → SUSPENDED`、`ACTIVE / SUSPENDED → BANNED`、`SUSPENDED → ACTIVE`；二次确认 + 原因；8 项封禁理由 + 未来解封时间；到期惰性恢复；不能处罚自己。
5. 受限账号边界：`SUSPENDED` 四类写操作 403；`BANNED` 全部业务写操作 403、只读可用；数据保留、无永久删除。
6. 封禁信息在用户个人资料页展示，恢复后不再展示。
7. 举报队列：编号 `R-{id}`、举报人、被举报用户、对象、类型、时间、状态；状态筛选；详情与跳转。
8. 举报处理：显式开始处理、备注必填、成立→暂停/封禁→`RESOLVED`（单事务）、不成立→`REJECTED`、记录保留、举报人可见状态。
9. 用户侧帮助与反馈：人工客服入口 + 我的举报状态。
10. 客服会话：`WAITING / HANDLING / CLOSED`、单活跃会话、双向 1–500 字文本、3s 短轮询、历史保留、只读、可再次发起。
11. 客服工作台：三类队列、接入、用户基础信息、相关举报、完整历史、主动结束。
12. 契约 0.13.0、V19 迁移、`OpenApiTest`、后端单测 / 控制器测试、前端单测、E2E `admin.spec.ts` 与 `customer-service.spec.ts`。

**Out of scope**

- 管理员 SSO / 二次认证 / 操作审计流水；业务端点从 `X-User-Id` 迁移到 Bearer token（既有边界）。
- 处罚历史表、申诉、站内信 / 邮件通知、永久删除账号或内容。
- 举报原因扩容：举报原因仍为现有四类；8 项是封禁理由。
- 内容下架 / 隐藏 / 删除；「暂停发布行程」作为独立处罚类型（归入 `SUSPENDED`）。
- 工单分类、满意度、快捷回复、附件 / 图片 / 语音、WebSocket 推送。
- 管理员之间的转交 / 抢单锁；任一管理员可继续处理 `PROCESSING` 举报。
- 用户侧独立的举报详情页；邮箱验证 / 找回密码 / 邮箱登录。
- 行程、申请、聊天、体验的状态机变更（只增加账号状态前置守卫）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

场景全文见 Delta Spec；下表只列编号与归属，便于签署与追溯。

### A. S19 用户管理页（迭代 1，3 点）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S19-1 | 管理员进入后台并看到三个入口 | 仅管理员可访问 |
| S19-2 | 非管理员访问后台页面 / 接口被拒绝（403 `ADMIN_REQUIRED`） | 仅管理员可访问 |
| S19-3 | 客户端不能自选管理员角色 | 角色由服务端决定 |
| S19-4 | 列表展示全部注册用户与六项字段 | 用户列表字段 |
| S19-5 | 按用户 ID 搜索 | 按 ID 搜索 |
| S19-6 | 按昵称 / 邮箱搜索（忽略大小写） | 按昵称 / 邮箱搜索 |
| S19-7 | 按状态筛选与分页 | 状态筛选 |
| S19-8 | 进入用户详情查看资料与状态 | 点击进入详情 |
| S19-9 | 用户详情查看旅行计划与体验并可跳转 | 旅行计划 / 体验 |
| S19-10 | 用户详情查看作为举报人 / 被举报人的举报 | 举报信息 |
| S19-11 | 举报队列默认 `PENDING`、字段完整 | 举报信息 |
| S19-12 | 封禁信息在用户资料页展示 | 封禁内容同步 |

### B. S20 用户详情页（迭代 1，3 点）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S20-1 | `ACTIVE → SUSPENDED`（原因 + 二次确认） | 暂停账号 |
| S20-2 | `ACTIVE / SUSPENDED → BANNED`（8 项理由 + 解封时间） | 封禁账号 |
| S20-3 | `SUSPENDED → ACTIVE` 恢复 | 恢复账号 |
| S20-4 | 非法迁移 409 `INVALID_STATUS_TRANSITION` | 状态机 |
| S20-5 | 管理员不能处罚自己 | 防误操作 |
| S20-6 | 封禁到期惰性恢复 | 解封时间 |
| S20-7 | `SUSPENDED` 四类写操作 403 | 暂停限制 |
| S20-8 | `BANNED` 只读、写操作 403 | 封禁限制 |
| S20-9 | 处罚不删除既有数据 | 数据保留 |
| S20-10 | 无永久删除入口 | MVP 边界 |

### C. S21 举报管理页（迭代 2，3 点）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S21-1 | 新举报进入 `PENDING` 队列 | 默认 PENDING |
| S21-2 | 列表字段：编号 / 举报人 / 被举报用户 / 对象 / 类型 / 时间 / 状态 | 列表字段 |
| S21-3 | 按状态筛选 | 状态筛选 |
| S21-4 | 三类举报对象与稳定编号 | 对象类型 |
| S21-5 | 点击进入举报详情 | 详情入口 |

### D. S22 举报详情页（迭代 2，5 点）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S22-1 | 显式「开始处理」使 `PENDING → PROCESSING` | 开始处理 |
| S22-2 | 查看原因 / 举报人 / 被举报用户 / 内容并可跳转 | 上下文 |
| S22-3 | 成立→暂停/封禁→`RESOLVED`（单事务） | 成立处置 |
| S22-4 | 不成立→`REJECTED` | 驳回 |
| S22-5 | 处理备注必填 | 备注必填 |
| S22-6 | `RESOLVED` / `REJECTED` 记录保留且举报人可见状态 | 记录与回看 |
| S22-7 | 被举报用户已 `SUSPENDED` / `BANNED` 时的成立处置（维持、升级或更新封禁信息） | 成立处置 |

### E. S23 帮助与反馈 / 客服会话页（迭代 3，3 点）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S23-1 | 进入帮助与反馈，看到两个区块 | 入口 |
| S23-2 | 发起会话 → `WAITING` | 创建 |
| S23-3 | 已有未结束会话时返回既有会话 | 单活跃会话 |
| S23-4 | 客服接入 → `HANDLING` | 状态变化 |
| S23-5 | 双向消息 3s 内可见 | 实时回复 |
| S23-6 | 客服结束 → `CLOSED`，用户不能自行关闭 | 结束 |
| S23-7 | `CLOSED` 只读且可重新发起 | 只读与重开 |

### F. S24 客户服务页（迭代 3，5 点）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S24-1 | 查看 `WAITING / HANDLING / CLOSED` 三类会话 | 三类队列 |
| S24-2 | 接入 `WAITING → HANDLING`（并发仅一个成功） | 接入 |
| S24-3 | 双向对话 | 双向消息 |
| S24-4 | 查看用户基础信息与账号状态 | 用户信息 |
| S24-5 | 查看该用户相关举报 | 相关举报 |
| S24-6 | 查看完整历史消息 | 历史 |
| S24-7 | 结束 `HANDLING → CLOSED` | 主动结束 |
| S24-8 | `CLOSED` 只读 | 只读 |

## 5. Open Questions

均已按默认裁决收口，记为 non-blocking；若发起人不同意，P2 前可改：

| 编号 | 问题 | 当前裁决 | 影响 |
|---|---|---|---|
| OQ-1 | `BANNED` 是禁止登录还是只读？ | 保留登录、只读、展示封禁信息 | 若改为禁止登录，需另定「如何看到封禁原因」 |
| OQ-2 | 封禁到期是自动解封还是手动？ | 读取时惰性恢复 `ACTIVE` | 不引入定时任务 |
| OQ-3 | 「暂停发布行程」是否独立处罚？ | 归入 `SUSPENDED` | 与 S20 的四类限制一致 |
| OQ-4 | 举报成立是否必须处罚？ | 必须选暂停或封禁之一；被举报用户已受限时按其当前状态处置（`SUSPENDED` 维持或升级，`BANNED` 只更新封禁信息） | 避免「成立但无处置」与非法的 `BANNED → BANNED` 迁移 |
| OQ-5 | 打开举报详情是否自动 `PROCESSING`？ | 显式「开始处理」 | 避免误点副作用 |
| OQ-6 | 举报人能看到处理备注吗？ | 只看状态，不看备注与处罚细节 | 隐私 |
| OQ-7 | 邮箱是否必填？ | 选填、唯一、小写规范化 | 既有 369 账号显示「未填写」 |
| OQ-8 | 用户在哪里看到举报状态？ | `#/help`「我的举报」 | 不新增独立页面 |
| OQ-9 | 客服实时性用什么？ | 复用 3s 短轮询 | 与现有聊天一致 |
| OQ-10 | 一个用户能同时开几个客服会话？ | 最多一个 `WAITING / HANDLING` | 避免并发队列 |

## 6. Definition of Ready

- [x] 6 条故事均有 AC、Given/When/Then 与垂直切片口径。
- [x] 能力归属明确：`admin-console` / `customer-service` ADDED，`user-auth` MODIFIED。
- [x] 契约与迁移编号避开 `add-ai-itinerary` 的 0.12.0 / V18。
- [x] 状态机、权限、错误码与事务边界可判定。
- [x] 隐私边界：举报人身份、管理员备注、被举报人处罚细节的可见范围已定。
- [x] blocking OQ = 0；10 项默认裁决已记录。
- [x] 归档顺序与跨 change 冲突已记录。

## 7. Traceability

| Story | Requirement | Change spec |
|---|---|---|
| S19 | 管理员身份与后台访问控制 / 用户列表与搜索 / 用户详情与关联内容 / 封禁信息展示 / 举报队列与筛选 | `openspec/changes/add-admin-console/specs/admin-console/spec.md` |
| S20 | 账号状态迁移与处罚 / 受限账号的功能边界 / 封禁信息展示 | 同上 |
| S21 | 举报队列与筛选 | 同上 |
| S22 | 举报详情与处理 | 同上 |
| S23 | 帮助与反馈入口与我的举报状态 / 人工客服会话生命周期 / 客服消息与短轮询 / 客服会话历史保留 | `openspec/changes/add-admin-console/specs/customer-service/spec.md` |
| S24 | 客服工作台 / 客服消息与短轮询 / 客服会话历史保留 | 同上 |
| 全部 | 注册邮箱与角色服务端固定 | `openspec/changes/add-admin-console/specs/user-auth/spec.md` |