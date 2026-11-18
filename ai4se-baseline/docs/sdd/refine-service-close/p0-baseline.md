# P0 基线记录 — refine-service-close

- **Change：** `refine-service-close`（能力 `customer-service` ADDED）｜ **需求：** REQ-028 ｜ **故事：** S29「客服会话结束权交由用户」
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-18
- **记录人：** Lewis Liu（当前开发者）
- **来源：** GitHub issue #38「客服服务BUG-客服无法结束会话」
- **分支：** `feature/refine-service-close`（从 `origin/main@822471c` 切出）

## 1. 阶段目标

确认「客服只能标记处理完成、由用户结束会话」可以开工：客服会话三态状态机、用户端与会话详情、管理端工作台、契约、迁移、E2E 与未归档 Delta 现状均在仓库可查；本 change 在未归档的 `customer-service` 能力上追加新 Requirement，并把管理端结束入口与接口下线。

## 2. 范围裁决（用户 2026-11-18）

| id | 议题 | 裁决 |
|---|---|---|
| D1 | 管理端结束按钮 | **彻底移除**客服工作台的「结束会话」按钮；客服只保留「接入会话」与回复。issue 中「客服点击结束会话没反应」随按钮下线不再作为缺陷处理。 |
| D2 | 用户端结束入口 | 用户端在所有未结束状态（`WAITING` / `HANDLING` / 待用户确认）显示同一个「结束会话」按钮，确认弹窗后结束；`WAITING` 时结束即取消排队。 |
| D3 | 客服完成信号 | 客服端新增「标记处理完成」动作，会话进入**待用户确认**新状态；该动作**直接生效，无二次确认**。 |
| D4 | 待确认状态下的消息 | 用户仍可发送消息；发送后会话**回到 `HANDLING`**，客服需重新标记处理完成。 |
| D5 | 管理端关闭接口 | **删除** `POST /api/admin/service/sessions/{sessionId}/close`；新增客服「标记处理完成」接口。 |
| D6 | 超时 | 待用户确认状态**不自动关闭**，不做定时任务。 |
| D7 | 完成记录 | 记录标记完成的**时间与操作人**：会话表新增 `resolved_at` / `resolved_by` 两列（新迁移）。 |
| D8 | 结束操作人 | 会话结束只由用户触发，`closed_by` 记录用户 id；不再存在客服写入 `closed_by` 的路径。 |
| D9 | 流程 | 不做 P5、不归档；P0–P4 每阶段一次提交；Gate 与工件评审均停留等待具名签署，模型不代签。 |

## 3. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 规格树 | `openspec/specs/` 仅 `design-system` / `hello-world` / `trip-companions` / `trip-experiences` / `trip-plans` / `user-auth`；`customer-service` 未进入 Living Spec | 本 change 不能对已归档基线写 MODIFIED；只能基于未归档 Delta 追加并声明取代关系 |
| customer-service 现状规格 | `openspec/changes/add-admin-console/specs/customer-service/spec.md`：4 Requirement / 13 Scenario，其中「人工客服会话生命周期」写死三态与「用户 MUST NOT 自行关闭会话」，Scenario「会话结束」为「客服结束会话」 | 本 change 的语义与该 Delta 直接冲突，必须在提案与 Delta 中显式声明取代；归档顺序 MUST 排在 `add-admin-console` 之后 |
| 在途 service 相关 change | `refine-service-workbench-live`（实时可见 / 接入前可读消息）、`refine-service-inbox-unread`（未读置顶与气泡）、`refine-user-support-entry`（`#/support` 独立入口） | 三者的 tasks 均无未勾选项，代码已并入 main；本 change 不修改它们的 Delta，只在其行为之上调整状态机与入口 |
| 状态枚举 | `ServiceSessionStatusEnum`：`WAITING` / `HANDLING` / `CLOSED` | 缺少「待用户确认」第四态 |
| 数据表 | `V21__admin_console.sql`：`customer_service_sessions`（`status VARCHAR(12)`、`joined_at` / `joined_by`、`closed_at` / `closed_by`）；Flyway head 为 `V29__credit_exit_application.sql` | 新状态码长度可行；`resolved_at` / `resolved_by` 不存在，需新迁移 `V30` |
| 用户端接口 | `ServiceController`：`GET /service/sessions/current`、`POST /service/sessions`、`GET|POST /service/sessions/{sessionId}/messages` | **无用户结束接口** |
| 用户端会话范围 | `CustomerServiceImpl.openSession` 只查 `WAITING` / `HANDLING`；`ServiceChat.reloadSession` 在 `current` 返回空时把本地状态改为 `CLOSED` | 若新增待确认状态而不改 `openSession`，用户端会把待确认会话误判为已结束 |
| 用户端页面 | `SupportPage.tsx` + `ServiceChat.tsx`：会话头展示状态徽标与提示，`CLOSED` 后显示「重新发起会话」；消息区由 `ServiceConversation` 共用 | 结束按钮需新增在会话头；`CLOSED` 提示与重新发起沿用 |
| 管理端接口 | `AdminServiceController`：列表 / 详情 / `join` / `close`；`close` 仅允许 `HANDLING → CLOSED`，`closed_by` 写管理员 id | 需删除 `close`、新增「标记处理完成」；`join` 仍只允许 `WAITING → HANDLING` |
| 管理端页面 | `AdminServiceDetailPage.tsx`：`WAITING` 显示「接入会话」、`HANDLING` 显示 Popconfirm「结束会话」；`AdminServicePage.tsx` 状态筛选三态；`adminMessages.ts` 有 `serviceClose` / `sessionNotHandling` 文案 | 按钮、筛选、文案与「待接入徽标」均需按新状态机调整 |
| 管理端消息写入 | `CustomerServiceImpl.appendMessage` 只在 `CLOSED` 拒绝发送；`sendAdminMessage` 不校验会话归属 | 「待确认可继续沟通并回到 `HANDLING`」需要在消息写入路径做状态回迁 |
| 契约 | `openapi.yaml` 0.24.0：`ServiceSessionStatus` 枚举三态；`POST /admin/service/sessions/{sessionId}/close`；错误码 `SESSION_NOT_HANDLING` / `SESSION_ALREADY_HANDLING` / `SESSION_CLOSED` | 需删除管理端 close、新增客服标记完成与用户结束两个端点、状态枚举增一态、补 `resolved_at` 字段；契约升次版本 |
| 迁移 | Flyway head `V29__credit_exit_application.sql` | 本 change 使用 `V30` |
| E2E | `customer-service.spec.ts` `[C3]` 直接调用 `POST /admin/service/sessions/{id}/close`；`admin.spec.ts` `[I3]` 点击管理端「结束会话 → 确认」并断言只读 | 两条用例都依赖被删除的能力，P4 必须改写为新流程 |
| 原型 | `docs/prototype/v1/prototype.html` / v2 六屏设计板均无客服会话界面；`refine-user-support-entry` 未修改原型 | 本 change 不新增原型改动；视觉沿用现有 `help-chat` / `admin-service` 样式与 antd 组件 |
| 工具链 | 后端 `mvnw verify`、前端 `npm test` / `npm run build`、契约 `redocly lint`、E2E `playwright test`、规格 `openspec validate --strict` | 全部可用；PowerShell 下使用 `npm.cmd` / `npx.cmd` |

## 4. 现状缺口（进入 P1 的问题陈述）

| # | 缺口 | 证据 | 影响 |
|---|---|---|---|
| G-01 | 用户没有任何结束会话的入口与接口 | `ServiceController` 无 close；`ServiceChat` 只在 `CLOSED` 后显示重新发起 | D2 的用户结束权无处落地 |
| G-02 | 结束权在管理端 | `AdminServiceController.close` + 管理端按钮 | 与 D1「不应该是客服结束会话」冲突 |
| G-03 | 没有「待用户确认」状态 | `ServiceSessionStatusEnum` 三态 | 客服处理后无法把「等你确认」传达给用户 |
| G-04 | 没有标记完成的留痕字段 | `customer_service_sessions` 无 `resolved_*` | 无法记录何时、哪位客服标记完成 |
| G-05 | `current` 与幂等创建不识别待确认 | `openSession` 只含 `WAITING` / `HANDLING` | 待确认时用户刷新页面会被误判为已结束，重新发起还会创建第二条会话 |
| G-06 | 管理端筛选、徽标与文案少一态 | `AdminServicePage` 三态筛选、`adminMessages` 三态文案 | 客服看不到「待用户确认」队列 |
| G-07 | 契约缺少新端点与新状态 | `openapi.yaml` 0.24.0 | 前后端与 E2E 无权威契约可依 |
| G-08 | E2E 依赖管理端关闭 | `customer-service.spec.ts` `[C3]`、`admin.spec.ts` `[I3]` | P4 必须同步改写，否则删除接口后直接红灯 |
| G-09 | 未归档 Delta 与本次语义冲突 | `add-admin-console` 的 customer-service Delta 写死「用户 MUST NOT 自行关闭会话」 | Delta 必须写明取代关系，且归档顺序排在 `add-admin-console` 之后 |

## 5. 验证链路（本 change 将使用的命令）

| 层 | 命令 | 说明 |
|---|---|---|
| 规格 | `openspec validate refine-service-close --strict` | Change 结构与 Delta 一致性 |
| 契约 | `cd ai4se-baseline/RouteME; npx.cmd -y @redocly/cli lint openapi.yaml` | 0 error |
| 前端静态 | `cd ai4se-baseline/RouteME/frontend; npm.cmd run build` | 含 `tsc --noEmit` |
| 前端单测 | `cd ai4se-baseline/RouteME/frontend; npm.cmd test` | vitest run |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp verify` | H2 + SQLite，含迁移与契约测试 |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx.cmd playwright test tests/customer-service.spec.ts tests/admin.spec.ts` | 隔离 SQLite + 独立端口 |

## 6. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在或显式延后 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`docs/sdd/` 均存在 |
| P0-2 | 规则覆盖分支 / 提交 / 测试 / 管道 / 安全 / NFR | Pass | 触发 `spec-first`、`artifact-review-gate`、`git-commit-conventions`、`git-branching-and-pr`、`web-coding-style`、`web-testing` |
| P0-3 | 阶段技能可解析 | Pass | `vendor/ai4se-plugins/recipes/p0..p5.md` 可用 |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI/CD 在 main 运行；本 change 走同一管道 |

**阶段结论：Pass（required 5/5；P0-4 Skipped 不适用）。**

## 7. 阶段产出

- 本记录：`docs/sdd/refine-service-close/p0-baseline.md`
- 分支：`feature/refine-service-close`（从 `origin/main@822471c`）
- 未新增代码、OpenSpec Delta 或业务规格；P1 起才进入提案与规格。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| 当前开发者 | Lewis Liu | 基线证据可复现；承担 P1–P4 实现与阶段记录 | 待签署 |
| SM | Lewis | 准入 P1；REQ-028 / S29 进入本迭代排期 | 待签署 |
| IO | WAYNE | issue #38 需求来源；D1–D8 范围裁决 | 待签署 |

## 9. 准入 P1 的条件

- `proposal.md` 写清 in-scope / out-of-scope：客服移除结束按钮、用户结束（三态可用）、客服标记处理完成、待确认状态、用户发消息回到处理中、删除管理端 close、新增两接口、`resolved_at` / `resolved_by`、不自动关闭。
- G-01 ~ G-09 可追溯到代码、契约、未归档 Delta 与 E2E 证据。
- 能力边界：`customer-service` 追加 ADDED Requirement，并在提案中声明取代 `add-admin-console` Delta 的「用户 MUST NOT 自行关闭会话」与「客服结束会话」Scenario；归档顺序排在 `add-admin-console` 之后。
- 契约 `0.25.0` 与迁移 `V30` 暂定，P3 按实际落地顺序排他确认。
