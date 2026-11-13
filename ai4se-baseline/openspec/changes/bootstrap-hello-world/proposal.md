# 变更提案：bootstrap-hello-world

## 问题

RouteME 还没有可运行的应用骨架。REQ-001 要求用一个最小页面验证「React → Spring Boot → SQLite → Flyway」整条链路，先确认前后端、数据库与 CI 能跑通，再谈业务功能。

## 范围

**In scope**

- 后端骨架：Spring Boot 4.1.2 + Java 21 + Maven Wrapper，按 `routeme/<layer>` 分层。
- 运行时数据库：SQLite 文件库，Flyway 管理 `greetings` 表结构与种子数据。
- 契约：`openapi.yaml` 定义 `GET /api/greeting`。
- 前端骨架：React 19 + TypeScript + Vite 8，UI 组件库 Ant Design。
- 测试：后端 JUnit 6 + H2，前端 Vitest 纯函数测试。
- CI：GitHub Actions 跑后端测试与前端构建/测试。

**Out of scope**

- 用户与权限、问候语管理界面（见 REQ-001 非目标）。
- 图表渲染：本次没有图表需求，ECharts 只作为后续选型记录，不引入空依赖。
- Playwright 端到端：本次以接口测试与组件外的纯函数测试覆盖，端到端在首个真实业务页面时落地。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/openapi.yaml` | 新增契约（v0.1.0） |
| `RouteME/backend/` | 新建 Spring Boot 工程、迁移脚本、分层实现与测试 |
| `RouteME/frontend/` | 新建 Vite 工程、请求层、首页与测试 |
| `.github/workflows/ci.yml` | 新增后端与前端两个 job |
| `docs/knowledge/` | 回写 RouteME 应用拓扑与本地启动说明 |

## Spec ID

`bootstrap-hello-world`，增量规格见 `specs/hello-world/spec.md`。
