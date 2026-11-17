# 任务：add-credit-account

- **依据：** [`specs/user-credit/spec.md`](specs/user-credit/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** Lewis Liu（当前开发者）｜ **协助：** Jay（design 第二签署）、Neal（tasks 第二签署 / P4 独立验证）
- **顺序：** T1 → T2 → T3 → T4 → T5 → T8 → T9；T6 可与 T4/T5 并行，T7 依赖 T6。T10 在 T9 之后。
- **契约：** `0.12.0`；`UserProfile` 新增 `credit_score` / `credit_level` 且进 `required`；`OpenApiTest` 为门禁。
- **迁移：** `V18__add_credit_account.sql`（建两表 + 回填 `app_users` 全表 80）。
- **视觉基准：** `docs/prototype/ui.js` `profileModal`、`docs/prototype/styles.css` `.profile-credit`（已先行更新）；不改原型的其他区域。

## 任务清单

### T1 [contract] 契约 0.12.0

- [ ] `openapi.yaml`：`info.version` → `0.12.0`；`UserProfile.required` 增 `credit_score` / `credit_level`。
- [ ] `UserProfile.properties` 增 `credit_score`（integer，0–100，readOnly）与 `credit_level`（string，enum `excellent/good/fair/low/risk`，readOnly）。
- [ ] 示例补一组 `credit_score: 80` / `credit_level: good`。
- [ ] `OpenApiTest`：断言两字段存在、`required` 包含、enum 集合精确匹配。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=OpenApiTest test`
**覆盖：** R4-4、R5-2、`@rule:api-contract`

### T2 [backend] 迁移 V18

- [ ] 新增 `V18__add_credit_account.sql`：`user_credit_account`（`score` CHECK 0–100）、`credit_ledger`（前后分数 CHECK + 等式 CHECK + 幂等唯一索引 + `(user_id, occurred_at)` 索引）。
- [ ] 同一迁移内回填：`INSERT OR IGNORE ... SELECT id, 80, strftime(...) FROM app_users`（含无登录凭据的 `id 4`）。
- [ ] 新增 `CreditMigrationSqliteTest`（先 red）：全新库 V1–V18 建表；旧库升级后 `id 1–4` 均为 80；`app_users` 列集合不变。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditMigrationSqliteTest test`
**覆盖：** R1-3、R1-4、`@rule:api-contract`

### T3 [backend] 信用账户与记账服务

- [ ] 新增 `entity/UserCreditAccountEntity`、`entity/CreditLedgerEntity`（账户 `IdType.INPUT`，账本 `IdType.AUTO`）。
- [ ] 新增 `mapper/UserCreditAccountMapper`、`mapper/CreditLedgerMapper`。
- [ ] 新增 `enums/CreditLevel`（`ofScore` 唯一派生入口）与 `pojo/UserCredit`。
- [ ] 新增 `service/CreditService` + `impl/CreditServiceImpl`：`read` / `ensureAccount`（`INSERT OR IGNORE`）/ `book`（裁断 + 实际生效量 + 同事务写账本 + 幂等冲突返回当前值）。
- [ ] 新增 `CreditServiceImplTest`（先 red）：上下界、零值留痕、等式、幂等键、区间不变量。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditServiceImplTest test`
**覆盖：** R2-1 ~ R2-3、R6-1 ~ R6-4、D2–D4

### T4 [backend] 注册初始化信用账户

- [ ] `AuthServiceImpl.register` 在既有 `@Transactional` 内调用 `CreditService.ensureAccount(user.id())`。
- [ ] 新增 `CreditAccountInitApiTest`（先 red）：注册成功 → 主页 80 / good；重名与非法输入 → `user_credit_account` 计数不变。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp -Dtest=CreditAccountInitApiTest test`
**覆盖：** R1-1、R1-2、D5

### T5 [backend] 个人主页响应集成

- [ ] `UserProfile` 增加 `credit` 承载；`UserProfileServiceImpl.read` 与 `save` 均拼接信用值（save 返回体不能缺字段）。
- [ ] `UserProfileResponse` 增 `creditScore` / `creditLevel` 两个非空字段，`from(...)` 同步。
- [ ] 新增 `CreditProfileApiTest`（本人 / 他人均含两键、旧账号回填）、`CreditBoundaryApiTest`（十档边界）、`CreditReadOnlyApiTest`（`PUT /api/users/me/credit` → 404；资料请求携带 `credit_score` 不改分），均先 red。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -ntp test`
**覆盖：** R1-3、R1-4、R3-1、R5-1、R5-2、D6–D7

### T6 [frontend] 类型与纯函数

- [ ] `types.ts`：新增 `CreditLevel` 联合类型；`UserProfile` 增 `credit_score: number`、`credit_level: CreditLevel`。
- [ ] 新增 `profile/creditDisplay.ts`：`creditLabel` / `creditTone` / `creditLine`，对未知 code 与越界分数做回退。
- [ ] `tripMessages.ts`：五个等级文案 + 「信用分」前缀。
- [ ] 新增 `creditDisplay.test.ts`（五档映射、回退、整串格式）。

**验证：** `cd RouteME/frontend; npm run typecheck && npm test`
**覆盖：** R3-2、R4-4、D10–D11

### T7 [frontend] 个人主页展示

- [ ] `ProfilePage.tsx`：`.profile-hero-meta` 之后渲染 `<p className="profile-credit is-*">{creditLine(...)}</p>`。
- [ ] `styles.css`：`.profile-credit` + 五个 `is-*` 低饱和色阶（`--t-jade` / `--t-lagoon` / `--t-warn` / `--t-coral` / `--t-danger`），圆角 `var(--r-sm)`。
- [ ] 走查 1440 / 768 / 390 × 浅色 / 深色：不溢出、不只靠颜色、资料未完善时同位置展示。

**验证：** `cd RouteME/frontend; npm run typecheck && npm run build`
**覆盖：** R4-1、R4-3、R4-4、D9–D10

### T8 [tests] E2E 验收与反向用例

- [ ] 新增 `RouteME/e2e/tests/credit.spec.ts`：注册 → 主页「信用分：80 / 100 · 信用良好」；他人视角同值；刷新一致；资料未完善仍展示。
- [ ] 反向用例：无「明细 / 历史」入口；无 admin 路由与排序/筛选控件；首页卡片与资料弹窗无信用信息。
- [ ] 夹具：时间戳唯一用户名；存量账号用 `linjianxia / 123456`（`id 1`）与 `id 4`。

**验证：** `cd RouteME/e2e; npx playwright test tests/credit.spec.ts`
**覆盖：** R4-1 ~ R4-5、R7-1、R7-2、ATDD §5

### T9 [verify] 回归验证

- [ ] 后端全量 `./mvnw -B -ntp verify`。
- [ ] 前端 `npm run typecheck && npm run build && npm test`。
- [ ] E2E 全量 `npx playwright test`（全新库 + 独立端口）。
- [ ] `openspec validate add-credit-account --strict`；Redocly lint（本地）。

**验证：** 上述命令逐条执行并在 P4 验证报告贴输出摘要
**覆盖：** 全部 Scenario 的回归门禁

### T10 [docs] 文档收口

- [ ] `docs/knowledge/interfaces/README.md`：登记 `UserProfile` 新增两字段。
- [ ] `docs/sdd/add-credit-account/p3-design.md`（本轮）与 `p4-verify.md`（P4）。
- [ ] `registry.md` 状态更新与 `docs/sdd/README.md` P4 列（P4 完成后）。

**验证：** 人工核对字段名与链接
**覆盖：** `@rule:documentation-conventions`

## 层与顺序约束

- **契约 / 迁移先于两端：** T1 → T2 必须先于 T3–T8。
- **后端先于前端联调：** T5 完成后 T7 才能拿到真实字段（T6 可并行）。
- **E2E 最后接入：** T8 依赖 T5 + T7；T9 只做回归与证据。
- **零后端事件端点：** 不为未来的计分事件预留空壳接口。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查项 | 结果 | 证据 |
|---|---|---|
| Spec 22 Scenario 均有落点 | Pass | ATDD §1 覆盖 22/22（API 8 / 仅 E2E 7 / Defer UT 7，R1-1 与 R3-2 双层） |
| 每个 Scenario 至少一个任务承接 | Pass | R1-1→T4+T8；R1-2→T4；R1-3→T2+T5；R1-4→T5；R2-*→T3；R3-1→T5；R3-2→T5+T8；R4-*→T7+T8；R5-1/R5-2→T5；R6-*→T3；R7-*→T8 |
| Design 决策均有任务落点 | Pass | D1/D8→T2；D2/D3/D4→T3；D5→T4；D6/D7→T1+T5；D9/D10/D11/D12→T6+T7 |
| Tasks 不越过 Spec | Pass | 无「管理端」「计分事件」「明细页」任务；`app_users` 不改 |
| ATDD 层次与任务一致 | Pass | API 用例落在 T4/T5；E2E 落在 T8；UT 落在 T3/T6（apply 时补充） |
| 最后一项为回归验证 | Pass | T9 = verify；T10 仅文档 |
| 契约 / 迁移先于两端 | Pass | T1、T2 位于 T3–T8 之前 |

**自检结论：Pass。** 可进入 P4（`/sdd:atdd-apply`，从 T1 的契约用例与 T3 的红态单测开始）。
