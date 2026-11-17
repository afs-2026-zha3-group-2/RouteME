# P3 设计记录 — add-realtime-notifications

- **Change：** `add-realtime-notifications`（REQ-023 / 实时通知与未读计数）｜ **阶段：** P3（Delta Spec → Design / ATDD / Tasks）
- **日期：** 2026-11-17 ｜ **记录人：** Karena（当前开发者，已向发起人确认）
- **前置：** P2 Delta Spec 与 G1 已通过（`docs/reviews/20261117-add-realtime-notifications-spec-review.md` §6，2026-11-17T16:44+0800；`openspec/changes/add-realtime-notifications/g1-decision.md`，2026-11-17T16:48+0800）

## 1. 阶段目标

把 6 条 Requirement / 26 条场景落成可执行的工程方案：先定接口契约与迁移编号，再定后端写入 / 计数 / 推送链路，最后定前端状态归约与四处徽标；同时给出 ATDD 的 Red / Green 切片与任务顺序，使 P4 可以按一条一条失败测试推进。

本阶段不写生产代码，只产出设计、ATDD、任务与评审。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 设计 | [`design.md`](../../../openspec/changes/add-realtime-notifications/design.md) | §1–§10：契约、数据模型、后端链路、前端状态、测试策略、追溯矩阵 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-realtime-notifications/atdd-design.md) | 26/26 场景映射；D1–D12 + D10b；U / S / B / F / M / V 六层用例 |
| 任务 | [`tasks.md`](../../../openspec/changes/add-realtime-notifications/tasks.md) | T1–T14；§2 验证命令 C1–C6；§3 场景追溯 26 行 |
| 设计评审 | [`20261117-add-realtime-notifications-design-review.md`](../../reviews/20261117-add-realtime-notifications-design-review.md) | Pass；0 BLOCKER / 2 WARNING（本次修订内关闭）/ 4 SUGGESTION（2 关闭、2 记录） |
| 任务评审 | [`20261117-add-realtime-notifications-tasks-review.md`](../../reviews/20261117-add-realtime-notifications-tasks-review.md) | Pass；0 BLOCKER / 0 WARNING / 3 SUGGESTION（1 关闭、2 记录） |
| 阶段记录 | 本文件 | 设计口径、排他确认与签署 |

## 3. 设计口径（要点）

| # | 决策 | 落点 |
|---|---|---|
| D1 | 新增能力 `notifications`（ADDED），不 MODIFY `trip-companions`（其 Delta 尚未归档，避免同文件双写） | Delta Spec / `design.md` §2 |
| D2 / D3 | 服务器推送用 SSE（`SseEmitter`），每次 `open` 先 REST 拉快照对账，断线丢事件降级为延迟而非丢失 | `design.md` §5.5–§5.7、§6.2 |
| D4 | 一个事件一行持久化记录，未读定义为 `read_at IS NULL`，不做状态机 | `design.md` §3–§5.2 |
| D5 | 拒绝（`rejected`）同样通知申请者，不只接受 | `design.md` §5.1 |
| D6 | 通知写入失败**不回滚** apply / decide / send：`notify*` 内部捕获 + `log.warn`，不加 `@Transactional` | `design.md` §5.1、§8 R-8 |
| D7 | 收件人定向：发布者收 `application_received`，申请者收 accepted / rejected，消息接收方收 `message`；永不自通知 | `design.md` §5.1、§5.2 |
| D8 | 四处徽标口径：顶栏铃铛 = total，侧栏 / 移动 tab = 消息数，会话列表 = 分会话未读 | `design.md` §6.4、§6.7 |
| D9 | 标读三范围：单条 / 全部 / 单个会话（`trip_id` + 对方 `user_id`），全部按 `recipient_id` 限定 | `design.md` §5.4 |
| D10 / D10b | 保留既有 3 秒轮询兜底；`formatChatTime` 迁到叶子 `utils/chatTime.ts` 以断开依赖环 | `design.md` §6.2、§8 R-10 |
| D11 | 流端点用 `user_id` 查询参数（与既有 `X-User-Id` 同级信任，见 R-3） | `design.md` §4.4 |
| D12 | 契约 0.18.0 + 迁移 `V24`，开工前复检排他 | `design.md` §3、`tasks.md` §3 |
| D13 | 只保留并可查最新 50 条，不做清理任务（另开需求） | `design.md` §5.3、§8 R-5 |
| D14 | 提示条：申请类事件总是提示；消息仅在当前会话未打开时提示 | `design.md` §6.3 |
| P3-1 | 通知写入加入调用方事务，推送用 `afterCommit` 发布，避免推送先于提交 | `design.md` §5.2、§5.5 |
| P3-2 | `NotificationBroker` 落地为 `NotificationStreamService` + `Impl`（与无表服务同构） | `design.md` §2、§8 R-7 |
| P3-3 | 3 秒窗口测量点：T0 = 生产方 HTTP 响应返回，T1 = 收件方徽标重渲染 | `design.md` §5.7、ATDD M9 |
| P3-4 | 在途快照竞争用 `seq` 护栏（旧快照只合并条目、不采用计数）+ `read` 单调 + 计数逐项取大 | `design.md` §6.1、§8 R-9 |
| P3-5 | 分会话徽标由最新 50 条条目派生，边界记入 R-6，不扩范围做全量分会话计数 | `design.md` §6.4、§8 R-6 |

## 4. 接口与数据

| 项 | 内容 |
|---|---|
| 契约版本 | `openapi.yaml` 0.17.0 → **0.18.0**（`OpenApiTest` 两处版本断言 114 / 569 行同步） |
| 新增路径 | `GET /notifications`、`GET /notifications/stream`、`POST /notifications/{id}/read`、`POST /notifications/read` |
| 新增 schema | `NotificationType`、`Notification`、`NotificationCounts`、`NotificationList`、`NotificationReadRequest`、`NotificationEvent` |
| 错误码 | `NOTIFICATION_NOT_FOUND`（越权一律 404，不暴露存在性）；`scope=conversation` 缺定位字段 400；`scope=all` 忽略定位字段 |
| 迁移 | `V24__add_notifications.sql`；只用 `INTEGER` / `VARCHAR` / `CREATE INDEX`，双引擎（SQLite + H2） |
| 索引 | 按收件人 + 时间倒序；按收件人 + 未读过滤 |
| 实时线格式 | `text/event-stream`，`Cache-Control: no-cache`，`X-Accel-Buffering: no`，20 s 心跳，单 emitter 失败隔离 |

## 5. 覆盖与顺序

- **Requirement：** 6 / 6 均有设计章节、任务与至少一个自动化验收层；没有只靠人工走查兜底的场景。
- **场景：** REQ-023 §4 的 S23-1 ~ S23-26 逐条对应 `tasks.md` §3 与 `atdd-design.md` 的 U / S / B / F / M / V 用例（编号统一用 REQ-023 口径，非 Delta 行序）。
- **任务顺序：** T1 契约 → T2 迁移 → T3 后端纯函数 → T4 服务 → T5 生产方 → T6 失败隔离 / 自消息 → T7 流服务与接口 → T8 前端纯函数 → T9 `chatTime` 迁移 → T10 壳层 → T11 聊天整合 → T12 E2E → T13 文档 → T14 回归与走查。
- **交互确认：** 铃铛位于明暗切换旁，**click 展开**（签署时确认，不做 hover）；Escape 关闭并把焦点还给铃铛。

## 6. 校验

- `openspec validate add-realtime-notifications --strict` → `Change 'add-realtime-notifications' is valid`。
- 契约 / 迁移排他复检：全仓 `V24__` 与 `0.18.0` 仅出现在本 change 工件与 REQ-023 记录中，无其它 change 占用。
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

**阶段结论：Pass**。设计 / ATDD / 任务链已签，P3 工件门禁通过，可进入 P4 实现。

## 8. 下一步

1. P4 按 T1 → T14 顺序执行；每个切片先 Red 并记录失败原因，再 Green。
2. T1 先复检 0.18.0 / `V24` 排他，再改契约。
3. T13 的 `registry.md` 更新放在 T14 通过之后；P4 结束写 `docs/sdd/add-realtime-notifications/p4-implementation.md`。