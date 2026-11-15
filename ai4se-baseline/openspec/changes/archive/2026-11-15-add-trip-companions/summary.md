# Change summary — add-trip-companions

## Intent

REQ-003：让用户看到可解释的同行匹配、对他人招募中行程提交/取消申请，让发布者处理申请并联动人数；匹配后开放一对一文字沟通、支持退出同行，并提供「我的旅行」聚合与最低安全能力（安全提示、举报），为 REQ-004 的「参加过」判定提供依据。

## What shipped

- **契约**：`openapi.yaml` 升至 `0.3.0`，新增 `/matches`、`/matches/{tripId}`、申请（GET/POST + cancel/accept/reject）、`/trips/{tripId}/leave`、`/trips/{tripId}/messages`（GET/POST）、`/me/chat-partners`、`/me/trips`、`/reports` 与对应 schema；错误码扩到 11 个（含 `APPLICATION_*`、`DUPLICATE_APPLICATION`、`CHAT_*`）。
- **数据**：`V5__create_trip_applications.sql`（7 条申请，与 V4 `joined_count` 对齐）、`V6__create_chat_messages.sql`（4 条会话种子）、`V7__create_reports.sql`（空表）；不新增 companions 表。
- **后端**：`TripMatch`/`MatchService`/`MatchController`（计分 50/30/20/兴趣 10 上限 20，默认分数倒序带理由与百分比）、`ApplicationService`/`ApplicationController`（申请状态机、发布者处理、退出）、`TripPlanService.addCompanion/removeCompanion`（事务内单一写入 `joined_count`，状态投影自动满员/回退）、`ChatService`/`ChatController`（已匹配双方、已完成只读、500 字上限）、`MyTripsService`/`MyTripsController`（四组 + 待处理数）、`ReportService`/`ReportController`；`TripController` 详情的 `participants` 补齐已接受同行者。
- **前端**：首页改用 `/matches` 并默认「按匹配度」，卡片展示理由与百分比；详情页匹配面板、申请弹窗（选填 ≤120）、状态与取消、退出同行二次确认、安全提示与举报弹窗、发布者申请处理入口；新增 `ApplicationsPage`、`MyTripsPage`（四 tab + 待处理提醒）、`ChatPage`（列表/发送/刷新/5s 轮询/只读）；新增 `#/mine`、`#/chat/{tripId}/{userId}`、`#/trips/{id}/applications` 路由。
- **测试**：后端 103（API/领域/服务/SQLite 迁移）、前端 27、Playwright 8（companions 3 + trips 5）。
- **知识库**：domain 补同行词汇与不变量；interfaces 升级到 v0.3.0 并补 13 个端点；architecture 补 V5–V7 与模块职责；`_LOG` 与 `registry.md` 更新 REQ-003。

## Verify highlights

- 本地验证报告：`docs/ai4se-plugins/20261115-173200-local-verify-report.md`（Redocly 0 error；后端 103、前端 27、E2E 8 全过）。
- CI：run #54（`162edb4`，实现）全绿；run #55（`2b16115`，文档）全绿。
- G1 `g1-decision.md`（Pass，IO Wanye / SA Jacky、Karena）；G2 `g2-decision.md`（Pass，VL Neal）。

## Residual risks

| 风险 | 处理 |
|---|---|
| 演示身份 `X-User-Id` 可伪造 | 生产化 change 替换为真实认证 |
| Playwright 不进 CI | 本地门禁；需要浏览器回归门禁时再评估 |
| 契约 4 条 warning（含故意非法示例） | 保留以说明 400 行为；接入更严格 lint 时处理 |
| E2E 在开发库累积数据 | 唯一标题、断言不依赖总数；后续做测试库隔离 |
| 聊天为轮询而非推送 | MVP Non-goal；需要实时性时再引入推送 |
| 分步提交与「两次提交」规则不一致 | 与 plans 同源：历史已推送，不改写；记录为后续 change 的例外参考 |

## Links

- Spec：`openspec/changes/add-trip-companions/specs/trip-companions/spec.md`
- Design / Tasks / ATDD：同目录 `design.md`、`tasks.md`、`atdd-design.md`
- AC/DoV：同目录 `dov-ac-review.md`
- Gates：同目录 `g1-decision.md`、`g2-decision.md`、`g3-decision.md`
- Verify：`docs/ai4se-plugins/20261115-173200-local-verify-report.md`
- CI：#54 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43699482843 ｜ #55 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43699724435