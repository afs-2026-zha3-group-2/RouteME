# ATDD 设计 — add-route-completion

- **Change：** `add-route-completion`（REQ-031 / S32 路线完成度，issue #45）
- **输入：** `specs/route-completion/spec.md`（ADDED 6 Requirement / 18 Scenario）、`g1-decision.md`（**Pass**，IO=WAYNE / SA=Jacky）、`proposal.md`（D1–D8）
- **日期：** 2026-11-18 ｜ **作者：** Neal（当前开发者）
- **前置：** G1 Pass（2026-11-18，无条件）；序列化口径已定稿（数据不足省略 `route_completion_rate`，`route_completion_state` 恒返回并列入 `required`）。
- **原型：** P3 先出 `docs/sdd/add-route-completion/preview/route-completion-row.html`（个人主页 hero 信用行 + 完成度行，四态 × 深浅色），实现阶段按其令牌落地；不重建推荐引擎、不做列表入口。

## 1. ATDD 层次划分

用例 ID `A1–A18` 与 Delta 18 个 Scenario 一一对应（顺序同 Delta）。

| ID | Delta Requirement | Scenario | Layer | 附加层 | 依据 |
|---|---|---|---|---|---|
| A1 | R1 预留字段与数据不足口径 | 接口返回预留字段 | **API** | 契约 | 断言 `route_completion_state` 存在且为四值之一；数据不足时 JSON **不含** `route_completion_rate`；两字段均只读（无写入口） |
| A2 | R1 预留字段与数据不足口径 | 本期恒为数据不足 | **API** | — | 含演示用户与「有已结束行程」的种子用户：一律 `insufficient`、无 `rate`、无 `0`；无任何伪造百分比 |
| A3 | R2 数据充足判定与统计范围 | 足够数据门槛 | **Defer UT** | 边界 | 派生纯函数：样本 0 / 数值 null → `insufficient`；样本 ≥1 且数值有效 → 按阈值派生 |
| A4 | R2 数据充足判定与统计范围 | 只统计已结束行程 | **Defer UT** | — | 聚合输入过滤器：`recruiting` / `full` / `ongoing` / `cancelled` 均不计入样本；仅 `completed` 计数 |
| A5 | R3 阈值派生与后端权威 | 信誉良好边界 | **Defer UT** | 边界 | 80 → `good`；100 → `good` |
| A6 | R3 阈值派生与后端权威 | 中性区间边界 | **Defer UT** | 边界 | 70 / 79 → `neutral` |
| A7 | R3 阈值派生与后端权威 | 警惕边界 | **Defer UT** | 边界 | 69 / 0 → `watch` |
| A8 | R3 阈值派生与后端权威 | 非法数值降级 | **Defer UT** | 失败安全 | 非整数 / 负数 / >100 → `insufficient`，不得落入 `good` |
| A9 | R3 阈值派生与后端权威 | 状态由后端派生 | **E2E** | 静态反向 | 页面文案只由 `state` 决定；前端源码检索不存在 80 / 70 阈值常量或二次计算 |
| A10 | R4 个人主页展示 | 展示入口 | **E2E** | — | 个人主页 hero 信用行附近出现「路线完成度」；资料弹窗 / 行程卡 / 行程详情 / 列表页均不出现 |
| A11 | R4 个人主页展示 | 信誉良好展示 | **E2E** | 夹具 | `page.route` 注入 `good` / 85 → 「路线完成度 85% · 信誉良好」 |
| A12 | R4 个人主页展示 | 中性展示 | **E2E** | 夹具 | 注入 `neutral` / 75 → 只显示「路线完成度 75%」，无信誉标签 |
| A13 | R4 个人主页展示 | 警惕展示与措辞边界 | **E2E** | 夹具 | 注入 `watch` / 55 → 「路线完成度 55% · 请留意行程完成情况」；无「骗子」「危险用户」「不可信」 |
| A14 | R4 个人主页展示 | 数据不足展示 | **E2E** | 真实数据 | 真态：只显示「暂无足够完成记录」；不显示 0% / 任何百分比 / 信誉标签 |
| A15 | R4 个人主页展示 | 本人 / 他人同口径 | **API + E2E** | — | API 两侧响应字段一致；E2E 本人主页与他人主页文案一致，无编辑 / 隐藏开关 |
| A16 | R5 独立性 | 与信用分独立 | **API** | 数据完整性 | `credit_score` / `credit_level` / `credit_restricted` 与基线一致；读取前后 `credit_ledger` 行数不变 |
| A17 | R5 独立性 | 与资料统计、成长等级独立 | **API** | 契约 | `stats` 四项不变；响应与 `UserProfile` schema 不含 LV1–LV5 字段 |
| A18 | R6 兼容与访问控制 | 既有访问控制与兼容 | **API** | 安全 / 回归 | 未登录 401（`DEMO_USER_REQUIRED` / 会话无效）、未知用户 404（`USER_NOT_FOUND`）不变；旧前端在 `rate` 缺失下正常解析 |

**汇总：** API 5 条（A1 / A2 / A16 / A17 / A18）｜E2E 6 条（A9–A14）｜API + E2E 1 条（A15）｜Defer UT 6 条（A3–A8）；去重合计 **18 条**，与 Delta 18 Scenario 一一对应。

**Deferred to `/sdd:atdd-apply`（unit-level TDD）：** 派生纯函数（样本门槛 + 四档阈值 + 非法值）、未来聚合输入过滤器（仅 `completed`）、前端 `state` → i18n 文案映射与百分比格式化、A9 的前端源码静态断言。

## 2. 在生产代码前先写的验收检查

1. **契约（最先）**
   - `OpenApiTest`：`UserProfile` 新增 `route_completion_state`（入 `required`）与 `route_completion_rate`（可空、不入 `required`）；`info.version` 顺延为 `0.27.0`（P3 排他确认）；示例覆盖「数据不足省略 rate」。

2. **API（先红）**
   - `UserProfileRouteCompletionApiTest`（新增，或并入既有 `UserProfileApiTest`）：
     - A1 / A2：本人与他人资料均含 `route_completion_state = "insufficient"`，JSON **无** `route_completion_rate` 键；含已结束行程的种子用户同样如此。
     - A15：同一用户分别以本人和他人身份读取，两字段完全一致。
     - A16：响应信用字段与基线一致；读取前后 `credit_ledger` 计数不变。
     - A17：`stats` 四项不变；响应 JSON 不含 `growth_level` / `lv` 类字段。
     - A18：缺 `X-User-Id` → 既有未登录码；未知 id → `USER_NOT_FOUND`。
   - `UserProfileRouteCompletionMigrationSqliteTest`（反向）：全新库迁移头仍为 `V31`；`app_users` 列集合与 `trip_plans` 状态枚举不变；无 `route_completion*` 表 / 列。

3. **单元（先红，apply 阶段）**
   - 后端 `RouteCompletionStateTest`：A3–A8（80 / 100 / 79 / 70 / 69 / 0 / null / 非整数 / -1 / 101；样本 0 与 ≥1；仅 `completed` 计入）。
   - 前端 `routeCompletionDisplay.test.ts`：`state` → 文案键映射（`good` / `watch` 带标签、`neutral` 纯百分比、`insufficient` 固定文案）；缺失或 `null` 的 `rate` 一律按数据不足处理。

4. **E2E（先红）**
   - `e2e/tests/route-completion.spec.ts`：
     - A14 真态：本人主页与他人主页均显示「暂无足够完成记录」，无百分比。
     - A11 / A12 / A13：`page.route('**/api/users/*/profile')` + `fulfill` 注入 `good` / `neutral` / `watch`，断言三段文案与禁用措辞。
     - A10：资料弹窗、行程卡、行程详情页、首页列表不出现「路线完成度」。
     - A9：四态文案只随 `state` 变化（同一 `rate` 不同 `state` 时文案以 `state` 为准）。
   - 复用既有 `page.route` 范式（见 `ai-planner.spec.ts`、`admin.spec.ts`）。

## 3. 本地与 CI 门禁

| 层 | 命令 | 备注 |
|---|---|---|
| 后端 | `cd RouteME/backend; .\mvnw.cmd -B -ntp verify` | 与 CI 一致 |
| 前端 | `cd RouteME/frontend; npm run typecheck; npm run build; npm test` | 与 CI 的 `build && test` 对齐 |
| E2E | `cd RouteME/e2e; npx playwright test tests/route-completion.spec.ts` | **不在 CI**（既有惯例）；P4 本地跑该 spec + 受影响回归 |
| 规格 | `openspec validate add-route-completion --strict` | 每次改 Delta 后 |
| 契约 | `npx @redocly/cli lint openapi.yaml`（`RouteME/redocly.yaml`） | 本地可选 |

## 4. 数据 / 夹具策略

- **API**：沿用既有种子用户；额外选一个已有 `completed` 行程的种子用户锁定「本期仍为数据不足」；账本断言用 `JdbcTemplate` 计数，不写业务数据。
- **E2E 真态**：沿用「全新 SQLite + 独立后端端口」；本 change 不写库，无需清理。
- **E2E 模拟态**：`page.route` 拦截 `GET /api/users/{id}/profile` 并 `fulfill` 三档响应；仅放行两字段，其余字段透传真实响应（先 `route.fetch()` 再改写 JSON），避免夹具漂移。
- **契约**：`OpenApiTest` 断言字段集合，不依赖示例字符串顺序。

## 5. Non-goals 反向验证

| Non-goal（提案 Out of scope） | 反向用例 | Layer |
|---|---|---|
| 人工打卡 / 位置校验 / 单行程计算 / 聚合算法 | API：无打卡 / 聚合端点（请求 404）；迁移测试：无新表 / 新列 | API |
| 数据库表、迁移、写入端点 | 迁移测试：头仍为 `V31`；`PATCH /api/users/{id}/profile` 不接受两字段（传了也不生效） | API |
| 推荐列表 / 资料弹窗 / 行程卡 / 详情 / 列表展示 | E2E：这些界面无「路线完成度」文本 | E2E |
| 修改信用分（`user-credit`） | API：信用字段不变；`credit_ledger` 无新增行 | API |
| 修改资料统计（`stats`）与成长等级（LV1–LV5） | API：`stats` 不变；响应不含成长等级字段 | API |
| 通知 / 推送 / 邮件 / 举报封禁联动 | E2E：流程中无通知中心或封禁提示变化 | E2E |
| 重建同行者推荐 / 匹配引擎 | API：`/api/recommendations*` 与匹配端点仍为 404 | API |

## 6. NFR 测试

**不在本 change 范围**（用户 2026-11-18 裁决，沿用 `add-credit-account` / `add-credit-recovery` 惯例）。P4 只在验证报告记录两条结构事实：资料读取不新增查询（两字段由既有装配计算）、无新增表 / 迁移。

## 7. Non-goals（本技能）

- 不写业务实现与测试代码（属 `/sdd:atdd-apply`）；不展开 UT 套件设计；不生成 Playwright / POM / Excel 生成器；不新建 CI 语义。
