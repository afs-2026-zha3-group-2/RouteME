# ATDD 设计 — add-trip-completion（REQ-011 / S15）

- **Change：** `add-trip-completion`
- **输入：** Delta Spec（`specs/trip-plans/spec.md`、`specs/trip-companions/spec.md`）、`proposal.md`、`dov-ac-review.md`、`g1-decision.md`
- **平台：** Spring Boot 4.1 + MockMvc / JUnit 5；React 19 + Vitest；Playwright E2E
- **门禁：** 本地 `mvn test`、`npm test`、`npx playwright test`、`openspec validate add-trip-completion --strict`；CI 沿用 `.github/workflows/ci.yml`

## 1. 验收层分配

| 层 | 覆盖内容 | 说明 |
|---|---|---|
| **API（后端）** | 四态推导与日期边界、结束权限/终态、批量取消、自动完成物化、申请资格与处理、列表/统计口径、提醒窗口、契约枚举 | 固定 `Clock` + MockMvc；每个场景可直接断言 JSON 或服务状态 |
| **E2E（浏览器）** | 旅行中可见「结束行程」、二次确认取消/确认、结束后入口关闭、聊天只读提示、体验入口、我的旅行入口 | 相对日期夹具；不验证 21:00 提醒窗口（时钟不可控） |
| **UT（apply 阶段补充）** | `TripPlan.status(now)` 纯函数、`applicationEntryState` 的新增 ongoing 分支、前端提醒渲染 | 纯逻辑单测，不阻塞 P3 |
| **NFR** | 未纳入本轮（deferred）：批量物化性能、提醒去重 | 记录为 out of scope，P4 验证报告注明 |

## 2. 场景 → 用例映射

| ID | Delta 场景 | 层 | 用例要点 |
|---|---|---|---|
| E1 | 行程四态与日期流转：招募中 / 已满员 | API | 未开始、未满员 → `recruiting`；未开始、人数达标 → `full` |
| E2 | 到达开始日期自动进入旅行中 | API | 固定 Clock 在 `start_date` 当天 00:00；状态 `ongoing`，满员也显示 `ongoing` |
| E3 | 结束日期当天仍为旅行中；次日 00:00 自动完成 | API | 固定 Clock 23:59 → `ongoing`；次日 00:00 → `completed`，`completed_at` 被物化为计划结束时刻 |
| E4 | 开始日期等于今天发布即旅行中；早于今天拒绝 | API | 发布校验 400 `INVALID_INPUT`；当天发布返回 `ongoing` |
| E5 | 结束入口可见性（发布者 + 旅行中） | API + E2E | API：非发布者 403、非 ongoing 409；E2E：按钮仅发布者且 ongoing 时出现 |
| E6 | 二次确认：取消无变化 / 确认转已结束 | E2E | 取消后仍显示「旅行中」；确认后「已结束」且按钮消失 |
| E7 | 结束后申请入口关闭、提交/接受/拒绝全部拒绝 | API + E2E | 提交 409 `TRIP_NOT_OPEN`；接受/拒绝 409；E2E 申请区显示「行程已结束」 |
| E8 | 待处理申请自动取消 | API | 结束前 2 条待处理；结束后均 `cancelled`，申请者接口可见 |
| E9 | 同行者保留、聊天历史保留且只读 | API + E2E | `participants` 数量不变；发送消息 409 `CHAT_READ_ONLY`；E2E 提示「该行程已结束」 |
| E10 | 体验入口：发布者 / ACCEPTED 可见并可用；无资格拒绝 | API + E2E | `POST /experiences` 成功；REJECTED / CANCELLED / 路人 403 `EXPERIENCE_NOT_ALLOWED` |
| E11 | 满员后仅可拒绝、不可接受 | API | 满员行程 `accept` 409；`reject` 成功；旅行中满员状态仍 `ongoing` |
| E12 | 提醒：结束日期 21:00 起在响应中标记 | API + 前端 UT | `ending_soon=true`；21:00 前 false；结束后 false；前端按资格渲染提示 |
| E13 | 我的旅行 / 统计口径含自动完成 | API | 自动完成行程进入 `completed` 分组与 `stats.completed`；不进入 `matched` |
| E14 | 页面停留过期：服务端先物化再拒绝 | API | 构造“页面快照为 ongoing、实际已到期”：申请 → 409 + 申请不生成；结束 → 409；消息 → `CHAT_READ_ONLY` |
| E15 | 非目标反向验证 | API + E2E | 无撤销接口、无定时任务触发、无 push 渠道、结束不删除数据（反向断言） |

## 3. 测试基线与夹具

### 3.1 固定时钟（后端）

- 新增 `FixedClockTestConfig`（`@TestConfiguration`，`@Primary Clock`），固定为 `2026-11-16T09:00:00Z`。
- 仅在使用四态/结束/提醒的测试类通过 `@Import(FixedClockTestConfig.class)` 引入，避免影响生日年龄等既有测试。
- 边界用例可在测试方法内用 `@TestConfiguration` 的 `Clock.offset` 或直接构造 `TripPlan` 调纯函数 `status(now)` 覆盖 00:00 / 21:00 / 23:59。
- 业务日期统一按 `Asia/Shanghai` 解释（见 `design.md` D1），测试用同一 Zone。

### 3.2 种子数据

- 现有种子 3 / 4 的开始日期为 2026-11-16，测试固定 Clock 下为 `ongoing`；1 / 2 为 `completed`；5 / 6 / 7 为 `recruiting`（6 满员）。
- E2E 不再依赖种子 3 / 4 的日期漂移：结束用例通过 API 创建 `start_date = end_date = today` 的行程；首页断言只使用未来日期种子 5 / 6 / 7 或新建行程。
- 迁移不改种子日期；V14 不新增（本 change 无迁移）。

### 3.3 E2E 相对日期

- `createTripViaApi` 的 `start_date` / `end_date` 改为 `todayIso()`（已有工具函数），保证发布后为 `ongoing`。
- 非 ongoing 用例用未来日期（`today + 7`）创建，断言无「结束行程」按钮。
- 提醒窗口不做 E2E：运行时刻不可控，改由 API 固定 Clock + 前端 UT 覆盖。

## 4. 门禁与执行顺序

1. **Red：** 先写 `TripPlanStatusTest`（纯函数）+ `TripCompletionApiTest`（结束/取消/物化）失败用例。
2. **契约：** `openapi.yaml` 升 0.9.0（`ongoing`、`ending_soon`），同步 `OpenApiTest`。
3. **Green：** 后端实现 → 前端实现 → 单元测试。
4. **E2E：** `trips.spec.ts` 结束路径 + `companions.spec.ts` 结束后申请区 + `experiences.spec.ts` 自动完成入口。
5. **门禁：** `mvn test`、`npm test`、`npx playwright test`（本地后端 8080 / 前端 5173）、`openspec validate --strict`。

## 5. Non-goals 与反向验证

| Non-goal | 反向验证 |
|---|---|
| 不提供撤销 / 恢复结束 | `POST /trips/{id}/complete` 不存在恢复路径；E2E 已结束行程无「恢复」按钮 |
| 不提供外部通知 / 定时提醒 | 代码库无 `@Scheduled` / push 依赖；提醒仅响应字段 + 页面提示 |
| 不删除历史数据 | 结束后 `participants`、`messages`、`experiences` 仍可查询；DB 行数不变 |
| 不新增行程取消状态 | 错误码与 `TripStatus` 不出现 `cancelled` 行程状态；`GET /trips` 不返回取消语义 |
| 不改体验内容结构 | `Experience` schema 字段不变；仅资格口径回归 |

## 6. 覆盖缺口与处置

| 缺口 | 处置 |
|---|---|
| 21:00 提醒窗口无法在 E2E 稳定复现 | API 固定 Clock + 前端 `endingSoon` 渲染 UT |
| 并发物化（两个请求同时到期） | API 测试用条件更新断言幂等；不做并发压测（NFR deferred） |
| 服务器时区与用户本地时区差异 | 统一 `Asia/Shanghai` 业务日；测试固定 Clock；design D1 记录 |

**结论：** 场景可测试性完整，E1–E15 均可在 API 或 E2E 层断言；NFR 与并发压测明确 deferred。
