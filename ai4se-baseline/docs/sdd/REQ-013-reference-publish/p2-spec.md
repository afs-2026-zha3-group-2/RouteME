# P2 规格记录 — REQ-013-reference-publish

- **Change：** 无新建（REQ-013 / S17，复用已归档的 `add-trip-experiences`）｜ **阶段：** P2（Spec align / G1）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@7fafd94`（P1 提交）

## 1. 阶段目标

P2 的产物是**可验证的 Delta Spec**，并据此走 G1。本阶段先做准入判定：REQ-013 是否存在需要写进 `openspec/changes/<id>/specs/` 的规格增量。

## 2. 准入判定

| 判定项 | 事实 | 结论 |
|---|---|---|
| 是否新建 change | 用户裁决 D1：按「已验证交付」收口，不新建 `openspec/changes/` | 无 change-id，无 Delta 落点 |
| 是否已交付 | REQ-004 / `add-trip-experiences` 已归档并 verified，Living Spec `openspec/specs/trip-experiences/spec.md:133-148` 为权威基线 | 规格已在基线内 |
| 4 条 AC 与基线差异 | 逐条映射后**无行为差异**；仅遗留两处**措辞粒度**差异（见下） | 无需改规格 |
| 需不需要改校验 / 契约 | `TripCreateRequest` 无来源字段，集合区域在 `trip-plans` 明确选填 | 无契约变更可写 |
| 两处措辞差异 | ① 故事「体验**详情**」→ 产品只有体验卡；② 故事「集合地点**必须**重新填写」→ 基线为「不得沿用」、集合区域选填 | 差异已在 P1 措辞映射记录，**不构成 Delta**：改措辞属于故事 / 需求条目文本，不是规格行为变更 |

**结论：REQ-013 没有可写的 Delta Spec，因此 P2 不适用（N/A）**，不产生 Delta Spec、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`，也不触发 `@rule:artifact-review-gate` 的 spec 评审。

理由：Delta 的语义是「相对基线规格的变更」。基线已经包含 REQ-013 全部四条 AC，若仍写一份 MODIFIED Delta，只会把既有 Requirement 原样抄一遍，制造一条无行为差异的变更记录，并使 REQ-004 与 REQ-013 对同一能力重复定义；这与 D1 的收口口径冲突。

## 3. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| Delta Spec | **无** | 无 change-id，无可写的规格增量（见 §2） |
| AC / DoV 复核 | **无**（并入本记录 §4） | 4 条 AC 已在 P1 逐条取证，无新增可验场景 |
| 一致性检查 | **无** | 无 Delta，无 `phase=p2` 的 lint 对象 |
| G1 决策 | **无** | 未起草 Delta，无 G1 可签；SA 不介入 |
| 本阶段记录 | 本文件 | 准入判定 + checklist 状态 + 重启条件 |

## 4. P2 质量检查（N/A 记录，不主张 Pass）

| id | Required | 状态 | 证据 |
|---|---|---|---|
| P2-1 | yes | N/A | 无 `openspec/changes/<id>/`；D1 明确不新建 change，无 Delta 可写（§2） |
| P2-2 | yes | N/A | 无 Delta 即无新增 AC / DoV；4 条 AC 的证据锚点见 `p1-intent.md` §4 与质量报告 P1-2 |
| P2-3 | yes* | N/A | 未主张 G1，也未起草 Delta，故无 `g1-decision.md` |
| P2-4 | no | Skipped | 未运行 `/sdd:consistency-lint`；无 Delta 对象 |

**Stage Overall：N/A（0/0 required 适用）。** 本表不构成 P2 Pass，也不改变 P1 的「已验证交付」结论。

## 5. 什么情况下 REQ-013 才需要真正的 P2

只要出现下面任一项，就不是「记录口径」而是「行为变更」，必须另开需求条目 + change，并补 P2 全套产物（Delta Spec → `dov-ac-review.md` → `consistency-lint.md` → G1）：

| 触发条件 | 需要改的能力 | P2 应产出 |
|---|---|---|
| 集合区域改为发布**必填**（落实故事字面「集合地点必须重新填写」） | `trip-plans`（MODIFIED）+ 后端校验 / `openapi.yaml` / 前端表单 | 改「发布旅行计划」Requirement 场景；补必填校验失败场景 |
| 新增**独立体验详情页**（落实故事字面「体验详情」） | `trip-experiences`（ADDED）+ 前端路由 | 新增体验详情 Requirement 与入口 / 跳转场景 |
| 参考发布改为带来源字段（可回溯原行程） | `trip-plans`（MODIFIED）+ `TripCreateRequest` | 新增来源字段契约与场景 |

以上均**未**在本轮发生：P1 已按 Living Spec 解释两处措辞差异（体验卡、不得沿用），用户未裁决改行为。

## 6. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jacky | P2 准入判定：无 Delta、P2 不适用、不主张 Pass | 2026-11-16 |
| IO | 不适用 | 无新增需求来源 | — |
| SA | 不适用 | 无 Delta Spec，无 G1 | — |
| SM | 不适用 | 阶段准入无争议；P1 范围签字已覆盖 | — |

**阶段结论：P2 不适用（N/A）**，不进入 P3；REQ-013 保持 P1 的 `verified` 状态。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | `7fafd94 docs(p1): REQ-013-reference-publish record S17 as verified delivery` | 5 新文件（意图、Ready 条目、P1 记录、P1 质量报告与检查点） |
| （共享文档） | `43cffaa docs(p2): refine-safety-report rebase spec on report-entry-only design` | 并行会话提交，顺带带入 P1 对 `registry.md` / `handoff.md` / `stories.md` / `deep-dive.md` / `impact-brief.md` / `docs/sdd/README.md` 的 REQ-013 增量；内容正确，仅提交切分不纯 |
| P2 | 本记录（`docs(p2): REQ-013-reference-publish record P2 as not applicable`） | 只写准入判定记录，无 Delta / 无代码 / 无契约 diff |

- **偏离：** 常规 P2 要求 Delta Spec + 规格评审报告 + G1；本阶段按 D1 判定为 N/A，因此不产出上述工件，也不声称 P2 Pass。若后续要做行为变更，按 §5 另开需求并补齐 P2 全套。
- **未触碰：** 代码、`openapi.yaml`、数据库迁移、测试、Living Spec、设计系统；并行会话的 `refine-safety-report` 工件。