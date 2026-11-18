# 意图捕获 — REQ-034 客服会话结束权交由用户（issue #38）

- **候选能力：** `customer-service`（ADDED Requirements；既有 Requirement 由未归档 `add-admin-console` 等 change 提供）
- **来源：** GitHub Issue [#38](https://github.com/afs-2026-zha3-group-2/RouteME/issues/38)「客服服务BUG-客服无法结束会话」（`afs-2026-zha3-group-2/RouteME`，2026-11-18 读取；正文：Lewis 表示结束会话应放到客户端，不应该是客服结束会话；客服点击结束会话没反应）
- **捕获日期：** 2026-11-18 ｜ **记录人：** Lewis Liu（当前开发者）
- **分支：** `feature/refine-service-close`（独立 worktree `.worktrees/refine-service-close`，从 `origin/main@822471c` 切出）
- **编号说明：** 起草时 `origin/main@822471c` 最大需求号为 REQ-027，登记为 REQ-028 / S29；2026-11-18 合并 main 时 REQ-028 / S29 / V30 已被 `add-travel-finance` 占用，按「后到者顺延」改为 **REQ-034 / S35 / V36**（change id 不变；契约并入 main 0.30.0）。
- **范围说明：** issue 表面是「客服无法结束会话」的缺陷，用户当次把方向定为产品决策变更——**结束权从客服移到用户**，客服侧改为「标记处理完成」。issue 中「点击没反应」不单独修复，随管理端按钮下线一并消失（D1）。

## 原始意图（一句话）

作为正在使用人工客服的普通用户，我希望在问题解决后由我自己结束这次会话，以便清楚地表达「我不需要继续了」，而不是被动等待客服替我关闭。

## 为什么（价值假设）

当前客服会话的结束权完全在管理端：用户端 `ServiceController` 没有结束接口，只有 `CLOSED` 后被动显示「重新发起会话」。这带来三个问题：

- **语义错位。** 「问题是否解决」只有用户能判断；客服替用户结束，等于替用户宣布需求已满足。issue #38 的原话就是「不应该是客服结束会话」。
- **等待期无法退出。** 用户发起会话后在 `WAITING` 状态只能一直等待，没有取消排队的入口；客服不在线时，会话会永久挂在队列里。
- **管理端结束体验本身也不可靠。** 现有管理端按钮只有 `HANDLING` 时出现，点击后弹确认；issue 报告「点击没反应」，说明这条链路的用户预期与实现状态并不一致。

价值假设：**把结束动作交还给需求方，并让客服侧提供一个明确的「我这边处理完了」信号**——用户随时可结束，客服的处理完成也能被用户看见，双方预期一致。

## 现状核对（2026-11-18，`origin/main@822471c`）

| 事实 | 证据 | 结论 |
|---|---|---|
| 会话状态机三态 | `ServiceSessionStatusEnum`：`WAITING` / `HANDLING` / `CLOSED` | 缺少「待用户确认」第四态 |
| 用户端无结束能力 | `ServiceController` 只有 `current` / `create` / `messages`；`api.ts` 无用户 close 函数 | 用户无法主动结束 |
| 结束只在管理端 | `AdminServiceController.close` → `CustomerServiceImpl.close`：仅 `HANDLING → CLOSED`，`closed_by` 写管理员 id | 结束权与 `closed_by` 语义都在客服侧 |
| 管理端按钮 | `AdminServiceDetailPage.tsx`：`HANDLING` 时显示 Popconfirm「结束会话」 | issue 「点击没反应」需在该链路上复现；本 change 直接下线按钮 |
| 用户端会话读取范围 | `CustomerServiceImpl.openSession` 只查 `WAITING` / `HANDLING`；`ServiceChat.reloadSession` 在 `current` 为空时把本地状态改为 `CLOSED` | 新增待确认状态时必须同步扩范围，否则用户会被误判为已结束 |
| 管理端筛选与徽标 | `AdminServicePage.tsx` 三态筛选；待接入徽标只统计 `WAITING` | 新增状态需要筛选与文案同步，徽标口径不变 |
| 会话表 | `V21__admin_console.sql`：`status VARCHAR(12)`、`closed_at` / `closed_by` | 可容纳 `RESOLVED`；缺 `resolved_at` / `resolved_by` |
| 契约 | `openapi.yaml` 0.24.0：`ServiceSessionStatus` 三态；`POST /admin/service/sessions/{sessionId}/close`；错误码 `SESSION_NOT_HANDLING` / `SESSION_ALREADY_HANDLING` / `SESSION_CLOSED` | 需删 close、加标记完成与用户结束、状态枚举增一态 |
| 迁移头 | Flyway head `V29__credit_exit_application.sql` | 本 change 使用 `V36`（起草时拟 `V30`，合并顺延） |
| 规格归属 | `customer-service` 尚未进入 `openspec/specs/`；当前 Delta 在 `add-admin-console`（未归档），另有两个在途增量 `refine-service-workbench-live` / `refine-service-inbox-unread` | 不能写 MODIFIED；本 change 追加 ADDED Requirement 并声明取代关系 |
| E2E 依赖 | `customer-service.spec.ts` `[C3]` 调用管理端 close；`admin.spec.ts` `[I3]` 点击管理端「结束会话」 | 删除接口后两条用例必须改写 |
| 原型 | 原型 v1 / v2 均无客服会话界面 | 不涉及原型先行；沿用现有页面样式 |

## 用户裁决（2026-11-18）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | 管理端结束按钮 | **彻底移除**；客服只保留「接入会话」与回复；issue「点击没反应」不再单独修复 | 管理端 UI 与 close 接口一起下线 |
| D2 | 用户端结束入口 | 用户端在 `WAITING` / `HANDLING` / 待用户确认三个状态统一显示「结束会话」，二次确认后结束；`WAITING` 时即取消排队 | 新增用户结束端点与按钮；按钮文案统一 |
| D3 | 客服完成信号 | 客服新增「标记处理完成」，会话进入**待用户确认**新状态；动作**直接生效，无二次确认** | 新增状态、按钮与端点 |
| D4 | 待确认状态下的消息 | 用户仍可发消息；发送后会话**回到 `HANDLING`** | 消息写入路径需要状态回迁 |
| D5 | 管理端关闭接口 | **删除** `POST /admin/service/sessions/{sessionId}/close` | 契约删除路径；错误码 `SESSION_NOT_HANDLING` 语义迁移到「标记完成」 |
| D6 | 超时 | 待用户确认**不自动关闭** | 不引入定时任务 |
| D7 | 完成记录 | 记录标记完成的**时间与操作人**：`resolved_at` / `resolved_by`（新迁移 V36） | 契约返回 `resolved_at` |
| D8 | 结束操作人 | `closed_by` 只记录用户 id | 审计语义从「客服关闭」变为「用户结束」 |
| D9 | 流程 | 不做 P5、不归档；P0–P4 每阶段一次提交；Gate 与评审停留等待具名签署 | 与项目阶段提交约定一致 |

## 意图边界

**覆盖：**

- 用户结束：`WAITING` / `HANDLING` / 待用户确认均可结束；同一按钮 + 二次确认；结束写 `closed_at` / `closed_by`（用户）。
- 客服标记处理完成：仅 `HANDLING` 可标记；写 `resolved_at` / `resolved_by`；状态进入待用户确认。
- 待用户确认：用户发消息回到 `HANDLING`；客服端可见、可回复。
- 管理端下线结束按钮与 close 接口；队列筛选与文案增加待用户确认状态。
- 用户端展示待确认提示与结束按钮；`CLOSED` 只读与重新发起沿用。
- 数据与契约：`resolved_at` / `resolved_by` 迁移；`ServiceSessionStatus` 增 `RESOLVED`；新增两个端点、删除一个端点。

**不覆盖：**

- 客服处理质量评价、满意度打分、结束后回访。
- 自动关闭 / 超时回收 / 定时任务。
- 用户端查看全部历史会话列表（当前只有 `current`，`CLOSED` 后重新发起）。
- 管理端会话导出、统计报表、客服工作量考核。
- 消息流中的系统通知消息（默认不插入，见 OQ-5）。
- issue 中「客服点击结束会话没反应」的独立缺陷修复（按钮已下线）。

## 与现有 Living Spec / 能力的关系

- `customer-service`：Living Spec 尚未建立；本需求追加 ADDED Requirement「客服会话结束权与待用户确认」，并在 proposal 中显式声明取代 `add-admin-console` Delta 的「用户 MUST NOT 自行关闭会话」与「客服结束会话」Scenario。**归档顺序 MUST 排在 `add-admin-console` 之后**，且需与其后归档的 `refine-service-workbench-live` / `refine-service-inbox-unread` / `refine-user-support-entry` 协调。
- `user-support`（`refine-user-support-entry`，未归档）：只定义入口与访问控制，会话生命周期仍归 `customer-service`；本需求不改入口。
- `user-auth`：沿用 Bearer 身份，不改注册 / 登录 / 退出语义。
- 行程聊天（`trip-companions`）：客服会话与行程聊天隔离不变量不变。

## Discovery Decision

`Go`（light intake，2026-11-18）。一句话可说清（「用户自己结束客服会话，客服只标记处理完成」）；能力边界明确（全部收敛在 `customer-service` 与会话状态机）；D1–D9 已由用户裁决；无 blocking 开放问题；数据、契约、前后端与 E2E 影响均可定位。日期：2026-11-18。
