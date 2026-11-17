# G2 decision — add-ai-itinerary

- **Change id:** `add-ai-itinerary`（REQ-017，AI 智能行程推荐：地点 × 预算 × 天气生成游玩路线）
- **Gate:** G2（Verify）
- **Inputs:**
  - 实现：后端天气代理（Open-Meteo daily 归一 + WMO 文案 + 日期窗口校验）/ AI 生成代理（DeepSeek OpenAI 兼容，generate 内自取天气先于 AI、失败即终止）/ 快照保存与归属校验 / `trip_plans.ai_itinerary_id` 链接（V18）；前端三栏 `AiPlannerPage`（条件表单三方式选点 + 门控生成 + 分服务 Loading/Error/Retry）/ 纯逻辑模块（plannerForm / budgetMath / poiResolve / itineraryEdit / snapshot / aiMessages）/ `AmapService` transit 三结构兼容 + 编号 Marker / 保存闭环（快照 → `?ai=` 预填 → 发布 → 详情徽标摘要）；契约 0.12.0 四接口 + `ai_itinerary_id` 可空字段。
  - 本地验证：`docs/ai4se-plugins/20261117-144000-local-verify-report.md`（后端 verify 288/288；前端 typecheck 0 errors + 298/298 + build 成功；E2E 全量 run3 88 绿/21 既有偏差、ai-planner fresh DB 终复跑 12/12；openspec strict valid；Redocly 0 error）。
  - 走查：真实 Key run5 全链路闭环（广州南站 → 广州市，2026-11-21，1 天，预算 500，美食/摄影，公共交通）；5 POI 解析 5/5、transit 17 公里/1h54m 高德实测、Open-Meteo 真实天气参与推荐 + 装备建议、预算 280 元恒标「AI 估算」、地图点击选点、保存 trips/43 详情「AI 推荐」徽标 + 摘要；1440/768/390 × 浅/深 9 张截图入 `docs/preview/add-ai-itinerary/`；控制台 0 error。
  - ATDD：`atdd-design.md` E1–E41 落地；U1–U7 / B1–B12 / A1–A12 分层全数 Pass（替身口径：后端 base-url 替身 + Playwright `page.route`/`window.AMap`，CI 无 key）。
  - 任务：`tasks.md` T1–T8 全部完成（勾选清单同源）；T9（P5 归档前收口）按发起人指示不执行。
- **Findings:**
  - **技术边界（诚实性）：** 高德 JS API 2.0 负责地图/定位/POI/Marker/路线/距离/时间（走查 17 公里/1h54m 为高德实测，UI 标「距离与时间来自高德地图」）；Open-Meteo 负责真实天气且实际参与推荐（generate 内自取注入，雨天室内优先 + 装备建议引用真实预报）；AI 负责推荐/排序/理由/预算估算/天气建议，不产出经纬度/路线/距离/时间/天气数值；无真实价格来源恒标「AI 估算」；POI 解析失败标「未定位」不伪造坐标；天气/AI 失败即终止并明确 Error/Retry，不伪造数据（L-02 口径走查验证）。
  - **缺陷闭环（D-02 评审风险兑现）：** 真实 SDK 2.0 `Transfer` 回调交付规范化 `plans[]`（方案自带完整 `path` LngLat[]、时长在 `time`、`cost` 为数值票价），而非旧版 `routes[0].transits`；另有 REST 原生 `route.transits`（polyline 字符串 + 顶层 duration）需降级兼容。诊断以 `Transfer.prototype.search` 回调拦截抓真实交付（证据 `t8-transfer-cb.json`）+ 代理响应体 dump + node 模拟解析对照定位；`AmapService.firstTransit` 三结构兼容（plans[0] 优先）、`parseTransitLeg` plan.path → segment.transit.path → walking steps / bus polyline 回退、时长 cost.duration（对象）→ duration → time 回退票价不误读、`appendStepPath` 统一 path 对象数组/polyline 字符串；+8 单测先 red 后 green。另修 transit city 参数（poiResolve 保留解析城市）、`/_AMapService/v3/log/init` JSONP 包裹（+2 单测，控制台 SyntaxError 噪音消除）。
  - **契约：** openapi 0.12.0 四接口（generate / forecast / 快照 POST / 快照 GET，D-01 接受第四个读接口）+ `ai_itinerary_id` 可空字段（不入 required）；错误码补 `AI_NOT_CONFIGURED`/`AI_UPSTREAM_ERROR`/`AI_INVALID_OUTPUT`/`WEATHER_UPSTREAM_ERROR`；`OpenApiTest` 门禁断言版本与新 schema；既有发布/详情/状态机不变；Redocly 0 error。
  - **回归口径（发起人裁决）：** 本 change 验收 = ai-planner A1–A12 全数 Pass（12/12，fresh DB 终复跑证实）+ 其余非地图套件全绿无回归；全量 run3 中 `map.spec` 9 + `trips.spec` 12 共 21 红为 `refine-trip-map` 并行工作既有破坏（git 证据：AMap SDK 化提交 `cf8a00a`/`b9e4f42` 均为 P0 基线切点 `b9e4f42` 内祖先，`merge-base --is-ancestor` 验证），非本 change 回归；旧地图 spec 留给 `refine-trip-map` 自己更新，本 change 不修旧 spec。
  - **保存闭环（L-01/L-05）：** 快照为用户资产保留，发布失败携 `?ai={id}` 重试不做跨接口事务；详情「AI 推荐」徽标 + 摘要只在 `ai_itinerary_id` 非空加性渲染，失败只隐藏摘要；非本人快照 400 `INVALID_INPUT`（冒烟 + A12 验证）。
- **Decision:** **Pass with documented debts**（已签署）
  - 债务 1（延续）：E2E 向开发库累积行程，本地全量需 fresh DB（本轮两次 fresh：备份 `routeme-dev-backup-20261117-t8-walk.db` / `routeme-dev-backup-20261117-t8-final.db` 后删库 Flyway V1–V18 重建）；CI 用 H2 不受影响。污染库上 ai-planner A11 同名行程 strict mode 冲突即此债务，fresh DB 复跑 12/12。
  - 债务 2（延续）：E2E 不在 CI 流水线（既有 WARNING）。
  - 偏差债务（本轮裁决）：map/trips 21 例旧 spec 红归 `refine-trip-map` 更新（verify report §2.2 git 证据）；本 change 不修旧 spec。
  - 观察项：企业防火墙对 `api.open-meteo.com` 单子域间歇 TCP timeout/TLS reset 为环境因素（对照：主站/DeepSeek/restapi.amap 恒可达），非产品缺陷；后端须沙箱外运行，走查安排在放行窗口；产品侧天气失败即终止生成、明确 Error/Retry，不伪造。
- **Conditions + owners:** 无阻断条件。跟踪项：
  - 归档顺序：`ai-itinerary` 新能力整目录合并入 Living Spec、`trip-plans` ADDED 块追加须与 `refine-trip-map` 核对合并顺序，不覆盖既有 Requirement（owner：Jay；P5 执行时核，本次不执行）。
  - 后续：E2E 独立测试库或清理钩子，消除债务 1（owner：Jay）。
  - 后续：map/trips 21 例旧 spec 由 `refine-trip-map` 更新对齐 SDK 2.0（owner：Jay + Neal）。
- **Approvers:** AO = Jay；VL = Neal；IO = WAYNE（沿用 P1–P3 批准矩阵）
- **Timestamp:** 2026-11-17

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| 本决议 | G2 AO | Jay（AO） | 2026-11-17 |
| 本决议 | G2 VL | Neal（VL） | 2026-11-17 |
| 本决议 | G2 IO | WAYNE（IO） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准 G2（Jay+Neal+WAYNE）」，授权代签本轮 G2 全部 3 个签署位。

## 结论

G2 **Pass**（2 条既有债务 + 1 偏差债务 + 1 观察项，均已记录）。本记录不替代 G3；按发起人指示**不执行 P5、不归档**。签署后执行 P4 阶段提交 → `git pull --no-rebase --autostash --no-edit origin main` → push。