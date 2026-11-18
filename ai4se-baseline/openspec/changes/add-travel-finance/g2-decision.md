# G2 decision — add-travel-finance

- **Gate:** G2（Verify）
- **Change:** `add-travel-finance`（capability `travel-finance` ADDED，REQ-028 / S29）
- **Timestamp:** 2026-11-18（VL 已签署生效）
- **Recorded by:** Karena（current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/reviews/20261117-add-travel-finance-p4-verify.md`](../../../docs/reviews/20261117-add-travel-finance-p4-verify.md) | Pass with documented debt（WAYNE / Karena 已签） |
| Quality report | [`docs/reviews/20261117-add-travel-finance-p4-quality.md`](../../../docs/reviews/20261117-add-travel-finance-p4-quality.md) | Pass（WAYNE / Karena 已签） |
| P4 stage record | [`docs/sdd/add-travel-finance/p4-verify.md`](../../../docs/sdd/add-travel-finance/p4-verify.md) | T0–T12 完成 |
| Contract / migration | `openapi.yaml` 0.25.0 ｜ `V30__add_travel_finance.sql` | Redocly 0 error / 26 warning；双引擎迁移通过 |
| Delta Spec | [`specs/travel-finance/spec.md`](specs/travel-finance/spec.md) | 10 Requirement / 40 Scenario，`validate --strict` valid |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | E1–E40 / D1–D12 / T0–T12 完成 |
| Pull request | [#42](https://github.com/afs-2026-zha3-group-2/RouteME/pull/42) | CI 2/2 通过，无冲突、可自动合并 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 后端 `clean verify` 618；前端 `npm run build` + 62 文件 / 493 tests（rebase 到 `origin/main@5cb67ff` 后） |
| scan | Pass | Redocly 0 error / 26 warning；`openspec validate add-travel-finance --strict` valid |
| review | Pass | 工件评审（proposal / spec / design / tasks）+ P4 验证与质量报告；无 CRITICAL。`design.md` / `tasks.md` 工件 2（Lewis Liu）签署位仍待补 |
| evidence | Pass | 40 个 Delta Scenario 均有实现与测试落点；金融 E2E 3/3（`¥10,000.00` → `¥10,950.00` → `¥9,950.00`）；反向验证 11 项（含无投保敏感字段、信用分不变） |
| ci | Pass | PR #42：CI / Backend (Java 21) 通过、CI / Frontend (Node 22) 通过（42s） |
| cd | N/A | 未合入 `main`，P5 归档待 PR 合并 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 2 | 全量 E2E 32 条既有失败（地图 502 / 账号文案漂移 / 共享库数据 / 选择器移除 / 种子行程）不在本 change 范围；E2E 不在 CI |
| SUGGESTION | 7 | 一致性 lint 登记的 7 条建议（409 与 `@rule:api-contract` 的 422 表述差异、账本不分页、NFR deferred 等） |

## Decision

**Pass with documented debt**

依据：T0–T12 全部完成；rebase 到 `origin/main@5cb67ff` 后后端 618 / 前端 62 文件与 493 tests / 金融 E2E 3/3 / 契约 0.25.0 + `V30` / Redocly 0 error / OpenSpec valid；PR #42 的 Backend 与 Frontend CI 均通过且无合并冲突。全量 E2E 的 32 条失败均为既有债务，与本 change 实现无因果关系。

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 需求条目 `REQ-028-travel-finance.md` §4 仍写站内保险商品与 5% 费用，与第三方模式不一致 | SM / Dev | 下一个文档窗口（G1 条件 C7） |
| 第三方真实投保回调 / 验签 / 对账未接入（演示确认端点） | Product / SA | 接入真实提供方时另开 change |
| 全量 E2E 既有债务（地图 502、文案与选择器漂移、共享库数据） | E2E owner | 单独立项修复夹具与地图替身 |
| E2E 不在 CI | SM | 如需进 CI 另开 change |
| `design.md` / `tasks.md` 工件 2（Lewis Liu）签署位未回收 | Lewis Liu | P3 正式关闭前补齐 |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核本地验证、CI 结果与既有债务归因，G2 结论 | 2026-11-18 |
| IO | WAYNE | Delta `travel-finance` ADDED / G1 通过 / P4 报告 | 2026-11-18 |
| SA | Jacky | 契约 0.25.0 与第三方保险口径一致 | 2026-11-18 |
| 当前开发者 | Karena | 交付实现、返工与回归结果 | 2026-11-18 |

## Next

- G2 已由 VL（Neal）于 2026-11-18 批准 → 合并 PR #42 到 `main`。
- P5 归档按用户 2026-11-18 指示**不执行**；`openspec/changes/add-travel-finance/` 保留在 `main` 作为变更记录，Living Spec 不合并。