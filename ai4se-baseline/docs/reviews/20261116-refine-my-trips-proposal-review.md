# proposal 评审报告 — refine-my-trips

- **工件：** `openspec/changes/refine-my-trips/proposal.md`
- **change-id：** `refine-my-trips`
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`）
- **评审输入：** `proposal.md`；Delta 草稿 `specs/trip-companions/spec.md`；`requirement-workspace/requirements/REQ-015-my-trips.md`；Living Spec `openspec/specs/trip-companions/spec.md`；`openspec/specs/design-system/spec.md`；原型 `docs/prototype/ui.js` `mine()`；`MyTripsPage.tsx` / `MyTripsServiceImpl.java`

## 评审结论

**Pass**（0 BLOCKER / 0 WARNING / 3 SUGGESTION）

`## Why` / `## What Changes` 与问题、范围、影响面、决策、验收信号自洽；能力归属单一（`trip-companions` MODIFIED，1 Requirement / 11 Scenario），与 `design-system` 的「我的旅行列表对齐」不冲突；未越界定义后端状态机或迁移。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| P-01 | SUGGESTION | `@rule:api-contract` | 影响面「`MyTripsResponse.java`」行 | 只写新增 `pending_applications`，未写明 `required` 不变与版本递增 | P2 的 `dov-ac-review.md` 补一条兼容性检查，`openapi.yaml` 递增次版本并在 `OpenApiTest` 断言 `required` 仍为原 5 项 | `openapi.yaml` `MyTrips` |
| P-02 | SUGGESTION | `@rule:web-testing` | 「残余风险」分段控件行 | 只说会破坏既有 E2E，未点出具体文件与用例 | P4 提交说明与 `atdd-design.md` 指向 `companions.spec.ts`「applies inline…」与 `experiences.spec.ts`「marks completed trips as shared…」 | `e2e/tests/companions.spec.ts:145`、`experiences.spec.ts:201` |
| P-03 | SUGGESTION | `@rule:sdd-artifacts` | 「归档顺序」 | 只写「晚于或同批于 `refine-experience-share`」，未写复核口径 | P5 归档前检查完成组体验入口文案与 `.mine-row` 锚点两处不冲突 | `refine-experience-share/tasks.md` |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| proposal 六段 + `## Why` / `## What Changes` | 齐全；`openspec show --deltas-only` → `deltaCount: 1`、`spec=trip-companions`、`operation=MODIFIED` |
| 能力与操作类型 | 单 capability MODIFIED，与 REQ-015 的 Discovery Decision 一致 |
| 是否越界定义后端 / 迁移 | 否：只增只读字段，无表结构、无状态机 |
| 是否与 Living Spec 冲突 | 否：保留 4 条基线场景名（分区展示我的旅行 / 待处理申请提醒 / 安全提示常驻 / 提交举报并收到回执），内容扩充 |
| 是否覆盖故事 3 条 AC | 是：AC1→四段与计数 + 分组内容；AC2→提醒定位 + 无待处理；AC3→重新可见 + 页内动作同步 |
| 明确 out of scope | 是：编辑 / 删除 / 参考发布 / 分页 / 轮询 / 自绘控件 |

## 残余风险

- 与 `refine-experience-share` 并行改同一页面，完成组体验入口可能冲突；归档顺序已登记。
- `Segmented` 角色变化会让两处既有 E2E 变红，漏改即红。
- 「一屏看到」是视觉目标，需在 P4 用 1440 / 768 / 390 三档走查截图证明。

## 批准记录

- **批准人：** WAYNE（IO）
- **批准时间：** 2026-11-16T17:20+08:00
- **批准来源：** 发起人当次会话确认本次开发者 Jay（AO）、第二签署人 Neal（VL）；本工件按签署矩阵由 IO 签署
- **批准范围：** 提案范围与能力归属；进入 P2 Delta 收敛