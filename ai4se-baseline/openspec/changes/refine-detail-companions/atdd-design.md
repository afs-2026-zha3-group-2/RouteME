# ATDD design — refine-detail-companions

- **Change：** `refine-detail-companions`（`trip-plans` MODIFIED，REQ-020）
- **Inputs：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)（1 Requirement / 12 Scenario）、[`proposal.md`](proposal.md)、[`g1-decision.md`](g1-decision.md)（G1 Pass）、`requirement-workspace/impact-brief.md` §20
- **边界：** 零后端 / 零契约 / 零迁移；纯前端展示层改造

## 1. ATDD 层范围

| # | 场景（Delta） | 层 | 用例锚点 | 判定依据 |
|---|---|---|---|---|
| 1 | 查看行程详情 | E2E | `detail-companions.spec.ts` › shows companion cards and keeps the publisher out of the list | UI 可见结果 |
| 2 | 同行者资料卡展示 | E2E | 同上（2 张卡、头像 / 昵称 / 摘要 / 简介 / 标签） | UI 渲染 |
| 3 | 同行者字段回退 | E2E | `…` › falls back to job or nickname when profile fields are missing | 需真实用户资料差异 |
| 4 | 发布者不在同行者列表重复 | E2E | 同 #1（发布者按钮计数 = 1） | 「不得出现」需整页证明 |
| 5 | 没有其他同行者时的空态 | E2E | `…` › renders a readable empty state when only the publisher joined | UI 文案 |
| 6 | 打开同行者公开资料 | E2E | `…` › opens a companion profile without leaving the detail page | 跨组件（弹窗）+ URL 不变 |
| 7 | 同行者卡片聊天入口按资格显示 | E2E | `…` › shows the chat entry to the publisher and companions but not to outsiders | 三种身份差异 |
| 8 | 同行者人数口径与排序不变 | E2E + API 守卫 | 同 #1（`已加入 3/4 人`、顺序等于响应顺序）；A1（见下） | 人数口径跨页头与列表 |
| 9 | 窄屏与双主题不溢出 | E2E | `…` › keeps companion cards inside the viewport in both themes | 视口 + 主题组合 |
| 10 | 状态标识清晰 | 既有 E2E | `trips.spec.ts` › distinguishes full trips… / keeps ended trips… | 基线不变 |
| 11 | 同行申请入口按资格显示 | 既有 E2E | `companions.spec.ts` › keeps companion entry points honest | 基线不变 |
| 12 | 已结束行程展示游后分享区占位 | 既有 E2E | `trips.spec.ts` › publisher ends an ongoing trip…；`experiences.spec.ts` | 基线不变 |

**API 层：** 仅一条反向守卫 A1（`GET /api/trips/{id}` 的 `participants` 仍含发布者、条数与资料字段不变）。它不是新增验收，预期首次运行即绿，用于守住「零契约 / 零后端」这条 Non-goal；若它变红说明实现方向错了。

**Deferred to `/sdd:atdd-apply`（unit-level TDD）：**

- `frontend/src/trips/companions.ts`：`tripCompanions(participants, publisherId)` — 过滤发布者、按 id 去重（保留首次出现）、保持后端顺序；测试放同目录 `companions.test.ts`。
- 摘要回退直接复用既有 `publisherSummary`（`profileDisplay.test.ts` 已覆盖学校 · 专业 → 职业 → 城市 → 空串）。
- **不新增组件测试层：** 本仓库 `vitest` 为 `environment: node` 且只收 `src/**/*.test.ts`，没有 Testing Library / jsdom；引入属于独立基础设施变更。`@rule:web-testing` 的阻断项（纯逻辑单测 + 受影响 E2E）由上述两层满足，组件渲染由 E2E 覆盖，已记入残余风险。

## 2. 生产代码之前先写什么

先定锚点（测试先于实现）：

| 锚点 | 取值 |
|---|---|
| 列表容器 | `ul.detail-companions`（替换 `ul.detail-participants`） |
| 单卡 | `li.companion-card`；卡片主体 `button`，`aria-label="查看 {昵称} 的资料"` |
| 卡内排版 | 复用 `.publisher-row / .publisher-body / .publisher-name / .publisher-bio / .publisher-tags`，保证与发布者卡片同密度 |
| 聊天入口 | `a.companion-chat`，文案沿用 `tripMessages.mineChatEntry` |
| 空态 | `p.detail-companions-empty`，文案「还没有其他同行者。」 |

Red 顺序：

| 步骤 | 内容 | 预期观察 |
|---|---|---|
| Red A | 新增 `e2e/tests/detail-companions.spec.ts`（#1–#9） | `.detail-companions` / `.companion-card` 不存在，用例失败 |
| Red B | `chat-entry.spec.ts` 选择器改为 `.detail-companions` | 聊天入口定位失败 |
| Red C | `companions.test.ts`（apply 时） | 模块不存在，导入失败 |
| Green | 原型 → `companions.ts` → `CompanionCard` → `TripDetailPage` → `styles.css` | A/B/C 全绿 |
| 守卫 | A1 写在 `detail-companions.spec.ts` 首个用例 | 首次运行即绿，绿灯持续 |

## 3. 本地与 CI 门禁

- 本地（`@rule:web-testing` 提交前验证，不新增脚本）：
  - `npm run typecheck`、`npm run build`、`npm test`（`RouteME/frontend`）
  - `npx playwright test tests/detail-companions.spec.ts tests/chat-entry.spec.ts`（需后端 + 前端已启动）
  - 界面改动回归：`npx playwright test tests/trips.spec.ts tests/companions.spec.ts`
- CI：沿用现有流水线，不新增阶段、不新增同义脚本。零后端改动，仍跑一次 `mvnw.cmd test` 确认未误伤。

## 4. 数据 / fixtures 策略

复用 `e2e/tests/support.ts`：`createTripViaApi`（`capacity`）、`applyViaApi`、`acceptApplicationViaApi`、`loginAs` / `switchUser`。

| 身份 | 来源 | 用途 |
|---|---|---|
| 发布者 | id 2 陈屿（`school='研一 · 地理科学'`） | 发布 + 接受申请 + 聊天入口资格 |
| 同行者 A | id 1 林见夏 | 常规卡片、本人无自我聊天入口 |
| 同行者 B | id 4 周野（`school=''`、`job='产品经理'`） | 摘要回退到职业 |
| 稀疏同行者 | `POST /api/auth/register`（仅 username / password / nickname）→ `applyViaApi`（`X-User-Id`） | 仅头像 + 昵称，验证不渲染空占位 |
| 旁观者 | id 3 苏念（未申请） | 无聊天入口 |

- 标题带 `Date.now()` 后缀，断言只落在本次创建的行程内；不清理共享数据库（既有约定：先按唯一标题 / id 定位）。
- 人数口径用 `capacity: 4` + 2 位同行者 → `已加入 3/4 人`。
- 视口与主题：`page.setViewportSize` + `page.emulateMedia({ colorScheme })` 在 `goto` 前设置；若主题未生效再回退写 `localStorage['routeme.colorMode']`。

## 5. Non-goals 与反向验证

| 编号 | Non-goal | 反向验证 |
|---|---|---|
| N1 | 不改接口字段 / 端点 / 迁移 / 契约 | A1：`GET /api/trips/{id}` 的 `participants` 仍含发布者、3 条、字段完整；P4 用 `git diff --name-only` 复核无 `backend/**`、`openapi.yaml`、`db/migration/**` |
| N2 | 不重做发布者卡片 | #1 断言发布者资料按钮只有 1 个且仍打开「旅行者资料」 |
| N3 | 不新增聊天权限 | #7 旁观者卡片聊天入口计数为 0；已接受者只对自己的卡隐藏 |
| N4 | 不改排序与人数口径 | #1 断言 3/4 与卡序等于响应顺序（不重排） |

本 skill 自身非目标：不写业务实现、不产出完整 UT 套件计划、不生成 Playwright/POM/Excel 用例、不新建 CI 产品。

## 6. NFR 测试（已询问，2026-11-17）

用户确认：**NFR 测试不纳入本 change**。性能、可观测性、韧性无变化；窄屏与双主题属验收场景 #9，不作为 NFR 单列。后续如需补充，另开 change。
