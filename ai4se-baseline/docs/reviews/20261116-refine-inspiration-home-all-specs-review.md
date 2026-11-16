# All specs review — refine-inspiration-home

- **Verdict：Fail**（1 BLOCKER / 3 WARNING / 5 SUGGESTION）
- **Scope：** `focus=full`；root=`ai4se-baseline/`；change=`openspec/changes/refine-inspiration-home/`（`trip-plans` MODIFIED、`trip-experiences` MODIFIED）；实现面 `RouteME/frontend`、`RouteME/e2e`；评审日期 2026-11-16。
- **Verdict 映射：** ≥1 BLOCKER → Fail。本评审不是 Gate 结论，不替代 G1/G2/G3。

## Evidence

**共享验证证据（已实际运行，直接引用）：**

- backend `mvnw.cmd -q test` 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped（本 change 无后端改动，仅回归）。
- frontend `npm run typecheck` 退出码 0；`npm test` 16 个测试文件、137 tests 全部通过。
- 根目录无 `package.json`，`npm run lint:api` 无法执行 → 记为工具缺口（Skipped，不单独作为失败依据，但结论最高只能 Partial；本报告已有 BLOCKER，不受此上限影响）。
- 工件记录的 E2E 证据：`docs/sdd/refine-inspiration-home/p4-verify.md` §4 `npx playwright test` 18 passed；`docs/ai4se-plugins/20261116-105446-local-verify-report.md` Overall Pass；`g2-decision.md` 引 `build-711da3d`。本评审未重跑。
- 证据快照提示：当前工作区含未提交的第三方 change（`add-trip-publish`）改动，涉及 `frontend/src/trips/TripCard.tsx`、`TripCreatePage.tsx`、`frontend/src/styles.css`、`frontend/src/i18n/tripMessages.ts` 与 `e2e/tests/{trips,experiences,companions}.spec.ts`（`git status`）。本评审对上述文件按“本 change 负责的符号”判定，上述 WIP 不计入本 change。

**读过的关键文件：**

- 规则：`.agents/skills/all-specs-review/SKILL.md`、`references/review-checklist.md`、`docs/knowledge/rules/_INDEX.md`、`architecture/rules.md#api-contract`、`quality/rules.md#coding-style|#web-coding-style|#naming-conventions`、`testing/rules.md#web-testing`、`process/rules.md#spec-first|#tdd-cycle|#git-commit-conventions|#git-branching-and-pr|#artifact-review-gate`、`documentation/rules.md#document-conventions|#sdd-artifacts`、`_SCHEMA.md`、`_LOG.md`。
- 工件：`proposal.md`、`design.md`、`specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md`、`tasks.md`、`atdd-design.md`、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`、`g2-decision.md`、`docs/sdd/refine-inspiration-home/p4-verify.md`、`docs/reviews/README.md`。
- 契约：`RouteME/openapi.yaml`（`info.version: 0.8.1`；`TripStatus.status.enum: [recruiting, full, completed]`）。
- 实现：`frontend/src/home/HomePage.tsx`、`frontend/src/trips/StatusBadge.tsx`、`frontend/src/trips/TripCard.tsx`、`frontend/src/trips/tripStatus.ts`、`frontend/src/experiences/ExperienceCard.tsx`、`frontend/src/i18n/tripMessages.ts`、`frontend/src/styles.css`（`.badge.has-icon`、`.status-icon`、`.tc-meter.is-full`、`.exp-origin-badge`）、`frontend/src/shell/paging.ts` 与 `paging.test.ts`、`frontend/src/trips/useMatches.ts`、`e2e/tests/trips.spec.ts`、`e2e/tests/experiences.spec.ts`。
- 历史：`git log/show`（`f538ca7`、`9a2bdf0`、`551666e`、`78c2e0e`、`220b60d`）、`openspec/specs/trip-plans/spec.md`、`openspec/specs/trip-experiences/spec.md`。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| ASR-IH-01 | BLOCKER | `rules/process/rules.md#git-commit-conventions`（Critical / always） | git commit `9a2bdf0`：`RouteME/frontend/src/home/HomePage.tsx`、`trips/StatusBadge.tsx`、`experiences/ExperienceCard.tsx`、`i18n/tripMessages.ts`、`e2e/tests/*.spec.ts` 与 `RouteME/frontend/src/identity/AuthPanel.tsx`、`identity/authForm.ts`、`identity/authForm.test.ts`、`openspec/changes/add-user-auth/summary.md` 同处一提交；`220b60d docs(verify)` 同时记录 `add-user-logout` 与本 change 的 G2 | 实现、测试与验证证据与另一个 spec（`add-user-auth`）的生产代码合并进同一提交，提交信息既无 change-id 也无 `(verify)` stage；本 change 另有 `f538ca7` / `78c2e0e` / `551666e` 等多次阶段提交，没有合规的 verify 提交。结果是从提交无法回溯到 `refine-inspiration-home`，违反“多个 spec 禁止合并到一次提交 / 一个 spec 两次提交” | 在归档 `summary.md` 具名记录该历史偏离（AO + SA 追认）并保留 `g2-decision.md` 的提交映射作为追溯补充；后续 change 恢复 `feat(verify): <change-id>` 单次提交；已推送历史不重写（`git-branching-and-pr` 禁止 force push） | `[fact]` |
| ASR-IH-02 | WARNING | `rules/process/rules.md#spec-first`（P2：每条验收场景可验证） | `openspec/changes/refine-inspiration-home/specs/trip-plans/spec.md` §Requirement「浏览未结束的旅行计划」/ Scenario「已结束与已取消行程不出现在默认列表」 | MODIFIED 规格继续声明“已结束与已取消行程 MUST NOT 出现”，但 `RouteME/frontend/src/types.ts` 的 `TripStatus` 与 `RouteME/openapi.yaml`（`enum: [recruiting, full, completed]`）都不存在“已取消”值，该 AC 在当前数据模型下不可观测；`consistency-lint.md` L-02 已识别但 G2 后仍未收敛 | 归档合并 Living Spec 时把措辞统一为“已结束”，或显式声明系统无取消态；不要把不可观测条款带入新的 Living Spec 正文 | `[fact]` |
| ASR-IH-03 | WARNING | `rules/testing/rules.md#web-testing`（界面改动跑通受影响端到端用例；场景与用例名对应） | `openspec/changes/refine-inspiration-home/atdd-design.md` §1.2 行 E7 / E8 / E11 / E12 / E13；`RouteME/e2e/tests/` 全部 spec；`frontend/src/shell/paging.ts` / `usePaging` | ATDD 把「分页浏览」「筛选变化重置分页」（两个 Delta 各一组，共 5 行）标为“E2E 回归，跑既有用例”，但 6 个 e2e spec 中没有任何分页断言（无页码、`total`、`ant-pagination` 定位），体验视图也没有“按发布时间倒序”的断言；`usePaging` 无单元测试，`paging.test.ts` 只覆盖纯函数 `pageWindow`。这 5 个场景实际无自动化覆盖 | 补 1–2 条 E2E（翻页 + 修改筛选回到第 1 页）或为 `usePaging` 补 Vitest；把 ATDD 中“E2E 回归”的标注改为真实覆盖层，避免用不存在的既有用例充当证据 | `[fact]` |
| ASR-IH-04 | WARNING | `rules/documentation/rules.md#sdd-artifacts`（工件职责与一致性） | `openspec/changes/refine-inspiration-home/proposal.md` §决策「数据来源」 | 提案写“复用 `GET /api/trips` 与 `GET /api/experiences`”，实现走 `frontend/src/trips/useMatches.ts` → `GET /api/matches`（`design.md` D8 已认定提案为笔误、`atdd-design.md` §1.1 也做了“实现事实校正”），但更正只停在设计与 ATDD，已签署提案中的事实陈述仍错误，且未进 `docs/sdd/.../p4-verify.md` 的偏差表 | 在 `summary.md` 明确记录“提案端点表述更正为 `/api/matches`”，并在归档说明数据来源由服务端 `findOpen` 保证；后续同类更正应回写影响面表格而非只写在 design | `[fact]` |
| ASR-IH-05 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts`（设计/任务与实现一致） | `design.md` D3、`tasks.md` T3 vs `RouteME/frontend/src/trips/TripCard.tsx`（`className={width >= 100 ? 'tc-meter is-full' : 'tc-meter'}`） | 设计与任务写“人数进度条保留 `.meter.full` 作为辅助信号”，实现输出 `.tc-meter.is-full`（实现符合 `web-coding-style` 的 `is-` 状态类，文档未同步），E2E 断言的也是 `.tc-meter.is-full` | 归档前把 `design.md` D3 与 `tasks.md` T3 的选择器改为 `.tc-meter.is-full` | `[fact]` |
| ASR-IH-06 | SUGGESTION | `rules/quality/rules.md#coding-style`（DRY / 避免重复） | `RouteME/frontend/src/home/HomePage.tsx`（`publishAction` 与两处 `EmptyState` 子节点 `<div className="empty-actions">`） | `design.md` D5 与 `tasks.md` T5 要求“在 `HomePage` 内提取本地 `emptyActions` 片段避免两处重复”，实现仍是两段重复的 `.empty-actions` 标记，只有按钮被复用到 `publishAction` | 提取共享片段（或给 `EmptyState` 增加 actions prop），消除第二处重复 | `[fact]` |
| ASR-IH-07 | SUGGESTION | `rules/quality/rules.md#web-coding-style`（文案集中 / 可访问性） | `RouteME/frontend/src/home/HomePage.tsx` 骨架 `aria-label="正在加载招募中的行程"` / `"正在加载旅行体验"` | 本 change 新增的两条无障碍文案直接写在组件里，未进 i18n，`tripMessages.ts` 已有同类 `plansView` / `experiencesView` 键 | 把两条文案加入 `tripMessages` 并在组件内引用键 | `[fact]` |
| ASR-IH-08 | SUGGESTION | `rules/testing/rules.md#web-testing`（用例命名、无残留格式问题） | `RouteME/e2e/tests/experiences.spec.ts`（`guides an empty filter state to publish from both views`、`shows seeded experiences in the travel experience view`） | 用例名与 `atdd-design.md` §2 / `tasks.md` T1 的 `guides an empty search to publish from both views` 不一致，规格→用例名追溯断链；`shows seeded experiences…` 用例体内多处断言缩进错位 | 统一用例名并在 ATDD §2 同步；修正缩进 | `[fact]` |
| ASR-IH-09 | SUGGESTION | `rules/quality/rules.md#web-coding-style`（组件选型·新增例外 MUST 追加清单） | `RouteME/frontend/src/trips/StatusBadge.tsx`（`StatusIcon` 内联 SVG） | 状态以自绘内联 SVG 表达，`design.md` D3 记录了理由，但规则要求“新增例外 MUST 追加到已记录例外清单”，`quality/rules.md#web-coding-style` 的例外表仍只有 `ProfileSetupPage` 与 `PlacePicker` 两条，antd `Badge`/`Tag` 均未被比较 | 在例外清单补一行（状态徽标用内联 SVG 的原因与替代方案），或在设计中论证该徽标不属于“组件选型”表覆盖的控件 | `[fact]` |

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A 架构 | 未发现 | 无后端 / 契约 / 迁移改动；前端请求仍只走 `api.ts`（`useMatches` → `loadMatches`），纯逻辑在 `trips/`、`home/` 业务模块，`StatusBadge` 单入口复用；`openapi.yaml` 与 `TripStatus` 一致（除 ASR-IH-02 的规格侧表述） |
| B 质量 | Partial | 无 BLOCKER；ASR-IH-06/07/09 为 DRY、文案集中、例外登记的 SUGGESTION；命名（`StatusBadge`、`statusTone`、`statusLabel`）与文件放置符合 `web-coding-style` |
| C 测试 | Partial | ASR-IH-03：5 个“E2E 回归”场景无实际用例；组件/E2E 其余场景（默认视图、卡片信息、满员 vs 招募中、已结束排除、双空态、骨架）都有语义化断言，未发现 `waitForTimeout`、`console.log` |
| D 安全 | 未发现 | 无新增端点 / 权限面；页面只读展示，状态与人数由服务端单一写入（`trip-plans`）；无硬编码密钥、无新增 PII 暴露 |
| E 过程 | Fail | ASR-IH-01（Critical 提交规则）为 BLOCKER；ASR-IH-02 规格不可观测条款归入本维度 |
| F 文档 | Partial | ASR-IH-04 提案端点表述、ASR-IH-05 选择器漂移；其余工件命名、目录、`g1/g2-decision.md` 固定名、报告位置均合规 |
| G 工件链与契约追溯 | Partial | proposal ↔ 2 份 Delta ↔ tasks ↔ atdd ↔ 实现 ↔ 测试总体可追（8 + 7 个场景都有落点）；例外是 ASR-IH-03（场景 ↔ 用例断链）与 ASR-IH-04（提案 ↔ 实现断链），另 `artifact-review-gate` 因规则于 2026-11-16 14:04 才生效，对本 change 的 P1–P3 工件不追溯适用（Skipped，不计入结论） |

## Skipped

- `npm run lint:api`：根目录无 `package.json`，命令不可执行 → 工具缺口（Skipped）。change 内以 `npx -y @redocly/cli lint openapi.yaml`（0 error / 7 既有 warning）替代，但无本 change 自己的输出原样粘贴。
- `artifact-review-gate` 四份工件评审报告：规则 `114379f`（2026-11-16 14:04:54）晚于本 change 的 P1–P3 工件（`f538ca7` 10:15），不追溯适用 → Skipped。
- 安全 / PII 专项：本 change 无输入采集、无日志输出改动 → 无可核验新增面（Skipped）。

## Residual risks

- **E2E 数据卫生**：`trips.spec.ts` / `experiences.spec.ts` 依赖共享演示库累积数据；`g2-decision.md` 已记 WARNING，若数据继续累积，默认列表断言可能被分页稀释。
- **E2E 未纳入 CI**：`g2-decision.md` 记录验收仅本地 18 项，流水线只做 build / test，回归保护依赖人工触发。
- **工作区快照与 HEAD 不一致**：当前工作区含 `add-trip-publish` 的未提交改动（含 `tripMessages.ts`、`TripCard.tsx`），本报告的实现证据以“本 change 负责的符号”为准；复跑验证前需先确认工作区干净。
- **双 capability 例外（L-01）**：`trip-plans` + `trip-experiences` 同 change 修改，归档前需 SA 具名追认，否则需拆分；本评审不判定该例外的可接受性。
- **Auth stub**：前端仍以 `routeme.currentUserId` / `X-User-Id` 充当身份（项目既有），上线前需替换为真实鉴权；本 change 未扩大该面。

## Next remediations (non-Gate)

1. AO：为 ASR-IH-01 在归档 `summary.md` 记录提交偏离并取得 SA 具名追认；后续 change 恢复 `feat(verify): <change-id>` 单提交（`/sdd:pr-submit`）。
2. AO：按 ASR-IH-02 在归档合并时收敛“已取消”表述（`/sdd:consistency-lint` 复核 L-02）。
3. AO：补 ASR-IH-03 的分页 / 筛选重置用例，并同步 `atdd-design.md` 的层级标注（`/sdd:atdd-apply`）。
4. BA/AO：按 ASR-IH-04 在 `summary.md` 记录端点更正（`/sdd:p5-archive` 前置）。
5. AO：批量处理 ASR-IH-05…09 的文档与样式小漂移（可与归档同批）。