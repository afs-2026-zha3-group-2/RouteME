# P1 意图记录 — add-trip-cancel

- **Change：** `add-trip-cancel`（REQ-021 / issue #28）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-17 ｜ **记录人：** Neal（VL）
- **分支：** `feature/add-trip-cancel`（worktree `.worktrees/add-trip-cancel`，从 `origin/main@c1c238a` 切出）

## 1. 阶段目标

把 issue #28「取消行程」收敛为可判定的 REQ-021、影响面与 OpenSpec 提议；按用户裁决 D1 将信用分整体排除，只交付取消状态机与取消后的产品闭环。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-021-trip-cancel.md`](../../requirement-workspace/intents/REQ-021-trip-cancel.md) | issue #28 原始用户故事、取消规则、原因、善后、15 条 AC 与 4 个场景；现状差距；D1–D6 |
| Ready 需求 | [`requirements/REQ-021-trip-cancel.md`](../../requirement-workspace/requirements/REQ-021-trip-cancel.md) | 六字段 + 20 场景 + 11 条 OQ（blocking 0）+ DoR（BLOCKER 0） |
| 故事 | [`stories.md`](../../requirement-workspace/stories.md) REQ-021 段、[`stories/add-trip-cancel.story.md`](../../requirement-workspace/stories/add-trip-cancel.story.md) | S21（P0 / 迭代 2 / 3 点 / 详情与我的旅行） |
| deep-dive | [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「REQ-021 增补」 | 数据契约、边界归属、跨 REQ 一致性、展示契约、探针记录 |
| 影响面 | [`impact-brief.md`](../../requirement-workspace/impact-brief.md)「21. REQ-021 变更影响」 | as-is → delta、blast radius、artifact impact、风险、拆分边界 |
| 提案 | [`proposal.md`](../../openspec/changes/add-trip-cancel/proposal.md) | Why / What Changes / In-Out / D1–D6 / 影响面 / 残余风险 |
| Delta Spec | [`specs/trip-cancellation/spec.md`](../../openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md) | ADDED 5 Requirement / 20 Scenario；`openspec validate --strict` valid |
| P1 质量报告 | [`docs/ai4se-plugins/20261117-114804-quality-checklist-report.md`](../../docs/ai4se-plugins/20261117-114804-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped；Overall Pass |
| 全量评审 | [`docs/reviews/20261117-add-trip-cancel-all-specs-review.md`](../../docs/reviews/20261117-add-trip-cancel-all-specs-review.md) | Partial：BLOCKER 0 / WARNING 6（2 已修、4 待 P3）/ SUGGESTION 5（2 已修、3 待处理） |

## 3. 关键决策

- **D1 信用分：** 不做；信用分 / 信用记录 / 扣分 / 免扣分申请 / 管理员审核属其他 story；#28 中 5 条信用相关 AC 不在本 change 验收。
- **D2 取消入口：** 详情页 + 我的旅行「我发布的」行内；原型需先行。
- **D3 原因可见性：** 仅发布者与 ACCEPTED 同行者；PENDING 与其他用户只见「已取消」。
- **D4 其他原因：** 说明必填，1–100 字，前后端同时校验。
- **D5 我的旅行归组：** 沿用四组；取消行程留在「我发布的」/「已匹配同行」，显示「已取消」。
- **D6 编号与能力：** REQ-021 / `add-trip-cancel` / 新能力 `trip-cancellation`（ADDED）；REQ-018 被并行 `add-experience-photos` 占用。

## 4. 校验证据

- `openspec validate add-trip-cancel --strict` → `Change 'add-trip-cancel' is valid`（2026-11-17）。
- 能力归属：新能力单 capability，不替换 `trip-plans` / `trip-companions` 既有 Requirement 块；避免与 `add-trip-completion` / `refine-trip-application` / `refine-trip-chat` 三方同块冲突。
- 契约 / 迁移：暂定 0.13.0 + V19；`add-ai-itinerary` 计划 0.12.0 + V18，P3 定稿前复核。
- 评审遗留：W-03（到期物化排除取消）、W-04（原因裁剪边界）、W-05（原型先行）、W-06（签署）与 S-03 / S-04 / S-05 已登记在评审报告，P2 / P3 关闭。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | `proposal` / Delta Spec 签署；#28 范围与信用分排除确认 | 2026-11-17 |
| 当前开发者 | Neal（VL） | 评审报告第二签署位；承接 P2–P4 | 2026-11-17 |
| SM | Lewis | P1 范围与排期确认 | 待签署 |

**阶段结论：P1 工件完成，评审 Partial（BLOCKER 0；required 4/4 Pass），签署矩阵已完成（proposal / spec / 报告 = WAYNE + Neal）。** 下一步 P2 `/sdd:delta-craft` + `/sdd:consistency-lint`，随后 G1 由 IO / SA 签署。
