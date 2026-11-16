# P4 实现与验证记录 — refine-experience-share

- **Change：** `refine-experience-share`（REQ-004 / S16 发布游后体验）｜ **阶段：** P4（Implement → verify → G2）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-experience-share`（P3 提交 `69acc17`；rebase 前哈希 `81120a1`；rebase 后覆盖 `main@f6da5da`）
- **合入：** `main@e2abd4e`（merge `feature/refine-experience-share`，2026-11-16 20:39+08）｜ CI run `43868630052` / CD run `43868762854`

## 1. 阶段目标

按 `tasks.md` T1–T7 实现分享页说明、体验卡内置封面、资格提示与对应回归，产出可复核的本地验证证据，并记录 G2。

## 2. 实现落点

| 文件 | 改动 | 任务 |
|---|---|---|
| `frontend/src/trips/coverTone.ts`（新） | 抽出目的地→五色封面的哈希（原 `TripCard` 局部函数） | T1 |
| `frontend/src/trips/TripCard.tsx` | 删除本地 `COVER_TONES` / `coverTone`，改为 import | T1 |
| `frontend/src/experiences/ExperienceCard.tsx` | 新增 `.exp-cover` 封面条（目的地名 + 色调），目的地变量复用 | T1 |
| `frontend/src/experiences/shareEligibility.ts`（新） | `ready` / `notCompleted(status)` / `notParticipant` 三态纯函数 | T2 |
| `frontend/src/experiences/shareEligibility.test.ts`（新） | U1–U4 四例 | T2 |
| `frontend/src/experiences/ShareExperiencePage.tsx` | hero（封面 / 标题 / 目的地 / 日期 / 同行人数 / 状态徽标）、页面标题与副标题、「你的体验会去哪里」三条、「分享边界」两条、两种不可用分支 | T3 |
| `frontend/src/trips/TripDetailPage.tsx` | `canShare` 改用 `shareEligibility`（`participant` 仍供「即将结束」提醒） | T4 |
| `frontend/src/i18n/tripMessages.ts` | 新增 `experienceNotCompleted*` / `experienceNotParticipant*` / `experienceShareHeading*` / `experienceShareSub` / `experienceCompanionsSuffix` / `experienceGoesTo*` / `experienceBoundary*`；删除 `experienceNotAllowed` / `experienceGoesTo` / `experiencePrivacy` / `shareBoundaryTitle` | T3 |
| `frontend/src/styles.css` | `.share-hero` / `.share-hero-cover` / `.share-hero-body` / `.share-note` / `.share-note-title` / `.exp-cover`；列表复用 `.safety-list` | T3 |
| `e2e/tests/experiences.spec.ts` | 新增 2 例（重复提交即修改、我的旅行已完成分组）、改造 3 例（两种不可用提示、hero / 去向 / 边界、体验卡封面）、新增 `createOpenTrip` 辅助 | T5 |
| 后端 / `openapi.yaml` / 迁移 | **无改动** | — |

### 与 P3 设计的差异

| 设计 | 实际 | 原因 |
|---|---|---|
| D6 未结束提示「当前状态：{status}」 | 实现为 `experienceNotCompletedHint` + `statusLabel()` 拼接 | 与设计一致；`statusLabel()` 覆盖 `ongoing` → 旅行中 |
| DG-03 保留卡片 3px 顶边 | 保留 `.exp-card` 的 `border-top`，封面条位于其下、内边距内 | 视觉走查确认无重复装饰 |
| 设计 §5 列表样式 | 复用 `.safety-list`，未新增 `.share-note-list` | 评审 DG-02 收口 |
| `tasks.md` 表格结构 | 改为 `### T<n> [layer]` + `- [x]` 复选框 | `openspec validate --strict` 需要复选框才能统计任务；内容不变，见 tasks 评审「变更摘要」 |
| `coverTone.ts` 文件内容 | 合入 `main` 时采用 `main` 的导出式实现（`export const COVER_TONES` + JSDoc，参数名 `destination`） | 与并行 change 的同名文件撞车；函数行为与调用方一致，`TripCard` / `ExperienceCard` 的 import 不变 |

## 3. 本地验证

| 层 | 命令 | 结果 |
|---|---|---|
| 前端静态 | `cd frontend; npm run typecheck` | 通过 |
| 前端构建 | `cd frontend; npm run build` | 通过 |
| 前端单测 | `cd frontend; npm test` | 17 files / 141 tests passed |
| 后端单测 | `cd backend; .\mvnw.cmd -B -ntp test` | 230 tests, 0 failures |
| E2E（本 change） | `cd e2e; npx playwright test tests/experiences.spec.ts` | 8 passed |
| E2E（全量，干净库） | `cd e2e; npx playwright test` | 55 passed / 1 failed（既有债务，见 §4） |

详细输出与走查结论见 `docs/ai4se-plugins/20261116-165905-local-verify-report.md`。

### 3.1 远端 CI / CD（合入 `main` 后）

| Phase | Run | 结论 | 证据 |
|---|---|---|---|
| CI | [#156](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43868630052)（id `43868630052`，sha `e2abd4e`） | **Pass** | `Backend (Java 21)` 与 `Frontend (Node 22)` 两个 job 全 success（step 级：`Verify backend`、`Build and test`） |
| CD | [#88](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43868762854)（id `43868762854`） | **Pass** | `Build standalone jar` / `Upload artifacts` / `Publish GitHub release` 全 success；release tag `build-e2abd4e` → `e2abd4e` |

合入后在 `main` 复跑前端：`npm run typecheck` 通过、`npm test` **26 files / 189 tests passed**。报告：`docs/ai4se-plugins/20261116-204334-pipeline-report.md` 与 `openspec/changes/refine-experience-share/ci-report.md`。

E2E 不在 CI 流水线内，仍以本地隔离运行为准（`experiences.spec.ts` 8/8）。

## 4. 未通过项与移交

| 项 | 归属 | 说明 |
|---|---|---|
| `e2e/tests/companions.spec.ts:200` 满员拒绝仍断言 `.ant-alert` | `main@1cd1505` 的 owner（`add-trip-completion` 范围） | 该提交把申请失败反馈改为 toast，只更新了「行程已结束」用例；本 change 未触碰申请流程，按 `@rule:spec-first`「不修与本次无关的既有问题」移交 |

## 5. 用例与场景对照

见 `docs/ai4se-plugins/20261116-165905-local-verify-report.md` §3；12 个 Delta 场景均有用例或人工走查承接，E1–E12 / U1–U4 一一对应。

## 6. G2 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL（独立验证） | Neal | 本地验证证据可复现；实现符合 Delta 与设计；CI #156 / CD #88 通过、release `build-e2abd4e` 已发布；1 条既有 E2E 债务已定位且不属本 change | 2026-11-16 |
| AO | Jay | 实现、测试与走查完成；承接 P5 前的收口 | 2026-11-16 |

**G2 结论：** Pass（with 1 documented pre-existing E2E debt）。VL = Neal，2026-11-16；记录见 `openspec/changes/refine-experience-share/g2-decision.md`。

## 7. 阶段提交

- 提交信息：`feat(p4): refine-experience-share add share page guidance and built-in cover`
- 内容：实现 + 单测 + E2E + P4 记录 + 验证报告 + G2 + 索引更新（一条提交承载本阶段）
- push 前 `git pull --rebase origin main`

## 8. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0 | `cbb537c` | 基线记录（rebase 前 `48874b2`） |
| P1 | `76cae72` | 提案 + Delta 草稿 + 评审（rebase 前 `38f7cf2`） |
| P2 | `8638d99` | Delta 收敛 + G1（rebase 前 `0d2b3c6`） |
| P3 | `69acc17` | 设计 + ATDD + 任务（rebase 前 `81120a1`） |
| P4 | 本记录所在提交 | 实现 + 验证 + G2 |
| verify | 本阶段提交 | CI/CD 证据与 `ci-report.md`（`docs(verify): …`） |
| P5 | — | 按要求不执行、不归档 |

每次 push 前都执行 `git pull --rebase origin main`；分支为先推送的私有分支，rebase 后用 `--force-with-lease` 同步，不改写 `main`。
## 9. R2 实现与验证（2026-11-16 21:25）

- **任务：** T8–T13 全部完成（	asks.md「R2 任务」）。
- **落点：** `trips/tripDateFormat.ts`（新，含单测）→ `TripCard` 改用共享日期函数；`experiences/shareIcons.tsx`（新，9 个原型图标）；`ShareExperiencePage` 重构为页头 + hero + `.publish-grid` 双栏 + 三分组面板 + 卡片式强度 + 侧栏两面板；`experienceForm` 的 `INTENSITY_OPTIONS` 增加 `tone`；`tripMessages` 增加 `experiencePanelContent` / `experiencePanelAdvice`；`styles.css` 重写分享页样式块（`.intensity-picker` / `.int-card` / `.int-radio` / `.share-list` / 调整后的 `.share-hero`）。
- **实现偏差：** `.int-radio` 由 1px 隐藏改为绝对定位铺满卡片——1px 时 Playwright 与真实点击都被 `label` 拦截；铺满后点击区域即卡片，键盘与读屏语义不变。
- **验证：** 前端 typecheck 通过 / 单测 198 / 后端 243 / `experiences.spec.ts` 9 全绿（隔离产物目录）；走查 1440·768·390 × 浅/深色与原型并排比对；报告 `docs/ai4se-plugins/20261116-212000-local-verify-report.md`。
- **全量 E2E：** 64 passed / 9 failed，逐条归属并行 change 与共享库数据（见报告 §4），不属本 change。
- **有意差异：** 原型分享页无安全提示，保留 P4 的 `SafetyNote`（用户 2026-11-16 裁决保留）。
- **G2（R2）：** Pass，VL = Neal（`g2-decision-r2.md`）。
- **阶段提交：** `feat(p4): refine-experience-share align the share page with the prototype`。