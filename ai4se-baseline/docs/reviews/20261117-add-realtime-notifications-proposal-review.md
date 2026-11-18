# Proposal review — add-realtime-notifications

- **Verdict: Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 4，其中 S-01 评审前已修）
- **Scope：** `focus=full`；`openspec/changes/add-realtime-notifications/proposal.md` 与 P1 支撑工件（REQ-023 意图 / Ready 需求 / 故事 / deep-dive / impact-brief §23 / `docs/sdd` P0–P1 记录）
- **Inputs：** `requirement-workspace/intents/REQ-023-realtime-notifications.md`、`requirements/REQ-023-realtime-notifications.md`（26 场景）、`stories.md` REQ-023 段、`stories/add-realtime-notifications.story.md`、`deep-dive.md`「REQ-023 增补」、`impact-brief.md` §23、`docs/sdd/add-realtime-notifications/p0-baseline.md`（G-01 ~ G-06）、as-is 代码（`ApplicationServiceImpl` / `ChatServiceImpl` / `ChatPage` / `chatPolling` / `ChatList` / `AppShell` / `openapi.yaml` 0.17.0 / `V1`–`V23`）、`docs/knowledge/rules/**`、`docs/sdd/README.md`
- **Timestamp：** 2026-11-17T16:36+0800
- **Reviewer：** AI agent（Code Mode）；批准由具名人员按签署矩阵完成
- **阶段：** P1（`proposal` 工件）；本报告是 `@rule:artifact-review-gate` 的提案评审，不是 G1

## 1. 结论

提案把范围收敛在「申请 / 裁决 / 消息 → 一条持久化通知 → 几秒内推送 → 未读数字 → 一键直达」这一条垂直切片内，发起人提出的三个现象与「跨页可见、数字而非仅颜色、明暗主题不破」三条约束逐条有承接。能力归属（新增 `notifications`、不动 `trip-companions` 未归档 Delta）、传输（SSE + REST 补偿）、未读口径（`read_at IS NULL`）、收件人与自消息守卫、已读范围、失败隔离都有明确决策并写了理由；In / Out scope 边界清楚，邮件 / OS 推送、通知中心、WebSocket、申请与聊天规则改动全部显式排除。26 条场景与 S23-1 ~ S23-5 双向可追溯，`validate` 在 P2 落 Delta 后才应通过（见 S-03）。**无阻塞缺口，可进入 P2。**

## 2. Findings

| id | Severity | Location | Issue | Suggested fix | Owner | 状态 |
|---|---|---|---|---|---|---|
| S-01 | SUGGESTION | `stories/add-realtime-notifications.story.md`、`stories.md` | 初稿只拆 S23-1 ~ S23-4，S23-5（自消息不通知）与 S23-6（每条消息一行）没有落在任何故事下，属于「场景无归宿」的可追溯缺口 | 新增 S23-5「收到新消息时告知接收方」承接 S23-5 / S23-6 / S23-10 / S23-23 / S23-24，并同步 `stories.md` 表与矩阵、`handoff.md`、`p1-intent.md` | Karena | 已修（评审前） |
| S-02 | SUGGESTION | `proposal.md` §影响面（`service/NotificationBroker.java`） | 把 `NotificationBroker`（按用户的 `SseEmitter` 注册表）放在 `service/` 下会与「service 是接口、实现放 impl、服务依赖接口」的既有约定混层；它更像基础设施 | P3 `design.md` 明确落点（例如 `routeme/notification/` 或 `service/NotificationStream` 接口 + `service/impl` 实现），并说明为何不引入新分层 | Karena | 待 P3 |
| S-03 | SUGGESTION | `openspec` 校验 | `openspec validate add-realtime-notifications --strict` 报「Change must have at least one delta」；这是 P1 未落 Delta 的正常结果而非工件缺陷（`docs/sdd/README.md` 把 Delta 划到 P2） | P2 写完 `specs/notifications/spec.md` 后重跑 `validate --strict` 并把输出记进 P2 记录 | Karena | 待 P2 |
| S-04 | SUGGESTION | `proposal.md` D12；`impact-brief.md` §23.4 | `openapi.yaml` 0.18.0 与迁移 `V30` 只是「当前最大值的下一个」，并行 change（`refine-trip-chat` / `add-ai-itinerary` 等）仍可能在 P4 前占用 | P3 落笔前用 `grep` 复核 `info.version` 与 `db/migration/` 最大值，排他确认后写进 `design.md` 并复述到 `g1-decision.md` | Karena | 待 P3 |

## 3. 逐维核对

| 维度 | 结论 | 证据 |
|---|---|---|
| A 架构 `api-contract` | Pass | 提案只声明 4 条新路径与 schema、次版本递增，未把实现细节写进契约；字段 / 时间戳口径沿用既有 REST 约定，P3 落实（S-04） |
| A `package-structure` / `no-circular-dependency` | Pass（S-02 提示） | 生产方 `ApplicationServiceImpl` / `ChatServiceImpl` → `NotificationService` → `NotificationBroker` 单向；`NotificationService` 不反向依赖申请或聊天服务，无环 |
| A `orchestration-execution-separation` / `java-patterns` | Pass（设计层） | 提案要求构造注入、`Clock` 取时（与既有服务一致），未引入静态工具类；具体类名与接口在 P3 定 |
| B 质量 `web-coding-style` | Pass | 前端落点 `frontend/src/notifications/` 符合按特性分目录；纯逻辑与组件分离（`notificationModel.ts` 可单测），符合「业务逻辑不写在组件里」 |
| C 测试 `java-testing` / `web-testing` | N/A（P1 无代码） | 提案已规划后端服务 / 生产方 / 契约 / 流单测、前端纯模型单测、E2E `notifications.spec.ts`；命令与分层留给 P3 `atdd-design.md` / `tasks.md` |
| D 安全 `security-baseline` / `java-security` | Pass（带残余风险） | 授权仍在既有服务边界（申请资格、聊天准入不变）；`user_id` 查询参数身份已在提案残余风险与 D11 显式记为「与今天 `X-User-Id` 同等级暴露，真实鉴权另开 change」 |
| D `no-hardcoded-secrets` / `pii-scrubbing` | Pass | 无新增凭据；通知文案只带昵称与行程标题，与既有界面展示同口径，不新增日志中的个人数据 |
| E 流程 `spec-first` | Pass | 本阶段无生产代码、无契约、无迁移改动（`git status` 仅文档新增 / 修改） |
| E `tdd-cycle` / `git-commit-conventions` / `git-branching-and-pr` | Pass（按阶段） | 分支 `feature/add-realtime-notifications` 与 change-id 一致；阶段提交用 `docs(p1):` + `p1` stage 位，属 `docs/sdd/README.md` 记录的本地扩展 |
| F 文档 `document-conventions` | Pass | 工件事后统一为「正文中文 + 英文标识符 / 命令」；无绝对路径；引用写文件路径 + 符号；文件名 kebab-case |
| F `sdd-artifacts` | Pass | 变更包自包含于 `openspec/changes/add-realtime-notifications/`；capability `notifications` 为名词短语；change-id 动宾短语；一个 change 只改一个能力 |
| G 工件链可追溯 | Pass | 提案 in-scope → REQ-023 §4 的 26 条场景 → S23-1 ~ S23-5 → P3 任务（待写）逐条可对照；10 条验收信号均可观察 |

## 4. 证据（真实输出摘要）

| 命令 | 输出 |
|---|---|
| `mvnw.cmd -q test`（`backend/`，2026-11-17 16:26） | 60 份 surefire 报告 / 434 tests / 0 failures / 0 errors；Flyway 在 H2 与 SQLite 上均迁到 `v23` |
| `npm test`（`frontend/`，2026-11-17 16:32） | 46 test files passed / 344 tests passed |
| `openspec show add-realtime-notifications --json` | 解析成功，`title: 变更提案：add-realtime-notifications`，`deltaCount: 0`（P1 尚无 Delta） |
| `openspec validate add-realtime-notifications --strict` | 失败：`Change must have at least one delta`（见 S-03，P2 后应转绿） |
| `git status --porcelain` | 仅文档：6 个修改 + 5 个新增路径 + 2 个未跟踪本地配置（`backend/ai-local.yml`、`backend/application-local.yml`，按要求不提交） |
| 契约 lint | 未运行：本仓库无 `lint:api` 脚本（根目录无 `package.json`），且本阶段未改 `openapi.yaml` → Skipped |

## 5. 残余风险

- **SSE 经代理的真实延迟未验证。** 提案写了响应头禁缓冲与约 20 秒心跳，但开发代理与生产反代的差异只能在 P4 用实测证明；若 P4 不通过，需要一个降级方案（例如降为 5 秒轮询计数）并在 `design.md` 记备选。
- **内存 emitter 与单进程假设。** 后端重启、或多实例部署时推送层失效；D3 的 REST 对账把「丢事件」降级为「延迟」，但计数正确性依赖客户端每次 `open` 都重新拉取。
- **尚未验证的编号独占性。** 0.18.0 / `V30` 是当前最大值的下一个，不是已预约（S-04）。
- **身份模型未变。** 查询参数身份与既有 `X-User-Id` 同等级，任何能构造该参数的人都能读取他人的通知；这是既有 demo 的已知局限，不是本 change 引入的新风险，但必须在真实鉴权 change 中一并收口。

## 6. 签署记录

按 `@rule:artifact-review-gate`：`proposal` 由 WAYNE 签；本报告由 WAYNE + 当前开发者（Karena）签。三个签署位均已批准，可进入 P2。

| 对象 | 签署位 | 批准人 | 批准时间 | 结论 |
|---|---|---|---|---|
| `proposal` | 1 | WAYNE | 2026-11-17T16:38+0800 | 批准（发起人当次口头确认） |
| `docs/reviews/20261117-add-realtime-notifications-proposal-review.md` | 1 | WAYNE | 2026-11-17T16:38+0800 | 批准（发起人当次口头确认） |
| `docs/reviews/20261117-add-realtime-notifications-proposal-review.md` | 2 | Karena | 2026-11-17T16:38+0800 | 批准（发起人当次口头确认） |

- **P1 质量报告：** 本 change 未单独产出 `docs/ai4se-plugins/<ts>-quality-checklist-report.md`；P1 自检项（工件齐备、场景可追溯、决策有理由、范围有边界）已在本报告 §1 / §3 / §4 逐项给出证据。补齐独立质量报告留作 P4 前的一致性动作，不影响本阶段结论。

## 7. 下一步（非门禁建议）

- P1 三个签署位已齐（2026-11-17T16:38+0800），进入 P2：起草 `openspec/changes/add-realtime-notifications/specs/notifications/spec.md`（ADDED 6 Requirement / 26 Scenario），跑 `validate --strict`，再出 `docs/reviews/20261117-add-realtime-notifications-spec-review.md`（S-03、S-04 在此收口）。