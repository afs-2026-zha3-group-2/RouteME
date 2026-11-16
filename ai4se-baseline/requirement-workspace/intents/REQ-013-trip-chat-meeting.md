# Intent capture — 同行消息与集合确认（REQ-013）

- **捕获日期：** 2026-11-16
- **来源：** 用户当次会话（SDD P1 输入）
- **候选编号：** REQ-013
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话要点）

作为已匹配的同行者，我希望确认集合和安排，以便出行不靠猜。

1. 刷新或重新进入后历史消息仍在，按时间升序显示并带发送时间。
2. 非匹配用户（含仅 PENDING）访问该聊天被拒并给出说明。
3. 采用手动刷新或短轮询；不做 WebSocket、已读回执、推送、图片。
4. 前置：申请已 ACCEPTED → 操作：进入该行程聊天并发送消息 → 预期：消息落库，重新进入仍可见。
5. 前端页面严格按 prototype 实现。

## 追问后追加确认（同次会话）

| 问题 | 用户裁决 |
|---|---|
| 变更性质 | 对既有同行聊天做 MODIFIED 重构，不新建 capability |
| 集合区域 | 已存在字段；本次只补聊天页与「我的旅行·已匹配」展示 |
| 集合时间 | 新增字段：日期 + 时间、选填、不晚于行程结束日期 |
| 编辑范围 | 只允许发布者修改「集合区域 + 集合时间」；不做完整行程编辑；可编辑状态为「招募中 + 已满员」 |
| 编辑入口 | 行程详情页 + 「我的旅行·我发布的」 |
| 必填性 | 集合区域与集合时间都选填；空值显示「待确认」 |
| 页面范围 | 严格按原型两栏：会话列表 + 主区 + 头部动作 + 集合安全条 + Enter 发送 |
| 范围外 | 不做 WebSocket、已读回执、推送、图片 |
| 记录与签署 | SM=Lewis、AO=Jay、IO=Wanye、SA=Jacky、VL=Neal |

## 证据锚点

| 证据 | 路径 | 说明 |
|---|---|---|
| 原型聊天页 | `docs/prototype/ui.js` `chat()` | 两栏布局、会话列表、头部动作、集合安全条、气泡与时间、Enter 发送、已结束只读、空态 |
| 原型聊天样式 | `docs/prototype/styles.css` `.chat-layout` / `.chat-item` / `.chat-main` / `.chat-safety` / `.composer` / `.msg` | 设计令牌与响应式断点（980px 单列、390px 气泡 88%） |
| 原型轮询 | `docs/prototype/main.js` `startPoll()` / `chatSignature()` | 3 秒轮询 |
| 原型集合展示位 | `ui.js` `chat()`、`mine()`、`tripDetail()`、`tripForm()` | 集合区域出现在聊天安全条、我的旅行已匹配、详情 fact、发布/编辑表单 |
| 现有聊天后端 | `ChatServiceImpl`、`ChatController`、`V6__create_chat_messages.sql` | 仅发布者与已接受同行者；升序；500 字；已结束只读 |
| 现有聊天前端 | `frontend/src/chat/ChatPage.tsx` | 单栏、5 秒轮询、手动刷新；缺原型结构 |
| 现有集合区域 | `V4__seed_demo_trips.sql`、`TripCreatePage`、`TripDetailPage`、`openapi.yaml` | 已存在且已展示在发布表单与详情 |
| 现有可复用动作 | `TripDetailPage` `leaveTrip`、`ReportModal`、`ProfileModal` | 聊天头部动作不新增权限模型 |
| 规则 | `docs/knowledge/rules/quality/rules.md#prototype-ui-alignment` | 视觉以原型为准，先改原型再改实现 |

## 本次明确排除

1. WebSocket / SSE / 实时推送、已读回执、未读数、输入中状态。
2. 图片、文件、语音、表情包等非文字消息。
3. 消息编辑、撤回、删除、搜索、加载更多分页。
4. 完整行程编辑（标题、目的地、日期、途经点、人数、预算、标签、说明）。
5. 集合提醒、日程冲突检测、集合地点地图标记。
6. 群聊（一个行程内多人会话）：仍是一对一（发布者 ↔ 每位已接受同行者）。
7. 举报处置闭环与通知（复用现有举报入口与回执）。
8. 改变匹配分、申请处理与人数联动规则。
