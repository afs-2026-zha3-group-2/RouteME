> ⚠️ **已作废 / OBSOLETE（2026-11-15）** — 本文接口契约（projects / demands / candidates / recommendations / notifications 端点、候选池分页导入导出、人员统计、邮件通知契约）针对**已移除的 "staffing" 应用**，与当前唯一应用 **RouteME 路觅** 无关。RouteME 的接口契约（属 dev P2）尚未编写。
> 保留仅作历史参考，**不得作为 RouteME 的接口证据**。`_LOG.md` 与 `rules/` 不受影响。

# Interfaces knowledge

API、事件与集成契约。字段一律 snake_case；时间字段为 RFC3339 UTC；错误响应只返回 `code`。

## REST 面

机器可读契约以 `openapi.yaml` 为准，`npm run lint:api` 必须通过。按能力分组：

| 能力 | 端点 |
|---|---|
| 身份 / 字典 | `GET /me`、`GET /enums`、`GET /health` |
| 项目与需求 | `GET/POST /projects`、`GET/POST /demands`、`GET/PATCH /demands/{id}`、`POST /demands/{id}/publish`、`POST /demands/{id}/close` |
| 名单与计数 | `GET /demands/{id}/summary`、`GET /demands/{id}/roster`（分页）、`GET /demands/{id}/roster/export` |
| 候选池 | `GET /candidates`（分页）、`POST /candidates`、`PUT /candidates/{id}`、`POST /candidates/{id}/deactivate`、`POST /candidates/{id}/restore`、`POST /candidates/{id}/travel-review`、`GET /candidates/import-template`、`POST /candidates/import`、`GET /candidates/export` |
| 人员统计 | `GET /reports/headcount`（只读） |
| 筛选与答复 | `GET /demands/{id}/screening`、`POST /demands/{id}/answers` |
| 推荐与终审 | `GET/POST /recommendations`、`POST /recommendations/{id}/confirm`、`POST /recommendations/{id}/reject`、`POST /recommendations/{id}/withdraw`、`POST /recommendations/{id}/release-request`、`POST /recommendations/{id}/release` |
| 通知 | `GET /notifications`、`POST /notifications/{id}/retry`、`POST /notifications/review-reminders/scan` |

身份当前为 `X-User-Id` 演示桩，生产环境必须替换为真实认证；权限判定在服务层，UI 只做隐藏。

## 候选池分页与导入导出契约

- 分页：`GET /candidates` 与 `GET /demands/{id}/roster` 返回 `{items, total, page, size}`。`page` 从 1 开始；`size` 只允许 20 / 50 / 100（默认 20）；非法参数返回 400 `INVALID_INPUT`。
- 筛选：`name`（去空白后大小写不敏感包含）、`role`（wire value）、`include_inactive`（默认 false）。响应不再返回裸数组。
- 导入：`GET /candidates/import-template?format=csv|xlsx` 下载模板（CSV 带 UTF-8 BOM，XLSX 单 sheet）；`POST /candidates/import`（multipart `file`）按人员编号 upsert，返回 `{created, updated, failed, failures[{row_number, column, reason}]}`。文件级校验失败返回 422，整份拒绝且不写入。
- 导出：`GET /candidates/export?format=csv|xlsx&name&role&include_inactive`，跟随筛选并覆盖全部命中行；列与导入模板同源，无命中时仅表头；资源协调员与项目负责人均可调用。
- 名单导出：`GET /demands/{id}/roster/export?format=csv|xlsx`，按当前需求范围与现有可见范围导出全部已确认行；列为姓名、岗位角色、职级、技能摘要、到岗时间与确认时间，无名单时仅表头；越权返回 403 `NOT_PROJECT_OWNER`。
- 人员编号：新建必填、去空白后全库唯一、保存后不可改；导入保留原编号，更新不改变档案状态与复审日期（导入忽略档案状态列）。
- 导入 / 导出不触发邮件通知；名单（roster）不提供导入或增删端点。

## 人员统计契约

- `GET /reports/headcount` 返回 `{total, by_role[{key, count, percentage}], by_level[{key, count, percentage}]}`；`key` 为岗位角色或职级的 wire value。
- 统计总体为候选池 `status = active` 的候选人；停用人员不计入；响应不含姓名、手机、邮箱等 PII。
- `percentage` = 人数 / 在职总数 × 100，保留一位小数（`HALF_UP`）；人数为 0 的类别不返回；`total = 0` 时两个列表为空。
- 资源协调员与项目负责人均可只读访问；端点无写方法，页面无导入 / 导出 / 编辑入口。

## 邮件通知契约

邮件由事务内的 Outbox（`notifications` 表）驱动，业务操作与发送结果解耦。

| 类型 | 触发 | 收件人 | 必含 payload |
|---|---|---|---|
| `recommendation_submitted` | 提交推荐 | 项目负责人 | `project`、`role`、`candidate`、`submittedBy`、`link`；跨角色时加 `crossRole` |
| `rejected` | 驳回推荐 | 负责协调员 | `project`、`role`、`candidate`、`rejectionReason`、`decidedBy` |
| `demand_changed` | 发布后编辑需求 | 负责协调员 | `project`、`role`、`summary` |
| `confirmed` | 终审确认 | 负责协调员 | `project`、`role`、`candidate`、`decidedBy` |
| `release_requested` | 协调员发起释放 | 项目负责人 | `project`、`role`、`candidate`、`requestedBy`；可选 `reason` |
| `released` | 负责人确认释放 | 负责协调员 | `project`、`role`、`candidate`、`releasedBy` |
| `review_reminder` | 复审到期前 30 天 | 全体资源协调员 | `candidate`、`dueDate`、`note` |

- 评分只存在于筛选结果与推荐/终审详情；邮件 payload **不得**出现 `score`、`threshold`、`breakdown` 等评分字段。
- 状态只有 `sent` 与 `failed`；失败时写入 `error` 摘要，不阻断业务，可在通知页重试。
- 通知内容只做摘要，完整业务以接口读取为准；幂等键为“事件 + 业务对象”。
