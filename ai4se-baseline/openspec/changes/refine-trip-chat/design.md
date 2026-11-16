# 技术设计 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）
- **依据：** `proposal.md`、两个 Delta Spec、`atdd-design.md`、G1 条件
- **原型先行：** 已完成 `docs/prototype/` 改动（`data.js` / `store.js` / `ui.js` / `main.js`），预览截图 `docs/preview/trip-departure-info-after-edit.png`；浏览器验证：集合时间展示、编辑弹窗、保存成功、控制台无 error

## D1 契约（`openapi.yaml` 0.8.0 → 0.9.0）

| 项 | 设计 |
|---|---|
| `meeting_time` | `type: string`, `nullable: true`, `pattern: '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'`，description 明确「local wall-clock, no timezone」，示例 `2026-11-20T08:30` |
| `TripPlan`（列表/摘要） | 增加 `meeting_area`（`nullable`，`maxLength: 100`）与 `meeting_time`——现状列表响应不含集合区域，「我的旅行·已匹配」需要两者才能展示（P4 T1 发现并补） |
| `TripDetail` / `TripCreateRequest` | `TripDetail` 增加 `meeting_time`（`meeting_area` 已有）；`TripCreateRequest` 增加 `meeting_time` |
| `ApplicationStatus` | 枚举增加 `left`，description 补「已退出」；`cancelled` 仅表示申请人在 PENDING 阶段撤销 |
| 新端点 | `PUT /api/trips/{tripId}/meeting`，body `TripMeetingRequest { meeting_area?: string(max 100), meeting_time?: string }`；两字段整体替换（缺省视为清空）；200 返回 `TripDetail`；400 字段类错误；403 非发布者；409 行程已结束 |
| 示例 | 新端点带 success + 400 + 403 + 409 示例（评审 S-2 / G1 条件） |

## D2 数据库（`V13__add_meeting_time.sql`）

```sql
ALTER TABLE trip_plans ADD COLUMN meeting_time VARCHAR(16);
```

- 可空；存 `yyyy-MM-ddTHH:mm`；不新增索引（查询不按该字段过滤）。
- 不重建表，保持既有行数据（`ADD COLUMN` 对 SQLite 安全）。

## D3 「已退出」状态语义

- `ApplicationStatusEnum` 增加 `LEFT("left")`；持久化沿用现有 `status.name()`（DB 存 `LEFT`），出参走 `wireValue()`（API 返回 `left`），与现有四值一致，不做数据迁移。
- `ApplicationServiceImpl#leave`：`findAccepted` → `removeCompanion` → `updateStatus(LEFT)`（不再 `CANCELLED`）。
- `TripApplication#isAccepted()` 定义不变（仅 `ACCEPTED`）；新增 `isLeft()`。
- 消费点口径（G1 条件）：
  - `MyTripsServiceImpl`：matched 仍 `isAccepted`；applied 原样返回（含 `left`）。
  - `UserProfileStatsServiceImpl`：joined 仍 `isAccepted`（`left` 不计入）。
  - `ApplicationServiceImpl#existsActive`：仅 `PENDING`/`ACCEPTED`（`left` 不阻止重新申请）。
  - `TripDetailResponse.participants`：`ApplicationService.participants` 仍只取 `isAccepted`。
  - 前端 `applicationLabel`：`left` → 「已退出」。
- 重新申请：`trip_applications` 无 `(trip_id, applicant_id)` 唯一约束，退出后再次申请会新增一条记录；`findAccepted` / `existsActive` / `chatCounterparts` 均按状态过滤，不受历史行影响。
- 残余风险：同一行程退出后再申请时，「我申请的」会同时出现「已退出」与「已匹配同行」两条记录（保留历史，不做折叠）。本 change 不改现有 `mine()` 返回结构，列为遗留项。

## D4 聊天准入

`ChatServiceImpl#requireAccess(trip, userId, withUserId)`：

```
publisher 且 application(userId 对 toUserId) 为 ACCEPTED|LEFT  → 允许
被申请方 且 application 为 ACCEPTED|LEFT                      → 允许
否则 → ChatNotAllowedException(403 CHAT_NOT_ALLOWED)
```

- `conversation` 与 `send` 共用同一判定；`COMPLETED` 仍只允许读，写抛 `CHAT_READ_ONLY`。
- `ApplicationService` 新增 `isChatPartner(tripId, applicantId)`（`ACCEPTED` 或 `LEFT`），避免 `ChatService` 直接查表。

## D5 会话列表补齐（`GET /api/me/chat-partners`）

- 数据来源从「仅消息历史」改为两路合并：
  1. `ApplicationService.chatCounterparts(userId)`：返回 `(tripId, otherId)` —— 作为发布者取该行程 `ACCEPTED|LEFT` 的申请人；作为申请人取自己 `ACCEPTED|LEFT` 的行程发布者。
  2. 既有 `ChatMessageMapper#selectThreads`：只用于补 `lastMessage` 与 `messageCount`。
- 合并规则：以 `(tripId, otherId)` 去重；`lastMessage` 取该配对最新一条；排序 `lastMessage.sentAt` 倒序，`null` 排末尾；同序按 `tripId` 倒序、再按 `otherId` 倒序稳定（同一行程多个无消息会话时有确定顺序）。
- 不做分页（MVP 会话数量级小，契约保持数组返回）。

## D6 前端聊天页结构

```
frontend/src/chat/
  ChatPage.tsx         // 路由入口：加载 partners、选中会话、轮询
  ChatList.tsx         // 左栏会话项
  ChatMain.tsx         // 右栏：头部动作、安全条、消息区、输入区
  chatTime.ts          // 时间格式（纯函数）
  chatComposer.ts      // Enter/Shift+Enter/组字判定（纯函数）
  chatActions.ts       // 头部动作可见性（纯函数）
  chatMeeting.ts       // 集合文案与我的旅行备注（纯函数）
```

- 样式：`styles.css` 增加 `.chat-layout` / `.chat-list-pane` / `.chat-item` / `.chat-main` / `.chat-body` / `.msg` / `.composer` / `.chat-safety`，取值对齐原型与 `:root` 令牌；组件内不写十六进制色值。
- 响应式：>980px 两栏 288px + 主区；≤980px 单列、会话列表横向滚动；≤390px 气泡最大宽度 88%。
- 头部动作：资料（`useProfile().openProfile`）、行程（`#/trips/:id`）、举报（`ReportModal` targetType=user）、退出同行（`leaveTrip`）。
- 「退出同行」可见性：`!isPublisher && trip.status !== 'completed' && trip.participants.some((user) => user.id === currentUser.id)`。数据取自页面已加载的 `TripDetail.participants`（仅含 `ACCEPTED`），已退出（`LEFT`）用户自动隐藏，无需新增契约字段、无需额外请求。
- 详情页沿用 `SafetyNote`，聊天页只用集合安全条，二者不叠加（G1 条件 / lint L-04）。

## D7 轮询与刷新

- 常量 `CHAT_POLL_INTERVAL_MS = 3000`；仅当存在选中会话且 `status !== 'completed'` 时 `setInterval`。
- 发送成功后立即 `setMessages` 追加本地返回值，不等轮询。
- 手动刷新「刷新消息」调用同一 `reload()`；失败保留旧消息并提示。

## D8 输入与时间

- `shouldSendOnEnter({ key, shiftKey, isComposing })`：Enter + 非 Shift + 非组字 → 发送；否则换行。
- 500 字上限：`maxLength` + 提交前 trim 校验；空白不发请求。
- 消息时间格式：`M/D HH:mm`，同日显示 `HH:mm`，昨天显示 `昨天 HH:mm`（对齐原型 `fmtStamp`）。

## D9 详情页集合展示与编辑

- 「出发信息」增加「集合时间」一行；空值「待确认」，并提示「集合信息未填完，出发前请在聊天中确认」。
- 发布者且 `status !== 'completed'` 显示「编辑集合信息」按钮 → antd `Modal` + 两个字段（集合区域 Input + 集合时间 `datetime-local`）。
- 提交 `PUT /api/trips/{id}/meeting`；成功后就地刷新详情并提示「集合信息已更新」；失败展示字段级/整体错误。

## D10 我的旅行

- 已匹配条目底部增加「集合：<集合区域或待确认> · <集合时间或待确认> · 同行 N 人」；数据取自 `TripSummary.meeting_time` 与 `joined_count`（后者已存在）。
- 只改「已匹配」分区；「我发布的」「我申请的」「已完成的」不新增集合行（评审 S-4）。

## D11 申请状态展示

- 新增 `frontend/src/trips/applicationStatus.ts`，导出 `applicationLabel(status)`；`left → 「已退出」`（文案 key 放 `tripMessages`）。现状是 `TripDetailPage.tsx` / `MyTripsPage.tsx` / `ApplicationsPage.tsx` 三处各自复制了同名函数，本次统一改为引用新模块，不保留副本。
- 状态徽标沿用现有 `badge muted` 风格，不新增颜色。

## D12 校验归属

- 集合时间解析与区间判定抽到 `routeme/pojo/TripMeetingRules`（后端纯类，与 `TripPlan` 同包）：`parse(value)`、`validateWithin(endDate, value)`；发布（`TripPlan.create`）与更新共用，服务端为权威。
- `TripPlan` 是不可变 record，更新集合信息返回新实例（沿用 `withId` / `withStatus` 风格），落库由 `TripPlanServiceImpl` 完成。
- `MAX_MEETING_AREA_LENGTH`（100）沿用 `routeme.constant.TripCatalogConstant` 既有常量，不新增常量。
- 前端 `tripForm.ts` / `meetingForm.ts` 做同样的即时校验，仅为体验，不作为安全边界。

## D13 错误码映射（沿现有实现，不引入 422）

| 情况 | 状态 | code |
|---|---|---|
| `meeting_time` 无法解析、`meeting_area` > 100、集合时间晚于结束日期、消息空白/超长 | 400 | `INVALID_INPUT` |
| 非发布者改集合 | 403 | `FORBIDDEN` |
| 非匹配访问聊天（含仅 PENDING） | 403 | `CHAT_NOT_ALLOWED` |
| 已结束行程改集合 | 409 | `TRIP_NOT_OPEN` |
| 已结束发送消息 | 409 | `CHAT_READ_ONLY` |

判据：`@rule:api-contract` 写的是 400/422，但仓库现有异常全部使用 400（`INVALID_INPUT`）/ 403（`FORBIDDEN`、`CHAT_NOT_ALLOWED`）/ 409（`CHAT_READ_ONLY`、`TRIP_NOT_OPEN` 等），无任何 422。用户 2026-11-16 裁决跟现有实现，故降级规则的 422 措辞；本 change 不新增错误码，也不改老端点状态码。

## D14 原型与本设计的差异

- 原型有完整行程编辑页（`#/edit/:id`）；产品只实现「集合区域 + 集合时间」编辑入口与弹窗。差异已在提案 Out of scope 与 G1 条件中记录。
- 原型集合区域 `maxlength` 由 30 调整为 100，与契约 `meeting_area.maxLength: 100` 对齐。
- 原型存在一处既有缺陷（详情页同行者进度条 `.meter` 用 `<span>` 导致大色块），与本 change 无关，不在本次修改范围；记录为遗留项。

## D15 遗留与不在范围

- 消息分页、未读数、已读回执、推送、图片：不实现。
- 集合提醒/日程冲突：不实现。
- 聊天历史在退出后保留，但发布者不能通过聊天页移除会话：不提供删除入口。
