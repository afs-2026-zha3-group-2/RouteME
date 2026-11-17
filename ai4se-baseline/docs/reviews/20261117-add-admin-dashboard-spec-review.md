# Delta Spec 评审报告 — add-admin-dashboard

- **工件：** `openspec/changes/add-admin-dashboard/specs/admin-dashboard/spec.md`（rev2）
- **change-id：** `add-admin-dashboard`
- **需求条目：** `requirement-workspace/requirements/REQ-023-admin-dashboard.md`（REQ-023 / S25）
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:api-contract`、`@rule:web-testing`、`@rule:pii-scrubbing`；基线 `main@b50e416`）
- **评审输入：** Delta 正文；`proposal.md`；`requirement-workspace/requirements/REQ-023-admin-dashboard.md`、`intents/REQ-023-admin-dashboard.md`、`stories/add-admin-dashboard.story.md`；既有能力 `openspec/changes/add-admin-console/specs/admin-console/spec.md`；源码 `RouteME/backend/.../pojo/TripPlan.java`、`service/{AdminPrincipalService,AccountStatusService}.java`、`enums/*.java`、`db/migration/{V3,V4,V5,V7,V8,V21}*.sql`；`RouteME/openapi.yaml` 0.17.0；前端 `route.ts`、`AdminLayout.tsx`、`AdminGuard.tsx`
- **工具校验：** `npx --no-install openspec validate add-admin-dashboard --strict` → `Change 'add-admin-dashboard' is valid`（rev1 首跑曾有 1 条 WARNING，见 S1-01；修正后无 WARNING）；`openspec show add-admin-dashboard --json --deltas-only` → `deltaCount: 5`

## 评审结论

**Pass**（BLOCKER 0 / WARNING 4（全部当场修正）/ SUGGESTION 2（1 修正、1 保留说明））

Delta 为单 capability `admin-dashboard`（ADDED 5 Requirement / 13 Scenario）。Requirement 按「端点与访问控制 / 响应结构与零填充 / 账号与行程口径 / 新增窗口 / 概览页」拆分，每条只陈述一组可验证行为；场景覆盖权限、零值、有效状态、行程推导、分桶自洽、时间窗口、无缓存与页面交互。所有 SHALL / MUST 都能落到可观察结果（状态码、字段值、跳转、请求次数），没有实现类名、SQL 或前端组件结构。

## 场景覆盖

| Requirement | 场景数 | 场景 |
|---|---|---|
| 管理后台概览统计端点与访问控制 | 3 | 管理员读取概览统计；非管理员与未认证被拒绝；写入后立即反映 |
| 概览计数结构与零填充 | 1 | 空库返回固定零值 |
| 概览统计的账号与行程口径 | 3 | 封禁到期的账号计入正常；已取消行程与全部申请状态都计入；总数与分桶自洽 |
| 概览统计的新增计数窗口 | 1 | 新增计数按产品时区自然日窗口 |
| 管理后台概览页 | 5 | 管理员进入后台默认看到概览；指标卡与跳转边界；非管理员直接访问被拒绝；加载失败可重试；手动刷新且不自动轮询 |
| **合计** | **13** | 对应 REQ-023 §4 S25-1 ~ S25-13 |

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| S1-01 | WARNING | `@rule:sdd-artifacts` | Requirement「管理后台概览统计聚合」 | 初稿把端点、响应结构、账号口径、行程推导与新增窗口写进同一条 Requirement，正文超过 500 字符；`openspec validate --strict` 直接报 WARNING，且一条需求承载多组行为不利评审 | 按「一条需求 = 一组行为」拆为 5 条 Requirement：端点与访问控制 / 响应结构与零填充 / 账号与行程口径 / 新增窗口 / 概览页 | `openspec validate` 首跑输出；`@rule:artifact-review-gate` | **已修**（rev2 校验通过） |
| S1-02 | WARNING | `@rule:spec-first` | 场景「新增计数按产品时区自然日窗口」 | 初稿第二条给定「今天 00:00 之前 6 天内」，却断言「只计入 `newLast30Days`」；但 7 天窗口 = 当天 + 前 6 个自然日，该记录本应同时计入 7 天，场景与 Requirement 自相矛盾，照此写测试会得到错误预期 | 第二条改为「今天 00:00 之前 8 天」（只入 30 天），第三条改为「之前 31 天」（都不入） | Delta「概览统计的新增计数窗口」；产品时区窗口定义 | **已修** |
| S1-03 | WARNING | `@rule:sdd-artifacts` | Requirement「概览计数结构与零填充」 | 初稿举报组与客服会话组只定义 `byStatus`，而「总数与分桶自洽」场景要求「举报与会话的总数各自等于分桶之和」；响应无 `total` 则断言无对象 | 两组补 `total`，并在口径场景中保留求和约束 | Delta 同条；提案「六组指标口径」表 | **已修**（提案同步） |
| S1-04 | WARNING | `@rule:sdd-artifacts` | Requirement「概览计数结构与零填充」；「管理后台概览页」 | 页面场景要求展示「最近更新时间」，但响应结构没有定义时间字段，实现方无处取值 | 响应补 `generatedAt`（统计生成时刻），页面复用它 | Delta 两条 Requirement；提案影响面 | **已修**（提案同步） |
| S1-05 | SUGGESTION | `@rule:api-contract` | Requirement「管理后台概览统计端点与访问控制」 | 初稿只写非管理员 403 与未认证 401，未说明 `SUSPENDED` / `BANNED` 管理员的行为；既有 `AdminPrincipalService` 会先校验角色再校验账号状态 | 补一句「受限管理员 MUST 按既有管理端错误码拒绝」，不新增错误码 | `AdminPrincipalService.java:30-43`；`admin-console`「受限账号的功能边界」 | **已修** |
| S1-06 | SUGGESTION | `@rule:sdd-artifacts` | 全篇状态键命名 | 账号 / 举报 / 会话用大写枚举名（`ACTIVE`、`PENDING`、`WAITING`），行程 / 申请用小写 wire 值（`recruiting`、`pending`），看起来不统一 | 保留现状：分别沿用两侧既有 wire 值，避免概览与用户侧列表出现两套词表；P3 在契约里以 schema 定义收敛 | `enums/TripStatusEnum.java`、`ApplicationStatusEnum.java`、`AccountStatusEnum.java`；`openapi.yaml` 既有 schema | **保留说明** |

**Counts：** BLOCKER 0 / WARNING 4（全部已修）/ SUGGESTION 2（1 已修、1 保留说明）→ **Pass**

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| Delta 结构是否符合 OpenSpec | Pass：单 capability、`## ADDED Requirements`、5 条 `### Requirement:`、13 个 `#### Scenario:` 均含 Given / When / Then；`--strict` 无 WARNING；`deltaCount: 5` |
| 一条需求是否只陈述一组行为 | Pass（rev2）：拆分后每条聚焦端点、结构、口径、窗口或页面，正文均低于 500 字符 |
| 场景是否可观察 | Pass：403 / 401、零值、分桶求和、窗口归属、跳转、无周期请求均为可断言结果；无「正常工作」类空泛表述 |
| 是否越界定义实现 | Pass：未写类名、方法签名、SQL 或组件树；仅用端点路径、响应键与状态值 |
| 权限是否落在服务端 | Pass：Requirement 明确端点拒绝非管理员；页面只是「不展示、不发请求」，安全边界在服务端 |
| 是否与 `admin-console` 冲突 | Pass：本 Delta 只 ADDED 新能力；账号状态、管理员校验与后台布局的语义引用既有能力，不重复定义、不修改文本 |
| 账号口径是否与治理页一致 | Pass：`BANNED` 到期计入 `ACTIVE`，与 `AccountStatusService.effectiveStatus` 的惰性恢复一致；P4 需用固定 `Clock` 验证 |
| 行程口径是否与用户侧一致 | Pass：明确复用「取消 > 已结束 > 旅行中 > 满员 > 招募中」推导，并禁止新增持久化状态列；与 `TripPlan.status(Instant)` 逐分支对应 |
| 时间窗口是否可判定 | Pass：产品时区（Asia/Shanghai）自然日、含当天、7 / 30 天定义与边界场景一致（rev2 修正了 off-by-one） |
| 零值与空态 | Pass：状态桶固定返回 0；页面 0 不以空白替代；无「省略键」歧义 |
| 隐私 / PII | Pass：响应只含计数与 `generatedAt`；明文禁止昵称、邮箱、头像；聚合不产生新的个人数据暴露面（`@rule:pii-scrubbing`） |
| 与提案是否一致 | Pass：5 Requirement / 13 Scenario = 提案声明；六组口径、页面跳转边界、无缓存、手动刷新逐条对应 |
| 与故事 / 需求是否可追溯 | Pass：S25-1 ~ S25-13 与 13 个场景一一对应；DoR 与 OQ 的 12 项裁决均在 Delta 有落点 |

## 残余风险

- **场景与实现仍需 P3 细化。** Delta 不定义 `AdminDashboard` 的 JSON 嵌套细节（例如 `byRole` 是对象还是数组）；P3 契约设计需固定 schema，P4 由 `OpenApiTest` 断言。
- **时间窗口测试依赖可替换时钟。** 00:00 边界与封禁到期都必须用固定 `Clock`；若实现直接 `Instant.now()`，场景会变成不可重复的时间敏感测试。
- **状态键大小写不统一（已接受）。** 见 S1-06；P3 需在契约里显式列出键名，避免前端自行猜测。
- **`total` 与分桶求和在实现中可能用不同查询。** 若两次查询不在同一快照，极端并发下可能出现「总数 ≠ 分桶之和」；P3 需明确用同一时刻或同一查询集计算。
- **无历史快照。** 7 / 30 天新增只回答「最近」，无法回溯上周的同一指标；趋势与快照另开需求。

## 下一步（非 Gate）

- 收集 Delta Spec 的 WAYNE 签署与本报告的两处签署（WAYNE + Jacky）。
- 签齐后进入 P2：AC/DoV 复核、`consistency-lint`，并确认 S1-06 的键名口径进入契约草案。
- P3：确定 `AdminDashboard` schema、查询时刻一致性与三档布局。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| Delta Spec（`admin-dashboard`） | 工件 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（SA） | 2026-11-17 | 已批准 |

> 按 `@rule:artifact-review-gate`，Delta Spec 由 WAYNE 签署，评审报告由 WAYNE + 当前开发者（Jacky）签署；三处于 2026-11-17 按发起人确认签齐，P2 解锁。

## 变更摘要（2026-11-17，P3 入口）

- 仅命名与格式修正，不改变语义：响应组名与字段名由 camelCase 改为 `@rule:api-contract` 要求的 snake_case（`service_sessions`、`generated_at`、`by_role`、`by_status`、`new_last_7_days`、`new_last_30_days`），场景中的 `users.byStatus.*` 同步为 `users.by_status.*`。状态枚举键的大小写按 S1-06 保留（账号 / 举报 / 会话大写，行程 / 申请小写）。
- 依据 `@rule:artifact-review-gate`「只改错字、链接或格式且不改变语义的修订，可复用上一份 `Pass` 报告」，本报告结论与签署记录保持有效，不重开评审；`openspec validate add-admin-dashboard --strict` 复跑仍为 valid（5 Requirement / 13 Scenario）。