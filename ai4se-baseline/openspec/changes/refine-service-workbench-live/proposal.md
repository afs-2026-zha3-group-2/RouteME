# 变更提案：refine-service-workbench-live

- **需求来源：** 用户验收反馈（2026-11-17）「需要实现用户发消息给人工客服，我们的管理中心可以看到用户发过来的消息」｜ **归属：** REQ-018 管理后台的客服能力（不新增需求编号）
- **能力：** `customer-service`（ADDED Requirements：客服工作台实时可见与待接入提醒）
- **规模：** S（后台页签徽标 + 队列轮询 + 等待横幅 + 1 份 E2E）
- **规则：** `@rule:spec-first`、`@rule:web-coding-style`、`@rule:tdd-cycle`
- **本回合状态：** P4 已实现并通过门禁（前端 `typecheck` + 446 tests + `build`；E2E `admin` / `customer-service` 12/12）。

## 问题

客服链路的读写能力已经存在（用户发起会话、发消息；管理员在 `#/admin/service` 接入、回复、结束），但管理端**没有实时可见性**：

- 队列只在进入页面 / 手动「刷新」/ 切换筛选时拉取，新会话与新消息不会自己出现；
- 「客户服务」页签没有待接入数量，管理员不知道有没有人排队；
- 未接入会话虽然能读消息（`GET /api/admin/service/sessions/{id}` 返回完整消息，且 `WAITING` 允许用户发言），但缺少明确提示，容易误以为「看不到」。

## 范围

**In scope**

- 后台页签「客户服务」显示 `WAITING` 会话数量徽标；管理员停留在任意后台页面时每 5 秒静默刷新。
- 客服队列每 3 秒静默轮询（页面隐藏时暂停），新会话 / 新消息无需手动刷新即可出现；筛选与分页保持当前条件。
- 队列页顶部在存在待接入会话且当前不是「等待接入」筛选时，显示「有会话正在等待接入（N）」横幅与「只看等待接入」快捷筛选。
- 队列页提示「队列与消息每 3 秒自动刷新，接入前也可以先读用户消息」。
- E2E：管理员先停在队列页 → 用户随后发起会话并发消息 → 不点刷新即可看到队列项、页签徽标、等待横幅，并在接入前读到消息。

**Out of scope**

- 浏览器推送 / 声音提醒 / 桌面通知、未读消息级红点。
- 后端接口与数据模型（`/api/admin/service/**`、`/api/service/**` 不变）。
- 客服会话 Assignment（多客服抢单）、会话转交、快捷回复等运营能力。

## 影响面

- 前端：`admin/AdminSessionContext.tsx`（新增）、`admin/AdminGuard.tsx`（注入会话）、`admin/AdminLayout.tsx`（徽标轮询）、`admin/service/AdminServicePage.tsx`（队列轮询 + 横幅）、`i18n/adminMessages.ts`、`styles.css`。
- 测试：`e2e/tests/admin.spec.ts` `[I3]`。
- 后端 / 契约 / 迁移：无。
