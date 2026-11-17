# REQ-022 — 目的地天气与出行提醒（Ready 需求草稿）

- **能力：** `trip-weather`（ADDED）
- **对应 OpenSpec change：** `add-trip-weather`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** 发起人 2026-11-17 用户故事（优先级 P1 / 迭代 2 / 故事点 3 / 落点页面：路线创建页、行程详情页）
- **证据：** `requirement-workspace/intents/REQ-022-trip-weather.md`；`docs/sdd/add-trip-weather/p0-baseline.md`；`RouteME/frontend/src/trips/TripCreatePage.tsx`、`trips/TripDetailPage.tsx`；`RouteME/backend/.../pojo/TripPlan.java`、`response/TripDetailResponse.java`；`RouteME/backend/src/main/resources/area/area-codes.json`；`RouteME/openapi.yaml` 0.13.0；Open-Meteo `v1/forecast` 官方参数说明

## Discovery Decision

**Go（light intake，2026-11-17）。** 理由：候选能力可一句话表述——「给一个目的地与一个旅行日期，展示 Open-Meteo 的真实天气，并据此给出固定规则的出行提醒」；用户故事 14 条验收标准全部落在这一句话内；与 `add-ai-itinerary`（AI 推荐）、`trip-plans`（发布 / 详情）边界清晰；无阻塞项。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-022 |
| statement | 用户在路线创建页或行程详情页选择目的地与旅行日期后，系统 MUST 用目的地坐标与日期调用 Open-Meteo，展示真实的天气状态、最高温、最低温、降雨概率、降水量与风速（UV 可用时一并展示），并由后端基于这些真实字段生成基础出行提醒（降雨 → 雨具与户外提示；高温 / 高 UV → 防晒、帽子、补水；低温 / 温差 → 外套；强风 → 注意事项）；目的地坐标优先复用调用方已有的高德选点坐标，否则按区划解析，不要求用户再次输入城市；用户修改目的地或日期后天气 MUST 刷新；超出可查询预报范围时 MUST 明确提示「暂无该日期天气预报」且不得用当前天气代替；请求进行中 MUST 展示加载状态，失败时 MUST 展示可读提示与重试入口且不得阻断用户继续编辑路线。 |
| actors | 规划旅行的用户（发布者 / 浏览者 / 同行者）；系统（坐标解析、天气获取与归一、提醒推导）；Open-Meteo（天气数据源）。 |
| rationale | 天气是出行决策的关键输入，但现行页面完全没有；用户要另开天气 App 手工搬运，且 AI 推荐页的天气覆盖不到发布与详情。 |
| acceptance hints | 见 §4 场景 S22-1 ~ S22-16（字段完整性、坐标口径、刷新、提醒四类、UV 缺省、窗口越界、Loading / Error / Retry、失败隔离、不伪造数据）。 |
| links to evidence | 见上方证据路径与 P0 缺口 G-01 ~ G-08。 |

## 1. Intent

一句话：选好目的地和日期，就能在发布页和详情页直接看到那天当地的真实天气，以及「带伞 / 防晒 / 加外套 / 注意强风」这类具体提醒；看不到就明说看不到，绝不编造。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 发布者（路线创建页） | 选目的地与日期后看到天气与提醒；可重试；天气失败不阻断发布。 |
| 浏览者 / 同行者（行程详情页） | 打开已发布行程即看到该行程目的地与首日天气；无需输入任何城市或日期。 |
| 系统 | 解析目的地坐标（优先复用已有坐标）、调用 Open-Meteo、归一字段、按固定阈值生成提醒；失败时只报错不补数据。 |
| Open-Meteo | 唯一天气数据源；不参与提醒文案生成。 |

## 3. In / Out scope

**In scope**

- 后端天气代理 `GET /api/weather/forecast`：目的地（区划码 / 坐标）+ 日期 → 归一化天气。
- 字段：天气状态（WMO 文案）、最高温、最低温、降雨概率、降水量、风速、UV（可用时）。
- 目的地坐标解析：区划码 → 城市中心坐标（进程内缓存）；请求携带 `lng` / `lat` 时优先。
- 基础出行提醒：降雨、高温 / 高 UV、低温 / 昼夜温差、强风四类 + 平稳态；由后端基于真实字段推导。
- 展示：路线创建页侧栏 + 行程详情页信息区。
- 状态：加载中、成功、越界（暂无该日期天气预报）、失败（可读提示 + 重试）。
- 刷新：目的地或日期变化后重新请求；页面重新可见时按需刷新（详情页）。
- 契约：新增路径与 schema，`openapi.yaml` 次版本递增。

**Out of scope**

- AI 生成 / 调整路线、AI 选择景点、天气参与 AI 推荐提示词（属 `add-ai-itinerary`）。
- 多日逐天 / 逐小时 / 历史天气 / 空气质量 / 台风路径。
- 天气预警推送与站外通知。
- 天气数据落库、历史归档或跨行程聚合分析。
- 改变目的地选择方式（不新增「地图选目的地」）。
- 天气影响搜索排序、匹配算法或行程状态。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 天气数据

1. **S22-1 按目的地与日期取真实天气** — Given 用户已选择目的地与旅行日期（今天 ~ 今天+15 天内），When 页面请求天气，Then 系统 SHALL 以该目的地坐标与日期调用 Open-Meteo，并展示天气状态、最高温、最低温、降雨概率、降水量与风速。
2. **S22-2 天气字段完整且单位明确** — Given 上游返回当日 daily 数据，Then 展示 SHALL 包含天气状态文案、`最高温 / 最低温 °C`、`降雨概率 %`、`降水量 mm`、`风速 km/h`；数值 MUST 与上游一致，不做估算。
3. **S22-3 UV 可用时展示** — Given 上游返回当日 `uv_index_max`，Then 展示 SHALL 包含 UV 指数；Given 上游未返回该字段，Then 展示 MUST NOT 出现 UV 行，且 MUST NOT 以 0 代替。
4. **S22-4 不伪造天气** — Given 上游失败、超时或没有当日数据，Then 系统 MUST NOT 展示任何天气数值或提醒，只展示失败状态。

### B. 目的地坐标

5. **S22-5 不要求重复输入城市** — Given 用户已在发布页选择目的地（省市级联）或正在查看已发布行程，When 请求天气，Then 系统 MUST NOT 要求用户再次输入城市名、区划码或坐标。
6. **S22-6 优先复用已有坐标** — Given 调用方已持有目的地坐标（高德选点结果），When 请求天气，Then 系统 SHALL 使用该坐标而不重新解析；Given 未提供坐标，Then 系统 SHALL 按目的地区划解析城市中心坐标。
7. **S22-7 坐标解析失败不影响编辑** — Given 目的地坐标解析失败，When 用户在发布页操作，Then 天气区 SHALL 展示失败提示与重试，表单其余部分 MUST 保持可用，提交 MUST NOT 被阻断。

### C. 出行提醒

8. **S22-8 提醒必须来自真实数据** — Given 当日天气已成功获取，Then 每条提醒 SHALL 能对应到具体天气字段与阈值；Given 天气缺失，Then MUST NOT 生成任何提醒。
9. **S22-9 降雨提醒** — Given 降雨概率 ≥ 50% 或降水量 ≥ 1 mm，Then 提醒 SHALL 包含携带雨伞 / 雨具；Given 降雨概率 ≥ 80% 或降水量 ≥ 10 mm，Then 提醒 SHALL additionally 提示注意户外行程安排。
10. **S22-10 高温与 UV 提醒** — Given 最高温 ≥ 30°C，Then 提醒 SHALL 包含防晒与及时补水；Given UV 指数 ≥ 6，Then 提醒 SHALL 包含防晒霜 / 帽子等防晒措施；Given UV 缺失，Then MUST NOT 生成 UV 提醒。
11. **S22-11 低温与温差提醒** — Given 最低温 ≤ 10°C，Then 提醒 SHALL 包含携带外套；Given 最高温与最低温差 ≥ 10°C，Then 提醒 SHALL 提示早晚加外套。
12. **S22-12 强风提醒** — Given 风速 ≥ 30 km/h，Then 提醒 SHALL 包含防风 / 户外注意安全。
13. **S22-13 天气平稳** — Given 当日无任何上述阈值命中，Then 系统 SHALL 展示「天气平稳」类提示，且 MUST NOT 编造未命中的风险。

### D. 展示与状态

14. **S22-14 两处页面可见** — Given 用户处于路线创建页或行程详情页，Then 两处 SHALL 都能看到天气与提醒；详情页 MUST NOT 要求用户输入日期（使用行程首日）。
15. **S22-15 修改后刷新** — Given 用户修改目的地或旅行日期，Then 天气 SHALL 重新请求并更新；旧请求的晚到响应 MUST NOT 覆盖新请求结果；Given 用户清空目的地或日期，Then 天气区 SHALL 回到未就绪状态且不显示旧数据。
16. **S22-16 加载、越界与失败** — Given 请求进行中，Then SHALL 展示加载状态；Given 日期超出预报窗口（今天 ~ 今天+15），Then SHALL 明确提示「暂无该日期天气预报」，且 MUST NOT 用当前天气代替；Given 请求失败，Then SHALL 展示可读失败提示与重试入口，重试后 SHALL 重新请求。

## 5. Constraints（仅事实，不含技术方案）

- 行程数据只有 `destination_code`（6 位区划码）与 `destination` 名称，没有经纬度；目的地选择是省市级联，不是地图选点。
- 支持 375 个城市；不能靠手工维护静态坐标表。
- 途经点与集合点的选点坐标属于具体地点，不能当作目的地坐标使用（会与行程目的地错位）。
- Open-Meteo 免 Key；daily 变量请求必须带 `timezone`；`forecast_days` 上限 16，即今天起最多 16 天（含今天）。
- `uv_index_max` 属 daily 变量，上游可能不返回。
- 上游错误返回 HTTP 400 + `{"error":true,"reason":…}`。
- 天气是辅助信息，不得阻断发布、浏览、编辑或同行流程。
- 既有契约 0.13.0；0.14.0 / 0.15.0 与 V20 / V21 已被在途 change 预约。

## 6. Open Questions（全部 resolved）

| id | 问题 | 结论 |
|---|---|---|
| OQ-1 | 天气后端归本 change 还是复用 `add-ai-itinerary`？ | 归本 change（D1，用户裁决）；AI 推荐后续复用 |
| OQ-2 | 目的地坐标从哪来？ | 区划码 → 城市中心坐标 + 接口保留 `lng` / `lat` 覆盖（D2）；不新增列 |
| OQ-3 | 多日行程展示哪一天？ | 展示旅行首日，并显式标注日期；多日逐天不做 |
| OQ-4 | 提醒由前端算还是后端算？ | 后端算，保证两处页面口径一致且可单测 |
| OQ-5 | 越界用 4xx 还是 200 + 不可用状态？ | 200 + `available:false`，越界是正常业务状态而非调用错误 |

## 7. DoR

| 检查 | 结论 |
|---|---|
| 用户故事与验收标准可追溯 | Pass（14 条 AC → S22-1 ~ S22-16） |
| 能力归属与边界清晰 | Pass（`trip-weather` ADDED；AI 推荐排除） |
| 无阻塞未决问题 | Pass（OQ 0） |
| 依赖与风险已记录 | Pass（坐标解析、窗口限制、上游失败、契约号段） |
| 验收可观察 | Pass（数值、文案、状态、刷新、越界与重试均可判定） |

**DoR BLOCKER：0。**