# P3 设计记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-029 / 实时通知中心与未读计数）｜ **阶段：** P3（Delta Spec → Design / ATDD / Tasks）
- **日期：** 2026-11-17（首版）；2026-11-18（八类扩围） ｜ **记录人：** Karena（当前开发者，已向发起人确认）
- **前置：** P2 Delta Spec 与 G1 已通过（`docs/reviews/20261117-add-realtime-notifications-spec-review.md` §6，2026-11-17T16:44+0800；`openspec/changes/add-realtime-notifications/g1-decision.md`，2026-11-17T16:48+0800；扩围复核 `docs/reviews/20261118-add-realtime-notifications-expansion-review.md`）

## 1. 阶段目标

把 8 条 Requirement / 36 条场景落成可执行的工程方案：先定接口契约与迁移编号，再定后端写入 / 去重 / 目标解析 / 推送链路，最后定前端状态归约、六处徽标与通知中心页；同时给出 ATDD 的 Red / Green 切片与任务顺序，使 P4 可以按一条一条失败测试推进。

本阶段不写生产代码，只产出设计、ATDD、任务与评审。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 设计 | [`design.md`](../../../openspec/changes/add-realtime-notifications/design.md) | §1–§10：分工铁律、组件、数据模型、契约、后端、前端、端点追溯、测试策略、风险 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-realtime-notifications/atdd-design.md) | 36/36 场景映射；D1–D15；U / S / H / B / F / M / N / V 八层用例 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-realtime-notifications/tasks.md) | T1–T16；§2 验证命令 C1–C7；§3 场景追溯 36 行 |
| 设计评审 | [`20261117-add-realtime-notifications-design-review.md`](../../reviews/20261117-add-realtime-notifications-design-review.md) | Pass；0 BLOCKER / 2 WARNING（已关闭）/ 4 SUGGESTION（2 关闭、2 记录） |
| 任务评审 | [`20261117-add-realtime-notifications-tasks-review.md`](../../reviews/20261117-add-realtime-notifications-tasks-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（1 关闭、2 记录） |
| 扩围复核 | [`20261118-add-realtime-notifications-expansion-review.md`](../../reviews/20261118-add-realtime-notifications-expansion-review.md) | Pass；E-01 / E-02 已收口 |
| 阶段记录 | 本文件 | 设计口径、排他确认与签署 |

## 3. 设计口径（要点）

| # | 决策 | 落点 |
|---|---|---|
| D1 | 新增能力 `notifications`（ADDED），不 MODIFY `trip-companions`（其 Delta 尚未归档，避免同文件双写） | Delta Spec / `design.md` §2 |
| D2 / D3 | 服务器推送用 SSE（`SseEmitter`），每次 `open` 先 REST 拉快照对账，断线丢事件降级为延迟而非丢失 | `design.md` §5.6–§5.7、§6.2 |
| D4 | 一个事件一行持久化记录，未读定义为 `read_at IS NULL`，`status` 派生、不另存 | `design.md` §3、§5.2 |
| D5 | 拒绝（`rejected`）同样通知申请者，不只接受 | `design.md` §5.1 |
| D6 | 通知写入失败**不回滚**任何业务动作：`write()` 内部捕获 + `log.warn`，生产者不加 `try/catch` | `design.md` §5.2、§10 R-1 |
| D7 | 收件人定向：每个事件发给相关方，永不自通知（`actorId == recipientId` 直接丢弃） | `design.md` §5.1、§5.2 |
| D8 | 六处徽标口径：铃铛 / 侧栏通知中心 / 账号菜单 = `total`；侧栏与移动 tab 聊天入口、会话列表 = `CHAT` | `design.md` §6.3 |
| D9 | 标读三范围：单条 / 全部 / 单个会话（`trip_id` + 对方 `user_id`），全部按 `recipient_id` 限定 | `design.md` §5.5 |
| D10 / D10b | 保留既有 3 秒轮询兜底；`formatChatTime` 迁到叶子 `utils/chatTime.ts` 以断开依赖环 | `design.md` §6.5、§10 R-10 |
| D11 | 流端点用 `user_id` 查询参数（与既有 `X-User-Id` 同级信任，见 R-3） | `design.md` §4.4 |
| D12 | 契约 0.26.0 + 迁移 `V31__add_notifications.sql`，开工前复检排他 | `design.md` §3、`tasks.md` §3 |
| D13 | 列表取最新 50 条，不做清理任务；ONGOING 与安全提醒在读取详情时惰性物化 | `design.md` §5.3、§10 R-5 |
| D14 | 提示条：非聊天类总是提示；聊天类仅在对应会话未打开时提示 | `design.md` §6.1、§6.5 |
| D15 | 跳转由后端 `target.kind` 决定；未知目标回通知中心 | `design.md` §5.4、§6.4 |
| D16 | `related_available` 由后端判定；不可用时保留正文、提示、不跳转、仍标读 | `design.md` §5.4、§6.4 |
| D17 | 优先级 `NORMAL` / `HIGH`；信用分低于 60 与恢复通知为 `HIGH` | `design.md` §5.1 |
| D18 | 去重：`(recipient_id, dedupe_key)` 唯一 + 先查后插 + 唯一冲突兜底 | `design.md` §3、§5.2 |
| P3-1 | 通知写入加入调用方事务，推送用 `afterCommit` 发布，避免推送先于提交 | `design.md` §5.2、§5.6 |
| P3-2 | 流服务落地为 `NotificationStreamService` + `Impl`；写入服务保留 `NotificationService` | `design.md` §2、§10 R-7 |
| P3-3 | 3 秒窗口测量点：T0 = 生产方 HTTP 响应返回，T1 = 收件方徽标重渲染 | `design.md` §5.7、ATDD M9 |
| P3-4 | 在途快照竞争用 `lastReadSeq` 护栏（旧快照只合并条目、不采用计数）+ 状态单调 + 计数逐项取大 | `design.md` §6.1、§10 R-9 |
| P3-5 | 分会话徽标由最新 50 条条目派生，边界记入 R-6，不扩范围做全量分会话计数 | `design.md` §6.3、§10 R-6 |
| P3-6 | 账号通知用 `ObjectProvider<NotificationService>` 打破构造期循环；可用性判断走 mapper | `design.md` §5.1、§10 R-11 |
| P3-7 | 八类计数由枚举驱动，八键恒出现、零值不省略 | `design.md` §5.4 |
| P3-8 | 通知中心页复用铃铛面板的同一份 store，不新建第二套读取逻辑 | `design.md` §2、§6.4 |

## 4. 接口与数据

| 项 | 内容 |
|---|---|
| 契约版本 | `openapi.yaml` 0.24.0 → **0.26.0**（`OpenApiTest` 版本断言同步） |
| 新增路径 | `GET /notifications`、`GET /notifications/stream`、`POST /notifications/{id}/read`、`POST /notifications/read`、`GET /reports/mine` |
| 新增 schema | `NotificationType`、`NotificationEventName`、`NotificationPriority`、`NotificationStatus`、`NotificationTargetKind`、`NotificationTarget`、`Notification`、`NotificationCounts`、`NotificationList`、`NotificationReadRequest`、`NotificationEvent` |
| 枚举规模 | 8 类型 / 22 事件 / 2 优先级 / 2 状态 / 8 目标种类 |
| 错误码 | `NOTIFICATION_NOT_FOUND`（越权一律 404，不暴露存在性）；`scope=conversation` 缺定位字段 400；`scope=all` 忽略定位字段 |
| 迁移 | `V31__add_notifications.sql`；只用 `INTEGER` / `VARCHAR` / `CREATE INDEX`，双引擎（SQLite + H2） |
| 索引 | 唯一索引 `(recipient_id, dedupe_key)`；查询索引 `(recipient_id, read_at)` |
| 实时线格式 | `text/event-stream`，`Cache-Control: no-cache`，`X-Accel-Buffering: no`，20 s 心跳，单 emitter 失败隔离 |

## 5. 覆盖与顺序

- **Requirement：** 8 / 8 均有设计章节、任务与至少一个自动化验收层；没有只靠人工走查兜底的场景。
- **场景：** REQ-029 §4 的 S30-1 ~ S30-36 逐条对应 `tasks.md` §3 与 `atdd-design.md` 的 U / S / H / B / F / M / N / V 用例。
- **任务顺序：** T1 契约 → T2 迁移 → T3 后端纯函数 → T4 服务 → T5 申请与裁决钩子 → T6 其余域钩子 → T7 失败隔离 → T8 流服务与接口 → T9 前端纯函数 → T10 `chatTime` 迁移 → T11 壳层 → T12 通知中心与跳转页 → T13 聊天整合 → T14 E2E → T15 文档 → T16 回归与走查。
- **交互确认：** 铃铛位于顶栏账号入口旁，**click 展开**（签署时确认，不做 hover）；Escape 关闭并把焦点还给铃铛。通知中心入口在侧栏与账号菜单各一处，数字来自同一 store。
- **扩围影响：** 首版设计只覆盖四类事件；扩围后新增 `NotificationLifecycleService`、`NotificationEventListener`、六处徽标、通知中心页、目标解析与不可用判定，D1–D18 / P3-1–P3-8 为最终口径。

## 6. 校验

- `openspec validate add-realtime-notifications --strict` → `Change 'add-realtime-notifications' is valid`。
- 契约 / 迁移排他复检：全仓 `V30__add_notifications` 与 `0.26.0` 仅出现在本 change 工件与本需求记录中，无其它 change 占用。
- 本阶段无生产代码、无 `openapi.yaml`、无迁移变更，回归沿用 P0 基线（后端 434 / 前端 344 全绿），不重跑。

## 7. 签署

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `openspec/changes/add-realtime-notifications/design.md` | 1 | Karena | 2026-11-17T17:11+0800 |
| `openspec/changes/add-realtime-notifications/design.md` | 2 | Jay | 2026-11-17T17:11+0800 |
| `docs/reviews/20261117-add-realtime-notifications-design-review.md` | 1 | WAYNE | 2026-11-17T17:11+0800 |
| `docs/reviews/20261117-add-realtime-notifications-design-review.md` | 2 | Karena | 2026-11-17T17:11+0800 |
| `openspec/changes/add-realtime-notifications/tasks.md` | 1 | Karena | 2026-11-17T17:17+0800 |
| `openspec/changes/add-realtime-notifications/tasks.md` | 2 | Jay | 2026-11-17T17:17+0800 |
| `docs/reviews/20261117-add-realtime-notifications-tasks-review.md` | 1 | WAYNE | 2026-11-17T17:17+0800 |
| `docs/reviews/20261117-add-realtime-notifications-tasks-review.md` | 2 | Karena | 2026-11-17T17:17+0800 |
| 扩围后的 design / atdd / tasks | — | 沿用上述签署位，扩围复核见 `20261118-add-realtime-notifications-expansion-review.md` | 2026-11-18T10:20+0800 |

**阶段结论：Pass**。设计 / ATDD / 任务链已签，P3 工件门禁通过，可进入 P4 实现。

## 8. 下一步

1. P4 按 T1 → T16 顺序执行；每个切片先 Red 并记录失败原因，再 Green。
2. T1 先复检 0.26.0 / `V31__add_notifications.sql` 排他，再改契约。
3. T15 的 `registry.md` 更新放在 T16 通过之后；P4 结束写 `docs/sdd/add-realtime-notifications/p4-implementation.md`。