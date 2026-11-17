# REQ-023 — 管理后台概览统计（S25）（Ready 需求条目）

- **能力：** `admin-dashboard`（ADDED）
- **对应 OpenSpec change：** `add-admin-dashboard`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 Pass（2026-11-17；blocking OQ 0，DoR BLOCKER 0；签署齐备，P2 待执行）
- **故事来源：** 用户 2026-11-17 需求「admin account which provide basic dashboard for statistics and count of different users etc」
- **故事编号：** S25（`stories.md` 现有最大编号为 S24；S19 在 REQ-018 / REQ-019 各有一条历史重号，不影响本编号）
- **证据：** `requirement-workspace/intents/REQ-023-admin-dashboard.md`；`RouteME/frontend/src/route.ts`、`App.tsx`、`shell/AppShell.tsx`、`admin/AdminLayout.tsx`、`admin/AdminGuard.tsx`；`RouteME/backend/.../controller/Admin*Controller.java`；`RouteME/backend/.../entity/{UserEntity,TripPlanEntity,TripApplicationEntity,TripExperienceEntity,ReportEntity,CustomerServiceSessionEntity}.java`；`RouteME/backend/.../pojo/TripPlan.java`（四态推导）；`RouteME/backend/.../service/AccountStatusService.java`（封禁到期惰性恢复）；`RouteME/backend/src/main/resources/db/migration/{V3,V4,V5,V7,V8,V21}*.sql`；`RouteME/openapi.yaml` 0.17.0

## Discovery Decision

**Go（light intake，2026-11-17）。** 诉求是「一个基础仪表盘」，六组指标共享同一次只读聚合与同一套权限校验，拆成多个 change 只会产生重复的端点与契约版本。单 change 交付一个端点 + 一个页面；不新增数据表，因此无需 P0 数据基线变更。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-023 |
| statement | 平台 SHALL 提供仅管理员可访问的概览页 `#/admin`，以一次只读请求返回六组计数：用户（总数、按角色、按有效状态、近 7 / 30 天新增）、行程（总数、按状态、近 7 / 30 天新增）、同行申请（总数、按状态）、旅行体验（总数、近 7 / 30 天新增）、举报（按状态）、客服会话（按状态）。响应 MUST NOT 包含用户身份明细；页面 MUST NOT 自动轮询；非管理员 MUST 收到 403 `ADMIN_REQUIRED` 或前端无权限页。 |
| actors | 平台管理员（`role=ADMIN`，唯一可读方）、普通用户（被拒绝）、系统（权限校验、状态推导、按自然日聚合） |
| rationale | 后台已有用户 / 举报 / 客服三个列表页，但管理员无法回答「平台上有多少用户、多少被封禁、有多少待处理举报、多少会话在排队」；这些数字目前只能逐页翻列表或手写 SQL，运营判断没有第一屏依据。 |
| acceptance hints | Delta Spec 共 13 个场景；核心可观察信号：`GET /api/admin/dashboard` 一次返回六组计数、状态桶零填充、总数与分桶自洽、封禁到期计入 `ACTIVE`、`#/admin` 为后台默认落地页、三组卡片可跳转、手动刷新、非管理员不入页。 |
| links to evidence | 见上方证据路径；契约以 `openapi.yaml` 0.18.0 为准（本 change 预约）；Living Spec 合并后见 `openspec/specs/admin-dashboard/`。 |

## 1. Intent

一句话：给管理后台补一屏**平台体检表**——管理员进入后台先看到用户（角色与状态、近 7 / 30 天新增）、行程（五态）、同行申请（五态）、旅行体验（新增）、举报（四态）与客服会话（三态）的数量，再从用户 / 举报 / 客服卡片直接进入对应的处理页面。

只读、只统计，不改任何业务状态机。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 平台管理员（`role=ADMIN`） | 可读取概览统计与进入 `#/admin`；可点击用户 / 举报 / 客服卡片跳转到既有列表页。 |
| 普通用户（`role=USER`） | 看不到后台入口；直接访问 `#/admin` 展示无权限页且不发起请求；直接调用统计端点返回 403 `ADMIN_REQUIRED`。 |
| 未登录 / 无身份 | 调用统计端点返回 401。 |
| 系统 | 按有效账号状态、实时行程状态与产品时区自然日计算计数；不做缓存。 |

## 3. In / Out scope

**In scope**

1. `GET /api/admin/dashboard`：只读聚合端点，复用 `admin-console` 的管理员权限校验。
2. 用户组：总数、`byRole.USER` / `byRole.ADMIN`、`byStatus.ACTIVE` / `SUSPENDED` / `BANNED`、`newLast7Days` / `newLast30Days`。
3. 行程组：总数、`recruiting` / `full` / `ongoing` / `completed` / `cancelled`、近 7 / 30 天新增。
4. 同行申请组：总数、`pending` / `accepted` / `rejected` / `cancelled` / `left`。
5. 旅行体验组：总数、近 7 / 30 天新增。
6. 举报组：`total` 与 `PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED`。
7. 客服会话组：`total` 与 `WAITING` / `HANDLING` / `CLOSED`。
8. `#/admin` 概览页：六组指标卡 + 最近更新时间 + 手动刷新；用户 / 举报 / 客服卡可跳转。
9. 后台导航增加「概览」Tab；侧栏与移动端「管理后台」入口改指向 `#/admin`。
10. 契约 0.18.0、`OpenApiTest`、后端单测 / 控制器测试、前端单测、E2E `admin-dashboard.spec.ts`。

**Out of scope**

- 趋势图、折线 / 柱状图、任意时间范围选择、自定义区间、环比 / 同比。
- 自动轮询、WebSocket 推送、统计缓存或物化视图。
- 用户身份明细导出（昵称、邮箱、头像列表）、CSV / Excel 导出。
- 新增后台列表页（行程 / 申请 / 体验仍不可从概览跳转）。
- 新增数据表、列、索引、种子数据或 Flyway 迁移。
- 修改 `admin-console` 的权限、状态机、举报与客服流程。
- 按学校 / 目的地 / 兴趣等维度的细分统计；后续可另开需求。

## 4. Scenarios + AC hints（SHALL 式，可观察）

场景全文见 Delta Spec；下表只列编号与归属，便于签署与追溯。

### A. 概览统计聚合（`admin-dashboard` Requirement 1）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S25-1 | 管理员读取概览统计，得到六组计数 | 一次请求返回全部 |
| S25-2 | 非管理员 403 `ADMIN_REQUIRED`；无身份 401 | 仅管理员可读 |
| S25-3 | 空库 / 全零时六组状态桶仍返回 0 | 零填充 |
| S25-4 | 封禁已到期账号计入 `ACTIVE` | 有效状态口径 |
| S25-5 | 新增计数按 `created_at` 与产品时区自然日窗口 | 7 / 30 天口径 |
| S25-6 | 已取消行程与全部申请状态都计入 | 不遗漏状态 |
| S25-7 | 总数与角色分桶、状态分桶自洽 | 数字可核对 |
| S25-8 | 写入后再次请求数字变化（无缓存） | 即时统计 |

### B. 概览页（`admin-dashboard` Requirement 2）

| 编号 | 场景 | 覆盖 AC |
|---|---|---|
| S25-9 | 管理员从后台入口落到 `#/admin` 概览 | 默认落地页 |
| S25-10 | 六组指标卡；用户 / 举报 / 客服可跳转，行程 / 申请 / 体验不可点 | 卡片与入口 |
| S25-11 | 非管理员直接访问 `#/admin` 展示无权限页且不发请求 | 前端边界 |
| S25-12 | 加载失败展示错误与重试 | 失败态 |
| S25-13 | 手动刷新更新数字；不自动轮询 | 刷新口径 |

## 5. Open Questions

均已按默认裁决收口，记为 non-blocking；若发起人不同意，P2 前可改：

| 编号 | 问题 | 当前裁决 | 影响 |
|---|---|---|---|
| OQ-1 | 用户总数是否含 `ADMIN`？ | 含；另给 `byRole` 分桶 | 若排除管理员，角色分桶之和与总数不一致 |
| OQ-2 | 封禁已到期的账号怎么计？ | 计入 `ACTIVE` | 与治理页惰性恢复一致 |
| OQ-3 | 「新增」按哪个时间？ | `created_at` | 六张表都有该列；状态变更时间不算新增 |
| OQ-4 | 7 / 30 天如何切片？ | 产品时区（Asia/Shanghai）自然日，含当天共 7 / 30 天 | 与行程状态推导时区一致；避免「今天」跨时区错位 |
| OQ-5 | 取消行程是否计入总数？ | 计入，并落入 `cancelled` 桶 | 总数等于五态之和 |
| OQ-6 | 同行申请是否给新增？ | 本期只给总数 + 五态 | 申请量能由状态与列表页判断；减少一组窗口 |
| OQ-7 | 是否画趋势？ | 不画；只给当前快照 | 7 / 30 天用两个数字表达 |
| OQ-8 | 是否自动刷新？ | 手动刷新；进入页面拉一次 | 后台无实时性要求，避免常驻定时器 |
| OQ-9 | 空桶是否省略？ | 固定返回，0 不省略 | 前端无「键缺失」分支 |
| OQ-10 | 是否缓存统计？ | 不缓存，每次请求即时查询 | 演示数据量小；避免展示过期数字 |
| OQ-11 | 行程 / 申请 / 体验卡能否跳转？ | 不能；渲染为纯数字卡 | 没有对应后台列表页 |
| OQ-12 | 是否新增聚合表？ | 不新增；不占用迁移号 | 六表 `GROUP BY` 足够 |

## 6. Definition of Ready

- [x] 故事 S25 有 AC、Given/When/Then 与垂直切片口径。
- [x] 能力归属明确：`admin-dashboard` ADDED；不改既有能力。
- [x] 六组指标的字段、状态词表与总数关系可判定。
- [x] 时间窗口、有效状态、时区与零填充口径已定。
- [x] 权限边界与错误码（401 / 403 `ADMIN_REQUIRED`）可判定。
- [x] 契约 0.18.0 已预约；确认无迁移。
- [x] blocking OQ = 0；12 项默认裁决已记录。
- [x] 与 `add-admin-console` 的依赖与归档顺序已记录。

## 7. Traceability

| Story | Requirement | Change spec |
|---|---|---|
| S25 | 管理后台概览统计聚合 / 管理后台概览页 | `openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md` |
| 全部 | 管理员权限校验（复用） | `openspec/changes/add-admin-console/specs/admin-console/spec.md`（既有能力，本 change 不修改） |