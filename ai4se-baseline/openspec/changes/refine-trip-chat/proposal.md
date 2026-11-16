# 变更提案：refine-trip-chat

- **需求：** REQ-010（`requirement-workspace/requirements/REQ-010-trip-chat-meeting.md`）｜ **故事：** S12-1～S12-4「同行消息与集合确认」
- **能力：** `trip-companions`（MODIFIED）+ `trip-plans`（MODIFIED）｜ **规模：** M
- **原型：** `docs/prototype/prototype.html#/chat/:tripId/:userId`、`ui.js` `chat()`、`styles.css` `.chat-*`

## 问题

同行聊天已经存在，但和原型与真实出行需求都有差距：

1. **页面不是原型的结构。** 现状 `ChatPage` 是 antd 单栏卡片，没有左栏会话列表、没有头部动作、没有集合安全条、没有 Enter 发送；原型是两栏布局，左栏是全部可沟通会话，右栏是当前对话。
2. **集合信息在聊天里看不见。** 集合区域已经存在（`trip_plans.meeting_area`），但只在详情页展示；聊天页与「我的旅行·已匹配」看不到。集合时间则完全不存在，导致「确认集合」只能靠翻消息。
3. **集合信息没有维护入口。** 发布时填了就不能改，计划有变只能靠聊天补充说明；产品也没有任何行程编辑能力。
4. **退出同行的语义与用户预期冲突。** 现有实现把申请置为 `CANCELLED`，退出后聊天立即不可用；用户裁决为「退出后仍可继续沟通」，因此活规格里的「关闭聊天」必须改写。

## 范围

**In scope**

- 聊天页按原型重构：页面标题与「刷新消息」、左栏会话列表、右栏主区、头部动作（资料 / 行程 / 举报 / 退出同行）、集合安全条、气泡与发送时间、输入区交互、已结束只读、空态与拒绝说明、3 秒短轮询。
- 会话列表数据补齐：`GET /api/me/chat-partners` 目前只按消息历史聚合，**已匹配但尚无消息的会话不会返回**；本 change 需让它同时包含「发布者 × 每位已接受/已退出同行者」与「同行者 × 发布者」的可沟通会话，无消息的按「尚无消息」排序在末尾。
- 聊天准入口径：发布者本人，或该行程申请「已接受 / 已退出」；仅 PENDING、被拒、取消、未申请一律拒绝并说明。
- 退出同行语义：以可追溯状态（`left`）记录「已退出」，退出后会话保留、可继续读写；「我的旅行·已匹配」与「参与同行」统计口径不变；「我申请的」列表用「已退出」标签展示该记录。
- 集合时间字段：发布选填（日期 + 时间）、日期部分不晚于结束日期、服务端校验（字段类错误 400；非发布者 403；已结束 409；不引入 422，与现有实现一致）；详情 / 聊天安全条 / 我的旅行三处展示，空值「待确认」。
- 发布者维护集合信息：详情页入口 + 仅改「集合区域 + 集合时间」的端点；可编辑状态为招募中与已满员。
- 原型先行：集合时间与集合编辑入口先写进原型（`docs/prototype/`），再落到实现。
- 契约与迁移：`meeting_time` 字段、集合编辑端点、申请状态「已退出」；契约版本升到 `0.9.0`，迁移新增 `V13`。
- 测试：后端权限与校验单测、前端展示与交互 UT、E2E 覆盖「发送 → 重新进入仍可见」「未匹配被拒」「集合编辑生效」。

**Out of scope**

- WebSocket / SSE / 实时推送、已读回执、未读数、输入中状态、消息通知。
- 图片、文件、语音、表情包等非文字消息。
- 消息编辑、撤回、删除、搜索、分页加载更多。
- 完整行程编辑（标题、目的地、日期、途经点、人数、预算、标签、说明）。
- 集合提醒、日程冲突检测、集合地点地图标记或导航。
- 群聊；举报处置闭环；匹配分与申请处理规则调整。
- 「参与同行」统计口径调整（「已退出」不计入）。

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-companions/spec.md` | 归档时以本 change 的增量规格覆盖「匹配后的一对一文字沟通」与「退出同行」 |
| `openspec/specs/trip-plans/spec.md` | 归档时以增量规格覆盖「发布可被他人理解的旅行计划」「查看行程详情与清晰的状态」，并新增「发布者维护集合信息」 |
| `docs/prototype/` | `data.js` / `store.js` 增集合时间；`ui.js` 发布表单、详情、聊天安全条、我的旅行与集合编辑入口；`styles.css` 补必要样式 |
| `RouteME/openapi.yaml` | `meeting_time`；集合编辑端点；申请状态新增 `left`；版本 `0.9.0` |
| 后端 | `ChatService` / `ChatServiceImpl` / `ChatMessageMapper`（准入口径 + 会话列表补齐）、`ApplicationServiceImpl`（退出状态为 `left`）、`TripPlanServiceImpl` / `TripController`（集合字段与更新端点）、`TripPlan` / 实体 / `TripPlanMapper.xml` |
| 数据库 | `V13` 新增 `meeting_time` 列（可空） |
| 前端 | `ChatPage`（两栏）、`chat/` 子组件、`MyTripsPage`（集合备注）、`TripDetailPage`（集合展示与编辑入口）、`TripCreatePage`（集合时间）、`tripForm` / `api` / `types` / `tripMessages` / `styles.css` |
| 端到端 | `e2e/tests/companions.spec.ts` 扩聊天用例；新增集合时间与编辑用例 |
| 测试影响 | `leave` 相关单测与 E2E 断言需从「退出后不可聊」改为「退出后仍可聊」 |

## 需求与证据

- 需求来源：用户 2026-11-16 会话（REQ-010）；原型 `ui.js` `chat()` 为视觉与交互基准。
- 既有实现：`add-trip-companions`（聊天与退出）、`add-trip-publish`（发布表单与集合区域）、`add-user-profiles`（资料弹窗）。
- 既有测试：`ChatControllerTest`、`e2e/tests/companions.spec.ts`。

## 关键裁定

| 裁定 | 内容 | 理由 |
|---|---|---|
| 集合区域 | 不新增字段，只补展示 | 字段已存在（V4 + 发布页 + 详情 + 契约） |
| 集合时间 | 本地日期时间、可空、日期部分 ≤ 结束日期 | 与行程日期同为无时区语义，避免时区歧义 |
| 集合编辑 | 仅发布者、仅两个字段、仅招募中与已满员 | 范围最小且覆盖「计划有变」的真实场景 |
| 退出语义 | 新增「已退出」状态，聊天准入放开到曾接受 | 用户裁决；与「未匹配不可进入」仍一致 |
| 轮询 | 3 秒（原型），仅会话页开启 | 用户要求短轮询，原型即 3 秒 |
| 冲突裁决 | 用户指示优先于活规格，MODIFIED「退出同行」与「匹配后的一对一文字沟通」 | `@rule:rule-precedence` 第 1 层；已在需求条目 §5/§8 记录 |
| 会话列表 | 扩展 `GET /api/me/chat-partners`，不再只依赖消息历史 | 新接受的配对可能一条消息都没有，否则左栏无法满足「全部可沟通会话」 |
| `left` 消费点 | `MyTripsServiceImpl`（matched 仍只认 accepted）、`UserProfileStatsServiceImpl`（joined 仍只认 accepted）、`ApplicationServiceImpl#existsActive`（left 不阻止重新申请）、`TripDetailResponse` 同行者列表（不含 left）、前端 `applicationLabel`（新增「已退出」） | 均保持既有口径，仅新增展示标签 |

## Spec ID

`refine-trip-chat`，业务增量规格见 `specs/trip-companions/spec.md` 与 `specs/trip-plans/spec.md`。

## 双 capability 说明

本 change 同时修改 `trip-companions`（聊天与退出语义）与 `trip-plans`（集合字段与集合维护）。两者边界清晰：聊天只读行程信息，集合字段由 `trip-plans` 单一写入。归档前需 SA 具名追认该双 capability 例外（与 `add-destination-area-filters`、`add-user-profile` 的处理一致）。
