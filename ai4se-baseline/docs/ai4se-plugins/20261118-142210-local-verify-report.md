# Local Verify Report: add-route-completion

**Date:** 2026-11-18 (timezone: +0800)
**Root:** `c:\Git\ITA\RouteME\.worktrees\add-route-completion\ai4se-baseline`
**Scope:** local+evidence
**Change id:** add-route-completion（REQ-031 / S32，issue #45）

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** 本报告不阻断；`/sdd:pr-submit` 仍以人工确认 G2 为前提。Agent 不自批 Waiver。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend && npm run typecheck && npm run build` | docs/feedback/verification-commands.md（run-verify 白名单） | 0 | tsc 0 error；vite built in 3.17s（chunk >500kB 为既有告警） |
| `cd RouteME/backend && ./mvnw -B -ntp verify` | docs/feedback/verification-commands.md / CI `ci.yml` | 0 | 656 tests，0 failures，0 errors，BUILD SUCCESS |
| `cd RouteME/frontend && npm test` | docs/feedback/verification-commands.md / CI `ci.yml` | 0 | 61 test files / 508 tests passed |
| `cd RouteME/e2e && npx playwright test tests/route-completion.spec.ts` | tasks T7/T8（E2E 不在 CI） | 0 | 6 passed (19.1s) |
| `cd RouteME/e2e && npx playwright test tests/profile.spec.ts tests/profiles.spec.ts` | tasks T8 受影响回归 | 1 | 20 passed / 2 failed，均为 `origin/main` 既有失效选择器（见 WARNING-1） |
| `openspec validate add-route-completion --strict` | tasks T8 / OpenSpec | 0 | Change 'add-route-completion' is valid |
| `cd RouteME && npx --yes @redocly/cli lint openapi.yaml` | tasks T8 | 0 | valid，0 error，23 warnings（既有风格告警） |

红 → 绿证据（TDD / ATDD）：

- API：装配代码临时回退时 `UserProfileRouteCompletionApiTest` 9 条中 6 条失败（`No value at JSON path "$.route_completion_state"`），回补后 9/9 通过。
- 前端：`routeCompletionDisplay.test.ts` 在实现文件缺失时整文件失败（Cannot find module），实现后 7/7 通过。

## Code-review highlights

- 派生单点 `RouteCompletionPolicy.evaluate` 对样本 0 / null / 负数 / >100 一律 `insufficient`，失败安全，不会落入 `good`。
- 前端 `routeCompletionLine` 不含 80 / 70 常量，只做状态码 → 文案 / tone 映射；E2E A9 另有源码静态断言。
- 接口只读：三处装配统一 `evaluate(null, 0)`，`PUT /me/profile` 传两字段不生效；响应不含 `route_completion_rate` 键。
- 与信用分 / `stats` 完全独立：读取前后 `credit_ledger` 行数不变（API A16），响应无成长等级字段（API A17）。
- 零表零迁移：迁移头保持 `V31`，无 `route_completion*` 表 / 列（SQLite 反向测试）。
- 无新增查询：资料读取沿用既有装配，不读 `trip_plans` / 信用账户。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion（实现范围 T0–T8） | Pass | [fact] | tasks.md 10 项中 T0–T8 已勾选；T9 为 G2 / 收尾门禁任务，待人工签署后勾选 |
| V2 | Requirement coverage | Pass | [fact] | R1 → `UserProfileResponse` / `openapi.yaml`；R2 / R3 → `RouteCompletionPolicy` + `RouteCompletionPolicyTest`；R4 → `ProfilePage` / `routeCompletionDisplay` / E2E；R5 → API A16 / A17；R6 → API A18 + 迁移反向 |
| V3 | Scenario coverage | Pass | [fact] | 18 Scenario ↔ A1–A18 一一对应；API 9 条、E2E 6 条、UT 5 + 7 条全部通过 |
| V4 | Requirement↔impl mapping | Pass | [fact] | 两字段只在 `UserProfileResponse` 末尾；状态码四值与 Delta 一致；序列化口径（rate 省略 / state 恒出现）由 API + 契约断言双向锁定 |
| V5 | Spec drift | Pass | [inference] | 实现路径与 P3 工件一致；仅目录名差异（`enums/` 而非 `pojo/`）已回改 design / tasks / atdd 文本，属文档对齐，非语义漂移 |
| V6 | Design follow-through | Pass | [fact] | D1–D12 均落地：三处装配、0.27.0、四档 tone、预览先行、零迁移；D3 未来聚合接入点保留 |
| V7 | Code pattern fit | Pass | [fact] | 枚举位于 `routeme.enums`（与 `CreditLevel` 同惯例）；纯函数范式对齐 `creditDisplay.ts`；测试命名对齐既有 API / 迁移测试 |
| V8 | Upstream basis | Pass | [fact] | 变更文件全部可追溯到 spec / tasks T0–T8；`docs/feedback/verification-commands.md` 属验证基建补齐，已在 SUGGESTION-1 记录 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本地命令表 + `docs/ai4se-plugins/20261118-141949-local-verify-run.log`（远端 CI 未触发，按惯例本地替代） |
| E2 AI | Pass | 本报告 + 红→绿证据 |
| E3 Human | Pending | G2 VL 签署（Neal）在 `/sdd:g2-decision-record` 中完成，Agent 不自签 |

## Five-question map (when evidence in scope)

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | Yes |
| Q2 Correct? | V4–V5 | Yes |
| Q3 Coherent? | V6–V7 | Yes |
| Q4 Necessary only? | V8 | Yes（验证基建补齐已单独披露） |
| Q5 Risk controllable? | residual + red lines | Yes（见 Residual risks） |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 既有 E2E 失效：`profile.spec.ts` 两条用例依赖 `.mine-profile-card`，该选择器在 `origin/main` 源码中已不存在（`git grep mine-profile-card origin/main` 仅命中 spec 自身）；本次合并前即失败，与路线完成度无关 | [fact] | `ai4se-baseline/RouteME/e2e/tests/profile.spec.ts:328,501` | 归属既有测试债，另开 change 更新；本 change 不修改 |
| 2 | `openspec archive` 依赖 tasks.md 复选框格式；P3 初版用表格导致 `--strict` 告警 | [fact] | `openspec/changes/add-route-completion/tasks.md` | 已改为 `- [x] Tn` 复选框格式，`--strict` 通过 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `docs/feedback/verification-commands.md` 原为占位模板，导致 verify probe 解析不到白名单 | [fact] | `ai4se-baseline/docs/feedback/verification-commands.md` | 已按 `ci.yml` 与 T8 填写三层命令（路径相对 `ai4se-baseline/`） |
| 2 | 设计 / 任务工件曾写 `pojo/RouteCompletionState.java` 与 `UserProfileRouteCompletionMigrationSqliteTest` | [fact] | `design.md` D2 / `tasks.md` T2 / `atdd-design.md` §2 | 已按实际落点回改为 `enums/RouteCompletionState.java`、`RouteCompletionPolicyTest`、`RouteCompletionMigrationSqliteTest` |
| 3 | E2E 仍不在 CI（既有惯例） | [fact] | `.github/workflows/ci.yml` | 保持现状；本地按 T8 跑本 spec + 受影响回归 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | E2E 真态依赖全新 SQLite 种子；种子若变动，「数据不足」真态断言可能需同步 | 种子数据属其他 change 的维护面 | tracking：断言只依赖「无样本 → 暂无足够完成记录」，不含具体条目 |
| 2 | 本期样本恒 0，四档文案仅由 `page.route` 夹具覆盖 | 无人工打卡 / 聚合数据源（Non-goal） | accepted：后端派生与 UT 已覆盖阈值；未来聚合接入时扩 E2E 真态 |
| 3 | 未做性能 / NFR 测试 | 用户 2026-11-18 裁决不纳入 | accepted：资料读取零新增查询、零新增表 |

## Waiver

N/A — no waiver。
