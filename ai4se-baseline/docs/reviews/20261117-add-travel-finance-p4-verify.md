# 本地验证报告 — add-travel-finance（P4）

- **Verdict: Pass with documented debt（change scope；2026-11-18 复审通过，PR #42 CI 2/2 绿）**
- **Change：** `add-travel-finance`（REQ-028 / S29 旅行保障与小额借款）
- **阶段：** P4（Apply & verify）｜ **日期：** 2026-11-17（2026-11-18 保险返工后重跑）｜ **记录人：** Karena（当前开发者）
- **分支 / 基点：** `feature/add-travel-finance` ← `origin/main@822471c`
- **契约 / 迁移：** `RouteME/openapi.yaml` 0.25.0 ｜ `V30__add_travel_finance.sql`
- **输入：** Delta（`travel-finance`，10 Requirement / 40 Scenario）、`design.md` D1–D12、`atdd-design.md` E1–E40、`tasks.md` T0–T12
- **范围：** 本地实现 + 本地验证；2026-11-18 已提交 PR #42 且 CI 2/2 通过；CD / G2 未执行（G2 由 VL 签署），本报告不是 Gate 结论
- **编号顺延：** rebase 到 `origin/main@822471c` 后，REQ-024 / S25 → REQ-028 / S29，契约 0.19.0 → 0.24.0 → 0.25.0，迁移 `V25` → `V28` → `V30`（两轮 rebase）

## 0. 复审说明（2026-11-18）

保险改为第三方入口 + 状态回写后，本报告按最终实现重写验证数据：

- 后端 **618** passed（返工前 476 / 首轮 rebase 643）；
- 前端 **482** passed / 60 文件（返工前 363 / 首轮 488）；
- 金融 E2E **3/3**，余额链改为 `¥10,000.00` → `¥10,950.00` → `¥9,950.00`；
- Redocly **0 error / 26 warning**；
- 场景覆盖由 E1–E38 扩展为 E1–E40；
- 原 2026-11-18 的签署因返工失效；2026-11-18 返工后经 WAYNE 与 Karena 复审通过。

## 1. 环境

| 项 | 值 |
|---|---|
| JDK | 21（Maven Wrapper，`.\mvnw.cmd`） |
| Node / npm | Node ≥ 22 ｜ npm 11 |
| 后端 | Spring Boot 4.1.2，本地 8080（`SqlLite/routeme.db`，Flyway 已到 `V30`） |
| 前端 | Vite 8 + React 19，本地 5173（`ROUTEME_API_TARGET=http://localhost:8080`） |
| E2E | Playwright，`baseURL=http://localhost:5173`，`workers=1` |
| 测试时钟 | `FixedClockTestConfig` 固定 `2026-11-16T09:00:00Z`；保险到期按 `Asia/Shanghai` 本地日期派生 |
| 外部依赖 | 地图 / 地点检索依赖高德 JS API（本次环境返回 502，见 §5）；第三方保险地址为 `example.com` 占位，E2E 只断言跳转 URL |

## 2. 命令与结果

| 层 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `cd RouteME/backend; .\mvnw.cmd -B -ntp clean verify` | **618 passed / 0 failed / 0 errors / 0 skipped，BUILD SUCCESS** |
| 后端金融类 | `-Dtest=TravelFinanceWalletApiTest,TravelFinanceInsuranceApiTest,TravelFinanceLoanApiTest,TravelFinanceEligibilityApiTest,TravelFinanceMigrationSqliteTest` | 全部通过 |
| 后端钱包单测 | `-Dtest=WalletServiceImplTest` | 3 passed（CAS 0 行重读、余额不足、流水 id 冲突重试） |
| 注册集成 | `-Dtest=AuthControllerTest` | 包含「注册即有钱包 / 注册失败不留钱包」 |
| 契约测试 | `-Dtest=OpenApiTest` | 包含 `in_openApiFile_out_travelFinanceContractDeclared`，断言 0.25.0 / 6 路径 / 无价格字段 / `POLICY_EXISTS` 退休 |
| 前端构建 | `cd RouteME/frontend; npm.cmd run build` | Pass（`tsc --noEmit && vite build`） |
| 前端单测 | `npm.cmd test -- --run` | **60 文件 / 482 passed** |
| E2E 金融 | `cd RouteME/e2e; npx.cmd playwright test tests/finance.spec.ts` | **3/3 passed** |
| 契约 lint | `cd RouteME; npx.cmd @redocly/cli lint openapi.yaml` | **0 error / 26 warning**（低于 main 基线 28） |
| OpenSpec | `cd ai4se-baseline; npx.cmd openspec validate add-travel-finance --strict` | **valid** |
| 迁移 | 删除 `SqlLite/routeme.db` 后由 Flyway 重建 | `V1`–`V30` 全部 success，末行 `30 / add travel finance` |

## 3. 场景覆盖证据

| Delta Requirement | 场景 | 证据 |
|---|---|---|
| 演示钱包与初始余额 | E1–E4 | `TravelFinanceWalletApiTest`（初始 1,000,000 / 新账号首读即有钱包 / 重复读单条）、`AuthControllerTest`、`TravelFinanceMigrationSqliteTest`（全部既有账号回填 1 行） |
| 钱包账本与余额可回算 | E5–E7 | `WalletServiceImplTest`；`TravelFinanceLoanApiTest` 断言流水方向、`amount_cents`、`balance_before/after` 与 `entry_type`/`related_type`；保险确认前后余额不变 |
| 第三方旅行保险入口 | E8–E11 | `TravelFinanceInsuranceApiTest` 行程上下文 / 提供方名称 / 保单 / 理赔 / 求助入口；`in_purchase_out_redirectUrlContainsTripIdAndNoCharge`；E2E 新窗口地址含 `trip_id` |
| 第三方投保状态回写与保障期 | E12–E16 | `in_confirm_out_activeWithTripCoverage`、`in_confirmTwice_out_idempotentSingleRecord`、`in_coverageEnded_out_expiredDerived`、无敏感字段断言、钱包不变断言 |
| 保险状态查询与入口资格 | E17–E20 | `not_purchased` + `policy=null`、`active`、`expired`；非同行者 403；`completed` / `cancelled` 409；E2E 无资格与已结束路径 |
| 借款申请与 5% 服务费 | E21–E24 | `TravelFinanceLoanApiTest#in_borrowThousandFourteenDays_out_netDisbursedWithoutInterest`（净额 95,000 / 应还 100,000）、`in_invalidPrincipalOrTerm_out_invalidInput`、`in_clientDueAt_out_ignored` |
| 借款查询 | E25–E26 | `TravelFinanceWalletApiTest` 聚合读取、`TravelFinanceEligibilityApiTest` 行程作用域隔离 |
| 单笔进行中借款与手动还款 | E27–E31 | `in_secondActiveLoan_out_conflictUntilRepaid`、`in_repay_out_principalChargedAndMarkedRepaid`、`in_repayTwice_out_loanNotActiveAndNoSecondCharge`、逾期派生用例、E2E 还款余额 `¥9,950.00` |
| 金融入口与账号状态 | E32–E37 | E2E 行程详情入口 + 账号菜单 + 侧边栏入口 + 聚合页 + 移动端底部导航不变；`SUSPENDED` / `BANNED` 禁投保禁借、还款仍允许 |
| 金额精度、幂等与数据隔离 | E38–E40 | 整数分断言、重复提交至多一次、重复回写单条、他人 `loanId` 403 |

E2E 余额链：`¥10,000.00` → 借 1,000 元 / 14 天（净额 950）`¥10,950.00` → 还款 1,000 `¥9,950.00`；投保跳转与演示回写不改变余额。

## 4. 反向验证（Non-goals）

| Non-goal | 验证方式 | 结果 |
|---|---|---|
| 不承保 / 不定价 / 不计算保费 | 保险响应与表结构无保费 / 保额字段；`InsuranceProduct` 只有 `code` / `title` / `summary` | Pass |
| 不做理赔 / 给付 / 审核 | 6 条金融路径全量枚举，无 claim / refund 分支；只输出提供方理赔指引链接 | Pass |
| 不做退保 / 改单 | 无 DELETE 或改保险记录端点；状态只有 `active` / `expired` 派生 | Pass |
| 不保存投保敏感信息 | `insurance_policy` 列为 provider / coverage_start / coverage_end / status / confirmed_at；响应无保单号 / 证件 / 银行卡 | Pass |
| 无充值 / 提现 | 无充值 / 提现端点；钱包仅由初始回填与借款 / 还款变动，保险不产生流水 | Pass |
| 无管理后台金融视图 | 前端无 finance/admin 组合入口；`FinanceController` 无 admin 路径 | Pass |
| 交易前后信用分不变 | 借款 + 还款后 `user_credit_account.score` 与 `credit_ledger` 行数不变 | Pass |
| 客户端不能改余额 / 定价 / 提供方 | 请求附带 `balance_cents` / `provider` / `price` / `coverage_*` / `due_at` 均被忽略；请求 DTO 只接收 `principal_cents` + `term_days` | Pass |
| 不改 `app_users` 与信用表 | `V30` 只建 4 张新表并回填 `user_wallet` | Pass |
| 未新增通知 | 无通知 / 事件发布代码与契约 | Pass |
| 投保不影响同行 | 申请 / 查看行程不读取保险状态 | Pass |

## 5. 全量 E2E 状态

返工后仅重跑金融用例并 3/3 通过。此前全量运行（141 条）为 109 passed / 32 failed，失败全部在 `finance.spec.ts` 之外，归因与本次返工无关：

| 类别 | 条数 | 直接原因 |
|---|---|---|
| 高德地图 / 地点检索不可用 | 17 | `[data-testid="china-map"]` 不出现、地点 chip 等不到（高德 JS API 502） |
| 账号入口可访问名漂移 | 7 | 用例断言旧文案，应用为 `aria-label=账号：${nickname}` |
| 后台接口状态码漂移 | 1 | 断言 404，实际 401 |
| 共享演示库数据漂移 | 4 | 反复复跑留下额外行程 |
| 选择器已从源码移除 | 2 | 等待已不存在的类名 |
| 种子行程漂移 | 1 | 期望种子行程不在首页 |

全量套件在返工后未完整重跑；作为既有债务单独记录。

## 6. 已知偏差

1. **409 语义：** 业务规则拒绝（`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE` / `TRIP_NOT_OPEN`）返回 409，与 `@rule:api-contract` 的 422 表述不一致；沿用仓库先例与 Delta，登记为已知偏差。
2. **原型：** `docs/prototype/v1` 已由 main 归档，本 change 不新增原型资产；界面以生产 UI 与 E2E 为准。
3. **契约历史缺陷修复：** HEAD 的 `openapi.yaml` 存在重复 mapping key 等缺陷，Redocly 在基线上无法解析；T5 一并修复后当前 0 error。
4. **`local-cache-scope: statement`：** 为消除同一事务内 MyBatis 一级缓存读到旧余额而全局设为 `statement`；属既有查询行为的保守收紧。
5. **第三方真实对接：** 演示用 `routeme.insurance.*` + 演示确认端点；真实回调 / 验签 / 对账未接入。
6. **NFR deferred：** 并发压测、交易监控、审计导出不在本 change，未验证。
7. **E2E 不在 CI：** `finance.spec.ts` 仅本地门禁；全量 E2E 依赖本地双服务与共享演示库。

## 7. 残余风险

- 身份仍为演示级 `X-User-Id`；越权防护依赖服务端资格过滤，未来接真实鉴权需另开 change。
- 演示钱包初始 10,000 元与借款 5% 费率为产品口径常量；真实资金场景需重新评审风控与合规。
- 保险状态依赖第三方确认；与第三方系统差异由提供方对账负责。
- 账本不分页；交易量增长后需另开分页 / 归档 change。
- 无 down 迁移；回滚代码后 4 张表保留为孤立数据。
- 契约 / 迁移号 0.25.0 + `V30` 依赖合并顺序，被抢占时需整体顺延并在 PR 记录。
- 全量 E2E 既有债务会让后续回归难以区分新失败；建议单独立项修复地图 / 选择器 / 数据夹具。
- 需求条目 §4 仍写站内商品与保险 5% 费用，与实现不一致，待文档窗口修订。

## 8. 结论

**Overall: Pass with documented debt（change scope；2026-11-18 复审通过）。** 后端 618、前端 482、金融 E2E 3/3、契约 0 error、OpenSpec valid；40 个 Delta Scenario 均有实现与测试落点；Non-goals 反向验证通过；未发现本 change 引入的失败。PR #42 已提交且 CI 2/2 通过（见 §9）；CD / G2 未执行。

## 9. 提交与 CI（2026-11-18）

| 项 | 结果 |
|---|---|
| PR | [#42](https://github.com/afs-2026-zha3-group-2/RouteME/pull/42) → `main` |
| 提交 | `24ae282`（1 commit，104 files，+9,221 / −13） |
| 基点 | 提交前 rebase 到 `origin/main@5cb67ff`；唯一冲突 `frontend/src/styles.css`（main 的 AI 规划样式块与本 change 的金融样式块在同一位置追加），解决方式为保留 main 块后追加本 change 的 459 行，`git diff origin/main` 为纯新增 |
| CI / Backend (Java 21) | 通过 |
| CI / Frontend (Node 22) | 通过（42s） |
| 合并状态 | 无冲突，可自动合并 |
| rebase 后本地复验 | `npm run build` 通过；前端 62 文件 / 493 tests passed（main 新增 2 个测试文件）；后端未受 main 改动影响，仍为 618 |

E2E 不在 CI（`.github/workflows/ci.yml` 只跑后端 `verify` 与前端 `build && test`），金融 E2E 仍以本地 3/3 为证据。

## 10. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| 本报告 | 报告 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 2026-11-18 保险返工后复审通过（发起人确认） | 结论、偏差与残余风险 |
| 本报告 | 报告 2 / 2（当前开发者） | Karena | 2026-11-18 | 当前开发者返工后复审 | 结论、偏差与残余风险 |

> 两个签署位已于 2026-11-18 复审通过；PR #42 已提交且 CI 2/2 通过；下一步：VL 签署 G2 → 合并 PR #42 → P5 归档（归档摘要需写入 PR 链接）。