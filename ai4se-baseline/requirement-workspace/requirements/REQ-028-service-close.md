# REQ-028 — 客服会话结束权交由用户（Ready 需求）

- **能力：** `customer-service`（ADDED Requirements；既有 Requirement 由未归档 `add-admin-console` 提供）
- **对应 OpenSpec change：** `refine-service-close`
- **草稿日期：** 2026-11-18 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** GitHub Issue [#38](https://github.com/afs-2026-zha3-group-2/RouteME/issues/38)「客服服务BUG-客服无法结束会话」（故事 S29；优先级 / 迭代 / 点数待 IO 确认）
- **证据：** `RouteME/backend/src/main/java/routeme/service/impl/CustomerServiceImpl.java`；`RouteME/backend/src/main/java/routeme/controller/ServiceController.java`；`RouteME/backend/src/main/java/routeme/controller/AdminServiceController.java`；`RouteME/frontend/src/help/ServiceChat.tsx`；`RouteME/frontend/src/admin/service/AdminServiceDetailPage.tsx`；`RouteME/backend/src/main/resources/db/migration/V21__admin_console.sql`；`RouteME/openapi.yaml`（0.24.0）

## Discovery Decision

**Go（light intake，2026-11-18）。** 全部变更收敛在 `customer-service` 与会话状态机；D1–D9 已由用户裁决；无 blocking 开放问题。管理端客服评价、历史会话列表、超时任务明确排除。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-028 |
| statement | 系统 SHALL 允许用户在客服会话未结束时自行结束会话（`WAITING` / `HANDLING` / 待用户确认 `RESOLVED` 三态可用，二次确认后写 `closed_at` / `closed_by=用户`）；客服 MUST NOT 再关闭会话，只 SHALL 在 `HANDLING` 时「标记处理完成」，使会话进入 `RESOLVED` 并记录 `resolved_at` / `resolved_by`；`RESOLVED` 下用户发送消息 MUST 使会话回到 `HANDLING`；管理端结束按钮与 `POST /api/admin/service/sessions/{sessionId}/close` MUST 被移除。 |
| actors | 普通用户（发起、沟通、结束会话）；管理员 / 客服（接入、回复、标记处理完成）；系统（状态机、留痕、隔离）。 |
| rationale | 「问题是否解决」只有用户能判断；结束权在客服侧导致语义错位，且 `WAITING` 用户无法退出排队。见意图 `intents/REQ-028-service-close.md`。 |
| acceptance hints | 见 §4 场景 U-1 ~ U-8、A-1 ~ A-5、M-1 ~ M-3、D-1 ~ D-5、G-1 ~ G-5、S-1 ~ S-6、R-1 ~ R-4。 |
| links to evidence | 见 §6 Context；Delta `openspec/changes/refine-service-close/specs/customer-service/spec.md`。 |

## 1. Intent

一句话：**用户说结束才结束**。客服的处理完成是一个可被用户看见的信号（`RESOLVED`），不是替用户做决定；用户在任何未结束状态都可以结束，结束后可重新发起新会话。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 普通用户 | 只能结束自己的会话；可结束 `WAITING` / `HANDLING` / `RESOLVED`；在 `RESOLVED` 发消息可恢复对话；不能把他人会话结束。 |
| 管理员 / 客服 | 只能接入 `WAITING`、在 `HANDLING` 标记处理完成、回复消息；**不能结束会话**；不能替用户发消息。 |
| 未登录访客 | 无任何客服会话能力，沿用既有 401。 |
| 系统 | 维护四态迁移；记录 `joined_*` / `resolved_*` / `closed_*`；保证每用户最多一个未结束会话；保证客服消息与行程聊天隔离。 |

## 3. In / Out scope

**In scope**

- 用户结束：新增 `POST /api/service/sessions/{sessionId}/close`；`WAITING` / `HANDLING` / `RESOLVED` 均可；二次确认（前端）；写 `closed_at` 与 `closed_by=用户 id`；重复结束拒绝。
- 客服标记完成：新增管理端端点（名称 P3 定稿），仅 `HANDLING` 可调用；状态转 `RESOLVED`；写 `resolved_at` / `resolved_by`。
- 待确认状态：`RESOLVED` 纳入 `openSession`（`current` 与幂等创建都能看到）；用户发消息回到 `HANDLING` 并清空 `resolved_*`。
- 管理端：移除「结束会话」按钮与 `close` 接口；新增「标记处理完成」按钮（直接生效）；状态筛选增加 `RESOLVED`；文案增加「待用户确认」。
- 用户端：会话头统一显示「结束会话」；`RESOLVED` 显示「客服已标记处理完成，如问题已解决请结束会话」；`CLOSED` 只读与「重新发起会话」沿用。
- 数据与契约：`V30` 给 `customer_service_sessions` 加 `resolved_at` / `resolved_by`；`ServiceSessionStatus` 增 `RESOLVED`；摘要 / 详情返回 `resolved_at`；删除 `POST /admin/service/sessions/{sessionId}/close`。

**Out of scope**

- 客服评价 / 满意度 / 回访；会话结束原因。
- 自动关闭、超时回收、定时任务（D6 明确不做）。
- 用户端全部历史会话列表；管理端会话导出与统计。
- 消息流中的系统提示消息（OQ-5 默认不做）。
- issue 中管理端「点击结束会话没反应」的独立修复（按钮已下线）。
- 客服工作量、接待上限、分配策略。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 用户结束会话

1. **U-1 等待中可结束（取消排队）** — Given 会话 `WAITING` 且属于当前用户，When 用户点击「结束会话」并确认，Then SHALL 变为 `CLOSED`，`closed_at` 有值、`closed_by` 为用户 id；管理端队列该会话 SHALL 显示「已结束」。
2. **U-2 处理中可结束** — Given 会话 `HANDLING`，When 用户确认结束，Then SHALL 变为 `CLOSED`；双方消息区 SHALL 只读；历史消息 MUST 全部保留。
3. **U-3 待用户确认可结束** — Given 会话 `RESOLVED`，When 用户确认结束，Then SHALL 变为 `CLOSED`，`resolved_*` 保留、`closed_*` 写入。
4. **U-4 二次确认可取消** — Given 用户点击「结束会话」，When 在确认弹窗点取消，Then 会话状态 MUST NOT 改变。
5. **U-5 只能结束本人会话** — Given 用户 A 已登录、会话属于用户 B，When A 调用结束接口，Then SHALL 返回 404，B 的会话 MUST NOT 改变。
6. **U-6 未登录拒绝** — Given 无 Bearer，When 调用结束接口，Then SHALL 沿用既有 401 `/ SESSION_INVALID`，会话不变。
7. **U-7 已结束重复结束被拒** — Given 会话已 `CLOSED`，When 再次调用结束接口，Then SHALL 返回 409 `SESSION_CLOSED`，`closed_*` MUST NOT 被覆盖。
8. **U-8 结束后可重新发起** — Given 上一会话 `CLOSED`，When 用户点击「重新发起会话」，Then SHALL 创建新的 `WAITING` 会话；旧会话历史 SHALL 仍可按 id 读取。

### B. 客服标记处理完成

9. **A-1 处理中可标记完成** — Given 会话 `HANDLING`，When 客服点击「标记处理完成」，Then SHALL 变为 `RESOLVED`，`resolved_at` 与 `resolved_by` 写入，接口立即成功（无二次确认）。
10. **A-2 等待中不可标记** — Given 会话 `WAITING`，When 客服调用标记完成，Then SHALL 返回 409 `SESSION_NOT_HANDLING`，状态不变。
11. **A-3 待确认不可重复标记** — Given 会话 `RESOLVED`，When 客服再次标记完成，Then SHALL 返回 409，`resolved_*` MUST NOT 被覆盖。
12. **A-4 已结束不可标记** — Given 会话 `CLOSED`，When 客服标记完成，Then SHALL 返回 409，状态不变。
13. **A-5 留痕可追溯** — Given 一次标记完成，When 管理端读取会话详情，Then SHALL 返回 `resolved_at` 与操作人；用户端 MUST NOT 展示操作人身份。

### C. 待用户确认状态下的沟通

14. **M-1 用户发言恢复处理中** — Given 会话 `RESOLVED`，When 用户发送一条 1–500 字消息，Then 消息 SHALL 落库，状态 SHALL 回到 `HANDLING`，`resolved_at` / `resolved_by` SHALL 清空。
15. **M-2 客服发言同样恢复处理中** — Given 会话 `RESOLVED`，When 客服发送消息，Then 消息 SHALL 落库，状态 SHALL 回到 `HANDLING`，`resolved_*` SHALL 清空（对称行为，见 OQ-1）。
16. **M-3 待确认下消息可见** — Given 会话 `RESOLVED` 且一方发送消息，When 另一方页面轮询，Then SHALL 在 3 秒内看到该消息与恢复后的「处理中」状态。

### D. 用户端展示

17. **D-1 三个未结束状态都有结束入口** — Given 会话处于 `WAITING` / `HANDLING` / `RESOLVED`，When 用户打开 `#/support`，Then 会话头 SHALL 显示「结束会话」按钮。
18. **D-2 待确认提示** — Given 会话 `RESOLVED`，When 用户打开客服页，Then SHALL 显示「客服已标记处理完成，如问题已解决请结束会话」类提示，MUST NOT 自动结束。
19. **D-3 等待与处理中提示沿用** — Given `WAITING` / `HANDLING`，When 用户打开客服页，Then 分别显示「等待客服接入」/「客服已接入」，行为不变。
20. **D-4 结束后只读与重新发起** — Given 会话 `CLOSED`，When 用户打开客服页，Then 输入区 SHALL 只读并显示「会话已结束，只能查看历史消息。」，SHALL 提供「重新发起会话」。
21. **D-5 无结束入口泄漏** — Given 用户访问管理端路由（非管理员），When 打开页面，Then MUST NOT 获得标记完成或结束他人会话的能力。

### E. 管理端展示与动作

22. **G-1 移除结束按钮** — Given 客服打开 `HANDLING` 会话，When 查看会话头动作区，Then MUST NOT 出现「结束会话」按钮。
23. **G-2 标记完成按钮仅处理中可见** — Given 会话 `WAITING` / `RESOLVED` / `CLOSED`，When 客服查看动作区，Then MUST NOT 出现「标记处理完成」；仅在 `HANDLING` 出现且点击直接生效。
24. **G-3 队列筛选四态** — Given 客服打开队列筛选，When 展开状态选项，Then SHALL 包含「全部状态 / 等待接入 / 处理中 / 待用户确认 / 已结束」。
25. **G-4 待接入徽标口径不变** — Given 存在 `RESOLVED` 会话但没有 `WAITING` 会话，When 查看后台页签，Then 待接入徽标 MUST NOT 计入 `RESOLVED`。
26. **G-5 待确认会话可见** — Given 存在 `RESOLVED` 会话，When 客服筛选「待用户确认」，Then SHALL 列出该会话且可打开只读详情并继续回复。

### F. 状态机与数据

27. **S-1 合法迁移闭集** — 系统 SHALL 只允许 `WAITING → HANDLING`、`WAITING → CLOSED`、`HANDLING → RESOLVED`、`HANDLING → CLOSED`、`RESOLVED → HANDLING`、`RESOLVED → CLOSED`；其余迁移 MUST 被拒绝。
28. **S-2 每用户最多一个未结束会话** — Given 用户已有 `WAITING` / `HANDLING` / `RESOLVED` 中任一，When 再次发起，Then SHALL 返回该会话，MUST NOT 创建第二条。
29. **S-3 current 覆盖待确认** — Given 用户会话为 `RESOLVED`，When 调用 `GET /api/service/sessions/current`，Then SHALL 返回该会话；MUST NOT 返回空。
30. **S-4 恢复处理中清空完成留痕** — Given `RESOLVED → HANDLING`，When 读取会话，Then `resolved_at` / `resolved_by` MUST 为空。
31. **S-5 结束操作人只记用户** — Given 一次用户结束，When 读取会话审计字段，Then `closed_by` SHALL 为用户 id；客服 MUST NOT 写入该字段。
32. **S-6 已结束不可发言** — Given 会话 `CLOSED`，When 用户或客服发送消息，Then SHALL 返回 409 `SESSION_CLOSED`，历史消息仍可读取。

### G. 契约与兼容

33. **R-1 契约状态与字段** — `openapi.yaml` SHALL 在 `ServiceSessionStatus` 增加 `RESOLVED`，摘要 / 详情 SHALL 增加可空 `resolved_at`；用户端与客服端字段同名。
34. **R-2 管理端 close 路径下线** — Given 旧客户端，When 调用 `POST /api/admin/service/sessions/{sessionId}/close`，Then SHALL 返回 404（路径不存在）；MUST NOT 改变会话。
35. **R-3 会话隔离不变量** — Given 用户同时有客服会话与行程聊天，When 分别查看，Then 两类消息 MUST NOT 混入对方列表。
36. **R-4 历史保留** — Given 会话 `CLOSED`，When 管理端或本人按 id 读取，Then 完整消息与 `resolved_*` / `closed_*` SHALL 保留。

## 5. Constraints

- **单一结束入口：** 只有用户可写 `closed_*`；管理端任何路径都不能结束会话。
- **单一完成入口：** 只有 `HANDLING → RESOLVED` 可写 `resolved_*`。
- **状态码长度：** `RESOLVED` 8 字符，符合 `VARCHAR(12)`；不新增表。
- **完成留痕可清空：** `RESOLVED → HANDLING` 时清空 `resolved_*`，历史通过消息时间线追溯。
- **不引入定时任务。**
- **契约与迁移排他：** `openapi.yaml` 当前 0.24.0、Flyway head `V29`；本 change 暂定 `0.25.0 + V30`，P3 按合并顺序排他确认。
- **未归档 Delta：** 不改 `add-admin-console` / `refine-service-workbench-live` / `refine-service-inbox-unread` / `refine-user-support-entry` 的 Delta；本 change 追加 ADDED 并声明取代关系；归档顺序排在 `add-admin-console` 之后。
- **原型：** 原型无客服会话界面，不做原型先行；视觉沿用现有 `help-chat` / `admin-service` 样式与 antd 组件。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 用户端无 close | `ServiceController` 仅 `current` / `create` / `messages`；`frontend/src/api.ts` 无用户 close |
| 管理端 close 仅 HANDLING | `CustomerServiceImpl.close`：`eq(status, HANDLING)`，否则 `SessionNotHandlingException` |
| `closed_by` 写管理员 | `CustomerServiceImpl.close` 的 `set(closedBy, adminId)` |
| 用户端把空 `current` 当已结束 | `ServiceChat.reloadSession`：`current === null` → `{...session, status: 'CLOSED'}` |
| 三态筛选与徽标 | `AdminServicePage.tsx` `STATUS_OPTIONS`；待接入徽标 `loadAdminServiceSessions({status:'WAITING'})` |
| 契约错误码 | `openapi.yaml`：`SESSION_ALREADY_HANDLING` / `SESSION_NOT_HANDLING` / `SESSION_CLOSED` |
| 表结构 | `V21__admin_console.sql` `customer_service_sessions` |
| E2E 依赖 | `customer-service.spec.ts:202-206`；`admin.spec.ts:666-668` |
| 规格归属 | `openspec/specs/` 无 `customer-service`；Delta 在 `openspec/changes/add-admin-console/specs/customer-service/spec.md` |
| 原型无客服屏 | `docs/prototype` grep `客服` → 0 命中 |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `customer-service` | ADDED Requirements | 新增「会话结束权与待用户确认」Requirement；取代未归档 Delta 的两条旧表述 |
| `user-support` | 依赖（未归档） | 入口与访问控制不变；`#/support` 复用 |
| `user-auth` | 依赖（已归档） | Bearer 身份；不改注册 / 登录 / 退出 |
| `trip-companions` | 只读不变量 | 客服消息与行程聊天隔离；不改 Delta |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | — | 无 | — | D1–D9 已由用户 2026-11-18 裁决 |
| non-blocking | open（OQ-1） | 客服在 `RESOLVED` 状态发消息是否也回到 `HANDLING` | IO / SA | 默认按对称行为（M-2）；若只允许用户触发回迁，M-2 改为「客服可回复但状态保持待确认」 |
| non-blocking | deferred（OQ-2） | 用户端是否展示「哪位客服标记完成」 | IO | 默认不展示，只展示 `resolved_at` 触发提示 |
| non-blocking | deferred（OQ-3） | 契约版本与迁移号 | Dev | 暂定 0.25.0 + V30，P3 排他确认 |
| non-blocking | deferred（OQ-4） | 结束确认文案与三态差异化提示 | IO | P3 文案定稿 |
| non-blocking | deferred（OQ-5） | 是否在消息流插入系统提示消息 | SA | 默认不插入，仅状态与提示区变化 |
| non-blocking | deferred（OQ-6） | 队列排序中 `RESOLVED` 的位置 | SA | 默认与 `CLOSED` 同组倒序；`WAITING` 仍置顶 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | 一句话：用户自己结束会话，客服只标记处理完成 |
| 2 Actors defined | Pass | 用户 / 客服 / 访客 / 系统四类与权限边界 |
| 3 Scope bounded | Pass | In / Out 均非空；评价、超时、历史列表、系统消息显式排除 |
| 4 Scenarios concrete | Pass | 36 条，均含可观察结果 |
| 5 Exception / boundary | Pass | U-5 ~ U-7、A-2 ~ A-4、S-1 / S-6、R-2 |
| 6 Results verifiable | Pass | 状态、`resolved_*` / `closed_*`、错误码、徽标口径均可断言 |
| 7 Dependencies / touchpoints | Pass | `current` / 幂等创建 / 消息写入 / 管理端筛选 / 契约 / 迁移 / E2E 已列出 |
| 8 Open-questions gate | Pass | blocking 0；non-blocking 6 条含默认口径与 owner |
| 9 Data contract decided | Pass | 两列、状态码、清空规则已定；可推 DTO |
| 10 Boundary enumerated | Pass | 非本人、未登录、重复结束、重复标记、已结束发言、状态闭集 |
| 11 Cross-REQ aligned | Pass | 不改入口（REQ-018 系列）、不改认证、不改行程聊天 |
| 12 Notification / display contract decided | Partial | 待确认提示与按钮落点已定；文案与队列排序待 P3（OQ-4 / OQ-6） |

**DoR 结论：** BLOCKER 0 / WARNING 1（文案与排序位置待 P3）。可交 G1。
