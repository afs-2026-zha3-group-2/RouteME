# G1 decision — add-match-reason

- **Gate：** G1（Align）
- **Change：** `add-match-reason`（capability `trip-companions` MODIFIED，REQ-003 / S07）
- **Timestamp：** 2026-11-16T11:15+0800
- **Recorded by：** Jay（AO / current developer）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 问题、In/Out scope、影响面、四项裁定齐全 |
| Delta Spec | [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md) | 1 Requirement（MODIFIED）/ 9 Scenario |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 4 Pass + 1 Partial（无阻塞） |
| P1 阶段记录 | [`docs/sdd/add-match-reason/p1-intent.md`](../../../docs/sdd/add-match-reason/p1-intent.md) | 四项裁定 |
| Contract | `openapi.yaml` `Match` / `MatchCandidate` | `score`、`percentage` 0–100；`reasons` 非空数组；`basis` 说明参照 |
| 既有实现 | `TripMatch`、`MatchServiceImpl` | 权重与降级文案已存在，缺可判定口径与卡片标签 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 只收口 S07；推荐算法、多语言、排序实现均排除 | `proposal.md` §范围 |
| Ambiguity | `percentage` 与 `score` 同值、参照物优先级、原因非空、卡片必须带标签，均已裁定 | `p1-intent.md` §5 |
| Conflict | 故事「必须写出命中维度」与卡片只显示裸数字的现状冲突 | `dov-ac-review.md` AC-3 / 残余风险 |
| Traceability | 每条 Scenario 可映射回 issue #9 的验收条目 | `dov-ac-review.md` §需求 → 场景映射 |
| Residual risk | 降级路径未触发、参照物单值、卡片文本长度 | `dov-ac-review.md` §残余风险 |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞项：

| 项 | Owner | 处理时机 |
|---|---|---|
| 卡片补「匹配度」与「匹配理由」标签 | AO（Jay） | P3 / P4 |
| 端到端补排序、跨身份差异、详情页原因断言 | AO（Jay） | P3 / P4 |
| 参照物多值选择策略 | AO（Jay） | 后续优化 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：[`docs/sdd/add-match-reason/p2-spec.md`](../../../docs/sdd/add-match-reason/p2-spec.md) §签署表；角色名册见 [`docs/sdd/README.md`](../../../docs/sdd/README.md)。

## Next

- Decision = Pass → P3（设计、ATDD、任务拆分）。

## G1 重评 R2（筛选不参与匹配分，2026-11-16）

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 只改匹配计算入口、契约描述与测试；前端不动 | `docs/sdd/add-match-reason/p1-intent.md` §10 |
| Contract | `Match.basis` 描述去掉「与当前筛选」，版本 0.8.0 → 0.8.1 | `openapi.yaml` |
| Conflict | 旧实现让筛选覆盖参照物，与 REQ-007「匹配规则不变」冲突；本次回到个人参照 | P0 §6 复现 |
| Traceability | 新增 2 个 Scenario，删除「筛选作为兴趣参照」的表述 | Delta Spec |

**重评结论：Pass**。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| SA | Jacky、Karena | 接受 R2-1…R2-3 与契约描述修订 | 2026-11-16 |
| AO | Jay | 承担实现与验证 | 2026-11-16 |
| SM | Lewis | 准入 P3 | 2026-11-16 |