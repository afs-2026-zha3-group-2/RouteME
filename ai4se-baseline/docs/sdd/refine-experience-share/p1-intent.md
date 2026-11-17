# P1 意图与提案记录 — refine-experience-share

- **Change：** `refine-experience-share`（REQ-004 / S16 发布游后体验）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支 / 基点：** `feature/refine-experience-share`，基线 `main@25b60f7`（含 `add-trip-completion` 的四态生命周期）

## 1. 阶段目标

把 S16「发布游后体验」从「主干已交付」收敛为可判定的增量提案：说明 `add-trip-experiences` 已交付什么、本次只补哪些缺口、验收信号如何观察，并把不可用原因的两种口径写成可验证场景。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 需求来源 | [`requirements/REQ-004-trip-experiences.md`](../../../requirement-workspace/requirements/REQ-004-trip-experiences.md) | 六字段 + 8 场景 + blocking OQ 0；本 change 复用，不新增 REQ 编号 |
| 故事 | [`stories.md`「REQ-004（S16）」](../../../requirement-workspace/stories.md) | S16 / 迭代 3 / P1 / 3 点 / 游后分享页；无独立故事文件（原型 `stories.html` 已提供 AC） |
| 登记与交接 | [`registry.md`](../../../requirement-workspace/registry.md)、[`handoff.md`](../../../requirement-workspace/handoff.md) | REQ-004 行追加 R2 记录；REQ → change 增补 `refine-experience-share` |
| 提案 | [`proposal.md`](../../../openspec/changes/refine-experience-share/proposal.md) | 问题 / 范围 / 影响面 / 决策 / 验收信号 / 残余风险 |
| Delta 草稿 | [`specs/trip-experiences/spec.md`](../../../openspec/changes/refine-experience-share/specs/trip-experiences/spec.md) | MODIFIED 3 Requirement / 12 场景（既有 10 个场景名全保留 + 新增 2 个）；P1 初稿为「MODIFIED 2 + ADDED 1」，P2 依据 Living Spec 既有「我的旅行分享入口与分享边界」收敛为 3 条 MODIFIED |
| 工件评审 | [`proposal-review`](../../reviews/20261116-refine-experience-share-proposal-review.md)；[`spec-review`](../../reviews/20261116-refine-experience-share-spec-review.md) | 见评审结论与「批准记录」 |
| 质量报告 | [`20261116-162000-quality-checklist-report.md`](../../ai4se-plugins/20261116-162000-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 / P1-6 optional Skipped；Overall Pass |

## 3. 关键决策

- **复用 REQ-004，不新增编号。** S16 的原始需求条目就是 REQ-004（`trip-experiences` ADDED），`add-trip-experiences` 已归档；本 change 是对同一能力的展示层收敛，按 `add-match-reason`（复用 REQ-003）先例登记 R2。
- **两个不可用原因在前端区分。** 服务端继续用 `EXPERIENCE_NOT_ALLOWED` 拒绝（403），前端在加载行程后用 `status` 与 `participants` 渲染两种提示；不扩错误码、不升 `openapi.yaml`。
- **分享页保留单列 antd 表单。** 补 hero、去向三条、边界两条；不做原型双栏 `form-grid` 与强度卡片化，避免牵动既有 E2E 与 390 布局。
- **体验卡加内置封面。** 复用 `TripCard` 的五色 `cover-*` 令牌，按目的地哈希；不引入图片资源。
- **重复提交维持 upsert。** 故事 AC 允许「提示或允许编辑最新一条」，现有实现取更简单的一条，本 change 只补 E2E 证据。
- **不归档。** 按用户要求停在 P4；Living Spec 合并在 P5 归档阶段，本 change 不做。

## 4. 校验

- `openspec validate refine-experience-share --strict` → `Change 'refine-experience-share' is valid`。
- `openspec show refine-experience-share --json --deltas-only` → `deltaCount: 3`（3 条 MODIFIED），`spec=trip-experiences`。
- Delta 场景数：MODIFIED「对已结束且参加过的行程发布游后体验」5 场景（既有 5 个名称全保留，内容收敛）+ MODIFIED「游后体验的内容口径与纯文字降级」3 场景（既有 3 个名称全保留）+ MODIFIED「我的旅行分享入口与分享边界」4 场景（既有 2 个名称全保留 + 新增 2 个），合计 12 场景。
- Living Spec 基线场景名在 MODIFIED 中全部保留（校验器要求 MODIFIED 不得丢弃既有场景名）；Living Spec 现为 7 Requirement / 22 Scenario，本 delta 覆盖其中 3 条 Requirement。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 承担 P2–P4 实现与阶段记录 | 2026-11-16 |
| SM | 待签署 | P1 范围与排期（单 change、3 点、迭代 3） | 待签署 |
| IO | WAYNE | 需求来源与跨能力影响（`trip-experiences` MODIFIED + ADDED，`trip-plans` 只读） | 待签署 |
| SA | WAYNE | 规格与验收口径（hero、去向三条、边界两条、两种不可用提示、内置封面） | 待签署 |

**阶段结论：Pass（required 4/4；非 Gate 决策）。** 下一步 P2：AC/DoV 复核 → 一致性检查 → G1。

## 6. 提交与偏离记录

- **阶段提交：** `docs(p1): refine-experience-share add proposal and delta draft`；push 前 `git pull --rebase origin main`。
- **分支：** 按用户指示新建 `feature/refine-experience-share`（`@rule:git-branching-and-pr`），不在 `main` 直接提交。
- **并行基线：** rebase 时吸收 `main@25b60f7`（`add-trip-completion` P4）。该提交把行程状态扩为四态并把体验资格判定的 `status()` 改为 `status(clock.instant())`；本 change 的「未结束」口径据此覆盖 `recruiting` / `full` / `ongoing`。
- **范围偏离：** 无。故事 4 条 AC 全部有场景或验收信号承接；图片上传继续按 AC 记为增强项、不进本 change。
- **P2 修订（2026-11-16）：** 原 Delta 草稿把分享页说明写成 ADDED「游后分享页说明体验去向与分享边界」；P2 一致性检查发现 Living Spec 已有「我的旅行分享入口与分享边界」Requirement（含「分享页面提示隐私边界」场景），ADDED 会形成平行权威。已改为 MODIFIED 第三条 Requirement（保留两个既有场景名 + 新增两个），proposal 同步由 「MODIFIED + ADDED」收敛为「MODIFIED（3 条）」。重评见 `20261116-refine-experience-share-{proposal,spec}-review-2.md`。
## 7. R2 增补（2026-11-16 20:50）：布局与原型对齐

- **触发：** 用户评审已合入的分享页：「没有按照原型图来做布局和样式」。
- **范围：** 只改布局与样式（页头、双栏、三面板、强度卡片、侧栏说明、hero 元信息、操作位置、图标、日期格式）；不改行为、文案语义、后端、契约、迁移。
- **依据：** `docs/prototype/ui.js` `share()`、`docs/prototype/styles.css` `.form-grid` / `.intensity-picker` / `.int-card`；缺口见 `p0-baseline.md` §9（G-R2-01 ~ G-R2-07）。
- **产出：** `proposal.md` 增补「R2」章节；Delta 在 P2 补布局约束；设计与任务在 P3 增补。
- **阶段提交：** `docs(p1): refine-experience-share add the R2 prototype layout proposal`。