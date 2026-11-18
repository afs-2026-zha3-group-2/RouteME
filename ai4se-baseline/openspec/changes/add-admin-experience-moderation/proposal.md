# 变更提案：add-admin-experience-moderation

- **需求来源：** 用户验收反馈（2026-11-17）「对于管理员，可以删除所有的旅行灵感内容，也可以发布行程和 AI 规划，但是没有我的旅行、同行消息和联系客服」｜ **归属：** REQ-018 管理后台能力扩展（不新增需求编号）
- **能力：** `admin-console`（ADDED Requirements：管理员前台导航范围 + 删除任意旅行灵感）
- **规模：** S（1 个管理端点 + 契约 1 条 + 首页卡片删除入口 + 导航按角色过滤 + 2 份 E2E）
- **规则：** `@rule:spec-first`、`@rule:api-contract`、`@rule:web-coding-style`、`@rule:tdd-cycle`
- **本回合状态：** P4 已实现并通过门禁（后端 `verify` 601/601；前端 `typecheck` + 446 tests + `build`；Redocly 0 error / 25 warning；E2E 受影响 24/24）。

## 问题

- **管理端没有内容治理入口。** 首页「旅行灵感」只有点赞、详情、参考发布三个动作；`trip_experiences` 没有删除接口，管理员遇到违规或过期的体验只能进数据库删，且外键没有级联（图片行、点赞行、图片文件都要手动清）。
- **管理员看到整套用户导航。** 「我的旅行」「同行消息」「联系客服」对内部账号没有意义；管理员应当只保留浏览、发布与 AI 规划，以及后台入口。

## 范围

**In scope**

- **导航按角色过滤**：`role=ADMIN` 的侧栏与底部导航隐藏「我的旅行」「同行消息」「联系客服」；账号菜单与窄屏悬浮客服入口对管理员隐藏；保留「旅行灵感 / 旅行地图 / 发布行程 / AI 规划」与「管理（管理后台 / 帮助与反馈）」。
- **删除旅行灵感**：首页体验卡对管理员显示危险色「删除」按钮，二次确认后调用 `DELETE /api/admin/experiences/{experienceId}`；后端校验管理员、清理图片行与点赞行、删除主体，图片文件在事务提交后删除。
- **契约**：`openapi.yaml` 新增 `/admin/experiences/{experienceId}`（204 / 401 / 403 / 404 / 500），`OpenApiTest` 锁定。
- **测试**：后端 `AdminExperienceDeleteApiTest`（删除与子表清理 / 普通用户 403 / 404）；E2E 管理员删除、普通用户无入口且接口 403；E2E 管理员导航断言。

**Out of scope**

- 批量「一键清空」全部旅行灵感（当前按条目删除；如需批量另开）。
- 删除审核流程、回收站、软删除与恢复。
- 删除行程 / 删除用户内容之外的其它管理能力。
- 普通用户删除自己的体验（未在本次需求内）。

## 影响面

- 后端：`AdminExperienceController`（新增）、`ExperienceService.delete`、`ExperienceServiceImpl`（子表清理 + 文件延迟删除）、`ExperienceLikeMapper.deleteByExperience`。
- 契约：`openapi.yaml` + `OpenApiTest`。
- 前端：`AppShell`（按角色过滤导航）、`HomePage`（token + 删除处理）、`ExperienceCard`（管理员删除按钮 + `Modal.confirm`）、`api.ts`、`adminMessages`、`styles.css`。
- 迁移：无（仅清理既有表数据，不改结构）。
