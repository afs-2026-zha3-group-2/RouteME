# 技术设计 — refine-service-close

- **Change：** `refine-service-close`（REQ-028 / S29，issue #38）｜ **能力：** `customer-service`（ADDED Requirements）
- **输入：** Delta Spec（3 Requirement / 31 Scenario）、[`proposal.md`](proposal.md)、[`atdd-design.md`](atdd-design.md)、`g1-decision.md`（Pass，IO=WAYNE / SA=Jacky）、P0 `p0-baseline.md`（D1–D9、G-01~G-09）
- **日期：** 2026-11-18
- **契约 / 迁移：** `openapi.yaml` **0.25.0**；`V30__add_service_session_resolve.sql`（排他确认：`origin/main@9a13fe4` 仍为 0.24.0 / V29）
- **口径：** 本文件只做技术设计，不含实现代码；任务拆分见 [`tasks.md`](tasks.md)，验收分层见 [`atdd-design.md`](atdd-design.md)。用户裁决 D1–D9 见 P0 记录；本文 **T1–T12** 为技术决策。

## 1. 目标与边界

把客服会话结束权从管理端移交给用户，并给客服一个「处理完成」信号：

```text
WAITING ──join(客服)──► HANDLING ──resolve(客服)──► RESOLVED ──close(用户)──► CLOSED
   │                        │                          │
   └──── close(用户) ───────┴──── close(用户) ─────────┘
                              ▲                          │
                              └──── 任意一方发言 ────────┘（清 resolved_*）
```

- 用户：`WAITING` / `HANDLING` / `RESOLVED` 三态均可结束；结束前前端二次确认。
- 客服：仅 `HANDLING` 可「标记处理完成」；不再拥有结束能力。
- 不做：满意度 / 评价、超时自动关闭、历史会话列表、系统提示消息、客服接待上限、issue 中「管理端点击没反应」的独立修复。

## 2. 数据模型（V30）

`customer_service_sessions` 追加两列（既有列不改）：

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `resolved_at` | `VARCHAR(40)` | 可空 | 客服标记完成时间，ISO-8601 字符串（与 `created_at` / `closed_at` 同格式） |
| `resolved_by` | `INTEGER` | 可空 | 标记完成的客服 `id`；不建外键（与 `joined_by` / `closed_by` 一致） |

```sql
-- V30__add_service_session_resolve.sql
ALTER TABLE customer_service_sessions ADD COLUMN resolved_at VARCHAR(40);
ALTER TABLE customer_service_sessions ADD COLUMN resolved_by INTEGER;
```

- 不新增索引：查询仍走既有 `(user_id, status)` 与 `(status, created_at)`。
- 回填：无需回填（既有行两列均为 `NULL`）。
- 状态列 `VARCHAR(12)` 容纳 `RESOLVED`（8 字符），无需改列。
- H2 / SQLite 双引擎：仅 `ALTER TABLE ... ADD COLUMN`，无方言差异。

## 3. 状态机（单一真源）

`ServiceSessionStatusEnum` 由三值扩为四值（顺序固定，概览与前端图例同序）：

| 值 | 含义 | 终态 |
|---|---|---|
| `WAITING` | 等待客服接入 | 否 |
| `HANDLING` | 处理中 | 否 |
| `RESOLVED` | 待用户确认（客服已标记完成） | 否 |
| `CLOSED` | 已结束 | 是 |

| # | 迁移 | 触发 | 端点 | 写入 |
|---|---|---|---|---|
| M1 | `WAITING → HANDLING` | 客服接入 | `POST /admin/service/sessions/{id}/join`（不变） | `joined_at` / `joined_by` |
| M2 | `WAITING → CLOSED` | 用户结束 | `POST /service/sessions/{id}/close`（新增） | `closed_at` / `closed_by=用户` |
| M3 | `HANDLING → RESOLVED` | 客服标记完成 | `POST /admin/service/sessions/{id}/resolve`（新增） | `resolved_at` / `resolved_by=客服` |
| M4 | `HANDLING → CLOSED` | 用户结束 | 同 M2 | 同 M2 |
| M5 | `RESOLVED → HANDLING` | 任一方发言 | 消息端点（既有） | 清空 `resolved_at` / `resolved_by` |
| M6 | `RESOLVED → CLOSED` | 用户结束 | 同 M2 | 同 M2（保留 `resolved_*`） |

闭集外一律拒绝：

| 尝试 | 结果 |
|---|---|
| `WAITING → RESOLVED` | 409 `SESSION_NOT_HANDLING`（resolve 只接受 `HANDLING`） |
| `CLOSED → *`（join / resolve / close / 发言） | 409（join `SESSION_ALREADY_HANDLING`、resolve `SESSION_NOT_HANDLING`、close / 发言 `SESSION_CLOSED`） |
| 重复 `close` | 409 `SESSION_CLOSED`，不覆盖既有 `closed_*` |
| 重复 `resolve` | 409 `SESSION_NOT_HANDLING`，不覆盖既有 `resolved_*` |

不变量：

- 同一用户同时最多一条未结束会话（`WAITING` / `HANDLING` / `RESOLVED`）。
- `closed_by` 只可能是用户 id；`resolved_by` 只可能是客服 id。
- `RESOLVED` 不自动结束，无定时任务。

## 4. 契约 0.25.0

### 4.1 端点

| 方法 | 路径 | 身份 | 说明 |
|---|---|---|---|
| POST | `/service/sessions/{sessionId}/close` | Bearer 用户 | **新增**；三态结束；404 非本人 / 不存在；409 `SESSION_CLOSED` |
| POST | `/admin/service/sessions/{sessionId}/resolve` | Bearer ADMIN | **新增**；仅 `HANDLING`；404 不存在；409 `SESSION_NOT_HANDLING` |
| POST | `/admin/service/sessions/{sessionId}/close` | — | **删除**；旧路径 404 |
| GET | `/service/sessions/current` | Bearer 用户 | 描述改为「`WAITING` / `HANDLING` / `RESOLVED`；无则为空」 |
| POST | `/service/sessions` | Bearer 用户 | 描述改为「已有三态之一时返回原会话」 |

### 4.2 Schema 增量

| Schema | 变更 |
|---|---|
| `ServiceSessionStatus` | `enum: [WAITING, HANDLING, RESOLVED, CLOSED]` |
| `ServiceSessionSummary` | 新增可空 `resolved_at`（`date-time`，`readOnly`）；`resolved_by` **不下发** |
| `AdminDashboardServiceSessions.by_status` | `required` 增 `RESOLVED`；`properties` 增 `RESOLVED`（integer ≥ 0） |

### 4.3 错误码

不新增错误码：`SESSION_CLOSED`（用户 close 重复 / 已结束后发言）、`SESSION_NOT_HANDLING`（resolve 非处理中）、`SESSION_ALREADY_HANDLING`（join 非等待中）、`SESSION_INVALID`（缺 Bearer）沿用。

## 5. 后端设计

### 5.1 `CustomerService` 接口

| 方法 | 变更 |
|---|---|
| `closeByUser(long sessionId, long userId)` | **新增**；替代移除的 `close(long, long)` |
| `resolve(long sessionId, long adminId)` | **新增** |
| `close(long sessionId, long adminId)` | **删除** |
| 其余方法 | 签名不变；`openSession` 内部扩三态 |

### 5.2 用户结束（T1：三态 CAS，不先读后写状态）

1. `selectById`；不存在或 `userId` 不匹配 → `Optional.empty()`（Controller 返回 404）。
2. 条件更新：`WHERE id=? AND user_id=? AND status IN ('WAITING','HANDLING','RESOLVED')`，`SET status='CLOSED', closed_at=now, closed_by=userId`。
3. 更新 0 行 → `SessionClosedException`（409 `SESSION_CLOSED`）；更新 1 行 → 重新读取并返回 `detail(session,false)`。

并发两次结束：第二次 CAS 0 行 → 409，`closed_*` 不被覆盖（U7 / S5）。

### 5.3 客服标记完成（T2：HANDLING CAS）

1. `selectById`；不存在 → `Optional.empty()`（404）。
2. 条件更新：`WHERE id=? AND status='HANDLING'`，`SET status='RESOLVED', resolved_at=now, resolved_by=adminId`。
3. 更新 0 行 → `SessionNotHandlingException`（409 `SESSION_NOT_HANDLING`）；成功 → `adminDetail(sessionId)`。

`WAITING` / `RESOLVED` / `CLOSED` 均落到 409，与 Delta A2 / A3 一致。

### 5.4 消息写入与状态回迁（T4：同事务）

`appendMessage(session, senderType, senderId, content)`：

1. `CLOSED` → `SessionClosedException`（既有）。
2. 校验 `content` 1–500 字（既有）。
3. 若原状态为 `RESOLVED`：条件更新 `WHERE id=? AND status='RESOLVED'` → `SET status='HANDLING', resolved_at=NULL, resolved_by=NULL`。
4. 步骤 3 更新 0 行时重读状态：`CLOSED` 或行不存在 → `SessionClosedException`；否则（已被并发回迁）继续。
5. 插入消息并返回。

用户与客服走同一 `appendMessage`，因此 A5 / A6 / S4 行为对称（OQ-1 按对称口径）。`@Transactional` 保证回迁与消息插入同生共死；`message_count` 只 +1，不插入系统消息（Non-goal）。

### 5.5 `openSession` 三态

`WHERE user_id=? AND status IN ('WAITING','HANDLING','RESOLVED') ORDER BY created_at DESC, id DESC LIMIT 1`。这是 G-05 的根因修复：不改 `ServiceChat.reloadSession`，靠后端让 `current` 在待确认时返回会话。

### 5.6 概览分桶（T6）

`AdminDashboardServiceImpl.SERVICE_SESSION_STATUS_KEYS` 由三键改四键（`WAITING` / `HANDLING` / `RESOLVED` / `CLOSED`），`zeroFilled` 天然输出零值；`merge` 按 `status` 落桶。契约 `by_status.required` 同步四键，保证「总数 = 分桶之和」与「不省略状态键」。

### 5.7 响应组装

- `CustomerServiceSession` record 增 `resolvedAt` / `resolvedBy`；`CustomerServiceSessionEntity` 增两字段与 getter/setter。
- `ServiceSessionSummaryResponse` / `ServiceSessionDetailResponse` 在 `closedAt` 之后增 `String resolvedAt`；`resolvedBy` 不下发（用户端不泄露客服身份，A4）。
- `@JsonInclude(NON_NULL)` 已存在，空值不出现，与 `joined_at` / `closed_at` 一致。

### 5.8 错误与守卫

| 场景 | 结果 |
|---|---|
| 用户 close 缺 Bearer | 401 `SESSION_INVALID`（`authService.requireUser`，既有） |
| 管理员 resolve 缺 Bearer / 非 ADMIN | 401 `SESSION_INVALID` / 403 `ADMIN_REQUIRED`（`adminPrincipalService.requireAdmin`，既有） |
| 被封禁用户 close / 发言 | 403 `ACCOUNT_BANNED`（`assertCanWrite(SUPPORT)`，既有；close 也调用） |
| 停用用户 close / 发言 | 允许（既有 `SUPPORT` scope 仅拦 `BANNED`） |

## 6. 前端设计

### 6.1 类型与 API

| 文件 | 变更 |
|---|---|
| `types.ts` | `ServiceSessionStatus` 增 `'RESOLVED'`；`ServiceSessionSummary` 增 `resolved_at?: string \| null` |
| `api.ts` | `closeServiceSession` 改指向 `POST /service/sessions/{id}/close`；新增 `resolveServiceSession` → `POST /admin/service/sessions/{id}/resolve` |

### 6.2 用户端（`ServiceChat` / `SupportPage` / `helpStatus`）

- 会话头动作区：`WAITING` / `HANDLING` / `RESOLVED` 显示「结束会话」（`Popconfirm` 二次确认，`T9`）；`CLOSED` 只显示「重新发起会话」。
- 确认弹窗按状态区分标题（`T9` / OQ-4 定稿见 §7）。
- 结束成功：`onSessionChange(next)` 直接切换为 `CLOSED` 只读态，无需刷新。
- `RESOLVED` 提示：`helpResolved`（「客服已标记处理完成，如问题已解决请结束会话」），不展示客服身份。
- 状态提示函数从 `SupportPage` / `ServiceChat` 两处私有实现抽到 `help/helpStatus.ts` 的 `serviceChatHint(status)`（可单测；`SupportPage` 与 `ServiceChat` 改为引用）。
- `ServiceConversation` 不改：`closed` 仍只看 `CLOSED`；`RESOLVED` 可输入，发送成功后 `reloadSession` 拉回 `HANDLING`。

### 6.3 管理端（`AdminServiceDetailPage` / `AdminServicePage` / `adminStatus` / `adminMessages`）

- 会话头：删除「结束会话」`Popconfirm` 与 `close` 调用；`HANDLING` 显示「标记处理完成」主按钮（`T10`：无二次确认，`loading=acting`，成功 `message.success`）。
- 队列筛选：`STATUS_OPTIONS` 由 4 项（含「全部」）改 5 项，增「待用户确认」。
- `adminStatus.ts`：`ServiceStatusTone` 增 `'jade'`；`serviceStatusLabel('RESOLVED') = '待用户确认'`；`serviceStatusTone('RESOLVED') = 'jade'`（与举报 `RESOLVED` 同色）。
- `ServiceStatusBadge` 注释「三态」→「四态」（行为由 `serviceStatusLabel` / `Tone` 驱动）。
- `AdminServicePage.trackUnread` 不改：`RESOLVED` 有新消息仍计未读（`status !== 'CLOSED'`）。
- 概览（`AdminDashboardPage`）：`SERVICE_SESSION_STATUS_ORDER` 增 `'RESOLVED'`（置于 `HANDLING` 与 `CLOSED` 之间）；`SERVICE_SESSION_STATUS_LABELS` 增「待用户确认」。

### 6.4 队列排序（T8 / OQ-6 定稿）

服务端 `queueOrder()` 不改：`WAITING` 置顶、创建时间升序；其余状态（`HANDLING` / `RESOLVED` / `CLOSED`）按创建时间倒序。`RESOLVED` 自然落在「其余」组，与 `CLOSED` 同组倒序。

## 7. 文案定稿（OQ-4）

| 位置 | 键 | 文案 |
|---|---|---|
| 用户端会话头按钮 | `serviceClose`（复用） | 结束会话 |
| 用户端确认弹窗（WAITING） | `serviceCloseWaitTitle` / `serviceCloseWaitBody` | 结束会话？ / 结束后将取消排队，需要时再重新发起。 |
| 用户端确认弹窗（HANDLING / RESOLVED） | `serviceCloseTitle` / `serviceCloseBody` | 结束会话？ / 结束后双方只能查看历史消息。 |
| 确认 / 取消按钮 | `confirm` / `cancel`（复用） | 结束会话 / 取消 |
| 待确认提示 | `helpResolved` | 客服已标记处理完成，如问题已解决请结束会话。 |
| 状态徽标 | `sessionResolved` | 待用户确认 |
| 管理端标记按钮 | `serviceResolve` | 标记处理完成 |
| 管理端成功提示 | `serviceResolvedToast` | 已标记处理完成，等待用户确认。 |
| 管理端待确认说明 | `serviceResolvedHint` | 已标记完成，等待用户确认；用户继续发言会回到处理中。 |
| 筛选选项 | `sessionResolved` | 待用户确认 |
| 概览图例 | `sessionResolved` | 待用户确认 |

`adminMessages.ts` 是纯对象常量，不引入函数；确认弹窗通过状态三元选择两个键。

## 8. 兼容与迁移

| 项 | 处理 |
|---|---|
| 既有 `WAITING` / `HANDLING` / `CLOSED` 行 | 不动；`resolved_*` 为 `NULL` |
| 旧客户端调用 admin close | 契约删除 → 404（S10）；无外部客户端 |
| 旧客户端读取会话 | `status` 多一个值、`resolved_at` 可空；`@JsonInclude` 不破坏旧字段 |
| 前端旧 bundle | 后端不依赖前端版本；`RESOLVED` 徽标在旧 bundle 会显示默认「等待接入」——本 change 前后端同批发布，不做版本协商 |
| E2E 既有用例 | `[C3]` 与 `[I3]` 依赖 admin close，P4 改写（G1 C4） |

## 9. 技术决策

| id | 决策 | 理由 / 替代 |
|---|---|---|
| T1 | 用户 close 用三态 CAS 条件更新 | 避免「读-判-写」并发窗口；替代方案（先读后写）在双端同时操作时可能覆盖 `closed_*` |
| T2 | resolve 用 `HANDLING` CAS，非法/重复统一 409 `SESSION_NOT_HANDLING` | 复用既有异常与错误码；不为「重复标记」新增码 |
| T3 | 旧 admin close 直接删除映射（404） | 契约与实现同批删除；保留 410 需要新增错误码且无客户端依赖 |
| T4 | 回迁与消息插入同事务；CAS 0 行时重读，`CLOSED` 则 409 | 防「关闭瞬间仍写入消息」；重读成本可接受 |
| T5 | `resolved_by` 不下发，`resolved_at` 下发 | Delta 只要求 `resolved_at`；用户端不展示客服身份（A4） |
| T6 | 概览 `by_status` 扩四键 | `add-admin-dashboard` Delta 要求「不省略状态键 / 总数=分桶之和」；`additionalProperties: false` 禁止动态键 |
| T7 | `RESOLVED` 徽标用 `jade`，`ServiceStatusTone` 增该值 | 与举报 `RESOLVED` 同色，语义一致 |
| T8 | 队列排序不改后端比较器 | 现有 `WAITING` 置顶 + 其余倒序已满足 OQ-6 |
| T9 | 用户端用 `Popconfirm`（按状态给标题） | 与既有管理端交互一致；antd 已引入，无新依赖 |
| T10 | 管理端「标记处理完成」无二次确认 | 用户裁决 D3 明确直接生效；误触可由用户发言回迁 + 再次标记恢复 |
| T11 | 契约 0.25.0 + 迁移 V30 | `origin/main@9a13fe4` 复核：0.24.0 / V29，未被占用 |
| T12 | 概览测试用「基线增量」断言 | 避免与并行用例的数据互相干扰；断言桶 +1 与四桶之和 |

## 10. 测试与验证

分层、场景映射、fixtures 与门禁命令见 [`atdd-design.md`](atdd-design.md)；任务拆分与先后顺序见 [`tasks.md`](tasks.md)。本设计不引入 NFR 测试与新 CI 语义。

## 11. 视觉与原型

- `docs/prototype/v1` / `v2` 无客服会话界面（P0 已核）；本 change 不新增原型改动（`@rule:prototype-ui-alignment` 的「先改原型」不适用：无新增视觉模式）。
- 复用既有 `help-chat` / `admin-service` / `badge` 样式与 antd 组件；不新增十六进制色值与魔法像素。
- 三档视口（1440 / 1024 / 390）× 浅色 / 深色走查记 P4。
