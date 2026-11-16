# 任务：remove-home-greeting-note

- **依据：** [`proposal.md`](proposal.md)、[`specs/hello-world/spec.md`](specs/hello-world/spec.md)
- **Owner：** AO
- **契约：** 不变（`openapi.yaml` 仍为 0.7.0，`GET /api/greeting` 与 `Greeting` schema 原样保留）
- **迁移：** 无新增；`V1__create_greetings.sql`、`V2__seed_greeting.sql` 与既有后端测试全部保留
- **边界：** 只摘前端展示端；不动首页问候横幅、筛选、分页，不回退他人未提交内容

## 任务清单

### T1 [frontend] 摘除问候语旁注

- [x] `home/HomePage.tsx`：删除底部 `<ConnectivityNote />` 与其组件定义，移除 `useGreeting` 导入与 antd `Typography` 导入；`greetingForHour` 横幅保留。
- [x] 删除不再被引用的 `home/useGreeting.ts`。
- [x] `api.ts`：删除 `loadGreeting` 与 `Greeting` 类型导入。
- [x] `types.ts`：删除 `Greeting` 类型。
- [x] `i18n/tripMessages.ts`：删除 `connectivityLabel`。
- [x] `styles.css`：删除 `.connectivity-note`。
- [x] `api.test.ts`：删除 `loadGreeting` 的两个用例与对应导入。

**验证：** `cd RouteME/frontend; npm run typecheck; npm test; npm run build`

### T2 [spec] 规格与提案

- [x] `specs/hello-world/spec.md`：REMOVED 原「首页展示来自数据库的问候语」，ADDED「问候语能力保留在后端，首页不再展示」，迁移数据库 / 接口两个场景并新增「首页不再展示问候语」。
- [x] `proposal.md`：写明只删展示端、不动契约与后端。

**验证：** 增量规格的模块名、需求名与 `openspec/specs/hello-world/spec.md` 可对齐；`hello-world` 其余需求（CI 独立验证）不受影响。

### T3 [verify] 页面与回归

- [x] 用临时账号打开首页并滚动到底部截图，确认「后端问候语」这一行消失、页面无空白塌陷。
- [x] 浅色 / 深色各截一次首页，确认侧栏底色与布局不回归。
- [x] `npm test` 由 139 项降为 137 项（删除的 `loadGreeting` 两个用例），无其它失败。

**验证：** 截图核对 + `npm run typecheck` / `npm test` / `npm run build` 全绿

## 覆盖

| 场景 | 证据 |
| --- | --- |
| 后端启动后自动建库并写入问候语 | `V1__create_greetings.sql`、`V2__seed_greeting.sql`、`GreetingMapperSqliteTest` |
| 读取问候语接口返回成功 | `GreetingControllerTest`、`OpenApiTest`、`/api/greeting` |
| 问候语未写入时返回契约错误码 | `GreetingControllerTest`（404 `GREETING_NOT_FOUND`） |
| 首页不再展示问候语 | 首页截图 + 源码中已无 `ConnectivityNote` / `loadGreeting` 引用 |

## 对齐自检

| 检查 | Result | Evidence |
| --- | --- | --- |
| Spec ↔ Tasks | 通过 | 增量规格的 4 个场景逐条对应 T1 / T2 / T3 |
| 契约不变 | 通过 | `openapi.yaml` 未修改，`Greeting` schema 与 `/api/greeting` 保留 |
| 测试覆盖 | 通过 | 后端 3 个问候语测试不动；前端删除 2 个仅服务于已删组件的用例 |
| 死代码清理 | 通过 | `useGreeting.ts` 删除；`loadGreeting` / `Greeting` / `connectivityLabel` / `.connectivity-note` 全仓无残留 |
| 越界检查 | 通过 | 首页横幅、筛选、分页与侧栏样式未改 |