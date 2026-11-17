# ATDD 设计：add-trip-weather

- **Change：** `add-trip-weather`（`trip-weather` ADDED，REQ-022）
- **输入：** Delta Spec（6 Requirement / 28 Scenario）、`design.md`
- **分层：** 后端纯函数（U）/ 后端接口与契约（B）/ 前端纯函数（F）/ E2E（M）/ 人工走查（V）

## 1. 场景 → 层 映射

| # | 场景 | 层 | 验收点 |
|---|---|---|---|
| E1 | 查询当日天气 | B / M | 字段齐全、数值与替身一致、`source=open-meteo` |
| E2 | UV 可用时返回 | B / M | `uv_index` 有值且页面展示 UV 行 |
| E3 | UV 不可用时置空 | B / F / M | `uv_index=null`；页面无 UV 行、无 UV 提醒 |
| E4 | 上游失败不伪造天气 | B / M | 502 `WEATHER_UPSTREAM_ERROR`；响应无天气字段；页面只有失败态 |
| E5 | 携带坐标时直接使用 | B | 替身只收到 forecast 请求，未收到 geocoding 请求 |
| E6 | 未携带坐标时按区划解析 | B | geocoding 命中后请求 forecast；同城市第二次不再 geocoding |
| E7 | 坐标不可解析 | B / M | 非法区划码 400；geocoding 无结果 502；发布页仍可提交 |
| E8 | 不使用途经点坐标代替目的地 | B | forecast 请求的 latitude/longitude 等于城市坐标，不等于任何途经点 |
| E9 | 降雨提醒与户外提示 | U / B | 60% + 2 mm → 含「带伞」；不含「暴雨」 |
| E10 | 高降雨风险加强提示 | U | 90% 或 12 mm → 含「注意户外行程」 |
| E11 | 高温与紫外线提醒 | U | 33°C + UV 8 → 含补水与防晒措施 |
| E12 | 紫外线缺失不产生防晒指数提醒 | U | UV null + 26°C → 无 `uv` 提醒 |
| E13 | 低温与昼夜温差提醒 | U | 8°C → `cold`；22/10°C → `temperature_gap` |
| E14 | 强风提醒 | U | 35 km/h → `wind` |
| E15 | 天气平稳提示 | U | 全阈值未命中 → 仅 `calm` |
| E16 | 天气不可用时无提醒 | B / M | 越界与失败两种状态 `reminders` 均为空 |
| E17 | 选择目的地与日期后展示天气 | M / V | 侧栏出现 `weather-card` 与日期标签 |
| E18 | 修改目的地后刷新 | M | 旧城市数据消失，新城市数据出现 |
| E19 | 修改日期后刷新 | M | 日期标签与数据同步更新；旧响应不覆盖 |
| E20 | 未选择完整时显示未就绪 | M | `weather-idle` 出现且无数值 |
| E21 | 加载中显示加载状态 | M | `weather-loading` 出现且无旧数据 |
| E22 | 失败可重试且不阻断发布 | M | `weather-error` + `weather-retry`；点击后恢复到 `weather-ready`；提交按钮可用 |
| E23 | 打开详情页展示天气 | M / V | 详情页出现卡片，无输入控件 |
| E24 | 详情页天气失败不影响行程 | M | 标题 / 状态 / 路线照常；卡片失败态 |
| E25 | 详情页天气超出窗口 | M | 显示「暂无该日期天气预报」 |
| E26 | 日期超出窗口 | B / M | 200 + `available:false` + `OUT_OF_RANGE`，无数值 |
| E27 | 日期早于今天 | B | 同为不可用 |
| E28 | 窗口边界 | B | 今天与今天 + 15 天均可请求上游并返回可用 |

## 2. 单元用例（后端 U1–U7）

| id | 对象 | 用例 |
|---|---|---|
| U1 | `WeatherTextUtils` | 0/1/2/3/45/61/80/95/99 → 对应中文；未知码（如 42）→ 未知文案；`null` → 未知文案 |
| U2 | `WeatherReminderRules` | 降雨下界（50% / 1 mm）命中；49% 且 0.9 mm 不命中 |
| U3 | 同上 | 高热（30 / 33°C）边界；29.9°C 不命中 |
| U4 | 同上 | UV 6 命中、5.9 不命中、null 不命中 |
| U5 | 同上 | 低温 10 / 9°C；温差 10 / 9.9°C |
| U6 | 同上 | 风速 30 / 29.9 km/h |
| U7 | 同上 | 多类同命中时顺序 = rain → heat → uv → cold → gap → wind；全未命中 → 仅 `calm`；文案内嵌真实数值 |

## 3. 接口用例（后端 B1–B8）

| id | 用例 |
|---|---|
| B1 | 坐标 + 日期 → 200，字段与替身一致，`source=open-meteo` |
| B2 | 仅区划码 → geocoding 替身被调用一次，forecast 使用解析出的坐标 |
| B3 | 同一区划码连续两次 → geocoding 只调用一次（缓存） |
| B4 | 日期 = 今天 − 1 / 今天 + 16 → 200 `available=false` `OUT_OF_RANGE`，上游零调用 |
| B5 | 日期 = 今天、今天 + 15 → 200 `available=true` |
| B6 | 上游 500 / 非 JSON / 无当日数据 → 502 `WEATHER_UPSTREAM_ERROR`，响应不含天气字段 |
| B7 | 缺 `date` → 400；只给 `lng` 不给 `lat` → 400；非法区划码且无坐标 → 400；坐标越界 → 400 |
| B8 | `OpenApiTest`：版本 0.16.0、路径存在、`WeatherForecast.required` 含 `date` / `available` / `source`、502 已声明 |

## 4. 前端纯函数（F1–F4）

| id | 对象 | 用例 |
|---|---|---|
| F1 | `weather.ts#toCardState` | 五个状态：缺参 / loading / ready / unavailable / error 映射正确 |
| F2 | `weather.ts#temperatureLabel` | `24 / 17` → `17–24°C`；小数四舍五入规则固定 |
| F3 | `weather.ts#dateLabel` | ISO 日期 → 「11 月 21 日（首日）」 |
| F4 | `weather.ts#reminderTone` | `rain/heat/uv/cold/temperature_gap/wind/calm` → tone；未知码 → 默认 tone（不崩） |

## 5. E2E 用例（M1–M7）

以 `page.route('**/api/weather/forecast**')` 注入固定响应，不依赖真实上游。

| id | 场景 | 步骤 |
|---|---|---|
| M1 | 发布页展示天气与提醒 | 选目的地 + 日期 → 断言 `weather-ready`、温度区间、至少一条 `weather-reminder` |
| M2 | 修改目的地刷新 | 广州 → 北京，断言旧城市文案消失、新数据出现 |
| M3 | 越界提示 | 注入 `available:false` → 断言 `weather-out-of-range` 文案「暂无该日期天气预报」且无温度 |
| M4 | 失败与重试 | 第一次 502 → `weather-error`；点重试 → `weather-ready`；提交按钮始终可用 |
| M5 | 未就绪 | 未选目的地 → `weather-idle` |
| M6 | 详情页展示 | 打开种子行程详情 → `weather-card` 出现且无日期输入 |
| M7 | 详情页失败隔离 | 详情页注入 502 → 卡片失败，标题与路线仍可见 |

## 6. 人工走查（V1–V4）

| id | 内容 |
|---|---|
| V1 | 1440 / 768 / 390 × 浅 / 深色：卡片不溢出、提醒不重叠 |
| V2 | 发布页真实上游走查（有外网时）：广州未来 3 天各查一次，数值与 Open-Meteo 官网一致 |
| V3 | 失败态可读性：断网后重试提示清晰，表单可继续填写并提交 |
| V4 | 详情页与发布页同一目的地同一天 → 天气与提醒一致 |

## 7. 不纳入自动化

- 真实 Open-Meteo / geocoding 网络可用性（CI 不依赖外网）。
- geocoding 对全部 375 城市的命中率（抽样走查，残余风险已记录）。
- 城市中心坐标的微气候精度（设计已声明限制）。