# G2 decision — add-admin-dashboard

- **Gate：** G2（Verify）
- **Change：** `add-admin-dashboard`（capability `admin-dashboard` ADDED，REQ-023 / S25）
- **Timestamp：** 2026-11-17T18:15+0800
- **Recorded by：** Jacky（SA / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261117-180500-local-verify-report.md`](../../../docs/ai4se-plugins/20261117-180500-local-verify-report.md) | Pass（契约 12、API 12、聚合 6、前端 357、E2E 后台 10/10；后端全量 453 / 3 为外部 WIP） |
| Implementation commit | P4 实现提交（本记录同批） | 尚未推送；提交前按 hunk 选择性暂存，排除并行会话 WIP |
| Delta Spec | [`specs/admin-dashboard/spec.md`](specs/admin-dashboard/spec.md) | 5 Requirement / 13 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T1–T12 完成 |
| G1 | [`g1-decision.md`](g1-decision.md) | Pass（C1–C6 约定：单端点、只读、快照口径） |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 后端 `.\mvnw.cmd -B -ntp test` 453 项（3 条外部 V24 失败；排除后 430/430）；前端 `typecheck` 0 error、`build` 成功、`npm test` 47 files / 357 tests |
| scan | Skipped | 未配置安全扫描器；本 change 无新增依赖、无外部输入、无写路径 |
| review | Skipped | 未运行独立评审工具；由 `@rule:artifact-review-gate` 的 design / tasks 评审与 RED → GREEN 覆盖 |
| evidence | Pass | 契约 / API / 聚合 / 纯函数四层 Red 证据 + E2E M1–M5 Red；后台 E2E 10/10；三档 × 双主题截图与 AA 对比度 |
| ci | Pending | 未推送、未开 PR；G2 签署后按 PR 流程触发 CI，结果待回填 |
| cd | N/A | 单端点 + 前端页面，无部署面变化 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 3 | 后端 3 条 V24 profile 断言失败（并行会话迁移 / 数据 WIP）；全量 E2E 35 条失败均来自 HEAD 漂移、并行 WIP 与本机地图环境债务；共享 8080 仍是旧版本，需重启后才提供概览端点 |
| SUGGESTION | 2 | 组件层无 jsdom / Testing Library，卡片渲染回归依赖 E2E；`styles.css` / `App.tsx` / `AppShell.tsx` 为并行修改热点，合并需抽查 |

## Decision

**Pending（本地验证 Pass，G2 签署未收集）**

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 收集 VL / AO / IO / SM 签署后方可推进 P5 与远端合并 | SM + 各签署人 | 本次提交后立即 |
| 重启共享 8080 以加载 0.18.0 与 `/api/admin/dashboard` | Dev（本机） | 合并后 |
| 3 条 V24 profile 失败与 `auth.spec.ts` / `credit.spec.ts` 漂移 | 各自 change owner + 项目治理 | 独立 change 修复，不并入本 change |
| 地图 / 发布类 E2E 缺 `amap-local.yml` 与种子日期翻篇 | Dev + 项目治理 | 另立基础设施 change |
| 组件测试基础设施（jsdom + Testing Library） | Dev | 另开基础设施 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| VL | 待签署 |
| AO | 待签署 |
| IO | 待签署 |
| SA | Jacky（当前开发者） |
| SM | 待签署 |

签署来源待收集；[`docs/sdd/add-admin-dashboard/p4-verify.md`](../../../docs/sdd/add-admin-dashboard/p4-verify.md) §5 的签署表与本节同步更新。VL 必须为独立验证人，AO 不得自签 VL。

## Next

- 先提交 P4 实现与验证记录（不推送）；收集 G2 签署；签署通过后按 PR 流程合入。P5 需先归档 `add-admin-console`，按既定要求暂不执行。