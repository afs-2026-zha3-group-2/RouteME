# P1 意图记录 — REQ-014-reference-publish

- **Change：** 无新建（REQ-014 / S17，复用已归档的 `add-trip-experiences`）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@78c782f`（P1 只写工件，无代码改动）

## 1. 阶段目标

把「S17 参考此行程发布」收敛为可判定的 REQ-014，并按用户裁决 D1 以**已验证交付**收口：逐条引用 REQ-004（`add-trip-experiences`）的 Living Spec、代码与 E2E 证据，不新建 OpenSpec change、不改代码、不重复定义体验能力。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-014-reference-publish.md`](../../../requirement-workspace/intents/REQ-014-reference-publish.md) | 原始故事、14 项现状核对与证据锚点、两处措辞差异、用户裁决 D1–D3、Discovery Decision `Go` |
| Ready 需求 | [`requirements/REQ-014-reference-publish.md`](../../../requirement-workspace/requirements/REQ-014-reference-publish.md) | 六字段 + 6 场景 + 与 Living Spec 1:1 映射 + OQ（blocking 全 resolved / 3 项 deferred）+ DoR（BLOCKER 0） |
| deep-dive | [`deep-dive.md`](../../../requirement-workspace/deep-dive.md)「REQ-014 增补」 | ① 数据契约 / ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 + 探针 |
| 影响面 | [`impact-brief.md`](../../../requirement-workspace/impact-brief.md) §16 | as-is→delta（全无）、blast radius、artifact impact、风险、拆分边界 |
| 故事 | [`stories.md`](../../../requirement-workspace/stories.md)「Story list — REQ-014」 | S17（P1 / 迭代 3 / 2 点 / 发布行程页），Status = Verified |
| 登记与交接 | [`registry.md`](../../../requirement-workspace/registry.md)、[`handoff.md`](../../../requirement-workspace/handoff.md) | REQ-014 行、编号说明、REQ → 已归档 change 映射、共享分析覆盖范围 |
| 提案 / Delta | **无** | 用户裁决 D1：不新建 `openspec/changes/`、不写 `proposal.md` / Delta Spec / `design.md` / `tasks.md`；不触发工件评审门禁 |
| P1 质量报告 | [`docs/ai4se-plugins/20261116-163253-quality-checklist-report.md`](../../ai4se-plugins/20261116-163253-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped；Overall Pass |

## 3. 关键决策

- **D1 范围口径（用户）：** 按「已验证交付」收口。理由：S17 的四条 AC 全部由 REQ-004 交付，入口、预填、必填重填与「无归属」均可从 Living Spec、代码与 E2E 直接取证；再建 change 会产生无行为变更的 Delta 并与已归档能力重复。
- **D2 记录人（用户）：** Jacky（AO）记录 P1 工件与签署。
- **D3 编号（用户）：** **REQ-014**，接在 REQ-012 之后；不与 REQ-004 合并、不重命名 `add-trip-experiences`。
- **措辞映射（以 Living Spec 为准）：** 故事「已结束行程或体验**详情**」按「已结束行程详情 + **体验卡**」验收（无独立体验详情页）；故事「集合地点**必须**重新填写」按「**不得沿用**原行程取值」验收（`trip-plans` 明确集合区域选填）。
- **不改：** 代码、`openapi.yaml`、数据库迁移、测试、Living Spec、设计系统；参考发布保持纯前端预填，`TripCreateRequest` 无来源字段。
- **不产生：** `proposal.md`、Delta Spec、`design.md`、`tasks.md`，因此无 `docs/reviews/` 工件评审报告；P1-4 由故事清单 + 已归档 change 的 Living Spec 满足。

## 4. 已验证交付证据

| AC | 证据 | 结论 |
|---|---|---|
| 已结束行程 / 体验侧入口 | `TripDetailPage.tsx:409-421`；`ExperienceCard.tsx:53-55` | 已有 |
| 预填目的地 / 路线 / 兴趣 | `TripCreatePage.tsx:56-62`；E2E `experiences.spec.ts:93-97` | 已有 |
| 日期 / 人数 / 集合地点重填 | `tripForm.ts:23-35`（`emptyTripForm`）；`TripCreatePage.tsx:61`（`capacity: ''`）；`tripForm.ts:70-72`（2–12 校验）；E2E `:91-92,99-100` | 已有 |
| 新计划无归属 | `types.ts:131-143`、`openapi.yaml:1774+`（`TripCreateRequest` 无来源字段）；`tripForm.ts:88-99`；`route.test.ts:25-28` | 已有 |
| Living Spec | `openspec/specs/trip-experiences/spec.md:133-148`（2 场景 1:1 映射 REQ-014 #3 / #4） | 已有 |

## 5. 质量检查（P1 DoV）

| id | Required | 结论 | 证据 |
|---|---|---|---|
| P1-1 | yes | Pass | `requirement-workspace/` 工作区与 `intents/` / `requirements/` / `analysis/` 槽位已存在，本需求新增意图与 Ready 条目 |
| P1-2 | yes | Pass | `REQ-014-reference-publish.md` 六字段 + 6 场景；blocking OQ 0 未 resolved；DoR BLOCKER 0 |
| P1-3 | yes | Pass | `impact-brief.md` §16（应用架构粒度，含 as-is / delta / blast radius / 风险） |
| P1-4 | yes | Pass | 故事清单 S17 行 + 已归档 `add-trip-experiences` 的 Living Spec（无新建 change，P1-4 允许 proposal 与 / 或 story list） |
| P1-5 | no | Skipped | 未运行 `/sdd:explore`；现状核对已由代码与 Living Spec 完成 |
| P1-6 | no | Skipped | 非 agent 导向变更，未运行 `/sdd:agent-evalset` |

**Overall：Pass（required 4/4；optional 2 Skipped）。** 详见质量报告。

## 6. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jacky | P1 工件记录与「已验证交付」口径确认，承接后续 | 2026-11-16 |
| IO | 待确认 | 需求来源（原型 S17）与跨能力影响确认（`trip-experiences` 已交付、`trip-plans` 只读） | 待签署 |
| SA | 不适用 | 无 Delta Spec / 无能力变更，不触发 G1 | — |
| SM | 待确认 | P1 范围与排期确认（不新建 change、按已验证交付收口、2 点 / 迭代 3） | 待签署 |

**阶段结论：P1 Pass（required 4/4）；无 P2。** REQ-014 以 verified 状态登记，后续如要把集合区域改为必填或新增体验详情页，需另开需求与 change。

## 7. 提交与偏离记录

- **阶段提交：** 按 `docs/sdd/README.md` 使用 `docs(p1): REQ-014-reference-publish ...`。
- **范围偏离：** 无代码 / 契约 / 迁移 / 测试 diff；`status = verified` 表示能力早已交付，不是本轮实现。
- **措辞偏离：** 故事与 Living Spec 的两处粒度差异按 Living Spec 解释，未改故事原文，也未改 Living Spec。
- **未触碰：** 工作区中并行会话的 `refine-safety-report` rev2 改动与 `docs/prototype/stories.html` 改动不在本次提交范围内。