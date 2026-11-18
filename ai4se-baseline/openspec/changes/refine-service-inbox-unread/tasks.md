# 任务清单：refine-service-inbox-unread

## T1 [frontend] 未读基线、置顶与气泡

- [x] `AdminServicePage`：维护会话消息条数基线（首次加载只建基线），轮询发现条数增长或新会话带消息时累计未读。
- [x] 未读会话在客户端置顶（同组保持服务端顺序）；队列项右上角渲染 `.admin-queue-bubble` 条数气泡。
- [x] 点击会话立即清除该会话气泡；选中期间新消息不累计。
- [x] `styles.css`：`.admin-queue-bubble` 危险色气泡 + 入场动画；`.admin-queue-item` 增加定位上下文。

**验证：** `npm run typecheck`。

## T2 [frontend] 移除刷新提示语

- [x] 删除队列页的「队列与消息每 3 秒自动刷新，接入前也可以先读用户消息。」文案、`serviceLiveHint` 与 `.admin-service-live-hint` 样式。

**验证：** E2E `[I3]` 断言该文案数量为 0。

## T3 [e2e] 端到端

- [x] `admin.spec.ts` `[I3]`：新会话出现后位于队列顶部、气泡为 1、点击后气泡消失；提示语不存在。

**验证：** `npx playwright test tests/admin.spec.ts tests/customer-service.spec.ts` → **13/13 绿**。

## T4 [docs] 记录

- [x] 本提案与 Delta；`docs/sdd/refine-service-inbox-unread/p4-apply.md`。

## 对齐自检

| 检查项 | 结论 |
|---|---|
| 后端零改动 | Pass：未读完全由前端基线派生，`/api/admin/service/**` 不变 |
| 首次加载不误报 | Pass：第一轮只建立基线；之后新增会话若带消息才提示 |
| 与既有轮询兼容 | Pass：未读跟踪复用同一份队列响应，不增加请求 |
| 未签项 | G2（VL）不代签 |
