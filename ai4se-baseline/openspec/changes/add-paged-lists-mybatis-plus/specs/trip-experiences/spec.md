# trip-experiences 增量规格

## MODIFIED Requirements

### Requirement: 灵感首页的旅行体验视图

首页「旅行体验」视图 SHALL 按页展示已结束行程的游后体验，并按更新时间倒序；体验卡片 MUST 展示作者、强度、正文与给后来者的建议，并提供查看原行程与参考发布入口。

#### Scenario: 体验视图默认页
- **Given** 存在多条游后体验
- **When** 用户切换到「旅行体验」视图
- **Then** 只渲染当前页的体验卡
- **And** 展示本次命中的总条数
- **And** 已结束行程的体验按更新时间倒序排列

#### Scenario: 体验分页与筛选并用
- **Given** 用户已设置关键词、目的地或兴趣条件
- **When** 用户翻页
- **Then** `total` 反映筛选后的命中数
- **And** 每页条目仍是筛选后的子集

#### Scenario: 筛选变化重置体验分页
- **Given** 用户停在体验视图的第 2 页
- **When** 用户修改任一筛选条件
- **Then** 体验列表从第 1 页重新查询

#### Scenario: 空结果
- **Given** 筛选后没有体验命中
- **When** 用户查看体验视图
- **Then** 展示空状态说明与清除条件入口
- **And** 不展示分页控件

## ADDED Requirements

### Requirement: 体验列表分页参数

`GET /api/experiences` SHALL 接受与行程列表一致的 `page` 与 `size` 参数，并 MUST 返回同一形状的分页对象；非法参数 MUST 返回 400 `INVALID_INPUT`。

#### Scenario: 体验列表分页
- **Given** 命中 12 条体验
- **When** 调用方请求 `page=2&size=5`
- **Then** `items` 长度为 5、`page = 2`、`total = 12`、`total_pages = 3`

#### Scenario: 体验列表非法分页参数
- **Given** 调用方传入 `size=0`
- **When** 系统解析请求
- **Then** 返回 400 与 `INVALID_INPUT`