# P4 记录：refine-service-inbox-unread

- **Change：** `refine-service-inbox-unread`（REQ-018 客服队列体验）｜ **阶段：** P4（apply）
- **日期：** 2026-11-18
- **能力：** `customer-service`（ADDED 2 Requirement / 4 Scenario，`openspec validate --strict` valid）
- **后端 / 契约 / 迁移：** 零改动

## 1. 用户裁决

> 如果有收到新消息需要置顶展示，采用一个气泡提示；「队列与消息每 3 秒自动刷新，接入前也可以先读用户消息。」这句提示语删除。

## 2. 落地

| 项 | 处置 |
|---|---|
| 未读判定 | `AdminServicePage` 维护每个会话的 `message_count` 基线；首次加载只建基线，之后条数增长或新出现会话自带消息才计为未读 |
| 置顶 | 有未读的会话在客户端排到队列最前（同组保持服务端顺序），不改变分页与筛选 |
| 气泡 | 队列项右上角 `.admin-queue-bubble` 显示未读条数（危险色 + 入场动画） |
| 已读 | 点击会话（宽屏选中 / 窄屏跳详情）立即清除气泡；选中期间新消息不累计 |
| 提示语 | 删除「队列与消息每 3 秒自动刷新，接入前也可以先读用户消息。」及 `serviceLiveHint` / `.admin-service-live-hint` |

同时按用户要求下线「帮助与反馈」：删除 `#/help` 路由与 `HelpPage`，侧栏与后台页签不再提供入口（详见 `refine-user-support-entry` §7）。

## 3. 门禁

| 门禁 | 结果 |
|---|---|
| 前端 `typecheck` | 通过 |
| 前端 `npm test` | **446/446（56 文件）** |
| 前端 `build` | 通过 |
| `openspec validate` | `refine-service-inbox-unread` / `refine-user-support-entry` 均 valid |
| E2E | `admin` 11/11 + `customer-service` 2/2 = **13/13 绿**（含置顶、气泡=1、点击清除、提示语为 0） |
| 后端 | 本轮零改动（沿用前一轮 `verify` 601/601） |

## 4. 未签项

- **G2（VL）未签署，本记录不代签。**
