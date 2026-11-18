# P4 记录：refine-service-workbench-live

- **Change：** `refine-service-workbench-live`（REQ-018 客服能力的实时可见性）｜ **阶段：** P4（apply）
- **日期：** 2026-11-17
- **能力：** `customer-service`（ADDED 2 Requirement / 3 Scenario，`openspec validate --strict` valid）
- **后端 / 契约 / 迁移：** 零改动

## 1. 用户裁决

> 需要实现用户发消息给人工客服，我们的管理中心可以看到用户发过来的消息。

## 2. 现状与结论

链路本身已经存在：用户 `POST /api/service/sessions` 发起 → 可发消息（仅 `CLOSED` 拒收）；管理员 `GET /api/admin/service/sessions` 拉队列、`GET /api/admin/service/sessions/{id}` 读完整消息（**接入前即可读**），`POST .../join` 接入后回复。缺的是管理端的可见性：队列只手动刷新、页签无待接入数。

实测（本地 8080）：管理员可列出 5 条会话，其中 2 条 `WAITING`；`GET /admin/service/sessions/5` 在 `joined_by` 为空时已返回 1 条 `USER` 消息。

## 3. 落地

| 项 | 处置 |
|---|---|
| 会话上下文 | 新增 `admin/AdminSessionContext.tsx`；`AdminGuard` 通过 Provider 注入 `{currentUser, token}` |
| 页签徽标 | `AdminLayout` 每 5 秒拉 `WAITING` 总数（`document.hidden` 跳过），「客户服务」显示数字徽标 |
| 队列实时 | `AdminServicePage` 每 3 秒静默轮询当前筛选 / 分页（`startChatPolling`），不打断选中会话 |
| 等待提示 | 顶部「有会话正在等待接入（N）」横幅 +「只看等待接入」快捷按钮；提示队列与消息 3 秒自动刷新、接入前可读消息 |
| 样式 | `.admin-tab-badge` / `.admin-waiting-banner` / `.admin-service-live-hint`，复用现有色板 |

## 4. 门禁

| 门禁 | 结果 |
|---|---|
| 前端 `typecheck` | 通过 |
| 前端 `npm test` | **446/446（56 文件）** |
| 前端 `build` | 通过 |
| `openspec validate refine-service-workbench-live --strict` | valid |
| E2E | `admin.spec.ts` + `customer-service.spec.ts` **12/12 绿**（基址 `http://localhost:5174`） |
| 后端 | 无改动（沿用前一轮 `verify` 597/597） |

## 5. 轮询成本

- 队列 3 秒 + 徽标 5 秒，页面隐藏时都暂停；单管理员约 0.53 req/s，SQLite + 本地单体可承受。
- 未新增后端接口；如后续需要多客服并发，再考虑 SSE / WebSocket 与分配策略（本变更 Out of scope）。

## 6. 未签项

- **G2（VL）未签署，本记录不代签。**
