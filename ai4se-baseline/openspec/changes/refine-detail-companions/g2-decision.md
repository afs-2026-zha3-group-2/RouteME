# G2 decision — refine-detail-companions

- **Gate：** G2（Verify）
- **Change：** `refine-detail-companions`（capability `trip-plans` MODIFIED，REQ-020）
- **Timestamp：** 2026-11-17T14:30+0800
- **Recorded by：** Lewis Liu（AO / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261117-142500-local-verify-report.md`](../../../docs/ai4se-plugins/20261117-142500-local-verify-report.md) | Pass（前端 255、后端 248、构建成功、E2E 新增 8/8） |
| Implementation commit | `aa702f0`（实现）+ `a3c2924`（合并 `origin/main@ec360dc`） | 已推送 `feature/refine-detail-companions` 并快进 `main`（`ec360dc..a3c2924`）；按用户指示未开 PR，CI 由 `main` push 触发 |
| Delta Spec | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 1 Requirement / 12 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T1–T7 完成；T8 的 README / registry 随本条记录补齐 |
| G1 | [`g1-decision.md`](g1-decision.md) | Pass（IO=WAYNE / SA=Jacky），D1 语义替换已批准 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 前端 `npm run typecheck` / `npm run build`；后端 `.\mvnw.cmd -B -o clean test` 248 通过 |
| scan | Skipped | 未配置安全扫描器；本 change 无新增依赖与外部输入 |
| review | Skipped | 未运行独立评审工具；由 `@rule:artifact-review-gate` 的 design / tasks 评审与 TDD + ATDD 覆盖 |
| evidence | Pass | 前端 255 / 后端 248 / 新增 E2E 7 条与 `chat-entry` 回归 8/8；原型截图 1440 + 390 |
| ci | Pending | 无 PR（用户指示直接合并）；CI 由 `main` push `a3c2924` 触发，结果待回填 pipeline 报告 |
| cd | N/A | 纯前端展示层，无部署面变化 |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 2 | 发布 / 地图类 E2E 在本机缺 `amap-local.yml` 且种子日期翻篇（基线 `6f9cb46` 可复现，非本 change 引入）；`styles.css` 为并行修改热点，合并需抽查 |
| SUGGESTION | 2 | 组件层无单测（仓库无 jsdom / Testing Library）；同行者超过 6 人时的折叠策略未定义 |

## Decision

**Pass（本地验证）**

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 在 `main` push 触发的 CI（`a3c2924`）上回填运行链接；若红则修复或回滚 | Lewis Liu（AO） | CI 完成后 |
| 合并 `origin/main` 后抽查 `.detail-companions` / `.companion-card` / `.companion-chat` | Lewis Liu（AO） | 已完成（合并后 grep 命中，E2E 8/8） |
| 地图 / 发布类 E2E 环境债务（缺 `amap-local.yml`、种子日期翻篇） | Dev + 项目治理 | 另立 change（种子日期相对化 / 环境自检） |
| 组件测试基础设施（jsdom + Testing Library） | Dev | 另开基础设施 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| VL | Neal |
| AO | Lewis Liu |
| IO | WAYNE |
| SA | Jacky |
| SM | Lewis |

签署来源：[`docs/sdd/refine-detail-companions/p4-verify.md`](../../../docs/sdd/refine-detail-companions/p4-verify.md) §G2 签署表；VL 为独立验证人，AO 未自签 VL。

## Merge record

- **合并方式偏离：** 用户当次明确指示「提交推送合并到 main」，未开 PR；按规则优先级以用户当次指示为准，偏离 G2 原条件「PR 上 CI 未绿不得合入」，在此如实记录。
- **合并提交：** `a3c2924`（Merge `origin/main@ec360dc` into `feature/refine-detail-companions`），远端 `main` 快进 `ec360dc..a3c2924`；`origin/feature/refine-detail-companions` 同步。
- **合并后验证：** `openspec validate refine-detail-companions --strict` valid；前端 `typecheck` / `build` 通过，`npm test` 39 文件 / 299 项；后端 `mvnw -B -o test` 311 项通过；全新隔离库（`verify-merge-20261117.db`，V1–V20）+ 独立后端 8083 + Vite 5177 上 `detail-companions.spec.ts` + `chat-entry.spec.ts` 8/8 通过。
- **样式抽查：** `styles.css` 同时保留 `.profile-credit*`（上游信用分）与 `.detail-companions` / `.companion-card` / `.companion-chat` / `.detail-companions-empty`；原型 `ui.js` 同时保留 `creditInfo` 与 `companion-card`。
- **待办：** CI 运行链接与结论回填 `docs/ai4se-plugins/` 的 pipeline 报告；P5 按用户既定要求**暂不执行**（不归档）。

## Next

- Decision = Pass；已按用户指示直接合并 `main`（`a3c2924`）；P5 暂不执行（不归档）。
