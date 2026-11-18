# 任务清单：refine-service-workbench-live

## T1 [frontend] 后台会话上下文与徽标

- [x] 新增 `admin/AdminSessionContext.tsx`：`AdminGuard` 通过 Provider 向后台组件提供当前管理员与 token。
- [x] `AdminLayout` 每 5 秒静默拉取 `WAITING` 总数（页面隐藏时跳过），「客户服务」页签显示数字徽标。
- [x] `adminMessages` 增补 `serviceWaitingBadgeLabel` 等文案；`styles.css` 增补 `.admin-tab-badge`。

**验证：** 管理员停留在后台任意页面，出现待接入会话时页签出现数字。

## T2 [frontend] 队列实时刷新与等待提示

- [x] `AdminServicePage` 每 3 秒静默轮询当前筛选 / 分页的队列（复用 `startChatPolling`，隐藏页暂停）。
- [x] 同步拉取 `WAITING` 总数；非「等待接入」筛选时显示「有会话正在等待接入（N）」横幅与「只看等待接入」按钮。
- [x] 队列页提示「队列与消息每 3 秒自动刷新，接入前也可以先读用户消息」。
- [x] `styles.css` 增补 `.admin-waiting-banner` / `.admin-service-live-hint`。

**验证：** 管理员先停在队列页，用户随后发起会话并发消息，3 秒内自动出现。

## T3 [e2e] 端到端验收

- [x] `admin.spec.ts` `[I3]` 改为：管理员先停在 `#/admin/service` → 用户发起会话并发消息 → 不点刷新即可见队列项、页签徽标、等待横幅 → 接入前读到消息 → 接入、回复、结束、按状态筛选。

**验证：** `npx playwright test tests/admin.spec.ts tests/customer-service.spec.ts` → **12/12 绿**。

## T4 [docs] 记录

- [x] 本提案与 Delta；`docs/sdd/refine-service-workbench-live/p4-apply.md`。

## 对齐自检

| 检查项 | 结论 |
|---|---|
| 后端零改动 | Pass：只改前端轮询与提示，`/api/admin/service/**` 不变 |
| 轮询成本 | Pass：队列 3 秒、徽标 5 秒；`document.hidden` 时暂停，单管理员约 0.53 req/s |
| 归档顺序 | 需排在 `add-admin-console` 之后（同一 `customer-service` 能力） |
| 未签项 | G2（VL）不代签 |
