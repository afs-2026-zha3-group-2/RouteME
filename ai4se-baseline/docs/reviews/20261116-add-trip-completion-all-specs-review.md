# All specs review — add-trip-completion

- **Verdict: Partial**（BLOCKER 0 / WARNING 8 / SUGGESTION 3）
- **Scope：** focus=`full`（A 架构 / B 质量 / C 测试 / D 安全 / E 过程 / F 文档 / G 工件链与契约追溯）；root=`ai4se-baseline`；change=`openspec/changes/add-trip-completion`；timestamp=`2026-11-16`
- **规则依据：** `docs/knowledge/rules/_INDEX.md` 全量 24 条，按各分类 `rules.md` 正文的「检查项」逐条对照（规则正文为权威）
- **契约：** `RouteME/openapi.yaml`（`info.version: 0.8.1`；本 change 计划升 0.9.0，尚未落地）
- **阶段：** 工件处于 P1–P3（`proposal` / Delta Spec / `design` / `tasks` / `atdd-design` / `dov-ac-review` / `g1-decision` / `consistency-lint`）；`docs/sdd/add-trip-completion/` 只有 `p1-intent.md`、`p2-spec.md`、`p3-design.md`，无 P4 记录

## Evidence

**共享验证证据（本次评审直接引用，未重复执行）**

| 栈 | 命令 | 结果 |
|---|---|---|
| backend | `mvnw.cmd -q test` | 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped |
| frontend | `npm run typecheck` | 退出码 0 |
| frontend | `npm test` | 16 个测试文件、137 tests 全部通过 |
| 契约 lint | 根目录 `npm run lint:api` | **无法执行**（仓库根无 `package.json`）→ 工具缺口；本 change 的 T6/T11 计划用 `npx @redocly/cli lint openapi.yaml`，尚未执行 |
| openspec | `openspec validate add-trip-completion --strict` | `Change 'add-trip-completion' is valid`（本次执行） |
| e2e | 未执行（本 change 无 E2E 改动） | — |

**实现检索结果（关键证据）**

- `RouteME/backend/src/main/java/routeme/enums/TripStatusEnum.java` 只有 `RECRUITING` / `FULL` / `COMPLETED`，无 `ONGOING`。
- `RouteME/backend/src/main/java/routeme/pojo/TripPlan.java` 只有无参 `status()`（只读 `completedAt` 与 `joinedCount`），无 `status(Instant)` / `endingSoon` / `plannedStart` / `plannedEnd`。
- 全仓库检索 `materialize|endingSoon|ending_soon|TripCompletedEvent|TripTimeZone|requireCurrent|FixedClock`：除 `UserProfileControllerTest` 既有的生日用 `FixedClockConfiguration` 外零命中；不存在 `TripPlanStatusTest`、`TripCompletionApiTest`。
- 现有 `TripPlanServiceImpl.complete()` 仍只拒绝 `COMPLETED`；`ApplicationServiceImpl.apply()` 仍只接受 `RECRUITING`；`MyTripsServiceImpl` / `UserProfileStatsServiceImpl` 仍以 `completedAt` 判定已完成。

**实际读过的工件：** `openspec/changes/add-trip-completion/{proposal.md, design.md, tasks.md, atdd-design.md, dov-ac-review.md, g1-decision.md, consistency-lint.md, specs/trip-plans/spec.md, specs/trip-companions/spec.md}`、`docs/sdd/add-trip-completion/{p1-intent.md, p2-spec.md, p3-design.md}`、`openspec/specs/trip-plans/spec.md`、`docs/reviews/README.md`。

**实际读过的实现/测试：** `TripStatusEnum.java`、`TripPlan.java`、`TripPlanServiceImpl.java`、`TripPlanService.java`、`ApplicationServiceImpl.java`、`MyTripsServiceImpl.java`、`UserProfileStatsServiceImpl.java`、`MatchServiceImpl.java`、`TripController.java`、`TripSummaryResponse.java`、`TripDetailResponse.java`、`ChatPartnerResponse.java`、`ExperienceResponse.java`、`TripApplicationResponse.java`、`TripPlanMapper.xml`、`TripControllerTest.java`、`TripPlanServicePersistenceTest.java`、`UserProfileControllerTest.java`、`frontend/src/types.ts`、`frontend/src/trips/tripStatus.ts`、`frontend/src/trips/applicationEntry.ts`、`frontend/src/mine/MyTripsPage.tsx`、`frontend/src/trips/TripDetailPage.tsx`。

**git 证据：** 分支 `main`；本 change 的提交 `20eac63`（P1–P2，15:11）、`994adc4`（P3，15:17）；无 P4 提交。`@rule:artifact-review-gate` 于 `114379f`（14:05）引入。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| W-01 | WARNING | `rules/documentation/rules.md#sdd-artifacts`、`rules/process/rules.md#spec-first` | `openspec/changes/add-trip-completion/proposal.md`（What Changes / In scope / D4）；`design.md` D11；`tasks.md` T8；`atdd-design.md` §1/E5–E6；`specs/trip-plans/spec.md`（「查看行程详情与清晰的状态」「发布者结束自己的行程」） | 提案把「结束行程入口落到我的旅行-我发布的」列为必须交付的故事落点，设计与任务也实现了该入口，但 Delta Spec 的 Requirement/Scenario 只约束「行程详情」的入口可见性，没有任何「我的旅行-我发布的」展示结束入口、二次确认与完成后刷新的验收场景。该行为没有规格锚点，后续无法判定是否验收 | 在 `trip-plans` 的「发布者结束自己的行程」或 `trip-companions` 的「我的旅行聚合」Requirement 下补一个场景：发布者在我的旅行看到 ongoing 行程的「结束行程」、二次确认、完成后列表刷新；同步 ATDD 映射 | [fact] |
| W-02 | WARNING | `rules/architecture/rules.md#java-patterns` | `openspec/changes/add-trip-completion/design.md` D2（`TripPlan.status()` 保留并委托 `status(Instant.now())`）；`RouteME/backend/src/main/java/routeme/pojo/TripPlan.java` | 设计明确保留无参 `status()` 并委托 `Instant.now()`。`java-patterns` 要求取时间走可注入时钟、业务代码不得直接 `Instant.now()`；设计风险表也自认「旧调用点遗漏系统时钟」，但仍把违约入口留在领域对象上，测试无法固定该路径 | 删除无参 `status()`，或标 `@Deprecated` 并在同一 change 内把调用点清零（`grep` 验证）；所有业务判定只用 `status(clock.instant())` | [fact] |
| W-03 | WARNING | `rules/architecture/rules.md#package-structure` | `openspec/changes/add-trip-completion/design.md` D4（`TripCompletedEvent`「在 `service` 或 `event` 包」） | 标准包分类中没有 `event`；`service` 包只放 `XxxService` 接口，放 `TripCompletedEvent` 会破坏「类名后缀与包一致」的检查项。设计把包的归属留给 P4 自由选择，届时只能新增未登记包或破坏后缀规则 | 在 P3 定稿事件放置：优先放 `pojo`（业务语义 record）或按例外流程登记 `event` 包并写明理由；同步实现落点清单 | [fact] |
| W-04 | WARNING | `rules/architecture/rules.md#package-structure`、`specs/trip-plans/spec.md`（「前端状态过期时以服务端判定为准」） | `design.md` D3（`materializeIfExpired` 标 `@Transactional`，由 `requireCurrent` 内部调用）；`design.md` §4 风险表 | 设计把 `@Transactional` 只放在 `materializeIfExpired` 上，而 `requireCurrent` 在同一个类内自调用它；Spring 代理不拦截自调用，条件更新与事件（进而批量取消申请）可能不在同一事务中，与规格要求的「写入计划结束时刻并同事务取消待处理申请」冲突。设计未说明事务入口放在哪个 public 方法或拆到独立 bean | 把 `@Transactional` 放在外部入口（`requireCurrent` / `materializeExpired` / `complete`）并注明自调用限制，或把物化下沉到独立 bean；补一条「物化失败/异常时申请不被取消」的事务回滚用例 | [inference] |
| W-05 | WARNING | `rules/architecture/rules.md#package-structure`、`rules/architecture/rules.md#orchestration-execution-separation` | `design.md` D9（`from(...)` 增加 `Instant now`，7 处补 `clock.instant()`）；`RouteME/backend/src/main/java/routeme/controller/TripController.java`（`list`/`detail`/`create`/`complete`）、`controller/MatchController.java`（`MatchCandidateResponse.from`） | 设计要求所有 `TripSummaryResponse.from` / `TripDetailResponse.from` 调用点传 `clock.instant()`，但 `TripController` 与 `MatchController` 没有 `Clock`；设计既未说明给 controller 注入时钟，也未说明改由 service 组装响应。实际调用点为 `TripSummaryResponse.from` 6 处 + `TripDetailResponse.from` 3 处 = 9 处，`tasks.md` T6 写 7 处，计划不完整 | 明确时间源归属：由 service 返回带 `now` 的组装结果或在 service 内完成 `response.from`；避免把 `Clock` 注入 controller。同时修正调用点计数并逐个列出落点 | [fact] |
| W-06 | WARNING | `rules/testing/rules.md#web-testing`、`rules/process/rules.md#tdd-cycle` | `atdd-design.md` §1「UT（apply 阶段补充）」；`tasks.md` T7/T8 | ATDD 明确要求补 `applicationEntryState` 的 ongoing 分支与「前端提醒渲染」单测，但 T7/T8 只列实现项与 `npm test` 回归，没有新增测试文件、用例名或 Red 步骤；规格中的「无参与资格不展示提醒」「收到 409 后刷新并提示已结束」也没有对应测试任务。前端改动缺少可失败的验收起点 | 在 T7/T8 前补前端 Red 任务，指名测试文件与用例（如 `applicationEntry.test.ts` 的 ongoing 分支、`TripDetailPage.test.tsx` 的提醒资格与 409 刷新），并纳入 ATDD 映射 | [fact] |
| W-07 | WARNING | `rules/documentation/rules.md#sdd-artifacts`、`rules/process/rules.md#spec-first` | `openspec/changes/add-trip-completion/proposal.md`（「基线」行）；`specs/trip-plans/spec.md`（MODIFIED「发布可被他人理解的旅行计划」）；`openspec/changes/add-trip-publish/specs/trip-plans/spec.md` | 提案把 `add-user-auth`、`add-user-profile`、`add-user-profiles` 写成「已完成/归档」，但它们在 `openspec/changes/` 仍是打开的 change；同时漏掉同样打开且修改同一条「发布」Requirement 的 `add-trip-publish`。本 change 的 MODIFIED「发布」仍写「目的地来自固定候选」，没有承接 `add-trip-publish` 已定的 `destination_code`；若本 change 后归档会把该字段回退 | 更正基线清单（打开/归档分开列）；在 MODIFIED「发布」Requirement 上叠加 `destination_code` 语义，或在提案写明与 `add-trip-publish` 的归档顺序与合并策略；P5 前复核 living spec | [fact] |
| W-08 | WARNING | `rules/process/rules.md#artifact-review-gate` | `openspec/changes/add-trip-completion/{proposal.md, specs/trip-plans/spec.md, specs/trip-companions/spec.md, design.md, tasks.md}`；`docs/reviews/` | 规则 14:05 生效后，本 change 的 proposal/spec（15:11）与 design/tasks（15:17）陆续产出，但 `docs/reviews/` 下没有 `20261116-add-trip-completion-{proposal,spec,design,tasks}-review.md`，也没有开发者 approval；G1 只覆盖 Delta Spec，不替代四份工件评审 | 按 `artifact-review-gate` 逐工件补评审与 approve（同一天重评用 `-review-2.md`），再进入 P4 | [fact] |
| S-01 | SUGGESTION | `rules/architecture/rules.md#api-contract` | `design.md` D10（`ending_soon` boolean）；`RouteME/openapi.yaml`（现有 `profile_complete`、`received`） | 契约规则要求布尔字段用 `is_` / `has_` 前缀；`ending_soon` 不符合。现有 `profile_complete` / `received` 也偏离，说明是存量约定而非单点失误，但新字段仍应显式裁定 | 二选一：改名 `is_ending_soon` / `has_ending_soon`；或在 `design.md` 记为契约例外并在 `openapi.yaml` description 说明沿用存量命名。不要静默新增偏离 | [fact] |
| S-02 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `design.md` D1（`TripTimeZone.ZONE`）与「实现落点清单」（`constant/TripTimeZoneConstant.java`）；`tasks.md` T2 | 同一常量在设计中出现两个名字（`TripTimeZone` / `TripTimeZoneConstant`），实现落点与任务用的是后者；`naming-conventions` 要求同一概念只有一个词 | 统一为 `TripTimeZoneConstant`（`constant` 包），同步 D1、落点清单与 T2 | [fact] |
| S-03 | SUGGESTION | `rules/testing/rules.md#java-testing` | `tasks.md` T1–T11 的验证命令（`./mvnw ...`） | 规则规定 Windows 用 `mvnw.cmd`、其他平台用 `./mvnw`；本仓库开发环境是 Windows，任务里的 `./mvnw` 与既有 change 的 `.\mvnw.cmd` 不一致，照抄会失败 | 统一写成 `cd RouteME/backend; .\mvnw.cmd -q -Dtest=... test`（保留跨平台说明可选） | [fact] |

## Per-dimension summary

| 维度 | 结论 | 依据 |
|---|---|---|
| A 架构 | WARNING | 四态仍放在 `pojo/TripPlan` 派生、物化留在 `service/impl`、跨能力善后用事件解耦，方向正确；但无参 `status()` 的 `Instant.now()`（W-02）、事件包归属（W-03）、`@Transactional` 自调用（W-04）、controller 侧时间源未定（W-05）都是设计层未闭合的架构决策 |
| B 质量 | SUGGESTION | 尚无实现可评；设计中的 `TripTimeZone` / `TripTimeZoneConstant` 同名异物（S-02）会传导到实现与测试命名 |
| C 测试 | WARNING | T1 规划了后端 Red（四态/结束/物化），但前端 ongoing/提醒/409 刷新没有测试任务（W-06）；P4 未开始，所有测试证据 Skipped |
| D 安全 | 未发现 | 结束/提醒/申请取消都在服务端判定，前端隐藏不作为边界；未新增凭据、PII 或提示注入面；`X-User-Id` 桩为既有遗留风险 |
| E 过程 | WARNING | 提案 → Delta Spec → DoV → G1 → 设计 → 任务 → ATDD 齐全，`openspec validate --strict` 通过；`artifact-review-gate` 的四份评审与批准缺失（W-08） |
| F 文档 | SUGGESTION | 正文中文、标识符/命令英文、相对链接合规，引用无行号；基线清单与常量命名需修正（W-07、S-02） |
| G 工件链与契约追溯 | WARNING | 大部分 Requirement ↔ 任务 ↔ ATDD 映射成立；「我的旅行」结束入口无规格场景（W-01），与 `add-trip-publish` 的同一发布 Requirement 存在归档覆盖风险（W-07）；契约 `ongoing` / `ending_soon` 尚未落地，无法验证 |

**Skipped：** A/B/C/D 的实现与测试核验（P4 未开始，相关类/用例不存在）；根 `npm run lint:api`（无根 `package.json`）；E2E 不适用；契约 lint 未运行（T6/T11 计划项）。

## Residual risks

- 本 change 尚无生产代码与测试（无 `TripPlanStatusTest` / `TripCompletionApiTest` / `FixedClockTestConfig`，`TripStatusEnum` 无 `ONGOING`）。本次评审只覆盖 P1–P3 工件，A/B/C/D 的实现结论全部待 P4 重评。
- 自动完成采用「懒写入物化」：任何绕过统一入口的读/写都会在「页面停留过期」窗口内错误放行（`consistency-lint.md` L-06 已登记）；P4 必须以 greps + 用例证明所有入口都经过 `requireCurrent` / `materializeExpired`。
- 提醒去重未持久化（OQ-10），每次进入页面都会展示；MVP 接受。
- `trip-experiences` / `user-profiles` 无 Delta，只有 `trip-plans` 的四态定义；P4 必须以回归用例证明体验入口与统计口径同步，否则归档后无规格约束。
- 多个打开中的 change（`add-trip-publish`、`add-destination-area-filters`、`refine-inspiration-home`、`add-match-reason`）修改相邻 Requirement；归档顺序未全部锁定，存在 Living Spec 覆盖冲突。

## Next remediations (non-Gate)

1. 补「我的旅行-我发布的」结束入口的 Delta 场景，并同步 ATDD 映射（`/sdd:delta-craft`）。
2. 在 P3 关闭三个架构决策：删除无参 `status()`、确定 `TripCompletedEvent` 的包、把事务边界放在外部入口并补回滚用例；同时明确响应组装的时间源（避免 controller 注入 `Clock`）。
3. 为前端 ongoing 分支、提醒资格、409 刷新补 Red 任务与用例名（`/sdd:atdd-apply`）。
4. 更正提案基线清单，明确与 `add-trip-publish` / `add-destination-area-filters` 的归档顺序与发布 Requirement 的叠加方式。
5. 按 `artifact-review-gate` 补四份工件评审与批准，再进入 P4；P4 完成后重跑本评审。