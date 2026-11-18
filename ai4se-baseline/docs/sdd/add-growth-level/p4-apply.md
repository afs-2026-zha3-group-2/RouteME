# P4 实现与验证记录 — add-growth-level

- **Change：** `add-growth-level`（REQ-033 / S34 用户成长等级 LV1–LV5）｜ **阶段：** P4（`/sdd:atdd-apply`）
- **日期：** 2026-11-18 ｜ **记录人：** Jay（AO）
- **基线：** P3 收口 `origin/main@8108481`（契约 0.26.0 / 迁移头 `V31__report_credit_deduction.sql`）；P4 收口合并 `origin/main@ef23f6cf`（其中 `add-route-completion` 占 0.27.0、`add-loan-interest-penalty` 占 0.28.0 + `V32`、`add-realtime-notifications` 占 0.29.0 + `V33`）后第四次顺延，本 change 落定 **0.30.0 + `V34__add_growth_level.sql`**
- **计划来源：** [`tasks.md`](../../../openspec/changes/add-growth-level/tasks.md) 1.2–1.12；[`design.md`](../../../openspec/changes/add-growth-level/design.md) D1–D14；[`atdd-design.md`](../../../openspec/changes/add-growth-level/atdd-design.md) A1–A26 / E1–E8 / R1–R4

## 1. 执行切片与结果

| 切片 | 内容 | 结果 |
|---|---|---|
| p4-1 | 契约 `0.30.0`：`/profile` 追加 `growth`、新增 `GET /users/growth`；`OpenApiTest` 版本 / 路径 / schema 断言先行 | Pass（`OpenApiTest` 19/19） |
| p4-2 | `V34__add_growth_level.sql`：`user_growth_account` + `growth_exp_ledger`（唯一幂等键 / 等式 CHECK / 查询索引 / 存量 0 回填）；entity / mapper | Pass（`GrowthMigrationSqliteTest` 2/2：fresh + `V31 → V34` 升级） |
| p4-3 | 等级纯函数、结算内核 `GrowthService.book`、`/profile` 读取、批量读取端点 | Pass（A1–A6 / A13–A15 / A19–A21） |
| p4-4 | 三事件同事务挂接：发布 / 点赞分档 / 举报成立 −50 | Pass（A7–A12 / A16–A18；9/9） |
| p4-5 | G1 C2 字段级可见性：本人含经验、他人仅 level、批量仅 level | Pass（`GrowthVisibilityApiTest` 3/3；批量缺参与超限 400 补测） |
| p4-6 | 并发与幂等兜底：同档 / 同举报 / 同发布 8 线程各只结算一次 | Pass（`GrowthConcurrencyTest` 3/3，非事务真实提交 + 按用户清理） |
| p4-7 | 前端 `growth.ts` + `GrowthBadge` + `GrowthProgressBlock` + `useGrowthLevels` + 6 处展示面 + 令牌样式 | Pass（`growth.test.ts` 7/7；合并后 typecheck / 63 文件 552 单测 / build 全绿） |
| p4-8 | E2E `growth-level.spec.ts` + `growthSupport.ts`（注册 / 造已完成行程与体验 / 点赞 / 批量读取 / SQL 种子） | Pass（5/5；E1–E8 + R1–R4） |
| p4-9 | 门禁、P4 记录、台账更新、合并 `origin/main@ef23f6cf`（9 冲突文件 + 第四次顺延改号 / 改迁移）、提交推送 | 本文件（合并后重跑全部门禁；修复 SQLite 唯一键未翻译为 `DuplicateKeyException` 的首次读并发 500；顺带补齐 main 两个通知 schema 的 `type: object` 以保持 lint 0 error） |

## 2. 契约与迁移

- **契约 0.30.0：** `/users/{userId}/profile` 的 `UserProfile` 追加可空只读 `growth`（`type: object` + `nullable` + `allOf: UserGrowth`）；新增 `GET /users/growth?ids=`（上限 50，缺参 / 超限 400，任一 id 不存在 404 `USER_NOT_FOUND`）；新增 `UserGrowth`（level 1–5、exp、exp_to_next、max_level）与 `UserGrowthEntry`（`user_id` + `level`）。
- **迁移 V34：** 两表 append-only；`growth_exp_ledger` 唯一索引 `ux_growth_ledger_idempotency`、查询索引 `ix_growth_ledger_user_time`、等式 CHECK `exp_after = exp_before + applied_delta`、`exp_after >= 0`；存量账户回填 `WHERE NOT EXISTS`、固定时间戳、不补发历史事件。
- **双引擎：** 迁移脚本只用 SQLite / H2 共同语法；SQLite 迁移测试 + H2 Flyway 启动均通过。

## 3. 结算口径落地

| 事件 | 幂等键 | 实发规则 |
|---|---|---|
| 发布已完成行程的体验（首次） | `GROWTH_PUBLISH:{tripId}:{authorId}` | `routeme.growth.publish-exp`，默认 10；编辑 / 重复 / 删除重建不重复 |
| 体验每 10 个有效赞 | `GROWTH_LIKE:{experienceId}:{tier}` | 第 10 / 20 / 30… 档各 +5；同档只结算一次；取消不回滚 |
| 举报成立 | `GROWTH_REPORT:{reportId}` | −50，最低扣到 0；同一举报只扣一次；REJECTED 不扣 |

- **每日上限：** 仅正向事件；按 `Asia/Shanghai` 自然日汇总已有 `applied_delta > 0` 的流水，剩余额度截断；零实发也留流水（`applied_delta = 0`）；负向不受限。
- **并发兜底：** 幂等键先查 → 懒建账户 → 条件更新 `WHERE exp_total = before` → 唯一键冲突视为已结算 → 主键冲突 `id + 1` 重试（≤3 次）；失败删除暂写流水。
- **SQLite 唯一键：** SQLite 的 SQLState 为空、错误码 19，Spring 只抛 `UncategorizedSQLException`（`DataAccessException` 子类，**不是** `DuplicateKeyException`），因此账户懒建与流水写入都按 `DataAccessException` 捕获后重读判定；主键碰撞额外用 `selectById` 区分「并发占用同 id」与其它约束错误。`GrowthServiceImplTest` 2/2 固定该行为。
- **等级派生：** `min(5, max(0, exp) / 100 + 1)`；LV5 返回 `exp_to_next = null`、`max_level = true`；等级不落库。

## 4. 展示面与可见性

- `GET /users/{userId}/profile`：`growth.level` 始终返回；本人额外返回 `exp` / `exp_to_next` / `max_level`；他人响应省略经验字段（NON_NULL）。
- `GET /users/growth`：只返回 `user_id` + `level`；任一 id 不存在 404，不建孤立账户（与 `/credits` 的宽松语义不同，按 Delta R7 / design D13 收口）。
- 前端 6 处：`ProfilePage`（昵称旁徽标 + 本人进度块）、`ProfileModal`（本人进度 / 他人仅徽标）、`TripDetailPage` 发布者区、`TripCard` meta、`ApplicationsPage` 申请者行、`CompanionCard` 同行者卡片；列表均经 `useGrowthLevels(ids)` 单次批量读取。
- 文案与令牌：`profileMessages`（成长经验 / EXP / 距下一级 / 每日上限 / 已满级）与 `tripMessages`（成长等级 / 400+ · 已满级）和信用分文案分开；`.growth-pill` 青绿、`.growth-pill.lv5` 实心、`.gp-track` 渐变，全部使用 `styles.css` 既有令牌。
- 徽标节点放在 `.profile-name` / `.publisher-name` / `.profile-modal-name` 之外（`profile-name-row` 等兄弟位），避免污染既有精确文本断言；视觉位置与原型一致。

## 5. 门禁真实输出摘要

| 门禁 | 命令 | 结果 |
|---|---|---|
| 后端 | `backend> .\mvnw.cmd -B clean verify`（合并后） | **Tests run: 766, Failures: 0, Errors: 0, Skipped: 0；BUILD SUCCESS** |
| 前端类型 | `frontend> npm run typecheck` | 0 error |
| 前端单测 | `frontend> npm test` | **63 files / 552 tests passed**（合并后含 route-completion 与 notifications 单测） |
| 前端构建 | `frontend> npm run build` | built in 5.48s（仅既有 chunk 体积提示） |
| 契约 | `npx --yes @redocly/cli lint openapi.yaml` | **validated；0 error**（25 条既有风格 warning；顺带修正 main 两个通知 schema 的 `nullable-type-sibling`） |
| OpenSpec | `npx --yes openspec validate add-growth-level --strict` | **Change 'add-growth-level' is valid** |
| E2E 新增 | 独立 SQLite + 后端 8082 + 前端 5175：`npx playwright test tests/growth-level.spec.ts` | **5 passed**（E1/E8/R4、E2、E3、E4–E7、R1/R2） |
| E2E 合并后定向 | `growth-level` + `route-completion` + `profiles` + `profile`（全新独立库） | **31 passed / 2 failed**；`route-completion` 6/6、`growth-level` 5/5；2 个失败均为既有债务（§6.7） |
| E2E 回归 | `profiles` / `detail-companions` / `experiences` / `experience-likes` / `admin-report-credit` / `trips` | 61 条中 59 passed；2 个失败均见 §6（既有债务 / 顺序耦合），分文件复核后 green |

- 本地 8081 端口未生效（被本地配置覆盖），实际后端 8082 + 前端 5175；`ROUTEME_API_TARGET` / `ROUTEME_E2E_BASE_URL` / `ROUTEME_E2E_DB` 均指向独立实例与临时库，不污染开发库。
- 迁移用例：`GrowthMigrationSqliteTest` 2/2（fresh 建表回填 0；`V31 → V34` 升级只补账户、无流水）。

## 6. 偏差、说明与既有债务

1. **批量端点不存在用户 404：** Delta R7 要求「沿用既有 `USER_NOT_FOUND`，不建孤立账户」；`/users/growth` 先校验用户存在再读，与 `/credits` 的宽松返回有意不同，已在 API / E2E 用例中固定。
2. **E2E 造数用 SQL 种子：** 单日正向上限 +20 使 240 / 300 EXP 无法通过业务链路在一天内堆出；E1 / E3 / E4 按 atdd-design §4 直写 `user_growth_account` + 种子账本行（保持 `exp_after = exp_before + delta`，来源码 `SYSTEM_ADJUST` 只在种子）；E2 的 +10 与 E3 的 −50 仍走真实发布 / 举报链路。
3. **既有债务（与本 change 无关）：** `experiences.spec.ts:91 shares an experience and reuses it to publish a new plan` 在本地环境稳定失败于发布页 `.place-chip-name` 预填断言（依赖高德 JS，用例未装 stub）；未在本 change 修复，建议单列跟进。
4. **既有顺序耦合：** `detail-companions.spec` 会把 seed 用户 4 接受进多条行程，污染随后 `profiles.spec` 的「参与同行 = 0」断言；分文件单跑 `profiles.spec` 8/8 绿，属既有测试顺序问题，登记债务。
5. **环境变量陷阱：** 本机 shell 遗留 `SPRING_DATASOURCE_URL`（指向另一 worktree 的 SQLite）会让 `mvnw verify` 的 H2 测试 context 全部失败；门禁执行前已清除该变量，记录以便复现。
6. **G1 Conditional 收口：** C1 重复处理沿用 409 `ReportNotProcessingException`（API 用例 A18 覆盖）；C2 字段级可见性由 `GrowthVisibilityApiTest` + E2E E1/E8 覆盖。
7. **既有债务（合并后新发现）：** `profile.spec.ts:318` / `:496` 依赖 `.mine-profile-card`，但 `origin/main@ef23f6cf` 的「我的旅行」页已无该节点（全仓仅测试引用）；与本 change 无关，登记债务。
8. **缺陷修复（本 change）：** 合并后定向 E2E 发现新注册用户首次读 `/profile` 时并发懒建账户在 SQLite 上 500（唯一键冲突只抛 `UncategorizedSQLException`）；改为捕获 `DataAccessException` + 重读判定，新增 `GrowthServiceImplTest` 2/2；修复后 8 并发探针 16/16 均 200。
9. **迁移改名陷阱：** `V32 → V34` 改名后必须 `clean`：`target/classes` 残留旧脚本会让 Flyway 报 `Found more than one migration with version NN`（首次合并后 verify 的 555 errors 即由此而来）。
10. **main 契约 lint 既有错误：** `add-realtime-notifications` 的 `Notification.actor` 与推送 `message` 在 `allOf` + `nullable` 旁缺 `type: object`，使 `nullable-type-sibling` 报 2 error；本 change 合并时补齐（不改语义），使契约门禁回到 0 error。
11. **合并提交说明：** 提交 `97f79aa5` 的主题记录抓取目标 `@e6ffb406`，但实际第二父提交为 `ef23f6cf`（含 `add-realtime-notifications` 与 finance 文档收口）；以 `git log -1 --format=%p 97f79aa5` 为准。

## 7. proposal 13 条验收信号 ↔ 证据（L-02）

| # | 验收信号 | 证据 |
|---|---|---|
| 1 | 新 / 存量用户 LV1 / 0 EXP，历史不补发 | `GrowthAccountApiTest.in_newUser_out_lv1AndZeroExp`、`in_existingUsers_out_allLv1WithoutBackfill`、`in_missingAccount_out_lazyCreatedOnceWithoutLedger`；`GrowthMigrationSqliteTest` |
| 2 | 99→100、399→400、LV5 后继续累计 | `GrowthLevelRulesTest`；`GrowthLevelApiTest.in_boundaryExp_out_expectedLevelsAndProgress`、`in_expAboveMax_out_levelStaysFiveAndExpKeepsGrowing` |
| 3 | 发布 +10、编辑 / 重复 / 删除重建不增；未完成拒绝 | `GrowthPublishApiTest`（2/2）；`GrowthPublishConfigApiTest`（配置 20 生效） |
| 4 | 第 10 / 20 赞 +5，11–19 不增，取消不回滚，多篇分档 | `GrowthLikeApiTest`（3/3）；自赞拒绝沿用既有 `ExperienceLikeApiTest` |
| 5 | 每日 +20 上限、截断、不补发、负向不受限 | `GrowthDailyCapApiTest`（A13–A15，`MutableClockConfig` 控日界） |
| 6 | 举报 −50 / 幂等 / 驳回不扣 / 最低 0 / 等级回退 | `GrowthReportApiTest`（3/3）；`GrowthLevelApiTest.in_expDrops_out_levelFallsBack` |
| 7 | 流水等式、非负、可回算 | `GrowthLedgerApiTest.in_mixedEvents_out_equationAndReversibleSum`；V34 CHECK 约束；`GrowthMigrationSqliteTest` |
| 8 | 无客户端写入口 | `GrowthLedgerApiTest.in_clientWriteAttempt_out_noWriteEndpoint`；E2E R1/R2（405 / 404） |
| 9 | 本人经验进度、他人仅 LVn | `GrowthVisibilityApiTest`（3/3）；E2E E1/E8 |
| 10 | 4 处列表 / 详情展示 + 批量只返回等级 | E2E E4–E7；`GrowthLedgerApiTest.in_batchRead_out_onlyLevels` |
| 11 | 与信用分文案可区分 | `growth.test.ts`（成长文案独立）；E2E E1（信用行仍在、文案为「信用分」）；`growth.ts` 无「信用」字样 |
| 12 | 并发只结算一次 | `GrowthConcurrencyTest`（3/3：同档 / 同举报 / 同发布 8 线程） |
| 13 | `openspec validate --strict` + 不回归 | 上表门禁：766 / 552 / 5 + 合并后定向 31 / 回归 59 + Redocly 0 error + OpenSpec valid |

## 8. 结论与下一步

- **P4 结论：Pass with documented debt**（§6.3 / §6.4 / §6.7 为既有 E2E 债务，与本 change 无关；§6.8 的 SQLite 并发 500 已在本 change 内修复并加回归用例；§6.10 为 main 带入的契约 lint 错误，已顺带修正）。
- 未写 G2：按流程由 VL（Neal）签署；建议下一步 `/sdd:local-verify-report` 汇总本记录与门禁输出，再取 G2。
- **收口补记（2026-11-18）：** 已执行 `/sdd:local-verify-report`（`docs/ai4se-plugins/20261118-155434-local-verify-report.md`，Overall Pass；E2E 白名单首跑 27/28、原样重跑 28/28）；**G2 Pass**（VL=Neal，按用户指示代记录，`g2-decision.md`）；**G3 Conditional**（SA=Jacky，授权快进合并，归档条件 C3 待 P5，`g3-decision.md`）；已按用户指示快进合并 `main`（基线 `origin/main@693e0943`；合并后复验：后端 766 / 前端 561 / typecheck / 定向 E2E 11/11）。
- P5 归档（C1 已实现，无额外挂账）与 Living Spec 合并待 G3 / SA 指示；契约 0.30.0 + V34 已落地，后续 change 顺延需复核占用。
