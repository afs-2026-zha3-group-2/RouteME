# 任务清单：refine-user-support-entry

## T1 [contract] 路由与入口

- [x] `route.ts`：新增 `{ name: 'support' }`，解析 `#/support` 并支持 `routeToHash`。
- [x] `route.test.ts`：覆盖 `#/support` 解析与往返。
- [x] `App.tsx`：`support` 渲染 `SupportPage`；`help` 改由 `AdminGuard` 包裹。

**验证：** `npm run typecheck`、`npx vitest run src/route.test.ts`

## T2 [frontend] 帮助与反馈转后台

- [x] `AppShell`：用户侧「我的」分组移除「帮助与反馈」，改为「联系客服」。
- [x] `AppShell`：`role=ADMIN` 的「管理」分组增加「帮助与反馈」。
- [x] `AdminLayout`：页签区新增「帮助与反馈」跳转，保证窄屏管理员可达。

**验证：** 普通用户侧栏无「帮助与反馈」；管理员侧栏与后台页签均有入口。

## T3 [frontend] 用户侧独立客服页

- [x] 新增 `help/SupportPage.tsx`：客服会话（加载 / 空态 / 等待接入 / 处理中 / 已结束 / 重新发起）+ 常见问题侧栏 + 登录提示。
- [x] `AppShell`：窄屏悬浮客服入口（`≤900px`，位于底部导航上方）；账号菜单增加「联系客服」。
- [x] `adminMessages`：新增 `support*` 文案；`styles.css`：`.support-*` 与 `.support-fab`，复用现有色板与阴影令牌，适配深浅色。

**验证（文本化核对，不产截图）：** 1440px 下 `overflow = 0`、两列 `732 / 352`、hero 圆角 22px、3 条 chips / 3 条 tips；390px 下 `overflow = 0`、单列、悬浮按钮 `102×40`、右侧 14px、距底 74px。

## T4 [e2e] 用例跟随

- [x] `customer-service.spec.ts`：`[C1]` 改为「用户只有客服入口 / `#/help` 被拦截 / 管理员保留帮助与反馈」；`[C3]` 改走 `#/support` 与「开始对话」。
- [x] `admin.spec.ts`：举报状态断言从用户侧 `#/help` 改到管理后台举报详情。

**验证：** `npx playwright test tests/customer-service.spec.ts tests/admin.spec.ts tests/safety-report.spec.ts` → **19/19 绿**。

## T5 [docs] 记录

- [x] 本变更提案与 Delta；`docs/sdd/refine-user-support-entry/p4-apply.md` 记录决策与门禁。

## 对齐自检

| 检查项 | 结论 |
|---|---|
| 后端零改动 | Pass：无 `backend/**` / `openapi.yaml` / `db/migration/**` 变更 |
| 能力不重叠 | Pass：`user-support` 只描述入口与访问控制，客服会话生命周期仍属 `customer-service` |
| 归档顺序 | 需排在 `add-admin-console`（提供 `customer-service` Delta）之后 |
| 未签项 | G2（VL）不代签 |
