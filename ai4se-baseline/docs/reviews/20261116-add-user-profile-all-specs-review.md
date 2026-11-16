# All specs review — add-user-profile

- **Verdict:** Fail（≥1 BLOCKER）
- **Scope:** focus=full；root=`ai4se-baseline`；change=`openspec/changes/add-user-profile/`；能力 `user-profile`（ADDED）+ `user-auth`（MODIFIED）；评审日期 2026-11-16
- **Evidence:**
  - 共享验证（本次直接引用，未重跑）：backend `mvnw.cmd -q test` 退出码 0，surefire 34 份报告 / 213 tests / 0 failures / 0 errors / 0 skipped；frontend `npm run typecheck` 退出码 0，`npm test` 16 个测试文件 / 137 tests 全部通过。
  - 工具缺口：`RouteME/` 根目录无 `package.json`（只有 `frontend/`、`e2e/` 各一份），`npm run lint:api` 无法执行；契约 lint 只能引用 change 期记录（`docs/ai4se-plugins/20261116-120800-local-verify-report.md`：后端 198、前端 95、E2E 35/35）。契约相关结论因此最高 Partial。
  - 读过的工件：`proposal.md`、`design.md`（D1–D12、§2 迁移、§7 展示契约）、`specs/user-profile/spec.md`（7 Requirement / 26 Scenario）、`specs/user-auth/spec.md`（1 / 6）、`tasks.md`（T1–T8 + P4 记录）、`atdd-design.md`（E1–E26 / A1–A6）、`dov-ac-review.md`、`g1-decision.md`、`g2-decision.md`（Status: Pending）、`consistency-lint.md`、`ci-report.md`。
  - 读过的实现：`routeme.controller.UserProfileController`、`routeme.service.UserProfileService` / `impl.UserProfileServiceImpl`、`routeme.model.ProfileRules`、`routeme.constant.ProfileConstant`、`routeme.entity.UserEntity`、`routeme.pojo.UserProfile` / `DemoUser` / `AvatarFile`、`routeme.request.UserProfileUpdateRequest` / `AuthRegisterRequest`、`routeme.response.UserProfileResponse` / `DemoUserResponse` / `ErrorResponse`、`routeme.handler.GlobalExceptionHandler`、`routeme.exception.InvalidProfileException` / `UserNotFoundException`；迁移 `V10__add_user_profile.sql`、`V13__seed_demo_user_profiles.sql`；测试 `UserProfileControllerTest`、`UserProfileRulesTest`、`OpenApiTest`、`AuthControllerTest`、`ProfileMigrationSqliteTest`。
  - 读过的契约与前端：`RouteME/openapi.yaml`（`info.version` 0.8.1；`UserProfile` / `UserProfileUpdateRequest` / `ProfileStats` / `DemoUser`）；`frontend/src/profile/*`（`ProfileSetupPage`、`ProfilePage`、`profileForm`、`profileDisplay`、`InterestPicker`）、`frontend/src/profiles/*`、`frontend/src/api.ts`、`frontend/src/types.ts`、`e2e/tests/profile.spec.ts`。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| UP-01 | BLOCKER | rules/security/rules.md#pii-scrubbing | `routeme.controller.UserProfileController#profile`；`routeme.service.impl.UserProfileServiceImpl#read`；`design.md` D4 / D6 | 「生日只对本人返回」用客户端可伪造的 `X-User-Id` 判定：端点无 Bearer，`require(callerId)` 只校验该 id 存在，`includeBirthday = callerUserId == targetUserId`。任意调用方 `curl -H 'X-User-Id: <target>' /api/users/<target>/profile` 即拿到目标用户完整 `birthday`，违反 Delta「MUST NOT 把完整生日返回给其他用户」与 `pii-scrubbing`（响应返回超出业务需要的个人字段） | 本人视图改由 Bearer 判定：新增带 token 的 `GET /api/users/me/profile`（或只在 `/auth/me` 返回 `birthday`），`GET /api/users/{userId}/profile` 永久省略 `birthday`；同时让 `read()` 不再接收「自称的 caller id」作为隐私开关，并补一条「他人冒用 owner id 读取仍无 birthday」的 API 用例 | [fact] |
| UP-02 | BLOCKER | rules/architecture/rules.md#package-structure | `routeme.controller.UserProfileController#isDemoIdentity`（`UserEntity entity = demoUserService.getById(headerUserId)`） | 行对象 `UserEntity` 越过 service 进入 Web 层：规则要求 entity 只被 `mapper` 与 `service/impl` 引用、向上转成领域对象，checklist 明确按 pr-merge 阻断；`design.md` 未登记 ADR / 例外 | 由 `DemoUserService` 提供领域级判断（如 `boolean isCredentiallessDemo(long userId)`）或让 `DemoUser` 携带 `hasCredentials`，controller 只处理 `DemoUser`；同理不要向上传实体 | [fact] |
| UP-03 | WARNING | rules/architecture/rules.md#package-structure | `routeme.model.ProfileRules`（被 `UserEntity`、`pojo.UserAccount`、`UserProfileServiceImpl` 引用）；`design.md` §8、`tasks.md` T4 | 新建了规则明令禁止的 `model` 同义包（「仍禁止 `model` / `dto` / `do` / `bo` …」，checklist：`model` 与 `entity` / `pojo` 并存）；该包还成为 `entity` / `pojo` 的依赖中心，反向拉高耦合 | 拆分：纯派生（`age` / `zodiac` / 魔数嗅探 / `trimTo*`）移到叶子工具类（如 `routeme.utils.ProfileRulesUtils`，不得反向依赖 `request`）；`validate(UserProfileUpdateRequest)` 留在 `service/impl` 的校验协作者；同步改 `design.md` §8 与 `tasks.md` T4 | [fact] |
| UP-04 | WARNING | rules/architecture/rules.md#api-contract | `RouteME/openapi.yaml` `PUT /users/me/profile` requestBody；`UserProfileUpdateRequest` schema | 有请求体的接口未给「成功 + 典型拒绝」两个 `examples`（401/400 的 example 只在响应里）；checklist 按 pr-merge 要求请求体有成功与拒绝两个 example | 在 requestBody 下补 `examples.success`（完整必填资料）与 `examples.rejected`（缺 birthday / gender → 400 + `fields`），并保持与 `UserProfileUpdateRequest` 同源 | [fact] |
| UP-05 | WARNING | rules/quality/rules.md#web-coding-style | `frontend/src/profile/ProfileSetupPage.tsx`（`aria-label="个人资料"`、`placeholder="例如：广州"`、`"例如：中山大学"`、`"例如：地理科学"`、`<option value="">不填写</option>`） | 界面文案未集中在 `i18n`：同文件已有 `tripMessages.profileJobCustomPlaceholder` 的写法，但 5 处中文字面量直接写死在组件里，违反「文案在 messages.ts，组件里不写死句子」 | 全部搬到 `frontend/src/i18n/tripMessages.ts`（`profileFormAriaLabel`、`profileCityPlaceholder`…），组件只引用 key | [fact] |
| UP-06 | WARNING | rules/quality/rules.md#web-coding-style | `frontend/src/profile/ProfileSetupPage.tsx#ProfileSetupPage`（65–463 行，约 398 行）；`frontend/src/profile/ProfilePage.tsx#ProfilePage`（约 221 行） | 「组件超过 150 行，或出现第二段可命名的界面区块时，拆子组件或提取 hook」未执行；两者都是单组件长文件 | 抽出 `useProfileForm`（状态 + 提交 + 字段错误）与 `ProfileFacts` / `ProfileInterests` 等展示片段，把页面压到 150 行以内 | [fact] |
| UP-07 | WARNING | rules/security/rules.md#security-baseline | `routeme.controller.UserProfileController#avatar`（`GET /api/users/{userId}/avatar`，无鉴权、`Cache-Control: immutable`） | 新增了匿名可访问的公开端点，但设计/风险表未记录限流，也未记录「拒绝限流」的例外；基线要求「暴露端点有限流，或已记录例外」 | 在 `design.md` §9 与 G2 残余风险登记该端点的限流例外（或接入统一限流拦截器），并说明按用户 id + 文件名随机段防枚举的补偿措施 | [fact] |
| UP-08 | WARNING | rules/process/rules.md#tdd-cycle | `docs/ai4se-plugins/20261116-120800-local-verify-report.md` §1（「T1 的原始 red 日志未单独留存」） | Red 证据不完整：报告自述原始失败输出未留存，只有 T4 之后的联调失败；规则要求失败输出留存并在 verify 报告中作为 Red 证据 | 每个切片保留一次真实 red 输出（命令 + 失败断言摘要）附在 verify 报告；至少把 T1 fixture 400 的原始输出补回 | [fact] |
| UP-09 | WARNING | rules/process/rules.md#git-branching-and-pr | `g2-decision.md`（Status: Pending，VL「待签」）；实现提交 `2423c01` 已在 `main`（`git merge-base --is-ancestor 2423c01 HEAD` 成立） | 「G2 验证通过后才合入」未满足：实现与后续修复已合入主线，而 G2 仍待 VL 签署；`g2-decision.md` 自己声明「不要在 VL 签署前把本文件当作 Pass 证据引用」 | 由 VL 具名签署 G2（或记录豁免 + 依据 + 复审时点）；把「已合入未签署」写入 `g2-decision.md` 的 waiver 表并指定补签日期 | [fact] |
| UP-10 | WARNING | rules/process/rules.md#git-commit-conventions | 提交 `2423c01` `feat(profile): add profile setup, public page and avatar for S18`；`a95254c` / `e54f273` `docs(verify): …`（无 change-id） | message 不符合 `<type>(<stage>): <change-id> <description>`：stage 写成 `profile` 或缺失，部分提交不带 change-id；同一 spec 出现多个 P 阶段提交 | 后续按 `feat(verify): add-user-profile …` / `chore(archive): add-user-profile …` 书写；verify 前把中间提交 squash 为一个 verify 提交 | [fact] |
| UP-11 | WARNING | rules/process/rules.md#artifact-review-gate | `docs/reviews/`（无 `20261116-add-user-profile-{spec,design,tasks}-review.md`）；工件最后修改时间：`spec.md` 14:18、`design.md` 14:45、`tasks.md` 15:37（规则落地提交 `114379f` 为 14:04:54） | 规则落地后仍修改了 Delta Spec / design / tasks，但没有对应的单工件评审报告与「批准人 / 批准时间」。`proposal.md`（11:34）早于规则，按 precedent 记 Skipped | 为 14:04 之后有实质修改的三份工件补 `docs/reviews/20261116-add-user-profile-<artifact>-review.md` 并取得具名 approve；或在 `tasks.md` 记录追溯豁免与承接人 | [fact] |
| UP-12 | WARNING | rules/documentation/rules.md#sdd-artifacts | `proposal.md` §残余风险、`g1-decision.md` §Conditions、`g2-decision.md` §Waivers | 一个 change 同时改 `user-profile`（ADDED）与 `user-auth`（MODIFIED），G1 已把它列为「归档前必须完成」的具名追认条件，但至今没有任何 SA 追认记录（全部文本仍写「待 SA 追认」） | 在 `g1-decision.md`（或 `summary.md`）追加具名追认（SA + 时间 + 理由：注册收窄与资料补齐是同一状态迁移的两端），否则 P5 归档不可执行 | [fact] |
| UP-13 | WARNING | rules/documentation/rules.md#sdd-artifacts | `design.md` §2.3；`V13__seed_demo_user_profiles.sql`；`e2e/tests/profiles.spec.ts` 首条用例（`add-user-profiles` 所有） | V13 实际写 `school=''`、`job='产品经理'`、`mbti='INFP'`，与 `design.md` §2.3「把 `上班族 · 互联网行业 · INFP` 拆到 job / mbti」不符；同时让 `add-user-profiles` 的 E2E 断言 `上班族 · 互联网行业 · INFP` 失效（`ProfileModal` 由 school/major/job/mbti 拼接，渲染为 `产品经理 · INFP`）。迁移测试 `ProfileDataMigrationSqliteTest` 写的正是 `产品经理` | 二选一并同步三处：把 V13 的 `job` 改为「上班族」并在 `major`/`school` 承载行业；或把 `design.md` §2.3 与 `profiles.spec.ts` 改为 `产品经理 · INFP`；由本 change 承担跨 change 影响说明（`tasks.md` T8 未覆盖此断言） | [fact] |
| UP-14 | SUGGESTION | rules/architecture/rules.md#api-contract | `routeme.model.ProfileRules#validate`（`mbti` 用 `toUpperCase` 只为比较）、`UserProfileServiceImpl#save`（`setMbti(trimToNull(request.mbti()))`） | 小写 `infp` 能通过校验并按原样写入数据库，响应出现 `mbti: "infp"`，落在契约枚举 `[INTJ…ESFP]` 之外；DTD 无 Bean Validation，契约约束只在服务端部分实现 | 保存前 `toUpperCase(Locale.ROOT)` 归一，或对小写直接返回 `INVALID_OPTION`；补一条大小写用例固定行为 | [fact] |
| UP-15 | SUGGESTION | rules/quality/rules.md#web-coding-style | `frontend/src/profile/` 与 `frontend/src/profiles/` | 同一业务概念（个人资料）拆成两个同级 feature 目录（完善页 / 主页 vs 资料弹窗），后续改动容易只改一边 | 合并到 `frontend/src/profile/`（弹窗 + Provider + `profileFormat` 一并迁入），保留现有 `profile-modal-*` 样式作用域 | [inference] |
| UP-16 | SUGGESTION | rules/documentation/rules.md#document-conventions | `openspec/changes/add-user-profile/ci-report.md` §Header `Root: D:\zha_training\RouteME\ai4se-baseline` | 过程记录写了绝对机器路径，规则要求文档用相对路径、不写 `D:\...` | 改为相对仓库根（`ai4se-baseline`）或删除该行 | [fact] |

## Per-dimension summary

| 维度 | 结果 | 说明 |
|---|---|---|
| A 架构 | 1 BLOCKER + 2 WARNING + 1 SUGGESTION | controller → service → manager/dao 方向整体正确，请求/响应/POJO/异常分包符合规则；阻断项为 `UserEntity` 进入 controller；另有禁止的 `routeme/model` 包、PUT 资料请求体缺 success/rejection example、MBTI 大小写导致响应越出契约枚举 |
| B 质量 | 3 WARNING + 1 SUGGESTION | 命名与 `in_*_out_*`、Given/When/Then、`assertAll` 一致；问题是长组件（398 / 221 行）、组件内写死中文文案、`profile/` 与 `profiles/` 双目录 |
| C 测试 | 1 WARNING | 后端 19 项资料/规则用例 + 迁移双路径 + 13 条 E2E 覆盖 26 场景；缺口是 verify 报告自述原始 Red 输出未留存 |
| D 安全 | 1 BLOCKER + 1 WARNING + 1 SUGGESTION | 服务端校验、魔数嗅探、服务端文件名、无硬编码凭据、日志无 PII 均达标；阻断项是生日以可伪造的 `X-User-Id` 判定「本人」；另有无鉴权头像端点无限流记录、MBTI 枚举漂移 |
| E 过程 | 4 WARNING | 工件自包含、P1–P4 齐全；G2 未签即合入、commit message/stage 不合规、规则落地后修改 spec/design/tasks 无单工件评审、双 capability 追认未落地 |
| F 文档 | 1 WARNING + 1 SUGGESTION | 正文中文、标识符英文、相对链接基本达标；`design.md` §2.3 与 V13 不一致（同时破坏下游 E2E），`ci-report.md` 含绝对路径 |
| G 工件链与追溯 | 2 WARNING | proposal ↔ 26 + 6 场景 ↔ T1–T8 ↔ E1–E26/A1–A6 ↔ 实现/测试可逐条对齐；断点为 V13 改变演示种子后未同步 `design.md` 与 `add-user-profiles` 的 E2E 断言，以及双 capability 例外尚无具名追认 |

## Residual risks

- 契约 `Error` 新增 `fields` 是对 `api-contract`「错误响应只对外给 `code`」字面要求的扩展：`design.md` D12 已说明业务理由（逐项缺失字段），但知识库未登记为例外；建议在 P5 回写 `docs/knowledge/interfaces/README.md` 时明确该字段的语义与保留边界。
- 头像落盘方案（`../SqlLite/uploads/avatars`）无对象存储、无清理任务；替换失败会留孤儿文件，设计已接受，但需在运维文档登记清理办法。
- 生日隐私收口（UP-01）会改变读取契约的鉴权方式，需与消费同一端点的 `add-user-profiles` 协调，避免两处再次分叉。
- `X-User-Id` 仍是全局可伪造身份桩（`add-user-auth` UA-09 已登记）；本次新增的读接口继承该缺口，修复前不应在生产开启。
- E2E 不在 CI（`ci.yml` 仅 backend / frontend），回归依赖本地干净库；V13 与 `profiles.spec.ts` 的冲突正是该缺口的实证。

## Next remediations (non-Gate)

- 代码：按 UP-01 / UP-02 / UP-03 收口隐私判定、entity 泄漏与 `model` 包；按 UP-04–UP-06 补契约 example、抽 i18n 与子组件。
- 过程：补 `docs/reviews/20261116-add-user-profile-{spec,design,tasks}-review.md` 与 approve；取 VL 的 G2 签署；在 `g1/g2` 追加 SA 双 capability 追认。
- 工件：按 UP-13 统一 V13 种子、`design.md` §2.3 与下游 E2E；由 SA 决定是否把 `profiles.spec.ts` 的调整记入本 change 的 P5。
- 建议技能：`/sdd:consistency-lint`（复跑 P3 之后漂移）、`/sdd:rules-govern`（把 `Error.fields` 与头像端点限流登记为规则例外）、`/sdd:artifact-review-gate`（补齐三份单工件评审）。