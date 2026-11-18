# 质量检查报告 — add-travel-finance（P4）

- **Change：** `add-travel-finance`（REQ-028 / S29 旅行保障与小额借款）
- **阶段：** P4（Apply & verify）｜ **日期：** 2026-11-17（2026-11-18 保险返工后重跑）｜ **记录人：** Karena（当前开发者）
- **Focus：** full-stage（P4 必检项 + 实现质量维度）
- **证据：** [`20261117-add-travel-finance-p4-verify.md`](20261117-add-travel-finance-p4-verify.md)
- **编号顺延：** rebase 到 `origin/main@822471c` 后，REQ-024 / S25 → REQ-028 / S29，契约 0.19.0 → 0.24.0 → 0.25.0，迁移 `V25` → `V28` → `V30`（两轮 rebase）

## 0. 复审说明（2026-11-18）

保险改为第三方入口 + 状态回写后，本报告按最终实现更新：后端 618、前端 482、金融 E2E 3/3、Redocly 26 warning、40 场景；2026-11-18 提交前 rebase 到 `origin/main@5cb67ff` 后本地复验为前端 62 文件 / 493 tests（后端未受 main 改动影响）。原签署因返工失效；2026-11-18 返工后经 WAYNE 与 Karena 复审通过。

## 1. P4 检查项

| Check id | Required? | Status | Evidence |
|---|---|---|---|
| P4-1 实现与验证完成 | yes | Pass | 后端 618 / 前端 482 / 金融 E2E 3/3；契约 0 error（26 warning）；`openspec validate --strict` valid |
| P4-2 本地验证结论 | yes | Pass | 本地验证 Overall **Pass with documented debt（change scope）**；无本 change 引入的失败 |
| P4-3 PR / 远端 CI | yes | Skipped | 按用户指示全部改动保持未提交、未 push；无 PR 与 CI 运行 |
| P4-4 CD / 部署 | yes* | Skipped | 未部署 |
| P4-5 G2 决策 | yes* | Pending | G2 由 VL 独立签署；本报告不代替 `g2-decision.md` |
| P4-6 Apply / verify 分离与签署纪律 | yes | Pass | 实现与验证证据均在 P4；未自签任何 Gate；评审报告签署位留给 WAYNE + Karena |
| P4-7 迁移与密钥 | yes | Pass | 新增 `V30`（4 表 / 钱包与账本 CHECK / 借款恒等 CHECK / 2 唯一索引 / 4 普通索引 / 回填），SQLite 与 H2 双引擎通过；无新增密钥或外部凭据；第三方地址为配置占位 |

**Stage Overall：** Pass（必检 5/5；P4-3 / P4-4 未到达，P4-5 待 VL）

## 2. 实现质量维度

| 维度 | 结论 | 说明 |
|---|---|---|
| A 架构与包结构 | Pass | 领域 `pojo`、实体 `entity`、mapper、`service` 接口 + `impl`、`request` / `response`、`exception` 均按既有分层；无跨层反向依赖；第三方配置独立在 `config/Insurance*` |
| B 金额与并发 | Pass | 借款全部整数分；CAS `WHERE balance_cents = before` + 同事务流水；`nextId` 冲突重试；保险 / 借款唯一索引兜底；借款费率只在 `FinanceFeeConstant` 一处；保险无金额字段 |
| C Java 风格 | Pass | record 请求 / 响应；构造注入；无浮点、无魔法字符串（错误码 / 枚举集中）；中文注释说明口径 |
| D Web 风格 | Pass | 组件沿用 antd 与既有 `.fin-*` 版式；文案集中在 `i18n/financeMessages.ts`；提交中禁用按钮；390 / 768 / 1024 / 1440 与深浅主题已走查 |
| E 测试 | Pass | 40/40 场景有落点；`in_<input>_out_<expected>` 命名；金额断言用整数分；固定 Clock；新增反向验证用例（无敏感字段、信用分不变） |
| F 安全 | Pass | 资格与账号状态服务端强制；他人 `loanId` 403 不泄漏；还款刻意绕开 `assertCanWrite`；无改余额端点；请求 DTO 无定价字段；不保存保单号 / 证件 / 银行卡 |
| G 文档与可追溯 | Pass | 正文中文、标识符 / 错误码 / 枚举英文；`design.md` D1–D12、`atdd-design.md` E1–E40、`tasks.md` T0–T12 与 Delta 一一对应；偏差与残余风险单列 |

## 3. 测试增量

| 层 | 当前 | 说明 |
|---|---|---|
| 后端 | 618 | 金融 5 个 API / 迁移测试类、`WalletServiceImplTest`、`AuthControllerTest` 注册钱包、`OpenApiTest` 契约断言（返工删除站内商品用例） |
| 前端 | 482（60 文件） | `financeFormat.test.ts`、`financeEligibility.test.ts`、`route.test.ts`、`api.test.ts`；删除商品卡相关断言 |
| E2E | 3 | `e2e/tests/finance.spec.ts`：投保跳转 + 演示回写、无资格路径、已结束行程 |

## 4. Gaps

| Check id | Gap | Owner | Suggested next |
|---|---|---|---|
| advisory | 全量 E2E 32 条既有债务（高德 502 / 选择器与文案漂移 / 共享库数据），会掩盖新失败 | 团队 | 单独立项修复夹具与地图替身；E2E 纳入 CI 稳定子集 |
| advisory | 409 用于业务规则拒绝，与 `@rule:api-contract` 的 422 表述不一致 | SA / IO | P5 在 Living Spec 或规则侧统一口径；本 change 不改状态码 |
| advisory | NFR（并发压测 / 交易监控 / 审计导出）deferred | Product / Tech | 真实资金场景前另开 change |
| advisory | 账本不分页、无 down 迁移 | Karena | 交易量增长或有回滚诉求时另开 change |
| advisory | 契约 26 条 warning（示例与 4xx 声明），低于 main 基线 28 | Karena | 后续统一清理示例与 4xx 响应声明 |
| advisory | 第三方真实投保 / 回调 / 验签未接入 | Product / SA | 接入真实提供方时另开 change |
| advisory | 需求条目 §4 仍写站内商品与保险 5% 费用 | SM | 文档窗口修订 |
| resolved | PR / CI 未执行 | Karena | 2026-11-18 已提交 PR #42，CI 2/2 通过（Backend / Frontend）；CD 与 G2 仍未执行（G2 由 VL 签署） |

## 5. 结论

**Overall: Pass（P4 change scope；2026-11-18 复审通过）。** 实现、测试、契约闭环；未发现阻断缺陷；上述 gaps 均为非阻断项且已登记。本报告不是 Gate 结论。

## 6. 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| 本报告 | 报告 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 2026-11-18 保险返工后复审通过（发起人确认） | 检查项结论与 gaps |
| 本报告 | 报告 2 / 2（当前开发者） | Karena | 2026-11-18 | 当前开发者返工后复审 | 检查项结论与 gaps |

> 两个签署位已于 2026-11-18 复审通过；PR #42 已提交且 CI 2/2 通过；下一步：VL 签署 G2 → 合并 PR #42 → P5 归档（归档摘要需写入 PR 链接）。