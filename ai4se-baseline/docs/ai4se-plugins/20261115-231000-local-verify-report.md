# 本地验证报告：add-paged-lists-mybatis-plus

- **日期：** 2026-11-15
- **范围：** 后端持久层（MyBatis-Plus）、三个列表端点分页、前端分页控件与「我的旅行 / 详情页」布局修复
- **环境：** Windows / Spring Boot 4.1.2（Java 21）/ MyBatis-Plus 3.5.18 / Vite 8 / SQLite 运行时 + H2 测试

## 1. 后端测试

```text
cd RouteME/backend
.\mvnw.cmd -B test
```

```text
Tests run: 139, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

- 新增：`TripControllerTest`（分页窗口、越界页、`page=0`/`size=51` → 400）、`MatchControllerTest`（`size=1` 切页与 `size=51`）、`ExperienceControllerTest`（`page=2&size=1`、`size=0`）、`GreetingMapperSqliteTest`（临时 SQLite 文件库 + MyBatis-Plus 映射）。
- 迁移影响：`dao` 测试改名为 `repository/*RepositoryTest`（仍通过端口断言），三个迁移测试移入 `routeme.migration`。

## 2. 契约

```text
cd RouteME
npx @redocly/cli lint openapi.yaml
```

```text
openapi.yaml: validated in 50ms
Woohoo! Your API description is valid. 🎉
You have 6 warnings.
```

- 0 error；warning 为既有示例级提示。

## 3. 前端

```text
cd RouteME/frontend
npm run build   → BUILD_EXIT=0
npm test        → Test Files 7 passed (7) / Tests 47 passed (47)
```

- 新增 `shell/paging.test.ts`：`pageWindow` 短列表、中间页折叠、首尾窗口、无页（0 / NaN）。

## 4. 运行时接口（真实 SQLite 数据，X-User-Id=1）

| 请求 | 结果 |
|---|---|
| `GET /api/matches?page=1&size=5` | `items=5, page=1, size=5, total=32, total_pages=7` |
| `GET /api/matches?page=2&size=5` | 返回第二批（首条与第 1 页不同） |
| `GET /api/experiences?page=1&size=3` | `items=3, total=9, total_pages=3` |
| `GET /api/trips?size=51` | HTTP 400 |

## 5. 浏览器几何检查

视口 1440 / 1024 / 768 / 390，路由 `#/`、`#/mine`、`#/trips/1`，共 12 组：

| 检查 | 结果 |
|---|---|
| `documentElement.scrollWidth` ≤ 视口 | 全部满足（1430 / 1014 / 758 / 380） |
| 未被 `overflow: hidden` 容器裁剪的溢出元素 | 0 |
| 首页分页条 | 四档视口均存在；1440 下「共 32 条 / 1 / 2 / 每页 20 条」 |
| 我的旅行行宽度 | 1440：行 1120、卡片 1059、操作 47，三者同行不重叠 |
| 我的旅行分页 | 该页为聚合列表，无分页控件（符合设计） |
| 390 下的选项卡 | 四个选项卡全部可见（换行展示），点击「已完成」后渲染 17 行 |
| 390 下的行布局 | 行宽 352，操作区在卡片下方（`top` 大于卡片底部） |
| 详情页分区 | 五个 `.detail-section`，间距 16px，无区块重叠；「发表游后体验」位于体验区操作行 |

## 6. 未执行

- `cd RouteME/e2e; npx playwright test`：E2E 依赖本地真实数据且不在 CI 内；本次仅把卡片选择器由 `.trip-card-link` 更新为 `.trip-card`。
- 并发写入下的 id 唯一性验证：仍为演示用 `MAX(id)+1`。

## 结论

后端 139 项、前端 47 项测试全绿，契约 lint 0 error；分页在数据库（`/trips`、`/experiences`）与应用层（`/matches`）按设计生效，四档视口无溢出、无重叠，卡片与操作区对齐。残余风险见 `summary.md`。