# Impact brief — REQ-002 / 003 / 004（MVP 业务能力集）

- **Workdir：** `requirement-workspace/`
- **日期：** 2026-11-15 ｜ **触发：** `/sdd:pre-spec-req` 内嵌 impact-analysis（blocking OQ 与 DoR BLOCKER 均已清零）
- **粒度：** 应用架构（能力 / 页面 / 集成边界），非代码设计

## 1. Requirement set

| id | 能力 | change | 条目路径 |
|---|---|---|---|
| REQ-002 | `trip-plans` | `add-trip-plans` | `requirement-workspace/requirements/REQ-002-trip-plans.md` |
| REQ-003 | `trip-companions` | `add-trip-companions` | `requirement-workspace/requirements/REQ-003-trip-companions.md` |
| REQ-004 | `trip-experiences` | `add-trip-experiences` | `requirement-workspace/requirements/REQ-004-trip-experiences.md` |

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
