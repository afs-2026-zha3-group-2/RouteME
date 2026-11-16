# ATDD 设计 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）
- **输入：** `specs/trip-companions/spec.md`（3 Requirement / 21 Scenario）、`specs/trip-plans/spec.md`（3 Requirement / 22 Scenario）、REQ-010 §4（25 场景）
- **输出口径：** 每个验收场景 → 至少一层可执行验证（API / 前端 UT / E2E）；API 回归门禁覆盖权限与校验；不引入设计外的测试框架（沿用 `@rule:java-testing`、`@rule:web-testing`）

## 1. 分层策略

| 层 | 工具与落点 | 覆盖重点 |
|---|---|---|
| API（后端） | `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")`，`backend/src/test/java/routeme/controller/` | 聊天准入、LEFT 语义、「会话列表补齐」、集合时间校验、集合更新权限与状态 |
| 领域 UT（后端） | 纯 JUnit，`backend/src/test/java/routeme/` | 集合时间区间判定、时间解析、`LEFT` 不改变 matched/joined 口径 |
| 前端 UT | Vitest，`frontend/src/chat/*.test.ts`、`frontend/src/trips/*.test.ts` | 时间格式、Enter/Shift+Enter 判定、表单校验、我的旅行备注拼接 |
| E2E | Playwright，`e2e/tests/companions.spec.ts`（扩）、`e2e/tests/trips.spec.ts`（扩） | 发送→重进→可见、未匹配被拒、退出后仍可聊、集合编辑生效 |
| 契约 | `npm run lint:api`（Redocly） | 新字段、新端点、枚举与示例 |

## 2. 场景 → 验证映射（REQ-010 25/25）

| # | 场景摘要 | API | UT | E2E |
|---|---|---|---|---|
| 1 | 左栏列出全部可沟通会话（含无消息） | A1 | — | E2E-1 |
| 2 | 打开指定会话并选中 | A1 | — | E2E-1 |
| 3 | 无任何可沟通会话空态 | A1 | — | E2E-2 |
| 4 | 未匹配用户直接访问被拒 | A2 | — | E2E-3 |
| 5 | 仅 PENDING 被拒 | A2 | — | E2E-3 |
| 6 | 被拒 / 取消 / 从未申请被拒 | A2 | — | — |
| 7 | 发送消息并落库 | A3 | — | E2E-4 |
| 8 | 重新进入仍可见且升序 | A4 | — | E2E-4 |
| 9 | 短轮询 3 秒内可见 | — | UT-1（轮询间隔常量与启停） | E2E-5 |
| 10 | 手动刷新 | — | UT-1 | E2E-5 |
| 11 | 空白 / 超长被拒 | A5 | UT-2 | E2E-6 |
| 12 | Enter / Shift+Enter | — | UT-2 | E2E-6 |
| 13 | 已结束只读 | A6 | — | E2E-7 |
| 14 | 头部动作按身份与状态 | — | UT-3 | E2E-7 |
| 15 | 退出后仍可沟通 | A7 | UT-4（matched 口径与标签） | E2E-8 |
| 16 | 无实时与富媒体 | — | — | E2E-9 |
| 17 | 发布时填写集合信息 | A8 | UT-5 | E2E-10 |
| 18 | 集合时间晚于结束日期被拒 | A8 | UT-5 | E2E-10 |
| 19 | 集合信息格式非法被拒 | A8 | UT-5 | — |
| 20 | 详情展示集合信息（空值待确认） | A9 | UT-6 | E2E-11 |
| 21 | 聊天安全条展示集合信息 | A9 | UT-6 | E2E-11 |
| 22 | 我的旅行展示集合信息 | A9 | UT-6 | E2E-12 |
| 23 | 发布者编辑集合信息 | A10 | UT-7 | E2E-13 |
| 24 | 已结束不可编辑 | A10 | — | E2E-13 |
| 25 | 非发布者不可编辑 | A10 | — | — |

## 3. API 用例清单

| ID | 用例 | 断言要点 |
|---|---|---|
| A1 | `GET /api/me/chat-partners` | 含「已接受但无消息」的配对；无消息 `lastMessage=null`；按最近消息倒序、无消息排末尾；发布者与同行者两种视角各一条 |
| A2 | `GET /api/trips/{id}/messages?withUserId=` | PENDING / REJECTED / CANCELLED / 从未申请均 403 `CHAT_NOT_ALLOWED`；不返回消息体 |
| A3 | `POST /api/trips/{id}/messages` | 201/200 返回消息含 `sent_at`；落库后可查询 |
| A4 | `GET /api/trips/{id}/messages` | 升序；`sent_at` 非空；多轮发送顺序稳定 |
| A5 | `POST /api/trips/{id}/messages` | 空白 400 `INVALID_INPUT`；501 字 400；500 字通过 |
| A6 | COMPLETED 行程读写 | 读成功、写 409 `CHAT_READ_ONLY` |
| A7 | leave 后聊天 | `POST /leave` 后申请状态 `left`；双方仍可读写；`GET /me/trips` matched 不含该行程；`GET /me/trips` applied 含 `left` 记录；`GET /api/users/{id}/profile` 的 `joined` 减少一（只计 accepted） |
| A8 | `POST /api/trips` 与 `PUT /api/trips/{id}/meeting` 的集合校验 | 时间晚于 end_date → 400 `INVALID_INPUT`；格式非法 → 400；区域 101 字 → 400；空值保存成功 |
| A9 | `GET /api/trips/{id}` 与 `GET /api/me/trips` | 响应含 `meeting_time`（可为 null）；summary 含 `meeting_time` 与 `joined_count` |
| A10 | `PUT /api/trips/{id}/meeting` | 发布者 + RECRUITING/FULL 成功；COMPLETED → 409 `TRIP_NOT_OPEN`；非发布者 → 403 `FORBIDDEN`；只改两个字段（其它字段不变） |

## 4. 前端 UT 清单

| ID | 文件 | 断言 |
|---|---|---|
| UT-1 | `chat/chatPolling.test.ts` | 轮询间隔 3000ms；COMPLETED 时不启动；卸载时清理 |
| UT-2 | `chat/chatComposer.test.ts` | `shouldSendOnEnter(e)`：Enter 且非 Shift、非输入法组字 → true；Shift+Enter / 组字中 → false；空白与 >500 字拦截 |
| UT-3 | `chat/chatActions.test.ts` | 头部动作可见性：发布者无「退出同行」；同行者且未结束有；COMPLETED 无；已退出（LEFT，不在 `participants` 中）无 |
| UT-4 | `trips/applicationStatus.test.ts` | `left` → 「已退出」；matched 分区不含 `left`；joined 只计 `accepted` |
| UT-5 | `trips/tripForm.test.ts` | 集合时间格式与「不晚于结束日期」校验；空值通过 |
| UT-6 | `chat/chatMeeting.test.ts` | 集合区域/时间空值文案「待确认」；我的旅行备注拼接 |
| UT-7 | `trips/meetingForm.test.ts` | 编辑弹窗两字段校验与提交载荷 |

## 5. E2E 用例清单（`e2e/tests/companions.spec.ts` 扩、`trips.spec.ts` 扩）

| ID | 用例 | 前置 |
|---|---|---|
| E2E-1 | 打开聊天页 → 左栏列出两个会话，其中一个是无消息配对 | 干净库 + 种子数据 |
| E2E-2 | 无匹配用户进入聊天 → 空态 + 去发现入口 | 新身份（无申请） |
| E2E-3 | 仅 PENDING 用户直接访问会话 URL → 拒绝说明 | 提交申请不处理 |
| E2E-4 | 发送消息 → 刷新页面 → 消息仍在且时间可见、顺序正确 | 已接受申请 |
| E2E-5 | 发送后另一个浏览器上下文在 3 秒内看到；点「刷新消息」立即出现 | 双上下文 |
| E2E-6 | 空白消息按钮不可发送；Enter 发送、Shift+Enter 换行 | 已匹配 |
| E2E-7 | COMPLETED 行程：输入区消失，出现只读提示；无「退出同行」 | 已结束行程 |
| E2E-8 | 退出同行 → 左栏仍有该会话、可继续发消息；我的旅行已匹配不含该行程、我申请的显示「已退出」 | 已接受申请 |
| E2E-9 | 会话页不存在图片/文件上传入口、已读状态、在线状态 | 已匹配 |
| E2E-10 | 发布时填集合时间 → 详情展示；填晚于结束日期 → 拒绝提示 | 发布页 |
| E2E-11 | 详情与聊天安全条显示集合区域与集合时间；清空后显示「待确认」 | 发布者 |
| E2E-12 | 我的旅行·已匹配显示「集合：… · 同行 N 人」 | 已匹配 |
| E2E-13 | 发布者编辑集合信息 → 三处生效；已结束行程无编辑入口 | 发布者 |

## 6. 夹具与门禁

- **夹具：** 复用 `e2e` 现有种子账号与行程；为「无消息配对」新增一次接受操作（发布者在申请页接受后不发消息）。不使用 mock 数据替代真实接口。
- **API 回归门禁：** A1–A10 全绿是 P4 通过的必要条件；任一红即 P4 不通过。
- **NFR：** 3 秒轮询只断言「周期内可见」，不断言实时性；不做性能压测（MVP 范围外）。
- **契约门禁：** `npm run lint:api` 0 error。

## 7. TDD 顺序（Red → Green → Refactor）

1. A2 / A7（权限与 LEFT）→ 后端最小实现。
2. A1（会话列表补齐）→ 后端组合查询 + 单测。
3. A8 / A9 / A10（集合字段与更新）→ 契约 + 迁移 + 服务。
4. UT-1～UT-7 与前端实现交替。
5. E2E-1～E2E-13 最后补齐，逐条红→绿。
