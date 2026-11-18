# P3 阶段记录 — add-travel-finance

- **Change：** `add-travel-finance`（REQ-028 / S29 旅行保障与小额借款）｜ **阶段：** P3（Design & decompose）
- **日期：** 2026-11-17（2026-11-18 保险返工后更新）｜ **记录人：** Karena（当前开发者）
- **基点：** `origin/main@822471c`，分支 `feature/add-travel-finance`

## 0. 复审说明（2026-11-18）

保险改为「第三方投保入口 + 状态回写」后，P3 工件同步重写：Delta 由 38 场景增至 **40 场景**，ATDD 映射扩展为 **E1–E40**，`design.md` 的保险决策改写为配置驱动（D3 / D4）。原型部分因 `docs/prototype/v1` 已由 main 归档而撤回，界面证据改以生产 UI 与 E2E 为准。2026-11-17 的 P3 签名因返工失效，需重新审阅。

## 1. 阶段目标

把已签的 Delta（`travel-finance`，10 Requirement / 40 Scenario）收敛为可执行的设计与任务：产出 ATDD 设计（E1–E40）、技术设计（D1–D12）与带 owner / 验证命令 / 覆盖映射的任务清单（T0–T12），并完成 Spec ↔ Design ↔ Tasks ↔ ATDD 对齐自检。

## 2. 产出

| 工件 | 路径 | 结论 |
|---|---|---|
| 原型截点 | `docs/prototype/v1`（已归档） | 本 change 不新增或改结构；页面骨架复用既有 `detail-section` / `card` / `chip` 令牌，新增 `.fin-*` 版式 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/add-travel-finance/atdd-design.md) | 40/40 场景分层（API 主覆盖、16 组含 E2E、UT defer）；红态顺序、固定 Clock 夹具、门禁、11 条 Non-goals 反向验证、覆盖缺口处置；NFR deferred |
| 技术设计 | [`design.md`](../../../openspec/changes/add-travel-finance/design.md) | D1–D12：四表 + 钱包 CAS + 同事务流水 + 借款 5% 整数费率 + 第三方保险入口 / 状态回写 / 到期派生 + 资格与账号状态 + 契约 0.25.0 + 幂等 + 注册集成 + 前端路由 + 测试 / 回滚 |
| 任务清单 | [`tasks.md`](../../../openspec/changes/add-travel-finance/tasks.md) | T0–T12，Owner Karena；契约 / 后端 / 前端 / E2E / 回归单层分任务；对齐自检 Pass |
| 设计评审 | [`20261117-add-travel-finance-design-review.md`](../../reviews/20261117-add-travel-finance-design-review.md) | Pass 结论保留；签名槽位重置为待复审（2026-11-18 返工） |
| 任务评审 | [`20261117-add-travel-finance-tasks-review.md`](../../reviews/20261117-add-travel-finance-tasks-review.md) | Pass 结论保留；签名槽位重置为待复审（2026-11-18 返工） |

## 3. P3 决策落点

| 编号 | 议题 | 结论 |
|---|---|---|
| P3-D1 | 契约 / 迁移号 | 本 change 落定 **0.25.0 + V30**（rebase 到 `origin/main@822471c` 后按「后到者顺延」确认，main 已用 0.24.0 + `V29`）；合并顺序再变化时整体顺延 |
| P3-D2 | 钱包并发 | `UPDATE ... WHERE balance_cents = before` CAS + 同事务流水；0 行重读重试，业务唯一键兜底 |
| P3-D3 | 账本口径 | 金额整数分；`ledgerOf` 与契约集合按 `occurred_at ASC, id ASC` 升序，支持顺序回算；保险不产生流水 |
| P3-D4 | 借款口径 | 本金整元 100–2,000；5% 从本金扣，净额发放；应还 = 本金；`due_at = funded_at + N 天`；逾期只读派生 |
| P3-D5 | 保险口径 | 第三方入口 + 状态回写；保障期取行程起止日；每 (user, trip) 至多 1 条；`EXPIRED` 读取时派生；不保存保单号 / 证件 / 银行卡 / 保费 / 保额 |
| P3-D6 | 第三方配置 | `routeme.insurance.*` 提供提供方名称与投保 / 保单 / 理赔 / 求助地址，默认 `example.com` 占位；客户端不可覆盖 |
| P3-D7 | 资格与账号状态 | 发布者或 `ACCEPTED` 同行者；行程 `recruiting` / `full` / `ongoing`；投保入口 / 回写 / 借款要求 `ACTIVE`；还款不因账号状态阻断 |
| P3-D8 | 入口 | 行程详情按资格显示；账号菜单与侧边栏「我的旅行」下方进入 `#/finance`；移动端底部导航不变；无资格直达页展示说明且无表单 |
| P3-D9 | NFR | 并发压测 / 交易监控 / 审计导出 deferred，P4 报告注明 |

## 4. 校验

- `npx.cmd openspec validate add-travel-finance --strict` → `Change 'add-travel-finance' is valid`
- ATDD E1–E40 共 40 个唯一编号，与 Delta 40 Scenario 一一对应；`design.md` 含 D1–D12 共 12 条决策
- 基线核对：迁移 head `V30`、契约 `RouteME/openapi.yaml` 0.25.0、`OpenApiTest` 两处版本断言、`V20` 唯一索引先例、`TripTimeZoneConstant.ZONE`、`ApplicationService.isAccepted`、`route.ts` 路由无冲突
- 任务命令按 Windows 口径改为 `cd RouteME/backend; .\mvnw.cmd ...`，与 `rules/quality/rules.md#java-coding-style` 一致

## 5. 签署

| 角色 | 签署位 | 姓名 | 状态 |
|---|---|---|---|
| 当前开发者 | `design.md` / `tasks.md` 工件 1；两份报告 2 | Karena | 待重签（2026-11-18 返工） |
| 第二签署（design / tasks） | 工件 2（非当前开发者且非 WAYNE） | Lewis Liu | 待重签（2026-11-18 返工） |
| IO | 两份评审报告 1 | WAYNE | 待重签（2026-11-18 返工） |

**阶段结论：Pass（建议）**；8 个签署位待 2026-11-18 返工后重新批准，进入 P4 验证。

## 6. 带入 P4 的跟踪项

| 项 | 说明 |
|---|---|
| T1 / T4 Red | 先写钱包 / 迁移 / 第三方保险 / 借款 / 资格红态用例，再落 T2–T8 实现 |
| 迁移双引擎 | `V30` 必须同时跑 SQLite（迁移测试）与 H2（Spring 测试）；只用普通唯一索引 |
| 契约断言 | T5 同步 `OpenApiTest` 两处版本断言与 3 个新错误码、保险状态 / 类别枚举、`POLICY_EXISTS` 退休、流水枚举、集合排序描述 |
| 409 偏差 | 业务规则拒绝用 409 与 `@rule:api-contract` 的 422 表述不一致，P4 验证报告记录为已知偏差 |
| E2E 不在 CI | `finance.spec.ts` 只能本地门禁；全量回归在 T12 |
| 入口 hash | 原型历史写作 `#/trip/{id}/finance`，产品为 `#/trips/{tripId}/finance`；以产品为准 |
| 第三方真实对接 | 演示用配置 + 演示确认端点；真实回调 / 验签 / 对账写在 Out of scope 与残余风险 |

## 7. 提交记录

本阶段按用户指示只本地提交、不 push；新增 / 修改：`openspec/changes/add-travel-finance/{atdd-design,design,tasks,dov-ac-review,g1-decision,consistency-lint}.md`、`docs/reviews/20261117-add-travel-finance-{design,tasks}-review.md`、`requirement-workspace/{registry,handoff}.md`、本记录与 `docs/sdd/README.md` 索引。