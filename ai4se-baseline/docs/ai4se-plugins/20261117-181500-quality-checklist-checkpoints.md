# Quality Checkpoints: p4 — add-credit-exit-restriction

- **Date:** 2026-11-17 ｜ **Stage:** p4 ｜ **Scope:** local+evidence
- **Executor:** Lewis Liu
- **Basis:** `references/` 模板手工产出（打包脚本依赖 bash，本机无 bash）

## CP-1 契约与实现一致

- 命令：`npx @redocly/cli lint openapi.yaml`；`.\mvnw.cmd -B -ntp verify -Dtest=OpenApiTest`
- 证据：Redocly valid / 0 error / 19 warnings（既有）；`OpenApiTest` 10 tests 通过（含 0.15.0、`LeavePreview` / `LeaveResult` 必填、`TripDetail.cancel_reason` 系统值）。
- 结果：**Pass**

## CP-2 迁移 V21 双引擎

- 命令：`.\mvnw.cmd -B -ntp verify -Dtest=CreditEnforcementMigrationSqliteTest`
- 证据：SQLite 空库 V1→V21、V20→V21 两路径通过；H2 由 `verify` 覆盖；`credit_restriction.active_flag` 唯一索引在两端均允许多个 NULL。
- 结果：**Pass**

## CP-3 退出扣分与边界

- 命令：`.\mvnw.cmd -B -ntp verify -Dtest=CreditExitCalculatorTest,CreditExitApiTest`
- 证据：六档左闭右开（48h -5、7d 0、24h -5、12h -8、旅行中 -15）；集合时间优先；月度第 2 次翻倍；待核实零值留痕；0 分裁断仍计数。
- 结果：**Pass**

## CP-4 低信用触发 / 只读 / 清退 / 自动解除

- 命令：`.\mvnw.cmd -B -ntp verify -Dtest=CreditRestrictionApiTest`
- 证据：65→55 触发并记录 `CREDIT_SCORE_BELOW_60`；撤回 PENDING、解除 ACCEPTED、取消未结束已发布行程（系统原因可见）；系统清退无 EXIT 账本；+10 回 65 自动解除且不恢复关系；60 / 59 边界。
- 结果：**Pass**

## CP-5 前端三入口与展示面

- 命令：`npm.cmd run build`；`npm.cmd test -- --run`；`npx playwright test tests/credit-exit.spec.ts tests/credit-restriction.spec.ts tests/credit-cancel-reason.spec.ts`（隔离环境）
- 证据：前端 293 tests 通过；新增 E2E 7/7；相关回归（`credit` / `mine`）共 23/23；退出成功率文案、翻倍预览、待核实预览、限制徽标、本人原因、他人无原因、六处拦截、发布导航禁用、系统取消原因与只读聊天均有断言。
- 结果：**Pass**

## CP-6 回归与债务记录

- 命令：全量 `playwright test`（隔离共享库）；全新库 `profiles.spec.ts` / `trips.spec.ts`
- 证据：全量 99 / 123；24 条失败均为 `china-map` 地图渲染（17）与共享库累积导致首页顺序（7）；全新库 `profiles.spec.ts` 8/8、`trips.spec.ts` 19/8（8 条全为地图元素缺失）。
- 结果：**Pass with documented debt**

## CP-7 范围与合规

- 证据：无管理员页面 / 核实接口 / 人工封禁 / 测试写分接口；无明细页；不改未归档 Delta（仅新增 `credit-enforcement` ADDED）；`openspec validate --strict` valid。
- 结果：**Pass**

## CP-8 三档视口 × 双主题走查

- 证据：退出弹窗 + 受限本人主页共 8 组截图（`docs/sdd/add-credit-exit-restriction/preview/p4-*.png`），`scrollWidth - clientWidth = 0`，文案、徽标、预计影响块均清晰可读。
- 结果：**Pass**
