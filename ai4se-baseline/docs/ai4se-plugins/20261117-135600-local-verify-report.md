# Local Verify Report: add-credit-account（r2 范围扩展复验）

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\Training\routeMe\RouteME\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-credit-account
**Supersedes scope of:** `20261117-131346-local-verify-report.md`（r1 只覆盖个人主页；本报告覆盖 G1 r2 的 5 个展示面）

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass**（`trips.spec.ts` 11 条地图失败为改动前既有债务，与 r1 同一批） |

**PR gate:** Overall=Pass；Waiver 不适用。

## 本次范围

- Delta 由 22 → **26** 场景：新增资料弹窗 / 详情发布者 / 行程卡 / 申请者行 4 个展示面 + 「未列出界面不展示」。
- 新增批量只读端点 `GET /api/users/credits?ids=...`（≤50，需 `X-User-Id`，缺账户按 80 补齐）。
- 前端新增 `profiles/useUserCredits.ts`，四个展示面共用一次取数。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `.\mvnw.cmd -B -ntp test`（`backend`） | `ci.yml` 的阶段等价 | 0 | **272 tests**，0 failures（新增 6：`CreditBatchApiTest`；`OpenApiTest` 增加批量端点断言） |
| `npm.cmd run typecheck`（`frontend`） | `package.json` + `@rule:web-coding-style` | 0 | 无输出 |
| `npm.cmd test`（`frontend`） | `ci.yml` | 0 | 36 文件 / **257 tests** 通过 |
| `playwright test tests/credit.spec.ts`（隔离环境 8091 + 5181） | `e2e/package.json` | 0 | **8/8 passed**（新增弹窗 / 详情 / 卡片 / 申请者行 4 条） |
| `playwright test tests/credit.spec.ts tests/trips.spec.ts tests/companions.spec.ts tests/profiles.spec.ts tests/mine.spec.ts` | 同上 | 1 | **48 passed / 11 failed**；11 条全部在 `trips.spec.ts` 且均为地图元素缺失（`china-map` / `city-map`），与 r1 基线复现一致的既有债务 |
| `openspec validate add-credit-account --strict` | `@rule:spec-first` | 0 | valid（26 Scenario） |

## Code-review highlights

- 批量端点只读、无明细；`ids` 校验覆盖空值 / 非数字 / 超 50 / 重复去重；缺账户走 `ensureAccount`，不会返回空值。
- 前端 `useUserCredits` 去重 + 页面内复用；请求失败静默降级（不展示信用行，不阻断页面）。
- 四个展示面复用 `creditDisplay` 与 `.profile-credit` 样式（`is-compact`），口径与个人主页完全一致。
- 边界：聊天页 / 顶栏 / 我的旅行资料卡仍无信用展示（E2E 用 `/#/mine` 反向断言）。

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `trips.spec.ts` 地图相关 11 条失败（既有） | [fact] | `e2e/tests/trips.spec.ts` | 归属地图 owner；本 change 未触碰地图 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 批量端点暂无缓存头 | [inference] | `GET /api/users/credits` | 数据轻且随页面刷新，暂不加缓存；后续如有性能诉求再加 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | 前端每个页面一次额外请求 | 列表页需要一批用户信用 | 已限制为一页一次；≤50 上限 |
| 2 | E2E 不在 CI（既有） | `ci.yml` 不含 E2E | P4 本地回归 + 报告留证 |
| 3 | 契约 `0.12.0` / `V18` 与在途 change 撞号 | 均未合并 | 本 change 先行，其余顺延 |

## Waiver

`N/A — no waiver`
