# P4 阶段记录 — add-credit-recovery

- **Change：** `add-credit-recovery`（REQ-024 / S25 安全学习恢复信用分）｜ **阶段：** P4（ATDD apply）
- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者）
- **基点：** 分支 `feature/add-credit-recovery`（基于 `origin/main@ec360dc`）
- **前置：** G1 **Pass（无条件，2026-11-17，IO=WAYNE / SA=Jacky）**；`design.md` / `tasks.md` 工件评审 Pass（BLOCKER 0，第二签署 Jay）

## 1. 阶段目标

按 `tasks.md` T1 → T13 逐条落绿（每条先写/扩展测试再实现），把 Delta 的 7 Requirement / 29 Scenario 落成：契约 `0.19.0` → `V25` 迁移 → 题库与判分 → 会话 / 记账 / 配额 → 发布拦截 → 前端五态学习页与拦截入口 → E2E。

## 2. 产出

| 任务 | 落点 | 结论 |
|---|---|---|
| T1 contract | `openapi.yaml` `0.19.0`：3 端点 / 4 schema / 6 错误码 / `POST /api/trips` 403 | `OpenApiTest` 通过；Redocly valid（0 error / 19 warning） |
| T2 迁移 | `V25__add_credit_learning.sql`（单表 + `(user_id, month_key)` 索引） | 全新库 V1–V25 与旧库（V20）升级均绿 |
| T3 题库 | `LearningQuestionBank`（20 题自校验）/ `draw`（四类保底 + 补足 10）/ `CreditMonth` | `CreditLearningDrawTest` 绿（固定 seed 可复算） |
| T4 会话 | `start` / `completeLessons`，开始即计次；会话只存完成标记 + 抽中题号 | `CreditLearningApiTest` 覆盖 A5–A11 |
| T5 判分 | `submit`：长度 10、每项 0–3；`score ≥ 8` 通过；已提交会话原样回放 | A12 / A13 / A14 / A10 绿 |
| T6 记账 | `CreditService.recorded` + `CreditReason`（D14）；先配额后资格；扣减式 `book(delta = 60 - before)` | A15–A22 / A26 / A29 绿；并发只写 1 条账本 |
| T7 拦截 | `CreditGateService.assertCanPublish`，只在 `TripController.create` 调用 | `CreditPublishGuardApiTest` 4/4；全量后端 **348/348** |
| T8 前端底座 | `types.ts` 5 类型 / `api.ts` 3 函数 / `route.ts` `creditLearning` | `route.test.ts` 9/9 |
| T9 状态机 | `credit/learningState.ts`：`phase` / `toViewModel` / `quizProgress` / `errorMessage` + 判定辅助 | `learningState.test.ts` 10/10 |
| T10 学习页 | `credit/LearningPage.tsx`（五态）+ `credit/learningPage.css` | 见 P4-D2；刷新走 `sessionStorage` 续考 |
| T11 拦截入口 | `trips/publishGuard.ts` + `TripCreatePage` 专用 Alert + `.publish-guard` 样式 | `publishGuard.test.ts` 4/4；前端 **308/308**（40 文件） |
| T12 E2E | `e2e/tests/credit-learning.spec.ts`（3 例） | **3/3 绿**（隔离库 + 8081 / 5174），A1 / A6 / A24 / A25 / D6 |
| T13 登记 | `registry.md` / `stories.md` / `handoff.md` / 本记录 | 本节 |

## 3. 本阶段裁决

| 编号 | 议题 | 裁决 | 依据 |
|---|---|---|---|
| P4-D1 | 阈值复用地 | `PUBLISH_MIN_SCORE = RECOVERY_TARGET_SCORE`，`CreditGateServiceImpl` 内零字面量 `60` | design「阈值单点」；回归时改一处即可同时影响放行与恢复 |
| P4-D2 | 学习页样式落点 | 独立 `src/credit/learningPage.css`（680 行，全 `.cl-*`，页面 `import`），只在 `styles.css` 加发布拦截块 | T10 原写「`styles.css` 增」；主样式表已 6917 行，独立文件等价且不污染主表，令牌仍取原型（`--lagoon` / `--coral` / `--grad-shore` / `--sh-2` / `--r-lg`） |
| P4-D3 | 状态派生的入参 | `phase({ creditScore, session, result })`（而非 `phase(session, result)`） | 分数与两态一并判定，避免页面各自拼 `score >= 60` 条件 |
| P4-D4 | 拦截入口分流 | 纯函数 `describePublishFailure(code)` → `creditGuard` / `generic` / `null`，只有 `CREDIT_SCORE_BELOW_60` 进学习引导 | A1 + D6；页面不写错误码字符串比较，单测可锁「近似码不误命中」 |
| P4-D5 | E2E 造分与判分答案 | 造分用 SQL 改 `user_credit_account.score` + 补 `SYSTEM_ADJUST` 账本行；判分答案按题面回查服务端题库文件，前 8 对 / 后 2 错 | atdd §4「造分」；答案不进契约，E2E 只能按题库文件回查 |
| P4-D6 | E2E 运行环境 | 全新 SQLite + 后端 8081 + 前端 5174，跑完删临时库；`ROUTEME_E2E_DB` / `ROUTEME_E2E_BASE_URL` 可覆盖 | atdd §4；不污染开发库与 8080/5173 |

## 4. 校验

| 门禁 | 命令 | 结果 |
|---|---|---|
| 后端单测 | `cd RouteME/backend; .\mvnw.cmd -B -ntp test` | **348 tests / 0 failures**（含 `TripControllerTest` 36 条，默认 80 分不受门禁影响） |
| 前端类型 | `cd RouteME/frontend; npm run typecheck` | 通过 |
| 前端构建 | `npm run build` | 通过（css 102.81 kB / js 1,315.21 kB） |
| 前端单测 | `npm test` | **308 tests / 40 files** 全绿 |
| E2E（本 change） | `cd RouteME/e2e; npx playwright test tests/credit-learning.spec.ts` | **3/3 绿**（隔离环境 16.5s；开发环境 8080/5173 复跑 17.5s 亦绿） |
| E2E（全量） | `cd RouteME/e2e; npx playwright test` | **102 passed / 17 failed**（119 条，7.5m）；失败全部在 `map.spec.ts`（9）/ `trips.spec.ts`（8），签名为 `[data-testid="china-map"]` 未渲染，同 base 历史报告一致，本 change 未改地图代码与这两份用例 |
| 规格 | `npx --no-install openspec validate add-credit-recovery --strict` | valid |
| 契约 | `npx -y @redocly/cli@2 lint openapi.yaml` | 0 error / 19 warning（#18–#19 为提交端点刻意构造的 400 示例，与既有 `trips/post` 的 `rejected` 示例同口径） |
| 视觉 | 无截图产物：按 DOM 类名（`.cl-*`）与令牌核对五态、940px 单栏、620px 按钮、深色三处提亮 | 通过 |
| 本地验证 | `/sdd:local-verify` → `docs/ai4se-plugins/20261117-161617-local-verify-report.md` 与 `...-quality-checklist-report.md`（同日时间戳） | **Overall Pass**（P4-1 / P4-2 / P4-6 必选项全 Pass；E3 待 VL） |

## 5. 待签

| 角色 | 事项 | 状态 |
|---|---|---|
| VL | `/sdd:local-verify` 报告 + 质量清单 | **报告已产出待独立复核**：`docs/ai4se-plugins/20261117-161617-local-verify-report.md`（Overall Pass）与 `…-quality-checklist-report.md`；E3 未签 |
| IO + SA | G2 决策 | 待 CI 通过后由 VL 独立签署 `g2-decision.md` |

本阶段记录为开发者自述，不代签 VL / IO / SA。

## 6. 跟踪项

| 项 | 说明 |
|---|---|
| local-verify | 本轮只跑本 change 的 E2E spec；全量 E2E 有 base 既有地图用例债务，需在 local-verify 报告中标注 |
| 契约示例警告 | 提交端点 `invalid` 示例刻意越界以演示 400，触发 `no-invalid-media-type-examples`；与既有 `rejected` 示例同口径，保留 |
| `pickPlace` 重复 | `support.ts` 已提供共用 `pickPlace`（等候选出现再点），`trips.spec.ts` 内同名本地实现未回改，避免动 749 行既有用例 |
| 地图 E2E 债务 | 全量 E2E 17 条失败（`china-map` 未渲染）为同 base 既有债务，归地图 owner；本地验证报告已归因，未在本 change 内修 |
| Maven `-Dtest` 陷阱 | 本机 harness 对 `-Dtest=<具体类名>` 偶发拦截（`code = 40441 ... rmdir`），实际执行建议用通配（如 `-Dtest=CreditPublish*`） |
| 归档顺序 | 仍 MUST 排在 `add-credit-account` 之后（`openspec/specs/` 尚无 `user-credit`） |
| 号位复核 | 合并前确认 `add-ai-itinerary` 仍占 `0.15.0 + V21` |

## 7. 提交记录

本阶段**未提交**。新增：后端 `service/CreditGateService(+Impl)`、`constant/CreditLearningConstant.PUBLISH_MIN_SCORE`、8 个测试类（`CreditLearningApi/Recovery/Quota/Concurrency/ReasonLabel/PublishGuard/MigrationSqlite/Draw`）；前端 `credit/{learningState,LearningPage}.ts(x)` + `learningPage.css` + `trips/publishGuard.ts` + 3 个测试文件 + `tripMessages` 文案 + `styles.css`（仅发布拦截块）；E2E `credit-learning.spec.ts` + `support.ts` 共用定位助手；文档 `tasks.md` T1–T13 回填、本记录、`registry.md` / `stories.md` / `handoff.md`、`docs/sdd/README.md`、`docs/ai4se-plugins/20261117-161617-{local-verify,quality-checklist}-report.md`。

## 8. 合并 main 与两轮号位重排（2026-11-17）

> 本节记录 `verify` 提交之后、`/sdd:pr-submit` 之前的合并动作（用户裁决：直接合并到 `main`；删库重建）。

### 8.1 基线偏差

| 事实 | 证据 |
|---|---|
| 合并开始时本地 `main = 0524109`，`origin/main = 3db5b14`，本地落后 9 个提交 | `git log --oneline 0524109..origin/main` |
| 落后提交含 `add-experience-like-credit`（REQ-023 / 契约 0.18.0 / `V24__add_experience_likes.sql`）与「客服与举报」侧栏入口 | 同上 |
| 首次合并基于本地 `main`，按当时已占号位顺延为 REQ-023 / S25 / 0.18.0 / V24 | 合并回退点 `3a6cf4f` |
| 同步 `origin/main` 后上述四个号位再次被占，按「后到者顺延」最终定为 REQ-024 / S25 / 契约 0.19.0 / `V25__add_credit_learning.sql` | 本节记录 |

### 8.2 冲突解决

| 文件 | 处置 |
|---|---|
| `openapi.yaml` | 以 `origin/main` 全量为底，修回 `/admin/reports/{reportId}` GET 的错误响应块（`origin/main` 自身 `duplicated mapping key` 缺陷），再叠加 learning 三端点 |
| `api.ts` / `types.ts` / `route.ts` / `route.test.ts` | 双方保留：main 的点赞端点与客服路由 + 本 change 的 learning 端点与 `#/credit/learning` |
| `OpenApiTest.java` | 版本断言统一 0.19.0，两方契约方法都在 |
| `registry.md` / `stories.md` / `docs/sdd/README.md` | 两段并存（REQ-023 `add-experience-like-credit` / REQ-024 本 change） |
| `handoff.md` | 冲突块两侧都保留，本 change 三条改号后接在 like-credit 四条之后 |
| 迁移撞名 | 本 change 由 `git mv` 改为 `V25__add_credit_learning.sql`（`V24` 归 `add-experience_likes`） |
| `CreditLearningMigrationSqliteTest` | 先迁到 V24 取 `app_users` 列快照，再迁最新比对；版本断言 `'24'` → `'25'` |
| `credit.spec.ts` | 采用 `origin/main` 版本（断言 401/403、含获赞用例），未做本地改写 |

### 8.3 门禁（合并后）

| 门禁 | 结果 |
|---|---|
| 后端 `mvnw -B -ntp test` | **502/502**（本地需 `SPRING_DATASOURCE_URL=jdbc:h2:mem:routeme;DB_CLOSE_DELAY=-1`，base 配置优先级债务） |
| 前端 `typecheck` / `test` / `build` | 通过 / **49 文件 366 tests** / 通过 |
| `openspec validate add-credit-recovery --strict` | valid |
| Redocly `lint openapi.yaml` | 解析通过；**6 error**（全部 `nullable-type-sibling`，均在 `origin/main` 的 `Admin*` schema）+ 23 warning |
| 删库重建 | 删除 `SqlLite/routeme.db` 后启动 jar，Flyway **V1–V25** 全部重放成功 |
| 本 change E2E | `credit-learning.spec.ts` **3/3** |
| 受影响回归 | `experience-likes` / `credit` / `mine` / `safety-report` **27/27** |

### 8.4 与本 change 无关的既有 E2E 债务（合并后复跑归因）

| 用例 | 现象 | 归因 |
|---|---|---|
| `map.spec.ts` 9 条 | `[data-testid="china-map"]` / `city-map` 不渲染 | 本机无 AMAP Key 的环境债务（同 base） |
| `trips.spec.ts` 8 条（140 / 187 / 224 / 242 / 376 / 417 / 451 / 476） | `.place-chip-name`、china-map 等不可见 | 同上 |
| `auth.spec.ts` 7 条 | 等待 `账号菜单：` 超时 | `origin/main` 的 `AppShell.tsx` 已把 aria-label 改为 `账号：{昵称}`，用例未同步 |
| `profile.spec.ts` 318 / 496 | `.mine-profile-card` 不存在 | main 的 UI 改版已移除该组类名，`origin/main` 同样不存在 |
| 全量运行时 `profiles` 4 条 / `experiences` 1 条 | 「参与同行」计数、种子卡位次漂移 | 共享库写入累积；单文件 + 全新库复跑为 **8/8、10/10 全绿** |

结论：**本 change 引入的 E2E 失败 0 条**，上述五类均可在 `origin/main` 复现，归 base owner。

### 8.5 提交与未签项

- 合并先落一个可回退的 merge 提交（基于本地 `main`），再以第二个 merge 提交合入 `origin/main` 完成二次重排；两笔均在本地、未 push。
- 评审快照（`docs/reviews/20261117-add-credit-recovery-*`）保留起草时的 REQ-022 编号；`20261117-161617-*` 两份报告保留 P4 时的 0.18.0 口径，均在 `registry.md` 编号说明中标注为过程快照。
- **仍未签署：G2（VL）、E3；本记录不代签。**
