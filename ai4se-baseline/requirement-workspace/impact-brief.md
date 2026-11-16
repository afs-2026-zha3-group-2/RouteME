# Impact brief — REQ-002 / 003 / 004 / 005 / 006 / 007 / 008（MVP 业务能力集）

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
| REQ-006 | `user-auth`（MODIFIED） | `add-user-logout` | `requirement-workspace/requirements/REQ-006-user-logout.md` |

意图捕获：`requirement-workspace/intents/REQ-00{2,3,4,5,6}-*.md`；deep-dive：`requirement-workspace/deep-dive.md`。

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

---

## 10. REQ-006 变更影响 — 退出当前身份（含演示身份）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（身份 / 页面 / 接口消费边界），非代码设计

### 10.1 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-006-user-logout.md` | 本变更新增；六字段 + 9 场景 + DoR / A0 全过 |
| 认证 change（2026-11-16，已解档） | `openspec/changes/add-user-auth/` | 已实现注册 / 登录 / 会话恢复与注册账号退出；其任务 T6 写有「演示身份不显示退出」（历史记录，不改写） |
| Living Spec `user-auth` | `openspec/specs/user-auth/spec.md` | **已存在**（`add-user-auth` 的 Delta 已并入）：含「会话校验与退出」3 个场景与「演示身份保留」；本 change 以 MODIFIED 扩展前者 |
| Living Spec `trip-plans` | `openspec/specs/trip-plans/spec.md` | 已定义「演示身份进入与切换」；不包含退出路径 |
| 顶栏身份菜单 | `RouteME/frontend/src/shell/AppShell.tsx` | `isAuthenticated` 为真时才渲染 `id-logout`；演示身份仅能切换，无法回到身份门 |
| 退出处理 | `RouteME/frontend/src/App.tsx` | `logout()` 已能清除 token / 当前身份并回到身份门；演示身份未被入口调用 |
| 身份门 | `RouteME/frontend/src/identity/IdentityGate.tsx` | 3 个演示身份 + 登录 / 注册入口；无退出入口 |
| 接口契约 | `RouteME/openapi.yaml` v0.6.0 | `POST /api/auth/logout` 已存在（204）；本变更不新增端点 |
| 会话实现 | `backend/.../controller/AuthController.java`、`service/AuthServiceImpl` | 退出删除会话行；演示身份无会话记录 |
| 测试 | `RouteME/frontend/src/api.test.ts`、`e2e/` 认证走查记录 | 已覆盖注册账号退出；未覆盖演示身份退出与入口可见性 |

### 10.2 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 顶栏身份菜单 | 退出项仅登录态渲染 | 退出项对注册账号与演示身份都渲染；点击后关闭菜单并执行退出 |
| 演示身份退出 | 无入口 | 清除本地当前身份并回到身份门；不调用 `POST /api/auth/logout` |
| 注册账号退出 | 已实现（结束会话 + 清除本地 + 回身份门） | 保持行为；补齐「结束会话失败仍本地退出」的降级语义 |
| 退出后状态 | 已回到身份门（注册账号） | 演示身份同样回到身份门；刷新不恢复上一身份 |
| 身份门 | 无退出入口 | 保持无退出入口（明确为需求边界） |
| 文案 | 菜单说明区分登录态 | 说明文案覆盖演示身份退出；不出现「演示身份不可退出」类表述 |
| 业务规则 / 数据 / 接口 | 既有 | **不变**：无迁移、无新端点、无状态机变更 |
| Living Spec | `user-auth` 已存在「会话校验与退出」（3 场景） | 归档时用本 change 的 MODIFIED delta 替换该块：保留 3 个既有场景并新增 7 个全身份退出场景（共 10） |

### 10.3 Blast radius（应用架构）

- **页面（1）：** 顶栏身份菜单（`AppShell`）+ 退出后的身份门（`IdentityGate` 复用）。
- **能力（1）：** `user-auth`（MODIFIED：「会话校验与退出」扩为全身份退出）；`trip-plans` 的演示身份进入 / 切换仅被消费，不改规则。
- **接口契约（0 新增）：** 注册账号退出复用 `POST /api/auth/logout`；演示身份退出不发请求。
- **数据 / 迁移（0）：** 无新表、无字段、无 seed 变更。
- **测试触点：** 前端组件 / 单元测试（入口可见性、退出清态）、`e2e`（注册账号退出、演示身份退出、刷新不恢复）。
- **知识库：** 实现 / 归档阶段回写「退出路径对全身份可用」；P1 不改 `docs/knowledge/`。

### 10.4 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | `openspec/changes/add-user-logout/specs/user-auth/spec.md`（MODIFIED「会话校验与退出」，10 场景） |
| Proposal | `openspec/changes/add-user-logout/proposal.md` |
| Registry / handoff | 新增 REQ-006 行与 REQ-006 → `add-user-logout` 映射 |
| Tests / 代码 / 契约 / 迁移 / design / tasks | 不在 P1 范围；交 P3 / P4 起（design / task-plan / apply） |
| Living Spec | 归档时用 MODIFIED delta 替换 `openspec/specs/user-auth/spec.md` 的「会话校验与退出」；`add-user-auth` 的 Delta 已并入，顺序依赖已解除 |

### 10.5 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | `add-user-auth` 归档任务 T6 写有「演示身份不显示退出」 | 该记录是归档时的历史实现快照；本 change 落地后由 `summary.md` / G3 注明已被「退出入口对全身份可见」取代，不改写归档正文 |
| Risk | MODIFIED 会整体替换 Living Spec 的「会话校验与退出」块 | Delta 已原样保留既有 3 个场景（有效 token / 无效 token / 退出登录）；`openspec validate add-user-logout --strict` 通过 |
| Risk | 演示身份误调用退出端点会产生无意义 401 | spec 明确演示身份退出不发起认证请求；测试覆盖 |
| Risk | 退出失败提示可能被误解为退出未完成 | 文案限定为「本机已退出，会话可能仍有效」，主状态必须回到身份门 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0、A0 ⑨–⑫ 全过；既有 `refine-inspiration-home` 的 validate 失败与本需求无关 |

### 10.6 Suggested split boundaries

- **一个 change：** `add-user-logout` ← REQ-006（单一 `user-auth` capability，页面级 + 身份生命周期增量）。
- **不拆「注册账号退出」与「演示身份退出」：** 两者共用同一菜单入口与同一个「回到身份门」验收；拆开会让入口可见性验收无法归属。
- **不并入 `add-user-auth`：** 该 change 已实现并处于验证收口，追加会打乱其归档边界；本 change 只覆盖退出路径的扩展。
- **阶段：** 单阶段；依赖 `add-user-auth` 的既有会话契约（已实现），无阻塞上游。
- **质量自检（split-heuristics）：** 子目标一句话可说明、端到端可验证（进入 → 展开菜单 → 退出 → 刷新 → 再进入）、可独立运行、capability 名真实、无依赖环。

---

## 12. REQ-008 变更影响 — 完善个人资料并生成个人主页

> 编号说明：本节为 `add-user-profile`（**REQ-008**）的影响分析，编号 **§12**；`add-destination-area-filters`（**REQ-007**）的影响分析为 **§11**（2026-11-16 远程追加，见文末）。REQ-007 的产物已引用 §11，故由其保留该编号，本 change 顺延为 §12。

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（6 项产品问题已由用户裁决，blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（页面 / 资料契约 / 账号流程 / 发布者展示边界），非代码设计

### 12.1 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-008-user-profile.md` | 本变更新增；六字段 + 17 场景 + 6 项用户裁决 + DoR / A0 全过 |
| 账号表 | `backend/src/main/resources/db/migration/V3__create_demo_users.sql`、`V9__add_user_credentials.sql` | `app_users` 只有昵称、首字、学校、简介、兴趣 + 用户名 / 密码散列；无生日、性别、城市、专业、职业、MBTI、旅行方式、头像地址 |
| 演示数据 | 同上 V3 | 3 个演示账号的 `school` 存「年级 · 专业」合并文案（如「研一 · 地理科学」） |
| 注册表单 | `RouteME/frontend/src/identity/AuthPanel.tsx`、`authForm.ts` | 注册收集用户名、密码、昵称、学校、简介、兴趣；注册成功直接进入首页 |
| 会话契约 | `openspec/specs/user-auth/spec.md` | 「注册账号」校验昵称与兴趣数量；「用户名密码登录」「会话校验与退出」「演示身份保留」 |
| 发布者展示 | `RouteME/frontend/src/trips/`、`experiences/`、`shell/AppShell.tsx` | 展示昵称、首字头像、学校与简介；无个人主页入口 |
| 用户接口 / 契约 | `RouteME/openapi.yaml` 0.6.0、`GET /api/users`、`GET /api/users/demo` | `DemoUser` 只有 6 个字段；无资料读写端点 |
| 前端路由 | `RouteME/frontend/src/route.ts` | 无资料完善页 / 个人主页路由 |
| 测试 | `frontend/src/identity/authForm.test.ts`、`backend/.../AuthControllerTest.java`、`e2e/` | 覆盖既有注册校验；未覆盖资料字段、头像、个人主页 |

### 12.2 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 注册表单 | 用户名 / 密码 / 昵称 / 学校 / 简介 / 兴趣 | 收窄为用户名 / 密码 / 昵称；注册成功进入资料完善页 |
| 账号表 | 无资料字段 | 新增头像地址、生日、性别、城市、专业、职业、MBTI、旅行方式列；学校 / 简介 / 兴趣保留并改由资料页写入；学校与专业改为选填 |
| 资料接口 | 无 | 新增 `GET /api/users/{id}/profile`、`PUT /api/users/me/profile`、`POST /api/users/me/avatar` |
| 契约 | 0.6.0，`DemoUser` 6 字段 | 0.7.0：新增 `UserProfile`；用户摘要增加头像与完善状态；注册请求体收窄并忽略旧字段 |
| 页面 / 路由 | 首页 / 发布 / 详情 / 申请 / 我的 / 聊天 / 分享 | 新增 `#/profile/setup`、`#/users/{id}`；「我的」增加资料入口 |
| 发布者展示 | 昵称 + 首字 + 学校，无跳转 | 增加头像与个人主页链接；摘要行按「学校 · 专业 → 职业 → 城市」取第一个可用值；未完善资料降级展示 |
| 年龄 / 星座 | 无 | 服务端按生日与当前日期派生，资料响应返回只读值；生日原文不公开 |
| 完善状态 | 无 | 由必填字段派生布尔值，不落库；影响注册后落点与「我的」入口 |
| 演示身份 | 昵称 / 学校 / 兴趣只读 | 仍只读；不展示编辑入口，保存接口返回 403 |
| 行程 / 体验业务规则 | 既有 | **不变**：只改发布者展示入口 |

### 12.3 Blast radius（应用架构）

- **页面（3）：** 新增资料完善页、个人主页；改动「我的」与行程 / 体验发布者展示入口。
- **能力（2）：** `user-profile`（ADDED，7 条需求）；`user-auth`（MODIFIED「注册账号」）；`trip-plans` / `trip-experiences` 仅消费展示，不改规则。
- **接口契约（3 新增 + 1 收窄）：** 资料读取、资料保存、头像上传；`POST /api/auth/register` 请求体收窄。
- **数据 / 迁移（1）：** `app_users` 增加 8 列（头像地址、生日、性别、城市、专业、职业、MBTI、旅行方式）；不新增表、不迁移演示数据。
- **测试触点：** 前端单测（必填汇总、生日派生、兴趣上下限、头像回退）、后端（资料服务 / 控制器 / 迁移 / 权限 401 / 403）、E2E（注册 → 完善 → 主页 → 他人查看）。
- **知识库：** 实现 / 归档阶段回写资料能力与契约版本；P1 不改 `docs/knowledge/`。

### 12.4 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | `openspec/changes/add-user-profile/specs/user-profile/spec.md`（ADDED，7 条需求）＋ `specs/user-auth/spec.md`（MODIFIED「注册账号」） |
| Proposal | `openspec/changes/add-user-profile/proposal.md` |
| Story | `requirement-workspace/stories/add-user-profile.story.md`（S18，P0 / 迭代 1 / 3 点）；`stories.md` 增补 REQ-008 段 |
| Registry / handoff | 新增 REQ-008 行与 REQ-008 → `add-user-profile` 映射 |
| Tests / 代码 / 契约 / 迁移 / design / tasks | 不在 P1 范围；交 P3 / P4 起（design / task-plan / apply） |
| Living Spec | 归档时新建 `openspec/specs/user-profile/spec.md`，并用 MODIFIED 替换 `openspec/specs/user-auth/spec.md` 的「注册账号」；`trip-plans` / `trip-experiences` 是否同步改展示验收由 P3 确认 |

### 12.5 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 双 capability（`user-profile` ADDED + `user-auth` MODIFIED） | 与 REQ-005 同口径：注册收窄与资料补齐是同一状态迁移的两端；归档前需 SA 追认例外 |
| Risk | 兴趣词表与行程标签不一致影响匹配 | 本 change 不改匹配；P3 设计统一词表 / 别名，避免扩成匹配改造 |
| Risk | 头像文件落盘带来安全与清理边界 | 仅 JPEG / PNG / WebP、≤2 MB、服务端生成文件名；P3 确认目录与访问路径 |
| Risk | 注册请求体收窄破坏既有前端 / 测试 / 演示脚本 | 契约升 0.7.0，旧字段忽略而非报错；P4 同步更新单测与 E2E |
| Risk | 生日派生年龄 / 星座口径分叉 | 统一由服务端计算并返回只读值；P3 用表驱动星座边界并加单测 |
| Risk | 完善状态与字段更新漂移 | 状态由字段派生、不落库；派生函数与资料响应共用同一实现 |
| Risk | 学校改为选填后，行程卡 / 详情的发布者摘要可能为空 | 摘要行按「学校 · 专业 → 职业 → 城市」回退；全空时只显示昵称与头像，不留空行 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0、A0 ⑨–⑫ 全过；既有 `refine-inspiration-home` 的 validate 失败与本需求无关 |

### 12.6 Suggested split boundaries

- **一个 change：** `add-user-profile` ← REQ-008（S18，页面级垂直切片）。
- **双 capability 例外：** `user-profile`（ADDED）承载资料与主页；`user-auth`（MODIFIED）只收窄注册。拆成两个 change 会让「注册 → 完善 → 主页」断成两段，且注册端口径无人负责。
- **不并入 `add-user-auth`：** 该 change 已于 2026-11-16 解档（Delta 早先并入 Living Spec，再次归档为 spec no-op）；资料是新业务概念，追加进它的包会打乱历史边界。
- **不并入 `refine-inspiration-home`：** 该 change 聚焦首页双视图，发布者入口只被消费，避免两个页面级切片互相阻塞。
- **阶段：** 单阶段；依赖已并入 Living Spec 的 `user-auth` 会话契约，无阻塞上游。
- **质量自检（split-heuristics）：** 子目标一句话可说明、端到端可验证（注册 → 填资料 → 保存 → 他人查看发布者 → 主页）、可独立运行、capability 名真实、无依赖环。

---

## 11. REQ-007 增量影响 — 灵感首页目的地/日期筛选（2026-11-16，远程基线 229411a）

- **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（REQ-007 blocking OQ 与 DoR BLOCKER 均为 0）
- **需求来源：** 迭代 1 用户故事（按目的地与日期缩小范围）＋ 用户逐条决策 D1–D15（含远程基线复核后的修订）
- **粒度：** 应用架构（能力 / 页面 / 数据契约 / 集成边界），非代码设计
- **基线：** 远程 `main@229411a`；`add-paged-lists-mybatis-plus`、`apply-prototype-visual-design`、`add-user-auth` 已归档；`refine-inspiration-home`（REQ-005）、`add-trip-publish`、`add-match-reason`、`add-user-logout` 进行中。

### 11.1 Requirement set

| id | 能力 | change | 条目路径 |
|---|---|---|---|
| REQ-007 | `trip-plans`（MODIFIED）、`trip-experiences`（MODIFIED） | `add-destination-area-filters` | `requirement-workspace/requirements/REQ-007-destination-area-filters.md` |

意图捕获：`requirement-workspace/intents/REQ-007-destination-area-filters.md`；deep-dive：`requirement-workspace/deep-dive.md`（REQ-007 段）。

### 11.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec `trip-plans` | `openspec/specs/trip-plans/spec.md` | 已含分页（`add-paged-lists` 归档）；仍有「搜索、筛选与排序」与「发布…目的地来自固定候选」；`refine-inspiration-home` 的 delta 同改「浏览」要求，尚未归档 |
| Living Spec `trip-experiences` | `openspec/specs/trip-experiences/spec.md` | 「灵感首页的旅行体验视图」支持关键词/目的地/兴趣，无日期；`refine-inspiration-home` 的 delta 同改该要求，尚未归档 |
| 进行中 `refine-inspiration-home`（REQ-005） | `openspec/changes/refine-inspiration-home/` | P3 Pass，待 P4；明确保留既有搜索，体验日期筛选 out of scope；其 E2E `guides an empty search...` 用搜索制造空态 |
| 进行中 `add-trip-publish` | `openspec/changes/add-trip-publish/` | 完成待归档；拥有「发布可被他人理解的旅行计划」；发布页目的地/途经点/集合地点均用离线地图 `PlacePicker` |
| 进行中 `add-match-reason` | `openspec/changes/add-match-reason/` | 完成待归档；`trip-companions` 匹配原因固定权重，含「目的地相同 50 分」 |
| `add-user-auth`（2026-11-16 解档，Delta 已并入 Living Spec） | `openspec/changes/add-user-auth/` | 占用 V9；契约 `0.6.0`；新增登录/会话/退出；E2E 身份初始化变更 |
| 数据迁移 | `RouteME/backend/src/main/resources/db/migration/V4__seed_demo_trips.sql`、`V8__create_trip_experiences.sql`、`V9__add_user_credentials.sql` | `trip_plans.destination` 中文名；`trip_experiences` 仅 `trip_id`；V9 已被 auth 占用 |
| 目的地候选 | `RouteME/frontend/src/map/placeCatalog.ts`、`trips/tripOptions.ts` | 离线地图地名库 16 城（广东 14 + 香港/澳门）；`DESTINATIONS = CITY_NAMES` |
| 前端筛选/发布 | `RouteME/frontend/src/{home/HomePage.tsx,trips/tripFilters.ts,api.ts,trips/useMatches.ts,experiences/useExperiences.ts,trips/TripCreatePage.tsx,map/PlacePicker.tsx}` | 搜索/目的地/日期/兴趣 + 分页；体验视图不传日期；发布页目的地用 PlacePicker |
| 后端查询/发布 | `RouteME/backend/src/main/java/routeme/{controller,service,request,param,mapper}/**`、`resources/mapper/*.xml` | `q`、`destination`（名称，任意非空）、`date_from/date_to`、`tags`；体验无日期 |
| 契约 | `RouteME/openapi.yaml` | `0.6.0`；三个列表接口声明 `q`；`TripCreateRequest.destination` 为名称 |
| 测试 | `backend/src/test/java/routeme/controller/{TripControllerTest,ExperienceControllerTest,OpenApiTest}.java`、`frontend/src/{trips/tripFilters.test.ts,api.test.ts}`、`e2e/tests/{trips,experiences}.spec.ts` | 覆盖关键词/目的地/标签/分页；`trips.spec.ts` 发布用例按标题搜索；`experiences.spec.ts` 空态用例用搜索 |
| 区划字典 | 不存在 | 前端地图城市库 16 城；后端无字典，发布只校验非空 |

### 11.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| `trip_plans` 表 | `destination VARCHAR(20) NOT NULL`；无代码列 | **V11**（V10 被 user-profile 占用，V9 被 auth 占用）加列：`destination_code VARCHAR(6) NOT NULL DEFAULT ''`、索引、存量映射回填、`destination` 回填标准名；不重建表（避开外键）；`trip_experiences` 结构不变 |
| 领域/实体 | `TripPlan.destination`（名称，任意非空） | 目的地以 6 位代码为权威；实体持有 code + 名称 + 省 code/展示名；发布写入由 A 改为 `destination_code`，B 提供数据底座 |
| 列表查询 | `q` + `destination`（名称）+ 日期 + 标签 | 移除 `q`；`destination` 改为 `destination_code`；日期/标签语义不变；体验列表新增 `date_from/date_to` |
| 响应 | `destination`（名称） | 新增 `destination_code`、`province_code`、`province_name`（展示名：普通省“广东省”、港澳台“香港”/“澳门”）；`destination` 为城市标准名（直辖市=省名） |
| 匹配打分 | `TripMatch` 按名称比较目的地 | 改为按 `destination_code` 比较；“目的地相同”理由文案不变 |
| 前端筛选器 | 搜索框 + 地图城市 Select + 日期 + 兴趣 | 删除搜索框与 `q` 状态；Select → 省市级联自绘面板（全国含港澳台，必须选到市；P4 实现修订）；摘要按省/市/港澳台口径；日期/兴趣保留 |
| 前端展示 | 卡片/详情显示短地名 | 卡片市名；详情/摘要“省 / 市”；港澳台“省 · 二级”；体验卡不显示日期 |
| 前端体验视图 | 目的地/标签/关键词 | 目的地改为代码 + 新增日期区间；关键词移除 |
| 契约 | 0.6.0；三接口含 `q`；发布传名称 | 升至 **0.7.0**：删除 `q`；查询 `destination_code`；响应新增 code/province 字段；体验加日期参数；发布请求字段由 A 改为 `destination_code` |
| 测试 | 关键词/名称断言 | 更新为 code/标准名；新增只选省、非法 code、直辖市/港澳台展示、体验日期、搜索不存在用例；匹配打分回归；`refine-inspiration-home` 的搜索空态测试由它的 owner 更新 |
| 知识库 | interfaces/domain 记录 `q` 与 16 城 | 归档阶段回写（P1 不改 KB） |
| `add-trip-publish`（A） | 目的地用 `PlacePicker`、发布传名称 | 目的地改 Cascader、请求改 `destination_code`、E2E/design/spec 目的地相关更新；**已获授权只改目的地相关，不归档** |
| `refine-inspiration-home` | 保留搜索、搜索空态 E2E | **不改它的文件**；其搜索相关测试由它的 owner 更新；本 change 的 G1 记录依赖 |

### 11.4 Blast radius（应用架构）

- **变更能力（2）：** `trip-plans`、`trip-experiences`。
- **消费方（2）：** `trip-companions`（匹配打分改为按代码比较）；`add-trip-publish`（发布页目的地字段改为 code，消费本 change 的数据底座）。
- **受影响页面（业务）：** 灵感首页（行程/体验）、行程详情、体验卡、参考此行程发布（A）、发布行程页（A）。
- **跨能力集成边界：** `trip-experiences` 消费 `trip-plans` 的目的地代码/名称与日期；`trip-companions` 消费目的地代码做匹配；A 的发布写 `destination_code`。
- **数据所有权：** 目的地代码/名称/省名归 `trip-plans`；行政区划字典为共享只读数据；体验不新增目的地列。

### 11.5 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Proposal | 新增 `openspec/changes/add-destination-area-filters/proposal.md`（引用 REQ-007 与 D1–D15、含 effort/size） |
| Spec delta | 两份：`specs/trip-plans/spec.md`（MODIFIED 浏览 + ADDED 筛选/区划字典/无搜索 + REMOVED 旧“搜索、筛选与排序”）、`specs/trip-experiences/spec.md`（MODIFIED 体验视图）；**不修改发布 requirement** |
| A 的 delta | `add-trip-publish/specs/trip-plans/spec.md` 目的地相关场景、`design.md`、`e2e/tests/trips.spec.ts` 目的地/搜索定位；不归档 |
| 契约 | `openapi.yaml` 升 `0.7.0`：删除 `q`，目的地改 `destination_code`，响应新增 code/province 字段，体验加日期 |
| 迁移 | **V11** 加列 + 映射回填 + 标准名 + 索引（SQLite/H2 兼容，不重建表） |
| 测试 | 后端 controller/service/openapi；前端纯函数与 api；E2E 目的地级联/日期/体验/展示；A 的发布目的地 E2E |
| 文档 / KB | `docs/knowledge/**` 回写在 archive 阶段；P1 不改 |
| Living Spec | 归档时合并；顺序见 §11.8 |

### 11.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** B 单 change `add-destination-area-filters`，两份 delta；内部阶段：① 数据底座（V11 + 字典 + 响应字段）② 筛选/展示（级联/日期/摘要/空态）③ 体验日期 + 搜索移除。
- **Agile 轨（并行）：** 故事见 `requirement-workspace/stories.md` 的 REQ-007 段与 `stories/REQ-007-destination-area-filters.story.md`，与两份 delta 场景 1:1 归属。
- **A 的发布目的地字段** 作为 `add-trip-publish` 的目的地相关修订，不并入 B 的 delta。

### 11.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | `refine-inspiration-home` 未归档且同改两 requirement | 归档顺序 `refine-inspiration-home` → B；B 的 delta 以 refine 版本为基线并保留其场景；refine 的搜索相关测试由它的 owner 更新（本 change G1 记为条件） |
| Risk | `add-trip-publish` 未归档 | B 拥有数据底座，A 的发布字段消费 B；归档顺序 B → A；A 的目的地相关工件已获授权修改但不归档 |
| Risk | V9 被 auth 占用、契约已 0.6.0 | 迁移改 V11，契约升 0.7.0 |
| Risk | 区划数据 v5 较旧（约 2019/2020） | MVP 接受静态字典；后续可升级，不影响代码契约 |
| Risk | 搜索移除影响 refine/A 的 E2E | A 已授权修改；refine 交 owner；B 自己的用例不用搜索 |
| Risk | SQLite/H2 加列迁移 | H2 会拒绝 `DROP TABLE trip_plans`（外键），因此 V11 改为 `ADD COLUMN ... NOT NULL DEFAULT ''` + 回填；应用层拒绝空串，迁移测试覆盖 SQLite + H2 |
| Risk | 匹配打分比较口径 | 字符串改代码后“目的地相同”理由可能失效；补匹配回归用例 |
| Risk | 发布页目的地与地图选点交互 | A 的目的地改 Cascader，途经点/集合地点保留地图；需在 A 的 design/E2E 对齐 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过；外部依赖均为非阻塞顺序条件 |

### 11.8 Suggested split boundaries（供 proposal-split / story-split）

- **B 单 change，两份 delta：** `add-destination-area-filters` → `trip-plans` + `trip-experiences`。
- **B 内部阶段（不拆 change）：** ① 数据底座（V11、6 位码、字典、响应字段）；② 筛选/展示（级联、日期、摘要、空态）；③ 体验日期 + 搜索移除。
- **A 的发布目的地字段：** 归 `add-trip-publish` 的目的地相关修订，不并入 B。
- **归档顺序：** `refine-inspiration-home` → `add-destination-area-filters` → `add-trip-publish`；三者分属不同 owner，本需求只归档自己。
- **质量自检（split-heuristics）：** 垂直切片 ✓；端到端可观察 ✓（选城市 + 日期 → 列表变化）；数据底座后可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。

---

# Impact brief 增补 — REQ-009（浏览者查看发布者公开资料）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ = 0，DoR BLOCKER = 0）
- **粒度：** 应用架构（能力 / 页面 / 集成边界），非代码设计

## 1. Requirement set

| id | 能力 | change（候选） | 条目路径 |
|---|---|---|---|
| REQ-009 | `user-profiles`（ADDED） | `add-user-profiles` | `requirement-workspace/requirements/REQ-009-publisher-profile.md` |

意图捕获：`requirement-workspace/intents/REQ-009-publisher-profile.md`。

## 2. As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec 树 | `openspec/specs/{trip-plans,trip-companions,trip-experiences,design-system}/spec.md` | 已有四业务能力；**无 `user-profiles`**；`user-auth` 仍为活动 change（未归档）。`trip-plans` 定义详情页展示发布者资料与兴趣，`trip-companions` 定义隐私红线与举报回执，`trip-experiences` 展示体验作者昵称 |
| 已归档 SDD 资产 | `openspec/changes/archive/2026-11-15-add-trip-*/`、`2026-11-16-add-paged-lists-mybatis-plus/`、`2026-11-16-apply-prototype-visual-design/` | 已归档 change 的 proposal/design/tasks/spec delta 齐全；可参考其「展示触点由新能力 spec 拥有」的先例 |
| 知识库-架构 | `docs/knowledge/architecture/README.md`（RouteME 应用拓扑 2026-11-13 起） | RouteME 分层、包结构、`X-User-Id` 演示身份与注册/登录、前端目录与设计令牌；文件顶部对 staffing 的作废声明不适用于 RouteME 段 |
| 知识库-接口 | `docs/knowledge/interfaces/README.md`（RouteME 段） | 现有 `GET /users` 返回全部账户，`GET /users/demo` 仅演示账户；已有 `/auth/*`；无单用户资料/统计接口 |
| 知识库-安全 | `docs/knowledge/rules/security/rules.md#pii-scrubbing` | 隐私字段红线（电话/证件/精确住址） |
| 契约 | `RouteME/openapi.yaml`（`info.version: 0.6.0`） | `DemoUser` 字段为 id/nickname/avatar_initial/school/bio/interests；`GET /users` 返回全部账户，`GET /users/demo` 仅演示账户；已有 `/auth/register|login|me|logout`；无 profile 端点 |
| 后端用户 | `RouteME/backend/.../DemoUserController.java`、`DemoUserResponse.java`、`UserEntity.java`、`V3__create_demo_users.sql`、`V9__add_user_credentials.sql`、`AuthServiceImpl.java` | `GET /users` 返回全部账户、`/users/demo` 仅演示账户；`app_users` 含 `created_at` 与 `username`/`password_hash`；注册账户由 `AuthServiceImpl` 创建并写入 `created_at`；`school` 当前值形如「大三 · 视觉传达」 |
| 后端聚合先例 | `RouteME/backend/.../MyTripsServiceImpl.java` | 纯聚合服务（不拥有表）消费 `TripPlanService`/`ApplicationService`，可作为统计聚合的实现参照 |
| 前端行程展示 | `RouteME/frontend/src/trips/TripCard.tsx`、`TripDetailPage.tsx`、`types.ts`、`api.ts` | 卡片展示发布者昵称/头像；详情页展示发布者简介与兴趣；均无资料弹窗；`TripCard` 整体是 `<a>` |
| 前端壳层 | `RouteME/frontend/src/shell/`、`styles.css`、`theme.ts` | 已有 Avatar、主题令牌、Ant Design `ConfigProvider`；无通用 Modal 组件（现有 `safety/ReportModal` 可参考） |
| 测试 | `backend/.../migration/DemoDataMigrationSqliteTest.java`、`AuthMigrationSqliteTest.java`；`e2e/tests/trips.spec.ts`；前端 `identity/authForm.test.ts` | 两个迁移测试均硬编码「3 个用户」（DemoData 还固定「6 条行程」）；E2E 身份门用例标题为「three demo accounts」，且断言不出现注册/找回密码入口 |

无缺失的权威树；未新造竞争性 authority root。

## 3. As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/`（Living Spec） | 无 `user-profiles` | change 归档后新增 `openspec/specs/user-profiles/spec.md`；P1/P2 阶段只产出 change delta，不直接写 Living Spec |
| `openspec/changes/add-user-profiles/` | 不存在 | 新建 change：`proposal.md` + `specs/user-profiles/spec.md`（ADDED） |
| `trip-plans`（Living Spec） | 详情页展示发布者资料；卡片展示发布者昵称 | **不新增 trip-plans delta**：资料弹窗与双入口属新能力 `user-profiles` 的展示约定；行程业务规则与接口契约不变（沿用 REQ-004「展示触点由新能力 spec 拥有」先例） |
| `trip-companions` / `trip-experiences` | 已定义隐私红线与作者展示 | checked, no direct impact —— 仅作为统计口径的只读数据源；规则不变 |
| `openapi.yaml` | 0.6.0；有 `GET /users`、`GET /users/demo` 与 `/auth/*` | 0.8.0：**复用 main 已有** `GET /users/{userId}/profile`，`UserProfile` 增加可空 `joined_at` 与 `stats`（新增 `ProfileStats`）；`DemoUser` 保持兼容不改；响应 MUST NOT 含 username/password_hash（P4 收敛修订） |
| 后端 | `DemoUserController` 仅账户列表；已有 `user-auth` 登录/注册；main 已有资料端点与资料列 | 不新建资料端点：新增 `UserProfileStatsService` 只读聚合并扩展 `UserProfileResponse`，在 main 的 `UserProfileController.profile()` 注入统计；不返回账户凭据 |
| 数据库 | main 已到 V11（V10 资料列 + V11 目的地代码）；本 change 追加 V12 | V12（只增不改）：新增 1 个非学生演示用户（「上班族 · 互联网行业 · INFP」，username/password_hash 为 NULL）与 1 条由其发布的招募中行程（用于从卡片/详情入口验收非学生资料） |
| 前端 | 卡片/详情无资料弹窗；身份门已含演示身份与注册/登录面板 | 新增资料弹窗组件与加载 hook；`TripCard` 发布者区域可点击且不触发卡片跳转；`TripDetailPage` 发布者卡片可点击；文案与样式按原型 S02 + 现有令牌；弹窗对演示会话与注册会话一致 |
| 测试 | 迁移测试固定人数/行程数；E2E 身份门标题为 three | 同步更新 `DemoDataMigrationSqliteTest` 与 `AuthMigrationSqliteTest` 的计数；E2E 身份门标题与断言补第 4 个用户；新增资料弹窗 API/组件/E2E 用例 |
| `requirement-workspace/registry.md` | 仅 REQ-001–004 | 新增 REQ-009 登记行（drafted → verified 按 Gate 推进） |
| `requirement-workspace/handoff.md` | REQ-002–004 映射 | 补 REQ-009 → `add-user-profiles` 映射 |
| `TODO.md` | 已有 REQ-001–004 业务清单 | 补 REQ-009 业务描述（业务语言，不含开发任务） |
| `docs/knowledge/` | RouteME 架构/接口段落后于新端点 | P1 不改；归档阶段回写 `interfaces/README.md` 与 `architecture/README.md` |

## 4. Blast radius（应用架构）

- **新增能力：** `user-profiles`（只读：单用户公开资料 + 四项统计）。
- **受影响页面：** 旅行灵感首页（卡片发布者区域）、行程详情页（发布者卡片）、我的旅行（复用 `TripCard` 的发布者区域）、资料弹窗（新）。
- **跨能力集成边界：** 只读消费 `trip-plans`（发布/结束行程）、`trip-companions`（已接受申请）、`trip-experiences`（作者体验），以及 `user-auth` 提供的演示/注册身份；不写任何业务状态。
- **数据所有权不变：** 用户资料与账户凭据仍归 `app_users` / `user-auth`；行程/申请/体验归各自能力；`user-profiles` 只聚合公开字段。
- **演示数据副作用：** 新增第 4 个用户与其行程会进入身份门、首页列表与匹配候选，属预期演示变更。
- **身份边界：** 沿用现有进入方式（演示 `X-User-Id` 或注册账户登录会话）；资料读取为只读，不新增权限体系。

## 5. Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | 新增 `openspec/changes/add-user-profiles/specs/user-profiles/spec.md`（双入口、展示字段、共同兴趣、统计口径、隐私边界、自我查看、异常） |
| Proposal | 新增 `proposal.md`（引用 REQ-009 与本次 impact 要点；含 effort/size 注记） |
| 契约 | `openapi.yaml` 版本 0.8.0（main 0.7.0 之上）；`UserProfile` 新增 `joined_at`/`stats`（非必填）+ `ProfileStats`；`redocly lint`/`OpenApiTest` 需通过 |
| 后端 | 扩展 main 的 controller/response；新增只读统计 service；V12 迁移；单元/控制器/迁移测试 |
| 前端 | 新增资料弹窗组件、api/types、i18n 文案、样式；卡片与详情页入口改造；组件/纯函数测试 |
| E2E | 新增卡片入口、详情入口、隐私字段缺席、自我查看用例；更新身份门标题与断言 |
| 文档 | P1 仅本 brief 与需求条目；`docs/knowledge/` 与 `interfaces/README.md` 归档阶段回写 |

## 6. Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 一个 change 只改一个能力 `user-profiles`；卡片/详情入口的展示约定写在该能力的 delta spec 中，不拆 trip-plans delta。
- **Agile 轨（可选）：** 可作为单条故事「浏览者查看发布者公开资料」；若需拆分，建议按入口（卡片 / 详情）拆两条，但共用同一弹窗与接口，不建议拆成前后端水平切片。
- 两轨共用 REQ-009 与本节 impact。

## 7. Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 新增演示用户/行程会改变种子数据计数 | `ProfileMigrationSqliteTest`（V1–V12、4 个账号）与 E2E 身份门标题需同批更新；避免只改迁移导致 CI 红 |
| Risk | 公开资料容易误带账户凭据 | 响应与弹窗均只使用公开字段；`username`/`password_hash`/会话令牌不得出现在 profile 契约与 UI 中 |
| Risk | 身份模式已分叉为演示账户与注册账户 | 资料读取沿用 main 的 `X-User-Id` 约定，不新增权限体系；验收覆盖两类账户 |
| Risk | `TripCard` 整体是 `<a>`，发布者区域内嵌交互元素 | 需重构卡片点击结构，避免嵌套 `<a>/<button>`；发布者点击必须阻止卡片跳转，并保留键盘可达性 |
| Risk | 统计为请求时实时聚合 | MVP 数据量小可接受；不引入缓存，避免与行程/申请/体验状态不一致 |
| Risk | 隐私文案与原型原文不一致 | 已确认按实际展示字段调整；验收时以调整后的文案为准，原型原文不作为实现依据 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0；无使需求失效的未知依赖 |

## 8. Suggested split boundaries（供 proposal-split / story-split）

- **一 REQ 一 change 一 capability：** `add-user-profiles` ← REQ-009（`user-profiles`）。
- **依赖 / 阶段排序：** 无上游新依赖；与后续 change 的共享文件冲突点是 `TripCard.tsx` 与 `styles.css`，排期时避免并行修改同一文件。
- **契约优先：** 先冻结「在 main 的 `UserProfile` 上新增 `joined_at` + 四项统计」（不改变必填字段），再并行后端聚合与前端弹窗。
- **P4 收敛修订（2026-11-16）：** main 已落地同名资料端点，按用户裁决改为「复用 main 接口 + 扩展统计/加入时间」；迁移版号顺延至 V12（V10 = 资料列、V11 = 目的地代码）。
- **质量自检（split-heuristics）：** 垂直切片、端到端可验证（卡片入口 → 弹窗 → 关闭）、可独立运行、capability 名真实、无依赖环。

---

## 14. REQ-010 变更影响 — 提交同行申请（S08）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（4 项范围问题已由用户裁决，blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（页面 / 申请展示 / 能力边界），非代码设计
- **基线：** `origin/main@b93f45b` 的独立 worktree `feature/refine-trip-application`

### 14.1 Requirement set

- `requirement-workspace/requirements/REQ-010-trip-application-entry.md`（六字段 + 8 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-010-trip-application-entry.md`
- 能力：`trip-companions`（MODIFIED）；`trip-plans` 只读消费。

### 14.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-010-trip-application-entry.md` | 本变更新增；8 场景；用户裁决 D1–D4；DoR / A0 全过 |
| Living Spec | `openspec/specs/trip-companions/spec.md` | 「提交与取消同行申请」已含招募中 / 未满员 / 选填 ≤120 / 本人 / 重复 / 满员 / 已结束 / 取消 5 场景 |
| 已归档 change | `openspec/changes/archive/2026-11-15-add-trip-companions/` | 申请、接受、退出、聊天与我的旅行的原始实现与验收 |
| 行程详情页 | `RouteME/frontend/src/trips/TripDetailPage.tsx` | 申请入口是 `Modal` + textarea；提交后独立 `application-status` Tag；不可申请显示 badge |
| 文案 | `RouteME/frontend/src/i18n/tripMessages.ts` | `applyDialogTitle` / `applyMessageLabel（选填）` / `applySubmit（提交申请）` / `applyStatusPending（申请待处理）`；无重复申请文案 |
| API 错误 | `RouteME/frontend/src/api.ts` | 非 2xx 只抛 `Error(body.code)`；无错误码 → 中文文案映射 |
| 后端规则 | `ApplicationServiceImpl.apply` | 本人 403；重复 409 `DUPLICATE_APPLICATION`；非 recruiting 409 `TRIP_NOT_OPEN`；说明 trim 后空转 null，≤120 |
| 后端测试 | `ApplicationServiceTest` / `ApplicationControllerTest` | 已覆盖满员拒新申请、重复、本人、重申请 |
| 契约 | `RouteME/openapi.yaml` 0.7.0 | `ApplicationCreateRequest.message` nullable ≤120；`TripApplication.message` nullable ≤120；错误码已定义 |
| 原型 | `docs/prototype/ui.js` `actionBox`；`store.js` `canApply`；`styles.css` | 内联申请表单；待处理提示 + 撤回；不可申请原因；`apply-form` 样式 |
| 前端/E2E 测试 | `frontend/src/**/*.test.ts(x)`；`e2e/tests/companions.spec.ts` | E2E 走弹窗路径：点「申请同行」→ 填 placeholder → 点「提交申请」→ 断言「申请待处理」 |
| 阶段记录 | `docs/sdd/README.md` | 阶段索引；尚无 `refine-trip-application` 行 |

### 14.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 详情页申请入口 | 弹窗表单 | 原型内联申请区：一句申请说明（选填，120 字）、提交按钮、聊天权限说明 |
| 详情页待处理态 | 独立 Tag「申请待处理」+ 说明 + 取消按钮 | 原型等待提示「申请已提交，等待 {昵称} 回应。处理前你可以随时撤回。」+「撤回申请」；说明与状态不再重复展示 |
| 重复申请反馈 | `Alert` 显示 `DUPLICATE_APPLICATION` | 映射为「已申请，请等待回应」，并刷新为待处理 / 已匹配 |
| 满员 / 已结束入口 | badge「当前不可申请」/「这条行程已结束」 | 原型原因文案「人数已满」/「行程已结束」；后端拒绝不变 |
| 本人行程 | 不展示申请按钮 + badge「这是你发布的行程」 | 保持不展示；发布者操作不变（不新增/删除按钮） |
| 说明字段 | 选填 ≤120 | **不变**（用户裁决 D1） |
| 后端 / 契约 / 迁移 | 规则与错误码已存在 | **不变**；保留回归测试；不改 `openapi.yaml` 版本 |
| Living Spec | 「提交与取消同行申请」5 场景 | MODIFIED：保留 5 场景，新增入口状态与待处理展示场景 |
| 原型 | 内联表单与待处理态 | **不改**；重复提示属于服务端错误映射，原型仅 mock 侧门禁文案 |
| E2E | 弹窗路径与「申请待处理」断言 | 改为内联申请区、说明选填、待处理提示与撤回；补重复 / 满员后端拒绝断言 |
| 阶段记录 | 无本 change 行 | `docs/sdd/refine-trip-application/p1-intent.md` 与 README 索引行 |

### 14.4 Blast radius（应用架构）

- **页面（1）：** 行程详情页的申请操作区；首页卡片、我的旅行、聊天不改。
- **能力（1）：** `trip-companions`（MODIFIED「提交与取消同行申请」）；`trip-plans` 只读消费状态。
- **接口契约（0）：** 无新增端点 / 字段 / 错误码 / 版本变更。
- **数据 / 迁移（0）：** 无新表、无迁移、无状态列。
- **测试触点：** 前端组件测试（入口派生、说明选填、错误映射、待处理态）；E2E `companions.spec.ts`（提交 → 待处理 → 发布者接受；满员 / 结束拒新申请）；后端回归 `ApplicationServiceTest`（不改实现）。
- **知识库：** P1 不改 `docs/knowledge/`；归档时回写申请入口与展示口径。

### 14.5 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | `openspec/changes/refine-trip-application/specs/trip-companions/spec.md`（MODIFIED，1 条 Requirement，保留 5 场景 + 新增入口 / 待处理场景） |
| Proposal | `openspec/changes/refine-trip-application/proposal.md` |
| Story | 不新增故事文件：原型 `stories.html` S08 已存在；本 change 以 proposal + delta 承接（与 REQ-006 同口径） |
| Registry / handoff | 新增 REQ-010 行与 REQ-010 → `refine-trip-application` 映射 |
| Tests / 代码 / design / tasks | 不在 P1 范围；交 P3 / P4 起 |
| Living Spec | 归档时用 MODIFIED 替换 `openspec/specs/trip-companions/spec.md` 的「提交与取消同行申请」块 |
| 阶段记录 | `docs/sdd/refine-trip-application/p1-intent.md`；`docs/sdd/README.md` 索引 |

### 14.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 单 change `refine-trip-application`，一份 `trip-companions` delta；不拆内部 change。
- **Agile 轨：** 原型故事 S08（迭代 2 / 2 点）即本 change 的业务口径；不另建故事文件，避免与原型故事双维护。

### 14.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 重复申请与满员错误码的优先级 | 后端先判重复再判非 recruiting；前端需分别映射 `DUPLICATE_APPLICATION` 与 `TRIP_NOT_OPEN`，不能只写一个分支 |
| Risk | 页面停留期间状态变化 | 前端 `canApply` 是渲染时快照；提交失败后必须 `reload()` 行程并刷新申请状态，场景 8 验收 |
| Risk | E2E 选择器变化 | 弹窗路径改为内联表单，需同步更新 `companions.spec.ts` 的按钮 / placeholder / 状态断言 |
| Risk | 选填说明的空白处理 | 前端 trim 后空 → `null`；保留后端 `normalizeMessage`，不新增必填校验 |
| Risk | 文案与原型的一个「请」字差异 | 用户 AC 指定「已申请，请等待回应」；原型 `store.js` 的「已申请，等待回应」是 mock 侧门禁，页面不展示该字符串，不构成视觉差异 |
| Risk | 阶段提交与 `@rule:git-commit-conventions` 冲突 | 用户当次明确要求「每个阶段一次提交，P4 后推送，push 前先 pull」；以用户指示为准，按 `docs/sdd/README.md` 的 `<type>(p<N>)` 提交，偏离在交付说明记录 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过；无外部依赖 |

### 14.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `refine-trip-application` ← REQ-010（S08，页面级垂直切片）。
- **不拆故事：** 原型 S08 已提供 AC；再拆会与原型故事列表双维护。
- **不并入 `add-trip-companions`：** 该 change 已归档；本需求只是展示与反馈增量，追加归档包会打乱历史边界。
- **不并入 `add-user-profiles`：** 本 change 基于 `origin/main`，不依赖未合并的资料弹窗；避免两个 PR 相互堆叠。
- **阶段：** 单阶段；依赖已归档的 `trip-companions`，无阻塞上游。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（打开详情 → 留一句话 → 提交 → 待处理 → 撤回）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。
# Impact brief 增补 — REQ-011（S15 结束行程）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ = 0，DoR BLOCKER = 0）
- **粒度：** 应用架构（能力 / 页面 / 集成边界），非代码设计

## 1. Requirement set

| id | 能力 | change（候选） | 条目路径 |
|---|---|---|---|
| REQ-011 | `trip-plans`（MODIFIED + ADDED）、`trip-companions`（MODIFIED） | `add-trip-completion` | `requirement-workspace/requirements/REQ-011-trip-completion.md` |

意图捕获：`requirement-workspace/intents/REQ-011-trip-completion.md`。

## 2. As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| Living Spec — 行程 | `openspec/specs/trip-plans/spec.md` | 「发布者结束自己的行程」只规定发布者可结束未结束行程；状态只有招募中/已满员/已结束；发布成功后状态为招募中；无日期驱动、无提醒 |
| Living Spec — 同行 | `openspec/specs/trip-companions/spec.md` | 「提交与取消同行申请」限定招募中且未满员；「处理申请」未写满员后拒绝；「匹配后的一对一文字沟通」已定义已结束只读 |
| Living Spec — 体验 | `openspec/specs/trip-experiences/spec.md` | 已结束 + 发布者/已接受同行者可发表体验；未参加拒绝 |
| 后端状态模型 | `RouteME/backend/.../pojo/TripPlan.java`、`enums/TripStatusEnum.java` | 仅三态；`status()` 只看 `completedAt` 与人数，不看日期 |
| 后端结束逻辑 | `RouteME/backend/.../service/impl/TripPlanServiceImpl.java` | 仅校验非 COMPLETED；未取消待处理申请 |
| 后端申请逻辑 | `RouteME/backend/.../service/impl/ApplicationServiceImpl.java` | `apply` / `decide` 未覆盖 ONGOING；`decide` 未校验行程是否已结束；满员依赖 `addCompanion` 的 RECRUITING 校验间接拦截 |
| 后端聚合 | `RouteME/backend/.../service/impl/MyTripsServiceImpl.java` | 已匹配与已完成分组按 `completedAt` 判断；无自动完成口径 |
| 后端统计 | `RouteME/backend/.../service/impl/UserProfileStatsServiceImpl.java` | 已完成 = `completedAt != null` 计数 |
| 后端聊天 | `RouteME/backend/.../service/impl/ChatServiceImpl.java` | 已结束发送抛 `CHAT_READ_ONLY` |
| 后端体验 | `RouteME/backend/.../service/impl/ExperienceServiceImpl.java` | 已校验 COMPLETED + 参与者 |
| 查询过滤 | `RouteME/backend/.../mapper/TripPlanMapper.xml` | `WHERE completed_at IS NULL`；日期已过仍出现在首页 |
| 前端卡片 | `RouteME/frontend/src/trips/TripCard.tsx`、`tripStatus.ts`、`StatusBadge.tsx` | 三态徽标；无结束入口 |
| 前端详情 | `RouteME/frontend/src/trips/TripDetailPage.tsx` | `isPublisher && !isCompleted` 显示「标记为已结束」+ 二次确认 Modal |
| 前端我的旅行 | `RouteME/frontend/src/mine/MyTripsPage.tsx` | 四分组；无结束入口；已完成组只有体验入口 |
| 前端聊天 | `RouteME/frontend/src/chat/ChatPage.tsx`、`i18n/tripMessages.ts` | 已只读提示「行程已结束，聊天只能查看历史消息。」 |
| 契约 | `RouteME/openapi.yaml`（TripSummary.status / TripDetail.status / `/trips/{tripId}/complete`） | `enum: [recruiting, full, completed]`；complete 已声明 403/409 |
| 测试 | `backend/.../TripPlanServicePersistenceTest.java`、`ChatControllerTest.java`、`OpenApiTest.java`；`e2e/tests/trips.spec.ts` | 现有断言基于三态；E2E 已有结束行程用例 |

无缺失的权威树；未新造竞争性 authority root。

## 3. As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| `openspec/specs/`（Living Spec） | 三态行程 | change 归档后 `trip-plans` 为四态；`trip-companions` 扩展申请资格与自动取消；P1/P2 只产出 change delta |
| `openspec/changes/add-trip-completion/` | 不存在 | 新建：`proposal.md` + `specs/trip-plans/spec.md`（MODIFIED + ADDED）+ `specs/trip-companions/spec.md`（MODIFIED） |
| `trip-plans`（Living Spec） | 三态；结束限「未结束」；发布后招募中 | 四态与优先级；日期自动流转；结束限旅行中；发布校验今天；提醒；列表口径；我的旅行/统计口径 |
| `trip-companions`（Living Spec） | 申请限招募中且未满员；处理未写满员分支 | 未结束且未满员可申请/接受（含旅行中）；满员后新申请拒绝、既有申请可拒绝不可接受；结束后待处理自动取消且处理关闭；聊天提示补「该行程已结束」 |
| `trip-experiences` | 已结束 + 参加者可分享 | checked, no rule change —— 自动完成与手动结束同等适用（回归） |
| `openapi.yaml` | 三态枚举 | `status` 新增 `ongoing`；`/trips/{tripId}/complete` 补充「仅 ongoing」描述；错误码不变（`TRIP_NOT_OPEN` 409 / `FORBIDDEN` 403）；契约版本递增 |
| 后端状态与流转 | `TripPlan.status()` 只看完成时间与人数 | 引入日期推导（含自动完成口径）；结束校验改为仅 ONGOING；发布校验 `startDate >= today`；结束事务批量取消待处理申请 |
| 后端聚合与统计 | 只认 `completedAt` | 已匹配/已完成分组与「已完成」统计改用统一的「已结束」判定（含自动完成） |
| 后端查询 | `completed_at IS NULL` | 未结束列表排除到期自动完成；仍包含 ONGOING |
| 后端申请 | `apply` / `decide` 未覆盖新四态 | 申请与接受改为「未结束且未满员」；满员后接受拒绝、拒绝允许；结束后全部关闭；结束触发批量取消 |
| 前端状态展示 | 三态文案与颜色 | 新增「旅行中」文案与徽标色；满员的旅行中显示旅行中 |
| 前端结束入口 | 仅详情页「标记为已结束」 | 我的旅行-我发布的 ONGOING 卡片 + 详情页；统一「结束行程」；二次确认文案补「申请关闭 / 待处理自动取消 / 不可恢复」 |
| 前端提醒 | 无 | 我的旅行 + 详情页向发布者与已接受同行者展示「行程即将结束」（结束日期 21:00 起） |
| 前端申请处理 | 申请页可接受/拒绝 | 已结束只读；满员时接受置灰、拒绝可用 |
| 前端聊天 | 只读提示 | 文案对齐含「该行程已结束」 |
| 前端我的旅行 | 已完成组 | 含自动完成；仍在旅行中的行程归入我发布的/已匹配，不归已完成 |
| 测试 | 基于三态 | 四态推导（含边界 00:00/21:00）、结束权限、自动取消、列表口径、统计口径、E2E 结束入口与提醒 |
| registry / handoff / stories / TODO | 无 REQ-011 | 补 REQ-011 登记与映射、故事 S15、业务清单 |

## 4. Blast radius（应用架构）

- **受影响能力：** `trip-plans`（状态机与结束）、`trip-companions`（申请资格/处理/聊天提示）、`trip-experiences`（资格回归）、`user-profiles`（统计口径）。
- **受影响页面：** 旅行灵感首页（状态徽标/未结束列表）、行程详情页（结束入口/提醒/申请入口/体验入口）、我的旅行（结束入口/提醒/已完成分组）、同行申请页（满员与结束只读）、聊天页（只读提示）。
- **跨能力集成边界：** `trip-plans` 拥有四态与自动流转；`trip-companions` 拥有申请状态机，接收 `trip-plans` 的「已结束」触发批量取消；`trip-experiences` 与 `user-profiles` 只读消费「已结束」。
- **数据所有权不变：** 行程归 `trip-plans`；申请/聊天归 `trip-companions`；体验归 `trip-experiences`；统计为 `user-profiles` 请求时聚合。
- **共享文件热点：** `TripPlan.java`、`TripPlanServiceImpl.java`、`ApplicationServiceImpl.java`、`MyTripsServiceImpl.java`、`TripPlanMapper.xml`、`TripDetailPage.tsx`、`MyTripsPage.tsx`、`tripMessages.ts`、`openapi.yaml`，排期时避免与其他 change 并行改同一文件。

## 5. Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | `specs/trip-plans/spec.md`（MODIFIED：浏览未结束/发布/详情状态/结束；ADDED：四态自动流转、即将结束提醒）；`specs/trip-companions/spec.md`（MODIFIED：提交与取消申请、处理申请、聊天只读提示） |
| Proposal | `openspec/changes/add-trip-completion/proposal.md`（引用 REQ-011 与 S15；含 effort/size 与依赖顺序） |
| 契约 | `openapi.yaml`：`status` 增加 `ongoing`，complete 描述收紧为仅 ongoing；Redocly lint 与 OpenApiTest 需通过 |
| 后端 | 状态推导与日期边界、结束校验与批量取消、申请资格/处理分支、聚合与统计口径、列表过滤、发布日期校验；单元/控制器/迁移测试 |
| 前端 | 状态文案与徽标、两处结束入口与二次确认、即将结束提醒、申请入口与处理禁用态、聊天提示文案、我的旅行已完成口径；组件测试 |
| E2E | 添加旅行中结束用例、非 ONGOING 不可结束、二次确认取消/确认、结束后申请自动取消与处理关闭、聊天只读、体验入口、提醒窗口 |
| 文档 | P1 仅本 brief 与需求条目；`docs/knowledge/domain` 与 `interfaces/README.md` 归档阶段回写四态与 `ongoing` |

## 6. Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 一个 change `add-trip-completion`，双 capability delta（`trip-plans` + `trip-companions`）；需 SA 追认双 capability 例外（参照 REQ-005 / REQ-007 / REQ-008 先例）。
- **Agile 轨：** 单条故事 S15（故事点 1）。若需拆分，按 Happy-Sad 拆「四态与自动流转」「结束操作与善后」两条，但共用同一状态机，不建议拆前后端水平切片。
- 两轨共用 REQ-011 与本节 impact。

## 7. Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 自动完成依赖服务端时钟与时区 | 规格固定「结束日期次日 00:00 / 当日 21:00」，测试需注入固定 Clock；避免用前端时钟判定 |
| Risk | 自动完成与待处理申请批量取消的触发时机 | 若纯推导不写入，申请状态不会自动变化；P3 需选定懒写入或读时投影，并保证一致性；MVP 数据量小可接受 |
| Risk | 首页/匹配列表过滤条件变更影响既有分页与匹配排序 | 「未结束」改判为「非已结束」后需同步 `TripPlanMapper.xml` 与匹配候选；用回归用例覆盖 |
| Risk | 满员后「可拒绝不可接受」与现有 `addCompanion` 的 RECRUITING 校验冲突 | ONGOING 满员会被误判为可接受；需把接受资格改为「未结束且未满员」而非仅 RECRUITING |
| Risk | 结束入口同时落在我的旅行与详情页 | `MyTripsPage` 复用 `TripCard`，需避免卡片整体链接与按钮嵌套冲突；交互与可达性需 E2E 覆盖 |
| Risk | 状态枚举新增 `ongoing` 破坏契约测试 | `openapi.yaml`、`OpenApiTest`、前端 `TripStatus` 类型与徽标需同批更新 |
| Risk | 发布校验新增过去日期限制 | 可能使既有 E2E 使用固定过去日期的夹具失败；需改用相对日期 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0；无使需求失效的未知依赖 |

## 8. Suggested split boundaries（供 proposal-split / story-split）

- **一 REQ 一 change：** `add-trip-completion` ← REQ-011（`trip-plans` MODIFIED+ADDED + `trip-companions` MODIFIED）。
- **依赖 / 阶段排序：** 无上游新依赖；建议实施顺序 ① 状态推导与契约（四态 + 日期边界）→ ② 结束权限与批量取消 → ③ 申请资格/处理分支 → ④ 前端入口、提醒与文案 → ⑤ 列表/统计口径与回归。
- **归档顺序：** 与 `add-match-reason`（`trip-companions`）共享 capability，若同窗口归档需串行；本 change 不依赖其它未归档 change。
- **质量自检（split-heuristics）：** 垂直切片 ✓；端到端可观察 ✓（进入旅行中 → 结束 → 申请取消/聊天只读/体验入口）；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。

## 15. REQ-012 变更影响 — 同行安全提示与举报（S14）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（4 项展示口径问题已由用户裁决，blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（页面 / 安全展示 / 举报反馈），非代码设计
- **基线：** `origin/main@9ee38e1`

### 15.1 Requirement set

- `requirement-workspace/requirements/REQ-012-safety-report.md`（六字段 + 7 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-012-safety-report.md`
- 能力：`trip-companions`（MODIFIED）；`trip-plans` 只读消费。

### 15.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-012-safety-report.md` | 本变更新增；7 场景；用户裁决 D1–D4；DoR / A0 全过 |
| Living Spec | `openspec/specs/trip-companions/spec.md` | 「我的旅行聚合与最低安全能力」已含安全提示常驻、举报回执、不公开电话 / 证件 / 住址；4 场景 |
| 已归档 change | `openspec/changes/archive/2026-11-15-add-trip-companions/` | 安全提示、举报入口与回执的原始实现与验收 |
| 安全组件 | `RouteME/frontend/src/safety/SafetyNote.tsx` | `Alert` 单段 `safetyBody` + 可选举报按钮；无三条结构、无集合区域 |
| 举报弹窗 | `RouteME/frontend/src/safety/ReportModal.tsx` | 对象标注 + 四类原因 + 说明 ≤200 + 回执；缺身份保密与紧急求助说明 |
| 详情页 | `RouteME/frontend/src/trips/TripDetailPage.tsx` | 无条件渲染 `SafetyNote onReport`；已展示 `meeting_area` |
| 聊天页 | `RouteME/frontend/src/chat/ChatPage.tsx` | 渲染 `SafetyNote onReport`；已加载行程对象（含 `meeting_area`） |
| 体验页（范围外） | `RouteME/frontend/src/experiences/ShareExperiencePage.tsx` | 复用 `SafetyNote`（无举报按钮）；本需求保留其简化形态 |
| 文案 | `RouteME/frontend/src/i18n/tripMessages.ts` | `safetyTitle` / `safetyBody` / `reportSuccess`「举报已收到，我们会记录处理。」 |
| 后端 | `ReportController` / `ReportServiceImpl` / `ReportControllerTest` | `POST /api/reports` → 201 `{received:true}`；校验目标类型、目标存在与原因 |
| 契约 | `RouteME/openapi.yaml` 0.8.1 | `ReportRequest`（`target_type` ∈ trip / user，`reason` 四值，`note ≤200`）、`ReportReceipt` |
| 原型 | `docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()` | 三条安全事实、聊天安全行、举报弹窗与身份保密 / 紧急求助说明 |
| 前端 / E2E 测试 | `frontend/src/**/*.test.ts(x)`；`e2e/tests/companions.spec.ts`、`profiles.spec.ts` | companions 断言旧回执文案；profiles 断言弹窗标题与隐私词黑名单 |
| 阶段记录 | `docs/sdd/README.md` | 阶段索引；尚无 `refine-safety-report` 行 |

### 15.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 详情页安全区 | 单段 `safetyBody` | 原型三条文本列表：公共场所 + 本行程集合区域 / 告知亲友 / 不公开电话证件住址 + 拒绝转账或索要证件 |
| 聊天页安全区 | 与详情页同一段文字 | 一行同义提示：公共场所 + 集合区域（或待确认）+ 不转账不提供证件 |
| 举报入口 | 详情页与聊天页均有按钮；详情页对本人行程也显示 | 详情页「举报这条行程」仅他人行程；聊天页「举报这位用户」常驻（含只读） |
| 举报弹窗 | 对象 + 原因 + 说明 + 回执 | 增加「我们不会向对方透露你的身份」与紧急求助说明；回执文案改为「已收到，我们会处理」 |
| 举报原因 | 四类共享词表 | **不变**（用户裁决 D2） |
| 后端 / 契约 / 迁移 | 规则与错误码已存在 | **不变**；保留 `ReportControllerTest` 回归 |
| 集合区域 | 详情元数据已展示 | 安全区复用同一字段；空值回退「尚未填写 / 待确认」 |
| 体验发布页 | 复用 `SafetyNote` | **不变**：保留无举报按钮的简化提示 |
| Living Spec | 4 场景（含安全与回执） | MODIFIED：保留「我的旅行」两个场景，补三条提示 / 聊天提示 / 本人入口 / 失败重试场景 |
| E2E | 旧回执文案断言 | 改为「已收到，我们会处理」；补三条提示、本人无举报、失败重试断言 |

### 15.4 Blast radius（应用架构）

- **页面（2）：** 行程详情页、聊天页；首页、我的旅行、体验页不改。
- **能力（1）：** `trip-companions`（MODIFIED「我的旅行聚合与最低安全能力」）；`trip-plans` 只读消费集合区域。
- **接口契约（0）：** 无新增端点 / 字段 / 错误码 / 版本变更。
- **数据 / 迁移（0）：** 无新表、无迁移、无列变更。
- **测试触点：** 前端组件测试（提示三条、集合区域回退、举报入口可见性、回执态、失败保留内容）；E2E `companions.spec.ts`（举报回执）、详情页 / 聊天页提示断言；后端 `ReportControllerTest` 回归（不改实现）。
- **知识库：** P1 不改 `docs/knowledge/`；归档时回写安全提示与回执口径。

### 15.5 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（change delta） | `openspec/changes/refine-safety-report/specs/trip-companions/spec.md`（MODIFIED，1 条 Requirement，保留我的旅行 2 场景 + 安全相关 7 场景） |
| Proposal | `openspec/changes/refine-safety-report/proposal.md` |
| Story | 不新增故事文件：原型 `stories.html` S14 已存在；本 change 以 proposal + delta 承接（与 REQ-010 同口径） |
| Registry / handoff | 新增 REQ-012 行与 REQ-012 → `refine-safety-report` 映射 |
| Tests / 代码 / design / tasks | 不在 P1 范围；交 P3 / P4 起 |
| Living Spec | 归档时用 MODIFIED 替换 `openspec/specs/trip-companions/spec.md` 的「我的旅行聚合与最低安全能力」块 |
| 阶段记录 | `docs/sdd/refine-safety-report/p1-intent.md`；`docs/sdd/README.md` 索引 |

### 15.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨（主）：** 单 change `refine-safety-report`，一份 `trip-companions` delta；不拆内部 change。
- **Agile 轨：** 原型故事 S14（迭代 3 / 1 点）即本 change 的业务口径；不另建故事文件，避免与原型故事双维护。

### 15.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 回执文案变更影响既有 E2E | `companions.spec.ts` 断言旧文案，需同步改为「已收到，我们会处理」；`profiles.spec.ts` 只断言标题与隐私词 |
| Risk | 详情页 / 聊天页提示文案重复维护 | 三条文本与聊天行集中放入 `tripMessages`，组件只组装，避免两处各写一份 |
| Risk | 集合区域为空时的回退 | 统一回退文案（详情「尚未填写，出发前请在聊天中确认」/ 聊天「待确认」），由组件派生，不写死空串 |
| Risk | `SafetyNote` 被体验发布页复用 | 保留可选参数形态；体验页不传集合区域时仍渲染简化提示，不移除该调用点 |
| Risk | 本人行程隐藏举报后被误认为功能缺失 | 安全提示保留，发布者仍有结束行程 / 查看申请等操作；AC 明确「本人行程无举报入口」 |
| Risk | 举报原因词表与原型不一致 | 用户裁决 D2 明确以现有四类为准；原型分目标词表记为后续候选（non-blocking） |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过；无外部依赖 |

### 15.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `refine-safety-report` ← REQ-012（S14，页面级垂直切片）。
- **不拆故事：** 原型 S14 已提供 AC；再拆会与原型故事列表双维护。
- **不并入 `add-trip-companions`：** 该 change 已归档；本需求只是展示与反馈增量，追加归档包会打乱历史边界。
- **不并入 `refine-trip-application`：** 两者都改 `trip-companions` 的不同 Requirement 块，且该 change 已进入 G2 阶段；并行会互相拖慢归档。
- **阶段：** 单阶段；依赖已归档的 `trip-companions`，无阻塞上游。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（打开他人详情 / 聊天 → 页头找到举报 → 提交 → 拿到回执）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。

## 13. REQ-010 增量影响 — 同行消息与集合确认（2026-11-16）

### 16.1 Requirement set

REQ-010：聊天页按原型重构、聊天准入与退出语义调整、集合时间字段与三处展示、发布者维护集合信息。能力：`trip-companions`（MODIFIED）+ `trip-plans`（MODIFIED）。

### 16.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 活规格聊天 | `openspec/specs/trip-companions/spec.md`「匹配后的一对一文字沟通」「退出同行」 | 仅已匹配可进入；退出即关闭聊天 |
| 活规格行程 | `openspec/specs/trip-plans/spec.md`「发布可被他人理解的旅行计划」「查看行程详情与清晰的状态」 | 集合区域选填已有；无集合时间；无集合维护 |
| 聊天后端 | `ChatController`、`ChatServiceImpl`、`ChatMessageMapper.xml` | 升序、500 字、已结束只读；`partners()` 按消息历史聚合并保留退出后的会话 |
| 退出实现 | `ApplicationServiceImpl#leave` | 申请置 `CANCELLED` 并减少人数 |
| 行程写入 | `TripController#create`、`TripPlanServiceImpl`、`TripPlan`、`TripPlanMapper.xml` | 仅创建与结束，无更新 |
| 集合区域 | `V4__seed_demo_trips.sql`、`TripCreatePage`、`TripDetailPage`、`openapi.yaml` | 已存在并在发布页与详情展示 |
| 聊天前端 | `frontend/src/chat/ChatPage.tsx`、`route.ts` | 单栏 antd；5 秒轮询；无会话列表与头部动作 |
| 我的旅行 | `MyTripsPage.tsx` | 已匹配只给聊天按钮；无集合备注 |
| 原型 | `docs/prototype/ui.js` `chat()`、`mine()`、`tripDetail()`、`tripForm()`；`styles.css` `.chat-*` | 两栏、头部动作、集合安全条、3 秒轮询；无集合时间与集合编辑入口 |
| 契约 | `openapi.yaml` `0.8.0` | `meeting_area` 已有；无 `meeting_time` 与集合更新端点；申请状态四值 |
| 测试 | `ChatControllerTest`、`e2e/tests/companions.spec.ts` | 聊天单测与 E2E 基础用例；无退出后聊天断言 |

### 16.3 As-is → proposed delta（逐资产）

| 资产 | 变更 |
|---|---|
| `trip-companions` 聊天需求 | 补会话列表、头部动作、拒绝说明、输入交互、短轮询、只读；准入改为「发布者或曾接受（含已退出）」 |
| `trip-companions` 退出需求 | 退出记录可追溯状态；不再关闭聊天；列表与统计口径不变 |
| `trip-plans` 发布需求 | 新增集合时间（选填、日期部分 ≤ 结束日期） |
| `trip-plans` 详情需求 | 补集合区域与集合时间展示，空值「待确认」 |
| `trip-plans` 新增需求 | 发布者维护集合信息（仅两字段、仅招募中/已满员） |
| 契约 | `meeting_time`、集合更新端点、申请状态 `left`；版本 `0.9.0` |
| 迁移 | `V13` 新增 `meeting_time`（可空） |
| 后端 | 准入口径、会话列表补齐（含无消息的已匹配配对）、退出状态、集合字段与更新端点、响应字段透传 |
| 前端 | 聊天两栏、我的旅行备注、详情展示与编辑入口、发布页集合时间、类型与文案 |
| 测试 | 新增/改写聊天、退出、集合字段与编辑用例 |

### 16.4 Blast radius（应用架构）

- 影响 `trip-companions` 与 `trip-plans` 两个能力，边界为「聊天只读行程、集合由行程单一写入」。
- 退出状态变化会影响：申请列表展示、`MyTripsResponse` 分组、参与同行统计、重新申请资格。确认口径：matched 与 joined 仍只认 `ACCEPTED`（`LEFT` 不计入）；`existsActive` 只拦 `PENDING`/`ACCEPTED`，`LEFT` 仍可重新申请；详情页同行者列表不含 `LEFT`；「我申请的」新增「已退出」标签。
- 聊天左栏不能只靠 `selectThreads`（只聚合消息历史）：新接受但无消息的配对不会出现，需在 `ChatServiceImpl#partners` 层合并「可沟通配对」与「历史消息会话」后去重排序。
- 聊天前端重构会复用 `ProfileModal` / `ReportModal` / `leaveTrip`，不新增权限模型。
- 集合时间进入发布链路，会触及 `TripCreateRequest` / `TripDetailResponse` / `TripPlan` / 实体与前端表单校验。

### 16.5 Artifact impact（specs / tests / docs）

- Delta Spec：`specs/trip-companions/spec.md`（MODIFIED ×2）、`specs/trip-plans/spec.md`（MODIFIED ×2 + ADDED ×1）。
- 原型：`docs/prototype/` 需先补集合时间与集合编辑入口。
- 测试：`ChatControllerTest`、新增集合字段与编辑端点 API 测试、`e2e/tests/companions.spec.ts` 扩用例；`leave` 相关断言改写。
- 文档：`docs/sdd/refine-trip-chat/` P0–P4 记录、评审报告、质量报告。

### 16.6 Dual-track notes（OpenSpec vs agile）

- OpenSpec 轨（主）：一个 change `refine-trip-chat` 改两个 capability，归档前需 SA 具名追认双 capability 例外。
- Agile 轨（可选）：按 4 条故事（S12-1～S12-4）排期，但共用同一改动集与同一验收链路，不建议拆成两个 PR。

### 16.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 退出语义与活规格冲突 | 已由用户裁决并记录（`@rule:rule-precedence`）；P2 以 MODIFIED 覆盖两条需求，归档时需 SA 追认 |
| Risk | 申请状态新增 `left` 影响既有消费方 | 契约同步、前端文案与分组同步；统计口径显式不变 |
| Risk | 集合时间引入时区歧义 | 明确为本地日期时间、无时区，服务端只校验日期部分 |
| Risk | 原型缺集合时间与编辑入口 | 先改原型再改实现（`@rule:prototype-ui-alignment`）；P3 先出预览 |
| Risk | 聊天页重构回归面大 | 保留现有后端契约不变（除准入与状态），E2E 覆盖发送→重进→可见主链路 |
| Blocker | 无 | blocking OQ = 0、DoR BLOCKER = 0 |

### 16.8 Suggested split boundaries（供 story-split）

| 故事 | 切片 | 依赖 |
|---|---|---|
| S12-1 | 聊天页重构 + 准入拒绝说明 | 无（复用既有端点） |
| S12-2 | 退出语义与状态 | 与 S12-1 共用权限判定，建议同批 |
| S12-3 | 集合时间字段与三处展示 | 契约与迁移先行 |
| S12-4 | 发布者维护集合信息 | 依赖 S12-3 的字段 |

- **契约优先：** 先冻结 `meeting_time`、集合更新端点与申请状态 `left`，再并行后端与前端。
- **共享文件冲突：** `TripDetailPage.tsx`、`styles.css`、`tripMessages.ts` 同时被 S12-1/S12-3/S12-4 触及，排期时避免多分支并行改同一文件。

## 16. REQ-015 变更影响 — 我的旅行四组聚合（S11）

### 16.1 Requirement set

- REQ-015（S11，issue #13，P0 / 迭代 2 / 2 点）：四组聚合视图 + 待处理提醒定位 + 已交付动作入口 + 重新可见时同步。
- 复用既有需求：REQ-003（四组与申请规则）、REQ-010（撤回申请）、REQ-011（结束行程）、REQ-004（体验分享入口）、REQ-008（资料卡）。

### 16.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 聚合接口 | `RouteME/backend/src/main/java/routeme/controller/MyTripsController.java`、`service/impl/MyTripsServiceImpl.java` | 四组 + 总待处理数；无按行程计数 |
| 响应 | `RouteME/backend/src/main/java/routeme/response/MyTripsResponse.java` | 5 字段 record |
| 契约 | `RouteME/openapi.yaml` `MyTrips` | required 5 字段 |
| 页面 | `RouteME/frontend/src/mine/MyTripsPage.tsx` | 裸标题 + 资料卡 + `Tabs` + `TripCard compact` |
| 样式 | `RouteME/frontend/src/styles.css` `.page-head` / `.page-sub` / `.view-seg` / `.mine-*` | 已有原型令牌与胶囊分段样式 |
| 动作 API | `RouteME/frontend/src/api.ts` | `cancelApplication` / `leaveTrip` / `completeTrip` / `loadMyExperiences` 已存在 |
| 处理申请页 | `RouteME/frontend/src/trips/ApplicationsPage.tsx` | `#/trips/{id}/applications` |
| 测试 | `MyTripsControllerTest.java`；`e2e/tests/companions.spec.ts`、`experiences.spec.ts` | 分组回归 + 页面锚点 |

### 16.3 As-is → proposed delta（逐资产）

| 资产 | 变化 |
|---|---|
| `MyTripsResponse` / `MyTripsServiceImpl` | 新增 `pendingApplications: List<PendingApplicationCount>`（`tripId`, `count`），与总数同源计算 |
| `openapi.yaml` / `OpenApiTest` | `MyTrips.pending_applications` 数组 schema；断言新增字段与结构 |
| `MyTripsPage.tsx` | 重排：`page-head` + `Segmented`（带计数）+ `.mine-row` 行式列表 + 分组空态 + 提醒定位 + 动作列 + 可见性同步 |
| `mine/mineTrips.ts`（新增） | 纯逻辑：分组计数、提醒目标、行动作可用性、日期区间 / 出发日标签；node 环境可测 |
| `i18n/tripMessages.ts` | 新增副标题、提醒、动作、空态文案；移除被替代的 `mineEmpty` 等死文案 |
| `styles.css` | `.mine-row` 改为 84px 封面 + 主列 + 动作列；`.mr-cover` / `.mr-meta` / `.mr-note`；≤640px 动作换行 |
| `e2e/tests/mine.spec.ts`（新增） | 四组与计数、提醒跳转、行内动作、重新可见同步；`companions.spec.ts` / `experiences.spec.ts` 的角色断言同批更新 |
| 文档 | `docs/knowledge/interfaces/README.md` 的 `GET /me/trips` 行补新字段 |

### 16.4 Blast radius（应用架构）

- **后端：** 只改聚合响应与服务的一处收集；不动 mapper / 表 / 状态机 / 权限校验。
- **前端：** 单页重排 + 一个纯逻辑模块 + 文案与样式；`TripCard` 的 `compact` 形态不再被本页使用（保留给其他调用点，若无调用再单独清理）。
- **契约：** 只增字段，`required` 不变；前端类型 `MyTrips` 增字段。
- **测试：** 新增 `mineTrips.test.ts`（node）与 `e2e/tests/mine.spec.ts`；更新两处既有 E2E 的角色断言。
- **不影响：** 首页、详情、聊天、体验页、资料页。

### 16.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `trip-companions` MODIFIED「我的旅行聚合与最低安全能力」，保留 4 条基线场景名并新增 8 条 |
| 长期规格 | 归档时整块替换该 Requirement |
| 契约 | `openapi.yaml` 次版本 + `OpenApiTest` |
| 单测 | `mineTrips.test.ts`（node）、`MyTripsControllerTest` 增 `pending_applications` 断言 |
| E2E | 新增 `mine.spec.ts`；`companions.spec.ts` / `experiences.spec.ts` 角色断言更新 |
| 知识库 | `interfaces/README.md` 一行 |
| 阶段记录 | `docs/sdd/refine-my-trips/p0..p4`；`docs/sdd/README.md` 索引 |

### 16.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `refine-my-trips`，一份 `trip-companions` delta；不拆内部 change。
- **Agile 轨：** 原型故事 S11（迭代 2 / 2 点）即业务口径；不另建故事文件，避免双维护。

### 16.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 分段控件角色变化破坏既有 E2E | `Segmented` 角色为 `radio`；同批更新 `companions.spec.ts` 的两处 `tab` 断言 |
| Risk | 行式列表重排丢失 `.mine-row` 锚点 | 保留 `.mine-row` 类名与行内标题文本；`experiences.spec.ts` 依赖它 |
| Risk | 待处理提醒定位错误 | 由后端返回的 `pending_applications` 选目标；无数据时退回「不渲染入口」 |
| Risk | 重新可见时重复请求 | 只在 `document.visibilityState === 'visible'` 或 `focus` 且页面挂载时触发；分组切换不请求 |
| Risk | 原型动作 > 已交付能力 | 设计明确只落地已交付动作；编辑 / 删除 / 参考发布记为 out of scope |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 门 ⑨–⑫ 通过 |

### 16.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `refine-my-trips` ← REQ-015（S11，页面级垂直切片）。
- **不并入 `add-trip-companions`：** 已归档；本需求是展示与入口增量。
- **不并入 `refine-experience-share`：** 该 change 正在 P4 收尾，共用同一页面但改动面不同；并行会互相拖慢归档。
- **阶段：** 单阶段；依赖已归档的 `trip-companions`、`trip-plans`、`trip-experiences`、`user-profile`。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（进入我的旅行 → 四段切换 → 行内动作 → 提醒跳转）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。

## 17. REQ-014 变更影响 — 参考此行程发布（S17）

- **日期：** 2026-11-16 ｜ **触发：** `/sdd:p1`（用户裁决 D1：按「已验证交付」收口，不新建 change）
- **粒度：** 应用架构（入口 / 发布页预填 / 归属边界），非代码设计
- **基线：** `main@78c782f`

### 17.1 Requirement set

- `requirement-workspace/requirements/REQ-014-reference-publish.md`（六字段 + 6 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-014-reference-publish.md`
- 能力：`trip-experiences`（已交付，只读引用）；`trip-plans`（发布页字段与校验，只读消费）。
- **Delta：无。** 本需求不新建 OpenSpec change，能力口径以 REQ-004 的 Living Spec 为权威。

### 17.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 需求条目 | `requirement-workspace/requirements/REQ-014-reference-publish.md` | 本变更新增；6 场景；用户裁决 D1–D3；DoR / A0 全过 |
| Living Spec | `openspec/specs/trip-experiences/spec.md:133-148` | 「参考此行程发布以产生新灵感」+ 2 场景（预填 / 必填不沿用） |
| Living Spec（发布规则） | `openspec/specs/trip-plans/spec.md:151-167` | 标题 / 日期 / 人数 / 途经点必填；集合区域 / 预算 / 标签 / 说明选填 |
| 已归档 change | `openspec/changes/archive/2026-11-15-add-trip-experiences/` | 参考发布入口、预填与验收的原始实现 |
| 详情页入口 | `RouteME/frontend/src/trips/TripDetailPage.tsx:409-421` | `isCompleted` 时渲染「参考此行程发布」 |
| 体验卡入口 | `RouteME/frontend/src/experiences/ExperienceCard.tsx:53-55` | 链接到 `#/trips/new?from=<tripId>` |
| 发布页预填 | `RouteME/frontend/src/trips/TripCreatePage.tsx:50-68,145-152` | 读源行程 → 覆盖 `emptyTripForm` 的 3 字段 + `capacity: ''`；展示提示条 |
| 表单模型 | `RouteME/frontend/src/trips/tripForm.ts:23-35,70-72,88-99` | `emptyTripForm` 全空（除 capacity 默认 4）；校验人数 2–12；提交不携带来源 |
| 路由 | `RouteME/frontend/src/route.ts:21-25` | `/trips/new?from=<id>` → `{ name: 'create', fromTripId }` |
| 契约 | `RouteME/frontend/src/types.ts:131-143`；`RouteME/openapi.yaml:1774+` | `TripCreateRequest` 无 source / parent / origin |
| 提示文案 | `RouteME/frontend/src/i18n/tripMessages.ts:190-192` | `referencePublish` / `referenceHint` |
| 前端测试 | `RouteME/frontend/src/route.test.ts:25-28` | 保留 `from` 参数 |
| E2E | `RouteME/e2e/tests/experiences.spec.ts:63,88-100` | 入口可见；点击 → 预填 → 必填为空 → 拦截提交 |
| 原型 | `docs/prototype/stories.html:646-659,718` | S17 故事与「接口可削减为前端预填」的边界 |
| 阶段记录 | `docs/sdd/README.md` | 阶段索引；尚无 REQ-014 行 |

### 17.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 详情页入口 | 已结束行程显示「参考此行程发布」 | **无**（满足 S17 AC #1） |
| 体验卡入口 | 体验卡提供同名链接 | **无**（满足 S17 AC #1；「体验详情」按体验卡解释） |
| 发布页预填 | 目的地 / 途经点 / 兴趣标签带入 | **无**（满足 S17 AC #2） |
| 必填字段 | 标题 / 日期 / 人数 / 集合区域为空；未补齐不可提交 | **无**（满足 S17 AC #3；集合区域沿用选填口径） |
| 归属关系 | 请求体与模型无来源字段，新计划独立 | **无**（满足 S17 AC #4） |
| 后端 / 契约 / 迁移 | 参考发布为纯前端预填，无专用接口 | **无** |
| Living Spec | 已含「参考此行程发布以产生新灵感」 | **无**（不回写、不改写） |
| E2E / 单测 | 已覆盖入口、预填、拦截与路由 | **无**（作为验证证据引用） |
| 文档 | registry / handoff / stories / SDD 索引未登记 REQ-014 | **新增登记与 P1 记录**（仅文档） |

结论：**行为、契约、数据、测试均无 delta；唯一产出是把已验证能力登记为 REQ-014。**

### 17.4 Blast radius（应用架构）

- **页面（1）：** 发布行程页（只读取证，不改）；入口页面「行程详情 / 灵感首页体验视图」不改。
- **能力（2，均不变）：** `trip-experiences`（交付方）、`trip-plans`（发布校验消费方）。
- **接口契约（0）：** 无新增端点 / 字段 / 错误码 / 版本变更。
- **数据 / 迁移（0）：** 无新表、无迁移、无列变更。
- **测试触点（0 改动）：** 现有 `route.test.ts`、`experiences.spec.ts` 作为证据引用，不需要新增或修改。
- **知识库：** P1 不改 `docs/knowledge/`。
- **风险面：** 仅文档登记；不存在运行时回归风险。

### 17.5 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（Delta） | **无**（不新建 change） |
| Proposal | **无** |
| Story | `stories.md` 新增 REQ-014 / S17 行与追溯；无独立故事文件（原型 S17 已提供 AC） |
| Registry / handoff | 新增 REQ-014 行与「无 change / 复用 `add-trip-experiences`」映射 |
| Tests / 代码 / design / tasks | **无** |
| Living Spec | **无** |
| 阶段记录 | `docs/sdd/REQ-014-reference-publish/p1-intent.md`；`docs/sdd/README.md` 索引 |
| 质量报告 | `docs/ai4se-plugins/<ts>-quality-checklist-report.md`（P1-1..P1-4 Pass；P1-5/P1-6 Skipped） |

### 17.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 不新建 change。REQ-014 指向已归档的 `add-trip-experiences`，Living Spec 是唯一权威。
- **Agile 轨：** 原型故事 S17（迭代 3 / 2 点）即业务口径；不另建故事文件，避免与原型双维护。
- **为什么不用 `refine-*` change：** 若只为措辞建 change，会产生「无行为变更的 Delta」，并与已归档能力重复；P1 允许以「已验证交付 + 证据」收口。

### 17.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 故事「体验详情」被误读为缺失页面 | 在 REQ-014 §4.1 与 P1 记录中明确「体验卡即落点」，以 Living Spec 为准；如确需详情页另开需求 |
| Risk | 故事「集合地点必须填写」与 `trip-plans` 选填冲突 | 明确验收口径为「不得沿用原行程取值」；集合区域仍选填，不以本需求改校验 |
| Risk | 被误认为「未开工」而重复实现 | registry / handoff / stories / SDD 索引均登记 REQ-014 → REQ-004 的映射与证据锚点 |
| Risk | Living Spec 与代码漂移 | 现有 E2E 与单测已覆盖关键路径；若后续改动破坏预填，回归会失败 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过；无外部依赖 |

### 17.8 Suggested split boundaries（供 proposal-split / story-split）

- **不拆 change：** 无行为变更，不产生 `openspec/changes/<id>/`。
- **不拆故事：** 原型 S17 已提供 AC；再拆会与原型故事列表双维护。
- **不并入 `add-trip-experiences`：** 该 change 已归档；追加归档包会打乱历史边界。
- **后续候选（均需另开需求）：** 独立体验详情页；集合区域改为发布必填；参考发布的来源统计。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（已结束行程 / 体验卡 → 发布页 → 预填 → 提交独立计划）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。
