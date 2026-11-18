# ATDD 设计 — refine-service-close

- **Change：** `refine-service-close`（REQ-028 / S29，issue #38）
- **输入：** Delta Spec（3 Requirement / 31 Scenario）、[`design.md`](design.md)、[`proposal.md`](proposal.md)、现有 `ServiceControllerTest` / `AdminServiceControllerTest` / `AdminDashboardControllerTest` / `AdminConsoleMigrationSqliteTest` / `OpenApiTest`、`e2e/tests/customer-service.spec.ts` / `admin.spec.ts`、`frontend/src/admin/adminStatus.test.ts`
- **日期：** 2026-11-18
- **NFR 测试：** 本轮**不纳入**（无 SLA / QPS 指标；唯一的时效要求「3 秒可见」由既有 `startChatPolling` 常量与 E2E 轮询覆盖）

## 1. 结论

| 层 | 用在哪 | 场景数（31 总计） |
|---|---|---|
| **API** | 三态结束、非本人 / 未登录 / 重复结束、标记完成的合法与非法迁移、留痕字段、`current` 覆盖待确认、消息回迁、契约枚举与字段、概览分桶、旧路径 404、会话隔离 | 24 条含 API 断言（其中 20 条仅 API） |
| **E2E** | 结束入口可见性、确认弹窗取消、待确认提示、3 秒可见、管理端无结束按钮 / 仅处理中可标记、四态筛选、待接入徽标口径、重新发起、历史保留 | 11 条含 E2E 断言（其中 7 条仅 E2E） |
| **Defer UT**（`/sdd:atdd-apply`） | `serviceStatusLabel` / `serviceStatusTone` 四态、`statusHint` 四态、`reloadSession` 空响应不再误判、`trackUnread` 对待确认的处理 | 4 组（不对应场景编号） |

分层依据：一条场景若只需一个端点即可判定 → API；若 THEN 断言页面状态、跨页可见性或「按钮必须不出现」→ E2E；纯函数（文案、色调、状态派生）→ Defer UT。

## 2. 场景 → 验收映射

### 2.1 用户结束客服会话（U）

| # | Scenario | 层 | 断言要点 |
|---|---|---|---|
| U1 | 等待接入时结束（取消排队） | API | `POST /service/sessions/{id}/close` → 200；`status=CLOSED`；`closed_at` 有值；管理端队列该会话为 `CLOSED` |
| U2 | 处理中结束 | API + E2E | 200；双方输入区变只读；历史消息仍可读 |
| U3 | 待用户确认时结束 | API | 200；既有 `resolved_at` / `resolved_by` 保留；`closed_at` / `closed_by` 写入 |
| U4 | 确认弹窗可取消 | E2E | 点击「结束会话」→ 取消 → 状态徽标、`resolved_*`、`closed_*` 均不变 |
| U5 | 只能结束本人会话 | API | 用户 B 调 A 的会话 → 404；A 的会话状态与审计字段不变 |
| U6 | 未登录不能结束 | API | 无 Bearer → 401 `SESSION_INVALID` |
| U7 | 重复结束被拒绝 | API | `CLOSED` 再调 → 409 `SESSION_CLOSED`；`closed_at` / `closed_by` 不被覆盖 |
| U8 | 三个未结束状态都有结束入口 | E2E | `WAITING` / `HANDLING` / `RESOLVED` 三个会话头都可见「结束会话」；`CLOSED` 不出现 |
| U9 | 结束后可重新发起 | API + E2E | 新 `POST /service/sessions` 创建新 `WAITING`；旧会话按 id 仍可读 |

### 2.2 客服标记处理完成与待用户确认（A）

| # | Scenario | 层 | 断言要点 |
|---|---|---|---|
| A1 | 处理中标记完成 | API | `POST /admin/service/sessions/{id}/resolve` → 200；`status=RESOLVED`；`resolved_at` / `resolved_by` 写入；无二次确认 |
| A2 | 非处理中不可标记 | API | `WAITING` / `CLOSED` 调 → 409 `SESSION_NOT_HANDLING`；状态与 `resolved_*` 不变 |
| A3 | 重复标记被拒绝 | API | `RESOLVED` 再调 → 409；`resolved_at` / `resolved_by` 不被覆盖 |
| A4 | 用户看到待确认提示与结束入口 | E2E | 会话头显示「待用户确认」与固定提示；「结束会话」可见；页面不出现客服昵称；无自动结束 |
| A5 | 用户发言恢复处理中 | API | 200/201 消息落库；`status=HANDLING`；`resolved_at` 为 null |
| A6 | 客服发言恢复处理中 | API | 管理端发消息 → 消息落库；`status=HANDLING`；`resolved_*` 清空 |
| A7 | 待确认下双方 3 秒可见 | E2E | 一方在 `RESOLVED` 发言 → 另一方 3 秒内看到消息且徽标回到「处理中」 |
| A8 | 管理端没有结束入口 | E2E | 任一状态会话头都无「结束会话」；`HANDLING` 只有「标记处理完成」 |
| A9 | 标记完成按钮仅处理中可见 | E2E | `WAITING` / `RESOLVED` / `CLOSED` 无该按钮；`HANDLING` 点击直接生效 |
| A10 | 管理端筛选与待确认可见 | API + E2E | `GET /admin/service/sessions?status=RESOLVED` 只返回待确认；筛选下拉五项，选「待用户确认」可打开详情 |
| A11 | 待接入徽标不计入待确认 | API + E2E | 仅有 `RESOLVED` 无 `WAITING` 时，`status=WAITING` 列表 `total=0`，页签无徽标 |

### 2.3 会话状态机与留痕（S）

| # | Scenario | 层 | 断言要点 |
|---|---|---|---|
| S1 | 合法迁移闭集 | API | 六条合法迁移逐条通过；闭集外（`WAITING → RESOLVED`、`WAITING → HANDLING` 由 join 承接、`CLOSED → *`）→ 409，状态不变 |
| S2 | 每用户最多一条未结束会话 | API | 已有 `WAITING` / `HANDLING` / `RESOLVED` 时再次 `POST /service/sessions` 返回同一 id |
| S3 | current 覆盖待确认 | API | `RESOLVED` 时 `GET /service/sessions/current` 返回该会话（非空） |
| S4 | 恢复处理中清空留痕 | API | `RESOLVED → HANDLING` 后 `resolved_at` / `resolved_by` 为 null |
| S5 | 结束操作人只记用户 | API | `closed_by` = 用户 id；无任何客服写入路径（旧 close 已下线） |
| S6 | 已结束不可发言 | API | 双方发消息 → 409 `SESSION_CLOSED`；历史可读 |
| S7 | 历史会话保留 | E2E | `CLOSED` 后管理端与本人仍可读完整消息与 `resolved_*` / `closed_*` |
| S8 | 契约状态与字段一致 | API（契约） | `ServiceSessionStatus` 四值；摘要 / 详情含可空 `resolved_at`；用户端与客服端字段同名 |
| S9 | 概览统计包含待用户确认分桶 | API | `by_status` 含 `RESOLVED`；该会话计入；`total` = 四桶之和 |
| S10 | 管理端 close 路径下线 | API | `POST /admin/service/sessions/{id}/close` → 404；会话状态不变 |
| S11 | 客服会话与行程聊天隔离 | API | `/me/chat-partners`、`/trips/{id}/messages` 不含客服消息 |

## 3. 先于生产代码写的内容

按 `@rule:api-contract` 的顺序，**契约先改，再写失败验收**：

1. **契约：** `openapi.yaml` 升 0.25.0（`ServiceSessionStatus` 四值、`ServiceSessionSummary` 增 `resolved_at`、新增两个端点、删除管理端 close、概览 `by_status` 四键）；`OpenApiTest` 先加失败断言（版本、路径清单、枚举、字段、旧路径缺席、分桶四键）。
2. **失败 API 验收：** `ServiceControllerTest` 增 U1–U3 / U5–U7 / S1–S6；`AdminServiceControllerTest` 增 A1–A3 / A5–A6 / A10–A11 / S10，删除依赖管理端 close 的旧用例；`AdminDashboardControllerTest` 增 S9；`AdminConsoleMigrationSqliteTest` 增 `resolved_at` / `resolved_by` 与 V30 断言。
3. **失败 E2E：** 改写 `customer-service.spec.ts [C3]`（用户结束）并新增 `[C4]`（标记完成 → 待确认 → 发言回迁 → 再标记 → 结束）；改写 `admin.spec.ts [I3]`（客服标记完成、无结束按钮、四态筛选）。
4. **Defer UT：** `adminStatus.test.ts` 补 `RESOLVED` 文案与色调；新增 `help/serviceChatStatus.test.ts`（`statusHint` 四态与 `reloadSession` 空响应）；`AdminServicePage` 的 `trackUnread` 行为随 E2E 覆盖，不单列单测。

## 4. 本地 vs CI 门禁

| 层 | 本地命令 | CI |
|---|---|---|
| 契约 | `cd ai4se-baseline/RouteME; npx.cmd -y @redocly/cli lint openapi.yaml` | 无独立 job（`mvnw verify` 内 `OpenApiTest` 兜底） |
| 后端 API | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | `./mvnw -B -ntp verify` |
| 前端 | `cd ai4se-baseline/RouteME/frontend; npm.cmd test; npm.cmd run build` | `npm run build && npm test` |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx.cmd playwright test tests/customer-service.spec.ts tests/admin.spec.ts` | 不在 CI job 内，按本地 / 发布前执行 |
| 规格 | `cd ai4se-baseline; npx.cmd --no-install openspec validate refine-service-close --strict` | 无 |

不引入第二套 CI 语义；E2E 依赖本地已启动的前后端与隔离 SQLite（`ROUTEME_E2E_BASE_URL` 可指向独立实例）。

## 5. Fixtures 策略

| 需要的数据 | 造法 | 清理 |
|---|---|---|
| 管理员身份 | 种子 `admin / admin12345`，`POST /auth/login` 取 Bearer | 不清理（种子） |
| 普通用户 | `POST /auth/register`（`createUserViaApi`），用户名带时间戳 | 不删 |
| 会话三态 | `POST /service/sessions` → `WAITING`；管理员 `join` → `HANDLING`；管理员 `resolve` → `RESOLVED` | 不删；`CLOSED` 后自然退出活跃集合 |
| 固定时间 | 后端测试 `@Import(FixedClockTestConfig.class)`；断言 `resolved_at` / `closed_at` = `FixedClockTestConfig.NOW` | — |
| 概览分桶 | 每个用例先读 `GET /admin/dashboard` 基线，再插入一条目标状态会话，断言对应桶 +1 且 `total` = 四桶之和 | 事务回滚（`@Transactional`） |

`e2e/tests/support.ts` 不新增 helper：会话流程全部用 `page.request` 直接串（与现有 `[C3]` / `[I3]` 风格一致）。

## 6. NFR 测试

**本轮不纳入。** 理由：无 SLA / QPS 指标；「3 秒可见」是既有轮询常量的功能断言，不另设压测。

## 7. Non-goals 与反向验证

| Out-of-scope / Non-goal | 反向用例 | 层 |
|---|---|---|
| 无超时自动关闭 / 定时任务 | 静态：无 `@Scheduled` / 超时字段；E2E：`RESOLVED` 停留两轮轮询仍为待确认 | 静态 + E2E |
| 客服无结束能力 | 契约无 admin close；`POST /admin/service/sessions/{id}/close` → 404；管理端无按钮 | API + E2E |
| 无满意度 / 评价 / 回访 | 无新表、无新端点、无评分字段 | 静态 |
| 不插入系统提示消息 | `RESOLVED` 发言后 `message_count` 只 +1，消息列表无系统消息 | API |
| 无用户历史会话列表 | `#/support` 只渲染当前会话，无列表容器 | E2E |
| 用户端不展示标记完成客服身份 | 用户端详情不返回 `resolved_by`；页面不出现客服昵称 | API + E2E |
| 不改行程聊天 | S11 隔离断言 | API |

## 8. 完成定义（DoD）

- §2 的 API 行全部有对应后端测试方法（红→绿）；E2E 行全部进两个既有 spec 文件。
- `OpenApiTest` 断言 0.25.0、四值枚举、`resolved_at`、resolve 端点存在、admin close 缺席、概览四桶。
- 前端纯逻辑单测覆盖四态文案 / 色调与 `statusHint`。
- 既有 `customer-service` / `admin` 回归保持全绿；`profile.spec.ts` 等无关用例不被触碰。
- 三档视口（1440 / 1024 / 390）× 浅色 / 深色人工走查，截图记 P4 报告。
