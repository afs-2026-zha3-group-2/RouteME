# Local Verify Report: add-credit-account

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\Training\routeMe\RouteME\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-credit-account

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass**（20 条 E2E 失败为改动前既有的地图环境债务，已用基线复现证明与本 change 无关） |

**PR gate:** Overall=Pass，`/sdd:pr-submit` 可继续；Waiver 不适用。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `.\mvnw.cmd -B -ntp test`（`RouteME/backend`） | `.github/workflows/ci.yml`（`./mvnw -B -ntp verify` 的阶段等价） | 0 | 266 tests，0 failures / 0 errors / 0 skipped |
| `npm.cmd run typecheck`（`RouteME/frontend`） | `package.json` scripts + `@rule:web-coding-style` | 0 | `tsc --noEmit` 无输出 |
| `npm.cmd run build`（`RouteME/frontend`） | `.github/workflows/ci.yml`（`npm run build`） | 0 | 构建成功；仅既有 chunk > 500kB 提示 |
| `npm.cmd test`（`RouteME/frontend`） | `.github/workflows/ci.yml`（`npm test`） | 0 | 36 文件 / 257 tests 全通过（新增 `creditDisplay.test.ts` 7 项） |
| `.\node_modules\.bin\playwright.cmd test`（`RouteME/e2e`，隔离环境：后端 8090 + `e2e-credit.db`，Vite 5180） | `e2e/package.json` + 既有本地验证约定 | 1 | **102 tests：82 passed / 20 failed**；20 条全部集中在 `map.spec.ts`（E11–E18）与 `trips.spec.ts` 的地图相关用例，失败原因均为找不到 `[data-testid="china-map"]` / `city-map` |
| 基线复现：`git stash` 后单跑 `map.spec.ts -g "E11"` | 同上 | 1 | 未含本 change 的代码上同样失败（同一断言、同一元素缺失）→ 证明与本次改动无关 |
| `openspec validate add-credit-account --strict` | `@rule:spec-first` | 0 | `Change 'add-credit-account' is valid` |

## Code-review highlights

- **契约先于两端**：`openapi.yaml` 升 `0.12.0`，`credit_score` / `credit_level` 进 `UserProfile.required`；`OpenApiTest` 断言 required、enum 集合与 readOnly（8 项通过）。
- **迁移双引擎**：`V18__add_credit_account.sql` 只用 SQLite / H2 都支持的语法（普通唯一索引 + `NOT EXISTS` 回填 + 固定 ISO 时间），`CreditMigrationSqliteTest` 覆盖全新库与「V17 再升级」两条路径。
- **账本不变量**：`CreditServiceImpl.book` 先裁断到 0–100，再以 `applied = after - before` 写账本与账户；零变化仍留 `applied_delta = 0` 记录；幂等键唯一索引兜底并发；6 项单测覆盖。
- **注册同事务**：`AuthServiceImpl.register` 在既有 `@Transactional` 内 `ensureAccount`，重名 / 非法输入不落账户（API 测试 3 项）。
- **只读边界**：不存在写分端点（`PUT/POST /api/users/me/credit` → 404），资料保存携带 `credit_score` 被忽略（API 测试 2 项）。
- **前端只做映射**：新增 `creditDisplay.ts`（阈值不重复实现、未知 code 回退 good、分数夹取），`ProfilePage` 仅渲染一行；`is-*` 五档低饱和色阶与文字同现。
- **展示落点**：hero 卡内 `.profile-hero-meta` 下一行；三档视口 × 浅/深色无横向溢出，字号与既有 meta 行一致。
- **未触碰**：`app_users` 结构、管理端（不存在）、行程 / 申请 / 聊天 / 体验 / 举报逻辑、原型其他区域。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | 22 个 Scenario 有对应实现 / 测试 | Pass | [fact] | API 8 / E2E 9（含 2 条双层）/ UT 7；见 `tasks.md` 对齐自检 |
| V2 | AC 可观察 | Pass | [fact] | 展示串、十档边界、裁断数值、账本等式均有断言 |
| V3 | 反向（Non-goals）覆盖 | Pass | [fact] | 无写分端点、无明细入口、无 admin、`app_users` 列不变 |
| V4 | 契约与实现一致 | Pass | [fact] | `OpenApiTest` + `CreditProfileApiTest` 同字段名 / 同 enum |
| V5 | 数据不变量 | Pass | [fact] | DB CHECK + `CreditServiceImplTest` 双保险 |
| V6 | 文档与工件同步 | Pass | [fact] | `interfaces/README.md`、`registry.md`、`docs/sdd/README.md`、`p4-verify.md` |
| V7 | 视觉 / 响应式 | Pass | [fact] | `docs/sdd/add-credit-account/preview/credit-*.png` 5 张，scrollWidth ≤ innerWidth |
| V8 | 必要性（无越界实现） | Pass | [fact] | 无计分事件、无管理端、无第二套视觉体系 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（后端 / 前端 / E2E / validate） |
| E2 AI | Pass | 本报告证据层 |
| E3 Human | Pending | 待 VL（Neal）在 G2 签署 |

## Five-question map (when evidence in scope)

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | 残余风险 | ⚠️（E2E 地图债务与 CI 不含 E2E，见下） |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | E2E 全量 20 条地图用例失败，已用基线复现证明与本次改动无关 | [fact] | `e2e/tests/map.spec.ts`、`e2e/tests/trips.spec.ts` | 由地图 owner 单独立项排查（环境 / 数据依赖），本 change 不处理 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `CreditBoundaryApiTest` 用循环逐档断言，失败时定位到档位需读日志 | [inference] | `CreditBoundaryApiTest` | 后续可改参数化测试 |
| 2 | 读路径 `ensureAccount` 属「读中含写」，正常路径由迁移兜底 | [fact] | `CreditServiceImpl.ensureAccount` | 已在 `design.md` 记为残余风险，后续统计 / 监控如需可加指标 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | E2E 不在 CI（既有） | `ci.yml` 仅含后端 verify 与前端 build+test | 沿用既有约定；P4 本地全量回归 |
| 2 | 地图相关 E2E 失败（既有债务） | 隔离环境下地图组件未渲染，改动前同样失败 | 归属地图 owner；本 change 未触碰地图 |
| 3 | 契约 `0.12.0` / `V18` 与在途 REQ-017 / REQ-018 撞号 | 三者均未合并 | 本 change 先行；其余合并时顺延 |
| 4 | 零值账本记录可能被后续统计误用 | 本切片无统计 | 统计需按 `applied_delta <> 0` 过滤 |

## Waiver

`N/A — no waiver`
