# Pipeline Report: add-user-profile（phase=ci）

- **Date:** 2026-11-16T12:10+0800
- **Root:** `D:\zha_training\RouteME\ai4se-baseline`
- **Phase:** ci
- **Data source:** local execution（本机按 `.github/workflows/ci.yml` 同命令执行；本机无 `gh` / API 凭据）
- **Change id:** `add-user-profile`
- **Target:** `main` @ `2423c01`（实现提交；本报告的 docs 提交紧随其后）
- **Pipeline URL:** n/a（尚未推送；私有仓库且本机无 `gh`）
- **Commit:** `2423c01`

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci（local equivalent） | Pass | success | n/a | `.\mvnw.cmd -B -ntp verify` → 198 tests / BUILD SUCCESS；`npm run build && npm test` → 95 tests |
| ci（remote run） | Pending | — | n/a | 推送后由 GitHub Actions 运行；以 `build-<sha>` tag 复核 |
| **Overall** | Partial | `Pass-by-local-equivalent` | — | 远端运行待补；E2E 不在 CI 范围 |

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ 本地等价命令全绿（backend / frontend） |
| Any failed job | 未发现 |
| Skipped / manual not run | ⚠️ Playwright E2E 不在 CI 工作流内（本地 35/35） |
| No remote data | ❓ 尚未推送，无 run URL / job 明细 |

**E1:** ⚠️ 不完整（缺远端 job 级证据），本地等价结论 success。

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend (Java 21) — `./mvnw -B -ntp verify` | success（本地等价） | 28.8 s | n/a | — |
| ci | Frontend (Node 22) — `npm install --no-audit --no-fund && npm run build && npm test` | success（本地等价） | build 1.1 s / tests 0.7 s | n/a | — |
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
| 1 | 远端 CI run / job 明细尚未观测 | 尚未推送；无 `gh` / 凭据 | open（推送后以 `build-<sha>` tag 复核） |
| 2 | 10 条资料 E2E 不进 CI，回归依赖本地 | `ci.yml` 仅含 backend / frontend | open（AO 跟踪） |
| 3 | 前端 bundle 923 kB（>500 kB 警告） | 既有体积问题，本 change 增加页面代码 | accepted（独立优化） |

## Artifacts

- 本地完整输出：`target/surefire-reports/`（backend）、`frontend` vitest 输出、`e2e` Playwright 输出（均未入库）。
- 本地验证报告：[`docs/ai4se-plugins/20261116-120800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-120800-local-verify-report.md)。

## Human confirmation

| Field | Value |
|-------|-------|
| Confirmer (named role/person) | 待补（推送后由 AO 确认远端运行） |
| Phase covered | ci |
| Explicit statement | — |
| Timestamp | — |

**Overall when remote run is missing:** Partial（`Pass-by-local-equivalent`）。Agent 未自签。

## Next

- 推送后复核 GitHub Actions 结论与 `build-<sha>` release tag，更新本文件与 [`g2-decision.md`](g2-decision.md)。
- 作为 `add-user-profile` G2 的 `phase=ci` 输入；G2 仍由 VL 签署。