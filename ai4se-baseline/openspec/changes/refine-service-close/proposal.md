# 变更提案：refine-service-close

- **需求来源：** GitHub Issue [#38](https://github.com/afs-2026-zha3-group-2/RouteME/issues/38)「客服服务BUG-客服无法结束会话」｜ **需求条目：** `requirement-workspace/requirements/REQ-028-service-close.md`（S29）
- **能力：** `customer-service`（**ADDED Requirements**）；依赖 `user-support`（入口，未归档）、`user-auth`（已归档）、`trip-companions`（隔离不变量，已归档）
- **规模：** M（新增 1 组 ADDED Requirement / 28 Scenario；新增 `V30` 迁移 + 契约 0.25.0；用户端结束、客服标记完成、四态状态机、两个新端点、删除一个端点）
- **规则：** `@rule:spec-first`、`@rule:api-contract`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:security-baseline`、`@rule:tdd-cycle`、`@rule:sdd-artifacts`

## Why

客服会话目前的结束权完全在管理端：用户端 `ServiceController` 没有结束接口，只有被客服关闭后才显示「重新发起会话」；`WAITING` 状态的用户也无法取消排队。issue #38 的原话是「结束会话应该放到客户端，不应该是客服结束会话」。

把结束权留在客服侧有两个直接问题：一是语义错位——「问题是否解决」只有用户能判断；二是等待期无法退出——客服不在线时会话永久挂在队列。同时，管理端「结束会话」按钮的可用状态只有 `HANDLING`，issue 反馈的「点击没反应」也说明这条链路的预期与实现不一致。

本变更把结束动作交还给用户，并在客服侧引入一个明确的「处理完成」信号（`RESOLVED` / 待用户确认）：客服表达「我这边处理完了」，由用户决定是否结束。

## What Changes

- **用户结束会话**：新增 `POST /api/service/sessions/{sessionId}/close`；`WAITING` / `HANDLING` / `RESOLVED` 三态均可结束；前端二次确认；`closed_at` 写入、`closed_by` 记用户 id；重复结束返回 409 `SESSION_CLOSED`。
- **客服标记处理完成**：新增管理端端点；仅 `HANDLING` 可调用；状态转 `RESOLVED`，写 `resolved_at` / `resolved_by`；点击直接生效（无二次确认）。
- **待用户确认状态**：`RESOLVED` 纳入 `openSession`（`current` 与幂等创建都能看到）；用户或客服发送消息后回到 `HANDLING` 并清空 `resolved_*`；不自动关闭、无定时任务。
- **管理端下线结束能力**：移除「结束会话」按钮；删除 `POST /api/admin/service/sessions/{sessionId}/close`；队列筛选项增加「待用户确认」；待接入徽标仍只统计 `WAITING`。
- **用户端展示**：会话头在三个未结束状态统一显示「结束会话」；`RESOLVED` 显示「客服已标记处理完成，如问题已解决请结束会话」；`CLOSED` 只读与「重新发起会话」沿用。
- **数据 / 契约**：`V30` 给 `customer_service_sessions` 增加 `resolved_at` / `resolved_by`；`openapi.yaml` 升 0.25.0，`ServiceSessionStatus` 增 `RESOLVED`，摘要 / 详情增 `resolved_at`，新增两个端点、删除管理端 close。
- **规格承载**：`customer-service` 尚未进入 Living Spec，本 change 用 ADDED 追加新 Requirement，并在本提案「与既有规格的关系」中显式声明取代 `add-admin-console` Delta 的两条旧表述。

## Out of Scope

- 客服处理质量评价、满意度打分、结束后回访、会话结束原因。
- 自动关闭、超时回收、定时任务（用户 D6 明确不做）。
- 用户端全部历史会话列表；管理端会话导出、统计报表、客服工作量。
- 消息流中的系统提示消息（OQ-5 默认不插入）。
- issue 中管理端「点击结束会话没反应」的独立缺陷修复（按钮已下线）。
- 客服接待上限、会话分配策略、客服在线状态。

## Capabilities

### New Capabilities

- 无。本 change 不新建能力名；`customer-service` 的既有 Requirement 来自未归档的 `add-admin-console` 等 change。

### Modified Capabilities

- `customer-service`（ADDED Requirements）：追加「用户结束客服会话」「客服标记处理完成与待用户确认」「会话状态机与留痕」三条 Requirement；不改 `add-admin-console` / `refine-service-workbench-live` / `refine-service-inbox-unread` / `refine-user-support-entry` 的 Delta 正文。

## Impact

| 位置 | 改动 |
|---|---|
| `backend/src/main/resources/db/migration/V30__add_service_session_resolve.sql`（新增） | `customer_service_sessions.resolved_at` / `resolved_by` |
| `ServiceSessionStatusEnum` | 增加 `RESOLVED` |
| `CustomerServiceImpl` | `openSession` 扩三态；`close` 改为用户结束（三态 CAS）；新增 `resolve`（标记完成）；`appendMessage` 在 `RESOLVED` 下回迁 `HANDLING` 并清空 `resolved_*` |
| `ServiceController` / `AdminServiceController` | 新增用户 close；新增管理端标记完成；删除管理端 close |
| `CustomerServiceSessionEntity` / `CustomerServiceSession` | 增加 `resolvedAt` / `resolvedBy` |
| `ServiceSessionSummaryResponse` / `ServiceSessionDetailResponse` | 增加可空 `resolved_at`（管理端详情按需返回操作人，P3 定） |
| `frontend/src/help/ServiceChat.tsx` / `SupportPage.tsx` | 三态结束按钮 + 二次确认；`RESOLVED` 提示；`reloadSession` 不再误判待确认 |
| `frontend/src/admin/service/AdminServiceDetailPage.tsx` / `AdminServicePage.tsx` | 移除结束按钮；新增「标记处理完成」；筛选四态；待确认文案与徽标 |
| `frontend/src/i18n/adminMessages.ts` / `api.ts` / `types.ts` | 新文案、新接口、状态 union |
| `openapi.yaml` | 0.25.0；`ServiceSessionStatus` 增 `RESOLVED`；两个新端点；删除 close；摘要 / 详情增 `resolved_at` |
| 测试 | 后端状态机 / API / 迁移双引擎；前端状态派生纯函数；E2E `customer-service` / `admin` 改写 |
| `openspec/changes/refine-service-close/specs/customer-service/spec.md` | ADDED：3 Requirement / 28 Scenario |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 管理端结束按钮 | 彻底移除（用户 D1） | issue 明确指出「不应该是客服结束会话」；「点击没反应」随按钮下线消失。 |
| 用户结束范围 | `WAITING` / `HANDLING` / `RESOLVED` 三态统一按钮（用户 D2） | 等待期也能取消排队；文案统一为「结束会话」。 |
| 客服完成信号 | 新增「标记处理完成」，进入待用户确认（用户 D3） | 客服表达「我这边处理完了」，结束决定仍归用户。 |
| 待确认下的消息 | 用户发消息回到 `HANDLING`（用户 D4） | 用户继续提问即表示问题未解决；客服需重新标记。 |
| 管理端 close 接口 | 删除（用户 D5） | 状态机只保留一条结束路径，避免后端留后门。 |
| 超时 | 不自动关闭（用户 D6） | 不引入定时任务；用户主动结束才结束。 |
| 完成留痕 | `resolved_at` / `resolved_by`（用户 D7） | 可追溯何时、哪位客服标记完成。 |
| 结束操作人 | `closed_by` 只记用户（用户 D8） | 审计语义与「用户结束」一致。 |
| 规格承载 | ADDED + 声明取代旧 Delta（按未归档 Delta 的承载惯例） | `customer-service` 未进 Living Spec，不能写 MODIFIED。 |
| 契约 / 迁移 | 暂定 0.25.0 + V30，P3 排他确认 | `origin/main` 当前 0.24.0 / V29。 |

## 验收信号

1. 用户发起会话后处于 `WAITING`，点「结束会话」→ 确认 → 状态变 `CLOSED`，管理端队列显示「已结束」；可重新发起新会话。
2. 客服接入后点「标记处理完成」→ 状态变 `RESOLVED`，用户端 3 秒内看到「待用户确认」提示与「结束会话」按钮。
3. 用户在 `RESOLVED` 发一条消息 → 会话回到 `HANDLING`，`resolved_*` 清空，客服端重新看到「处理中」。
4. 客服在 `HANDLING` 点「标记处理完成」→ 用户点「结束会话」→ 双方只读，历史消息完整保留。
5. 管理端不再出现「结束会话」按钮；直接请求 `POST /api/admin/service/sessions/{id}/close` 返回 404。
6. `RESOLVED` 会话不计入待接入徽标；筛选「待用户确认」可列出该会话。

## 与既有规格的关系（取代声明）

- 本 change 的 Delta 为 `customer-service` **ADDED**，新增 Requirement「用户结束客服会话」「客服标记处理完成与待用户确认」「会话状态机与留痕」。
- **显式取代：** `openspec/changes/add-admin-console/specs/customer-service/spec.md` 的「人工客服会话生命周期」中「用户 MUST NOT 自行关闭会话」与 Scenario「会话结束（客服结束会话）」由本 change 取代；归档时以本 change 为准。
- **归档顺序：** `customer-service` 尚未进入 `openspec/specs/`；本 change MUST 在 `add-admin-console` 之后归档，并与 `refine-service-workbench-live` / `refine-service-inbox-unread` / `refine-user-support-entry` 的归档顺序协调。
- **不改：** `user-support` 入口与访问控制、`user-auth` 会话契约、`trip-companions` 行程聊天隔离。

## 风险与依赖

| 级别 | 项 | 缓解 |
|---|---|---|
| Risk | `customer-service` 未归档，无法 MODIFIED | ADDED + 取代声明；G1 由 SA 具名确认 |
| Risk | `openSession` 漏改导致待确认被误判已结束 | P0 G-05 列为必改；E2E 补「待确认刷新仍可见」 |
| Risk | 消息发送与状态回迁并发 | 同事务 + `.eq(status, RESOLVED)` 条件更新；P3 给并发测试 |
| Risk | 删除管理端 close 影响旧客户端 | 契约同步删除；无外部客户端；E2E 断言 404 |
| Risk | E2E 两条既有用例依赖被删能力 | P4 改写为新链路 |
| Risk | 契约 / 迁移号撞号 | 暂定 0.25.0 + V30；P3 排他确认 |
| 依赖 | `user-support`、`user-auth`、`trip-companions` | 只读消费，不改语义 |
