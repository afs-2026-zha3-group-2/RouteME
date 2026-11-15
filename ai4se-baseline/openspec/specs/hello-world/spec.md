# hello-world Specification

## Purpose
TBD - created by archiving change bootstrap-hello-world. Update Purpose after archive.

## Requirements

### Requirement: 首页展示来自数据库的问候语

RouteME 首页 SHALL 展示一条问候语文本；文本 MUST 来自 SQLite 数据库中的 `greetings` 表，不得在前端硬编码。

#### Scenario: 后端启动后自动建库并写入问候语
- **Given** 仓库中不存在 `backend/data/routeme.db`
- **When** 启动后端
- **Then** Flyway 依次应用 `V1__create_greetings.sql` 与 `V2__seed_greeting.sql`
- **And** `greetings` 表中恰有一条 `message = 'Hello World'` 的记录

#### Scenario: 读取问候语接口返回成功
- **Given** 后端已启动且迁移完成
- **When** 请求 `GET /api/greeting`
- **Then** 返回 `200`
- **And** 响应体为 `{"id": 1, "message": "Hello World"}`

#### Scenario: 问候语未写入时返回契约错误码
- **Given** `greetings` 表为空
- **When** 请求 `GET /api/greeting`
- **Then** 返回 `404`
- **And** 响应体为 `{"code": "GREETING_NOT_FOUND"}`

#### Scenario: 首页展示接口返回的文本
- **Given** 后端已启动，前端 dev server 正在代理 `/api`
- **When** 打开首页
- **Then** 页面显示的问候语文本等于接口返回的 `message`

### Requirement: 脚手架可在 CI 中独立验证

后端与前端 SHALL 各自提供可在 CI 中执行的验证命令，数据库相关测试 MUST 不依赖外部数据库服务。

#### Scenario: 后端验证使用 H2
- **Given** CI 环境没有 SQLite 之外的数据库服务
- **When** 执行 `./mvnw -B verify`
- **Then** 接口测试使用 H2 内存库并通过
- **And** SQLite 直连迁移测试使用临时文件库并通过

#### Scenario: 前端验证不依赖后端
- **Given** 后端未启动
- **When** 依次执行 `npm run build` 与 `npm test`
- **Then** 两条命令均通过
