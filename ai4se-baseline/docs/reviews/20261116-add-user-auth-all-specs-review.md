# All specs review — add-user-auth

- **Verdict:** Partial
- **Scope:** focus=full；root=`ai4se-baseline`；change=`openspec/changes/add-user-auth/`；能力 `user-auth`（ADDED）+ `trip-plans`（MODIFIED）；评审日期 2026-11-16
- **Evidence:**
  - 共享验证（本次直接引用，未重跑）：backend `mvnw.cmd -q test` 退出码 0，surefire 34 份报告 / 213 tests / 0 failures / 0 errors / 0 skipped；frontend `npm run typecheck` 退出码 0，`npm test` 16 个测试文件 / 137 tests 全部通过。
  - 工具缺口：`RouteME/` 根目录无 `package.json`（只有 `frontend/` 与 `e2e/` 各一份），`npm run lint:api` 无法执行；契约 lint 仅能引用 change 期记录 `npx @redocly/cli lint openapi.yaml` → 0 error / 7 warning（`docs/ai4se-plugins/20261116-101702-local-verify-report.md`）。契约维度结论因此封顶 Partial。
  - 读过的工件：`proposal.md`、`design.md`、`specs/user-auth/spec.md`（4 Requirement / 10 Scenario）、`specs/trip-plans/spec.md`（1 / 4）、`tasks.md`、`g1-decision.md`、`g2-decision.md`、`summary.md`、`HANDOFF.md`；`atdd-design.md`、`dov-ac-review.md`、`consistency-lint.md` 不存在（`g1-decision.md` 自述从未产出）。
  - 读过的实现：`routeme.controller.AuthController`、`routeme.service.AuthService`、`routeme.service.impl.AuthServiceImpl`、`routeme.utils.PasswordUtils`、`routeme.constant.AuthConstant`、`routeme.entity.UserEntity` / `AuthSessionEntity`、`routeme.mapper.UserMapper` / `AuthSessionMapper`、`routeme.request.AuthRegisterRequest` / `AuthLoginRequest`、`routeme.response.AuthSessionResponse` / `DemoUserResponse`、`routeme.service.impl.DemoUserServiceImpl`、`routeme.handler.GlobalExceptionHandler`、`AuthControllerTest` / `PasswordUtilsTest` / `AuthMigrationSqliteTest`；前端 `identity/authForm.ts`、`identity/authForm.test.ts`、`identity/AuthPanel.tsx`、`identity/IdentityGate.tsx`、`App.tsx`、`shell/AppShell.tsx`、`api.ts`、`types.ts`；契约 `RouteME/openapi.yaml`（`info.version` 0.8.1）。
  - 变更期验证记录：`tasks.md` T8（后端 154 项、前端 9 files / 73 tests）、`summary.md`、`docs/ai4se-plugins/20261116-101702-local-verify-report.md`。与今日共享证据的数量差异来自后续 change 合入，未视为矛盾。
  - 门禁与工件评审：`docs/reviews/` 下无本 change 的四份单工件评审；`@rule:artifact-review-gate` 的落地提交 `114379f`（2026-11-16 14:04:54）晚于本 change 全部工件（10:25–11:30 写作，14:08 仅做路径搬运），故该项记 **Skipped（规则晚于工件）**。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| UA-01 | WARNING | rules/architecture/rules.md#api-contract | `RouteME/openapi.yaml` `/auth/logout`；`routeme.controller.AuthController#logout`；`routeme.service.impl.AuthServiceImpl#logout` | 契约 401 写「token 缺失或无效」，实现只对缺失/空白 `Authorization` 返 401，未知或已过期 token 返 204；契约同一段又写「重复退出仍返回 204」，自身语义冲突 | 明确「幂等退出」语义：401 描述改为「仅缺失或格式错误的 Authorization」，或处理器校验 token 存在并对未知 token 返 401；补一条固定该行为的 API 测试 | [fact] |
| UA-02 | WARNING | rules/architecture/rules.md#api-contract | `RouteME/openapi.yaml` `/users`、`/users/demo` 描述；`routeme.controller.DemoUserController#list`；`routeme.service.impl.DemoUserServiceImpl#findAll`；`openspec/specs/trip-plans/spec.md` 第 17 行 | 契约称 `/users` 是「演示环境固定 3 个账户，不做注册与鉴权」、`/users/demo` 只返回「3 个预设账户」；实现 `/users` 返回全部 `app_users`（含注册账号），演示账户实际 4 个（`V12__seed_viewer_profile_user.sql` 周野）。Living Spec 与本 change Delta 仍写「恰好 3 个」，`AuthControllerTest#in_registeredAccount_out_demoListStaysFour` 却断言 4 | 在契约、Living Spec、Delta 与测试中用同一权威说法：要么过滤出 3 个，要么把契约与规格改为 4 个并更新示例；`/users` 的返回范围必须写清（演示账户 or 全部账号） | [fact] |
| UA-03 | WARNING | rules/architecture/rules.md#package-structure | `routeme.service.AuthService`；`routeme.service.impl.AuthServiceImpl`（`extends AbstractServiceImpl<AuthSessionMapper, AuthSessionEntity>`） | 拥有 `auth_sessions` 的 service 接口未继承 `IService<AuthSessionEntity>`；仓库其余 7 个表服务（如 `DemoUserService extends IService<UserEntity>`）都继承，本类是孤例 | `interface AuthService extends IService<AuthSessionEntity>`，或把会话表拆给独立的 `AuthSessionService` 并同步 `design.md` / `tasks.md` | [fact] |
| UA-04 | SUGGESTION | rules/architecture/rules.md#package-structure | `routeme.service.impl.AuthServiceImpl` 构造注入 `DemoUserService`，并用 `findByUsername` / `createAccount` / `getById` 读写 `app_users` | 依赖方向表未列 service→service；账号凭据读写经由「演示身份」服务，身份语义与职责混杂 | 抽出账号专用端口（如 `UserAccountService` / `UserAccountGateway`）或 manager，`AuthServiceImpl` 只编排放行会话与凭据校验 | [inference] |
| UA-05 | SUGGESTION | rules/quality/rules.md#java-coding-style | `routeme.entity.AuthSessionEntity#from`、`#toAuthSession` | 两个映射方法全仓库零调用（`AuthSessionEntity.from` / `toAuthSession` 均无命中）；`AuthServiceImpl#issue`、`#requireSession` 手写 setter 重复同一映射，实体提供的唯一映射路径被绕过 | 改用 `AuthSessionEntity.from(session)` 与 `entity.toAuthSession()`，否则删除未使用方法 | [fact] |
| UA-06 | SUGGESTION | rules/quality/rules.md#java-coding-style | `RouteME/backend/src/test/java/routeme/controller/AuthControllerTest.java` 第 10 行 | 两个 import 挤在同一行（`import org.junit.jupiter.api.Test;import org.springframework.beans.factory.annotation.Autowired;`），全仓库 controller 测试仅此一处 | 按 google-java-format 拆成两行 | [fact] |
| UA-07 | WARNING | rules/testing/rules.md#web-testing | `frontend/src/identity/AuthPanel.tsx`、`IdentityGate.tsx`、`App.tsx` 会话恢复；`frontend/src/api.test.ts` | 认证 UI 与请求层没有任何自动化：`api.test.ts` 不覆盖 `registerAccount` / `loginAccount` / `loadSessionUser` / `logoutAccount`，无 `AuthPanel` / `IdentityGate` 组件测试，本 change 也未新增 E2E；验收依赖 2026-11-16 手工走查（部分使用临时 mock API，见 `summary.md` §Residual risks） | 为认证请求层补单测（成功 + 错误码映射），为身份门补组件测试或 E2E 注册链路用例 | [fact] |
| UA-08 | WARNING | rules/security/rules.md#java-security | `routeme.utils.PasswordUtils`（`ALGORITHM = PBKDF2WithHmacSHA256`、`ITERATIONS = 120_000`） | 规则要求密码用 bcrypt 或 Argon2；实现选 PBKDF2-HMAC-SHA256 且 12 万次迭代（OWASP 对 PBKDF2-SHA256 的建议为 60 万）。`design.md` §决策记录了选型理由，但未作为「规则例外」登记 | 改用 `spring-security-crypto` 的 BCrypt/Argon2；或保留 PBKDF2 但迭代提到 ≥60 万，并在 `design.md` 写「规则例外 + 依据 + 复审时点」 | [fact] |
| UA-09 | WARNING | rules/security/rules.md#java-security | `routeme.controller.AuthController`；`TripController`、`ApplicationController`、`ChatController`、`MatchController`、`MyTripsController`、`ExperienceController`、`ReportController` 的 `@RequestHeader("X-User-Id")` | 认证建立了真实账号，但业务端点仍只信 `X-User-Id`：任意调用方传任意 `userId` 即可读写他人数据，认证与授权不在同一服务边界；`proposal.md` / `summary.md` 已登记残余风险，却未指定承接 change-id | 另立 change 用 `HandlerInterceptor` / `ArgumentResolver` 解析 Bearer 并替换 `X-User-Id`；在残余风险表补「替代 change-id」列，把该风险从「已记录」升级为「已排期」 | [fact] |
| UA-10 | WARNING | rules/security/rules.md#security-baseline | `AuthController` 的 4 个端点；`backend/src/main/java/routeme` 无 `interceptor` 包、无失败计数 | baseline 必查项「暴露端点有限流，或已记录例外」未满足且无例外记录；`/auth/login`、`/auth/register` 正是最易被暴力枚举与撞库的端点 | 加 IP + 账号维度的失败计数（拦截器或 Bucket4j），或在 `design.md` / `g2-decision.md` 登记「演示环境例外 + 生产前替换」 | [fact] |
| UA-11 | WARNING | rules/security/rules.md#pii-scrubbing | `routeme.controller.DemoUserController#list` + `openapi.yaml` `/users` | 未鉴权的 `/users` 返回全部账号的 `nickname` / `school` / `city` / `major` / `job` / `bio` / `interests`；本 change 起该表包含真实注册账号，任何调用方都可批量拉取用户画像 | 让 `/users` 只返回 `username IS NULL` 的演示账户；注册用户资料改由 `/auth/me` 或 `/users/{id}/profile` 按需获取 | [inference] |
| UA-12 | SUGGESTION | rules/security/rules.md#java-security | `routeme.request.AuthRegisterRequest`、`AuthLoginRequest` | 契约声明了 `minLength` / `maxLength` / `pattern`，但 DTO 无 Bean Validation 注解，校验全部手写在 `AuthServiceImpl`；规则建议边界用 `@NotBlank` / `@Size` / `@Pattern` | 给 record 组件加约束注解并在 controller 用 `@Valid`，错误仍由 `GlobalExceptionHandler` 统一映射 | [fact] |
| UA-13 | WARNING | rules/process/rules.md#spec-first | `openspec/changes/add-user-auth/g1-decision.md`、`g2-decision.md`、`summary.md` §Links | 两份门禁记录是「归档后追溯补记」，`Status: Pending`、Approvers 全空；实现 `f5e984c` 与归档 `229411a` 都发生在 G1/G2 落定之前，等于先实现后补门禁 | 由具名开发者与角色签署 G1/G2（写明批准人与时间），或在 `summary.md` 记录「追溯豁免 + 依据 + 遗留到 G3 的动作」 | [fact] |
| UA-14 | WARNING | rules/process/rules.md#git-commit-conventions | 提交 `f5e984c`、`9a2bdf0`、`229411a`、`cc1ee30` | message 不符合 `<type>(<stage>): <change-id> <description>`（`feat(routeme): ...`）；`9a2bdf0` 同时含首页改版与 auth 兴趣选择器，跨两个 change；一个 change 出现 verify / archive / 解档多次提交 | 后续 change 按 `feat(verify): add-user-auth ...`、`chore(archive): add-user-auth ...` 书写，保持一 change 一分支一 PR | [fact] |
| UA-15 | SUGGESTION | rules/documentation/rules.md#sdd-artifacts | `openspec/changes/add-user-auth/tasks.md` T3「验证」行 | 声明用 `AuthServiceTest` 验证，仓库无该类（服务逻辑实际由 `AuthControllerTest` 覆盖），工件与证据不符 | 改为实际存在的测试类，或补 `AuthServiceTest` 覆盖服务层 | [fact] |
| UA-16 | SUGGESTION | rules/documentation/rules.md#document-conventions | `openspec/changes/add-user-auth/HANDOFF.md` §2 | 状态与 `tasks.md` / `summary.md` 冲突（「浏览器端到端走查未做」「tasks 复选框尚未勾选」「`summary.md` 未写」「知识库未登记」），且未标注「已被取代」，读者会误判当前进度 | 文件头加「历史快照，2026-11-16 后由 `summary.md` 取代」，或把该交接文件移出 change 包 | [fact] |
| UA-17 | SUGGESTION | rules/documentation/rules.md#document-conventions | `docs/knowledge/architecture/README.md` §账号认证；`docs/knowledge/_LOG.md` `kb.routeme.user-auth` | 仍写「`authForm.ts`（校验、预设兴趣、`addInterest` / `removeInterest`）」「12 个预设 + 自定义，仅已选标签提交」；注册页已在后续 change 移除兴趣选择，知识库未同步，且 `add-user-profile` 的 `tasks.md` 没有知识库更新任务 | 在 `add-user-profile` 归档时同步这两处（改指资料完善页的 3–5 个兴趣），或在本文 change 的 `summary.md` 追加遗留项与承接方 | [fact] |
| UA-18 | WARNING | rules/architecture/rules.md#api-contract | `frontend/src/App.tsx` 会话恢复 `useEffect` 的 `catch` 分支；`design.md` §4 | design 约定「token 失效 → 清除 token，进入身份门」；实现只清 `routeme.authToken` 与 state，未清 `routeme.currentUserId`、未回身份门。`users` 来自 `GET /users`（含注册账号），故过期/被撤销的 token 刷新后仍以该账号身份留在应用内 | `catch` 中同时 `removeItem(CURRENT_USER_KEY)` 与 `setCurrentUserId(null)`；补一条「伪造/过期 token 刷新回身份门」的测试 | [fact] |
| UA-19 | WARNING | rules/architecture/rules.md#api-contract | `routeme.service.impl.AuthServiceImpl#register`（先 `findByUsername` 再 `createAccount`）；`routeme.handler.GlobalExceptionHandler#handleUnexpected` | 并发注册时唯一索引命中，`save` 抛 `DuplicateKeyException` 被兜底为 500 `INTERNAL_ERROR`，而契约要求同一输入给出 409 `USERNAME_TAKEN`；`proposal.md` 已把它列为残余风险但未排期 | 捕获 `DuplicateKeyException` 转 `UsernameTakenException`，或先插入再用唯一索引冲突映射 409；补并发/冲突用例 | [inference] |
| UA-20 | SUGGESTION | rules/architecture/rules.md#api-contract | `routeme.request.AuthRegisterRequest`；`design.md` §3 第 3 条；`specs/user-auth/spec.md`「注册账号」；`openspec/specs/user-auth/spec.md` | Delta Spec 与 Design 要求校验「兴趣标签数量（≤5，每个 ≤12 字）」，当前注册请求只有 `username` / `password` / `nickname`，多传的 `school` / `bio` / `interests` 被静默忽略；Living Spec 尚未合并 `add-user-profile` 的 MODIFIED，漂移未消解 | 以 `add-user-profile` 的 MODIFIED（注册不再收集兴趣）归档合并为准，同时删除 `design.md` §3 第 3 条与本 change 旧表述，避免两份权威 | [fact] |
| UA-21 | SUGGESTION | rules/quality/rules.md#coding-style | `routeme.service.impl.AuthServiceImpl#requireNickname`（`nickname.substring(0, 1)`）；`frontend/src/identity/authForm.ts`（`nickname.length`） | 昵称按 UTF-16 code unit 截取与计长：以 emoji 开头（如「🌊海边」）时 `avatar_initial` 得到孤立高代理项，10 个 emoji 就被判超长，与规格「1–20 字」不一致 | 用 `codePointAt` / `Character.charCount` 或 `Array.from(nickname)[0]` 取首字与计长，前后端同一算法 | [fact] |

## Per-dimension summary

| 维度 | 结果 | 说明 |
|---|---|---|
| A 架构 | 3 WARNING + 1 SUGGESTION | 分层与包结构整体合规（controller / request / response / service / impl / mapper / entity / exception / handler 齐全，异常两段式、无 `dao`/`dto`）；问题集中在 `AuthService` 未继承 `IService`、service→service 捷径、`/auth/logout` 与 `/users*` 契约漂移 |
| B 质量 | 3 SUGGESTION | 代码可读、无魔法数字（`AuthConstant`），但 `AuthSessionEntity` 映射方法为死代码、测试 import 未格式化、昵称按 UTF-16 处理 |
| C 测试 | 1 WARNING | 后端测试覆盖密度良好（13 个 API 用例 + 迁移 + 工具类，`in_*_out_*` 命名、`assertAll`）；前端仅纯函数单测，认证请求层与 UI 无自动化，前端界面改动无 E2E |
| D 安全 | 4 WARNING + 1 SUGGESTION | 密码盐散列、常量时间比较、token 随机性与过期校验、错误体不泄露内部信息均达标；缺口为 PBKDF2 迭代/算法、`X-User-Id` 仍为业务边界、认证端点无限流、未鉴权 `/users` 批量画像、DTO 未用 Bean Validation |
| E 过程 | 2 WARNING + 1 SUGGESTION | 规格包自包含、P1–P4 工件齐全；但 G1/G2 为事后补记且未签署，提交 message 与「一 change 两提交」不合规，`tasks.md` 引用了不存在的测试类 |
| F 文档 | 2 SUGGESTION | 文档中文、标识符英文、相对链接基本达标；`HANDOFF.md` 与知识库条目已过期且未标注被取代 |
| G 工件链与追溯 | 2 WARNING + 1 SUGGESTION | proposal → Delta → tasks → 实现 → 测试可逐条对齐（6 条验收信号均有落点）；断点为「token 失效回身份门」未实现、并发注册 500 未映射 409、注册兴趣校验要求与实现脱节；`atdd-design.md` / `dov-ac-review.md` / `consistency-lint.md` 缺失记为 N/A |

## Residual risks

- 会话过期只对 `/auth/me` 生效：业务端点仍按 `X-User-Id` 授权，过期或被撤销的 token 不影响业务调用；在 `UA-09` 收口前，「登录态」与「业务身份」是两条独立通道。
- 会话 token 明文存于 `auth_sessions.token`，前端存 `localStorage`（`routeme.authToken`）：库或 XSS 任一失守即可接管最长 7 天的会话；`summary.md` 已登记，但无承接 change-id。
- 无 `auth_sessions` 过期行清理任务（仅校验时拒绝并删除当前命中行）。
- 登录失败的响应时间与「账号是否存在」相关（未知账号不执行 PBKDF2）；错误码已统一，但计时侧信道仍在。
- 契约仍有 7 条 Redocly warning（5 条故意非法的 `rejected` 示例 + `/users`、`/users/demo` 未声明 4XX），`npm run lint:api` 在本仓库不可执行，无法在 CI 侧固化。
- 本 change 无 `atdd-design.md` / `dov-ac-review.md` / `consistency-lint.md`，也无四份单工件评审报告（`@rule:artifact-review-gate` 落地于 14:04，晚于工件写作）；追溯豁免成立，但归档记录的完整性弱于后续 change。
- 浏览器走查曾使用临时 mock API，真实后端只做人工复验；注册链路仍无自动化。

## Next remediations (non-Gate)

- `/sdd:rules-govern`：在 `docs/knowledge/rules/security/rules.md` 或 change 侧明确「PBKDF2 是否可作为 bcrypt/Argon2 的等价例外」与限流例外登记方式（owner：待指派）。
- `/sdd:delta-craft`：`add-user-profile` 归档时同步 Living Spec 的注册要求与演示账户数量，消解 `UA-02` / `UA-20`（owner：待指派）。
- 新增 change（建议 id）：`add-token-auth-endpoints` 收口 `UA-09`（`X-User-Id` → Bearer），并在其中处理 `UA-01` / `UA-18` / `UA-19`。
- `/sdd:atdd-apply`：补认证请求层单测与身份门 E2E，覆盖「过期 token 刷新回身份门」（`UA-07` / `UA-18`）。
- `/sdd:consistency-lint`：把「演示账户数量」与「注册字段集合」纳入规则化检查，避免同一事实多处写法。
- 本报告不是 Gate 结论，不替代 G1/G2/G3 签署；`UA-13` 需要具名开发者与角色确认。