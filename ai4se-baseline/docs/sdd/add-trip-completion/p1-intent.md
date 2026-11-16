# P1 意图记录 — add-trip-completion

- **Change：** `add-trip-completion`（REQ-011 / S15）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16 ｜ **记录：** `/sdd:p1` 会话

## 1. 阶段目标

把「S15 结束行程」收敛为可判定的 REQ-011、影响面与 OpenSpec 提议（含双 delta 与故事 S15）。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-011-trip-completion.md`](../../requirement-workspace/intents/REQ-011-trip-completion.md) | 原始故事、10 条业务规则、12 条验收标准、现状差距与证据锚点 |
| Ready 需求 | [`requirements/REQ-011-trip-completion.md`](../../requirement-workspace/requirements/REQ-011-trip-completion.md) | 六字段 + 26 场景 + 7 条 blocking OQ（全 resolved）+ DoR（BLOCKER 0） |
| deep-dive | [`deep-dive.md`](../../requirement-workspace/deep-dive.md)「Deep-dive 增补 — REQ-011」 | 数据契约、边界归属、跨 REQ 一致性、展示契约 |
| 影响面 | [`impact-brief.md`](../../requirement-workspace/impact-brief.md)「Impact brief 增补 — REQ-011」 | as-is→delta、blast radius、artifact impact、风险、拆分与归档顺序 |
| 故事 | [`stories.md`](../../requirement-workspace/stories.md) REQ-011 段、[`stories/add-trip-completion.story.md`](../../requirement-workspace/stories/add-trip-completion.story.md) | S15（P0 / 迭代 3 / 1 点） |
| 提案 | [`proposal.md`](../../openspec/changes/add-trip-completion/proposal.md) | Why / What Changes / In-Out / D1–D9 / 影响面 / Effort |
| Delta Spec | [`specs/trip-plans/spec.md`](../../openspec/changes/add-trip-completion/specs/trip-plans/spec.md)、[`specs/trip-companions/spec.md`](../../openspec/changes/add-trip-completion/specs/trip-companions/spec.md) | `trip-plans` MODIFIED 4 + ADDED 2；`trip-companions` MODIFIED 3；`openspec validate --strict` valid |
| P1 质量报告 | [`docs/ai4se-plugins/20261116-145114-quality-checklist-report.md`](../../docs/ai4se-plugins/20261116-145114-quality-checklist-report.md) | P1-1 ~ P1-4 Pass；P1-5 / P1-6 Skipped；Overall Pass |

## 3. 关键决策

- **D1 结束时刻：** 结束日期次日 00:00；结束日期当天仍为旅行中。
- **D2 提醒窗口：** 结束日期 21:00 至次日 00:00（不足 3 小时）。
- **D3 提醒落点：** 我的旅行 + 行程详情；发布者与已接受同行者；无 push。
- **D4 结束入口：** 我的旅行-我发布的 ONGOING 卡片 + 行程详情；文案统一「结束行程」。
- **D5 结束后申请：** 待处理申请自动取消；接受与拒绝全部关闭。
- **D6 旅行中申请：** 仍可提交与接受；满员后状态仍为旅行中；满员后既有待处理申请可拒绝、不可接受。
- **D7 过去日期：** 禁止发布开始日期早于今天；等于今天时发布即旅行中。
- **D8 首页展示：** 旅行中继续出现在未结束列表并可申请；已结束（含自动完成）不出现。
- **D9 自动完成物化：** 规格只约束可观察结果；写入时机由 P3 设计决定。

## 4. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与跨能力影响确认 | 待签署 |
| SA | Jacky / Karena | 双 capability 例外与结束规则确认 | 待签署 |
| SM | Lewis | P1 范围与排期确认 | 待签署 |
| AO | Jay | 承接 P2–P4 | 待签署 |

**阶段结论：P1 DoV Pass（required 4/4；非 Gate 决策）。** 下一步 P2 `/sdd:delta-craft`，G1 由 IO / SA 评审；归档前需 SA 具名追认双 capability 例外。
