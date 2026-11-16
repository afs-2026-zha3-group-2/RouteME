# All specs review — add-destination-area-filters

- **Verdict: Fail**（BLOCKER 2 / WARNING 9 / SUGGESTION 3）
- **Scope：** focus=`full`（A 架构 / B 质量 / C 测试 / D 安全 / E 过程 / F 文档 / G 工件链与契约追溯）；root=`ai4se-baseline`；change=`openspec/changes/add-destination-area-filters`；timestamp=`2026-11-16`
- **规则依据：** `docs/knowledge/rules/_INDEX.md` 全量 24 条，按各分类 `rules.md` 正文的「检查项」逐条对照（规则正文为权威）
- **契约：** `RouteME/openapi.yaml`（`info.version: 0.8.1`，本 change 引入 0.7.0 变更集）
- **实现范围：** `RouteME/backend`、`RouteME/frontend`、`RouteME/e2e`

## Evidence

**共享验证证据（本次评审直接引用，未重复执行）**

| 栈 | 命令 | 结果 |
|---|---|---|
| backend | `mvnw.cmd -q test` | 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped |
| frontend | `npm run typecheck` | 退出码 0 |
| frontend | `npm test` | 16 个测试文件、137 tests 全部通过 |
| 契约 lint | 根目录 `npm run lint:api` | **无法执行**（仓库根无 `package.json`）→ 记为工具缺口，契约维度结论上限 Partial；契约 lint 仅有 `docs/sdd/add-destination-area-filters/p4-verify.md` 记录的 `npx @redocly/cli lint openapi.yaml`（0 error / 15 warning） |
| e2e | 本次未运行 | E2E 结论引用 `p4-verify.md` 的「15 passed / 1 failed」，非本次复核 |

**实际读过的工件**：`openspec/changes/add-destination-area-filters/{proposal.md, design.md, tasks.md, atdd-design.md, dov-ac-review.md, g1-decision.md, g2-decision.md, consistency-lint.md, specs/trip-plans/spec.md, specs/trip-experiences/spec.md}`、`docs/sdd/add-destination-area-filters/p4-verify.md`、`docs/knowledge/architecture/README.md`、`docs/knowledge/_LOG.md`。

**实际读过的实现/测试**：`RouteME/openapi.yaml`；后端 `area/AreaDictionary`、`area/AreaNames`、`pojo/TripPlan`、`pojo/TripMatch`、`request/TripQuery`、`controller/{TripController,MatchController,ExperienceController}`、`response/{TripSummaryResponse,ExperienceResponse}`、`service/impl/{TripPlanServiceImpl,ExperienceServiceImpl,MatchServiceImpl}`、`service/ExperienceService`、`mapper/TripExperienceMapper`、`resources/mapper/{TripPlanMapper,TripExperienceMapper}.xml`、`resources/db/migration/V11__add_destination_area_code.sql`、`resources/area/area-codes.json`；测试 `controller/{TripControllerTest,MatchControllerTest,ExperienceControllerTest,OpenApiTest}`、`pojo/TripMatchTest`、`migration/AreaCodeMigrationSqliteTest`；前端 `area/{areaOptions.ts,AreaCascader.tsx,areaOptions.test.ts}`、`home/HomePage.tsx`、`trips/{tripFilters.ts,tripFilters.test.ts,useMatches.ts,TripCard.tsx,TripDetailPage.tsx}`、`experiences/{useExperiences.ts,ExperienceCard.tsx}`、`i18n/tripMessages.ts`、`types.ts`、`api.ts`、`package.json`；E2E `e2e/tests/{trips.spec.ts,experiences.spec.ts,companions.spec.ts}`。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| B-01 | BLOCKER | `rules/documentation/rules.md#sdd-artifacts` | `openspec/changes/add-destination-area-filters/proposal.md`（`能力` 行）、`specs/trip-plans/spec.md`、`specs/trip-experiences/spec.md` | 规则明确「一个 change 只改一个 capability；跨能力就拆成两个 change」，检查项阻断点为「归档前」。本 change 同时改写 `trip-plans`（ADDED×3 + REMOVED×1）与 `trip-experiences`（MODIFIED×1），`design.md` 与 `g1/g2-decision.md` 均无跨能力例外记录，`consistency-lint.md` 也未包含该项检查 | 拆成两个 change（如 `add-destination-area-filters` + `wire-experience-date-filters`），或在本 change 的 `design.md` 记录跨能力例外并获得 IO/SA 签署，再进入归档 | [fact] |
| B-02 | BLOCKER | `rules/process/rules.md#spec-first`、`rules/documentation/rules.md#sdd-artifacts` | `specs/trip-plans/spec.md`「级联选项可输入过滤」；`RouteME/frontend/src/area/AreaCascader.tsx`；`design.md`「P4 实现修订」；`docs/sdd/add-destination-area-filters/p4-verify.md` §4 | Delta Spec 场景要求「When 输入"珠" Then 选项列表按输入过滤」，但 `AreaCascader` 只有两列 `<button role="option">`，无任何输入框/过滤逻辑；`design.md` 与 `p4-verify.md` 自述「去掉 `showSearch` 输入态」，`atdd-design.md` §2 #6 仍把该场景标为 E2E 覆盖，而 `e2e/tests/trips.spec.ts` 无输入过滤用例；`g2-decision.md` 仍声称「Delta Spec 未被 P4 实现修改；口径仍一致」 | 二选一并留痕：① 恢复可输入过滤（受控输入 + 过滤两列选项）；② 从 Delta Spec 删除该场景、同步 `atdd-design.md` 与 G2 Findings 表述，并在 `design.md` 记录能力裁剪的理由 | [fact] |
| W-01 | WARNING | `rules/architecture/rules.md#api-contract` | `RouteME/openapi.yaml`（`info.version`、`paths./trips` 参数、`TripCreateRequest`） | 本 change 做了三处破坏性契约变更：删除 `q`、查询参数 `destination` → `destination_code`、请求体 `destination` → `destination_code`；契约内 **无任何 `deprecated: true`**，版本仅 0.6.0 → 0.7.0（次版本）。规则要求「删除或重命名字段先标 deprecated 并写替代字段，两端改完后下一个主版本再删」「删除字段、改类型、改语义升主版本」 | 若是项目对 `0.x` 的既有裁定（0.x 次版本视为破坏性），在 `design.md` 记录该裁定；否则恢复 `deprecated` 过渡期或以主版本号表达破坏性 | [fact] |
| W-02 | WARNING | `rules/quality/rules.md#web-coding-style` | `RouteME/frontend/src/area/AreaCascader.tsx`；`docs/knowledge/rules/quality/rules.md`「组件选型」例外清单 | 规则要求界面组件 MUST 优先 antd，改用自绘须「在 P3 design 写明原因」且「新增例外 MUST 追加到本清单」。`design.md` 已写原因（Edge 浮层定位/滚动抖动），但 `quality/rules.md` 的已记录例外仍只有 `ProfileSetupPage` 与 `PlacePicker`，未登记 `AreaCascader`；「排序、枚举下拉」还明确把「自绘下拉」列为避免项 | 在 `quality/rules.md`「组件选型」例外清单追加 `AreaCascader`（原因、修复/升级后改回 antd 的条件），并在 `design.md` 引用该条目 | [fact] |
| W-03 | WARNING | `rules/testing/rules.md#java-testing` | `RouteME/backend/src/test/java/routeme/controller/OpenApiTest.java`（`in_openApiFile_out_tripPlanContractDeclared`、`in_openApiFile_out_companionContractDeclared`、`in_openApiFile_out_experienceContractDeclared`） | `tasks.md` T1 与 `atdd-design.md` §2 #12 声称「`OpenApiTest` 断言无 `q`」「列表接口无关键词参数」，实际三个用例只做 `containsAll(...)` 正向断言，没有对 `q` 的负向断言；`q` 再度被写回契约时测试不会失败 | 在三个用例各加一条 `assertFalse(parameterNames(...).contains("q"), ...)`（或断言参数集合等值），与 ATDD 行一致 | [fact] |
| W-04 | WARNING | `rules/architecture/rules.md#package-structure` | `RouteME/backend/src/main/java/routeme/area/AreaDictionary.java`、`routeme/area/AreaNames.java` | 标准包分类与「层包直接位于根包下，不建业务域目录层」的清单里没有 `area`；静态字典按规则应落 `constant`（`XxxConstant`），`AreaNames` 是无状态静态查询（更接近 `utils`）。`pojo/TripPlan` 直接依赖 `routeme.area.AreaNames` 也绕开了声明的依赖方向清单 | 把字典类迁到 `constant`（如 `AreaCodeConstant`）或 `service`（无表服务 `AreaDictionaryService`），并更新 `docs/knowledge/architecture/README.md` 的包结构登记 | [fact] |
| W-05 | WARNING | `rules/testing/rules.md#web-testing` | `RouteME/e2e/tests/trips.spec.ts`（`filters by province and city without a search box`） | `atdd-design.md` §2 把 #5「只选到省不应用」、#7「按日期区间/周六」、#9「组合筛选」、#11「筛选变化回第 1 页」标为 E2E 覆盖，实际 `trips.spec.ts` 只有「省市级联 + 摘要 + 清除」一条用例；`tasks.md` T9 的覆盖清单（场景 11/12/13…）高于实际用例数 | 补 4 条 E2E（只选省列表不变、`date_from=date_to` 周六、目的地+日期+兴趣组合、第 3 页改条件回第 1 页），或把 ATDD 对应行改注为 API/UT 覆盖并在 `tasks.md` 更正 | [fact] |
| W-06 | WARNING | `rules/quality/rules.md#web-coding-style` | `RouteME/frontend/src/experiences/useExperiences.ts`、`RouteME/frontend/src/trips/tripFilters.ts`（`normalizeRange`） | 行程视图经 `toTripFilters` 交换倒置日期，体验视图把 `filters.dateFrom/dateTo` 原样发出；同一个筛选条在两个视图下对「起不早于晚于起不晚于」给出不同结果（体验视图返回空列表），且无任何测试覆盖 | 让 `useExperiences` 复用 `normalizeRange`（或统一由 `HomePage` 归一后下发），并补一条单测/接口用例 | [fact] |
| W-07 | WARNING | `rules/process/rules.md#spec-first` | `RouteME/backend/src/main/resources/mapper/TripExperienceMapper.xml`（`selectExperiencePage`） | Delta Spec 与 Living Spec 都要求体验「按发布时间倒序排列」，SQL 实际 `ORDER BY e.updated_at DESC`；`ExperienceControllerTest` 只断言条数与 `trip.id`，没有排序断言，改写体验用例时评审无法判定该 AC | 明确口径：按 `created_at` 排序，或在 Spec 术语里把「发布时间」定义为最近更新时间；并补排序断言 | [fact] |
| W-08 | WARNING | `rules/quality/rules.md#coding-style` | `RouteME/frontend/src/i18n/tripMessages.ts`（`searchPlaceholder`）；`RouteME/backend/src/main/java/routeme/service/impl/ExperienceServiceImpl.java`（`listAll`、`matches`） | ① `searchPlaceholder` 已无任何引用（`tasks.md` T8 声称「`tripMessages.ts` 清理搜索占位」未落实）；② `ExperienceServiceImpl.listAll` 仅被测试调用，与 `listPage` 的 SQL 过滤是两套实现（`matches` 无日期维度），后续容易漂移 | 删除 `searchPlaceholder`；把 `listAll` 收敛为测试夹具或删除，消除第二套过滤逻辑 | [fact] |
| W-09 | WARNING | `rules/process/rules.md#git-branching-and-pr`、`rules/process/rules.md#git-commit-conventions` | git 工作区（branch=`main`）、`RouteME/frontend/src/trips/TripCard.tsx`、`RouteME/frontend/src/styles.css`、`RouteME/e2e/tests/trips.spec.ts` 等 11 个未提交文件 | 本 change 仍无 `feature/add-destination-area-filters` 分支、无 `feat(verify): add-destination-area-filters …` 提交；实现依赖工作区未提交改动（规则：一个 change 一条分支、不直接提交 `main`、一个 spec 恰好两次提交） | 建 `feature/add-destination-area-filters` 分支，按 verify / archive 两次提交收口；`docs/knowledge/**` 的知识库回写放到 archive 提交 | [fact] |
| S-01 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `atdd-design.md` 头部、`dov-ac-review.md` AC-1、`g1-decision.md` Inputs 表 | 三处记 `trip-plans` 为「20 Scenario」，`specs/trip-plans/spec.md` 实际 23 个 `#### Scenario:`（`trip-experiences` 13 个一致） | 更正为 23，或说明计数口径 | [fact] |
| S-02 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `proposal.md`（`能力`）、`g1-decision.md`（Inputs） | 标 `trip-plans` 为「MODIFIED」，delta 文件实为 `## ADDED Requirements`×3 + `## REMOVED Requirements`×1 | 把标注改为「ADDED + REMOVED」，或把新的筛选要求写成对「搜索、筛选与排序」的 MODIFIED | [fact] |
| S-03 | SUGGESTION | `rules/quality/rules.md#java-coding-style` | `RouteME/backend/src/main/java/routeme/controller/TripController.java`（`complete`）、`resources/db/migration/V11__add_destination_area_code.sql`（首行注释）、`routeme/request/TripQuery.java`（类注释） | `complete` 方法缩进错位；迁移首行注释写「V10：目的地改为…」而文件名是 V11；`TripQuery` 注释称「按匹配度排序属 REQ-003」，但枚举已含 `MATCH` | 修正缩进与两处过时注释 | [fact] |

## Per-dimension summary

| 维度 | 结论 | 依据 |
|---|---|---|
| A 架构 | WARNING | `api-contract` 破坏性变更无 deprecated/主版本（W-01）；`package-structure` 新包 `routeme.area` 越出层分类（W-04）。依赖方向 `controller → service → service/impl → mapper → entity` 正确，`mapper` 有 `@Mapper`、SQL 全在 XML 且全部 `#{}` 参数化，`pojo` 无持久化注解 |
| B 质量 | WARNING | antd 组件例外未登记（W-02）；死文案与重复过滤实现（W-08）；`TripController` 缩进等 S-03 |
| C 测试 | WARNING | 契约无 `q` 的负向断言（W-03）、E2E 低于 ATDD 声称（W-05）、两视图日期归一不一致无测试（W-06）；后端 213 tests 与前端 137 tests 全绿为正面证据 |
| D 安全 | 未发现 | SQL 全参数化（`TripPlanMapper.xml`、`TripExperienceMapper.xml` 用 `#{}`）；错误体只返回 `code`；`X-User-Id` 演示桩已在 `docs/knowledge/interfaces/README.md` 登记为生产前必须替换；无硬编码凭据、无新增 PII 暴露 |
| E 过程 | BLOCKER | 两 capability 单 change（B-01）；实现未按一 change 一分支/两次提交收口（W-09） |
| F 文档 | SUGGESTION | Scenario 计数与 capability 标注漂移（S-01、S-02）；正文中文、标识符英文、相对链接整体合规 |
| G 工件链与契约追溯 | BLOCKER | Delta Spec 场景「级联选项可输入过滤」与实现/ATDD/G2 三方不一致（B-02）；体验排序口径与 Spec 不符（W-07）；proposal ↔ delta ↔ tasks ↔ atdd 其余链路可追溯 |

**Skipped：** 根 `npm run lint:api`（仓库根无 `package.json`，工具缺口）；E2E 本轮未执行（引用 `p4-verify.md` 记录）。

## Residual risks

- 区划数据来自 `element-china-area-data@5`（约 2019/2020），港澳台二级节点与近年调整可能不一致；升级字典不改契约，但 `V11` 回填映射（香港 → `810001` 中西區、澳门 → `820001` 花地瑪堂區）会成为历史数据口径。
- `add-trip-publish` 的目的地修订（`TripCreatePage`）尚在工作区未提交，本 change 的发布链路只有契约面证据；A 归档前需重评其 G1/G2。
- `refine-inspiration-home` 的搜索空态 E2E 仍是外部依赖（G1/G2 C1），本次未复核其 owner 是否已改写。
- `destination_code` 采用 `NOT NULL DEFAULT ''` 兼容跨库，脏数据只能靠应用层拦截；若有绕过 `TripPlan.create` 的写入路径（脚本/迁移）会留下空码。
- `@rule:artifact-review-gate` 于 2026-11-16 14:04 才引入（commit `114379f`），本 change 的 proposal / spec / design / tasks 均无 `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md` 与批准记录。按「不溯及既往」本次不判 BLOCKER，但归档前是否补建四份工件评审需由 IO/SA 裁定。

## Next remediations (non-Gate)

1. 决策两 capability 处理方式（拆分或补例外记录）——owner：AO/SA，先于归档。
2. 修 B-02：恢复输入过滤或收敛 Delta Spec / ATDD / G2 表述——建议 `/sdd:delta-craft` 重写该场景后重跑 `/sdd:consistency-lint`。
3. 补 `OpenApiTest` 的 `q` 负向断言与 4 条 E2E——建议 `/sdd:atdd-apply`。
4. 登记 antd 例外、迁移 `area` 包、清理死文案/重复实现——建议 `/sdd:rules-govern`（规则例外）与一次小重构。
5. 统一 `useExperiences` 日期归一与体验排序口径，并补排序断言。
6. git 收口：`feature/add-destination-area-filters` 分支 + verify/archive 两次提交。