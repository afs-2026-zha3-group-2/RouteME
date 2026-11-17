# Local Verify Report: add-experience-like-credit

**Date:** 2026-11-17 (timezone: Asia/Shanghai, UTC+08:00)
**Root:** C:\Git\ITA\RouteME\.worktrees\add-experience-like-credit\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-experience-like-credit

> 覆盖范围说明：本报告验证的是 feature 分支提交 `0a6b9e5`（P4 完成态）。
> 校验时发现 `origin/main` 已前进到 `b50e416`（openapi `0.17.0`、迁移至 `V23`、`REQ-022` 已被 `add-trip-weather` 占用）。
> 因此本报告 **Pass 仅对当前分支提交成立**；合并 main 前必须完成版本/迁移/需求号顺延（`0.18.0` + `V24__add_experience_likes.sql` + `REQ-023`）并重新执行本报告全部命令。
> 顺延后的复验结果将作为 addendum 追加到本报告末尾；addendum 完成前不得作为 G2 最终证据。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** Fail blocks `/sdd:pr-submit` unless Waiver below is complete.
Agents must not self-approve Waiver.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `.\mvnw.cmd -B -ntp verify`（ai4se-baseline/RouteME/backend） | `.github/workflows/ci.yml` | 0 | `Tests run: 342, Failures: 0, Errors: 0, Skipped: 0`；BUILD SUCCESS（48.6s） |
| `npm run build`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml`（build 内含 `tsc --noEmit`） | 0 | 1593 modules transformed；built in 1.50s；仅既有主 chunk 1,298 kB >500 kB 警告 |
| `npm test`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml` | 0 | **40 test files / 306 tests passed**（含 `experienceLikes.test.ts` 7 条） |
| `openspec validate add-experience-like-credit --strict`（ai4se-baseline） | 项目 OpenSpec 约定（P2/P3 同口径） | 0 | `Change 'add-experience-like-credit' is valid` |
| `npx --yes @redocly/cli@latest lint openapi.yaml`（ai4se-baseline/RouteME） | T11 / 既有契约校验口径 | 0 | `Woohoo! Your API description is valid.`；17 warnings，均为既有示例告警，无 likes 端点 / 新 schema 告警 |
| `npx playwright test tests/experience-likes.spec.ts tests/credit.spec.ts`（ai4se-baseline/RouteME/e2e） | design.md §5（E2E 不在 CI） | n/a | 本轮未重跑；P4 同日隔离库运行 **12 passed**（credit 9 含 C-15 + experience-likes 3），证据 `docs/sdd/add-experience-like-credit/p4-verify.md` §3；合并 main 后随复验重跑 |
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
| W2 | 设计文档段落标题写「契约（0.15.0）」，与文档头部、实现与 OpenAPI 的 `0.16.0` 不一致 | [fact] | `openspec/changes/add-experience-like-credit/design.md` §3 | 合并顺延时一并改为 `0.18.0`（与最终契约版本一致） |
| W3 | `origin/main` 已前进：openapi `0.17.0`、迁移至 `V23`、`REQ-022` 被 `add-trip-weather` 占用；当前分支的 `0.16.0` / `V22` / `REQ-022` 直接合并会撞号 | [fact] | `openapi.yaml`、`db/migration/V22__add_experience_likes.sql`、`requirement-workspace/registry.md` | 合并前顺延为 `0.18.0` + `V24__add_experience_likes.sql` + `REQ-023`，同步测试断言与台账，再全量复验（见 Pending sync gate） |
| W4 | E2E 不在 CI，本轮未重跑；P4 的 12/12 是同日提交前证据 | [fact] | `.github/workflows/ci.yml`、`docs/sdd/add-experience-like-credit/p4-verify.md` | 合并 main 后重跑受影响 E2E（experience-likes + credit），结果追加 addendum |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| S1 | 月度额度 `monthlyUsed` 一次性载入该用户全部 `EXPERIENCE_LIKE` 账本行后在 Java 求和；当前量级（每档一条）可忽略，大批量加分时需改回 SQL 聚合 | [fact] | `ExperienceLikeRewardServiceImpl#monthlyUsed` | 保留为已登记债务（`tasks.md` 执行偏差），未来引入批量加分时改 SQL `SUM` + 时间窗 |
| S2 | `ExperienceLikeButton` 内 `canLike(experience, currentUserId, true)` 硬编码「已登录」 | [fact] | `frontend/src/experiences/ExperienceLikeButton.tsx` | 当前两个展示面均在登录后渲染，可接受；若未来用于公开页，应改为显式传入 `isAuthenticated` |
| S3 | 点赞失败提示使用 antd 静态 `message`，与既有页面口径一致；无单测覆盖提示文案 | [fact] | `ExperienceLikeButton.tsx` | 维持现状；提示文案已集中在 `tripMessages`，E2E D-4 覆盖回滚行为 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | main 已前进导致版本 / 迁移 / 需求号撞车 | 本报告只验证了同步前提交 `0a6b9e5` | 合并前顺延 `0.18.0` + `V24` + `REQ-023` 并重跑全部命令；addendum 前不作为 G2 证据（tracking） |
| 2 | G2 未签署（VL=Neal） | 用户当次指示先报告、同步后合并；模型不得代签 | 合并时在 `p4-verify.md` / `registry.md` / `handoff.md` 记录「按用户指示直接合并，G2 待 Neal 补签」；G2 签署仍需人工完成（tracking） |
| 3 | E2E 不在 CI，且本轮未重跑 | CI 只在 main push / PR 跑后端 + 前端单测 | 合并前后各跑一次受影响 E2E；长期由 P5 / 流程治理决定是否纳入 CI（tracking） |
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

## Pending sync gate

合并 `origin/main@b50e416` 后必须完成并回填本报告 addendum：

1. openapi `0.16.0` → **`0.18.0`**（main 已 `0.17.0`），同步 `OpenApiTest` 断言；
2. `V22__add_experience_likes.sql` → **`V24__add_experience_likes.sql`**（main 已占 V22 `report_context_trip` / V23 `add_travel_mode`），同步迁移测试的「升级到 V24」断言；
3. 本 change 的 **REQ-022 → REQ-023**（main 的 REQ-022 已是 `add-trip-weather`），同步 `registry.md` / `stories.md` / `handoff.md` / `impact-brief.md` / `deep-dive.md` / 意图与需求文件名；
4. 重新执行：后端 `mvnw verify`、前端 `npm run build && npm test`、`openspec validate --strict`、Redocly lint、受影响 E2E；
5. addendum 记录上述命令的 exit code 与摘要；addendum 完成前 Overall 仅对本报告 Header 所述提交有效。
