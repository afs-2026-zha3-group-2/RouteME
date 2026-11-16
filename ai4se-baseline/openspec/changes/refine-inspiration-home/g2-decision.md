# G2 decision — refine-inspiration-home

- **Gate：** G2（Verify）
- **Change：** `refine-inspiration-home`（capability `trip-plans` MODIFIED + `trip-experiences` MODIFIED，REQ-005 / S03）
- **Timestamp：** 2026-11-16T11:30+0800
- **Recorded by：** Jay（AO / current developer），opencode 代录

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261116-105446-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-105446-local-verify-report.md) | Pass（typecheck / build、前端 74、后端 154、契约 0 error、E2E 18/18） |
| Implementation commit | `9a2bdf0`（功能）、`551666e`（仅测试基线修复）；合入 `711da3d` | 已推送 `main` |
| Pipeline report（required） | [`docs/ai4se-plugins/20261116-112704-pipeline-report.md`](../../../docs/ai4se-plugins/20261116-112704-pipeline-report.md) | Overall **Partial** / `Pass-by-human-confirm`（CI + CD success，证据 release `build-711da3d`；已在 Inputs 引用） |
| Delta Spec | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | 2 Requirement / 15 Scenario；`openspec validate refine-inspiration-home --strict` valid（G2 前修复场景名漂移，见下） |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T1–T6 完成；对齐自检 Pass |
| G1 decision | [`g1-decision.md`](g1-decision.md) | Pass（2026-11-16） |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | `npm run typecheck` / `npm run build` 成功；后端 154 项回归 |
| scan | Pass | 本地静态检查 Pass；契约 lint 0 error / 7 既有 warning |
| review | Pass | 代码走查通过；状态不只依赖颜色，`StatusBadge` 单入口 |
| evidence | Pass | 本地报告 6 条命令全绿 + 1440/768/390 走查 |
| ci | Pass（Partial） | Backend / Frontend job 结论成功（由 CD tag 推断），无 API 明细 |
| cd | Pass | release `build-711da3d` 已发布 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 2 | E2E 数据污染稀释演示数据；「清除全部条件」按钮可访问名重复 |
| SUGGESTION | 2 | 双视图骨架数量 2/3 与高度差异；`StatusBadge` 未覆盖「已取消」 |

## Decision

**Pass**

**G2 前修正（不改变验收语义）：** `specs/trip-plans/spec.md` 的 MODIFIED 块把基线场景 `已结束与已取消行程不出现在默认列表` 改名为 `…默认视图`，`openspec validate --strict` 因此报「MODIFIED 遗漏基线场景」（归档会丢场景）。已把场景名改回基线名、保留 refine 后的正文，validate 转 valid；E4 的验收断言不变，故不需重开 G1。

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| L-01：双 capability（`trip-plans` + `trip-experiences`）例外需 SA 具名追认 | SA（Jacky、Karena） | 归档（P5）前；未追认不得合并归档 |
| L-02：「已取消」被 Delta 提及但 `TripStatus` 无对应值 | SA | 另立 change |
| E2E 数据卫生（独立测试库或 `afterEach` 清理） | AO（Jay） | 另立 change |
| 「清除全部条件」筛选栏与空态同名，自动化需 `.empty` 作用域 | AO（Jay） | 后续文案调整 |
| E2E 未纳入 CI 流水线（验收仅本地 18 项） | AO（Jay） | 跟踪，不阻断本 change |
| 两 change 直推 `main`、无独立 PR（流程偏差） | AO（Jay） | 流程记录；后续按 `/sdd:pr-submit` 执行 |

## Approvers

| 角色 | 姓名 |
|---|---|
| VL | Neal |
| AO | Jay |
| IO | WAYNE |
| SA | Jacky、Karena |
| SM | Lewis |

签署来源：[`docs/sdd/refine-inspiration-home/p4-verify.md`](../../../docs/sdd/refine-inspiration-home/p4-verify.md) §7 负责人签署；VL 为独立验证人，AO 未自签 VL。

## Next

- Decision = Pass；P5（归档）由用户发起。
- 归档前先完成 L-01 的 SA 具名追认，并将两份 MODIFIED 合并进 Living Spec。