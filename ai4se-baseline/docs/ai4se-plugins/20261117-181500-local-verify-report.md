# Local Verify Report: add-credit-exit-restriction（P4）

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\Training\routeMe\RouteME\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-credit-exit-restriction（REQ-022 / S22 + S23）

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass**（全量 E2E 24 条失败为既有地图渲染与共享库累积债务，已用干净库 A/B 证明） |

**PR gate:** Overall=Pass with documented debt；G2 待 VL=Neal 签署。

## 本次范围

- 契约 0.15.0：退出预览 / 退出（`{reason}` → `LeaveResult`）、`credit_restricted`、本人限制原因、系统取消原因 `credit_restricted`、`CREDIT_RESTRICTED`。
- 迁移 `V21__credit_enforcement.sql`：`credit_exit_event` / `credit_restriction`（`active_flag` 唯一）/ `trip_applications.status_reason`。
- 后端：六档扣分（左闭右开、集合时间优先）、月度序号与翻倍、待核实、0 分裁断；`CreditChangedEvent` 同事务触发/解除限制；只读守卫；系统清退（撤回 PENDING / 解除 ACCEPTED / 取消未结束已发布行程），不扣分不计数。
- 前端：三入口退出弹窗（原因 + 服务端预览 + 二次确认）、五展示面「限制中」徽标、本人原因与自动解除、六处拦截提示 + 发布导航禁用、系统取消原因与只读聊天。
- E2E：新增 7 条（退出 4 / 限制 2 / 系统取消 1），并更新两处旧退出流程。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `.\mvnw.cmd -B -ntp verify`（`backend`） | `ci.yml` 的阶段等价 | 0 | **337 tests / 54 classes**，0 failures / 0 errors（新增计算器 / 迁移 / 退出 / 限制等用例，既有 Chat / 取消 / 契约用例随新契约更新） |
| `npm.cmd run build`（`frontend`） | `ci.yml` | 0 | `tsc --noEmit` + `vite build` 通过（仅既有 chunk 体积提示） |
| `npm.cmd test -- --run`（`frontend`） | `ci.yml` | 0 | 38 files / **293 tests** 通过 |
| `npx @redocly/cli lint openapi.yaml` | `ci.yml` | 0 | valid，**0 error** / 19 warnings（既有） |
| `npx openspec validate add-credit-exit-restriction --strict` | `@rule:spec-first` | 0 | valid |
| `playwright test credit-exit / credit-restriction / credit-cancel-reason / credit / mine`（隔离环境 8091 + 5181，`SqlLite/e2e-p4-credit.db`） | `e2e/package.json` | 0 | **23 / 23 passed** |
| `playwright test`（全量，同一隔离库） | 同上 | 1 | **99 passed / 24 failed**；24 条均为既有债务（见 Findings） |
| `playwright test tests/profiles.spec.ts`（全新库 8093 + 5183，`SqlLite/e2e-p4-clean.db`） | 同上 | 0 | **8 / 8 passed**（证明共享库顺序失败与实现无关） |
| `playwright test tests/trips.spec.ts`（同一全新库） | 同上 | 1 | 19 passed / 8 failed；8 条全部为 `china-map` / `.place-chip-name` 缺失（既有地图债务） |
| 手工走查（1440 / 768 / 390 × 浅/深色） | `@rule:prototype-ui-alignment` | 0 | 退出弹窗（原因 + 预览）与受限本人主页（徽标 + 本人原因 + 自动解除）共 8 组，`scrollWidth - clientWidth = 0`；截图 `docs/sdd/add-credit-exit-restriction/preview/p4-*.png` |

## Code-review highlights

- 退出金额只在服务端计算，前端从 `GET /leave-preview` 取文案；`applied_delta` 经 0–100 裁断，`at_floor` 与 `pending_review` 均为零值留痕。
- 幂等：重复 `leave` 按 `exit:{userId}:{tripId}` 回放既有事件，`DuplicateKeyException` 回查；副本身份 / 终态在入口拒绝。
- 限制触发/解除挂在 `CreditChangedEvent` 上，同事务执行；`CreditRestrictionGuard` 只依赖 `CreditService` + `CreditRestrictionMapper`，避免 `ApplicationService` / `TripPlanService` 循环依赖。
- 触发限制时系统清退（撤回 PENDING、解除 ACCEPTED、取消未结束已发布行程）显式绕过守卫与账本，不扣分、不计数；PENDING 因行程取消写 `TRIP_CANCELLED`，本人受限写 `CREDIT_RESTRICTION`。
- 展示面：批量端点只返回 `credit_restricted` 徽标位，本人原因只在 `GET /users/{id}/profile` 且 `viewer == self` 时返回。
- E2E 造数只用注册账号 + API；限制展示用 `page.route` 模拟，不新增管理员/测试写分接口。

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 全量 E2E 24 条失败（既有） | [fact] | `map.spec.ts` / `trips.spec.ts` / `profiles.spec.ts` | 地图渲染债务归属 REQ-016；共享库顺序债务建议后续用独立库或分片执行 |
| 2 | E2E 不在 CI（既有） | [fact] | `.github/workflows/ci.yml` | 本地门禁 + 报告留证；如需进 CI 另开 change |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `CreditProvider` 每个页面一次信用请求 | [inference] | `frontend/src/credit/CreditContext.tsx` | 数据轻；如后续页面增多可考虑缓存 TTL |
| 2 | 旧 `LeaveResult` 文案依赖前后端两次格式化 | [inference] | `TripLeaveModal` | 当前只做展示拼接，后续如加明细可改为服务端直出文案 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | 限制触发的跨模块清退在同一事务 | 保证无半状态 | `CreditRestrictionApiTest` 覆盖；量级上升再评估异步 |
| 2 | 待核实无管理端 | 用户裁决 D3 | 另开 change；不展示明细 |
| 3 | E2E 共享库累积 | 本地门禁现状 | 干净库 A/B 证据 + 报告记录 |
| 4 | 契约 0.15.0 / V21 与在途 `add-ai-itinerary` 撞号 | 后者未落 | 后到者顺延（0.16.0 / V22） |

## Waiver

`N/A — no waiver`
