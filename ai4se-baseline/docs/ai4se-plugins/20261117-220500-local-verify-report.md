# Local Verify Report: add-trip-weather（REQ-022 目的地天气与出行提醒）

**Date:** 2026-11-17 (timezone: +0800)
**Root:** D:/software/training/TATP/RouteMe/RouteME-weather/ai4se-baseline
**Change:** `add-trip-weather`
**Scope:** P4 implementation + local verification（未执行 PR / CI / G2 之外的远端步骤）

## 1. Environment

| 项 | 值 |
|---|---|
| JDK | 21（Maven Wrapper） |
| Node | ≥ 22 ｜ npm 11 |
| Backend | Spring Boot 4.1.2，隔离端口 **8092** |
| Frontend | Vite 8 + React 19，隔离端口 **5179**（`ROUTEME_API_TARGET=http://localhost:8092`） |
| E2E DB | `RouteME/SqlLite/routeme-e2e-weather.db`（独立于其它工作区） |
| 契约 | `openapi.yaml` **0.16.0** |
| 上游 | Open-Meteo 与 geocoding 均由测试替身 / `page.route` 模拟，不依赖外网 |

## 2. Commands & Results

| 层 | 命令 | 结果 |
|---|---|---|
| 后端单测 + API | `cd RouteME/backend; .\mvnw.cmd -B -o test` | **334 passed / 0 failed / 0 errors**（合并 `origin/main@64b38da` 后复验） |
| 新增后端用例 | `-Dtest=WeatherControllerTest,WeatherReminderRulesTest,WeatherTextUtilsTest` | 11 + 9 + 2 = **22 passed** |
| 契约测试 | `-Dtest=OpenApiTest` | **9 passed**（含天气路径、三个 schema、`WEATHER_UPSTREAM_ERROR`） |
| 前端构建 | `cd RouteME/frontend; npm run build` | **Pass**（tsc + vite；仅有既有 chunk-size 提示） |
| 前端单测 | `npm test` | **40 文件 / 313 项通过**（新增 `weather.test.ts` 15 项；合并 `main` 后含信用分与同行者卡片用例） |
| E2E 天气 | `cd RouteME/e2e; npx playwright test tests/weather.spec.ts` | **7/7 passed**（合并 `main` 后复跑仍 7/7） |
| E2E 走查 | `npx playwright test tests/weather-walkthrough.spec.ts` | **1/1 passed**；6 张截图写入 `ai4se-baseline/docs/preview/` |
| 契约 lint | `npx @redocly/cli lint openapi.yaml` | **0 error / 15 warning**（与基线同数） |
| OpenSpec | `openspec validate add-trip-weather --strict` | **valid** |

## 3. 覆盖的关键场景

| 场景 | 证据 |
|---|---|
| E1–E3 真实字段、UV 可用 / 缺失 | `WeatherControllerTest#in_coordinatesAndDate_out_returnsRealWeather`、`WeatherTextUtilsTest`、`weather.test.ts` |
| E4 上游失败不伪造天气 | `in_upstreamError_out_badGateway`、`in_noDataForRequestedDate_out_badGateway`、E2E 失败态 |
| E5–E6 坐标优先 / 区划解析 + 缓存 | `in_destinationCodeOnly_out_geocodesOnceAndCaches` |
| E7 坐标不可解析 | `in_unsupportedDestinationCode_out_badRequest`、`in_coordinatesOutOfRange_out_badRequest`、`in_halfCoordinatePair_out_badRequest` |
| E8 不使用途经点坐标 | 服务只接收目的地坐标（无途经点入参）；B 层断言 forecast 使用解析出的城市坐标 |
| E9–E15 提醒七类与顺序 | `WeatherReminderRulesTest` 9 项（上下界、加强提示、UV null、顺序、平稳） |
| E16 不可用时无提醒 | 越界用例断言 `reminders` 为空；失败用例断言无 `weather` |
| E17–E22 发布页五态与刷新 | `weather.spec.ts` 5 条（成功、改目的地、越界、失败重试、未就绪） |
| E23–E25 详情页 | `weather.spec.ts` 2 条（成功、失败隔离） |
| E26–E28 窗口越界与边界 | `in_dateBeforeToday_*`、`in_dateBeyondWindow_*`、`in_windowBoundaries_*` |
| V1 三档视口 × 双主题 | `weather-walkthrough.spec.ts` + `docs/preview/weather-create-*.png`（6 张） |

## 4. 实现要点

- **契约优先：** `openapi.yaml` 0.16.0 新增 `GET /weather/forecast` 与 `WeatherForecast` / `WeatherDaily` / `WeatherReminder`；错误沿用 `ErrorResponse`。
- **后端：** `WeatherServiceImpl` 先做参数与窗口校验（越界零上游调用），再确定坐标（请求坐标优先，否则 `DestinationLocator` 调 Open-Meteo geocoding 并按区划码缓存成功结果），最后请求 daily 并按日期对齐；温度必填，其余可空。
- **提醒：** `WeatherReminderRules` 是阈值与文案的唯一来源，顺序固定（rain → heat → uv → cold → temperature_gap → wind → calm），文案内嵌真实数值。
- **前端：** `useWeather` 用递增 token 丢弃晚到响应、依赖不完整不发请求、请求中清空旧结果；`WeatherCard` 渲染五态与探针；`weather.ts` 只有展示逻辑、不含阈值；文案集中在 `weather/messages.ts`。
- **挂载：** 发布页侧栏（预览卡之后、安全提示之前）与详情页信息区（页头之后）；两处共用同一组件。
- **无迁移：** 未新增数据库列；坐标读时解析 + 进程内缓存。

## 5. 偏差 / 测试修复

**合并 `origin/main@64b38da` 后复验（2026-11-17）：** 首次 rebase 在 `openapi.yaml` 与 `OpenApiTest` 的契约版本行冲突（main 为 0.14.0，本 change 取 0.16.0，保留本 change）；改为合并后再处理 `styles.css`（天气块与详情页同行者卡片块并存）与 `registry.md`（保留 REQ-020 与 REQ-022 两行），另修正 `docs/knowledge/interfaces/README.md` 自动合并拼行并补登记 `WEATHER_UPSTREAM_ERROR`。复验结果：后端 334、前端 313、天气 E2E + 走查 8/8。
| 项 | 说明 |
|---|---|
| 前端依赖 | 新 worktree 无 `node_modules`，先执行 `npm ci`（115 包）。属环境准备，未改代码。 |
| E2E 路由 | 首次用例把创建页写成 `#/create`，实际路由是 `#/trips/new`；修正测试后 7/7 通过。 |
| E2E 按钮定位 | antd 在两个汉字的按钮文案中插入空格（「发 布」），改为 `.form-actions .ant-btn-primary` 断言「仍可提交」。 |
| 走查脚本 | 首次使用 `__dirname`（ESM 下未定义），改为 `import.meta.dirname`。 |
| 契约示例 | `nullable: true` 必须与 `type` 同级（`allOf` 场景补 `type: object`）；示例去掉 `reason: null` / `weather: null` 后 Redocly 回到基线 15 warning。 |
| 端口 | 5178 已被并行会话占用，改用 5179。 |

## 6. 残余风险

1. **与在途 `add-ai-itinerary` 的天气代理重叠：** 合并时按 `design.md` §8 删除 AI 侧代理并改为复用本 change 服务（G2 C1）。
2. **geocoding 命中率：** 375 城市只验证了替身路径与广州 / 深圳 / 北京 / 上海 / 成都 / 佛山等常见城市码；自治州 / 地区名称可能不命中，此时明确 502 + 可重试，不猜坐标。
3. **真实上游走查（V2）：** 本次环境以替身验证；真实数值比对需外网，未执行。
4. **阈值：** 属产品口径常量，未经真实数据分布校准；调整需另开需求。
5. **PR / CI / CD：** 按用户要求直接合并 `main` 后推送，未走 PR 流程。
6. **缓存：** 进程内缓存无过期；城市坐标是静态事实，重启即清空。

## 7. Overall

**Overall: Pass（change scope）。** 后端 334、前端 313、天气 E2E 7/7、走查 6 图、契约 0 error、OpenSpec valid；无本 change 引入的失败。