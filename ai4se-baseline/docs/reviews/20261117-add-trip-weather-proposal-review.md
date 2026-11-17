# Proposal review — add-trip-weather

- **Verdict: Pass**（BLOCKER 0 / WARNING 1 / SUGGESTION 3）
- **Scope：** `openspec/changes/add-trip-weather/proposal.md`、`specs/trip-weather/spec.md`（P1 草稿）
- **Inputs：** REQ-022（intent / requirements）、`docs/sdd/add-trip-weather/p0-baseline.md`（G-01 ~ G-08）、`requirement-workspace/deep-dive.md`「REQ-022 增补」、`impact-brief.md` §22、as-is 代码（`TripCreatePage` / `TripDetailPage` / `TripPlan` / `openapi.yaml` 0.13.0 / `area-codes.json`）、Open-Meteo `v1/forecast` 官方参数
- **Timestamp：** 2026-11-17T20:10+0800
- **Reviewer：** AI agent（GitHub Copilot）；批准由具名人员按签署矩阵完成

## 1. 结论

提案把范围收敛在「目的地 + 日期 → 真实天气 → 基础出行提醒」一条垂直切片内，14 条用户验收标准逐条有承接；能力归属、后端权威、坐标口径、窗口口径、提醒阈值与失败隔离都有明确决策。In / Out scope 边界清楚：AI 生成路线、AI 选景点、天气参与推荐提示词全部显式排除。**无阻塞缺口**，可进入 P2。

## 2. Findings

| id | Severity | Location | Issue | Suggested fix | Owner |
|---|---|---|---|---|---|
| W-01 | WARNING | `proposal.md` §残余风险 1；`specs/trip-weather/spec.md` | 与在途 `add-ai-itinerary`（未提交的 `WeatherService` / `WeatherController` / `WeatherForecast`）存在同名能力重叠；两者合并时若各自保留会产出两个天气代理 | P3 `design.md` 明确「路径 / 类名以本 change 为准 + AI 侧改复用」的合并顺序；P4 在 PR 描述中核对 | Jay |
| S-01 | SUGGESTION | `specs/trip-weather/spec.md`「按目的地与日期获取真实天气」 | 未写明响应必须包含数据来源标注，前端 header 与 AI 侧的 `source` 口径可能分叉 | P2 在 Requirement 文本或 Scenario 中补 `source` 固定值 | Jay |
| S-02 | SUGGESTION | `specs/trip-weather/spec.md`「预报窗口与不可用状态」 | 「今天」的时区未显式声明，跨时区或跨日边界可能出现「昨天可选、今天不可选」 | P2 明确以 `Asia/Shanghai` 判定今天（与行程日期口径一致） | Jay |
| S-03 | SUGGESTION | `requirement-workspace/requirements/REQ-022-trip-weather.md` §4 S22-16 | 「加载中」只写「展示加载状态」，未约束「不得同时展示上一次结果」 | P2 场景补「新请求进行中不展示旧目的地数据」，与前端防竞态一致 | Jay |

## 3. 检查项

| 检查 | 结论 | 证据 |
|---|---|---|
| In scope / Out of scope 明确 | Pass | `proposal.md` §范围；14 条 AC 全部在 In scope |
| 能力归属与命名 | Pass | `trip-weather`（ADDED），与 `trip-plans` / `ai-itinerary` 边界清楚 |
| 技术边界（谁提供什么） | Pass | Open-Meteo 只供数据；RouteMe 只做归一与固定规则；高德管地图真相；AI 不参与 |
| 不伪造数据的约束 | Pass | 「上游失败时 MUST NOT 返回任何数值与提醒」「越界不得用当前天气替代」两条硬约束 |
| 可验收性 | Pass | 阈值（50% / 80% / 1 mm / 10 mm / 30°C / 6 / 10°C / 10°C / 30 km/h）全部可判定 |
| 契约影响 | Pass | 新增路径与 3 个 schema；0.16.0 顺延，附在途占用说明 |
| 数据影响 | Pass | 明确「无迁移」，并论证坐标读时解析的理由 |
| 失败隔离 | Pass | 天气失败不阻断发布 / 浏览，且可重试 |
| 号段与并行 change | Pass with W-01 | 契约 / 迁移号段已核对；天气代理重叠待 P3 / P4 收口 |

## 4. 覆盖映射（用户故事 14 条 AC → Delta）

| AC | Delta Requirement / Scenario |
|---|---|
| 接入 Open-Meteo，按经纬度与日期查询 | 按目的地与日期获取真实天气 / 查询当日天气 |
| 优先复用高德选点结果，不重复输入城市 | 目的地坐标解析与复用 / 携带坐标直接使用、未携带按区划解析 |
| 至少展示状态、最高温、最低温、降雨概率、降水、风速 | 按目的地与日期获取真实天气 / 查询当日天气 |
| UV 可用时展示 | UV 可用时返回、UV 不可用时置空 |
| 修改目的地或日期后同步刷新 | 路线创建页 / 修改目的地后刷新、修改日期后刷新 |
| 基于真实数据给简单提醒而非图标 | 基于真实天气的出行提醒 / 全部 7 条 |
| 降雨风险提醒雨具并提示户外 | 降雨提醒与户外提示、高降雨风险加强提示 |
| 高温或高 UV 提醒防晒补水 | 高温与紫外线提醒 |
| 低温或温差提醒外套 | 低温与昼夜温差提醒 |
| 强风提醒 | 强风提醒 |
| 提醒必须来自真实数据，不伪造 | 天气不可用时无提醒、上游失败不伪造天气 |
| 超出范围提示「暂无该日期天气预报」 | 预报窗口与不可用状态 / 日期超出窗口、日期早于今天 |
| Loading 状态 | 路线创建页 / 加载中显示加载状态 |
| 失败明确提示 + 重试且不阻断编辑 | 失败可重试且不阻断发布、详情页天气失败不影响行程 |

## 5. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `proposal.md` | 工件 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-17 |

批准来源：按 `docs/sdd/README.md` 签署人矩阵与发起人 2026-11-17 指示「按名册默认记签署（WAYNE + 当前开发者）」；当前开发者 = Jay。批准范围：`proposal.md`、`specs/trip-weather/spec.md` P1 草稿与本评审报告。

## 6. Next

- W-01 与 S-01 ~ S-03 落 P2 / P3；P2 完成后写 `dov-ac-review.md`、`consistency-lint.md` 与 `g1-decision.md`。