# 任务清单 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **日期：** 2026-11-16｜ **Owner：** Jay（AO）
- **口径：** 一条任务只落一层；契约先于两端；每条带验证命令

## 执行清单

- [x] T1 契约升 0.9.0（`openapi.yaml` + `OpenApiTest`）
- [x] T2 `V13__add_meeting_time.sql`
- [x] T3 「已退出」状态语义（枚举 / leave / isLeft）
- [x] T4 聊天准入 `requireAccess`（`ACCEPTED|LEFT`）
- [x] T5 会话列表补齐（`chatCounterparts` + 消息历史合并）
- [x] T6 集合字段链路 + `PUT /trips/{id}/meeting`
- [x] T7 前端类型与纯函数
- [x] T8 聊天页两栏
- [x] T9 详情页集合展示与编辑
- [x] T10 我的旅行与申请状态统一
- [x] T11 E2E-1～E2E-13
- [x] T12 P4 记录、本地验证报告与 G2

## 任务表

| ID | 层 | 任务 | 落点 | 验证命令 |
|---|---|---|---|---|
| T1 | contract | 契约升 0.9.0：`meeting_time`（`TripPlan` / `TripDetail` / `TripSummary` / `TripCreateRequest`）、`ApplicationStatus` 增 `left`、新增 `PUT /trips/{tripId}/meeting` + 成功/400/403/409 示例；同步 `OpenApiTest`（版本号、状态枚举、新字段与新端点断言） | `openapi.yaml`、`backend/src/test/java/routeme/controller/OpenApiTest.java` | `mvnw.cmd test -Dtest=OpenApiTest`（`backend/`） |
| T2 | db | `V13__add_meeting_time.sql` 新增可空列 | `backend/src/main/resources/db/migration/` | `mvnw.cmd test -Dtest=TripControllerTest`（启动 Flyway） |
| T3 | backend | `ApplicationStatusEnum.LEFT`；`leave` 置 `LEFT`；`TripApplication.isLeft()`；`ApplicationService` 视图口径不变 | `enums/`、`pojo/`、`service/impl/ApplicationServiceImpl` | `mvnw.cmd test -Dtest=ApplicationControllerTest` |
| T4 | backend | 聊天准入 `requireAccess`（`ACCEPTED|LEFT`）+ `ApplicationService.isChatPartner` | `service/impl/ChatServiceImpl`、`service/ApplicationService` | `mvnw.cmd test -Dtest=ChatControllerTest` |
| T5 | backend | 会话列表补齐：`chatCounterparts` + 与消息历史合并去重排序 | `service/impl/ApplicationServiceImpl`、`service/impl/ChatServiceImpl` | `mvnw.cmd test -Dtest=ChatControllerTest` |
| T6 | backend | 集合字段链路：pojo/entity/mapper、`TripMeetingRules`、`TripPlan#withMeetingInfo`、`TripCreateRequest`、`TripDetailResponse`、`TripSummaryResponse`、`TripMeetingRequest`、`PUT /trips/{id}/meeting` | `pojo/`、`entity/`、`request/`、`response/`、`controller/TripController`、`service/impl/TripPlanServiceImpl` | `mvnw.cmd test -Dtest=TripControllerTest` |
| T7 | frontend | 类型与纯函数：`types.ts`、`api.ts`（`saveTripMeeting`）、`tripMessages`、`chatTime` / `chatComposer` / `chatActions` / `chatMeeting`、`applicationStatus`、`meetingForm`、`tripForm` 集合时间校验 | `frontend/src/` | `npm run typecheck && npm test` |
| T8 | frontend | 聊天页两栏：`ChatPage` / `ChatList` / `ChatMain`、3 秒轮询、头部动作、安全条、输入交互、空态与拒绝说明、`.chat-*` 样式 | `frontend/src/chat/`、`styles.css` | `npm run typecheck && npm test` |
| T9 | frontend | 详情页集合时间展示 + 发布者编辑弹窗 + 保存后刷新 | `frontend/src/trips/TripDetailPage.tsx`、`styles.css` | `npm run typecheck && npm test` |
| T10 | frontend | 我的旅行：已匹配集合备注；三处 `applicationLabel` 本地副本改用 T7 的 `applicationStatus`（含「已退出」） | `frontend/src/mine/MyTripsPage.tsx`、`trips/TripDetailPage.tsx`、`trips/ApplicationsPage.tsx` | `npm run typecheck && npm test` |
| T11 | e2e | `companions.spec.ts` 扩 E2E-1～E2E-9；`trips.spec.ts` 扩 E2E-10～E2E-13 | `e2e/tests/` | `npm test`（`e2e/`） |
| T12 | docs | P4 记录、本地验证报告、G2 决策、注册表更新 | `docs/sdd/refine-trip-chat/`、`docs/ai4se-plugins/` | 人工核对 + `scripts/verify-links.sh` |

## 依赖顺序

1. T1 → T2 → T6（契约与迁移先行）。
2. T3 → T4 → T5（状态与准入，再列表）。
3. T7 → T8 / T9 / T10（纯函数先行，再接页面）。
4. T11 依赖 T1–T10。
5. T12 依赖 T11。

## 对齐自检

| 检查 | 结果 |
|---|---|
| 每个任务只落一层 | Pass（contract / db / backend / frontend / e2e / docs 各一行） |
| 契约任务先于两端 | Pass（T1 先于 T3–T10） |
| 每条任务有验证命令 | Pass |
| 25 条场景均有任务覆盖 | Pass（A1–A10 ↔ T3–T6；UT-1–UT-7 ↔ T7–T10；E2E-1–E2E-13 ↔ T11） |
| 无孤儿任务 | Pass（T12 为记录，不产生业务代码） |
| Out of scope 未进入任务 | Pass（无推送、富媒体、完整编辑、分页） |
| 原型改动已先行 | Pass（P3 已改 `docs/prototype/` 并通过浏览器验证） |
