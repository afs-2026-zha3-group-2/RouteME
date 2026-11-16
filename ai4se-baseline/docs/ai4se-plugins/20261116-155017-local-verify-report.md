# Local Verify Report: add-trip-completion（REQ-011 / S15）

**Date:** 2026-11-16 (timezone: +0800)
**Root:** d:/Training/routeMe/RouteME
**Change:** `add-trip-completion`
**Scope:** P4 implementation + local verification（未提交 PR / CI）

## 1. Environment

| 项 | 值 |
|---|---|
| JDK | BellSoft Liberica 21.0.11 |
| Maven | 3.10.0（wrapper） |
| Node | v24.18.0 ｜ npm 11.x |
| Backend | Spring Boot 4.1.2，端口 8080 |
| Frontend | Vite 8 + React 19，端口 5173 |
| E2E DB | 独立 SQLite `SqlLite/e2e-final.db`（每轮全新库） |
| 契约 | `openapi.yaml` 0.9.0 |

## 2. Commands & Results

| 层 | 命令 | 结果 |
|---|---|---|
| 后端单测 / API | `cd RouteME/backend; .\mvnw -q test` | **230 passed / 0 failed / 0 errors**（36 个测试类） |
| 前端构建 | `cd RouteME/frontend; npm.cmd run build` | **Pass**（tsc + vite，1553 modules） |
| 前端单测 | `npm.cmd test -- --run` | **139 passed / 139**（16 个文件） |
| E2E | `node node_modules/@playwright/test/cli.js test`（54 个用例） | **54 passed / 54**（全新 SQLite，后端 8080 + 前端 5173） |
| 契约 | `npx.cmd @redocly/cli lint openapi.yaml` | **0 error / 15 warning**（均为既有示例/4xx 告警） |
| OpenSpec | `openspec validate add-trip-completion --strict` | **valid** |

## 3. 覆盖的关键场景

- 四态推导：recruiting / full / ongoing / completed；开始日期 00:00 进入旅行中；结束日期次日 00:00 自动完成。
- 结束权限：仅发布者 + 仅 ongoing；非发布者 403；招募中 / 满员 / 已结束均 409。
- 二次确认：E2E 覆盖取消后仍为旅行中、确认后转已结束。
- 结束善后：待处理申请自动取消（事件监听同事务）；已接受同行者保留；聊天只读；体验入口开放。
- 申请规则：ongoing 仍可申请；满员后接受 409、拒绝允许；结束后全部关闭。
- 列表 / 统计：旅行中继续展示；到期自动完成不进入默认列表；我的旅行已完成与公开资料统计口径一致。
- 页面停留过期：服务端先物化再拒绝申请 / 结束 / 发消息。
- 发布校验：开始日期早于今天拒绝；当天发布即旅行中。
- 契约：0.9.0、`ongoing`、`ending_soon`；`OpenApiTest` 通过。

## 4. 实现要点

- 业务日按 `Asia/Shanghai` 解释；时间戳仍 UTC。
- 懒写入物化：`TripPlanService.materializeIfExpired / materializeExpired / requireCurrent`；条件更新幂等。
- 事件解耦：`TripCompletedEvent` + `ApplicationServiceImpl` 同事务监听批量取消待处理申请。
- 无数据库迁移。
- 测试固定 Clock：`FixedClockTestConfig`（2026-11-16T09:00:00Z）；E2E 使用相对日期。

## 5. 偏差 / 测试修复

| 项 | 说明 |
|---|---|
| E2E 种子断言漂移 | `profiles.spec.ts` 的「上班族 · 互联网行业 · INFP」与关闭按钮严格匹配已过期；同步为 V13 种子实际值「产品经理 · INFP」并限定 footer 按钮。仅测试修改。 |
| E2E 数据累计 | 全量 E2E 需全新 SQLite；复用库会导致种子卡片被挤出第一页。验证使用 `e2e-final3.db`。 |
| Rebase 后复验 | 合并远程 11 个提交后重新执行：后端 230 / 前端 139 / E2E 54/54；`TripCard` 已改为展示周几，移除过时的「N 个途经点」断言，并补 `previewTrip.ending_soon`。 |
| 结束日期边界 | 业务日按 Asia/Shanghai；UTC 时间戳与本地日期混用已在 design D1 记录。 |

## 6. 残余风险

1. E2E 中少量种子日期（行程 5 = 11-23、行程 6 = 11-20）仍会随时间漂移，属既有测试债务；本 change 已将结束/申请路径改为相对日期。
2. 并发物化未做压测；条件更新幂等由 API 用例覆盖。
3. 提醒窗口 21:00 未做 E2E（时钟不可控），由纯函数 + API 字段覆盖。
4. PR / CI / CD / G2 尚未执行。

## 7. Overall

**Overall: Pass（change scope）。** 后端、前端、E2E、契约与 OpenSpec 全部通过；无阻断缺口。
