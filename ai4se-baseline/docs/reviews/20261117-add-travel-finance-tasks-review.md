# Artifact review — add-travel-finance / tasks

- **Verdict: Pass（建议）**
- **Scope:** focus=tasks（`@rule:artifact-review-gate` 的 P3 任务清单评审）；root=`ai4se-baseline`；timestamp=2026-11-17（2026-11-18 保险返工后复审）
- **Artifact under review:** [`tasks.md`](../../openspec/changes/add-travel-finance/tasks.md)（T0–T12 + 对齐自检）
- **Supporting inputs:**
  - [`design.md`](../../openspec/changes/add-travel-finance/design.md)（D1–D12；Karena / WAYNE 已复审通过 2026-11-18，Lewis Liu 待签）
  - [`atdd-design.md`](../../openspec/changes/add-travel-finance/atdd-design.md)（E1–E40）
  - [`specs/travel-finance/spec.md`](../../openspec/changes/add-travel-finance/specs/travel-finance/spec.md)（10 Requirement / 40 Scenario）
  - [`20261117-add-travel-finance-design-review.md`](20261117-add-travel-finance-design-review.md)（Pass 建议）
- **Evidence:**
  - 规则核对：`rules/process/rules.md#spec-first`（P3 门槛：任务分层、落点、验证命令）、`#artifact-review-gate`、`#tdd-cycle`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/architecture/rules.md#api-contract`
  - 命令核对：仓库同时存在 `backend/mvnw` 与 `backend/mvnw.cmd`；CI `ci.yml` 为 `./mvnw -B -ntp verify`、`npm run build && npm test`，E2E 不在 CI；`frontend/package.json` 的 `test` 为 `vitest run`；`e2e/playwright.config.ts` 的 `testDir` 为 `./tests`
  - 命令可执行性：本机为 Windows；`rules/quality/rules.md#java-coding-style` 要求 `mvnw.cmd`，任务命令统一为 `cd RouteME/backend; .\mvnw.cmd ...`
  - 契约基线：`RouteME/openapi.yaml` 为 0.25.0，`redocly.yaml` 位于 `RouteME/`；`OpenApiTest` 路径为 `../openapi.yaml`
  - 迁移基线：head 为 `V29__credit_exit_application.sql`，`V30` 由本 change 占用
  - 覆盖核对：`atdd-design.md` 40 行 E1–E40 与 `tasks.md` 对齐表逐行对应，无孤儿场景
  - 场景编号核对：ATDD 40 个 E-ID 唯一

## 复审说明（2026-11-18）

保险返工后任务清单同步调整：

- T0 改为「原型核对（已归档；rebase 后撤回）」，不再新增原型资产；
- T4 改为第三方保险红态用例：行程上下文、提供方 / 类别 / 入口、投保跳转不改钱包、状态回写与保障期、重复回写幂等、到期派生、无敏感字段；
- T6 改为「第三方保险服务与控制器」：`InsuranceProperties` / `InsuranceConfig`、`InsuranceServiceImpl`、跳转与确认端点；
- T5 契约改为 11 个 schema、3 个新错误码，删除 `/finance/plans`；
- T10 / T11 前端与 E2E 改为第三方入口与演示同步；
- 覆盖计数更新为 40 Scenario；P4 执行结果更新为 618 / 482 / 3。

## Findings

| id | severity | rule | location | issue | suggested_fix | status |
|---|---|---|---|---|---|---|
| T-01 | WARNING | `rules/testing/rules.md#java-testing` | T1–T8 | Delta R10「金额始终为整数分」在对齐表登记为 E38，但任务正文没有任何显式断言落点 | T8 增加「金额契约校验」：`amount_cents` / `balance_cents` / 前后余额断言为整数、序列化无小数；E38 同时在借款 / 还款响应中复用 | **已修** |
| T-02 | SUGGESTION | `rules/architecture/rules.md#api-contract` | T5 | 验证命令 `npx.cmd @redocly/cli lint openapi.yaml` 未给工作目录，仓库根目录并不存在 `openapi.yaml` | 写明 `RouteME/openapi.yaml` 与 `cd RouteME` 后执行（读取 `redocly.yaml`） | **已修** |
| T-03 | SUGGESTION | `rules/process/rules.md#tdd-cycle` | T3 | 流水排序是 E5 / E6 断链校验的前提，但任务只写「CAS + 同事务流水」，未写升序要求 | T3 明确 `ledgerOf` 按 `occurred_at ASC, id ASC` 返回 | **已修** |
| T-04 | SUGGESTION | `rules/testing/rules.md#java-testing` | T6 | 后端 `FinanceEligibility` 纯逻辑没有单测落点，只有 API 覆盖与前端 `financeEligibility.test.ts` | 可接受：权威行为在 API（E19 / E24 / E35 / E36）；P4 若逻辑分支增多再补 `FinanceEligibilityTest`，不阻塞 | 接受并记录 |
| T-05 | SUGGESTION | `rules/testing/rules.md#web-testing` | T11 | E2E 不覆盖 `SUSPENDED` / `BANNED` 与跨日到期 | 可接受：`atdd-design.md` §7 已声明由 API + 固定时钟覆盖；E2E 只承担 ACTIVE 主路径与入口 | 接受并记录 |
| T-06 | WARNING | `rules/process/rules.md#spec-first` | T5 / T6 | 原任务曾把契约（`RouteME/openapi.yaml`、`OpenApiTest`）与后端（`FinanceController`、`InsuranceService`）放同一层，违反「一条任务只落一层」 | 拆为 T5「契约 0.25.0」与 T6「第三方保险服务与控制器」；对齐表与分层自检同步 | **已修** |
| T-07 | WARNING | `rules/quality/rules.md#java-coding-style` | T2–T8、T12 验证命令 | 后端测试命令曾写 `./mvnw`，但规则要求 Windows 用 `mvnw.cmd` | 后端命令改为 `cd RouteME/backend; .\mvnw.cmd ...`，T12 的前端 / E2E / Redocly 命令补全工作目录 | **已修** |
| T-08 | SUGGESTION | `rules/process/rules.md#spec-first` | T0 | 原型先行要求与 main 归档 `docs/prototype/v1` 冲突 | 改为「原型核对（已归档；rebase 后撤回）」，界面证据以生产 UI 与 E2E 为准，并在覆盖 / 验证列注明 | **已修** |
| T-09 | SUGGESTION | `rules/architecture/rules.md#api-contract` | T4 / T6 | 第三方模式下必须显式拒绝「客户端传提供方 / 价格 / 保障期 / 保单号」 | T4 覆盖「客户端不能改写提供方或价格」，T6 明确服务端配置为准 | **已修** |

**Counts:** BLOCKER 0 / WARNING 3（已修）/ SUGGESTION 6（4 已修 / 2 接受并记录）→ **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 顺序为原型核对 → Red 用例 → 迁移 / 领域 → 钱包 → 契约 → 第三方保险 → 借款 / 还款 → 聚合 → 前端逻辑 → 前端页面 → E2E → 回归；每个任务只落一层 |
| B Quality | Pass | T1–T12 均有可执行验证命令；T12 全量回归 + Non-goals 反向检查（无承保 / 定价 / 理赔 / 退保 / 罚息 / 充值提现 / 管理后台 / 通知 / 信用分变化） |
| C Testing | Pass | 40/40 场景有承接；API 主覆盖金额与边界，E2E 覆盖用户可感知路径，UT 覆盖 CAS 重试；E38 已补显式断言 |
| D Security | Pass | T4 / T6 / T7 显式覆盖越权 403、数据隔离、账号状态；无改余额或改价端点任务；还款放行有专门用例；无投保敏感字段断言 |
| E Process | Pass | 先 Red 后 Green；契约 0.25.0 在 T5、迁移 `V30` 在 T2；T0 原型已归档并注明撤回；Owner 统一为当前开发者；测试方法命名沿用 `in_<input>_out_<expected>` |
| F Documentation | Pass | 任务含落点文件、覆盖 ID、验证命令；对齐表给出 Spec ↔ Design ↔ Tasks ↔ ATDD 四向关系；契约 / 迁移号写明排他关系 |
| G Traceability | Pass | 10 个 Requirement 全部映射；无孤儿场景、无越界任务；任务层标签单一；T12 收口 P4 报告与 registry / handoff 更新 |

## Residual risks

- T11 的 E2E 不在 CI，回归只能本地证明；沿用仓库既有残余风险。
- T5 的契约 / 迁移号已按 main 的 0.24.0 + `V29` 顺延为 0.25.0 + `V30`；合并顺序再变化时需整体顺延并重跑契约断言。
- T4 / T7 的并发用例以顺序重复提交 + UT 的 CAS 0 行分支替代，未做压测；NFR deferred 需在 P4 报告显式列出。
- `SUSPENDED` / `BANNED` 只由 API 验证；若后续后台入口变化，E2E 仍无法覆盖该路径。
- T0 原型已归档；第三方真实投保无法在 E2E 完成，只断言新窗口地址含 `trip_id`。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `tasks.md` | 工件 1 / 2（当前开发者） | Karena | 2026-11-18 | 2026-11-18 保险返工后复审通过（当前开发者） | T0–T12 + 对齐自检 |
| `tasks.md` | 工件 2 / 2（非当前开发者且非 WAYNE） | Lewis Liu | 待重签 | 待 Lewis Liu 复审确认（尚未回收） | T0–T12 + 对齐自检 |
| 本评审报告 | 报告 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 2026-11-18 保险返工后复审通过（发起人确认） | 结论与签署位 |
| 本评审报告 | 报告 2 / 2（当前开发者） | Karena | 2026-11-18 | 当前开发者复审（Karena） | 结论与签署位 |

> 2026-11-17 的原签署因保险返工失效；2026-11-18 返工后已回收 Karena（3 处）与 WAYNE（1 处）的复审通过；`tasks.md` 工件 2（Lewis Liu）签署位仍未回收，P3 正式关闭需先补齐该签署位。