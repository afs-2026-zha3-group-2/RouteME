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
