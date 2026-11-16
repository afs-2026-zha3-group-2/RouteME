# Pipeline Report: add-user-logout（phase=ci）

- **Date:** 2026-11-16T11:45+0800
- **Root:** `D:\zha_training\RouteME\ai4se-baseline`
- **Phase:** ci
- **Data source:** mixed（git 远端 tag + 人工确认；本机无 `gh` / API 凭据）
- **Change id:** `add-user-logout`
- **Target:** `main` @ `d5d70fa`（当前 tip，包含退出实现 `79a7f42` / `e469a31`）
- **Pipeline URL:** n/a（私有仓库，本机无法通过 API 取 run 链接）
- **Commit:** `d5d70fa`

## Summary

| Phase | Status | Conclusion | Upstream URL | Notes |
|-------|--------|------------|--------------|-------|
| ci | Pass | success（推断） | n/a | 证据：`refs/tags/build-d5d70fa`；`cd.yml` 仅在 CI `conclusion == 'success'` 时发布 |
| **Overall** | Partial | `Pass-by-human-confirm` | — | job 级明细不可得；见 `## Human confirmation` |

> 证据链：`ci.yml` 在 `push: main` 触发；`cd.yml` 的 release job 带 `if: workflow_run.conclusion == 'success'`，并以 `build-${head_sha:0:7}` 命名 release。`git ls-remote` 显示 `build-711da3d`（退出实现首次推送）与 `build-d5d70fa`（当前 tip）均存在，因此这两次 push 的 CI 结论均为 success。`d5d70fa` 为 `711da3d` 的后代，退出代码未被回退。

## E1 判定 (Machine Evidence)

| Condition | E1 status |
|-----------|-----------|
| All in-scope jobs success | ✅ E1 全绿（结论由 CD 发布 tag 推断） |
| Any failed job | 未发现 |
| Skipped / manual not run | ⚠️ Playwright E2E 不在 CI 工作流内 |
| No remote data | ❓ job 明细不可得；已按人工确认记 Partial |

**E1:** ⚠️ 不完整（缺 job 级明细 + E2E 未入 CI），整体结论 success，已人工确认。

## Jobs / checks

| Phase | Job/Stage | Status | Duration | URL | Failure reason |
|-------|-----------|--------|----------|-----|----------------|
| ci | Backend (Java 21) — `./mvnw -B -ntp verify` | success（由 CD tag 推断） | n/a | n/a | — |
| ci | Frontend (Node 22) — `npm run build && npm test` | success（由 CD tag 推断） | n/a | n/a | — |
| — | Playwright E2E — 本地 25/25（含 `auth.spec.ts` 7/7） | n/a（不在 CI 范围） | — | — | — |

## 退出功能的 CI 覆盖（本 change 关注点）

| 关注点 | CI 覆盖 | 说明 |
|---|---|---|
| 前端编译 / 类型（菜单 `dialog` + `listbox`、`logout()`、样式） | ✅ `npm run build` | job 结论 success（推断） |
| 前端单测回归 | ✅ `npm test` | 75 项（合并 `add-trip-publish` 后） |
| 后端退出端点回归（`POST /api/auth/logout`、token 校验） | ✅ `./mvnw -B -ntp verify` | 156 项（含 `AuthControllerTest`） |
| 7 条退出验收（演示 / 注册 / 失败非阻断 / 刷新） | ⚠️ 仅本地 | `e2e/tests/auth.spec.ts` 7/7，不入 CI |
| 契约 / 迁移 | ✅ 无改动 | 未改 `openapi.yaml`、`backend/**`、`db/migration/**` |

## 失败详情

无（未观测到失败 job）。

## 安全与合规

| Check | Status | Notes |
|---|---|---|
| Secret scan | n/a | `ci.yml` 未配置 |
| SAST | n/a | 未配置 |
| Dependency audit | n/a | `npm install --no-audit` |

## Residual risks (for local-verify / G2)

| # | Risk | Source | Status |
|---|------|--------|--------|
| 1 | CI job 级状态与 run URL 未经 API 验证 | 无 `gh` / 凭据；私有仓库 | accepted（人工确认） |
| 2 | 7 条退出 E2E 不进 CI，回归依赖本地 | `ci.yml` 仅含 backend / frontend | open（AO 跟踪） |
| 3 | 退出改动经直推 `main`（无 PR） | 用户指示 push | open（流程偏差已记录） |

## Artifacts

- release `build-711da3d`、`build-d5d70fa`（`RouteME <sha>`；产物 `routeme-standalone-<sha>.jar` + `routeme-frontend-dist.zip`）。

## Human confirmation

| Field | Value |
|-------|-------|
| Confirmer (named role/person) | Jay（AO / current developer） |
| Phase covered | ci |
| Explicit statement | 我确认 `d5d70fa`（含退出实现）的 CI 成功，接受以 `build-d5d70fa` release tag 与 CD gating 作为证据，按 `Pass-by-human-confirm` 记 Partial |
| Timestamp | 2026-11-16T11:45+0800 |

**Overall when human-confirm only:** Partial（`Pass-by-human-confirm`）。Agent 未自签，由 AO 确认后 agent 代录。

## Next

- 作为 `add-user-logout` G2 的 `phase=ci` 输入（[`g2-decision.md`](g2-decision.md)）。
- E2E 纳入 CI 另立 change 跟踪。