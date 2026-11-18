# P4 — refine-service-close（REQ-028 客服会话结束权交由用户）

- **日期：** 2026-11-18 ｜ **记录人：** Lewis Liu（当前开发者）｜ **阶段：** P4 实现完成，本地验证 Pass；G2 已记录
- **Change：** `refine-service-close` ｜ **分支：** `feature/refine-service-close`（独立 worktree `.worktrees/refine-service-close`）
- **阶段提交：** P1 `f904f36` / P2 `5185b0d` / P3 `1e4f417` ｜ **基线：** `origin/main@9a13fe4`（并入后 0.24.0 / V29 → 本 change 0.25.0 / V30）
- **G2：** [`openspec/changes/refine-service-close/g2-decision.md`](../../openspec/changes/refine-service-close/g2-decision.md)

## 1. 实现落点

| 文件 | 改动 |
|---|---|
| `openapi.yaml` | 0.25.0；`ServiceSessionStatus` 四值；`ServiceSessionSummary.resolved_at`；新增用户 `POST /service/sessions/{id}/close` 与 `POST /admin/service/sessions/{id}/resolve`；删除 admin close；`/service/sessions` 与 `/current` 描述改三态；`AdminDashboardServiceSessions.by_status` 四桶 |
| `backend/.../db/migration/V30__add_service_session_resolve.sql` | `customer_service_sessions` 增 `resolved_at VARCHAR(40)` / `resolved_by INTEGER` |
| `backend/.../enums/ServiceSessionStatusEnum.java` | 增 `RESOLVED`（四态） |
| `backend/.../entity/CustomerServiceSessionEntity.java`、`pojo/CustomerServiceSession.java` | 增 `resolvedAt` / `resolvedBy` |
| `backend/.../response/ServiceSessionSummaryResponse.java`、`ServiceSessionDetailResponse.java` | summary / detail 增 `resolvedAt`（`resolved_by` 不下发） |
| `backend/.../service/CustomerService.java`、`impl/CustomerServiceImpl.java` | 删除 `close(long,long)`；新增 `closeByUser`（`WAITING`/`HANDLING`/`RESOLVED` 三态 CAS，`closed_by=用户`）与 `resolve`（`HANDLING` CAS → `RESOLVED` + 留痕）；`appendMessage` 在 `RESOLVED` 下同事务回迁 `HANDLING` 并清空 `resolved_*`；`openSession` 扩三态 |
| `backend/.../controller/ServiceController.java`、`AdminServiceController.java` | 用户 close 端点；admin `resolve` 端点；删除 admin close 映射 |
| `backend/.../service/impl/AdminDashboardServiceImpl.java` | `SERVICE_SESSION_STATUS_KEYS` 四键（`RESOLVED` 入桶） |
| `backend/.../controller/OpenApiTest.java` | 版本四处的 0.25.0、路径清单（删 close / 加 resolve / 加用户 close）、四值枚举、`resolved_at`、admin close 缺席、概览四桶 |
| `backend/.../controller/ServiceControllerTest.java` | 三态 close、重复 close 409、无 Bearer 401、`current` 三态、发言回迁等 6 例；close helper 改用户侧 |
| `backend/.../controller/AdminServiceControllerTest.java` | resolve / 重复 resolve 409 / 旧 close 404 / `RESOLVED` 发言回迁；删除 close 用例 |
| `backend/.../controller/AdminDashboardControllerTest.java` | 概览 `by_status` 四键与「总数 = 分桶之和」 |
| `backend/.../migration/AdminConsoleMigrationSqliteTest.java` | 两列存在 + V30 记录成功 |
| `frontend/src/types.ts`、`api.ts` | 四态 union、`resolved_at`；`closeServiceSession` 指向用户端点、新增 `resolveServiceSession` |
| `frontend/src/i18n/adminMessages.ts` | `sessionResolved` / `helpResolved` / `serviceResolve` / `serviceResolvedToast` / `serviceResolvedHint` / 结束确认四键 / `serviceCloseToast`；`sessionNotHandling` 改「当前不可标记完成」 |
| `frontend/src/admin/adminStatus.ts` / `.test.ts`、`adminBadges.tsx` | 四态文案与 `jade` 色调；注释改四态 |
| `frontend/src/help/helpStatus.ts` / `SupportPage.tsx` | 新增 `serviceChatHint(status)`；SupportPage 删私有 `statusHint` 改用单点 |
| `frontend/src/help/ServiceChat.tsx` | 三态「结束会话」`Popconfirm`（按状态选标题 / 描述）+ 成功提示；`RESOLVED` 提示 |
| `frontend/src/help/serviceChatStatus.test.ts` | `serviceChatHint` 四态断言（新增） |
| `frontend/src/admin/service/AdminServiceDetailPage.tsx` | 删除结束按钮；`HANDLING` 显示「标记处理完成」（成功 toast）；`RESOLVED` 只读提示 |
| `frontend/src/admin/service/AdminServicePage.tsx` | 状态筛选五项（含「待用户确认」） |
| `frontend/src/admin/dashboard/AdminDashboardPage.tsx` | 概览客服会话顺序与图例四段 |
| `e2e/tests/customer-service.spec.ts` | `[C3]` 改为 admin close 404 + 用户 UI 结束；新增 `[C4]`（join → resolve → 待确认 → 发言回迁 → 再 resolve → 用户结束 → `resolved_at` 与历史消息） |
| `e2e/tests/admin.spec.ts` | `[I3]` 改为「标记处理完成」→ 待用户确认 → 断言无「结束会话」按钮 → 用户 API 结束 → 只读 → 筛选已结束 |

## 2. 验证结果

详见 [`docs/ai4se-plugins/20261118-120213-local-verify-report.md`](../../docs/ai4se-plugins/20261118-120213-local-verify-report.md)。

| 层 | 结果 |
|---|---|
| 规格 | `openspec validate refine-service-close --strict` → valid（3 Requirement / 31 Scenario） |
| 契约 | `OpenApiTest` 17 / 17 |
| 后端 API | `ServiceControllerTest` 16 / 16、`AdminServiceControllerTest` 13 / 13、`AdminDashboardControllerTest` 12 / 12 |
| 迁移 | `AdminConsoleMigrationSqliteTest` 1 / 1（30 个迁移，V30 生效） |
| 后端全量（CI 口径） | `mvnw -B -ntp verify` → 583 / 583，BUILD SUCCESS |
| 前端单测 / 构建 | 61 files / 475 tests passed；`npm run build` 成功（9.21s） |
| E2E | `customer-service.spec.ts` + `admin.spec.ts` → 14 / 14（隔离 8090 / 5176） |
| 走查 | 1440 / 1024 / 390 × 浅 / 深：4 屏共 24 张（`docs/preview/refine-service-close/`），全部无横向溢出；管理端无结束按钮、概览四段、待用户确认提示与结束入口可见 |

## 3. Red → Green

- **契约 Red：** 新 `OpenApiTest` 在 0.24.0 / 旧路径下失败（版本、路径清单、四值枚举、`resolved_at`、概览四桶），升 0.25.0 后 17 / 17 绿。
- **后端 Red：** 新 `ServiceControllerTest` / `AdminServiceControllerTest` 用例在旧实现下 404 / 状态断言失败；实现 `closeByUser` / `resolve` / 回迁后 16 / 13 绿，全量 583 / 583。
- **前端 Red：** 四态 union 与 `serviceChatHint` 测试先红（缺类型 / 缺函数），补齐后 475 / 475 绿；`tsc` 构建通过。
- **E2E Red：** 旧实现在 `[C3]`（admin close 仍 200）与 `[I3]`（管理端仍有结束按钮）失败；改写实现后两条 spec 14 / 14。
- **验证期修正：** `[C4]` 提示重复 → 断言限定 `.help-chat-head`；确认按钮误命中侧栏账号按钮 → 限定 `.ant-popconfirm`；8082 端口被另一 worktree 旧后端双绑 → 改用 8090；终端残留 `SPRING_DATASOURCE_URL` 污染测试 → 清空后复跑；`e2e/npm install` 被企业镜像 `EALLOWREMOTE` 拒绝 → 复制主工作区 `node_modules`。

## 4. 反向复核

- **管理端结束能力彻底下线：** 控制器无 close 映射（`OpenApiTest` 断言路径缺席，E2E `[C3]` 直接断言 404）；管理端详情页无「结束会话」按钮（E2E `[I3]` + 走查截图）。
- **状态机封闭：** 仅 6 条合法迁移；`closeByUser` 在 `CLOSED` 下 CAS 0 行 → 409；`resolve` 仅 `HANDLING` 可入 `RESOLVED`。
- **留痕最小化：** 只落 `resolved_at` / `resolved_by` 与既有 `closed_at` / `closed_by`；`resolved_by` 不下发；未加系统消息、评价、超时关闭、历史会话列表。
- **概览口径单点：** `by_status` 四键由后端零填充，`total = Σ`（A11 / S9）；前端只按固定顺序渲染，不做状态推导。
- **不改原型：** 客服会话与后台管理无独立原型；沿用 `help-chat` / `admin-service` / `badge` 既有令牌与 antd 组件，未新增色值与像素。
- **零扩张：** `frontend/package.json` 未改；未新增依赖、表或索引。

## 5. G2 签署表

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核本地验证报告、E2E 结果与记录债务 | 2026-11-18 |
| AO | Lewis Liu | 交付实现、测试与验证报告 | 2026-11-18 |
| IO | WAYNE | 认可范围与验收口径（沿用 G1） | 2026-11-18 |
| SA | Jacky | 实现符合四态状态机与「结束权归用户」边界 | 2026-11-18 |

> G2 结论 **Pass（附记录债务）**，详见 `g2-decision.md`。本记录不替代 G3。

## 6. 条件与残余风险

- **全量 E2E 未跑：** T10 只要求两条受影响 spec；全量依赖高德 Key 等既有环境债务，未纳入本 change 结论。
- **Redocly 未安装：** OpenAPI 以 `OpenApiTest` 断言为准；CI 不含 Redocly。
- **提示重复（既有）：** 客服卡片头部与聊天头部同句展示状态提示，本 change 未改结构。
- **共享服务：** 主工作区 8080 仍为 0.24.0；本 change 验证全程使用隔离 8090 / 5176 与独立 SQLite。
- **环境观察：** 8082 存在另一 worktree（`add-report-credit-deduction`）遗留旧后端进程，未终止；并联验证需避开该端口。
- **P5：** 按用户要求不执行；归档 MUST 排在 `add-admin-console` 之后。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0 | — | 基线材料随 P1 提交 |
| P1 | `f904f36` | `docs(p1): refine-service-close add REQ-028 proposal and delta` |
| P2 | `5185b0d` | `docs(p2): refine-service-close align customer-service delta and G1` |
| P3 | `1e4f417` | `docs(p3): refine-service-close add atdd design and tasks` |
| P4 | 本条提交 | `feat(p4): refine-service-close hand session close to users`（含验证报告、G2 与走查截图） |

## 8. 下一阶段

- G2 已签署；按用户要求**不执行 P5、不归档**，等待 `add-admin-console` 归档顺序满足后再处理。
- issue #38 处置：管理端「结束会话」按钮与 `/admin/service/sessions/{id}/close` 已删除；用户在三态可自行结束；客服以「标记处理完成」进入待用户确认。

## 9. P4 修正：客服也可结束会话（2026-11-18）

- **变更缘起：** 用户反馈「客服也要能终止对话」。复核发现 proposal 原本声明「管理端结束会话能力保留」，但 T4/T9/T10 将管理端 close 端点与按钮一并删除，属于实现偏离规格。
- **规格修订：** `specs/customer-service/spec.md` 改为 4 Requirement / 37 Scenario：新增「客服结束客服会话」，管理端入口与 close 路径改为可用，`closed_by` 记录实际操作者（用户或客服）。
- **实现：** `CustomerService.closeByAdmin`（三态 CAS → `CLOSED`，通知用户）+ `AdminServiceController POST /{sessionId}/close`；前端新增 `closeServiceSessionByAdmin`，`AdminServiceDetailPage` 在未结束状态显示「结束会话」`Popconfirm`（WAITING 用取消排队文案），`HANDLING` 与「标记处理完成」并存。
- **契约：** `openapi.yaml` 0.32.0 新增 `/admin/service/sessions/{sessionId}/close`；`OpenApiTest` 改为「两个 close 端点并存」。
- **验证：** `AdminServiceControllerTest` 17/17、`OpenApiTest` 20/20；前端 `tsc --noEmit` + `vite build` 通过、单测 572/572；接口闭环实测（新建 → 接入 → 客服结束 → 用户 `current` 为空体 → 重复结束 409）；管理端页面走查确认按钮、Popconfirm、只读态与「已结束」筛选均正常。
- **边界：** 本节仅修正实现与已批准 proposal 的偏差，不代为签署 G2/G3；「结束权归用户」的口径按用户本次要求修订为「用户与客服均可结束」。

