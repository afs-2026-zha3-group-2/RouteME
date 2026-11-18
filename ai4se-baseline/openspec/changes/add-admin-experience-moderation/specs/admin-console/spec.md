# admin-console 增量规格（add-admin-experience-moderation）

## ADDED Requirements

### Requirement: 管理员前台导航范围

管理员（`role=ADMIN`）的前台侧栏与底部导航 SHALL 只保留「旅行灵感」「旅行地图」「发布行程」「AI 规划」，以及管理入口「管理后台」「帮助与反馈」。管理员 MUST NOT 看到「我的旅行」「同行消息」「联系客服」，账号菜单与窄屏悬浮客服入口也 MUST NOT 向管理员展示。

#### Scenario: 管理员侧栏
- **Given** 当前账号 `role=ADMIN`
- **When** 打开任意前台页面
- **Then** 侧栏出现「旅行灵感 / 旅行地图 / 发布行程 / AI 规划 / 管理后台 / 帮助与反馈」
- **And** 不出现「我的旅行 / 同行消息 / 联系客服」

#### Scenario: 管理员窄屏入口
- **Given** 视口宽度不超过 900px 的管理员
- **Then** 页面不渲染悬浮客服入口

### Requirement: 管理员删除任意旅行灵感

系统 SHALL 提供管理员删除任意旅行灵感的端点 `DELETE /api/admin/experiences/{experienceId}`。删除 MUST 同步清理该体验的图片行与点赞行，并在事务提交后删除图片文件；管理员 MUST 能在首页体验卡上二次确认后触发删除，删除后列表 MUST 立即刷新。非管理员调用 MUST 返回 403 `ADMIN_REQUIRED`；体验不存在 MUST 返回 404 `EXPERIENCE_NOT_FOUND`。

#### Scenario: 管理员从首页删除
- **Given** 管理员打开「旅行灵感」列表
- **When** 点击某条体验的「删除」并确认
- **Then** 该体验从列表消失，并提示「已删除该旅行灵感」
- **And** 该体验的图片与点赞记录一并被清理

#### Scenario: 普通用户无删除入口
- **Given** 普通用户打开「旅行灵感」列表
- **Then** 体验卡上不出现「删除」按钮
- **And** 直接调用删除端点返回 403

#### Scenario: 体验不存在
- **Given** 管理员持有有效 token
- **When** 删除一个不存在的体验 id
- **Then** 返回 404 `EXPERIENCE_NOT_FOUND`
