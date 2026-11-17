# 技术设计评审报告 — add-admin-console

- **工件：**
  - `openspec/changes/add-admin-console/design.md`（D1–D17；数据模型 V19、契约 0.13.0、后端 / 前端设计、三档布局、追溯）
  - `openspec/changes/add-admin-console/atdd-design.md`（API / E2E 分层、61 场景映射、fixtures、门禁、Non-goals 反向验证）
- **change-id：** `add-admin-console` ｜ **需求条目：** REQ-018 / S19–S24
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:sdd-artifacts`、`@rule:pii-scrubbing`）
- **评审输入：** `design.md` 全文；`atdd-design.md` 全文；三份 Delta Spec（14 Requirement / 61 Scenario）；`proposal.md`；`g1-decision.md`；`openapi.yaml` 0.11.0；`V17__meeting_areas.sql`；`AuthServiceImpl` / `DemoUserServiceImpl` / `ReportServiceImpl` / `ChatServiceImpl` / `GlobalExceptionHandler`；`ApplicationNotPendingException` 等 6 个既有 409 异常；`TripStatusEnum`；`frontend/src/{App,route,api,types}.ts`、`AppShell.tsx`、`chatPolling.ts`、`styles.css`；`e2e/tests/support.ts`
- **工具校验：** `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`（无 WARNING）；追溯表 14 行与 14 Requirement 一一对应；场景映射覆盖 61 条（A1–A38 / C1–C13 / U1–U10）

## 评审结论

**Pass**（BLOCKER 0 / WARNING 5（全部已修）/ SUGGESTION 5（3 已修、2 待 P4））

设计覆盖三份 Delta 的全部 14 Requirement：管理端统一 Bearer + `role=ADMIN`，账号状态机与封禁到期采用「读时计算、写时落库」，举报处理用条件更新 + 单事务，客服消息独立建表并复用 3s 短轮询。四项高风险的实现选择（身份来源、惰性解封、并发处理、消息隔离）都有明确的拒绝方案与可观察断言。两处与规则文本的偏离（409 / 大写枚举）已由发起人确认并固化为 D15 / D16，不是实现遗漏。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| D-01 | WARNING | `@rule:spec-first` | `design.md` §4.2 `AdminUserStatusRequest` | `reason` 写成无条件必填，但 Delta 只要求「暂停与封禁填写处理原因」；恢复账号被迫填理由，与已签场景不符 | `reason` 改为 `SUSPEND` / `BAN` 必填、`RESTORE` 可选；`RESTORE` 留空时写固定文案 | `admin-console` 场景「恢复账号」；需求段「暂停与封禁 MUST 填写处理原因」 | **已修** |
| D-02 | WARNING | `@rule:spec-first` | `design.md` §4.2 `ServiceSessionSummary` | `user` 子对象缺注册时间，而 Delta 要求客服工作台展示「注册时间」 | `user{…,created_at}` | `admin-console`「客服工作台」需求段与场景「查看用户资料与相关举报」 | **已修** |
| D-03 | WARNING | `@rule:spec-first` | `design.md` §4.2 `AdminReportDetail` | 只有 `target.label`，Delta 要求详情展示「被举报内容」；仅标题不足以判断，尤其体验正文 | 增 `target.content_excerpt`：行程「标题 + 目的地 + 出发日期」、体验 / 用户正文前 200 字 | `admin-console` 场景「查看举报上下文」 | **已修** |
| D-04 | WARNING | `@rule:api-contract` §字段 | `design.md` §2.1 / §4.2 / §5.3 | 解封时间字段名 `banned_until` 违反「时间字段以 `_at` 结尾」 | DB 列与 wire 字段统一改 `ban_expires_at` | `openapi.yaml` 既有 `created_at` / `updated_at` 命名 | **已修**（D15 / D16 之外的第三处偏离被消除，不新增偏离登记） |
| D-05 | WARNING | `@rule:web-coding-style` / `@rule:api-contract` | `design.md` §4.2 `AdminUserDetail` | `trips[]` / `experiences[]` / `reports[]` 无上限；369 个存量账号中重度发布者会一次拉全量 | 三列各取最近 50 条 + `trip_total` 等全量计数；超出显示「仅显示最近 50 条」 | `dev` 快照 110 行程 / 6 体验 / 13 举报；`PageResponse` 上限 50 的既有语义 | **已修** |
| D-06 | SUGGESTION | `@rule:sdd-artifacts` | `design.md` §4.2 | `status_updated_by{nickname}` / `processed_by{nickname}` 只有昵称，后台无法跳转到该管理员 | 改为 `{id,nickname}` | 与 `reporter{id,nickname}` 风格对齐 | **已修** |
| D-07 | SUGGESTION | `@rule:sdd-artifacts` | `design.md` §5.3 | 伪代码里残留「并清空 ban_* 展示字段？不！」的思考痕迹，读者无法判断最终口径 | 改为明确注释：到期只改 `status`，历史列保留 | `design.md` 原文 | **已修** |
| D-08 | SUGGESTION | `@rule:api-contract` | `design.md` §4.2 `HelpReportSummary` | `GET /help/reports` 未定义排序与返回量级；实现可能全表返回 | 明确 `created_at DESC`、最近 50 条 + `total` | `customer-service`「我的举报」需求段 | **已修** |
| D-09 | SUGGESTION | `@rule:api-contract` | `design.md` D15 / D16 | 409 与大小写枚举两处偏离只在本 change 内自洽，仓库其余端点仍是旧风格 | P4 在交付说明登记「规则文本 ↔ 代码」待统一项；仓库级统一另开 change | `ApplicationNotPendingException`（409）、`TripStatusEnum`（`recruiting`） | 待 P4 |
| D-10 | SUGGESTION | `@rule:api-contract` | `design.md` §5.2 | 管理端每请求读一次 `role` + 一次有效状态，等于两次查询；MVP 可接受，但 P4 若加缓存会导致降权延迟 | 不加缓存；在 P4 说明「每请求读库是刻意选择」 | `design.md` §5.2 首条 | 待 P4（记录用） |

**Counts：** BLOCKER 0 / WARNING 5（已修）/ SUGGESTION 5（3 已修、2 待 P4）→ **Pass**

## 与规则 / 已签 Delta 的一致性

| 检查 | 结论 |
|---|---|
| Requirement 覆盖 | Pass：追溯表 14 行对应 14 Requirement（`admin-console` 9 / `customer-service` 4 / `user-auth` 1），无孤儿需求、无超范围设计 |
| 场景可验收性 | Pass：`atdd-design.md` 覆盖 61 条（A1–A38 / C1–C13 / U1–U10）；56 条含 API 断言、38 条含 E2E 断言、6 组纯逻辑 defer UT，分层依据与 `layer-inference` 的优先级一致 |
| 契约先行顺序 | Pass：`atdd-design.md` §3 明确「先改 `openapi.yaml` 0.13.0 → 写红后端 → 写红 E2E → 前端」，符合 `@rule:api-contract` 的改动顺序；契约版本与迁移号避开 `add-ai-itinerary`（0.12.0 / V18） |
| 状态机封闭性 | Pass：`ACTIVE→SUSPENDED`、`ACTIVE/SUSPENDED→BANNED`、`SUSPENDED→ACTIVE`，其余 409 `INVALID_STATUS_TRANSITION`；到期由 `effectiveStatus` 放行并在下一次写事务落库；`CANNOT_TARGET_SELF` 只拦暂停 / 封禁 |
| 事务与并发 | Pass：举报 `resolve` 用 `UPDATE … WHERE status='PROCESSING'` 条件更新 + 影响行数判定，处罚同事务回滚；客服 `join` / `close` 同样用条件更新，`WAITING` 并发只有首个成功 |
| 权限边界 | Pass：管理端 Bearer + `role=ADMIN`，`role` 每请求读库；管理员自身被暂停 / 封禁时同样 403（D1 / §5.2）；前端仅隐藏入口，不作安全边界 |
| 身份可信度 | Pass（有登记）：新增 `/help/**`、`/service/**` 用 Bearer（D17），拒绝 `X-User-Id` 与双头回落；既有业务写路径仍是 `X-User-Id`，已在 §9 与提案残余风险登记 |
| 数据保留 / 删除边界 | Pass：处罚只改状态；三个关联列表只读；全文无 `DELETE` 端点、无「删除内容」路径；`content_excerpt` 是只读摘要 |
| 数据隔离 | Pass：`customer_service_sessions` / `customer_service_messages` 与 `chat_messages` 物理隔离，`/me/chat-partners`、`/trips/{id}/messages` 查询链不变 |
| 隐私边界 | Pass：`HelpReportSummary` 不含 `resolution_note` 与处罚细节；举报人只看本人；被举报人无查询入口；邮箱仅管理端可见 |
| 枚举唯一真源 | Pass：6 个枚举集中定义，Java 侧 `code()` / `of()` 与既有 `ApplicationStatusEnum` 一致；非法值 400 `INVALID_INPUT` |
| 错误码收口 | Pass：13 个错误码集中成表（端点 × HTTP × 触发 × 异常类），12 个新异常均继承 `BusinessException`，`GlobalExceptionHandler` 无需改动 |
| 前后端契约一致 | Pass：`DemoUser.role/status` 只读、`AuthRegisterRequest.email` 选填；后台 7 条新路由均为纯函数可单测；文案集中在 `adminMessages.ts` / `helpStatus.ts`，无散落中文字面量 |
| 3s 时效可验证 | Pass：复用 `CHAT_POLL_INTERVAL_MS = 3000` 与 `startChatPolling`，`CLOSED` / 卸载停止；E2E 的 C5 / C6 / A35 以 3 秒内状态变化断言 |
| 三档布局 | Pass：1440 / 768 / 390 三档给出表格 / 两栏 / 卡片与 Drawer 降级规则，复用现有 tokens，不新增硬编码色值 |
| NFR 范围 | Pass：本轮不做 NFR 测试（发起人 2026-11-17 决定），3 秒要求转为功能断言，已在 `atdd-design.md` §6 显式记录 |
| 并行会话 WIP | Pass：设计与 ATDD 均未涉及 `profile.spec.ts`、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx` 的未提交改动与未跟踪的 `V16__normalize_demo_user_profiles.sql` |

## 残余风险

- **409 / 大写枚举是两条已裁决偏离。** D15 / D16 与 `@rule:api-contract` 的规则文本不一致，但与已签 Delta、现有 6 个 409 异常及用户原话一致；仓库级统一不在本 change 内（D-09）。
- **`BANNED` 无法提前解封。** 状态机只允许 `SUSPENDED→ACTIVE`，被封禁账号只能等 `ban_expires_at` 到期；若运营需要「提前解封」，必须另开需求改已签 Delta，P4 不得私自加 `RESTORE` 分支。
- **`BANNED` 无求助通道（已裁决）。** 客服会话对 `BANNED` 返回 403，与「BANNED 只读」一致；用户 2026-11-17 接受该取舍，若后续要开通道，需同时改 Delta 与守卫表。
- **既有写路径仍依赖可伪造的 `X-User-Id`。** 本 change 只把管理端与用户侧 `/help`、`/service` 换成 Bearer；行程 / 申请 / 聊天 / 体验 / 举报提交的越权风险仍在，P4 验收不得据此宣称「身份问题已解决」。
- **`content_excerpt` 的跨表读取。** 举报列表 / 详情需读 `trip_plans`、`trip_experiences`、`app_users`；P4 需批量取（按 `target_type` 分组一次查询），避免 50 行列表触发 N+1。
- **封禁到期依赖系统时钟。** P4 必须用 `FixedClockTestConfig` 覆盖「到期前 / 到期后」，否则用例随真实时间抖动。
- **本地迁移链不干净（环境）。** 未跟踪的 `V16__normalize_demo_user_profiles.sql` 与 `V16__add_meeting_time.sql` 并存会让 Flyway 启动失败；P4 前由该 WIP 负责人清理，与本 change 的 V19 无关。
- **8080 上的旧后端进程。** 当前运行实例仍是 0.11.0 契约（`meeting_area`，无 `meeting_areas` / `meeting_time`），P4 联调前需重启，避免用旧响应验证新契约。
- **`admin / admin12345` 仅限本地演示。** 明文只进 P4 交付说明；真实部署必须换密码并迁移到正式鉴权（另开需求）。

## 下一步（非 Gate）

- P3 后半：按本设计写 `tasks.md`（迭代 1 / 2 / 3 分组，每条任务带验证命令与覆盖场景），跑对齐自检与 P3 checklist。
- P4：V19 迁移与回填、`OpenApiTest` 0.13.0、账号状态守卫、举报单事务、客服会话与 3s 轮询、两个新 E2E spec、三档视口走查。
- P5：按提案的归档顺序落地，先 `add-user-profile`，再本 change；归档后复核 `openspec/specs/user-auth/spec.md`，并在 `refine-safety-report` 的 `trip-companions` 补处置闭环交叉引用。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `design.md` + `atdd-design.md` | 工件 1 | Jacky（AO，当前开发） | 2026-11-17 | 已批准 |
| `design.md` + `atdd-design.md` | 工件 2 | Karena（SA） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（AO，当前开发） | 2026-11-17 | 已批准 |

> 按 `@rule:artifact-review-gate`，design 工件已由「当前开发者 + 一位既非当前开发者亦非 WAYNE 的成员」联签，报告已由 WAYNE + 当前开发者联签（均 2026-11-17，发起人确认）。P3 的 `tasks.md` 解锁；`tasks.md` 完成后仍需按同一 signer matrix 再签一轮。