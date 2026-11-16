# P3 设计记录 — refine-experience-share

- **Change：** `refine-experience-share`（REQ-004 / S16 发布游后体验）｜ **阶段：** P3（Design & task plan）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-experience-share`（P2 提交 `8638d99`；rebase 前哈希 `0d2b3c6`）

## 1. 阶段目标

把 12 个 Delta 场景落成可实现、可验证的设计与任务：明确组件结构、文案键、样式令牌、资格判定函数、测试分层与人工走查范围，同时保证不改后端 / 契约 / 迁移。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 设计 | [`design.md`](../../../openspec/changes/refine-experience-share/design.md) | D1–D9；组件与数据结构、文案表、样式表、可访问性、测试设计、风险 |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/refine-experience-share/atdd-design.md) | E1–E12 场景映射；U1–U4 单测；E2E 变更明细；人工走查 6 张 |
| 任务 | [`tasks.md`](../../../openspec/changes/refine-experience-share/tasks.md) | T1–T7，含落点、依赖、验证命令与自检 |
| 设计评审 | [`design-review`](../../reviews/20261116-refine-experience-share-design-review.md) | Pass；0 BLOCKER / 1 WARNING / 3 SUGGESTION |
| 任务评审 | [`tasks-review`](../../reviews/20261116-refine-experience-share-tasks-review.md) | Pass；0 BLOCKER / 3 SUGGESTION |
| P3 质量报告 | [`20261116-172000-quality-checklist-report.md`](../../ai4se-plugins/20261116-172000-quality-checklist-report.md) | P3-1 ~ P3-4 Pass；Overall Pass |

## 3. 关键设计决策

- **单列布局（D1）。** 不做原型双栏 `form-grid`：现有页面在 390 宽已是单列，双栏会牵动既有样式与 E2E；只在表单上方加 hero、中部加两段说明列表。
- **同行人数口径（D2）。** 取 `trip.participants.length`（含发布者），与原型 `S.count()` 和详情页参加者列表一致；不用 `joined_count`。
- **封面复用（D3 / D4）。** 把 `TripCard` 的 `coverTone()` 抽到 `trips/coverTone.ts`，`ExperienceCard` 复用同一五色哈希；体验卡封面为固定 64px 色条 + 目的地名，`aria-hidden`。
- **资格判定抽纯函数（D5）。** `shareEligibility(trip, userId)` 返回 `ready` / `notCompleted(status)` / `notParticipant`；`TripDetailPage` 的 `canShare` 与分享页共用，三态在 node 环境 vitest 覆盖。
- **拒绝职责（D7）。** 服务端仍是唯一拒绝方（`EXPERIENCE_NOT_ALLOWED` 403），前端只做说明；不扩错误码、不改契约。
- **重复提交（D8）。** 维持 `upsert`，只补 E2E 条数断言。
- **样式最小化。** 新增 `.share-hero*`、`.share-note`、`.exp-cover`；列表复用既有 `.safety-list`（初稿的 `.share-note-list` 已按评审 DG-02 删除）。

## 4. 对齐自检（vs Delta Spec）

| Delta Requirement | 设计落点 | 任务 | ATDD |
|---|---|---|---|
| 对已结束且参加过的行程发布游后体验 | D5 / D6 / D7；§3.2、§3.3 | T2 / T3 / T4 / T5 | E1–E5、U1–U4 |
| 游后体验的内容口径与纯文字降级 | D3 / D4；§3.1、§3.4、§5 | T1 / T3 | E7 / E8 |
| 我的旅行分享入口与分享边界 | D1 / D2；§3.3、§4、§5 | T1 / T3 / T5 | E9–E12 |

- **无静默扩张：** `design.md` §8 列出不动项（后端 / 契约 / `SafetyNote` / 首页筛选分页）；`tasks.md` 无图片上传、无双栏、无 S17 任务。
- **无遗漏场景：** E1–E12 覆盖 12 个 Delta 场景；U1–U4 覆盖资格三态。

## 5. 测试与验证计划

| 层 | 命令 | 判据 |
|---|---|---|
| 单测 | `cd ai4se-baseline/RouteME/frontend; npm test` | U1–U4 + 既有用例全绿 |
| 前端构建 | `npm run build` | `tsc --noEmit` + vite build 通过 |
| E2E | `cd ai4se-baseline/RouteME/e2e; npx playwright test tests/experiences.spec.ts` | E1–E12 全绿 |
| 后端回归 | `cd ai4se-baseline/RouteME/backend; .\mvnw.cmd -B -ntp test` | 不限改动，但须全绿 |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色 | 截图 6 张，无溢出、无对比度问题 |

## 6. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO（作者） | Jay | 设计与任务可执行；承接 T1–T7 | 2026-11-16 |
| VL（审批） | Neal | 设计取舍、测试分层与验收判据 | 待签署 |
| SM | 待签署 | 排期确认 | 待签署 |

**阶段结论：Pass（P3-1 ~ P3-4 全 Pass）。** 下一步 P4：实现 T1–T7 → 本地验证 → G2。

## 7. 阶段提交

- 提交信息：`docs(p3): refine-experience-share design atdd and task plan`
- push 前 `git pull --rebase origin main`；仅提交本 change 的路径（工作区存在并行会话的规则文件改动，不纳入本提交）。
- `docs/sdd/README.md` 的 P3 链接延后到 P4 同批更新：该文件此刻还有并行会话未提交的「签署人矩阵」改动，避免把他人工作混入本阶段提交。