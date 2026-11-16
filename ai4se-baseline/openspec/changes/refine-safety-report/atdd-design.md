# ATDD 设计 — refine-safety-report

- **Change：** `refine-safety-report`（`trip-companions` REMOVED + ADDED，REQ-012 / S14）
- **输入：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（9 场景）、[`design.md`](design.md)、[`tasks.md`](tasks.md)、[`g1-decision.md`](g1-decision.md)（rev2 Follow-ups）
- **裁决依据：** D5 —— 详情页与聊天页的安全提示全部下线，唯一安全能力是页头举报入口（位置 B）。

## 1. 分层策略

| 层 | 本 change 的范围 | 落点 |
|---|---|---|
| **API** | 只做回归。`POST /api/reports` 契约不变：`201` + `{ "received": true }`；无字段、端点或校验变更。 | 既有 `backend/src/test/java/routeme/controller/ReportControllerTest.java` 与 `OpenApiTest.java`；不新增 API 测试。 |
| **E2E** | 学生能感知的全部行为：入口位置与可见性、全部提示的缺失、弹窗文案、回执态、失败重试、隐私红线、窄屏换行。 | 新增 `RouteME/e2e/tests/safety-report.spec.ts`；`companions.spec.ts` 与 `profiles.spec.ts` 各改若干断言。 |
| **延后到 `/sdd:atdd-apply`（单元级 TDD）** | `received !== true` → 失败、`targetLabel` 透传、原因标签 ↔ 枚举表。三者都是常量表或单行比较，没有值得写单测的分支；仓库没有组件测试框架（vitest 只覆盖纯模块）。 | 由 apply 阶段判断；本文不规划单测套件。 |

`applicationEntryState`（发布者判定）已有 `frontend/src/trips/applicationEntry.test.ts`，本 change 只消费它。

**为什么不做 API 层工作。** 回执由后端产出（`ReportReceiptResponse.received`），前端只负责呈现。风险在 UI 侧，验收证据必须是用户可见的路径；API 作为回归钉子，而不是重新设计。

## 2. 先于实现写什么

| 顺序 | 先写的工件 | 为什么是红的 |
|---|---|---|
| 1 | `e2e/tests/safety-report.spec.ts`（新增，E1–E7）+ `e2e/tests/support.ts`（从 `companions.spec.ts` 抽出的公共 helper） | 页头没有入口；`SafetyNote` 仍在渲染；弹窗标题与回执文案仍是旧的 |
| 2 | `companions.spec.ts` 回执用例的三处断言改为 `举报这位用户` / `已收到，我们会处理` / `关闭` | 旧回执文案、回执态两个 `取消` 按钮 |
| 3 | `profiles.spec.ts` 的 `keeps the existing trip report entry working` 改指页头入口与新弹窗标题 | `SafetyNote` 的举报按钮已不存在 |
| 4 | 生产代码（T2–T5） | — |

上述 E2E 在 T2 开工前必须在当前 `main` 上真实失败；不为已经通过的代码补验收。

## 3. 本地与 CI 门禁

不另立 CI 语义，只消费既有 `.github/workflows/ci.yml`。

| 门禁 | 命令 | 期望 |
|---|---|---|
| CI — backend | `ai4se-baseline/RouteME/backend`：`./mvnw -B -ntp verify` | 绿。`ReportControllerTest`（201 + `received=true`）与 `OpenApiTest` 不变。 |
| CI — frontend | `ai4se-baseline/RouteME/frontend`：`npm run build && npm test` | 绿。`build` 内含 `tsc --noEmit`；`test` 为 vitest。 |
| 本地 — E2E（不在 CI） | `ai4se-baseline/RouteME/e2e`：`npm run test`，后端 `:8080`、Vite `:5173` | 全套绿，含新 spec。 |
| 本地 — 响应式 | 新 spec 内 `setViewportSize` 覆盖 390 / 768 / 1440，并按同三档人工核对 | 每档入口可见、`scrollWidth <= innerWidth`、无提示文案。 |

E2E 仍只在本地执行（见 `consistency-lint.md` 残余风险）；P4 在 `p4-verify.md` 记录真实命令与输出。

## 4. 数据与夹具

- `e2e/tests/support.ts` 导出 `loginAs`、`switchUser`、`todayIso`、`createTripViaApi`、`applyViaApi`、`acceptApplicationViaApi`；`companions.spec.ts` 改为引用，不再保留局部副本。出现第二个消费者是抽取的正当理由，且不改变任何测试行为。
- **归属：** 每条测试用 API 自建所需行程，标题带 `${Date.now()}` 保证唯一，使用用户 1 与用户 2。只读夹具（行程 1、聊天 `/#/chat/1/2`）与行程 5 属种子数据，测试不修改。
- **清理：** 不清理，与既有套件一致（`workers: 1`、`fullyParallel: false`、无 teardown）。新建行程在用例结束后不再被引用。
- **故障注入：** `page.route('**/api/reports', …)` 只拦截被测 POST，重试前用 `page.unroute` 解除，避免跨用例残留。

## 5. 场景 → 测试映射

| # | 场景（Delta Spec） | 层 | 用例 |
|---|---|---|---|
| 1 | 分区展示我的旅行 | E2E | 既有 `companions.spec.ts › applies, gets accepted, chats, reports and leaves` 断言四个 Tab（我发布的 / 我申请的 / 已匹配 / 已完成）；不新增用例。 |
| 2 | 待处理申请提醒 | E2E | 由 `trips.spec.ts` 的待处理提醒覆盖；本 change 不改。 |
| 3 | 详情页页头举报入口 | E2E | **E1** `shows the trip report entry in the detail header and no safety hint` —— `.detail-badges` 内有按钮 `举报这条行程`；`.safety-note` 计数 0；文本 `安全提示` 计数 0；`focus()` 后 `Enter` 打开弹窗（键盘与可访问名）。三档：1440 / 768 入口与状态标签同一行且靠右（`boundingBox` 的 `y` 落在标签行区间内、入口右缘贴近卡片右缘），390 允许换行但必须可见、不溢出。 |
| 4 | 聊天页页头举报入口 | E2E | **E2** `keeps the chat report entry in the header, including read-only chats` —— `/#/chat/1/2`（已结束）显示 `举报这位用户`，`该行程已结束，只能查看历史消息。` 仍在，`.safety-note` 计数 0；三档可见性同上。 |
| 5 | 举报弹窗内容 | E2E | **E3** `shows the target, four reasons, confidentiality and emergency text` —— 弹窗标题等于入口文案；目标行含行程标题；四类原因齐全；说明标签含 `200 字以内`；两段隐私文案齐全。 |
| 6 | 本人行程不出现举报入口 | E2E | **E4** `hides the entry on your own trip but keeps the pre-publish note` —— 本人行程：`举报这条行程` 计数 0、`.safety-note` 计数 0；`/#/share/1` 仍有 `安全提示`，且匹配 `/^举报/` 的按钮计数 0。 |
| 7 | 提交举报并收到回执 | E2E + API 断言 | **E5** `submits once, shows the receipt and closes without changing state` —— `waitForResponse` 命中 `POST /api/reports`，断言 `201` 与 body `received === true`；回执文案 `已收到，我们会处理`；footer 只有一个可用按钮 `关闭`；关闭后聊天消息列表不变。 |
| 8 | 提交失败可读且可重试 | E2E | **E6** `keeps the reason and note on failure and retries to a single receipt` —— 拦截 `500` 后出现 `举报提交失败`，原因仍为 `安全风险`，说明内容保留；`unroute` 后重试进入回执态，回执文案计数 1。 |
| 9 | 举报弹窗不展示隐私字段 | E2E | **E7** `never exposes private contact fields on the safety surfaces` —— 详情页、聊天页与打开中的弹窗均不含 `电话：`、`身份证`、`门牌`、`证件号`。 |

四类原因与枚举保持现有四对（`harassment` 骚扰或不当言行、`fake` 虚假信息、`safety` 安全风险、`other` 其他），弹窗继续以 `REASON_OPTIONS` 为唯一来源；测试只断言标签，契约不受影响。

## 6. 非目标反向验证

| # | 非目标 | 反向检查 | Owner |
|---|---|---|---|
| RV-1 | 详情页不再出现安全提示 | `.safety-note` 计数 0、`安全提示` 计数 0（E1） | T1 |
| RV-2 | 聊天页不再出现安全提示 | `.safety-note` 计数 0、`安全提示` 计数 0（E2） | T1 |
| RV-3 | 本人行程没有举报入口 | `举报这条行程` 计数 0（E4） | T1 |
| RV-4 | 体验发布页保留发布前提醒且不增加举报入口 | `/#/share/1`（已结束行程，用户 1 为同行者）：`安全提示` 可见，`/^举报/` 按钮计数 0（E4） | T1 |
| RV-5 | 不采集、不展示隐私字段 | 详情 / 聊天 / 弹窗三处黑名单扫描（E7）；`profiles.spec.ts` 的资料弹窗黑名单保持绿 | T1 |
| RV-6 | 不新增后端、契约、迁移或处置面 | `git diff main -- RouteME/backend RouteME/openapi.yaml` 为空；`ReportControllerTest` / `OpenApiTest` 未改且绿（T6） | T5 |
| RV-7 | 页头入口在窄屏不隐藏 | E1 / E2 内的 390 / 768 / 1440 循环：每档可见，`scrollWidth <= innerWidth` | T1、T5 |

RV-7 是回归守卫，不是新场景：Delta 把「窄屏换行不隐藏」写在场景 #3/#4 内，因此对两个入口同时断言。

## 7. 既有测试改动（P4 同批提交）

| 文件 | 位置（用例 / 符号） | 改动 |
|---|---|---|
| `e2e/tests/companions.spec.ts` | `applies, gets accepted, chats, reports and leaves` 的举报入口查询 | `getByRole('button', { name: /举\s*报/ })` → `{ name: '举报这位用户' }`（聊天页页头已是唯一入口） |
| `e2e/tests/companions.spec.ts` | 同用例的回执文案断言 | `举报已收到，我们会记录处理。` → `已收到，我们会处理` |
| `e2e/tests/companions.spec.ts` | 同用例的回执态关闭 | `.ant-modal-footer .ant-btn-primary` → `getByRole('button', { name: '关闭' })` |
| `e2e/tests/profiles.spec.ts` | `keeps the existing trip report entry working` 的入口与期望文本 | `SafetyNote` 上的 `/^举\s*报$/` → `.detail-badges` 内的 `举报这条行程`；期望文本 `举报行程或用户` → `举报这条行程` |

`profiles.spec.ts` 的资料弹窗黑名单保留 `举报这位用户`：它断言资料弹窗没有举报入口，与聊天页页头无关。

## 8. NFR 测试

**本 change 不纳入，已显式记录。** 本次不新增端点、存储、后台任务或异步路径，没有性能、韧性、可观测性可测面。无障碍与窄屏行为没有延后：它们作为验收断言（场景 #3/#4 与 RV-7）落地，不单列 NFR 章节。若后续重新引入提示或增加举报处置，需重新确认 NFR 范围。

## 9. 本文的非目标

不写生产代码、不产出完整 `tasks.md`、不设计单测套件、不引入 Playwright/POM/Excel 生成器、不新建第二套 CI 语义。