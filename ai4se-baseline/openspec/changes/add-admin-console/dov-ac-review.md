# AC / DoV review — add-admin-console

- **Change:** `add-admin-console`（REQ-018 / S19–S24）
- **Phase:** P2（`/sdd:delta-craft` review step）
- **日期：** 2026-11-17
- **Artifact level:** 2（`proposal.md` + 3 份 Delta Spec；无 `design.md` / `tasks.md`）
- **评审输入：** `proposal.md`；`specs/admin-console/spec.md`（ADDED 9 Requirement / 38 Scenario）；`specs/customer-service/spec.md`（ADDED 4 / 13）；`specs/user-auth/spec.md`（MODIFIED「注册账号」1 / 10）；`requirement-workspace/requirements/REQ-018-admin-console.md`；`stories/add-admin-console.story.md`；Living Spec `openspec/specs/user-auth/spec.md`；未归档 `openspec/changes/add-user-profile/specs/user-auth/spec.md`；`openspec/changes/refine-safety-report/specs/trip-companions/spec.md`
- **工具校验：** `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`；`openspec show add-admin-console --json` → `deltaCount: 14`；`git status` 确认本 change 无实现代码或迁移文件
- **签署状态：** P1 四份工件与两份评审报告已于 2026-11-17 签齐（proposal / Delta = WAYNE；报告 = WAYNE + Jacky）

## AC checklist

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每个 Requirement 至少一条可测 AC | **Pass** | 14/14 Requirement 均带 `#### Scenario:`：`admin-console` 9（3/4/3/6/3/2/3/8/6）、`customer-service` 4（2/5/4/2）、`user-auth` 1（10）；合计 61 场景 | `user-auth` 的 10 个场景中 7 个沿用 Living / `add-user-profile` 基线，3 个为新增 |
| AC-2 AC 可观察（无「正常工作 / 体验良好」类表述） | **Pass** | 断言载体：HTTP 状态与错误码（`403 ADMIN_REQUIRED`、`403 ACCOUNT_SUSPENDED`、`403 ACCOUNT_BANNED`、`409 INVALID_STATUS_TRANSITION`、`409 CANNOT_TARGET_SELF`、`404 USER_NOT_FOUND`、`409 REPORT_NOT_PENDING`、`409 REPORT_NOT_PROCESSING`、`409 EMAIL_TAKEN`、`409 SESSION_ALREADY_HANDLING`、`409 SESSION_NOT_HANDLING`、`409 SESSION_CLOSED`）、状态枚举、`R-{id}`、字段清单、排序、分页、3s 轮询、只读态 | 无「适当 / 友好 / 及时」类措辞（全文检索 0 命中） |
| AC-3 高风险处给出负向 / 边界场景 | **Pass** | 61 个场景中 28 个含负向断言（`admin-console` 16 / 38、`customer-service` 6 / 13、`user-auth` 6 / 10），覆盖：非管理员 403、客户端自选角色被忽略、非法迁移、管理员自罚、已受限用户再处罚、封禁到期、四类写操作拒绝、`BANNED` 全写拒绝、处罚不删数据、重复开始处理、非 `PROCESSING` 处理、备注为空、重复发起会话、并发接入、`CLOSED` 只读、空白 / 超长消息、伪造客服身份、邮箱非法 / 重复 / 留空 | 边界补充见「Ambiguities」 |
| AC-4 AC 不是伪装的实现细节 | **Pass** | Requirement 正文只写行为、状态、错误码与可见字段；类名 / 表名 / SQL 列名只出现在 `proposal.md`「影响面」，未进入 Delta 正文 | Delta 中无 `if` / 方法名 / 表结构描述 |

## DoV checklist

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致，无静默扩缩 | **Pass** | 13 条承载 Requirement 的 What Changes 条目 ↔ 14 个 Requirement（下表逐条映射）；Out of scope 的 SSO / 审计流水 / 申诉 / WebSocket / 附件 / 邮箱验证 / 内容下架 / 永久删除均未在 Delta 出现 | 唯一的新增句「客服消息与行程聊天隔离」是 `customer-service`「客服会话历史保留」的显式化，不是新范围 |
| DoV-2 歧义已列出或收口 | **Pass** | 已收口 5 项：① 举报成立但被举报用户已 `SUSPENDED` / `BANNED` 的处置路径；② 封禁到期的「有效状态 vs 持久化」；③ 管理员自身受限时能否进后台；④ `OTHER` 封禁理由的补充说明；⑤ 结束非 `HANDLING` 会话的错误码。已裁决 1 项：`BANNED` 封禁期不开放客服通道（发起人 2026-11-17） | 未决项仅剩 UI 文案级细节，见「Deferred（非阻塞）」 |
| DoV-3 IO / SA 关注点已登记 | **Pass** | IO：`user-auth` 合并依赖 `add-user-profile` 先归档；SA：`BANNED` 无求助通道已接受、举报人四态文案、错误码表收敛 | 均写入提案残余风险 / 本报告 residual risk / G1 follow-ups |
| DoV-4 未声称已实现 | **Pass** | P1–P2 只产出文档；`git status` 无 `V19__` 迁移、无 controller / service / 前端页面改动；测试类证据记 N/A | 契约 0.13.0 与 V19 仍为规划 |
| DoV-5 Requirement 可追溯到提案 / 已批准需求 | **Pass** | 下表 14/14 有提案条目与故事归属；REQ-018 §4 按故事索引 49 条场景，其余 12 条为跨故事能力（权限 3、封禁展示 2、客服历史 2、会话生命周期 2、举报处理 3），均在同一 Requirement 下 | 无孤儿 Requirement；无无主场景 |

## Requirement → proposal → story 映射

| Requirement | Proposal What Changes | Story | 场景数 |
|---|---|---|---|
| `admin-console` 管理员身份与后台访问控制 | 第 1 条 | S19 / S20 | 3 |
| `admin-console` 用户列表与搜索 | 第 2 条 | S19 | 4 |
| `admin-console` 用户详情与关联内容 | 第 3 条 | S19 | 3 |
| `admin-console` 账号状态迁移与处罚 | 第 4 条 | S20 | 6 |
| `admin-console` 受限账号的功能边界 | 第 5 条 | S20 | 3 |
| `admin-console` 封禁信息展示 | 第 6 条 | S19 / S20 | 2 |
| `admin-console` 举报队列与筛选 | 第 7 条 | S21 | 3 |
| `admin-console` 举报详情与处理 | 第 8 条 | S22 | 8 |
| `admin-console` 客服工作台 | 第 12 条 | S24 | 6 |
| `customer-service` 帮助与反馈入口与我的举报状态 | 第 9 条 | S23 | 2 |
| `customer-service` 人工客服会话生命周期 | 第 10 条 | S23 | 5 |
| `customer-service` 客服消息与短轮询 | 第 11 条 | S23 / S24 | 4 |
| `customer-service` 客服会话历史保留 | 第 11 / 12 条 | S23 / S24 | 2 |
| `user-auth` 注册账号（MODIFIED） | 第 13 条 | S19–S24 的注册前提 | 10 |

> What Changes 的第 14–16 条（契约 0.13.0、前端页面、测试）是构建项而非能力项，不产生 Requirement，符合 OpenSpec 结构。

## 基线保留（`user-auth`）

| 检查 | 结果 |
|---|---|
| `add-user-profile` 增量中的 7 个场景名 | 7/7 保留，未改名、未删除 |
| 语义差异 | 仅新增「选填邮箱」「邮箱格式非法或重复」「客户端不能指定角色或初始状态」3 个场景，并在 Requirement 正文追加邮箱与角色规则 |
| Living Spec 其余 3 个 Requirement（登录 / 会话校验 / 退出） | 未被本 Delta 触碰，仍由 Living Spec 持有 |

## Deferred（非阻塞，P3 / P4 收口）

| 项 | 处理 | Owner |
|---|---|---|
| 举报人四态文案映射（待处理 / 处理中 / 已处理 / 举报不成立） | P3 `design.md` 定稿，`customer-service` 场景已断言状态可见 | Jacky |
| 12 个错误码集中成表并进 `OpenApiTest` | P3 `design.md` + P4 契约测试 | Jacky |
| 「默认按注册时间倒序、ID 倒序」「邮箱为空显示未填写」「404 `USER_NOT_FOUND`」三处 MUST 的测试落点 | P4 后端控制器测试 + E2E 断言（Requirement 已写清，无歧义） | Jacky |
| 举报成立且被举报用户已受限时的界面选项（维持 / 升级 / 更新封禁信息） | P3 设计稿按 Delta 场景出三态 | Jacky |
| 三档布局（390 / 768 / 1440）与窄屏卡片化 | P3 / P4 逐档走查 | Jacky |

## Residual risk

- `user-auth` 的归档顺序是硬约束：`add-user-profile` 必须先归档，否则本 Delta 的 MODIFIED 文本会被归档器按旧基线覆盖。
- `refine-safety-report` 的 `trip-companions` 仍写「MVP 不要求处置闭环」，与本 change 的交付相反，P5 必须补交叉引用。
- `BANNED` 封禁期无求助通道（发起人已接受）；若后续补客服通道，需另开需求并同步改边界与验收信号。
- 封禁到期以系统时钟计算，P4 必须用固定 `Clock` 覆盖「到期前 / 到期后」，否则测试抖动。
- 本地存在两个 V16 迁移（环境问题），P4 启动前必须清理，与本 change 的 V19 无关。

## Verdict

**Pass** — AC 4/4 Pass；DoV 5/5 Pass；阻塞 0。可进入 `/sdd:g1-decision-record`。