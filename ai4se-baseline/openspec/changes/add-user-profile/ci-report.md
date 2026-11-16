# Pipeline Report: add-user-profile（phase=ci）

- **Date:** 2026-11-16T12:10+0800
- **Root:** `D:\zha_training\RouteME\ai4se-baseline`
- **Phase:** ci
- **Data source:** local execution（本机按 `.github/workflows/ci.yml` 同命令执行；本机无 `gh` / API 凭据）
- **Change id:** `add-user-profile`
- **Target:** `main` @ `2423c01`（实现）→ `a95254c`（验证记录）→ 合并 tip `022659c` → `e54f273`（远端证据提交）→ `3c8355b`（其他职业自填修复）→ `8de3351`（生日 DatePicker）→ `db8211b`（合并 main 后的测试计数）→ `9fd5764`（dayjs 解析源修复，当前绿色 tip）
- **Pipeline URL:** n/a（私有仓库且本机无 `gh`；以 release tag 作证据）
- **Commit:** `2423c01` / `a95254c` / `e54f273` / `3c8355b` / `8de3351` / `db8211b` / `9fd5764`；中间合并 tip `022659c`

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci（local equivalent） | Pass | success | n/a | `.\mvnw.cmd -B -ntp verify` → 211 tests / BUILD SUCCESS；`npm run build && npm test` → 133 tests（合并 main 后全量） |
| ci（remote run） | Pass | success（tag 证据） | n/a | `e54f273` / `3c8355b` CI 通过；证据 `refs/tags/build-e54f273`、`build-3c8355b`（中间 tip `022659c` → `build-022659c`）。最终绿色 tip `9fd5764`（包含 `8de3351` / `db8211b`）由 `build-9fd5764` tag 佐证 |
| cd（remote） | Pass | success | n/a | `cd.yml` 仅在 CI `conclusion == 'success'` 时发布 `build-${sha:0:7}` |
| **Overall** | Partial | `Pass-by-tag-evidence` | — | job 级明细不可得（私有仓库 + 本机无 `gh`）；E2E 不在 CI 范围 |

> 证据链：`a95254c` 于 12:07 推送后，另一会话将 `add-trip-publish` R2 合入并推送 `022659c`（`git merge-base --is-ancestor a95254c origin/main` 成立），随后本 change 的远端证据提交 `e54f273` 推送。`cd.yml` 的 release job 带 `if: github.event.workflow_run.conclusion == 'success'`，`concurrency.cancel-in-progress: true` 会取消中间运行，因此中间 tip 只留下 `build-022659c`；最终 `build-e54f273` 证明 `e54f273`（包含 `a95254c` 与全部 P4 代码）的 CI 结论为 success。`3c8355b`（其他职业自填）推送后 90 秒内出现 `build-3c8355b`，同一规则下推断该提交 CI 结论为 success。

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿（结论由 CD 发布 tag 推断） |
| Any failed job | 未发现 |
| Skipped / manual not run | ⚠️ Playwright E2E 不在 CI 工作流内（本地按 spec 全绿，资料 13/13） |
| No remote data | ❓ job 明细不可得；已用 `build-022659c` 记 Partial |

**E1:** ⚠️ 不完整（缺 job 级明细 + E2E 未入 CI），整体结论 success。

**Post-CI fix:** 「其他职业自填」随 `3c8355b` 推送；`refs/tags/build-3c8355b` 已出现（`cd.yml` 仅在 CI success 后发布），远端结论 success。生日 DatePicker（13/13 E2E、前端 133）在本提交后落地。`8de3351` 首次远端运行在 Frontend job 失败：`npm install` 生成的 lockfile 记录了公司 Artifactory 的 tarball URL（GitHub runner 不可解析，`ENOTFOUND`）；`9f11bde` 仅把该条 `resolved` 改回 `registry.npmjs.org`（integrity 不变），随后 `build-9fd5764` tag 出现，证明含 `8de3351` / `db8211b` 的 main 已通过 CI。本地另有后端 211、前端 15 文件 / 133。

**Post-CI update（侧栏 delta）:** 侧栏分组 + 资料入口随 `294f487` 推送，G2 输入表随 `a2d17fb` 更新；`refs/tags/build-a2d17fb` 已出现（`cd.yml` 仅在 CI success 后发布），证明含 `294f487` 的 tip 通过 CI。本地同 tip 复核：`npm run typecheck` 通过、`npm test` 16 文件 / 137 项、`npm run build` 通过。

**Post-CI update（账号菜单 delta）:** 底部账号入口改为右侧浮层菜单，并删除「价值闭环」卡片与「演示环境 · 数据保存在本机」说明，随 `5c16ea2` 推送（无后端 / 契约变更）。本地复核：`npm run typecheck` 通过、`npm test` 16 文件 / 137 项、`npm run build` 通过；远端 CI 证据待 `build-5c16ea2` tag。

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend (Java 21) — `./mvnw -B -ntp verify` | success（远端由 tag 推断；本地同命令复现 211/0） | 28.8 s（本地） | n/a | — |
| ci | Frontend (Node 22) — `npm install --no-audit --no-fund && npm run build && npm test` | success（远端由 tag 推断；本地复现 133/133） | build 0.9 s / tests 0.7 s | n/a | 远端首次运行 `8de3351` 因 lockfile 指向内部 Artifactory 而失败（ENOTFOUND），`9f11bde` 修正后通过 |
| — | Playwright E2E — 本地全绿（`profile.spec.ts` 13/13） | n/a（不在 CI 范围） | — | — | — |

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
| 1 | CI job 级明细与 run URL 不可得 | 无 `gh` / 凭据；私有仓库 | accepted（tag 证据：`build-e54f273` / `build-022659c` / `build-9fd5764`） |
| 2 | 10 条资料 E2E 不进 CI，回归依赖本地 | `ci.yml` 仅含 backend / frontend | open（AO 跟踪） |
| 3 | 前端 bundle 923 kB（>500 kB 警告） | 既有体积问题，本 change 增加页面代码 | accepted（独立优化） |

## Artifacts

- release `build-9fd5764`（当前绿色 tip，含 `8de3351` / `db8211b`）；历史 `build-e54f273`（指向 `e54f273`）、`build-3c8355b`、中间 `build-022659c`。
- 本地完整输出：`target/surefire-reports/`（backend）、`frontend` vitest 输出、`e2e` Playwright 输出（均未入库）。
- 本地验证报告：[`docs/ai4se-plugins/20261116-120800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-120800-local-verify-report.md)。

## Human confirmation

| Field | Value |
|-------|-------|
| Confirmer (named role/person) | opencode（agent，`git ls-remote` / `git merge-base` 核验）；人工复核并入 G2（VL） |
| Phase covered | ci |
| Explicit statement | `build-e54f273` 存在且 `a95254c` 为其祖先；按 `cd.yml` 的 CI-success gating，判定 `e54f273` 的 CI 结论为 success，运行树包含本 change；中间 `build-022659c` 佐证合并 tip |
| Timestamp | 2026-11-16T12:35+0800 |

**Overall when job-level detail is missing:** Partial（`Pass-by-tag-evidence`）。Agent 未自签 G2。

## Next

- 作为 `add-user-profile` G2 的 `phase=ci` 输入（[`g2-decision.md`](g2-decision.md)）；G2 仍由 VL 签署。
- E2E 纳入 CI 另立 change 跟踪。