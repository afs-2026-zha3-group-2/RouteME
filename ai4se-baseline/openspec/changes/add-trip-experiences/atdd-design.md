# ATDD design — add-trip-experiences

- **Change:** `add-trip-experiences`（`trip-experiences`，REQ-004）｜ **阶段：** P3
- **输入：** [`spec.md`](specs/trip-experiences/spec.md)（6 Requirement / 14 Scenario）、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)、原型 `stories.html` S15–S17
- **规则：** `@rule:api-contract`、`@rule:java-testing`、`@rule:web-testing`

## 1. ATDD 层次

| 层 | 本次 | 说明 |
|---|---|---|
| **API**（MockMvc + H2/SQLite） | 是 | 分享资格（含发布者）、内容口径边界、upsert 语义、详情/首页查询与筛选、我的体验 |
| **E2E**（Playwright） | 是 | 已完成行程发表体验 → 详情区与首页体验视图可见 → 参考发布预填 → 必填重填 |
| **UT**（推迟到 apply） | 是 | 内容校验纯函数、强度映射、筛选与排序、预填清空逻辑 |

## 2. Scenario 分层

| # | Scenario | 层 | 依据 |
|---|---|---|---|
| 1 | 具备资格时发布体验 | API + E2E | 201 + 可查询；表单流程需 UI |
| 2 | 行程未结束时拒绝分享 | API | 409/403，服务端拒绝 |
| 3 | 未参加行程时拒绝分享 | API | 403 |
| 4 | 发布者也可以分享 | API | 资格包含发布者 |
| 5 | 再次提交即修改 | API | 同一 (trip, author) upsert |
| 6 | 内容不满足口径时拒绝 | API + UT | 400 + 字段边界 |
| 7 | 以三档强度表达体感 | API + E2E | 枚举与标签 |
| 8 | 无图片也能发布并展示内置封面 | API + E2E | 纯文字 201；卡片封面 |
| 9 | 详情页展示已发布体验 | API + E2E | 查询结果 + 详情区 |
| 10 | 具备资格时显示发表或修改入口 | E2E | 入口可见性 |
| 11 | 没有体验时展示空态 | API + E2E | 空数组 + 空态文案 |
| 12 | 切换到旅行体验视图 | API + E2E | 列表与计数 |
| 13 | 体验筛选与倒序 | API | q/destination/tags + 时间倒序 |
| 14 | 体验空态 | E2E | 纯 UI |
| 15 | 参考此行程发布并预填 | E2E | 表单字段预填 |
| 16 | 必填字段不沿用原行程 | E2E + UT | 空值与校验 |

> 编号按 spec 顺序展开，14 个 Scenario 中「必填字段不沿用」同时由 E2E 与纯函数 UT 覆盖。

**推荐附加层（advisory）：** 安全（非参加者直调接口）、兼容性（390/768/1440）、a11y（强度选择可键盘操作、提示可读）。

## 3. 生产代码之前先写什么

1. **契约先行**：`openapi.yaml` 增加 `/experiences`、`/trips/{tripId}/experiences`（GET/POST）、`/me/experiences` 与 `Experience`/`ExperienceWriteRequest` schema；`OpenApiTest` 断言路径/必填/枚举；Redocly 0 error。
2. **API 验收测试（红）**：`routeme/controller` 下 `ExperienceControllerTest`、`routeme/model` 下 `TripExperienceTest`。
3. **E2E（红）**：`RouteME/e2e/tests/experiences.spec.ts`，先失败。
4. 再按 `/sdd:atdd-apply` 做 Red → Green → Refactor。

## 4. 门禁

| 门禁 | 命令 | 说明 |
|---|---|---|
| 契约 | `cd RouteME; npx @redocly/cli lint openapi.yaml`；`cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test` | 0 error |
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B verify` | H2 + SQLite |
| 前端 | `cd RouteME/frontend; npm run build; npm test` | 类型 + 单测 |
| E2E | 后端/前端启动后 `cd RouteME/e2e; npx playwright test` | 本地门禁，CI 不跑 |