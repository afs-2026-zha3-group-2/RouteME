# P1 意图记录 — add-admin-console

- **Change：** `add-admin-console`（REQ-018 / S19–S24 管理后台）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Jacky（SA）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@c948b1b`（与 `origin/main` 同步）

## 1. 阶段目标

把用户提供的 6 条管理后台故事收敛为一个可判定的 REQ-018、影响面与 OpenSpec 提案：管理员身份与权限、用户列表 / 详情、账号状态迁移与限制、举报队列 / 详情 / 处置、用户侧帮助与反馈、客服工作台与会话生命周期。6 条故事共享同一套账号状态、举报记录与客服数据，因此合并为单 change，P3 再按迭代分组。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-018-admin-console.md`](../../../requirement-workspace/intents/REQ-018-admin-console.md) | 原始 6 条故事、现状差距 9 项、裁决 D1–D16、跨 change 归档顺序 |
| Ready 需求 | [`requirements/REQ-018-admin-console.md`](../../../requirement-workspace/requirements/REQ-018-admin-console.md) | 六字段 + 6 组场景索引 + 10 项 OQ 默认裁决 + DoR（BLOCKER 0） |
| 故事 | [`stories/add-admin-console.story.md`](../../../requirement-workspace/stories/add-admin-console.story.md)、[`stories.md`](../../../requirement-workspace/stories.md) | S19–S24，迭代 1–3，22 点；故事文件保留原始 AC / 场景 / 垂直切片 |
| 登记 | [`registry.md`](../../../requirement-workspace/registry.md) | REQ-018 行（p1-in-progress） |
| 提案 | [`proposal.md`](../../openspec/changes/add-admin-console/proposal.md) | Why / What Changes / 故事映射 / 范围 / 影响面 / 19 项决策 / 13 条验收信号 / 残余风险 / 交付边界 |
| Delta（管理端） | [`specs/admin-console/spec.md`](../../openspec/changes/add-admin-console/specs/admin-console/spec.md) | ADDED 9 Requirement / 38 Scenario |
| Delta（用户侧） | [`specs/customer-service/spec.md`](../../openspec/changes/add-admin-console/specs/customer-service/spec.md) | ADDED 4 Requirement / 13 Scenario |
| Delta（认证） | [`specs/user-auth/spec.md`](../../openspec/changes/add-admin-console/specs/user-auth/spec.md) | MODIFIED「注册账号」1 / 10 Scenario（选填邮箱 + 角色服务端固定） |
| 工件评审 | [`proposal-review`](../../reviews/20261117-add-admin-console-proposal-review.md)、[`spec-review`](../../reviews/20261117-add-admin-console-spec-review.md) | 2026-11-17，结论待签署 |

## 3. 关键决策

- **单 change / 三迭代：** 用户确认 `add-admin-console` 覆盖 6 条故事；P3 `tasks.md` 按迭代 1（S19+S20）、2（S21+S22）、3（S23+S24）分组。
- **管理员身份：** `app_users.role`（`USER` / `ADMIN`）+ V19 种子 `admin` 账号；`/api/admin/**` 服务端校验 `role=ADMIN`。
- **账号状态：** `ACTIVE / SUSPENDED / BANNED`；迁移仅 `ACTIVE→SUSPENDED`、`ACTIVE/SUSPENDED→BANNED`、`SUSPENDED→ACTIVE`；封禁 8 项理由（选「其他原因」时补充说明必填）+ 未来解封时间；到期后按 `ACTIVE` 放行并在下次状态变更落库。
- **限制口径：** `SUSPENDED` 精确拦四类写操作；`BANNED` 拦全部业务写操作但保留登录只读，以便展示封禁信息；封禁期不开放客服消息（发起人 2026-11-17 裁决，缺口登记为残余风险）。
- **举报生命周期：** `PENDING → PROCESSING → RESOLVED / REJECTED`；显式「开始处理」；备注必填；成立时按被举报用户当前状态处置（`ACTIVE` 选暂停或封禁、`SUSPENDED` 维持或升级、`BANNED` 只更新封禁信息），与 `RESOLVED` 同事务；记录保留；举报人只看状态。
- **客服：** `WAITING → HANDLING → CLOSED`；每用户最多一个未结束会话；3s 短轮询；`CLOSED` 只读并可再次发起；`ADMIN` 即客服。
- **契约 / 迁移：** 0.13.0 / V19，避开 `add-ai-itinerary` 的 0.12.0 / V18。
- **数据保留：** 处罚只改状态；MVP 无永久删除。
- **不改既有能力：** 不 MODIFIED `trip-plans` / `trip-companions` / `trip-experiences`；账号状态守卫作为 `admin-console` 的新前置条件。

## 4. 校验

- `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`。
- Delta 结构：3 份 delta、14 Requirement、61 Scenario：
  - `admin-console` ADDED 9 / 38；
  - `customer-service` ADDED 4 / 13；
  - `user-auth` MODIFIED 1 / 10。
- 未运行后端 / 前端测试：P1 尚无实现，按 `all-specs-review` 记 N/A。契约 lint、迁移与 E2E 属 P3 / P4。
- 已核对：契约 0.13.0 与 V19 不与 `add-ai-itinerary`（0.12.0 / V18）冲突；`add-user-profile` 与 `refine-safety-report` 的归档顺序已在提案声明。

## 5. 签署

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `proposal.md` | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `proposal` 评审报告 | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `proposal` 评审报告 | 2 | Jacky（SA） | 2026-11-17 | 已批准 |
| Delta Spec（3 份） | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `spec` 评审报告 | 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| `spec` 评审报告 | 2 | Jacky（SA） | 2026-11-17 | 已批准 |

> 当前开发者已由发起人于 2026-11-17 确认为 Jacky（SA）；四份 P1 工件与两份评审报告的签署位已于 2026-11-17 按发起人确认签齐，P2 解锁。

## 6. 提交与偏离记录

- 本记录与 P1 工件已与 P2 工件合并为一次本地提交：`ad78967 docs(p2): add-admin-console proposal, delta specs and G1 align record`（2026-11-17，未 push）。按用户「每阶段一次本地提交」的指示，该提交偏离 `@rule:git-commit-conventions` 的 verify / archive 两次边界；verify 提交前会 squash 或按需重整。
- 未触碰并行会话的 WIP：`profile.spec.ts` 底部 hunk、`tripMessages.ts`、`ProfileSetupPage.tsx`、`AppShell.tsx`、未跟踪的 `V16__normalize_demo_user_profiles.sql`。
- 本 change 不含任何后端 / 前端代码或迁移文件；V19 只是 P3 / P4 的规划。