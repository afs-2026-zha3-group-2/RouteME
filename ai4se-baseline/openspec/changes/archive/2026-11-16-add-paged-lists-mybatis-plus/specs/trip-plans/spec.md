# trip-plans 增量规格

## MODIFIED Requirements

### Requirement: 浏览未结束的旅行计划

系统 SHALL 在旅行灵感首页按页列出未结束（招募中或已满员）的公开行程，并以卡片展示理解一条行程所需的信息；已结束与已取消行程 MUST NOT 出现在该列表。

#### Scenario: 默认列表与卡片信息
- **Given** 数据中存在多条未结束的公开行程
- **When** 用户进入旅行灵感首页
- **Then** 系统以卡片列出当前页的行程
- **And** 每张卡片展示标题、目的地、起止日期、途经点摘要、兴趣标签、发布者昵称、已加入人数 / 计划人数与状态文字
- **And** 状态不以颜色作为唯一表达方式

#### Scenario: 已结束与已取消行程不出现在默认列表
- **Given** 数据中存在已结束或已取消的行程
- **When** 用户查看旅行灵感首页的默认列表
- **Then** 这些行程不出现在列表中

#### Scenario: 加载中展示骨架
- **Given** 首页数据尚未返回
- **When** 页面正在加载
- **Then** 系统展示骨架或加载态，而不是空白页

#### Scenario: 无结果时展示空状态并保留条件
- **Given** 用户已设置筛选条件
- **When** 没有任何行程满足条件
- **Then** 系统展示可读的空状态与「去发布行程」引导
- **And** 已设置的筛选条件仍然可见、可清除

#### Scenario: 分页浏览
- **Given** 未结束行程总数大于一页容量
- **When** 用户查看首页列表
- **Then** 只渲染当前页的卡片，并展示总条数与总页数
- **And** 用户可切换到上一页、下一页或指定页码
- **And** 翻页后列表回到页面顶部

#### Scenario: 筛选变化重置分页
- **Given** 用户停在第 3 页
- **When** 用户修改关键词、目的地、日期区间、兴趣或排序
- **Then** 列表从第 1 页重新查询
- **And** 已应用条件的摘要仍然可见

## ADDED Requirements

### Requirement: 列表分页参数与响应

`GET /api/trips` 与 `GET /api/matches` SHALL 接受 `page`（从 1 起，默认 1）与 `size`（默认 20，最大 50），并 MUST 返回分页对象 `{ items, page, size, total, total_pages }`。

#### Scenario: 默认分页
- **Given** 未结束行程多于 20 条
- **When** 调用方不传分页参数
- **Then** 返回 `page = 1`、`size = 20`、`items` 长度 20
- **And** `total` 等于命中总数，`total_pages` 等于向上取整的页数

#### Scenario: 指定页与容量
- **Given** 命中总数为 23
- **When** 调用方请求 `page=3&size=10`
- **Then** `items` 长度为 3、`page = 3`、`total = 23`、`total_pages = 3`

#### Scenario: 超出末页
- **Given** 命中总数为 23
- **When** 调用方请求 `page=9&size=10`
- **Then** `items` 为空数组
- **And** `total` 与 `total_pages` 仍为真实值

#### Scenario: 非法分页参数
- **Given** 调用方传入 `page=0`、负值或 `size=51`
- **When** 系统解析请求
- **Then** 返回 400 与 `INVALID_INPUT`
- **And** 不执行列表查询

#### Scenario: 分页与筛选并用
- **Given** 调用方同时给出筛选条件与分页参数
- **Then** `total` 反映筛选后的命中数，而不是全量行程数
- **And** 页内条目按既有排序规则有序