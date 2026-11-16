# 任务：add-user-logout

- **依据：** [`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** AO（Jay）
- **顺序：** T1 → T2 → T3 → T4 → T5；T1 先写失败验收（red），再进入实现。
- **契约：** 无契约改动；既有 `POST /api/auth/logout`、`GET /api/auth/me` 作为回归门禁。
- **设计预览：** [`preview/identity-menu.html`](preview/identity-menu.html)

## 任务清单

### T1 [tests] 先补认证 E2E 验收

- [x] 新增 `RouteME/e2e/tests/auth.spec.ts`，覆盖 7 个用例：
  - `shows the logout entry for a demo identity`
  - `shows the logout entry for a registered account`
  - `logs out a demo identity without calling the auth API`
  - `logs out a registered account and rejects the old token`
  - `still logs out locally when session revocation fails`
  - `stays on the identity gate after logout, refresh, and navigation`
  - `re-enters with another identity after logout`
- [x] 演示身份先 `goto('/')`，再写入 `routeme.currentUserId = 1` 后 `reload()`（不用 `addInitScript`，否则刷新会重新写入身份，E7 无法验证）；注册账号用 `page.request.post('/api/auth/register')` 创建唯一用户名（`logout_${Date.now()}`），再写入 token / userId。
- [x] 失败降级用 `page.route('**/api/auth/logout', (route) => route.abort())`；token 失效用 `expect.poll` 查 `/auth/me` 401，不使用固定等待。
- [x] 演示身份「不发认证请求」用 `page.on('request')` 收集 `/api/auth/logout` 并断言为空。
- [x] 运行新 spec，记录预期失败（退出入口仅登录态可见、演示身份无出口、无失败提示）。

**验证：** 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/auth.spec.ts`（新用例 red，既有 spec 不受影响）
**覆盖：** E3–E10、RV-1、RV-2、RV-4

### T2 [frontend] 退出入口对全身份可见 + 面板语义

- [x] `AppShell.tsx`：删除 `.id-logout` 外层的 `isAuthenticated &&`；退出按钮在菜单展开时始终渲染。
- [x] 触发按钮改为 `aria-haspopup="dialog"`；面板改为 `role="dialog" aria-label="身份菜单"`；演示身份按钮包进内层 `role="listbox"`（`aria-labelledby="identity-options-label"`），保留 `role="option"` / `aria-selected`。
- [x] 身份列表与退出之间加 `<div class="id-divider" role="separator" />`；退出项加 15px 退出图标（`aria-hidden`）与「退出登录」文本。
- [x] 菜单说明按身份类型切换：注册账号「退出登录会结束本机会话并回到身份门；切换到演示身份会结束当前登录。」；演示身份「演示身份无需密码；退出登录只清除本机身份并回到身份门。」
- [x] 保持 Esc / 点击外部关闭；Esc 关闭后焦点回到触发按钮。

**验证：** `cd RouteME/frontend; npm run build`；E2E `shows the logout entry for a demo identity` / `for a registered account` / `stays on the identity gate…`
**覆盖：** E5、E7、E10、RV-3、RV-5

### T3 [frontend] 退出流程：本地优先 + 失败提示

- [x] `tripMessages.ts`：新增 `authLogoutWarning: '已退出本机，会话可能仍有效'`；`authLogout` 保持「退出登录」。
- [x] `App.tsx` `logout()`：先捕获 `authToken`；`logoutAccount(token).catch(() => message.warning(tripMessages.authLogoutWarning))` 不 `await`；同步清除 `routeme.authToken` / `routeme.currentUserId`、重置 state、`window.location.hash = '#/'`。
- [x] 确认演示身份（`authToken === null`）不调用 `logoutAccount`，不弹失败提示。

**验证：** `cd RouteME/frontend; npm run build; npm test`；E2E `logs out a demo identity without calling the auth API` / `logs out a registered account and rejects the old token` / `still logs out locally when session revocation fails` / `re-enters with another identity after logout`
**覆盖：** E3、E4、E6、E8、E9、RV-1、RV-2

### T4 [frontend] 退出菜单行样式（方案 B）

- [x] `styles.css`：新增 `.id-divider`（1px，`--line`，左右 6px）；`.id-logout` 改为 flex 行（图标 + 文本、`--t-danger`、hover 9% 危险色背景、`border: 0`）。
- [x] 退出项高度与身份行一致（约 34px）；深色模式使用 `--t-danger`（`#ff7f70`）核对对比度。
- [x] 390px 下菜单不溢出；退出项 `white-space: nowrap`。

**验证：** `cd RouteME/frontend; npm run build`；手工对照 `preview/identity-menu.html` 的方案 B（浅 / 深色）
**覆盖：** E5、E10（可见性与布局）

### T5 [verify] 全量回归与手工核对

- [x] `cd RouteME/frontend; npm run build; npm test`。
- [x] `cd RouteME/backend; .\mvnw.cmd -B test`（无后端改动，契约回归；重点 `AuthControllerTest` 的 token 校验与退出用例）。
- [x] `cd RouteME/e2e; npx playwright test tests/auth.spec.ts`（7 项全绿）；必要时跑既有三个 spec 确认无回归。
- [x] 手工 1440 / 768 / 390：演示与注册两种身份、浅色 / 深色、Tab 到退出项、Esc 关闭、退出后刷新 / 返回仍为身份门。
- [x] 确认 `openapi.yaml`、`backend/**`、`db/migration/**` 无 diff；`openspec validate add-user-logout --strict` 仍通过。
- [x] 把真实输出写入 `docs/ai4se-plugins/<timestamp>-local-verify-report.md`（或同目录 verify 记录）。

**验证：** 上述命令全绿；真实输出写入 local-verify 报告
**覆盖：** 全部场景 + RV-1–RV-5

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | Result | Evidence |
|---|---|---|
| Delta 的 10 个 Scenario 均有 ATDD 行与任务 | Pass | E1–E10 在 `atdd-design.md` §1.2；D1–D7；T1–T5 |
| Non-goals 有反向验证 | Pass | RV-1–RV-5；T1 / T5 |
| 无静默范围扩张 | Pass | Design 只改前端菜单与退出流程；D6 明确不改契约 / 后端 / 迁移 |
| 任务不越过 Delta 范围 | Pass | 无二次确认、自动过期、多设备会话、账号注销、密码校验任务 |
| 任务一层一条、可执行 | Pass | T1 tests、T2–T4 frontend、T5 verify；每条含验证命令 |
| 最后一条为验证 / 回归 | Pass | T5 |
| ATDD 先于实现 | Pass | T1 先写 red 验收；T2–T4 实现；T5 回归 |
| 契约先行 | N/A | 无契约变更；既有契约在 T5 回归 |
| 设计预览与设计决策一致 | Pass | `preview/identity-menu.html` 默认方案 B；D4 记录 A/C 被否理由 |
| G1 条件落入任务 | Pass | 入口全身份（T2）、失败提示文案（T3）、测试（T1/T5）、L-02/L-03（D3 / T5） |

**结论：Pass。** 未发现 Spec ↔ Design ↔ Tasks ↔ ATDD 的阻塞性不一致。

## P4 执行记录（2026-11-16）

| 步骤 | 结果 | 证据 |
|---|---|---|
| T1 red | 7/7 失败（无 `role=dialog`、演示身份无退出入口） | `npx playwright test tests/auth.spec.ts` |
| T2 实现 | 退出入口对演示 / 注册身份均渲染；`dialog` + 内层 `listbox`；分隔线 + 15px 图标；Esc 焦点返回 | 提交 `79a7f42` |
| T3 实现 | 本地优先清理；`logoutAccount` 失败时 `message.warning('已退出本机，会话可能仍有效')` | 提交 `79a7f42` |
| T4 样式 | 方案 B：`.id-divider` + 危险色菜单行；实测高度 34px；深色 `#ff7f70` | 提交 `79a7f42` / `e469a31` |
| T5 回归 | 构建 Pass；前端 74 项；后端 154 项；`auth.spec.ts` 7/7；全套 E2E 25/25 | 见 `docs/ai4se-plugins/20261116-111241-local-verify-report.md` |

**实现偏差（已在 ATDD 设计同步）：** E2E fixture 不用 `addInitScript`，改为首次加载后写 `localStorage` 再 `reload()`；否则每次导航都会重新种入身份，E7「刷新不恢复身份」会假通过。
**环境处置：** 开发库累积 34 条 `E2E %` 行程，把种子行程挤出第一页（25 > 20），导致 3 个既有 `trips.spec` 用例失败；已备份并清理这些测试数据后全套 E2E 25/25。备份见本地验证报告。

## G2 执行记录（2026-11-16）

| 项 | 结果 | 证据 |
|---|---|---|
| G2 decision | Pass | [`g2-decision.md`](g2-decision.md)（VL=Neal；P4 DoV P4-1–P4-6 全 Pass） |
| pipeline ci / cd | Partial（`Pass-by-human-confirm`） | [`docs/ai4se-plugins/20261116-112704-pipeline-report.md`](../../../docs/ai4se-plugins/20261116-112704-pipeline-report.md)，release `build-711da3d` |
| 阶段记录 | Pass | [`docs/sdd/add-user-logout/p4-verify.md`](../../../docs/sdd/add-user-logout/p4-verify.md) |

**下一步：** P5（归档）由用户发起；归档时把 MODIFIED「会话校验与退出」合并进 Living Spec，并在 G3 记录归档 `add-user-auth` 的 T6 旧表述已被取代。