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

## 18. REQ-018（S16 增强项）变更影响 — 游后体验图片上传

### 18.1 Requirement set

- REQ-018 游后体验图片上传（Ready：`requirements/REQ-018-experience-photos.md`；意图：`intents/REQ-018-experience-photos.md`）。
- 裁决 D1–D4（2026-11-17）：两步上传 + 本地磁盘；≤6 张 / ≤5MB / 三种格式；首页卡片不变；仅体验、作者可管理。
- 裁决 D5–D8（2026-11-17）：不生成服务端缩略图（原图 + `loading="lazy"`）；上传时全部剥离 EXIF；>24 小时未绑定图片懒清理；不做自动审核（沿用举报入口）。

### 18.2 As-is asset inventory（evidence paths）

| 层 | 资产 | 现状 | 证据 |
|---|---|---|---|
| 数据库 | `trip_experiences` | 三字段，无图片 | `V8__create_trip_experiences.sql:1-13` |
| 契约 | `ExperienceWriteRequest` / `Experience` | 三字段，无图片 | `openapi.yaml:2180-2200` |
| 后端 | `ExperienceController` / `ExperienceServiceImpl.upsert` | JSON upsert，无上传端点 | `ExperienceController.java:73-77`、`ExperienceServiceImpl.java:59-63` |
| 前端 | `ShareExperiencePage` | 三面板，无上传位 | `ShareExperiencePage.tsx:178-234` |
| 前端 | `ExperienceCard` | 内置封面 | `ExperienceCard.tsx:24-29` |
| 详情 | `TripDetailPage` 体验列表 | 文字 + 作者 + 强度 | `TripDetailPage.tsx:524-535` |
| 测试 | `experiences.spec.ts` | 9 例，含「无上传入口」反向断言 | `experiences.spec.ts:238` |
| 原型 | 分享页 / 体验卡 | 无上传位，内置封面 | `ui.js:805-840`、`styles.css:942-950` |
| 先例 | 头像上传 | multipart / 魔数 / ≤2MB / 本地落盘 / 公开读取 | `openapi.yaml:215-257`、`application.yaml:24-27`、`.gitignore:45-46` |
| Living Spec | `trip-experiences` | 「纯文字 + 内置封面」展示口径 | `openspec/specs/trip-experiences/spec.md:45,59-63` |
| 未归档 change | `refine-experience-share` | 同改 `trip-experiences`，图片上传在 Out of scope | `openspec/changes/refine-experience-share/proposal.md:45,131` |

### 18.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta | 风险 / 备注 |
|---|---|---|---|
| `trip_experiences` | 三字段 | 不改表；新增 `trip_experience_photos` 子表 | 迁移号与 `add-ai-itinerary`（计划 V18）串行 |
| `openapi.yaml` | 0.11.0，体验三字段 | 新增 multipart 上传端点、图片读取端点、体验图片字段；版本在 P3 定 | 与在途 change 的 0.12.0 冲突需排号 |
| 后端 | 无上传 / 存储 | 新增上传（魔数 + EXIF 剥离）、读取、归属校验、绑定与懒清理；`ExperienceServiceImpl.upsert` 扩展 | 复用头像模式；注意事务与文件清理顺序 |
| 分享页 | 三面板 | 新增图片上传位（预览 / 删除 / 排序 / 失败重试） | 与 R2 双栏布局兼容；≤900px 单列 |
| 详情页 | 文字列表 | 新增首图缩略图 + 查看全部 | 不改行程信息与申请入口 |
| 首页卡片 | 内置封面 | **不变** | 反向验证：E2E 封面断言保持 |
| 图片查看层 | 无 | 新增浮层（上一张 / 下一张 / 关闭） | 键盘与读屏语义 |
| 原型 | 无上传位 | 先改 `prototype.html` / `ui.js` / `styles.css` | 规则要求原型先行 |
| 测试 | 反向断言无上传 | 改正向；新增上传 / 编辑 / 展示 / 权限 / 兼容用例 | E2E 依赖真实文件与隔离目录 |
| Living Spec | 纯文字 + 内置封面 | MODIFIED「游后体验的内容口径与纯文字降级」的展示口径（图片为可选增强） | 归档时与 `refine-experience-share` 串行 |

### 18.4 Blast radius（应用架构）

- 应用层：前端（分享页、详情页、图片查看层）+ 后端（体验 controller/service、文件存储、静态读取）+ 契约 + 数据库。
- 不变：`trip-plans` 行程模型与发布校验、`trip-companions` 申请 / 聊天、`user-profile` 头像端点、首页体验卡。
- 运行期：本地磁盘目录新增 `SqlLite/uploads/experience-photos/`；`uploads/` 已 gitignore，不需要新部署组件。
- 跨边界：图片读取为公开只读端点，与头像读取同模式；上传需会话。

### 18.5 Artifact impact（specs / tests / docs）

| Artifact | Impact |
|---|---|
| Living Spec | `openspec/specs/trip-experiences/spec.md` MODIFIED（展示口径 + 图片字段 / 端点） |
| Delta Spec | 新建 `openspec/changes/add-experience-photos/specs/trip-experiences/spec.md` |
| 原型 | `docs/prototype/prototype.html` / `ui.js` / `styles.css` |
| 契约 | `RouteME/openapi.yaml`（版本在 P3 定） |
| 迁移 | `V18__...` 或顺延（P3 定） |
| 前端 | `ShareExperiencePage`、`TripDetailPage`、`ExperienceCard`（不变）、`tripMessages`、`styles.css`、`types.ts`、`api.ts` |
| 后端 | 上传 / 读取 controller、service、存储组件、`ExperienceWriteRequest` / `ExperienceResponse` |
| 测试 | 后端上传校验与归属用例；前端表单 / 预览用例；E2E 上传、编辑、展示、权限、历史兼容 |
| 文档 | registry / handoff / stories / deep-dive / impact brief / SDD P1–P4 记录 |

### 18.6 Dual-track notes（OpenSpec vs agile）

- OpenSpec：新 change `add-experience-photos`（`trip-experiences` MODIFIED）。
- Agile：S16 增强项，不新开故事；原 S16 3 点不含图片，点数由 SM 在排期时确认。

### 18.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过 |
| Risk | 契约 / 迁移号撞车 | `add-ai-itinerary` 计划 0.12.0 + V18；P3 统一排号 |
| Risk | 与 `refine-experience-share` 同改 `trip-experiences` | 本 change 归档必须排在其后或与其串行 |
| Risk | 本地磁盘容量与孤儿文件 | 上限 + 清理策略；E2E 用隔离目录 |
| Risk | 图片 EXIF 含精确位置 | D6 已定上传时全部剥离；P4 用带 GPS 样本验证 |
| Risk | 孤儿文件累积 | D7 懒清理 >24h 未绑定；E2E 用隔离目录 |
| Risk | 无自动审核 | D8 不做；依赖现有举报入口与人工处理，记为残余风险 |
| Risk | 首页信息密度 | D3 明确首页卡片不变，E2E 反向验证 |
| Risk | E2E 与共享 `test-results/` | 沿用现有隔离产物目录策略 |

### 18.8 Suggested split boundaries（供 proposal-split / story-split）

- **单 change：** `add-experience-photos`（`trip-experiences` MODIFIED），不拆多个 capability。
- **单故事：** S16 增强项；不新开故事，避免与原型故事列表双维护。
- **切片建议（P3 任务顺序）：** 契约 + 迁移 → 后端上传（魔数 / EXIF）/ 读取 / 归属 / 懒清理 → 分享页上传与编辑 → 详情页展示 → 历史兼容与 E2E 回归 → 原型与文档。
- **质量自检（split-heuristics）：** 子目标一句话可说清 ✓；端到端可观察（上传 → 保存 → 详情可见 → 编辑排序）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓（仅依赖已完成的上传先例）。

## 19. REQ-019 变更影响 — 信用分账户与等级展示（信用系统迭代 1）

- **日期：** 2026-11-17 ｜ **触发：** `/sdd:p1`（用户提供 P0 故事 + 8 项裁决 D1–D8）
- **粒度：** 应用架构（数据所有权 / 注册集成点 / 个人主页展示面 / 管理端边界），非代码设计
- **基线：** `main@cf3ed76`（P1/P2 期间）→ 合并 `origin/main@77ab02b` 时发现 REQ-018 已被 `add-experience-photos` 占用，本需求按「后到者顺延」改为 **REQ-019**

### 19.1 Requirement set

- `requirement-workspace/requirements/REQ-019-credit-account.md`（Ready 条目，16 场景 C-1 ~ C-16，blocking OQ 0，DoR BLOCKER 0）
- `requirement-workspace/intents/REQ-019-credit-account.md`（意图捕获 + 证据锚点 + D1–D11）
- 新增能力：`user-credit`（ADDED）；依赖 `user-profile` / `user-profiles`（未归档，只读字段扩展）与 `user-auth`（注册集成点）
- 用户裁决：D1 0–100 五档（0–120 方案作废）/ D2 本轮只做用户端 / D3 账户表 + 账本表 / D4 本人与他人同口径、明细不展示 / D5 统一回填 80 / D6 落地记账服务 / D7 扩展个人主页响应 / D8 `add-credit-account` + `user-credit` / D9 不改 `user-auth` / D10 等级英文码 + 前端映射 / D11 零变化仍留一条 `applied_delta = 0` 记录

### 19.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 信用分实现 | 全仓 grep `信用分 / 信誉分 / credit_score / creditScore / reputation` | **0 命中**：无实现、无规格、无迁移、无原型 |
| 用户表 | `RouteME/backend/src/main/resources/db/migration/V3__create_demo_users.sql`、`V10__add_user_profile.sql` | 仅昵称 / 首字头像 / 学校 / 简介 / 兴趣 + 资料八列；无分数、无角色 |
| 注册链路 | `RouteME/backend/src/main/java/routeme/service/impl/AuthServiceImpl.java` | `register` 为 `@Transactional`；校验 → `DemoUserService.createAccount` → `issue` |
| 账号写入 | `RouteME/backend/src/main/java/routeme/service/DemoUserService.java` / `impl/DemoUserServiceImpl.java` | 注册与演示账号共用的唯一写入口 |
| 个人主页接口 | `RouteME/backend/src/main/java/routeme/controller/UserProfileController.java`、`service/impl/UserProfileServiceImpl.java`、`response/UserProfileResponse.java` | `GET /api/users/{userId}/profile`；`@JsonInclude(NON_NULL)`；本人 / 他人仅生日差异 |
| 个人主页页面 | `RouteME/frontend/src/profile/ProfilePage.tsx` | `#/users/{id}`；hero + 资料卡；单次 `loadUserProfile` |
| 前端类型 / API | `RouteME/frontend/src/types.ts`（`UserProfile`）、`RouteME/frontend/src/api.ts`（`loadUserProfile`） | 需同步新增只读字段 |
| 文案 | `RouteME/frontend/src/i18n/tripMessages.ts`（`profile*`） | 等级 / 分数文案落点 |
| 既有账号 | `V3`、`V12`（id 4 周野）、`V13`、`V14`、`V15` | 4 个演示用户 + 已注册账号，均需回填 |
| 契约 | `RouteME/openapi.yaml`（`info.version: 0.11.0`、`components.schemas.UserProfile`） | 需追加只读字段并升次版本 |
| 迁移 | `RouteME/backend/src/main/resources/db/migration` | 头为 `V17__meeting_areas.sql` |
| 管理端 | 全仓 grep `admin / 管理后台`；`app_users` 列 | **0 命中**；无角色列、无端点、无页面 |
| Living Spec | `openspec/specs/user-auth/spec.md`「注册账号」；`openspec/specs/design-system/spec.md` | 注册需求不含信用分；展示令牌可复用 |
| 未归档相关 change | `openspec/changes/add-user-profile/`（`user-profile` ADDED）、`openspec/changes/add-user-profiles/`（`user-profiles` ADDED） | 个人主页响应归属方，本需求在其上追加字段 |
| 原型 | `docs/prototype/stories.html`、`docs/prototype/discovery-cn.html` | 信用体系列为 MVP 之外 / 后续，无页面骨架 |

### 19.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 数据表 | 无信用相关表 | **新增** `user_credit_account`（每用户 1 条，`score` 0–100）+ `credit_ledger`（append-only，含前后快照与幂等键）；**不改** `app_users` |
| 历史数据 | 4 个演示用户 + 已注册账号无分数 | 迁移回填 80（全表，不只覆盖有凭据账号） |
| 注册链路 | 只建账号与会话 | 同事务内建信用账户并置 80；失败分支不落账户 |
| 个人主页接口 | 返回资料 + `joined_at` + `stats` | 追加只读信用字段（分数 + 等级），本人 / 他人同口径；非空值（破 `NON_NULL` 省略） |
| 个人主页页面 | hero + 资料卡，无信用区 | 新增信用状态展示（分数 + `/ 100` + 等级文字，不只颜色）；资料未完善仍展示 |
| 资料保存接口 | 用户可写资料字段 | 信用字段不属于可写字段；携带即忽略（无写分端点） |
| 记账能力 | 无 | 新增内部记账服务：0–100 裁断、实际生效量、前后快照、同事务写账本、幂等键唯一约束；**无业务事件调用方** |
| 契约 | 0.11.0 | 次版本 + `UserProfile` 新字段（`credit_score` + `credit_level`，等级取 `excellent` / `good` / `fair` / `low` / `risk`）；版本号与迁移号在 P3 排他确认（REQ-016 / REQ-017 已占用 V17 / V18 与 0.12.0） |
| 管理端 | 不存在 | **无 delta**（D2 推迟；AC3 / AC4 / AC6 管理端一半不在本需求） |
| Living Spec | `user-auth` 注册需求不含信用分 | 新增 `user-credit` 规格；D9 裁定不改 `user-auth`「注册账号」 |
| 原型 | 无信用分页面 | P3 需补一个原型截点（个人主页信用状态）再对齐实现 |

### 19.4 Blast radius（应用架构）

- **后端（1 个新能力 + 2 处集成）：** 新增 `user-credit` 的实体 / mapper / service / 记账服务；注册链路插入账户初始化；个人主页读取路径拼接信用字段。
- **数据（2 表 + 1 迁移）：** 账户表与流水表；回填 80；不动既有表结构与既有种子。
- **契约（1 处扩展）：** `UserProfile` 追加只读字段；无新端点。
- **前端（1 页 + 类型 + 文案）：** `ProfilePage` 展示信用状态；`types.ts` / `tripMessages.ts` 同步；无新路由、无新页面。
- **管理端（0）：** 不新增角色、端点与页面。
- **不影响：** 首页、行程、申请、聊天、体验、举报；`ProfileModal` 与他人摘要接口不变。
- **运行时风险面：** 注册事务多一次写入（同库同事务，无新依赖）；个人主页读取多一次按用户查询。

### 19.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `user-credit` **ADDED**（账户 / 初始化与回填 / 五档派生 / 展示口径 / 只读 / 账本与记账（含零变化留痕）/ 越界裁断）；无 MODIFIED、无 REMOVED |
| 长期规格 | 归档后新增 Living Spec `openspec/specs/user-credit/spec.md` |
| 契约 | `openapi.yaml` 次版本 + `UserProfile` 新字段；后端契约测试同步 |
| 后端测试 | 记账服务单测（裁断 / 快照 / 等式 / 幂等键）；注册集成测试（成功建账户 80、失败无账户）；个人主页响应断言（本人 / 他人 / 历史账号 / 资料未完善） |
| 前端测试 | 等级派生纯函数单测（五档边界）；展示串断言 |
| E2E | 注册 → 个人主页看到「80 / 100 · 信用良好」；他人视角看到同一分数；无明细入口 |
| 知识库 | `docs/knowledge/interfaces/README.md` 需登记 `GET /users/{id}/profile` 新字段 |
| 阶段记录 | `docs/sdd/add-credit-account/p1..p4`；`docs/sdd/README.md` 索引 |
| 评审 | `docs/reviews/20261117-add-credit-account-proposal-review.md`、`-spec-review.md` |

### 19.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-credit-account`，单能力 `user-credit`（ADDED）；个人主页字段扩展写在同一 Delta，不新建 `user-profile` delta（避免与未归档 change 撞块）。
- **Agile 轨：** 故事「信用分账户与等级展示」（信用系统迭代 1 / P0 / 2 点）即业务口径；不另拆多条故事（尺寸小于拆分阈值，且四件事必须同批交付才能闭环）。
- **并列轨道：** `creditscore-account` 与后续「计分事件」「管理后台」分属不同故事，本需求不预留空壳端点。

### 19.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 契约版本号撞号 | REQ-017 已声明 0.12.0；本需求升次版本前必须在 P3 按合并顺序确认 |
| Risk | 迁移号撞号 | main 头为 V17；REQ-016 声明 V17、REQ-017 声明 V18；本需求迁移号在 P3 排他确认（不预设 V18 / V19） |
| Risk | `NON_NULL` 序列化导致字段被省略 | 信用字段必须非空；实现后需断言「他人视角也含该键」 |
| Risk | 历史账号漏回填 | 回填按 `app_users` 全表，不只按有登录凭据的账号；E2E 覆盖 id 4 等无凭据账号 |
| Risk | 未归档 change 交叉 | `add-user-profile` / `add-user-profiles` 尚未归档；本需求只追加字段，不改其 Requirement 语义；归档顺序不影响本 change 通过 |
| Risk | 管理端 AC 被误认为未完成 | D2 已显式推迟；proposal / 需求 / registry 均标注推迟范围 |
| Risk | 等级英文码与前端文案不一致 | 契约固定五个码值，前端映射集中在 i18n；契约测试断言码值集合，E2E 断言展示文字 |
| Risk | 零变化记录被误当成异常数据 | Delta 明确「变更前 = 变更后、实际变化量 0」为合法记录；记账服务单测覆盖该分支 |
| Risk | 原型无骨架 | `@rule:prototype-ui-alignment`；P3 先补原型截点再实现 |
| Blocker | 无 | blocking OQ = 0；DoR BLOCKER = 0；A0 ⑨–⑫ 全过 |

### 19.8 范围扩展（2026-11-17，发起人追认）

- **背景：** 原需求只写「个人主页展示」，发起人明确「看别人时也要就近看到信用」。
- **新增展示面：** 资料弹窗（`ProfileModal`，复用 `GET /users/{id}/profile`，零后端改动）、行程详情发布者行、灵感首页行程卡发布者行、申请处理页申请者行。
- **数据获取：** 新增批量只读端点 `GET /api/users/credits?ids=...`（≤50），前端一次取数；详情页也走该端点（不用逐卡请求）。
- **不变：** 可见性口径（分数 + 等级，本人与他人一致）、明细不展示、无管理端。
- **保留边界：** 聊天页、顶栏、我的旅行资料卡仍不展示。

### 19.9 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `add-credit-account` ← REQ-019（信用系统迭代 1 / Story 1）。
- **不并入计分故事：** 赞 / 退出 / 举报 / 月度上限 / 封禁属后续故事；本 change 只交付底座与展示，不预留业务事件端点。
- **不并入管理后台：** 管理端能力不存在（无角色列、无端点、无页面），另开故事。
- **阶段：** 单阶段；无归档前置依赖（`user-credit` 全新能力），但需与 REQ-016 / REQ-017 协调契约版本与迁移号。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（注册 → 个人主页看到「80 / 100 · 信用良好」）✓；可独立运行 ✓；capability 名真实（`user-credit`）✓；无依赖环 ✓；场景 15 条 ≤ 单 change 阈值 ✓。

## 20. REQ-020 变更影响 — 灵感详情页同行者卡片化

- **日期：** 2026-11-17 ｜ **触发：** 用户当次指令（详情页同行者只展示姓名，要求与发布者一样的 card）+ D1–D4 裁决
- **粒度：** 应用架构（详情页展示面 / 同行者集合归属 / 资料弹窗复用 / 聊天入口），非代码设计
- **基线：** `origin/main@6f9cb46`（独立 worktree `.worktrees/refine-detail-companions`，分支 `feature/refine-detail-companions`）

### 20.1 Requirement set

- `requirement-workspace/requirements/REQ-020-detail-companion-cards.md`（Ready 条目，10 场景 C-1 ~ C-10，blocking OQ 0，DoR BLOCKER 0）
- `requirement-workspace/intents/REQ-020-detail-companion-cards.md`（意图捕获 + 证据锚点 + D1–D4）
- 变更能力：`trip-plans`（MODIFIED「查看行程详情与清晰的状态」）；`trip-companions` / `user-profiles` 只读消费
- 用户裁决：D1 只展示同行者（不含发布者）/ D2 卡片与发布者同构 / D3 整卡开资料 + 聊天独立入口 / D4 独立 worktree

### 20.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 详情页页面 | `RouteME/frontend/src/trips/TripDetailPage.tsx` | 发布者资料卡 `:468-496`；同行者纯姓名列表 `:498-520` |
| 资料摘要函数 | `RouteME/frontend/src/profile/profileDisplay.ts` | `publisherSummary` `:26-28`：学校 · 专业 → 职业 → 城市 → 空串 |
| 前端类型 | `RouteME/frontend/src/types.ts` | `DemoUser` `:21-30`；`TripDetail.participants` `:119-125` |
| 后端响应 | `RouteME/backend/src/main/java/routeme/response/DemoUserResponse.java`、`TripDetailResponse.java` | `participants: List<DemoUserResponse>`；字段含学校 / 专业 / 职业 / 城市 / 简介 / 兴趣 / 头像 |
| 同行者集合 | `RouteME/backend/src/main/java/routeme/service/impl/ApplicationServiceImpl.java:193-202` | 发布者在最前 + 已接受同行者；`joined_count` 含发布者 |
| 契约 | `RouteME/openapi.yaml:1890-1895` | `participants` 描述为「当前同行者」，字段不变 |
| 样式 | `RouteME/frontend/src/styles.css:1265-1268,2498-2557,2691-2707` | `.detail-participants` 两处旧规则；`.publisher-row / .publisher-button / .publisher-name / .publisher-bio / .publisher-tags` 可复用 |
| 资料弹窗 | `RouteME/frontend/src/profiles/ProfileContext.tsx:27-41`、`ProfileModal` | 全应用共用 `openProfile(userId)` |
| 头像 | `RouteME/frontend/src/shell/Avatar.tsx:12-46` | `sm / lg / xl`；图片失败回退首字 |
| 原型 | `docs/prototype/ui.js:500-520`、`docs/prototype/styles.css:712-725` | 发起人 `.host-card`；同行者 `.companion` 紧凑行（含发布者） |
| E2E | `RouteME/e2e/tests/chat-entry.spec.ts:78-84` | 依赖 `.detail-participants` 下的「聊天」链接 |
| Living Spec | `openspec/specs/trip-plans/spec.md:191-199`；`openspec/specs/trip-companions/spec.md:69-83` | 详情页展示「当前同行者」，至少含发布者；接受申请后进入同行者列表 |
| 在途 change | `openspec/changes/refine-experience-share/`、`add-experience-photos/`、`refine-trip-map/`、`add-ai-itinerary/` | 均未归档；本需求不触碰体验、地图与 AI，无档案冲突 |

### 20.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 详情页同行者区 | `ul.detail-participants` 纯姓名 + 聊天链接 | 资料卡列表：头像 + 昵称 + 摘要 + 简介 + 兴趣 + 独立聊天入口；卡片主体打开资料弹窗 |
| 发布者重复 | `participants` 含发布者，列表重复展示姓名 | 前端过滤 `trip.publisher.id`；发布者只保留上方资料卡 |
| 空态 | 只有发布者时仍展示一行姓名 | 「还没有其他同行者」空态；不展示空列表 / 发布者姓名 |
| 人数口径 | 页头 `joined_count / capacity` 含发布者 | **不变**；卡片数量 = `participants.length - 1` |
| 资料弹窗 | 发布者卡片可用 | 同行者卡片同样调用 `openProfile`；不改弹窗 |
| 聊天入口 | 列表内「聊天」链接 | 卡片内独立「聊天」链接；可见条件与路由不变 |
| 原型 | `.companion` 紧凑行（含发布者） | `compPanel` 改为「过滤发布者 + 资料卡 + 空态」；新增卡片样式 |
| 接口 / 契约 | `participants: DemoUser[]` | **零变化**；不新增字段、端点、版本 |
| 数据库 / 迁移 | 无 | **零变化** |
| Living Spec | `trip-plans` 旧展示口径 | MODIFIED「查看行程详情与清晰的状态」：发布者资料卡 + 同行者资料卡（不含发布者），人数不变 |
| 测试 | `chat-entry.spec.ts` 依赖旧选择器 | 更新选择器；新增卡片、资料弹窗、空态、聊天权限、响应式断言 |

### 20.4 Blast radius（应用架构）

- **前端（1 页 + 样式 + 文案）：** `TripDetailPage.tsx` 同行者区重构；`styles.css` 新增卡片样式；`tripMessages.ts` 新增空态文案；无新路由、无新页面。
- **原型（2 文件）：** `docs/prototype/ui.js` 的 `compPanel`；`docs/prototype/styles.css` 的同行者卡片样式。
- **后端（0）：** 不改 `TripDetailResponse` / `DemoUserResponse` / `ApplicationServiceImpl`。
- **契约 / 数据库（0）：** `openapi.yaml`、Flyway、种子数据均无 diff。
- **资料弹窗（0）：** `ProfileModal` / `ProfileContext` 只读复用，不改权限与字段。
- **测试（1 文件 + 新增）：** `chat-entry.spec.ts` 选择器；新增同行者卡片相关 E2E。
- **不影响：** 首页、发布、申请处理、聊天页、我的旅行、体验区、举报、信用分。
- **运行时风险面：** 纯渲染变化；最多多渲染若干 `Avatar` 节点，无新请求。

### 20.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `trip-plans` **MODIFIED**「查看行程详情与清晰的状态」（1 Requirement，保留基线场景并新增同行者卡片 / 空态 / 发布者不重复口径） |
| 长期规格 | 归档后替换 `openspec/specs/trip-plans/spec.md` 对应 Requirement 块 |
| 契约 | 无变化（`openapi.yaml` 零 diff） |
| 后端测试 | 无新增（后端零 diff；既有 API 回归即可） |
| 前端测试 | P3 决定是否补 `TripDetailPage` 组件单测；至少 E2E 覆盖卡片、资料弹窗、空态、聊天入口 |
| E2E | `chat-entry.spec.ts` 选择器更新；新增 `companions` 卡片路径（建议放入 `trips.spec.ts` 或新 `companion-cards.spec.ts`，P3 定） |
| 知识库 | 无需登记接口变更；如需记录展示口径，更新 `docs/knowledge/domain` 的详情页词汇（P5 判断） |
| 阶段记录 | `docs/sdd/refine-detail-companions/p1-intent.md` … `p4-verify.md`；`docs/sdd/README.md` 索引 |
| 评审 | `docs/reviews/<yyyymmdd>-refine-detail-companions-proposal-review.md`、`-spec-review.md` |

### 20.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `refine-detail-companions`，单能力 `trip-plans`（MODIFIED）；不新建 `trip-companions` delta（不改同行规则）。
- **Agile 轨：** 一个页面级垂直切片「详情页同行者卡片化」；估点由 SM 确认。
- **并列轨道：** 同行者排序、申请规则、资料编辑、信用分展示分属其它需求，本 change 不预留空壳。

### 20.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 修改 Living Spec 「至少包含发布者本人」口径 | Delta MODIFIED 明确「发布者资料卡 + 同行者列表（不含发布者）」；人数仍含发布者；P2 G1 由 IO / SA 确认 |
| Risk | `styles.css` 多人并行修改在 merge 时丢样式 | 新样式追加到文件末段；删除旧 `.detail-participants` 规则时用 grep 确认两处均已处理；merge 后抽查关键类 |
| Risk | E2E 选择器悬空 | 更新 `chat-entry.spec.ts`；新增卡片断言使用稳定的语义定位（`getByRole` / 文本），不依赖纯层级 |
| Risk | 卡片内按钮与链接嵌套导致可访问性问题 | 卡片主体用 `<button>`，聊天用并列 `<a>`；P3 设计与 P4 浏览器走查确认键盘可达 |
| Risk | 资料字段缺失导致空占位 | 按 `publisherSummary` 回退与条件渲染；E2E 覆盖空简介 / 空兴趣用户 |
| Risk | 发布者过滤后列表为空被误认为缺陷 | 明确空态文案与位置；E2E 覆盖「只有发布者」行程 |
| Risk | 响应式 / 深色主题溢出 | P4 逐屏 1440 / 1024 / 768 / 390 × 浅 / 深色走查 |
| Risk | 原型未先改 | P3 / P4 先改 `docs/prototype` 并浏览器验证，再改实现 |
| Blocker | 无 | blocking OQ = 0；DoR BLOCKER = 0；A0 ⑨–⑫ 全过 |

### 20.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `refine-detail-companions` ← REQ-020。
- **不并入同行规则：** 申请 / 接受 / 退出 / 聊天准入不变；不新建 `trip-companions` delta。
- **不并入其它展示页：** 首页行程卡、体验卡、我的旅行、申请处理页、聊天页同行者展示另开需求。
- **不并入资料能力：** `ProfileModal` 内容、资料编辑、头像上传不改。
- **阶段：** 单阶段（原型先行 → 前端实现 → E2E / 走查）；无归档前置依赖；建议与在途 `add-experience-photos` / `refine-trip-map` 的 `styles.css` 改动保持追加式合并。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（详情页看到同行者卡片并可开资料 / 聊天）✓；可独立运行 ✓；capability 名真实（`trip-plans`）✓；无依赖环 ✓；场景 10 条 ≤ 单 change 阈值 ✓。

## 21. REQ-021 变更影响 — 取消行程（issue #28）

> 编号说明：REQ-019 由 `add-credit-account` 占用、REQ-020 由并行 `refine-detail-companions` 预留；本需求顺延为 REQ-021，故事 S21。

- **日期：** 2026-11-17 ｜ **触发：** `/sdd:p1`（issue #28；用户裁决 D1：信用分不在本 change）
- **粒度：** 应用架构（状态 / 入口 / 契约 / 联动消费点），非代码设计
- **基线：** `origin/main@c1c238a`（worktree `feature/add-trip-cancel`）

### 21.1 Requirement set

- `requirement-workspace/requirements/REQ-021-trip-cancel.md`（六字段 + 20 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-021-trip-cancel.md`
- `requirement-workspace/stories/add-trip-cancel.story.md`（S21）
- 能力：`trip-cancellation`（ADDED）；`trip-plans` / `trip-companions` / `trip-experiences` / `user-profiles` 只读消费。
- **Delta：** `openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md`（ADDED，5 Requirement / 20 Scenario）。

### 21.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 状态枚举 | `RouteME/backend/src/main/java/routeme/enums/TripStatusEnum.java` | 四态，无 CANCELLED |
| 状态推导 | `RouteME/backend/src/main/java/routeme/pojo/TripPlan.java:59-70` | 由 `completedAt` / 日期 / 人数推导 |
| 行程实体 | `RouteME/backend/src/main/java/routeme/entity/TripPlanEntity.java` | 无取消字段 |
| 开放列表 SQL | `RouteME/backend/src/main/resources/mapper/TripPlanMapper.xml:13-14` | 只排 `completed_at` |
| 结束逻辑 | `RouteME/backend/src/main/java/routeme/service/impl/TripPlanServiceImpl.java:194-213` | 仅发布者 + 仅 ONGOING |
| 申请联动 | `RouteME/backend/src/main/java/routeme/service/impl/ApplicationServiceImpl.java:235` | 结束事件批量取消 PENDING |
| 聊天只读 | `RouteME/backend/src/main/java/routeme/service/impl/ChatServiceImpl.java:114` | 仅 COMPLETED |
| 我的旅行 | `RouteME/backend/src/main/java/routeme/service/impl/MyTripsServiceImpl.java:50-61` | 四组，无取消文案 |
| 统计 | `RouteME/backend/src/main/java/routeme/service/impl/UserProfileStatsServiceImpl.java:42-52` | 发布行程 = 全部 |
| 体验资格 | `RouteME/backend/src/main/java/routeme/service/impl/ExperienceServiceImpl.java:149` | 仅 COMPLETED |
| 契约 | `RouteME/openapi.yaml` v0.11.0 | 四态枚举；无取消端点 |
| 前端类型 | `RouteME/frontend/src/types.ts` | `TripStatus` 四态 |
| 详情页 | `RouteME/frontend/src/trips/TripDetailPage.tsx` | 无取消入口 |
| 我的旅行页 | `RouteME/frontend/src/mine/MyTripsPage.tsx` | 无取消入口与取消态 |
| 聊天页 | `RouteME/frontend/src/chat/ChatPage.tsx` | 仅「已结束」只读提示 |
| 原型 | `docs/prototype/ui.js:410`、`main.js:646`、`store.js:240-248` | 详情页入口 + 确认文案 + 取消 PENDING |
| 现有 E2E | `RouteME/e2e/tests/trips.spec.ts:351` | 非本人无取消按钮 |
| 阶段记录 | `docs/sdd/README.md` | 已新增 `add-trip-cancel` 行 |

### 21.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 行程状态 | 四态推导 | 新增 `cancelled`，取消标记优先于日期与人数 |
| 行程表 | 无取消列 | 新增取消时间 / 原因 / 说明三列（可空） |
| 开放列表 | 只排已结束 | 同时排已取消；分页 total 同步 |
| 取消操作 | 无 | 新增 `POST /api/trips/{id}/cancel` 与权限/状态/原因校验 |
| 详情页 | 无取消入口 | 发布者 + 招募中/已满员时显示「取消行程」 |
| 我的旅行 | 无取消入口 / 无取消态 | 我发布的行动态显示取消；两组行显示「已取消」 |
| 申请 | 取消不影响 | PENDING 自动取消；新申请 `TRIP_NOT_OPEN`；处理关闭 |
| 聊天 | 只对已结束只读 | 取消后同样只读，并提示「该行程已取消」 |
| 体验 | 只认已结束 | 不改规则；补取消回归断言 |
| 统计 | 发布行程 = 全部 | 排除已取消 |
| 契约 | 0.11.0 四态 | 0.13.0；枚举 + 取消端点 + 取消字段（按人裁剪） |
| 迁移 | head V17 | 新增 V19（V18 由在途 `add-credit-account` / `add-ai-itinerary` 占用） |
| 原型 | 详情页入口 | 新增我的旅行入口、原因选择、取消态样式（原型先行） |
| 信用分 | 无 | **无**（D1，不在本 change） |

### 21.4 Blast radius（应用架构）

- **页面（3）：** 行程详情、我的旅行、聊天页（只读提示）。
- **能力（1 新增 + 5 消费）：** `trip-cancellation`（ADDED）；`trip-plans`（状态与列表）、`trip-companions`（申请/聊天/我的旅行）、`trip-experiences`（资格只读）、`user-profiles`（统计）、`design-system`（样式令牌）。
- **接口契约（1 端点 + 1 枚举 + 3 字段 + 1 次版本）：** `status` 增加 `cancelled`；`POST /api/trips/{id}/cancel`；详情新增取消三字段（后两者按请求人裁剪）。
- **数据 / 迁移（1）：** `trip_plans` 新增三列；无新表；无索引强需求。
- **测试触点（多层）：** 后端（状态推导、取消权限、申请自动取消、聊天只读、统计、迁移）、前端（入口资格、原因校验、取消态徽标、原因可见性、聊天提示）、E2E（详情与我的旅行两条取消主路径）。
- **知识库：** P4 后回写行程生命周期 / 申请 / 聊天的取消语义。
- **风险面：** 取消态与「旅行中」的优先级、可见性裁剪、迁移/契约号段冲突。

### 21.5 Artifact impact（specs / tests / docs）

| 类型 | 影响 |
|---|---|
| Spec（Delta） | `trip-cancellation` ADDED（5 Requirement / 20 Scenario）；不改 `trip-plans` / `trip-companions` 既有块 |
| Proposal | `openspec/changes/add-trip-cancel/proposal.md`（D1–D6 + 影响面 + 残余风险） |
| Story | `stories.md` 新增 REQ-021 / S21 段与追溯；新增 `stories/add-trip-cancel.story.md` |
| Registry / handoff | 新增 REQ-021 行与 change 映射；记录编号顺延原因 |
| Tests / 代码 | P4 实现：迁移 + 端点 + 状态推导 + 列表/申请/聊天/统计联动；前端入口与展示；E2E 新增取消主路径 |
| Living Spec | 归档时新能力并入 `openspec/specs/trip-cancellation/`；既有 Living Spec 不改写 |
| 阶段记录 | `docs/sdd/add-trip-cancel/p0-baseline.md`、`p1-intent.md`；`docs/sdd/README.md` 索引 |
| 质量报告 | `docs/ai4se-plugins/<ts>-quality-checklist-report.md`（P1 DoV） |

### 21.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 新能力 `trip-cancellation` 单 capability，归档不替换任何既有 Requirement 块；不与未归档的 `add-trip-completion` / `refine-trip-application` / `refine-trip-chat` 争同一块。
- **Agile 轨：** S21（迭代 2 / P0 / 3 点）；#28 的信用分相关 AC 拆到后续 story，不在本故事验收。
- **契约 / 迁移串行：** 本 change 暂定 0.13.0 + V19；若 `add-ai-itinerary` 或 `add-experience-photos` 先落地，版本号顺延，不改验收语义。

### 21.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 取消原因按请求人裁剪 | 详情接口需读取请求人身份；缓存与摘要复用时要避免泄漏；P3 设计明确字段裁剪边界 |
| Risk | 取消态与在途状态变更叠加 | `add-trip-completion` 未归档；新能力不改写其 Requirement 块，但代码需在同一状态推导中组合；P4 回归覆盖四态 + 取消 |
| Risk | 契约 / 迁移编号冲突 | V18 由在途 `add-credit-account` / `add-ai-itinerary` 占用；本 change 定为 0.13.0 + V19，已复核并串行 |
| Risk | 我的旅行入口超出原型 | 按 `prototype-ui-alignment` 先改原型，再改实现；原型变更纳入 P3 / P4 证据 |
| Risk | #28 信用分 AC 未交付被误判为漏做 | 在 proposal / registry / stories 中显式记录 D1（属其他 story），本 change 不主张相关 AC |
| Risk | 取消行程仍出现在「到期物化」扫描 | 取消优先于日期推导；列表与物化查询都需排除取消，P4 用回归固定 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过；无外部依赖 |

### 21.8 Suggested split boundaries（供 proposal-split / story-split）

- **不拆 change：** 取消状态机与取消善后必须同批交付，否则验收无法闭环。
- **不拆故事：** S21 一条故事覆盖两个入口与一次状态迁移；拆开会造成同一状态被两条故事重复验收。
- **后续候选（均需另开需求）：** 信用分与信用记录、免扣分申请与管理员审核、删除行程、恢复/重新开启、取消原因申诉。

## 22. REQ-022 变更影响 — 目的地天气与出行提醒（迭代 2 / P1）

### 22.1 as-is 盘点

| 位置 | 现状 |
|---|---|
| 后端天气 | 无 Open-Meteo 调用、无天气配置、无天气端点（全仓 grep 仅命中「天气或不可抗力原因」文案） |
| 前端发布页 | `TripCreatePage` 侧栏只有预览卡与安全提示 |
| 前端详情页 | `TripDetailPage` 只有标题 / 状态 / 日期 / 路线 / 集合 / 同行 |
| 行程数据 | 只有 `destination_code` / `destination`，无坐标；支持 375 城市 |
| 地图底座 | 高德 JS API 选点（途经点 / 集合点）+ 后端 `/_AMapService` 代理（白名单含 `v3/geocode/geo`） |
| 契约 / 迁移 | `openapi.yaml` 0.13.0；迁移最新 V19（V20 / V21 已被在途 change 预约） |

### 22.2 delta

| 层 | 变更 |
|---|---|
| 能力 | 新增 `trip-weather`（6 Requirement / 28 Scenario） |
| 后端 | `GET /api/weather/forecast`（Open-Meteo 代理）+ 坐标解析缓存 + 提醒纯函数 + 上游错误归一 |
| 前端 | 共享 `WeatherCard`（五态）+ 发布页侧栏 + 详情页信息区 |
| 契约 | 0.16.0：新增天气路径与 3 个 schema |
| 数据 | 无迁移 |
| 文案 | 天气字段标签、五态提示、四类提醒与平稳提示 |

### 22.3 blast radius

| 受影响 | 影响方式 |
|---|---|
| `TripCreatePage` | 侧栏新增卡片；表单校验与提交逻辑不变 |
| `TripDetailPage` | 信息区新增区块；既有地图 / 路线 / 同行区块不变 |
| `api.ts` / `types.ts` | 新增函数与类型，不改既有函数签名 |
| `openapi.yaml` / `OpenApiTest` | 新增路径与 schema；版本递增 |
| `application.yaml` | 新增 `routeme.weather.base-url`（默认正式环境，可被环境变量覆盖） |
| E2E | 新增 `weather.spec.ts`；用 `page.route` 拦截，不影响其它用例 |

### 22.4 风险

| 类型 | 说明 | 缓解 |
|---|---|---|
| Risk | 与在途 `add-ai-itinerary` 的天气代理重复 | D1 定本 change 为权威；合并时 AI 侧改为复用；PR 描述显式记录 |
| Risk | 城市中心坐标对山区 / 海岛精度不足 | 只承诺城市级判断；Delta 不承诺点位级 |
| Risk | 上游网络不稳定 / 额度限制 | 失败不阻断业务；前端可重试；CI 不依赖真实上游 |
| Risk | 日期越界被误当作错误 | 200 + `available:false` + `reason`，前端单独提示 |
| Risk | 契约号段冲突（0.14.0 / 0.15.0 已被预约） | 取 0.16.0；P4 定稿前复核 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0 |

### 22.5 Suggested split boundaries

- **不拆 change：** 后端天气 + 提醒规则 + 两页展示必须同批交付，否则「有数据没展示」或「有展示没数据」都不可验收。
- **不拆故事：** S22 覆盖「选目的地与日期 → 看天气 → 看提醒」一条闭环。
- **后续候选（另开需求）：** 多日逐天 / 逐小时预报、天气参与 AI 推荐、天气预警推送、精确到点位的天气。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（选目的地 → 看到真实天气与具体提醒）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（发布者取消 → 首页下架 / 申请关闭 / 聊天只读 / 我的旅行保留）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓。

## 28. REQ-032 变更影响 — 实时通知中心与未读计数（迭代 3 / P0）

### 28.1 as-is 盘点

| 位置 | 现状 |
|---|---|
| 后端通知 | 无通知表、无通知服务、无推送通道；`routeme/mq/` 只有 `.gitkeep`；无 `@EnableScheduling` |
| 后端事件源 | 行程（满员 / ONGOING / 取消 / 完成）、申请（到达 / 接受 / 拒绝 / 关闭）、聊天、信用变动、举报（提交 / 处理中 / 完成）、账号状态、客服会话、身份资料完成 |
| 前端壳层 | `AppShell` 顶栏只有品牌与账号入口（主题切换已由 `main` 移除）；侧栏分组、账号菜单、≤900 px 底部 tab；无铃铛 / 徽标 / 面板 / 通知中心 |
| 前端聊天 | `ChatPage` 打开会话后每 3 秒轮询**当前会话**；`ChatList` 只显示最后一条消息与消息总数，无未读 |
| 前端申请 | 发布者需打开 `#/trips/{id}/applications` 才能看到新申请；申请者需重开 `#/mine` 才能看到裁决 |
| 契约 / 迁移 | `openapi.yaml` 0.24.0（合并 main 后）；迁移最新 `V29__credit_exit_application.sql` |
| 身份 | 用户端点用 `X-User-Id`；`EventSource` 不能带自定义头 |

### 28.2 delta

| 层 | 变更 |
|---|---|
| 能力 | 新增 `notifications`（ADDED：8 Requirement / 36 Scenario） |
| 后端 | `NotificationService`（写 / 列表 / 计数 / 已读范围 / 去重）+ `NotificationStreamService`（按用户的 `SseEmitter` 注册表 + 心跳）+ `NotificationController`；八类生产方各追加一次通知调用；`NotificationLifecycleService` 惰性物化 ONGOING 与安全提醒 |
| 前端 | `notifications/` 纯模型 + 提供者 + `EventSource` 生命周期 + 铃铛 / 面板 + 通知中心页；`AppShell` 通知入口与聊天徽标；`ChatPage` 打开即清未读 + 推送追加；`ChatList` 会话级未读；信用记录页与举报详情页承接跳转 |
| 契约 | 0.29.0：新增列表 / 流 / 单条已读 / 范围已读 4 条路径与 8 类枚举、目标、优先级、`by_type`、`/reports/mine` |
| 数据 | 新增 `notifications` 表（`V33__add_notifications.sql`），索引 `(recipient_id, created_at)` 与 `(recipient_id, read_at)`，`(recipient_id, dedupe_key)` 唯一 |
| 文案 | 22 个事件的标题与正文由 `NotificationTextUtils` 统一生成；面板 / 通知中心空态、筛选、全部已读、不可用提示、类型标签 |

### 28.3 blast radius

| 受影响 | 影响方式 |
|---|---|
| `ApplicationServiceImpl` | 申请 / 裁决 / 取消 / 完成路径追加通知；状态机、异常与事务边界不变 |
| `ChatServiceImpl` | 仅对非自消息追加通知；准入与只读规则不变 |
| `TripController` | 读取详情时惰性物化 `trip_ongoing` + `safety_reminder`；详情响应不变 |
| `AccountStatusService` | 暂停 / 封禁 / 恢复后追加通知；用 `ObjectProvider` 避免循环依赖 |
| `ReportServiceImpl` / `AdminReportServiceImpl` | 提交、处理中、处理完成三段通知；只读安全字段 |
| `CustomerServiceImpl` / `UserProfileServiceImpl` / `CreditChangedEvent` 监听 | 客服三段、身份认证、信用变动与恢复 |
| `AppShell` | 顶栏铃铛、侧栏「通知中心」、账号菜单与聊天入口数字徽标；底部 tab 同口径 |
| `ChatPage` / `ChatList` | 新增打开即读与推送追加；3 秒轮询保留为兜底 |
| `openapi.yaml` / `OpenApiTest` | 新增路径与 schema；版本递增到 0.29.0 |
| 迁移 | 新表；H2 与 SQLite 双引擎需同时通过 |
| E2E | `notifications.spec.ts` 13 条（M1–M10 + N1–N3）与 `notifications-walkthrough.spec.ts` 4 条（V1–V4） |

### 28.4 风险

| 类型 | 说明 | 缓解 |
|---|---|---|
| Risk | 开发代理 / 生产反代缓冲 SSE，延迟或收不到 | 响应头禁缓冲（`X-Accel-Buffering: no`、`Cache-Control: no-cache`）+ ~20 s 心跳；P4 经 dev proxy 实测 |
| Risk | 后端重启丢失内存中的 emitter | 单进程 demo 可接受；客户端每次 `open` 重新走 REST 对账（D3） |
| Risk | 通知失败连带业务回滚 | D6：通知只是附属动作；`notify*` 内部捕获 + `log.warn` |
| Risk | 自消息产生无意义通知 | `requireAccess` 允许自消息，需显式守卫（S33-36） |
| Risk | 八类计数漂移 | 同一前端 store + 同一响应 / 事件载荷派生；纯函数单测覆盖 reducer |
| Risk | 重复事件刷屏 | `(recipient_id, dedupe_key)` 唯一 + 先查后插 + `DuplicateKeyException` 兜底 |
| Risk | 已读后旧快照复活计数 | `lastReadSeq` 护栏：标读后到达的在途快照只合并条目、不采用计数 |
| Risk | 关联对象失效导致死链 | 后端 `related_available` + 前端提示「相关内容当前不可查看」，不跳转 |
| Risk | 管理员备注 / 他人隐私进入通知 | 文案只使用结构化事实；封禁只展示原因码标签与恢复时间 |
| Risk | 查询参数身份可伪造 | 与既有 `X-User-Id` 同等暴露；记录为真实认证 change 的输入 |
| Risk | 契约 / 迁移号段与并行 change 冲突 | 取 0.29.0 / `V33__add_notifications.sql`，P3 排他确认并在 `design.md` 复述 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0 |

### 28.5 Suggested split boundaries

- **不拆 change：** 八类记录 + 推送 + 计数 + 通知中心必须同批交付，否则「有推送没计数」或「有计数没入口」都不可验收。
- **不拆故事到 change：** S33-1 ~ S33-8 共享一张表、一份计数口径与一个通知中心；按故事分层提交即可。
- **后续候选（另开需求）：** 通知偏好、保留策略与清理、搜索、邮件 / 短信 / OS 推送、未读摘要、真实认证下的推送鉴权、通知分页加载更早历史。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（B 申请 → A 的铃铛 2 秒内 +1，点击进申请处理页）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环（账号服务用 `ObjectProvider`）✓。

## 23. REQ-023 变更影响 — 旅行体验获赞增加信用分（issue #30）

- **日期：** 2026-11-17 ｜ **触发：** `/sdd:p1`（GitHub issue #30 + 用户裁决 D1–D4）
- **粒度：** 应用架构（点赞数据所有权 / 体验读取路径 / 信用结算集成点 / 两个展示面），非代码设计
- **基线：** `origin/main@64b38da`（独立 worktree `.worktrees/add-experience-like-credit`，分支 `feature/add-experience-like-credit`）；2026-11-17 同步 `origin/main@b50e416`，编号顺延为 REQ-023 / 契约 0.18.0 / 迁移 V30

### 23.1 Requirement set

- `requirement-workspace/requirements/REQ-023-experience-like-credit.md`（Ready 条目，24 场景 L-1 ~ L-8 / T-1 ~ T-10 / D-1 ~ D-3 / E-1 ~ E-3，blocking OQ 0，DoR BLOCKER 0）
- `requirement-workspace/intents/REQ-023-experience-like-credit.md`（意图捕获 + 证据锚点 + D1–D4）
- 能力：`trip-experiences`（点赞，ADDED）+ `user-credit`（获赞结算，ADDED）；复用 REQ-019 记账服务与五个信用展示面
- 用户裁决：D1 包含点赞全链路 / D2 不做信用明细可见面 / D3 月度按 Asia/Shanghai / D4 月度额度按实发消耗

### 23.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 点赞能力 | 全仓 grep `点赞 / like / likes / heart`（backend / frontend / openapi / openspec / prototype 交互） | **0 命中**：无表、无端点、无字段、无 UI、无需求 |
| 信用账户与账本 | `RouteME/backend/src/main/java/routeme/service/CreditService.java`、`service/impl/CreditServiceImpl.java`、`entity/CreditLedgerEntity.java`、`entity/UserCreditAccountEntity.java`、`V20__add_credit_account.sql` | 0–100 账户 + append-only 账本；`book(CreditBooking)` 负责裁断 / 快照 / 幂等 / 零变化留行；**无业务事件调用方** |
| 记账原因码 | `CreditServiceImplTest`（`EXPERIENCE_LIKE` 字面量） | 仅测试示例，无业务实现 |
| 体验端点 | `RouteME/backend/src/main/java/routeme/controller/ExperienceController.java` | `GET /api/experiences`、`GET /api/trips/{tripId}/experiences`、`GET /api/me/experiences`、`POST /api/trips/{tripId}/experiences`；无点赞端点、无 DELETE |
| 体验响应 | `RouteME/backend/src/main/java/routeme/response/ExperienceResponse.java` | `id` / `trip` / `author` / `content` / `intensity` / `advice` / `photos` / `createdAt` / `updatedAt` |
| 体验数据模型 | `V8__create_trip_experiences.sql`；`TripExperienceEntity`；`TripExperienceMapper.xml` | 每（行程, 作者）唯一一条体验；列表查询已支持目的地 / 日期 / 标签 / 分页 |
| 首页体验卡 | `RouteME/frontend/src/experiences/ExperienceCard.tsx`；`useExperiences.ts` | `.exp-foot` 三个链接（详情 / 参考发布）；无点赞按钮 |
| 详情体验区 | `RouteME/frontend/src/trips/TripDetailPage.tsx`（游后真实体验区） | 体验列表展示作者 / 强度 / 正文 / 建议 / 照片；无点赞按钮 |
| 信用展示面 | `profile/creditDisplay.ts`、`profiles/useUserCredits.ts`、`trips/TripCard.tsx`、`trips/TripDetailPage.tsx`、`trips/ApplicationsPage.tsx` | 五面已展示分数 + 等级；无明细面 |
| 契约 | `RouteME/openapi.yaml`（`info.version: 0.14.0`；`Experience` schema；`Error.code` 闭集） | 需追加赞数 / 点赞态字段与新端点；错误码闭集需处理「体验不存在」 |
| 迁移 | `db/migration`（最大 V20） | 需新增点赞表迁移（号在 P3 排他确认） |
| 原型 | `docs/prototype/ui.js` `expCard()` / 详情 `.exp-item`；`styles.css`；`store.js` | 无点赞交互；两个浏览面均可插入按钮行 |
| Living Spec | `openspec/specs/trip-experiences/spec.md` | 无点赞需求；Purpose 不含点赞（P5 视需要更新） |
| 未归档相关 change | `add-credit-account`（`user-credit` ADDED）；`add-experience-photos` / `refine-experience-share` / `refine-inspiration-home`（`trip-experiences`） | 本 change 只追加 ADDED 块；归档需排在其后 |
| 在途契约 / 迁移占用 | `add-ai-itinerary`（0.15.0 + V21 计划） | 本 change 版本号与迁移号 P3 排他确认 |

### 23.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 数据表 | 无点赞表 | **新增** `experience_likes`（`experience_id` + `user_id` 唯一，`created_at`）；**不改** `trip_experiences` / `app_users` / `credit_ledger` 结构 |
| 体验响应 | 无赞数 / 点赞态 | 追加 `like_count`（整数）与 `liked_by_me`（布尔，按 `X-User-Id`）；列表 / 详情 / 我的三处同口径 |
| 体验读取 | 无点赞聚合 | 列表与详情批量查询赞数（group by）与当前用户点赞态（一次 `in` 查询），禁止 N+1 |
| 点赞 API | 无 | 新增点赞 / 取消点赞端点（由 `X-User-Id` 鉴权；自赞 403；不存在 404；重复点赞幂等） |
| 信用结算 | 记账服务无调用方 | 新增「体验获赞阶梯加分」内部结算：档位判定（5/10/15/20/25）+ 行程封顶 +5 + 月度实发 ≤ +20（Asia/Shanghai）+ 幂等键（行程 + 作者 + 档位）+ 零变化留痕；调用既有 `CreditService.book` |
| 账本口径 | `reason_code` 无业务值 | `reason_code = EXPERIENCE_LIKE`；`related_type = TRIP`、`related_id = tripId`；幂等键格式固定 |
| 首页体验卡 | 无点赞按钮 | `.exp-foot` 增点赞按钮 + 赞数（已赞 / 未赞两态）；原型先行 |
| 详情体验区 | 无点赞按钮 | 体验列表项增点赞按钮 + 赞数；与首页同口径；原型先行 |
| 信用明细 | 不存在 | **无 delta**（用户裁决 D2：不做可见明细） |
| 通知 | 无 | **无 delta**（不做点赞通知） |
| 契约 | 0.14.0 | 次版本 + `Experience` 追加字段 + 两个点赞端点 + 错误码处理（P2/P3 定稿；版本号 P3 排他） |
| 迁移 | V20 | 新增 `V*__add_experience_likes.sql`（号 P3 排他） |
| Living Spec | `trip-experiences` 无点赞；`user-credit` Living Spec 尚未生成 | `trip-experiences` 追加「体验点赞」Requirement；`user-credit` 追加「体验获赞阶梯加分」Requirement（均为 ADDED；归档顺序受在途 change 约束） |
| 原型 | 无点赞交互 | 体验卡与详情体验区补点赞按钮 / 赞数 / 点赞态，样式复用既有令牌 |

### 23.4 Blast radius（应用架构）

- **后端（2 个能力 + 1 处集成）：** 新增点赞实体 / mapper / service / 端点；`ExperienceServiceImpl` 读取路径追加批量聚合；新增 `user-credit` 结算服务（调用既有 `book`）；点赞事务内触发结算。
- **数据（1 表 + 1 迁移）：** `experience_likes`；不加赞数冗余列；不改账本结构。
- **契约（1 处扩展 + 2 端点）：** `Experience` 追加两字段；新增点赞 / 取消点赞端点；错误码闭集处理。
- **前端（2 面 + 类型 / 文案）：** `ExperienceCard` 与 `TripDetailPage` 体验区；`types.ts` / `api.ts` / `tripMessages.ts` 同步；无新路由、无新页面。
- **原型（2 面 + 演示数据）：** `docs/prototype` 的 `expCard` / 详情 `.exp-item` / `styles.css` / `store.js`。
- **信用展示面（0 变化）：** 五面沿用 REQ-019；不新增明细面。
- **不影响：** 行程发布 / 匹配 / 申请 / 聊天 / 举报 / 取消；体验发布 / 图片 / 分页筛选；注册与资料。
- **运行时风险面：** 点赞事务多一次信用写入（同库同事务）；列表多两次批量查询；无新外部依赖。

### 23.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `trip-experiences`（ADDED：点赞需求）+ `user-credit`（ADDED：体验获赞结算需求）；无 MODIFIED / REMOVED |
| 长期规格 | 归档后 `trip-experiences` 增「体验点赞」块；`user-credit` 增「体验获赞阶梯加分」块（需在 `add-credit-account` 归档后合并） |
| 契约 | `openapi.yaml` 次版本 + `Experience` 字段 + 点赞端点；后端契约测试同步 |
| 后端测试 | 点赞服务单测（自赞 / 重复 / 不存在 / 并发唯一）；结算单测（档位、封顶、月度、幂等、0 裁断、多行取最大、时区边界）；列表聚合测试 |
| 前端测试 | 点赞交互纯逻辑单测（赞数 / 点赞态 / 失败回滚）；类型与 API 测试 |
| E2E | 点赞 → 赞数变化 → 再点赞幂等 → 取消 → 作者分数变化（跨 5 档）；无明细面；两个浏览面一致 |
| 知识库 | `docs/knowledge/interfaces/README.md` 登记新端点与 `Experience` 新字段 |
| 阶段记录 | `docs/sdd/add-experience-like-credit/p1..p4`；`docs/sdd/README.md` 索引 |
| 评审 | `docs/reviews/20261117-add-experience-like-credit-proposal-review.md`、`-spec-review.md` |

### 23.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-experience-like-credit`，两个能力 ADDED（`trip-experiences` 点赞块 + `user-credit` 获赞结算块）；不改写任何既有 Requirement 块，避免与 4 个在途 change 争同一块。
- **Agile 轨：** issue #30 即业务口径（信用系统迭代 2 / Story 3 / 5 点）；不拆故事——点赞与结算必须同批交付才能端到端验收（用户裁决 D1）。
- **并列轨道：** 举报扣分（#29）、退出同行扣分（#31）、安全学习恢复（#32）分属其他故事；本 change 不预留其空壳。

### 23.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 归档顺序 | `user-credit` / `trip-experiences` 的 Living Spec 均未包含在途 delta；本 change 仅在 ADDED 块上工作，P5 必须排在 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home` 之后，或与其 owner 协调 |
| Risk | 契约版本 / 迁移号撞号 | `openapi.yaml` 头 0.14.0、迁移 V20；`add-ai-itinerary` 已声明 0.15.0 + V21；本 change 在 P3 排他确认 |
| Risk | 月度上限并发严格性 | 先读月度累计再写账本存在竞态；SQLite 单写者 + `book` 同事务可缓解；P3 设计需给出保障方案（如条件更新 / 事务串行）并写测试 |
| Risk | 时区换算错误 | `occurred_at` 为 UTC；月初边界按 Asia/Shanghai 换算（UTC 前一日 16:00）；单测覆盖 23:59 / 00:00 边界 |
| Risk | 幂等键格式变更导致重复加分 | 幂等键格式固定为「行程 + 作者 + 档位」；单测断言格式；历史数据迁移（无历史点赞）不涉及 |
| Risk | 列表 N+1 | 赞数与点赞态必须批量查询（group by / in），沿用 REQ-018 照片批量化经验 |
| Risk | E2E 选择器漂移 | 新增点赞按钮可能影响 `.exp-foot` 内按钮计数断言；P4 同步修正既有用例 |
| Risk | 错误码闭集 | 「体验不存在」需新增码或明确复用；P2 与契约版本一并定稿，不临时自造 |
| Risk | 多篇体验规则不可演示 | 当前模型每作者每行程一条体验；规则以结算 max 查询 + 单测多行数据覆盖，story 层不主张该场景 E2E |
| Risk | 分数变化不可见误解 | 用户裁决 D2 明确不做明细；分数变化在既有五面可见；proposal / stories / registry 显式记录 |
| Blocker | 无 | blocking OQ = 0；DoR BLOCKER = 0；A0 ⑨–⑫ 全过；无外部依赖 |

### 23.8 Suggested split boundaries（供 proposal-split / story-split ）

- **一个 change：** `add-experience-like-credit` ← REQ-023（信用系统迭代 2 / Story 3）。
- **不拆点赞与结算：** 只有点赞没有结算，issue 的 T 组场景无法验收；只有结算没有点赞，没有触发源（用户裁决 D1）。
- **不并入扣分故事：** #29 / #31 / #32 属信用系统迭代 2 的其他 Story，各有独立事件与规则，另开 change。
- **不并入信用明细 / 管理后台：** 用户裁决 D2 与 REQ-019 D2 均明确不做；另开需求。
- **阶段：** 单阶段；P5 归档受在途 change 顺序约束（见 22.7）。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（点赞 → 跨档 → 作者分数 +1 → 账本一条）✓；可独立运行 ✓；capability 名真实（`trip-experiences` / `user-credit`）✓；无依赖环 ✓；场景 24 条，单 change 可承载 ✓。

## 24. REQ-025 变更影响 — 退出同行扣分与低信用自动限制

> 编号说明：起草时记为 REQ-022（当时 REQ-020 / REQ-021 已占用）；合并 `origin/main` 时 REQ-022 已由 `add-trip-weather`（行程天气）占用、REQ-023 由 `add-experience-like-credit`（体验点赞积分）占用，按「后到者顺延」改为 **REQ-025**，故事改为 S25（退出）与 S26（限制）；契约 / 迁移同步顺延为 **0.20.0 + V25**（main 已占 0.16.0–0.18.0 与 V21–V24）。

- **日期：** 2026-11-17 ｜ **触发：** `/sdd:p1`（用户卡片同时包含 Story 4 + Story 5）
- **基线：** `main@ec360dc`；分支 `feature/add-credit-exit-restriction`
- **粒度：** 应用架构（能力边界 / 数据所有权 / 契约 / 状态 / 展示面），非代码设计

### 24.1 Requirement set

- `requirement-workspace/requirements/REQ-025-exit-credit-restriction.md`（六字段 + 46 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-025-exit-credit-restriction.md`
- 故事：`requirement-workspace/stories/add-credit-exit-restriction-exit.story.md`（S25）与 `...-restriction.story.md`（S26）
- 能力：`credit-enforcement`（ADDED）；依赖 `user-credit` / `trip-companions` / `trip-cancellation` / `trip-plans` / 体验 / 资料展示面。
- **Delta：** `openspec/changes/add-credit-exit-restriction/specs/credit-enforcement/spec.md`（ADDED）。

### 24.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 信用账户 / 账本 | `V20__add_credit_account.sql`、`UserCreditAccountEntity`、`CreditLedgerEntity`、`CreditServiceImpl` | 0–100、前后快照、幂等、零值留痕；无退出原因码与限制表 |
| 信用展示 | `ProfilePage` / `ProfileModal` / `TripDetailPage` / `TripCard` / `ApplicationsPage`、`useUserCredits`、`creditDisplay.ts` | 五展示面；只有分数 + 等级；批量端点 `GET /api/users/credits` |
| 退出后端 | `ApplicationServiceImpl.leave`、`ApplicationController`、`TripPlanService.removeCompanion` | ACCEPTED → LEFT；减人数；无原因/预览/记账/限制 |
| 退出前端 | `TripDetailPage.tsx:694`、`MyTripsPage.tsx:492,507`、`ChatMain.tsx:70-74`、`ChatPage.tsx:127-140` | 三入口；详情/我的旅行 Modal；聊天 `window.confirm` |
| 退出活规格 | `openspec/specs/trip-companions/spec.md:97-117`；`refine-trip-chat` 未归档 Delta | 活规格说退出关闭聊天；未归档 Delta 与代码保留聊天；本 change 不改该 Requirement |
| 取消代码 | `TripPlanServiceImpl.cancel`、`TripCancelledEvent`、`ApplicationServiceImpl.onTripCancelled`、`TripCancelReasonEnum` | 仅发布者、仅 RECRUITING/FULL；8 原因；PENDING 自动取消 |
| 取消规格 | `openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md` | 5 Requirement / 20 Scenario；未归档 |
| 只读入口 | `TripPlanService.create`、`ApplicationServiceImpl.apply`、`ExperienceService`、`ChatServiceImpl`、`UserProfileServiceImpl.save` | 无信用限制判断 |
| 管理端 | 全仓 grep `admin / 管理后台` | 0 命中；无角色、无端点、无页面 |
| 契约 | `RouteME/openapi.yaml` | 合并前 0.14.0；P4 合并后落 0.20.0；已有 leave / credits / profile；无 `CREDIT_RESTRICTED`、无 `credit_restricted` |
| 迁移 | `RouteME/backend/src/main/resources/db/migration` | 合并前 V20 head；P4 合并后落 V25（V21–V24 已被 main 占用） |
| 测试 | `CreditServiceImplTest`、`CreditMigrationSqliteTest`、`credit.spec.ts` | 记账单测 / 迁移双引擎 / 展示 E2E 8 条 |

### 24.3 As-is → proposed delta

| 资产 | As-is | Proposed delta |
|---|---|---|
| `credit-enforcement` | 不存在 | ADDED：退出原因/预计影响/扣分阶梯/月度翻倍/待核实/限制触发/只读守卫/自动清理/自动解除/限制展示 |
| `user-credit` | 账户 + 账本 + 五展示面；无退出原因码 | 依赖复用；新增原因码与 `credit_restricted` 只读字段；不改其 Delta / 表结构 |
| `trip-companions` | 退出 = LEFT；申请状态 5 种；聊天保留（代码/未归档 Delta） | 依赖复用；申请新增可空 `status_reason`；不修改「退出同行」Requirement |
| `trip-cancellation` | 发布者取消 8 原因；仅 RECRUITING/FULL | 依赖复用；新增系统取消路径（含 ONGOING）与 `credit_restricted` 原因；不改其 Delta |
| `trip-plans` | 状态四态 + CANCELLED；取消字段 | 系统取消写既有取消字段；状态推导不变 |
| `trip-experiences` | 发布仅 COMPLETED；作者可编辑 | 限制守卫拦截发布/编辑；资格规则不变 |
| `user-profile` / `user-profiles` | 展示分数 + 等级 | 五展示面追加 `credit_restricted` 徽标；本人主页追加原因与自动解除说明 |
| `user-auth` | 会话 / 登录 / 退出 | 不受限制影响 |
| 契约 | 0.14.0 | 升 0.20.0：新增限制字段、`CREDIT_RESTRICTED` 错误、`credit_restricted` 取消原因、退出预览/确认请求与响应 |
| 迁移 | V20 | `V25__credit_enforcement.sql`：`credit_exit_event` + `credit_restriction` + `trip_applications.status_reason` |

### 24.4 Blast radius（应用架构）

- **信用域：** `CreditService.book` 新增业务调用方（退出扣分 / 零值待核实）；新增限制执行服务；账户读取扩展限制字段。
- **行程域：** 退出接口扩展原因/预览/确认；取消服务新增系统路径（含 ONGOING）；`TripCancelledEvent` 复用并带系统原因。
- **同行域：** 退出/撤回/系统清退共享 `status_reason`；申请列表、我的旅行、聊天会话列表读取新字段。
- **体验域：** 发布/编辑入口增加限制守卫。
- **资料域：** 保存资料/头像增加限制守卫；个人主页与资料弹窗展示限制徽标/原因。
- **聊天域：** 发送消息增加限制守卫；历史会话保留只读。
- **契约 / 前端：** 三入口退出弹窗统一；五展示面徽标；被拦截操作提示；系统取消原因映射。

### 24.5 Artifact impact

- **OpenSpec：** 新增 `openspec/changes/add-credit-exit-restriction/`（proposal + `credit-enforcement` ADDED Delta + design + tasks）。
- **需求工作区：** 意图 / Ready / deep-dive 增补 / impact §24 / 两故事 / registry / handoff。
- **代码：** 后端信用、退出、取消、申请、聊天、资料、体验、契约；前端三入口、五展示面、拦截提示、i18n。
- **迁移：** `V25` 双引擎（SQLite + H2）。
- **测试：** 记账/退出/限制单测与集成；迁移双引擎；前端纯函数/组件；E2E 退出 + 限制 + 自动清理。
- **文档 / 知识库：** P0–P4 阶段记录、质量报告、评审报告；不更新 Living Spec（P5 不执行）。

### 24.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-credit-exit-restriction`，单新能力 `credit-enforcement`；不改未归档 Delta，归档时新建 Living Spec。
- **Agile 轨：** Story 4（S25，迭代 2 / P0 / 5 点）与 Story 5（S26，迭代 3 / P0 / 3 点）；两条故事共享同一 change，但验收分开：S25 看退出扣分与待核实，S26 看 <60 限制与自动清理/解除。
- **场景数量：** 46 条 > 单 change 阈值；按用户 D1 合并且以「共享信用执行链」为理由；P2 若 Delta 过大，可在同一 change 内拆 Requirement 组，不拆 change。

### 24.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | `user-credit` / `trip-cancellation` 未归档 | 新能力承载，不改其 Delta；归档顺序不影响本 change；P5 暂不执行 |
| Risk | `trip-companions` 活规格与 `refine-trip-chat` 未归档 Delta 冲突 | 本 change 不修改「退出同行」Requirement；退出行为只加信用层，聊天语义沿用当前代码 |
| Risk | 系统取消 ONGOING 与发布者取消规则冲突 | 新增系统取消路径，不复用发布者入口；`trip-cancellation` Delta 不改；P3 设计明确权限/状态 |
| Risk | 自动清理跨域事务过大 | 同事务优先；P3 评估批量大小与索引；失败整体回滚；重试幂等 |
| Risk | 限制原因泄漏给他人 | 契约按请求人裁剪；他人只拿 `credit_restricted` 布尔；E2E 断言他人视角无原因 |
| Risk | 0 分裁断事件计数争议 | D14 已裁决按事件计入；P2 Delta 写明；单测覆盖 |
| Risk | 无低信用演示数据 | P3 决定种子 / 夹具 / 直接记账；不新增管理员入口 |
| Risk | 契约 / 迁移号撞号 | 已解决：合并时按「后到者顺延」落 0.20.0 + V25（main 已占 0.16.0–0.18.0 与 V21–V24） |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、A0 ⑨–⑫ 全过 |

### 24.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `add-credit-exit-restriction` ← REQ-025（S25 + S26）；用户 D1 明确。
- **两个故事：** S25 退出扣分（原因/预览/六档/月度/待核实）；S26 限制（触发/只读/自动清理/展示/自动解除）。
- **不并入：** 管理端核实与人工封禁、信用明细页、安全学习/客服入口、正向加分事件。
- **依赖：** `user-credit`（账本/账户）、`trip-companions`（退出/申请）、`trip-cancellation`（取消事件）、五展示面。
- **质量自检（split-heuristics）：** 子目标一句话 ✓；端到端可观察（48h 退出 -5 → 80→75；65→55 自动限制 → 只读/清退）✓；可独立运行 ✓；capability 名真实（`credit-enforcement`）✓；无依赖环 ✓；场景 46 条 > 阈值但按用户裁决合并，P2 可在同一 change 内拆 Requirement 组。

## 28. REQ-028 变更影响 — 旅行保障与小额借款（旅行金融迭代 1）

> 合并说明（2026-11-18）：本 change 已 rebase 到 `origin/main@ea5493a`；编号由 REQ-024 / S25 顺延为 **REQ-028 / S29**；P1 时点拟定为契约 **0.25.0** + 迁移 **`V30`**，实现阶段增补借款利息 / 逾期罚息后落定为 **0.28.0 + `V32`**；下文「As-is」保留 P1 时点基线 `origin/main@b50e416` 的观察，不作为当前基线。

- **日期：** 2026-11-17 ｜ **触发：** 发起人原始诉求（保险 + 小额借款 + 5% 服务费）+ `/sdd:p0` 裁决 D1–D10
- **粒度：** 应用架构（钱包数据所有权 / 注册集成点 / 行程资格 / 页面与入口 / 收费口径），非代码设计
- **基线：** `origin/main@b50e416`（分支 `feature/add-travel-finance`）

### 28.1 Requirement set

- `requirement-workspace/requirements/REQ-028-travel-finance.md`（Ready 条目，33 场景 S29-1 ~ S29-33，blocking OQ 0，DoR BLOCKER 0）
- `requirement-workspace/intents/REQ-028-travel-finance.md`（意图捕获 + 证据锚点 + D1–D10）
- 新增能力：`travel-finance`（ADDED）；只读依赖 `trip-plans` / `trip-companions`；`user-auth` 注册集成点；`user-credit` 仅作账本范式参照
- 用户裁决：D1 演示钱包 / D2 借款收 5%、保险由第三方定价 / D3 借款 100–2,000 元整、7·14·30 天、利息 0.05%/日、逾期罚息 0.1%/日、每人 1 笔进行中 / D4 第三方保险入口 + 状态回写 / D5 发布者 + ACCEPTED 同行者 + 三种行程状态 / D6 行程详情 + 账号菜单 / D7 `add-travel-finance` + `travel-finance` / D8 整数分 / D9 不对接真实机构 / D10 理赔退保分期复利提现管理后台通知排除

### 28.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 金融能力 | 全仓 grep `wallet / insurance / loan / premium / service_fee / balance_cents` | **0 命中**（除地图第三方脚本注释）：无钱包、无保险、无借款 |
| 既有账本 | `backend/.../db/migration/V20__add_credit_account.sql`、`entity/CreditLedgerEntity.java`、`service/impl/CreditServiceImpl.java` | 只有信用分账本；append-only + 前后快照 + 幂等键可作范式，但无余额概念 |
| 注册链路 | `backend/.../service/impl/AuthServiceImpl.java` | `@Transactional`；校验 → `DemoUserService.createAccount` → `issue`；已内嵌 `CreditService.ensureAccount` |
| 账号状态 | `backend/.../service/AccountStatusService.java`、`enums/WriteScopeEnum.java` | `ACTIVE` / `SUSPENDED` / `BANNED`；`assertCanWrite` 唯一写守卫 |
| 行程 | `backend/.../entity/TripPlanEntity.java`、`pojo/TripPlan.java` | 发布者、起止日期、人数；状态派生 `cancelled > completed > ongoing > full > recruiting` |
| 同行关系 | `backend/.../entity/TripApplicationEntity.java`、`enums/ApplicationStatusEnum.java` | `ACCEPTED` 即同行者；发布者不在申请表 |
| 契约 | `RouteME/openapi.yaml` | `info.version: 0.17.0`；由 `OpenApiTest` 断言 |
| 迁移 | `backend/src/main/resources/db/migration/` | 头为 `V23__add_travel_mode.sql`；在途 `add-realtime-notifications` 声明 V24 |
| 前端路由 | `frontend/src/route.ts`、`App.tsx` | 手写 hash 路由；详情 `#/trips/{id}`；账号页 `#/users/{id}` / `#/profile/setup` |
| 账号菜单 | `frontend/src/shell/AppShell.tsx` | `rail-menu` 只有「编辑资料」「退出」 |
| 详情页 | `frontend/src/trips/TripDetailPage.tsx` | `detail-section` 分区：天气 / 途经点 / 发布者 / 同行者 / 体验 / 匹配 / 申请 |
| 金额惯例 | `backend/.../entity/TripPlanEntity.java` | `budget_min_cents` / `budget_max_cents` 整数分 |
| 测试基线 | P0 记录 | 后端 434 / 60 reports / 0 fail；前端 344 / 46 files |

### 28.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 数据表 | 无金融表 | **新增** `user_wallet`（每用户 1 条余额）+ `wallet_ledger`（append-only）+ `insurance_policy`（唯一约束用户 × 行程）+ `travel_loan`（唯一索引用户 × `ACTIVE`）；**不改** `app_users` / 信用表 |
| 历史数据 | 无钱包 | 迁移按 `app_users` 全表回填 1,000,000 分 |
| 注册链路 | 建账号 + 信用账户 | 同事务内追加钱包初始化；失败分支不落钱包 |
| 保险 | 无 | 第三方入口 + 状态回写；提供方与入口来自配置；保障期 = 行程起止日；RouteME 不定价、不承保 |
| 借款 | 无 | 100–2,000 元整、7/14/30 天；服务费 5% 从本金扣；净额入账；应还 = 本金 + 利息（0.05%/日 × 期限）；到期 = 发放 + 期限；逾期按 0.1%/日累计罚息并在还款时结清 |
| 钱包 | 无 | 余额只经借款发放与还款变化；每笔写账本并可回算；无客户端直接改余额端点；投保不产生流水 |
| 资格 | 无 | 发布者 + `ACCEPTED` 同行者；`recruiting` / `full` / `ongoing`；投保 / 借款要求 `ACTIVE`，还款不限状态 |
| 契约 | 0.17.0 | 实施时升 **0.28.0** + 钱包 / 保险 / 借款端点与 schema（含利息 / 罚息 / 合计应还） |
| 前端路由 | 无金融路由 | `#/trips/{tripId}/finance` + `#/finance`；`App.tsx` 渲染 |
| 前端口 | 详情页无金融入口、账号菜单 2 项 | 详情页新增入口区块；账号菜单新增「旅行保障」 |
| 原型 | 无 | P3 补钱包卡 / 第三方保险面板 / 借款表单 / 保险与借款列表截点（rebase 后撤回：v1 已归档，界面证据以生产 UI 为准） |
| 管理端 | 无金融视图 | **无 delta**（D10 排除） |

### 28.4 Blast radius（应用架构）

- **后端（1 个新能力 + 2 处集成）：** 新增钱包 / 账本 / 保险记录 / 借款实体与 mapper、钱包服务、保险服务、借款服务（含利息与罚息计算）；注册链路插入钱包初始化；行程读取路径拼接资格判断。
- **数据（4 表 + 2 迁移）：** `V30` 建表 + 钱包回填，`V32` 重建 `travel_loan` 增补利息 / 罚息；双引擎可执行。
- **契约（1 处扩展）：** 新增金融端点与 schema；`OpenApiTest` 版本断言同步。
- **前端（2 页 + 2 入口 + 类型 / 文案）：** 行程维度保障页、账号聚合页；详情页入口与账号菜单；`api.ts` / `types.ts` / `i18n`。
- **管理端（0）：** 不新增角色、端点与页面。
- **不影响：** 首页、地图、行程创建 / 申请 / 聊天 / 体验 / 举报 / 信用分 / 管理后台的既有行为。
- **运行时风险面：** 注册事务多一次写入；借款 / 还款为高频一致性与并发敏感路径。

### 28.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `travel-finance` **ADDED**（钱包与账本 / 第三方保险入口与状态回写 / 借款与还款 / 5% 服务费 / 利息与逾期罚息 / 资格与入口 / 精度与幂等）；无 MODIFIED、无 REMOVED |
| 长期规格 | 归档后新增 Living Spec `openspec/specs/travel-finance/spec.md` |
| 契约 | `openapi.yaml` 次版本 + 钱包 / 保险 / 借款 schema；后端契约测试同步 |
| 后端测试 | 钱包服务单测（初始化 / 扣款 / 入账 / 前后快照 / 并发 / 幂等）；保险服务（入口 / 保障期 / 重复 / 资格）；借款服务（边界 / 净额 / 利息 / 到期 / 单笔 / 还款 / 罚息）；注册集成；响应断言 |
| 前端测试 | 费用与展示纯函数单测（5% 拆分、净额、利息、罚息、应还、到期、状态文案、格式化） |
| E2E | 第三方投保跳转 → 演示回写 → 状态持久化；借款 → 净额到账 → 利息 / 应还展示 → 还款 → 已还清；余额不足 / 非同行者 / 已结束行程 |
| 知识库 | `docs/knowledge/interfaces/README.md` 需登记新增金融端点 |
| 阶段记录 | `docs/sdd/add-travel-finance/p1..p4`；`docs/sdd/README.md` 索引 |
| 评审 | `docs/reviews/20261117-add-travel-finance-proposal-review.md` 等 |

### 28.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-travel-finance`，单能力 `travel-finance`（ADDED）；保险入口与借款写在同一 Delta，避免钱包与资格双份定义。
- **Agile 轨：** 故事 S29「旅行保障与小额借款」（旅行金融 1 / P0 / 5 点）即业务口径；不另拆多条故事。
- **并列轨道：** 理赔、征信、真实机构对接、钱包充值提现、管理后台金融视图分属不同故事；本需求不预留空壳端点。

### 28.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 契约版本号撞号 | 已按后到者顺延规则落定 0.28.0 + `V32`（判断时 main 为 0.27.0 + `V31`；其后通知变更到 0.29.0 + `V33`） |
| Risk | 迁移号撞号 | 已落定 `V30`（建表）+ `V32`（利息 / 罚息），避开 `V31` |
| Risk | 「5%」在借款端被误解为加到还款额 | 需求与 Delta 同时写死「从发放额扣」；`repay_cents = principal_cents + interest_cents` |
| Risk | 余额并发双花 / 重复扣款 | 条件更新或事务内重读 + 保险唯一 + 借款唯一 + 还款状态迁移；单测覆盖 |
| Risk | 封禁用户无法还款导致债务永续 | 还款不走 `assertCanWrite(BUSINESS)`；`S29-30` 显式验收 |
| Risk | 汇率 / 浮点误差 | 全整数分；借款整元；后端禁止 `double` |
| Risk | 非同行者通过直连端点绕过 UI | 服务端资格校验为唯一权威，UI 只做展示 |
| Risk | 原型无金融骨架 | `@rule:prototype-ui-alignment`；P3 先补截点再实现 |
| Risk | 与 `add-realtime-notifications` 同改 `openapi.yaml` | 合并时按后到者顺延版本与迁移号；PR 描述记录合并顺序 |
| Blocker | 无 | blocking OQ = 0；DoR BLOCKER = 0；A0 ⑨–⑫ 全过 |

### 28.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `add-travel-finance` ← REQ-028（旅行金融迭代 1 / S29）。
- **不拆保险与借款：** 两者共用钱包、资格、账本与页面；拆开会产生两套余额与资格逻辑。
- **不并入理赔 / 征信 / 管理后台：** 这些是后续故事，本 change 不预留端点。
- **阶段：** 单阶段；无归档前置依赖（`travel-finance` 全新能力），但需与在途 `add-realtime-notifications` 协调契约版本与迁移号。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（钱包初始余额 → 第三方投保 / 借款 → 扣 5% 与计息 → 还款）✓；可独立运行 ✓；capability 名真实（`travel-finance`）✓；无依赖环 ✓；33 场景接近单 change 上限，P2 可再合并同义场景。

## 31. REQ-031 变更影响 — 路线完成度（S32 / issue #45）

- **日期：** 2026-11-18 ｜ **触发：** GitHub issue #45「路线完成度」+ 用户裁决 D1–D8
- **粒度：** 应用架构（资料响应契约 / 完成度派生归属 / 个人主页展示面 / 独立性边界），非代码设计
- **基线：** `origin/main@aa320dc`（分支 `feature/add-route-completion`，独立 worktree）

### 30.1 Requirement set

- `requirement-workspace/requirements/REQ-031-route-completion.md`（Ready 条目，19 场景 S32-1 ~ S32-19，blocking OQ 0，DoR BLOCKER 0）
- `requirement-workspace/intents/REQ-031-route-completion.md`（意图捕获 + 证据锚点 + D1–D8）
- 新增能力：`route-completion`（ADDED）；只读依赖 `user-profile` / `user-profiles`（资料响应承载）；未来只读 `trip-plans` / `trip-companions`
- 用户裁决：D1 仅预留 + 数据不足 / D2 阈值 ≥1 条已结束行程 / D3 本期不做列表 / D4 REQ-031·S32·`add-route-completion`·`route-completion` / D5 标签 + 百分比 / D6 发布者 + `ACCEPTED` 同行者 / D7 仅接口字段无迁移 / D8 本人他人同口径 + 状态码

### 30.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 资料响应 | `backend/src/main/java/routeme/response/UserProfileResponse.java` | 已含资料、信用分、`joinedAt`、`stats`、账号状态；无完成度字段 |
| 资料端点 | `backend/src/main/java/routeme/controller/UserProfileController.java` | `GET /users/{userId}/profile`；本人含生日，他人省生日 |
| 个人主页 | `frontend/src/profile/ProfilePage.tsx` | hero 含头像、昵称、徽标、`.profile-credit` 信用行、chips；无完成度行 |
| 状态映射范式 | `frontend/src/profile/creditDisplay.ts`、`i18n/tripMessages.ts` | 信用等级英文码 → 文案；可复用为完成度状态码 |
| 前端类型 | `frontend/src/types.ts`、`api.ts` | `UserProfile` 与 `loadUserProfile`；无完成度字段 |
| 契约 | `RouteME/openapi.yaml` | `info.version: 0.26.0`；`UserProfile` schema；`/users/{userId}/profile` |
| 行程状态 | `openspec/changes/add-trip-completion/`（REQ-011） | `completed_at` + 四态派生；未来完成度样本来源 |
| 同行关系 | Living Spec `openspec/specs/trip-companions/spec.md` | `ACCEPTED` 即同行者；未来样本范围 |
| 信用分 | `openspec/changes/add-credit-account/`、`V20__add_credit_account.sql` | 独立账户 + 账本；本 change 不读不写 |
| 推荐引擎 | 提交 `c516d76` | 同行者推荐 / 匹配引擎已全部移除；无「推荐列表」可承接 |
| 完成度实现 | 全仓 grep `完成度 / completion_rate / route_completion` | **0 命中**（除地图注释与历史文档）：无任何完成度代码 |
| 原型 | `docs/prototype/v1`（归档）、`v2`（六屏设计板） | 均无路线完成度元素；v1 不得结构性改动 |
| 迁移 | `backend/src/main/resources/db/migration/` | 头为 `V30`；本 change **无迁移** |

### 30.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 资料响应 | 无完成度 | 增加 `route_completion_rate`（0–100 整数或 null）+ `route_completion_state`（`good` / `neutral` / `watch` / `insufficient`），只读 |
| 后端派生 | 无 | 新增单点派生：样本 <1 或数值 null → `insufficient`；≥80 → `good`；70–79 → `neutral`；<70 → `watch`；非法值降级 `insufficient` |
| 数据源 | 无打卡聚合 | 本期无源：恒返回 null + `insufficient`；不得用统计 / 已结束行程数伪造 |
| 前端类型 | 无字段 | `UserProfile` 增加两字段（可选 / 可空），`loadUserProfile` 不变 |
| 个人主页 | 信用行下方无内容 | 新增完成度行：四态文案 + 百分比；`insufficient` 只显示「暂无足够完成记录」 |
| i18n | 无文案 | 新增「路线完成度」「信誉良好」「请留意行程完成情况」「暂无足够完成记录」 |
| 契约 | 0.26.0 | 次版本（预计 0.30.0）+ `UserProfile` schema 两字段 + 示例；`OpenApiTest` 同步 |
| 数据表 / 迁移 | 无 | **无 delta**（D7） |
| 列表 / 弹窗 / 详情 | 无 | **无 delta**（D3） |
| 信用分 / 统计 / 成长等级 | 既有 | **无 delta**；新增回归断言验独立性 |
| 管理端 | 无 | **无 delta** |
| 原型 | v1 归档 / v2 设计板 | **不修改**；P3 以 preview + 生产 UI 截图作为界面证据 |

### 30.4 Blast radius（应用架构）

- **后端（1 处响应扩展 + 1 个派生单点）：** `UserProfileResponse` 追加两个字段；完成度派生纯逻辑（新类 / 常量）；资料服务装配时调用（本期返回常量数据不足）。
- **契约（1 处扩展）：** `openapi.yaml` `UserProfile` schema + 示例；`OpenApiTest` 版本断言。
- **前端（1 页 + 类型 / 文案）：** `ProfilePage` hero 增加完成度行；`types.ts` / `tripMessages.ts`；无路由变化。
- **数据（0）：** 无表、无列、无迁移。
- **管理端（0）：** 无角色、端点与页面。
- **不影响：** 登录 / 注册、发布、申请、聊天、体验、信用分、管理后台、首页列表、地图、资料弹窗与统计。
- **运行时风险面：** 资料读取多一次纯函数调用；无写入、无并发敏感路径。

### 30.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `route-completion` **ADDED**（字段预留与数据不足 / 阈值派生 / 个人主页展示 / 独立性 / 兼容）；无 MODIFIED、无 REMOVED |
| 长期规格 | 归档后新增 Living Spec `openspec/specs/route-completion/spec.md` |
| 契约 | `openapi.yaml` 次版本（预计 0.30.0）+ `UserProfile` schema；后端契约测试同步 |
| 后端测试 | 派生单测（边界 80/79/70/69/0/null/非法）；资料 API 断言字段存在与类型；独立性回归（信用字段、`stats` 不变） |
| 前端测试 | 状态 → 文案纯函数单测；个人主页渲染（四态 + 数据不足）；无 DOM 渲染层 |
| E2E | `route-completion.spec.ts`：数据不足态、四态模拟（接口拦截或夹具）、本人 / 他人同口径、信用行保持不变 |
| 知识库 | 无需新增接口文档（仅字段扩展）；`docs/knowledge/interfaces/README.md` 按需补一行 |
| 阶段记录 | `docs/sdd/add-route-completion/p1-intent.md` 等；`docs/sdd/README.md` 索引 |
| 评审 | `docs/reviews/20261118-add-route-completion-{proposal,spec}-review.md` |

### 30.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-route-completion`，单能力 `route-completion`（ADDED）；字段、派生与展示写在同一 Delta。
- **Agile 轨：** 故事 S32「路线完成度」（迭代 3 / P1 / 3 点）；不另拆故事。
- **并列轨道：** 人工打卡、聚合算法、列表 / 详情 / 弹窗展示、成长等级（issue #44）分属不同故事；本需求不预留空壳端点或字段。

### 30.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 「预留」被实现成假数据 | D1 写死；Delta 明确禁止；API 断言 null + insufficient |
| Risk | 前端自行计算阈值 | Delta 规定只做字典映射；单测与代码审阅检查无 80 / 70 常量 |
| Risk | 与信用分 / 统计误接 | 独立性场景 + 回归断言；不新增账本记录 |
| Risk | 契约版本撞号 | 基线 0.26.0；P3 按合并顺序确认（预计 0.30.0） |
| Risk | 展示行与 hero 版式冲突 | 复用 `.profile-credit` 行模式；P3 预览 + 四宽度 × 深浅色走查 |
| Risk | 资料弹窗等既有面被误改 | Delta 明确 out of scope；E2E 断言弹窗不变 |
| Risk | 未来聚合口径漂移 | D2 / D6 固化；聚合算法后续卡片 |
| Risk | 「推荐列表」被误解为本期范围 | D3 写死：推荐引擎已移除，本期不做列表 |
| Blocker | 无 | blocking OQ = 0；DoR BLOCKER = 0；A0 ⑨–⑫ 全过 |

### 30.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `add-route-completion` ← REQ-031（迭代 3 / S32）。
- **不拆字段 / 派生 / 展示：** 三者是同一字段从后端到个人主页的端到端链路；拆开会产生「有字段无展示」或「有展示无来源」的不完整验收。
- **不并入人工打卡与聚合：** 后续独立卡片；本 change 不预留表或端点。
- **不并入列表 / 弹窗 / 详情展示：** D3 本期不做；未来可复用同一状态码另开增量。
- **阶段：** 单阶段；无归档前置依赖（全新能力）；契约版本需与在途 change 按合并顺序协调。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（资料响应字段 → 个人主页行）✓；可独立运行 ✓；capability 名真实（`route-completion`）✓；无依赖环 ✓；19 场景适合单 change。
## 29. REQ-030 变更影响 — 举报违规扣减信用分（issue #29）

> 编号说明（2026-11-18）：合并 `origin/main@2bf9148` 时 REQ-028 / S29 / V30 与 REQ-029 / S30 已被 `add-travel-finance` 占用，本节按「后到者顺延」改为 **REQ-030 / S31 / §29 / V31**。

- **日期：** 2026-11-18 ｜ **触发：** `/sdd:p1`（GitHub issue #29）
- **基线：** `origin/main@f0d093a`；分支 `feature/add-report-credit-deduction`
- **粒度：** 应用架构（能力边界 / 数据所有权 / 契约 / 状态 / 展示面），非代码设计

### 29.1 Requirement set

- `requirement-workspace/requirements/REQ-030-report-credit-deduction.md`（六字段 + 26 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-030-report-credit-deduction.md`
- 故事：`requirement-workspace/stories.md` 登记 S31（不新建独立故事文件：以意图 + proposal + Delta 承接，与 REQ-012 / REQ-019 同口径）
- 能力：`user-credit`（ADDED：举报违规扣分结算）+ `admin-console`（MODIFIED：举报处置表单与接口）。
- **Delta 预判：** `openspec/changes/add-report-credit-deduction/specs/user-credit/spec.md`（ADDED）+ `.../specs/admin-console/spec.md`（MODIFIED）；因 `admin-console` 尚未归档，归档 MUST 排在 `add-admin-console` 之后（P2 校验已用 probe 确认：`MODIFIED` 对不存在活规格在 `validate` 阶段通过、归档阶段拒绝）。

### 29.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 举报表 / 实体 | `V7__create_reports.sql`、`V21__admin_console.sql`、`V22__report_context_trip.sql`、`ReportEntity`、`Report` | 4 态与处置元数据；无违规类型 / 扣分列 |
| 举报处置服务 | `AdminReportServiceImpl`（`start` / `resolve` / `applyPenalty`） | 成立只执行 `SUSPEND / BAN / UPDATE_BAN`；`KEEP` 直接返回 |
| 举报处置接口 | `AdminReportController`：`GET /api/admin/reports`、`/{id}`、`/{id}/start`、`/{id}/resolve` | 请求含 `action` / `ban_*`；无违规类型 |
| 被举报用户推导 | `ReportTargetService.reportedUserId` | 用户 = 本人、行程 = 发布者、体验 = 作者 |
| 账号处置 | `AdminUserController` + `StatusActionModal` + `userActionForm.ts` | 用户详情页可独立暂停 / 封禁 / 更新 / 恢复 |
| 信用账户 / 账本 | `V20__add_credit_account.sql`、`CreditServiceImpl`、`CreditLedgerEntity` | 0–100、前后快照、幂等、零值留痕；无举报原因码 |
| 低分限制 | `CreditEnforcementServiceImpl.onCreditChanged` + `credit_restriction` | 跨 60 自动限制 / 解除；已把「举报核实扣分」列为触发示例 |
| 信用展示 | `useUserCredits` / `creditDisplay.ts` / 五展示面 | 只读展示，不需修改 |
| 举报处置前端 | `AdminReportDetailPage.tsx` / `reportActionForm.ts` / `adminMessages.ts` / `types.ts` / `api.ts` | 成立表单含处罚动作 + 封禁字段；无扣分预览 |
| 举报列表前端 | `AdminReportsPage.tsx` | 列表列不含违规类型 / 扣分 |
| 契约 | `RouteME/openapi.yaml` | `0.24.0`；`AdminReportResolveRequest` 含处罚字段；无违规类型 |
| 迁移 | `db/migration` | head `V29`；`reports` 无违规类型 / 扣分列 |
| 测试 | `AdminReportControllerTest`、`admin.spec.ts` | 覆盖开始 / 成立并暂停 / 封禁 / 驳回；需按 D1 重写 |
| 原型 | `docs/prototype` | 无管理端举报处置界面；P3 先补截点 |

### 29.3 As-is → proposed delta

| 资产 | As-is | Proposed delta |
|---|---|---|
| `user-credit` | 账户 + 账本 + 展示；无举报原因码 | ADDED：举报违规类型与扣分规则、记账、幂等、零值留痕、月度上限不适用、低分联动只消费既有事件 |
| `admin-console` | 举报成立由管理员选处罚动作与封禁理由 | MODIFIED：成立只选违规类型 + 填违规原因；移除处罚动作与封禁字段；详情补当前分数 / 预览 / 违规类型与本次扣分 |
| `credit-enforcement` | 跨 60 自动限制 / 解除 | 只读复用，不改 Delta |
| `trip-plans` / `trip-companions` / `trip-experiences` | 被举报用户推导 | 只读复用，不改语义 |
| 契约 | `0.24.0`；`resolve` 请求含 `action` / `ban_*` | 升 `0.26.0`：请求改为 `outcome` / `violation_type` / `other_deduction` / `note`；详情响应补被举报用户信用与违规类型 / 实际扣分 |
| 迁移 | `V29` | `V31__report_credit_deduction.sql`：`reports` 追加 `violation_type` / `applied_deduction`（可空，兼容历史） |
| 前端 | 成立表单含处罚动作 + 封禁字段 | 违规类型选择 + `OTHER` 档位 + 三分段预览 + 处理历史改版；类型 / API / 文案同步 |

### 29.4 Blast radius（应用架构）

- **举报域：** resolve 请求与成立分支重建；详情响应扩展；列表不变（默认不加列）；报告留痕新增字段。
- **信用域：** 新增业务调用方（举报扣分）；新增原因码常量；不改账户 / 账本结构。
- **低分限制域：** 通过 `CreditChangedEvent` 自动触发；无代码改动（需回归）。
- **账号域：** 举报页不再调用 `AccountStatusService`；用户管理页保持。
- **前端管理端：** 表单、预览、处理历史、错误映射、类型与 API 客户端；列表与用户页不动。
- **契约 / 测试：** openapi 与 `OpenApiTest`；后端 `AdminReportControllerTest`；E2E `admin.spec.ts` 重写相关用例并保留用户管理页回归。

### 29.5 Artifact impact

- **OpenSpec：** 新增 `openspec/changes/add-report-credit-deduction/`（proposal + 双 Delta + design + tasks）。
- **需求工作区：** 意图 / Ready / deep-dive 增补 / impact §29 / stories S31 / registry / handoff。
- **代码：** 后端 `AdminReportServiceImpl` / 请求 / 响应 / 枚举 / 原因码常量；前端 `AdminReportDetailPage` / `reportActionForm.ts` / `adminMessages.ts` / `types.ts` / `api.ts`。
- **迁移：** `V31` 双引擎（SQLite + H2）。
- **测试：** 扣分规则单测、幂等 / 并发、预览口径、低分联动回归、E2E。
- **文档 / 知识库：** P0–P4 阶段记录、质量报告、评审报告；P5 暂不执行。

### 29.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-report-credit-deduction`；双能力（`user-credit` ADDED + `admin-console` MODIFIED）。
- **Agile 轨：** 单故事 S31（信用系统迭代 1 / Story 2 / P0 / 3 点）；不拆多故事（一个垂直切片：举报成立 → 扣分 → 低分限制）。
- **场景数量：** 26 条，在单 change 阈值内；P2 如需收敛，可在同一 change 内重组 Requirement 组。

### 29.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | `admin-console` 未归档 | MODIFIED Delta 在归档阶段会被拒绝；归档 MUST 排在 `add-admin-console` 之后（与 `add-credit-recovery` 对 `add-credit-account` 同口径） |
| Risk | 移除处罚动作与已交付 S22 行为冲突 | D1 已裁决，属用户当次显式指示；P2 G1 SA 追认；P4 回归用户管理页暂停 / 封禁 |
| Risk | `resolution_action` 历史数据与新语义共存 | 新值不再写入；旧值只读展示保留；不做回填 |
| Risk | 预览与实际截断不一致 | 预览以服务端响应为准；E2E 断言 5 → -10 → 0 |
| Risk | 并发 resolve 双重扣分 | 状态条件更新 + 账本幂等唯一索引双保险；单测覆盖 |
| Risk | 契约 / 迁移号撞号 | P3 排他确认；预计 `0.26.0` + `V31` |
| Risk | 管理端原型缺失 | P3 先补截点（`@rule:prototype-ui-alignment`），只复用现有 `.admin-*` 令牌 |
| Blocker | 无 | blocking OQ=0、DoR BLOCKER=0、deep-dive ⑨–⑫ 全过 |

### 29.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `add-report-credit-deduction` ← REQ-030（S31）。
- **不拆故事：** 举报成立 → 扣分 → 低分限制必须同批交付才能端到端验收。
- **不并入：** 账号处置动作（保留在用户管理页）、举报提交端原因枚举、信用明细页、其他扣分 / 加分事件（#30–#32）、月度扣分上限。
- **依赖：** `user-credit`（账本 / 账户）、`admin-console`（举报处置）、`credit-enforcement`（低分联动）。
- **质量自检（split-heuristics）：** 子目标一句话 ✓；端到端可观察（80 → 65；80 → 50 自动限制）✓；可独立运行 ✓；capability 名真实 ✓；无依赖环 ✓；场景 26 条在阈值内。

## 30. REQ-033 变更影响 — 用户成长等级 LV1–LV5（issue #44）

- **日期：** 2026-11-18 ｜ **触发：** GitHub issue #44 + `/sdd:pre-spec-req` 用户裁决 D1–D15
- **粒度：** 应用架构（成长数据所有权 / 事件挂接点 / 展示面 / 配置 / 契约与迁移），非代码设计
- **基线：** `origin/main@f2bad40`（P1 起草于 `71f3ad4`，先后合并 `8992853` / `f2bad40`；契约 0.26.0 / 迁移头 `V31__report_credit_deduction.sql`）

### 30.1 Requirement set

- `requirement-workspace/requirements/REQ-033-growth-level.md`（Ready 条目，41 场景 L / P / K / D / R / V / C / S，blocking OQ 0，DoR BLOCKER 0）
- `requirement-workspace/intents/REQ-033-growth-level.md`（意图捕获 + 现状证据 + D1–D15）
- 新增能力：`user-growth`（ADDED）；只读依赖 `trip-experiences` / `admin-console` / `user-profile` / `user-profiles`；`user-credit` 完全分离
- 用户裁决：D1 与信用分分离 / D2 LV1–LV5 每 100 一级 / D3 LV5 后继续累计 / D4 初始 0 且不回填 / D5 发布经验默认 10 可配置 / D6 点赞单篇分档锁定 / D7 举报成立 −50 每份一次最低 0 / D8 每日 +20 上限按剩余额度截断 / D9 append-only 流水 / D10 后端计算且他人只见等级 / D11 6 处展示面 / D12 明细页排行榜通知权益管理端排除 / D13 独立于 #29 / D14 契约迁移 P3 排他 / D15 等级随经验回退

### 30.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 成长能力 | backend / frontend grep `user_growth` / `growth_level` / `exp_total` / `成长等级` | **0 命中**：无账户、无账本、无等级、无展示 |
| 体验发布 | `backend/.../service/ExperienceEligibility.java`、`service/impl/ExperienceServiceImpl.java` | 仅已完成行程 + 发布者 / 接受同行者；`(trip, author)` 唯一；`created` 标识新建 |
| 点赞 | `db/migration/V24__add_experience_likes.sql`、`controller/ExperienceController.java`、`service/impl/ExperienceLikeServiceImpl.java` | `(experience, user)` 唯一；自赞拒绝；取消删行 |
| 信用账本（范式） | `V20__add_credit_account.sql`、`entity/CreditLedgerEntity.java`、`service/impl/CreditServiceImpl.java` | append-only + 前后快照 + 幂等键；成长不复用其表 |
| 举报处置 | `service/impl/AdminReportServiceImpl.java`、`service/ReportTargetService.java` | `PROCESSING → RESOLVED / REJECTED`；`reportedUserId` 可定位被举报者；#29 已并入 main，RESOLVED 分支已含扣信用分副作用 |
| 资料读取 | `controller/UserProfileController.java`（`/profile`、`/credits`） | 主页响应与批量信用读取已存在 |
| 展示面 | `ProfilePage.tsx`、`ProfileModal.tsx`、`TripDetailPage.tsx`、`TripCard.tsx`、`ApplicationsPage.tsx`、`CompanionCard.tsx` | 前 5 处显示信用分；`CompanionCard` 不显示信用分 |
| 配置 | `src/main/resources/application.yaml` 的 `routeme:` 根；`config/*Properties.java` | 已有 `ai` / `profile` / `experience` / `credit` / `amap` / `weather` 配置范式 |
| 契约 / 迁移 | `openapi.yaml`；`backend/src/main/resources/db/migration/` | 0.26.0；迁移头 `V31__report_credit_deduction.sql` |
| 测试基线 | `backend` / `frontend` | P0 跳过；基线以 `origin/main@f2bad40` 实跑为准 |

### 30.3 As-is → proposed delta（逐资产）

| 资产 | As-is | Proposed delta |
|---|---|---|
| 数据表 | 无成长表 | **新增** `user_growth_account`（每用户 1 条总经验）+ `growth_exp_ledger`（append-only + 幂等键）；**不改** `user_credit_account` / `credit_ledger` / `app_users` |
| 历史数据 | 无成长账户 | 迁移为存量用户建 0 EXP 账户；**不回填**发布 / 点赞 / 举报；新用户懒建 |
| 体验发布 | 仅返回 `created` | 在 `created = true` 分支同事务追加发布经验 +10（配置化）；编辑 / 删除重建不发 |
| 点赞 | 已有唯一行与取消删行 | 在 `like` 成功分支追加分档结算（10/20/30… → +5）；`unlike` 不回滚；档位幂等 |
| 举报 | RESOLVED 已含扣信用分（#29） | 在同一 RESOLVED 分支并列追加被举报用户 −50 EXP；不覆盖既有扣信用分 |
| 每日上限 | 无 | 从流水当日正向实发求和；+20 上限；跨档按剩余额度截断；档位仍锁定 |
| 等级 | 无 | 由 `exp_total` 派生 LV1–LV5；不落库；扣经验后回退；LV5 后继续累计 |
| 契约 | 0.26.0 | 次版本 + 个人主页成长字段 / 批量等级读取；P3 排他确认（预计 0.30.0） |
| 前端展示 | 5 处信用面 + 同行者卡片 | 6 处成长面（`LVn`）；本人主页 / 弹窗追加「当前经验 / 距下一级」；与信用分文案区分 |
| 配置 | `routeme:` 根 | 新增 `routeme.growth.publish-exp`（默认 10）；无管理端 |
| 原型 | 无成长截点（#29 原型改动已并入） | P3 先补原型截点（项目规则要求原型先行；在 #29 原型改动之上追加） |
| 管理端 | 举报处置表单（#29 已加扣信用分展示） | **无 delta**（只挂成长副作用，不改表单与状态机） |

### 30.4 Blast radius（应用架构）

- **后端（1 个新能力 + 3 处事件挂接）：** 新增成长账户 / 流水实体与 mapper、成长经验服务、等级派生与展示查询；体验发布、点赞、举报成立各追加一次同事务结算。
- **数据（2 表 + 1 迁移）：** 建表 + 存量 0 账户回填；双引擎可执行；不新增计数表。
- **契约（1 处扩展）：** 个人主页响应追加成长字段；批量读取追加等级（具体形状 P3）；`OpenApiTest` 版本断言同步。
- **前端（6 个展示面 + 类型 / 文案）：** 新增成长展示组件 / 纯函数；`ProfilePage` / `ProfileModal` / `TripDetailPage` / `TripCard` / `ApplicationsPage` / `CompanionCard` 接入；`api.ts` / `types.ts` / i18n。
- **管理端（0）：** 不改举报表单、不新增成长视图。
- **不影响：** 体验发布 / 点赞语义、举报状态机、信用分的账户与账本、行程生命周期、同行申请与聊天。
- **运行时风险面：** 体验发布 / 点赞 / 举报成立三条写路径各多一次事务内写入；并发下需幂等键与条件更新；每日额度查询需按 `user_id + occurred_at` 建索引。

### 30.5 Artifact impact（specs / tests / docs）

| 工件 | 影响 |
|---|---|
| OpenSpec Delta | `user-growth` **ADDED**（账户与流水 / 等级派生 / 发布 / 点赞 / 每日上限 / 举报扣减 / 展示与可见性 / 只读与幂等）；无 MODIFIED、无 REMOVED |
| 长期规格 | 归档后新增 Living Spec `openspec/specs/user-growth/spec.md`；不改 `user-credit` / `trip-experiences` / `admin-console` |
| 契约 | `openapi.yaml` 次版本 + 个人主页成长字段 / 批量等级读取；后端契约测试同步 |
| 后端测试 | 等级派生边界（99/100、399/400、LV5 累计、回退）；发布 / 点赞 / 举报结算；每日上限截断与日界；幂等与并发；流水等式；懒建账户；用户不存在 |
| 前端测试 | 等级文案与可见性纯函数；6 个展示面集成；他人无经验字段 |
| E2E | 发布 → 点赞 10 → 升级 / 展示；举报成立 → 扣经验；编辑 / 取消点赞不重复；每日上限（可选） |
| 知识库 | `docs/knowledge/interfaces/README.md` 登记成长字段 / 端点（如有新增） |
| 阶段记录 | `docs/sdd/add-growth-level/p1..p4`；`docs/sdd/README.md` 索引 |
| 评审 | `docs/reviews/20261118-add-growth-level-{proposal,spec,design,tasks}-review.md` |

### 30.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `add-growth-level`，单能力 `user-growth`（ADDED）；账户、流水、等级、三类事件与展示写在同一 Delta，避免经验口径分叉。
- **Agile 轨：** 故事 S34「用户成长等级 LV1–LV5」（迭代 3 / P1 / 3 点）即业务口径；不另拆多条故事。
- **并列轨道：** #45 路线完成度（REQ-032 / S33）、经验明细页、排行榜、通知、管理端均为独立故事或独立 change；本需求不预留空壳端点；#29 已并入 main，不再并行。

### 30.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | 契约 / 迁移号与并行 change 撞号 | 基线 0.26.0 + V31（#29 已并入 main 占用）；本 change 落定 **0.30.0 + V35**（原 V34 顺延）；P3 / P4 按合并顺序排他确认 |
| Risk | `AdminReportServiceImpl.resolve` 并列副作用 | #29 已并入 main 的「扣信用分」；本 change 在其后并列追加「扣成长经验」，不覆盖对方；P4 回归 #29 既有测试 |
| Risk | 每日上限时区歧义 | 统一 `Asia/Shanghai`，与既有信用 / 出行业务日一致；`D-5` 断言 UTC 16:00 日界 |
| Risk | 被截断的点赞档位次日被误解为可补发 | 档位幂等记录先于上限判断；零实发也留流水；`D-3` 显式验收 |
| Risk | 等级回退引发用户误解 | 用户已裁决「随经验回退」；展示层不承诺不掉级；`R-6` 显式验收 |
| Risk | 6 个展示面视觉拥挤 / 与信用分混淆 | 原型先行；成长与信用文案、色阶区分；`V-5` 断言 |
| Risk | 「有效赞」是否包含受限 / 封禁用户 | 沿用既有 `experience_likes` 行口径；不改点赞资格；OQ-7 deferred |
| Risk | 体验发布事务失败导致经验回滚 | P3 明确事务边界：优先同事务（发布成功才发经验）；失败不阻断需有明确理由 |
| Risk | 全量 E2E 既有债务 | P4 只跑本 change 与受影响回归，报告标注既有债务 |
| Blocker | 无 | blocking OQ = 0；DoR BLOCKER = 0；A0 ⑨–⑫ 全过 |

### 30.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `add-growth-level` ← REQ-033（迭代 3 / S34）。
- **不拆「账户 / 事件 / 展示」：** 三者共用同一经验口径与账本；拆开会出现「有经验没等级」或「有等级没流水」的不完整验收。
- **不并入 #45 / 明细页 / 排行榜 / 通知 / 权益 / 管理端：** 均为独立故事或独立 change，本 change 不预留端点。
- **阶段：** 单阶段；无归档前置依赖（`user-growth` 全新能力），但需与 #45（REQ-032 / S33）协调契约版本与迁移号；#29 已并入 main，其 `AdminReportServiceImpl.resolve` 冲突点已消除。
- **质量自检（split-heuristics）：** 子目标一句话可说明 ✓；端到端可观察（首次发布 +10 → 10 赞 +5 → 升级 / 展示 → 举报成立 −50）✓；可独立运行 ✓；capability 名真实（`user-growth`）✓；无依赖环 ✓；41 场景为 Ready 口径，P2 已复核合并评估结论。
## 31. REQ-034 变更影响 — 客服会话结束权交由用户（issue #38）

> 编号说明（2026-11-18 合并收口）：起草时登记 REQ-028 / S29，契约暂定 0.25.0 + 迁移 V30；合并 main 时号段被 `add-travel-finance` 占用，按「后到者顺延」落定 **REQ-034 / S35 / V36**，契约并入 main **0.30.0**。

- **日期：** 2026-11-18 ｜ **触发：** issue #38 + 用户当次范围裁决（D1–D9）
- **基线：** `origin/main@822471c`；分支 `feature/refine-service-close`（独立 worktree `.worktrees/refine-service-close`）
- **粒度：** 应用架构（能力边界 / 状态机 / 数据所有权 / 契约 / 展示面），非代码设计

### 31.1 Requirement set

- `requirement-workspace/requirements/REQ-034-service-close.md`（六字段 + 36 场景 + OQ + DoR）
- `requirement-workspace/intents/REQ-034-service-close.md`
- 故事：S35（`stories.md`；无独立故事文件，与 REQ-012 / REQ-019 同口径）
- 能力：`customer-service`（ADDED Requirement）；依赖 `user-support` / `user-auth` / `trip-companions`（只读不变量）。
- **Delta：** `openspec/changes/refine-service-close/specs/customer-service/spec.md`（ADDED）。

### 31.2 As-is asset inventory（evidence paths）

| 资产 | 路径 | 现状 |
|---|---|---|
| 会话状态枚举 | `backend/.../enums/ServiceSessionStatusEnum.java` | 三态 `WAITING` / `HANDLING` / `CLOSED` |
| 会话聚合 / 实体 | `pojo/CustomerServiceSession.java`、`entity/CustomerServiceSessionEntity.java` | `closed_at` / `closed_by`；无 `resolved_*` |
| 会话服务 | `service/impl/CustomerServiceImpl.java` | `openSession` 只含 `WAITING`/`HANDLING`；`close` 仅 `HANDLING` 且写管理员 id；`appendMessage` 只拦 `CLOSED` |
| 用户端接口 | `controller/ServiceController.java` | `current` / `create` / `messages`；无 close |
| 管理端接口 | `controller/AdminServiceController.java` | 列表 / 详情 / `join` / `close` |
| 用户端页面 | `help/SupportPage.tsx`、`help/ServiceChat.tsx` | 状态提示 + 消息区；`CLOSED` 后才出现「重新发起会话」；`reloadSession` 把空 `current` 当 `CLOSED` |
| 管理端页面 | `admin/service/AdminServiceDetailPage.tsx`、`AdminServicePage.tsx` | `WAITING` 接入；`HANDLING` 结束（Popconfirm）；筛选三态；待接入徽标只统计 `WAITING` |
| 共享消息区 | `admin/service/ServiceConversation.tsx` | 只读判定只看 `CLOSED` |
| i18n | `i18n/adminMessages.ts` | `serviceClose` / `sessionNotHandling` / `helpWaiting` / `helpHandling` / `helpClosed` / `helpRestart` |
| 表结构 | `db/migration/V21__admin_console.sql` | `status VARCHAR(12)`；`closed_at` / `closed_by`；索引 `(user_id, status)` 与 `(status, created_at)` |
| 契约 | `RouteME/openapi.yaml` 0.24.0 | 状态枚举三态；管理端 close；错误码 `SESSION_NOT_HANDLING` / `SESSION_ALREADY_HANDLING` / `SESSION_CLOSED` |
| 迁移头 | `db/migration` | `V29__credit_exit_application.sql` |
| 测试 | `e2e/tests/customer-service.spec.ts` `[C3]`、`e2e/tests/admin.spec.ts` `[I3]` | 都依赖管理端 close |
| 规格 | `openspec/changes/add-admin-console/specs/customer-service/spec.md`（未归档） | 「人工客服会话生命周期」写死「用户 MUST NOT 自行关闭会话」与「客服结束会话」 |
| 原型 | `docs/prototype/v1` / `v2` | 无客服会话界面 |

### 31.3 As-is → proposed delta

| 资产 | As-is | Proposed delta |
|---|---|---|
| `customer-service` 规格 | 三态；结束权在客服 | ADDED Requirement「会话结束权与待用户确认」：四态、用户结束三态可用、客服只标记完成、待确认消息回迁、删除管理端 close；声明取代旧 Delta 两条表述 |
| 状态枚举 | 三态 | 增加 `RESOLVED`（待用户确认） |
| 会话表 | 无 `resolved_*` | `V36` 加 `resolved_at` / `resolved_by` 两列（可空） |
| 用户端接口 | 无 close | 新增 `POST /api/service/sessions/{sessionId}/close` |
| 管理端接口 | `close` 仅 HANDLING | 删除 close；新增「标记处理完成」端点（名称 P3 定） |
| `openSession` | `WAITING` / `HANDLING` | 扩为 `WAITING` / `HANDLING` / `RESOLVED` |
| 消息写入 | 只拦 `CLOSED` | `RESOLVED` 下发消息后回迁 `HANDLING` 并清空 `resolved_*`（同事务） |
| 用户端页面 | 无结束按钮；`CLOSED` 才可重新发起 | 三态显示「结束会话」+ 二次确认；`RESOLVED` 提示待确认 |
| 管理端页面 | 结束按钮 + 三态筛选 | 移除结束；新增「标记处理完成」；筛选四态；文案增「待用户确认」 |
| 契约 | 0.24.0；三态；管理端 close | 升 `0.30.0`：状态增 `RESOLVED`；新增两个端点；删除 close；摘要 / 详情增 `resolved_at` |
| 迁移 | V29 | `V36__add_service_session_resolve.sql` |
| E2E | 管理端 close 两处 | 改写为「客服标记完成 → 用户结束」全链路 |

### 31.4 Blast radius（应用架构）

- **客服域：** 状态机、会话服务、消息写入、用户端与管理端接口、共享消息区只读判定、i18n。
- **用户侧入口：** `#/support` 会话头新增动作；`current` 语义扩展影响 SupportPage 初始加载与轮询。
- **管理端：** 客服面板动作区、队列筛选、页签徽标（口径不变但需验证）、会话详情展示 `resolved_at`。
- **契约 / 客户端：** 删除路径会使旧客户端 404；状态枚举新增值影响筛选参数校验与前端映射。
- **数据：** 两列迁移；SQLite 与 H2 双引擎；旧库升级与全新库重放都要覆盖。
- **测试：** 两条既有 E2E 必须改写；新增客服域单测与契约测试；前端纯函数 / 组件测试（结束按钮状态派生）。

### 31.5 Artifact impact

- **OpenSpec：** 新增 `openspec/changes/refine-service-close/`（proposal + `customer-service` ADDED Delta + P2–P4 产物）。
- **需求工作区：** 意图 / Ready / deep-dive 增补 / impact §25 / stories S35 / registry / handoff。
- **代码：** 后端客服域（枚举、服务、两个控制器）；前端 `ServiceChat` / `SupportPage` / `AdminServiceDetailPage` / `AdminServicePage` / `adminMessages` / `api.ts` / `types.ts`。
- **迁移：** `V36` 双引擎（SQLite + H2）。
- **测试：** 后端会话状态机单测 / API 测试 / 迁移测试；前端纯函数单测；E2E `customer-service` / `admin` 改写。
- **文档 / 知识库：** P0–P4 阶段记录、质量报告、评审报告；不更新 Living Spec（P5 不执行）。

### 31.6 Dual-track notes（OpenSpec vs agile）

- **OpenSpec 轨：** 单 change `refine-service-close`，单能力 `customer-service` 追加 ADDED；不改未归档 Delta；归档 MUST 排在 `add-admin-console` 之后。
- **Agile 轨：** 单故事 S35（P0 / 迭代 2 / 2 点）；「用户结束」「客服标记完成」「待确认回迁」是同一状态机闭环，不拆故事。
- **场景数量：** 36 条，单 change 可承载；P2 可按主题拆 Requirement 组，不拆 change。

### 31.7 Risks & blockers

| 级别 | 项 | 说明 / 缓解 |
|---|---|---|
| Risk | `customer-service` 未进入 Living Spec | 只能 ADDED；在 proposal / Delta 显式声明取代 `add-admin-console` 的两条旧表述；归档顺序排在 `add-admin-console` 之后 |
| Risk | `openSession` 漏改导致待确认被误判为已结束 | P0 G-05 已列为必改点；P3 设计显式列出；E2E 补「待确认刷新仍可见」用例 |
| Risk | 消息发送与状态回迁的并发 | 同事务；回迁用 `.eq(status, RESOLVED)` 条件更新；P3 给出顺序与并发测试 |
| Risk | 删除管理端 close 使旧客户端 404 | 契约同步删除并升次版本；E2E 断言路径不存在；无外部客户端依赖 |
| Risk | 状态枚举新增值影响前端映射 | 前端 `ServiceSessionStatus` union 与徽标 / 文案映射同步；typecheck 与单测门禁 |
| Risk | E2E 既有两条用例依赖被删能力 | P4 必须改写；否则删除接口后直接红灯 |
| Risk | 契约 / 迁移号撞号 | 暂定 0.30.0 + V36；P3 排他确认 |
| Risk | issue 「点击没反应」未单独修复 | 用户 D1 明确按钮下线；在 proposal 与交付说明记录该处置 |
| Blocker | 无 | blocking OQ=0；DoR BLOCKER=0；A0 ⑨–⑫ 全过 |

### 31.8 Suggested split boundaries（供 proposal-split / story-split）

- **一个 change：** `refine-service-close` ← REQ-034（S35）。
- **不拆：** 用户结束、客服标记完成、待确认回迁是同一状态机闭环；拆开会出现「能标记但不能结束」或「能结束但客服无处标记」的半成品。
- **不并入：** 客服评价、超时自动关闭、历史会话列表、管理端统计。
- **依赖：** `user-support`（入口）、`user-auth`（Bearer）、`trip-companions`（隔离不变量）。
- **质量自检（split-heuristics）：** 子目标一句话 ✓；端到端可观察（客服标记 → 用户看到待确认 → 用户结束 → 双方只读）✓；可独立运行 ✓；capability 名真实（`customer-service`）✓；无依赖环 ✓；场景 36 条单 change 可承载 ✓。
