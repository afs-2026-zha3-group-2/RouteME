# P0 基线记录 — add-trip-cancel

- **Change：** `add-trip-cancel`（能力 `trip-cancellation` ADDED）｜ **需求：** REQ-021（issue #28「[P0] 取消行程」）｜ **关联故事：** #28 取消行程
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-17
- **记录人：** Neal（VL）
- **分支：** `feature/add-trip-cancel`（worktree `.worktrees/add-trip-cancel`，从 `origin/main@c1c238a` 切出）

## 1. 阶段目标

确认「取消行程」可以开工：状态机现状、数据列、契约、列表/详情/我的旅行/申请/聊天/统计的消费点都在仓库里可查；#28 的核心状态迁移有明确的缺口证据；信用分不在本次范围。

## 2. 范围裁决（用户 2026-11-17）

| id | 议题 | 裁决 |
|---|---|---|
| D1 | 信用分 | **不做**。#28 中信用分、信用记录、免扣分申请与管理员审核属于其他 story；本次只做取消行程主目标，相关 AC 不在本 change 验收。 |
| D2 | 取消入口 | **详情页 + 我的旅行**（我发布的卡片行内）；原型当前只有详情页入口，按 `prototype-ui-alignment` 需先改原型再改实现。 |
| D3 | 取消原因可见性 | 仅发布者与已接受（ACCEPTED）同行者可见取消原因与「其他原因」说明；待处理申请者只看到「已取消」。 |
| D4 | 「其他原因」说明 | **必填，≤100 字**，前后端同时校验。 |
| D5 | 我的旅行归组 | 沿用现有四组：取消后仍留在「我发布的」，已接受同行者仍留在「已匹配同行」，均显示「已取消」；不新增分组。 |
| D6 | 编号 | `REQ-021` / `add-trip-cancel`。REQ-018 由 `add-experience-photos`、REQ-019 由 `add-credit-account` 占用（REQ-020 预留给并行 `refine-detail-companions`），按「后到者顺延」本 change 定为 REQ-021；合并 `origin/main` 时确认。 |

## 3. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（`trip-plans` / `trip-companions` / `trip-experiences` / `user-auth` / `design-system` / `hello-world`）、`openspec/changes/`（17 个未归档增量，含本 change）、`openspec/config.yaml` | 存在；`trip-plans` 的「浏览未结束的旅行计划」已写明「已结束与已取消行程 MUST NOT 出现在该列表」，但取消态尚不可观测 |
| 行程状态（代码） | `backend/.../enums/TripStatusEnum.java`：`RECRUITING / FULL / ONGOING / COMPLETED`；`pojo/TripPlan.java:59-70` 由 `completedAt`、人数与日期推导 | **无 CANCELLED**；状态不是独立列 |
| 行程表 | `V17` 为当前 head；`trip_plans` 无取消相关列（`TripPlanEntity` 仅到 `completed_at` / `updated_at`） | 需迁移新增取消标记、原因与说明 |
| 首页查询 | `resources/mapper/TripPlanMapper.xml:13-14`：`completed_at IS NULL AND end_date >= today` | **取消行程若只写 cancelled_at，仍会出现在首页**；查询需排除取消 |
| 结束逻辑 | `TripPlanServiceImpl.complete`：仅发布者、仅 `ONGOING`，写 `completed_at` 并发 `TripCompletedEvent` | 无取消方法；取消需新增服务与端点 |
| 申请联动 | `ApplicationServiceImpl`：`apply` 校验行程状态；`TripCompletedEvent` 监听器把待处理申请批量置 `CANCELLED` | 取消需复用/扩展同一善后路径 |
| 聊天只读 | `ChatServiceImpl:114`：仅 `COMPLETED` 抛 `ChatReadOnlyException` | 取消后需同样只读并提示「该行程已取消」 |
| 我的旅行 | `MyTripsServiceImpl:50-61`：我发布 = 全部本人行程；已匹配 = 非 COMPLETED 且 ACCEPTED；已完成 = COMPLETED | 取消行程会落进「我发布的」与「已匹配同行」，需状态文案与徽标 |
| 发布者统计 | `UserProfileStatsServiceImpl:42-52`：发布行程 = 本人全部行程数 | TODO.md:124 的口径是「发布行程 = 我发布且未取消」，需排除取消 |
| 体验资格 | `ExperienceServiceImpl:149`：仅 `COMPLETED` 可发表体验 | 取消行程天然不可发表体验，无需改资格规则，补回归断言即可 |
| 契约 | `openapi.yaml` v0.11.0：`status` enum `[recruiting, full, ongoing, completed]`；无取消端点与取消字段 | 需升版并新增端点 / 字段 |
| 前端状态 | `frontend/src/types.ts` 的 `TripStatus` 无 `cancelled`；`TripDetailPage.tsx` 操作区无取消入口；`MyTripsPage.tsx` 行内无取消动作 | 需补状态、入口与确认弹窗 |
| 原型 | `docs/prototype/ui.js:410` 详情页危险操作行有「取消行程」；`main.js:646` 二次确认文案「取消这条行程？行程将从灵感首页下架，待处理的申请会被取消。已匹配的同行者会看到状态变化。」；`store.js:240-248` 置 `CANCELLED` 并取消 PENDING 申请 | 详情页按原型；我的旅行入口为本次扩展，需先改原型 |
| E2E 现状 | `e2e/tests/trips.spec.ts:351` 断言非本人看不到「编辑 / 删除 / 取消行程」 | 现有断言保持；需新增取消主路径 |
| 工具链 | Node `v24.18.0`、npm `12.2.2`、OpenJDK `21.0.11` | 满足 pom / package.json |
| 迁移与契约号段 | Flyway head `V17`；`add-ai-itinerary` 计划 `V18` + 契约 `0.12.0`；并行 `add-experience-photos` 亦待排号 | 本 change 暂定 `V19` + 契约 `0.13.0`，P3 定稿前按实际落地顺序复核 |
| CI / CD | `.github/workflows/ci.yml` / `cd.yml`；`origin/main@c1c238a` 带 `build-c1c238a` 标签 | 管道可用 |

## 4. 现状缺口（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | 行程没有取消态 | `TripStatusEnum` 四态；`TripPlan` 无 `cancelledAt` | #28 的核心状态迁移无法表达 |
| G-02 | 首页不会排除取消行程 | `TripPlanMapper.xml:13-14` 只排 `completed_at` | 取消后行程仍会出现在灵感首页 |
| G-03 | 没有取消端点与请求模型 | `TripController` 无 cancel；`openapi.yaml` 无 `POST /api/trips/{id}/cancel` | 前端无法发起取消 |
| G-04 | 没有取消原因字典与存储 | `trip_plans` 无 reason / note 列 | #28 的 8 类原因与「其他」说明无处落库 |
| G-05 | 详情页没有取消入口 | `TripDetailPage.tsx` 操作区无取消按钮 | 发布者无法从详情取消 |
| G-06 | 我的旅行没有取消入口与取消态文案 | `MyTripsPage.tsx` 行内仅已交付动作；状态徽标无「已取消」 | 用户裁决 D2 / D5 无法满足 |
| G-07 | 申请资格不认识取消态 | `ApplicationServiceImpl.apply` 依据行程状态判断 | 取消后仍可能提交申请 |
| G-08 | 取消不会关闭待处理申请 | 仅 `TripCompletedEvent` 触发批量取消 | 取消后 PENDING 申请悬空 |
| G-09 | 聊天只对已结束只读 | `ChatServiceImpl:114` 仅判断 `COMPLETED` | 取消后仍可发消息 |
| G-10 | 取消原因没有可见性控制 | 详情响应无取消字段，更无按请求人裁剪 | D3 无法满足 |
| G-11 | 发布者统计会把取消行程算进「发布行程」 | `UserProfileStatsServiceImpl:42-52` | 与 TODO.md:124 口径不一致 |
| G-12 | 原型缺「我的旅行」取消入口与取消态样式 | `ui.js` 仅在详情页渲染 `cancel-trip`；我的旅行行无该动作 | 需按规则先改原型再改实现 |

## 5. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate add-trip-cancel --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME; npx -y @redocly/cli lint openapi.yaml` | 0 error |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run build` | 含 `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp verify` | H2 + SQLite，含 `OpenApiTest` / `TripControllerTest` |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test` | 需本地前后端运行 |

## 6. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`docs/sdd/` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`web-coding-style`、`web-testing` |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` ready；`all-specs-review` 在 `.agents/skills/` |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 在 `main` 运行；本 change 走同一管道 |

## 7. 阶段产出

- 本记录：`docs/sdd/add-trip-cancel/p0-baseline.md`
- 分支 / worktree：`feature/add-trip-cancel` / `.worktrees/add-trip-cancel`
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| 当前开发者 | Neal（VL） | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-17 |
| SM | 待签署 | 准入 P1；REQ-021 进入本迭代排期 | 待签署 |
| IO | 待签署 | REQ-021 需求来源（issue #28），信用分不在本范围 | 待签署 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。** 下一步 P1：意图 / 需求 / 影响面 / 提案。

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：取消状态、原因字典、二次确认、申请关闭与聊天只读、我的旅行与统计口径；**信用分 / 信用记录 / 免扣分审核明确排除**。
- G-01 ~ G-12 可追溯到代码、契约与原型证据。
- 与未归档 change 的边界：不改 `trip-plans` / `trip-companions` 既有 Requirement 块，取消行为落在新能力 `trip-cancellation`；契约与迁移号与 `add-ai-itinerary` / `add-experience-photos` 串行。
