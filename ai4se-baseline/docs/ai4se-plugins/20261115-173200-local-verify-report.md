# Local verify report — add-trip-companions

- **Change:** `add-trip-companions`（capability `trip-companions`，REQ-003）
- **Date:** 2026-11-15 17:32 (+0800)
- **Root:** d:/software/training/TATP/RouteMe/RouteME/ai4se-baseline
- **Spec:** [`openspec/changes/add-trip-companions/specs/trip-companions/spec.md`](../openspec/changes/add-trip-companions/specs/trip-companions/spec.md)（`openspec validate add-trip-companions --strict` = valid）

## 命令与结果

| 门禁 | 命令 | 结果 |
|---|---|---|
| 契约 lint | `cd RouteME; npx @redocly/cli lint openapi.yaml` | valid；0 error / 4 warning（`operation-4xx-response` 与 3 处故意非法示例） |
| 契约测试 | `cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test` | 3 tests passed |
| 后端全量 | `cd RouteME/backend; .\mvnw.cmd -B -ntp verify` | **103 tests, 0 failures**；BUILD SUCCESS |
| 前端构建 | `cd RouteME/frontend; npm run build` | `tsc --noEmit && vite build` 成功（仅 500 kB chunk 警告） |
| 前端测试 | `cd RouteME/frontend; npm test` | **27 tests passed**（4 files） |
| 端到端 | `cd RouteME/e2e; npx playwright test` | **8 tests passed**（companions 3 + trips 5） |

## 场景覆盖

| Requirement | API 证据 | E2E 证据 |
|---|---|---|
| R1 展示可解释的匹配原因 | `TripMatchTest`（5 例计分/理由）、`MatchControllerTest`（默认分数排序、单条匹配、参照行程 basis） | `shows match reasons and keeps match as the default sort` |
| R2 提交与取消同行申请 | `ApplicationControllerTest`（成功/空白说明/自己/重复/满员/结束/超长/取消/他人取消/非 PENDING） | `applies, gets accepted, chats…`（提交与状态展示） |
| R3 发布者处理申请并联动人数 | `ApplicationControllerTest`（发布者列表、接受、拒绝、非发布者、非 PENDING）、`ApplicationServiceTest`（满员自动 full、拒绝不改人数）、`TripPlanServiceTest`（addCompanion/removeCompanion 边界） | 同上（接受后 `已匹配同行`、人数联动） |
| R4 退出同行 | `ApplicationControllerTest.in_acceptedCompanion_out_leavesAndCanReapply`、`in_publisherLeave_out_forbidden`、`in_nonCompanionLeave_out_forbidden`、`in_completedTripLeave_out_notOpen` | 同上（退出后人数回退、可再次申请） |
| R5 匹配后的一对一文字沟通 | `ChatControllerTest`（升序、未匹配 403、空白/超长 400、已完成只读 409、聊天对象列表） | `applies, gets accepted, chats…`（发送与刷新）；`keeps companion entry points honest`（PENDING 与只读） |
| R6 我的旅行与最低安全能力 | `MyTripsControllerTest`（四组、待处理数、接受后同步）、`ReportControllerTest`（成功/非法枚举/超长/缺身份） | `applies, gets accepted, chats…`（举报回执、我的旅行 tab）；`keeps companion entry points honest` |

数据层：`CompanionDataMigrationSqliteTest` 在临时 SQLite 文件库执行 `V1`–`V7`，断言申请状态分布（5 ACCEPTED / 2 PENDING）、消息 4 条、`joined_count - 1 = ACCEPTED 数`；H2 测试共用同一组迁移。

## Non-goals 复核

- 没有批量接受/拒绝：`ApplicationController` 只有单个 `accept|reject`，E2E 断言无「全部接受」。
- 没有已读回执与推送：`chat_messages` 只追加，E2E 断言无「标记已读 / 开启推送」。
- 聊天为 5s 轮询 + 手动刷新，没有 WebSocket 依赖。

## 偏差与残留风险

| 项 | 说明 | Owner |
|---|---|---|
| 契约 lint warning | 4 条 warning 均非 error：`/users` 无 4XX、3 处「故意非法」示例（发布行程 stops/capacity、举报 target_type）；保留示例以说明 400 行为 | Jay |
| Playwright 不进 CI | 沿用 bootstrap 决定；E2E 为本地门禁 | Jay |
| 演示身份桩 | `X-User-Id` 可伪造，生产前必须替换为真实认证 | Jay |
| E2E 数据 | 用例在开发库新增行程/申请/消息（唯一标题），不清理；断言不依赖列表总数 | Jay |
| 聊天权限推导 | 权限由「已接受申请」实时推导，无独立会话表；退出后自然关闭 | Jay |
| 分步提交 | `add-trip-companions` 按 T1–T16 分步提交（与 plans 的「两次提交」例外同源：历史已推送，不改写） | Jay |