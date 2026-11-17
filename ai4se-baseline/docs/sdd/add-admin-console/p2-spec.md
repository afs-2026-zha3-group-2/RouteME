# P2 规格记录 — add-admin-console

- **Change：** `add-admin-console`（REQ-018 / S19–S24 管理后台：用户管理 / 账号暂停封禁 / 举报处置 / 人工客服）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-17 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main@c948b1b`（= `origin/main`，未推送）
- **阶段结论：** **Pass**（G1 已于 2026-11-17 由 IO WAYNE / SA Karena 具名签署）

## 1. 阶段目标

把 P1 的 Delta 草稿复核为可签署的增量规格：确认 14 个 Requirement 与 `proposal.md`「What Changes」逐条对齐、61 个场景都可观察可断言、跨能力冲突（同一 `user-auth` 的未归档 change、`refine-safety-report` 的处置闭环表述）已识别，并记录 G1 结论。本阶段不写业务代码、不改契约与迁移。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec — `admin-console` | [`specs/admin-console/spec.md`](../../../openspec/changes/add-admin-console/specs/admin-console/spec.md) | ADDED 9 Requirement / 38 Scenario（P4 回流后 40，见 §8）：后台访问控制（3）、用户列表（4）、用户详情（3）、账号状态迁移与处罚（6）、受限账号边界（3）、封禁信息展示（2）、举报队列（3）、举报详情与处理（8 → 10）、客服工作台（6） |
| Delta Spec — `customer-service` | [`specs/customer-service/spec.md`](../../../openspec/changes/add-admin-console/specs/customer-service/spec.md) | ADDED 4 Requirement / 13 Scenario：帮助与反馈入口与我的举报状态（2）、会话生命周期（5）、消息与短轮询（4）、历史保留（2） |
| Delta Spec — `user-auth` | [`specs/user-auth/spec.md`](../../../openspec/changes/add-admin-console/specs/user-auth/spec.md) | MODIFIED「注册账号」1 Requirement / 10 Scenario：7 个基线场景名保留 + 3 个新增（选填邮箱、邮箱非法或重复、客户端不能指定角色或初始状态） |
| AC / DoV 复核 | [`dov-ac-review.md`](../../../openspec/changes/add-admin-console/dov-ac-review.md) | AC 4/4 Pass、DoV 5/5 Pass、14/14 Requirement 映射到 What Changes 与故事、`user-auth` 基线 7/7 保留；Verdict = Pass |
| 一致性检查 | [`consistency-lint.md`](../../../openspec/changes/add-admin-console/consistency-lint.md) | phase = p2；Pass；BLOCKER 0 / WARNING 0 / SUGGESTION 5（L-01、L-02 当场收口）/ N/A 7 |
| G1 决策 | [`g1-decision.md`](../../../openspec/changes/add-admin-console/g1-decision.md) | **Pass**；IO = WAYNE、SA = Karena、AO = Jacky；无整改条件；9 项非阻断 follow-up |
| P2 质量报告 | [`docs/ai4se-plugins/20261117-103000-quality-checklist-report.md`](../../ai4se-plugins/20261117-103000-quality-checklist-report.md) | P2-1 / P2-2 / P2-3 Pass；P2-4 Pass；Overall Pass |
| 工件评审 | [`proposal-review`](../../reviews/20261117-add-admin-console-proposal-review.md)、[`spec-review`](../../reviews/20261117-add-admin-console-spec-review.md) | 均 Pass，2026-11-17 由 WAYNE（IO）+ Jacky（SA）签齐 |
| P1 记录 | [`p1-intent.md`](p1-intent.md) | 范围、S19–S24、19 项决策、13 条验收信号；§5 签署表已批准 |

## 3. 关键裁决与修订

- **P2 直接修订两处（均不改语义）：**
  - **L-01 影响面三层化：** `proposal.md`「影响面」原表只按文件列改动，补 self（本 change 工件）/ upstream（REQ-018、故事、登记行）/ downstream（Living Spec、归档顺序、其他 change）三层表，逐文件表保留为「逐文件改动」。
  - **L-02 场景补 `Given`：** `specs/user-auth/spec.md` 的「用户名格式非法」「密码长度非法」「昵称缺失或超长」沿用 Living Spec 原写法只有 When / Then，补齐 `Given` 行；场景名与断言未变。按 `@rule:artifact-review-gate` 的格式类修订条款复用 P1 的 Pass 结论。
- **举报成立处置规则显式化：** 举报成立时「处罚 + 状态置 `RESOLVED`」在同一事务完成；被举报用户已 `SUSPENDED` / `BANNED` 时给出「维持 / 升级 / 更新封禁信息」三种可选动作。该口径来自 P1 决策（不新增范围），写进 `admin-console`「举报详情与处理」。
- **客服消息隔离显式化：** `customer-service`「客服会话历史保留」追加一句「客服消息 MUST 落在独立表、与行程聊天隔离」；`proposal.md` 对应条目同步。这是对 P1 已定边界（两张 `customer_service_*` 表）的文字兑现，不是新范围。
- **19 项提案决策逐条落到 Delta：** `SUSPENDED` 精确对应 4 类写操作；`BANNED` 只读登录 + 全部写 403；到期惰性解封（读时有效状态、下一次状态变更落库）；显式「开始处理」；`OTHER` 必填补充说明；任一管理员可继续 `PROCESSING`；举报人只见状态；3s 轮询复用 `CHAT_POLL_INTERVAL_MS`；单用户单活跃会话；`R-{id}`；无硬删除；管理员不能处罚自己。
- **`BANNED` 封禁期无求助通道：** 发起人 2026-11-17 裁决「维持现状」，作为已接受的产品风险记入提案残余风险与 `dov-ac-review.md`，不是规格缺陷。
- **契约与迁移编号避让：** 0.13.0 / V19，避开并行 `add-ai-itinerary` 的 0.12.0 / V18；本阶段未创建 `V19__` 或改 `openapi.yaml`。

## 4. 校验

- `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`。
- `openspec show add-admin-console --json` → `deltaCount: 14`（`admin-console` ADDED 9 + `customer-service` ADDED 4 + `user-auth` MODIFIED 1）。
- 场景结构机器逐块检查：61/61 具备 `Given` / `When` / `Then`，0 缺失；无孤儿场景。
- 负向 / 边界断言：61 个场景中 28 个含负向断言（`admin-console` 16/38、`customer-service` 6/13、`user-auth` 6/10），覆盖 403 `ADMIN_REQUIRED`、`ACCOUNT_SUSPENDED`、`ACCOUNT_BANNED`、409 `INVALID_STATUS_TRANSITION`、`CANNOT_TARGET_SELF`、`REPORT_NOT_PENDING`、`REPORT_NOT_PROCESSING`、`EMAIL_TAKEN`、`SESSION_ALREADY_HANDLING`、`SESSION_NOT_HANDLING`、`SESSION_CLOSED`、404 `USER_NOT_FOUND`。
- 措辞检索：全文无「适当 / 友好 / 及时 / 尽快」类不可测表述；Out of scope 项目（SSO / WebSocket / 申诉 / 附件 / 满意度 / 邮箱验证 / 内容下架 / 永久删除入口）在 Delta 零命中（「永久删除」仅出现在 MUST NOT 禁令句）。
- 实现证据：N/A —— P1–P2 无代码、无迁移、无契约改动（`git status` 确认）。

## 5. 签署（G1）

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | 需求来源与跨能力影响：新建 `admin-console` / `customer-service` 两个能力；`user-auth` MODIFIED 且须在 `add-user-profile` 归档后合入；不 MODIFIED `trip-plans` / `trip-companions` / `trip-experiences`；契约 0.13.0 / V19 避让 `add-ai-itinerary` | 2026-11-17 |
| SA | Karena | 规格与验收口径：4 条合法状态迁移、8 项封禁理由、`SUSPENDED` 四类写操作与 `BANNED` 全写拒绝、到期惰性解封、处罚不删数据、举报 `PENDING → PROCESSING → RESOLVED / REJECTED`、客服 `WAITING → HANDLING → CLOSED` 与 3s 轮询、12 个错误码、`R-{id}` | 2026-11-17 |
| AO | Jacky | 承接 P3–P4 实现与本地验证；follow-up 按 §6 收口 | 2026-11-17 |
| VL | Neal | P4 独立验证（未到） | — |
| SM | Lewis | P1 范围确认与阶段准入 | 2026-11-17 |

**G1 结论：Pass**（`g1-decision.md`，2026-11-17）。签署对象为 P1 四份工件 + P2 的两处格式类修订；AO（Jacky）不自签 SA，SA 由 Karena 签署。

## 6. G1 后续项（非条件，不阻断）

| 项 | Owner | 时机 |
|---|---|---|
| 举报人四态文案映射（待处理 / 处理中 / 已处理 / 举报不成立）写进设计并落单测断言 | AO（Jacky） | P3 `design.md` / P4 |
| 12 个错误码收敛成「端点 × 错误码 × HTTP 状态」表，并入 `OpenApiTest` | AO（Jacky） | P3 `design.md` / P4 |
| `refine-safety-report` 的 `trip-companions` 补「处置闭环见 `admin-console`」交叉引用 | AO（Jacky）+ SA（Karena） | P5 归档前 |
| 三处 MUST 的测试落点：404 `USER_NOT_FOUND`、默认按注册时间 / ID 倒序、邮箱为空显示「未填写」 | AO（Jacky） | P4 控制器测试 + E2E |
| 举报成立且被举报用户已受限时的界面三态（维持 / 升级 / 更新封禁信息） | AO（Jacky） | P3 设计稿 |
| 三档布局（390 / 768 / 1440）与窄屏卡片化走查 | AO（Jacky） | P3 / P4 |
| 封禁到期用固定 `Clock` 覆盖「到期前 / 到期后」 | AO（Jacky） | P4 |
| 归档顺序：`add-user-profile` → `refine-safety-report` → 本 change；归档说明写明 `user-auth` 为超集合并 | AO（Jacky）+ SA（Karena） | P5 / G3 |
| 清理本地重复 V16 迁移（`V16__normalize_demo_user_profiles.sql` vs `V16__add_meeting_time.sql`） | AO（Jacky） | P4 启动前 |

## 7. 阶段结论与提交

- **阶段结论：** Pass，G1 已具名签署，P3 解锁（`/sdd:atdd-design` → `/sdd:task-plan` → `/sdd:quality-checklist`）。
- **提交边界：** P1 + P2 文档已合并为一次本地提交 `6818a4b docs(p2): add-admin-console proposal, delta specs and G1 align record`（17 files / +1728，未 push）；`@rule:git-commit-conventions` 的 verify / archive 两次边界按用户「每阶段一次提交」的指示偏离，verify 前会按需 squash。
- **未触碰并行会话 WIP：** `e2e/tests/profile.spec.ts`（底部 hunk）、`frontend/src/i18n/tripMessages.ts`、`frontend/src/profile/ProfileSetupPage.tsx`、`frontend/src/shell/AppShell.tsx`、未跟踪的 `backend/.../V16__normalize_demo_user_profiles.sql`。
- **未创建实现物：** 无 `V19__admin_console.sql`、无 `openapi.yaml` 改动、无 controller / service / 前端页面；契约 0.13.0 与 V19 仍是 P3 / P4 的规划。

## 8. P4 回流修订（2026-11-17，用户请求）

- **触发：** 用户要求「举报来自聊天时向管理员展示对应聊天历史，举报对象是行程时展示相关行程」。
- **Delta 变更：** `admin-console`「举报详情与处理」补来源规则，并新增 2 个场景「聊天举报展示会话记录」「行程举报展示行程概要」；`admin-console` 由 9 / 38 变为 9 / 40，全部 Delta 由 61 个场景变为 63 个。
- **契约：** `ReportRequest` 增可选 `trip_id`；`AdminReportDetail` 增 `context{origin,trip,messages[]}` 与 `AdminReportContext` / `AdminReportTripContext` / `AdminReportMessage`；版本仍为 0.13.0（兼容新增，避开并行 change 的版本号）。
- **迁移：** 新增 `V22__report_context_trip.sql`（`reports.context_trip_id`）；V19/V21 编号历史保持不变。
- **评审：** 本修订改变 Delta Spec / `design.md` / `tasks.md`，按 `@rule:artifact-review-gate` 需 WAYNE 对 Delta 签名、当前开发者 + 一名非 WAYNE 成员对 design / tasks 签名；本轮由用户直接要求实现，签名待补。

### 8.1 第二轮回流（同日，用户反馈）

- **触发：** 用户反馈「被封禁的用户需要被告知已封禁并给出理由」，同时要求修复举报处理页「解封时间」无法选择。
- **Delta 变更：** `admin-console`「封禁信息展示」补「全站顶部提示条」规则，并新增场景「受限用户登录后在任意页面看到提示」；`admin-console` 由 9 / 40 变为 9 / 41，全部 Delta 由 63 个场景变为 64 个。
- **实现：** 新增 `AccountStatusBanner` 与纯函数 `accountStatusNoticeModel`，`AppShell` 读取本人资料后渲染；资料页本人受限时不再重复。日期选择器修复见 `p4-verify.md` §13。
- **契约：** 无变更（复用 `GET /users/{id}/profile` 的 `status` / `ban_reason_code` / `ban_expires_at`）。
- **评审：** 同上，Delta 需 WAYNE 签名，`design.md` / `tasks.md` 需当前开发者 + 一名非 WAYNE 成员签名，签名待补。