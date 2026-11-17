# 变更提案：add-ai-itinerary

- **需求来源：** REQ-017「AI 智能行程推荐：基于地点、预算和天气生成游玩路线」（发起人 2026-11-17 提供完整 User Story / 功能描述 / AC1–AC18 / DoD / 建议 UI / 技术边界）｜ **编号登记：** `requirement-workspace/registry.md` REQ-017
- **故事：** 迭代 2 / P0 / 8 点；落点「路线创建页 / AI 推荐路线」；垂直切片＝输入旅行条件 → AI 推荐 → 地图/天气验证 → 用户确认并保存路线
- **能力：** `ai-itinerary`（ADDED 8 Requirement）+ `trip-plans`（ADDED 1 Requirement「AI 行程保存为旅行计划」）
- **规模：** L（前端 AI 规划页三栏闭环 + 后端 AI / 天气代理 + 契约 0.12.0 + V18 迁移 + 保存为行程接线）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:artifact-review-gate`、`@rule:tdd-cycle`、`@rule:api-contract`、`@rule:no-hardcoded-secrets`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:git-branching-and-pr`
- **基线：** `main@1e0a58c` + AMap 基础提交（`8fe0a8a` / `e163a3a` / `cf8a00a` / `b9e4f42`，发起人裁决收编进本 change）。有效增量基线：`refine-trip-map`（未归档，三级离线 SVG 地图 + 多集合区域，契约 0.11.0 / V17 已进 main）。
- **归档顺序：** 发起人指示 P5 暂不执行、不归档。本 change 对 `trip-plans` 只 ADDED 新 Requirement，不 MODIFIED 未归档增量中的 Requirement，无归档顺序前置条件。

## Why

RouteMe 目前规划一条行程要用户自己逐个搜索景点、手动排顺序、心算距离与预算（P0 缺口 G-01~G-07，源码证据见 `docs/sdd/add-ai-itinerary/p0-baseline.md` §5）：

- **没有 AI 推荐。** 后端无任何 LLM 接入，前端无「AI 推荐路线」入口；`MapExplorerPage` 只能手动加途经点。
- **没有天气。** 全仓无 Open-Meteo 调用；用户无法在规划时知道目的地当天是否下雨、是否高温，更谈不上雨天优先室内、高温防晒这类建议。
- **没有预算口径。** 无预算估算、无超预算提示；用户填了预算也不知道方案是否消费得起。
- **地图基础已就绪但未接闭环。** 高德 JS API 2.0 的搜索 / 地理编码 / 路线 / 编号 Marker 已交付（AMap 基础提交），缺「AI 决定去哪、什么顺序、为什么；高德计算怎么走、多少公里、多久」的分工接线。
- **保存只在本机。** `savedRoutes.ts` 是 localStorage 快照，不落库、不成为 RouteMe 行程，无法供后续路线匹配与寻找同行者使用（AC17 不满足）。
- **失败无口径。** AI / 天气请求失败时没有 Loading / Error / Retry 统一处理，存在伪造数据的风险面。

## What Changes

- `ai-itinerary`（ADDED「旅行条件输入与地点选择」）：新增 `#/ai-planner` 页左栏表单——出发地 / 目的地（搜索、当前定位、地图点击三种方式）、旅行日期、游玩时长（半天 / 1 天 / 2 天）、预算（选填）、出行方式（公共交通 + 步行 / 步行 / 驾车）、兴趣偏好（多选）、行程节奏（宽松 / 适中 / 紧凑）；出发地 + 目的地 + 日期齐备后「✨ AI 推荐路线」按钮才可用（AC1–AC4）。
- `ai-itinerary`（ADDED「AI 行程生成与重新生成」）：后端新增 OpenAI 兼容代理 `POST /api/ai/itineraries/generate`（DeepSeek，base-url / model / key 走本地配置），在请求内按目的地经纬度 + 日期自取真实天气，与用户输入、预算约束一起组装为提示词，返回严格 JSON（≥2 个 POI、推荐理由、游玩顺序、建议到达时间、建议停留时长、室内 / 户外标记、天气注意事项、建议携带物品、预算四项估算）与本次使用的天气摘要；后端校验输出结构，非法输出按失败处理，不伪造行程；「重新生成」基于当前条件重跑（AC5 / AC16）。
- `ai-itinerary`（ADDED「真实天气参与推荐」）：后端新增 Open-Meteo 代理 `GET /api/weather/forecast`（目的地经纬度 + 日期 → 最高 / 最低温度、降雨概率、降水量、天气状态、风速、UV）；天气摘要 MUST 进入 AI 提示词实际影响推荐（雨天优先室内、减少长时间户外；高温 / 高 UV 减少中午户外并建议防晒补水；低温建议外套与早晚温差提醒），右栏展示天气卡 + AI Tips + 装备建议（AC9–AC11）。
- `ai-itinerary`（ADDED「地图验证与路线同步」）：AI 返回的 POI 名称 MUST 经高德 JS API 2.0 地点搜索 / 地理编码解析为真实经纬度后才上图；解析失败的 POI 提示更换，不伪造坐标；编号 Marker 1、2、3… 与行程列表顺序一致；路线、总距离、预计交通时间 MUST 取自高德路线规划（按出行方式），AI 不产出路线数据；景点变化后重新计算（AC6–AC8 / AC15）。
- `ai-itinerary`（ADDED「行程编辑」）：右栏行程列表支持删除景点、更换景点（搜索替换）、上下移动调序；编辑后地图 Marker / 路线 / 距离 / 时间同步重算；有效景点不足 2 个时提示补齐后才能保存（AC14）。
- `ai-itinerary`（ADDED「预算估算与超预算反馈」）：右栏预算卡展示交通 / 门票 / 餐饮 / 其他四项与合计，全部标记「AI 估算」（无真实价格来源）；填写预算且预计超支时显示「预计超过预算 X 元」并提供「AI 帮我降低预算」（携带预算约束重新生成）（AC12–AC13）。
- `ai-itinerary`（ADDED「外部服务失败状态」）：高德 / Open-Meteo / AI 任一请求失败时，对应区域显示明确 Error 文案与 Retry 按钮，生成中显示 Loading；失败 MUST NOT 产出伪造的行程 / 天气 / 路线 / 价格（AC18）。
- `ai-itinerary`（ADDED「AI 行程快照保存」）：`POST /api/ai/itineraries` 落库完整快照（出发地 / 目的地 / 日期 / POI + 经纬度 + 顺序 / 出行方式 / 路线信息 / 距离 / 时间 / 天气摘要 / AI 推荐理由 / AI 预算估算），归属当前用户；V18 新表 `ai_itineraries`。
- `trip-plans`（ADDED「AI 行程保存为旅行计划」）：「保存行程」把确认后的 AI 方案预填发布表单（标题 / 目的地 / 日期 / 途经点 / 兴趣 / 预算）并携带 `ai_itinerary_id` 创建招募中行程；`TripCreateRequest` / `TripSummary` / `TripDetail` 增加可空 `ai_itinerary_id`（V18 加列）；链接校验存在且归属当前用户；AI 来源行程在详情页展示「AI 推荐」标识与天气 / 预算摘要；保存后行程进入灵感首页，供后续匹配与同行使用（AC17）。
- 契约 `openapi.yaml` 升 **0.12.0**：三个新接口 + `ai_itinerary_id` 字段；`OpenApiTest` 同步断言。
- 前端：新页面 `AiPlannerPage`（左表单 / 中高德地图 / 右天气 + 预算 + Tips + 行程时间轴），复用 `AmapContainer` / `AmapService` / `RouteLayer` / `PlaceSearchBox`；rail 增「AI 规划」入口，发布页增「试试 AI 推荐路线」引导；`styles.css` 末尾追加 AI 规划页令牌与样式（浅 / 深主题）。
- 测试：后端 AI 代理 / 天气代理 / 快照保存 / 链接校验单测（外部 HTTP 用替身，不依赖真实 key）；前端条件门控 / 预算口径 / 编辑重算 / 失败状态单测；E2E 新增 `ai-planner.spec.ts`（AI / 天气走测试替身或真实服务降级口径，P3 定稿）。

## 范围

**In scope**

- AI 规划页完整闭环：条件输入（三种选点）→ 天气获取 → AI 生成 → 高德验证（坐标 / 路线 / 距离 / 时间）→ 编辑 / 重生成 / 降预算 → 快照保存 → 保存为 RouteMe 行程。
- 后端 AI / 天气代理与失败口径；DeepSeek key 本地配置不入库。
- 契约 0.12.0 + V18（`ai_itineraries` 表 + `trip_plans.ai_itinerary_id` 列）。
- 天气实际参与推荐（提示词注入 + 室内 / 户外标记 + 装备建议）。
- 预算四项估算 + 「AI 估算」标注 + 超预算反馈与降预算动作。

**Out of scope**

- 同行者匹配、邀请同行、游后分享（其他故事负责；`MapExplorerPage` 既有演示匹配面板不在本 change 扩展）。
- 实时门票 / 餐饮价格接入（无真实价格来源，一律「AI 估算」）。
- 转弯级导航、路线沿路吸附可视化之外的导航能力（高德路线结果按现有 `RouteLayer` 表达）。
- 多城市跨城行程、酒店 / 大交通推荐。
- 离线 SVG 地图页（发布 / 详情 / 探索）的行为变更——本 change 不改 `refine-trip-map` 范围。
- AI 行程的独立「我的 AI 行程」管理页（快照保存后以 RouteMe 行程为承载）。
- P5 归档与 Living Spec 合并（发起人指示暂不执行）。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/openapi.yaml` | 0.12.0；`POST /api/ai/itineraries/generate`、`GET /api/weather/forecast`、`POST /api/ai/itineraries`；`TripCreateRequest` / `TripSummary` / `TripDetail` 增 `ai_itinerary_id`（nullable） |
| `backend/.../db/migration/V18__ai_itineraries.sql` | 新表 `ai_itineraries`（快照 JSON + 归属 + 时间）；`trip_plans` 加 `ai_itinerary_id` 列 |
| `backend/.../config/AiProperties.java`、`WeatherProperties.java`（或合并 `ExternalApiProperties`） | DeepSeek base-url / model / key / timeout；Open-Meteo base-url；环境变量回退 |
| `backend/.../controller/AiItineraryController.java`、`WeatherController.java` | 生成 / 快照保存 / 天气代理；错误码 `AI_NOT_CONFIGURED` / `AI_UPSTREAM_ERROR` / `AI_INVALID_OUTPUT` / `WEATHER_UPSTREAM_ERROR` / `INVALID_INPUT` |
| `backend/.../service/AiItineraryService.java`、`WeatherService.java` + impl | 提示词组装（含天气 / 预算）、JSON 输出校验、Open-Meteo 调用与归一、快照持久化 |
| `backend/.../entity/AiItineraryEntity.java`、`pojo/*`、`request/*`、`response/*`、`mapper/*` | 快照读写；`TripPlanEntity` / `TripPlan` / `TripPlanMapper.xml` 增链接字段 |
| `backend/.../service/impl/TripPlanServiceImpl.java` | 发布时校验 `ai_itinerary_id`（存在 + 归属）；详情 / 摘要返回链接 |
| `backend/src/main/resources/application.yaml` | `routeme.ai.*` / `routeme.weather.*` 占位 + `spring.config.import optional:file:./ai-local.yml` |
| `backend/ai-local.yml`（gitignore） | 真实 DeepSeek key（不提交）；`.gitignore` 增条目 |
| `backend/.../OpenApiTest.java`、`TripControllerTest.java` 等 | 版本 0.12.0 与字段断言；AI / 天气 / 快照新测试 |
| `frontend/src/pages/AiPlannerPage.tsx` + `frontend/src/ai/*` | 三栏页面、条件表单、行程时间轴、天气 / 预算 / Tips 卡、失败状态、保存闭环 |
| `frontend/src/map/amap/*` | 复用为主；必要时补「按名称解析 POI 坐标」纯函数与编号 Marker 接线（不改既有语义） |
| `frontend/src/App.tsx`、`route.ts`、rail / 发布页入口 | `#/ai-planner` 路由与入口 |
| `frontend/src/trips/TripCreatePage.tsx`、`tripForm.ts`、`types.ts`、`TripDetailPage.tsx` | `aiItineraryId` 预填与「AI 推荐」标识 / 摘要展示 |
| `frontend/src/styles.css` | 末尾追加 AI 规划页样式与令牌（含深色） |
| `frontend/src/**/*.test.ts`、`e2e/tests/ai-planner.spec.ts` | 单测与 E2E 增补 |
| `docs/knowledge/architecture/README.md`、`operations/README.md`、`_LOG.md` | P4 后回写 AI / 天气 / 外部服务小节 |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| AI 服务 | DeepSeek，经后端 OpenAI 兼容代理（发起人裁决） | key 不下发浏览器；统一错误口径；可替换端点 |
| key 存放 | `application.yaml` 环境变量占位 + gitignore `ai-local.yml` 本地覆盖（沿用 `amap-local.yml` 模式） | 发起人指示 key 配置在 application 配置层；`@rule:no-hardcoded-secrets` 禁止真实 key 入库，本地覆盖文件即 application 配置的一部分且不提交 |
| 天气服务 | Open-Meteo 经后端代理（免 key） | 单一出口便于测试与错误归一；前端不直连，避免 CORS 与口径分叉 |
| 地图真相分工 | AI 只产出名称 / 顺序 / 理由 / 时间 / 估算；坐标 / 路线 / 距离 / 交通时间全部来自高德 JS API 2.0（发起人技术边界） | 杜绝 AI 虚构地图数据；POI 解析失败提示更换而非伪造 |
| 天气参与方式 | 后端在 generate 内自取天气并注入提示词（保证真实参与），随方案返回天气摘要；右栏天气卡与 AI Tips 同源展示；`GET /api/weather/forecast` 供生成前预览与单独重试 | 满足「天气实际参与推荐而非仅展示图标」；避免客户端篡改天气摘要 |
| 预算口径 | 四项估算（交通 / 门票 / 餐饮 / 其他）恒标「AI 估算」；超预算显示差额 + 降预算重生成 | 无真实价格来源；诚实标注（AC13） |
| 保存承载 | 快照落库 `ai_itineraries` + 发布为 `trip_plans` 行程（可选链接），不做独立管理页 | AC17「供后续路线匹配和寻找同行者使用」；复用既有发布 / 详情 / 匹配链路 |
| trip-plans 增量方式 | ADDED 新 Requirement，不 MODIFIED 未归档增量 | 避免与 `refine-trip-map` 的归档顺序耦合；发布既有约束不变 |
| 游玩时长 | 半天 / 1 天 / 2 天三档，影响 AI 景点数量与时间轴分组 | 故事示例为 1 天；档位化控制复杂度 |
| 失败口径 | 分服务 Loading / Error / Retry；AI 未配置 key 时 503 `AI_NOT_CONFIGURED` 可读提示 | AC18；不伪造数据 |
| UI 形态 | 左表单 / 中地图 / 右结果三栏（发起人建议 UI），768 / 390 降级纵向堆叠 | 与故事建议一致；地图始终可见 |

## 验收信号（对应 AC1–AC18）

1. 出发地可搜索 / 定位 / 地图点击设置；目的地可搜索 / 地图点击设置（AC1 / AC2）。
2. 日期 / 时长 / 预算 / 出行方式 / 兴趣 / 节奏可设置；仅出发地 + 目的地 + 日期齐备时「AI 推荐路线」可用（AC3 / AC4）。
3. 点击生成后出现 ≥2 个 POI 的完整行程：理由 / 顺序 / 到达时间 / 停留时长 / 路线 / 总距离 / 交通时间 / 预算 / 天气 / 注意事项 / 装备（AC5）。
4. 每个 POI 在高德地图可定位并显示编号 Marker，编号与列表顺序一致；距离 / 时间取自高德路线结果（AC6–AC8）。
5. 右栏天气来自 Open-Meteo（目的地 + 日期）；雨天方案室内占比更高、Tips 含雨伞 / 防水鞋；高温 Tips 含防晒 / 帽子 / 水；低温 Tips 含外套 / 温差（AC9–AC11）。
6. 预算卡四项 + 合计恒标「AI 估算」；超预算显示「预计超过预算 X 元」与「AI 帮我降低预算」，点击后携带预算约束重生成（AC12 / AC13）。
7. 删除 / 更换 / 调序后地图与统计重算；不足 2 个景点时提示补齐；「重新生成」基于当前条件重跑（AC14–AC16）。
8. 「保存行程」落库快照并创建招募中 RouteMe 行程（携带 `ai_itinerary_id`），详情页见「AI 推荐」标识与天气 / 预算摘要，首页可见（AC17）。
9. 断网 / key 缺失 / 上游 5xx 时对应区域 Error + Retry，无伪造数据；恢复后 Retry 成功（AC18）。
10. `openspec validate add-ai-itinerary --strict` / Redocly 0 error / 后端 verify / 前端 build+test / E2E 全绿。

## 残余风险

| 风险 | 处理 |
|---|---|
| DeepSeek 配额 / 网络不可用导致 E2E 不稳定 | 后端外部 HTTP 全部接口化，测试用替身；E2E 口径 P3 定稿（替身或真实服务 + 跳过标记），不依赖真实 key 跑 CI |
| 高德 POI 解析失败（AI 给出别名 / 不存在景点） | 解析失败逐点提示更换；提示词约束「真实存在、高德可搜」；不伪造坐标 |
| Open-Meteo 预报窗口（约 16 天）外日期 | 日期超出窗口时 400 可读提示，不伪造天气 |
| 与并行会话同改 `styles.css` / `MapExplorerPage` / `openapi.yaml` | 样式只末尾追加；提交只 stage 本 change 路径；push 前 `git pull --rebase` |
| AI 输出 JSON 不合法 | 后端结构校验 + 一次自动重试口径 P3 定稿；仍失败按 `AI_INVALID_OUTPUT` 报错 |
| 真实 key 泄露 | `ai-local.yml` gitignore；`application.yaml` 只留环境变量占位；评审按 `no-hardcoded-secrets` 检查 |

## 交付边界

本提案为 P1 产物。Delta Spec / AC/DoV / G1 属 P2；design / atdd / tasks 属 P3；代码与验证 / G2 属 P4；Living Spec 合并与归档属 P5——本 change 按发起人指示不归档。