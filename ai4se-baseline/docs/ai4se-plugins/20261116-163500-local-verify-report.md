# 验证报告：refine-trip-chat（P4 本地验证）

- **变更：** `refine-trip-chat`（`trip-companions` MODIFIED + `trip-plans` MODIFIED，REQ-013）
- **契约版本：** `openapi.yaml` **0.9.0**（新增 `meeting_time` 链路、`left` 状态、`PUT /trips/{tripId}/meeting`）
- **时间：** 2026-11-16 16:35（本机 Windows，Node 22+ / JDK 21）
- **范围：** 已匹配同行者的集合确认与聊天闭环；含退出后仍可聊、集合信息展示与发布者维护

## 1. Red：先看到失败

| # | 复现 | 旧行为 |
|---|---|---|
| R-1 | `ApplicationControllerTest` 断言 leave 后 `status=left` | 旧实现置 `CANCELLED`，断言失败（403 / expected pending） |
| R-2 | `ChatControllerTest#in_leftCompanion_out_canStillReadAndSend` | 旧准入只认 `ACCEPTED`，退出后返回 403 `CHAT_NOT_ALLOWED` |
| R-3 | `ChatControllerTest` 会话列表用例 | 旧 `partners` 只按消息聚合，「已匹配但无消息」的配对缺失 |
| R-4 | `TripControllerTest` 集合字段 7 例 | 旧 `TripPlan` 无 `meeting_time`，端点不存在（404 / 编译失败） |
| R-5 | `chatPolling.test.ts` | 首版用 `window.setInterval`，Vitest node 环境无 `window`，2 例失败 |
| R-6 | E2E `companions.spec.ts` | 首轮 1 例 strict mode violation：`getByText` 命中多个 `.ci-last` |

## 2. Green：最小实现

| 改动 | 落点 | 说明 |
|---|---|---|
| 契约升版 | `openapi.yaml`、`OpenApiTest` | 0.9.0：`TripPlan` / `TripDetail` / `TripCreateRequest` 增集合字段，`ApplicationStatus` 增 `left`，新增集合更新端点与 `TripMeetingRequest` |
| 迁移 | `V13__add_meeting_time.sql` | `trip_plans.meeting_time VARCHAR(16)` 可空 |
| 退出语义 | `ApplicationStatusEnum`、`TripApplication`、`ApplicationServiceImpl#leave` | 置 `LEFT` 并 `removeCompanion`（joined 退一） |
| 聊天准入 | `ApplicationServiceImpl#isChatPartner`、`ChatServiceImpl#requireAccess` | 发布者，或申请为 `ACCEPTED` / `LEFT`；其余 403 并说明 |
| 会话列表 | `pojo/ChatCounterpart`、`ApplicationService#chatCounterparts`、`ChatServiceImpl#partners` | 合并消息历史与已匹配配对，`THREAD_ORDER` 稳定排序（有消息在前、倒序、无消息末尾） |
| 集合链路 | `TripMeetingRules`、`TripMeetingRequest`、`TripPlan#withMeetingInfo`、各响应体、`TripPlanServiceImpl#updateMeeting`、`TripController` | 403 非发布者、409 已结束、400 格式 / 越界；整体替换、重复提交幂等 |
| 前端聊天页 | `chat/ChatPage`、`ChatList`、`ChatMain`、`chatPolling`、`styles.css` | 两栏、3 秒短轮询、进入加载、手动刷新、Enter / Shift+Enter、已结束只读、空态与拒绝说明 |
| 前端集合展示 | `TripDetailPage`、`TripCreatePage`、`MyTripsPage`、`chatMeeting`、`meetingForm` | 发布填写、详情 facts、发布者编辑弹窗、我的旅行已匹配备注、未填提示 |
| 状态统一 | `trips/applicationStatus.ts` | 三处本地 `applicationLabel` 副本合并，新增「已退出」 |

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B test
[INFO] Tests run: 220, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

$ cd RouteME/backend; .\mvnw.cmd test -Dtest=OpenApiTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

$ cd RouteME; npx @redocly/cli lint openapi.yaml
Woohoo! Your API description is valid. 15 warnings（与改动前基线相同）

$ cd RouteME/frontend; npm run build
dist/assets/index-usBzsKJE.js 1,018.25 kB │ gzip: 324.37 kB
✓ built in 3.26s

$ cd RouteME/frontend; npm test
 Test Files  21 passed (21)
      Tests  146 passed (146)

$ cd RouteME/e2e; npx playwright test
  50 passed (2.1m)

$ cd ai4se-baseline; npx @fission-ai/openspec validate refine-trip-chat --strict
Change 'refine-trip-chat' is valid
```

## 4. 场景对照（用户四条要求 → 证据）

| 要求 | 证据 |
|---|---|
| 刷新或重进后历史仍在、升序、带发送时间 | E2E `lists conversations, keeps history readable…`：两条消息 `bubbles.nth(0/1)` 顺序、`.msg-time` 计数 2、`page.reload()` 后仍 2 条；`chatTime.test.ts` 覆盖今天 / 昨天 / 跨年格式 |
| 非匹配用户（含仅 PENDING）被拒并说明 | E2E `keeps companion entry points honest`：`#/chat/3/2` 出现「只有已匹配的同行者可以沟通。」与「仅待处理的申请还不能聊天」；后端 `requireAccess` 403 + 前端拒绝分支 |
| 手动刷新或短轮询；无 WebSocket / 已读 / 推送 / 图片 | E2E `polls new messages without manual refresh`（3 秒内可见）与「刷新消息」按钮；`expect(page.locator('[type="file"]')).toHaveCount(0)`、无「全部接受 / 标记已读 / 开启推送」 |
| ACCEPTED → 进聊天 → 发送落库、重进仍可见 | E2E 全流程用例：申请 → 接受 → 发送两条 → `reload` 后仍在 → 退出后仍可聊；后端 `chat_messages` 落库由 `ChatControllerTest` 覆盖 |

## 5. 数据卫生

E2E 首轮有 2 个既有用例失败，归因为 dev 库累积数据（27 条行程、21 个账号；测试账号对种子 trip 3 的已接受申请把人数改为 2/3）。经用户确认按 `20261116-111241-local-verify-report.md` 先例处置：

- 备份 `Sqlite/routeme-dev-backup-20261116-1610.db`；
- 删除测试产物（行程 / 申请 / 消息 / 体验 / 举报 / 会话 / 账号），保留 7 条种子行程、7 条申请、4 条消息、2 条体验、4 个演示账号；
- 发现并校准 `trip_plans.joined_count` 持久化列（删申请不会回滚人数），按迁移种子原值重置为 2/3/1/2/1/2/1；
- 复跑全量 E2E 50/50 通过。

## 6. 残余项

| 项 | Owner | 处理时机 |
|---|---|---|
| E2E 数据污染无自动清理（每轮全量会再累积） | AO | 另立 change（独立测试库或 afterEach 清理） |
| 前端单包 1,018 kB chunk 体积 warning | AO | 后续性能 change |
| `spec-review-3.md` 的 AO 批准签名 | AO（Jay） | G2 前补签 |
| 归档前 SA 追认双 capability 与退出语义冲突裁决 | SA（Jacky）+ IO（Wanye） | P5 / G3 前 |

## 7. 结论

五层验证（后端 220 / 契约 7 + lint / 前端 146 + build / E2E 50 / 规格 strict）全部通过，无回归；用户四条要求均有可执行证据。**建议 G2 Pass**，待 VL（Neal）签署。

## 合并 origin/main 后的复验（2026-11-16 17:22）

- 两个 merge commit：`1d1140f`（52 commits，REQ 顺延 REQ-013、契约 0.9.0→0.10.0、迁移 V13→V14）、`2f6a74b`（588ef9e，采用登录门/账号菜单，迁移顺延 V16）。
- 证据：后端 `mvnw.cmd -B test` → 242 tests 0 失败；前端 `npm test` → 23 files / 169 tests；`npm run build` Pass；`npx @redocly/cli lint openapi.yaml` → valid，15 warnings；E2E 关键 13 例（`companions.spec.ts` 11 + `chat-entry.spec.ts` 1 + `trips.spec.ts -g meeting` 2）全绿。
- 全量 E2E 59 例在合并前基线通过；合并后只重跑受影响与新增用例（页面仅登录门/首页样式变化，后端仅迁移编号变化）。
- dev 库按 V1–V16 全量重建（16 migrations applied）。
