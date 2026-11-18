# ATDD 设计：add-realtime-notifications

- **Change：** `add-realtime-notifications`（`notifications` ADDED，REQ-031）
- **输入：** Delta Spec（8 Requirement / 36 Scenario）、`design.md`、`stories/add-realtime-notifications.story.md`
- **分层：** 后端纯函数（U）/ 后端服务、钩子与接口（S / H / B）/ 前端纯函数（F）/ E2E（M / N）/ 人工走查（V）

## 1. 场景 → 层映射

| # | Scenario（Delta） | 层 | 验收点 |
|---|---|---|---|
| S32-1 | 八类与两态 | U / S / B | 类型 ∈ 八类；状态与 `read_at` 一致 |
| S32-2 | 字段完整 | S / B / F | 标题、正文、优先级、目标、`related_available` 齐全 |
| S32-3 | 同一事件只一行 | S / M | 重复触发后行数不变、计数不变 |
| S32-4 | 只增不删 | S / M | 取消 / 完成 / 处理完成 / 标读后行仍在、正文不变 |
| S32-5 | 行程满员 | S / H / M2 | 容量 2 时同行者 1 条 `trip_full`；发布者无 |
| S32-6 | 行程开始与安全提醒 | S / H / B | 每位参与者各 1 条 `trip_ongoing` + 1 条 `safety_reminder`；重复读取不变 |
| S32-7 | 行程取消 | S / H | 同行者 1 条 `trip_cancelled`，正文含原因 |
| S32-8 | 行程结束 | S / H | 同行者 1 条 `trip_completed`，目标为行程 |
| S32-9 | 申请到达 | S / H / B / M1 | 发布者 1 条；目标为 `applications` |
| S32-10 | 申请通过 | S / H / M2 | 申请者 1 条；目标为 `trip` |
| S32-11 | 申请被拒 | S / H / M2 | 申请者 1 条；正文不含内部理由码 |
| S32-12 | 申请关闭 | S / H / N1 | 申请者 1 条 `application_closed`，含取消原因 |
| S32-13 | 聊天消息 | S / H / M3 / M4 | 接收方 1 条；自消息 0 条 |
| S32-14 | 信用变动 | U / S / N1 | 正文含变化量 / 原因 / 分数；< 60 → `HIGH` |
| S32-15 | 信用恢复 | U / S / N1 | `credit_recovered` + `HIGH` |
| S32-16 | 举报全流程 | S / B / N1 / N2 | 三段通知；正文含编号与结论 |
| S32-17 | 账号状态 | U / S / N1 | 三态各 1 条；含受限内容与恢复时间；无管理员备注 |
| S32-18 | 客服会话 | S / N1 | 三段通知；目标为 `support` |
| S32-19 | 系统安全提醒 | S / H / N1 | 1 条 `safety_reminder`；目标为行程 |
| S32-20 | 身份认证 | S / H / N1 | 首次完整 1 条；重复补全不重复 |
| S32-21 | 行程类跳转 | F / N2 | `notificationHref` → `#/trips/{id}` |
| S32-22 | 申请类跳转 | F / N2 | `applications` → 处理页；其余 → 行程 |
| S32-23 | 其它类型跳转 | F / N2 | 六类目标逐一命中 |
| S32-24 | 目标不可用 | S / F / N3 | `related_available=false`；提示、不跳转、仍标读 |
| S32-25 | 八类计数 | S / B / F / N1 | `total` = 八项和；零值键存在 |
| S32-26 | 徽标口径 | F / M1 / M3 / M4 / M10 | 通知入口 = total；侧栏四入口按功能分摊且和为 total；聊天入口 / 会话行 = `CHAT` |
| S32-27 | 读一条 | S / B / F / M5 / N1 | 总数与所属类型各 −1 |
| S32-28 | 全部已读 | S / B / F / M5 / N1 | 全部归零，徽标消失 |
| S32-29 | 幂等 | S / B / F / M5 | 重复标读计数不变 |
| S32-30 | 按用户隔离 | S / B | 他人计数不变；越权 404 |
| S32-31 | 会话范围 | S / B / F / M6 | 只清 `(trip_id, actor_id)`；其它不变 |
| S32-32 | 计数不回弹 | F / M5 / M7 | 刷新与在途快照都不复活已读 |
| S32-33 | 三秒内只推收件人 | S / M1 / M9 | 3 秒内只到收件人 |
| S32-34 | 重连对账 | F / M7 / V3 | 断连期间事件在重连后收敛，不重复 |
| S32-35 | 通道失败可控 | S / M / V3 | 业务可用、计数保留、无阻塞弹窗 |
| S32-36 | 失败隔离 | S / H | 八类生产方在通知抛错时仍成功 |

- **编号口径：** 表中 `S32-x` 使用 `requirements/REQ-031-realtime-notifications.md` §4 的编号，与 Delta Spec 的场景标题一一对应。
- **覆盖率：** 36/36；没有只靠人工走查兜底的场景（窄屏、焦点、断网、多标签页同时有自动化或 E2E 断言）。

## 2. Red / Green 切片顺序

一个切片只推进一组场景；每个 Red 必须先运行并记录「因未实现而失败」，Green 后跑全量回归。

| 切片 | Red 测试（先写） | 预期失败原因 | Green 最小实现 |
|---|---|---|---|
| D1 | `OpenApiTest.in_openApiFile_out_notificationContractDeclared` | 路径 / schema / 版本不存在 | `openapi.yaml` → 0.27.0，补 4 路径、`/reports/mine` 与 schema；两处版本断言同步 |
| D2 | `NotificationMigrationSqliteTest` | `notifications` 表不存在 | `V32__add_notifications.sql` + `NotificationEntity` / `NotificationMapper` |
| D3 | `NotificationTextUtilsTest`、`NotificationTypeEnumTest` | 枚举与文案类不存在 | 5 个枚举 + `NotificationTextUtils`（22 段文案 + 回退） |
| D4 | `NotificationServiceTest`（写入 / 去重 / 自事件抑制） | 表存在但服务不存在 | `NotificationService.write`：自事件抑制 → 先查去重 → 插入 → 冲突兜底 |
| D5 | `NotificationServiceTest`（计数 / 列表 / 标读） | 计数与标读端点缺失 | `counts`（八类零填充）、`list`（50 条）、三种标读 |
| D6 | `NotificationControllerTest` | 4 条路径不存在 | 控制器 + `NotificationReadRequest`；404 / 400 / 401 |
| D7 | `NotificationHookTest`（申请 / 裁决 / 满员） | 申请后无通知 | `ApplicationServiceImpl` 钩子 + 容量判定 |
| D8 | `NotificationProducerTest` | 其它域无通知 | 行程事件监听、聊天、信用、举报、账号、客服、资料、`TripController` 惰性物化 |
| D9 | `NotificationFailureIsolationTest` | 通知抛错使业务失败 | `write()` 内部 `try/catch` + `log.warn`；生产者无 try/catch |
| D10 | `NotificationStreamServiceTest` | 流服务不存在 | 注册表、多连接、心跳、失败清理 |
| D11 | `notificationModel.test.ts` | 纯函数不存在 | `notificationModel.ts` 全部导出 |
| D12 | `utils/chatTime.test.ts`（迁移自 `chat/chatTime.test.ts`） | 迁移后 import 失效则该文件无法收集，等同 Red | `formatChatTime` 移到叶子 `frontend/src/utils/chatTime.ts`，改 4 处 import；4 条断言一字不改 |
| D13 | `AppShell` 渲染 + `notifications.spec.ts` M1–M10 | 铃铛 / 面板 / 徽标不存在 | Provider、Bell、Panel、Badge、Shell 挂载、聊天整合 |
| D14 | `notifications.spec.ts` N1–N3 | 通知中心 / 类型跳转 / 不可用提示缺失 | `NotificationCenterPage`、信用记录页、举报详情页、`/reports/mine` |
| D15 | `notifications-walkthrough.spec.ts` V1–V4 | 焦点 / 断网 / 多标签页未验证 | 面板焦点管理、通道降级、多 emitter 支持 |

## 3. 后端纯函数（U）

| id | 对象 | 用例 |
|---|---|---|
| U1 | `NotificationTextUtils` | 22 个事件各产出预期的标题与正文；昵称、行程标题、原因、分数、恢复时间原样嵌入 |
| U2 | 同上 | 未知 / 缺省原因码 → 通用标签，不抛异常 |
| U3 | 同上 | 账号暂停 / 封禁文案只含结构化事实，不含管理员备注 |
| U4 | `NotificationTypeEnum` | 八个 wire 值固定；`fromWire` 未知值抛异常 |
| U5 | `NotificationEventEnum` | 22 个事件值固定，且各自携带正确的类型 |
| U6 | `NotificationEntity` | `Instant` ↔ 字符串往返一致；可空关联列与 `read_at` 保持 null |

## 4. 后端服务、钩子与接口（S / H / B）

### 4.1 服务用例（相对计数，不依赖种子行号）

| id | 用例 |
|---|---|
| S1 | 写入一条通知 → 列表可见，`status=UNREAD`，计数按类型 +1 |
| S2 | 同一 `(recipient, dedupeKey)` 写两次 → 只有 1 行，计数只 +1 |
| S3 | `actorId == recipientId` → 0 行，计数不变 |
| S4 | 计数响应恒含八个键，未使用类型为 0；`total` = 各项和 |
| S5 | 读一条 → 总数与所属类型各 −1；再次读同一 id 不变 |
| S6 | 全部已读 → 全部归零，列表全部 `READ` |
| S7 | 两会话各有未读 + 其它类型未读 → 打开一个会话只清该会话 |
| S8 | A 标读后 B 的计数不变；A 读 B 的通知 id → 404 |
| S9 | 制造 51 条通知 → 列表 50 条，`created_at DESC, id DESC` |
| S10 | 目标解析：八类分别得到 `trip` / `applications` / `chat` / `credit` / `report` / `account` / `support` / `identity` |
| S11 | `related_available`：行程被删 / 举报不存在 / 会话不属于本人 → false；信用 / 账号 → true |

### 4.2 钩子（H）

| id | 用例 |
|---|---|
| H1 | 申请成功 → 发布者 1 条 `application_received`，带申请与行程 |
| H2 | 接受 → 申请者 1 条 `application_accepted`；拒绝 → 1 条 `application_rejected` |
| H3 | 容量 2 接受后 → 同行者 1 条 `trip_full`；发布者 0 条（自事件抑制） |
| H4 | 行程取消 → 同行者 `trip_cancelled`；待处理申请者 `application_closed` |
| H5 | 行程完成 → 同行者 `trip_completed`；待处理申请被关闭且不产生完成通知 |
| H6 | 读取 ONGOING 详情 → 每位参与者 `trip_ongoing` + `safety_reminder`；再次读取行数不变 |
| H7 | 发消息 → 接收方 1 条 `message`；自消息 0 条 |
| H8 | 信用变动 → `credit_changed`（< 60 为 `HIGH`）；安全学习恢复 → `credit_recovered`（`HIGH`） |
| H9 | 举报提交 / 处理中 / 完成 → 举报人三段通知，正文含编号与结论 |
| H10 | 暂停 / 封禁 / 恢复 → 本人对应通知；封禁正文含原因标签与恢复时间 |
| H11 | 客服接入 / 回复 / 结束 → 三段 `SERVICE` 通知 |
| H12 | 资料首次完整 → 1 条 `identity_verified`；再次补全不重复 |

### 4.3 接口与契约（MockMvc）

| id | 用例 |
|---|---|
| B1 | `GET /notifications` → 200，`items` 最多 50，`counts.by_type` 八键齐备；缺 `X-User-Id` → 401 |
| B2 | `POST /notifications/{id}/read` → 200 + 最新 counts；不存在 / 他人 → 404；重复 → 计数不变 |
| B3 | `POST /notifications/read` `{scope:"all"}` → total 0 |
| B4 | `POST /notifications/read` `{scope:"conversation",trip_id,other_user_id}` → 只清该会话 |
| B5 | `scope` 非法 / 缺定位 → 400 `INVALID_INPUT` |
| B6 | `GET /notifications/stream?user_id=` → `asyncStarted`，响应头 `text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`；缺 `user_id` → 401 |
| B7 | `OpenApiTest`：0.27.0、4 条通知路径、`/reports/mine`、schema 必需字段、`NotificationList.items.maxItems=50`、八类 / 22 事件 / 8 目标枚举 |
| B8 | `ReportControllerTest`：`GET /reports/mine` 只返回本人举报，含编号与状态 |
| B9 | `NotificationMigrationSqliteTest`：SQLite 执行 `V30` → 表与两个索引存在；插入、按收件人查询、标读更新可用 |

## 5. 前端纯函数（F）

| id | 对象 | 用例 |
|---|---|---|
| F1 | `applySnapshot` | 按 id 合并；重复不重复；超 50 截断；计数逐项取较大值；本地已读不被旧快照改回未读；早于 `lastReadSeq` 的快照只合并条目 |
| F2 | `applyEvent` | 新 id 入队首；同 id 第二次不改变状态；活动会话的消息 `read` 且不计入 `CHAT` |
| F3 | `markOneLocal` / `markAllLocal` / `markConversationLocal` | 各自减到正确值；重复调用不变；会话只影响匹配条目 |
| F4 | `unreadByConversation` | 两个会话分别计数；非 `CHAT` 不计入；已读不计入 |
| F5 | `notificationHref` | 八个 `kind` 各自命中；缺 `viewerId` 的 `account` 回退资料页；未知 `kind` 回通知中心 |
| F6 | `notificationAvailable` | `related_available=false` → false；缺省 / true → true |
| F7 | `shouldToast` | 非 `CHAT` 恒真；`CHAT` 在匹配会话打开时为假，其它会话为真 |
| F8 | `badgeLabel` / `typeCount` / `emptyCounts` | 0 → `''`；12 → `'12'`；未知类型 0；八类全 0 且互不共享 |
| F9 | 类型守卫 | 未知 `type` 的条目不让筛选 / 分组 / 跳转抛错 |

## 6. E2E（M / N）

测试数据全部通过 API 现场创建，使用多个独立浏览器上下文（发布者、同行者、举报人等），避免依赖种子行号。

| id | 场景 | 步骤与断言 |
|---|---|---|
| M1 | 申请到达（S32-9 / S32-33） | A 停在首页；B 申请 → ≤3 s 内 A 的 `notification-badge` 变 1；面板出现申请条目 |
| M2 | 接受 / 拒绝（S32-10、S32-11、S32-5） | A 接受 B → B 条目为通过；换人拒绝 → 条目为拒绝；容量满时同行者另有满员条目 |
| M3 | 消息到非聊天页（S32-13、S32-26） | B 发消息；A 在地图页 → `rail-chat-badge` / `tab-chat-badge` = 1，提示条出现；打开会话后该会话归零 |
| M4 | 计数拆分（S32-25、S32-26） | 2 条申请 + 3 条消息 → `GET /notifications` 返回 total 5、`APPLICATION`=2、`CHAT`=3；铃铛 5、「我的旅行」2、「同行消息」3，侧栏四入口之和 = 5 |
| M5 | 读一条 / 全部 / 幂等 / 不回弹（S32-27 ～ S32-29、S32-32） | 点一条 → 总数 −1；重复标读不变；全部已读 → 0 且徽标消失；紧接着刷新计数不回弹 |
| M6 | 会话范围（S32-31） | A 与 B、C 各一个会话；打开 B 的会话 → B 归零，C 与其它类型不变 |
| M7 | 刷新与重连（S32-32、S32-34） | 有未读时刷新 → 计数不变；`page.reload()` 后无重复条目 |
| M8 | 当前会话即时与提示抑制（S32-13、S32-35） | A 打开 B 的会话；B 发消息 → 消息即刻出现、会话徽标 0、提示条不增加 |
| M9 | 3 秒口径（S32-33） | 记录生产请求返回时刻，`toHaveText('1', { timeout: 3000 })` |
| M10 | 窄屏（S32-26） | 390 px 下 `tab-chat-badge` 与侧栏聊天入口同数；侧栏四入口之和 = 铃铛；铃铛可点开；无横向滚动 |
| N1 | 通知中心（S32-1、S32-14 ～ S32-20、S32-25、S32-27、S32-28） | 八类筛选带数字；逐类可筛；重要标记与未读文字可见；全部已读归零 |
| N2 | 类型跳转（S32-21 ～ S32-23） | 行程 → 详情；申请 → 处理页 / 行程；举报 → 举报详情；各类型目标逐一命中 |
| N3 | 目标不可用（S32-24） | 目标删除后条目保留正文、提示「相关内容当前不可查看」、URL 不变、条目转为已读 |

## 7. 人工走查（V）

| id | 内容 |
|---|---|
| V1 | 1440 / 768 / 390 px 浅色：徽标、面板、通知中心、未读文字可读且不溢出；产出 3 张截图 |
| V2 | 打开面板时新事件只更新列表，不移动焦点；Escape 关闭并把焦点还给铃铛 |
| V3 | 停掉后端：计数保留、无阻塞弹窗；恢复后自动重连并对账，无重复条目 |
| V4 | 两个标签页同一用户：两边都收到同一通知，计数一致（多 emitter） |

## 8. 测试夹具与边界数据

| 夹具 | 用途 | 说明 |
|---|---|---|
| 新建行程 + 多名申请者 | 申请 / 裁决 / 满员 / 会话 | 通过 `POST /trips`、`POST /trips/{id}/applications`、`POST /applications/{id}/accept` 创建 |
| 容量 2 的行程 | `trip_full` 与自事件抑制 | 接受唯一同行者即满员；断言发布者 0 条、同行者 1 条 |
| 今日出发的行程 | ONGOING 与安全提醒 | 状态由时间推导，读取详情触发惰性物化 |
| 未读组合 total 5 / 2 / 3 | 计数拆分 | 2 条 `application_received` + 3 条 `message`，不夹带其它未读 |
| 51 条通知 | 列表上限 | 服务层循环写入，断言 50 条与排序 |
| 两会话 | 会话标读 | B、C 各被接受并各发 1 条消息 |
| 自消息 | 聊天守卫 | 准入层允许自消息；服务层直接调用 `notifyMessage(A, A, …)` 断言 0 行 |
| 通知写入失败 | S32-36 / S32-35 | `@Primary` 桩服务抛错；不修改生产代码 |
| 已满 / 已关闭行程 | S32-12 | 用服务层构造状态，断言 0 行；不新增接口 |
| 举报 + 删除目标 | S32-24 / N3 | 提交举报后由管理员删除关联行程，断言提示与不跳转 |
| 账号三态 | S32-17 | 管理端 API 执行 SUSPEND / BAN / RESTORE，断言本人通知 |

## 9. 追溯矩阵

| Requirement | 服务 / 接口用例 | 前端用例 | E2E |
|---|---|---|---|
| 通知记录、类型与生命周期 | S1–S4、B1、B7、B9 | F1、F8、F9 | M7、N1 |
| 行程生命周期事件 | H3–H6、S2 | F1 | M2、M7 |
| 申请与裁决事件 | H1、H2、H4、B1、B2 | F2、F5 | M1、M2、N2 |
| 聊天、信用、举报与账号事件 | H7–H10、S2 | F2、F3、F4 | M3、M8、N1、N2 |
| 客服与系统事件 | H11、H12、H6 | F2、F5 | N1、N2 |
| 通知中心与跳转 | S10、S11、B1 | F5、F6 | N1、N2、N3 |
| 未读计数与标读规则 | S4–S9、B1–B5 | F1–F4、F8 | M4–M7、M10、N1 |
| 实时投递与失败隔离 | S1、H 全体、B6 | F1、F7 | M1、M3、M7–M9、V3、V4 |

- **无悬空场景：** 36 条场景均有至少一个自动化层；V1–V4 只补充视觉、焦点、断网与多标签页，不承担功能判定。