# G2 decision — add-match-reason

- **Gate：** G2（Verify）
- **Change：** `add-match-reason`（capability `trip-companions` MODIFIED，REQ-003 / S07）
- **Timestamp：** 2026-11-16T11:30+0800
- **Recorded by：** Jay（AO / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261116-101500-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-101500-local-verify-report.md) | Pass（后端 154、前端 67、构建成功、匹配 e2e 通过） |
| Implementation commit | `1401cf6`（分支 `feature/add-match-reason`），合并提交 `bfb07ae` | 已合入 `main` |
| Pipeline CI（required） | GitHub Actions run [#43790791755](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43790791755)（`bfb07ae`） | **Success** |
| Pipeline CD | 由 CI 触发的 CD 工作流（`workflow_run`） | Success（提交 `bfb07ae` 之后的 CD 运行） |
| Delta Spec | [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md) | 1 Requirement / 9 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T1–T5 完成；T6 的 `summary.md` 留给 P5 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 后端 `.\mvnw.cmd -B -o clean test`；前端 `npm run build` |
| scan | Skipped | 未配置安全扫描器 |
| review | Skipped | 未运行独立评审工具；按 TDD + ATDD 覆盖 |
| evidence | Pass | 验证报告 + 154 后端（`TripMatchTest` 7 项）+ 67 前端 + 匹配 e2e |
| ci | Pass | CI run #43790791755 全绿 |
| cd | Pass | CD 在 `bfb07ae` 之后成功 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 3 | 卡片视觉变化需样式回归；降级路径未触发百分比移除；其它故事 e2e 陈旧用例 |
| SUGGESTION | 2 | 参照物单值；`TripMatchTest` 目录与包名不一致 |

## Decision

**Pass**

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 卡片「匹配度 / 匹配理由」的视觉回归 | AO（Jay） | 样式 change 或 P5 视觉走查 |
| 「时间不足去掉百分比」降级路径 | SA | 若后续要求，另立 change |
| 其它故事的 e2e 陈旧选择器 | AO（Jay） | 随各自 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| VL | Neal |
| AO | Jay |
| IO | WAYNE |
| SA | Jacky、Karena |
| SM | Lewis |

签署来源：[`docs/sdd/add-match-reason/p4-verify.md`](../../../docs/sdd/add-match-reason/p4-verify.md) §签署表；VL 为独立验证人，AO 未自签 VL。

## Next

- Decision = Pass，P5 按用户 2026-11-16 指示**暂不执行**（不归档）。

## G2 追加：R2 筛选不参与匹配分（2026-11-16）

| 项 | 结果 |
|---|---|
| 验证报告 | [`20261116-142800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-142800-local-verify-report.md) |
| 契约 | 0.8.0 → **0.8.1**（`Match.basis` 描述与匹配语义） |
| 后端 | `clean test` 209 通过（`TripMatchTest` 7 项、`MatchControllerTest` 7 项） |
| 前端 | `npm test` 114 通过（无代码改动，回归确认） |
| 契约 lint | valid，0 error / 15 既有 warning |
| 端到端 | `companions.spec.ts` 3 项通过 |
| 手工比对 | 带筛选列表与详情对 trip 4 均返回 score 0 |

**结论：Pass**；新增残余项「参照物只取最近一条未结束行程」。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核 R2 证据（同分断言 + 手工比对），G2 追加 Pass | 2026-11-16 |
| SA | Jacky、Karena | 实现符合「匹配规则不变」的边界 | 2026-11-16 |
| AO | Jay | 交付实现与回归结果 | 2026-11-16 |
| SM | Lewis | 认可 R2；看板状态待人工推进到 P4 | 2026-11-16 |