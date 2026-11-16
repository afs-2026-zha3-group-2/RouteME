# All specs review — add-trip-publish

- **Verdict: Fail**（BLOCKER 1 / WARNING 6 / SUGGESTION 3）
- **Scope：** focus=`full`（A 架构 / B 质量 / C 测试 / D 安全 / E 过程 / F 文档 / G 工件链与契约追溯）；root=`ai4se-baseline`；change=`openspec/changes/add-trip-publish`；timestamp=`2026-11-16`
- **规则依据：** `docs/knowledge/rules/_INDEX.md` 全量 24 条，按各分类 `rules.md` 正文的「检查项」逐条对照（规则正文为权威）
- **契约：** `RouteME/openapi.yaml`（`info.version: 0.8.1`；本 change 的 0.7.0 升版记录见 `g1-decision.md` / `g2-decision.md`）
- **实现范围：** `RouteME/backend`、`RouteME/frontend`、`RouteME/e2e`；评审基线 commit `bde8024`

## Evidence

**共享验证证据（本次评审直接引用，未重复执行）**

| 栈 | 命令 | 结果 |
|---|---|---|
| backend | `mvnw.cmd -q test` | 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped |
| frontend | `npm run typecheck` | 退出码 0 |
| frontend | `npm test` | 16 个测试文件、137 tests 全部通过 |
| 契约 lint | 根目录 `npm run lint:api` | **无法执行**（仓库根无 `package.json`）→ 工具缺口；`tasks.md` 记录的是 `npx @redocly/cli lint openapi.yaml`（valid），本次未重跑 |
| openspec | `openspec validate add-trip-publish --strict` | `Change 'add-trip-publish' is valid`（本次执行） |
| e2e | 本次未运行 | `tasks.md` T5/T11/T18/T21 记录 `trips.spec.ts` 11/11、全量 53/54（唯一失败为既有 `profiles.spec.ts`） |

**实际读过的工件：** `openspec/changes/add-trip-publish/{proposal.md, design.md, tasks.md, atdd-design.md, dov-ac-review.md, g1-decision.md, g2-decision.md, consistency-lint.md, specs/trip-plans/spec.md}`、`docs/sdd/add-trip-publish/{p1-intent.md, p2-spec.md, p3-design.md, p4-verify.md}`、`docs/reviews/README.md`。

**实际读过的实现/测试：** `RouteME/openapi.yaml`（`TripCreateRequest` / `TripPlan`）；后端 `request/TripCreateRequest.java`、`pojo/TripPlan.java`、`controller/TripController.java`、`service/TripPlanService.java`、`service/impl/TripPlanServiceImpl.java`、`area/AreaNames.java`、`response/TripSummaryResponse.java`、`response/TripDetailResponse.java`；测试 `controller/TripControllerTest.java`、`controller/OpenApiTest.java`、`service/TripPlanServicePersistenceTest.java`；前端 `trips/TripCreatePage.tsx`、`trips/tripForm.ts`、`trips/tripForm.test.ts`、`area/AreaCascader.tsx`、`areas/gazetteerCity.ts`、`i18n/tripMessages.ts`、`types.ts`、`route.ts`；E2E `e2e/tests/trips.spec.ts`。

**git 证据：** 分支 `main`，HEAD `bde8024`（R5 原型重排）；R4/R5 提交 `12868cb`、`bde8024` 同时携带 `add-match-reason` 的改动。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| B-01 | BLOCKER | `rules/process/rules.md#spec-first`、`rules/documentation/rules.md#sdd-artifacts` | `openspec/changes/add-trip-publish/specs/trip-plans/spec.md`（ADDED Requirement「发布表单的默认值与地图上下文」/ Scenario「表单分组与间距一致」）；`RouteME/frontend/src/i18n/tripMessages.ts`（`sectionRoute`/`sectionExtras`/`sectionTags`）；`RouteME/e2e/tests/trips.spec.ts`（`publishes a trip and finds it in the home list`）；`docs/sdd/add-trip-publish/p3-design.md` §12 D12 | Delta Spec 主句与场景 MUST 按「基本信息 / 路线 / 补充信息」三组分组；R5 实现与 E2E 已改为「基本信息 / 简单路线 / 同行与预算 / 兴趣标签」四组，P3 记录 D12 也明确写四组，但 Delta Spec、G1 与 ATDD 均未修订。已批准验收条件与实现直接冲突，且 E2E 把冲突固化成了断言 | 二选一并留痕：① 回退到规格的三组；② 修订 Delta Spec（新分组与场景）、重评 G1、同步 ATDD/任务后再跑回归。不可只改实现与 E2E | [fact] |
| W-01 | WARNING | `rules/testing/rules.md#java-testing` | `RouteME/backend/src/test/java/routeme/service/TripPlanServicePersistenceTest.java`（`in_seededData_out_unfinishedTripsWithProjectedStatus`）；`tasks.md` T2；`atdd-design.md` §2 #11 | Delta Spec 场景「发布的数据在重启后仍在」被 T2/ATDD 声称由「重开 SQLite 连接读回」覆盖，但该用例只读取种子行程，既没有发布写入，也没有重启/重开连接，AC 实际未被验证 | 增加「发布成功 → 关闭并重建 Spring 上下文或重开 SQLite 文件 → 按 id 读回」的用例；或如实修改 T2/ATDD 的覆盖声明并另立重启验证任务 | [fact] |
| W-02 | WARNING | `rules/testing/rules.md#java-testing`、`rules/architecture/rules.md#api-contract` | `RouteME/backend/src/test/java/routeme/controller/TripControllerTest.java`（`in_capacityOutOfRange_out_invalidInput`、`in_unknownDestinationCode_out_invalidInput`）；`RouteME/backend/src/main/java/routeme/request/TripCreateRequest.java`；`backend/src/main/resources/application.yaml`（`spring.jackson` 段） | 规格的后端场景要求拒绝 `capacity = 1` 或 `13` 与非整数；现有断言只覆盖 `1`，没有 `13`、`2.5` 与「格式错误」目的地代码。请求字段是 `Integer`，Jackson 默认 `ACCEPT_FLOAT_AS_INT` 开启时 `2.5` 会被截断为 `2`，可能绕过「计划人数为整数」约束（未配置关闭） | 补 `13`、`2.5`、`44A`/`4400` 等负向用例；关闭 float→int 隐式转换（或在服务层用 `BigDecimal`/字符串解析后校验整数），并断言 400 `INVALID_INPUT` 且无新行 | [inference] |
| W-03 | WARNING | `rules/quality/rules.md#web-coding-style` | `RouteME/frontend/src/area/AreaCascader.tsx`（自绘 `area-trigger` + `role="listbox"` 面板）；`openspec/changes/add-trip-publish/design.md`（D5/D6）；`docs/sdd/add-trip-publish/p3-design.md` §11 | 组件选型规则要求界面控件 MUST 先用 antd，仅当 antd 无组件或存在阻断性缺陷时才允许自绘，且例外 MUST 追加到规则清单并在本 change 的 P3 设计中引用。目的地已使用自绘 `AreaCascader`，理由只写在组件注释；规则清单与 `design.md` 均无该例外 | 在 `@rule:web-coding-style` 的例外清单与 `design.md` 记录自绘原因、替代方案与复核条件；若缺陷已消失则改回 antd `Cascader` | [fact] |
| W-04 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | `openspec/changes/add-trip-publish/design.md`（「风险与例外」）、`atdd-design.md`（§2 #1/#9、缺 §9）、`consistency-lint.md`（C-05/C-06）、`g2-decision.md`（Inputs） | R2–R5 之后权威工件未刷新：`design.md`「风险与例外」仍写「本 change 不修改 `openapi.yaml` 版本」，与 D5/提案/G1 的 0.7.0 冲突；ATDD #1 引用不存在的用例名 `publishes a trip and finds it from the home search`，#9 仍写「按标题搜索」（已改为默认列表/目的地筛选）；`p3-design.md` §12 引用 `atdd-design.md` §9，但 ATDD 只到 §8；`consistency-lint.md` 与 `g2-decision.md` 仍写 1 Requirement / 11 Scenario，实际已是 2 Requirement / 20 Scenario | 一次性刷新 design（契约版本、例外）、ATDD（R4/R5 §9、真实用例名、去掉标题搜索）、consistency-lint 与 G2 计数，并在同一提交内更新 | [fact] |
| W-05 | WARNING | `rules/process/rules.md#artifact-review-gate` | `tasks.md` §10–§11（T16–T21）、`docs/sdd/add-trip-publish/p3-design.md` §12、`g1-decision.md` / `g2-decision.md`、`docs/reviews/` | R4/R5 在 G1/G2 之后扩大了范围（四面板布局、新的 antd 规则、预览栏），但没有 G1 重评或 G2 追加结论；`p3-design.md` §12 的 SA/SM 为「待签」，`p4-verify.md` §13/§14 的 VL/SM 也「待签」。规则 14:05 生效后 `tasks.md`/P3 记录被修改，`docs/reviews` 下没有对应的 `proposal`/`spec`/`design`/`tasks` 评审与批准记录 | 把 R4/R5 的规格/设计/任务补齐后，按 `artifact-review-gate` 逐工件评审并取得 IO/SA/VL 批准，再做 G2 追加；在此之前停止宣称 P4 完成 | [fact] |
| W-06 | WARNING | `rules/testing/rules.md#web-testing` | `RouteME/e2e/tests/trips.spec.ts`（`publishes a trip and finds it in the home list`）；`atdd-design.md` §7 #19；Delta Spec 场景「表单分组与间距一致」 | 场景要求「同组控件宽度一致、相邻字段间距一致」，ATDD #19 声称断言「同组控件宽度差 ≤ 2px」，实际 E2E 只比较目的地 `Cascader` 与其父容器的宽度，没有任何同组控件横向对比或相邻间距断言 | 补同组控件宽度与相邻间距断言，或把该视觉项改为人工核验并在验证报告留存截图与结论，同时修正 ATDD 的覆盖声明 | [fact] |
| S-01 | SUGGESTION | `rules/quality/rules.md#naming-conventions` | `RouteME/backend/src/test/java/routeme/controller/TripControllerTest.java`（`in_destinationCodeOutsideLegacyCatalog_out_created`） | 用例名中的「LegacyCatalog」指向已删除的 `AreaConstant` 切片，与当前全国字典事实不符，容易误导后续维护者 | 改名为 `in_xiamenDestinationCode_out_created`（或 `...OutsideGuangdongSlice...`），只描述输入与结果 | [fact] |
| S-02 | SUGGESTION | `rules/quality/rules.md#web-coding-style` | `RouteME/frontend/src/trips/TripCreatePage.tsx`（`submit()` 与返回按钮的 `window.location.hash`） | 路由字符串 `#/trips/{id}`、`#/` 在页面内重复拼装，`route.ts` 已有 `routeToHash`；路由格式变化时会出现多点漂移 | 统一通过 `routeToHash`（必要时补一个 `navigate` 工具）生成 hash | [fact] |
| S-03 | SUGGESTION | `rules/documentation/rules.md#document-conventions` | `openspec/changes/add-trip-publish/tasks.md`（T21「`profiles.spec.ts:23`」） | 文档引用代码写了行号，规则要求引用文件路径与符号/用例名，不写行号 | 改为引用 `profiles.spec.ts` 的用例标题 | [fact] |

## Per-dimension summary

| 维度 | 结论 | 依据 |
|---|---|---|
| A 架构 | WARNING | 发布仍走 `TripController` → `TripPlanService` → `TripPlanServiceImpl` → `TripPlanMapper`，无跨层捷径；`TripPlan` 领域对象与 `TripCreateRequest`/response 分离；目的地校验集中在 `AreaNames`。组件选型例外未记录（W-03）；契约版本描述漂移（W-04） |
| B 质量 | WARNING | `tripForm.ts` 纯函数集中校验，组件只做渲染与提交；字段 `snake_case` 未转驼峰；`Destination` 预览复用 `TripCard`。残留误导性测试名与路由字符串重复（S-01/S-02） |
| C 测试 | WARNING | 打包/校验/字段级错误/跳转/首页可见均有前端与接口断言；共享套件 213 + 137 全绿。重启持久化 AC 未被验证（W-01），后端整数与 13 边界缺测且存在浮点截断风险（W-02），布局间距只验了一部分（W-06） |
| D 安全 | 未发现 | 新增输入面仍经 `TripPlan.create` 校验，SQL 参数化（MyBatis）；无凭据或 PII 新增；`X-User-Id` 演示身份桩已在 `dov-ac-review.md` / `g2-decision.md` 登记为生产前替换项 |
| E 过程 | WARNING | 提案/规格/设计/任务/ATDD/DoV/G1/G2/一致性检查齐全；R4/R5 未走 G1 重评与 G2 追加，`artifact-review-gate` 无评审与批准记录（W-05）；B-01 属规格未随实现更新 |
| F 文档 | WARNING | 正文中文、标识符英文、相对链接可用；`design.md` 的契约版本说明自相矛盾、ATDD/一致性检查计数与用例名陈旧（W-04），任务引用行号（S-03） |
| G 工件链与契约追溯 | BLOCKER | 大部分链路（Delta Spec → T1–T21 → ATDD → 实现/测试）可追溯，契约字段与实现一致；但 R5 分组与已批准场景冲突且无规格/G1 更新（B-01），R4/R5 无 ATDD/G2 文本，`p3-design.md` 引用了不存在的 §9（W-04/W-05） |

**Skipped：** 根 `npm run lint:api`（仓库根无 `package.json`，工具缺口）；E2E 本轮未执行（引用 `tasks.md` 与 `p4-verify.md` 记录）；GitHub Actions CI 未在本地复核。

## Residual risks

- 业务端点仍以 `X-User-Id` 表达身份，演示环境可伪造；已在 G2 与 DoV 记录为生产前替换项。
- 本 change 仍处于 P4（P5 暂缓）；未生成 `summary.md`，归档时会合并 Living Spec，四面板与三组规格的冲突若不在归档前解决会污染长期规格。
- 契约当前为 0.8.1（后续 change 已继续升版），本 change 文档内仍以 0.7.0 记录；归档 `summary.md` 必须写归档时的真实版本。
- 离线地名库只覆盖广东 14 城 + 港澳，库外城市无法选途经点，属 REQ-007 边界。
- E2E 依赖本地后端/前端与文件型 SQLite，测试数据会累积；本轮未重新执行，回归结论只能引用历史记录。

## Next remediations (non-Gate)

1. 先解决 B-01：回退三组或修订 Delta Spec 并重评 G1，再同步 ATDD/任务/E2E；由 SA 决定分组口径。
2. 补「发布 → 重启 → 读回」的真持久化用例，并补 `capacity = 13`、`2.5`、非法目的地代码的接口负向用例；评估关闭 Jackson float→int 强转。
3. 在 `@rule:web-coding-style` 例外清单与 `design.md` 记录 `AreaCascader` 的自绘理由与复核条件，或迁移到 antd `Cascader`。
4. 刷新 `design.md`、`atdd-design.md`、`consistency-lint.md`、`g2-decision.md` 的版本/计数/用例名，补 ATDD §9（R4/R5）。
5. 按 `artifact-review-gate` 补四份工件评审与批准记录，再补 G2 R4/R5 签署；建议 `/sdd:consistency-lint` 与 `/sdd:atdd-apply`。