# G1 决策 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`（`trip-recommendations` ADDED）
- **Gate：** G1（Proposal → Delta Spec）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **输入：** `proposal.md`、`specs/trip-recommendations/spec.md`、`dov-ac-review.md`、`consistency-lint.md`

## 1. 准入条件核对

| # | 条件 | 证据 | 结论 |
|---|---|---|---|
| C-1 | 单 capability，Delta 为 ADDED | `specs/trip-recommendations/spec.md`；7 Requirement / 19 Scenario | Pass |
| C-2 | AC 全覆盖 | `dov-ac-review.md` AC 16/16 | Pass |
| C-3 | DoV 5/5 | `dov-ac-review.md` §2 | Pass |
| C-4 | 既有能力零改写 | Delta 无 MODIFIED / REMOVED；`trip-companions` 保持原样 | Pass |
| C-5 | 阈值单点 | 50 / 30 / 20 / 10 / 上限只在一个 Requirement | Pass |
| C-6 | 接口路径与响应形状明确 | `GET /api/trips/{tripId}/recommendations`，`reference` + `items[]` | Pass |
| C-7 | 去重与排序规则可判定 | 「同一用户只推荐一条」+「推荐排序」 | Pass |
| C-8 | 契约与迁移声明 | 0.19.0；无迁移 | Pass |
| C-9 | 前端边界明确 | 「详情页推荐视图」禁止自算分值 | Pass |
| C-10 | `openspec validate --strict` | valid | Pass |

## 2. 决策

**G1：Pass（无条件）。**

理由：范围单一、验收可判定、规则单点、无迁移、与既有匹配能力解耦。

## 3. 带入 P3 的跟踪项

| id | 跟踪项 | 责任 |
|---|---|---|
| T-1 | 分项 `breakdown` 与 `reasons` 由同一份纯函数产出，避免两套文案 | P3 设计 |
| T-2 | 前端区块与既有「为什么推荐给你」块使用不同标题与说明 | P3 UI |
| T-3 | E2E 用 `page.route` 注入推荐响应，不依赖种子数据漂移 | P3 ATDD |
| T-4 | OpenApiTest 三处版本断言同步到 0.19.0 | P4 |

## 4. 签署

| 角色 | 姓名 | 结论 | 时间 |
|---|---|---|---|
| IO | WAYNE | Pass | 2026-11-17 |
| SA | Jacky | Pass | 2026-11-17 |
| AO | Jay（记录人） | Pass | 2026-11-17 |