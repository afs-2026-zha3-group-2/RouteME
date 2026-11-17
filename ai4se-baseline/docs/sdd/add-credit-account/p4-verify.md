# P4 实施与验证记录 — add-credit-account

- **Change：** `add-credit-account`（REQ-019 / S19）｜ **阶段：** P4（Apply & verify，本地）
- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者）
- **基点：** `main@8c3ac2c`（P3 已合入 `origin/main`）
- **隔离验证环境：** 后端 `:8090` + `SqlLite/e2e-credit.db`；Vite `:5180`（`ROUTEME_API_TARGET=http://localhost:8090`）

## 1. 实现清单（按任务）

| 任务 | 落点 | 实现要点 |
|---|---|---|
| T1 契约 | `openapi.yaml` | `info.version` 0.14.0；`UserProfile.required` 增 `credit_score` / `credit_level`；enum 五值；`OpenApiTest` 新增契约用例 |
| T2 迁移 | `V20__add_credit_account.sql` | 建 `user_credit_account`（`score` CHECK 0–100）与 `credit_ledger`（等式 CHECK、前后分数 CHECK、幂等唯一索引、`(user_id, occurred_at)` 索引）；`NOT EXISTS` 回填全表 80 |
| T3 后端底座 | `entity/` `mapper/` `enums/CreditLevel` `pojo/UserCredit` `pojo/CreditBooking` `service/CreditService(+Impl)` | 唯一记账入口 `book`：裁断 → 实际生效量 → 账本 + 账户同事务；幂等键重复直接返回当前值；零变化仍写 `applied_delta = 0` |
| T4 注册集成 | `AuthServiceImpl` | 注册事务内 `ensureAccount`；失败分支不落账户 |
| T5 主页响应 | `pojo/UserProfile` `service/impl/UserProfileServiceImpl` `response/UserProfileResponse` | `read` / `save` / `uploadAvatar` 均拼接信用值；响应两字段非空 |
| T6 前端纯函数 | `types.ts` `profile/creditDisplay.ts` `i18n/tripMessages.ts` | `CreditLevel` 联合类型；`creditLabel` / `creditTone` / `creditLine`；未知 code 回退 good、分数夹取 |
| T7 展示 | `ProfilePage.tsx` `styles.css` | hero 卡内 `.profile-hero-meta` 下一行；五档低饱和色阶；不只靠颜色 |
| T8 E2E | `e2e/tests/credit.spec.ts` | 注册 → 展示 / 他人视角 / 刷新一致 / 资料未完善 + 反向（无明细、无 admin、首页无信用分） |
| T9 回归 | 见 §3 | 后端 / 前端 / E2E / 规格 / 契约 |
| T10 文档 | `docs/knowledge/interfaces/README.md`、本文件、`registry.md`、`docs/sdd/README.md` | 字段与状态登记 |

## 2. 偏差记录（相对 tasks.md）

| 任务 | 计划 | 实际 | 原因 |
|---|---|---|---|
| T2 | 回填用 `INSERT OR IGNORE ... strftime(...)`；幂等索引用部分索引 | 普通 `INSERT ... SELECT ... WHERE NOT EXISTS` + 普通唯一索引 + 固定 ISO 时间 | 测试库是 **H2**，不支持 SQLite 的部分索引与 `strftime`；两种引擎必须共用同一组迁移脚本 |
| T3 | 账本 `IdType.AUTO` | `IdType.INPUT` + `AbstractServiceImpl.nextId` 生成 id | H2 的 `INTEGER PRIMARY KEY` 不自增，SQLite 才有 rowid 隐式自增；项目既有惯例就是「最大 id + 1」 |
| T3 单测 | — | 修正一处测试期望（20 → 0 → +15 应得 15，原写 5） | 测试自身算错，非实现缺陷 |

## 3. 验证结果

| 层 | 命令 | 结果 |
|---|---|---|
| 后端 | `.\mvnw.cmd -B -ntp test` | **266 passed / 0 failed**（新增 17：OpenApi 1、迁移 2、记账 6、注册 3、主页/边界/只读 5） |
| 前端 | `npm.cmd run typecheck` | 0 错误 |
| 前端 | `npm.cmd run build` | 成功（仅既有 chunk > 500kB 提示） |
| 前端 | `npm.cmd test` | **36 文件 / 257 tests passed**（新增 `creditDisplay.test.ts` 7 项；`profileDisplay` / `profileForm` 夹具补两字段） |
| E2E 新用例 | `playwright test tests/credit.spec.ts` | **4/4 passed** |
| E2E 全量 | `playwright test`（隔离环境） | **82 passed / 20 failed**；20 条全部为地图相关既有失败（`map.spec.ts` E11–E18 + `trips.spec.ts` 地图用例，均为找不到 `[data-testid="china-map"]` / `city-map`）。`git stash` 去掉本 change 后单跑 `map.spec.ts -g "E11"` **同样失败** → 与本 change 无关 |
| 规格 | `openspec validate add-credit-account --strict` | `Change 'add-credit-account' is valid` |
| 契约 | `OpenApiTest` | 8/8 passed（含新增的两字段、enum、required） |

验证报告：[`docs/ai4se-plugins/20261117-131346-local-verify-report.md`](../../ai4se-plugins/20261117-131346-local-verify-report.md)（Overall **Pass**）

## 4. 视觉走查

| 视口 | 主题 | 展示串 | 横向溢出 | 截图 |
|---|---|---|---|---|
| 1440×900 | 浅色 | 信用分：80 / 100 · 信用良好 | 无 | `preview/credit-1440x900-light.png` |
| 768×900 | 浅色 | 同上 | 无 | `preview/credit-768x900-light.png` |
| 390×844 | 浅色 | 同上 | 无 | `preview/credit-390x844-light.png` |
| 390×844 | 深色 | 同上 | 无 | `preview/credit-390x844-dark.png` |
| 1440×900 | 深色 | 同上 | 无 | `preview/credit-1440x900-dark.png` |

- 信用行位于 hero 内 meta 行下方；390 宽独立成行、不截断；深色下取 `--t-lagoon` 亮色，与卡面对比充足。
- 等级文字 + 圆点同时存在，不依赖颜色单独表达。
- 页面未出现「查看明细 / 信用明细 / 加分记录 / 扣分记录 / 信用历史 / 管理后台」；控制台 0 error / 0 warn。

## 5. 残余风险

| 风险 | 说明 |
|---|---|
| E2E 不在 CI | `ci.yml` 仅后端 verify + 前端 build/test；E2E 只能本地证明 |
| 地图相关 E2E 失败 | 改动前既有债务，归属地图 owner；本 change 未触碰地图代码 |
| 契约 `0.14.0` / `V20` 占用 | 0.12.0 + V18 已归 `add-experience-photos`，0.13.0 + V19 已归 `add-trip-cancel`；本 change 使用时已顺延 |
| 读中含写 | `ensureAccount` 在首次读取时写库；迁移与注册已覆盖绝大多数路径 |
| 零值账本记录 | 后续统计需按 `applied_delta <> 0` 过滤 |

## 6. 后续

- `/sdd:pr-submit` → `phase=ci` → VL（Neal）签署 G2 → P5 归档（按用户指示，暂不归档）。

## 7. 范围扩展复验（2026-11-17，G1 r2）

- **范围：** 展示面 1 → 5（个人主页 / 资料弹窗 / 详情发布者行 / 行程卡发布者行 / 申请处理页申请者行）；Delta 22 → 26 场景。
- **新增端点：** `GET /api/users/credits?ids=...`（≤50，需 `X-User-Id`，缺账户按 80 补齐，去重保序）。
- **前端：** `profiles/useUserCredits.ts` 一次取数；四个展示面复用 `creditDisplay` + `.profile-credit.is-compact`。
- **验证：** 后端 **272**（含 `CreditBatchApiTest` 6 项）/ 前端 257 / `credit.spec.ts` **8/8**；相关回归 `credit+trips+companions+profiles+mine` **48 passed / 11 failed**（均为 `trips.spec.ts` 地图既有失败）。
- **报告：** [`docs/ai4se-plugins/20261117-135600-local-verify-report.md`](../../ai4se-plugins/20261117-135600-local-verify-report.md)（Overall Pass）。
- **G1 追认：** [`g1-decision-r2.md`](../../../openspec/changes/add-credit-account/g1-decision-r2.md)（IO=WAYNE / SA=Jacky，2026-11-17）。

## 8. 契约 / 迁移号顺延（2026-11-17 变基时）

- `origin/main` 已将 **0.12.0 + V18** 给 `add-experience-photos`、**0.13.0 + V19** 给 `add-trip-cancel`，并在 registry 中标注本 change 顺延。
- 本 change 实际使用：**契约 0.14.0 + 迁移 `V20__add_credit_account.sql`**；`CreditMigrationSqliteTest` 的「旧库升级」起点同步改为 **V19**。
- 受影响工件已回写：`openapi.yaml` / `OpenApiTest` / `design.md` / `tasks.md` / `atdd-design.md` / `proposal.md` 风险表 / `registry.md` / `handoff.md`；P1–P2 的历史评审与决策文件作为过程快照保留当时的「在途」表述。
