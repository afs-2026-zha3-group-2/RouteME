# Local Verify Report: add-growth-level

**Date:** 2026-11-18 (timezone: +0800)
**Root:** c:/Git/ITA/RouteME/.worktrees/add-growth-level/ai4se-baseline
**Scope:** local+evidence
**Change id:** add-growth-level

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | Pass |

**PR gate:** Pass — `/sdd:pr-submit` 或按用户指示的直接合并可继续；无 Waiver。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend && npm run typecheck` | docs/feedback/verification-commands.md | 0 | tsc --noEmit 无错误 |
| `cd RouteME/backend && cmd //c mvnw.cmd -q test` | docs/feedback/verification-commands.md | 0 | 全量后端测试通过（clean verify 记录 766 tests / 0 failures / 0 errors） |
| `cd RouteME/frontend && npm test` | docs/feedback/verification-commands.md | 0 | 63 文件 / 552 tests passed |
| `cd RouteME/e2e && npx playwright test tests/growth-level.spec.ts tests/route-completion.spec.ts tests/notifications.spec.ts tests/notifications-walkthrough.spec.ts` | docs/feedback/verification-commands.md | 1 → 0 | 首跑 27 passed / 1 failed（`route-completion.spec.ts:103` 的 `route.fetch()` 返回已释放，属测试夹具 flake）；原样重跑 **28 passed**，全绿 |

补充本地证据（不在白名单，供 G2 参考）：
- `cd RouteME/backend && .\mvnw.cmd -B clean verify` → **766 tests, 0 failures, 0 errors, BUILD SUCCESS**
- `npx --yes @redocly/cli lint openapi.yaml` → **0 error / 25 warning**（顺带修正 main 带入的 2 个 `nullable-type-sibling`）
- `npx --yes openspec validate add-growth-level --strict` → valid
- 合并后定向 E2E（growth-level + route-completion + profiles + profile）：31 passed / 2 failed，失败均为既有债务（`.mine-profile-card`，main 前端已无该节点）

## Code-review highlights

- 合并 `origin/main@ef23f6cf` 时 9 个冲突文件均采用「双方保留」：`UserProfileResponse` 6 参工厂、`UserProfileController` 同时装配成长与路线完成度、`AdminReportServiceImpl` 同时保留 GrowthService 与 NotificationService、`tripMessages` / `styles.css` 两段并存。`[fact]`
- 第四次顺延一次性收敛：REQ-033 / S34、契约 0.30.0、`V34__add_growth_level.sql`；growth 专属文件与共享台账均同步，main 的 REQ-031 / REQ-032 行保持不动。`[fact]`
- 修复真实缺陷：SQLite 唯一键只抛 `UncategorizedSQLException`，`GrowthServiceImpl` 改捕获 `DataAccessException` 并重读确认；新增 `GrowthServiceImplTest` 2/2（先红后绿），8 并发探针修复后 16/16 均 200。`[fact]`
- 顺带修正 main 的通知 schema（`Notification.actor` / 推送 `message` 缺 `type: object`），使契约 lint 回到 0 error；语义不变。`[fact]`
- 无越界实现：未做经验明细页 / 排行榜 / 通知 / 权益 / 管理端 / 存量回填；成长与信用表完全分离。`[inference]`（建议保留 `GrowthConstant` 与 `Credit*` 的无交叉 grep 作为复审点）

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md` 12/12 已勾选，无未完成项 |
| V2 | Requirement coverage | Pass | [fact] | Delta 9 Requirement，逐条在 `p4-apply.md` §7 映射到 API 用例 / E2E / 迁移断言 |
| V3 | Scenario coverage | Pass | [fact] | 41 Scenario → A1–A26（API）/ E1–E8（E2E）/ R1–R4（反向），见 `p4-apply.md` §7 |
| V4 | Requirement↔impl mapping | Pass | [fact] | `GrowthService.book`、三事件挂接点、可见性与批量端点均可定位到代码与用例 |
| V5 | Spec drift | Pass | [fact] | 偏差集中记录在 `p4-apply.md` §6（批量 404、SQL 种子、既有债务、环境与迁移陷阱） |
| V6 | Design follow-through | Pass | [fact] | 两表 + 单一 `book` + 条件更新 + 幂等键 + C1/C2 与 `design.md` D1–D14 一致 |
| V7 | Code pattern fit | Pass | [fact] | `GrowthServiceImplTest` 复用 `WalletServiceImplTest` 的注入与 mock 模式；命名/分层与既有 `Credit*` 一致 |
| V8 | Upstream basis | Pass | [fact] | 91 文件 diff（+5467/−36）均可追溯到 proposal/spec/tasks 或合并冲突解决；main schema lint 修正已在 §6.10 声明 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（本地机器证据；无远端 ci-report） |
| E2 AI | Pass | 本报告 + `docs/sdd/add-growth-level/p4-apply.md` |
| E3 Human | Pending | G2 由 VL=Neal 签署（按用户 2026-11-18 指示代记录） |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ 12/12 tasks、9 requirements、41 scenarios 均有证据 |
| Q2 Correct? | V4–V5 | ✅ 766 后端 / 552 前端 / 28 E2E（重跑）全绿；无未声明漂移 |
| Q3 Coherent? | V6–V7 | ✅ 设计与既有记账模式一致 |
| Q4 Only what was needed? | V8 | ✅ 无越界能力；两处跨域修正（main schema lint、通知冲突保留）已声明 |
| Q5 Risk controllable? | 风险带 + 残留风险 | ⚠️ 可控：1 个已知 E2E flake + 3 项既有债务 + main 通知写入告警（非本 change 路径） |

## Residual risks

1. `route-completion.spec.ts` 的 `stubCompletion` 在首跑出现 `route.fetch()` 响应已释放（1/28），原样重跑全绿；属测试夹具 flake，未在本 change 修复。
2. 既有 E2E 债务 3 项（`experiences.spec.ts:91`、`detail-companions` 顺序耦合、`profile.spec.ts` 的 `.mine-profile-card`）与本 change 无关。
3. 合并后的通知写入路径在日志中出现 3 次 `IllegalStateException: notification write failed`（并发通知失败被吞），不影响 growth 路径；建议通知 owner 跟进。
