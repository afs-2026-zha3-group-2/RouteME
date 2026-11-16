# P1 意图记录 — refine-trip-map

- **Change：** `refine-trip-map`（REQ-016 / 用户验收反馈 2026-11-16 + 导航风参考图）｜ **阶段：** P1（Intent → proposal）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把「地图不可用 / 太丑 / 点击无反馈 / 集合区域不能多个」的验收反馈收敛为可判定提案：能力归属 `trip-plans`（MODIFIED 4 + ADDED 1），方案 1 离线 SVG 与 `meeting_areas` 替换口径由发起人裁决。

## 2. 意图 → 故事映射

| 反馈 | 承接 | 落点 |
|---|---|---|
| 点击地点没有显示出地图 | ADDED 行程详情路线地图 | S05 详情展示位 |
| 地图劣质、无放大缩小全屏 | MODIFIED 发布表单的默认值与地图上下文 | S06 发布表单 |
| 点击没有效果 | MODIFIED 地图上下文「点击总有可见反馈」 | S06 |
| 途径点无法添加多个 | MODIFIED 地图上下文「连加与上限反馈」+ E2E | S06 |
| 集合区域无法添加多个 | MODIFIED 发布 / 详情 / 维护 + 契约 0.11.0 + V17 | S06 / S09 集合编辑 / S12 聊天展示 |

## 3. 产出

- `openspec/changes/refine-trip-map/proposal.md`（WAYNE 签 2026-11-16）
- P1 Delta 草稿 `specs/trip-plans/spec.md`（5 Requirement / 46 Scenario；P2 逐条复核）
- `docs/reviews/20261116-refine-trip-map-proposal-review.md`（Pass；WAYNE + Jay 签 2026-11-16）
- `requirement-workspace/registry.md` REQ-016 登记

## 4. 关键裁决（发起人 2026-11-16）

1. 沿用方案 1 离线 SVG，不引在线瓦片 / key。
2. `meeting_areas` 数组替换 `meeting_area`（≤3 / ≤100 / trim 去重；响应归一为数组）。
3. Jay 开发，按名册签；S06 / S07 与本 change 均暂不归档。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 承担 P2–P4 实现与阶段记录 | 2026-11-16 |
| IO | WAYNE | proposal 签署（需求来源与跨能力影响） | 2026-11-16 |
| SM | 待签署 | P1 范围与排期 | 待签署 |

**阶段结论：Pass。** 下一步 P2：AC/DoV 复核 → 一致性检查 → G1（条件 C1 归档顺序）。

## 6. 提交与偏离记录

- **阶段提交：** `docs(p1): refine-trip-map add proposal and delta draft`；push 前 `git pull --rebase origin main`。
- **偏离：** P0 记录契约版本初稿误写 0.8.0→0.9.0，核实为 0.10.0→0.11.0，已在本阶段提交一并修正。
- **validate：** `openspec validate refine-trip-map --strict` valid；归档模拟 INFO（MODIFIED 目标在未归档增量）登记为 G1 条件 C1。

## 7. R2 轮（2026-11-16 第二轮验收）

- **触发：** 发起人提示词＋六联参考图：三级地图架构（ChinaMap/ProvinceMap/CityTravelMap）＋六 Layer＋路线生成＋同行者面板＋全国数据驱动（10 城 MVP、广州主 Demo、fallback）＋面包屑＋指定配色；沿用本 change、不新增 changes。
- **产出：** proposal.md §R2 增补（WAYNE 签 2026-11-16）；`docs/reviews/20261116-refine-trip-map-proposal-review-2.md`（Pass，4 advisory；WAYNE + Jay 签 2026-11-16）；`p0-baseline-r2.md`（G2-01–G2-10）。
- **裁决沿用：** Jay 开发按名册签；不归档；每阶段一提交；push 前 pull --rebase；「清理已完成分支功能」＝退役旧 PlaceMap（本地无其它待删分支）。
- **阶段结论：Pass。** 下一步 P2-R2：Delta 增补（MODIFIED 2 + ADDED 4）→ G1-r2。