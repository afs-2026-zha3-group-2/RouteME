# ATDD 设计：add-realtime-notifications

- **Change：** `add-realtime-notifications`（`notifications` ADDED，REQ-023）
- **输入：** Delta Spec（6 Requirement / 26 Scenario）、`design.md`、`stories/add-realtime-notifications.story.md`
- **分层：** 后端纯函数（U）/ 后端服务与接口（S / B）/ 前端纯函数（F）/ E2E（M）/ 人工走查（V）

## 1. 场景 → 层映射

| # | Scenario（Delta） | 层 | 验收点 |
|---|---|---|---|
| S23-1 | 申请到达时为发布者创建一条通知 | S / B / M | 发布者未读 +1；行带动作人、行程、申请；铃铛 +1 |
| S23-2 | 接受时为申请者创建一条通知 | S / B / M | 申请者 1 条 `application_accepted`；动作人为发布者 |
| S23-3 | 拒绝时为申请者创建一条通知 | S / B / M | 申请者 1 条 `application_rejected`；计入总数 |
| S23-4 | 被既有规则拒绝的请求不产生通知 | S / B | 重复 / 非 pending / 未开放 / 已满 → 0 行、计数不变 |
| S23-5 | 自己给自己发消息不产生通知 | S / U | 直接调用写入守卫 + 准入拒绝两条路径均为 0 行 |
| S23-6 | 每条消息一条通知 | S / B / M | 每条消息恰好 1 行；带 `message_id` 与会话定位 |
| S23-7 | 刷新或重连后计数不变 | B / M | 重新 `GET /notifications` 得到同一计数 |
| S23-8 | 计数按类型拆分 | B / M | 2 条申请 + 3 条消息 → 5 / 2 / 3 |
| S23-9 | 列表按时间倒序且最多 50 条 | B | 51 条 → 返回 50，首条最新 |
| S23-10 | 列表条目上下文完整 | B / F | 动作人、行程 id / 标题、文案、时间、已读位齐全 |
| S23-11 | 只推送给收件人 | S / M | A 的通道收到，B 的通道不收到 |
| S23-12 | 通知在 3 秒内到达已连接的收件人 | M | T0 → T1 ≤ 3000 ms |
| S23-13 | 重连对账不丢不重 | M / F | 断连期间产生通知，重连后计数一致且无重复条目 |
| S23-14 | 空闲连接由心跳保持并在断开后释放 | S | 心跳不抛；complete / 失败后连接被移除 |
| S23-15 | 推送通道失败不影响其它功能 | S / M | 通道失败时业务仍成功；计数保留、无阻塞弹窗 |
| S23-16 | 读一条只减一 | S / B / M | 总数恰好 −1；重复读不变 |
| S23-17 | 全部已读归零 | S / B / M | 总数 0；列表全部已读 |
| S23-18 | 打开会话只清该会话的消息 | S / B / M | 只清 `(trip_id, actor_id)`；申请类与其它会话不变 |
| S23-19 | 重复标读不改变计数 | S / B / F | 第二次调用计数不变 |
| S23-20 | 标读按用户隔离 | S / B | A 标读后 B 的计数不变；单条越权 → 404 |
| S23-21 | 数字徽标随未读数出现与消失 | F / M | 0 不渲染；>0 显示数字；全部已读后消失 |
| S23-22 | 面板列出最新通知并可全部已读 | M | 条目含动作人 / 文案 / 时间 / 未读标记；按钮生效 |
| S23-23 | 激活通知直达目标并标读 | F / M | 申请类 → `#/trips/{id}`；消息类 → `#/chat/{trip}/{user}`；计数 −1 |
| S23-24 | 当前会话的消息即时出现且不累计未读 | F / M | 直接追加；该会话计数 0；申请类不变 |
| S23-25 | 窄屏下计数口径一致 | M / V | ≤900 px 的 tab 与侧栏同数；数字仍是文本 |
| S23-26 | 通知失败不回滚裁决 | S | 桩服务抛错时 `accept` 仍返回 accepted、`send` 仍成功；失败被记录 |

- **编号口径：** 表中的 `S23-x` 使用 `requirement-workspace/requirements/REQ-023-realtime-notifications.md` §4 的编号，**不是** Delta Spec 的行序（两者在 S23-5 / S23-26 上顺序不同）。

- **覆盖率：** 26/26；没有只靠人工走查兜底的场景（窄屏同时有 E2E 断言与走查）。

## 2. Red / Green 切片顺序

一个切片只推进一组场景；每个 Red 必须先运行并记录「因未实现而失败」，Green 后跑全量回归。

| 切片 | Red 测试（先写） | 预期失败原因 | Green 最小实现 |
|---|---|---|---|
| D1 | `OpenApiTest.in_openApiFile_out_notificationContractDeclared` | 路径 / schema / 版本不存在 | 改 `openapi.yaml` 到 0.18.0，补 4 路径与 schema；同步两处版本断言 |
| D2 | `NotificationMigrationTest` | `notifications` 表不存在 | `V30` + `NotificationEntity` / `NotificationMapper` |
| D3 | `NotificationTextUtilsTest` | 类不存在 | `NotificationTextUtils` + `NotificationTypeEnum` |
| D4 | `NotificationServiceTest.in_apply_out_publisherUnreadOne` | 申请后发布者计数为 0 | `NotificationService` 写入 + 计数；`ApplicationServiceImpl.apply` 钩子 |
| D5 | `NotificationServiceTest.in_acceptAndReject_out_applicantNotified` | 裁决后申请者计数为 0 | `decide` 钩子（接受 / 拒绝） |
| D6 | `NotificationServiceTest.in_sendMessage_out_receiverNotified` | 消息后接收方计数为 0 | `ChatServiceImpl.send` 钩子 + 自消息守卫 |
| D7 | `NotificationServiceTest.in_readScopes_out_countsFollowScope` | 标读端点缺失 / 计数不收敛 | 单条 / 全部 / 会话标读 + 控制器 |
| D8 | `NotificationFailureIsolationTest` | 通知抛错使裁决 / 发消息失败 | `notify*` 内部捕获；生产者无 try/catch |
| D9 | `NotificationStreamServiceTest` | 流服务不存在 | 注册表、发布、心跳、清理；流端点 |
| D10 | `notificationModel.test.ts` | 纯函数不存在 | 快照 / 事件 / 标读 / 分组 / 直达 / 提示 / 徽标 |
| D10b | `utils/chatTime.test.ts`（迁移自 `chat/chatTime.test.ts`） | 迁移后 import 失效则该文件无法收集，等同 Red | 把 `formatChatTime` 移到叶子 `frontend/src/utils/chatTime.ts`，改 4 处 import；4 条断言与输出**一字不改**，作为「迁移无行为变化」的守护（§10 R-10 / `no-circular-dependency`） |
| D11 | `AppShell` 渲染 + `notifications.spec.ts` 首条 | 铃铛 / 面板 / 徽标不存在 | Provider、Bell、Panel、Badge、Shell 挂载 |
| D12 | `notifications.spec.ts` 聊天与窄屏用例 | 会话徽标 / 追加 / 标读缺失 | ChatPage / ChatList 整合与样式 |

## 3. 后端纯函数（U）

| id | 对象 | 用例 |
|---|---|---|
| U1 | `NotificationTextUtils` | 四类 type → 四段中文；昵称与标题原样嵌入；标题含书名号不重复转义 |
| U2 | 同上 | 未知 type → 回退为「你有一条新通知」，不抛异常 |
| U3 | `NotificationTypeEnum` | 四个 wire 值固定为 `application_received` / `application_accepted` / `application_rejected` / `message` |
| U4 | `NotificationEntity.from` / `toNotification` | `Instant` ↔ 字符串往返一致；可空 `application_id` / `message_id` / `read_at` 保持 null |

## 4. 后端服务与接口（S / B）

### 4.1 服务用例（相对计数，不依赖种子行号）

| id | 用例 |
|---|---|
| S1 | B 申请 A 的开放行程 → A `total/application/message` = +1/+1/0；行含 actor=B、trip、application |
| S2 | A 接受 B 的 pending 申请 → B 未读 +1，type=`application_accepted`；A 的计数不变 |
| S3 | A 拒绝 B 的 pending 申请 → B 未读 +1，type=`application_rejected` |
| S4 | 重复申请、非 pending 裁决、未开放 / 已满行程 → 通知行数不变 |
| S5 | A 向 B 发消息 → B 未读 +1，type=`message`，带 `message_id` 与 `(trip_id, sender)`；A 不变 |
| S6 | 自消息：`notifyMessage(recipient=A, actor=A, ...)` 直接调用 → 0 行、计数不变；`ChatService.send` 自消息仍按既有规则拒绝 |
| S7 | 读一条 → `total −1`，`read=true`；再次读同一 id → 计数不变 |
| S8 | 读全部 → `total=0`，列表全部已读 |
| S9 | 两会话各有未读 + 有未读申请类 → 打开一个会话只清该会话消息，另一会话与申请类不变 |
| S10 | A 标读后 B 的计数不变；A 读 B 的通知 id → 404 `NOTIFICATION_NOT_FOUND` |
| S11 | 制造 51 条通知 → 列表 50 条，`created_at DESC, id DESC` |
| S12 | `NotificationFailureIsolationTest`：`@Primary` 桩的 `notify*` 抛 `RuntimeException` → `accept` 返回 accepted、`send` 返回消息；数据库状态正确 |
| S13 | `NotificationStreamServiceTest`：A、B 各注册一个 emitter → 向 A 发布只到 A；同一用户两个 emitter 都收到；发送抛错后该 emitter 被移除且不影响其它；心跳不抛；`complete` / `onError` 后连接被移除 |

### 4.2 接口与契约（MockMvc）

| id | 用例 |
|---|---|
| B1 | `GET /notifications` → 200，`items` 最多 50、`counts` 三字段非负；缺 `X-User-Id` → 401 |
| B2 | `POST /notifications/{id}/read` → 200 + 最新 counts；不存在 / 他人 → 404；重复 → 计数不变 |
| B3 | `POST /notifications/read` `{scope:"all"}` → total 0 |
| B4 | `POST /notifications/read` `{scope:"conversation",trip_id,other_user_id}` → 只清该会话 |
| B5 | `scope` 非法 / 缺定位 → 400 `INVALID_INPUT` |
| B6 | `GET /notifications/stream?user_id=` → `asyncStarted`，响应头 `text/event-stream`、`Cache-Control: no-cache`、`X-Accel-Buffering: no`；缺 `user_id` → 401 |
| B7 | `OpenApiTest`：0.18.0、4 路径、schema 必需字段、`NotificationList.items.maxItems=50`、`NOTIFICATION_NOT_FOUND` |
| B8 | `NotificationMigrationTest`：SQLite 执行 `V30` → 表 / 索引存在；插入、按收件人查询、标读更新可用 |

## 5. 前端纯函数（F）

| id | 对象 | 用例 |
|---|---|---|
| F1 | `applySnapshot` | 服务端列表与本地推送按 id 合并；重复不重复；超过 50 截断；计数逐项取较大值；本地已读条目不被旧快照改回未读；`seq` 早于 `lastReadSeq` 的快照只合并条目、不采用计数 |
| F2 | `applyEvent` | 新 id 入队首；同 id 第二次不改变状态；活动会话的消息不加计数且 `read=true` |
| F3 | `markOneLocal` / `markAllLocal` / `markConversationLocal` | 各自减到正确值；重复调用不变；会话只影响匹配条目 |
| F4 | `unreadByConversation` | 两个会话分别计数；申请类不计入；已读不计入 |
| F5 | `notificationHref` | 申请类 → `#/trips/{trip_id}`；消息类 → `#/chat/{trip_id}/{actor.id}` |
| F6 | `shouldToast` | 申请类恒真；消息类在无活动会话 / 不同会话时为真，匹配时为假 |
| F7 | `badgeLabel` | 0 → `''`；1 → `'1'`；12 → `'12'`；不截断 |
| F8 | 类型守卫 | 未知 type 的条目不会让分组 / 直达抛错（防御性） |

## 6. E2E（M）

测试数据全部通过 API 现场创建，使用两个独立浏览器上下文（发布者 A、申请者 B），避免依赖种子行号。

| id | 场景 | 步骤与断言 |
|---|---|---|
| M1 | 申请到达（验收信号 1） | A 打开首页；B 申请 A 的行程；≤3 s 内 A 的 `notification-badge` 从 0 → 1；面板出现「B 申请了…」 |
| M2 | 接受 / 拒绝（信号 2、3） | A 接受 B；B 的徽标 +1 且条目为接受；换 C 申请后拒绝，C 的条目为拒绝 |
| M3 | 消息到非聊天页（信号 4） | B 向 A 发消息；A 停在地图页 → `rail-chat-badge` / `tab-chat-badge` = 1，提示条出现；点击会话后该会话徽标归零 |
| M4 | 计数拆分（信号 5） | A 收 2 条申请 + 3 条消息 → `GET /notifications` 返回 5 / 2 / 3；铃铛 5、聊天入口 3 |
| M5 | 读一条 / 全部 / 幂等（信号 6） | 面板点一条 → 总数 −1；再次调用同 id 不变；全部已读 → 0、徽标消失；紧接着刷新（在途快照）计数**不回弹**（§10 R-9） |
| M6 | 会话范围（信号 7） | A 与 B、C 各有一个会话；打开 B 的会话 → B 的计数归零，C 与申请类不变 |
| M7 | 刷新与重连（信号 8） | 有未读时刷新页面 → 计数不变；断开 / 重连（`page.reload()`）后无重复条目 |
| M8 | 当前会话即时与提示抑制 | A 打开 B 的会话；B 发消息 → A 的消息列表无需刷新即出现、该会话徽标为 0、提示条数量不增加 |
| M9 | 3 秒口径（S23-12） | 记录生产请求返回的 `Date.now()`，`expect(badge).toHaveText('1', { timeout: 3000 })` |
| M10 | 窄屏（S23-25） | 390 px 下 `tab-chat-badge` 与侧栏同数；`notification-bell` 可点开；无横向滚动 |

## 7. 人工走查（V）

| id | 内容 |
|---|---|
| V1 | 1440 / 768 / 390 px × 浅色 / 深色：徽标、面板、未读标记文字可读，颜色不是唯一信息 |
| V2 | 打开面板时新事件只更新列表，不移动焦点；Escape 关闭并把焦点还给铃铛 |
| V3 | 停掉后端：计数保留、无阻塞弹窗；恢复后自动重连并对账，无重复条目 |
| V4 | 两个标签页同一用户：两边都收到同一通知，计数一致（多 emitter） |

## 8. 测试夹具与边界数据

| 夹具 | 用途 | 说明 |
|---|---|---|
| 新建行程 + 两名申请者 | 申请 / 裁决 / 会话 | 通过 `POST /trips`、`POST /trips/{id}/applications`、`POST /applications/{id}/accept` 创建 |
| 未读三元组 5 / 2 / 3 | 计数拆分 | 2 条 `application_received` + 3 条 `message`，不夹带其它未读 |
| 51 条通知 | 列表上限 | 直接经服务写入（测试专用循环），断言 50 条与排序 |
| 两会话 | 会话标读 | B、C 各被接受并各发 1 条消息 |
| 自消息 | S23-5 | 准入层已拒绝，无法经 API 产生；在服务层直接调用 `notifyMessage(A, A, ...)` 断言 0 行。E2E 只断言 `POST /messages` 自消息返回 403 且计数不变 |
| 通知写入失败 | S23-26 / S23-15 | `@Primary` 桩服务抛错；不修改生产代码 |
| 已满 / 已关闭行程 | S23-4 | 用服务层构造状态，断言 0 行；不新增接口 |

## 9. 追溯矩阵

| Requirement | 服务 / 接口用例 | 前端用例 | E2E |
|---|---|---|---|
| 申请与裁决产生持久化通知 | S1–S4、S12、B1、B2、B7 | F2、F5 | M1、M2、M9 |
| 聊天消息产生通知 | S5、S6、S12、B1 | F2、F5 | M3、M8 |
| 未读计数与通知列表 | S7–S11、B1–B5 | F1、F4、F7 | M4、M5、M7 |
| 实时投递 | S13（流服务）、B6、B7 | F1、F2 | M1、M3、M7、M9 |
| 标读范围 | S7–S10、B2–B5 | F3、F4 | M5、M6 |
| 壳层指示与直达 | B1、B7 | F5–F7 | M1–M6、M8、M10 |

- **无悬空场景：** 26 条场景均有至少一个自动化层；V1–V4 只补充主题、焦点、断网与多标签页，不承担功能判定。