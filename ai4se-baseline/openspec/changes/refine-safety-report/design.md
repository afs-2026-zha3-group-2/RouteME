# 设计：refine-safety-report

## 结论

详情页与聊天页的安全提示整块下线，唯一保留的安全能力是页头文本按钮。后端、契约、迁移与状态机零改动：`POST /api/reports` 已返回 `{ "received": true }`，前端也已渲染回执。本次工作是三个组件、一个样式表、一个文案表的前端收敛，以及把结果钉住的验收套件。

`SafetyNote` 只留在体验发布页，作为没有举报动作的发布前提醒。

## 变更面

| 文件 | 改动 |
|---|---|
| `frontend/src/trips/TripDetailPage.tsx` | 移除 `SafetyNote`；在 `.detail-badges` 内渲染页头入口，仅 `!isPublisher` 时出现；给 `ReportModal` 传 `targetLabel={trip.title}` |
| `frontend/src/chat/ChatPage.tsx` | 移除 `SafetyNote`；入口作为 `.chat-head` 最后一个子节点，常驻（含只读聊天）；传 `targetLabel={otherUser?.nickname ?? '同行者'}` |
| `frontend/src/safety/ReportModal.tsx` | 标题与目标行随对象变化；补身份保密与紧急求助文案；回执文案与单一关闭按钮；`received !== true` 视为失败 |
| `frontend/src/safety/SafetyNote.tsx` | 删除 `onReport` 属性与操作按钮，只保留提示 |
| `frontend/src/i18n/tripMessages.ts` | 新增入口 / 标签 / 回执文案，删除因此失效的三组通用键 |
| `frontend/src/styles.css` | `.head-report`、`.chat-report`、`.chat-head { flex-wrap: wrap }` |

## D1 详情页入口落点

| 方案 | 行为 | 结论 |
|---|---|---|
| A 页头下方整条横幅 | 显眼但占一整行，读起来像提示条 | 否决（D5 已移除横幅类提示） |
| B 放进 `.detail-badges`，作为最后一个子节点，`margin-left: auto` | 与状态标签同一行、靠右；空间不足时换到标签下方 | **采用** |
| C 元信息行内联链接 | 与日期 / 集合等信息混在一起，太弱 | 否决 |

```tsx
<div className="detail-badges">
  <Tag …>{statusLabel(trip.status)}</Tag>
  <Tag>{destinationLabel(trip.destination_code) || trip.destination}</Tag>
  {!isPublisher && (
    <Button type="link" danger className="head-report" onClick={() => setReportOpen(true)}>
      {tripMessages.reportEntryTrip}
    </Button>
  )}
</div>
```

`.detail-badges` 本身已是 `display: flex; flex-wrap: wrap`，所以「同一行靠右」与「窄屏换行、不隐藏」由一条 `margin-left: auto` 同时满足，不新增断点。`isPublisher` 复用详情页既有的 `applicationEntryState` 推导（`entry.kind === 'publisher'`，其判定条件是 `trip.publisher.id === userId`），不引入第二套身份判断。

**三档判定（收口 spec 评审 S2-04）：** 1440 与 768 断言入口与状态标签同一行且靠右（入口 `boundingBox.y` 落在标签行区间内、右缘贴近卡片右缘）；390 允许换行到标签下方，但必须可见且不产生横向溢出。这条判定写进 `atdd-design.md` E1，P4 按其执行。

## D2 聊天页入口落点

入口是 `.chat-head` 的第三个子节点，排在头像与文字块之后：

```tsx
<div className="chat-head">
  <Avatar … />
  <div className="chat-head-text">…</div>
  <Button type="link" danger className="chat-report" onClick={() => setReportOpen(true)}>
    {tripMessages.reportEntryUser}
  </Button>
</div>
```

`.chat-head-text` 已有 `min-width: 0`，长昵称会收缩而不会把按钮挤出；给 `.chat-head` 加 `flex-wrap: wrap`，配合 `.chat-report` 的 `margin-left: auto; align-self: flex-start; flex: none`，1440 时按钮在头像对侧，390 时换到文字下方并保持靠右，任何宽度都不隐藏。按钮渲染在 `!completed` 条件之外，所以已结束的只读聊天仍保留入口（场景 #4）。

## D3 `SafetyNote` 去留

保留组件，但收窄：删掉 `onReport`、`Button` 导入与 `action` 属性。`ShareExperiencePage` 本来就写 `<SafetyNote />`（无处理函数），调用点不变——diff 直接证明体验发布页没有新增举报入口（RV-4）。`safety-note` 类名与 `safetyTitle` / `safetyBody` 文案保留，因为该页仍需要发布前提醒；整组件删除只能在调用点复制一份 `Alert`，或悄悄丢掉提醒。

## D4 `ReportModal` 行为

| 关注点 | 结论 |
|---|---|
| 标题 | 随对象变化：`举报这条行程` / `举报这位用户`（与入口同键），替换泛化标题 `举报行程或用户` |
| 目标标识 | 新增必填 prop `targetLabel: string`；渲染 `举报对象：{targetLabel}。{privacy}`，让行程标题或对方昵称出现在弹窗里，满足场景 #5 |
| 身份保密 | `我们不会向对方透露你的身份。` 在表单、回执、失败三态都可见 |
| 紧急求助 | `如果你正处于危险中，请立即拨打 110 报警；平台举报不能替代紧急求助。` 三态都可见（2026-11-18 由「联系当地警方或学校保卫处」改为直接报警，见 P4 记录） |
| 回执 | `received === true` 时正文换成 `Alert` 标题 `已收到，我们会处理` + 提示 `关闭弹窗只结束回执展示，不改变行程、申请或聊天状态。` |
| 回执 footer | 用 `footer` 替换为单一主按钮 `关闭`，回执态不再出现两个 `取消`；表单态保留默认 `取消` / `提交举报` |
| `received` 处理 | `if (!receipt.received) throw new Error('REPORT_NOT_RECEIVED')` —— 只有服务端确认收到才进回执态，不会被空 body 骗过 |
| 失败 | 沿用现有行为：`reportFailed` 弹窗 + 错误码；`reason` / `note` 不重置（只有 `close()` 重置），重试保留选择与文本 |

不做的事：不加幂等键、不加重试计数、不加 toast。规格要求的是「可读的失败 + 重试不重复回执」，单个弹窗状态机足够。

## D5 文案与原因映射

新增：

| 键 | 文案 |
|---|---|
| `reportEntryTrip` | 举报这条行程 |
| `reportEntryUser` | 举报这位用户 |
| `reportTargetPrefix` | 举报对象： |
| `reportPrivacyNote` | 我们不会向对方透露你的身份。 |
| `reportEmergencyNote` | 如果你正处于危险中，请立即拨打 110 报警；平台举报不能替代紧急求助。 |
| `reportReceiptHint` | 关闭弹窗只结束回执展示，不改变行程、申请或聊天状态。 |
| `reportClose` | 关闭 |

`reportSuccess` 改为 `已收到，我们会处理`。删除 `reportEntry`（`举报`）、`reportTitle` 与 `reportTargetTrip` / `reportTargetUser`——标题与目标行改为随对象生成后，它们已无消费者。

原因映射不变，仍在 `REASON_OPTIONS`：`harassment` 骚扰或不当言行、`fake` 虚假信息、`safety` 安全风险、`other` 其他。标签只用于展示，线上传的是枚举值，因此不引入新映射表，也不动契约。

## D6 样式

```css
.detail-badges .head-report { margin-left: auto; }
.chat-head { flex-wrap: wrap; }
.chat-report { margin-left: auto; align-self: flex-start; flex: none; }
```

只使用既有令牌（`--ink-3`、`--line`）；危险色由 antd 的 `danger` link 按钮提供，不新增调色板条目。入口文本即可访问名，元素是真实 `<button>`，可聚焦、可被 `Enter` / `Space` 触发——「不只靠颜色或图标」由结构满足，不需要额外 `aria-label`。

## D7 测试归属

新的 E2E spec 需要与 `companions.spec.ts` 相同的 helper，因此把 `loginAs`、`switchUser`、`todayIso`、`createTripViaApi`、`applyViaApi`、`acceptApplicationViaApi` 移到 `e2e/tests/support.ts`，两个 spec 都改为引用。这是机械抽取：helper 行为不变，既有 spec 除 `atdd-design.md` §7 列出的四处断言外不得有其它改动。

## 风险与例外

- **风险：页头拥挤。** 长标题 + 两个标签 + 链接在平板宽度可能折行。接受：折行正是选定行为，且 `margin-left: auto` 保证入口不丢位置。
- **风险：可访问名重复。** 弹窗打开时，入口按钮与弹窗标题同名。Playwright 查询按弹窗作用域限定，读屏会播报对话框边界，因此不为此引入 `aria-label` 分叉。
- **例外：`received` 不做单测。** 仓库没有组件测试框架，且该判断是单行比较；改由 E5 断言响应 body 与随后 UI 状态。已记录在 `atdd-design.md` §1。
- **发现：两处只存在于原型的回退文案。** `proposal.md` 与 `REQ-012` 把「尚未填写，出发前请在聊天中确认」/「待确认」列入待下线文案，但这两个字面量只在 `docs/prototype/ui.js` 出现，实现从未渲染。移除在代码层已为真，E1 / E2 的缺失断言保留为防回归守卫。这是 P5 的文档准确性说明，不是任务。
- **非目标：** 不做处置工单、举报列表、通知、原因词表扩容、后端改动。反向检查见 `atdd-design.md` §6。