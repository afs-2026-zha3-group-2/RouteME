# spec 评审报告（第 2 次） — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/specs/trip-experiences/spec.md`
- **change-id：** `refine-experience-share`
- **能力：** `trip-experiences`（MODIFIED 3 Requirement / 12 Scenario）
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（重评；规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:pii-scrubbing`）
- **重评原因：** P2 一致性检查 `L-01` 指出原 `## ADDED Requirements`「游后分享页说明体验去向与分享边界」与 Living Spec 既有「我的旅行分享入口与分享边界」重叠；Delta 已删除该 ADDED 块，改为第三条 MODIFIED，属语义变更，另出本报告（不覆盖 `docs/reviews/20261116-refine-experience-share-spec-review.md`）
- **评审输入：** 修订后的 Delta；第 1 次评审报告；`consistency-lint.md`；`dov-ac-review.md`；Living Spec `openspec/specs/trip-experiences/spec.md`（7 Requirement / 22 Scenario）

## 修订对照

| 项 | 第 1 次 | 第 2 次 |
|---|---|---|
| Delta 结构 | 1 ADDED + 2 MODIFIED | 3 MODIFIED |
| Requirement 数 | 3（含新增） | 3（全部替换既有） |
| Scenario 数 | 3 + 5 + 3 = 11 | 5 + 3 + 4 = 12 |
| Living Spec 覆盖 | 2 条 Requirement | 3 条 Requirement（含「我的旅行分享入口与分享边界」） |
| 既有场景名保留 | 8/8（被修改的 2 条） | 10/10（被修改的 3 条） |

## 评审结论

**Pass**

修订后 Delta 不再新增平行 Requirement；「分享页面提示隐私边界」场景在保留名称的前提下补了第二条边界（只写真实走过的部分），与 `@rule:pii-scrubbing` 一致；`openspec validate --strict` 通过，`deltaCount: 3` 均为 MODIFIED，既有场景名 10/10 保留。第 1 次评审的 S-01 / S-02 仍有效，留待 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| S-01 | SUGGESTION | `@rule:spec-first` | MODIFIED「我的旅行分享入口与分享边界」正文 | 正文把「我的旅行已完成分组入口」与「分享页概览 / 去向 / 边界」写在同一段，句子较长 | 保持语义；P3 `design.md` 拆成两个设计条目（列表入口 / 分享页说明），便于任务落点 | Delta 该 Requirement 正文 |
| S-02 | SUGGESTION | `@rule:web-testing` | 「分享页展示行程概览」 | 「390 / 768 / 1440 不横向溢出」仍为人工走查项 | P3 `atdd-design.md` 标为人工走查 + 截图证据；E2E 只断言 hero 文本存在 | 既有视觉走查先例 |
| S-03 | SUGGESTION | `@rule:sdd-artifacts` | 「行程未结束时拒绝分享」 | 「同时给出当前行程状态」未规定状态文案来源 | P3 固定为 `statusLabel()` 单一来源（含 `ongoing` → 旅行中） | `frontend/src/trips/tripStatus.ts` |

## 校验证据

- `openspec validate refine-experience-share --strict` → `Change 'refine-experience-share' is valid`。
- `openspec show refine-experience-share --json --deltas-only` → `deltaCount: 3`，3 × `MODIFIED`，`spec=trip-experiences`。
- 场景清点：5 + 3 + 4 = 12；Living Spec 被修改 3 条 Requirement 的既有场景名 10/10 保留。

## 残余风险

- 「我的旅行分享入口与分享边界」是被扩充的既有 Requirement，归档说明必须写明「场景名保留、内容扩充」，否则 Living Spec 追溯像漏改。
- 3 条 Requirement 同批替换，归档需与同能力的未归档 change 串行。
- 若未来引入图片资源，「无图片也能发布并展示内置封面」需重写；当前明确不引入。

## 批准记录

- **批准人：** Wanye（SA）
- **批准时间：** 2026-11-16T16:35+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准修订后的 Delta」并授权进入 G1
- **批准范围：** 批准修订后的 Delta 并进入 G1 签署。