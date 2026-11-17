# G2 decision — add-destination-area-filters

- **Gate：** G2（Verify）
- **Change：** `add-destination-area-filters`（REQ-007；`trip-plans` MODIFIED、`trip-experiences` MODIFIED）
- **Timestamp：** 2026-11-16T12:50+0800
- **Recorded by：** Jay（AO），依据用户 2026-11-16 会话确认（E2E 债务只记录不修；C1 登记外部依赖；C2 已移交他人）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| P4 验证记录 | [`docs/sdd/add-destination-area-filters/p4-verify.md`](../../../docs/sdd/add-destination-area-filters/p4-verify.md) | 后端 206 / 前端 105 / 契约 0 error；E2E 15 passed / 1 failed（C1） |
| 任务清单 | [`tasks.md`](tasks.md) | T1–T11 全部完成并勾选 |
| 设计与 ATDD | [`design.md`](design.md)、[`atdd-design.md`](atdd-design.md) | 含 P4 实现修订（V11 加列、自绘 AreaCascader） |
| Delta Spec | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | 未被 P4 实现修改；口径仍一致 |
| 知识库回写 | `docs/knowledge/{interfaces,domain,architecture}/README.md`、`_LOG.md` | 已记录 0.7.0、destination_code、AreaCascader、V11 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| 实现完整性 | T1–T10 全部落地；搜索 `q` 前后端/契约/测试清零 | `p4-verify.md` §3 |
| 测试 | 后端 206、前端 105 全绿；build 通过；契约 valid（0 error / 15 warning） | `p4-verify.md` §2 |
| 迁移 | V11 加列 + 回填 + 索引；SQLite/H2 均通过，体验数据不丢 | `AreaCodeMigrationSqliteTest`、H2 上下文 |
| 浏览器兼容 | Chrome 正常；Edge 经自绘 `AreaCascader` 修复（面板可见、无滚动抖动、无 console 错误） | `p4-verify.md` §2 命令 6 |
| E2E | 本 change 用例全过；唯一失败为搜索空态（C1）；其余 4 项历史债务已由远程 `551666e` 修复 | `p4-verify.md` §5 |
| 范围 | 未改 `refine-inspiration-home` 文件；`add-trip-publish` 目的地修订已移交，本 change 不归档他人 | `tasks.md` 约束、`p4-verify.md` §6 |

## Decision

**Conditional**

## Conditions + owners

| # | 条件 | Owner | 处理时机 |
|---|---|---|---|
| C1 | `refine-inspiration-home` 的搜索空态 E2E 由 owner 改写并先归档 | AO / BA | 本 change 归档前 |
| C2 | `add-trip-publish` 目的地修订 5 条任务由接收人执行；A 归档前重评其 G1/G2 | AO / SA | 本 change 之后 |
| C3 | 既有 E2E 债务已由远程 `551666e` 修复；剩余搜索空态归 C1 | AO | 已关闭 |
| C4 | Living Spec 的“关键词”术语在归档合并时收敛 | AO / BA | 归档合并 |

**Conditional 已列 remediation 与 owner；无未决 blocking 缺陷。**

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | WAYNE |
| SA | JACKY、KARENA |
| AO（当前开发） | JAY |
| VL | NEAL |
| SM | LEWIS |

签署来源：用户 2026-11-16 会话确认沿用该名单。

## Next

- Decision = Conditional → 可进入 P5（归档前置与合并）；本 change 暂不归档，等待 C1 完成。
- 本 change 不归档 `refine-inspiration-home` / `add-trip-publish` 等他人 change。
- 代码与文档提交需用户明确授权后执行。
