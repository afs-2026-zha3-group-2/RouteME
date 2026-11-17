# G2 decision — add-trip-weather

- **Gate:** G2（Apply & verify）
- **Change:** `add-trip-weather`（`trip-weather` ADDED，REQ-022）
- **Timestamp:** 2026-11-17T22:10+0800
- **Recorded by:** Jay（AO）；验证结论由 AI agent 起草，批准由具名人员按矩阵签署

## Inputs

| Artifact | Path | Result |
|---|---|---|
| 实现范围 | `RouteME/backend`（`WeatherController` / `WeatherService` / `WeatherServiceImpl` / `DestinationLocator` / `WeatherReminderRules` / `WeatherTextUtils` / `WeatherProperties` / `WeatherConfig` / `WeatherUpstreamException` / `WeatherForecast` / `WeatherDaily` / `WeatherReminder` / `WeatherLocation` / `WeatherQuery`）、`RouteME/frontend`（`weather/*`、`api.ts`、`types.ts`、`TripCreatePage`、`TripDetailPage`、`styles.css`）、`openapi.yaml` 0.16.0 | 完成 T1–T11 |
| 后端测试 | `WeatherControllerTest`（11）、`WeatherReminderRulesTest`（9）、`WeatherTextUtilsTest`（2）、`OpenApiTest`（9，含天气契约） | 全绿 |
| 后端全量 | `.\mvnw.cmd -B -o test` | 334 passed / 0 failed |
| 前端构建 | `npm run build` | tsc + vite 通过 |
| 前端单测 | `npm test` | 39 文件 / 307 项通过 |
| E2E（天气） | `npx playwright test tests/weather.spec.ts` | 7/7 通过 |
| E2E（走查） | `npx playwright test tests/weather-walkthrough.spec.ts` | 1/1 通过；1440 / 768 / 390 × 浅 / 深 6 张截图写入 `docs/preview/` |
| 契约 lint | `npx @redocly/cli lint openapi.yaml` | 0 error / 15 warning（与基线同数） |
| OpenSpec | `openspec validate add-trip-weather --strict` | valid |
| 本地验证报告 | `docs/ai4se-plugins/20261117-220500-local-verify-report.md` | Overall Pass（change scope） |
| P4 质量报告 | `docs/ai4se-plugins/20261117-220800-quality-checklist-report.md` | P4-1 / P4-2 / P4-6 Pass；P4-3 / P4-4 / P4-5 条件项未到达 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| 验收覆盖 | 28/28 场景有对应实现与验证层 | `atdd-design.md` §1、本地验证报告 §3 |
| 数据真实性 | 天气数值只来自 Open-Meteo；失败与越界均不返回数值 | `WeatherServiceImpl`、B4 / B6、E2E 越界与失败用例 |
| 提醒规则 | 阈值单点在 `WeatherReminderRules`；前端不判断阈值 | U1–U7、`weather.ts` 无阈值常量 |
| 坐标口径 | 请求坐标优先，否则区划码 → geocoding + 缓存；不用途经点坐标 | B1–B3、B7 |
| 状态与失败隔离 | 五态齐备；加载不显示旧数据；失败可重试且不阻断发布 | E2E M1–M5 |
| 两页一致 | 发布页与详情页共用 `WeatherCard` 与同一端点 | E2E M1 / M6 |
| 契约 | 0.16.0；新路径 + 3 schema；错误码复用 `ErrorResponse` | `OpenApiTest`、Redocly |
| 无迁移 | 未新增列；坐标读时解析 | `git diff` 无 `db/migration` 变更 |

## Decision

**Pass（change scope）**

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | 与在途 `add-ai-itinerary` 合并时按 design §8 删除 AI 侧天气代理，改为复用本 change 服务 | Jay | 合并 / PR 评审 |
| C2 | geocoding 对非省会城市（自治州 / 地区）命中率只做了替身验证；真实网络抽样结果记录在残余风险，不作为阻断项 | Jay | P5 / 后续需求 |
| C3 | 真实上游走查（V2）需要外网，本次未执行；CI 一律使用替身与 `page.route` | Jay | 下次有网环境 |
| C4 | 阈值（50% / 80% / 1 mm / 10 mm / 30°C / UV 6 / 10°C / 10°C / 30 km/h）属产品口径，调整需另开需求 | Jay / WAYNE | 后续 |
| C5 | PR / 远端 CI / CD 尚未执行；按用户要求直接合并 `main` 并推送，合并后核对 CI 结果 | Jay | 合并后 |

## Approvers

| 角色 | 姓名 | 状态 |
|---|---|---|
| VL | Neal | 已签（2026-11-17） |
| 当前开发者 | Jay（AO） | 已提交（2026-11-17） |
| IO | WAYNE | 知会（G2 矩阵为 VL + 开发者） |

签署来源：发起人 2026-11-17 指示「按名册默认记签署」；G2 按 `docs/sdd/README.md` 由 VL（Neal）独立签署，开发者（Jay）提交证据。

## Next

- 用户要求不做 P5：不归档、不合并 living spec；合并 `main` 后按需在后续 change 归档。
- C1 在合并 `add-ai-itinerary` 时必须复核。