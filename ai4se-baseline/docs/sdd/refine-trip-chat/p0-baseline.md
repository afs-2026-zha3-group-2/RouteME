# P0 基线记录 — refine-trip-chat

- **Change：** `refine-trip-chat`（能力 `trip-companions` MODIFIED + `trip-plans` MODIFIED）｜ **需求：** REQ-010 同行消息与集合确认
- **阶段：** P0（Project baseline）｜ **日期：** 2026-11-16
- **记录人：** Jay（AO）

## 1. 阶段目标

确认「已匹配同行者在行程内确认集合与安排」可以在现有基线上开工：聊天能力、集合区域字段、原型页面、契约与管道均可查，并明确本 change 与既有能力的边界。

## 2. 基线核对

| 项 | 证据 | 结论 |
|---|---|---|
| 能力基线（聊天） | `openspec/specs/trip-companions/spec.md`「匹配后的一对一文字沟通」 | 本 change 以此为 MODIFIED 基线：权限、持久化、升序、500 字上限、已结束只读已写入规格 |
| 能力基线（行程） | `openspec/specs/trip-plans/spec.md`「发布可被他人理解的旅行计划」「查看行程详情与清晰的状态」 | 集合区域已作为选填字段写入规格 |
| 聊天后端 | `ChatController`、`ChatServiceImpl`、`ChatMessageMapper`、`V6__create_chat_messages.sql` | 已实现：`GET/POST /api/trips/{tripId}/messages`、`GET /api/me/chat-partners`；仅发布者与已接受同行者可读写；`COMPLETED` 只读 |
| 聊天前端 | `frontend/src/chat/ChatPage.tsx`、`route.ts#/chat/:tripId/:userId` | 现状为 antd 单栏卡片：有手动刷新、5 秒轮询、发送时间；**缺**原型的会话列表、头部动作、集合安全条、Enter 发送、空态 |
| 集合区域字段 | `V4__seed_demo_trips.sql`（`meeting_area VARCHAR(100)`）、`TripCreateRequest.meetingArea`、`TripDetailResponse.meetingArea`、`TripCreatePage`（可手填或地图选点）、`TripDetailPage` 展示、`openapi.yaml` `meeting_area` | **已存在**，本 change 只补聊天页与「我的旅行·已匹配」的展示 |
| 集合时间字段 | 全仓库检索 `meeting_time` / `meetingTime` 无结果 | **不存在**，本 change 新增 |
| 行程编辑能力 | `route.ts` 无编辑路由；`TripController` 无 PUT/PATCH；`TripCreatePage` 的 `fromTripId` 为「参考此行程发布」（新建） | **不存在**，本 change 只新增「集合区域 + 集合时间」两字段的编辑 |
| 退出同行 / 举报 / 资料弹窗 | `TripDetailPage` 的 `leaveTrip`、`ReportModal`、`ProfileModal` | 可直接复用，不新增权限模型 |
| 原型 | `docs/prototype/ui.js` `chat()`、`styles.css` `.chat-layout` / `.chat-item` / `.chat-safety` / `.composer`、`main.js` 3 秒轮询与贴底 | 聊天页视觉与交互基准；集合时间与集合编辑入口需**先改原型** |
| 契约 | `openapi.yaml` 版本 `0.8.0`，已含 `ChatMessage` / `ChatMessageRequest` / `ChatPartner` / `meeting_area` | 需新增 `meeting_time` 与集合编辑端点 |
| 迁移 | `V1`–`V12`（最新 `V12__seed_viewer_profile_user.sql`） | 下一个版本号 `V13` |
| 规则载体 | `docs/knowledge/rules/_INDEX.md`（6 分类 / 26 条） | 覆盖质量、测试、安全与 SDD 工件 |
| 知识库 | `docs/knowledge/_INDEX.md`、`_LOG.md` | 槽位可写 |
| CI / CD | `.github/workflows/ci.yml`、`cd.yml` | 存在并在主干运行 |
| 既有测试 | `ChatControllerTest`、`e2e/tests/companions.spec.ts`（含聊天用例） | 聊天后端有单测；前端聊天页无 UT，E2E 有基础用例 |

## 3. P0 DoV 检查

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| P0-1 | 基线骨架存在 | Pass | `openspec/`、`docs/knowledge/`、`AGENTS.md`、`requirement-workspace/` |
| P0-2 | 规则覆盖六类关注点 | Pass | 6 分类 / 26 条；本 change 涉及 `api-contract`、`prototype-ui-alignment`、`web-testing`、`java-testing`、`pii-scrubbing`、`artifact-review-gate` |
| P0-3 | 阶段技能可解析 | Pass | `.qoder/skills/sdd-*` 全部就位（pre-spec-req → proposal-split → delta-craft → atdd-design → task-plan → atdd-apply → local-verify-report） |
| P0-4 | pack 隔离违规 | Skipped | 不修改 `vendor/ai4se-plugins` 包文件 |
| P0-5 | 管道骨架 | Pass | CI 覆盖契约、后端、前端、E2E；CD 发布 `build-<sha>` |

## 4. 范围前提（P1 输入）

| 前提 | 裁决来源 | 结论 |
|---|---|---|
| 变更性质 | 用户裁决（2026-11-16） | 对既有同行聊天做 MODIFIED 重构，不新建 capability |
| 集合区域 | 基线核对 | 已存在，只补展示，不新增字段 |
| 集合时间 | 用户裁决（2026-11-16） | 新增：日期 + 时间、选填、不晚于行程结束日期 |
| 集合编辑 | 用户裁决（2026-11-16） | 只允许发布者修改「集合区域 + 集合时间」；可编辑状态为招募中与已满员；不实现完整行程编辑 |
| 页面范围 | 用户裁决（2026-11-16） | 严格按原型两栏结构与头部动作 |
| 不做 | 用户裁决（2026-11-16） | 不做 WebSocket、已读回执、推送、图片 |
| 记录与签署 | 用户裁决（2026-11-16） | SM=Lewis、AO=Jay、IO=Wanye、SA=Jacky、VL=Neal；G1 由 SA 与 IO 签署，G2 由 VL 签署 |

## 5. 阶段产出

- 本记录：`docs/sdd/refine-trip-chat/p0-baseline.md`
- 未新增代码、规格或迁移；P1 起进入需求条目与提案。

## 6. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 准入 P1；本 change 排期与 REQ-010 归属确认 | 2026-11-16 |
| IO | Wanye | REQ-010 为需求来源；与 REQ-003（同行）与 REQ-002（行程）的边界清晰 | 2026-11-16 |
| AO | Jay | 基线证据可复现；同意进入 P1 | 2026-11-16 |

**阶段结论：Pass**

## 7. 准入 P1 的条件

- 提案写清 in-scope / out-of-scope，尤其是「聊天页重构」「集合时间字段」「集合编辑」三块的范围与不做的部分。
- 明确 `trip-companions` 与 `trip-plans` 双 capability 的 MODIFIED 关系，归档前需 SA 具名追认双 capability 例外。
- 集合时间的校验口径与可编辑状态在提案中固化为可判定语句，不留待实现阶段即兴决定。
