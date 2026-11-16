# G2 decision — add-user-logout

- **Gate：** G2（Verify）
- **Change：** `add-user-logout`（capability `user-auth` MODIFIED，REQ-006）
- **Timestamp：** 2026-11-16T11:30+0800
- **Recorded by：** Jay（AO / current developer），opencode 代录

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261116-111241-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-111241-local-verify-report.md) | Pass（构建、前端 74、后端 154、`auth.spec.ts` 7/7、全套 E2E 25/25、validate strict） |
| Implementation commit | `79a7f42`（功能）、`e469a31`（行高对齐）；合入 `711da3d` | 已推送 `main` |
| Pipeline report（required） | [`docs/ai4se-plugins/20261116-112704-pipeline-report.md`](../../../docs/ai4se-plugins/20261116-112704-pipeline-report.md) | Overall **Partial** / `Pass-by-human-confirm`（CI + CD success，证据 release `build-711da3d`；已在 Inputs 引用） |
| Pipeline CI report（`phase=ci`，E1 slot） | [`ci-report.md`](ci-report.md) | Pass（Overall **Partial** / `Pass-by-human-confirm`；代码态 `d5d70fa`，release `build-d5d70fa`） |
| Delta Spec | [`specs/user-auth/spec.md`](specs/user-auth/spec.md) | 1 Requirement（MODIFIED「会话校验与退出」）/ 10 Scenario，保留基线 3 场景 |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T1–T5 完成并勾选；P4 执行记录已补 |
| G1 decision | [`g1-decision.md`](g1-decision.md) | Pass（2026-11-16，条件 7 项已在 P4 落地） |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | `npm run build` 成功；后端无改动，`mvnw test` 154 项回归 |
| scan | Pass | 本地静态检查 Pass（见验证报告 Summary） |
| review | Pass | 代码走查通过；`dialog` / `listbox` / Esc 焦点返回核对 |
| evidence | Pass | 本地报告 6 条命令全绿 + 1440/768/390 与浅深色走查 |
| ci | Pass（Partial） | Backend / Frontend job 结论成功（由 CD tag 推断），无 API 明细 |
| cd | Pass | release `build-711da3d` 已发布 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 2 | E2E 数据污染挤出种子行程（已备份清理）；并发 agent 回滚未提交文件（已改为立即提交） |
| SUGGESTION | 2 | 归档 `add-user-auth` T6 旧表述待 G3 记录取代；身份行 46px 与退出行 34px 不一致 |

## Decision

**Pass**

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| E2E 数据卫生（独立测试库或 `afterEach` 清理） | AO（Jay） | 另立 change |
| E2E 未纳入 CI 流水线（验收仅本地） | AO（Jay） | 跟踪，不阻断本 change |
| 归档 `add-user-auth` 的 T6「演示身份不显示退出」旧表述 | AO + SA | P5 / G3 在 `summary.md` 记录取代关系 |
| 身份选项行 46px 与退出行 34px 不一致 | AO（Jay） | 视觉后续调整 |
| 两 change 直推 `main`、无独立 PR（流程偏差） | AO（Jay） | 流程记录；后续按 `/sdd:pr-submit` 执行 |

## Approvers

| 角色 | 姓名 |
|---|---|
| VL | Neal |
| AO | Jay |
| IO | WAYNE |
| SA | Jacky、Karena |
| SM | Lewis |

签署来源：[`docs/sdd/add-user-logout/p4-verify.md`](../../../docs/sdd/add-user-logout/p4-verify.md) §7 负责人签署；VL 为独立验证人，AO 未自签 VL。

## Next

- Decision = Pass；P5（归档）由用户发起。
- 归档时用 MODIFIED 替换 `openspec/specs/user-auth/spec.md` 的「会话校验与退出」并保留基线 3 场景，同时在 G3 记录旧 T6 表述已被取代。