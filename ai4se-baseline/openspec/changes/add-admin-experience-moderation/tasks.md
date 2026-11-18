# 任务清单：add-admin-experience-moderation

## T1 [backend] 删除端点与子表清理

- [x] `AdminExperienceController`：`DELETE /api/admin/experiences/{experienceId}`，`AdminPrincipalService.requireAdmin` 兜底，成功 204。
- [x] `ExperienceService.delete` + `ExperienceServiceImpl`：先删图片行、点赞行，再删主体；图片文件在事务提交后删除（外键无级联）。
- [x] `ExperienceLikeMapper.deleteByExperience`。

**验证：** `AdminExperienceDeleteApiTest` 3/3；全量 `verify` 601/601。

## T2 [contract] 契约与断言

- [x] `openapi.yaml`：新增 `/admin/experiences/{experienceId}`（204 / 401 / 403 / 404 / 500）。
- [x] `OpenApiTest`：新增 `in_openApiFile_out_adminExperienceDeleteDeclared`，锁定 operationId、参数与状态码。

**验证：** `OpenApiTest` 18/18；Redocly 0 error / 25 warning。

## T3 [frontend] 管理员导航与删除入口

- [x] `AppShell`：管理员隐藏「我的旅行 / 同行消息 / 联系客服」，账号菜单与悬浮客服入口同步隐藏；保留浏览、发布、AI 规划与管理组。
- [x] `HomePage` + `ExperienceCard`：管理员在体验卡看到危险色「删除」按钮，`Modal.confirm` 二次确认后调用删除，成功后提示并刷新列表。
- [x] `api.ts` 新增 `deleteAdminExperience`；`adminMessages` / `styles.css` 补齐文案与样式（深浅色复用现有令牌）。

**验证：** `npm run typecheck`、`npm test`（446/446，56 文件）、`npm run build`。

## T4 [e2e] 端到端

- [x] `experiences.spec.ts`：新增「管理员删除任意旅行灵感」——普通用户无删除按钮；管理员二次确认后卡片消失；接口普通用户 403。
- [x] `admin.spec.ts`：新增 `[M6]` 管理员导航断言（保留旅行灵感 / 发布 / AI 规划 / 管理后台 / 帮助与反馈，隐藏我的旅行 / 同行消息 / 联系客服 / 悬浮客服）。

**验证：** `admin` + `experiences` + `customer-service` 合计 **24/24 绿**。

## T5 [docs] 记录

- [x] 本提案与 Delta；`docs/sdd/add-admin-experience-moderation/p4-apply.md`。

## 对齐自检

| 检查项 | 结论 |
|---|---|
| 管理员权限边界 | Pass：删除由 `requireAdmin` 服务端校验，前端隐藏只是体验层 |
| 外键清理 | Pass：图片行 / 点赞行先删，主体后删；文件延迟到提交后 |
| 迁移 | Pass：无结构变更，V1–V27 不变 |
| 归档顺序 | 需排在 `add-admin-console` 之后（同一 `admin-console` 能力） |
| 未签项 | G2（VL）不代签 |
