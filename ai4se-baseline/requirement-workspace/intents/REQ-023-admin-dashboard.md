# REQ-023 意图捕获 — 管理后台概览统计（S25）

- **来源：** 用户 2026-11-17 需求「admin account which provide basic dashboard for statistics and count of different users etc」
- **Change：** `add-admin-dashboard`（管理后台迭代 4）
- **状态：** P1 Pass（2026-11-17；六处签署齐备，P2 待执行）｜ **Discovery Decision：** Go（light intake）
- **基线：** `main@b50e416`（与 `origin/main` 同步）

## 1. 原始诉求

管理后台已有用户、举报、客服三个列表页，但管理员看不到平台整体规模：有多少用户、分别是什么角色与状态、有多少行程与申请、举报积压多少、客服会话排队多少。用户要求一个「基础仪表盘」，用数量回答这些问题，并能从概览进入对应的处理页面。

本期只做**只读统计**：不改任何业务状态机、不新增明细页面、不引入图表库与实时推送。

## 2. 故事清单

| Story | 标题 | 迭代 | 点 | 落点 |
|---|---|---|---|---|
| S25 | 查看平台概览统计 | 管理后台迭代 4 | 3 | 管理后台概览页 `#/admin` |

## 3. 现状差距（as-is）

| 能力 | 现状 | 证据 | 缺口 |
|---|---|---|---|
| 后台落地页 | 「管理后台」入口直接跳到用户列表 | `frontend/src/shell/AppShell.tsx:403`、`:512`（`href="#/admin/users"`） | 没有概览页，管理员第一屏是用户列表 |
| 后台路由 | 只有 `/admin/users`、`/admin/reports`、`/admin/service` 及其详情；`/admin` 根路径无匹配 | `frontend/src/route.ts:49-69`，`parse` 末尾落到未匹配分支 | 输入 `#/admin` 无法到达概览 |
| 后台导航 | 三个 Tab：用户 / 举报 / 客服 | `frontend/src/admin/AdminLayout.tsx:4-10` | 无「概览」入口 |
| 聚合查询 | 三个管理端控制器只有列表、详情与状态迁移 | `controller/AdminUserController.java`、`AdminReportController.java`、`AdminServiceController.java` | 无任何 `dashboard` / 统计端点（全仓 Java `dashboard` / `Statistics` 零命中） |
| 计数能力 | 只能逐页翻列表或手写 SQL | `service/AdminUserService.java`、`AdminReportService.java`、`CustomerService.java` | 平台规模、积压与新增趋势不可观察 |
| 事实表 | 六类数据分散在六张表：账号、行程、申请、体验、举报、客服会话 | `db/migration/V3__create_demo_users.sql`、`V4__seed_demo_trips.sql`、`V5__create_trip_applications.sql`、`V8__create_trip_experiences.sql`、`V7__create_reports.sql`、`V21__admin_console.sql` | 没有跨表只读聚合 |
| 行程状态 | 不落库，按「取消 > 已结束 > 旅行中 > 满员 > 招募中」实时推导 | `pojo/TripPlan.java:65-79` | 统计必须复用同一推导，不能另写一套判定 |
| 账号有效状态 | `BANNED` 到期后按读取惰性恢复 `ACTIVE` | `service/AccountStatusService.java` | 统计口径必须与治理页一致，否则两侧数字互相矛盾 |

数据量级为演示规模（账号数百、行程上百），单次 `GROUP BY` 足够；不需要物化视图、缓存或定时任务。

## 4. 关键裁决（用户确认 + 默认收口）

| 编号 | 决策点 | 选择 | 来源 |
|---|---|---|---|
| D1 | change 粒度 | 单 change `add-admin-dashboard`，ADDED 能力 `admin-dashboard` | 用户确认「do p1 for a requirement」 |
| D2 | 指标范围 | 用户 + 内容 + 治理：用户、行程、同行申请、旅行体验、举报、客服会话六组 | 用户确认（2026-11-17） |
| D3 | 时间维度 | 当前总量 + 用户 / 行程 / 体验的近 7 天与 30 天新增；不画趋势图 | 用户确认（2026-11-17） |
| D4 | 页面位置 | 新增 `#/admin` 概览页，作为管理后台默认落地页；卡片跳到既有列表页 | 用户确认（2026-11-17） |
| D5 | 端点形态 | 单个只读 `GET /api/admin/dashboard`，一次请求返回六组计数 | 一次往返、一份契约；避免六个端点 |
| D6 | 权限 | 复用 `admin-console` 的服务端 `role=ADMIN` 校验与前端 `AdminGuard`；非管理员 403 `ADMIN_REQUIRED` | 不新建第二套权限模型 |
| D7 | 用户总数口径 | 包含全部账号（含 `ADMIN`）；另给角色分桶 `USER` / `ADMIN` | 管理员要看到平台账号总量 |
| D8 | 账号有效状态 | 已过解封时间的 `BANNED` 账号计入 `ACTIVE` | 与治理页的惰性恢复口径一致 |
| D9 | 行程计数口径 | 复用既有四态（含 `cancelled`）实时推导；已取消行程计入总数并在 `cancelled` 桶体现 | 不新增 `status` 列，避免与用户侧不一致 |
| D10 | 新增计数基准 | 以 `created_at` 为准 | 六张表都有 `created_at`；状态变更时间不是「新增」 |
| D11 | 时间窗口 | 产品时区（Asia/Shanghai）自然日：含当天共 7 / 30 天 | 与行程状态推导的时区一致；避免跨时区导致「今天」错位 |
| D12 | 零值 | 所有状态桶固定返回，计数为 0 时返回 0 | 前端不用处理「键缺失」分支，契约稳定 |
| D13 | 刷新 | 手动刷新；不轮询、不推送、不做服务端缓存 | MVP 成本最低；后台无实时性要求 |
| D14 | 契约 / 迁移 | 契约 0.18.0；**无迁移**（只读聚合既有表） | 不新增表、列、索引与种子数据 |
| D15 | 不可跳转分组 | 行程 / 申请 / 体验三组卡片不渲染跳转 | 后台没有对应列表页，假入口比没有更差 |

## 5. 跨 change 冲突与归档顺序

1. **`add-admin-console`（P3 pass，未归档）** 提供 `app_users.role` / `status`、`AdminGuard`、`AdminLayout` 与 8 个管理端端点。本 change 只读取这些字段与布局，**不 MODIFIED** 任何既有能力。
2. 归档时 `add-admin-console` MUST 先于本 change，否则 `admin-dashboard` 的「复用管理员权限」在 Living Spec 中缺少前置语。
3. **契约版本：** 当前 `openapi.yaml` 为 0.17.0；本 change 预约 **0.18.0**，不与在途 change（0.14.0 / 0.15.0 / 0.16.0 声明）冲突。
4. **迁移：** 本 change 无迁移，不占用 V25；后续 change 可继续顺延。
5. **共享工作区：** 不提交、不暂存其他并行会话的未完成改动。

## 6. 产出

- `requirement-workspace/requirements/REQ-023-admin-dashboard.md`（六字段 + 13 条场景索引 + 12 项 OQ + DoR）
- `requirement-workspace/stories/add-admin-dashboard.story.md`（S25）
- `openspec/changes/add-admin-dashboard/proposal.md`
- `openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md`（ADDED 5 Requirement / 13 Scenario）
- `docs/reviews/20261117-add-admin-dashboard-proposal-review.md`、`...-spec-review.md`
- `docs/sdd/add-admin-dashboard/p1-intent.md`
- `stories.md` / `registry.md` 登记

## 7. 验证

- `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`。
- 结构：1 份 delta、5 Requirement、13 Scenario；`deltaCount: 5`。
- 未运行后端 / 前端测试：P1 尚无实现，按 `all-specs-review` 记 N/A。
- 已核对：契约 0.18.0 不冲突；无迁移，不触碰 V20–V24；后台入口与路由现状与源码一致。