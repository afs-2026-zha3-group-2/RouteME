# design 评审报告 — add-ai-itinerary

- **工件：** `openspec/changes/add-ai-itinerary/design.md` + `atdd-design.md`
- **change-id：** `add-ai-itinerary`
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:web-coding-style`、`@rule:api-contract`、`@rule:no-hardcoded-secrets`、`@rule:web-testing`）
- **评审输入：** `design.md`、`atdd-design.md`、Delta Spec（9 Requirement / 41 Scenario）、`proposal.md`、`dov-ac-review.md`（8 裁决）、`consistency-lint.md`（L-01~L-05）、`g1-decision.md`；as-is 源码（`AmapProxyController` / `AmapProperties` / `AmapConfig` / `BusinessException` / `AmapService.ts` / `savedRoutes.ts` / `TripCreateRequest` / `TripCreatePage` / `route.ts` / `loader.ts` / `application.yaml`）

## 评审结论

**Pass**（0 BLOCKER / 0 WARNING / 3 SUGGESTION）

设计与 Delta 41 条场景逐条对齐（atdd §1 E1–E41）；G1 跟踪项 L-01~L-05 全部在 design §2 / atdd §2 收口且有任务落点；后端沿用 AMap 代理 / 配置 record / BusinessException 既有模式；前端控件只用 antd 与既有令牌；技术边界（AI 不产出地图 / 天气 / 价格数据）在契约形状、提示词约束与前端取值口径三层固化；替身口径保证 CI 无 key 可跑。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| D-01 | SUGGESTION | `@rule:api-contract` | design §3.3 | 提案写「三个新接口」，设计补了第四个 `GET /api/ai/itineraries/{id}`（发布预填与详情摘要的读路径） | **接受为加性读接口**：服务 R8「快照重启后仍在」与 R9 预填 / 摘要场景，不改提案语义与既有接口；T2 契约落地时同步口径，P4 报告记录 | Delta R8 / R9 场景；proposal What Changes |
| D-02 | SUGGESTION | `@rule:web-testing` | design §4.3 / atdd U6 | `parseTransitLeg` 的替身夹具形状若与真实高德 transit 响应漂移，单测绿而真实失败 | P4 真实 key 档先核对真实响应形状再固化夹具；形状差异按 R1 处理（Error+Retry，不伪造） | `AmapProxyController` 白名单已含 transit/integrated |
| D-03 | SUGGESTION | `@rule:web-testing` | atdd §2.2 Marker 分级 | CI 无 `VITE_AMAP_JS_KEY` 时地图 Marker 断言跳过，AC6/AC8 的地图侧证据依赖本地真实 key 档 | 编号 chip 与列表顺序断言 CI 恒跑（AC8 列表口径）；Marker / 点击选点由真实 key 人工走查补齐并在 P4 报告记录分级覆盖 | `loader.ts` MISSING_JS_KEY 行为；design §4.3 降级面板 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| G1 跟踪项收口 | L-01 两段式失败语义（design §2 / §4.4）；L-02 generate 响应天气权威（§2 / §4.1）；L-03 不自动重试（§2 / §3.3）；L-04 替身口径（atdd §2）；L-05 详情加性渲染（§2 / §4.4）——全部有落点 |
| 技术边界 | plan schema 无坐标 / 路线 / 距离 / 时间字段；前端只取 name；天气后端自取注入；价格恒标「AI 估算」；失败不伪造（R2/R3/R4/R6/R7 MUST NOT 逐条对应） |
| 组件选型 | antd（Card / Button / Select / Segmented / DatePicker / InputNumber / Spin / Alert）+ 既有 AmapContainer / RouteLayer / PlaceSearchBox / AmapPlacePicker；无第二套视觉 |
| 样式令牌 | `.ai-planner-*` 末尾追加，只引用既有令牌，浅 / 深两套；无硬编码色值 |
| 契约 | 只增接口与可空字段；`ai_itinerary_id` 不入 required；既有发布 / 详情 / 状态机不变；0.12.0 + V18 号段与 P0 核对一致 |
| 安全 | 真实 key 只写 gitignore `ai-local.yml`；`application.yaml` 环境变量占位；key 不下发浏览器；日志不含 key |
| 既有行为保留 | walking/driving/bicycling 路线行为不变（U6 回归）；`savedRoutes.ts` 不改语义；离线 SVG 页不在范围；`trips.spec.ts` / `map.spec.ts` 回归兜底 |
| 可访问性 | label 关联 / aria-label 调序 / 编号文本双通道 / Retry 可聚焦（design §4.7） |
| 测试分层 | 纯逻辑 U1–U7 / 后端 B1–B12 / E2E A1–A12 / 回归 / 人工走查，41 场景全覆盖 |

## 残余风险

- transit 真实响应形状与夹具漂移（D-02 / R1）。
- AI 真实输出质量波动与 POI 解析失败率（R2 / R5）：schema 校验 + 更换交互兜底，真实 key 档记录。
- 并行会话同改 styles / openapi / 详情页（R4）：末尾追加 + 只 stage 本 change 路径 + push 前 merge 式 pull。
- 目的地名 → destinationCode 解析失败（R6）：发布页手选兜底，不阻断闭环。

## 批准记录

| 签署位 | 批准人 | 时间 |
|---|---|---|
| 工件 1/2（design.md + atdd-design.md 作者） | Jay（AO） | 2026-11-17 |
| 工件 2/2（第二签署人） | Neal（VL） | 2026-11-17 |
| 报告 1/2 | WAYNE（IO） | 2026-11-17 |
| 报告 2/2 | Jay（AO） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准（Jay + Neal + WAYNE）」，授权代签本轮全部 10 个签署位（design/atdd/tasks 工件各 2 + 两份报告各 2）；tasks.md 工件签署见 `20261117-add-ai-itinerary-tasks-review.md`。