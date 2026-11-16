# 设计：add-user-logout

- **Change:** `add-user-logout`（REQ-006，`user-auth` MODIFIED）
- **依据：** [`proposal.md`](proposal.md)、[`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`atdd-design.md`](atdd-design.md)、[`dov-ac-review.md`](dov-ac-review.md)
- **规则：** `@rule:web-coding-style`、`@rule:web-testing`、`@rule:sdd-artifacts`
- **设计预览：** [`preview/identity-menu.html`](preview/identity-menu.html)（演示 / 注册两种身份、浅色 / 深色、退出样式 A/B/C）

## 1. 关键取舍

### D1 退出入口对所有身份渲染，不再依赖 `isAuthenticated`

- **Context：** `AppShell` 只在 `isAuthenticated` 为真时渲染 `.id-logout`；演示身份进入后 `authToken` 为 `null`，因此没有出口。`AppShell` 本身只在 `currentUser` 存在时挂载，身份门不会渲染顶栏。
- **Decision：** 删除 `.id-logout` 外层的 `isAuthenticated &&` 门控；退出按钮在菜单展开时始终存在。`isAuthenticated` 继续用于「当前账号摘要」「切换为演示身份」标签与菜单说明。
- **Rejected：** 用 `currentUser.id <= 3` 判断演示身份（把演示身份数量写死，且注册账号也可能复用 id 段）；在身份门额外加退出按钮（没有可退出的身份）；新增独立「账户设置」页（超出提案范围）。
- **Consequence：** 演示身份与注册账号看到同一个退出入口；文案按身份类型区分。

### D2 本地退出优先，服务端结束会话失败只给非阻断提示

- **Context：** `App.logout()` 已实现「清 token / 当前身份 → 回 `#/`」，但 `logoutAccount(token).catch(() => undefined)` 完全静默；REQ-006 允许提示「会话可能仍有效」，G1 条件要求在 P3 固定文案。
- **Decision：** 保留本地清理同步执行；先捕获当前 token，再 `logoutAccount(token).catch(() => message.warning(tripMessages.authLogoutWarning))`，不 `await`、不阻止跳转。`authLogoutWarning` 固定为「已退出本机，会话可能仍有效」。
- **Rejected：** `await` 服务端响应后再清本地（网络失败会把用户困在已登录界面，违反 Scenario 6）；把失败做成 `Alert` 停留在页面（会改变「已退出」主状态）；完全静默（用户无法知道会话可能仍有效）。
- **Consequence：** 退出总是即时完成；失败提示是附加信息。antd 静态 `message` 在仓库已有先例（`ShareExperiencePage`）。

### D3 身份面板语义修正：`dialog` + 内层 `listbox`

- **Context：** 当前 `.id-panel` 整体是 `role="listbox"`，但内部混有当前账号摘要、分组标签、说明文字与退出按钮；`option` 之外的内容不符合 listbox 语义，键盘与读屏体验不稳定。
- **Decision：** 外层改为 `role="dialog" aria-label="身份菜单"`，触发按钮改为 `aria-haspopup="dialog"`；只把演示身份按钮包进内层 `<div role="listbox" aria-labelledby="identity-options-label">`。保留 `role="option"` / `aria-selected` 与既有选中态。Esc 关闭并把焦点还给触发按钮；点击外部关闭（沿用现有逻辑）。
- **Rejected：** 整体改 `role="menu"`（需要补方向键导航，超出本次范围）；整体改普通 `div`（丢失分组语义）；保留 `listbox` 包住非 option 内容（当前问题）。
- **Consequence：** 退出按钮成为 dialog 内的普通按钮，不再被读屏当成选项；listbox 只包含真正的身份选项。非模态 popover 不做焦点陷阱。

### D4 退出入口采用「分隔线 + 危险色菜单行」（预览方案 B）

- **Context：** 现状是列表底部一条全宽描边按钮（方案 A）；它在视觉上像一个独立主操作，和上方身份行割裂。设计预览同时给出 A / B / C 三种方案。
- **Decision：** 采用方案 B：身份列表与退出之间加 1px 分隔线；退出项为整行菜单项（15px 退出图标 + 「退出登录」），文字用 `--t-danger`，hover 背景为 9% 危险色；不使用边框。**用户于 2026-11-16 确认采用 B。**
- **Rejected：** A 全宽描边按钮（更像主操作，且与行式菜单不一致）；C 紧凑中性色（默认不够醒目，需 hover 才变红）；把退出做成当前身份行内的文字链接（演示身份没有当前账号摘要行，位置不稳定）。
- **Consequence：** 退出与「切换身份」同属身份生命周期，但通过分隔线与危险色保持可辨识；菜单高度约增加 1px（分隔线）而按钮高度与身份行一致（34px）。
- **备注：** 预览页保留 A/C 一键切换；若评审选择其它方案，只需改 `styles.css` 的 `.id-logout` 与分隔线，不动结构。

### D5 文案按身份类型区分，并新增失败提示键

- **Context：** 现有说明在登录态写「切换到演示身份会结束当前登录会话」，演示态写「演示身份无需密码」；退出入口对两类身份都出现后，说明需要同时解释退出与切换。
- **Decision：** 登录态说明：「退出登录会结束本机会话并回到身份门；切换到演示身份会结束当前登录。」演示态说明：「演示身份无需密码；退出登录只清除本机身份并回到身份门。」新增 `tripMessages.authLogoutWarning = '已退出本机，会话可能仍有效'`；退出按钮继续复用 `authLogout = '退出登录'`。
- **Rejected：** 用一个通用说明覆盖两类身份（无法解释注册账号的会话结束）；把提示文案写进组件（无法统一复用与测试）；改动 `authLogout`（会影响既有注册账号退出文案与测试）。
- **Consequence：** 文案只改菜单说明与新增失败键；`authLogout` 不变。

### D6 不新增后端、契约或迁移

- **Context：** `POST /api/auth/logout` 已存在（204），`AuthControllerTest` 已覆盖「退出后 token 被拒绝」与「缺少 Authorization 返回 401」；演示身份没有服务端会话。
- **Decision：** 注册账号退出复用既有端点；演示身份只清本地；`openapi.yaml`、`backend/**`、`db/migration/**` 不改。
- **Rejected：** 为演示身份新增「本地退出」端点（无服务端状态可改）；改 token 存储形态（超出范围）；新增会话列表或过期清理（out of scope）。
- **Consequence：** 后端测试只做回归；契约零 diff。

### D7 E2E 先行，选择器以角色与可访问名为主

- **Context：** 仓库还没有认证 E2E spec；现有 `companions` / `trips` / `experiences` 使用 `getByRole` 与少量类名。
- **Decision：** 新增 `e2e/tests/auth.spec.ts`，先写 7 个失败用例；退出按钮用 `getByRole('button', { name: '退出登录' })`，面板用 `getByRole('dialog', { name: '身份菜单' })`，身份选项用 `getByRole('option')`；演示身份「不发请求」用 `page.on('request')` 断言；token 失效用 `expect.poll`。
- **Rejected：** 只用 `.id-logout` 类名（结构一改就碎）；等待固定时间验证会话删除（不稳定）；把注册流程也放进退出用例（耦合注册表单，失败定位变差）。
- **Consequence：** 退出验收独立于注册界面；类名仅用于必要的结构断言。

## 2. 文件与改动面

```text
frontend/src/shell/AppShell.tsx   去掉退出入口的 isAuthenticated 门控；
                                  面板 role=dialog + 内层 listbox；
                                  分隔线 + 退出图标；按身份类型切换说明
frontend/src/App.tsx               logout() 捕获 token；失败时 message.warning；
                                   本地清理与回身份门保持同步
frontend/src/i18n/tripMessages.ts  新增 authLogoutWarning
frontend/src/styles.css            .id-divider；.id-logout 改为危险色菜单行
e2e/tests/auth.spec.ts             新增：入口可见、演示退出、注册退出、
                                   失败降级、刷新/返回、重新进入
```

**不改：** `openapi.yaml`、`backend/**`、`db/migration/**`、`openspec/specs/**`（Living Spec 由归档阶段合并）。

## 3. 交互与展示契约

| 状态 | 触发 | 结果 |
|---|---|---|
| 打开菜单（演示身份） | 点击顶栏身份胶囊 | 面板显示分组标签「选择身份」+ 3 个演示身份（当前项高亮）+ 分隔线 + 退出 |
| 打开菜单（注册账号） | 点击顶栏身份胶囊 | 面板显示当前账号摘要（含「已登录」）+ 「切换为演示身份」+ 3 个演示身份 + 分隔线 + 退出 |
| 点击退出（演示） | 退出菜单项 | 关闭菜单 → 清除 `routeme.currentUserId` → 回身份门；不发认证请求 |
| 点击退出（注册） | 退出菜单项 | 关闭菜单 → 异步结束服务端会话 → 清除 `authToken` / `currentUserId` → 回身份门 |
| 结束会话失败 | 退出（注册） | 本地状态仍清除并回身份门；`message.warning` 显示「已退出本机，会话可能仍有效」 |
| 身份门 | 未进入 / 刚退出 | 显示 3 个演示身份 + 登录 / 注册；不渲染顶栏，不存在退出入口 |
| 键盘 | Tab / Esc | 退出项可聚焦；Esc 关闭面板并把焦点还给触发按钮 |

**结构契约：**

```text
button.id-switch-btn[aria-haspopup="dialog"][aria-expanded]
  div.id-panel[role="dialog"][aria-label="身份菜单"]
    div.id-current                        (仅注册账号)
    p.id-panel-label#identity-options-label
    div[role="listbox"][aria-labelledby="identity-options-label"]
      button[role="option"][aria-selected]
    div.id-divider[role="separator"]
    button.id-logout                      文本「退出登录」+ 图标 aria-hidden
    p.id-panel-note
```

## 4. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 去掉 `isAuthenticated` 后误在身份门显示退出 | `AppShell` 仅在 `currentUser` 存在时挂载；身份门无顶栏。E2E E10 断言 |
| `message.warning` 受 ConfigProvider 上下文影响 | 仓库已有静态 `message` 使用先例；若出现主题告警，apply 阶段改用 `App.useApp()` 或页内轻提示，不改变验收 |
| 服务端会话删除是异步的，E2E 立即查 `/auth/me` 可能仍 200 | `expect.poll` 直到 401；不固定等待 |
| 分隔线与危险色在深色模式对比不足 | 使用 `--t-danger`（深色模式为 `#ff7f70`）；预览页已核对浅 / 深两套 |
| 菜单在 390px 下溢出 | 面板固定 258px、右对齐；390px 手工核对，必要时允许左右 8px 安全边距 |
| `role="dialog"` 非模态但用户期待焦点进入 | 保持点击外部 / Esc 关闭；不做焦点陷阱；Tab 顺序自然进入面板 |
| E2E 注册账号累积 | 唯一用户名 `logout_${Date.now()}`；不删除既有数据 |

## 5. 验证方式

| 检查 | 命令 / 方式 |
|---|---|
| 类型与构建 | `cd RouteME/frontend; npm run build` |
| 前端单测 | `cd RouteME/frontend; npm test` |
| 后端回归 | `cd RouteME/backend; .\mvnw.cmd -B test` |
| E2E | 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/auth.spec.ts` |
| 手工 | 1440 / 768 / 390；浅色 / 深色；Tab 到退出项、Esc 关闭；演示与注册两种身份 |
| 设计预览 | 直接打开 `preview/identity-menu.html`，切换身份 / 主题 / A-B-C 方案 |

## 6. 设计预览说明

`preview/identity-menu.html` 是评审辅助页面，不是生产代码，也不进入构建：

- 顶栏工具切换「演示身份 / 注册账号」「A 描边 / B 分隔行 / C 紧凑」「浅色 / 深色」。
- 勾选「模拟结束会话失败」后，在注册账号状态退出可看到非阻断提示。
- 退出后进入身份门视图，验证「身份门不展示退出入口」与刷新语义。
- 预览采用与 `styles.css` 相同的设计令牌与结构；B 为推荐方案。