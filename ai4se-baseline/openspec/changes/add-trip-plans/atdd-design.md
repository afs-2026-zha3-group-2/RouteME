# ATDD design — add-trip-plans

- **Change:** `add-trip-plans`（`trip-plans`，REQ-002）｜ **阶段：** P3
- **输入：** [`spec.md`](specs/trip-plans/spec.md)（5 Requirement / 21 Scenario）、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)、原型 `docs/prototype/stories.html` S03–S05
- **规则依据：** `@rule:api-contract`、`@rule:java-testing`、`@rule:web-testing`、`@rule:spec-first`

## 1. ATDD 层次

| 层 | 是否本次 | 说明 |
|---|---|---|
| **API**（MockMvc + H2/SQLite） | 是 | 列表/筛选/排序/发布校验/详情/结束行程的请求-响应契约 |
| **E2E**（Playwright，真实后端） | 是 | 身份门 → 首页 → 详情 → 发布 → 结束行程的用户可见路径 |
| **UT**（JUnit 单元） | 推迟到 `/sdd:atdd-apply` | 日期校验、区间交集、筛选谓词组合、状态推导、人数计算 |

ATDD 原则：先写失败的 API/E2E 检查，再写生产代码；本文件不设计 UT 套件。

## 2. Scenario 分层

| # | Scenario（spec 锚点） | 层 | 判定信号 |
|---|---|---|---|
| 1 | 选择演示身份进入系统 | E2E | 身份门交互，跨页面 |
| 2 | 演示中切换身份 | E2E | 顶栏切换 + 全页数据刷新 |
| 3 | 默认列表与卡片信息 | API + E2E | 列表响应字段可单接口断言；卡片渲染需 UI |
| 4 | 已结束 / 已取消不出现在默认列表 | API | 列表过滤规则，单接口可证「不返回」 |
| 5 | 加载中展示骨架 | E2E | 仅 UI 状态可见 |
| 6 | 无结果时空状态并保留条件 | E2E | 跨筛选控件与列表的 UI 行为 |
| 7 | 关键词搜索 | API | 查询参数 → 结果集 |
| 8 | 按目的地筛选 | API | 同上 |
| 9 | 按日期区间筛选 | API | 同上（区间交集逻辑另列 UT） |
| 10 | 按兴趣标签多选筛选 | API | 同上 |
| 11 | 排序（出发日期 / 最新发布） | API | 响应顺序可断言 |
| 12 | 清除全部筛选条件 | E2E | UI 控件状态 |
| 13 | 填写完整必填项后成功发布 | API + E2E | 201 + 可被列表检出；E2E 验证表单到首页可见 |
| 14 | 选填项可留空 | API | 请求体最小集合 |
| 15 | 必填项缺失时拒绝发布 | API | 400 + 错误码/字段 |
| 16 | 日期不合法时拒绝发布 | API | 400；日期推导另列 UT |
| 17 | 途经点不足两个时拒绝发布 | API | 400 |
| 18 | 计划人数越界时拒绝发布 | API | 400 |
| 19 | 预算区间倒置时拒绝发布 | API | 400 |
| 20 | 查看行程详情 | API + E2E | 详情响应字段可断言；页面渲染需 UI |
| 21 | 状态标识清晰（文字，不只颜色） | E2E | 可访问文本断言 |
| 22 | 同行申请入口按资格显示 | E2E | 可见性/禁用态，跨身份 |
| 23 | 已结束行程展示游后分享区占位 | E2E | 页面区块存在性 |
| 24 | 发布者标记行程已结束 | API + E2E | 状态变更接口；列表/徽标联动 |
| 25 | 非发布者不能结束行程 | API | 403 |
| 26 | 已结束行程不再可申请 | E2E | 入口隐藏（提交资格属 REQ-003） |

**推荐附加层（advisory，非门禁）：** 安全（演示身份桩越权校验）、兼容性（390 / 768 / 1440 视口，复用原型断点）、a11y（状态文字、表单 label）。

## 3. 生产代码之前先写什么

1. **契约先行**：`openapi.yaml` 增加 `/users`、`/trips`、`/trips/{id}`、`/trips/{id}/complete` 与 `TripPlan` schema，`npm run lint:api` 通过；`OpenApiTest` 断言关键路径与 `required`。
2. **API 验收测试（红）**：`routeme/controller` 包下按 Scenario 3/4/7–20/24/25 写 MockMvc 测试，先全部失败。
3. **E2E 验收用例（红）**：`e2e/tests/` 下按 Scenario 1/2/5/6/12/13/21–23/26 写用户路径，先全部失败。
4. 再按 `/sdd:atdd-apply` 做 Red → Green → Refactor。

## 4. 本地与 CI 门禁

| 门禁 | 命令 | 说明 |
|---|---|---|
| 契约 | `npm run lint:api` | 仓库根；`openapi.yaml` 必须通过 |
| 后端 | `cd backend; .\mvnw.cmd -B verify` | H2 接口测试 + SQLite 直连迁移测试 |
| 前端 | `cd frontend; npm run build; npm test` | `tsc --noEmit && vite build` + Vitest |
| E2E | `npx playwright test`（后端已启动） | 本地门禁；CI 仍只跑后端 verify + 前端 build/test（bootstrap 决策，Playwright 不进 CI） |

E2E 不在 CI 时，PR 验证记录必须贴本地执行命令与结果摘要，不能只写「已测试」。

## 5. 数据与夹具

- **迁移**：`V3__create_demo_users.sql`（3 个演示账户）、`V4__seed_demo_trips.sql`（6 条行程：2 条已结束、3 条招募中、1 条已满员，覆盖目的地与标签）。
- **API 测试**：H2 内存库 + 每个测试类独立数据；`DatabaseTripPlanRepositorySqliteTest` 用临时 SQLite 文件库跑同一组迁移。
- **E2E**：真实后端 + 开发库；新建行程标题带 `E2E-<yyyymmddHHmmss>` 唯一前缀，断言前按标题筛选，不假设新记录在列表首位（共享库会累积）。
- **身份**：API 用请求头 `X-User-Id` 指定演示账户；E2E 通过身份门与顶栏切换，不直接改 header。

## 6. Non-goals 与反向验证

| Non-goal | 反向验证 |
|---|---|
| 不实现同行申请提交 / 接受 / 拒绝 | 详情页入口仅可见性；无申请写入接口 |
| 不实现游后体验内容 | 已结束详情只有分享区占位，不出现体验数据 |
| 不提供编辑 / 删除 / 取消行程 | E2E 断言详情与卡片无编辑、删除、取消入口 |
| 不提供注册 / 验证码 / 找回密码 | 身份门断言只有 3 个预设账户 |
| 不提供匹配度打分与匹配原因 | 排序选项只有出发日期 / 最新发布 |
| 不做分页 / 无限滚动 | 列表一次返回全部（当前数据量），无分页参数 |
| 不引入 NFR 测试 | 见 §7 |

## 7. NFR 测试

已于 2026-11-15 询问是否纳入；结论：**不纳入本 change**（MVP 无 SLA、无可观测性指标）。记录为 deferred，出现性能或运维要求时另开 change。

## 8. 本文件不做什么

不写生产代码；不设计 UT 套件；不引入 Playwright/POM/Excel 生成器；不新建 CI 语义；不重定义契约字段（以 `openapi.yaml` 为准）。