# trip-plans 增量规格（add-ai-itinerary）

## ADDED Requirements

### Requirement: AI 行程保存为旅行计划

系统 SHALL 允许用户把确认后的 AI 行程保存为 RouteMe 旅行计划：「保存行程」MUST 以 AI 方案预填发布表单（标题、目的地、起止日期、途经点、兴趣标签、预算）并携带 `ai_itinerary_id` 创建状态为「招募中」的行程；`ai_itinerary_id` 为选填链接，后端 MUST 校验其存在且归属当前用户，非法链接以 400 拒绝；AI 来源行程 MUST 在详情页展示「AI 推荐」标识与天气 / 预算摘要；保存后的行程 MUST 出现在旅行灵感首页，供后续路线匹配与寻找同行者使用；既有发布约束（标题 / 日期 / 途经点 / 人数 / 预算区间等）MUST 全部保留，不携带链接的普通发布行为不变。

#### Scenario: AI 方案保存为招募中行程
- **Given** 用户已生成并确认一份 AI 方案（快照已保存）
- **When** 用户点击「保存行程」并确认预填的发布表单
- **Then** 系统创建状态为「招募中」的行程并携带 `ai_itinerary_id`
- **And** 页面跳转到该行程详情页

#### Scenario: 链接归属校验
- **Given** 调用方携带他人快照的 `ai_itinerary_id` 或不存在的 id 请求 `POST /api/trips`
- **When** 后端校验链接
- **Then** 返回 400 `INVALID_INPUT`
- **And** 不产生新行程

#### Scenario: 详情页展示 AI 来源标识与摘要
- **Given** 一条携带 `ai_itinerary_id` 的行程
- **When** 用户查看其详情页
- **Then** 详情页展示「AI 推荐」标识
- **And** 展示该快照的天气摘要与预算估算（标「AI 估算」）

#### Scenario: 保存后首页可见
- **Given** 用户刚把 AI 方案保存为行程
- **When** 用户回到旅行灵感首页
- **Then** 该行程出现在「招募中的行程」列表或按目的地筛选后的结果中

#### Scenario: 普通发布不受影响
- **Given** 用户不携带 `ai_itinerary_id` 发布行程
- **When** 发布成功
- **Then** 行程行为与既有口径一致，详情页不展示「AI 推荐」标识