# AC / DoV review — refine-inspiration-home

- **Change:** `refine-inspiration-home`（`trip-plans` MODIFIED、`trip-experiences` MODIFIED，REQ-005 / S03）
- **Reviewed at:** 2026-11-16（+0800）
- **Review mode:** 手工 review（`openspec` CLI 未安装；Delta Spec 在 P1 手工落在 `openspec/changes/`，本次不重新 generate）
- **Inputs:** [`proposal.md`](proposal.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`REQ-005`](../../../requirement-workspace/requirements/REQ-005-inspiration-home.md)、[`impact-brief.md` §9](../../../requirement-workspace/impact-brief.md)、[`story`](../../../requirement-workspace/stories/refine-inspiration-home.story.md)、Living Spec `openspec/specs/{trip-plans,trip-experiences}/spec.md`、原型 `docs/prototype/stories.html` S03 与 `docs/prototype/ui.js` `discover()`、实现 `frontend/src/home/HomePage.tsx`、`frontend/src/trips/TripCard.tsx`、`frontend/src/experiences/ExperienceCard.tsx`、`frontend/src/i18n/tripMessages.ts`、种子 `V4__seed_demo_trips.sql` / `V8__create_trip_experiences.sql`、E2E `e2e/tests/{trips,experiences}.spec.ts`

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条需求至少一个可测 AC | Pass | 2 Requirement / 15 Scenario | `trip-plans` 1 Requirement / 8 Scenario；`trip-experiences` 1 Requirement / 7 Scenario；每条 Requirement 至少 6 个 Given/When/Then |
| AC-2 AC 可观测 | Partial | 默认视图、卡片字段、状态文字、空态 CTA、加载骨架、已结束标识均可观察 | 1 处继承性不可观测条款：「已取消」在 `TripStatus` 枚举中不存在（见 §规格解释裁决 #2）；不影响本 change 新增行为的验收 |
| AC-3 高风险负向 / 边界已列出 | Pass | 默认视图排除已结束、双视图空态、加载不残留上一视图、已满员 vs 招募中、来源行程已结束标识 | 边界与负向均为用户可见结果，不依赖内部实现 |
| AC-4 不是伪装的实现细节 | Pass | Delta 无表名、接口路径、类名；未新增端点 / 迁移 / 状态机 | 「徽标形状 / 图标 / 人数进度满格」是用户可见信号示例，不是实现方案 |
| AC-5 与 REQ-005 §4 十条场景对应 | Pass | 见 §需求映射，10/10 有落点 | 无遗漏、无新增场景超出 REQ |

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | proposal In/Out scope 与两份 Delta 一一对应 | 无新聚合端点、无数据库 / 迁移、无状态机；发布 / 详情 / 申请 / 聊天 / 分享发布不在范围 |
| DoV-2 歧义已解决 | Pass | 见 §规格解释裁决（7 项） | 无未决歧义；「已取消」与「一 change 两 capability」记为归档前治理项，不改变本 change 验收口径 |
| DoV-3 IO/SA 残余风险已记录 | Partial | 见 §残余风险，均有 owner | 无阻塞项 |
| DoV-4 未声称完成实现 | Pass | 本文件仅评审规格 | 实现缺口由 P3 设计与 apply 承接 |
| DoV-5 可追溯到 proposal / REQ-005 | Pass | §需求映射 + proposal §验收信号 1–8 | 两份 Delta 的 Requirement 均来自 proposal §范围 |

## 需求映射（REQ-005 §4 → Delta）

| REQ 场景 | Delta 落点 | 说明 |
|---|---|---|
| #1 默认进入招募中的行程 | `trip-plans` / 默认视图为招募中的行程；已结束与已取消行程不出现在默认视图 | 默认选中 + 列表口径 |
| #2 卡片信息完整 | `trip-plans` / 默认列表与卡片信息 | 标题、目的地、起止日期、途经点、标签、发布者、人数、状态文字 |
| #3 切换到旅行体验 | `trip-experiences` / 切换到旅行体验视图 | 体验卡替换行程卡 + 展示数量 |
| #4 已满员与招募中可区分 | `trip-plans` / 已满员与招募中可区分 | 状态文字 + 至少一种非颜色信号 |
| #5 已结束与招募中可区分 | `trip-experiences` / 体验卡标识来源行程已结束；`trip-plans` / 已结束不出现在默认视图 | 首页内以体验卡来源标识表达「已结束」 |
| #6 招募视图空状态 | `trip-plans` / 无结果时展示空状态并保留条件 | 空态 + 「去发布行程」+ 条件可清除 |
| #7 体验视图空状态 | `trip-experiences` / 体验空态 | 空态 + 「去发布行程」 |
| #8 加载中展示骨架 | `trip-plans` / 加载中展示骨架；`trip-experiences` / 体验视图加载态 | 不空白、不残留上一视图 |
| #9 视图切换状态正确 | `trip-plans` / 默认视图（可访问选中标识）；`trip-experiences` / 切换到旅行体验视图、体验视图加载态 | 选中标识 + 内容更新 + 不残留 |
| #10 6 条行程验收场景 | `trip-plans` / 默认列表与卡片信息；`trip-experiences` / 切换到旅行体验视图 | 种子 6 条：4 条未结束（含 1 条已满员）、2 条已结束 |

## 规格解释裁决

| # | 潜在歧义 | 裁决 | 落点 |
|---|---|---|---|
| 1 | 「至少一种非颜色信号」是否就是状态文字本身 | 双条件：状态文字必选，另需至少一种**文字之外**的可观察信号（图标 / 徽标形状 / 人数进度满格 / 明确可加入标签）。P3 必须把所选信号固定为 DOM 可断言的对象，避免仅以 CSS 颜色深浅实现 | `trip-plans` / 已满员与招募中可区分；`trip-experiences` / 体验卡标识来源行程已结束 |
| 2 | 「已取消」在系统中没有对应状态 | `TripStatus` 与 `openapi.yaml` 枚举只有 `recruiting / full / completed`；该条款继承自 Living Spec 与契约描述，属既有文档漂移。本 change 不新增取消态，条款在当前数据模型下为真空满足；归档合并时统一收敛（见 `consistency-lint.md` L-02） | `trip-plans` / 已结束与已取消行程不出现在默认视图 |
| 3 | 「已结束」如何与招募中区分 | 默认列表不混入已结束；首页内通过「旅行体验」体验卡来源行程「已结束」标识 + 行程详情状态文字表达 | `trip-plans` / 已结束与已取消...；`trip-experiences` / 体验卡标识来源行程已结束 |
| 4 | 「已结束」标识放在体验卡何处 | 放在来源行（「来自 ...」附近），不挤占强度徽标；具体视觉与语义样式属 P3 设计 | `trip-experiences` / 体验卡标识来源行程已结束 |
| 5 | 体验空态「去发布行程」指向哪里 | 指向新建行程页（`#/trips/new`），与行程空态一致；不是游后分享页 | `trip-experiences` / 体验空态 |
| 6 | 切换视图是否保留筛选 / 是否深链 | 同一首页内的客户端视图状态；保留既有筛选与分页，不做单视图 URL | proposal §决策；`trip-plans` / 默认视图；`trip-experiences` / 切换到旅行体验视图 |
| 7 | 加载时是否允许显示上一视图旧卡片 | 不允许；两视图按当前选中视图条件渲染，加载时只显示本视图骨架 | `trip-experiences` / 体验视图加载态；`trip-plans` / 加载中展示骨架 |

## 残余风险

| 风险 | Owner | 处理 |
|---|---|---|
| 非颜色信号被实现成颜色深浅，仍可能被判「只靠颜色」 | AO（Jay） | P3 设计固定为结构 / 图标 / 进度满格等 DOM 可断言信号；评审按「文字 + 第二信号」双条件检查 |
| 默认标签从「旅行计划」改为「招募中的行程」；现有测试未直接断言该标签（E2E 只断言「旅行体验」），缺口是默认视图标签没有被测试锁定 | AO（Jay） | 在 `e2e/tests/trips.spec.ts` 补默认视图标签断言；`createTitle: '发布旅行计划'` 是发布页标题，保持不变 |
| E2E 选择器与组件类名漂移：`experiences.spec.ts` 使用 `.experience-card`，组件为 `.exp-card` | AO（Jay） | 作为 P3 任务修复选择器；否则「相关 E2E 通过」验收无法成立（`consistency-lint.md` L-04） |
| 「已取消」条款不可观测，且契约描述与枚举不一致 | SA / AO | 归档合并时收敛文案（`consistency-lint.md` L-02）；本 change 不改状态机 |
| 一个 change 修改两个 capability，与 `@rule:sdd-artifacts` 的单 capability 约定存在张力 | SA | 归档前由 SA 追认页面级垂直切片例外或拆分（`consistency-lint.md` L-01）；G1 不阻塞 |
| 体验视图仍无日期 / 排序筛选 | BA | 明确 out of scope；不作为本 change 的回归缺口 |
| 空态 CTA 与「发布行程」既有入口可能重复计数 / 导航竞争 | AO | P3 复用现有 `#/trips/new` 入口，不新增路由 |

## 结论

- **AC：** 4 Pass + 1 Partial（非阻塞，1 处继承性不可观测条款）。
- **DoV：** 4 Pass + 1 Partial（非阻塞，残余风险均有 owner）。
- **G1-ready：** Yes（待 IO + SA 具名签署）。
- **未声称：** 本文件不构成 G1 决策，也不声称任何实现已完成。