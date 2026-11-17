# ATDD 设计 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（REQ-017 / AI 智能行程推荐）
- **输入：** Delta Spec 41 条场景（ai-itinerary 36 + trip-plans 5）、`design.md` §2–§5、dov 裁决 1–8、`g1-decision.md` 跟踪项 L-04
- **日期：** 2026-11-17

## 1. 场景 → 验收映射（E1–E41）

| id | Delta 场景 | 验收层 | 断言要点 |
|---|---|---|---|
| E1 | 搜索设置出发地 | E2E + 单测 | 搜索选中后出发地显示名称；请求体 origin 含坐标 |
| E2 | 当前定位设置出发地 | E2E | geolocation 替身 → 出发地填充；拒绝授权 → 内联错误不阻塞 |
| E3 | 地图点击设置地点 | E2E（有 JS Key 档）+ 人工 | 点击 → 附近候选 → 确认后槽位填充 |
| E4 | 搜索或地图点击设置目的地 | E2E | 目的地搜索选中；请求体 destination 含坐标 |
| E5 | 可选条件可设置 | E2E | 日期/时长/预算/方式/兴趣/节奏可改且进入请求体 |
| E6 | 生成按钮按必填项门控 | 单测 + E2E | 缺任一必填 disabled；齐备 enabled |
| E7 | 生成完整推荐行程 | E2E + 后端 | ≥2 POI；理由/到达/停留/顺序/预算/天气/Tips/装备齐全 |
| E8 | 重新生成基于当前条件 | E2E | 修改条件后重生成，请求体携当前条件 |
| E9 | 生成响应携带真实天气 | 后端 + E2E | generate 内自取天气注入提示词；响应 weather 与替身一致；右栏切换到响应天气 |
| E10 | AI 输出非法时按失败处理 | 后端 + E2E | 非法 JSON / POI<2 → 502 `AI_INVALID_OUTPUT`；不自动重试；前端 Error+Retry |
| E11 | AI 不产出地图数据 | 后端 + 单测 | 提示词禁止地图字段；前端只取 name，坐标/路线/距离/时间全来自高德替身 |
| E12 | 按目的地与日期获取天气 | 后端 + E2E | forecast 按 lng/lat/date 调 Open-Meteo；字段归一 |
| E13 | 雨天推荐室内优先 | E2E（替身） | 降雨概率 80% → 室内标记占比高于无雨口径；Tips 含雨伞/防水鞋类关键词 |
| E14 | 高温高 UV 推荐防晒补水 | E2E（替身） | 35°C / UV 9 → Tips 含防晒/帽子/水类关键词 |
| E15 | 低温推荐外套与温差提醒 | E2E（替身） | 最低 8°C → Tips 含外套/温差类关键词 |
| E16 | 超出预报窗口的日期被拒绝 | 后端 + E2E | date > 今天+15 → 400 `INVALID_INPUT` 可读提示；无伪造天气 |
| E17 | POI 经高德解析后上图 | E2E（Marker 分级）+ 单测 | 逐个 geocode；编号 chip 1–4 与列表一致；有 JS Key 时断言地图 Marker |
| E18 | 路线数据来自高德 | E2E + 单测 | 距离/时间等于高德替身返回值之和；标注「预计」 |
| E19 | POI 解析失败提示更换 | 单测 + E2E | 搜索无结果 → 「未定位」+ 更换入口；不渲染伪造坐标；路线按已解析子集 |
| E20 | 景点变化后重算 | E2E | 编辑后重新请求路线；统计更新 |
| E21 | 删除景点 | 单测 + E2E | 4→3 重新编号；重算 |
| E22 | 更换景点 | E2E | 搜索替换「永庆坊」；顺序不变；新 POI 解析 |
| E23 | 调整顺序 | 单测 + E2E | A→B→C 上移 C → A→C→B；编号同步 |
| E24 | 景点不足两个时提示补齐 | 单测 + E2E | resolved=1 → 「至少保留 2 个景点」；保存 disabled |
| E25 | 预算四项与 AI 估算标注 | 单测 + E2E | 四项+合计；每项与合计带「AI 估算」 |
| E26 | 超预算提示与降预算动作 | 单测 + E2E | 500 预算 / 580 合计 → 「预计超过预算 80 元」；点击 → 请求体 reduce_budget=true |
| E27 | 未填预算不提示超支 | 单测 + E2E | 无超预算提示与降预算按钮；估算仍展示 |
| E28 | 生成中展示 Loading | E2E | 延迟替身 → Loading 可见；按钮不可重复点击 |
| E29 | AI 失败可重试 | E2E | 502 → Error+Retry；恢复后 Retry 成功；无伪造行程 |
| E30 | 天气失败可重试 | E2E | forecast 502 → 天气卡 Error+Retry；不展示伪造天气 |
| E31 | 高德失败可重试 | E2E | direction 502 → 地图区 Error+Retry；统计无伪造数值 |
| E32 | AI 未配置 key | 后端 + E2E | 503 `AI_NOT_CONFIGURED`；前端配置缺失说明+Retry |
| E33 | 保存完整快照 | 后端 + E2E | 落库字段齐全（出发地/目的地/日期/POI 经纬度顺序/方式/路线/距离/时间/天气/理由/预算）；返回 id |
| E34 | 快照归属当前用户 | 后端 | user_id=会话身份；他人链接被拒 |
| E35 | 快照重启后仍在 | 后端 | 持久化后重读完整字段（同库二次读取） |
| E36 | 非法快照被拒绝 | 后端 | 缺目的地/日期/resolved<2/缺坐标 → 400 `INVALID_INPUT`；不产生快照 |
| E37 | AI 方案保存为招募中行程 | E2E | 快照 → `#/trips/new?ai={id}` 预填 → 发布成功 → 状态招募中 |
| E38 | 链接归属校验 | 后端 + E2E | 他人/不存在 id → 400；本人成功 |
| E39 | 详情页展示 AI 来源标识与摘要 | E2E | 「AI 推荐」徽标 + 天气/预算摘要；既有详情断言不变 |
| E40 | 保存后首页可见 | E2E | 首页出现该行程（相对日期口径） |
| E41 | 普通发布不受影响 | 既有回归 | `trips.spec.ts` 发布/详情全绿；无 ai 链接行为不变 |

## 2. 替身口径（L-04 收口，CI 不依赖真实 key）

### 2.1 后端测试替身

- `routeme.ai.base-url` / `routeme.weather.base-url` 指向 `@SpringBootTest` 内注册的测试替身控制器（`AiUpstreamStubController`：`POST /chat/completions` 返回可配置 content；`WeatherUpstreamStubController`：`GET /v1/forecast` 返回可配置 daily JSON），沿用 `AmapProperties.baseUrl` 可覆盖的既有模式。
- 替身记录请求体：断言提示词含天气摘要与预算约束（E9 / E11 / E26）；断言非法输出时只调用 1 次（E10 不自动重试）。
- 失败注入：替身返回 500 / 超时 / 非法 JSON / 缺字段 / POI<2 各一档。
- 不依赖真实 DeepSeek / Open-Meteo / 高德 key；`application.yaml` 默认空 key 即 `AI_NOT_CONFIGURED` 测试条件。

### 2.2 E2E 替身（Playwright `page.route`，沿用 `profiles.spec.ts` / `experiences.spec.ts` 既有模式）

| 拦截 | 替身内容 |
|---|---|
| `**/api/ai/itineraries/generate` | 按请求体分发夹具：默认 `planFixture`（广州塔/海心沙/花城广场/北京路步行街，预算 46000）+ `weatherFixture`（24/17°C、20%、UV 6）；`reduce_budget=true` → `lowBudgetPlanFixture`（合计 ≤ 预算）；雨天/高温/低温用例换对应 plan+weather 夹具 |
| `**/api/weather/forecast**` | `weatherFixture` / `rainyWeatherFixture`（80%）/ `hotWeatherFixture`（35°C、UV 9）/ `coldWeatherFixture`（最低 8°C）；失败用例 502 |
| `**/api/amap/v3/place/text**` 与 `**/_AMapService/v3/place/text**` | 按 keywords 返回固定 POI（名称/坐标/地址）；「未定位」用例对指定名称返回空 pois |
| `**/api/amap/v3/geocode/geo**` 与 `**/_AMapService/v3/geocode/geo**` | 固定地理编码结果或空 |
| `**/api/amap/v3/direction/**` 与 `**/_AMapService/v3/direction/**` | 固定 distance/duration/polyline（transit 形状 `route.transits[]`）；失败用例 502 |
| 失败注入 | `route.fulfill({status:502/503})` 或 `route.abort()`；Retry 用例先失败后 `page.unroute` 恢复 |

- **地图 Marker 分级（R3）：** 编号 chip 与列表顺序断言不依赖地图实例，CI 恒跑；地图 Marker / 点击选点断言仅在 `VITE_AMAP_JS_KEY` 配置时执行（`test.skip` 守卫），本地真实 key 环境补齐。无 JS Key 时中栏为 Error+Retry 面板，其余闭环照常（design §4.3）。
- 快照保存 / 发布 / 详情 / 首页走**真实后端**（fresh SQLite），验证 E33–E41 落库链路。
- 登录沿用 `e2e/tests/support.ts` 的 `loginAs`；行程造数用 API fixtures，日期用相对日期（沿用 `map.spec.ts` 稳健化口径）。

## 3. 单元测试（vitest，node 环境）

| id | 文件 | 用例 |
|---|---|---|
| U1 | `ai/plannerForm.test.ts` | `canGenerate`：缺出发地/目的地/日期任一 → false，齐备 → true；`toGenerateRequest`：预算元→分、mode/pace/duration 枚举映射、reduce_budget 透传 |
| U2 | `ai/budgetMath.test.ts` | 四项合计=total；580 合计/500 预算 → 差额 80；未填预算 → 无超支；「AI 估算」标注恒在 |
| U3 | `ai/poiResolve.test.ts` | mock `geocodePlace`：成功 → resolved+坐标；失败 → resolved=false 且无坐标字段（不伪造）；部分失败按子集保留 |
| U4 | `ai/itineraryEdit.test.ts` | 删除重编号；更换保序；上移/下移边界（首/尾不动）；`resolvedCount` 只数 resolved |
| U5 | `ai/snapshot.test.ts` | `buildSnapshot` 字段齐全（含 route legs / weather / tips / packing / ai_budget）；`toTripPrefill`：标题 ≤40 截断、tags 交集、预算分映射、destinationCode 解析失败留空 |
| U6 | `map/amap/AmapService.test.ts`（增补） | `parseTransitLeg`：transits 形状 distance/duration/path 拼接；`planRoute('transit')` 逐段求和；walking/driving 既有用例不回归 |
| U7 | `route.test.ts`（增补） | `#/trips/new?ai=12` → `aiItineraryId:12`；`?from=3&ai=12` → ai 优先；`routeToHash` 往返一致；非法 ai 值忽略 |

## 4. 后端测试

| id | 文件 | 用例 |
|---|---|---|
| B1 | `AiItineraryControllerTest` | generate 成功：plan 字段齐全、weather 与替身一致；替身请求体提示词含天气摘要与预算约束（E7/E9/E11） |
| B2 | 同上 | key 未配置 → 503 `AI_NOT_CONFIGURED`（E32） |
| B3 | 同上 | 替身 500 / 超时 → 502 `AI_UPSTREAM_ERROR`（E29） |
| B4 | 同上 | 非法 JSON / 缺字段 / POI<2 → 502 `AI_INVALID_OUTPUT`；替身调用计数=1（E10，不自动重试） |
| B5 | `WeatherControllerTest` | 归一字段与 WMO 文案映射；uv 缺失 → null；date 超窗 → 400 `INVALID_INPUT`（E12/E16） |
| B6 | 同上 + B1 | Open-Meteo 替身失败 → 502 `WEATHER_UPSTREAM_ERROR`（forecast 与 generate 两路径，E30） |
| B7 | `AiItinerarySnapshotTest` | 保存完整快照 → GET 返回全字段；user_id=会话身份（E33/E34/E35） |
| B8 | 同上 | 缺目的地/日期、resolved<2、POI 缺坐标 → 400 `INVALID_INPUT` 且无新快照（E36） |
| B9 | `TripControllerTest`（增补） | 携本人 ai_itinerary_id 发布 → summary/detail 含 id；他人/不存在 id → 400（E37/E38） |
| B10 | 同上 | 不携 id 的普通发布行为不变（E41） |
| B11 | `OpenApiTest` | version 0.12.0；三新接口 + GET 快照 schema；`ai_itinerary_id` nullable 且不入 required（`@rule:api-contract`） |
| B12 | `WeatherTextTest` | WMO 码 → 中文文案纯函数（晴/多云/雨/雪/未知码兜底） |

## 5. E2E（新增 `e2e/tests/ai-planner.spec.ts`）

前置：fresh SQLite；`loginAs` 演示身份；§2.2 替身默认挂载；地图断言按 JS Key 分级。

| id | 用例 | 步骤 | 断言 |
|---|---|---|---|
| A1 | 门控与条件 | 进入 `#/ai-planner`；逐步填出发地（搜索替身）/目的地/日期 | 缺项时「✨ AI 推荐路线」disabled；齐备 enabled；可选条件可改（E1/E4/E5/E6） |
| A2 | 定位出发地 | `context.grantPermissions(['geolocation'])` + `setGeolocation`；另一档拒绝授权 | 成功填充名称；失败内联错误且表单可继续（E2） |
| A3 | 生成完整行程 | 填齐条件点击生成 | Loading 出现（延迟替身）；≥2 POI 时间轴；理由/到达/停留可见；天气卡=响应天气；Tips/装备可见；预算四项+「AI 估算」；距离/时间=高德替身和+「预计」（E7/E9/E18/E25/E28） |
| A4 | 编号与未定位 | 默认夹具 + 一个名称返回空 pois | 编号 chip 与列表顺序一致；「未定位」+更换入口；路线按已解析子集；有 JS Key 档断言 Marker 编号（E17/E19） |
| A5 | 雨天/高温/低温 | 分别换 rainy/hot/cold 夹具生成 | 雨天室内占比更高+雨伞类 Tips；高温防晒/帽子/水；低温外套/温差（E13/E14/E15，阈值按 dov 裁决 1/2） |
| A6 | 编辑重算 | 删除第 2 个 → 更换为「永庆坊」→ 上移末位 | 列表重编号；direction 替身被再次请求；统计更新；顺序 A→C→B（E20–E23） |
| A7 | 不足两个 | 删到 resolved=1 | 「至少保留 2 个景点」提示；保存 disabled（E24） |
| A8 | 超预算与降预算 | 预算 500 + 合计 580 夹具 | 「预计超过预算 80 元」；点击降预算 → 请求体 reduce_budget=true → 低预算夹具渲染；未填预算档无提示（E26/E27） |
| A9 | 重新生成 | 修改兴趣后点「重新生成」 | 请求体携当前条件；新方案渲染（E8） |
| A10 | 失败与重试 | generate 502 / forecast 502 / direction 502 / generate 503 各一档；Retry 前 unroute 恢复 | 对应区域 Error+Retry；无伪造数据；恢复后成功（E10/E29–E32） |
| A11 | 保存闭环 | 生成 → 保存行程 → 发布页预填断言 → 提交 | `#/trips/new?ai={id}`；标题/日期/stops/预算预填；发布成功跳详情；「AI 推荐」徽标+天气/预算摘要；首页可见（E37/E39/E40） |
| A12 | 链接归属 | 用户 2 直接访问 `#/trips/new?ai={用户1快照id}` 并提交 | 400 可读错误；快照保留可重试（E38，L-01 失败语义） |

## 6. 既有 E2E 变更与回归

| 文件 | 变更 |
|---|---|
| `e2e/tests/trips.spec.ts` | 不改断言；P4 全量回归（E41 / L-05 加性渲染兜底） |
| `e2e/tests/map.spec.ts` | 不改（离线 SVG 页不在本 change 范围）；回归确认 AMap 基础扩展未破坏 |
| `frontend/src/map/amap/AmapService.test.ts` | 增补 transit 用例，既有 walking/driving 用例保持全绿 |
| `frontend/src/route.test.ts` | 增补 ai 参数用例，既有用例不变 |

## 7. 人工走查

| 视口 | 主题 | 检查 |
|---|---|---|
| 1440 | 浅 / 深 | 三栏完整；地图路线与编号 Marker；时间轴/天气/预算卡无溢出 |
| 768 | 浅 / 深 | 两栏降级；右栏移到地图下方；表单可操作 |
| 390 | 浅 / 深 | 纵向堆叠；地图最小高度可见；无横向滚动；动作按钮可点 |
| 真实 key 档 | 浅 | 真实 DeepSeek + Open-Meteo + 高德：生成质量、POI 解析失败率、Marker/点击选点、transit 路线形状；失败口径可复现 |

截图存放：`docs/preview/add-ai-itinerary/`（P4 产出，不纳入构建）。

## 8. 完成定义（DoD）

- U1–U7、B1–B12 全绿；A1–A12 全绿（Marker 档按 JS Key 分级）；`trips.spec.ts` / `map.spec.ts` 回归全绿。
- `npm run build`、`npm run typecheck`、`.\mvnw.cmd -B -ntp verify`、`openspec validate add-ai-itinerary --strict`、Redocly lint 0 error 全通过。
- 人工走查 6 张截图 + 真实 key 一档记录；无溢出 / 重叠 / 对比度问题。
- 未新增硬编码色值与真实 key；文案全部出自 `aiMessages.ts`；E2E 用 fresh SQLite。