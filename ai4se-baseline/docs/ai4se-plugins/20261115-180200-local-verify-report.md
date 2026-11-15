# Local verify report — add-trip-experiences

- **Change:** `add-trip-experiences`（capability `trip-experiences`，REQ-004）
- **Date:** 2026-11-15 18:02 (+0800)
- **Root:** d:/software/training/TATP/RouteMe/RouteME/ai4se-baseline
- **Spec:** [`openspec/changes/add-trip-experiences/specs/trip-experiences/spec.md`](../openspec/changes/add-trip-experiences/specs/trip-experiences/spec.md)（`openspec validate add-trip-experiences --strict` = valid）

## 命令与结果

| 门禁 | 命令 | 结果 |
|---|---|---|
| 契约 lint | `cd RouteME; npx @redocly/cli lint openapi.yaml` | valid；0 error / 6 warning（`operation-4xx-response` 与 5 处故意非法示例） |
| 契约测试 | `cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test` | 4 tests passed |
| 后端全量 | `cd RouteME/backend; .\mvnw.cmd -B -ntp verify` | **132 tests, 0 failures**；BUILD SUCCESS |
| 前端构建 | `cd RouteME/frontend; npm run build` | `tsc --noEmit && vite build` 成功（仅 500 kB chunk 警告） |
| 前端测试 | `cd RouteME/frontend; npm test` | **34 tests passed**（5 files） |
| 端到端 | `cd RouteME/e2e; npx playwright test` | **11 tests passed**（experiences 3 + companions 3 + trips 5） |

## 场景覆盖

| Requirement | API 证据 | E2E 证据 |
|---|---|---|
| R1 发布/修改体验与资格 | `ExperienceControllerTest`（发布者/同行者成功、非参加者 403、未结束 403、未知行程 404）、`ExperienceServiceTest`（upsert 不重复、发布者资格） | `shares an experience and reuses it…`；`keeps experience entry points honest` |
| R2 内容口径与纯文字降级 | `TripExperienceTest`（10/400/120 边界、强度解析、更新保留 createdAt）、`ExperienceControllerTest`（短内容/非法强度 400） | `shares an experience…`（强度标签、无图片上传） |
| R3 原计划详情页展示 | `ExperienceControllerTest.in_tripExperiences_out_listForTrip` | 同上（详情区内容与「修改我的体验」） |
| R4 首页旅行体验视图 | `ExperienceServiceTest`（目的地/标签/关键词筛选、更新后置顶）、`ExperienceControllerTest` | `shows seeded experiences in the travel experience view` |
| R5 参考此行程发布 | —（前端预填，无独立接口） | `shares an experience…`（预填目的地/途经点/标签，清空标题/人数，校验拦截） |
| R6 我的旅行入口与边界 | `ExperienceControllerTest.in_myExperiences_out_onlyMine` | `keeps experience entry points honest`（分享页隐私提示、无图片上传） |

数据层：`ExperienceDataMigrationSqliteTest` 在临时 SQLite 文件库执行 `V1`–`V8`，断言 2 条种子、均属已结束行程、作者均为参加者、`UNIQUE(trip_id, author_id)` 生效；H2 测试共用同一组迁移。

## Non-goals 复核

- 无图片上传：`trip_experiences` 无图片列，分享页无上传控件，E2E 断言不存在。
- 无评论/点赞/收藏、无审核后台、无推荐算法：无对应端点与页面元素。
- 无后端 copy 接口：参考发布只做前端 `?from=` 预填，创建仍走 `POST /trips`。

## 偏差与残留风险

| 项 | 说明 | Owner |
|---|---|---|
| 参考发布人数 | 按需求 §4.7 清空人数；原型 `draftFromSource` 复制人数，记为原型待修 | Jay |
| 契约 warning | 6 条 warning 均非 error：`/users` 无 4XX、5 处故意非法示例（发布行程、举报、体验） | Jay |
| Playwright 不进 CI | 沿用 bootstrap 决定；E2E 为本地门禁 | Jay |
| 演示身份桩 | `X-User-Id` 可伪造，生产前必须替换为真实认证 | Jay |
| E2E 数据 | 用例在开发库新增行程与体验（唯一标题/内容），不清理；断言不依赖总数 | Jay |
| 体验无审核/举报目标 | 本迭代只记录内容；后续可扩展 `/reports` 的 `target_type` | Jay |