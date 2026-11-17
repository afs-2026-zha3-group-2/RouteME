# P0 基线记录 — refine-my-trips

- **Change：** `refine-my-trips`（能力 `trip-companions` MODIFIED）｜ **故事：** S11 我的旅行（issue #13，P0 / 迭代 2 / 2 点）｜ **需求：** REQ-003「同行匹配、申请与旅行前沟通」的「我的旅行聚合」部分
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）
- **分支：** `feature/refine-my-trips`（独立 worktree `RouteME-s11`，从 `origin/main@f6da5da` 切出）

## 1. 阶段目标

确认 S11 可以开工：能力归属、长期规格权威、已交付基线、规则载体、知识库槽位与验证链路都在仓库里可查；把「原型有、实现没有」的差距固定成可判定的缺口清单，供 P1 提案使用。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/`（6 个能力：`design-system`、`hello-world`、`trip-companions`、`trip-experiences`、`trip-plans`、`user-auth`）、`openspec/changes/`（13 个进行中 change）、`openspec/templates/`、`openspec/config.yaml` | 存在且自洽；`openspec list` 可读出全部 change |
| 长期规格权威 | `openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」（四分区 + 待处理提醒 + 安全能力，4 条场景）；`openspec/specs/design-system/spec.md`「布局完整性与对齐」的「我的旅行列表对齐」 | 本 change 以前者为 MODIFIED 基线，并受后者约束 |
| 已交付基线 | `MyTripsController`（`GET /api/me/trips`）、`MyTripsServiceImpl`、`MyTripsResponse`、`frontend/src/mine/MyTripsPage.tsx`、`api.loadMyTrips` / `cancelApplication` / `leaveTrip` / `loadMyExperiences`、`ApplicationsPage`、`TripDetailPage` 的接受/取消/退出/结束动作 | S11 主干（四组聚合 + 待处理总数）已交付，本 change 只收敛页面与状态同步缺口 |
| 既有测试 | `backend/src/test/java/routeme/controller/MyTripsControllerTest.java`（5 条：三身份分组、接受后分组变化、缺身份 401）；`e2e/tests/companions.spec.ts`（进入 `#/mine` 断言标题与两个 tab）、`e2e/tests/experiences.spec.ts`（`.mine-row` 内「发表游后体验」/「修改我的体验」） | 页面结构变动必须保留这些锚点或同批更新断言 |
| 原型 | `docs/prototype/ui.js` `mine()`（`page-head` + `.seg` 四段 + `.mine-row` 84px 封面 + 元信息 + 右侧动作 + 分组空态）；`docs/prototype/styles.css` `.seg` / `.mine-row` / `.mr-*` | 布局与样式基准；控件仍按 antd 优先 |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`（6 分类 / 24 条）；本次触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`web-coding-style`（含「组件选型 Ant Design 优先」）、`api-contract`、`web-testing`、`java-testing`、`pii-scrubbing` | 覆盖分支、提交、工件评审、样式、契约、测试与 PII |
| 知识库 | `docs/knowledge/_INDEX.md`、`docs/knowledge/_LOG.md`、`docs/knowledge/interfaces/README.md`（`GET /me/trips` 行） | 槽位可写；契约变更需同批登记 |
| 协作约定 | `ai4se-baseline/AGENTS.md`（仓库根、四条开发原则、`all-specs-review` 门禁） | 存在 |
| 阶段记录约定 | `docs/sdd/README.md`（P0–P5 产出、工件评审门禁、阶段提交格式 `<type>(p<N>): <change-id> …`） | 存在 |
| CI | `.github/workflows/ci.yml`（backend `./mvnw -B -ntp verify`；frontend `npm run build && npm test`；JDK 21 / Node 22） | 存在 |
| CD | `.github/workflows/cd.yml` | 存在 |
| 工具链 | `openspec --version` → `1.16.1`；Node `v24.18.0`；npm `11.16.0`；OpenJDK `21.0.11` | 满足 `pom.xml` 与 `frontend/package.json` 要求 |

## 3. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate refine-my-trips --strict` | change 结构合法性 |
| 契约 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test -Dtest=OpenApiTest` | `openapi.yaml` 与 schema 断言 |
| 后端 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 含 `MyTripsControllerTest` 回归 |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm run typecheck` | `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | vitest run |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/mine.spec.ts tests/companions.spec.ts tests/experiences.spec.ts` | 需本地前后端运行 |

## 4. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`docs/sdd/`、`AGENTS.md` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | `_INDEX.md` 24 条；本 change 触发清单见上表 |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` 均 ready；`all-specs-review` 在 `.agents/skills/` |
| P0-4 | pack 隔离违规 | Skipped | 本 change 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | 沿用 `main` 的 CI/CD 工作流 |

## 5. 缺口基线（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | **页面骨架与原型不符。** 现在是 `Typography.Title` 裸标题 + 资料卡 + antd `Tabs` + `TripCard compact`（104px 封面条 + 路线/标签/进度条）；原型是 `page-head`（标题 + 副标题 + 「发布新行程」主按钮）+ `.seg` 四段（带计数胶囊）+ `.mine-row`（84px 封面、标题与状态徽标、单行元信息、备注、右侧动作列） | `frontend/src/mine/MyTripsPage.tsx`；`docs/prototype/ui.js` `mine()`；`docs/prototype/styles.css` `.seg` / `.mine-row` / `.mr-*` | 一屏信息密度低，行程卡内容（路线、标签、进度条）在聚合页重复；S11「一屏看到所有旅行相关状态」的落点未达成 |
| G-02 | **待处理申请提醒不指向具体行程。** `Alert` 的「去处理」固定跳 `data.published[0]`，待处理申请属于另一条行程时会跳错；行内也没有原型的「申请 · N」入口 | `MyTripsPage.tsx` 的 `pending_application_count` 分支 | AC 2「可点击的提醒入口」在真实数据下可能落空 |
| G-03 | **行内动作缺失。** 我发布的只有「结束行程」；我申请的是整行链接，没有「撤回 / 聊天 / 写体验」；已匹配只有「聊天」；已完成只有分享按钮，没有「查看」 | `MyTripsPage.tsx` 四个分组；对照 `TripDetailPage` 已交付的 `cancelApplication` / `leaveTrip` / 完成态动作 | AC 1「每个条目可跳转到对应行程或申请」只覆盖一半；已交付能力在聚合页不可达 |
| G-04 | **状态不同步。** 页面只在挂载时 `reload()`；在详情页接受 / 取消 / 退出后回到本页会重挂载，但页面长时间停留、跨标签页操作或返回缓存时不会重新拉取 | `MyTripsPage.tsx` 的 `useEffect(() => reload(), [reload])` | AC 3「接受 / 取消后刷新即同步」缺少确定性保障 |
| G-05 | **AC 缺可执行证据。** 现有 E2E 只断言 `#/mine` 标题与两个 tab 存在（`companions.spec.ts`），没有四组数据、提醒跳转、行内动作或状态同步断言 | `e2e/tests/companions.spec.ts:145-147` | S11 三条 AC 均无可回归证据 |
| G-06 | **聚合接口没有按行程的待处理数。** `MyTripsResponse` 只有总 `pendingApplicationCount`，前端无法渲染「申请 · N」，也无法把提醒定位到具体行程 | `MyTripsResponse.java`、`MyTripsServiceImpl.forUser()`、`openapi.yaml` `MyTrips` | G-02 / G-03 的入口只能在前端猜测 |

## 6. 阶段产出

- 本记录：`docs/sdd/refine-my-trips/p0-baseline.md`
- 分支：`feature/refine-my-trips`（worktree `D:\software\training\TATP\RouteMe\RouteME-s11`）
- 未新增代码或规格文件；P1 起才进入提案与规格。

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 2026-11-16 |
| SM | Lewis | 准入 P1；S11 迭代 2 排期确认 | 2026-11-16 |
| IO | WAYNE | REQ-003 为需求来源；单 capability（`trip-companions` MODIFIED） | 2026-11-16 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。** 下一步 P1：意图 / 故事 / 提案。

## 8. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope，并说明与已交付的 `add-trip-companions` / `add-trip-completion` / `add-user-profile` 的关系（不重复实现已交付规则）。
- 缺口 G-01 ~ G-06 可追溯到 REQ-003、`openspec/specs/trip-companions/spec.md`、`design-system` 与 issue #13。
- 明确「保留资料卡与分享入口」：`add-user-profile` 的 `.mine-profile-card` 与 `refine-experience-share` 的「发表 / 修改体验」是既有规格，本 change 不得回退。