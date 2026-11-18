# Local Verify Report: add-experience-like-credit

**Date:** 2026-11-17 (timezone: Asia/Shanghai, UTC+08:00)
**Root:** C:\Git\ITA\RouteME\.worktrees\add-experience-like-credit\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-experience-like-credit

> 覆盖范围说明：本报告先对 feature 分支 P4 提交 `0a6b9e5` 执行（Pass），随后合并 `origin/main@b50e416`，按先合并者优先顺延为 **`0.18.0` + `V24__add_experience_likes.sql` + `REQ-023`**，并重新执行全部命令。
> 合并后复验：后端 **465 tests**、前端 **47 files / 351 tests**、受影响 E2E **12/12**、OpenSpec valid；Redocly 在修复 main 的重复 key 后恢复可解析，但仍有 **6 个 main 继承错误**（均位于管理后台 schema / `/users` GET，不在点赞端点）。
> 因此最终 **Overall = Partial**：本 change 新增的端点 / schema 无 error，剩余错误为 main 既有债务（详见 Findings W5 / W6 与 Post-sync addendum）。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Partial |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Partial |

**PR gate:** Fail blocks `/sdd:pr-submit` unless Waiver below is complete.
Agents must not self-approve Waiver.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `./mvnw.cmd -B -ntp clean verify`（ai4se-baseline/RouteME/backend） | `.github/workflows/ci.yml` | 0 | 合并前：342；**合并后：465 tests, 0 failures / 0 errors**，BUILD SUCCESS（含 V1–V24） |
| `npm run build`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml`（build 内含 `tsc --noEmit`） | 0 | 合并前 1593 modules / 1.50s；**合并后 1622 modules / 3.13s**；仅既有主 chunk 1.60 MB >500 kB 警告 |
| `npm test`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml` | 0 | 合并前 40 files / 306；**合并后 47 files / 351 tests passed**（含 `experienceLikes.test.ts` 7 条） |
| `openspec validate add-experience-like-credit --strict`（ai4se-baseline） | 项目 OpenSpec 约定（P2/P3 同口径） | 0 | `Change 'add-experience-like-credit' is valid` |
| `npx --yes @redocly/cli@latest lint openapi.yaml`（ai4se-baseline/RouteME） | T11 / 既有契约校验口径 | 1 | 合并前：valid、17 warnings。合并后：修复 main 的重复 key 后恢复可解析；**6 errors + 21 warnings**，全部继承自 main（管理后台 nullable / `/users` GET 缺 4XX），none 在 likes 端点 / 新 schema |
| `npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts`（ai4se-baseline/RouteME/e2e） | design.md §5（E2E 不在 CI） | 0 | 合并后隔离库重跑 **12 passed（30.7s）**：credit 9（含 C-15）+ experience-likes 3；修正 1 条 main 过期断言后全绿 |
| `rg` 白名单解析 | probe-verify.sh | n/a | 本机 Git Bash 无 `rg`，probe 报 `whitelist_empty:yes`；C2 已由用户确认改用项目 CI 命令集 |

## Code-review highlights

- **事务边界**：`like()` 的「体验校验 → 自赞拒绝 → 插入点赞 → 档位结算」在同一 `@Transactional`，`CreditService.book` 以 REQUIRED 加入；结算失败会连带回滚点赞，不留半结算。
- **并发缺陷已在 TDD 中修复**：`AbstractServiceImpl.nextId` 的 `max(id)+1` 在两线程下会撞主键；实现区分「同（体验,用户）已存在 → 幂等返回」与「主键冲突 → 换 id 重试 ≤3 次」，`ExperienceLikeApiTest` L-8 覆盖。
- **读侧无 N+1**：`describeAll` 用 `selectStatsByExperienceIds` 一次 `GROUP BY` 取整页赞数与点赞态，无记录时回落 `ExperienceLikeStat.empty`；列表 / 详情 / 我的体验共用同一 mapper。
- **授权在服务端**：未登录由 `demoUserService.require` → 401；自赞 403；体验不存在 404 `EXPERIENCE_NOT_FOUND`；取消未赞为 0 行受影响仍 204。
- **前端**：`ExperienceLikeButton` 乐观更新 + 失败回滚 + `message.error`，带 `aria-pressed` / `aria-label`；自己的体验不渲染；首页与详情共用组件，避免两份状态机。
- **发现（详见 Findings）**：幂等键前缀 `likeRight` 含未转义 `_`；`monthlyUsed` 全量载入后在 Java 求和；`design.md` §3 标题仍写 `0.15.0`；`canLike(..., true)` 硬编码已登录。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md`：`- [x]` 44 条 / `- [ ]` 0 条；T0–T11 全部勾选 |
| V2 | Requirement coverage | Pass | [fact] | Delta 共 5 条 ADDED Requirement：trip-experiences 2（点赞与取消、赞数与点赞态展示）+ user-credit 3（阶梯加分、月度上限、计分边界）；逐条有实现证据（`ExperienceLikeService`、`ExperienceResponse`、`ExperienceLikeRewardService`、`ExperienceLikeRewardRules`、无明细入口的反向用例） |
| V3 | Scenario coverage | Pass | [fact] | 27 Scenario 全覆盖：`ExperienceLikeApiTest`(8, L-1~L-8) / `ExperienceLikeDisplayApiTest`(1, D-1) / `ExperienceLikeCreditApiTest`(8, C-1~3、C-5~7、C-13~14) / `ExperienceLikeCreditMonthApiTest`(5, C-8~C-12) / `ExperienceLikeRewardRulesTest`+`RewardServiceTest`(5, 含 C-4) / E2E 4（D-2~D-4、C-15）；映射见 `tasks.md` 对齐自检 |
| V4 | Requirement↔impl mapping | Pass | [fact] | 点赞/取消 → `ExperienceController` L92–109 + `ExperienceLikeServiceImpl`；展示 → `ExperienceResponse`（`like_count`/`is_liked`）+ `ExperienceLikeMapper.selectStatsByExperienceIds` + 两个展示面；结算 → `ExperienceLikeRewardServiceImpl` + `CreditService.book`；边界 → `CreditReadOnlyApiTest` + C-15 页面断言 |
| V5 | Spec drift | Pass | [fact] | 实现与 Delta 一致；6 项执行偏差已在 `tasks.md`「执行偏差记录（P4）」显式登记（mapper 形态、月度 Java 求和、并发主键重试、C-7 重复投递、C-14 固定时钟、共用按钮），无静默漂移 |
| V6 | Design follow-through | Pass | [fact] | D1–D16 均有实现落点：V22 建表+唯一索引；服务拆分；批量读取；viewer 透传；201/200/204；唯一约束兜底；仅新插入触发结算；MAX 档位；月度 applied_delta；幂等键 `EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}`；契约 0.16.0；前端纯逻辑+共用组件；原型先行。**唯一文档瑕疵**：`design.md` §3 标题仍写 `0.15.0`（W2） |
| V7 | Code pattern fit | Pass | [fact] | 命名/分层沿用既有：`AbstractServiceImpl` + `IdType.INPUT`、mapper 注解 SQL、纯规则类 `ExperienceLikeRewardRules`、前端纯函数 `experienceLikes.ts` + 组件复用、`tripMessages` 文案、styles.css 令牌 |
| V8 | Upstream basis | Pass | [fact] | diff 79 文件均可追溯到 T0–T11：原型 5、契约/迁移 2、后端 17、后端测试 11、前端 10、E2E 2、文档/台账 32；无未登记的功能性 scope creep |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（后端 verify / 前端 build+test / openspec / redocly 全部 exit 0）；远端 CI 未触发（未 push / 未开 PR） |
| E2 AI | Pass | 本报告 + V1–V8；无独立 eval 报告 |
| E3 Human | Pending | G2 待 VL=Neal 签署；本报告不代签 |

## Five-question map (when evidence in scope)

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ 44/44 任务、5/5 Requirement、27/27 Scenario |
| Q2 Correct? | V4–V5 | ✅ 实现与 Delta 一致；6 项偏差已登记；并发缺陷已修复并有用例 |
| Q3 Coherent? | V6–V7 | ✅ D1–D16 落地、模式贴合；仅 design.md 版本标题笔误 |
| Q4 Necessary only? | V8 | ✅ 无未登记的范围蔓延；无非目标功能（明细页 / 通知 / 管理端 / 结转） |
| Q5 Risk controllable? | residual + red lines | ⚠️ main 已前进需顺延复验；G2 未签；E2E 未在 CI 且本轮未重跑；视觉截图证据受限 |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| W1 | 已锁定档位查询使用 `likeRight`，幂等键前缀 `EXPERIENCE_LIKE:` 中的 `_` 是 SQL LIKE 单字符通配符，未转义；理论上可匹配 `_` 位置为任意字符的同前缀键 | [fact] | `ExperienceLikeRewardServiceImpl#lockedTiers` | 合并前或紧随修复：对 `_` / `%` 做转义，或改为 `eq(reason_code)` 后取全量 key 在 Java 侧 `startsWith` 精确过滤；当前因 reason_code 已限定且键格式统一，实际风险低 |
| W2 | 设计文档段落标题写「契约（0.15.0）」，与文档头部、实现与 OpenAPI 的 `0.16.0` 不一致 | [fact] | `openspec/changes/add-experience-like-credit/design.md` §3 | **已处理：** 顺延时改为 `0.18.0`，并在约束行注明 P3 原定 0.16.0 / V22 与合并后顺延原因 |
| W3 | `origin/main` 已前进：openapi `0.17.0`、迁移至 `V23`、`REQ-022` 被 `add-trip-weather` 占用；当前分支的 `0.16.0` / `V22` / `REQ-022` 直接合并会撞号 | [fact] | `openapi.yaml`、`db/migration/V22__add_experience_likes.sql`、`requirement-workspace/registry.md` | **已处理：** 顺延为 `0.18.0` + `V24__add_experience_likes.sql` + `REQ-023`，同步测试断言与台账，合并后全量复验通过（见 Post-sync addendum） |
| W4 | E2E 不在 CI，本轮未重跑；P4 的 12/12 是同日提交前证据 | [fact] | `.github/workflows/ci.yml`、`docs/sdd/add-experience-like-credit/p4-verify.md` | **已处理：** 合并后用隔离库重跑 12/12；修正 main 新增后台导致的旧 404 断言 → 401/403 |
| W5 | `origin/main` 的 `openapi.yaml` 本就无法解析：`/admin/reports/{reportId}` 的 GET 块混入了图片端点响应与重复 `description` key（Redocly 在 main 同样报 duplicated mapping key） | [fact] | `openapi.yaml`（合并时 `/admin/reports/{reportId}`） | **已处理：** 合并时恢复为 `200: 举报上下文与处置历史 + AdminReportDetail`，保留图片端点原有响应；main 本身的 CI 不跑 Redocly，故未拦住 |
| W6 | 修复重复 key 后 Redocly 仍报 6 个 main 继承错误：5 个 `nullable` 未伴 `type`（均在 Admin* schema）+ `/users` GET 缺 4XX；另 21 warnings（示例与 schema 不一致，既有） | [fact] | `openapi.yaml` 行 ~3531/3723/3677/3639/3747/3752 与 `/users` | 不属本 change 范围，未修；建议由管理后台 change 补 `type` 与 4XX，或后续统一处理；本 change 新增的 likes 路径 / `ExperienceLike` / `Experience` 字段无 error |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| S1 | 月度额度 `monthlyUsed` 一次性载入该用户全部 `EXPERIENCE_LIKE` 账本行后在 Java 求和；当前量级（每档一条）可忽略，大批量加分时需改回 SQL 聚合 | [fact] | `ExperienceLikeRewardServiceImpl#monthlyUsed` | 保留为已登记债务（`tasks.md` 执行偏差），未来引入批量加分时改 SQL `SUM` + 时间窗 |
| S2 | `ExperienceLikeButton` 内 `canLike(experience, currentUserId, true)` 硬编码「已登录」 | [fact] | `frontend/src/experiences/ExperienceLikeButton.tsx` | 当前两个展示面均在登录后渲染，可接受；若未来用于公开页，应改为显式传入 `isAuthenticated` |
| S3 | 点赞失败提示使用 antd 静态 `message`，与既有页面口径一致；无单测覆盖提示文案 | [fact] | `ExperienceLikeButton.tsx` | 维持现状；提示文案已集中在 `tripMessages`，E2E D-4 覆盖回滚行为 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | main 已前进导致版本 / 迁移 / 需求号撞车 | 已按先合并者优先顺延并复验 | **已缓解**：`0.18.0` + `V24` + `REQ-023`，后端/前端/E2E/OpenSpec 均通过（mitigated） |
| 7 | main 继承的 6 个 Redocly error（管理后台 / `/users`） | 不属本 change 且 main 原本无法解析；本 change 未引入新的 lint error | 已知债务；建议管理后台 change 修复（tracking） |
| 2 | G2 未签署（VL=Neal） | 用户当次指示先报告、同步后合并；模型不得代签 | 合并时在 `p4-verify.md` / `registry.md` / `handoff.md` 记录「按用户指示直接合并，G2 待 Neal 补签」；G2 签署仍需人工完成（tracking） |
| 3 | E2E 不在 CI | CI 只在 main push / PR 跑后端 + 前端单测 | **已重跑 12/12（隔离库）**；长期由 P5 / 流程治理决定是否纳入 CI（tracking） |
| 4 | 视觉截图证据受浏览器隐藏态限制 | P4 走查以计算样式 + iframe 宽度实测代替截图 | VL 复核时补一次真实截图（accepted） |
| 5 | `lockedTiers` LIKE 通配符（W1） | 当前键格式与 reason_code 限定下实际风险低 | 合并顺延时一并修复，或登记为紧随债务（tracking） |
| 6 | 月度并发严格性依赖 SQLite 单写者 | 项目当前运行模型即 SQLite | 同事务 + 幂等键唯一索引兜底；迁移多写者数据库时补行锁（accepted） |

## Waiver

N/A — no waiver.

## Human review assist

- **Risk band:** M（涉及信用分记账与授权；无不可逆操作；无可疑 AI-only 放行）。作者自评 M；本报告无 CRITICAL，维持 M。
- **E1 / E2 / E3:** E1 Pass（本地 CI 命令）/ E2 Pass（本报告）/ E3 Pending（VL=Neal）。
- **Q1–Q5:** 见上表；Q5 为 ⚠️，原因是同步顺延与 G2 未签，不是代码缺陷。
- **Findings response guide:**
  - W1 `accept`（合并顺延同批修复）或 `reject`（登记紧随债务，需 VL 确认）；
  - W2 `accept`（顺延为 0.18.0 时修正）；
  - W3 `accept`（合并前必须完成）；
  - W4 `accept`（合并后重跑 E2E）；
  - S1–S3 `accept`（已登记债务 / 维持现状）。
- **Red lines:** 未发现授权绕过、密钥/PII 泄露、不可逆变更、以「AI 说 Pass」作为唯一放行依据。
- **Release suggestion:** 代码层面「放行」；合并动作「带例外放行」——例外为版本顺延后的复验与 G2 补签，release owner = Neal（VL）。
- **Feedback hook:** 若合并后出现点赞计数 / 信用分异常，先复跑 `ExperienceLikeApiTest` + `ExperienceLikeCreditApiTest` + `ExperienceLikeCreditMonthApiTest`，再核对 `credit_ledger` 的 `EXPERIENCE_LIKE` 幂等键。

## Post-sync addendum（2026-11-17，合并 `origin/main@b50e416` 后）

### 顺延结果

| 项 | 原值（P3/P4） | 合并后 | 同步位置 |
|---|---|---|---|
| 契约版本 | `0.16.0` | **`0.18.0`** | `openapi.yaml`、`OpenApiTest`（含新增 likes 测试与 main 的两处版本断言） |
| 迁移 | `V22__add_experience_likes.sql` | **`V24__add_experience_likes.sql`** | 迁移文件、`ExperienceLikeMigrationSqliteTest` 的版本断言 |
| 需求号 | `REQ-022` | **`REQ-023`** | `registry.md` / `stories.md` / `handoff.md` / `impact-brief.md` §23 / `deep-dive.md` / 意图与需求文件名 / change 工件 / 阶段记录 |

### 合并时处理的冲突与修正

| # | 文件 / 问题 | 处理 |
|---|---|---|
| 1 | `ExperienceServiceImpl` 构造器冲突 | 保留本 change 的 `ExperienceLikeService`，并补入 main 的 `AccountStatusService` 与 `assertCanWrite` |
| 2 | `TripDetailPage` 冲突 | 取 main 新版，重新接入 `ExperienceLikeButton` / `updateExperience` / `.exp-item-foot` |
| 3 | `openapi.yaml` 冲突 | 取 main 版后重新追加 likes 路径、`ExperienceLike`、`Experience` 两字段、错误码，并升至 `0.18.0` |
| 4 | `AdminConsole` 测试「全局无 DELETE」 | 收窄为「管理后台路径无 DELETE」（本 change 的 `DELETE /likes` 是 G1 批准设计） |
| 5 | `openapi.yaml` main 重复 key | 修复 `/admin/reports/{reportId}` GET 被混入图片响应的问题（main 原始文件 Redocly 无法解析，见 W5） |
| 6 | `credit.spec.ts` 旧断言 | `/admin/users` 期望从 404 改为 401/403（main 已新增管理后台） |
| 7 | `target/classes` 残留 | 首次 `verify` 因旧 V22 残留与 main V22 撞号；改用 `clean verify` 后全绿 |

### 合并后命令结果

| 命令 | Exit | 摘要 |
|---|---|---|
| `./mvnw.cmd -B -ntp clean verify`（backend） | 0 | **465 tests, 0 failures / 0 errors**，BUILD SUCCESS（V1–V24 共 24 个迁移） |
| `npm run build`（frontend） | 0 | 1622 modules；built in 3.13s；仅既有主 chunk 1.60 MB 告警 |
| `npm test`（frontend） | 0 | **47 files / 351 tests passed** |
| `openspec validate add-experience-like-credit --strict` | 0 | valid |
| `npx @redocly/cli lint openapi.yaml` | 1 | 可解析；6 errors + 21 warnings（均为 main 继承，见 W6；likes 端点无 error） |
| `npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts` | 0 | **12 passed（30.7s）**（隔离 SQLite `routeme-e2e-merge.db` + 后端 8083 + Vite 5175） |

**Addendum 结论：** 除 main 继承的 Redocly 错误外，所有验证维度通过；本 change 自身新增的契约 / 代码 / 测试无失败。Overall 维持 **Partial**，供 VL 在 G2 时对「main 继承 lint 债务」做明确裁决。
