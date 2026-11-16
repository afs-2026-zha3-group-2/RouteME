# 变更提案：add-match-reason

- **需求：** REQ-003（`requirement-workspace/requirements/REQ-003-trip-companions.md`）｜ **故事：** S07「匹配原因提示」（P0，迭代 2，2 点）
- **能力：** `trip-companions`（MODIFIED）｜ **规模：** S（把打分口径与可读原因写成可判定场景，不改数据模型）
- **原型：** `docs/prototype/prototype.html#/discover`、`stories.html` S07

## 问题

匹配打分与原因文案已经存在（`TripMatch`、`GET /api/matches`、`GET /api/matches/{tripId}`），卡片显示百分比环与原因文本，详情页有匹配面板。但 S07 的验收还没有被规格逐条钉住，存在三个无法判定的点：

1. 打分权重（目的地 50 / 同日 30 / 差一天 20 / 共同兴趣每项 10 且合计 ≤ 20）只写在代码注释里，规格没有写。
2. 「必须写出命中的维度，不能只给一个百分比数字」没有对应场景；原因文案为空或退化为纯数字时无法判定失败。
3. 「没有重合时」与「没有参照物时」两条降级路径的文案边界没有定义。

本提案把 S07 的验收转成可判定场景，作为后续实现与回归的依据。

## 范围

**In scope**

- 增量规格：把 `trip-companions` 的「展示可解释的匹配原因」细化为权重、命中维度、降级文案与展示位置四条可判定口径。
- 契约：核对 `Match` schema 已含 `score` / `percentage` / `reasons` / `basis`，`reasons` 为逐维度文本且不得为空。
- 后端：`TripMatch` 的权重与上限、无重合与无参照物两种降级文案。
- 前端：列表卡片与详情页都展示原因文本；百分比不能作为唯一表达。
- 测试：为每个权重分支、共同兴趣上限、两种降级路径补断言。

**Out of scope**

- 按匹配度排序的排序实现（已由 `add-paged-lists-mybatis-plus` 落地，本 change 只登记断言）。
- 基于机器学习的推荐、画像、向量召回。
- 匹配原因的多语言与文案个性化。
- 匹配原因影响申请排序或申请处理。

## 影响面

| 位置 | 改动 |
|---|---|
| `openspec/specs/trip-companions/spec.md` | 归档时以本 change 的增量规格覆盖「展示可解释的匹配原因」 |
| `RouteME/backend/.../pojo/TripMatch.java` | 权重、上限与降级文案（仅在有缺口时改动） |
| `RouteME/backend/.../service/impl/MatchServiceImpl.java` | 参照物选取与理由组装 |
| `RouteME/frontend/src/trips/TripCard.tsx`、`TripDetailPage.tsx` | 原因文本与百分比的并列展示 |
| `openapi.yaml` | `Match` schema 已具备，核对 `reasons` 的说明与必填 |

## 需求与证据

- 故事来源：GitHub issue #9 `[P0] S07 匹配原因提示`。
- 原型证据：`docs/prototype/stories.html` S07；`store.js` 的 `matchScore`。
- 既有实现：`add-trip-companions`（匹配能力）、`add-paged-lists-mybatis-plus`（按匹配度排序与分页）。
- 裁定：百分比为派生值，`score` 上限 100；无重合时必须给出「暂无重合」类可读文案，不能返回空 `reasons`。

## Spec ID

`add-match-reason`，业务增量规格见 `specs/trip-companions/spec.md`。