# ATDD design — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`
- **Delta：** `openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md`（ADDED 11 Requirement / 61 Scenario）
- **日期：** 2026-11-17 ｜ **阶段：** P3
- **范围：** API + E2E 验收层；纯逻辑单测延后到 P4 `/sdd:atdd-apply` 的 TDD 红绿循环

## 1. ATDD layers in scope

| 层 | 覆盖 | 说明 |
|---|---|---|
| API | 退出预览 / 退出扣分 / 待核实 / 月度边界 / 限制触发与记录 / 只读 403 / 自动清理 / 自动解除 / 无管理端 | `@SpringBootTest + @AutoConfigureMockMvc + @ActiveProfiles("test")`；需要触发低信用时在测试内调用 `CreditService.book`，不新增测试写接口 |
| E2E | 三入口退出弹窗与预计影响、退出后分数变化、限制徽标五展示面、本人限制原因、被拦截操作提示、系统取消原因 | Playwright；真实退出流程用 API 造数；限制展示用 `page.route` 模拟 `credit_restricted` / `credit_restriction_reason`，避免管理员或测试写接口 |
| Defer UT（P4 TDD） | 扣分档位边界、月度序号、待核实转扣分、限制触发/解除条件、guard、纯展示函数、Modal 状态机 | 不在此文档展开 suite；P4 按 TDD Red→Green 写 |

## 2. What is written before production code

| id | 验收工件 | 场景 |
|---|---|---|
| A1 | `CreditExitPreviewApiTest`：48h -5、7d 0、3–7d -3、24–72h -5、12–24h -8、<12h -10、旅行中 -15、边界、集合时间优先 | S25-2、S25-5 ~ S25-11、S25-21 |
| A2 | `CreditExitReviewApiTest`：不可抗力/安全原因待核实、0 分裁断、月度第 2 次翻倍、幂等 | S25-3、S25-4、S25-12 ~ S25-17 |
| A3 | `CreditRestrictionApiTest`：65→55 触发、60/59、记录幂等、自动撤回/解除/取消、系统取消原因、自动解除、不恢复 | S26-1 ~ S26-5、S26-13 ~ S26-18、S26-20 ~ S26-23 |
| A4 | `CreditRestrictionGuardApiTest`：发布/申请/体验/聊天/资料/编辑/取消/结束/撤回/退出逐项 403 `CREDIT_RESTRICTED`；查看/举报保留 | S26-6 ~ S26-12、S26-24 |
| A5 | `CreditMigrationSqliteTest`：V25 双引擎、`credit_exit_event` / `credit_restriction` / `status_reason`、旧库升级 | 数据契约 |
| E1 | `credit-exit.spec.ts`：详情 / 我的旅行 / 聊天三入口退出弹窗；个人原因 80→75；不可抗力待核实；旅行中 -15；二次确认 | S25-1、S25-2、S25-3、S25-10、S25-19 |
| E2 | `credit-restriction.spec.ts`：五展示面「限制中」徽标；本人原因与自动解除说明；他人不看原因；被拦截发布/申请/体验/聊天/资料 | S26-4 ~ S26-12 |
| E3 | `credit-cancel-reason.spec.ts`：系统取消原因「信用分低于 60，账号受限」；其他用户只看到已取消；聊天只读 | S26-15 ~ S26-17 |

## 3. Local vs CI gate expectations

| 层 | 本地 | CI |
|---|---|---|
| 契约 | `npx.cmd -y @redocly/cli lint openapi.yaml`（0 error） | 同一命令 |
| 后端 | `.\mvnw.cmd -B -ntp verify`（H2 + SQLite + OpenApiTest） | 同一 Maven 生命周期 |
| 前端 | `npm.cmd run build` + `npm.cmd test` | 同一命令 |
| E2E | `npx.cmd playwright test`（需本地前后端） | 沿用仓库现状：E2E 不在 CI，P4 记录残余风险 |
| 规格 | `openspec validate add-credit-exit-restriction --strict` | — |

## 4. Data / fixtures strategy

- **退出流程 E2E：** 用 `registerViaApi` 新建 80 分账号；用 `createTripViaApi` + `applyViaApi` + `acceptApplicationViaApi` 造一条 ACCEPTED 行程；`meeting_time` 设为 48 小时后，验证 -5；另一条旅行中行程验证 -15。所有数据带时间戳，避免共享库冲突。
- **限制展示 E2E：** `page.route('**/api/users/credits**')` 返回 `credit_restricted: true`；`page.route('**/api/users/*/profile')` 按本人/他人返回 `credit_restriction_reason`；用真实页面断言徽标、原因与拦截提示。后端真实守卫由 A3/A4 覆盖。
- **低信用触发（API）：** 测试内 `@Autowired CreditService` 对目标用户 `book(REPORT_UPHELD, -10)`，从 65→55；或直接 `book(-30)`。不新增 HTTP 写接口，不新增管理员。
- **迁移：** 新建空 SQLite 跑到 V25；从 V20 库升级到 V25；H2 由 `mvnw verify` 覆盖。
- **清理：** E2E 使用独立 SQLite（`ROUTEME_E2E_DB` / 现有 e2e 库约定）；API 测试使用 `@DirtiesContext` 或每类独立上下文，避免限制记录串扰。

## 5. Non-goals

- 不写业务功能代码；不写完整 UT suite（P4 TDD）。
- 不新增管理员页面、核实接口、人工封禁或测试专用写分接口。
- 不生成 Playwright/POM/Excel 生成器；不新造 CI 语义。
- 不做通知 / 推送 / 邮件；不展示加扣分明细；不恢复被清退关系。
- NFR（性能 / 可观测性）不纳入本 change（用户未要求）；P4 只记录基础日志与错误码。

## 6. Non-goal reverse verification

| Non-goal | 反向断言 |
|---|---|
| 无管理端 | `GET /api/admin/users` → 404；无 `admin` 路由 / 页面 / 角色列 |
| 无客户端写限制接口 | 无 `POST/PUT /api/users/{id}/credit*`；限制只能由 `CreditService.book` 触发 |
| 不展示明细 | 个人主页 / 弹窗 / 卡片 / 申请者行无「明细 / 历史 / 原因列表」入口；他人响应无 `credit_restriction_reason` |
| 不恢复关系 | 限制解除后原申请仍为 CANCELLED / LEFT；不自动重建 ACCEPTED |
| 不做通知 | 无站内信 / 推送 / 邮件端点与 UI |
| 不改未归档 Delta | `openspec/specs/` 无新增 `user-credit` / `trip-cancellation` 修改；`trip-companions` 无 MODIFIED |
| 系统清退不扣分 | 触发限制后 `credit_ledger` 无新增退出扣分行；当月次数不变 |

## 7. R2 验收修订（2026-11-17）

| id | 验收工件 | 场景 |
|---|---|---|
| A6 | `CreditExitApiTest` 新增：安全 / 不可抗力无说明 → 400 且不写事件；说明 >200 字 → 400；个人原因可无说明；说明 + 2 张图片绑定退出事件；第 4 张与假图片 → 400 | S25-23 ~ S25-29 及说明 / 证据相关场景 |
| A6 | `CreditEnforcementMigrationSqliteTest`：V25 → V26 升级新增 `exit_note` 与 `credit_exit_attachment` | 数据契约 |
| E4 | `credit-exit.spec.ts`：未选原因时确认置灰；下拉不出现标签选项；不可抗力待核实只有一行；说明必填；上传一张 PNG 后提交成功 | 同上 |
| UT | `leaveForm.test.ts`：`canSubmitLeave` 三原因组合；图片类型 / 5MB 边界 | Modal 纯逻辑 |

## 8. R3 本人回看（2026-11-17）

| id | 验收工件 | 场景 |
|---|---|---|
| A7 | `CreditExitApiTest`：本人读记录 200（原因 / 说明 / 影响 / 2 张附件）；图片 200 `image/png`；发布者读记录 404 `LEAVE_RECORD_NOT_FOUND`、读图片 403 `FORBIDDEN` | S25-30 ~ S25-33 |
| E5 | `credit-exit.spec.ts`：退出后到「我申请的」点「查看退出记录」，断言不可抗力 / 说明 / 待核实与 1 张缩略图 | 同上 |

## 9. R4 同一行程多次退出（2026-11-17）

| id | 验收工件 | 场景 |
|---|---|---|
| A8 | `CreditExitApiTest`：退出→再次申请并接受→第二次退出（-10 / 月序号 2）→记录 2 条→重试幂等；`CreditEnforcementMigrationSqliteTest`：V27 `application_id` 与旧数据回填 | S25-34 ~ S25-37 |
| E6 | `credit-exit.spec.ts`：再次申请并接受后再次退出，预览 -10、结果 75→65，记录列出 2 条并包含两次说明 | 同上 |
