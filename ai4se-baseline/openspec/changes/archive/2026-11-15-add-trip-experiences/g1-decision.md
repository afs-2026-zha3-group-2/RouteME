# G1 decision — add-trip-experiences

- **Gate:** G1（Align）
- **Change:** `add-trip-experiences`（capability `trip-experiences`，REQ-004）
- **Timestamp:** 2026-11-15T17:48+0800
- **Recorded by:** Jay（AO / current developer）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | 已按原型重写 In/Out scope 与 9 条对齐决议 |
| Delta Spec | [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | 6 Requirement / 14 Scenario；`openspec validate --strict` valid |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 5/5 Pass；DoV 4 Pass + 1 Partial（无阻塞） |
| Prototype evidence | `docs/prototype/stories.html` S15–S17、`store.js`、`ui.js`、`data.js` | 冲突裁决基线 |
| Upstream | `REQ-004`、`impact-brief.md`、`deep-dive.md` | 依赖 REQ-002/003（均已归档） |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-004 一致；图片上传、评论、审核后台、推荐算法已排除 | `proposal.md` §范围 |
| Ambiguity | 资格（含发布者）、每人一条可修改、内容长度、强度档位、首页筛选与倒序、参考发布预填范围均已落为 Scenario | `spec.md`、`dov-ac-review.md` |
| Conflict | 原型与需求的 9 处差异已收口；参考发布人数按需求必须重填（原型记为待修） | `proposal.md#原型对齐决议` |
| Traceability | 每条 Requirement 可追溯到 REQ-004 §4 与闭环文档 §2.6–2.7 / §5.2.1–5.2.2 | `dov-ac-review.md` |
| Residual risk | 无图片上传、无内容审核、原型待修、体验排序以最新保存时间 | `dov-ac-review.md#残余风险` |

## Decision

**Pass**

## Conditions + owners

无阻塞条件。非阻塞项：

| 项 | Owner | 处理时机 |
|---|---|---|
| 参考发布清空人数/日期/标题/集合/说明 | Jay | 设计阶段写入 design |
| 每人每行程一条体验（upsert） | Jay | 设计阶段 |
| 内置封面与强度色板 | Jay | 设计阶段 |
| 原型 `draftFromSource` 复制人数 | Jay | 后续同步修原型 |
| 内容审核 / 举报体验 | Jay | 后续增强，不在本 change |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | WAYNE |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：用户于 2026-11-15 提供角色名单并确认继续推进 P2。