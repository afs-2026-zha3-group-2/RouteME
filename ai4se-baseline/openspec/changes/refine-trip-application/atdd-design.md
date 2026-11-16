# ATDD 设计：refine-trip-application

- **Change:** `refine-trip-application`（REQ-010 / S08；`trip-companions` MODIFIED）
- **依据：** [`proposal.md`](proposal.md)、[`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)、`requirement-workspace/requirements/REQ-010-trip-application-entry.md`
- **规则：** `@rule:web-testing`、`@rule:web-coding-style`、`@rule:sdd-artifacts`、`@rule:spec-first`
- **视觉基准：** `docs/prototype/ui.js` `actionBox`、`docs/prototype/styles.css`、`docs/prototype/store.js` `canApply`
- **范围提醒：** 无后端、契约、迁移或状态机改动；ATDD 只规划 **E2E 验收** 与 **既有 API 回归**，纯逻辑单元测试留给 `/sdd:atdd-apply`。

## 1. ATDD 分层范围

### 1.1 分层结论

| 层 | 本 change 的用法 |
|---|---|
| **E2E** | 8 个场景全部通过行程详情页观察：内联申请区、提交后待处理、刷新保持、撤回恢复、本人无入口、重复提示、满员 / 结束原因、页面停留期间状态变化 |
| **API 回归** | 不新增用例；`ApplicationControllerTest` 的本人 / 重复 / 满员 / 已结束 / 空说明 / 超长说明 / 取消用例，以及 `ApplicationServiceTest` 的状态迁移用例作为门禁（后端零改动） |
| **Defer UT** | 抽出的纯函数 `applicationEntryState` 与 `applicationErrorMessage` 在 apply 阶段用 Vitest 做单元 TDD；不在本文件展开 UT 套件 |

**推荐附加层（advisory，不设门禁）：** Compatibility（1440 / 1024 / 768 / 390 宽度、键盘 Tab、读屏名称）；Security（后端拒绝，不只依赖前端隐藏）。

### 1.2 场景分类

| # | 场景（Delta） | 层 | 依据 |
|---|---|---|---|
| E1 | 可申请行程展示内联申请区 | E2E | THEN 断言页面表单、按钮、聊天说明可见，且无弹窗 |
| E2 | 提交申请并进入待处理 | E2E | 表单提交 → 等待提示 + 撤回；刷新后仍为待处理 |
| E3 | 说明选填且不超过 120 字 | E2E + API 回归 | 空说明提交成功由 E2E 覆盖；`in_blankMessage_out_nullMessage` / `in_messageOverLimit_out_invalidInput` 回归 |
| E4 | 不能申请自己发布的行程 | E2E + API 回归 | 详情页无表单；`in_ownTrip_out_forbidden` 回归 |
| E5 | 不能重复申请 | E2E + API 回归 | 停留页提交 → 409 提示；`in_existingPendingApplication_out_duplicate` 回归 |
| E6 | 已满员或已结束的行程不能申请 | E2E + API 回归 | 入口不可用 + 原因；`in_fullTrip_out_notOpen` / `in_completedTrip_out_notOpen` 回归 |
| E7 | 处理前取消申请 | E2E + API 回归 | 撤回后状态「已取消」、表单恢复；`in_pendingApplication_out_cancelled` 回归 |
| E8 | 页面停留期间行程状态变化 | E2E | 客户端快照过期 → 提交 → 服务端拒绝 → 刷新后无表单 |

**Defer UT（apply 阶段，同目录 `applicationEntry.test.ts`）：**

| 纯函数 | 必需用例 |
|---|---|
| `applicationEntryState` | `publisher`；`pending`；`accepted`；`completed → unavailable`；`full → unavailable`；`recruiting + no application → apply`；**满员且已有 pending / accepted 时仍返回 pending / accepted**（保留聊天与撤回） |
| `applicationErrorMessage` | `DUPLICATE_APPLICATION → 已申请，请等待回应`；`TRIP_NOT_OPEN + full → 人数已满`；`TRIP_NOT_OPEN + completed → 行程已结束`；`TRIP_NOT_OPEN + recruiting → 当前不可申请`；未知错误码 → `null`（回退到原始错误码） |

## 2. 生产代码前先写的检查

先改 `RouteME/e2e/tests/companions.spec.ts` 并看到失败（red），再进入实现。E2E 用英文陈述句命名，选择器优先 `getByRole` / `getByPlaceholder` / `getByText`。

| 用例名（English statement） | 覆盖 | 关键断言 |
|---|---|---|
| `applies inline and keeps the pending state after reload` | E1 / E2 / E3 | 详情页出现原型 placeholder 的 `textbox` 与「提交同行申请」；无 `role="dialog"`；输入 130 字后值长度仍为 120；填写后提交 → 出现「申请已提交，等待 陈屿 回应。处理前你可以随时撤回。」与「撤回申请」，表单消失；`reload()` 后仍为待处理 |
| `blocks a duplicate application submitted from a stale page` | E5 / E8 | 打开可申请详情后，用 `page.request` 以当前用户提交申请，再让第三人申请并被接受至满员；页面仍点「提交同行申请」→ 出现「已申请，请等待回应」，刷新为待处理，`/me/applications` 中该行程仍只有 1 条 |
| `rejects a submission after the trip fills and shows the reason` | E6 / E8 | 打开详情后由第三人申请并被接受至满员；仍提交 → 展示「人数已满」；刷新后无表单、无「提交同行申请」 |
| `rejects a submission after the trip ends` | E6 / E8 | 打开详情后由发布者结束行程；仍提交 → 展示「行程已结束」；刷新后无表单 |
| `withdraws a pending application and restores the inline form` | E2 / E7 | 空说明提交成功且 `/me/applications` 的 `message` 为 `null`；点「撤回申请」→ 确认弹窗 → 状态「已取消」；表单恢复；刷新后仍可申请 |
| `keeps companion entry points honest`（改造既有用例） | E4 | 自己发布的行程无 `textbox`、无「提交同行申请」；「查看同行的申请」「标记为已结束」仍可见；既有聊天只读断言保留 |

**改造既有用例：** `applies, gets accepted, chats, reports and leaves` 的申请段从「点申请按钮 → 弹窗填写」改为「直接填写内联 `textbox` → 提交 → 待处理提示」；接受、聊天、举报、退出断言保持不动。

**API 回归（不新增用例）：** `ApplicationControllerTest` 的 `in_openTrip_out_pendingApplication`、`in_blankMessage_out_nullMessage`、`in_ownTrip_out_forbidden`、`in_existingPendingApplication_out_duplicate`、`in_fullTrip_out_notOpen`、`in_completedTrip_out_notOpen`、`in_messageOverLimit_out_invalidInput`、`in_pendingApplication_out_cancelled`；`ApplicationServiceTest` 的接受 / 拒绝 / 名额 / 重申请迁移用例；`openapi.yaml` 不修改。

**Defer UT：** 见 §1.2 两个纯函数；组件渲染与交互不写 UT，由 E2E 覆盖。

## 3. 本地 vs CI 门禁

| 门禁 | 命令 | 期望 |
|---|---|---|
| 类型检查 / 构建 | `cd RouteME/frontend; npm run build` | 0 error |
| 前端单元 | `cd RouteME/frontend; npm test` | 全绿（含新增 `applicationEntry.test.ts`） |
| 后端回归 | `cd RouteME/backend; .\mvnw.cmd -B test` | 全绿（无后端改动） |
| E2E | 启动后端 `8080` + 前端 `5173` 后 `cd RouteME/e2e; npx playwright test tests/companions.spec.ts` | 改造与新增用例全绿 |
| 手工 | 1440 / 1024 / 768 / 390；浅色 / 深色；键盘 Tab | 申请区不溢出；说明、提交、撤回可用键盘到达；读屏能读出提示 |
| 规格 | `openspec validate refine-trip-application --strict` | valid |

CI 沿用 `.github/workflows/ci.yml` 的后端 `mvnw -B -ntp verify` 与前端 `npm run build && npm test`；E2E 仍为本地门禁，不新增 CI 语义。

## 4. 数据 / Fixtures 策略

- **身份：** 沿用 `loginAs` 写入 `routeme.currentUserId`；申请者为 `1`，发布者为 `2`，补位用户为 `3`。
- **行程：** 继续用 `page.request.post('/api/trips')` 创建唯一标题 `E2E 申请 ... ${Date.now()}`；容量按用例取 2 或 3。
- **制造状态：** 第三人申请用 `POST /api/trips/{id}/applications`；接受用 `GET /api/trips/{id}/applications` 找到 `applicant.id === 3` 的记录后 `POST /api/applications/{id}/accept`；结束用 `POST /api/trips/{id}/complete`。
- **停留页快照：** 所有「页面停留期间」用例先 `goto` 详情完成首屏加载，再用 `page.request` 制造服务端变化，**不刷新**，最后点击仍可见的提交按钮。
- **清理：** 仍在招募中的测试行程在用例末尾由发布者 `complete`，避免阻塞首页默认列表；满员 / 已结束行程不再出现在默认列表。不做数据库删除。
- **断言等待：** 一律用 `expect(...)` 自动重试断言，不使用 `waitForTimeout`。

## 5. Non-goals 与反向验证

| 反向用例 | 断言 |
|---|---|
| RV-1 不自动加入团队、提交后不开放聊天 | 申请 pending 时访问 `/chat/{tripId}/{publisherId}` 仍提示「只有已匹配的同行者可以沟通。」（既有用例保留） |
| RV-2 不新增端点 / 不改契约 / 不迁移 | `openapi.yaml`、`backend/**`、`db/migration/**` 无 diff；`ApplicationServiceTest` 仅回归 |
| RV-3 不做行程卡片入口 | 首页卡片不存在「提交同行申请」或申请 `textbox` |
| RV-4 不用弹窗承载申请表单 | 内联表单可见时 `getByRole('dialog')` 数量为 0；提交不打开弹窗 |
| RV-5 不做通知 / 推送 / 批量申请 | 申请区只有说明、提交、撤回；无「开启推送」等入口 |
| RV-6 说明仍为选填 | 空说明提交成功，且接口返回 `message: null` |

## 6. NFR 测试（可选）

- 用户明确要求「不做多余的扩展」，未提出性能、容量或可观测性目标 → **deferred / out of scope**；不新增监控指标、SLA 或压测。
- 可访问性不单列 NFR 套件：E2E 用语义选择器覆盖，手工走查键盘与三档宽度；对比度沿用既有设计令牌。
- 兼容性作为 advisory：手工看 1440 / 1024 / 768 / 390，不做多浏览器矩阵。

## 7. 交付边界

- **本设计产出：** 分层、red 用例清单、门禁、fixtures、反向验证、NFR 取舍。
- **不产出：** 生产代码、E2E 代码、完整 UT 套件；这些属 `/sdd:atdd-apply`。
- **下一步：** `/sdd:task-plan`（`design.md` + `tasks.md` + 对齐自检）。
