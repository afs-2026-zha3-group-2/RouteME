# ATDD design — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`｜ **阶段：** P3｜ **日期：** 2026-11-18
- **输入：** Delta `specs/user-credit/spec.md`（16 Scenario）+ `specs/admin-console/spec.md`（20 Scenario）；G1 Conditional（C1 / C2 由本阶段承接）
- **原型：** `docs/prototype/admin-report-resolve.html`（处理中 / 已成立 / 已驳回三态；表单解耦、OTHER 档位、三段预览）

## 1. ATDD layers in scope

| 层 | 范围 | 说明 |
|---|---|---|
| **API** | `POST /api/admin/reports/{id}/resolve`、`GET /api/admin/reports/{id}` | 单端点请求 / 响应、状态码、账本与限制记录断言；使用真实 SQLite 测试库 |
| **E2E** | 管理端举报详情 → 开始处理 → 填表 → 预览 → 提交 → 详情回看；用户管理页处罚回归 | 走真实前后端与真实库，验证用户可见行为 |
| **Defer UT** | 扣分映射、表单校验、预览截断 | 由 `/sdd:atdd-apply` 在实现时按 TDD 补；本文件不展开 UT 套件 |
| **NFR** | 待确认（见 §6） | 默认不纳入；用户确认后才加 |

## 2. Scenario → layer

| # | 场景 | Layer | 断言要点 | 来源 |
|---|---|---|---|---|
| A1 | 七类固定扣分 | API | 参数化 7 组：80 → 70/65/50/60/60/70/50；`applied_deduction` 与账本 `applied_delta` 一致 | user-credit R1 |
| A2 | `OTHER` 四档 | API | -5 / -10 / -20 / -30 各一次；未选档位 400 | user-credit R1 |
| A3 | 类型缺失 / 非法 / 非法档位 | API | 400 `INVALID_INPUT`；举报仍 `PROCESSING`、分数不变、无账本 | user-credit R1 / admin-console |
| A4 | 扣分值服务端派生 | API | 请求带 `delta` / `deduction` 等未知字段 → 被忽略，按类型派生 | user-credit R1 |
| A5 | 成立扣分并记账 | API | 举报 `RESOLVED`；80 → 65；账本 `REPORT_VIOLATION` + `related_type=REPORT` + `related_id` + 幂等键 | user-credit R2 |
| A6 | 不成立不扣分 | API | `REJECTED`；分数不变；无账本；处理说明落 `resolution_note` | user-credit R2 / admin-console |
| A7 | 同一举报只扣一次 | API | 第二次 409 `REPORT_NOT_PROCESSING`；账本仍 1 条 | user-credit R2 |
| A8 | 并发只生效一次 | API（Integration） | 两个线程并发 resolve；1 个 200 / 1 个 409；账本 1 条；分数只变一次 | user-credit R2 |
| A9 | 0 分截断仍留痕 | API | 0 分 + -10 → 仍 0；`applied_deduction=0`；账本 1 条 `applied_delta=0` | user-credit R2 |
| A10 | 账户缺失按初始 80 | API | 无账户用户 → 建账户 80 → 扣分；不报错 | user-credit R2 |
| A11 | 不受月度 +20 上限 | API | 同月先获赞加分至上限，再举报扣分 → 全额扣减 | user-credit R2 |
| A12 | 跌破 60 自动限制 | API（Integration） | 80 -30 → 50；`credit_restriction` 建立；待处理申请取消 / 同行关系解除 / 未完成行程取消 | user-credit R3 |
| A13 | 恰好 60 不触发 | API | 70 -10 → 60；无 `credit_restriction` | user-credit R3 |
| A14 | 已受限再次扣分 | API | 限制不重复建立、不重复清退；分数继续扣 | user-credit R3 |
| A15 | 详情返回信用分与等级 | API | `reported_user.credit_score` / `credit_level`；列表与详情一致 | admin-console R1 |
| A16 | 已处理详情展示违规类型与扣分 | API | `violation_type` / `applied_deduction`；历史举报为 null | admin-console R2 |
| A17 | 401 / 403 / 404 / 409 守卫（G1 C2） | API | 未登录 401、普通用户 403、不存在 404、非 `PROCESSING` 409；均不扣分 | admin-console / G1 C2 |
| A18 | 历史处罚字段被忽略 | API | 请求携带 `action=BAN` / `ban_reason_code` 等未知字段 → 不改变账号状态 | admin-console R2 |
| E1 | 表单只留违规类型与原因 | E2E | 成立表单无处罚动作、封禁理由、解封时间 | admin-console R1 |
| E2 | 违规类型必选 / OTHER 档位必选 | E2E | 未选时提交按钮不可用或前端拦截；无网络请求 | admin-console R1 |
| E3 | 三段预览 | E2E | 「当前 80 → 本次 15 → 处理后 65」 | admin-console R1 |
| E4 | 预览按 0 截断 | E2E | 5 分 + -10 → 处理后 0，并展示截断说明 | admin-console R1 |
| E5 | 成立提交并回看 | E2E | 成功提示；详情显示违规类型、扣分 15、当前分数 65 | admin-console R2 |
| E6 | 驳回无扣分预览 | E2E | 驳回表单无违规类型 / 预览；提交后详情显示驳回说明 | admin-console R2 |
| E7 | 历史举报降级展示 | E2E | 预置无 `violation_type` / `applied_deduction` 的 `RESOLVED` 举报 → 详情正常、显示「—」 | admin-console R2 |
| E8 | 用户管理页处罚回归（G1 C1） | E2E | 暂停 / 封禁 / 更新封禁 / 恢复仍可用，行为与现状一致 | G1 C1 |
| E9 | 举报人不可见处理细节 | E2E | 「我的举报」只显示已受理 / 最终状态，不含违规原因、扣分 | admin-console R2 |
| R1 | 举报页无账号处罚入口 | E2E 反向 | 详情页不存在暂停 / 封禁 / 恢复按钮 | Non-goal D1 |
| R2 | 成立后账号状态不变 | API 反向 | `ACTIVE` 保持 `ACTIVE`；`SUSPENDED` / `BANNED` 保持原状 | Non-goal D1 |
| R3 | 不新增信用明细页 | E2E 反向 | 管理端 / 用户端导航无「信用记录」入口 | Non-goal D2 |
| R4 | 历史举报不补扣 | API 反向 | 预置历史 `RESOLVED` 数据迁移后分数不变、无新账本 | Out of scope |
| R5 | 用户举报提交端不变 | API 反向 | 4 类原因仍可提交；不新增原因枚举 | Out of scope |

## 3. What is written before production code

1. **契约先行（T1）：** `openapi.yaml` 先改为 `0.26.0`：`AdminReportResolveRequest` 字段替换、`ReportedUser` 增 `credit_score` / `credit_level`、`AdminReportDetail` 增 `violation_type` / `applied_deduction`；Redocly 先跑一次。
2. **API 用例先行：** `AdminReportControllerTest` 新增 A1–A18（A8 / A12 用集成测试）；先红。
3. **前端单测先行：** `reportActionForm.test.ts` 重写校验与 `toResolveRequest`（U1–U3）；先红。
4. **E2E 先行：** `admin.spec.ts`（或新 `admin-report-credit.spec.ts`）新增 E1–E9；先红后实现。
5. **原型已在 P3 定稿：** `admin-report-resolve.html` 作为视觉对照，不在 P4 改设计。

## 4. Local vs CI gates

| 层 | 本地 | CI |
|---|---|---|
| 后端 | `./mvnw verify`（含 API / 集成测试） | 同命令 |
| 前端 | `npm run test` + `npm run typecheck` + `npm run build` | 同命令 |
| E2E | 隔离库 + 独立端口跑本 change spec（`admin-report-credit.spec.ts` + `admin.spec.ts` 相关用例） | `ci.yml` 既有 Playwright job |
| 契约 | `npx @redocly/cli lint openapi.yaml` | `ci.yml` 既有 lint |

不新增 CI 语义；沿用 `.github/workflows/ci.yml`。

## 5. Data / fixtures strategy

- **API：** 每个用例使用独立 SQLite（`@SpringBootTest` + `SPRING_DATASOURCE_URL` 临时文件），造数用既有 `SeedData` / 测试工厂；举报 / 账户 / 限制表在 `@BeforeEach` 清理。
- **E2E：** 隔离全新库 + 独立后端端口（8081）+ Vite（5174）；预置三类举报：`PROCESSING`（用户 80 分）、历史 `RESOLVED`（无违规字段）、`PROCESSING`（0 分用户）。
- **账户缺失：** API 用例直接删除 `user_credit_account` 行造「无账户」。
- **并发：** A8 用 2 线程 + `CountDownLatch`，断言最终状态；不依赖时序。
- **回归：** E8 复用既有 `admin.spec.ts` 的用户管理用例；E9 复用用户侧举报回执用例。

## 6. NFR tests

**不纳入（用户 2026-11-18 确认）。** 本 change 无可观测性 / 性能 SLA；并发只作为功能正确性覆盖（A8），不设压测或响应时间门禁。后续如需 NFR，先补本节再执行。

## 7. Non-goals

- 不在本文件写业务实现、UT 套件或完整任务分解（后者由 `tasks.md` 承担）。
- 不生成 Playwright / POM / Excel 用例生成器。
- 不新增 CI 产品；沿用既有 workflow。
- 不覆盖信用明细页、通知、历史补扣（Non-goals 反向用例 R3 / R4 只断言「不存在」）。

## 8. 反向验证摘要

| Non-goal | 反向用例 |
|---|---|
| 举报页账号处罚 | R1（E2E 无入口）+ R2（API 状态不变） |
| 信用明细页 | R3（E2E 无导航入口） |
| 历史补扣 | R4（API 迁移前后分数与账本不变） |
| 用户举报原因枚举 | R5（API 4 类原因回归） |
