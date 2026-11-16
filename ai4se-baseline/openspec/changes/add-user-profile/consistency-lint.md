# Consistency lint — add-user-profile

- **Change:** `add-user-profile`
- **Phase:** `p2`
- **Focus:** full change（`openspec/changes/add-user-profile/`）
- **Timestamp:** 2026-11-16T11:01+0800
- **Artifact level:** 2（proposal + 2 Delta Spec；无 `tasks.md` / `design.md`）
- **Tooling:** `openspec` CLI 1.16.1；`openspec validate add-user-profile --strict` → valid

## Verdict

**Pass** — BLOCKER 0 / WARNING 0 / SUGGESTION 6 / N/A 5

| Condition | Result |
|---|---|
| ≥1 BLOCKER | No |
| ≥1 WARNING | No |
| Only SUGGESTION or no findings | Yes → Pass |
| Tooling-absent cap | Not applied（CLI 可用） |

6 条建议均为 P3 / 归档阶段的落地提示：发布者展示契约归属、昵称单一来源、`DemoUser` 契约兼容、旧账号可空迁移、兴趣词表、头像存储安全。没有规格层面的矛盾或未收敛场景。

## Findings

| id | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority | Type |
|---|---|---|---|---|---|---|---|---|
| L-01 | SUGGESTION | p2 | `proposal.md` §影响面 `frontend/src/trips/`、`frontend/src/experiences/`；`specs/user-profile/spec.md`「个人主页与发布者入口」 | 发布者展示新增头像、主页入口与摘要回退顺序，会改变 `trip-plans` / `trip-experiences` 的可观察输出，但本 change 只给 `user-profile` 与 `user-auth` 写了 Delta，未给这两个能力写 MODIFIED | P3 `design.md` 明确「展示契约归 `user-profile`，行程 / 体验仅消费」；若评审要求在卡片 / 详情场景里固化头像与链接，再补 MODIFIED delta。基线场景「默认列表与卡片信息」仍要求发布者昵称，不能被削弱 | `openspec/specs/trip-plans/spec.md` 第 46 行、第 198 行；`trip-experiences/spec.md` 第 72 行 | spec | [fact] |
| L-02 | SUGGESTION | p2 | `specs/user-auth/spec.md`「注册成功后自动登录」+ `specs/user-profile/spec.md`「个人资料字段与必填规则」 | 昵称同时出现在注册（`user-auth`）与完善页（`user-profile`），规格未说明两者是同一条账号字段，读者可能理解为两份昵称 | P3 `design.md` 声明：昵称唯一来源为 `app_users.nickname`；注册写入初值，完善页编辑同一字段；不新增资料昵称列 | 两份 Delta Spec 的昵称要求 | spec | [fact] |
| L-03 | SUGGESTION | p2 | `proposal.md` §影响面 `openapi.yaml`；`specs/user-profile/spec.md`「头像上传与回退」 | 现契约 `DemoUser` 将 `avatar_initial`、`school` 列为 required；学校改选填、头像改 URL 后，0.7.0 需定义新旧字段并存与兼容期，否则既有响应消费方可能断档 | P3 / P4 明确：保留 `avatar_initial` 直到消费方迁移；`school` 允许空字符串或可空并同步所有响应；`avatar_url` 为新增可空字段；契约 diff 进 PR | `RouteME/openapi.yaml` 第 1192–1210 行（`DemoUser` required 列表） | spec | [fact] |
| L-04 | SUGGESTION | p2 | `proposal.md` §影响面 `V10__*.sql`；`specs/user-profile/spec.md`「资料完善状态与稍后补全」 | 迁移给既有 `app_users` 加列；3 个演示账户与迁移前注册账号没有新字段。规格未声明空值语义，派生「完善状态」可能把 NULL 误判 | P3 迁移任务：所有新列可空并给默认空值；完善状态派生把 NULL / 空串视为缺失；加迁移测试覆盖「演示账号」「迁移前注册账号」 | `V3__create_demo_users.sql`、`V9__add_user_credentials.sql` | spec | [fact] |
| L-05 | SUGGESTION | p2 | `specs/user-profile/spec.md` Requirement「旅行兴趣 3–5 个」 | 预设标签（自然风景 / 文化历史 / 看展）与 `trip-plans` 的行程标签（自然 / 历史 / 展览）不是同一词表，匹配消费精确字符串，会导致匹配理由对不上 | P3 `design.md` 定义词表 / 别名归一化或映射表；本 change 只保证 3–5 个可保存，不改匹配算法 | `trip-plans/spec.md` 第 117 行（兴趣包含匹配）；REQ-008 §8 deferred 项 | spec | [fact] |
| L-06 | SUGGESTION | p2 | `specs/user-profile/spec.md` Requirement「头像上传与回退」 | 规格只约束类型与大小，未定义存储目录、文件名生成、静态访问路径与替换 / 清理策略 | P3 `design.md` 固定服务端生成文件名、目录与访问路径；P4 补安全与非法文件测试 | REQ-008 §5；`proposal.md` §残余风险 | spec | [fact] |

## Checklist coverage

| Check | Result | Note |
|---|---|---|
| P1 `## Why` | Pass | `proposal.md` §问题：账号有、人没有；学校 / 专业合存导致输入 `·` |
| P2 `## What Changes` | Pass | §范围 In scope 10 条，覆盖字段、状态、主页、注册收窄、契约与迁移 |
| P3 Non-Goals | Pass | §范围 Out of scope 6 条，具体（不新增验证 / 相册 / 可见性 / 兴趣词表统一 / 演示编辑 / 独立导航） |
| P4 Impact self / upstream / downstream | Pass | §影响面覆盖前端页面 / 路由 / 后端分层 / 迁移 / 契约 / 测试 / Living Spec |
| S1 Spec structure | Pass | `## ADDED Requirements` + `## MODIFIED Requirements` + `### Requirement` + `#### Scenario`；`openspec validate add-user-profile --strict` valid |
| S2 / S2b / S2c 引用前缀与可达性 | Pass | `proposal.md` 的 `@rule:package-structure`、`@rule:java-patterns`、`@rule:web-coding-style`、`@rule:api-contract`、`@rule:security-baseline`、`@rule:sdd-artifacts` 均可解析；Delta Spec 无未知引用 |
| S3 Requirement → proposal | Pass | 7 条 ADDED Requirement 与 MODIFIED「注册账号」均对应 §范围 in-scope |
| S4 Given / When / Then | Pass | 30/30 Scenario 断言结构完整（`user-auth` 4 个基线场景沿用纯 When / Then 写法） |
| S5 Scenario 归属 | Pass | 无孤儿 Scenario；每个场景挂在唯一 Requirement 下 |
| S6 MODIFIED 基线存在 | Pass | `openspec/specs/user-auth/spec.md` 存在「注册账号」；Requirement 名未改，校验通过 |
| S7 MODIFIED 未丢基线场景 | Pass | 4 个既有场景全部保留；新增 2 个场景（昵称校验、忽略旧字段）不替换旧断言 |
| C1 proposal → spec | Pass | In scope 10 项均有 Scenario 落点（见 `dov-ac-review.md` §Proposal → Delta 覆盖） |
| C2 spec → tasks | N/A | `tasks.md` 未创建（P3） |
| C6 引用可达 | Pass | 规则文件与 change 路径均存在 |
| T1–T3 Tasks rules | N/A | 无 `tasks.md` |
| D1–D3 Design rules | N/A | 无 `design.md` |
| p2-1 proposal scope vs Delta | Pass | 无静默扩张 / 丢弃；用户裁决 D1 / D2 / D6 的覆盖关系已写明 |
| p2-2 Delta 内部一致 | Pass | 「资料未完善 → 已完善 → 编辑覆盖」在 30 个场景中一致；必填集合（昵称 / 生日 / 性别 / 城市 / 兴趣 / 旅行方式）全文一致 |
| p2-3 proposal 关键场景有落点 | Pass | REQ-008 §4 十七条场景 17/17（见 `dov-ac-review.md` §Requirement mapping） |
| p2-4 tasks 方向检查 | N/A | 无 `tasks.md` |
| p2-5 无法追溯的 Requirement | Pass | 无 |

## N/A / skipped

- C2、p2-4、T1–T3（无 `tasks.md`，P3 产出）
- D1–D3（无 `design.md`，P3 产出）
- `openspec show add-user-profile --json --deltas-only`（CLI 1.16.1 要求 `## Why` 英文标题，本仓库全部 proposal 使用「## 问题 / ## 范围」，属既有模板口径；`openspec validate --strict` 已通过，不据此判定失败）
- `openspec validate --changes --strict` 全绿基线（当前 `add-trip-publish`、`refine-inspiration-home` 因 `trip-plans` MODIFIED 遗漏基线场景失败，属并行进行的其他 change；`add-user-profile`、`add-user-logout`、`add-match-reason` 与 6 份 Living Spec 均通过）

## Fix suggestions by priority

1. **P3（should）**：按 L-01 在 `design.md` 声明发布者展示契约归属，并确认基线卡片 / 详情场景不被削弱。
2. **P3（should）**：按 L-02 声明昵称唯一来源与编辑路径。
3. **P3 / P4（should）**：按 L-03 定义 `DemoUser` 0.7.0 新旧字段关系与兼容期，契约 diff 进 PR。
4. **P3（must for migration）**：按 L-04 让新列可空，完善状态派生把 NULL / 空串视为缺失，并补迁移测试。
5. **P3（should）**：按 L-05 定义兴趣词表 / 别名归一化，避免匹配理由错位。
6. **P3 / P4（should）**：按 L-06 固定头像存储、文件名与访问路径，并补非法文件测试。

## Residual risks

| 风险 | 说明 |
|---|---|
| 读者只看 `user-profile` Delta | 发布者卡片行为的改动散落在 `trip-plans` / `trip-experiences` 实现里；L-01 用于兜底 |
| 契约字段既存 | 若 P4 直接替换 `DemoUser.school` / `avatar_initial`，既有卡片与测试可能断档；L-03 要求保留兼容期 |
| 兴趣词表分叉 | 用户资料标签与行程标签不同名，匹配理由可能对不上；P3 前不阻断本故事 |
| 本报告不覆盖代码质量 | P2 只校验规格一致性；实现与测试在 P3 / P4 验证 |

## Reviewer metadata

- Reviewer: opencode（AI agent）
- Human sign-off: pending（G1 由 IO + SA 具名记录）
- Date: 2026-11-16
- 本报告不是 Gate 决策；建议仅供参考，不自动改写权威规格。

## Next

- `phase=p2` → `/sdd:g1-decision-record`。
- 6 条 SUGGESTION 不阻塞 G1，分别落入 P3 `design.md` / `tasks.md` 与 P4 契约任务。