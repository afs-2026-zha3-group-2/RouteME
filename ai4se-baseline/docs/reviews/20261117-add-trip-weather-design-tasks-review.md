# Design & tasks review — add-trip-weather

- **Verdict: Pass**（BLOCKER 0 / WARNING 1（落 P4 验证）/ SUGGESTION 3）
- **Scope：** `openspec/changes/add-trip-weather/design.md`、`atdd-design.md`、`tasks.md`
- **Inputs：** Delta Spec（6 / 28）、`proposal.md`、`dov-ac-review.md`、`g1-decision.md`（C1–C6）、`consistency-lint.md`（L-01 / L-02）、as-is 代码（`TripCreatePage`、`TripDetailPage`、`AmapProxyController`、`AmapConfig`、`OpenApiTest`、`application.yaml`）
- **Timestamp：** 2026-11-17T21:05+0800 ｜ **Reviewer：** AI agent（GitHub Copilot）

## 1. 结论

设计把 Delta 的 6 条 Requirement 落成「一个后端端点 + 一个共享组件」的最小切面：取数、定位、提醒、两页展示、窗口与状态都有明确落点与验证层。ATDD 覆盖 28/28 场景，任务按「契约 → 纯函数 Red → 配置 → 定位 → 服务 → 控制器 → 前端纯函数 → 组件 → 挂载 → E2E → 回归」切片，无静默扩张，阈值单点在后端。可进入 P4。

## 2. Findings

| id | Severity | Location | Issue | Suggested fix | Owner |
|---|---|---|---|---|---|
| W-01 | WARNING | `design.md` §4.2；`tasks.md` T4 | Open-Meteo geocoding 对少数自治州 / 地区名称可能不命中；设计只做「去后缀重试一次」 | P4 抽样 3–5 个非省会城市验证；不命中时保留 502 可重试，不猜坐标；在 P4 报告记录抽样结果 | Jay |
| S-01 | SUGGESTION | `design.md` §3 | `WeatherForecast.lng/lat` 在越界时为空，但契约未注明可空 | P4 契约里 `lng` / `lat` 不列为 `required`；示例保留可用态 | Jay |
| S-02 | SUGGESTION | `design.md` §5.1 | `idle` 与 `unavailable` 都以「无数据」呈现，若探针只按文本断言易混 | E2E 分别断言 `weather-idle` / `weather-out-of-range`，不以文案互替 | Jay |
| S-03 | SUGGESTION | `tasks.md` T8 | `styles.css` 新增样式未说明是否影响既有 `.publish-side` | 只新增 `.weather-*` 类，不改既有类；走查 390px | Jay |

## 3. 覆盖与对齐

| Requirement | Design | Tasks | ATDD | 判定 |
|---|---|---|---|---|
| 按目的地与日期获取真实天气 | §3、§4.3 | T1 / T5 / T6 | E1–E4 | 完整 |
| 目的地坐标解析与复用 | §4.2 | T3 / T4 / T5 | E5–E8 | 完整 |
| 基于真实天气的出行提醒 | §4.4 | T2 | E9–E16 | 完整 |
| 路线创建页的天气展示 | §5.1–§5.3 | T7–T9 | E17–E22 | 完整 |
| 行程详情页的天气展示 | §5.3 | T9 | E23–E25 | 完整 |
| 预报窗口与不可用状态 | §4.1、§4.5 | T5 / T6 | E26–E28 | 完整 |

- **G1 条件落实：** C1 → §8；C2 → §4.4 / §5.1；C3 → §3；C4 → §4.4「阈值只此一处」；C5 → §4.1 / §5.1；C6 → 留 P5。
- **lint 落实：** L-01 → §5.1 状态枚举；L-02 → §4.4 固定顺序；L-04 → §3 沿用 `ErrorResponse`。

## 4. 关键实现核对

- 窗口判定先于坐标解析与上游调用（越界零上游调用），用注入 `Clock` + `Asia/Shanghai`。
- 坐标缓存键 = 区划码，仅缓存成功；失败不缓存以允许重试。
- 温度必填、其余可空；UV 缺失不生成提醒、不展示行。
- 提醒顺序固定；文案内嵌真实数值；前端不复制阈值。
- 前端 `useWeather` 以递增 token 防竞态；依赖不完整不发请求。
- 契约 0.16.0 + `OpenApiTest` 同步；错误复用 `BusinessException` / `GlobalExceptionHandler`。
- 与 `add-ai-itinerary` 的合并顺序写成可执行步骤（§8）。

## 5. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `design.md` | 工件 1 | Jay（AO） | 2026-11-17 |
| `design.md` | 工件 2 | Neal（VL） | 2026-11-17 |
| `tasks.md` | 工件 1 | Jay（AO） | 2026-11-17 |
| `tasks.md` | 工件 2 | Neal（VL） | 2026-11-17 |
| 本报告 | 报告 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-17 |

批准来源：发起人 2026-11-17 指示「按名册默认记签署」。批准范围：`design.md`、`atdd-design.md`、`tasks.md` 与本报告。

## 6. Next

- W-01 抽样与 S-01 ~ S-03 落 P4；P3 质量检查通过后提交 P3，进入 P4（从 T1 契约 Red 开始）。