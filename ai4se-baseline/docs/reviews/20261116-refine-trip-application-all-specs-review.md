# All specs review — refine-trip-application

- **Verdict：Partial**（0 BLOCKER / 1 WARNING / 5 SUGGESTION）
- **Scope：** `focus=full`；root=`ai4se-baseline/`；change=`openspec/changes/refine-trip-application/`（`trip-companions` MODIFIED）；实现面 `RouteME/frontend`、`RouteME/e2e`；评审日期 2026-11-16。
- **Verdict 映射：** 无 BLOCKER、≥1 WARNING → Partial；另因 `npm run lint:api` 不可执行（工具缺口）结论上限为 Partial。本评审不是 Gate 结论，不替代 G1/G2/G3。

## Evidence

**共享验证证据（已实际运行，直接引用）：**

- backend `mvnw.cmd -q test` 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped（本 change 后端零改动，属契约 / 规则回归）。
- frontend `npm run typecheck` 退出码 0；`npm test` 16 个测试文件、137 tests 全部通过（含 `trips/applicationEntry.test.ts`）。
- 根目录无 `package.json`，`npm run lint:api` 无法执行 → 工具缺口（Skipped），结论上限 Partial。
- 工件记录的 E2E 证据：`docs/sdd/refine-trip-application/p4-verify.md` §4/§9（`companions.spec.ts` 8/8；全套 30/30；合并 main 后隔离端口 39 passed + 1 项 `profiles.spec.ts` main 侧陈旧断言）、`docs/ai4se-plugins/20261116-141500-local-verify-report.md`、`ci-report.md`（`build-da6cc8b`，Pass-by-tag）。本评审未重跑。
- 证据快照提示：当前工作区含未提交的第三方 change（`add-trip-publish`）改动，涉及 `frontend/src/trips/TripCard.tsx`、`TripCreatePage.tsx`、`styles.css`、`i18n/tripMessages.ts` 与 `e2e/tests/companions.spec.ts`（`git status`）。本评审按“本 change 负责的符号”（`applicationEntry.ts`、`TripDetailPage.tsx` 申请区、`companions.spec.ts` 申请段）判定，未提交的 WIP 不计入本 change。

**读过的关键文件：**

- 规则：`.agents/skills/all-specs-review/SKILL.md`、`references/review-checklist.md`、`docs/knowledge/rules/_INDEX.md`、`architecture/rules.md#api-contract`、`quality/rules.md#coding-style|#web-coding-style|#naming-conventions`、`testing/rules.md#web-testing`、`process/rules.md#spec-first|#tdd-cycle|#git-commit-conventions|#git-branching-and-pr|#artifact-review-gate`、`documentation/rules.md#document-conventions|#sdd-artifacts`、`security/rules.md`（索引 + 适用范围）、`_SCHEMA.md`、`_LOG.md`。
- 工件：`proposal.md`、`design.md`、`specs/trip-companions/spec.md`、`tasks.md`、`atdd-design.md`、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`、`g2-decision.md`、`ci-report.md`、`docs/sdd/refine-trip-application/p4-verify.md`。
- 契约：`RouteME/openapi.yaml`（`info.version: 0.8.1`；`DUPLICATE_APPLICATION`、`TRIP_NOT_OPEN`、`message` nullable ≤120 均已在契约内；本 change 零 diff）。
- 实现：`frontend/src/trips/applicationEntry.ts`、`applicationEntry.test.ts`、`trips/TripDetailPage.tsx`（`applicationEntryState` 派生、`submitApplication`、`entry.kind === 'pending' | 'accepted' | 'unavailable' | 'apply'` 分支、`MAX_MESSAGE_LENGTH = 120`、`Input.TextArea`）、`frontend/src/api.ts`（`applyForTrip` / `loadTrip` / `cancelApplication` / `loadMyApplications`）、`frontend/src/i18n/tripMessages.ts`（`apply*` 键）、`frontend/src/styles.css`（`.detail-application .action-box` / `.action-note(.warn)` / `.apply-form` / `.apply-form textarea.ant-input`，另有遗留 `.application-status`）、`e2e/tests/companions.spec.ts`。
- 基线：`openspec/specs/trip-companions/spec.md`「提交与取消同行申请」5 个场景（提交待处理 / 本人 / 重复 / 满员结束 / 取消），与 Delta 8 场景逐条对照。
- 历史：`git log/show`（`7bfbf93`、`4b8ff8c`、`f26e7d3`、`628906a`、`da6cc8b`）与 `git status`。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| ASR-TA-01 | WARNING | `rules/quality/rules.md#web-coding-style`（文案与国际化：界面文案集中在 `i18n`，组件不写死句子） | `RouteME/frontend/src/trips/TripDetailPage.tsx`：`entry.kind === 'pending'` 的 `{`申请已提交，等待 ${trip.publisher.nickname} 回应。处理前你可以随时撤回。`}`、accepted 分支的 `{`与 ${trip.publisher.nickname} 沟通`}`、以及 `confirmHint` 的 `cancelApply` 分支字符串 | 本 change 新增 / 改写的用户可见文案直接写在组件里（含模板插值），未进 `RouteME/frontend/src/i18n/tripMessages.ts`；同一 change 的 `tasks.md` T2 已把其余 9 条文案集中到 `tripMessages`，此处漏做，导致规格原文（Delta 场景 2 逐字引用该句）与 UI 存在两处副本 | 新增 `applyPendingNote`（带 `{nickname}` 占位）、`applyChatAction`、`applyCancelHint` 到 `tripMessages`，组件只引用键；`applicationEntry.test.ts` 已从 `tripMessages` 取值，可直接复用 | `[fact]` |
| ASR-TA-02 | SUGGESTION | `rules/quality/rules.md#coding-style`（避免残留死代码） | `RouteME/frontend/src/styles.css` `.application-status` | 申请状态 Tag 区块已按 `design.md` D3 删除（“`application-status` 样式不再被申请区使用”），但样式规则仍在，且全仓无任何引用（`grep` 只命中 `styles.css` 自身）；`g2-decision.md` 已记为 SUGGESTION 但未清理 | 删除该死规则，或归入下一次统一样式清理并登记 owner | `[fact]` |
| ASR-TA-03 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts`（设计 / 记录与实现一致） | `openspec/changes/refine-trip-application/design.md` D3「accepted」分支 vs `RouteME/frontend/src/trips/TripDetailPage.tsx` accepted 渲染（`{!isCompleted && (<Button … >退出同行</Button>)}`） | 设计写 accepted 展示“「与 {发布者昵称} 沟通」+「退出同行」”，实现对已结束行程隐藏「退出同行」；该行为差异没有写进 `design.md` D3，也不在 `docs/sdd/refine-trip-application/p4-verify.md` §6「实现偏差与设计一致性」表内 | 把条件写入 design D3（并说明“行程结束后不可退出同行”的原因），或补进 P4 偏差表 | `[fact]` |
| ASR-TA-04 | SUGGESTION | `rules/process/rules.md#git-commit-conventions`（message 形式 `<type>(<stage>)`，stage ∈ verify / archive） | commits `7bfbf93 docs(p1)`、`4b8ff8c docs(p2)`、`f26e7d3 docs(p3)`、`628906a feat(p4)`；合并 `939f28c`、`d6463a2`、`d9cb5de`、`da6cc8b` | 提交 stage 用 `p1`–`p4`，不在规则允许的 `verify` / `archive` 取值内，且一个 change 产生 4 次以上提交。“每阶段一次提交”已由用户在 `proposal.md` §残余风险具名授权，但 message 形式与追溯规范仍未收敛 | 在归档 `summary.md` 记录该授权与偏离；后续 change 恢复 `feat(verify): <change-id> …` 形式（`/sdd:pr-submit`） | `[fact]` |
| ASR-TA-05 | SUGGESTION | `rules/testing/rules.md#web-testing`（查询优先语义化选择器；第三方组件用 CSS 需注明原因） | `RouteME/e2e/tests/companions.spec.ts`：`rejects a submission after the trip fills and shows the reason` / `rejects a submission after the trip ends` 的 `page.locator('.ant-alert').filter({ hasText: … })` 与 `page.locator('.detail-application .action-note')` | 对 antd 内部类名 `.ant-alert` 断言未按规则例外条款加注释说明原因；其余用例已优先 `getByRole` / `getByPlaceholder` / `getByText` | 改用 `getByRole('alert')`（antd `Alert` 渲染 `role="alert"`）或补一行注释说明为何必须用 CSS 选择器 | `[fact]` |
| ASR-TA-06 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts`（工件职责边界：`summary.md` 承载变更轨迹） | `openspec/changes/refine-trip-application/`（无 `summary.md`；`tasks.md` T6 未勾选） | 归档前必需的 `summary.md` 与 Living Spec 收口（8 场景、5 个基线语义）尚未完成，`tasks.md` T6 仍为 `[ ]`。当前阶段（G2 已过、P5 未启动）属正常，但 change 包尚不自包含 | 归档时补 `summary.md`（含 D2 覆盖 S08 字面 AC 的口径、提交偏离、PR 链接），并复核 `openspec/specs/trip-companions/spec.md` 合并结果 | `[fact]` |

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A 架构 | 未发现 | 无后端 / 契约 / 迁移改动（`openapi.yaml`、`backend/**`、`db/migration/**` 零 diff）；入口状态派生抽成纯函数 `applicationEntry.ts` 放在 `trips/` 业务模块，页面只做取值与渲染；请求仍只走 `api.ts`（`applyForTrip` / `loadTrip` / `cancelApplication` / `loadMyApplications`）；表单用 antd `Input.TextArea`、确认用保留的 `Modal`，符合组件选型 |
| B 质量 | Partial | ASR-TA-01 为 WARNING（新增文案未集中、组件内写死句子）；ASR-TA-02 死 CSS；命名（`applicationEntryState` / `applicationErrorMessage` / `ApplyEntryKind`）与文件放置符合 `web-coding-style`，无 `any`、无 `console.log`；`TripDetailPage.tsx` 548 行，在 800 行上限内 |
| C 测试 | Partial | 8 个 Delta 场景都有 E2E 或后端回归落点（`companions.spec.ts` 6 条新增 / 改造用例 + `ApplicationControllerTest` 回归）；纯函数有同目录 `applicationEntry.test.ts`（13 项，含「满员 + accepted 仍 accepted」「cancelled/rejected → apply」边界）；无 `waitForTimeout`；ASR-TA-05 为选择器说明缺失 |
| D 安全 | 未发现 | 拒绝由服务端执行（`ApplicationServiceImpl.apply`：本人 → 重复 → 非 recruiting），前端隐藏不作为安全边界；`message` 选填 ≤120 未放宽；无硬编码密钥、无新增 PII 日志；`X-User-Id` / `routeme.currentUserId` 为项目既有 auth stub（见残余风险） |
| E 过程 | Partial | spec-first / tdd-cycle 证据齐全（`p4-verify.md` §3 记录 `git stash` 后跑红再恢复实现，属合规 Red 证据）；ASR-TA-04 为提交形式偏离（用户已授权阶段提交，message 形式未收敛）；直推 `main` 无独立 PR 已由 `g2-decision.md` 记为豁免（单人练习仓库例外） |
| F 文档 | Partial | ASR-TA-03 设计与实现漂移、ASR-TA-06 缺 `summary.md`；其余工件命名（`trip-companions`、`refine-trip-application`、`g1/g2-decision.md`）、相对链接、正文中文 + 标识符英文均合规；`REQ-009 → REQ-010` 改号已有具名裁决说明 |
| G 工件链与契约追溯 | 未发现（阻塞性） | REQ-010 §4 八条场景 ↔ Delta 8 场景 ↔ `atdd-design.md` E1–E8 ↔ `tasks.md` T1–T6 ↔ `companions.spec.ts` 用例名 ↔ 实现分支一一对应；Living Spec 5 个基线场景 5/5 保留在 MODIFIED 块；契约零 diff 且引用的两个错误码在 `openapi.yaml` 中存在；`artifact-review-gate` 的四份工件报告因规则 2026-11-16 14:04 才生效（本 change P1–P3 在 11:54–14:00）不追溯适用（Skipped） |

## Skipped

- `npm run lint:api`：根目录无 `package.json`，命令不可执行 → 工具缺口（Skipped）；本 change 无契约 diff，未自行补跑 redocly。
- `artifact-review-gate` 四份工件评审报告：规则晚于本 change 的 P1–P3 工件产出 → 不追溯适用（Skipped）。
- 多浏览器 / 对比度矩阵、性能与容量：`atdd-design.md` §6 明确 deferred → Skipped（未阻断）。

## Residual risks

- **E2E 未纳入 CI**：验收仍为本地门禁（`ci-report.md`：E2E `N/A（CI 不含）`），回归保护依赖人工；`g2-decision.md` 已登记 owner。
- **main 侧既有失败**：`profiles.spec.ts` 因 `V13` 种子与断言失配在合并后失败，属 `add-user-profile(s)`，不阻断本 change，但会稀释“全套 E2E 全绿”的证据强度。
- **工作区快照与 HEAD 不一致**：当前工作区含 `add-trip-publish` 未提交改动（含 `companions.spec.ts` 的匹配环断言），复跑 E2E 前需先确认工作区干净，否则 8/8 结论不可复现。
- **auth stub**：`X-User-Id` / `routeme.currentUserId` 仍是身份来源，申请权限完全依赖该头；上线前必须替换为真实鉴权（项目级遗留，本 change 未扩大）。
- **T6 未执行**：Living Spec 合并与 `summary.md` 属 P5 / G3，若合并只追加不替换，基线 5 个场景有被削弱的风险（`consistency-lint.md` L-02 的兜底任务）。

## Next remediations (non-Gate)

1. AO：按 ASR-TA-01 把 pending 提示、沟通按钮、撤回确认提示迁入 `tripMessages`（含 `{nickname}` 占位），并让 `companions.spec.ts` 继续按可见文案断言（`/sdd:atdd-apply` 收尾）。
2. AO：删除 `.application-status` 死样式（ASR-TA-02），并补 design D3 的「结束后不可退出同行」条件（ASR-TA-03）。
3. AO：把 ASR-TA-04 的提交偏离与用户授权写入归档 `summary.md`，后续 change 恢复 `feat(verify)` 单提交。
4. AO：将 ASR-TA-05 的 `.ant-alert` 断言换成 `getByRole('alert')` 或补例外注释。
5. SA + AO：归档前完成 T6（8 场景 / 5 基线语义复核 + `summary.md`），并用 `/sdd:consistency-lint` 复验。