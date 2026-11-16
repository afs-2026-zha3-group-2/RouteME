# 本地验证报告：add-user-logout（REQ-006）

- **日期：** 2026-11-16（UTC+8）
- **Root：** `D:\zha_training\RouteME\ai4se-baseline`
- **Change id：** `add-user-logout`
- **Scope：** local+evidence
- **范围：** 顶栏身份菜单对所有身份提供「退出登录」；演示身份仅清本地，注册账号结束服务端会话；结束会话失败不阻断本地退出；退出后回身份门，刷新 / 返回不恢复身份。无后端、契约或迁移改动。

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Pass |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Pass** |

**PR gate：** 本报告 Overall=Pass，可进入 `/sdd:pr-submit`；报告本身不含 Gate 决策，E3 人工评审仍为 Pending（不由 agent 代签）。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `cd RouteME/frontend; npm run build` | `tasks.md` T2–T5 | 0 | `tsc --noEmit && vite build`；1521 modules，`dist` 产出正常（JS 869.65 kB / CSS 38.21 kB） |
| `cd RouteME/frontend; npm test` | `tasks.md` T3 / T5 | 0 | 9 个文件 / **74 项通过**（515ms） |
| `cd RouteME/backend; $env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"; .\mvnw.cmd -B test` | `tasks.md` T5 | 0 | **154 项通过**，`BUILD SUCCESS`（24.1s） |
| `cd RouteME/e2e; npx playwright test tests/auth.spec.ts` | `tasks.md` T1 / T5 | 0 | **7 项通过**（21.0s） |
| `cd RouteME/e2e; npx playwright test` | `tasks.md` T5 | 0 | **25 项通过**（58.5s），四个 spec 全绿 |
| `npx --no-install openspec validate add-user-logout --strict` | `tasks.md` T5 | 0 | `Change 'add-user-logout' is valid` |

> 本机 JVM 未信任企业根证书，`mvnw` 直连 Maven Central 会报 `PKIX path building failed`；本次沿用 `MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` 使用 Windows 根证书库，未使用不安全的 SSL 开关。

## 1. 前端构建与单测

```text
cd RouteME/frontend
npm run build
npm test
```

```text
✓ 1521 modules transformed.
dist/index.html                   0.97 kB
dist/assets/index-Dk1y3UGK.css   38.21 kB
dist/assets/index-6XQ6TyH_.js   869.65 kB

 Test Files  9 passed (9)
      Tests  74 passed (74)
   Duration  515ms
```

- 构建成功；唯一告警是既有 bundle >500 kB（Ant Design 体积），与本次改动无关。
- 本 change 不引入可独立断言的纯计算模块，因此前端单测数量不变；验收在 E2E 层。

## 2. 后端回归

```text
cd RouteME/backend
$env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"
.\mvnw.cmd -B test
```

```text
[INFO] Tests run: 154, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  24.117 s
```

- 本 change 不改 `backend/**`；本轮为契约回归，含 `AuthControllerTest` 的 token 校验、退出与缺少 Authorization 用例。

## 3. E2E 验收

```text
cd RouteME/e2e
npx playwright test tests/auth.spec.ts
```

```text
Running 7 tests using 1 worker
  ok 1 shows the logout entry for a demo identity
  ok 2 shows the logout entry for a registered account
  ok 3 logs out a demo identity without calling the auth API
  ok 4 logs out a registered account and rejects the old token
  ok 5 still logs out locally when session revocation fails
  ok 6 stays on the identity gate after logout, refresh, and navigation
  ok 7 re-enters with another identity after logout
  7 passed (21.0s)
```

| Scenario | 验收点 | 结果 |
|---|---|---|
| E1 / E2 | `/auth/me` 有效 token 取用户、无效 token 401 | API 回归（`AuthControllerTest`） |
| E3 | 注册账号退出后旧 token 401 | Pass（`expect.poll`） |
| E4 | 演示身份退出不发 `/api/auth/logout` | Pass（`page.on('request')` 为空） |
| E5 | 两类身份都能看到退出入口 | Pass |
| E6 | 结束会话失败仍回身份门 + 非阻断提示 | Pass（`route.abort()`） |
| E7 | 退出后刷新不恢复身份 | Pass |
| E8 | 退出后可换身份重新进入 | Pass |
| E9 | 返回 / 再导航仍停留身份门 | Pass |
| E10 | 身份门不展示退出入口 | Pass |

**全套回归：** `npx playwright test` → **25 passed（58.5s）**，`auth` 7 项 + `companions` 3 项 + `experiences` 6 项 + `trips` 9 项。

## 4. 浏览器走查（1440 / 768 / 390）

在真实后端 + Vite 上以演示身份打开身份菜单，测量面板与退出项：

| 宽度 | 面板右边界 | 横向溢出 | 退出项高度 | 浅色文字 | 深色文字 | Esc 焦点返回 |
|---|---|---|---|---|---|---|
| 1440 | 1420 / 1440 | 无 | 34px | `#b32c1c` | `#ff7f70` | 是 |
| 768 | 748 / 768 | 无 | 34px | `#b32c1c` | `#ff7f70` | 是 |
| 390 | 378 / 390 | 无 | 34px | `#b32c1c` | `#ff7f70` | 是 |

- 分隔线 1px `--line`；退出项为整行菜单项（图标 + 文本），hover 才出现 9% 危险色背景。
- 面板语义为 `role="dialog" aria-label="身份菜单"`，身份列表为内层 `role="listbox"`；退出项是普通 button，不再被读屏当作 option。
- Tab 可到达退出项；Esc 关闭菜单并把焦点还给顶栏身份按钮。

## 5. 数据卫生（验证环境）

开发库 `RouteME/SqlLite/routeme.db` 累积了 34 条 `E2E %` 行程，总数 40、超过 `/api/matches` 首页 20 条容量，导致 3 个既有 `trips.spec` 种子数据断言失败（种子行程被挤到第二页）。这属于 `refine-inspiration-home` 验证报告已记录的 E2E 数据污染 WARNING，与本次代码无关。

处置：先备份数据库，再删除 `title like 'E2E %'` 的行程及其关联 `trip_applications` / `chat_messages` / `trip_experiences` 行，保留 6 条种子行程；随后全套 E2E 25/25。

- 备份：`C:\Users\CHIUJA2\AppData\Local\Temp\opencode\routeme-20261116-111107.db`
- 清理：34 条行程、5 条申请、5 条聊天、7 条体验
- 未改产品代码或迁移；测试卫生问题建议另立 change（独立测试库或 `afterEach` 清理）。

## 6. 实现偏差与设计一致性

| 项 | 设计 | 实现 | 说明 |
|---|---|---|---|
| E2E 身份 fixture | `addInitScript` 写入身份 | 首次加载后写 `localStorage` 再 `reload()` | `addInitScript` 会在刷新时重新写入身份，E7 会假通过；已同步 `atdd-design.md` §4 与 `tasks.md` T1 |
| 退出项高度 | 约 34px | 34px | 由 `padding: 7px 8px` 对齐；身份选项行高 46px（含头像） |
| 退出样式 | 方案 B | 方案 B | 分隔线 + `--t-danger` 文本 + 15px 图标 + 9% hover 背景，无边框 |

**关键实现：**

- `AppShell.tsx`：删除 `.id-logout` 的 `isAuthenticated` 门控；触发按钮 `aria-haspopup="dialog"`；面板 `role="dialog"`；演示身份按钮包进内层 `listbox`；Esc 关闭并 `focus()` 触发按钮。
- `App.tsx`：`logout()` 先捕获 token，同步清除 `routeme.authToken` / `routeme.currentUserId` 并回 `#/`；再异步 `logoutAccount(token)`，失败时 `message.warning('已退出本机，会话可能仍有效')`。
- `tripMessages.ts`：新增 `authLogoutWarning`；`authLogout` 保持「退出登录」。
- `styles.css`：`.id-list`、`.id-divider`、行式 `.id-logout`。
- `e2e/tests/auth.spec.ts`：7 个验收用例，注册账号用唯一用户名 `logout_${Date.now()}`。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | 需求覆盖（Delta 10 个 Scenario） | Pass | [fact] | E1–E10 均有 API 回归、E2E 或手工证据 |
| V2 | 场景覆盖（异常 / 边界） | Pass | [fact] | 会话结束失败、刷新、返回、重复触发、身份门无入口 |
| V3 | 契约一致 | Pass | [fact] | 未改 `openapi.yaml`、`backend/**`、`db/migration/**`；实现提交仅前端 + E2E |
| V4 | 实现正确 | Pass | [fact] | 构建 / 单测 / 后端 / E2E 全绿 |
| V5 | 可访问性 | Pass | [fact] | `dialog` + `listbox` + `aria-selected`；Esc 焦点返回；可见 focus ring |
| V6 | 设计一致（D1–D7） | Pass | [fact] | 全身份入口、本地优先、非阻断提示、方案 B、文案分支 |
| V7 | 任务一致（T1–T5） | Pass | [fact] | T1 red → T2–T4 实现 → T5 回归；`tasks.md` 已勾选 |
| V8 | 必要性（无静默范围扩张） | Pass | [fact] | 无二次确认、自动过期、多设备会话、账号注销、密码校验 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告「Local commands」6 条命令全绿；远程 CI 待 PR 后由 `/sdd:pipeline-report` 生成 |
| E2 AI | Pass | 本报告 + 代码走查 + 1440/768/390 与浅 / 深色走查记录 |
| E3 Human | Pending | 未签；不由 agent 代签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | 残余风险 4 项，均为已跟踪的非阻塞项 | ✅ |

## Findings

### CRITICAL

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| — | 无 | — | — | — |

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | E2E 数据污染：多次运行累积 `E2E %` 行程，挤出种子数据后既有 `trips.spec` 失败 | [fact] | `RouteME/SqlLite/routeme.db`、`e2e/tests/*.spec.ts` | 另立 change：独立测试库或 `afterEach` 清理；本次已本地清理并备份 |
| 2 | 并发 agent 在 P4 期间回滚未提交文件（`App.tsx` / `tripMessages.ts` / `styles.css` / `auth.spec.ts`） | [fact] | 工作树 | 已改为实现完成后立即提交（`79a7f42` / `e469a31`），后续产物单独提交 |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 归档 `add-user-auth` 的 `tasks.md` T6 / `design.md` 仍写「演示身份不显示退出」 | [inference] | `openspec/changes/archive/**` | P5 / G3 在 `summary.md` 记录已被本 change 取代，不改写归档正文 |
| 2 | `.id-option` 因内含 28px 头像而高 46px，退出项 34px；菜单内两类行高不一致 | [fact] | `styles.css` | 若后续视觉要求严格对齐，可给退出项增加垂直内边距或统一行高 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | antd 静态 `message` 不继承 `ConfigProvider` 主题上下文 | 仓库已有静态 `message` 先例（`ShareExperiencePage`） | 若出现主题告警，后续改用 `App.useApp()`；不影响退出主流程 |
| 2 | 服务端会话删除异步，退出后立即查 `/auth/me` 可能短暂 200 | 实现为 fire-and-forget | E2E 用 `expect.poll` 等待 401；不固定等待 |
| 3 | 远程 CI 未运行（P4-3 pipeline report 待 PR 后生成） | 尚未进入 PR 阶段 | tracking |
| 4 | 归档旧表述「演示身份不显示退出」与本 change 冲突 | 归档不可改写 | P5 / G3 在 summary 记录取代关系 |

## Waiver

N/A — no waiver.

## 结论

前端构建 / 74 项单测全绿；后端 154 项全绿；`auth.spec.ts` 7/7、全套 E2E 25/25；`openspec validate --strict` 通过；1440 / 768 / 390 与浅 / 深色走查无横向溢出，退出项 34px、Esc 焦点返回正常。P4 范围内无 CRITICAL；2 条 WARNING 分别为既有测试数据卫生与并发工作树干扰，均已处置或另立跟踪。Overall **Pass**。

**Apply / verify 分离：** 本报告不构成任何 Gate 决策（未写 G2、未签 E3、未自批 Waiver）；G2 在进入 PR 前仍由人工按 `/sdd:g2-decision-record` 处理。