# 本地验证报告：refine-trip-application（REQ-009 / S08）

- **日期：** 2026-11-16（UTC+8）
- **Root：** `C:\Git\ITA\RouteME\.worktrees\refine-trip-application\ai4se-baseline`
- **Change id：** `refine-trip-application`
- **Scope：** local+evidence
- **范围：** 行程详情页把申请弹窗改为原型的内联「下一步」申请区；提交后按原型展示待处理提示 + 撤回；重复 / 满员 / 结束错误映射为可读文案并由服务端拒绝；本人无入口；撤回后恢复表单。无后端、契约、迁移或原型文档改动。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate：** 本报告 Overall=Pass；远程 pipeline 尚未运行（按用户约定 P4 后 push），E3 人工评审与 G2 由人工具名处理。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend; npm run build` | `tasks.md` T2–T5 | 0 | `tsc --noEmit && vite build`；1523 modules，JS 900.08 kB / CSS 39.48 kB |
| `cd RouteME/frontend; npm test` | `tasks.md` T2 / T5 | 0 | 10 个文件 / **88 项通过**（含新增 `applicationEntry.test.ts` 13 项） |
| `cd RouteME/backend; .\mvnw.cmd -B -ntp test` | `tasks.md` T5 | 0 | **156 项通过**，`BUILD SUCCESS` |
| `cd RouteME/e2e; npx playwright test tests/companions.spec.ts` | `tasks.md` T1 / T5 | 0 | **8 项通过** |
| `cd RouteME/e2e; npx playwright test` | `tasks.md` T5 | 0 | **30 项通过**，四个 spec 全绿 |
| `openspec validate refine-trip-application --strict` | `tasks.md` T5 | 0 | `Change 'refine-trip-application' is valid` |

## 1. 前端构建与单测

```text
✓ 1523 modules transformed.
dist/index.html                   0.97 kB │ gzip:   0.66 kB
dist/assets/index-D4nhHcYk.css   39.48 kB │ gzip:   8.82 kB
dist/assets/index-DFeVOnwy.js   900.08 kB │ gzip: 287.00 kB

 Test Files  10 passed (10)
      Tests  88 passed (88)
```

- 构建成功；唯一告警是既有 bundle >500 kB（Ant Design 体积），与本次改动无关。
- 新增纯函数 `applicationEntryState` / `applicationErrorMessage` 13 项单测覆盖：发布者、pending、accepted、completed、full、cancelled / rejected 再申请、满员 + 已有申请、两种 409 映射与未知错误码。

## 2. 后端回归

```text
[INFO] Tests run: 156, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  23.010 s
```

- 本 change 不改 `backend/**`；本轮为契约回归，重点覆盖 `ApplicationControllerTest` 的本人 / 重复 / 满员 / 结束 / 空说明 / 超长说明 / 取消用例。

## 3. E2E 验收

```text
Running 8 tests using 1 worker
  ok 1 shows match reasons and keeps match as the default sort
  ok 2 applies, gets accepted, chats, reports and leaves
  ok 3 applies inline and keeps the pending state after reload
  ok 4 blocks a duplicate application submitted from a stale page
  ok 5 rejects a submission after the trip fills and shows the reason
  ok 6 rejects a submission after the trip ends
  ok 7 withdraws a pending application and restores the inline form
  ok 8 keeps companion entry points honest
  8 passed
```

| Scenario | 验收点 | 结果 |
|---|---|---|
| E1 | 内联申请区：说明、提交、聊天说明，无弹窗 | Pass |
| E2 | 提交 → 待处理提示 + 撤回；刷新保持 | Pass |
| E3 | 空说明成功、`message: null`；>120 字输入被截断 | Pass |
| E4 | 本人行程无表单，发布者入口保留 | Pass |
| E5 | 停留页重复提交 → 「已申请，请等待回应」，不新增记录 | Pass |
| E6 | 停留页满员 / 结束 → 「人数已满」/「行程已结束」，刷新后无表单 | Pass |
| E7 | 撤回 → 已取消，表单恢复，刷新后仍可申请 | Pass |
| E8 | 页面停留期间状态变化 → 服务端拒绝 + 可读原因 | Pass |

**全套回归：** `npx playwright test` → **30 passed**，`auth` 7 + `companions` 8 + `experiences` 6 + `trips` 9。

## 4. 浏览器走查（1440 / 1024 / 768 / 390，浅 / 深色）

对「可申请 / 待处理 / 已匹配 / 已满员」四种状态截图核对：

- 内联申请区标题「下一步」、说明标签与选填提示、原型 placeholder、整行主按钮、聊天权限说明均与原型 `actionBox` 一致。
- 待处理为 `.action-note.warn` + 整行「撤回申请」；已匹配为名单提示 + 「与 陈屿 沟通」+「退出同行」；满员为「人数已满」原因提示。
- 390px 下输入框与按钮整行宽度，无横向溢出；深色模式边框、背景与 focus ring 使用令牌，无写死色值。
- 键盘 Tab 可依次到达说明框、提交按钮、撤回按钮；提示文本可被读屏读出。

## 5. 验证环境与数据卫生

- 共享工作区的 5173 / 8080 被另一会话的前后端占用；为不干扰团队进程，本次验证使用**独立后端 8090 + 独立 SQLite**（`.e2e-data/routeme-8090.db`，Fresh Flyway 9 migrations）与 **Vite 5174**（临时 `vite.local.config.ts` 代理 8090、临时 `playwright.local.config.ts` 指 5174）。
- E2E 直接 API 调用改为相对 `/api`，经 Playwright `baseURL` + Vite proxy，默认仍指向 5173 → 8080；隔离端口下无需改产品代码。
- 测试行程使用唯一标题，可完成行程在用例末尾由发布者结束；验证完成后删除临时 DB、配置与截图，未触碰共享库。

## 6. 实现偏差与设计一致性

| 项 | 设计 | 实现 | 说明 |
|---|---|---|---|
| 错误码映射依据 | 按行程状态映射 `TRIP_NOT_OPEN` | 提交失败后先 `loadTrip` 拉取最新状态再映射 | 页面快照可能仍是 recruiting；刷新失败退化为「当前不可申请」，已同步 `design.md` D4 |
| 已匹配状态 | 用户确认统一按原型 | 名单提示 + 「与 {昵称} 沟通」+「退出同行」 | 覆盖原「已匹配同行」Tag 区块；已同步 `design.md` D3 与 `tasks.md` T3 |
| E2E API 基址 | 不写死 8080 | 相对 `/api` + `baseURL` | 支持隔离端口验证；`auth` / `experiences` / `trips` 同步一行 |
| 满员 / 结束入口 | 不可用 + 原因 | `applicationEntryState` 返回 `unavailable` | 申请状态优先于行程状态，满员后已匹配用户仍可聊天 / 退出 |

**关键实现：**

- `applicationEntry.ts`：入口状态派生与两个 409 的错误映射纯函数。
- `TripDetailPage.tsx`：删除申请 `Modal`；内联「下一步」申请区（apply / pending / accepted / unavailable）；提交失败刷新行程与申请；撤回后表单立即恢复。
- `tripMessages.ts`：原型 placeholder、「提交同行申请」、聊天说明、撤回、重复 / 满员 / 结束 / 当前不可申请文案。
- `styles.css`：`.detail-application` 作用域 action-box / action-note / apply-form / textarea / hint。
- `e2e/tests/companions.spec.ts`：8 条用户路径；`trips.spec.ts` 的旧「申请同行」断言改为「提交同行申请」。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | 需求覆盖（Delta 8 个 Scenario） | Pass | [fact] | E1–E8 均有 E2E 或 API 回归证据 |
| V2 | 场景覆盖（异常 / 边界） | Pass | [fact] | 重复、满员、结束、页面停留期间、空说明、超长说明、撤回 |
| V3 | 契约一致 | Pass | [fact] | `openapi.yaml`、`backend/**`、`db/migration/**`、`docs/prototype/**` 零 diff |
| V4 | 实现正确 | Pass | [fact] | 构建 / 单测 / 后端 / E2E 全绿 |
| V5 | 可访问性 | Pass | [fact] | 语义选择器、键盘 Tab、读屏名称、390px 无溢出 |
| V6 | 设计一致（D1–D9） | Pass | [fact] | 内联申请区、状态顺序、原型分支、错误映射、撤回、样式令牌 |
| V7 | 任务一致（T1–T6） | Pass | [fact] | T1 red → T2–T4 实现 → T5 回归；T6 留归档 |
| V8 | 必要性（无静默范围扩张） | Pass | [fact] | 无自动加入、必填说明、卡片入口、通知、批量申请、后端改动 |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 共享 5173 / 8080 被另一会话占用，首次 E2E 误连旧服务 | [fact] | 工作区运行环境 | 已在 8090 / 5174 隔离端口复验；后续建议固定独立测试端口 |
| 2 | E2E 数据会累积，可能挤出首页种子数据 | [fact] | `SqlLite/routeme.db` | 本次使用独立 DB；测试行程可完成时已结束；建议另立清理机制 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | `application-status` CSS 已无引用 | [fact] | `styles.css` | 可随下次样式清理删除，不影响本次 |
| 2 | 宿主规则投影 `prototype-ui-alignment` / `rule-precedence` 仍无权威区锚点 | [fact] | `.qoder/rules` vs `docs/knowledge/rules` | 由 rules-govern 另行处理（L-01） |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | 远程 CI 未运行 | 按用户约定 P4 后 push | push 后跑 `phase=ci` 并补 pipeline report |
| 2 | 页面停留期间状态过期 | 客户端快照无法实时同步 | 失败后重新拉取行程 + 申请；E2E 覆盖三条停留页路径 |
| 3 | Living Spec 合并只追加不替换 | 归档工具行为 | T6 在 P5 / G3 前核对 8 场景与 5 个基线语义 |

## Waiver

N/A — no waiver.

## 结论

前端构建 / 88 项单测全绿；后端 156 项全绿；`companions.spec.ts` 8/8、全套 E2E 30/30；`openspec validate --strict` 通过；1440 / 1024 / 768 / 390 与浅 / 深色走查无横向溢出，四种申请状态与原型一致。P4 范围内无 CRITICAL；2 条 WARNING 为共享端口与 E2E 数据卫生，均已隔离处置。Overall **Pass**。

**Apply / verify 分离：** 本报告不构成 Gate 决策；G2 由 VL 按 `/sdd:g2-decision-record` 另行处理。
