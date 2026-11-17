# P2 Delta 与 G1 前置记录 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3）｜ **需求：** REQ-018（S16 图片上传增强）｜ **阶段：** P2（Delta 收敛 → AC / DoV → Consistency lint → G1）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **基线：** `main@c57a70f`（Living Spec `trip-experiences` 7 Requirement / 22 Scenario）

## 1. Delta 收敛（P2）

按 P1 spec 评审意见完成：

| 项 | P1 | P2 | 依据 |
|---|---|---|---|
| ADDED Requirement | 1 条（上传 / 保存 / 生命周期） | **2 条**：「上传与校验」+「元数据与清理」 | spec 评审 S-01 |
| 错误码 | 「403 或 400」 | 越权 = 403 `FORBIDDEN`；不存在 / 已占用 = 400 `INVALID_INPUT` | spec 评审 S-02 |
| 场景补齐 | 缺「分享页预览与移除」「未登录上传」 | 已补 2 个场景 | REQ-018 §4 #5 / #6 |
| 场景总数 | 20 | **23**（ADDED 7 + 2；MODIFIED 3 + 5 + 6） | — |
| 基线场景保留 | 11 | 11/11 | Living Spec |

工具证据：`openspec validate add-experience-photos --strict` → `valid`；`--deltas-only` → `deltaCount: 5`（ADDED 2 + MODIFIED 3）。

## 2. AC / DoV 复核

[`dov-ac-review.md`](../../openspec/changes/add-experience-photos/dov-ac-review.md)：**Pass** — AC 4/4、DoV 5/5；BLOCKER 0；WARNING 1（EXIF 图像库，P3）、SUGGESTION 3（时钟注入 / 审核 / 排号）。REQ-018 §4 9/9 场景映射。

## 3. Consistency lint

[`consistency-lint.md`](../../openspec/changes/add-experience-photos/consistency-lint.md)：**Partial** — BLOCKER 0 / WARNING 1 / SUGGESTION 2 / N/A 4。

- **L-01（WARNING，p5）**：Living Spec `Purpose` 仍写「纯文字 + 内置封面」；归档时需改为「纯文字 + 可选图片 + 内置封面」。建议 G1 以条件 C1 承接。
- L-02（SUGGESTION，p3）：401 错误码在 P3 按现有枚举固定。
- L-03（SUGGESTION，p3）：契约 / 迁移号与 `add-ai-itinerary`（0.12.0 + V18）统一排号。

## 4. 工件评审

[`20261117-add-experience-photos-spec-review-2.md`](../../docs/reviews/20261117-add-experience-photos-spec-review-2.md)：**Pass**（P2 修订重评）；WAYNE 签署位待确认。P1 的 proposal / Delta 评审已签。

## 5. G1 输入摘要

| 维度 | 结论 | 证据 |
|---|---|---|
| Scope | 与 REQ-018 / proposal 一致：上传、校验、归属、EXIF、懒清理、详情展示、首页卡片不变；无行程发布 / 聊天 / 头像 / S17 | `proposal.md` 范围；`dov-ac-review.md` DoV-1 |
| Traceability | REQ-018 §4 9/9；基线 11/11 场景名保留 | `dov-ac-review.md` §3 |
| Ambiguity | 无 blocking；D1–D8 全部 resolved；P-01 / L-02 / L-03 留 P3 | `dov-ac-review.md` §4 |
| Conflict | 与 `refine-experience-share` 等未归档 change 同改 `trip-experiences`，归档串行；契约 / 迁移号与 `add-ai-itinerary` 串行 | `proposal.md` 残余风险 |
| Residual risk | Purpose 漂移（L-01）、图像库许可证、无自动审核、E2E 共享目录 | `consistency-lint.md` §Residual risks |

## 6. G1 状态

**Pass（with condition C1）**（2026-11-17）— IO=WAYNE、SA=Jacky、AO=Jay；记录见 [`g1-decision.md`](../../openspec/changes/add-experience-photos/g1-decision.md)。

| 条件 | Owner | 时机 |
|---|---|---|
| C1：P5 归档时更新 Living Spec `Purpose` 为「纯文字 + 可选图片 + 内置封面」 | Jay（AO）+ WAYNE（SA） | P5 / G3 |

Follow-ups（不阻断 G1）：EXIF 库与解析失败降级、401 错误码、契约 / 迁移排号、24h 时钟注入、无自动审核、归档串行、E2E 隔离目录 —— 见 `g1-decision.md`。

## 7. 下一步

- G1 签署后 → P3 `/sdd:atdd-design` → `/sdd:task-plan`（原型先行）。
- 契约 / 迁移号、EXIF 库、401 错误码在 P3 `design.md` 收口。
- P5 归档必须排在 `refine-experience-share` 之后；G3 时落实 C1。
