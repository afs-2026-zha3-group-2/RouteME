# Pipeline Report: add-user-profile（phase=ci）

- **Date:** 2026-11-16T12:10+0800
- **Root:** `D:\zha_training\RouteME\ai4se-baseline`
- **Phase:** ci
- **Data source:** local execution（本机按 `.github/workflows/ci.yml` 同命令执行；本机无 `gh` / API 凭据）
- **Change id:** `add-user-profile`
- **Target:** `main` @ `2423c01`（实现）→ `a95254c`（验证记录）→ 合并 tip `022659c`
- **Pipeline URL:** n/a（私有仓库且本机无 `gh`；以 release tag 作证据）
- **Commit:** `2423c01` / `a95254c`；合并 tip `022659c`

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci（local equivalent） | Pass | success | n/a | `.\mvnw.cmd -B -ntp verify` → 198 tests / BUILD SUCCESS；`npm run build && npm test` → 95 tests |
| ci（remote run） | Pass | success（tag 证据） | n/a | `022659c`（含 `a95254c` 的合并 tip）CI 通过；证据 `refs/tags/build-022659c` |
| cd（remote） | Pass | success | n/a | `cd.yml` 仅在 CI `conclusion == 'success'` 时发布 `build-${sha:0:7}` |
| **Overall** | Partial | `Pass-by-tag-evidence` | — | job 级明细不可得（私有仓库 + 本机无 `gh`）；E2E 不在 CI 范围 |

> 证据链：`a95254c` 于 12:07 推送后，另一会话将 `add-trip-publish` R2 合入并推送 `022659c`（`git merge-base --is-ancestor a95254c origin/main` 成立）。`cd.yml` 的 release job 带 `if: github.event.workflow_run.conclusion == 'success'`，`concurrency.cancel-in-progress: true` 会取消中间运行，因此只留下 tip 的 `build-022659c`；该 tag 同时证明 `022659c` 的 CI 结论为 success，且运行树包含本 change 的 `a95254c`。

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿（结论由 CD 发布 tag 推断） |
| Any failed job | 未发现 |
| Skipped / manual not run | ⚠️ Playwright E2E 不在 CI 工作流内（本地 35/35） |
| No remote data | ❓ job 明细不可得；已用 `build-022659c` 记 Partial |

**E1:** ⚠️ 不完整（缺 job 级明细 + E2E 未入 CI），整体结论 success。

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend (Java 21) — `./mvnw -B -ntp verify` | success（远端由 tag 推断；本地同命令复现 198/0） | 28.8 s（本地） | n/a | — |
| ci | Frontend (Node 22) — `npm install --no-audit --no-fund && npm run build && npm test` | success（远端由 tag 推断；本地复现 95/95） | build 1.1 s / tests 0.7 s | n/a | — |
| — | Playwright E2E — 本地 35/35（`profile.spec.ts` 10/10） | n/a（不在 CI 范围） | — | — | — |

## 本 change 的 CI 覆盖

| 关注点 | CI 覆盖 | 说明 |
|---|---|---|
| 契约 0.7.0、资料 schema / 路径 / 枚举、`Error.fields` | ✅ `OpenApiTest`（6 项） | 随 `verify` 执行 |
| V10 迁移（全新库 V1–V10、8 列可空、演示行不回填） | ✅ `ProfileMigrationSqliteTest`（1 项） | 随 `verify` 执行 |
| 资料读写 / 头像 / 权限矩阵 | ✅ `UserProfileControllerTest`（14 项） | 403 / 401 / 404 / 400 全覆盖 |
| 派生规则（年龄 / 星座 / 完善状态 / 摘要回退 / 魔数） | ✅ `UserProfileRulesTest`（24 项） | 随 `verify` 执行 |
| 注册瘦身（三字段、旧字段忽略仍 201、`profile_complete=false`） | ✅ `AuthControllerTest`（15 项） | A1–A6 |
| 前端类型 / 页面 / 表单 / 展示 | ✅ `npm run build` + `npm test`（11 文件 / 95 项） | 构建有既有 >500 kB chunk 警告 |
| 10 条资料验收 E2E | ⚠️ 仅本地 | `e2e/tests/profile.spec.ts` 10/10，不入 CI |
| 既有 25 条 E2E 回归 | ⚠️ 仅本地 | 全量 35/35 |

## 失败详情

无（本地等价命令未出现失败；历史联调失败已修复并记录在 local verify 报告 §1）。

## 安全与合规

| Check | Status | Notes |
|---|---|---|
| Secret scan | n/a | `ci.yml` 未配置 |
| SAST | n/a | 未配置 |
| Dependency audit | n/a | `npm install --no-audit` |
| 头像上传边界 | covered | 类型魔数、2 MB 上限、路径拼接仅走服务端生成文件名 |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | CI job 级明细与 run URL 不可得 | 无 `gh` / 凭据；私有仓库 | accepted（tag 证据已补：`build-022659c`） |
| 2 | 10 条资料 E2E 不进 CI，回归依赖本地 | `ci.yml` 仅含 backend / frontend | open（AO 跟踪） |
| 3 | 前端 bundle 923 kB（>500 kB 警告） | 既有体积问题，本 change 增加页面代码 | accepted（独立优化） |

## Artifacts

- release `build-022659c`（`RouteME build-022659c`；产物 `routeme-standalone-022659c.jar` + `routeme-frontend-dist.zip`），指向 `022659c`。
- 本地完整输出：`target/surefire-reports/`（backend）、`frontend` vitest 输出、`e2e` Playwright 输出（均未入库）。
- 本地验证报告：[`docs/ai4se-plugins/20261116-120800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-120800-local-verify-report.md)。

## Human confirmation

| Field | Value |
|-------|-------|
| Confirmer (named role/person) | opencode（agent，`git ls-remote` / `git merge-base` 核验）；人工复核并入 G2（VL） |
| Phase covered | ci |
| Explicit statement | `build-022659c` 存在且 `a95254c` 为其祖先；按 `cd.yml` 的 CI-success gating，判定 `022659c` 的 CI 结论为 success，运行树包含本 change |
| Timestamp | 2026-11-16T12:25+0800 |

**Overall when job-level detail is missing:** Partial（`Pass-by-tag-evidence`）。Agent 未自签 G2。

## Next

- 作为 `add-user-profile` G2 的 `phase=ci` 输入（[`g2-decision.md`](g2-decision.md)）；G2 仍由 VL 签署。
- E2E 纳入 CI 另立 change 跟踪。