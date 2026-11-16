# P1 意图与提案记录 — add-match-reason

- **Change：** `add-match-reason`｜ **能力：** `trip-companions`（MODIFIED）｜ **故事：** S07 匹配原因提示
- **阶段：** P1（Intent & proposal）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

把「为什么推荐这条计划」收敛为可判定的提案：打分口径、原因文案、降级路径与展示位置。

## 2. 需求与故事

| 项 | 来源 | 结论 |
|---|---|---|
| 需求 | `requirement-workspace/requirements/REQ-003-trip-companions.md`（§ 匹配） | 本 change 只承载 S07 的匹配原因 |
| 故事 | issue #9 `[P0] S07 匹配原因提示`（迭代 2，2 点） | 落点：列表卡片 + 详情页 |
| 原型 | `docs/prototype/stories.html` S07；`store.js#matchScore` | 权重与示例文案以原型为准 |
| 上游 | S01 身份兴趣、S03 列表、S05 详情 | 已落地 |
| 下游 | S08 申请（申请页也展示匹配） | 复用同一 `Match` 结构，不需要新字段 |

## 3. 范围

**In scope**

- 增量规格：权重（50 / 30 / 20 / 每项 10 且 ≤ 20）、命中维度必须写明、无重合与无参照的降级文案、列表与详情双展示、默认按匹配度排序。
- 后端：`TripMatch` 权重与上限、降级文案；`MatchService` 参照物选取。
- 前端：卡片展示「匹配度 N%」与「匹配理由 …」；详情页原因列表 + 百分比 + 参照来源。
- 测试：权重逐分支断言、降级文案断言、端到端原因展示与排序。

**Out of scope**

- 基于机器学习的推荐、画像、向量召回。
- 匹配原因的多语言与个性化文案。
- 排序实现本身（已由 `add-paged-lists-mybatis-plus` 落地）。
- 匹配影响申请排序或处理顺序。

## 4. 影响面

| 位置 | 影响 |
|---|---|
| `openapi.yaml` | `Match` schema 已含 `score` / `percentage` / `reasons` / `basis`；无字段变化，版本保持 `0.6.0` |
| 后端 | `TripMatch`（纯计算）、`MatchServiceImpl`（参照物选取） |
| 前端 | `TripCard`、`TripDetailPage`、`styles.css` |
| 端到端 | `e2e/tests/companions.spec.ts` 匹配原因用例 |
| 数据库 | 无迁移 |

## 5. 关键裁定（提案阶段）

| 裁定 | 内容 | 理由 |
|---|---|---|
| 分值关系 | `percentage` 与 `score` 同值（0–100） | 权重总和上界就是 100，二次归一没有收益 |
| 原因非空 | `reasons` 至少一条；无重合时给「暂无重合，可作为新方向的灵感」 | 故事要求「不能只给一个百分比数字」 |
| 参照物 | 优先最近一条**未结束**的已发布行程；没有则以兴趣 + 当前筛选为参照，并在 `basis` 说明 | 与既有实现一致，且能解释给用户 |
| 卡片文案 | 必须出现「匹配度 N%」与「匹配理由」两段文字，环形图只作装饰 | 裸数字无法自解释 |

## 6. 阶段产出

| 工件 | 路径 |
|---|---|
| 提案 | [`openspec/changes/add-match-reason/proposal.md`](../../../openspec/changes/add-match-reason/proposal.md) |
| 阶段记录 | [`p1-intent.md`](p1-intent.md) |

## 7. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-match-reason baseline stage and sign-off |
| P1 | 本条提交 |

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| SM | Lewis | 范围与迭代归属：只做 S07，不做推荐系统 | 2026-11-16 |
| IO | Wanye | 需求来源 REQ-003 与 issue #9 一致 | 2026-11-16 |
| SA | Jacky、Karena | 接受四项裁定，同意进入 P2 | 2026-11-16 |
| AO | Jay | 影响面与工作量判断（S）；承担实现与验证 | 2026-11-16 |

**阶段结论：Pass**

## 9. 准入 P2 的条件

- Delta Spec 覆盖九条场景，含权重与降级路径。
- AC / DoV 复核无 BLOCKER；G1 由 SA 签署。