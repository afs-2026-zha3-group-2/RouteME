# Impact brief — REQ-002 / 003 / 004 / 005（MVP 业务能力集）

- **Workdir：** `requirement-workspace/`
- **日期：** 2026-11-15 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（能力 / 页面 / 集成边界），非代码设计

## 1. Requirement set

| id | 能力 | change | 条目路径 |
|---|---|---|---|
| REQ-002 | `trip-plans` | `add-trip-plans` | `requirement-workspace/requirements/REQ-002-trip-plans.md` |
| REQ-003 | `trip-companions` | `add-trip-companions` | `requirement-workspace/requirements/REQ-003-trip-companions.md` |
| REQ-004 | `trip-experiences` | `add-trip-experiences` | `requirement-workspace/requirements/REQ-004-trip-experiences.md` |
| REQ-005 | `trip-plans` / `trip-experiences`（MODIFIED） | `refine-inspiration-home` | `requirement-workspace/requirements/REQ-005-inspiration-home.md` |

意图捕获：`requirement-workspace/intents/REQ-00{2,3,4}-*.md`；deep-dive：`requirement-workspace/deep-dive.md`。

## 2. As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec 树 | `openspec/specs/hello-world/spec.md` | 仅 `hello-world`（脚手架验收：首页展示数据库问候语 + CI 独立验证），无业务能力 |
| 已归档 SDD 资产 | `openspec/changes/archive/2026-11-15-bootstrap-hello-world/` | REQ-001 bootstrap 已归档（proposal/design/tasks/spec delta） |
| 进行中的 change | `openspec/changes/add-trip-plans/proposal.md` | 空壳（仅占位，待本次 P1 回填业务提案） |
| 知识库 | `docs/knowledge/`（architecture/domain/interfaces/operations/rules） | 含 RouteME 应用拓扑与本地启动说明、规则治理；domain 目前为 shared 占位 |
| P0 基线日志 | `docs/ai4se-plugins/20261115-*` | repo-understand / bootstrap / rules-govern / quality-checklist(p0) 记录齐全 |
| 业务素材 | `records/discussion/2026-11-13/RouteMe_MVP_完整闭环_中文.md`（+ EN/产品意图） | MVP 权威来源，范围已冻结 |
| 需求工作区 | `requirement-workspace/{README,handoff,registry}.md` | registry 仅登记 REQ-001；intents/requirements 本次重建 |

无缺失的权威树；未新造竞争性 authority root。

## 3. As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/`（Living Spec） | 只有 `hello-world` | 三个 change 落地后将新增 `trip-plans`/`trip-companions`/`trip-experiences` 三条 living capability（归档时生成，P1 阶段仅产出 change delta，不直接写 living spec） |
| `openspec/changes/add-trip-plans/` | proposal.md 空壳 | 回填业务提案 + `specs/trip-plans/spec.md`（ADDED 业务场景） |
| `openspec/changes/add-trip-companions/` | 不存在 | 新建 change：proposal + `specs/trip-companions/spec.md`（ADDED） |
| `openspec/changes/add-trip-experiences/` | 不存在 | 新建 change：proposal + `specs/trip-experiences/spec.md`（ADDED） |
| `hello-world`（Living Spec） | 首页展示问候语 | checked, no direct impact —— 首页语义演进为灵感首页属 `trip-plans` 变更；`hello-world` 脚手架验收能力保留不动 |
| `requirement-workspace/registry.md` | 仅 REQ-001 | 新增 REQ-002/003/004 登记行（status=drafted，映射三个 change） |
| `requirement-workspace/handoff.md` | 通用说明 | 补 REQ→change 映射行 |
| `TODO.md` | 仅 REQ-001 业务描述 | 补 REQ-002/003/004 业务清单（业务语言，不含开发任务） |
| `docs/knowledge/domain/` | shared 占位 | checked, no impact at P1 —— 领域知识回写属实现/归档阶段（dev/archive），BA P1 不改 KB |

## 4. Blast radius（应用架构）

- **新增能力（3）：** `trip-plans`、`trip-companions`、`trip-experiences`。
- **受影响页面（业务）：** 演示用户选择页、旅行灵感首页、发布行程页、行程详情页、同行申请页、我的旅行页、聊天页、游后分享页（闭环文档 §6 的 8 页面全部落在本需求集内）。
- **跨能力集成边界：**
  - `trip-companions` 消费 `trip-plans` 的行程/状态/兴趣标签，并**回写**行程状态（招募中 → 已满员）。
  - `trip-experiences` 消费 `trip-plans` 展示位（详情页/首页）与 `trip-companions` 的「已结束 + 参加过」判定；「参考此行程发布」回流到 `trip-plans` 发布表单。
- **依赖上游：** 全部建立在 REQ-001 `hello-world` 已验证的端到端骨架之上（无骨架改动）。
- **数据所有权：** 行程归 `trip-plans`；申请/同行关系/消息归 `trip-companions`；体验归 `trip-experiences`（deep-dive ① / ③）。

## 5. Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | 新增 3 份 `openspec/changes/add-trip-*/specs/<capability>/spec.md`（业务场景，Given/When/Then 纯业务语言） |
| Proposal | 回填/新增 3 份 `proposal.md`（业务语言，引用 REQ id 与 impact 要点、含 effort/size 注记） |
| Living Spec | 归档阶段生成 `openspec/specs/trip-plans|trip-companions|trip-experiences/spec.md`（非 P1 产物） |
| Registry / handoff / TODO | 登记 REQ-002/003/004，恢复业务清单 |
| Tests / 代码 / 契约 / 迁移 / design.md / tasks.md | **不在 BA P1 范围** —— 交 dev（P2 起：delta-craft/design/task-plan/apply）；本 brief 不产出这些 |
| KB (`docs/knowledge/`) | P1 不改；领域/接口回写属 dev 实现与归档阶段 |

## 6. Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 三个 change 一对一三个 capability，满足「一个 change 只改一个 capability」铁律；proposal + delta spec 已足以进入 `/sdd:delta-craft`（P2）。
- **Agile 轨（可选并行）：** 若团队走故事拆分，US-01~US-06（闭环文档 §7）天然映射：US-01/02/03→REQ-002，US-04/05→REQ-003，US-06→REQ-004；`/sdd:story-split` 可直接消费本需求条目。
- 两轨共用同一 requirement 条目与 impact brief，无需重复作者化。

## 7. Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | REQ-003 场景数 >6（17 条），单 change 偏大 | 保持一个 capability change（避免水平技术切片），在 §8 给出内部两阶段（匹配+申请 / 沟通+安全）供 dev 排期；不影响 P1 通过 |
| Risk | 多处降级路径（匹配百分比、聊天→留言区、图片、参考发布后端） | 降级边界已在 deep-dive ② 枚举为 in-scope 分支，spec 以「不阻断主价值」表述，dev 可按 §13 削减顺序取舍 |
| Risk | 跨能力状态回写（trip-companions 改 trip-plans 状态） | 已在 deep-dive ③ 指定 anchor=REQ-002，状态机单一权威，避免双写歧义 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0、A0 ⑨–⑫ 全过；无使需求失效的未知依赖 |

## 8. Suggested split boundaries（供 proposal-split / story-split）

- **一 REQ 一 change 一 capability（已定）：**
  - `add-trip-plans` ← REQ-002（迭代 1：灵感与发布）
  - `add-trip-companions` ← REQ-003（迭代 2–3：发现与连接 + 沟通）
  - `add-trip-experiences` ← REQ-004（迭代 3：分享与参考发布）
- **依赖 / 阶段排序（轻 DAG）：** REQ-002 → REQ-003 → REQ-004（线性依赖：行程池 → 同行连接 → 游后分享回流）。REQ-002 为 Phase 1 起点，无并行上游。
- **REQ-003 内部阶段建议（不拆 change）：** 阶段 A「匹配 + 申请 + 人数联动 + 我的旅行」；阶段 B「聊天 + 退出/举报/安全提示」。两阶段同属 `trip-companions`，可增量交付。
- **共享契约优先：** 行程状态机与「参加过」判定由 anchor REQ 冻结（REQ-002 / REQ-003），下游仅消费，避免返工。
- **质量自检（split-heuristics）：** 三个 change 均为垂直切片、端到端可验证（演示脚本 §11 逐步覆盖）、可独立运行、capability 名真实、无依赖环。

---

## 9. REQ-005（S03）变更影响 — 灵感首页双视图

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（页面 / 能力 / 接口边界），非代码设计

### 9.1 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-005-inspiration-home.md` | 本变更新增；六字段 + 10 场景 + DoR / A0 全过 |
| Living Spec `trip-plans` | `openspec/specs/trip-plans/spec.md` | 已定义「浏览未结束的旅行计划」、卡片字段、加载 / 空态、筛选、分页、状态文字 |
| Living Spec `trip-experiences` | `openspec/specs/trip-experiences/spec.md` | 已定义「灵感首页的旅行体验视图」、体验卡、筛选、分页、空态 |
| 首页实现 | `RouteME/frontend/src/home/HomePage.tsx` | 双视图骨架已存在：默认 `plans`，Segmented 切换，两视图各有骨架 / 错误 / 空态；默认标签仍是「旅行计划」 |
| 文案 | `RouteME/frontend/src/i18n/tripMessages.ts` | `plansView: '旅行计划'`、`experiencesView: '旅行体验'`；体验空态无发布按钮文案 |
| 卡片 | `RouteME/frontend/src/trips/TripCard.tsx`、`experiences/ExperienceCard.tsx` | 行程状态有文字徽标；体验卡未显示来源行程「已结束」状态 |
| 体验列表 | `RouteME/frontend/src/experiences/useExperiences.ts` | 已应用关键词 / 目的地 / 兴趣筛选与分页；日期 / 排序未应用（既有行为） |
| 接口契约 | `RouteME/openapi.yaml` v0.6.0 | `GET /api/trips`、`GET /api/experiences` 已存在；分页形状一致 |
| 数据 | `V4__seed_demo_trips.sql`、`V8__create_trip_experiences.sql` | 6 条行程（2 已结束 / 1 已满员 / 3 招募中）+ 2 条体验，满足 S03 场景数据 |
| 测试 | `RouteME/e2e/tests/trips.spec.ts`、`experiences.spec.ts` | 覆盖默认列表、已满员文字、体验视图；选择器使用「旅行体验」 |

### 9.2 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 首页默认视图 | 默认 `plans`，标签「旅行计划」 | 默认仍为 `plans`，标签改为「招募中的行程」；视图切换状态保留 |
| 行程卡 | 状态文字徽标 + 人数进度 | 保留文字；补强非颜色信号（满员进度 / 徽标形状 / 图标）以满足 AC 4 |
| 体验卡 | 来源行程标题 + 目的地 | 增加来源行程「已结束」显式标识（文字 / 图形，不只颜色） |
| 体验视图空态 | 仅标题 + 说明 | 增加「去发布行程」引导；保留筛选清除入口 |
| 招募视图空态 | 已有空态 + 发布按钮 | 保留，文案与行为对齐「去发布行程」 |
| 加载态 | 两视图均有 Skeleton | 保留；确保切换时展示当前视图加载态，不残留旧卡片 |
| 文案 | `plansView` = 旅行计划 | `plansView` = 招募中的行程；新增体验空态 CTA 文案 |
| 业务规则 / 数据 / 接口 | 既有 | **不变**：无迁移、无新端点、无状态机变更 |
| Living Spec | `trip-plans` / `trip-experiences` | 各新增 MODIFIED delta（归档时合并） |

### 9.3 Blast radius（应用架构）

- **页面（1）：** 灵感首页（`HomePage`）。
- **能力（2）：** `trip-plans`（默认视图 / 卡片状态 / 空态）、`trip-experiences`（体验视图 / 来源状态 / 空态）。
- **接口契约（0 新增）：** 复用 `GET /api/trips`、`GET /api/experiences`；不改请求 / 响应形状。
- **数据 / 迁移（0）：** 无新表、无字段、无 seed 变更。
- **测试触点：** 前端组件测试（文案 / 状态）、E2E `trips.spec.ts`（默认标签、已满员）、`experiences.spec.ts`（体验视图、空态）。
- **知识库：** 仅需在实现 / 归档阶段回写首页展示契约；P1 不改 `docs/knowledge/`。

### 9.4 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | `openspec/changes/refine-inspiration-home/specs/trip-plans/spec.md`（MODIFIED）、`specs/trip-experiences/spec.md`（MODIFIED） |
| Proposal | `openspec/changes/refine-inspiration-home/proposal.md` |
| Story | `requirement-workspace/stories.md`、`stories/refine-inspiration-home.story.md` |
| Registry / handoff | 新增 REQ-005 行与 REQ-005 → change 映射 |
| Tests / 代码 / 契约 / 迁移 / design / tasks | 不在 P1 范围；交 P2 起（delta-craft / design / task-plan / apply） |
| Living Spec | 归档阶段合并，不在 P1 直接写 |

### 9.5 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 默认视图文案变更影响既有 E2E / 文案断言 | 实现时同步更新选择器与断言；`旅行体验` 文案保持不变 |
| Risk | 「已结束」不在默认列表，容易被误读为未覆盖 AC | 需求 §4 #5 明确通过体验卡来源标识 + 详情页状态文字满足；不改默认列表口径 |
| Risk | 非颜色信号若只加颜色会被 AC 4 判失败 | Spec 以「状态文字 + 至少一种非颜色信号」双条件表述；设计评审按此检查 |
| Risk | 两视图共享筛选，体验视图未应用日期 / 排序 | 明确列为非阻塞 deferred / out of scope，避免顺手扩大范围 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0、A0 ⑨–⑫ 全过；无使需求失效的未知依赖 |

### 9.6 Suggested split boundaries

- **一个 change：** `refine-inspiration-home` ← REQ-005（S03，页面级垂直切片）。
- **两个 MODIFIED capability：** 同一页面同时消费 `trip-plans` 与 `trip-experiences`；不拆成「行程改造」与「体验改造」两个水平切片，因为单独交付任一半都无法完成 S03 的「切换视图后内容随之变化」验收。
- **阶段：** 单阶段；无依赖上游（两能力均已上线）。
- **质量自检（split-heuristics）：** 子目标一句话可说明、端到端可验证（6 条数据 → 打开首页 → 切换视图）、可独立运行、capability 名真实、无依赖环。
