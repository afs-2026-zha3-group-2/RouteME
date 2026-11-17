# ATDD 设计 — add-trip-cancel（REQ-019 / issue #28）

- **Change：** `add-trip-cancel`
- **输入：** Delta Spec `trip-cancellation`（5 Requirement / 20 Scenario）、`design.md`、`dov-ac-review.md`、`g1-decision.md`
- **平台：** Spring Boot 4.1 + MockMvc / JUnit 5；React 19 + Vitest；Playwright E2E
- **门禁：** 本地 `mvn test`、`npm test`、`npx playwright test`、`openspec validate add-trip-cancel --strict`、Redocly lint；CI 沿用 `.github/workflows/ci.yml`

## 1. 验收层分配

| 层 | 覆盖内容 | 说明 |
|---|---|---|
| **API（后端）** | 取消权限与状态、原因 / 说明校验、并发幂等、列表与分页排除、PENDING 自动取消、ACCEPTED 保留、聊天只读、体验拒绝、统计排除、原因裁剪、旧数据兼容 | 固定 `Clock` + MockMvc；每个场景断言 JSON、数据库状态或服务结果 |
| **E2E（浏览器）** | 详情页与我的旅行入口、原因选择、二次确认、取消后状态与原因展示、聊天只读提示、体验入口隐藏 | 通过 API 创建行程与申请，避免依赖种子日期 |
| **UT（apply 阶段补充）** | `TripPlan.status` 取消优先级、`applicationEntryState` 的 cancelled 分支、`StatusBadge` 取消态、说明长度校验 | 纯逻辑单测，不阻塞 P3 |
| **NFR** | 未纳入本轮（deferred）：并发压测、取消量级监控 | 记录为 out of scope，P4 验证报告注明 |

## 2. 场景 → 用例映射

| ID | Delta 场景 | 层 | 用例要点 |
|---|---|---|---|
| E1 | 发布者取消招募中 | API | 200；`status=cancelled`；`cancelled_at` 非空；原因为所选值 |
| E2 | 发布者取消已满员 | API | 200；满员不阻止取消；原因与说明写入 |
| E3 | 非发布者不能取消 | API | 403 `FORBIDDEN`；状态与取消列不变 |
| E4 | 非可取消状态拒绝 | API | ongoing / completed / cancelled 均 409 `TRIP_NOT_OPEN` |
| E5 | 取消入口按资格显示 | E2E + API | 详情与我的旅行仅发布者 + recruiting/full 可见；非发布者无按钮 |
| E6 | 原因必选 | API + E2E | 缺 reason → 400 `INVALID_INPUT`；前端按钮禁用并提示 |
| E7 | 8 项原因字典 | API | 8 个 wire 值逐一可接受；未知值 400 |
| E8 | 其他原因说明 | API + E2E | `other` 空 / 101 字 → 400；1–100 字成功；前端同步校验 |
| E9 | 二次确认 | E2E | 弹窗含「取消后不可恢复」、下架、申请关闭、同行者可见；取消返回不变 |
| E10 | 确认后状态迁移 | API + E2E | 确认后详情与我的旅行显示「已取消」；记录时间与原因 |
| E11 | 列表与分页排除 | API | 首页 / 匹配 / 筛选 / 翻页均不含；`total` 不含 |
| E12 | PENDING 自动取消 | API | 取消事务后 PENDING → cancelled；申请者「我申请的」可见；接受 / 拒绝 409 |
| E13 | ACCEPTED 保留 | API | 同行关系不变；`participants` 仍含；退出 / 再申请 409 |
| E14 | 聊天只读 | API + E2E | 历史可读；发送 409 `CHAT_READ_ONLY`；页面提示「该行程已取消」 |
| E15 | 取消后不再接受申请 | API + E2E | 详情无申请入口；提交 409；不生成新申请 |
| E16 | 不能结束或再次取消 | API | 结束 409；再次取消 409；并发取消仅 1 次成功 |
| E17 | 不能编辑集合信息 | API | 409；`meeting_areas` / `meeting_time` 不变 |
| E18 | 不能发表体验 | API + E2E | 页面无入口；`POST /experiences` 403 `EXPERIENCE_NOT_ALLOWED` |
| E19 | 统计排除取消 | API | `stats.published` 不含取消；`stats.completed` 不变 |
| E20 | 原因按角色可见 | API + E2E | 发布者 / ACCEPTED 见原因与说明；PENDING / 路人 / 匿名登录用户为 null |
| E21 | 旧数据兼容 | API | 三列为 NULL 的旧行程按日期推导；列表与详情正常 |

## 3. 测试基线与夹具

### 3.1 固定时钟（后端）

- 复用 `FixedClockTestConfig`（`@Primary Clock`，固定 `2026-11-16T09:00:00Z`）；仅取消相关测试 `@Import`。
- 状态优先级用纯函数 `TripPlan.status(now)` 覆盖：取消 + 未开始、取消 + 旅行中、取消 + 已过期。
- 并发取消用两个线程 / 两次服务调用，断言仅一次更新成功、取消字段只写一次。

### 3.2 种子与 API 夹具

- 不修改既有种子日期；取消用例通过 `POST /api/trips` 创建招募中 / 满员行程，再取消。
- 满员行程：发布者 + 一名用户申请并由发布者接受（capacity=2）。
- PENDING 场景：另一名用户提交申请但不处理。
- ACCEPTED 场景：接受后取消，断言 `participants` 与申请状态。
- 旧数据：直接用 SQL 插入三列为 NULL 的行，验证读取与状态推导。

### 3.3 E2E 相对日期与选择器

- 用 `createTripViaApi` 创建 `start_date = today + 7` 的招募中行程；避免种子日期漂移。
- 取消按钮选择器：`data-action="cancel-trip"`（原型与实现统一）；原因 Select 用可见 label；说明 TextArea 用 label。
- 取消成功后断言 `data-status="cancelled"` 与「已取消」文字；我的旅行 `data-group="published"` 行保留。
- 聊天只读断言 composer 消失与提示文案；体验入口断言不存在。
- 多宽度：1440 / 1024 / 768 / 390，浅色 / 深色各跑一次关键路径。

## 4. 门禁与执行顺序

1. **Red：** `TripCancellationApiTest`（权限 / 状态 / 原因 / 并发）+ `TripPlanStatusTest` 取消优先级失败用例。
2. **契约：** `openapi.yaml` 升 0.13.0，同步 `OpenApiTest`（版本、枚举、新 schema）。
3. **Green：** 迁移 → 领域 / 服务 → 查询 / 统计 → 控制器 / 响应 → 前端。
4. **E2E：** `trips.spec.ts` 详情取消、`companions.spec.ts` PENDING / ACCEPTED / 聊天、`experiences.spec.ts` 无体验入口。
5. **门禁：** `mvn test`、`npm test`、`npx playwright test`、`openspec validate --strict`、Redocly lint。

## 5. Non-goals 与反向验证

| Non-goal | 反向验证 |
|---|---|
| 不做信用分 / 扣分 / 免扣分申请 / 管理员审核 | 代码与契约无 credit / admin 字段或端点；P5 summary 记录另立 story |
| 不做删除 / 恢复 / 撤销取消 | 无删除取消记录的端点；取消后无「恢复」入口 |
| 不做取消推送 / 通知 | 无 `@Scheduled` / push 依赖；仅页面状态 |
| 不公开取消原因 | 非发布者 / 非 ACCEPTED 的详情响应原因为 null |
| 不做退款 / 费用结算 | 无支付 / 退款相关字段与端点 |
| 不改写既有 `trip-plans` / `trip-companions` Requirement 块 | Delta 只有 ADDED；归档时列表口径与既有块措辞核对 |

## 6. 覆盖缺口与处置

| 缺口 | 处置 |
|---|---|
| 并发取消无法在 E2E 稳定复现 | API 层用条件更新断言仅一次成功；不做压测（NFR deferred） |
| 8 项原因的中文标签在 E2E 逐一选择成本高 | API 逐值覆盖 wire 值；E2E 只覆盖 `other` 与一个普通原因 |
| 原因裁剪的匿名请求 | 后端要求演示身份；用「登录但非参与者」验证 null，匿名 401 由既有测试覆盖 |
| 旧数据迁移 | SQLite 迁移测试 + 直接插入 NULL 行；无回填脚本 |

**结论：** E1–E21 均可在 API 或 E2E 层断言；NFR 与并发压测明确 deferred。
