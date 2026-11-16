# Local Verify Report: add-user-profiles

**Date:** 2026-11-16（首次 11:07；合并 `origin/main` 后复验 12:58，timezone: Asia/Shanghai, +0800）
**Root:** c:\Git\ITA\RouteME\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-user-profiles (REQ-009 / capability `user-profiles`)

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** 无阻断性 Fail，无 waiver 需求。首次报告的 Partial 来自「main 既有陈旧 E2E 用例」与「命令白名单为空」；前者已随 main 的 E2E 更新消失，后者仍记录为 WARNING（改用规则声明命令，未使用 `run-verify.sh`）。G2 由 VL 依据下列残余风险判断，本报告不自签。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `npx @redocly/cli lint openapi.yaml` | `docs/knowledge/rules/quality/rules.md`（`@rule:api-contract`） | 0 | 契约有效；9 个 warning（既有 7 个 + `joined_at`/`stats` 可空字段示例），0 error |
| `.\mvnw.cmd -B clean verify`（backend） | `@rule:java-testing` / `quality/rules.md` | 0 | 200 tests，0 failures，BUILD SUCCESS（含打包） |
| `npm run build`（frontend） | `quality/rules.md` | 0 | tsc --noEmit + vite build 通过 |
| `npm test`（frontend） | `quality/rules.md` | 0 | 13 files / 110 tests 全通过（含 `profileFormat.test.ts` 9 条） |
| `npx playwright test`（全量，干净库） | tasks T11 / atdd-design | 0 | 43 passed / 0 failed（`profiles.spec.ts` 8、`profile.spec.ts` 10） |

> 说明：E2E 使用全新库 `SPRING_DATASOURCE_URL=jdbc:sqlite:target/e2e-clean.db`，避免多轮运行污染统计断言；`docs/feedback/verification-commands.md` 仍是占位模板（probe `whitelist_empty:yes`），按 C2 采用规则已声明的命令。
> 首次执行的 `verify` 因 `target/test-classes` 残留旧包 `routeme.model.TripMatchTest` 报 `ClassNotFoundException`；`clean verify` 后消失，属构建缓存问题，非代码缺陷。

## Convergence note（与 main 的 S18 收敛）

`origin/main` 的 `add-user-profile`（REQ-008）已落地同名 `UserProfileController`、资料列迁移 `V10__add_user_profile.sql` 与前端公开主页。按用户裁决「复用 main 接口」收敛：

- **契约/后端**：复用 `GET /api/users/{userId}/profile`（`X-User-Id`），`UserProfile` 增加可空 `joined_at`、`stats`，新增 `ProfileStats`；只新增 `UserProfileStatsService(Impl)`，controller/response 为最小扩展；契约 0.8.0。
- **迁移**：种子改 `V11__seed_viewer_profile_user.sql`（V10 已归 main），避免 Flyway 重复版本。
- **前端**：`ProfileModal` 调 `loadUserProfile(userId, callerId)`，样式改为 `profile-modal-*` 作用域避免与 main 的 `ProfilePage` 类名冲突；发布者入口按 REQ-009 改为弹窗，公开主页路由保留。
- **E2E**：`profile.spec.ts` 的发布者入口用例改为断言弹窗并保留主页直访验证；`profiles.spec.ts` 选择器改为 `aria-label`。

## Code-review highlights

- 后端复用 main 的资料读写路径，只在 GET 注入统计：`UserProfileStatsServiceImpl` 为只读聚合，不拥有表、不新增 SQL；`UserProfileResponse` 保留二参工厂，保存/上传行为不变。
- 统计口径与 G1 一致：发布/已完成按 `TripPlan.publisherId` 过滤（已完成要求 `completedAt() != null`），参与同行只算 `isAccepted()`，游后分享取 `ExperienceService.mine().size()`。
- 响应仍为白名单字段，`username` / `password_hash` / token 不进入 profile 契约（`OpenApiTest` 断言）。
- 前端 `ProfileProvider` 只挂一个 `ProfileModal`，两个入口共用；每次打开重置状态，失败时清空旧资料。
- `TripCard` 为 `<article>` + `tc-overlay` 覆盖链接 + 发布者 `<button>`，避免嵌套交互元素；`tc-host` z-index 2 保证点击发布者不触发卡片跳转。详情页发布者改为 `button.publisher-button`，内部 `div/p` 改为 `span` 以符合 button 内容模型。
- 样式全部使用既有令牌（`--surface-2`、`--line`、`--jade`、`--font-num` 等），新增 `.tag.hit`、`.badge.no-dot`、`.privacy-note`、`.profile-modal-*`、`.profile-stats`；680px 以下统计改 2 列。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md` T1–T12 完成；T13 属 P5（知识库/归档），按计划未做 |
| V2 | Requirement coverage | Pass | [fact] | R1→双入口（TripCard/TripDetailPage）；R2→ProfileModal 字段/文案；R3→UserProfileStatsServiceImpl 四项统计；R4→404/失败态；R5→响应白名单 + 无举报按钮 |
| V3 | Scenario coverage | Pass | [fact] | 20 个 Scenario 由 `UserProfileControllerTest`（15）、`ProfileDataMigrationSqliteTest`（1）、`profileFormat.test.ts`（9）与 `profiles.spec.ts`（8）覆盖；关闭弹窗与既有举报回归均有 E2E |
| V4 | Requirement↔impl mapping | Pass | [fact] | 端点契约 0.8.0 与实现字段一致；统计与种子数据核对（用户 2：3/1/2/1；用户 4：1/0/0/0，均为 API 实测） |
| V5 | Spec drift | Pass | [fact] | 隐私文案按 G1 裁决；举报按钮按用户指示排除，未影响既有举报；发布者入口语义变化已在 design D7 与 `profile.spec.ts` 同步 |
| V6 | Design follow-through | Pass | [fact] | D1 复用 main 端点；D2 只加统计聚合；D3 现算统计；D4 契约 0.8.0；D5 V11 种子；D6 Provider+Modal+纯函数（`profile-modal-*` 作用域）；D7 卡片重构；D8 自我/空交集不展示；D9 失败不保留旧资料；D10 测试落位 |
| V7 | Code pattern fit | Pass | [fact] | 新类位置与命名沿用现有多数分层；record 响应、`BusinessException` 子类、`@SpringBootTest + MockMvc + @Transactional` 测试风格一致 |
| V8 | Necessity (anti-creep) | Pass | [fact] | 改动文件均可追溯到 tasks T1–T12；未实现举报、资料编辑、聊天页入口、NFR 专项；`profile.spec.ts` 的改写是收敛 S18 冲突的必要动作 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（本地 CI 等价命令；PR #21 的远端 checks 仍为空，尚无 ci-report） |
| E2 AI | Pass | 本报告 Evidence checklist + Local commands |
| E3 Human | Pending | G2 由 VL 签署；本次未自签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ 残余风险已记录，G2 判断 |

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 命令白名单文件仍是占位模板，probe `whitelist_empty:yes`，只能采用规则声明的命令 | [fact] | `docs/feedback/verification-commands.md` | 由 harness owner 补齐真实命令后，后续 P4 可改用 `run-verify.sh` |
| 2 | PR #21 远端的 status checks 为空（mergeable 因持续合并 main 反复变化），本地无法取得 CI 结论 | [fact] | GitHub PR #21 | 待 PR 可合并后由 `/sdd:pipeline-report phase=ci` 采集，或人工确认 |
| 3 | E2E 依赖本机 `e2e/node_modules` 与 Playwright Chromium；统计断言要求干净库 | [fact] | `e2e/` | 在 README/流水线固定 `npm ci && npx playwright install chromium`，并显式指定干净 DB URL |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 公开资料隐私边界由响应白名单保证；数据模型尚无电话/证件等字段 | [inference] | `UserProfileResponse` | 未来新增用户字段时先做隐私审查再决定是否进入该响应；可用契约测试断言禁用字段 |
| 2 | 统计为 O(n) 全量过滤，演示规模可接受 | [fact] | `UserProfileStatsServiceImpl` | 数据量增长后改 mapper count 查询，契约不变 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | main 的 S18 发布者入口由「跳公开主页」改为「开弹窗」 | REQ-009 要求卡片/详情双入口弹窗 | accepted；公开主页路由保留，`profile.spec.ts` 已同步；SA 在 G2/归档前确认该行为变更 |
| 2 | 资料端点沿用 main 的 `X-User-Id` 约定 | 与 main 实现保持一致，避免双端点 | accepted；共同兴趣仍在前端计算 |
| 3 | V11 改变演示计数（用户 4、行程 7） | 种子数据是展示非学生形态与统计的必要前提 | mitigated，迁移/接口/E2E 计数已同批更新 |
| 4 | 统计在请求时全量计算 | 当前数据量小，避免过早优化 | accepted，见 SUGGESTION-2 |
| 5 | 原型隐私文案与本实现文案不同（原型未含身份/加入时间） | G1 决定按实际展示字段调整 | accepted，P5 记录原型差异 |
| 6 | 举报按钮按本次范围排除 | 用户明确要求未来迭代再议 | accepted，已有聊天/行程举报未受影响（E2E 覆盖） |
| 7 | 迁移版本号与 main 的 V10 相邻 | 本 change 只能追加 V11 | mitigated，后续 change 从 V12 起 |
| 8 | main 的 `add-user-profile/g2-decision.md` 把 `origin/feature/add-user-profiles` 旧实现列为残余风险（V10 同名冲突） | 该风险由本次合并消除 | mitigated，本分支已改为 V11 并复用 main 资料端点 |

## Waiver

N/A — no waiver（Overall=Pass）。
