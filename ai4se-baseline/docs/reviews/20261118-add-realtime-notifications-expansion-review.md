# Expansion review — add-realtime-notifications（八类通知中心）

- **Verdict: Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 2，均已在 P4 前处理）
- **Scope：** `focus=full`；`openspec/changes/add-realtime-notifications/specs/notifications/spec.md`（ADDED 8 Requirement / 36 Scenario）及与 `proposal.md`、`design.md`、`atdd-design.md`、`tasks.md`、REQ-029 的一致性
- **Inputs：** `proposal.md`（D1–D18、12 条验收信号）、`requirements/REQ-029-realtime-notifications.md`（S30-1 ~ S30-36）、`stories/add-realtime-notifications.story.md`（S30-1 ~ S30-8）、`deep-dive.md`「REQ-029 增补」、`impact-brief.md` §28、`docs/sdd/add-realtime-notifications/p1-intent.md` / `p2-spec.md`、`docs/reviews/20261117-add-realtime-notifications-spec-review.md`、实现（`NotificationServiceImpl`、`NotificationLifecycleService`、`NotificationEventListener`、`NotificationController`、`frontend/src/notifications/*`）
- **Timestamp：** 2026-11-18T10:20+0800
- **Reviewer：** AI agent（Code Mode）；批准由具名人员按签署矩阵完成
- **阶段：** P2 复评（扩围后的 Delta Spec）；本报告不是 G1，G1 结论沿用 2026-11-17 的 Pass

## 1. 结论

2026-11-18 发起人要求把通知从「申请 / 裁决 / 消息三类提示」扩展为覆盖八类业务事件的完整通知中心。扩围后的 Delta Spec 用 8 条 Requirement / 36 条场景承接，逐条对应 REQ-029 §4 的 S30-1 ~ S30-36，并保持技术中立（不写表名、类名、端点路径与推送实现）。八类事件都落在既有业务成功路径之后，未改写申请、聊天、信用、举报、账号、客服与资料规则；新增的「通知中心页、按目标跳转、目标失效提示、八类计数、去重与优先级」都有可观察结果。

**无阻塞缺口，可继续 P3 / P4。**

## 2. Findings

| id | Severity | Location | Issue | Suggested fix | 状态 |
|---|---|---|---|---|---|
| E-01 | SUGGESTION | `specs/notifications/spec.md` R2 / R5 | 「安全提醒」同时出现在行程生命周期（S30-6）与系统事件（S30-19），两处均要求「参与者各 1 条」，若不说明会读成两条 | 在设计层固定为**同一事件**：一次 `ONGOING` 物化各产生 1 条 `trip_ongoing` + 1 条 `safety_reminder`，去重键为 `trip_ongoing:{tripId}` / `system_safety:{tripId}` | 已收口：`design.md` §5.3；`NotificationLifecycleService` |
| E-02 | SUGGESTION | `specs/notifications/spec.md` S30-26 | 「聊天入口与会话列表显示 `CHAT` 未读数」中的「聊天入口」有三处（侧栏、移动 tab、铃铛旁），规格未枚举 | 设计层明确：侧栏「通知中心」与账号菜单取 `total`；侧栏 / 移动 tab 聊天入口与会话行取 `CHAT`；探针固定为 `rail-chat-badge` / `tab-chat-badge` / `chat-unread-badge` | 已收口：`design.md` §6.3 |

## 3. 逐维核对

| 维度 | 结论 | 证据 |
|---|---|---|
| A `api-contract` | Pass | 契约 0.26.0 的 4 条通知路径 + `/reports/mine` 与 10 个 schema 全部在 `design.md` §4 与 §7 建立 Requirement 锚点；枚举值（8 类型 / 22 事件 / 8 目标）与实现一致 |
| A `package-structure` / `no-circular-dependency` | Pass | `notifications` 自成一包；`AccountStatusService` 用 `ObjectProvider` 取通知服务，避免构造期循环；可用性判断走 mapper，不反向依赖业务服务 |
| B `web-coding-style` | Pass | 前端落点集中在 `frontend/src/notifications/`；`chatTime` 迁到 `utils/` 叶子模块，避免 `notifications → chat` 的反向依赖 |
| C `java-testing` / `web-testing` | Pass | 36 条场景全部在 `atdd-design.md` §1 有至少一个自动化层；后端 10 个文件 48 条、前端模型单测、E2E 13 + 4 |
| D `security-baseline` | Pass | 通知只对收件人可见；越权标读 404；账号 / 举报文案只用结构化事实；流身份仍为 demo 查询参数（已登记风险） |
| E `spec-first` | Pass | 规格先于代码；扩围由发起人明确指示，并经 Delta + 提案 + 设计 + 任务四层同步 |
| F `document-conventions` | Pass | 中文正文 + `MUST` / `MUST NOT` 结构词；场景编号与需求编号一致；无绝对路径 |
| F `sdd-artifacts` | Pass | 需求 / 故事 / registry / 深挖 / 影响面 / 交接统一为 REQ-029 / S30；旧 REQ-023 通知工件已删除 |
| G 工件链可追溯 | Pass | 提案 12 条验收信号 ↔ 36 条场景 ↔ 8 条故事 ↔ `tasks.md` 36 行自检 ↔ `p4-implementation.md` 证据 |

## 4. 证据（真实输出摘要）

| 命令 | 输出 |
|---|---|
| `openspec validate add-realtime-notifications --strict` | `Change 'add-realtime-notifications' is valid` |
| 后端全量 `mvnw.cmd -B -ntp test` | 620 tests / 0 失败 |
| 通知相关 surefire 报告 | 10 个文件 / 48 条：Controller 9、Service 10、Producer 6、Hook 3、FailureIsolation 3、Stream 3、TextUtils 7、TypeEnum 4、Entity 2、Migration 1 |
| 前端 `npm test` | 491 tests / 59 files 全绿；`npm run typecheck` 通过 |
| E2E `notifications.spec.ts` | 13/13（M1–M10 + N1–N3） |
| E2E `notifications-walkthrough.spec.ts` | 4/4（V1–V4）；浅色 1440 / 768 / 390 三张截图 |

## 5. 残余风险

- **八类接入点分散。** 每个业务域一条钩子，遗漏风险由钩子用例（H1–H12）与 E2E N1 交叉覆盖；新增类型时必须同步枚举、文案、目标与筛选 UI。
- **ONGOING 物化依赖读取。** 若无人打开详情，`trip_ongoing` 与 `safety_reminder` 不会生成；这是「无显式写入动作」的自觉取舍，去重键保证不重复。
- **通知噪声。** 22 个事件都可能触发；已用去重、自事件抑制、只发相关方与当前会话不提示控制，但仍是产品需要观察的量。
- **demo 身份模型。** 流用查询参数识别用户，与既有 `X-User-Id` 同级暴露；真实鉴权另开 change。

## 6. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 结论 |
|---|---|---|---|---|
| `specs/notifications/spec.md`（8 / 36） | 1 | WAYNE | 2026-11-18T10:20+0800 | 批准（发起人当次确认扩围） |
| `docs/reviews/20261118-add-realtime-notifications-expansion-review.md` | 1 | WAYNE | 2026-11-18T10:20+0800 | 批准 |
| `docs/reviews/20261118-add-realtime-notifications-expansion-review.md` | 2 | Karena | 2026-11-18T10:20+0800 | 批准 |

- 扩围不另开 change / PR：发起人明确要求在同一 PR #40 内交付。