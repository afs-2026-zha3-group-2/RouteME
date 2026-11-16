# G2 decision — add-user-profile

- **Gate：** G2（Verify）
- **Change：** `add-user-profile`（`user-profile` ADDED + `user-auth` MODIFIED，REQ-008 / S18）
- **Timestamp：** 2026-11-16T12:10+0800
- **Recorded by：** opencode（AI agent），按用户 2026-11-16「run the p4 … run the ci and prepare for the G2 review」指令整理
- **Status：** **Pending** — 等待 VL 独立签署；实现方未自签

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261116-120800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-120800-local-verify-report.md) | Pass（后端 198 / 前端 95 / E2E 35 / 迁移双路径 / 手工三档） |
| P4 record | [`docs/sdd/add-user-profile/p4-verify.md`](../../../docs/sdd/add-user-profile/p4-verify.md) | T1–T8 完成；P4-1–P4-4 / P4-6 Pass，P4-5 文件已备待签 |
| Implementation commit | `2423c01`（实现）→ `a95254c`（验证记录，已推送） | 已合入 `main` 的 `022659c` |
| Pipeline CI（required） | [`ci-report.md`](ci-report.md) | 本地等价 Pass；远端 `e54f273` 由 `build-e54f273` tag 推断 success |
| Pipeline CD | release `build-e54f273`（中间 `build-022659c`） | Success（`cd.yml` 仅在 CI success 时发布） |
| Delta Spec | [`specs/user-profile/spec.md`](specs/user-profile/spec.md)、[`specs/user-auth/spec.md`](specs/user-auth/spec.md) | 7 Requirement / 24 Scenario + 1 Requirement / 6 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | E1–E24 / A1–A6 有落点；D1–D12；T1–T8 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 后端 `.\mvnw.cmd -B -ntp verify`（198）；前端 `npm run build` |
| scan | Skipped | 仓库未配置安全扫描器；本地演示环境无生产凭据 |
| review | Skipped | 未运行独立评审工具；按 TDD + ATDD 覆盖 |
| evidence | Pass | 本地验证报告 + 10 E2E + 95 前端 + 198 后端 + 迁移双路径 |
| ci | Pass | 本地等价全绿；远端 `e54f273` 由 `build-e54f273` tag 推断 success |
| cd | Pass | 发布 `build-e54f273`（中间 `build-022659c`） |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 6 | CI 缺 job 级明细（tag 证据已有）；E2E 不在 CI 且依赖种子库；双 capability 例外待 SA 追认；`origin/feature/add-user-profiles` 旧实现未作废（V10 迁移同名冲突）；`tasks.md` 的契约版本表述陈旧；头像目录需在启动时存在 |
| SUGGESTION | 2 | 前端 bundle 923 kB（既有）；兴趣词表别名仅前端归一 |

## Decision

**Pending（待 VL 复核后填写 Pass / Conditional / Fail）**

## 待 VL / SA 确认的问题

| # | 问题 | 需要的结论 |
|---|---|---|
| 1 | 24 + 6 场景是否都有可复现断言（10 E2E + 14 API + 24 rules + 15 auth + 6 contract） | 断言覆盖是否足够 |
| 2 | 头像存储以服务端生成文件名 + 目录前缀定位，替换删除旧文件 | 是否接受该实现（无对象存储） |
| 3 | 星座值不带「座」后缀、生日只回本人 | 是否接受显示口径 |
| 4 | 契约保持 0.7.0（`add-trip-publish` 已 bump） | 是否接受不重复 bump |
| 5 | 旧库升级后演示账号新列为 NULL、`school` 旧文案保留 | 是否接受空值语义 |
| 6 | 远端 CI 仅以 tag 推断、无 job 级明细 | 是否接受 `Pass-by-tag-evidence` |

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 远端 CI job 级明细（tag 证据已有，不再阻塞） | AO（Jay） | 可随时以 `gh` 补录 |
| Playwright 作为本地门禁，不进 CI | AO（Jay） | 需要浏览器回归门禁时评估 |
| 双 capability 例外具名追认 | SA（Jacky、Karena） | 归档前必须完成 |
| 清理 `origin/feature/add-user-profiles` 旧实现（`d3d6178`） | AO + SA | 归档前 |
| 契约版本与 `tasks.md` 表述对齐 | AO | P5 |
| 兴趣词表别名统一 | AO + BA | 独立 change |
| E2E 种子库隔离 / 清理钩子 | AO（Jay） | 评估独立测试库 |
| 头像目录写入前创建（容错） | AO（Jay） | 评估后决定是否改动 |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | **待签**：独立复核验证与 CI，填写 Decision | — |
| AO | Jay | 实现与 P3 任务一致；验证可复现；承担遗留项 | 2026-11-16 |
| IO | Wanye | **待签**：收到残余风险 | — |
| SA | Jacky、Karena | **待签**：未越出 Delta Spec；追认双 capability 例外 | — |
| SM | Lewis | **待签**：G2 结论与交付范围 | — |

签署来源：[`docs/sdd/add-user-profile/p4-verify.md`](../../../docs/sdd/add-user-profile/p4-verify.md) §7；VL 为独立验证人，AO 未代签。

## Next

- VL 签署 Decision 后，P4 方可关闭；P5 归档按用户指示另行发起。
- CI 证据：本地等价全绿 + 远端 `build-e54f273`（含 `a95254c`；中间 `build-022659c`）。
- **不要**在 VL 签署前把本文件当作 Pass 证据引用。