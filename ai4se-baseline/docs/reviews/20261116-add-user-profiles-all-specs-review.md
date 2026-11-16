# All specs review — add-user-profiles

- **Verdict:** Fail（≥1 BLOCKER）
- **Scope:** focus=full；root=`ai4se-baseline`；change=`openspec/changes/add-user-profiles/`；能力 `user-profiles`（ADDED）；评审日期 2026-11-16
- **Evidence:**
  - 共享验证（本次直接引用，未重跑）：backend `mvnw.cmd -q test` 退出码 0，surefire 34 份报告 / 213 tests / 0 failures / 0 errors / 0 skipped；frontend `npm run typecheck` 退出码 0，`npm test` 16 个测试文件 / 137 tests 全部通过。
  - 工具缺口：`RouteME/` 根目录无 `package.json`（只有 `frontend/`、`e2e/` 各一份），`npm run lint:api` 无法执行；契约 lint 只能引用 change 期记录（`npx @redocly/cli lint openapi.yaml` → 0 error / 15 warning，见 `docs/ai4se-plugins/20261116-110749-local-verify-report.md`）。**E2E 未被本次共享证据覆盖**（该报告只在 change 期跑过 44 条），因此 E2E 相关结论按文中标注降级。
  - 读过的工件：`proposal.md`、`design.md`（D1–D10、文件级影响）、`specs/user-profiles/spec.md`（5 Requirement / 20 Scenario）、`tasks.md`（T1–T13，T13 未完成）、`atdd-design.md`、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`；**无 `g2-decision.md`、无 `ci-report.md`**。
  - 读过的实现：`routeme.controller.UserProfileController#profile`、`routeme.service.UserProfileStatsService` / `impl.UserProfileStatsServiceImpl`、`routeme.response.UserProfileResponse` / `ProfileStatsResponse`、`routeme.pojo.UserProfile`；迁移 `V12__seed_viewer_profile_user.sql`（以及改变该种子的 `V13__seed_demo_user_profiles.sql`）；测试 `UserProfileControllerTest`（含 `in_seededProfileRead_out_joinedAtAndStats` / `in_seededDemoProfile_out_completeWithJobAndMbti`）、`ProfileDataMigrationSqliteTest`、`ProfileMigrationSqliteTest`、`OpenApiTest`。
  - 读过的契约与前端：`RouteME/openapi.yaml`（`info.version` 0.8.1；`UserProfile.joined_at` / `stats`、`ProfileStats`）；`frontend/src/profiles/ProfileContext.tsx`、`ProfileModal.tsx`、`profileFormat.ts`、`profileFormat.test.ts`、`frontend/src/i18n/profileMessages.ts`、`frontend/src/trips/TripCard.tsx`、`frontend/src/trips/TripDetailPage.tsx`、`e2e/tests/profiles.spec.ts`。
  - 门禁与工件评审：`docs/reviews/` 下无本 change 的四份单工件评审；`@rule:artifact-review-gate` 落地提交 `114379f`（2026-11-16 14:04:54）晚于本 change 全部工件（最后修改 14:01:54），按 `add-user-auth` 同 precedent 记 **Skipped（规则晚于工件）**。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| UPs-01 | BLOCKER | rules/architecture/rules.md#package-structure | `routeme.controller.UserProfileController#profile`（`UserEntity target = demoUserService.getById(userId); … target.getCreatedAt()`）；`design.md` D2 / `tasks.md` T5 | 行对象 `UserEntity` 由 controller 直接取用，只为拿 `createdAt`：规则要求 entity 只被 `mapper` 与 `service/impl` 引用、向上转成领域对象，checklist 按 pr-merge 阻断；`design.md` 未登记 ADR / 例外。该行是本 change T5 明确引入的 | 把 `joined_at` 并入领域视图：在 `UserProfile` / `UserProfileService#read` 上返回 `joinedAt`（由 service 读实体），或由 `DemoUserService` 提供 `Instant joinedAt(long userId)`；controller 不接触 `UserEntity` | [fact] |
| UPs-02 | WARNING | rules/architecture/rules.md#java-patterns | `routeme.service.UserProfileStatsService#stats` | 新增的 service 接口方法没有 Javadoc：`java-patterns` 要求「service 接口的每个方法 MUST 写 Javadoc，至少含一句话说明与 `@param` / `@return`」，`package-structure` 检查项同样按 pr-merge 阻断。仓库其余 service 接口（如 `DemoUserService`、`UserProfileService`）均逐方法带 Javadoc | 补 `/** 四项统计口径 … @param userId … @return … */`，并把「不拥有表、不缓存」写入说明 | [fact] |
| UPs-03 | WARNING | rules/testing/rules.md#web-testing | `e2e/tests/profiles.spec.ts` 首条用例 `opens the publisher profile from a trip card without entering the detail page`（`await expect(modal.getByText('上班族 · 互联网行业 · INFP')).toBeVisible()`）；`V13__seed_demo_user_profiles.sql` | 断言与当前种子冲突：V13 把用户 4 改为 `school=''`、`job='产品经理'`、`mbti='INFP'`，而 `ProfileModal` 的身份行按 `school · major · job · mbti` 拼接，渲染为 `产品经理 · INFP`；`ProfileDataMigrationSqliteTest` 也断言 `job=产品经理`。本次共享证据未跑 E2E，故按静态证据判定该用例会失败 | 三处统一：把断言改为 `产品经理 · INFP`（推荐，与迁移测试一致），或回改 V13 让 `job/major` 承载「上班族 / 互联网行业」；并重跑 `npx playwright test tests/profiles.spec.ts` 留证 | [fact] |
| UPs-04 | WARNING | rules/testing/rules.md#web-testing | `frontend/src/profiles/ProfileModal.tsx#ProfileBody`（身份行 `filter(value !== '')`）；`frontend/src/profiles/profileFormat.test.ts`；`e2e/tests/profiles.spec.ts` | ATDD 把 Scenario 7「字段缺省时不显示空占位」映射到 API + E2E，但两层都没有对应断言：`profileFormat.test.ts` 只测交集与时间格式化，`profiles.spec.ts` 8 条用例没有「无 MBTI / 只有两段」的资料。实现里已有 `filter` + `join`，属未测边界 | 补一条 E2E（如打开无 MBTI 的用户资料，断言身份行无 ` · ` 结尾 / 无双分隔符）或在 `profileFormat.test.ts` 抽出 `formatIdentity()` 纯函数并覆盖缺省组合 | [fact] |
| UPs-05 | WARNING | rules/process/rules.md#git-branching-and-pr | `openspec/changes/add-user-profiles/`（无 `g2-decision.md`）；实现已合入 `main`（`git merge-base --is-ancestor b9fba48 HEAD` 成立）；`docs/ai4se-plugins/20261116-110749-local-verify-report.md` §Evidence slots（`E3 Human | Pending`） | 「G2 验证通过后才合入」未满足：本 change 没有 G2 决策记录，VL 签署仍 Pending，而实现已随 `b9fba48` / `cc9072f` 进入主线 | 补 `g2-decision.md`（四维结果 + 残余风险 + VL 具名签署），或在 `tasks.md` 记录追溯豁免与补签日期；归档前由 SA 复核 | [fact] |
| UPs-06 | WARNING | rules/process/rules.md#git-commit-conventions | 提交 `d3d6178 feat(p4): add-user-profiles add public profile endpoint and modal entries`；`b9fba48` / `cc9072f` 合并提交 | message 的 stage 写成 `p4`（规则只允许 `verify` / `archive`），描述里再带 change-id；同一 spec 按 P1–P4 多次提交，与「一个 spec 恰好两次提交（verify / archive）」不一致 | 后续按 `feat(verify): add-user-profiles …` 书写；verify 前把 P1–P4 中间提交 squash 为一个 verify 提交 | [fact] |
| UPs-07 | WARNING | rules/documentation/rules.md#sdd-artifacts | 能力目录 `openspec/changes/add-user-profiles/specs/user-profiles/`；`design.md` D1 / D4；`tasks.md` T1 | `user-profiles` 与 `add-user-profile`（S18）已建立的 `user-profile` 是**同一份用户资料**的两个 capability，名字只差一个字符，且复用同一个 `GET /users/{userId}/profile`、同一组类与同一 `UserProfile` schema；归档后将出现两份平行 Living Spec，同一概念两个词（`naming-conventions` 的「同一个概念只有一个词」） | 归档前合并为一个 capability（建议 `user-profile`），把弹窗展示与四项统计作为该能力的 MODIFIED/ADDED Requirement；若确需独立，至少在 `design.md` 写明边界与归属，并把 change-id 改成不与 `add-user-profile` 混淆的名字 | [inference] |
| UPs-08 | SUGGESTION | rules/documentation/rules.md#sdd-artifacts | `design.md` D4、`tasks.md` T1、`atdd-design.md` §3 / §5、`docs/ai4se-plugins/20261116-110749-local-verify-report.md`（均写 0.8.0） | 契约版本漂移：`RouteME/openapi.yaml` 与 `OpenApiTest` 现为 **0.8.1**（由 `add-match-reason` 的 `dbeb2e8` 再 bump）；工件仍写 0.8.0、`V1–V12`，与实现/迁移现状（V1–V13）不一致 | 工件改为「本 change 合入时为 0.8.0，当前主线 0.8.1」并注明迁移区间；或将该行改为引用 `openapi.yaml` 当前值，避免工件成为第二权威 | [fact] |
| UPs-09 | SUGGESTION | rules/documentation/rules.md#document-conventions | `design.md` D2（「`dataobject/UserProfile`」） | 工件把实际类路径写错：仓库是 `routeme.pojo.UserProfile`，不存在 `dataobject` 包（`design.md` 其余条目写的是 `controller/`、`response/` 等真实路径）。规则要求「例子必须来自真实代码」，且 `package-structure` 明令禁止 `dto`/`model` 一类同义包 | 改为 `pojo/UserProfile`，并顺手核对 `design.md` 其余类路径 | [fact] |
| UPs-10 | SUGGESTION | rules/quality/rules.md#web-coding-style | `frontend/src/profile/profileDisplay.test.ts#ageZodiacLabel`（`ageZodiacLabel({ age: 23, zodiac: '金牛座' })`） | 测试夹具用 `金牛座`，而契约枚举与后端派生值都是 `金牛`（无「座」）；该用例通过但验证的是不存在的取值，容易把「星座不带座」的既有裁决掩盖 | 夹具改为 `金牛`，并同步断言 `23 岁 · 金牛` | [fact] |
| UPs-11 | SUGGESTION | rules/documentation/rules.md#document-conventions | `docs/ai4se-plugins/20261116-110749-local-verify-report.md` §Header `Root: c:\Git\ITA\RouteME\ai4se-baseline` | 过程记录写绝对机器路径（且与实际工作目录不同），规则要求文档用相对路径 | 改为相对仓库根或删除该行 | [fact] |

## Per-dimension summary

| 维度 | 结果 | 说明 |
|---|---|---|
| A 架构 | 1 BLOCKER + 1 WARNING | 统计聚合新建 `UserProfileStatsService` / `Impl`（不继承 `IService`、不拥有表、不加 XML）方向正确，契约只做可选字段扩展；阻断项为 controller 直取 `UserEntity`；另缺 service 接口 Javadoc |
| B 质量 | 1 SUGGESTION | `ProfileModal` 走 antd `Modal`、文案集中于 `profileMessages.ts`、无死代码；仅测试夹具的星座取值与契约不一致 |
| C 测试 | 2 WARNING | 后端统计/迁移/404/无凭据断言齐全，`profileFormat.test.ts` 覆盖交集与时间阈值；缺口是 Scenario 7 无 E2E，且首条 E2E 断言已被 V13 种子改变后失效（本次未跑 E2E） |
| D 安全 | 未发现 | 响应为白名单字段，无 `username` / `password_hash` / token；统计只出计数；隐私文案与「无举报入口」落地；无硬编码凭据；无 PII 日志。继承的 `X-User-Id` 可伪造生日问题记入 Residual risks（归属 `add-user-profile`） |
| E 过程 | 2 WARNING | 规格包自包含、P1–P4 工件齐全；缺 `g2-decision.md` 且未签署即合入；commit stage 写成 `p4` 且一 spec 多次提交。`artifact-review-gate` 按规则晚于工件记 Skipped |
| F 文档 | 1 WARNING + 3 SUGGESTION | 正文中文、标识符英文；`design.md` 的 `dataobject` 路径、0.8.0 / V1–V12 表述已过期，verify 报告含绝对路径 |
| G 工件链与追溯 | 1 WARNING | proposal 5 条 In scope ↔ 5 Requirement / 20 Scenario ↔ T1–T13 ↔ 实现/测试可对齐；断点为验收场景 6 的种子语义被 V13 改写后 E2E 未同步、场景 7 无断言；capability 与 `user-profile` 重叠 |

## Residual risks

- 继承 `add-user-profile` 的写读鉴权缺口：`GET /api/users/{userId}/profile` 的「本人」由可伪造的 `X-User-Id` 判定，`birthday` 可被任意调用方读取。资料弹窗只消费公开字段，未放大该风险，但端点本身应在 UP-01 修复。
- 统计为请求时实时聚合（`TripPlanService.findAllTrips()` + 三次过滤），随数据量线性增长；设计已声明「未来改 mapper count，不改契约」，需在数据增长前排期。
- 公开资料端点沿用 `X-User-Id` 身份桩（`add-user-auth` UA-09），生产前未替换则任何统计与资料读取都可冒用身份。
- `user-profiles` 若按现状归档，将与 `user-profile` 形成两份平行 Living Spec，后续任意一方改契约都会出现双权威。
- E2E 不在 CI，且 E2E 依赖累积种子库（本次 UPs-03 的失效即由此暴露）；无独立测试库/清理钩子。

## Next remediations (non-Gate)

- 代码：按 UPs-01 去掉 controller 对 `UserEntity` 的依赖；按 UPs-02 补 service Javadoc。
- 测试：按 UPs-03 统一 `profiles.spec.ts` 断言与 V13 种子并重跑；按 UPs-04 补缺省字段用例。
- 过程：补 `g2-decision.md` 与 VL 签署；由 SA 决定是否把 `user-profiles` 合并进 `user-profile`（建议在 P5 归档前决定）。
- 工件：按 UPs-07～UPs-09 修正 capability 归属与路径/版本表述。
- 建议技能：`/sdd:consistency-lint`（复跑 P3 之后漂移）、`/sdd:artifact-review-gate`（补四份单工件评审）、`/sdd:delta-craft`（若决定合并 capability）。