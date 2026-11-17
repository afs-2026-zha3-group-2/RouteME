# G2 decision — add-credit-exit-restriction

- **Gate：** G2（Verify）
- **Change：** `add-credit-exit-restriction`（capability `credit-enforcement` ADDED，REQ-024 / S25 + S26）
- **Timestamp：** 2026-11-17T18:15+0800
- **Recorded by：** Lewis Liu（SM / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261117-181500-local-verify-report.md`](../../../docs/ai4se-plugins/20261117-181500-local-verify-report.md) | Pass with documented debt |
| P4 stage record | [`docs/sdd/add-credit-exit-restriction/p4-verify.md`](../../../docs/sdd/add-credit-exit-restriction/p4-verify.md) | T1–T14 完成 |
| Quality report | [`docs/ai4se-plugins/20261117-181500-quality-checklist-report.md`](../../../docs/ai4se-plugins/20261117-181500-quality-checklist-report.md) | Pass with documented debt |
| Contract / migration | `openapi.yaml` 0.19.0 ｜ `V25__credit_enforcement.sql` | Redocly 0 error；双引擎迁移通过 |
| Delta Spec | [`specs/credit-enforcement/spec.md`](specs/credit-enforcement/spec.md) | 9 Requirement / 46 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T0–T14 完成；P5 / 归档按要求暂不执行 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 合并后后端 `verify`（491 tests）；前端 `npm run build`、`npm test`（351 tests） |
| scan | Pass | Redocly lint valid（0 error / 19 既有 warning）；`openspec validate --strict` valid |
| review | Pass | P3 工件评审（design / tasks）+ P4 本地验证；无 CRITICAL |
| evidence | Pass | 退出 / 待核实 / 月度边界 / 限制触发与清退 / 自动解除 / 系统取消原因均有 API + E2E 断言；新增 E2E 7 条、相关回归 23 条全绿 |
| ci | N/A | E2E 不在 CI（仓库现状）；后端 / 前端 / 契约由 CI 覆盖，PR 后确认 |
| cd | N/A | P5 暂不执行 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 2 | 全量 E2E 24 条既有失败（地图渲染 17 + 共享库累积顺序 7）；E2E 不在 CI |
| SUGGESTION | 2 | 每页一次信用请求；退出成功文案前后端两次格式化 |

## Decision

**Pass with documented debt**

依据：T1–T14 全部完成；合并 `origin/main` 后后端 491 / 前端 351 / 契约 0.19.0 + V25 / Redocly 0 error / openspec valid；新增退出与限制链路 API 测试与 E2E 全绿。全量 E2E 的 24 条失败均有干净库 A/B 证据归因为既有债务（`china-map` 地图元素缺失 17 条；共享库累积行程导致首页顺序 7 条），不属于本 change 的实现缺陷。

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 地图渲染 E2E 债务（`china-map` / `.place-chip-name`） | 地图 owner（REQ-016） | 随 REQ-016 处理 |
| 共享库累积导致首页顺序断言失效 | E2E owner | 后续 E2E 用独立库或分片 |
| 待核实事件无管理端 | 产品 | 按用户裁决 D3 另开 change |
| E2E 不在 CI | SM（Lewis Liu） | 如需进 CI 另开 change |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核本地验证与干净库 A/B 证据，G2 Pass with documented debt | 2026-11-17 |
| IO | WAYNE | Delta `credit-enforcement` ADDED / G1 通过 | 2026-11-17 |
| SA | Jacky | 契约 0.19.0 与退出/限制口径一致 | 2026-11-17 |
| AO | Lewis Liu | 交付实现与回归结果 | 2026-11-17 |
| SM | Lewis | 阶段提交链 P0–P4 完整 | 2026-11-17 |

## Next

- Decision = Pass with documented debt；按用户 2026-11-17 指示 **P5 / 归档暂不执行**。
- 收尾：`git pull` → 合并 `feature/add-credit-exit-restriction` 到 `main` → push → 删除已完成分支。
