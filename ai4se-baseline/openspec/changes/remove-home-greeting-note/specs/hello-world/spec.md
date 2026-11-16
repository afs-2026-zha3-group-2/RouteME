# hello-world 增量规格（remove-home-greeting-note）

## REMOVED Requirements

### Requirement: 首页展示来自数据库的问候语

**Reason**: 首页已演进为旅行灵感首页，底部「后端问候语：Hello World」是脚手架旁注，对用户没有价值，且把实现细节暴露在产品界面里。VL 明确要求移除这一行。

**Migration**: 数据库播种、`GET /api/greeting` 成功与 `GREETING_NOT_FOUND` 三个场景原样迁入新需求块「问候语能力保留在后端，首页不再展示」；原「首页展示接口返回的文本」场景不再保留（有意删除，非漏迁移），验收证据改由后端 `GreetingControllerTest`、`GreetingServiceTest`、`GreetingMapperSqliteTest` 承担。

## ADDED Requirements

### Requirement: 问候语能力保留在后端，首页不再展示

后端 SHALL 继续从 SQLite 的 `greetings` 表读取问候语，并通过 `GET /api/greeting` 暴露；数据库播种、接口成功与契约错误码的行为 MUST 保持不变。前端首页 MUST NOT 展示问候语文本或任何脚手架旁注，MUST NOT 为展示问候语而请求 `GET /api/greeting`。

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

#### Scenario: 首页不再展示问候语
- **Given** 后端已启动，前端 dev server 正在代理 `/api`
- **When** 打开首页并滚动到页面末尾
- **Then** 页面不出现接口返回的 `message` 文本
- **And** 页面不出现「后端问候语」旁注
- **And** 首页的问候横幅、筛选与列表布局保持不变