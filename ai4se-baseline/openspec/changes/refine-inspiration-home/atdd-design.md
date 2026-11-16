# ATDD 设计：refine-inspiration-home

- **Change:** `refine-inspiration-home`（REQ-005 / S03）
- **依据：** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:web-testing`、`@rule:web-coding-style`、`@rule:sdd-artifacts`
- **范围提醒：** 本 change 无后端、契约、迁移或状态机改动；ATDD 只规划 **API 回归** 与 **E2E 验收**，纯逻辑项留给 `/sdd:atdd-apply` 的单元 TDD。

## 1. ATDD 分层范围

### 1.1 分层结论

| 层 | 本 change 的用法 |
|---|---|
| **E2E** | 全部新增验收：默认视图、卡片信息、状态可辨识、视图切换、双空态、加载态 |
| **API** | 不新增验收；仅把既有 `GET /api/matches`、`GET /api/experiences` 的后端测试作为回归门禁 |
| **Defer UT** | 若实现抽出 `statusIcon` 映射或纯格式化函数，apply 阶段补同目录单元测试；组件渲染与视图切换不写 UT |

**实现事实校正（不改变范围）：** 默认「招募中的行程」视图当前消费 `GET /api/matches`（`useMatches` → `loadMatches`），不是 proposal §决策里写的 `GET /api/trips`。`/api/matches` 是 REQ-003 的既有契约，且只返回未结束行程（`TripPlanService.findOpen`），保留它才能保留匹配环与匹配理由。本 change 继续消费 `/api/matches` + `GET /api/experiences`，**不新增端点、不改响应形状**；该偏差记入 `design.md` D8，并在 P3 质量报告 Notes 中标注。

### 1.2 场景分类

| # | 场景（Delta） | 层 | 依据 |
|---|---|---|---|
| E1 | 默认视图为「招募中的行程」 | E2E | 断言可访问的选中项与默认卡片集合 |
| E2 | 默认列表与卡片信息 | E2E | 用户可见字段组合 |
| E3 | 已满员与招募中可区分 | E2E | 状态文字 + 图标 + 人数进度满格的结构断言 |
| E4 | 已结束与已取消不出现在默认视图 | E2E | 「数据不出现」需走完整列表路径 |
| E5 | 加载中展示骨架 | E2E | 页面状态与网络时序 |
| E6 | 无结果时展示空状态并保留条件 | E2E | 用户操作 → 空态 → 清除条件 |
| E7 | 分页浏览（既有） | E2E 回归 | 不改行为，跑既有用例 |
| E8 | 筛选变化重置分页（既有） | E2E 回归 | 不改行为，跑既有用例 |
| E9 | 切换到旅行体验视图 | E2E | 跨视图内容替换 + 数量 |
| E10 | 体验卡标识来源行程已结束 | E2E | 用户可见标识 + 非颜色信号 |
| E11 | 体验筛选与倒序（既有） | E2E 回归 | 不改行为 |
| E12 | 体验分页与筛选并用（既有） | E2E 回归 | 不改行为 |
| E13 | 筛选变化重置体验分页（既有） | E2E 回归 | 不改行为 |
| E14 | 体验空态 | E2E | 空态 + 「去发布行程」 |
| E15 | 体验视图加载态 | E2E | 骨架且不残留行程卡 |
| R1 | 无新增聚合端点 | API 契约检查 + E2E 网络观察 | `openapi.yaml` 不改；首页只发既有请求 |
| R2 | 已结束不混入默认列表 | E2E | E4 的反向断言 |
| R3 | 发布 / 详情 / 申请 / 聊天 / 分享不在首页 | E2E | 首页无对应入口 |
| R4 | 体验视图不出现日期 / 排序筛选 | E2E | 保持 out of scope |
| R5 | 不做单视图深链 | E2E | 切换后 hash 不变 |

## 2. 生产代码前先写的检查

先改 / 新增下列 E2E 用例并看到失败（red），再进入实现：

| 文件 | 用例名（English statement） | 关键断言 |
|---|---|---|
| `e2e/tests/trips.spec.ts` | `defaults to the recruiting trips view with complete cards` | `getByRole('radio', { name: '招募中的行程' })` 已选中；`.trip-card` 有标题、目的地、日期、路线、标签、发布者、人数、状态文字 |
| `e2e/tests/trips.spec.ts` | `distinguishes full trips from recruiting trips without color alone` | 已满员卡有 `[data-status-icon="full"]` + 「已满员」；招募中卡有 `[data-status-icon="recruiting"]` + 「招募中」；仅满员卡 `.meter.full` |
| `e2e/tests/trips.spec.ts` | `keeps ended trips out of the default view` | 「珠海情侣路摄影一日游」「清远英西峰林两日露营」不出现 |
| `e2e/tests/experiences.spec.ts` | `switches to the experience view and marks ended origin trips` | `.exp-card` 取代 `.trip-card`；每卡有 `[data-status="completed"]` 与「已结束」；展示体验数量 |
| `e2e/tests/experiences.spec.ts` | `guides an empty search to publish from both views` | 两个视图空态均出现「去发布行程」，点击后到 `#/trips/new`；招募视图保留可清除条件 |
| `e2e/tests/experiences.spec.ts` | `shows skeletons instead of the previous view while lists load` | 延迟 `/api/matches` 与 `/api/experiences` 时出现 `[aria-busy="true"]`，且无上一视图卡片 |

同时修复既有选择器漂移：`experiences.spec.ts` 的 `.experience-card` → `.exp-card`（否则 E9–E12 无法稳定运行）。

**API 回归（不新增用例）：** 后端既有 `TripControllerTest` / `MatchControllerTest` / `ExperienceControllerTest` 与 `OpenApiTest` 作为门禁；`openapi.yaml` 不修改。

## 3. 本地 vs CI 门禁

| 门禁 | 命令 | 期望 |
|---|---|---|
| 类型检查 / 构建 | `cd RouteME/frontend; npm run build` | 0 error |
| 前端单元 | `cd RouteME/frontend; npm test` | 全绿（既有 34 项，含新增纯逻辑测试时递增） |
| 后端回归 | `cd RouteME/backend; .\mvnw.cmd -B test` | 全绿（无代码改动，作为契约回归） |
| E2E | 启动后端 `8080` + 前端 `5173` 后 `cd RouteME/e2e; npx playwright test` | 全绿；至少跑受影响的两个 spec |
| 手工 | 390 / 768 / 1440 三档宽度 | 卡片不溢出、状态徽标不挤压目的地 |

不新增 CI 语义；沿用仓库现有 `npm run build` / `npm test` / `npx playwright test`。

## 4. 数据 / Fixtures 策略

- **种子数据即 fixture：** `V4__seed_demo_trips.sql` 提供 6 条行程（4 条未结束，其中「佛山祖庙与岭南天地一日」2/2 已满员；2 条已结束）；`V8__create_trip_experiences.sql` 提供 2 条体验，均来自已结束行程。
- **空态：** 用唯一关键词搜索（如 `无结果-${Date.now()}`）制造零命中，不删除种子数据、不改数据库。
- **加载态：** `page.route` 拦截 `/api/matches` 或 `/api/experiences`，用可控 Promise 延迟放行；断言 `[aria-busy="true"]` 后再 `release()`。禁止 `waitForTimeout`。
- **新建数据：** 沿用既有时间戳标题；断言前先按唯一标题筛选，不假设新记录落在第一页。
- **清理：** E2E 不清理种子数据；测试创建的行程由既有演示库累积，保持现状。

## 5. Non-goals 与反向验证

| 反向用例 | 断言 |
|---|---|
| RV-1 无新增端点 | 首页加载只出现 `/api/matches` 与 `/api/experiences`（及既有问候语）；`openapi.yaml` 无 diff |
| RV-2 已结束不混入默认列表 | 默认视图找不到两条已结束行程的卡片 |
| RV-3 首页不承载发布 / 申请 / 聊天 / 分享发布 | 首页无「申请同行」「标记为已结束」「发布体验」等按钮 |
| RV-4 体验视图不补日期 / 排序筛选 | 体验视图无「出发不早于」「排序」控件（沿用既有筛选集合） |
| RV-5 不做单视图深链 | 切换视图后 URL hash 仍为首页路由，无 `?view=` / `#/experiences` |

## 6. NFR 测试（可选）

- 用户未指定性能、容量或可用性目标 → **deferred / out of scope**。
- 可访问性不单列 NFR 套件：默认视图选中标识与状态文字通过 `getByRole` / 文本断言覆盖；第二非颜色信号用 `data-status-icon` 做结构断言。