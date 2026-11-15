# Local verify report — add-trip-plans

- **Change:** `add-trip-plans`（capability `trip-plans`，REQ-002）
- **Date:** 2026-11-15 16:01 (+0800)
- **Root:** d:/software/training/TATP/RouteMe/RouteME/ai4se-baseline
- **Spec:** [`openspec/changes/add-trip-plans/specs/trip-plans/spec.md`](../openspec/changes/add-trip-plans/specs/trip-plans/spec.md)（`openspec validate add-trip-plans --strict` = valid）

## 命令与结果

| 门禁 | 命令 | 结果 |
|---|---|---|
| 契约 lint | `cd RouteME; npx @redocly/cli lint openapi.yaml` | valid；0 error / 3 warning（`operation-4xx-response`、示例规则） |
| 契约测试 | `cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test` | 2 tests passed |
| 后端全量 | `cd RouteME/backend; .\mvnw.cmd -B -ntp verify` | **32 tests, 0 failures**；BUILD SUCCESS（13.1s） |
| 前端构建 | `cd RouteME/frontend; npm run build` | `tsc --noEmit && vite build` 成功（仅 500 kB chunk 警告） |
| 前端测试 | `cd RouteME/frontend; npm test` | **25 tests passed**（4 files） |
| 端到端 | `cd RouteME/e2e; npx playwright test` | **5 tests passed**（12.0s） |

## 场景覆盖

| Requirement | API 证据 | E2E 证据 |
|---|---|---|
| 演示身份进入与切换 | `TripControllerTest.in_missingUserHeader_out_demoUserRequired`、`in_unknownUser_out_demoUserRequired`、`in_demoUsersEndpoint_out_threeAccounts` | `shows the identity gate with three demo accounts…` |
| 浏览未结束的旅行计划 | `in_defaultList_out_unfinishedTripsOnly`、`DatabaseTripPlanRepositoryTest`（completed 不在列表） | 同上；默认列表不出现「珠海情侣路摄影一日游」 |
| 搜索、筛选与排序 | `in_filters_out_matchingTrips`、`TripPlanQueryServiceTest`（关键词/目的地/日期/标签/排序） | `filters the list by interest tag…` |
| 发布可被他人理解的旅行计划 | `TripControllerTest.in_validRequest_out_createdRecruitingTrip` + 6 个拒绝用例 | `publishes a trip and finds it from the home search` |
| 查看行程详情与清晰的状态 | `in_detail_out_publisherAndParticipants`、`in_unknownTrip_out_tripNotFound` | `keeps out-of-scope actions off the screens`（入口可见性） |
| 发布者结束自己的行程 | `in_publisherCompletesTrip_out_completedStatus`、`in_nonPublisherCompletesTrip_out_forbidden`、`in_alreadyCompletedTrip_out_tripNotOpen` | `publisher marks a trip completed…` |

数据层：`DemoDataMigrationSqliteTest` 在临时 SQLite 文件库执行 `V1`–`V4`，断言 3 个账户、6 条行程、2 条已结束、1 条已满员；H2 测试共用同一组迁移。

## 偏差与残留风险

| 项 | 说明 | Owner |
|---|---|---|
| 契约 lint 命令 | 原计划的 `npm run lint:api` 在 RouteME 不存在；改为 Redocly（`RouteME/redocly.yaml`）+ `OpenApiTest`，tasks/ATDD 已同步 | Jay |
| Playwright 不进 CI | 沿用 bootstrap 决定；E2E 为本地门禁，验证记录需贴命令与结果 | Jay |
| 演示身份桩 | `X-User-Id` 可伪造，生产前必须替换为真实认证 | Jay |
| 同行者列表 | MVP 只含发布者；`joined_count` 可大于列表长度，详情页有说明文案，REQ-003 补齐 | Jay |
| E2E 数据 | 发布用例会在开发库新增记录（唯一标题），不清理；断言不依赖列表总数 | Jay |

## 结论

**Pass** —— 所有必需门禁通过，验收场景有 API/E2E 证据。可进入 G2/G3 决策记录与归档（本次未执行 Gate 决策与 archive）。