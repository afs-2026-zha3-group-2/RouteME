# REQ-018 意图捕获 — 管理后台（用户管理 / 举报处置 / 人工客服）

- **来源：** 用户 2026-11-17 提供的 6 条 User Story（含优先级、迭代、故事点、落点页面、验收标准、Given/When/Then 场景与垂直切片口径）
- **Change：** `add-admin-console`（单 change 覆盖迭代 1–3）
- **状态：** P3 Pass（2026-11-17；P2 G1 Pass → P3 Pass，P4 待执行）｜ **Discovery Decision：** Go（light intake）
- **基线：** `main@c948b1b`

## 1. 原始诉求

用户用 6 条故事描述一个**平台管理后台**：管理员能查看并搜索所有注册用户、暂停 / 封禁 / 恢复账号、查看并处理举报、与点「人工客服」的用户对话；用户能从「帮助与反馈」发起人工客服，并看到举报的受理与最终状态。

## 2. 故事清单

| Story | 标题 | 迭代 | 点 | 落点 |
|---|---|---|---|---|
| S19 | 查看并查询平台所有注册用户 | 1 | 3 | 用户管理页 |
| S20 | 暂停、封禁或恢复用户账号 | 1 | 3 | 用户详情页 |
| S21 | 查看并筛选平台举报 | 2 | 3 | 举报管理页 |
| S22 | 人工审核并处理举报 | 2 | 5 | 举报详情页 |
| S23 | 联系人工客服 | 3 | 3 | 帮助与反馈 / 客服会话页 |
| S24 | 接入并回复用户会话 | 3 | 5 | 客户服务页 |

## 3. 现状差距（as-is）

| 能力 | 现状 | 证据 | 缺口 |
|---|---|---|---|
| 管理员身份 | 无 `role`、无后台入口；所有业务端点只认 `X-User-Id` | `backend/.../entity/UserEntity.java`；全仓 `admin` 零命中 | 无法区分管理员与普通用户 |
| 账号状态 | 无 `status`；只有账号存在 / 不存在 | `UserEntity`；`V9__add_user_credentials.sql` | 无法暂停、封禁、恢复 |
| 写操作限制 | 只按行程 / 申请 / 聊天状态拒绝 | `ChatNotAllowedException`、`TripNotOpenException` 等 | 账号级限制不存在 |
| 举报处置 | 只写 `reports` 一行并返回 `received=true` | `ReportController.java`；`V7__create_reports.sql`；`ReportEntity.java` | 无状态、无队列、无处理结果、无处罚 |
| 用户邮箱 | `app_users` 无 `email` | `UserEntity`；`openapi.yaml` 0.11.0 | 列表 / 搜索无法满足故事 |
| 人工客服 | 只有「已匹配同行者 × 行程」聊天 | `V6__create_chat_messages.sql`；`ChatPage.tsx` | 无帮助入口、无会话队列、无接入 / 结束 |
| 举报人回看 | 只有提交回执「已收到，我们会处理」 | `ReportModal.tsx`；`trip-companions` Living Spec | 看不到受理与最终状态 |
| 用户详情聚合 | 只有个人主页与我的旅行 | `MyTripsPage.tsx`、`UserProfileController.java` | 无管理员视角的行程 / 体验 / 举报聚合 |
| 数据规模 | 369 users / 110 trips / 13 reports / 6 experiences / 13 chat messages | `SqlLite/routeme.db`（2026-11-17） | 处置只能手改库，不可审计 |

## 4. 关键裁决（用户确认 + 默认收口）

| 编号 | 决策点 | 选择 | 来源 |
|---|---|---|---|
| D1 | change 粒度 | 单 change `add-admin-console`，P3 按迭代 1–3 分组 | 用户确认（2026-11-17） |
| D2 | 管理员身份 | `app_users.role` + V19 种子 `admin` 账号 | 用户确认（2026-11-17） |
| D3 | 权限位置 | `/api/admin/**` 服务端校验 `role=ADMIN`；前端只隐藏入口 | 故事 AC「仅管理员可访问」 |
| D4 | 客服角色 | MVP 中 `ADMIN` 即客服，不设 `STAFF` | 简化角色矩阵 |
| D5 | 暂停口径 | 精确对应 S20 四类写操作；读取与客服保留 | S20 AC |
| D6 | 封禁口径 | 保留登录只读；全部业务写操作 403（含客服消息，发起人 2026-11-17 裁决）；资料页展示封禁信息 | S1 / S20 AC |
| D7 | 解封 | 到期读取时惰性恢复；不提供手动解封 | S1「解封时间」 |
| D8 | 「暂停发布行程」 | 归入 `SUSPENDED`，不单设类型 | 与 S20 动作集合一致 |
| D9 | 封禁理由 | 8 项：7 类具体 + `OTHER`；与举报原因四值分离 | 用户给出的理由列表 |
| D10 | 举报开始处理 | 显式「开始处理」；打开详情不改状态 | 避免误点副作用 |
| D11 | 举报成立 | 必须选暂停或封禁；与 `RESOLVED` 同事务 | 故事「采取措施」 |
| D12 | 举报人可见范围 | 只看状态与时间；不看备注与处罚细节 | 隐私 |
| D13 | 客服实时性 | 3s 短轮询（复用 `CHAT_POLL_INTERVAL_MS`） | 与现有聊天一致 |
| D14 | 会话并发 | 每用户最多一个 `WAITING / HANDLING`；重复发起返回既有会话 | 避免队列重复 |
| D15 | 邮箱 | 注册选填、唯一、小写规范化；既有账号 `NULL` | 故事要求字段，MVP 不做验证 |
| D16 | 数据保留 | 只改状态；无删除端点；无永久删除 | S20 AC |

## 5. 跨 change 冲突与归档顺序

1. **`add-user-profile`（未归档，P4 已通过）** 也 MODIFIED `user-auth`「注册账号」。本 change 的 `user-auth` 增量以它为前置文本，`add-user-profile` MUST 先归档。
2. **`refine-safety-report`（未归档，P4 已通过）** 的 `trip-companions` 增量仍写「MVP 不要求处置闭环」。本 change 在 `admin-console` 交付闭环；P5 在该句补「处置闭环见 `admin-console`」，不改举报原因四值。
3. **`add-ai-itinerary`（P1）** 已预留契约 0.12.0 / V18；本 change 使用 0.13.0 / V19。
4. 本 change **不 MODIFIED** `trip-plans` / `trip-companions` / `trip-experiences`：账号状态守卫作为 `admin-console` 的新前置条件，既有能力的 happy-path 文本不变，避免与三个未归档 change 的 delta 互相覆盖。

## 6. 产出

- `requirement-workspace/requirements/REQ-018-admin-console.md`（本需求六字段 + 场景索引 + OQ + DoR）
- `openspec/changes/add-admin-console/proposal.md`（P1 提案）
- `openspec/changes/add-admin-console/specs/admin-console/spec.md`（ADDED 9 Requirement / 38 Scenario）
- `openspec/changes/add-admin-console/specs/customer-service/spec.md`（ADDED 4 Requirement / 13 Scenario）
- `openspec/changes/add-admin-console/specs/user-auth/spec.md`（MODIFIED 1 Requirement / 10 Scenario）
- `docs/reviews/20261117-add-admin-console-proposal-review.md`、`...-spec-review.md`
- `docs/sdd/add-admin-console/p1-intent.md`

## 7. 验证

- `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`
- 结构：3 份 delta、14 Requirement、61 Scenario；`admin-console` 9 / 38，`customer-service` 4 / 13，`user-auth` 1 / 10。
- 未运行后端 / 前端测试：P1 尚无实现，按 `all-specs-review` 记 N/A。