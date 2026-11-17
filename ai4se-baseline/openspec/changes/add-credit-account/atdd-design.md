# ATDD 设计 — add-credit-account

- **Change：** `add-credit-account`（REQ-019 / S19 信用分账户与等级展示）
- **输入：** `specs/user-credit/spec.md`（ADDED 7 Requirement / 22 Scenario）、`g1-decision.md`（Pass）
- **日期：** 2026-11-17 ｜ **作者：** Lewis Liu（当前开发者）
- **原型：** `docs/prototype/ui.js` `profileModal` + `styles.css` `.profile-credit`（已先行更新）

## 1. ATDD 层次划分（API / E2E；UT 仅登记）

| # | Scenario | Layer | 推荐附加层 | 依据 |
|---|---|---|---|---|
| R1-1 | 注册成功后初始化信用账户（分数 80） | **API + E2E** | — | API 断言响应字段；E2E 断言页面展示串 |
| R1-2 | 注册失败不留信用账户 | **API** | 数据完整性 | 需断言「没有写入」→ 后端集成测试查 `user_credit_account` 计数 |
| R1-3 | 存量账号补齐初始分 | **API** | 数据完整性 | 演示账号 `id 1–3` + `id 4` 读取响应即证 |
| R1-4 | 同一用户只有一个信用账户 | **API** | 幂等 | 连续两次读取 + 后端断言单行 |
| R2-1 | 上界裁断记录实际生效量（98 +5 → 100，记 +2） | Defer UT | — | 无公开写入口，纯服务逻辑（`atdd-apply` 单测） |
| R2-2 | 下界裁断记录实际生效量（3 -10 → 0，记 -3） | Defer UT | — | 同上 |
| R2-3 | 分数始终落在闭区间内 | Defer UT | — | 同上；可在后端集成测试再补一条 DB 断言 |
| R3-1 | 五档边界（100/90/89/80/79/60/59/30/29/0） | **API** | — | 测试夹具直接改 `score` 后读主页响应 |
| R3-2 | 等级随分数实时重算（89 +1 → 90 优秀） | **API + E2E** | — | API 断言 code；E2E 断言展示串 |
| R4-1 | 本人查看自己的信用状态 | **E2E** | — | 用户可见行为 |
| R4-2 | 其他用户查看同一信用状态 | **E2E** | — | 换账号/未登录视角 |
| R4-3 | 资料未完善仍展示信用状态 | **E2E** | — | 新注册账号（未完善）即证 |
| R4-4 | 分数与等级文字同时展示 | **E2E** | — | 断言整串「80 / 100」+「信用良好」 |
| R4-5 | 重复进入展示一致 | **E2E** | — | 刷新后断言同串 |
| R5-1 | 用户提交信用分字段被忽略 | **API** | — | `PUT /api/users/me/profile` 带额外字段（若 schema 严格则 400）→ 分数不变 |
| R5-2 | 不存在客户端写分端点 | **API** | 安全 | `PUT/POST /api/users/me/credit` → 404 |
| R6-1 | 每次变化写入一条信用记录 | Defer UT | — | 记账服务单测 |
| R6-2 | 记录满足前后分数等式 | Defer UT | — | 同上 |
| R6-3 | 重复业务标识只记一次 | Defer UT | 幂等 | 同上；唯一索引 |
| R6-4 | 实际生效量为零仍留记录 | Defer UT | — | 同上 |
| R7-1 | 不存在管理后台信用分视图 | **E2E** | 安全 | 无 admin 路由；导航无入口 |
| R7-2 | 不展示加扣分明细 | **E2E** | 隐私 | 个人主页无明细/历史入口 |

**汇总：** API 8 条（其中 R1-1 / R3-2 兼 E2E）｜仅 E2E 7 条｜Defer UT 7 条；去重合计 **22 条**（22 Scenario 全覆盖）。

**Deferred to `/sdd:atdd-apply`（unit-level TDD）：** 越界裁断（上下界 + 全裁断零值）、账本等式、幂等键、区间不变量；等级阈值纯函数（前端映射）也在此层补单测。

## 2. 在生产代码前先写的验收检查

1. **API（先红）**
   - `CreditProfileApiTest`：`GET /api/users/1/profile` 返回 `credit_score = 80`、`credit_level = "good"`；本人 / 他人视角均含该键。
   - `CreditAccountInitApiTest`：注册成功后 `GET` 该用户主页返回 80 / good；注册失败（重名 / 非法输入）后 `user_credit_account` 计数不变。
   - `CreditBoundaryApiTest`：SQL 夹具把分数改为 100/90/89/80/79/60/59/30/29/0，逐档断言 `credit_level`。
   - `CreditReadOnlyApiTest`：`PUT /api/users/me/credit` → 404；`PUT /api/users/me/profile` 携带 `credit_score` 不改变分数（按既有校验口径断言 400 或忽略）。
   - `CreditMigrationSqliteTest`（沿用项目命名 `*MigrationSqliteTest`）：全新库 V1–V18 建两表；旧库升级后 `app_users` 全表回填 80，且 `app_users` 列集合不变。
2. **E2E（先红）**
   - `e2e/tests/credit.spec.ts`：注册 → 个人主页看到「信用分：80 / 100 · 信用良好」；换登录账号看同一用户同为 80 / good；刷新后不变；页面无「明细 / 历史」入口；无 admin 入口与排序/筛选控件。

## 3. 本地与 CI 门禁

| 层 | 命令 | 备注 |
|---|---|---|
| 后端 | `./mvnw -B -ntp verify`（`RouteME/backend`） | 与 CI 一致 |
| 前端 | `npm run typecheck && npm run build && npm test`（`RouteME/frontend`） | 与 CI 的 `build && test` 对齐，额外保留 typecheck |
| E2E | `npx playwright test e2e/tests/credit.spec.ts`（`RouteME/e2e`） | **不在 CI**（既有残余风险），P4 本地全量回归 |
| 规格 | `openspec validate add-credit-account --strict` | 每次改 Delta 后 |
| 契约 | Redocly lint（`RouteME/redocly.yaml`） | 本地可选；CI 未纳入 |

## 4. 数据 / 夹具策略

- **后端集成测试**：`@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")`，固定 `Clock`；每个用例前清空 `credit_ledger` / `user_credit_account` 后再播种；改分数用 SQL 直接改 `score`（模拟事件结果），不改生产接口。
- **E2E**：沿用「全新 SQLite + 独立后端端口」模式；注册使用时间戳唯一用户名；存量回填用演示账号 `linjianxia / 123456`（`id 1`）与 `id 4` 周野。
- **清理**：E2E 结束后删除临时库；后端测试事务回滚或 `DELETE` 两张表。
- **不做**：不写 Excel / Playwright POM 生成器；不新建第二套 CI。

## 5. Non-goals 反向验证

| Non-goal（来自提案 Out of scope） | 反向用例 | Layer |
|---|---|---|
| 管理后台用户列表 / 详情 / 排序 / 筛选 | E2E：无 admin 路由与入口；`/api/admin/**` → 404 | E2E + API |
| 加 / 扣分明细、原因、历史入口 | E2E：个人主页无明细/历史入口 | E2E |
| 客户端写分端点 | API：`PUT/POST /api/users/me/credit` → 404 | API |
| 计分事件（获赞 / 退出 / 举报 / 月度上限 / 封禁） | API：不存在对应事件端点；`user_credit_account` 无 `updated_by` 之类事件字段 | API |
| 他人主页之外的展示触点 | E2E：首页卡片与资料弹窗无信用信息 | E2E |
| 修改 `app_users` 表结构 | 后端迁移测试：`app_users` 列集合不变 | API（迁移断言） |

## 6. NFR 测试

**不在本 change 范围（用户裁决 2026-11-17）。** 性能 / 可观测性 / 压测均 deferred；P4 只在验证报告中记录「主页读取仍为单次请求」这一结构事实。

## 7. 显式 Non-goals（本技能边界）

- 不写生产代码、不写完整 UT 套件、不做任务分解。
- 不引入 Playwright / POM / Excel 生成器，不新建 CI 语义。
