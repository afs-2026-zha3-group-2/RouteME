# ATDD 设计 — refine-experience-share

- **Change：** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16 / issue #18）
- **阶段：** P3（ATDD）｜ **日期：** 2026-11-16 ｜ **作者：** Jay（AO）
- **Delta：** `specs/trip-experiences/spec.md`（3 Requirement / 12 Scenario）
- **设计：** `design.md`（D1–D9）

## 1. 测试分层

| 层 | 命令 | 覆盖 |
|---|---|---|
| 单测（node / vitest） | `cd ai4se-baseline/RouteME/frontend; npm test` | 资格三态、既有表单校验不回归 |
| E2E（Playwright） | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/experiences.spec.ts` | 分享页结构、两种不可用提示、重复提交、体验卡封面、既有发布 / 参考发布 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色 | 溢出、封面对比度、列表可读性 |

单测环境是 `environment: 'node'`（`vite.config.ts`），没有 jsdom，因此**不为组件引入 DOM 测试依赖**：把可判定逻辑抽成纯函数（`shareEligibility`），UI 结构交给 E2E。

## 2. 场景 → 测试映射

| # | Delta 场景 | 层 | 用例 / 断言 | 新增? |
|---|---|---|---|---|
| E1 | 具备资格时发布体验 | E2E | `shares an experience and reuses it to publish a new plan`：填写 → 发布 → 详情页出现内容与「强度 · 较累」 | 既有 |
| E2 | 行程未结束时拒绝分享 | E2E + 单测 | E2E：用户 3 打开 `#/share/3`（今天开始、未结束）→ 见「行程结束后才能发表体验」+「当前状态：旅行中」，无表单；单测：`shareEligibility(ongoing)` → `notCompleted` | 新增 |
| E3 | 未参加行程时拒绝分享 | E2E + 单测 | E2E：用户 3 打开 `#/share/1`（已结束、非参加者）→ 见「只有参加过的同行者才能发表体验」，无表单；单测：`notParticipant` | 新增 |
| E4 | 发布者也可以分享 | E2E | 既有用例的用户 1 即所建行程的发布者，可发布 | 既有 |
| E5 | 再次提交即修改 | E2E | 同一条行程二次提交后：详情页 `.experience-list li` 数量不变、内容为最新；入口文案为「修改我的体验」 | 新增 |
| E6 | 内容不满足口径时拒绝 | 单测 + E2E | `experienceForm.test.ts`（既有）；E2E 断言空内容提交时出现「至少写 10 个字」类提示 | 既有 / 补充 |
| E7 | 以三档强度表达体感 | E2E | 既有用例选「较累」→ 详情页「强度 · 较累」 | 既有 |
| E8 | 无图片也能发布并展示内置封面 | E2E | 分享页无「上传图片 / 添加图片」按钮；首页体验卡 `.exp-cover` 可见且含目的地名 | 补充 |
| E9 | 已完成分组区分已分享与未分享 | E2E | 我的旅行 → 已完成分组：未分享行程显示「发表游后体验」，发布后显示「修改我的体验」 | 新增 |
| E10 | 分享页面提示隐私边界 | E2E | 分享页见「分享边界」+ 两条文本；不出现电话 / 证件 / 门牌字段 | 既有扩充 |
| E11 | 分享页展示行程概览 | E2E + 人工 | E2E：`.share-hero` 含标题、目的地、日期、`N 人同行`、`[data-status]`；人工：三宽度无横向溢出 | 新增 |
| E12 | 分享页说明体验去向 | E2E | 分享页见「你的体验会去哪里」+ 三条文本 | 新增 |

## 3. 单测用例（`experiences/shareEligibility.test.ts`）

| id | Given | When | Then |
|---|---|---|---|
| U1 | 行程 `completed`，`participants` 含当前用户 | 调用 `shareEligibility` | `{ kind: 'ready' }` |
| U2 | 行程 `ongoing`，`participants` 含当前用户 | 同上 | `{ kind: 'notCompleted', status: 'ongoing' }` |
| U3 | 行程 `recruiting`，`participants` 不含当前用户 | 同上 | `{ kind: 'notCompleted', status: 'recruiting' }`（状态优先） |
| U4 | 行程 `completed`，`participants` 不含当前用户 | 同上 | `{ kind: 'notParticipant' }` |

## 4. E2E 变更明细（`e2e/tests/experiences.spec.ts`）

| 用例 | 变更 |
|---|---|
| `keeps experience entry points honest` | 拆成两段断言：`#/share/3`（用户 3）→「行程结束后才能发表体验」+ 当前状态；`#/share/1`（用户 3）→「只有参加过的同行者才能发表体验」；用户 1 的 `#/share/1` 保留表单、无上传按钮、见「分享边界」 |
| `shares an experience and reuses it to publish a new plan` | 开头补分享页 hero 与去向三条断言；结束后补「修改我的体验」二次提交与条数不变 |
| `shows seeded experiences in the travel experience view` | 补 `.exp-cover` 可见 + 含目的地名 |
| 新增 `distinguishes shared and unshared completed trips` | 我的旅行 → 已完成分组 → 按钮文案随发布状态变化 |
| 新增 `rejects sharing on a not-yet-completed trip` | 覆盖 E2 | 

> 说明：E2E 使用种子行程 1（已结束，参加者 = 用户 1 / 2）与行程 3（2026-11-16 当天，未结束）；日期断言依赖种子日期，既有用例已同口径。

## 5. 人工走查清单

| 视口 | 检查 |
|---|---|
| 1440 浅色 / 深色 | hero 三段信息不换行错位；去向与边界列表行距一致；体验卡封面与行程卡同色 |
| 768 浅色 / 深色 | hero 允许换行但不溢出；表单全宽 |
| 390 浅色 / 深色 | hero 纵向堆叠；长标题两行内截断；无横向滚动 |

## 6. 验收判据（P4 退出条件）

1. `npm test` 全绿（含 U1–U4）。
2. `npx playwright test tests/experiences.spec.ts` 全绿（含新增用例）。
3. `npm run build` 通过。
4. 后端 `.\mvnw.cmd -B -ntp test` 全绿（回归，不改后端）。
5. 人工走查 6 张截图结论写入 P4 验证报告。