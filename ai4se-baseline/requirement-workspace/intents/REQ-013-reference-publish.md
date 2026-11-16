# 意图捕获 — REQ-013 参考此行程发布（S17）

- **候选能力：** `trip-experiences`（只读引用，不新增能力）；消费 `trip-plans` 的发布页
- **来源：** 用户指令「作为被某条体验打动的浏览者，我希望直接复用它作为起点，以便快速形成自己的计划」；原型故事 `docs/prototype/stories.html` S17「参考此行程发布」（P1 / 迭代 3 / 2 点 / 落点页面：发布行程页）；2026-11-16 用户对 P1 范围口径与记录人的答复
- **捕获日期：** 2026-11-16
- **分支：** 主工作区 `main`，基线 `HEAD@78c782f`（P1 只写工件，无代码改动）
- **编号说明：** 当前最新已登记需求为 REQ-012（`refine-safety-report`），本需求顺延为 **REQ-013**。`add-trip-experiences`（REQ-004）已归档，覆盖「游后体验分享与参考此行程发布」，本需求不新建同名能力。

## 原始意图（一句话）

作为被某条体验打动的浏览者，我希望在已结束行程或体验卡上直接点「参考此行程发布」，让发布页预先带好目的地、路线与兴趣标签；日期、人数和集合地点由我自己重新填，提交后得到一条完全属于我的新计划。

## 为什么（价值假设）

`add-trip-experiences`（REQ-004，已归档 / verified）已经把这条链路做完：入口、预填、重填与独立落库都在 Living Spec 与 E2E 里有据可查。本需求验证的假设不是「要不要做」，而是「**S17 是否已经可作为已验证交付收口**」——即每一条 AC 都能在现行代码、Living Spec 与回归测试中找到对应证据，不需要新 change、不改契约、不改行为。

## 现状核对（2026-11-16，`main@78c782f`）

| 故事要求 | 证据 | 结论 |
|---|---|---|
| 已结束行程提供入口 | `RouteME/frontend/src/trips/TripDetailPage.tsx:416-420`：`isCompleted && <Button ... #/trips/new?from={trip.id}>` | 已有 |
| 体验侧提供入口 | `RouteME/frontend/src/experiences/ExperienceCard.tsx:53-55`：`<a href="#/trips/new?from={experience.trip.id}">参考此行程发布</a>` | 已有（落点是**体验卡**，非独立体验详情页） |
| 点击后打开发布页 | `RouteME/frontend/src/route.ts:21-25`：`/trips/new?from=<id>` → `{ name: 'create', fromTripId }` | 已有 |
| 预填目的地 | `RouteME/frontend/src/trips/TripCreatePage.tsx:56-62`：`destinationCode: source.destination_code` | 已有 |
| 预填路线描述 | 同上：`stops: source.stops.slice(0, MAX_STOPS)`；表单字段 `fieldStops` =「途经点（地图点选或搜索，至少两个）」 | 已有（故事的「路线描述」映射为**途经点**） |
| 预填兴趣标签 | 同上：`tags: source.tags.slice(0, MAX_TAGS)` | 已有 |
| 日期必须重填 | `RouteME/frontend/src/trips/TripCreatePage.tsx:36-38`：有 `fromTripId` 时以 `emptyTripForm` 初始化，不走 `initialTripForm` 的「今天」默认值；`tripForm.ts:23-35` 的 `startDate` / `endDate` 为空 | 已有 |
| 人数必须重填 | `TripCreatePage.tsx:57-62` 显式 `capacity: ''`；`validateTripForm` 校验 2–12（`tripForm.ts:70-72`） | 已有 |
| 集合地点必须重填 | `emptyTripForm.meetingArea: ''`；参考发布不写入 `meetingArea` | 已有（但 `trip-plans` 将集合区域定义为**选填**） |
| 提交后生成独立新计划 | `TripCreateRequest`（`frontend/src/types.ts:131-143`、`openapi.yaml:1774+`）只含标题/目的地/日期/途经点/人数/可选字段，**无 source / origin / parent 字段**；`toCreateRequest`（`tripForm.ts:88-99`）不携带来源 | 已有（无归属关系） |
| 端到端回归 | `RouteME/e2e/tests/experiences.spec.ts:63`（体验视图可见入口）、`:88-100`（点击 → 发布页 → 人数/标题为空、途经点与「摄影」标签已带入、未补齐必填不能提交） | 已有 |
| 路由回归 | `RouteME/frontend/src/route.test.ts:25-28`「keeps the reference source when creating from a trip」 | 已有 |
| Living Spec | `openspec/specs/trip-experiences/spec.md:133-148`「参考此行程发布以产生新灵感」：两个场景分别覆盖预填与必填不沿用 | 已有 |
| 提示文案 | `tripMessages.referenceHint`：「已预填目的地、途经点与兴趣；请重新选择标题、日期、人数与集合区域。」；`TripCreatePage.tsx:145-152` 在 `fromTripId` 存在时展示 | 已有 |

## 措辞差异（不改变交付结论）

1. **「体验详情」vs 体验卡。** 故事写「已结束行程或体验详情」，现行产品没有独立体验详情页；体验以卡片形态出现在灵感首页「旅行体验」视图与原行程详情页。入口挂在体验卡上（`ExperienceCard.tsx:53`），Living Spec 的用词也是「体验卡」。按 **Living Spec 优先**，S17 的「体验详情」按「体验卡」验收，不新增详情页。
2. **「集合地点必须重新填写」vs 集合区域选填。** 故事把集合地点列为必填；`openspec/specs/trip-plans/spec.md:151` 明确「集合区域、预算范围、兴趣标签与补充说明为选填」，且 `validateTripForm` 不校验 `meetingArea`。现行行为是**清空并要求用户自行填写，但不强制**。按 **Living Spec 优先**，S17 的「必须重新填写」按「不得沿用原行程取值」验收，不把集合区域升级为必填。

两处差异都只是故事文本粒度粗于 Living Spec，不构成行为缺口；若要把集合区域改为必填或新增体验详情页，属于新需求（改契约 / 改校验），不在本需求内。

## 用户裁决（2026-11-16）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | P1 范围口径 | **收口为「已验证交付」**：写意图 / 需求 / 影响面与 P1 记录，逐条引用 REQ-004 的 Living Spec 与 E2E 证据；不新建 openspec change、不改代码 | 无 proposal / Delta Spec / design / tasks，因此不触发工件评审门禁 |
| D2 | 记录人 / 签署人 | **Jacky（AO）** | 意图、需求、deep-dive、impact brief、P1 记录与质量报告署名统一为 Jacky |
| D3 | 编号 | **REQ-013** | 接在 REQ-012 之后；不与 REQ-004 的 `add-trip-experiences` 合并 |

## 意图边界（初判）

- **覆盖（作为已验证交付记录）：**
  - 已结束行程详情页与体验卡上的「参考此行程发布」入口。
  - 进入发布页后预填目的地、途经点（路线描述）、兴趣标签。
  - 标题、日期、人数、集合区域不得沿用原行程取值；未补齐必填项不能提交。
  - 新计划与源行程无归属关系：请求体与落库模型均无 source / parent 字段。
  - 上述每一条都能在 Living Spec、代码与 E2E 中找到锚点。
- **不覆盖：**
  - 新建 `openspec/changes/<id>/`、`proposal.md`、Delta Spec、`design.md`、`tasks.md`。
  - 任何代码、契约、迁移或测试改动。
  - 新增独立体验详情页；把集合区域改为必填；为参考发布新增后端接口或来源字段。
  - 体验内容本身的发布 / 修改规则（归 REQ-004）。

## 与现有 Living Spec / 能力的关系

- `trip-experiences` 的 Living Spec「参考此行程发布以产生新灵感」已经写明入口、三字段预填与必填重填；本需求**不新增业务规则**，只把它登记为 S17 的交付证据。
- `trip-plans` 拥有发布页字段、必填校验与「集合区域选填」口径；本需求只读引用，不改字段与校验。
- `openapi.yaml` 的 `TripCreateRequest` 不含来源字段；本需求**预期零契约变更**。
- 原型 `docs/prototype/stories.html` S17 是故事来源；其范围边界第 718 行已写明「『参考此行程发布』接口，改为前端预填」是可接受的削减，现行实现正是前端预填。

## Discovery Decision

`Go`（light intake，2026-11-16）— 交付形态已存在且可端到端观察（进入已结束行程 / 体验卡 → 点击 → 发布页预填三字段、必填为空 → 未补齐不可提交 → 提交生成独立计划）；能力归属清晰（`trip-experiences` 已归档，`trip-plans` 只读消费）；用户已裁决按「已验证交付」收口，无需新建 change。日期：2026-11-16。