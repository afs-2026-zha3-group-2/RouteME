# ATDD 设计：add-user-logout

- **Change:** `add-user-logout`（REQ-006，`user-auth` MODIFIED）
- **依据：** [`proposal.md`](proposal.md)、[`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`dov-ac-review.md`](dov-ac-review.md)、[`g1-decision.md`](g1-decision.md)
- **规则：** `@rule:web-testing`、`@rule:web-coding-style`、`@rule:sdd-artifacts`
- **范围提醒：** 无后端、契约、迁移或状态机改动；ATDD 只规划 **API 回归** 与 **E2E 验收**，纯逻辑项留给 `/sdd:atdd-apply`。
- **设计预览：** [`preview/identity-menu.html`](preview/identity-menu.html)（浅色 / 深色、演示 / 注册、三种退出样式）

## 1. ATDD 分层范围

### 1.1 分层结论

| 层 | 本 change 的用法 |
|---|---|
| **E2E** | 全部新增验收：入口可见、演示身份退出、注册账号退出、失败降级、刷新、重新进入、重复触发、身份门无入口 |
| **API** | 不新增验收；`AuthControllerTest` 的 token 校验、退出、缺少 token 用例作为回归门禁 |
| **Defer UT** | 若 apply 阶段抽出口令式纯函数（如退出分支判定）再补；组件行为不写 UT |

**推荐附加层（advisory，不设门禁）：** Security（会话结束、token 失效）；Compatibility（键盘操作、无障碍名称、390/768/1440 宽度）。

### 1.2 场景分类

| # | 场景（Delta） | 层 | 依据 |
|---|---|---|---|
| E1 | 用有效 token 读取当前用户 | API 回归 | 单端点 200 + 用户字段 |
| E2 | 无效或过期 token | API 回归 | 单端点 401 `SESSION_INVALID` |
| E3 | 退出登录（注册账号） | E2E + API 回归 | 菜单点击 → 回身份门；同 token 再取用户 401 |
| E4 | 演示身份退出当前身份 | E2E | 用户可见路径；断言不发 `/auth/logout` |
| E5 | 退出入口对所有身份可见 | E2E | 两类身份各开一次菜单 |
| E6 | 结束会话失败仍完成本地退出 | E2E | 拦截 `/api/auth/logout` 失败，断言仍回身份门 |
| E7 | 退出后刷新不恢复身份 | E2E | 刷新后页面状态 |
| E8 | 退出后可重新进入 | E2E | 从身份门选择新身份 → 首页归属切换 |
| E9 | 重复触发退出 | E2E | 退出后返回 / 再导航仍保持身份门 |
| E10 | 身份门不展示退出入口 | E2E | 页面不存在退出按钮 |

## 2. 生产代码前先写的检查

先新增 `RouteME/e2e/tests/auth.spec.ts` 并看到失败（red），再进入实现：

| 用例名（English statement） | 覆盖 | 关键断言 |
|---|---|---|
| `shows the logout entry for a demo identity` | E5 | 打开身份菜单后出现「退出登录」；当前演示身份行仍可切换 |
| `shows the logout entry for a registered account` | E5 | 当前账号摘要含「已登录」；「退出登录」可见 |
| `logs out a demo identity without calling the auth API` | E4 | 点击后回身份门；`page.on('request')` 未出现 `/api/auth/logout`；身份门有 3 个演示身份 |
| `logs out a registered account and rejects the old token` | E3 | 回身份门；`expect.poll` 到 `/auth/me` 返回 401 |
| `still logs out locally when session revocation fails` | E6 | `page.route('**/api/auth/logout', abort)`；仍回身份门；出现「已退出本机，会话可能仍有效」 |
| `stays on the identity gate after logout, refresh, and navigation` | E7 / E9 / E10 | 刷新仍是身份门；`goBack()` 后仍是身份门；页面无「退出登录」 |
| `re-enters with another identity after logout` | E8 | 选择陈屿后首页顶栏显示陈屿，不残留原身份 |

**API 回归（不新增用例）：** `AuthControllerTest.in_validToken_out_currentUser`、`in_missingOrForgedToken_out_sessionInvalid`、`in_logout_out_tokenRejected`、`in_missingLogoutHeader_out_sessionInvalid` 作为门禁；`openapi.yaml` 不修改。

**Defer UT：** 本 change 不引入纯计算模块；若实现抽出「是否应调用退出端点」之类的判定函数，apply 阶段在同目录补单测。

## 3. 本地 vs CI 门禁

| 门禁 | 命令 | 期望 |
|---|---|---|
| 类型检查 / 构建 | `cd RouteME/frontend; npm run build` | 0 error |
| 前端单元 | `cd RouteME/frontend; npm test` | 全绿（既有 9 个文件 / 73 项） |
| 后端回归 | `cd RouteME/backend; .\mvnw.cmd -B test` | 全绿（无后端改动） |
| E2E | 启动后端 `8080` + 前端 `5173` 后 `cd RouteME/e2e; npx playwright test tests/auth.spec.ts` | 新增 7 项全绿 |
| 手工 | 1440 / 768 / 390 + 键盘 | 菜单不溢出；Tab 可达退出项；Esc 关闭并回到触发按钮 |

不新增 CI 语义；沿用仓库既有 `npm run build` / `npm test` / `npx playwright test`。

## 4. 数据 / Fixtures 策略

- **演示身份：** `page.addInitScript` 写入 `routeme.currentUserId = 1`；`goto('/')` 直接进入首页。
- **注册账号：** 通过 `page.request.post('/api/auth/register')` 创建唯一用户名（`logout_${Date.now()}`），再把返回的 `session.token` 与 `session.user.id` 写入 `localStorage`；不重复走注册表单，避免把退出验收绑到注册界面。
- **失败降级：** `page.route('**/api/auth/logout', (route) => route.abort())`，断言本地退出先完成；不等待真实超时。
- **清理：** 注册账号使用唯一用户名；不删除数据库记录，沿用既有演示库累积约定。
- **断言等待：** token 失效用 `expect.poll`（服务端删除会话是异步的），不使用固定等待。

## 5. Non-goals 与反向验证

| 反向用例 | 断言 |
|---|---|
| RV-1 不新增端点 / 不改契约 | `openapi.yaml`、`backend/**`、`db/migration/**` 无 diff；演示身份退出不发 `/auth/logout` |
| RV-2 演示身份退出不要求密码 | 退出路径不出现密码输入；不发登录 / 注册请求 |
| RV-3 身份门不展示退出入口 | 身份门无「退出登录」按钮 |
| RV-4 不做二次确认 | 点击「退出登录」直接完成，不出现确认对话框 |
| RV-5 不做多设备会话 / 自动过期 | 菜单无会话列表、倒计时或远程下线入口 |

## 6. NFR 测试（可选）

- 未指定性能、容量或可观测性目标 → **deferred / out of scope**；本 change 不新增监控指标或 SLA。
- 可访问性不单列 NFR 套件：E2E 用 `getByRole('button', { name: '退出登录' })` 与键盘走查覆盖；对比度沿用既有设计令牌。
- 兼容性作为 advisory：手工看 390 / 768 / 1440 三档，不做多浏览器矩阵。

## 7. 交付边界

- **本设计产出：** 分层、red 用例清单、门禁、fixtures、反向验证、NFR 取舍。
- **不产出：** 生产代码、E2E 代码、完整 UT 套件；这些属 `/sdd:atdd-apply`。
- **下一步：** `/sdd:task-plan`（`design.md` + `tasks.md` + 对齐自检）。