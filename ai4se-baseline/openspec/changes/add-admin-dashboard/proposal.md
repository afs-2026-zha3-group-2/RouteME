# 变更提案：add-admin-dashboard

- **需求来源：** 用户 2026-11-17 需求「admin account which provide basic dashboard for statistics and count of different users etc」｜ **编号登记：** `requirement-workspace/registry.md` REQ-023
- **故事：** S25「查看平台概览统计」，管理后台迭代 4，P0，3 点；落点「管理后台概览页 `#/admin`」
- **能力：** `admin-dashboard`（ADDED 5 Requirement / 13 Scenario）
- **规模：** S（1 个只读端点 + 1 个页面 + 既有权限 / 布局复用；无迁移、无新表）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:artifact-review-gate`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`、`@rule:git-branching-and-pr`
- **基线：** `main@b50e416`（本地与 `origin/main` 同步）
- **归档顺序：** `add-admin-console`（P3 pass，未归档）MUST 先于本 change 归档：它提供 `app_users.role` / `status`、管理员权限校验、`AdminGuard` 与后台布局，本 change 只读取、不修改。
- **契约 / 迁移：** `openapi.yaml` 0.17.0 → **0.18.0**；**无迁移**（不新增表、列、索引或种子数据，不占用 V25）。

## Why

管理后台已经能**处理**问题，但还不能**看见**规模。用户 / 举报 / 客服三个列表页都要求先知道「点进哪个页面」，而管理员现在没有任何一屏能回答「平台上有多少账号、多少被封禁、多少举报待处理、多少会话在排队」（源码证据：`frontend/src/shell/AppShell.tsx:403`、`:512` 的后台入口直接指向 `#/admin/users`；`frontend/src/route.ts:49-69` 只有三个列表与三个详情路由，`#/admin` 根路径无匹配；`frontend/src/admin/AdminLayout.tsx:4-10` 只有用户 / 举报 / 客服三个 Tab；`controller/AdminUserController.java`、`AdminReportController.java`、`AdminServiceController.java` 只有列表、详情与状态迁移，全仓 Java `dashboard` / `Statistics` 零命中）。

具体缺口：

- **账号规模不可见。** 用户列表分页展示，管理员要翻页才能估算总量；角色与状态分布只能逐条看徽标。
- **积压不可见。** 举报只有一个按状态筛选的列表；`PENDING` 有多少、`PROCESSING` 是否有积压、客服 `WAITING` 是否有人排队，都没有汇总数字。
- **内容规模不可见。** 行程、同行申请、旅行体验没有任何计数入口；管理员无法判断平台内容的量级与结构。
- **口径容易走偏。** 行程状态不落库，按「取消 > 已结束 > 旅行中 > 满员 > 招募中」实时推导（`pojo/TripPlan.java:65-79`）；账号封禁到期按读取惰性恢复 `ACTIVE`（`service/AccountStatusService.java`）。若统计另写一套判定，概览与列表会给出互相矛盾的数字。
- **当前只能手写 SQL。** 演示库为账号数百、行程上百的规模（`SqlLite/routeme.db`），统计一次就是一次 `GROUP BY`，不需要物化视图，但也不应该让运营去开数据库。

## What Changes

- `admin-dashboard`（ADDED「管理后台概览统计聚合」）：新增只读端点 `GET /api/admin/dashboard`，一次响应返回六组计数；复用 `admin-console` 的管理员权限校验（非管理员 403 `ADMIN_REQUIRED`，无身份 401）；响应 MUST NOT 包含昵称、邮箱、头像等任何用户身份明细；所有状态桶 MUST 固定返回，计数为 0 时返回 0；每次请求即时查询，MUST NOT 使用缓存或物化结果。
- `admin-dashboard`（ADDED「管理后台概览页」）：新增 `#/admin` 作为管理后台默认落地页，展示六组指标卡与最近更新时间；用户 / 举报 / 客服三组卡 MUST 跳转到 `#/admin/users`、`#/admin/reports`、`#/admin/service`；行程 / 同行申请 / 旅行体验三组 MUST NOT 渲染为可点击跳转（后台没有对应列表页）；加载失败 MUST 可重试；页面 MUST NOT 自动轮询，只提供手动刷新。
- 后台导航：`AdminLayout` 增加「概览」Tab 并置于首位；侧栏与移动端「管理后台」入口由 `#/admin/users` 改为 `#/admin`。
- 契约 `openapi.yaml` 升 **0.18.0**：新增 `GET /api/admin/dashboard` 与 `AdminDashboard` 响应 schema；`OpenApiTest` 同步断言版本与端点。
- 前端：新增 `AdminDashboardPage`；`route.ts` / `App.tsx` 增加 `#/admin`；`i18n/adminMessages.ts` 增加概览文案；`styles.css` 追加概览卡样式（390 / 768 / 1440 三档）。
- 测试：后端聚合口径单测（含封禁到期、取消行程、零填充、时间窗口）与控制器权限测试；前端数字格式化 / 时间窗文案 / 卡片跳转单测；E2E `admin-dashboard.spec.ts` 断言非管理员不可入页、六组数字渲染与三组跳转。

### 六组指标口径

| 组 | 指标 | 口径 |
|---|---|---|
| 用户 | `total` | 全部账号（含 `ADMIN`） |
| 用户 | `byRole.USER` / `byRole.ADMIN` | 角色分桶；两者之和 MUST 等于 `total` |
| 用户 | `byStatus.ACTIVE` / `SUSPENDED` / `BANNED` | 有效状态；`BANNED` 且解封时间已过计入 `ACTIVE`；三者之和 MUST 等于 `total` |
| 用户 | `newLast7Days` / `newLast30Days` | `created_at` 落在产品时区（Asia/Shanghai）自然日窗口内 |
| 行程 | `total` | 全部行程，含已取消 |
| 行程 | `byStatus.recruiting` / `full` / `ongoing` / `completed` / `cancelled` | 复用既有四态推导（取消 > 已结束 > 旅行中 > 满员 > 招募中）；五者之和 MUST 等于 `total` |
| 行程 | `newLast7Days` / `newLast30Days` | 按 `created_at` |
| 同行申请 | `total` | 全部申请 |
| 同行申请 | `byStatus.pending` / `accepted` / `rejected` / `cancelled` / `left` | 五者之和 MUST 等于 `total` |
| 旅行体验 | `total` | 全部体验 |
| 旅行体验 | `newLast7Days` / `newLast30Days` | 按 `created_at` |
| 举报 | `total` | 全部举报（四态之和） |
| 举报 | `byStatus.PENDING` / `PROCESSING` / `RESOLVED` / `REJECTED` | 四者之和 MUST 等于 `total` |
| 客服会话 | `total` | 全部会话（三态之和） |
| 客服会话 | `byStatus.WAITING` / `HANDLING` / `CLOSED` | 三者之和 MUST 等于 `total` |

> 「近 7 / 30 天」= 产品时区当天 00:00 与之前 6 / 29 个自然日，含当天；不使用滚动 168 / 720 小时。

## 故事映射

| Story | 标题 | 迭代 | 点 | 落点页面 | 垂直切片（页面 + 契约 + 一次核心操作） |
|---|---|---|---|---|---|
| S25 | 查看平台概览统计 | 管理后台迭代 4 | 3 | 管理后台概览页 `#/admin` | 概览页 + `GET /api/admin/dashboard` + 一次只读聚合查询 |

## 范围

**In scope**

1. 只读聚合端点：六组计数字段与零填充；单次请求完成。
2. 用户组：总数、角色、有效状态、近 7 / 30 天新增。
3. 行程组：总数、五态、近 7 / 30 天新增。
4. 同行申请组：总数、五态。
5. 旅行体验组：总数、近 7 / 30 天新增。
6. 举报组：四态。
7. 客服会话组：三态。
8. `#/admin` 概览页、后台导航「概览」Tab 与入口改指向。
9. 契约 0.18.0、`OpenApiTest`、后端单测 / 控制器测试、前端单测、E2E `admin-dashboard.spec.ts`。

**Out of scope**

- 趋势图、时间序列、环比 / 同比、任意区间选择。
- 自动轮询、WebSocket 推送、服务端缓存、物化视图、定时快照表。
- 用户身份明细列表、CSV / Excel 导出、按学校 / 目的地 / 兴趣等维度的细分统计。
- 新增后台列表页；行程 / 同行申请 / 旅行体验仍不可从概览跳转。
- 新增数据表、列、索引、种子数据或 Flyway 迁移。
- 修改 `admin-console` 的权限模型、账号状态机、举报与客服流程。
- 统计口径的产品化配置（哪些状态算「活跃」等）。

## 影响面

| 层次 | 位置 | 改动 |
|---|---|---|
| 自身（本 change） | `openspec/changes/add-admin-dashboard/`、`docs/sdd/add-admin-dashboard/`、`docs/reviews/20261117-add-admin-dashboard-*-review.md`、Delta Spec | P1 交付提案 / Delta / 评审；P2 交付 AC/DoV、一致性检查与 G1；P3 交付 design / atdd / tasks |
| 上游（需求与故事） | `requirement-workspace/{requirements,intents}/REQ-023-admin-dashboard.md`、`stories/add-admin-dashboard.story.md`、`registry.md`、`stories.md` | 需求六字段、S25 故事、登记行与故事清单；不改 `docs/prototype/` |
| 下游（Living / 归档 / 其他 change） | `openspec/specs/admin-dashboard/spec.md`（P5 新建）；`openspec/changes/add-admin-console/` | 依赖 `add-admin-console` 先归档；本 change 不 MODIFIED 任何既有能力，P5 只新增一个能力 |

**逐文件改动（P4 规划）：**

| 位置 | 改动 |
|---|---|
| `RouteME/openapi.yaml` | 0.18.0；新增 `GET /api/admin/dashboard`（复用 `BearerToken` 参数与管理员权限校验）与 `AdminDashboard` schema（六组、`generatedAt`、固定键、零填充） |
| `backend/.../controller/AdminDashboardController.java` | 只读端点；复用管理员权限校验；不新增错误码 |
| `backend/.../service/AdminDashboardService.java` | 六组聚合；复用账号有效状态与行程状态推导；产品时区自然日窗口 |
| `backend/.../response/AdminDashboardResponse.java`（或等价 VO） | 六组嵌套计数与 `generated_at`；不含任何用户明细 |
| `backend/.../db/migration/**` | **无改动**（不新增迁移） |
| `frontend/src/route.ts`、`App.tsx` | 新增 `#/admin` 路由与 `adminDashboard` 路由名 |
| `frontend/src/admin/dashboard/AdminDashboardPage.tsx`、`AdminMetricCard.tsx` | 六组指标卡、最近更新时间、手动刷新、可跳转 / 不可跳转两种卡片、失败重试 |
| `frontend/src/admin/AdminLayout.tsx` | 新增「概览」Tab（首位）；`AdminTab` 增加 `dashboard` |
| `frontend/src/shell/AppShell.tsx` | 两处「管理后台」入口改指 `#/admin` |
| `frontend/src/i18n/adminMessages.ts` | 六组标题、状态名、刷新与错误文案 |
| `frontend/src/styles.css` | 概览卡与三档布局（390 / 768 / 1440） |
| `frontend/src/**/*.test.ts(x)`、`e2e/tests/admin-dashboard.spec.ts` | 数字与窗口文案、卡片跳转、非管理员不可入页、刷新 |
| `openspec/specs/` | P5 归档时新建 `admin-dashboard` Living Spec |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| change 粒度 | 单 change `add-admin-dashboard`，单能力 `admin-dashboard` | 一个端点 + 一个页面；拆开会产生重复契约与权限接线 |
| 指标范围 | 用户 + 行程 + 申请 + 体验 + 举报 + 客服六组 | 用户确认「statistics and count of different users etc」；覆盖平台规模与治理积压 |
| 端点形态 | 单个 `GET /api/admin/dashboard` | 首屏一次往返；避免六个请求的部分失败与六份 schema |
| 时间维度 | 当前总量 + 用户 / 行程 / 体验近 7 / 30 天新增 | 用户确认；不画趋势图，用两个数字表达增长 |
| 页面位置 | `#/admin` 作为后台默认落地页 | 用户确认；管理员第一屏回答「先处理什么」 |
| 卡片跳转 | 用户 / 举报 / 客服可跳；行程 / 申请 / 体验不可点 | 只为已存在的后台列表页提供入口，避免假链接 |
| 用户总数 | 含 `ADMIN`，另给角色分桶 | 平台账号总量应包含运营账号；分桶保证可核对 |
| 账号有效状态 | 封禁到期计入 `ACTIVE` | 与治理页惰性恢复一致；否则概览显示「封禁」而列表显示「正常」 |
| 行程状态 | 复用既有四态推导，含 `cancelled`；不新增 `status` 列 | 行程状态由日期、人数与取消标记实时推导；另写一套必然漂移 |
| 申请 / 举报 / 会话状态 | 直接按表内状态列分桶 | 三者状态已落库（`V5` / `V21`），无推导歧义 |
| 新增基准 | `created_at` | 六表都有该列；状态变更时间不是「新增」 |
| 时间窗口 | 产品时区（Asia/Shanghai）自然日，含当天共 7 / 30 天 | 与行程状态推导时区一致；固定自然日让同一天内多次刷新结果稳定 |
| 空桶 | 固定返回 0 | 契约稳定，前端无「键缺失」分支 |
| 缓存 / 刷新 | 不缓存；页面进入拉一次 + 手动刷新；不轮询 | 后台无实时性要求；避免常驻定时器与过期数字 |
| 状态与异常 | 加载失败展示错误与重试；未认证 401、非管理员 403 `ADMIN_REQUIRED` | 复用既有错误码，不新增语义 |
| 契约 / 迁移 | 0.18.0；无迁移 | 只读聚合既有表；不占用 V25 与后续迁移号 |
| 权限复用 | 复用 `admin-console` 的服务端校验与前端 `AdminGuard` | 不新建第二套权限模型；`#/admin` 与既有后台页同一守卫 |

## 验收信号

1. 管理员登录后点「管理后台」落到 `#/admin`，看到六组指标卡与最近更新时间；后台导航「概览」Tab 处于选中态。
2. 用户卡显示总数、普通用户 / 管理员、正常 / 暂停 / 封禁，以及近 7 天与 30 天新增；角色分桶之和与状态分桶之和都等于总数。
3. 行程卡显示总数与招募中 / 已满员 / 旅行中 / 已结束 / 已取消，以及近 7 天与 30 天新增；五态之和等于总数；刚取消的行程从「招募中」移到「已取消」，总数不变。
4. 同行申请卡显示总数与五个状态；旅行体验卡显示总数与近 7 / 30 天新增。
5. 举报卡显示待处理 / 处理中 / 已处理 / 举报不成立；客服会话卡显示等待接入 / 处理中 / 已结束。
6. 空库或某状态为 0 时，卡片显示 0 而不是空白或「—」。
7. 某账号封禁到期后，概览的「封禁」减一、「正常」加一，与用户管理页的状态一致。
8. 点击用户 / 举报 / 客服卡片分别进入 `#/admin/users`、`#/admin/reports`、`#/admin/service`；行程 / 申请 / 体验卡没有跳转外观，点击无导航。
9. 普通用户看不到后台入口；直接输入 `#/admin` 展示无权限页，浏览器网络面板中没有 `/api/admin/dashboard` 请求；直接调用端点得到 403 `ADMIN_REQUIRED`，无身份得到 401。
10. 点击「刷新」后数字更新；页面停留期间不发起周期请求（无 3s / 30s 轮询）。
11. **静态校验：** `npx --no-install openspec validate add-admin-dashboard --strict` 通过且 `deltaCount: 5`；`openapi.yaml` 升 0.18.0 后 lint 0 error。
12. **动态验证：** 后端 `mvnw test`、前端 `typecheck` / `build` / `npm test` 全绿；`admin-dashboard.spec.ts` 断言非管理员不可入页、六组数字渲染、三组跳转与刷新；聚合单测覆盖封禁到期、取消行程、零填充与 7 / 30 天窗口边界。

## 残余风险

| 风险 | 处理 |
|---|---|
| 每次请求跑六组聚合，数据量增长后变慢 | 演示规模下为毫秒级；不预置缓存。P3 设计需给出查询条数上限与必要索引说明；真实增长后另开需求做快照或缓存 |
| `created_at` 存为字符串，窗口比较依赖格式一致 | 既有数据均为 ISO-8601 `Z` 字符串；P3 设计明确解析方式，P4 用固定 `Clock` 覆盖窗口边界 |
| 产品时区与数据库时间不一致导致「今天」错位 | 统一使用产品时区（Asia/Shanghai）切片；P4 测试固定时刻覆盖 00:00 前后 |
| 封禁到期的有效状态只在读取时推导，未落库 | 与 `admin-console` 的既有口径一致；概览只读，不触发写回；P4 用固定 `Clock` 覆盖到期前 / 后 |
| 行程状态推导与用户侧不一致的风险 | 统计 MUST 复用同一推导；P4 增加「同一时刻概览分桶与列表状态一致」的断言 |
| 管理员身份沿用既有登录会话，没有 MFA / 二次认证 / 操作审计 | 既有边界（与 `admin-console` 一致）；统计端点只读、不含明细，泄露面小于用户列表；真实上线前另开需求补强认证与审计 |
| 概览把 6 组塞进一屏，窄屏可读性差 | P3 出 390 / 768 / 1440 三档设计；P4 逐档走查，窄屏改为纵向卡片 |
| 概览成为「看起来准」的错误来源 | 每张卡展示「总数 = 各状态之和」；契约与单测都断言自洽，避免只测单桶 |
| `add-admin-console` 未归档，`role` / `status` 尚无 Living Spec | 归档顺序声明 `add-admin-console` 先归档；本 change 不改其文本 |
| E2E 未纳入 CI | 与既有 change 一致：本地执行新 spec；CI 以构建与单测为准 |
| 统计无历史快照，无法比较昨天与今天 | 本 change 明确只给当前快照与 7 / 30 天新增；历史趋势另开需求 |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。Delta Spec 与 AC/DoV 复核属 P2；`design.md`、`atdd-design.md`、`tasks.md` 属 P3；代码、契约与验证属 P4；Living Spec 合并与归档属 P5。本 change 不新增迁移、不修改既有能力文本、不触碰并行会话的在途改动。