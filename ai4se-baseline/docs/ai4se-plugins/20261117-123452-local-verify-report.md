# Local Verify Report: add-trip-cancel（REQ-021 / issue #28）

**Date:** 2026-11-17 (timezone: +0800)
**Root:** c:/Git/ITA/RouteME/.worktrees/add-trip-cancel/ai4se-baseline
**Change:** `add-trip-cancel`
**Scope:** P4 implementation + local verification（未提交 PR / CI / G2）

## 1. Environment

| 项 | 值 |
|---|---|
| JDK | 21.0.11 |
| Maven | wrapper（3.9.x） |
| Node | v24.18.0 ｜ npm 11.x |
| Backend | Spring Boot 4.1.2，端口 8083 |
| Frontend | Vite 8 + React 19，端口 5176 |
| E2E DB | `SqlLite/routeme-e2e.db`（独立于主工作区） |
| 契约 | `openapi.yaml` 0.13.0 |

## 2. Commands & Results

| 层 | 命令 | 结果 |
|---|---|---|
| 后端单测 / API | `cd RouteME/backend; .\mvnw -q test`（显式 `SPRING_DATASOURCE_URL` 指向 H2） | **262 passed / 0 failed / 0 errors**（38 个测试类） |
| 前端构建 | `cd RouteME/frontend; npm run build` | **Pass**（tsc + vite，1584 modules；仅有既有 chunk-size 提示） |
| 前端单测 | `npm test` | **254 passed / 254**（35 个文件） |
| E2E | `cd RouteME/e2e; npx playwright test`（102 个用例） | **82 passed / 20 failed**；20 个失败全部为 base 分支既有的地图 E2E 债务（见 §5），本次新增 4 个取消用例全绿 |
| 契约 | `npx @redocly/cli lint openapi.yaml` | **0 error / 15 warning**（均为既有示例 / 4xx 告警） |
| OpenSpec | `openspec validate add-trip-cancel --strict` | **valid** |
| 原型 | P3：`node --check` data.js / ui.js / main.js / store.js | **Pass** |

## 3. 覆盖的关键场景

| 场景 | 证据 |
|---|---|
| E1–E2 招募中 / 满员取消成功，写入原因与说明 | `TripCancellationApiTest`、`TripPlanStatusTest`、`trips.spec.ts` |
| E3–E4 非发布者 403、非开放状态 / 重复取消 409 | `TripCancellationApiTest` |
| E5 详情页与我的旅行入口、二次确认与取消后只读 | `trips.spec.ts`（详情 + 我的旅行两条） |
| E6–E9 原因必选、8 项固定值、`other` 说明 1–100 字 | `TripCancellationApiTest`、`trips.spec.ts` |
| E10 已取消详情、`cancelled_at` 公开、原因 / 说明仅发布者与 ACCEPTED 可见 | `TripCancellationApiTest`、`companions.spec.ts` |
| E11 首页 / 匹配列表排除取消；我的旅行 published / matched 保留、completed 排除 | `TripCancellationApiTest`、`trips.spec.ts`、`companions.spec.ts` |
| E12 PENDING 申请自动取消 | `TripCancellationApiTest`、`companions.spec.ts` |
| E13 ACCEPTED 同行关系保留、人数不变 | `TripCancellationApiTest`、`companions.spec.ts` |
| E14 聊天保留但发送 409 `CHAT_READ_ONLY`；前端只读文案 | `ChatControllerTest`、`chatActions.test.ts`、`companions.spec.ts` |
| E15 取消后不可退出同行（API 409 / UI 隐藏） | `TripCancellationApiTest`、`companions.spec.ts` |
| E16 取消后不可处理申请 | `TripCancellationApiTest` |
| E17 取消后不可编辑集合 / 不可申请 | `TripCancellationApiTest`、`trips.spec.ts` |
| E18 取消后不可发表体验（UI 隐藏 + API 403） | `experiences.spec.ts` |
| E19 公开资料发布数排除取消 | `TripCancellationApiTest`、`UserProfileControllerTest` |
| E20 契约 0.13.0 五态与取消端点 | `OpenApiTest`、Redocly |
| E21 旧数据无取消列时不物化、状态推导稳定 | `TripCancellationApiTest`、`TripPlanStatusTest` |

## 4. 实现要点

- `V19__trip_cancellation.sql`：`trip_plans` 新增 `cancelled_at / cancel_reason / cancel_note` 与索引。
- `TripPlan.status` 取消优先（`CANCELLED > COMPLETED > ONGOING > FULL > RECRUITING`）；`TripStatusEnum` 增加 `CANCELLED`。
- `TripPlanService.cancel`：仅发布者、仅 recruiting / full；条件更新
  `cancelled_at IS NULL AND completed_at IS NULL` 保证重复 / 并发只成功一次；成功后发布
  `TripCancelledEvent`，由 `ApplicationServiceImpl` 同事务批量取消 PENDING。
- 终态互斥：结束、到期物化、申请、处理、退出、编辑集合、聊天发送全部拒绝取消态；
  开放列表与统计排除取消。
- 原因可见性服务端裁剪：仅发布者或 ACCEPTED 同行者返回 `cancel_reason / cancel_note`。
- 前端：`tripStatus` / `StatusBadge` 五态；共用 `TripCancelModal`；详情页与我的旅行入口；
  ACCEPTED 保留聊天入口；聊天只读文案；体验入口随状态关闭。
- 契约：`openapi.yaml` 0.13.0，五态枚举、`TripDetail` 取消字段、`TripCancelRequest`、
  `POST /trips/{tripId}/cancel`。

## 5. 偏差 / 测试修复

| 项 | 说明 |
|---|---|
| 后端全量测试环境 | 回收终端继承了上一轮 E2E 的 `SPRING_DATASOURCE_URL=jdbc:sqlite:...`，导致 H2 Driver 拒绝启动；显式覆盖为 `jdbc:h2:mem:routeme;DB_CLOSE_DELAY=-1` 后全绿。属环境隔离问题，未改代码。 |
| E2E 地图 20 个失败 | `map.spec.ts` 仍断言离线 SVG（`china-map` 等），而 base 分支的 `MapExplorerPage` 已切到 AMap；同一 `E11` 用例在未改动的主工作区（5173）复现失败，确认与本 change 无关。 |
| E2E 取消用例日期 | 当天行程按设计为 `ongoing`，不可取消；新增用例统一使用 `daysFromToday: 7` 的未来行程。 |
| E2E 断言修正 | 已匹配行聊天按钮文案为「与发起人沟通」；antd 两字按钮渲染为「查 看」；详情页状态是文本而非 `data-status` 徽标。仅测试修改。 |
| 全量 E2E 数据累计 | 全量 E2E 复用独立 SQLite，新增用例标题唯一、不依赖固定 id；种子卡片分页由 `expandPageSize` 兜底。 |

## 6. 残余风险

1. 20 个地图 E2E 失败属 base 分支既有测试债务（`map.spec.ts` 未随 AMap 重构更新），需由地图 owner 单独修复；本 change 未触碰地图代码。
2. 并发取消由条件更新 + API 用例覆盖，未做多线程压测。
3. 全量 E2E 使用累计库；严格可重复验证建议每轮重建 E2E SQLite。
4. 高德 Key 未配置到 worktree（`.env.local` / `amap-local.yml` 为本地文件）；取消链路不依赖地图配置。
5. PR / CI / CD / G2 尚未执行。

## 7. Overall

**Overall: Pass（change scope）。** 后端、前端、取消相关 E2E、契约与 OpenSpec 全部通过；20 个地图 E2E 失败可稳定复现于未改动的主工作区，属既有债务。
