# G2 decision — add-credit-exit-restriction

- **Gate：** G2（Verify）
- **Change：** `add-credit-exit-restriction`（capability `credit-enforcement` ADDED，REQ-025 / S25 + S26）
- **Timestamp：** 2026-11-17T18:15+0800
- **Recorded by：** Lewis Liu（SM / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261117-181500-local-verify-report.md`](../../../docs/ai4se-plugins/20261117-181500-local-verify-report.md) | Pass with documented debt |
| P4 stage record | [`docs/sdd/add-credit-exit-restriction/p4-verify.md`](../../../docs/sdd/add-credit-exit-restriction/p4-verify.md) | T1–T14 完成 |
| Quality report | [`docs/ai4se-plugins/20261117-181500-quality-checklist-report.md`](../../../docs/ai4se-plugins/20261117-181500-quality-checklist-report.md) | Pass with documented debt |
| Contract / migration | `openapi.yaml` 0.20.0 ｜ `V25__credit_enforcement.sql` | Redocly 0 error；双引擎迁移通过 |
| Delta Spec | [`specs/credit-enforcement/spec.md`](specs/credit-enforcement/spec.md) | 9 Requirement / 46 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T0–T14 完成；P5 / 归档按要求暂不执行 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 合并后后端 `verify`（510 tests）；前端 `npm run build`、`npm test`（356 tests） |
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

依据：T1–T14 全部完成；合并 `origin/main`（两次）后后端 510 / 前端 356 / 契约 0.20.0 + V25 / Redocly 0 error / openspec valid；新增退出与限制链路 API 测试与 E2E 全绿。全量 E2E 的 24 条失败均有干净库 A/B 证据归因为既有债务（`china-map` 地图元素缺失 17 条；共享库累积行程导致首页顺序 7 条），不属于本 change 的实现缺陷。

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
| SA | Jacky | 契约 0.20.0 与退出/限制口径一致 | 2026-11-17 |
| AO | Lewis Liu | 交付实现与回归结果 | 2026-11-17 |
| SM | Lewis | 阶段提交链 P0–P4 完整 | 2026-11-17 |

## Next

- Decision = Pass with documented debt；按用户 2026-11-17 指示 **P5 / 归档暂不执行**。
- 收尾：`git pull` → 合并 `feature/add-credit-exit-restriction` 到 `main` → push → 删除已完成分支。

## R2 验收修订（2026-11-17）

- 用户验收指出 3 个交互问题（标签当占位项、未选原因可提交、待核实多一行），并补充说明 / 证明材料要求；已在同一 change 内完成（T15–T18），不改变 G2 结论。
- 契约 **0.21.0**；迁移 **V26**（`exit_note` + `credit_exit_attachment`）。
- 复验：后端 514 / 前端 362 / 隔离 E2E 23 通过；详见 `docs/sdd/add-credit-exit-restriction/p4-verify.md` §10。
- 按用户指示本次不 pull、不 push；改动保留在本地工作区。

## R3 本人回看（2026-11-17）

- 用户验收指出原因 / 说明 / 图片无本人查看入口；新增 `GET /trips/{tripId}/leave-record` 与 `GET /leave-evidence/{attachmentId}`，入口在「我的旅行 → 我申请的（已退出）」，仅本人、只读。
- 契约 **0.22.0**；无新迁移。复验：后端 515 / 前端 362 / E2E credit-exit 4/4；见 `docs/sdd/add-credit-exit-restriction/p4-verify.md` §11。
- 仍按用户指示未 pull / 未 push。

## R4 同一行程多次退出（2026-11-17）

- 用户验收发现退出后再次加入并被接受，第二次退出不生效；根因是幂等键只按 user + trip。改为按本次同行关系（application）幂等，同一行程可多次退出且每次计入当月；记录接口返回全部。
- 契约 **0.23.0**；迁移 **V27**（`application_id`，旧数据回填）。复验：后端 516 / 前端 362 / E2E credit-exit 5/5；见 `docs/sdd/add-credit-exit-restriction/p4-verify.md` §12。
- 仍未 pull / 未 push。
