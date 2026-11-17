# All specs review — add-trip-cancel

- **Verdict: Partial**（BLOCKER 0 / WARNING 6（2 已修复、4 待 P3）/ SUGGESTION 5（2 已修复、3 待处理））｜ **签署：已完成（WAYNE + Neal，2026-11-17）**
- **Scope：** focus=`full`（A 架构 / B 质量 / C 测试 / D 安全 / E 过程 / F 文档 / G 工件链与契约追溯）；root=`ai4se-baseline`（worktree `feature/add-trip-cancel`）；change=`openspec/changes/add-trip-cancel`；timestamp=`2026-11-17`
- **Artifact under review：** [`proposal.md`](../../openspec/changes/add-trip-cancel/proposal.md)、[`specs/trip-cancellation/spec.md`](../../openspec/changes/add-trip-cancel/specs/trip-cancellation/spec.md)（ADDED，5 Requirement / 20 Scenario）
- **Supporting inputs：** issue #28 正文（2026-11-17 读取）、用户裁决 D1–D6（2026-11-17）、REQ-019 意图 / Ready 条目 / 故事 S19、`deep-dive.md`「REQ-019 增补」、`impact-brief.md` §19、`docs/sdd/add-trip-cancel/p0-baseline.md`、Living `openspec/specs/trip-plans/spec.md`、`trip-companions/spec.md`、`trip-experiences/spec.md`
- **Evidence：**
  - `openspec validate add-trip-cancel --strict` → `Change 'add-trip-cancel' is valid`（2026-11-17，修复后复跑）
  - 代码证据：`TripStatusEnum`（四态）、`TripPlan.status()`（无取消）、`TripPlanMapper.xml:13-14`（只排 `completed_at`）、`TripPlanServiceImpl.complete()`（无取消）、`ApplicationServiceImpl:235`（仅结束事件批量取消）、`ChatServiceImpl:114`（仅 COMPLETED 只读）、`UserProfileStatsServiceImpl:42-52`（发布行程含全部）、`ExperienceServiceImpl:149`（仅 COMPLETED）
  - 契约证据：`openapi.yaml` 0.11.0 `status` enum 四值；错误码枚举含 `TRIP_NOT_OPEN` / `CHAT_READ_ONLY` / `EXPERIENCE_NOT_ALLOWED` / `FORBIDDEN` / `INVALID_INPUT`
  - 原型证据：`docs/prototype/ui.js:410`（详情页取消入口）、`main.js:646`（二次确认文案）、`store.js:240-248`（取消 PENDING、ACCEPTED 保留）
  - 规则锚点：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/documentation/rules.md#sdd-artifacts`；`rules/architecture/rules.md#api-contract`、`#package-structure`、`#java-patterns`；`rules/quality/rules.md#web-coding-style`；`rules/testing/rules.md#web-testing`

## Findings

| id | severity | rule | location | issue | suggested_fix | status |
|---|---|---|---|---|---|---|
| W-01 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | `proposal.md` 基线行 | 初稿把仍打开的 `add-user-auth` / `add-user-profile` / `add-user-profiles` 写成「已归档」，与 `openspec/changes/` 实际状态不符；会误导归档顺序与 Living Spec 覆盖判断 | 按 `archive/` 实际清单重写已归档 / 已解档 / 进行中三类 | **已修复**（2026-11-17） |
| W-02 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | `docs/sdd/add-trip-cancel/p0-baseline.md` §3 | 未归档增量计数写成 16，实际为 17（含本 change） | 更正为 17 并注明含本 change | **已修复**（2026-11-17） |
| W-03 | WARNING | `rules/process/rules.md#spec-first`、`rules/architecture/rules.md#java-patterns` | Delta R5「取消后不能结束或再次取消」；`TripPlanServiceImpl.materializeIfExpired` / `TripPlanMapper.xml#selectExpiredIds` | 现有「到期自动物化」只判断 `completed_at` 为空且结束日期已过。已取消行程若未从物化扫描中排除，时间越过结束日期时会被写入 `completed_at` 并发布结束事件；虽然取消优先的状态推导仍显示「已取消」，但数据被污染、待处理申请会被重复善后，与「取消是终态、不能结束」的可观察承诺冲突 | P3 明确：`selectExpiredIds` 与 `materializeIfExpired` 同时排除 `cancelled_at` 非空的行程；P4 补「取消行程越过结束日期后 `completed_at` 仍为空」的回归用例 | 待 P3 |
| W-04 | WARNING | `rules/architecture/rules.md#api-contract`、`rules/security/rules.md#pii-scrubbing` | Delta R3「取消原因按角色可见」；`proposal.md` 残余风险「原因裁剪」 | 取消原因与「其他原因」说明只对发布者与 ACCEPTED 同行者可见；详情响应若复用摘要 / 缓存组装，可能把原因泄漏给 PENDING 或其他用户。P1 只写了「按请求人裁剪」，没有约定裁剪边界 | P3 设计明确：取消原因只在详情响应组装时按「发布者或 ACCEPTED」判定后写入；摘要响应不携带原因；补 PENDING / 非参与者的 API 断言 | 待 P3 |
| W-05 | WARNING | `AGENTS.md` §UI design（`prototype-ui-alignment` 宿主投影） | `proposal.md` In scope「原型先行」；`docs/prototype/ui.js` | 当前原型只有详情页取消入口，没有我的旅行行内入口、原因选择与取消态样式；用户裁决 D2 要求两处入口。规则要求先改原型再改实现 | P3 先提交原型变更（`ui.js` / `main.js` / `store.js` / `styles.css`）并附对照说明；P4 实现以原型为视觉基准，覆盖 1440 / 1024 / 768 / 390 与浅 / 深色 | 待 P3 |
| W-06 | WARNING | `rules/process/rules.md#artifact-review-gate` | `docs/reviews/`；本报告 | `proposal` / Delta Spec 的工件评审报告已生成，但 WAYNE 与当前开发者 Neal 的签署位尚未获批；签署未齐前不得进入 P2 | 按签署矩阵取得 `proposal`（WAYNE）、`spec`（WAYNE）与两份报告（WAYNE + Neal）的具名批准后再推进 | 待签署 |
| S-01 | SUGGESTION | `rules/process/rules.md#spec-first` | Delta R4「待处理申请自动取消」 | 初稿只写 PENDING 自动取消与发布者不能处理，未写「待处理申请者在『我申请的』看到申请已取消、行程已取消」；#28 要求「已申请或已加入的用户能够看到行程已取消」 | 在场景中补「我申请的」可观察结果 | **已修复**（2026-11-17） |
| S-02 | SUGGESTION | `rules/process/rules.md#spec-first` | Delta R1 Requirement 陈述 | 初稿「记录取消时间、原因与说明」对非「其他原因」不成立（说明为空） | 改为「记录取消时间与原因；选择『其他原因』时同时记录说明」 | **已修复**（2026-11-17） |
| S-03 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `proposal.md` 归档顺序 / 残余风险；`deep-dive.md` ① | 契约与迁移暂定 0.13.0 + V19；`add-ai-itinerary` 计划 0.12.0 + V18，并行 `add-experience-photos` 亦待排号 | P3 定稿前复核实际落地号段；若被占用则顺延，并同步 `OpenApiTest` 的版本断言 | 待 P3 |
| S-04 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | Delta R3 与 `trip-plans`「浏览未结束的旅行计划」 | 「已取消不出现在默认列表」在 `trip-plans` Living Spec 已存在，本 change 又在新能力中重述，存在双权威风险 | 明确：列表过滤口径归 `trip-plans`；`trip-cancellation` 只声明取消动作与联动的可观察结果；归档时保持两处措辞一致 | 待 P3 / P5 |
| S-05 | SUGGESTION | `rules/_SCHEMA.md`、`rules/documentation/rules.md` | 项目规则 `prototype-ui-alignment` | 宿主投影（根 `AGENTS.md` 与 `.qoder/rules`）引用 `@rule:prototype-ui-alignment`，但权威区 `docs/knowledge/rules/` 下没有同名小节锚点；本报告因此改用 `AGENTS.md` + 普通路径引用 | 作为既有治理漂移另开规则维护项，不在本 change 内修 | 待治理 |

**Counts：** BLOCKER 0 / WARNING 6（2 已修复、4 待 P3）/ SUGGESTION 5（2 已修复、3 待处理）→ **Partial**（满足签署最低门槛，未达到 Pass）。

## #28 验收标准覆盖（15 条）

| # | #28 验收标准 | 承接 | 状态 |
|---|---|---|---|
| 1 | 只有行程发布者能够执行取消 | R1 / 非发布者不能取消行程 | 覆盖 |
| 2 | 只有 RECRUITING 或 FULL 可以取消 | R1 / 非可取消状态不能取消行程 | 覆盖 |
| 3 | 取消前必须选择原因并二次确认 | R2 / 取消原因必选、取消前的二次确认 | 覆盖 |
| 4 | 没有 ACCEPTED 同行者时不扣信用分 | — | **Out（D1）** |
| 5 | 存在 ACCEPTED 时按距离出发时间计算信用影响 | — | **Out（D1）** |
| 6 | 超过 72 小时不扣分 | — | **Out（D1）** |
| 7 | 24–72 小时扣 5 分 | — | **Out（D1）** |
| 8 | 不足 24 小时扣 10 分 | — | **Out（D1）** |
| 9 | 扣分前展示预计扣分 | — | **Out（D1）** |
| 10 | 确认后行程变为 CANCELLED | R1 / 发布者取消招募中 / 已满员 | 覆盖 |
| 11 | 需要扣分时更新信用分并产生记录 | — | **Out（D1）** |
| 12 | 已加入或已申请的用户看到取消结果 | R3 / 详情与我的旅行展示已取消；R4 / 待处理申请自动取消 | 覆盖（含 S-01 修复） |
| 13 | 取消后关闭申请和聊天操作 | R4 / 取消后不再接受申请、已取消行程的聊天只读 | 覆盖 |
| 14 | 特殊情况下可申请免扣分 | — | **Out（D1）** |
| 15 | 管理员批准后恢复信用分并生成记录 | — | **Out（D1）** |

**In-scope 10/10 覆盖；out 5/5 显式记录（用户裁决 D1）。**

## #28 其余规则覆盖（取消规则 / 取消原因 / 取消后的处理）

| 组 | 覆盖 |
|---|---|
| 取消规则 9 条 | 非发布者/状态限制/二次确认/不可恢复/必选原因/状态迁移/终态/不删除数据 → R1、R2、R4、R5 |
| 取消原因 8 项 | R2 / 取消原因必选、其他原因需要说明 |
| 取消后的处理 10 条 | 列表排除、申请关闭、PENDING 关闭、ACCEPTED 保留、结果可见、原因可见、我的旅行保留、无体验入口、聊天只读、禁止结束/再次取消 → R1、R3、R4、R5 |

## DoV 复核

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| V1 | 可验证 | Pass | 每条场景都有 Given / When / Then 与可观察结果 |
| V2 | 可测试 | Pass | 权限、状态、原因、列表、申请、聊天、统计、幂等均可用 API + E2E 断言 |
| V3 | 无歧义 | Pass | S-02 修复后，「记录说明」只在 `other` 时成立；原因码与文案一一对应 |
| V4 | 边界明确 | Pass | 信用分 / 信用记录 / 免扣分 / 管理员审核显式 out（D1） |
| V5 | 可追溯 | Pass | #28 AC → REQ-019 S19-1 ~ S19-20 → Delta 场景 → 故事 S19 四级映射 |

## Baseline preservation

本 change 只有 `ADDED`，没有 `MODIFIED` / `REMOVED` Requirement 块；`trip-plans` / `trip-companions` / `trip-experiences` 的 Living Spec 不被替换。归档为纯新增能力，无基线场景丢失风险（S-04 的双权威风险需在归档时按「列表口径归 trip-plans」收敛）。

## Per-dimension summary

| 维度 | 结论 | 依据 |
|---|---|---|
| A 架构 | WARNING | 新能力承载取消动作与联动，方向正确；到期物化未排除取消（W-03）与原因裁剪边界未定（W-04）需在 P3 关闭 |
| B 质量 | SUGGESTION | 无实现可评；列表口径双权威（S-04）需在 P3 / P5 收敛 |
| C 测试 | 未适用 | P1 尚无测试；P3 / P4 需为状态推导、权限、原因、申请、聊天、统计与 E2E 两条取消主路径补 Red 任务 |
| D 安全 | WARNING | 取消原因属于用户填写的敏感文本；按角色裁剪必须在服务端完成（W-04） |
| E 过程 | WARNING | 工件链齐全、`validate --strict` 通过；WAYNE / Neal 签署位未获批准（W-06） |
| F 文档 | SUGGESTION | 正文中文、标识符与命令英文、相对链接合规；基线清单与计数已修正（W-01、W-02）；原型未先行（W-05）与治理锚点漂移（S-05）待处理 |
| G 工件链与契约追溯 | WARNING | #28 AC 10/10 in-scope 覆盖；契约与迁移号段待 P3 复核（S-03） |

**Skipped：** A/B/C/D 的实现与测试核验（P4 未开始）；契约 lint / 后端 / 前端 / E2E 命令（P1 无代码改动，P4 执行）；`/sdd:explore` 与 `/sdd:agent-evalset`（可选，见 P1 质量报告）。

## Residual risks

- **信用分未交付：** #28 的 5 条信用相关 AC 不在本 change；需在后续 story 单独承接，避免被误判为漏做。
- **状态叠加：** `add-trip-completion` 的四态尚未归档；本 change 不改写其 Requirement 块，但代码需在同一状态推导中组合取消优先级，P4 回归必须覆盖四态 + 取消。
- **号段冲突：** 0.12.0 + V18 由 `add-ai-itinerary` 计划占用；并行 `add-experience-photos` 亦待排号；P3 定稿前复核。
- **原型先行：** 我的旅行入口与原因选择尚无原型，P3 必须先改原型，否则违反 `prototype-ui-alignment`。
- **可见性裁剪：** 详情响应按请求人裁剪原因，需防止摘要 / 缓存复用泄漏。

## Next remediations（non-Gate）

1. 取得 `proposal` / Delta Spec 的 WAYNE 签署与本报告 WAYNE + Neal 的双签署（W-06）。
2. P2 `/sdd:delta-craft` + `/sdd:consistency-lint`，关闭 S-04 的列表口径双权威。
3. P3 关闭 W-03（物化排除取消）、W-04（原因裁剪边界）、W-05（原型先行）与 S-03（号段复核）。
4. P4 按 TDD 覆盖状态推导、权限、原因、申请自动取消、聊天只读、统计、迁移与 E2E 两条取消主路径。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| `proposal.md` | 工件 1 | WAYNE | 2026-11-17 |
| `specs/trip-cancellation/spec.md` | 工件 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 1 | WAYNE | 2026-11-17 |
| 本报告 | 报告 2 | Neal（VL） | 2026-11-17 |

批准来源：发起人 Neal 2026-11-17 回复「批准」，按上一轮请求的签署位（WAYNE + Neal）授权记录。批准范围：`proposal.md`、Delta Spec（5 Requirement / 20 Scenario）与本评审报告。
