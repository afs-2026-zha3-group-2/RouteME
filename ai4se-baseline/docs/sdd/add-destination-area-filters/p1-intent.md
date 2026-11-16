# P1 意图记录 — add-destination-area-filters

- **Change：** `add-destination-area-filters`（REQ-007）｜ **阶段：** P1（Intent & proposal）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把"按目的地与日期缩小范围"的用户故事收敛为可判定的 REQ-007、影响面与 OpenSpec 提案。

## 2. 产出

| 工件 | 路径 | 摘要 |
|---|---|---|
| 意图捕获 | [`intents/REQ-007-destination-area-filters.md`](../../requirement-workspace/intents/REQ-007-destination-area-filters.md) | 原始故事/AC、远程基线核对、D1–D23 决策 |
| Ready 需求 | [`requirements/REQ-007-destination-area-filters.md`](../../requirement-workspace/requirements/REQ-007-destination-area-filters.md) | 六字段 + 17 场景 + OQ + DoR（BLOCKER 0） |
| 影响面 | [`impact-brief.md` §11](../../requirement-workspace/impact-brief.md) | as-is→delta、blast radius、风险、归档顺序 |
| 故事 | [`stories.md`](../../requirement-workspace/stories.md) REQ-007 段、[`stories/REQ-007-destination-area-filters.story.md`](../../requirement-workspace/stories/REQ-007-destination-area-filters.story.md) | S1–S4 |
| 提案 | [`proposal.md`](../../openspec/changes/add-destination-area-filters/proposal.md) | Why / What Changes / In-Out / 影响面 / 验收信号 |

## 3. 关键决策

- 目的地：全国省市级联 + 港澳台细分；6 位国标码权威；必须选到市；无自由输入。
- 名称/省名：后端派生标准名 + `province_name` 展示名；直辖市"北京市"；港澳台"香港 · 香港岛"。
- 范围：本 change 只做两个首页视图的筛选/数据底座/展示；发布页目的地字段归 `add-trip-publish` 目的地修订。
- 搜索：前后端/契约/测试全删；A 的场景由本 change 改写，refine 的搜索测试交 owner。
- 迁移/契约：V10；0.7.0；体验卡不显示日期。
- 编号：REQ-007（REQ-005/006 已被占用）。

## 4. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | Wanye | 需求来源与跨能力影响确认 | 2026-11-16 |
| SM | Lewis | P1 范围与排期确认 | 2026-11-16 |
| AO | Jay | 承接 P2–P4 | 2026-11-16 |

**阶段结论：Pass**
