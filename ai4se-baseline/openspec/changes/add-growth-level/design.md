# 技术设计 — add-growth-level（P3）

- **Change：** `add-growth-level`（REQ-031 / S32；`user-growth` ADDED）｜ **阶段：** P3 ｜ **日期：** 2026-11-18
- **输入：** Delta（9 Requirement / 41 Scenario）、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)（C1 / C2）、[`atdd-design.md`](atdd-design.md)、原型 `docs/prototype/growth-level.html`
- **基线：** `origin/main@f2bad40`（契约 0.26.0 / 迁移头 `V31__report_credit_deduction.sql`）

## 决策总览

| # | 决策 | 结论 |
|---|---|---|
| D1 | 数据模型 | 新建 `user_growth_account` + `growth_exp_ledger`；不改信用表 |
| D2 | 等级派生 | 服务端纯函数派生，不落库 |
| D3 | 结算入口 | 单一 `GrowthService.book`；幂等键唯一约束 + 账户条件更新 |
| D4 | 事件挂接与事务边界 | 发布 / 点赞 / 举报成立三处**同事务**结算（G1 WARNING 收口） |
| D5 | 每日上限 | 当日正向实发求和，剩余额度截断；零实发也留流水 |
| D6 | 举报重复处理（G1 C1） | 沿用 `ReportNotProcessingException`（409），至多扣一次 |
| D7 | 契约形态 | `/profile` 追加 `growth`；新增 `GET /users/growth?ids=`（仅 level）；版本 0.27.0 |
| D8 | 字段级可见性（G1 C2） | 按 caller 分支：本人含经验，他人仅 level，批量仅 level |
| D9 | 配置 | `routeme.growth.publish-exp` 默认 10 |
| D10 | 前端展示 | `GrowthBadge` + 纯函数，6 处接入；样式令牌与原型一致 |
| D11 | 迁移 | `V32__add_growth_level.sql`，建表 + 存量 0 账户回填 |
| D12 | 并发 | 幂等键兜底 + 乐观条件更新；SQLite 单写者串行 |
| D13 | 日志 | 结算 INFO / 异常 WARN；不新增指标（NFR 不纳入） |
| D14 | 测试门禁 | 按 `atdd-design.md`（后端 verify / 前端 test+build / E2E / Redocly / OpenSpec） |

## D1 数据模型

**背景：** 成长等级与信用分必须彻底分离（issue 技术边界；D1 用户裁决）。信用侧已有 `user_credit_account` + `credit_ledger` 的 append-only 范式。

**选择：** 新建两张表（`V32__add_growth_level.sql`）：

- `user_growth_account`：`user_id`（PK）、`exp_total`（INT NOT NULL，≥0）、`created_at`、`updated_at`。
- `growth_exp_ledger`：`id`（PK）、`user_id`、`reason_code`（`EXPERIENCE_PUBLISH` / `EXPERIENCE_LIKE` / `REPORT_VIOLATION`）、`applied_delta`（实发，可正可负可 0）、`exp_before`、`exp_after`、`related_type`（`TRIP` / `EXPERIENCE` / `REPORT`）、`related_id`、`idempotency_key`（UNIQUE）、`occurred_at`（ISO-8601 字符串，与 `credit_ledger` 一致）。
- 索引：`idx_growth_ledger_user_time(user_id, occurred_at)`；唯一索引 `uk_growth_ledger_idem(idempotency_key)`。

**被拒方案：** 复用信用表 / 账本（污染「可信 / 风险」语义，且信用侧已有档位逻辑）；等级单独落库（回退时需同步多列，易漂移）。

## D2 等级派生（不落库）

**背景：** LV1–LV5、每 100 EXP 一级、LV5 后继续累计、扣经验回退。

**选择：** `GrowthLevel` 纯函数：`levelOf(exp)`（0–99 → 1 … 400+ → 5）、`expToNext(exp)`（LV5 返回 `null`，前端显示「已满级 / 400+」）。读取时实时派生，不存 `level` 列。

**被拒方案：** 账户表存 `level` 列（扣减回退需双写一致；迁移期历史值无意义）。

## D3 结算入口与不变量

**背景：** 三类事件都要写流水并更新账户；并发 / 重试必须至多一次。

**选择：** 单一入口 `GrowthService.book(GrowthBooking)`（同事务）：

1. 幂等键先查（快速路径）→ 命中直接返回既有结果（no-op）。
2. 懒建账户（`INSERT OR IGNORE`，0 EXP）。
3. 计算 `applied_delta`（上限截断 / 最低 0 / 配置值）。
4. `INSERT growth_exp_ledger`（唯一键冲突 → 视为已结算，捕获后返回）。
5. `UPDATE user_growth_account SET exp_total = exp_total + :applied WHERE user_id = :id AND exp_total = :before`（乐观条件更新；不匹配则重读重算，最多 3 次）。
6. 断言 `exp_before + applied_delta = exp_after` 且 `exp_after >= 0`。

**被拒方案：** 悲观行锁（SQLite 无 `SELECT FOR UPDATE`）；JVM 全局锁（多实例失效）。

## D4 事件挂接与事务边界（G1 WARNING 收口）

**背景：** 提案评审 WARNING：发布 / 点赞 / 举报结算与业务事件的事务边界未定。

**选择（同事务）：**

| 事件 | 挂接点 | 幂等键 |
|---|---|---|
| 发布 | `ExperienceServiceImpl.upsert` 的 `created = true` 分支 | `GROWTH_PUBLISH:{tripId}:{authorId}` |
| 点赞 | `ExperienceLikeServiceImpl.like` 的 `created = true` 分支 | `GROWTH_LIKE:{experienceId}:{tier}`（tier = 10/20/…） |
| 举报成立 | `AdminReportServiceImpl.resolve` 的 `RESOLVED` 分支（在既有扣信用分之后） | `GROWTH_REPORT:{reportId}` |

- 结算异常 → 整个业务操作回滚（发布失败 / 点赞失败 / 处置失败），不出现「经验已发但业务未成」。
- #29 已并入 main：`AdminReportServiceImpl.resolve` 先扣信用分（既有），再追加成长结算；两者各自独立账本，互不读写。
- **被拒方案：** 事件后异步结算（无 MQ；进程内异步会丢事件）；失败不阻断 + 补偿扫描（审计与补偿成本高，本期不做）。

## D5 每日上限

**选择：** 当日正向实发和 = `SUM(applied_delta)`，条件 `user_id = ? AND applied_delta > 0 AND reason_code IN ('EXPERIENCE_PUBLISH','EXPERIENCE_LIKE') AND occurred_at >= :dayStart`；`dayStart = LocalDate.now(Asia/Shanghai).atStartOfDay(zone)`。`applied = max(0, min(nominal, 20 - used))`。

- 档位幂等：先写流水（唯一键）再判断上限 → 被截断档位不补发；`applied = 0` 也写一条流水。
- 负向扣减不查上限。
- 常量 20 与 zone 集中在 `GrowthPolicy`（与 `CreditPolicy` 同风格）；OQ-7（受限用户点赞是否计入）沿用 `experience_likes` 行口径，不在本期改变。

## D6 举报重复处理（G1 C1 收口）

**背景：** P1 评审 WARNING：重复处理已 `RESOLVED` 举报的响应形态未定。

**选择：** 沿用既有 `AdminReportServiceImpl.resolve` 行为——状态非 `PROCESSING` 直接抛 `ReportNotProcessingException`（409），在成长结算之前发生，因此不会产生第二次扣减。Delta 只约束「至多扣一次」；E2E 断言「重复处置后经验不变」，不承诺 200。

**被拒方案：** 静默 no-op（改变既有 API 语义，影响管理端与 #29 已交付行为）。

## D7 契约形态（0.27.0）

**选择：**

- `GET /api/users/{userId}/profile`（既有）：响应追加可空对象 `growth`：
  - 本人：`{"level":3,"exp":240,"exp_to_next":60,"max_level":false}`
  - 他人：`{"level":3}`（其余字段省略，`@JsonInclude(NON_NULL)`）
- 新增 `GET /api/users/growth?ids=1,2,3`（镜像 `/credits` 的批量范式）：`[{"user_id":1,"level":3}]`；`ids` 上限 50；缺 `ids` → `InvalidInputException`；不返回经验。
- 不新增任何写端点。
- `openapi.yaml` 升 **0.27.0**；`OpenApiTest` 版本断言同步。

**被拒方案（用户裁决）：** 扩展 `/users/credits` 追加 `growthLevel`（污染信用语义、双语义字段）。

## D8 字段级可见性（G1 C2 收口）

**选择：** `UserProfileController.profile` 把 `callerId` 传入 `UserProfileService.read`；响应组装时 `callerId == userId` 才填 `exp` / `exp_to_next` / `max_level`。批量端点固定只返回 `user_id + level`。前端不得从其他字段推断经验值。E2E / API 断言「他人响应中不存在 `exp` 键」。

**被拒方案：** 客户端按 `level` 反推经验（泄漏 + 不一致）；两套端点（本人 / 他人）分拆（路由与鉴权重复）。

## D9 配置

**选择：** `GrowthProperties(@ConfigurationProperties(prefix = "routeme.growth"))`，字段 `int publishExp` 默认 10（≤0 回退默认并 WARN）；`application.yaml` 的 `routeme:` 下新增 `growth: publish-exp: 10`；无管理端。

## D10 前端展示

**选择：**

- 纯函数 `growth.ts`：`levelLabel(level)` → `LVn`；`expProgress(exp)` → `{level, current, next, percent, maxLevel}`。
- 组件 `GrowthBadge`：`level`（与他人可见）+ 可选 `progress`（仅本人）；样式类 `.growth-pill` / `.gp-track` 与 `docs/prototype/growth-level.html` 一致，颜色只用 `styles.css` 令牌（`--lagoon` / `--lagoon-soft` / `--jade`）。
- 接入 6 处：`ProfilePage`（header + 本人进度块）、`ProfileModal`（本人 / 他人分支）、`TripDetailPage` 发布者区、`TripCard` meta、`ApplicationsPage` 申请者行、`CompanionCard` 卡片本体。
- 列表批量：`useGrowthLevels(ids)` 一次 `GET /users/growth?ids=`；个人主页用 `/profile.growth`。
- i18n：新增 `growthLevel` / `growthExp` / `growthToNext` / `growthMaxLevel` 文案（与信用分文案分开）。
- 视觉基准：`docs/prototype/growth-level.html`；P4 实现后按 1440 / 1024 / 768 / 390 × 浅 / 深色对照走查。

## D11 迁移

**选择：** `V32__add_growth_level.sql`：建两表 + 索引 + 存量回填：

```sql
INSERT OR IGNORE INTO user_growth_account (user_id, exp_total, created_at, updated_at)
SELECT id, 0, :now, :now FROM app_users;
```

不回填发布 / 点赞 / 举报；新用户懒建。H2 兼容（`INSERT OR IGNORE` → H2 用 `MERGE` 或测试侧禁用回填；实现时以 Flyway 方言兼容写法处理，P4 验证双引擎）。

## D12 并发

**选择：** 唯一键兜底 + 乐观条件更新（D3）；SQLite 单写者串行写入，H2 并发测试用 `CountDownLatch` 验证「至多一次」。冲突异常映射：`DuplicateKeyException` → 视为已结算。

## D13 日志

**选择：** 结算成功 INFO（`user_id` / `reason_code` / `applied_delta` / `idempotency_key`）；幂等命中 DEBUG；异常 WARN（含键）。不新增 metrics / tracing（NFR 不纳入）。

## D14 测试门禁

见 [`atdd-design.md`](atdd-design.md) §3：后端 `.\mvnw.cmd -B verify`、前端 `npm run typecheck` + `npm test` + `npm run build`、E2E 独立库 + `ROUTEME_E2E_BASE_URL`、Redocly 0 error、`openspec validate --strict` valid。

## 残余风险

| 风险 | 缓解 |
|---|---|
| 同事务结算给发布 / 点赞 / 举报增加失败点 | 幂等 + 可重试；P4 回归 #29 既有举报测试与体验 / 点赞套件 |
| SQLite 与 H2 对 `INSERT OR IGNORE` 方言差异 | P4 双引擎跑 Flyway；必要时迁移拆方言分支或测试库改用 SQLite |
| 每日上限跨时区误解 | 统一 `Asia/Shanghai`；`D-5` 断言 UTC 16:00 日界 |
| 6 处展示面视觉漂移 | 原型先行 + P4 四档宽度 / 双主题走查；E2E 断言文案 |
| 契约字段命名与前端类型漂移 | `types.ts` 与 `openapi.yaml` 同批改；`OpenApiTest` 版本断言 |
