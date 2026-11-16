# P4 实现记录 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **能力：** `trip-companions`（MODIFIED）+ `trip-plans`（MODIFIED）｜ **需求：** REQ-013
- **阶段：** P4（ATDD apply / G2）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）
- **任务清单：** [`tasks.md`](../../../openspec/changes/refine-trip-chat/tasks.md)（T1–T12 全部 `[x]`）

## 1. 阶段目标

按 `atdd-design.md` 与 `tasks.md` 以 Red → Green 实现「已匹配同行者的集合确认与聊天闭环」，跑通后端、前端、契约与 E2E 四层验证，交 G2 由 VL 签署。

## 2. 代码产出

### 2.1 后端

| 任务 | 落点 | 结果 |
|---|---|---|
| T1 契约 0.10.0 | `openapi.yaml`：`TripPlan` 增 `meeting_area` / `meeting_time`、`TripDetail` / `TripCreateRequest` 增 `meeting_time`、`ApplicationStatus` 增 `left`、新增 `PUT /trips/{tripId}/meeting` + `TripMeetingRequest`；`OpenApiTest` 同步版本、枚举与端点断言 | Pass |
| T2 迁移 | `V16__add_meeting_time.sql`（`trip_plans.meeting_time VARCHAR(16)` 可空；V13/V14/V15 已被远程 change 占用，后到者顺延） | Pass |
| T3 退出语义 | `ApplicationStatusEnum.LEFT("left")`、`TripApplication#isLeft`、`leave` 置 `LEFT` 并 `removeCompanion` | Pass |
| T4 聊天准入 | `ApplicationService#isChatPartner`（`ACCEPTED\|LEFT`）、`ChatServiceImpl#requireAccess` | Pass |
| T5 会话列表 | 新增 `pojo/ChatCounterpart`、`ApplicationService#chatCounterparts`、`ChatServiceImpl#partners` 合并消息历史与既有配对，`THREAD_ORDER` 稳定排序 | Pass |
| T6 集合链路 | 新增 `TripMeetingRules`（格式 / 区间校验）、`TripMeetingRequest`；`TripPlan#withMeetingInfo`、`TripPlanDraft`、`TripPlanEntity`、`TripSummaryResponse`、`TripDetailResponse`、`TripPlanService#updateMeeting`、`PUT /trips/{tripId}/meeting`（403 / 409 / 400） | Pass |

### 2.2 前端

| 任务 | 落点 | 结果 |
|---|---|---|
| T7 类型与纯函数 | `types.ts`、`api.ts#saveTripMeeting`、`i18n/tripMessages.ts`；新增 `chat/chatTime`、`chat/chatComposer`、`chat/chatActions`、`chat/chatMeeting`、`chat/chatPolling`、`trips/applicationStatus`、`trips/meetingForm`（各带 Vitest）；`trips/tripForm` 增集合时间校验 | Pass |
| T8 聊天页两栏 | 新增 `chat/ChatList.tsx`、`chat/ChatMain.tsx`，重写 `chat/ChatPage.tsx`：3 秒短轮询、进入加载、手动刷新、Enter 发送 / Shift+Enter 换行、已结束只读、无会话与未匹配空态、退出与举报入口；`styles.css` 追加 `.chat-*` / `.msg` / `.composer` 与 980px / 680px 断点 | Pass |
| T9 详情页集合 | `trips/TripDetailPage.tsx`：集合区域与时间常驻 facts、未填提示、发布者「编辑集合信息」弹窗（保存后刷新）、退出后本地状态置 `left`、聊天入口扩到 `accepted\|left`；`trips/TripCreatePage.tsx` 增集合时间字段 | Pass |
| T10 状态统一 | `mine/MyTripsPage.tsx` 已匹配条目展示集合备注；三个页面删除本地 `applicationLabel`，统一用 `trips/applicationStatus`（含「已退出」） | Pass |

### 2.3 E2E

| 任务 | 落点 | 结果 |
|---|---|---|
| T11 | `e2e/tests/companions.spec.ts` 重写：匹配理由与默认排序、聊天全流程（申请 → 接受 → 我的旅行集合信息 → 双消息升序带时间 → 刷新仍在 → 手动刷新 → 举报 → 退出后仍可聊 → 我的旅行标签）、入口诚实（发布者无申请入口、仅 PENDING 被拒并说明、已结束只读且无富媒体 / 推送入口）、无刷新轮询、Enter / Shift+Enter；`e2e/tests/trips.spec.ts` 增「发布带集合时间并从详情编辑」「集合时间晚于结束日期被拒」 | Pass |

## 3. 验证证据

| 层 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `backend/mvnw.cmd -B test` | `Tests run: 242, Failures: 0, Errors: 0`，BUILD SUCCESS |
| 契约单测 | `backend/mvnw.cmd test -Dtest=OpenApiTest` | 7/7 Pass |
| 契约 lint | `npx @redocly/cli lint openapi.yaml` | valid，15 warnings（与改动前基线相同，新增 0） |
| 前端构建 | `frontend/npm run build` | Pass（dist js 1,018 kB / gzip 324 kB；chunk 体积 warning 为既有现象） |
| 前端单测 | `frontend/npm test` | 23 files / 169 tests Pass |
| E2E 全量 | `e2e/npx playwright test` | 59 passed（合并前基线；合并后关键 13 例复跑全绿：companions 11 + chat-entry 1 + trips meeting 2） |
| 规格校验 | `openspec validate refine-trip-chat --strict` | `Change 'refine-trip-chat' is valid` |

## 4. 数据卫生处置（dev 库）

本轮 E2E 首次全量运行出现 3 个失败，逐一归因后确认**均非本 change 代码回归**：

1. `trips.spec.ts`「发布带集合时间并编辑」：antd 对双字按钮插入空格，`getByRole('button', { name: '保存' })` 匹配不到「保 存」→ 改 `/保\s*存/`。
2. `companions.spec.ts` 无消息会话断言：`getByText` 命中多个 `.ci-last`（strict mode violation）→ 限定到 `.chat-item` / `.chat-body` 作用域。
3. 两个既有用例（`defaults to the recruiting trips view…`、`distinguishes full trips…`）：dev 库累积 27 条行程 / 21 个账号，种子行程被挤出首页第一页，且测试账号对种子行程 trip 3 的已接受申请把人数从 `1/3` 改成 `2/3`。

经用户确认按既有先例处置（`docs/ai4se-plugins/20261116-111241-local-verify-report.md` §5）：

- 备份：`Sqlite/routeme-dev-backup-20261116-1610.db`。
- 删除测试产物：`reports` 2 条、`chat_messages` id>4（13）、`trip_experiences` id>2（1）、`trip_applications` id>7（16）、`trip_plans` id>7（20）、`auth_sessions` 14、`app_users` id>4（17）；`PRAGMA integrity_check` = ok、`foreign_key_check` = 空。
- **补充发现：** `trip_plans.joined_count` 是持久化列（`addCompanion` / `removeCompanion` 增减），删申请行不会回滚人数；按 `V4__seed_demo_trips.sql` / `V12__seed_viewer_profile_user.sql` 的种子原值重置为 2/3/1/2/1/2/1，API 复核 trip 3 = `1/3 recruiting`、trip 6 = `2/2 full`。
- 随后全量 E2E 50/50 通过。合并 origin/main 后新增 `chat-entry.spec.ts`（导航/申请页/同行者列表三处聊天入口），关键 13 例复跑全绿。

## 5. 偏差与冲突记录

| # | 类型 | 内容 | 处置 |
|---|---|---|---|
| D-1 | 设计缺口 | `TripPlan`（列表 / 摘要）不含 `meeting_area`，「我的旅行」无法展示集合区域 | P3 后修正 `design.md` D1，T1 契约让 `TripPlan` 同时带 `meeting_area` 与 `meeting_time`（`p3-design.md` 已记） |
| D-2 | 规格冲突 | Delta 场景「参与同行不因退出减少」与 G1 条件「joined 只认 `ACCEPTED`」相反 | 用户 2026-11-16 裁决当前口径（退出后减一）；订正 Delta 场景、`atdd-design.md` A7 / UT-4，并写 `spec-review-3.md` |
| D-3 | 工具约束 | `openspec validate --strict` 要求 `tasks.md` 含 checkbox，原任务表只有表格 | 增「执行清单」12 条，P4 收尾时全部勾选 |
| D-4 | 契约噪声 | 新端点示例引入 2 条 `no-invalid-media-type-examples` warning（示例时间缺 `T`、`Error` 无 `message` 字段） | 示例改为符合 pattern 的越界时间、删除多余 `message`；lint 回到 15 条基线 |
| D-5 | 环境 | E2E 跑在 `routeme-dev.db`，被测后端为旧进程时无 `meeting_time` | 用户授权后重启后端，Flyway 应用 V16 后复跑 |
| D-6 | 编号与版本冲突 | 合并 `origin/main` 期间远程已占用 REQ-010/011/012、迁移 V13/V14/V15、契约 0.9.0 | 本 change 顺延为 REQ-013；迁移两次顺延至 V16；契约改为 0.10.0（远程 0.9.0 + 本 change 增量）；工件 23 份批量改号 |

## 6. 遗留与风险

- E2E 数据污染仍无自动清理（`refine-inspiration-home` 已记为 open WARNING）：每轮全量 E2E 会再次累积行程与账号，复跑前需重建或清理 dev 库。本次处置为手工脚本 + 迁移原值校准，未纳入代码。
- 前端 bundle 单包 1,018 kB（gzip 324 kB），构建存在 chunk 体积 warning，属既有现状，不在本 change 范围。
- 工作区存在**非本 change** 的未提交改动（`docs/knowledge/rules/*`、`ai4se-baseline/AGENTS.md`、`backend/pom.xml` 的 `--enable-preview` 编译参数、`.vscode/settings.json` 等），提交时需按 change 拆分，勿混入本 change 提交。
- P0–P4 记录与代码均**尚未提交**（见 §8）；提交动作待用户确认。

## 7. G2 待签事项

| 角色 | 姓名 | 确认内容 | 状态 |
|---|---|---|---|
| VL | Neal | 五层验证证据（后端 242 / 前端 169 / 契约 / E2E 59 + 关键复跑 / 规格 strict）、数据卫生处置与偏差记录 | 待签 |
| AO | Jay | 实现与记录真实、范围未超出提案 | 已署（本文件） |

## 8. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | `b4ff5e8` docs(p0) |
| P1 | `d355c55` docs(p1) |
| P2 | `5a31d70` docs(p2) |
| P3 | `fdc3576` docs(p3) |
| P4 实现 | `d5c24fc` feat(chat) |
| P4 记录 | `20836a3` docs(p4) |
| 同步远程（第一轮） | `1d1140f` Merge origin/main（REQ-010→REQ-013、迁移 V13→V14、契约 0.9.0→0.10.0） |
| 同步远程（第二轮） | `2f6a74b` Merge origin/main（588ef9e，采用登录门/账号菜单，迁移顺延 V16） |
