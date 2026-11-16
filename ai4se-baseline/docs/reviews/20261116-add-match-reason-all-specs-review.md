# All specs review — add-match-reason

- **Verdict: Partial**（BLOCKER 0 / WARNING 6 / SUGGESTION 3）
- **Scope：** focus=`full`（A 架构 / B 质量 / C 测试 / D 安全 / E 过程 / F 文档 / G 工件链与契约追溯）；root=`ai4se-baseline`；change=`openspec/changes/add-match-reason`；timestamp=`2026-11-16`
- **规则依据：** `docs/knowledge/rules/_INDEX.md` 全量 24 条，按各分类 `rules.md` 正文的「检查项」逐条对照（规则正文为权威）
- **契约：** `RouteME/openapi.yaml`（`info.version: 0.8.1`；本 change 的 R2 变更集把 0.8.0 → 0.8.1）
- **实现范围：** `RouteME/backend`、`RouteME/frontend`、`RouteME/e2e`

## Evidence

**共享验证证据（本次评审直接引用，未重复执行）**

| 栈 | 命令 | 结果 |
|---|---|---|
| backend | `mvnw.cmd -q test` | 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped |
| frontend | `npm run typecheck` | 退出码 0 |
| frontend | `npm test` | 16 个测试文件、137 tests 全部通过 |
| 契约 lint | 根目录 `npm run lint:api` | **无法执行**（仓库根无 `package.json`）→ 工具缺口，契约维度结论上限 Partial；仅 `tasks.md` T1/T8 记录的 `npx @redocly/cli lint openapi.yaml`（valid，0 error / 7 既有 warning） |
| e2e | 本次未运行 | `tasks.md` T5/T11 记录 `companions.spec.ts` 8/8 通过，非本次复核 |

**实际读过的工件**：`openspec/changes/add-match-reason/{proposal.md, design.md, tasks.md, atdd-design.md, dov-ac-review.md, g1-decision.md, g2-decision.md, consistency-lint.md, specs/trip-companions/spec.md}`、`docs/sdd/add-match-reason/p3-design.md`（工作区已改）、`openspec/specs/trip-companions/spec.md`。

**实际读过的实现/测试**：`RouteME/openapi.yaml`（`Match` / `MatchCandidate`）；后端 `pojo/TripMatch.java`、`pojo/TripPlan.java`、`service/impl/MatchServiceImpl.java`、`service/impl/TripPlanServiceImpl.java`、`service/MatchService.java`、`controller/MatchController.java`、`response/MatchCandidateResponse.java`、`param/TripQueryParam.java`；测试 `pojo/TripMatchTest.java`、`controller/MatchControllerTest.java`、`controller/OpenApiTest.java`；前端 `trips/TripCard.tsx`、`trips/TripDetailPage.tsx`、`trips/useMatches.ts`、`trips/tripFilters.ts`、`home/HomePage.tsx`、`i18n/tripMessages.ts`；E2E `e2e/tests/companions.spec.ts`。

**git 证据**：当前分支 `main`，工作区 11 个未提交文件（含 `TripCard.tsx`、`TripDetailPage.tsx`、`tripMessages.ts`、`e2e/tests/companions.spec.ts`）；提交 `12868cb refactor(p4): add-trip-publish add-match-reason …`、`94dc2b3 docs(p4): add-trip-publish add-match-reason …`。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| W-01 | WARNING | `rules/architecture/rules.md#api-contract` | `RouteME/openapi.yaml`（`components.schemas.Match`） | `tasks.md` T1 声明「`reasons` 为非空字符串数组」，Delta Spec 也 MUST 非空，但契约里 `reasons` 只有 `type: array` + `items: string`，**无 `minItems: 1`、无 `description`**。`api-contract` 要求「字段语义写进 description，数值范围写进 schema；只写在注释里等于没有约束」，契约因此无法判定「空数组」为违约 | 给 `reasons` 加 `minItems: 1` 与说明「逐维度原因文本，至少一条」，并在 `OpenApiTest` 断言 | [fact] |
| W-02 | WARNING | `rules/documentation/rules.md#sdd-artifacts`、`rules/quality/rules.md#web-coding-style` | `openspec/changes/add-match-reason/tasks.md`（T10、T11）、`atdd-design.md`（§2 #1/#8、§3）、`RouteME/frontend/src/trips/{TripCard.tsx,TripDetailPage.tsx}` | `tasks.md` T10 声称「详情原因 `<ul>` → `Tag` 列表」「删除 `.match-reason-list`」，T11 声称断言改 `.match-reasons .ant-tag` 与 `.match-progress-text`；实现里两者都不存在：卡片与详情都用 `<span className="match-reason">` 逗号拼接，详情用 `<Progress type="circle" format={(percent) => percent}>`。`atdd-design.md` §2 仍写 `.match-score` / `.match-reason-label` / `.match-reason-list li`，§3 要求「数字必须作为文字出现在『匹配度 N%』里」，实现只有环内裸数字、没有「匹配度」与 `%` | 二选一并留痕：① 把 ATDD / tasks 的展示口径改成实际实现（`.match-reason` + `Progress`）并补 `%` 语义；② 按 ATDD §3 恢复「匹配度 N%」文字与 `Tag` 列表。改完同步 `atdd-design.md` 的 Red→Green 与覆盖说明 | [fact] |
| W-03 | WARNING | `rules/testing/rules.md#java-testing` | `RouteME/backend/src/test/java/routeme/pojo/TripMatchTest.java` | 多处与规则冲突：`in_noOverlap_out_fallbackReasonAndInterestBasis`、`in_sameDestinationAndDateWithSharedInterests_out_cappedAt100`、`in_singleSharedInterest_out_tenPoints` 等缺 `// Given` 段；`in_oneDayApart_out_twentyPoints`、`in_threeSharedInterests_out_cappedAtTwenty` 的 `assertEquals` 缺字段名第三参数；`in_referenceDestinationDiffers_out_noDestinationPoints` 输出用双重否定（规则要求肯定表达，如 `out_dateOnlyThirtyPoints`） | 统一补齐 Given / When / Then，所有断言加字段名，重命名双重否定的用例 | [fact] |
| W-04 | WARNING | `rules/process/rules.md#git-commit-conventions` | git 历史 `12868cb`、`94dc2b3` | 两个提交把 `add-trip-publish` 与 `add-match-reason` 合并为一个提交，且 stage 取 `p4`（`refactor(p4)` / `docs(p4)`）。规则要求 message 形如 `<type>(<stage>): <change-id> <description>`，`stage` 只能是 `verify` / `archive`，且「多个 spec 禁止合并到一次提交」 | 归档前 squash 为 `feat(verify): add-match-reason …` 与 `chore(archive): add-match-reason …` 两次提交，`add-trip-publish` 的改动回到自己的分支 | [fact] |
| W-05 | WARNING | `rules/process/rules.md#git-branching-and-pr` | git 工作区；`RouteME/frontend/src/trips/TripCard.tsx` 的未提交改动 | `tasks.md` T4/T10/T11 已勾选完成，但支撑它们的 `TripCard` / `TripDetailPage` / `tripMessages` / `companions.spec.ts` 仍是工作区未提交改动（`git status` 显示 `M`，分支为 `main`，无 `feature/add-match-reason`）。规则要求一个 change 一条分支、不直接提交 `main` | 建 `feature/add-match-reason` 分支提交实现与测试，再进行 G2 复核 | [fact] |
| W-06 | WARNING | `rules/testing/rules.md#java-testing` | `RouteME/backend/src/test/java/routeme/controller/MatchControllerTest.java`（`in_filteredList_out_sameScoreAsDetail`） | Delta Spec 场景「筛选与排序不改变匹配分」要求「无筛选为 N → 筛选后仍为 N」，`atdd-design.md` §6 #10 也写「`GET /matches?destination_code=110100` 与 `GET /matches` 的 `match.score` 相同」；实际用例只比对「带筛选列表项 vs 单条详情」，**没有不带筛选的列表基线**，无法证明筛选不参与打分 | 在同一用例补一次无筛选 `GET /api/matches` 的基线比对（同 tripId 的 `score` / `reasons` / `basis`） | [fact] |
| S-01 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `atdd-design.md` 头部（「9 场景」）、`consistency-lint.md` C-06（「9/9」） | `specs/trip-companions/spec.md` 在 R2 之后实际有 11 个 `#### Scenario:`，两处记录仍为 9 | 更正为 11，并在 ATDD §2 补齐 #7/#8 的行号映射 | [fact] |
| S-02 | SUGGESTION | `rules/quality/rules.md#coding-style` | `RouteME/frontend/src/i18n/tripMessages.ts`（`matchPercentage`、`matchReasons`） | R3 改用 antd `Progress` 后，`matchPercentage: '匹配度'` 与 `matchReasons: '匹配理由'` 已无任何引用（全仓库仅定义处），属残留死键 | 删除，或在卡片/详情恢复对应可见文案后保留 | [fact] |
| S-03 | SUGGESTION | `rules/quality/rules.md#java-coding-style`、`rules/testing/rules.md#java-testing` | `RouteME/backend/src/test/java/routeme/controller/MatchControllerTest.java` | `in_filteredList_out_sameScoreAsDetail`、`in_matchDetailWithReferenceTrip_out_fullScore` 缩进错位（方法体 8/12 空格混排）；`in_matchDetailWithReferenceTrip_out_fullScore` 无 Given / When / Then，仅有一行 `// user 2's latest …` 注释 | 重排缩进并补三段式注释 | [fact] |

## Per-dimension summary

| 维度 | 结论 | 依据 |
|---|---|---|
| A 架构 | WARNING | 端点形状未变、`TripMatch` 仍是唯一打分点、`MatchServiceImpl#search`/`#matchFor` 共用同一计算入口（design D1/D11 落实）；但契约未约束 `reasons` 非空（W-01） |
| B 质量 | SUGGESTION | `TripMatch` 权重集中、`percentage == score`、降级文案非空；残留 `matchPercentage` / `matchReasons` 死键（S-02），测试缩进与三段式（S-03） |
| C 测试 | WARNING | 权重分支（50/30/20/兴趣 10 上限 20/总分 100）与降级文案均有断言，`in_*_out_*` 命名合规；G/W/T 与断言字段名不合规（W-03），「筛选不改变分值」缺基线（W-06） |
| D 安全 | 未发现 | 无新增输入面与 SQL；`X-User-Id` 演示桩已在 `docs/knowledge/interfaces/README.md` 登记为生产前必须替换；无硬编码凭据与 PII 暴露 |
| E 过程 | WARNING | proposal / spec / design / tasks / atdd / dov-ac / g1 / g2 / consistency-lint 齐全；实现未提交、分支与提交 message 不合规（W-04、W-05） |
| F 文档 | SUGGESTION | 正文中文、标识符英文、相对链接合规；Scenario 计数漂移（S-01） |
| G 工件链与契约追溯 | WARNING | spec ↔ 实现口径可追溯（字段名、权重、文案一致）；tasks / ATDD 的 UI 与选择器描述落后于 R3 实现（W-02），`basis` 描述与契约已同步（0.8.1） |

**Skipped：** 根 `npm run lint:api`（仓库根无 `package.json`，工具缺口）；E2E 本轮未执行（引用 `tasks.md` 记录）。

## Residual risks

- 匹配参照物只取「最近一条未结束的已发布行程」；用户有多条在途行程时，其余行程不作为参照（`consistency-lint.md` S-01 已登记）。
- 卡片百分比只有环内数字、无 `%` 与「匹配度」字样，低视力/读屏用户可能把它理解为计数（ATDD §3 的可访问性约束未落实，见 W-02）。
- `@rule:artifact-review-gate` 于 2026-11-16 14:04 才引入（commit `114379f`），本 change 无 `docs/reviews/<yyyymmdd>-add-match-reason-<artifact>-review.md` 与批准记录。按「不溯及既往」本次不判 BLOCKER，归档前是否补建由 IO/SA 裁定。
- `TripCard` 的展示改动同时在服务 `add-trip-publish` 的首页改版里，两者共用同一文件；归档时需确认归属，避免跨 change 混提交。

## Next remediations (non-Gate)

1. 契约补 `reasons.minItems: 1` + description，并加 `OpenApiTest` 断言——建议 `/sdd:delta-craft` 后跑 `/sdd:consistency-lint`。
2. 对齐 ATDD / tasks 与实际 UI（`.match-reason`、`Progress`、`%` 语义），使 Red→Green 记录可复现——建议 `/sdd:atdd-apply`。
3. 补「筛选前后同一行程分值不变」的列表基线断言。
4. 按 `java-testing` 收敛 `TripMatchTest` / `MatchControllerTest` 的 Given / When / Then、断言字段名与命名。
5. git 收口：`feature/add-match-reason` 分支 + squash 成 verify / archive 两次提交，清理死文案键。