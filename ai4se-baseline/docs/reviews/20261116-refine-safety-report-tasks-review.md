# 任务评审报告 — refine-safety-report

- **工件：** `openspec/changes/refine-safety-report/tasks.md`
- **change-id：** `refine-safety-report`｜ **能力：** `trip-companions`（REMOVED 1 + ADDED 1）
- **需求条目：** `requirement-workspace/requirements/REQ-012-safety-report.md`（REQ-012 / S14，rev2）
- **评审日期：** 2026-11-16｜ **评审轮次：** 第 1 次
- **评审方式：** `all-specs-review`（规则锚点：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:tdd-cycle`、`@rule:web-testing`、`@rule:sdd-artifacts`、`@rule:document-conventions`）
- **评审输入：** [`tasks.md`](../../openspec/changes/refine-safety-report/tasks.md)、[`design.md`](../../openspec/changes/refine-safety-report/design.md)（已批准）、[`atdd-design.md`](../../openspec/changes/refine-safety-report/atdd-design.md)、[`specs/trip-companions/spec.md`](../../openspec/changes/refine-safety-report/specs/trip-companions/spec.md)、[`g1-decision.md`](../../openspec/changes/refine-safety-report/g1-decision.md)、`.github/workflows/ci.yml`

## 评审结论

**Pass**

六条任务按层拆分、可执行，末条为回归验证；9 条场景与 D1–D7 均有落点；验证命令在本机与 CI 中都真实存在。4 条建议中 1 条当场收口（Windows 下的 Maven 命令），其余为 P4 记录口径与写法优化。无 BLOCKER、无 WARNING。

## 结构与命令证据

| 证据 | 结果 |
|---|---|
| 任务结构 | 6 个任务标题（T1–T6），20 个未完成复选框，每条含 `**Verify:**` |
| 层分布 | T1 e2e、T2–T5 frontend、T6 verify；无一条跨两层 |
| 末条性质 | T6 为全量回归 + 契约冻结核对，符合「最后一条为验证 / 回归」 |
| 前端命令 | `frontend/package.json` 的 scripts 为 `dev` / `typecheck` / `build` / `preview` / `test`；`npm run typecheck`、`npm run build`、`npm test` 均存在 |
| 后端命令 | `RouteME/backend/mvnw` 与 `mvnw.cmd` 均存在；CI 用 `./mvnw -B -ntp verify`（`.github/workflows/ci.yml`） |
| E2E 命令 | `e2e/playwright.config.ts` 的 `testDir: './tests'`；`npx playwright test tests/safety-report.spec.ts` 指向真实路径 |
| openspec | `npx --no-install openspec validate refine-safety-report --strict` → valid |
| 内容核对 | `git diff main -- RouteME/backend RouteME/openapi.yaml` 为可执行的冻结检查；`grep -rn "onReport"` 在 T4 后可验证为空 |

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 状态 |
|---|---|---|---|---|---|---|
| T3-01 | SUGGESTION | `@rule:sdd-artifacts` | `tasks.md` T6 后端命令 | 初稿写 `./mvnw -B -o test`；本机为 Windows，仓库同时提供 `mvnw.cmd`，照抄会在 PowerShell 下无法解析 | 改为 `.\mvnw.cmd -B -o test`，并注明 CI 用 `./mvnw` | **已当场收口** |
| T3-02 | SUGGESTION | `@rule:tdd-cycle` | `tasks.md` T2 / T3 | T2 单条无法让 E5 / E6 转绿（入口在 T3），其验证只能是 typecheck + 既有 vitest；红绿周期实际跨 T2→T3 | 接受现拆分；P4 记录把 T2→T3 记为同一红绿周期，T2 不宣称「验收转绿」 | 留 P4（不阻断） |
| T3-03 | SUGGESTION | `@rule:web-testing` | `tasks.md` T1 | 与设计评审 D3-02 同源：三档视口循环重复 | T1 抽 `assertHeaderEntryVisibleAt` 到 `e2e/tests/support.ts` | 留 T1（不阻断） |
| T3-04 | SUGGESTION | `@rule:tdd-cycle` | `tasks.md` T1 验证 | 「7 条失败」是文件级判断；E4 的 `/#/share/1` 分支与 E7 的隐私扫描在当前 `main` 上已成立（没有入口、没有隐私字段），红态来自同一用例内的其它断言 | P4 记录红态时写明具体失败断言，不写「每条用例的每个断言都红」 | 留 P4（不阻断） |
| T3-05 | SUGGESTION | `@rule:web-testing` | `tasks.md` T5 | 三档人工核对未给判定项清单 | P4 在 `p4-verify.md` 用「入口可见 / 无横向溢出 / 回执可读」三列记录 | 留 P4（不阻断） |

## 与 Spec / Design / ATDD 的对应

| 维度 | 结论 |
|---|---|
| 9 条场景 | #1–#2 复用既有 spec；#3–#9 对应 E1–E7，均由 T1 编写、T2–T5 转绿、T6 回归 |
| D1–D7 | D1→T3/T5、D2→T3/T5、D3→T4、D4→T2、D5→T2、D6→T5、D7→T1，无遗漏决策 |
| 非目标 | RV-1–RV-7 由 T1（E1/E2/E4/E7）与 T6（RV-6）收口，无反向验证缺口 |
| 越界检查 | 任务只触碰 3 个组件、1 个文案表、1 个样式表、1 个新 spec、1 个 helper；无后端 / 契约 / 迁移 / 处置面任务 |
| G1 rev2 follow-ups | 回执映射（T2）、`SafetyNote`（T4）、隐私黑名单（T1）、旧断言同步（T1）、后端不变（T6）——P3 归属项全部落地 |
| 任务一层一条 | 是；`[e2e]` / `[frontend]` / `[verify]` 标签与内容一致 |
| 命令真实性 | 是；`typecheck` / `build` / `test` / Playwright / Maven / openspec 均在仓库中存在，未虚构脚本 |

## 残余风险

- **E2E 不在 CI。** 回执与三档换行只能本地验证，P4 必须贴真实命令与输出。
- **红态粒度。** 见 T3-04；P4 需按断言写清失败点，避免「7 条全红」被误读为每条用例的每个断言都失败。
- **端口竞争。** 另一会话可能占用 `:8080` / `:5173`；若发生，P4 按既有先例改用隔离端口与独立数据库，并在 `p4-verify.md` 记录偏差，不改测试默认值。
- **`SafetyNote` 的 `onReport` 在 T4 前仍存在**（当前调用点已无举报按钮），不影响功能，但 P4 必须完成删除，否则留下死属性。

## 批准记录

- **批准人：** 待签署
- **批准时间：** 待签署
- **批准范围：** 批准 `tasks.md` 并准入 P4（`/sdd:atdd-apply`，从 T1 红态开始）；T3-01 已收口，T3-02–T3-05 不阻断。
- **说明：** 本批准只覆盖工件评审，不等于 G2；P4 仍需 T1 红态证据、本地全量回归与 VL Neal 的独立验证。