# REQ-013 — 参考此行程发布（S17）（Ready 需求条目）

- **能力：** `trip-experiences`（已验证，只读引用）；`trip-plans`（发布页字段与校验，只读消费）
- **对应 OpenSpec change：** 无新建。复用已归档 / verified 的 `add-trip-experiences`（REQ-004）
- **编号说明：** 当前最新已登记需求为 REQ-012；本需求顺延为 **REQ-013**。
- **Ready 日期：** 2026-11-16 ｜ **状态：** drafted（P1，已验证交付收口）
- **故事口径：** P1 ｜ 迭代 3（第 6–7 天）｜ 2 点 ｜ 落点页面：发布行程页 ｜ 垂直切片：两个入口 + 复用一份发布契约 + 一次「源行程 → 新计划」的派生（无归属）
- **证据：** `requirement-workspace/intents/REQ-013-reference-publish.md`；Living Spec `openspec/specs/trip-experiences/spec.md:133-148`；`openspec/specs/trip-plans/spec.md:151`（集合区域选填）；`RouteME/frontend/src/trips/TripDetailPage.tsx:409-421`；`RouteME/frontend/src/experiences/ExperienceCard.tsx:53-55`；`RouteME/frontend/src/trips/TripCreatePage.tsx:36-38,50-68,145-152`；`RouteME/frontend/src/trips/tripForm.ts:23-35,70-72,88-99`；`RouteME/frontend/src/route.ts:21-25`；`RouteME/frontend/src/route.test.ts:25-28`；`RouteME/frontend/src/types.ts:131-143`；`RouteME/openapi.yaml:1774+`（`TripCreateRequest`）；`RouteME/e2e/tests/experiences.spec.ts:63,88-100`；`docs/prototype/stories.html:646-659`（S17）、`:718`（削减口径）

## Discovery Decision

**Go（light intake，2026-11-16）。** 理由：S17 的四条 AC 全部由已归档的 REQ-004（`add-trip-experiences`）交付，入口、预填、必填重填与「无归属」均可从 Living Spec、代码和 E2E 直接取证；用户裁决 D1 明确按「已验证交付」收口，不新建 change、不改行为。能力边界清晰：体验侧归 `trip-experiences`，发布页字段与校验归 `trip-plans`，本需求不新增规则。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-013 |
| statement | 让被某条体验打动的浏览者从已结束行程详情或体验卡一键进入发布页，预填目的地、途经点（路线描述）与兴趣标签；标题、日期、人数与集合区域不得沿用原行程；提交后生成一条与源行程无归属关系的新计划。 |
| actors | 浏览者（被体验打动、准备发布自己计划的人）、行程发布者（同一入口的体验卡来源）、系统（预填、校验与独立落库） |
| rationale | 「看到别人的路线 → 自己也想走」是体验内容的自然出口，但重复填写目的地、途经点与标签成本高。REQ-004 已用前端预填把这段路径缩短，且明确不建立归属关系，避免源行程的编辑 / 结束 / 删除影响新计划。 |
| acceptance hints | 见 §4 场景：两个入口、三字段预填、必填字段不沿用、未补齐不可提交、新计划无 source / parent。 |
| links to evidence | 见上方证据路径；权威口径以 `trip-experiences` Living Spec 与 `trip-plans` 发布校验为准；回归以 `e2e/tests/experiences.spec.ts` 与 `route.test.ts` 为准。 |

## 1. Intent

一句话：**让被某条体验打动的浏览者，在已结束行程或体验卡上点一次「参考此行程发布」，就得到一个已经写好目的地、路线和兴趣的空计划**——日期、人数、集合地点仍要自己填，提交后这条计划只属于自己，与源行程没有任何归属关系。价值不在「又一个发布入口」，而在**把灵感直接变成可提交的草稿**，同时不继承源行程的日期、人数与集合信息（那些只对原行程成立）。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 浏览者（未进入） | 先回到身份门；不展示行程详情 / 体验卡，也就没有参考发布入口。 |
| 已进入的浏览者 | 在任一条已结束行程详情或体验卡上看到「参考此行程发布」；可进入发布页并提交自己的计划。 |
| 行程发布者 | 自己的已结束行程详情同样显示入口（可基于自己的旧行程再发一条）；新计划与原行程互不影响。 |
| 系统 | 读取源行程的 `destination_code` / `stops` / `tags` 做前端预填；标题、日期、人数、集合区域以空表单为准；按 `trip-plans` 校验后独立落库。 |

不新增角色；不改变体验的发布 / 修改权限。

## 3. In / Out scope

**In scope（已验证交付，逐条取证）**

- 已结束行程详情页提供「参考此行程发布」，跳转 `#/trips/new?from=<tripId>`。
- 体验卡提供同名入口，跳转同一发布页。
- 进入发布页时预填：目的地（`destination_code`）、途经点（`stops`，即故事的「路线描述」）、兴趣标签（`tags`）。
- 标题、出发日期、结束日期、人数、集合区域不沿用源行程；页面顶部提示「已预填目的地、途经点与兴趣；请重新选择标题、日期、人数与集合区域。」
- 必填项未补齐时不能提交（标题 / 日期 / 人数 / 至少两个途经点等按 `trip-plans` 校验）。
- 提交后生成独立计划：`TripCreateRequest` 与行程模型均无 source / origin / parent 字段。
- 上述行为的 Living Spec、代码与 E2E 锚点已登记在 §4 与 `intents/REQ-013-reference-publish.md`。

**Out of scope**

- 新建 `openspec/changes/`、`proposal.md`、Delta Spec、`design.md`、`tasks.md`。
- 任何代码、契约、迁移、测试或样式改动。
- 新增独立体验详情页；把「体验详情」从体验卡升级为独立页面。
- 把集合区域从选填改为必填，或为参考发布新增后端接口 / 来源字段 / 复制历史。
- 参考发布后的计划与原行程联动（同步编辑、共享同行者、派生统计）。
- 体验内容本身的发布、修改、审核规则（归 REQ-004）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

1. **已结束行程详情入口** — Given 用户打开一条状态为「已结束」的行程详情，When 页面加载完成，Then SHALL 在详情操作区渲染「参考此行程发布」；点击后 SHALL 进入发布页且地址带 `from=<tripId>`。*（证据：`TripDetailPage.tsx:409-421`）*
2. **体验卡入口** — Given 用户在灵感首页「旅行体验」视图或原行程详情看到体验卡，When 卡片渲染，Then SHALL 提供「参考此行程发布」链接，指向该体验所属行程的发布页。*（证据：`ExperienceCard.tsx:53-55`；E2E `experiences.spec.ts:63`）*
3. **参考此行程发布并预填** — Given 一条已结束行程或其体验卡，When 用户点击「参考此行程发布」，Then 系统 SHALL 打开新建行程表单，And 目的地、途经点与兴趣标签已带入，And 提示用户需要重新选择标题、日期与人数。*（Living Spec `trip-experiences` 场景「参考此行程发布并预填」；E2E `experiences.spec.ts:88-97` 断言途经点「香洲港集合」与「摄影」标签已带入）*
4. **必填字段不沿用原行程** — Given 用户由「参考此行程发布」进入新建行程表单，When 表单展示，Then 标题、日期、人数、集合区域与补充说明 SHALL 为空，And 用户未补齐必填字段前 MUST NOT 提交。*（Living Spec 场景「必填字段不沿用原行程」；E2E `experiences.spec.ts:91-92,99-100`）*
5. **新计划与原行程无归属关系** — Given 用户由参考发布提交成功，When 系统保存并返回新计划，Then 新计划 SHALL 是一条普通行程，And MUST NOT 记录源行程 id、复制源行程的同行者或状态，And 源行程后续编辑 / 结束 / 归档 MUST NOT 影响新计划。*（`TripCreateRequest` 无来源字段：`types.ts:131-143`、`openapi.yaml:1774+`；`toCreateRequest` 不携带来源：`tripForm.ts:88-99`；路由测试 `route.test.ts:25-28`）*
6. **入口不因源行程不可参考而出现** — Given 行程尚未结束或用户没有可用体验，When 浏览列表 / 详情，Then MUST NOT 出现「参考此行程发布」入口。*（详情页入口受 `isCompleted` 约束；体验卡只在体验列表出现，而体验仅对已结束行程开放）*

### 4.1 与 Living Spec 的映射

| 本条目场景 | Living Spec 场景 | 关系 |
|---|---|---|
| #3 | `trip-experiences`「参考此行程发布并预填」 | 1:1 对应 |
| #4 | `trip-experiences`「必填字段不沿用原行程」 | 1:1 对应 |
| #1 / #2 | 「参考此行程发布以产生新灵感」需求陈述中的「已结束行程详情与体验卡」 | 入口落点的展开，不新增规则 |
| #5 | 需求陈述中的「不改变行程数据所有权」 | AC 4 的可观察化，不新增规则 |
| #6 | 入口前置条件 | 负向守卫，不新增规则 |

## 5. Constraints（仅事实，不含技术方案）

- 预填字段固定为三项：目的地、途经点、兴趣标签；标题、日期、人数、集合区域、预算、补充说明不预填（`TripCreatePage.tsx:56-62`）。
- 预填数量受发布页上限约束：途经点 `MAX_STOPS`、标签 `MAX_TAGS`（`TripCreatePage.tsx:59-60`）。
- 集合区域沿用 `trip-plans` 的**选填**口径（`openspec/specs/trip-plans/spec.md:151`）；参考发布只保证「不沿用」，不保证「必填」。
- 人数空白由 `trip-plans` 的 2–12 校验拦截（`tripForm.ts:70-72`）；发布日期早于今天由发布规则拦截。
- 参考发布是**纯前端预填**：不新增接口、不新增来源字段、不复制源行程数据；`TripCreateRequest` 契约不变。
- 入口只在已结束行程上出现；体验卡天然只承载已结束行程的体验。
- 视觉与文案沿用现有发布页与 `referenceHint`；不改设计系统。

## 6. Context

`add-trip-experiences` 已于 2026-11-15 归档（Living Spec `openspec/specs/trip-experiences/`，契约 0.4.0），其中「参考此行程发布以产生新灵感」明确要求入口、三字段预填与必填重填；实现采用前端预填而不是专用后端接口，与原型范围边界的削减口径（`stories.html:718`）一致。今天 S17 的剩余工作不是实现，而是**把这条已交付能力登记为 REQ-013 并逐条对齐 AC**，以免被误认为未开工。两处故事措辞（「体验详情」/「集合地点必须填」）按 Living Spec 优先解释为「体验卡」与「不得沿用」，不产生行为变更。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-experiences` | 不变（已交付） | 提供入口与预填数据源；Living Spec 已含该需求块。 |
| `trip-plans` | 不变（消费方） | 发布页字段、必填校验、集合区域选填口径均沿用；不改契约与状态机。 |
| 接口契约 `openapi.yaml` | 不变 | `TripCreateRequest` 不含来源字段；无新增端点 / 字段 / 错误码。 |
| 数据库 / 迁移 | 不变 | 无新表、无迁移、无列变更。 |
| 设计系统 `design-system` | 不变 | 复用发布页与按钮样式。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | S17 是否已由 REQ-004 交付？ | 用户 | 是；按「已验证交付」收口（裁决 D1）。 |
| blocking | resolved | 是否新建 openspec change？ | 用户 | 否；无 proposal / Delta Spec / design / tasks（裁决 D1）。 |
| blocking | resolved | 编号与记录人？ | 用户 | REQ-013；Jacky（裁决 D2 / D3）。 |
| blocking | resolved | 故事「体验详情」如何验收？ | Living Spec | 按「体验卡」；不新增独立体验详情页。 |
| blocking | resolved | 故事「集合地点必须重新填写」如何验收？ | Living Spec | 按「不得沿用原行程取值」；集合区域仍为选填。 |
| non-blocking | deferred | 是否需要独立体验详情页承载更长的体验内容？ | Design / BA | 后续需求评估；本需求不新增页面。 |
| non-blocking | deferred | 集合区域是否应改为发布必填？ | BA | 需改 `trip-plans` 规则与全部发布场景，另开需求。 |
| non-blocking | deferred | 参考发布是否需要记录来源用于统计？ | Dev / BA | MVP 明确无归属；如要统计需新增字段与契约，另开需求。 |

**blocking 项 = 0 未 resolved**，满足进入 split / 收口的硬门。

## 9. 用户裁决记录（2026-11-16）

| id | 议题 | 裁决 | 对 AC 的影响 |
|---|---|---|---|
| D1 | P1 范围口径 | **收口为「已验证交付」**：写意图 / 需求 / 影响面 / P1 记录，引用 REQ-004 证据；不新建 change、不改代码 | 场景 #1–#6 全部按现行行为验收 |
| D2 | 记录人 / 签署人 | **Jacky（AO）** | 全部工件署名 |
| D3 | 编号 | **REQ-013** | 登记与映射使用 REQ-013 |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why，外部可读） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（浏览者 / 发布者 / 系统 / 访客） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1 且指向既有能力 / 后续需求 | 通过 |
| — | resolved | §4 Scenarios | ④场景具体可观察，≥2（共 6 条） | 通过 |
| — | resolved | §4 #6 | ⑤含异常 / 边界（不可参考的源行程不出现入口） | 通过 |
| — | resolved | §4 | ⑥结果可验证（三字段带入、必填为空、不可提交、无来源字段） | 通过 |
| — | resolved | §5 / §7 | ⑦依赖与应用架构触点已识别（`trip-experiences` 交付、`trip-plans` 只读、契约不变、无迁移） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking = 0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：预填三字段、空值字段、无来源字段已列 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：未结束 / 已结束 / 本人 / 访客 / 提交失败齐全 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：体验入口锚点 `trip-experiences`、发布校验锚点 `trip-plans`，不与 REQ-004 重复定义 | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：两个入口、提示文案、空字段与提交校验齐全 | 通过 |

**DoR BLOCKER 计数 = 0；A0 ⑨–⑫ 全过。** 增补表见 `requirement-workspace/deep-dive.md`「Deep-dive 增补 — REQ-013」。