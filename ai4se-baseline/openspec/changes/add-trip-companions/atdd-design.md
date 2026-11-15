# ATDD design — add-trip-companions

- **Change:** `add-trip-companions`（`trip-companions`，REQ-003）｜ **阶段：** P3
- **输入：** [`spec.md`](specs/trip-companions/spec.md)（6 Requirement / 24 Scenario）、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)、原型 `stories.html` S07–S14
- **规则：** `@rule:api-contract`、`@rule:java-testing`、`@rule:web-testing`

## 1. ATDD 层次

| 层 | 本次 | 说明 |
|---|---|---|
| **API**（MockMvc + H2/SQLite） | 是 | 匹配分与理由、申请资格与状态、接受/拒绝/取消、人数联动、退出、聊天权限与只读、我的旅行分组、举报 |
| **E2E**（Playwright） | 是 | 首页匹配理由与默认排序、申请→接受→聊天、我的旅行、安全提示与举报回执 |
| **UT**（推迟到 apply） | 是 | 计分函数、申请资格谓词、人数联动后的状态投影、消息排序、举报入参校验 |

## 2. Scenario 分层

| # | Scenario | 层 | 依据 |
|---|---|---|---|
| 1 | 展示匹配理由与百分比 | API + E2E | 分数/理由可单接口断言；列表展示需 UI |
| 2 | 没有可参照的已发布行程 | API | 参照回退逻辑 |
| 3 | 没有任何重合时提示 | API | 理由文案 |
| 4 | 默认按匹配度排序 | API + E2E | 响应顺序 + 页面默认排序 |
| 5 | 提交申请并进入待处理 | API + E2E | 201/状态；表单流程需 UI |
| 6 | 不能申请自己发布的行程 | API | 403/400，服务端拒绝 |
| 7 | 不能重复申请 | API | 已存在 PENDING/ACCEPTED |
| 8 | 已满员或已结束不能申请 | API | 状态边界 |
| 9 | 处理前取消申请 | API + E2E | 状态变更 + 发布者侧计数 |
| 10 | 仅发布者可见与可处理 | API | 403 |
| 11 | 接受申请并建立连接 | API | 状态 + 人数 + 聊天权限 |
| 12 | 达到人数上限自动满员 | API | 计数投影 |
| 13 | 拒绝申请 | API | 状态 |
| 14 | 同行者确认退出 | API + E2E | 人数 -1、聊天关闭；确认交互需 UI |
| 15 | 发布者不能退出 | API | 403 |
| 16 | 退出后满员状态回退 | API | 计数投影 |
| 17 | 未匹配用户不能进入聊天 | API | 403 |
| 18 | 发送消息并刷新后可见 | API + E2E | 持久化与顺序；刷新需 UI |
| 19 | 空白或超长消息被拒绝 | API | 400 |
| 20 | 已结束行程聊天只读 | API + E2E | 读允许、写 409；UI 禁用 |
| 21 | 分区展示我的旅行 | API + E2E | 分组响应 + 页面 tab |
| 22 | 待处理申请提醒 | API + E2E | 计数 + 可点击入口 |
| 23 | 安全提示常驻 | E2E | 纯 UI 文案 |
| 24 | 提交举报并收到回执 | API + E2E | 201 + 回执文案 |

**推荐附加层（advisory）：** 安全（越权访问申请/聊天）、兼容性（390/768/1440）、a11y（提示可读、tab 语义）。

## 3. 生产代码之前先写什么

1. **契约先行**：`openapi.yaml` 增加匹配、申请、退出、聊天、我的旅行与举报端点与错误码；`OpenApiTest` 断言路径/必填/枚举；Redocly 0 error。
2. **API 验收测试（红）**：`routeme/controller` 下按上表 API 行编写 MockMvc 测试。
3. **E2E（红）**：`RouteME/e2e/tests` 增加 companions 路径，先失败。
4. 再按 `/sdd:atdd-apply` 做 Red → Green → Refactor。

## 4. 门禁

| 门禁 | 命令 | 说明 |
|---|---|---|
| 契约 | `cd RouteME; npx @redocly/cli lint openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test` | 0 error |
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B verify` | H2 + SQLite |
| 前端 | `cd RouteME/frontend; npm run build; npm test` | 类型 + 单测 |
| E2E | 后端/前端启动后 `cd RouteME/e2e; npx playwright test` | 本地门禁，CI 不跑 |

## 5. 数据与夹具

- **迁移**：`V5__create_trip_applications.sql`（含种子：PENDING/ACCEPTED/REJECTED/CANCELLED 各至少一条）、`V6__create_chat_messages.sql`、`V7__create_reports.sql`。
- **API 测试**：H2 内存库；需要独立数据时用 `@Transactional` 回滚；`DatabaseApplicationRepositorySqliteTest` 用临时 SQLite 跑同一组迁移。
- **E2E**：唯一标题前缀；申请使用种子行程或本次新发布的行程；不假设列表总数与顺序。
- **身份**：`X-User-Id` 指定 1–3。

## 6. Non-goals 与反向验证

| Non-goal | 反向验证 |
|---|---|
| 不做批量接受/拒绝 | 申请列表无批量操作入口 |
| 不做 WebSocket/已读/推送 | 聊天页只有「刷新消息」，无已读标记 |
| 不做举报后台 | 举报只返回回执，无处置列表 |
| 不做编辑/删除/取消行程 | 页面无对应入口 |
| 不做复杂推荐/滑卡 | 只有规则计分与理由 |
| 不做实时位置/导航 | 页面无地图/定位 |

## 7. NFR 测试

已于 2026-11-15 询问；结论：**不纳入本 change**（MVP 无 SLA），记录为 deferred。

## 8. 本文件不做什么

不写生产代码；不设计 UT 套件；不引入 Playwright 生成器；不新建 CI 语义。