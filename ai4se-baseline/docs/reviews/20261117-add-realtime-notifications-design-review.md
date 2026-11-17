# Design review — add-realtime-notifications

- **Verdict: Pass**（BLOCKER 0 / WARNING 2（均在本次修订内关闭，无遗留）/ SUGGESTION 4（2 关闭、2 记录））
- **Scope：** `openspec/changes/add-realtime-notifications/design.md`、`atdd-design.md`（含与 Delta Spec、提案、G1 决策的一致性）
- **Inputs：** Delta Spec（ADDED 6 Requirement / 26 Scenario）、`proposal.md`（D1–D14、10 条验收信号）、`g1-decision.md`（L-01 / L-02 / L-03 / D12 / 测量点）、`docs/reviews/20261117-add-realtime-notifications-spec-review.md`（S-01 ~ S-03）、as-is 代码（`ApplicationServiceImpl`、`ChatServiceImpl`、`AbstractServiceImpl`、`DemoUserService`、`TripPlanService`、`OpenApiTest`、`App.tsx`、`AppShell.tsx`、`ChatPage.tsx`、`ChatList.tsx`、`chat/chatTime.ts`、`styles.css`）
- **Timestamp：** 2026-11-17T17:05+0800
- **Reviewer：** AI agent（Code Mode）；批准由具名人员按签署矩阵完成
- **阶段：** P3（`design.md` 工件）；本报告是 `@rule:artifact-review-gate` 的设计评审，不是 G2

## 1. 结论

设计把 6 条 Requirement 落成一条可核对的链路：**生产方事务末尾写入一行通知 → `afterCommit` 推送 → 客户端用 REST 对账 → 四处徽标读同一份状态**。分工边界清楚：通知行、计数、文案只在后端产生；申请 / 聊天 / 行程规则一行不改；推送失败不影响业务成功；契约增量与迁移编号都给了排他证据。ATDD 把 26 条场景全部分到 U / S / B / F / M 五层，Red / Green 切片按「契约 → 迁移 → 纯函数 → 三个生产方 → 失败隔离 → 流服务 → 前端纯函数 → 壳层 → 聊天 / 窄屏」推进，并补了一条迁移守护切片。

评审中发现并当场修正了两处会削弱可验证性的缺陷：ATDD 的场景编号沿用了 Delta 行序而非 REQ-023 §4 编号（S23-5 / S23-26 错位），以及「在途快照把刚标读的计数复活」的竞争。两者在提交前已关闭，故结论为 Pass；签署前不再有待修项。

## 2. Findings

| id | Severity | Location | Issue | Fix | Owner | 状态 |
|---|---|---|---|---|---|---|
| W-01 | WARNING | `atdd-design.md` §1 / §6 / §8 | 场景标签按 Delta 行序编号，而 REQ-023 §4 的顺序不同：自消息在 REQ 是 S23-5、在 Delta 是第 7 条；失败隔离在 REQ 是 S23-26、在 Delta 是第 5 条；其余自第 8 条起整体错位。追溯矩阵会把测试挂到错误场景 | 26 行全部改为 REQ-023 §4 编号；§6 的 M9 / M10 与 §8 的自消息 / 失败夹具同步改正；新增「编号口径」说明 | Karena | 已关闭（本修订） |
| W-02 | WARNING | `design.md` §6.1 `applySnapshot`；`atdd-design.md` F1 / M5 | 快照计数按逐项取大，若 `GET /notifications` 在途时标读响应先落地，旧快照会把已清零的计数复活；条目的 `read` 也可能被旧快照改回未读 | 引入 `seq` 护栏（快照发起序号早于 `lastReadSeq` 时只合并条目、不采用计数）并规定 `read` 单调；F1 增两条断言、M5 增「标读后立即刷新不回弹」；R-9 同步更新 | Karena | 已关闭（本修订） |
| S-01 | SUGGESTION | `design.md` §4.1 / §4.3 | `scope=all` 时 `trip_id` / `other_user_id` 的语义未写明，实现可能误报 400 | 明确 `scope=all` 忽略定位字段、`scope=conversation` 缺一即 400 | Karena | 已关闭（本修订） |
| S-02 | SUGGESTION | `design.md` §6.2 | `NotificationProvider` 的 `route` 参数没有使用点（活动会话由 `ChatPage` 登记，直达地址由条目计算），属多余接口 | 去掉 `route`，只保留 `currentUser` | Karena | 已关闭（本修订） |
| S-03 | SUGGESTION | `design.md` §6.2；`atdd-design.md` V3 | `EventSource` 在 401（`user_id` 无效）时不会自行停止，会按浏览器默认间隔重试；demo 可接受，但走查要能区分「重连中」与「身份失效」 | P4 走查 V3 记录控制台与重试间隔即可；若出现无意义重试，再按错误计数关闭连接，不在本 change 扩范围 | Karena | 记录（P4 观察） |
| S-04 | SUGGESTION | `design.md` §5.3 | 列表组装逐行 `require` 行程与动作人（N+1），且假设行一定存在。当前无行程 / 用户删除路径，与 `ChatService.partners` 同口径 | 接受为 demo 边界，记入 R-11；若未来引入删除，改为写入时快照标题或可空查找 | Karena | 记录（R-11） |

## 3. Requirement 覆盖

| # | Requirement（Delta） | 场景 | 设计落点 | ATDD 承接 |
|---|---|---|---|---|
| R1 | 申请与裁决产生持久化通知 | 5 | §5.1 钩子、§5.2 写入、§5.1 失败隔离、§7 映射 | S1–S4、S12；B1 / B2 / B7；M1 / M2 / M9 |
| R2 | 聊天消息产生通知 | 2 | §5.1 钩子、§5.2 自消息守卫、§6.6 追加 | S5、S6、S12；B1；M3 / M8 |
| R3 | 未读计数与通知列表 | 4 | §5.3 列表与三项计数、§3 索引 | S7–S11；B1–B5；M4 / M5 / M7 |
| R4 | 实时投递 | 5 | §4.4 线格式、§5.5 注册表、§5.6 端点、§5.7 测量、§6.2 生命周期 | S13；B6 / B7；M1 / M3 / M7 / M9 |
| R5 | 标读范围 | 5 | §5.4 三种范围与幂等、§6.6 会话标读 | S7–S10；B2–B5；M5 / M6 |
| R6 | 壳层指示与直达 | 5 | §6.3 提示、§6.4 四处徽标、§6.5 面板与直达、§6.7 可访问性 | B1 / B7；F5–F7；M1–M6 / M8 / M10 |

- **6 / 6 Requirement、26 / 26 Scenario** 均有设计与至少一个自动化层；没有只靠 V1–V4 兜底的场景。
- §7 的「端点 / 生产方 → Requirement → 场景」把 4 条新路径与 3 个既有生产方钩子全部回指到 R1–R6，无无主端点，回应 spec review S-03。
- spec review 的三条意见均有落点：S-01 提示条 → §6.3 + M8；S-02 失败隔离跨生产方 → §5.1 + S12 + S23-26；S-03 契约锚点 → §7 + `tasks.md` T1 要求。

## 4. 逐维核对

| 维度 | 结论 | 证据 |
|---|---|---|
| `api-contract` | Pass | §4 先定路径 / schema / 错误码，再谈实现；契约 0.18.0 与 `OpenApiTest` 两处断言（114 / 569 行）同步；前端 `types.ts` / `api.ts` 由同一 schema 派生 |
| `package-structure` | Pass | `NotificationController` / `Service` / `ServiceImpl` / `Mapper` / `Entity` / `pojo` / `enum` / `utils` / `exception` / `request` / `response` 各自落点符合分层表；`NotificationStreamService(Impl)` 与既有 `WeatherServiceImpl` 等无表服务一致（不继承 `IService`） |
| `no-circular-dependency` | Pass | R-10 把 `formatChatTime` 迁到叶子 `utils/chatTime.ts`；`notifications → utils`，`chat → utils`，`chat → notifications`（Context），不存在 `notifications → chat`；`utils/dates.ts` 只依赖 dayjs |
| `java-patterns` | Pass | 写入沿用 `AbstractServiceImpl.nextId()`；条件查用 `LambdaQueryWrapper`，无 `@Select` 注解 SQL；异常走 `BusinessException` 子类 + 全局处理器；`@Slf4j` 记录失败 |
| `web-coding-style` | Pass | 业务逻辑进 `notificationModel.ts` 纯函数，组件只做渲染；Context 放在功能目录；既有 `styles.css` 变量（`--danger` / `--surface` / `--line` / `--on-deep`）复用，不写死颜色 |
| `security-baseline` | Pass（有记录例外） | 所有查询按 `recipient_id` 授权；单条越权返回 404 不暴露存在性；`user_id` 查询参数与既有 `X-User-Id` 同级信任并记 R-3；无新上传 / 无 SQL 拼接 |
| `tdd-cycle` | Pass（计划） | §9 与 ATDD §2 每个切片先写失败测试；迁移守护用既有 4 条断言证明「无行为变化」；失败隔离用 `@Primary` 桩覆盖 |
| `java-testing` / `web-testing` | Pass（计划） | H2 + SQLite 双引擎迁移测试；MockMvc 覆盖 200 / 400 / 401 / 404 与 async；前端仅纯函数单测（无 DOM），UI 由 Playwright 双上下文覆盖 |
| `document-conventions` | Pass | 正文中文、标识符英文；路径为仓库相对路径；标题不超过三级；引用 change-id 与文件路径 |
| `sdd-artifacts` | Pass | 设计在 `openspec/changes/<change>/design.md`，ATDD 同级；评审报告在 `docs/reviews/`；未提前创建 `tasks.md` |
| 工件链可追溯 | Pass | 提案 D1–D14 → Delta 6 / 26 → 设计 §3–§7 → ATDD 26 行 → 追溯矩阵，逐条可对照；W-01 修正后编号唯一 |

## 5. 证据（真实输出摘要）

| 检查 | 输出 |
|---|---|
| `openspec validate add-realtime-notifications --strict` | `Change 'add-realtime-notifications' is valid` |
| Delta 规模 | 6 个 `### Requirement`、26 个 `#### Scenario`（逐行计数） |
| 契约基线 | `openapi.yaml:4` → `version: 0.17.0` |
| 迁移基线 | `db/migration/` 最大为 `V23__add_travel_mode.sql` |
| 编号排他 | 全仓 `V24__` / `0.18.0` 仅出现在本 change 工件与 REQ-023 的 P1 / P2 记录中，无其它 change 占用（含 `add-ai-itinerary`） |
| 契约断言同步点 | `OpenApiTest.java:114`、`:569` 两处 `assertEquals("0.17.0", ...)` |
| 生产方钩子落点 | `ApplicationServiceImpl.apply`（67 行 `@Transactional`）、`decide`（213 行，内部 `updateStatus` 297 行）；`ChatServiceImpl.send`（119 行 `@Transactional`、120 行方法）、`requireAccess`（177 行，已拒绝自消息） |
| 依赖事实 | `formatChatTime` 现有 4 处 import（`ChatList`、`ChatMain`、`chatMeeting`、`admin/service/ServiceConversation`）+ 1 个测试文件；`utils/` 已是叶子包（`utils/dates.ts` 仅依赖 dayjs） |
| 挂载点 | `App.tsx:177` `<ProfileProvider>` 包 `<AppShell>`；`AppShell.tsx:334` `.topbar`、`:386` `.rail-link`、`tabbar` / `.tab-link` 在 `styles.css:946` / `:3590` |
| 迁移可移植性 | 设计只用 `INTEGER / VARCHAR / CREATE INDEX`，与 `V21` 的「portable across SQLite and H2」同口径；测试库为 H2（`src/test/resources/application.properties`） |
| 代码变更 | 本阶段仅新增 `design.md` / `atdd-design.md`；`git status` 未出现生产代码或 `openapi.yaml` 改动 |
| 回归基线 | 未重跑（文档阶段无代码变更）：后端 434 tests / 60 reports / 0 失败；前端 46 files / 344 tests（P0 基线，16:26 / 16:32） |

## 6. 残余风险

| # | 风险 | 处理 |
|---|---|---|
| R-1 | SSE 经代理被缓冲，3 秒不达标 | `X-Accel-Buffering: no` + `no-cache` + 20 s 心跳；P4 经 Vite 代理实测，M9 断言 3000 ms |
| R-2 | 后端重启丢内存连接 | 单进程 demo 可接受；`onopen` REST 对账把丢事件降级为延迟 |
| R-3 | `user_id` 可伪造 | 与 `X-User-Id` 同级信任；真实鉴权另开 change |
| R-4 | 四处计数漂移 | 单一 Context + 纯函数归约 + 服务端标读响应覆盖 |
| R-5 | 行无限增长 | D13 明确不清理；另开需求 |
| R-6 | 分会话徽标受 50 条上限 | 总徽标以服务端计数为准；分会话按可见条目派生，边界已记录 |
| R-7 | `NotificationBroker` 命名 | 实现为 `NotificationStreamService` + `Impl`；提案名称仅作职责描述 |
| R-8 | 同事务内通知写入失败 | `notify*` 内部捕获，不标记 rollback-only；连接失效属既有故障域 |
| R-9 | 快照 / 推送 / 标读竞争 | `seq` 护栏 + `read` 单调 + 计数逐项取大；F1 / M5 断言 |
| R-10 | 依赖环 | `formatChatTime` 迁到 `utils/`；4 处 import 与测试同步迁移，断言不变 |
| R-11 | 列表组装 N+1 且假设行存在 | 与 `ChatService.partners` 同口径；当前无删除路径，引入删除时再改快照 |

- **未在本阶段验证：** SSE 经真实代理的时延、多标签页行为、390 px 布局、明暗主题观感、后端重启后的收敛。以上均在 P4 / V1–V4 执行。

## 7. 签署记录

按 `@rule:artifact-review-gate`：`design.md` 需当前开发者 + 1 名非当前开发者且非 WAYNE 的成员；本报告需 WAYNE + 当前开发者。四个签署位均已批准，可进入 `tasks.md`。

| 对象 | 签署位 | 批准人 | 批准时间 | 结论 |
|---|---|---|---|---|
| `openspec/changes/add-realtime-notifications/design.md` | 1 | Karena | 2026-11-17T17:11+0800 | 批准 |
| `openspec/changes/add-realtime-notifications/design.md` | 2 | Jay | 2026-11-17T17:11+0800 | 批准 |
| `docs/reviews/20261117-add-realtime-notifications-design-review.md` | 1 | WAYNE | 2026-11-17T17:11+0800 | 批准 |
| `docs/reviews/20261117-add-realtime-notifications-design-review.md` | 2 | Karena | 2026-11-17T17:11+0800 | 批准 |

- 签署时确认：面板入口保持 **click 展开**（`Popover trigger="click"`），不改为 hover；触屏、窄屏与键盘路径以点击为准，Escape 关闭并把焦点还给铃铛。

## 8. 下一步（非门禁建议）

1. 四个签署位已收齐（上表）；`design.md` 的第二签署人为 Jay，满足「非当前开发者且非 WAYNE」。
2. 写 `tasks.md`（T1 契约 → T8 E2E / 回归，每条任务回指 Requirement 与 ATDD 用例），再走一次 `all-specs-review` 与 tasks 签署。
3. `tasks.md` 签齐后进入 P4：按 ATDD D1–D12 顺序先 Red 后 Green；先在本地跑后端 / 前端全量回归，再补 Playwright 双上下文与 1440 / 768 / 390 × 明暗走查。