# ATDD 设计 — add-growth-level（P3）

- **Change：** `add-growth-level`（REQ-033 / S34；`user-growth` ADDED）｜ **阶段：** P3 ｜ **日期：** 2026-11-18
- **输入：** [`specs/user-growth/spec.md`](specs/user-growth/spec.md)（9 Requirement / 41 Scenario）；[`dov-ac-review.md`](dov-ac-review.md)；[`g1-decision.md`](g1-decision.md)（C1 / C2）
- **原型：** `docs/prototype/growth-level.html`（6 处展示面 + 深浅色；走查图 `docs/preview/add-growth-level/growth-level-{1440,1024,768,390}-{light,dark}.png`）
- **口径确认（用户）：** 批量读取用**新端点** `GET /api/users/growth?ids=`（只返回 `{userId, level}`）；NFR 测试**不纳入**本 change。

## 1. ATDD 分层（API / E2E；UT 延后）

| # | 场景主题（Delta） | API | E2E | Defer-UT（apply-time TDD） |
|---|---|---|---|---|
| 1 | R1 账户与初始 / 懒建 / 不回填 | A1 新用户读取返回 LV1 / 0；A2 存量不回填；A3 懒建不产生流水 | — | 账户懒建事务路径 |
| 2 | R2 等级派生与边界 | A4 99/100/399/400；A5 LV5 继续累计；A6 扣减回退 | E1 主页本人显示 LV3 与 240/300 | 等级派生纯函数（区间表） |
| 3 | R3 发布经验 | A7 首次发布 +10 且写流水；A8 重复 / 编辑 / 删除重建 +0；A9 配置值 20 生效 | E2 发布体验后本人进度 +10 | 幂等键格式 `GROWTH_PUBLISH:{tripId}:{authorId}` |
| 4 | R4 获赞经验 | A10 第 10 / 20 档结算；A11 取消不回滚；A12 同档不重复 | （可选）第 10 赞后主页进度 +5 | 档位计算 `floor(likes/10)` |
| 5 | R5 每日上限 | A13 达到 20 后实发 0 且留流水；A14 18+5 → +2；A15 UTC 16:00 日界 | — | 日界与剩余额度纯函数 |
| 6 | R6 举报扣减 | A16 RESOLVED −50（含不足 50 → 0）；A17 REJECTED 0；A18 重复处理 409 且不二次扣 | E3 管理员处置后本人等级回退可见 | 扣减截断（max(0, exp-50)） |
| 7 | R7 流水与只读 | A19 流水等式与回算；A20 无写端点（405/404）；A21 用户不存在沿用 `USER_NOT_FOUND` | — | — |
| 8 | R8 展示与可见性 | A22 `/profile` 本人含经验、他人仅 level；A23 批量只返回 level | E4–E7 行程卡 / 详情发布者 / 申请者行 / 同行者卡片显示 LVn；E8 他人主页无经验数字 | 展示文案纯函数（`LVn` / `400+`） |
| 9 | R9 并发与幂等 | A24 并发点赞同档只一条流水；A25 并发举报只扣一次；A26 并发发布只发一次 | — | 条件更新与唯一键冲突映射 |

**反向用例（Non-goals）：** R1 无经验明细页 / 排行榜 / 通知 / 管理端成长视图（路由与接口 404）；R2 不提供客户端写经验 / 等级端点；R3 成长事件不修改 `user_credit_account` / `credit_ledger`；R4 头衔只出现 `LVn`（不出现中文头衔）。

## 2. 生产代码之前先写的验收资产

- **API（后端集成测试，先红后绿）：** `GrowthAccountApiTest`（A1–A3）、`GrowthLevelApiTest`（A4–A6）、`GrowthPublishApiTest`（A7–A9）、`GrowthLikeApiTest`（A10–A12）、`GrowthDailyCapApiTest`（A13–A15）、`GrowthReportApiTest`（A16–A18）、`GrowthLedgerApiTest`（A19–A21）、`GrowthVisibilityApiTest`（A22–A23）、`GrowthConcurrencyTest`（A24–A26）。
- **E2E（Playwright，先红后绿）：** `e2e/tests/growth-level.spec.ts`（E1–E8），新增 helper `e2e/tests/growthSupport.ts`（注册账号、造已完成行程 + 体验、点赞 N 次、读 `/users/growth`）。
- **契约：** 先改 `openapi.yaml`（0.31.0：`/profile` 追加 `growth` 对象、新增 `/users/growth`），`OpenApiTest` 版本断言先行更新。

## 3. 本地 / CI 门禁（沿用既有工程，不新增 CI 语义）

| 层 | 命令 | 通过标准 |
|---|---|---|
| 后端 | `backend> .\mvnw.cmd -B verify` | 全绿（含新增 A1–A26） |
| 前端 | `frontend> npm run typecheck` + `npm test` + `npm run build` | 全绿 |
| E2E | 独立 SQLite + 后端 8081 + 前端 5174：`e2e> npm test`（`ROUTEME_E2E_BASE_URL`） | 新增 E1–E8 全绿；既有套件失败仅限已登记债务 |
| 契约 | `npx @redocly/cli lint openapi.yaml` | 0 error |
| 规格 | `npx --yes openspec validate add-growth-level --strict` | valid |

## 4. 数据 / fixtures 策略

- **API 测试：** H2 内存库 + Flyway；每用例现注册账号（`/auth/register`），不依赖共享种子；管理员用 `admin / admin12345` 种子；并发用例用 `CountDownLatch` + 固定线程池。
- **E2E：** 独立 SQLite（`SPRING_DATASOURCE_URL` 指向临时目录）与独立端口；账号与行程经 API 助手现造，`localStorage` 注入 token；10 个点赞由 10 个现注册账号产生；跑完删除临时库与目录，不污染开发库。
- **截图基线：** `docs/preview/add-growth-level/` 8 图（1440/1024/768/390 × 浅/深），P4 前端走查对照。

## 5. NFR 测试

**不纳入**（用户 2026-11-18 裁决）：性能 / 可观测性 / 压测不在本 change 范围；P4 仅保留既有 CI 与本地门禁。

## 6. 非目标（本设计不做）

- 不写业务实现、不写测试代码（P4 `/sdd:atdd-apply` 负责红→绿）。
- 不设计 UT 套件明细（apply-time TDD 承接）。
- 不引入 Playwright / POM / Excel 生成器，不新建 CI 产品。
