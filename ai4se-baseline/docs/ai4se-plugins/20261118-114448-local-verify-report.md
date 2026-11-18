# Local Verify Report: add-report-credit-deduction

**Date:** 2026-11-18 (timezone: Asia/Shanghai, UTC+08:00)
**Root:** C:\Git\ITA\RouteME\.worktrees\add-report-credit-deduction\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-report-credit-deduction

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate:** Pass. G2 still requires VL (Neal) signature — this report does not self-approve.

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `./mvnw.cmd -B -o verify`（ai4se-baseline/RouteME/backend） | `.github/workflows/ci.yml` | 0 | **596 tests / 88 classes，0 failures / 0 errors**，BUILD SUCCESS（含 V1–V30；合并 `origin/main@23c1088` 后复验） |
| `npm run typecheck`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml` | 0 | `tsc --noEmit` 通过 |
| `npm run test`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml` | 0 | **492 tests / 61 files passed**（合并后复验） |
| `npm run build`（ai4se-baseline/RouteME/frontend） | `.github/workflows/ci.yml` | 0 | 构建成功；仅既有主 chunk >500 kB 警告 |
| `npx --no-install @redocly/cli lint openapi.yaml`（ai4se-baseline/RouteME） | T1 验证 | 0 | valid；**0 error / 25 warning**，warnings 均为既有 invalid-example 示例，无 `/admin/reports` 路径 |
| `npx openspec validate add-report-credit-deduction --strict`（ai4se-baseline） | P2/P3 同口径 | 0 | valid；INFO 提示 `admin-console` 需待 `add-admin-console` 归档后才能归档（C4 已知约束） |
| `npx playwright test tests/admin-report-credit.spec.ts tests/admin.spec.ts`（ai4se-baseline/RouteME/e2e） | atdd-design §4 | 0 | **17 passed**：新增 6 + admin 回归 11；合并后复验仍 17/17 |

**合并复验（`origin/main@23c1088`）：** 无冲突；`openapi.yaml` 仍为 `0.25.0`、迁移头仍为 `V30`；后端 **596/596**、前端 **492/492** + `build`、E2E **17/17**、OpenSpec valid、Redocly valid。

**E2E 隔离环境：** 全新 SQLite `C:\Git\ITA\RouteME\.worktrees\add-report-credit-deduction\.e2e-data\routeme.db`（V1–V30 重放）；后端 `8082`（终端复用导致 `SERVER_PORT` 覆盖计划值 8081）+ Vite `5174` + `ROUTEME_E2E_BASE_URL=http://localhost:5174`。

## Code-review highlights

- **扣分主链路**：`resolve` 内 `ReportViolationEnum.parse` → `deduction` → `snapshot` 计算 `applied = min(deduction, before)` → 条件更新报告 → `CreditService.book`，全在同一事务；失败整体回滚。
- **并发**：条件更新保证只有一个提交者写账本；并发集成测试 1 成功 / 1 冲突 / 账本 1 条 / 分数 70。
- **只读快照**：`CreditService.snapshot` 不 `ensureAccount`，列表 / 详情浏览不产生写副作用；缺失账户按 80 展示。
- **历史数据**：报告新增两列可空；历史行不推断、不回填；前端 `?? '—'` 降级（E7）。
- **前端映射**：`reportViolation.ts` 与后端枚举同值；单测断同一组 8 类 + 四档样例；预览 `max(0, before - deduction)`。
- **账号处置**：举报页无任何处罚入口（R1）；扣分不改账号状态（R2）；D-4 经用户裁决在用户管理页补齐 BANNED 的「更新封禁 / 恢复」，避免后台失去封禁维护入口。
- **测试稳定性**：`admin.spec.ts` I3 的「确认」按钮收窄到 `.ant-popover`，消除与昵称「待确认」的 strict-mode 冲突（仅定位器）。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md` 1.1–1.12 全部 `- [x]`；执行偏差 D-1–D-5 已登记 |
| V2 | Requirement coverage | Pass | [fact] | `user-credit` 3 Requirement：违规类型扣分（枚举 + `book` + 幂等）、明细 / 截断、低分联动（复用事件）；`admin-console` 1 Requirement：处置表单 / 详情 / 历史降级 / 预览 |
| V3 | Scenario coverage | Pass | [fact] | API A1–A18：`AdminReportControllerTest` 26 / `ReportViolationEnumTest` 6 / `CreditServiceSnapshotTest` 2 / `ReportCreditConcurrencyTest` 1；E2E E1–E9 + R1 / R3：`admin-report-credit.spec.ts` 6 条；E8：`admin.spec.ts` I1 两条；R2 / R4 / R5：API 与迁移用例 |
| V4 | Requirement↔impl mapping | Pass | [fact] | 枚举 → `ReportViolationEnum`；扣分 → `AdminReportServiceImpl#resolve` + `CreditService#book`；快照 → `snapshot` / `snapshotAll`；页面 → `AdminReportDetailPage` + `reportActionForm` + `reportViolation` |
| V5 | Spec drift | Pass | [fact] | 与 Delta 一致；D-4 为经用户批准的范围扩展，已写入 `tasks.md` 偏差与本报告；无静默漂移 |
| V6 | Design follow-through | Pass | [fact] | D1–D10 均有落点：独立枚举、请求不可传分值、两列留痕、只读快照、`ReportedUser` 扩展、条件更新 + 幂等、`resolution_action` 语义、双端同值与 0 截断、表单校验、0.25.0 + V30 |
| V7 | Code pattern fit | Pass | [fact] | 沿用 `AbstractServiceImpl` / mapper / `InvalidInputException` / `CreditBooking` / antd + SoftSelect / 主题令牌；未引入新框架 |
| V8 | Upstream basis | Pass | [fact] | 改动均可追溯到 1.1–1.12；D-4 为关闭 C1 的必要扩展；无明细页 / 通知 / 补扣 / 月度上限等越界功能 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（后端 verify / 前端 typecheck+test+build / Redocly / OpenSpec / E2E 全部 exit 0） |
| E2 AI | Pass | 本报告 + V1–V8 |
| E3 Human | Pending | G2 待 VL=Neal 签署；本报告不代签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ 12/12 任务、4/4 Requirement、A1–A18 / E1–E9 / R1–R5 覆盖 |
| Q2 Correct? | V4–V5 | ✅ 扣分 / 幂等 / 并发 / 截断 / 历史降级 / 状态不变均有证据；偏差已登记 |
| Q3 Coherent? | V6–V7 | ✅ D1–D10 落地；模式与既有信用 / 管理端一致 |
| Q4 Necessary only? | V8 | ✅ 除用户批准的 D-4（封禁闭环）外无范围蔓延 |
| Q5 Risk controllable? | residual | ⚠️ G2 未签；E2E 未纳入 CI；未跑全量 E2E |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| W1 | D-4 改写了 `AccountStatusService` 的 BANNED 迁移语义（允许更新封禁 / 恢复），超出 Delta 的 `admin-console` MODIFIED 范围 | [fact] | `AccountStatusService#ban/restore`、`adminStatus.ts` | 已获用户 2026-11-18 明确裁决；G2 时请 VL / SA 知悉该扩展及其测试证据 |
| W2 | 全量 E2E 未重跑，本轮只跑本 change 2 份 spec（17 条） | [fact] | `e2e/tests/admin-report-credit.spec.ts`、`admin.spec.ts` | 受影响面仅举报处置与用户管理页；如 P5 前需要全量基线，再跑一次全量并归因 |
| W3 | E2E 不在 CI | [fact] | `.github/workflows/ci.yml` | 既有流程债务；G2 / P5 时决定是否纳入 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| S1 | E7 历史行通过路由垫片模拟 null 字段，未直连 DB 造历史数据 | [fact] | `admin-report-credit.spec.ts` E7 | 若后续引入数据工厂，可改为预置真实历史行 |
| S2 | `CreditService.updateBan` 在举报处置重写后无调用方 | [fact] | `AccountStatusService#updateBan` | 可保留为服务 API，或在后续清理中删除 |
| S3 | Redocly 仍有 25 个既有 invalid-example warning | [fact] | `openapi.yaml` | 与本 change 无关，沿用既有 `warn` 口径 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | G2 未签署 | 需 VL=Neal 独立签署 | 本报告 / `p4-apply.md` 已备齐证据；模型不代签（tracking） |
| 2 | D-4 扩展的业务接受度 | 超出 Delta 明文范围 | 用户已裁决；G2 记录中显式引用本报告 W1（accepted） |
| 3 | 全量 E2E 未跑 | 时间与范围控制 | 受影响 2 份 spec 17/17；P5 前按需补全量（tracking） |
| 4 | 历史举报旧处罚动作仍会展示 | `resolution_action` 保留历史值 | 只读展示（E7 / 历史动作行），不做推断（accepted） |
| 5 | 实现侧未做 4 宽度 × 浅深色的逐屏视觉走查 | 本轮以原型 + 主题令牌实现，E2E 只验证功能与交互 | G2 前如需视觉证据，再由人工按 `admin-report-resolve.html` 对照补走查（tracking） |

## Waiver

N/A — no waiver.

## Human review assist

- 建议 VL 重点复核：D-4 的封禁闭环（更新封禁 / 恢复）是否符合产品预期；历史举报降级；预览按 0 截断文案。
- 视觉复核：样式按原型 `docs/prototype/admin-report-resolve.html` 的主题令牌实现；**本轮未生成截图，也未做 4 宽度 × 浅深色的逐屏走查**（见 Residual risk 5）。
