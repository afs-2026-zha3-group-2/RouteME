# P0 基线记录 — refine-trip-map

- **Change：** `refine-trip-map`（能力 `trip-plans` MODIFIED + ADDED）｜ **需求：** REQ-016（用户验收反馈 2026-11-16：地图导航风重做、详情页路线地图、多集合区域）｜ **关联故事：** S06 发布表单地图、S05 详情展示位
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）
- **分支：** `feature/refine-trip-map`（从 `main@6d2116b` 切出）

## 1. 阶段目标

确认本 change 可以开工：地图与集合信息的能力归属、规格权威（living + 未归档增量）、规则载体、知识库槽位、迁移号段与验证链路都在仓库里可查；用户反馈的缺口有可复现证据。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（`trip-plans` 7 Requirement）、`openspec/changes/`（含未归档 `add-trip-publish` / `refine-trip-chat`）、`openspec/templates/`、`openspec/config.yaml` | 存在且自洽 |
| 长期规格权威 | `openspec/specs/trip-plans/spec.md`（发布 / 详情两条 Requirement 为 MODIFIED 基线） | 本 change 以此为基线 |
| 有效增量基线 | `add-trip-publish/specs/trip-plans/spec.md`（ADDED「发布表单的默认值与地图上下文」，未归档）；`refine-trip-chat/specs/trip-plans/spec.md`（MODIFIED 发布 / 详情 + ADDED「发布者维护集合信息」，未归档） | 地图上下文与集合信息的现行权威在这两份增量；本 change 在其上 MODIFIED，不重复定义已交付行为 |
| 已交付代码基线 | `frontend/src/map/{PlaceMap,PlacePicker,placeCatalog,mapView}.tsx/ts`、`trips/TripCreatePage.tsx`、`trips/TripDetailPage.tsx`；`backend` V16 迁移、`TripPlanServiceImpl` 集合信息维护；`e2e/tests/trips.spec.ts`「map supports zoom, fullscreen and click-to-add」 | 导航风 SVG 地图一期已交付（`6f03261`），本 change 做视觉与交互重做 + 多值集合区域 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`、`{architecture,process,quality,security,testing,documentation}/rules.md` | 覆盖分支、提交、工件评审、前端样式、测试、PII |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md`、`architecture/README.md`（地图小节 2026-11-16） | 槽位可写；P4 后回写地图小节 |
| 协作约定 | `ai4se-baseline/AGENTS.md`、`docs/sdd/README.md`（P0–P5、签署矩阵、阶段提交格式） | 存在 |
| CI / CD | `.github/workflows/ci.yml` / `cd.yml`；`main@6d2116b` 带 `build-6d2116b` 标签（CD 已产出） | 管道绿 |
| 工具链 | Node `v24.18.0`、npm `11.16.0`、OpenJDK `21.0.11`（后端启动日志） | 满足 pom / package.json |
| 迁移号段 | Flyway 当前 head `V16`；全仓 `openspec/changes/` 无 `V17__` 预留 | 本 change 使用 `V17`（集合区域多值） |
| 契约 | `openapi.yaml` v0.10.0（`refine-trip-chat` 已升版）；`OpenApiTest` 强断言 `0.10.0` 与 `meeting_area` 字段 | 本 change 升 `0.11.0`，`meeting_area` → `meeting_areas` 数组（发起人 2026-11-16 裁决） |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate refine-trip-map --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME; npx -y @redocly/cli lint openapi.yaml` | 0 error |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run build` | 含 `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp verify` | H2 + SQLite，含 `OpenApiTest` / `TripControllerTest` |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 需本地前后端运行（8080 / 5173 已起） |

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`docs/sdd/` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`web-coding-style`、`web-testing` |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` ready；`all-specs-review` 在 `.agents/skills/` |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 在 `main` 运行；本 change 走同一管道 |

## 5. 缺口基线（进入 P1 的问题陈述）

实测环境：后端 8080 + 前端 5173（`main@6d2116b` 源码），账号 linjianxia，2026-11-16 浏览器走查。

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | 详情页没有路线地图，点击途经点列表无任何反应 | `TripDetailPage.tsx` 仅有 `ol.detail-stops` 文本列表；实测 `#/trips/1` 无 `.map-shell` | 与参考图（详情即导航地图 + 行程安排条）差距最大；用户「点击某处地点没有显示出地图」的主因 |
| G-02 | 地图视觉为示意图：网格路 + 色块公园 + 圆点标记，无编号水滴 pin、无路线白 casing、无图例卡与右侧控制条 | `PlaceMap.tsx` / `styles.css` §离线导航地图；实测截图观感 | 用户评价「劣质、太丑」，要求按参考图导航风重做 |
| G-03 | 点击反馈不可靠：空白点击实测未出现候选浮层；POI 点击直接入列表，无信息卡预览 | 实测空白点击无 `.map-callout`；`onCanvasClick` 阈值 `max(view.w,view.h)*0.2` 与定位 clamp 依赖 shell 尺寸 | 「点击没有效果」的直接体验；需要任何点击都有可见反馈（地点卡 / 候选浮层） |
| G-04 | 集合区域单值替换，无法添加多个 | 契约 `meeting_area: string`；`PlacePicker mode="single"`；实测选「沙面岛」再选「永庆坊」被替换 | 用户明确要求多集合区域；需契约 `meeting_areas` 数组 + 两端同步 |
| G-05 | 多途经点添加源码可用但缺可执行证据与上限反馈 | 实测可连续加「广州塔」「北京路」；`MAX_STOPS=8`；e2e 只断言加入 1 个 | 用户反馈「无法添加多个」与源码行为不一致，需 E2E 固化多添加 + 上限提示，排除旧构建误解 |
| G-06 | 规格与实现漂移：增量要求「未选目的地不渲染地图」，实现已渲染全省概览 | `add-trip-publish` Delta「未选目的地时不展示途经点地图」vs `TripCreatePage showMap={mapCity !== undefined \|\| !hasDestination}` | 本 change 的 MODIFIED 需把全省概览 + 城市聚焦口径收编进规格，消除平行权威 |

## 6. 阶段产出

- 本记录：`docs/sdd/refine-trip-map/p0-baseline.md`
- 分支：`feature/refine-trip-map`
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-16 |
| SM | 待签署 | 准入 P1；REQ-016 进入本迭代排期 | 待签署 |
| IO | 待签署 | REQ-016 需求来源（用户验收反馈 + 参考图），`trip-plans` 单 capability | 待签署 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。** 下一步 P1：意图 / 故事 / 提案。

## 8. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：视觉重做、详情路线地图、点击反馈、多集合区域契约；不引入在线地图瓦片 / 厂商 key（沿用方案 1 离线 SVG，发起人已裁决）。
- 缺口 G-01 ~ G-06 可追溯到参考图、实测证据与 `add-trip-publish` / `refine-trip-chat` 增量。
- 与未归档 change 的边界：S06 / S07 不归档（发起人指示）；本 change 不改动 `add-match-reason` 范围。