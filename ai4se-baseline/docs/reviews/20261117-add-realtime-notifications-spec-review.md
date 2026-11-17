# Spec review — add-realtime-notifications

- **Verdict: Pass**（BLOCKER 0 / WARNING 0 / SUGGESTION 3）
- **Scope：** `focus=full`；`openspec/changes/add-realtime-notifications/specs/notifications/spec.md`（ADDED 6 Requirement / 26 Scenario）及与 `proposal.md`、REQ-023 的一致性
- **Inputs：** `proposal.md`（D1–D14、10 条验收信号）、`requirement-workspace/requirements/REQ-023-realtime-notifications.md`（S23-1 ~ S23-26）、`stories/add-realtime-notifications.story.md`（S23-1 ~ S23-5）、`deep-dive.md`「REQ-023 增补」、`impact-brief.md` §23、`docs/sdd/add-realtime-notifications/p1-intent.md`、`docs/reviews/20261117-add-realtime-notifications-proposal-review.md`、as-is 代码（`ApplicationServiceImpl` / `ChatServiceImpl` / `ChatPage` / `chatPolling` / `ChatList` / `AppShell`）
- **Timestamp：** 2026-11-17T16:44+0800
- **Reviewer：** AI agent（Code Mode）；批准由具名人员按签署矩阵完成
- **阶段：** P2（Delta Spec 工件）；本报告是 `@rule:artifact-review-gate` 的规格评审，不是 G1

## 1. 结论

增量规格把「申请与裁决 / 消息 → 一条持久化通知 → 未读计数 → 标读 → 壳层数字与直达」切成 6 条 Requirement、26 条场景，与 REQ-023 §4 的 26 条场景一一对应（R1 承接 5 条含 S23-26，R2 承接 2 条，R3 承接 4 条，R4 承接 5 条，R5 承接 5 条，R6 承接 5 条）。每条 Requirement 都以可观察结果陈述（行数、计数、3 秒延迟、恰好减一、≤900 px 同一口径），未把 SSE、表名、类名等实现选择写进规格；发起人三条约束（跨页可见、数字而非仅颜色、明暗与布局不破）分别落在 R6 的顶栏入口 / 「MUST NOT 仅以颜色表达」/ 壳层指示条款上。`openspec validate --strict` 通过。**无阻塞缺口，可进入设计阶段。**

## 2. Findings

| id | Severity | Location | Issue | Suggested fix | Owner | 状态 |
|---|---|---|---|---|---|---|
| S-01 | SUGGESTION | `proposal.md` §范围 / 验收信号 4 ↔ `specs/notifications/spec.md` | 提案 in-scope 有「对当前不可见的事件给短提示（D14）」，验收信号 4 也以「出现提示条」验收，但 Delta 的 26 条场景里没有一条表达它 | P3 `design.md` 明确提示条的触发条件与可断言口径（申请类总是提示；消息仅在对应会话未打开时提示），并在 `tasks.md` / E2E 落一条断言；若决定不做，同批修正提案 in-scope 与验收信号 4，避免链上漂移 | Karena | 待 P3 |
| S-02 | SUGGESTION | `specs/notifications/spec.md` R1「通知失败不回滚裁决」 | 失败隔离只在申请类 Requirement 里写了一次场景，而消息类共用同一写入路径；只按 R1 断言会漏掉消息链路 | P3 把失败隔离写成一条对所有生产方生效的约束并在任务里给消息路径一条反向断言（通知写入抛错时消息仍落库、发送方仍收到成功） | Karena | 待 P3 |
| S-03 | SUGGESTION | `specs/notifications/spec.md` R3 / R4 / R5 / R6 | Delta 保持技术中立（未写端点与 schema），因此 P3 的契约增量必须能反指回这四条 Requirement，否则 `OpenApiTest` 新增的路径与 schema 没有规格锚点 | P3 `design.md` 用「端点 → Requirement → 场景」对照表落实；`tasks.md` 的 contract 任务标注对应 Requirement | Karena | 待 P3 |

## 3. 逐维核对

| 维度 | 结论 | 证据 |
|---|---|---|
| A `api-contract` | Pass（技术中立，S-03 提示） | Delta 不写端点与字段名，避免把契约决策提前固化；契约增量留到 P3 并按 S-03 建锚点 |
| A `package-structure` / `no-circular-dependency` | N/A（P2 无代码） | 结构与依赖方向在 P3 `design.md` 判定 |
| B `web-coding-style` | N/A（P2 无代码） | 前端落点已在提案给出（`frontend/src/notifications/`），P3 复核 |
| C `java-testing` / `web-testing` | Pass（可测性） | 26 条场景均含可断言结果（行数、计数拆分、3 秒窗口、减一、0 徽标、≤900 px 同口径），可直接落成测试名；未引入测试框架要求 |
| D `security-baseline` / `java-security` | Pass | 规格把可见范围写成「该用户自己的通知」（R3 / R5），标读按用户隔离（S23-20 场景）；查询参数身份属 P3 设计与提案残余风险，不在规格层承诺 |
| E `spec-first` | Pass | 规格先于代码；本 change 仍只有一个能力 `notifications` |
| F `document-conventions` | Pass | 正文中文 + `SHALL` / `MUST` 英文结构词；引用文件路径与符号，无绝对路径 |
| F `sdd-artifacts` | Pass | Delta 位于 `openspec/changes/add-realtime-notifications/specs/notifications/spec.md`；标题层级 `<change> → ADDED → Requirement → Scenario` 与既有 Delta 一致 |
| G 工件链可追溯 | Pass | 提案 in-scope ↔ 26 条场景 ↔ S23-1 ~ S23-5 ↔ 10 条验收信号逐条可对照；无孤立 Requirement，无无归宿场景（S-01 为唯一未落场景的展示细节） |

## 4. 证据（真实输出摘要）

| 命令 | 输出 |
|---|---|
| `openspec validate add-realtime-notifications --strict` | `Change 'add-realtime-notifications' is valid` |
| `openspec show add-realtime-notifications --json --deltas-only` | `deltaCount=6`；`notifications / ADDED`；各 Requirement 场景数 5 / 2 / 4 / 5 / 5 / 5，合计 26 |
| `mvnw.cmd -q test`（`backend/`，本日 16:26 基线） | 434 tests / 60 reports / 0 失败（P2 无代码变更，未重跑） |
| `npm test`（`frontend/`，16:32） | 46 files / 344 tests 全绿（P2 无代码变更，未重跑） |
| `git status --porcelain` | 仅 `specs/notifications/spec.md` 等文档新增；`openapi.yaml`、`db/migration/` 未改 |

## 5. 残余风险

- **场景与实现粒度的落差。** 26 条场景是能力级断言；P3 必须把它们拆到 `atdd-design.md` 的分层与 `tasks.md` 的任务上，否则会出现「规格通过但无测试承接」。
- **3 秒延迟的测量口径未定。** 规格只写「3 秒内」，但没说是服务端写入到客户端渲染，还是推送到达；P3 需在 `design.md` 固定测量点，P4 才能区分「实现慢」与「代理缓冲」。
- **「最新 50 条」是展示上限，不是保留策略。** 行会持续增长；单进程 demo 可接受，长期需另开清理需求（提案 D13 已记）。
- **S-03 的锚点缺失会削弱契约测试的价值。** 若 P3 只加 `OpenApiTest` 断言而不写 Requirement 对照，契约会变成「有测试无规格」。

## 6. 签署记录

按 `@rule:artifact-review-gate`：Delta Spec 由 WAYNE 签；本报告由 WAYNE + 当前开发者（Karena）签。三个签署位均已批准，可出具 G1 并进入 P3。

| 对象 | 签署位 | 批准人 | 批准时间 | 结论 |
|---|---|---|---|---|
| `specs/notifications/spec.md` | 1 | WAYNE | 2026-11-17T16:44+0800 | 批准（发起人当次确认） |
| `docs/reviews/20261117-add-realtime-notifications-spec-review.md` | 1 | WAYNE | 2026-11-17T16:44+0800 | 批准（发起人当次确认） |
| `docs/reviews/20261117-add-realtime-notifications-spec-review.md` | 2 | Karena | 2026-11-17T16:44+0800 | 批准（发起人当次确认） |

## 7. 下一步（非门禁建议）

- 取得上表三个签署位后，补齐 P2 的 `dov-ac-review.md`（AC 覆盖 / DoV 分层）与 `consistency-lint.md`，再出 `g1-decision.md`（G1 由 IO=WAYNE、SA 签署，不由本报告代替）。
- 之后进入 P3：`design.md`（含 S-01 ~ S-03 收口、`NotificationBroker` 落点、3 秒测量点、契约 0.18.0 / 迁移 `V24` 排他确认）、`atdd-design.md`、`tasks.md`。