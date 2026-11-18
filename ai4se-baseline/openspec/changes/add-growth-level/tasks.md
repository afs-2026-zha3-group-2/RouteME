# Tasks — add-growth-level

- **Change：** `add-growth-level`（REQ-033 / S34；`user-growth` ADDED）｜ **阶段：** P4 已完成（2026-11-18；执行记录 [`p4-apply.md`](../../sdd/add-growth-level/p4-apply.md)） ｜ **日期：** 2026-11-18
- **设计输入：** [`design.md`](design.md)（D1–D14）、[`atdd-design.md`](atdd-design.md)（A1–A26 / E1–E8 / R1–R4）、[`specs/user-growth/spec.md`](specs/user-growth/spec.md)（9 Requirement / 41 Scenario）、[`g1-decision.md`](g1-decision.md)（C1 / C2）
- **原型基准：** `docs/prototype/growth-level.html`；走查图 `docs/preview/add-growth-level/growth-level-{1440,1024,768,390}-{light,dark}.png`（P3 已完成）
- **契约 / 迁移：** `openapi.yaml` `0.26.0` → **`0.30.0`**；Flyway `V31` → **`V34__add_growth_level.sql`**（P4 开工前复核占用）
- **Owner：** Jay（当前开发者）｜ **design / tasks 第二签署：** Karena ｜ **NFR：** 不纳入（用户 2026-11-18 裁决）
- **场景引用约定：** 任务引用 Delta Scenario 标题；REQ 编号只出现在本文件头与追溯列（`consistency-lint` L-04）。

## P4 执行顺序

> 原型 → 契约 → 迁移 → 后端 → 前端 → E2E → 门禁 → 记录。每个任务先写失败用例（ATDD / TDD），再实现。

- [x] 1.1 原型先行（P3 已完成）：`docs/prototype/growth-level.html` 覆盖 6 处展示面 + 浅 / 深色 + 1024 / 768 / 390 断点；8 张走查图零横向溢出（场景：本人可见等级与经验进度 / 他人只可见等级 / 其余四处展示面；产物：原型 + 走查图）
- [x] 1.2 契约先行 `0.30.0`：`openapi.yaml` 升版；`/users/{userId}/profile` 追加可空 `growth`；新增 `GET /users/growth?ids=`（上限 50，缺参 400）；`OpenApiTest` 版本 / 路径 / schema 断言先行（场景：本人可见等级与经验进度 / 他人只可见等级 / 批量读取只返回等级 / 无客户端直接写入口；A22 / A23；验证：Redocly 0 error + `OpenApiTest`）
- [x] 1.3 迁移 `V34` 与数据访问：建 `user_growth_account` / `growth_exp_ledger` + 唯一键 + 查询索引 + 存量 0 账户回填；新增 entity / mapper / 常量；`GrowthMigrationSqliteTest` 先 red（场景：账户唯一且读取不改变经验 / 存量用户不回填历史事件；D1 / D11；验证：SQLite + H2 双引擎 Flyway）
- [x] 1.4 等级派生与结算内核：`GrowthLevel` 区间纯函数（LV5 返回 `null`）、`GrowthPolicy`（20 / `Asia/Shanghai`）、`GrowthProperties`（`routeme.growth.publish-exp` 默认 10）、`GrowthService.book`（幂等键先查 → 懒建 → 截断 → 写流水 → 乐观条件更新 ≤3 次 → 等式断言）；UT 覆盖 99 / 100 / 399 / 400、截断、最低 0（场景：100 与 400 边界 / LV5 之后继续累计经验 / 扣经验后等级回退 / 账户缺失时按 0 懒建 / 跨档按剩余额度截断 / 不足 50 时扣到 0 / 流水可回算且等式成立；A1–A6 / A13–A15 / A19–A21；验证：`GrowthAccountApiTest`、`GrowthLevelApiTest`、`GrowthDailyCapApiTest`、`GrowthLedgerApiTest`）
- [x] 1.5 三处业务事件挂接（同事务）：`ExperienceServiceImpl.upsert` 的 `created = true` → 发布经验；`ExperienceLikeServiceImpl.like` 的 `created = true` → 按 `floor(likes / 10)` 档位结算；`AdminReportServiceImpl.resolve` 的 `RESOLVED` 分支（既有扣信用分之后）→ −50；幂等键 `GROWTH_PUBLISH:{tripId}:{authorId}` / `GROWTH_LIKE:{experienceId}:{tier}` / `GROWTH_REPORT:{reportId}`（场景：首次发布增加配置化经验 / 编辑或重复提交不再增加 / 删除后重建不再增加 / 配置值生效且历史不重算 / 未完成行程不产生经验 / 第 10 个有效赞首次结算 / 第 20 个有效赞再次结算 / 非档位与同档不结算 / 取消点赞不回滚且重新点赞不重复 / 自赞不计入有效点赞 / 多篇体验各自分档 / 举报成立扣 50 / 驳回不扣减 / 历史举报不回填 / 同一举报只扣一次；C1 沿用 `ReportNotProcessingException`（409）至多扣一次；A7–A12 / A16–A18；验证：`GrowthPublishApiTest`、`GrowthLikeApiTest`、`GrowthReportApiTest` + 回归 `ExperienceControllerTest` / `ExperienceLikeApiTest` / `AdminReportControllerTest`）
- [x] 1.6 读取侧与字段级可见性（G1 C2）：`UserProfileController.profile` 传 `callerId`；`UserProfileResponse` 追加可空 `growth`（本人含经验 / 他人仅 level）；新增 `GET /users/growth`（镜像 `/credits` 的 `MAX_IDS = 50` 范式，仅 `user_id` + `level`）；不存在用户沿用 `USER_NOT_FOUND`（场景：本人可见等级与经验进度 / 他人只可见等级 / 批量读取只返回等级 / 用户不存在沿用既有错误；A22 / A23；验证：`GrowthVisibilityApiTest` + `UserProfileControllerTest` 回归）
- [x] 1.7 并发与幂等兜底：唯一键冲突视为已结算；乐观条件更新重试上限；`GrowthConcurrencyTest` 用 `CountDownLatch` 验证同档单流水 / 单次扣减 / 单次发布（场景：并发点赞同一档位只结算一次 / 并发举报处理只扣一次 / 并发发布或重试只发一次；A24–A26）
- [x] 1.8 前端纯逻辑与组件：`growth/growth.ts`（`levelLabel` / `expProgress`，LV5 → `400+` / 已满级）+ `growth.test.ts`；`GrowthBadge`；`i18n/profileMessages.ts` 与 `i18n/tripMessages.ts` 新增成长文案（与信用分文案分开）；`styles.css` 增 `.growth-pill` / `.gp-track`，只用令牌（场景：与信用分并列且文案可区分；D10；验证：`npm test`）
- [x] 1.9 6 处展示面接入：`ProfilePage`（header + 本人进度块）、`ProfileModal`（本人 / 他人分支）、`TripDetailPage` 发布者区、`TripCard` meta、`ApplicationsPage` 申请者行、`CompanionCard`；列表用 `useGrowthLevels(ids)` 单次批量读取；对照 1.1 原型走查 1440 / 1024 / 768 / 390 × 浅 / 深色（场景：本人可见等级与经验进度 / 他人只可见等级 / 其余四处展示面 / 批量读取只返回等级 / LV5 之后继续累计经验；E1 / E4–E8；验证：`npm run typecheck` + `npm run build`）
- [x] 1.10 E2E 验收与反向用例：新增 `e2e/tests/growth-level.spec.ts`（E1–E8）与 `growthSupport.ts`（注册账号 / 造已完成行程与体验 / 点赞 N 次 / 读批量端点）；反向 R1 无经验明细页 / 排行榜 / 通知 / 管理端成长视图（404）、R2 无客户端写入口、R3 不改动信用账本、R4 只出现 `LVn` 文案（场景：本人可见等级与经验进度 / 他人只可见等级 / 其余四处展示面 / 举报成立扣 50；验证：独立 SQLite + 8081 / 5174 全绿）
- [x] 1.11 门禁与回归：后端 `.\mvnw.cmd -B verify`；前端 `npm run typecheck` + `npm test` + `npm run build`；E2E 新增 + 受影响套件；`npx @redocly/cli lint openapi.yaml` 0 error；`npx --yes openspec validate add-growth-level --strict` valid（D14；真实输出摘要进 P4 记录）
- [x] 1.12 P4 记录与台账：`docs/sdd/add-growth-level/p4-apply.md`、`docs/ai4se-plugins/<ts>-local-verify-report.md`（含 proposal「13 条验收信号 ↔ 测试证据」对照，L-02）、registry / handoff / README 状态更新（G2 待 VL Neal）

## 覆盖自检

| Delta Requirement | Delta Scenario（标题） | 任务 |
|---|---|---|
| 成长账户与初始经验 | 新用户初始为 LV1 与 0 EXP / 存量用户不回填历史事件 / 账户唯一且读取不改变经验 / 账户缺失时按 0 懒建 | 1.3、1.4、1.6 |
| 等级派生、边界与回退 | 100 与 400 边界 / LV5 之后继续累计经验 / 扣经验后等级回退 / 等级只由服务端派生 | 1.2、1.4、1.10 |
| 发布体验经验 | 首次发布增加配置化经验 / 编辑或重复提交不再增加 / 删除后重建不再增加 / 配置值生效且历史不重算 / 未完成行程不产生经验 | 1.5 |
| 体验获赞经验 | 第 10 个有效赞首次结算 / 第 20 个有效赞再次结算 / 非档位与同档不结算 / 取消点赞不回滚且重新点赞不重复 / 自赞不计入有效点赞 / 多篇体验各自分档 | 1.5、1.7 |
| 每日正向上限 | 达到 20 后停止增加 / 跨档按剩余额度截断 / 截断档位锁定且不次日补发 / 负向扣减不受上限限制 / 日界按北京时间 | 1.4、1.5 |
| 举报成立扣减经验 | 举报成立扣 50 / 同一举报只扣一次 / 驳回不扣减 / 不足 50 时扣到 0 / 历史举报不回填 | 1.5、1.7 |
| 经验流水与只读约束 | 流水可回算且等式成立 / 流水包含来源与关联对象 / 无客户端直接写入口 / 用户不存在沿用既有错误 | 1.2、1.4、1.10 |
| 成长等级的展示与可见性 | 本人可见等级与经验进度 / 他人只可见等级 / 其余四处展示面 / 与信用分并列且文案可区分 / 批量读取只返回等级 | 1.2、1.6、1.8、1.9、1.10 |
| 结算幂等与并发 | 并发点赞同一档位只结算一次 / 并发举报处理只扣一次 / 并发发布或重试只发一次 | 1.7 |

- **ATDD → Tasks：** API A1–A26 落 1.2–1.7；E2E E1–E8 落 1.9–1.10；反向 R1–R4 落 1.10；Defer-UT（区间 / 档位 / 日界 / 文案纯函数）落 1.4、1.5、1.8。
- **Design → Tasks：** D1 / D11 → 1.3；D2 / D3 / D5 / D9 / D13 → 1.4；D4 / D6 → 1.5、1.10；D7 → 1.2；D8 → 1.6、1.9、1.10；D10 → 1.8、1.9；D12 → 1.7；D14 → 1.11。
- **G1 → Tasks：** C1（重复处理响应形态）→ 1.5、1.10；C2（字段级可见性）→ 1.6、1.9、1.10。
- **无越界任务：** 不含经验明细页、排行榜、通知、管理端成长视图、存量事件回填、NFR 压测；不为未来事件预留表列或端点。

## Alignment self-check（Spec ↔ Design ↔ Tasks ↔ ATDD）

| # | 检查 | 结果 | 说明 |
|---|---|---|---|
| 1 | 每个 Delta Requirement 至少 1 个任务 | Pass | 9 / 9 Requirement 均有承接（见上表） |
| 2 | 每个 ATDD API / E2E / 反向场景有任务 | Pass | A1–A26、E1–E8、R1–R4 全覆盖 |
| 3 | 任务不超出 Spec / Out of Scope | Pass | 无明细页 / 排行榜 / 通知 / 管理端 / 回填 / NFR 任务 |
| 4 | Design D1–D14 均有任务落点 | Pass | 见「Design → Tasks」 |
| 5 | 契约 / 迁移先于业务代码 | Pass | 1.2、1.3 先于 1.4–1.10 |
| 6 | 原型先于前端实现 | Pass | 1.1（P3 已完成）先于 1.9，1.9 对照 1.1 |
| 7 | G1 C1 / C2 有承接 | Pass | C1 → 1.5 / 1.10；C2 → 1.6 / 1.9 / 1.10 |
| 8 | 历史数据与回归有任务 | Pass | 1.3 不回填 + 1.5 回归既有三套件 |
| 9 | 末项为验证 / 回归 | Pass | 1.11 门禁；1.12 仅记录 |
| 10 | 单任务 ≤ 约 2h | Pass | 1.5 / 1.9 最大，可按事件 / 展示面再拆执行 |

**结论：Pass。** P4 从 1.2 契约用例与 1.3 迁移用例开始；NFR 测试不纳入（见 `atdd-design.md` §5）。
