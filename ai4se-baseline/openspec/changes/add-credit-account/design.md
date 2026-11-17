# 技术设计 — add-credit-account

- **Change：** `add-credit-account`（REQ-019 / S19）｜ **阶段：** P3
- **输入：** `specs/user-credit/spec.md`（7 Requirement / 22 Scenario）、`atdd-design.md`、`proposal.md`、`g1-decision.md`
- **约束：** 契约 `0.14.0`、迁移 `V20__add_credit_account.sql`（0.12.0 + V18 归 `add-experience-photos`，0.13.0 + V19 归 `add-trip-cancel`；本 change 顺延）；NFR 不纳入
- **原型：** `docs/prototype/ui.js` `profileModal` + `styles.css` `.profile-credit`（已先行）

## 决策总览

| # | 决策 | 选择 | 放弃的备选与理由 |
|---|---|---|---|
| D1 | 数据模型 | `user_credit_account`（`user_id` 主键、`score` 0–100 CHECK）+ `credit_ledger`（append-only，含前后快照与幂等键） | ① 在 `app_users` 加分数列：与「分数唯一真相」冲突，写路径容易分叉；② 只建账本、分数实时 SUM：读取成本高且需要全量重算，MVP 不需要 |
| D2 | 记账入口 | 唯一内部服务 `CreditService.book(...)`；账户更新与账本插入同一 `@Transactional` | 直接在业务服务里改两表：分散后无法保证等式与幂等 |
| D3 | 越界与零值 | 先裁断到 0–100，`applied_delta = after - before`；`applied_delta = 0` 仍写一条记录 | ① 全裁断不记账：与「每次变化留痕」冲突（D11 已裁决）；② 记录理论值：等式不成立 |
| D4 | 缺失账户 | 读路径 `ensureAccount`（`INSERT OR IGNORE` 初始 80）后再读 | 读不到返回 80 但不落库：留下「有用户无账户」的半状态，破坏不变量 |
| D5 | 注册集成 | `AuthServiceImpl.register` 在既有事务内调用 `CreditService.ensureAccount` | 注册后异步建账户：失败会永久缺账户，且无法断言「注册失败不留账户」 |
| D6 | 等级派生 | 后端 `CreditLevel` 枚举（`excellent/good/fair/low/risk` + `minScore`）在读取时派生；前端只做 code → 中文/色阶映射 | ① 等级落库：分数与等级会漂移；② 前端算阈值：前后端两套阈值，改区间要同步两处（D10 已否决） |
| D7 | 契约 | `openapi.yaml` → `0.14.0`；`UserProfile` 新增 `credit_score`（int）与 `credit_level`（enum），两者加入 `required` | 独立信用端点：多一次往返、多一个加载态（D7 已否决） |
| D8 | 迁移 | `V20__add_credit_account.sql`：建两表 + 回填 `app_users` 全表 80（含无登录凭据的 `id 4`） | 分两次迁移（建表 / 回填）：中途失败会留下空账户表 |
| D9 | 展示落点 | 个人主页 hero 卡内、`.profile-hero-meta` 下一行：`<p class="profile-credit is-*">信用分：{n} / 100 · {label}</p>` | ① 独立卡：移动端多占一屏；② 徽标嵌昵称：信息密度高易被忽略；③ 并入「关于 TA」：可见性弱（用户已选 hero 内一行） |
| D10 | 五档配色 | 低饱和五档：`is-excellent` 松石绿 / `is-good` 深海青 / `is-fair` 琥珀 / `is-low` 珊瑚 / `is-risk` 砖红；始终与分数+文字同现 | 中性单色：扫读性差；只靠颜色：违反「不能仅用颜色表示等级」 |
| D11 | 前端结构 | 新增纯逻辑 `profile/creditDisplay.ts`（含文案拼装与色阶派生），`ProfilePage` 只负责渲染 | 直接在组件内写 if/else：无法在 node 环境单测 |
| D12 | 单次请求 | 沿用 `loadUserProfile` 一次取全量；不新增请求 | 并行第二请求：多一个加载态与失败分支 |

## 1. 数据库（V20）

```sql
CREATE TABLE user_credit_account (
  user_id BIGINT NOT NULL PRIMARY KEY,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  created_at VARCHAR(40) NOT NULL,
  updated_at VARCHAR(40) NOT NULL
);

CREATE TABLE credit_ledger (
  id INTEGER NOT NULL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  reason_code VARCHAR(40) NOT NULL,
  applied_delta INTEGER NOT NULL,
  score_before INTEGER NOT NULL CHECK (score_before BETWEEN 0 AND 100),
  score_after INTEGER NOT NULL CHECK (score_after BETWEEN 0 AND 100),
  related_type VARCHAR(40),
  related_id VARCHAR(64),
  idempotency_key VARCHAR(120),
  occurred_at VARCHAR(40) NOT NULL,
  CHECK (score_after = score_before + applied_delta)
);

CREATE UNIQUE INDEX ux_credit_ledger_idempotency
  ON credit_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX ix_credit_ledger_user_time ON credit_ledger(user_id, occurred_at);

INSERT OR IGNORE INTO user_credit_account (user_id, score, created_at, updated_at)
SELECT id, 80, strftime('%Y-%m-%dT%H:%M:%SZ','now'), strftime('%Y-%m-%dT%H:%M:%SZ','now')
FROM app_users;
```

- 时间统一 UTC ISO-8601（与 `auth_sessions` 一致）。
- `reason_code` 预留集合：`EXPERIENCE_LIKE`、`LEAVE_TRIP`、`REPORT_UPHELD`、`SYSTEM_ADJUST`（本切片无业务事件，仅单测使用）。
- **不改** `app_users`。

## 2. 后端结构

| 层 | 新增 / 改动 | 说明 |
|---|---|---|
| `entity/` | `UserCreditAccountEntity`、`CreditLedgerEntity` | MyBatis-Plus；账户表 `@TableId(type = IdType.INPUT)`，账本表 `IdType.AUTO` |
| `mapper/` | `UserCreditAccountMapper`、`CreditLedgerMapper` | 继承既有 `BaseMapper` |
| `pojo/` | `UserCredit`（`userId` / `score` / `level`） | 领域只读记录 |
| `enums/` | `CreditLevel`（`excellent` 90 / `good` 80 / `fair` 60 / `low` 30 / `risk` 0） | `ofScore(int)` 唯一派生入口 |
| `service/` | `CreditService`：`read(userId)`、`ensureAccount(userId)`、`book(command)` | `book` 为 `@Transactional`；`book` 返回 `UserCredit` |
| `service/impl/` | `CreditServiceImpl` | 依赖两个 mapper + `Clock` |
| 集成 | `AuthServiceImpl.register`、`UserProfileServiceImpl.read/save`、`UserProfileResponse` | 注册建账户；读资料拼接 `credit_score` / `credit_level` |

`book(userId, reasonCode, theoreticalDelta, relatedType, relatedId, idempotencyKey)` 流程：

1. `ensureAccount`（不存在则建 80）并读取当前分数；
2. `after = clamp(before + theoreticalDelta, 0, 100)`，`applied = after - before`；
3. 插入 `credit_ledger`（`applied` 可为 0）；幂等键冲突 → 直接返回当前 `UserCredit`（不重复扣加）；
4. 更新 `user_credit_account`（`score`、`updated_at`）；
5. 返回 `UserCredit`。

> 事务边界：3 与 4 在同一个 `@Transactional` 内；唯一索引是幂等的最终保障。

## 3. 契约（0.14.0）

`components.schemas.UserProfile`：

```yaml
required: [id, nickname, avatar_initial, interests, profile_complete, credit_score, credit_level]
properties:
  credit_score: { type: integer, minimum: 0, maximum: 100, readOnly: true,
                  description: 当前信用分，0–100；任意视角均返回 }
  credit_level: { type: string, readOnly: true,
                  enum: [excellent, good, fair, low, risk],
                  description: 由分数实时派生；excellent 90–100 / good 80–89 / fair 60–79 / low 30–59 / risk 0–29 }
```

- 两个字段**非可空**（避开 `@JsonInclude(NON_NULL)` 整键省略）。
- 本人 / 他人同口径；生日仍是唯一视角差异。
- 不新增端点、不新增错误码。

## 4. 前端

| 文件 | 改动 |
|---|---|
| `types.ts` | `UserProfile` 增 `credit_score: number; credit_level: CreditLevel`；导出 `type CreditLevel = 'excellent' \| 'good' \| 'fair' \| 'low' \| 'risk'` |
| `profile/creditDisplay.ts`（新） | `creditTone(level)`、`creditLabel(level)`、`creditLine(score, level)`；对未知 code / 越界分数做回退（clamp + `risk`/`good`） |
| `profile/ProfilePage.tsx` | hero 内 `.profile-hero-meta` 之后渲染一行 `<p className="profile-credit is-*">{creditLine(...)}</p>` |
| `i18n/tripMessages.ts` | 五个等级文案 + `creditPrefix`（「信用分」）；避免在组件里写死中文 |
| `styles.css` | `.profile-credit` + 五个 `is-*` 修饰，复用 `--t-jade/--t-lagoon/--t-warn/--t-coral/--t-danger`，圆角 `var(--r-sm)`、低饱和 `color-mix` 底 |
| 渲染守则 | 分数与文字必须同现；色阶只做辅助；「/ 100」由 `creditLine` 统一拼装 |

## 5. 测试与验证

| 层 | 内容 |
|---|---|
| 后端 API（先红） | `CreditProfileApiTest`、`CreditAccountInitApiTest`、`CreditBoundaryApiTest`、`CreditReadOnlyApiTest`（见 `atdd-design.md` §2） |
| 后端 UT（apply 时） | `CreditServiceImplTest`：上下界、零值留痕、等式、幂等键 |
| 前端 UT | `creditDisplay.test.ts`：五档 code→文案/色阶、越界与未知 code 回退、整串格式 |
| E2E | `e2e/tests/credit.spec.ts`：注册 → 主页展示、他人视角、刷新一致、无明细/无 admin |
| 命令 | 后端 `./mvnw -B -ntp verify`；前端 `npm run typecheck && npm run build && npm test`；E2E `npx playwright test e2e/tests/credit.spec.ts`；`openspec validate add-credit-account --strict` |

## 6. 范围扩展（2026-11-17，G1 r2 追认）

| # | 决策 | 选择 | 放弃的备选与理由 |
|---|---|---|---|
| D13 | 列表面取数 | 新增只读端点 `GET /api/users/credits?ids=1,2,3`（≤50，需 `X-User-Id`），返回 `[{user_id, credit_score, credit_level}]`；缺账户按 80/good 补齐 | ① 扩行程发布者 / 申请者字段：要改两处契约与更多测试；② 逐条拉资料：一页 20 张卡就是 20 个请求 |
| D14 | 展示实现 | 4 个新面复用 `.profile-credit` + `is-compact`；卡片 / 申请页由页面层一次取数后下发，详情页 1 个 id，弹窗直接用 `loadUserProfile` 响应 | 每个组件各自请求：无法保证「当前页一次查询」的规格约束 |
| D15 | 边界 | 聊天页 / 顶栏 / 我的旅行资料卡仍不展示；`C-21` 反向用例覆盖 | — |

- 端点路径 `/api/users/credits` 与既有 `/users/{userId}/profile`、`/users/me/*` 不冲突（无裸 `/users/{userId}` 映射）。
- 前端新增 `profiles/useUserCredits.ts`：对 id 集去重、一次请求、当前页内缓存；失败时静默降级（不展示信用行，不阻断页面）。

## 7. 残余风险

| 风险 | 缓解 |
|---|---|
| 契约 `0.14.0` / `V20` 与后续 change 撞号 | 0.12.0 + V18 已归 `add-experience-photos`、0.13.0 + V19 已归 `add-trip-cancel`；本 change 使用时已顺延并回写；后续 change 继续顺延 |
| 读路径 `ensureAccount` 带来一次写 | 仅首次读取；`INSERT OR IGNORE` 并发安全；迁移已覆盖存量账号，正常情况下不会触发 |
| `credit_level` 码值与前端映射漂移 | 契约 enum + 前端 `CreditLevel` 联合类型 + 契约测试断言码值集合 |
| E2E 不在 CI | 沿用既有残余风险；P4 本地全量回归并记录 |
| 零值记录被统计口径误用 | 后续统计需按 `applied_delta <> 0` 过滤，已写入 `consistency-lint.md` 残余风险 |
