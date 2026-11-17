# P0 基线记录 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（新能力 `ai-itinerary` ADDED + `trip-plans` MODIFIED，P1 定稿）｜ **需求：** REQ-017（AI 智能行程推荐：基于地点、预算和天气生成游玩路线）｜ **关联故事：** 迭代 2 / P0 / 8 点，落点「路线创建页 / AI 推荐路线」（发起人 2026-11-17 提供完整 User Story + AC1–AC18 + DoD）
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-17
- **记录人：** Jay（AO）（发起人 2026-11-17 确认本次实际开发者为 Jay；第二签署人 Neal（VL））
- **分支：** `feature/add-ai-itinerary`（从 `feat/amap-jsapi@b9e4f42` 切出；`main@1e0a58c` + 5 个 AMap 基础提交）

## 1. 阶段目标

确认本 change 可以开工：AI 推荐 / 天气 / 预算 / 保存闭环的能力归属、规格权威（living + 未归档增量）、规则载体、知识库槽位、迁移号段、外部服务（高德 JS API 2.0 / Open-Meteo / DeepSeek）接入条件与验证链路都在仓库里可查；故事缺口有源码级证据。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（`trip-plans` / `trip-companions` / `trip-experiences` / `user-auth` / `design-system` / `hello-world`）、`openspec/changes/`（含未归档 `refine-trip-map` 等）、`openspec/templates/`、`openspec/config.yaml`；`openspec` CLI 1.16.1 | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-plans/spec.md`（发布 / 详情 / 地图上下文）；无 `ai-itinerary` 能力 | AI 推荐为新能力 ADDED；保存为行程 MODIFIED `trip-plans`，P2 定稿 |
| 有效增量基线 | `refine-trip-map/specs/trip-plans/spec.md`（未归档，三级地图 + 多集合区域，代码已随 `e251376` 进 main） | 本 change 不重复定义地图视觉与集合区域行为；AMap 在线地图层为新增口径 |
| 已交付代码基线 | `frontend/src/map/amap/{AmapService,AmapContainer,RouteLayer,PlaceSearchBox,AmapPlacePicker,AmapTripMap,loader,config,types}`（`8fe0a8a` / `e163a3a` / `cf8a00a` / `b9e4f42`）；`backend` `AmapProxyController` + `AmapProperties`（Web 服务代理 + `/_AMapService` 安全代理）；`MapExplorerPage` 手动途经点探索 + `savedRoutes.ts` localStorage 快照（在途未提交） | 高德 JS API 2.0 地图 / 搜索 / 选点 / 路线基础已就绪，可作为 AI 闭环的地图层；AI / 天气 / 预算 / 落库保存均未实现 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`、`{architecture,process,quality,security,testing,documentation}/rules.md` | 覆盖 `spec-first`、`artifact-review-gate`、`tdd-cycle`、`git-commit-conventions`、`git-branching-and-pr`、`no-hardcoded-secrets`、`web-testing` |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md`、`operations/README.md`（前端工具链基线）、`architecture/README.md`（地图小节） | 槽位可写；P4 后回写 AI / 天气 / 外部服务小节 |
| 协作约定 | `ai4se-baseline/AGENTS.md`、`docs/sdd/README.md`（P0–P5、签署矩阵、阶段提交格式 `<type>(p<N>): <change-id> …`） | 存在；本 change 每阶段一提交，push 前先 pull；P5 暂不执行、不归档（发起人指示） |
| CI / CD | `.github/workflows/ci.yml` / `cd.yml`；`main@1e0a58c` 带 `build-1e0a58c` 标签 | 管道绿 |
| 工具链 | Node `v24.18.0`、npm `11.16.0`、OpenJDK `21.0.11` | 满足 pom / package.json |
| 迁移号段 | Flyway 当前 head `V17`（`V17__meeting_areas.sql` 已进 main）；全仓无 `V18__` 预留 | 本 change 使用 `V18`（AI 行程落库，P2 定稿字段） |
| 契约 | `openapi.yaml` v0.11.0；`OpenApiTest` 强断言版本 | 本 change 升 `0.12.0`（AI 推荐 / 天气 / 保存接口，P2 定稿） |
| 外部服务 | 高德 Web 服务 Key + securityJsCode 已在 `backend/amap-local.yml`（gitignore，`spring.config.import optional`）；JS API 2.0 经 `/_AMapService` 同源代理；Open-Meteo 免 key（`https://api.open-meteo.com/v1/forecast`）；DeepSeek OpenAI 兼容端点（`https://api.deepseek.com`，发起人已提供 key） | 高德 / Open-Meteo 可直接接入；DeepSeek key 按 `no-hardcoded-secrets` 走 gitignore 本地覆盖文件 + 环境变量回退（沿用 `amap-local.yml` 模式，P1 提案说明） |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate add-ai-itinerary --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME; npx -y @redocly/cli lint openapi.yaml` | 0 error |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run build` | 含 `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp verify` | H2 + SQLite，含 `OpenApiTest` |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 需本地前后端运行（8080 / 5173）；fresh SQLite（知识库三坑之一） |

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`docs/sdd/` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`no-hardcoded-secrets`、`web-coding-style`、`web-testing` |
| P0-3 | 阶段技能可解析 | Pass | `all-specs-review` 在 `.agents/skills/`；`sdd-*` 技能齐备 |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 在 `main` 运行；本 change 走同一管道 |

## 5. 缺口基线（进入 P1 的问题陈述）

证据为 2026-11-17 源码核对（`feature/add-ai-itinerary@b9e4f42` + 在途 `savedRoutes.*`）：

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | 无 AI 推荐入口与 AI 服务 | 后端全仓 grep `openai\|dashscope\|llm\|deepseek\|open-meteo` 0 命中；前端无「AI 推荐路线」按钮；`MapExplorerPage` 仅手动加途经点 | AC4–AC5、AC10–AC13、AC16 无承接；需后端 OpenAI 兼容代理 + 前端规划面板 |
| G-02 | 无天气接入 | 全仓无 Open-Meteo 调用 | AC9–AC11 无承接；天气必须实际参与推荐而非仅展示 |
| G-03 | 无预算估算与超预算反馈 | 无预算字段 / 估算面板 / 「AI 帮我降低预算」 | AC12–AC13 无承接；无真实价格来源必须标「AI 估算」 |
| G-04 | 保存仅本机 localStorage，未落库为 RouteMe 行程 | `savedRoutes.ts` 注释「接入后端路线接口时可把 saveRoute 换成 API 调用」；无后端路线实体 | AC17 不满足「供后续路线匹配和寻找同行者使用」；需 V18 + 契约 + 保存闭环 |
| G-05 | 地图基础就绪但未接 AI 闭环 | `AmapService`（搜索 / 地理编码 / 路线）+ `RouteLayer` + 编号 Marker 已交付；无 AI 排序联动、无建议到达 / 停留时间轴 | AC6–AC8、AC14–AC15 需在 AI 行程与地图间建立双向同步 |
| G-06 | AI / 天气失败无 Loading / Error / Retry 口径 | `amapErrorMessage` 仅覆盖高德；无 AI / 天气错误映射 | AC18 无承接；失败不得伪造数据 |
| G-07 | 规格权威缺失 | `openspec/specs/` 无 `ai-itinerary`；`trip-plans` living spec 无 AI 行程口径 | 需 ADDED 新能力 + MODIFIED 保存口径 |

## 6. 并行工作说明

`feat/amap-jsapi` 与本分支共享工作区，另一会话正在其上提交 AMap 基础（`cf8a00a` / `b9e4f42`）并在途 `savedRoutes.*` / `MapExplorerPage` / `README` 改动。本 change 的 P0–P3 只新增规格 / 记录文件，提交只 stage 本 change 路径；在途地图工作按发起人裁决收编为本 change 的 P4 实现基线，不丢弃、不重复实现。

## 7. 阶段产出

- 本记录：`docs/sdd/add-ai-itinerary/p0-baseline.md`
- 分支：`feature/add-ai-itinerary`
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-17 |
| SM | 待签署 | 准入 P1；REQ-017 进入迭代 2 排期 | 待签署 |
| IO | 待签署 | REQ-017 需求来源（发起人完整 User Story），`ai-itinerary` + `trip-plans` 双 capability | 待签署 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。** 下一步 P1：意图 / 故事 / 提案。

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：AI 推荐闭环（输入 → 推荐 → 地图 / 天气验证 → 编辑 → 保存为行程）；同行者匹配 / 邀请 / 游后分享不在本故事（垂直切片口径）。
- 技术边界：高德 JS API 2.0 负责地图 / 定位 / POI / Marker / 路线；Open-Meteo 负责真实天气；DeepSeek（OpenAI 兼容代理）负责推荐 / 排序 / 理由 / 预算估算 / 天气建议；AI 不得虚构路线、距离、天气、经纬度、实时价格。
- DeepSeek key 不入库：沿用 `amap-local.yml` gitignore 本地覆盖模式（发起人指示 key 配置在 application 配置层；`no-hardcoded-secrets` 禁止提交真实 key，P1 提案列为关键裁决）。
- 缺口 G-01 ~ G-07 可追溯到源码证据与 AC1–AC18。