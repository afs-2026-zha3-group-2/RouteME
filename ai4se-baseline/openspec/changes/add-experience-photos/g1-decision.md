# G1 decision — add-experience-photos

- **Gate：** G1（Align）
- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3，REQ-018 / S16 增强项）
- **Timestamp：** 2026-11-17
- **Recorded by：** Jay（AO），按用户在 2026-11-17 会话中给出的签署人（IO=WAYNE、SA=Jacky）与决策结论（Pass + 条件 C1）记录

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Proposal | [`proposal.md`](proposal.md) | Why / What Changes / In-Out scope / 影响面（self / upstream / downstream）/ 决策 D1–D8 / 验收信号 9 条 / 残余风险齐全 |
| Delta Spec — `trip-experiences` | [`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md) | ADDED 2 + MODIFIED 3；23 Scenario；`openspec validate --strict` valid；`deltaCount: 5` |
| Living Spec baseline | `openspec/specs/trip-experiences/spec.md`（7 Requirement / 22 Scenario） | 被修改的 3 条 Requirement 既有场景名 11/11 保留 |
| AC / DoV review | [`dov-ac-review.md`](dov-ac-review.md) | AC 4/4 Pass；DoV 5/5 Pass；REQ-018 §4 映射 9/9；无 BLOCKER |
| Consistency lint | [`consistency-lint.md`](consistency-lint.md) | Partial；BLOCKER 0 / WARNING 1（L-01 Purpose 漂移）/ SUGGESTION 2 / N/A 4 |
| P2 spec review | [`20261117-add-experience-photos-spec-review-2.md`](../../docs/reviews/20261117-add-experience-photos-spec-review-2.md) | Pass；WAYNE 签署位随 G1 确认 |
| P1 reviews | `docs/reviews/20261117-add-experience-photos-{proposal,spec}-review.md` | 均 Pass，WAYNE + Jay 已签（2026-11-17） |
| Requirements | `requirement-workspace/requirements/REQ-018-experience-photos.md` | 9 场景；DoR BLOCKER 0；blocking OQ 0；D1–D8 resolved |
| Impact brief | `requirement-workspace/impact-brief.md` §18 | 单 change；无 blocker；归档顺序与排号风险已记 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-018 增补」 | ①–④ 全过、无 `{TBD}` |
| Prototype evidence | `docs/prototype/stories.html` S16 AC #4 / 削减顺序 | 图片上传为增强项；当前原型无上传位，P3 原型先行 |
| Implementation precedent | 头像上传 `openapi.yaml:215-257`、`application.yaml:24-27`、`.gitignore:45-46` | multipart / 魔数 / 服务端文件名 / 本地落盘 / 公开读取可复用 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-018 / proposal 一致：上传与校验、元数据与清理、详情展示、首页卡片不变；无行程发布 / 聊天 / 头像 / S17 / 对象存储 / 审核 | `proposal.md` 范围；`dov-ac-review.md` DoV-1 |
| Ambiguity | 无 blocking；D1–D8 全部 resolved；图像库、401 错误码、契约 / 迁移排号留 P3 | `dov-ac-review.md` §4；`consistency-lint.md` L-02 / L-03 |
| Conflict | 与 `refine-experience-share` / `refine-inspiration-home` / `add-destination-area-filters` 同改 `trip-experiences`，归档必须串行；契约 / 迁移号与 `add-ai-itinerary` 串行 | `proposal.md` 残余风险；`consistency-lint.md` §Residual risks |
| Traceability | REQ-018 §4 9/9；基线 11/11 场景名保留；proposal 验收信号 1–9 均有对应场景或测试层 | `dov-ac-review.md` §3 |
| Residual risk | Purpose 漂移（L-01 → 条件 C1）、EXIF 库许可证、无自动审核、E2E 共享目录 | `consistency-lint.md` §Residual risks |

## Decision

**Pass（with condition C1）**

## Conditions + owners

| id | 条件 | Owner | 时机 |
|---|---|---|---|
| C1 | P5 归档时把 Living Spec `trip-experiences` 的 `Purpose` 从「体验为纯文字 + 内置封面」更新为「纯文字 + 可选图片 + 内置封面」，与 ADDED 2 条 Requirement 一致 | Jay（AO）+ WAYNE（SA） | P5 / G3 |

## Follow-ups（非条件项，不阻断 G1）

| 项 | 来源 | Owner | 处理时机 |
|---|---|---|---|
| EXIF 图像处理库选型、许可证与解析失败降级（400 `INVALID_INPUT`，不落盘） | DoV R-01 / proposal P-01 | Jay（AO） | P3 `design.md` |
| 401 错误码按现有枚举固定（`DEMO_USER_REQUIRED` / `SESSION_INVALID`） | lint L-02 | Jay（AO） | P3 `design.md` + `openapi.yaml` |
| 契约版本与迁移号与 `add-ai-itinerary`（0.12.0 + V18）统一排号 | lint L-03 | Jay（AO） | P3 `design.md` |
| 24h 懒清理的时钟注入 / 可配置阈值 | DoV R-02 | Jay（AO） | P3 `atdd-design.md` |
| 不做图片内容审核，沿用举报入口 | DoV R-03 / D8 | BA / SA | 产品残余风险 |
| 归档顺序：`refine-experience-share` → 本 change；同改 `trip-experiences` 串行 | proposal 残余风险 | Jay（AO）+ WAYNE（SA） | P5 |
| 上传 E2E 的隔离产物目录与独立 SQLite | proposal 残余风险 | Jay（AO） | P4 |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| IO | WAYNE | 需求来源与跨能力影响：S16 增强项；`trip-experiences` ADDED 2 + MODIFIED 3；`trip-plans` / `user-profile` 只读不变 | 2026-11-17 |
| SA | Jacky | 规格与验收口径：两步上传、≤6 张 / ≤5MB / 三格式、403 / 400 / 401、EXIF 全量剥离、>24h 懒清理、详情展示、首页卡片不变 | 2026-11-17 |
| AO（当前开发） | Jay | 承接 P3–P4 实现与验证；C1 与 follow-ups 按上表收口 | 2026-11-17 |

签署来源：用户在 2026-11-17 会话中确认 **IO=WAYNE、SA=Jacky、Decision = Pass + 条件 C1**；当前开发者（AO）为 Jay。

## Next

- Decision = Pass（with C1）→ P3：`/sdd:atdd-design` → `/sdd:task-plan`；原型先行（`docs/prototype/`）。
- 契约 / 迁移号、EXIF 库、401 错误码在 P3 `design.md` 收口。
- P5 归档排在 `refine-experience-share` 之后；G3 检查 C1。
