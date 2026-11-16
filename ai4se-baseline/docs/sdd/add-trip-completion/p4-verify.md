# P4 实现与验证记录 — add-trip-completion

- **Change：** `add-trip-completion`（REQ-011 / S15）｜ **阶段：** P4（Apply & verify）
- **日期：** 2026-11-16 ｜ **基线：** `main@994adc4`
- **本地验证报告：** [`docs/ai4se-plugins/20261116-155017-local-verify-report.md`](../../docs/ai4se-plugins/20261116-155017-local-verify-report.md)
- **P4 质量报告：** [`docs/ai4se-plugins/20261116-155017-quality-checklist-report.md`](../../docs/ai4se-plugins/20261116-155017-quality-checklist-report.md)

## 1. 实现摘要

| 层 | 变更 |
|---|---|
| 领域 | `TripStatusEnum` 增加 `ONGOING`；`TripPlan` 增加 `plannedStart/plannedEnd/status(now)/endingSoon(now)`；新增 `TripTimeZoneConstant`（Asia/Shanghai）；发布校验禁止过去日期 |
| 服务 | `TripPlanServiceImpl` 增加 `materializeIfExpired/materializeExpired/requireCurrent`；结束仅 ONGOING；`ApplicationServiceImpl` 申请/接受/拒绝资格 + 同事务监听 `TripCompletedEvent` 批量取消；`MyTrips/UserProfileStats` 按 `status(now)` 统计 |
| 查询 | `TripPlanMapper.xml` 未结束过滤加 `end_date >= today`；新增 `selectExpiredIds` / `completeIfAbsent` |
| 契约 | `openapi.yaml` 0.9.0；`status` 加 `ongoing`；`TripSummary/TripDetail` 加 `ending_soon`；complete 描述收紧 |
| 前端 | `TripStatus` 加 `ongoing`；「旅行中」徽标；详情页「结束行程」+ 二次确认 + 提醒 + 失败刷新；我的旅行结束入口；申请页满员/结束只读；聊天文案 |
| 测试 | 固定 Clock 配置；`TripPlanStatusTest`、`TripCompletionApiTest`；既有 controller/service 测试同步；E2E 相对日期 |

## 2. 验证结果

| 项 | 结果 |
|---|---|
| 后端 | 230 passed / 0 failed |
| 前端构建 | Pass |
| 前端单测 | 139 passed |
| E2E | 54 passed（全新 SQLite） |
| Redocly | 0 error / 15 warning（既有告警） |
| OpenSpec | valid |

## 3. 偏差

1. 业务日按 `Asia/Shanghai`，时间戳仍 UTC（design D1）。
2. 自动完成采用懒写入 + 条件更新，无定时任务（用户裁决 D10）。
3. 批量取消通过同事务事件监听，避免 `trip-plans` 反向依赖 `trip-companions`（design D4）。
4. E2E 修复两处过期断言（`profiles.spec.ts` 头条与关闭按钮），仅测试修改。
5. 全量 E2E 需全新 SQLite；复用库会导致种子卡片被挤出第一页。

## 4. 残余风险

- 少量种子日期（行程 5 / 6）仍随时间漂移。
- 并发物化未压测。
- 提醒窗口 21:00 未做 E2E，由纯函数 + API 字段覆盖。
- PR / CI / CD / G2 未执行。

## 5. 下一步

`/sdd:pr-submit` → `phase=ci` → VL 签署 G2；P5 归档需先确认与 `add-match-reason` 的 `trip-companions` 顺序。
