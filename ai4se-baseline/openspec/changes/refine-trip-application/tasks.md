# 任务：refine-trip-application

- **依据：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** AO（Jay）｜ **协助：** VL（Neal）在 P4 独立验证，SA（Jacky）在 G3 前复核 Living Spec 收口
- **顺序：** T1 → T2 → T3 → T4 → T5；T1 先写失败验收（red），再进入实现。T6 属 P5 / G3 前动作，不在 P4 执行。
- **契约：** 无契约改动；既有 `POST /api/trips/{tripId}/applications`、`POST /api/applications/{applicationId}/cancel` 与 `ApplicationControllerTest` 作为回归门禁。
- **视觉基准：** `docs/prototype/ui.js` `actionBox`、`docs/prototype/styles.css`；不改原型。

## 任务清单

### T1 [tests] 先改 / 补同行申请 E2E 验收

- [ ] 改造 `RouteME/e2e/tests/companions.spec.ts` 的 `applies, gets accepted, chats, reports and leaves`：删除「点击申请同行 → 弹窗填写」路径，改为直接定位内联 `textbox`（placeholder 为原型示例）→ 填写 → 点「提交同行申请」→ 断言「申请已提交，等待 … 回应。处理前你可以随时撤回。」；接受、聊天、举报、退出断言保持不动。
- [ ] 新增 `applies inline and keeps the pending state after reload`：可申请详情页出现 `textbox` 与「提交同行申请」，`getByRole('dialog')` 数量为 0；输入 130 字后值长度为 120；提交后表单消失、出现「撤回申请」；`reload()` 后仍为待处理。
- [ ] 新增 `blocks a duplicate application submitted from a stale page`：先加载可申请详情，再用 `page.request` 以当前用户提交申请，并由第三人申请、发布者接受至满员；页面仍点「提交同行申请」→ 出现「已申请，请等待回应」，刷新为待处理，`/me/applications` 中该行程仍只有 1 条。
- [ ] 新增 `rejects a submission after the trip fills and shows the reason`：停留页期间由第三人申请并被接受至满员；仍提交 → 展示「人数已满」；刷新后无表单、无「提交同行申请」。
- [ ] 新增 `rejects a submission after the trip ends`：停留页期间由发布者结束行程；仍提交 → 展示「行程已结束」；刷新后无表单。
- [ ] 新增 `withdraws a pending application and restores the inline form`：空说明提交成功且 `/me/applications` 的 `message` 为 `null`；点「撤回申请」→ 确认弹窗 → 状态「已取消」；表单恢复；刷新后仍可申请。
- [ ] 改造 `keeps companion entry points honest`：自己发布的行程无 `textbox`、无「提交同行申请」；「查看同行的申请」「标记为已结束」仍可见；既有聊天只读断言保留。
- [ ] 增加辅助函数：`createTripViaApi(page, publisherId, title, capacity)`、`applyViaApi`、`acceptViaApi`（按 `applicant.id === 3` 找申请）、`completeViaApi`；测试行程用唯一标题并在可完成时于用例末尾结束。
- [ ] 运行新 spec，记录预期失败（仍为弹窗入口、无「提交同行申请」、无「已申请，请等待回应」）。

**验证：** 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/companions.spec.ts`（新用例 red，既有 trips / experiences / auth spec 不受影响）
**覆盖：** E1–E8、RV-1、RV-4、RV-6

### T2 [frontend] 入口状态与错误映射纯函数 + 文案

- [ ] 新增 `RouteME/frontend/src/trips/applicationEntry.ts`：
  - `applicationEntryState(trip, userId, application)` 返回 `publisher | pending | accepted | apply | unavailable`，顺序为「发布者 → pending → accepted → completed → full → apply」；`cancelled` / `rejected` 不算有效申请。
  - `applicationErrorMessage(code, tripStatus)`：`DUPLICATE_APPLICATION` →「已申请，请等待回应」；`TRIP_NOT_OPEN` →「人数已满」/「行程已结束」/「当前不可申请」；未知错误码返回 `null`。
- [ ] 先写 `applicationEntry.test.ts`（red），覆盖 ATDD §1.2 的全部状态与错误码组合，包括「满员 + accepted 仍为 accepted」「cancelled → apply」。
- [ ] `tripMessages.ts`：新增 `applyAreaTitle: '下一步'`、`applyMessageLabel: '一句申请说明'`、`applyMessageOptional: '让对方知道你为什么合适'`、`applyChatHint`、`applyDuplicate: '已申请，请等待回应'`、`applyFull: '人数已满'`、`applyEnded: '行程已结束'`、`applyUnavailable: '当前不可申请'`、`applyAcceptedNote`；`applySubmit` 改为「提交同行申请」，`applyCancel` 改为「撤回申请」，`applyCancelConfirm` 改为「撤回这条申请？」，`applyMessagePlaceholder` 改为原型示例「例如：这条线我走过一半，想补上日落那段，可以帮忙背装备。」；删除仅弹窗使用的 `applyDialogTitle`（若确认无引用）。
- [ ] 运行 `npm test`，确认新增单测由 red 转 green。

**验证：** `cd RouteME/frontend; npm test`
**覆盖：** E5、E6、E7、E8（状态与映射）；RV-6

### T3 [frontend] 详情页内联申请区与状态分支

- [ ] `TripDetailPage.tsx`：删除申请 `Modal`、`applyOpen` 与弹窗触发器；用 `applicationEntryState` 派生状态。
- [ ] 非发布者渲染 `section.detail-section.detail-application`（标题「下一步」）：
  - apply：`label.field` + `Input.TextArea`（`rows={3}`、`maxLength={120}`、原型 placeholder、无 `showCount`）+「提交同行申请」（`type="primary" block`，`loading`）+ 聊天说明 `.hint`；
  - pending：等待提示（含 `trip.publisher.nickname`）+「撤回申请」（打开既有确认弹窗）；
  - accepted：「你已在同行名单中…」+「和 TA 聊聊」+「退出同行」；
  - unavailable：`.action-note.warn` 展示人数已满 / 行程已结束 / 当前不可申请。
- [ ] 删除原独立 `application-status` 区块与底部「申请同行」按钮 / 「当前不可申请」徽标；发布者的「标记为已结束」「查看同行的申请」「这是你发布的行程」保持可用。
- [ ] 提交成功：写入返回的申请、清空输入、`reload()`；提交失败：用 `applicationErrorMessage` 映射 `actionError`，并同时刷新「我的申请」与行程（重复 → pending，满员 / 结束 → 原因）。
- [ ] 撤回成功：用返回的已取消申请更新状态，表单立即恢复；不整页刷新。
- [ ] 提交中禁用按钮，避免重复点击。

**验证：** `cd RouteME/frontend; npm run build; npm test`；E2E T1 用例
**覆盖：** E1–E8、RV-3、RV-4、RV-6

### T4 [frontend] 申请区样式（按原型、只用令牌）

- [ ] `styles.css` 新增 `.detail-application` 作用域样式：`.action-box`（grid，gap 11px）、`.action-note` / `.action-note.warn`（12.5px、`--surface-2`、左侧 3px `--lagoon` / `--warn`）、`.apply-form`（grid，gap 9px）。
- [ ] `.apply-form .label` 覆盖筛选面板的大写样式（12px、`--ink-2`、flex + gap 6px）；`.apply-form .opt`（11px、`--ink-3`）；`.apply-form .hint`（11.5px、`--ink-3`、line-height 1.5）。
- [ ] `.apply-form textarea.ant-input`：padding 10px 13px、圆角、`--surface` 背景、1.5px `--line` 边框、min-height 92px、focus 用 `--lagoon` + `--ring`；不写十六进制色值。
- [ ] 1440 / 1024 / 768 / 390 逐屏对照原型：说明框与按钮整行宽度、无横向溢出；浅色 / 深色各看一遍。
- [ ] 键盘 Tab 可依次到达说明框、提交按钮、撤回按钮；提示文本可被读屏读出。

**验证：** `cd RouteME/frontend; npm run build`；手工对照 `docs/prototype/prototype.html` 详情页操作区
**覆盖：** E1、E2、E6（可见性与布局）；RV-4

### T5 [verify] 全量回归与零 diff 核对

- [ ] `cd RouteME/frontend; npm run build; npm test`。
- [ ] `cd RouteME/backend; .\mvnw.cmd -B test`（无后端改动；重点 `ApplicationControllerTest` 的本人 / 重复 / 满员 / 结束 / 空说明 / 超长说明 / 取消用例）。
- [ ] `cd RouteME/e2e; npx playwright test tests/companions.spec.ts`（6 项全绿）；再跑既有 `trips.spec.ts` / `experiences.spec.ts` / `auth.spec.ts` 确认无回归。
- [ ] 手工 1440 / 1024 / 768 / 390、浅色 / 深色：本人 / 可申请 / 待处理 / 已匹配 / 满员 / 已结束六种状态；Tab 走查说明框、提交、撤回。
- [ ] 确认 `RouteME/openapi.yaml`、`RouteME/backend/**`、`db/migration/**`、`docs/prototype/**` 无 diff；`openspec validate refine-trip-application --strict` 通过。
- [ ] 把真实输出写入 `docs/ai4se-plugins/<timestamp>-local-verify-report.md`。

**验证：** 上述命令全绿；真实输出写入 local-verify 报告
**覆盖：** 全部场景 + RV-1–RV-6

### T6 [docs] Living Spec 合并收口（P5 / G3 前，不在 P4 执行）

- [ ] 归档合并后核对 `openspec/specs/trip-companions/spec.md` 的「提交与取消同行申请」仍有 8 个场景，原 5 个基线场景语义完整（提交待处理 / 本人 / 重复 / 满员结束 / 取消）。
- [ ] 在 P5 `summary.md` 记录 D2 覆盖 S08 字面「按钮变为已申请，待处理」的最终口径（lint L-04）。
- [ ] SA（Jacky）在 G3 前复核合并结果，避免 MODIFIED 只追加不替换。

**验证：** 合并后的 Living Spec 场景计数与语义复核记录
**覆盖：** G1 条件 L-02 / L-04（归档阶段）

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | Result | Evidence |
|---|---|---|
| Delta 的 8 个 Scenario 均有 ATDD 行与任务 | Pass | E1–E8 在 `atdd-design.md` §1.2；D1–D4；T1–T3 |
| Non-goals 有反向验证 | Pass | RV-1–RV-6；T1 / T5 |
| 无静默范围扩张 | Pass | Design 只改详情页申请区、文案、样式与测试；D7 明确不改后端 / 契约 / 迁移 / 原型 |
| 任务不越过 Delta 范围 | Pass | 无自动加入、说明必填、卡片入口、通知、批量申请、发布者处理任务 |
| 任务一层一条、可执行 | Pass | T1 tests、T2–T4 frontend、T5 verify、T6 archive；每条含验证命令 |
| 最后一条为验证 / 回归 | Pass | T5（T6 为归档阶段收口，不属 P4） |
| ATDD 先于实现 | Pass | T1 先写 red E2E；T2 先写纯函数单测；T3–T4 实现；T5 回归 |
| 契约先行 | N/A | 无契约变更；既有契约在 T5 回归 |
| 设计决策与原型一致 | Pass | D1/D3/D6 直接引用 `actionBox` 与 `styles.css`；重复提示为服务端映射，原型不展示 |
| G1 条件落入任务 | Pass | 内联申请区（T3）、待处理 + 撤回（T3）、错误映射与两种 409（T2/T1）、Living Spec 收口（T6）、D2 口径（T6） |
| L-03 测试矩阵 | Pass | T1 的 duplicate 与 fills 两条停留页用例分别覆盖 `DUPLICATE_APPLICATION` 与 `TRIP_NOT_OPEN` |
| 单元测试与`@rule:web-testing` 一致 | Pass | `applicationEntry.ts` 与 `applicationEntry.test.ts` 同目录；E2E 用语义选择器 |

**结论：Pass。** 未发现 Spec ↔ Design ↔ Tasks ↔ ATDD 的阻塞性不一致。

## P4 执行记录

> 待 P4 填写：T1 red 证据、T2–T4 实现、T5 回归输出与 local-verify 报告路径。
