# P4 记录：add-admin-experience-moderation

- **Change：** `add-admin-experience-moderation`（REQ-018 管理后台能力扩展）｜ **阶段：** P4（apply）
- **日期：** 2026-11-17
- **能力：** `admin-console`（ADDED 2 Requirement / 5 Scenario，`openspec validate --strict` valid）
- **迁移：** 无（仅清理既有表数据，V1–V27 不变）

## 1. 用户裁决

> 对于管理员，可以删除所有的旅行灵感内容，也可以发布行程和 AI 规划，但是没有我的旅行、同行消息和联系客服。

## 2. 落地

| 面 | 处置 |
|---|---|
| 导航 | `AppShell` 按角色过滤：管理员只保留 旅行灵感 / 旅行地图 / 发布行程 / AI 规划 + 管理（管理后台 / 帮助与反馈）；账号菜单与窄屏悬浮客服入口对管理员隐藏 |
| 删除入口 | 首页「旅行灵感」体验卡对管理员显示危险色「删除」按钮；`Modal.confirm` 二次确认（图片与点赞会一并清除，不可恢复） |
| 删除端点 | `DELETE /api/admin/experiences/{experienceId}` → 204；`AdminPrincipalService.requireAdmin` 校验；404 `EXPERIENCE_NOT_FOUND` |
| 子表清理 | 外键无级联：先删 `trip_experience_photos` 行与 `experience_likes` 行，再删 `trip_experiences` 主体；图片文件在事务提交后删除 |
| 契约 | `openapi.yaml` 新增该路径（204 / 401 / 403 / 404 / 500），`OpenApiTest` 锁定 operationId / 参数 / 状态码 |
| 前端 | `api.deleteAdminExperience`；`HomePage` 删除后 `reload()` 并提示「已删除该旅行灵感」；`.exp-admin-delete` 用危险色、复用现有色板 |

## 3. 权限与安全

- 前端隐藏按钮只是体验层；服务端 `requireAdmin` 才是边界（普通用户直接调接口 403 `ADMIN_REQUIRED`）。
- 删除为物理删除，无回收站；二次确认文案明确「不可恢复」。
- 删除范围仅限体验本体及其图片 / 点赞；行程、作者、发布者账号不受影响。

## 4. 门禁

| 门禁 | 结果 |
|---|---|
| 后端新增测试 | `AdminExperienceDeleteApiTest` **3/3**（删除 + 子表清理 / 普通用户 403 / 404） |
| 后端 `mvnw -B -ntp verify` | **601/601**，BUILD SUCCESS |
| 契约 `OpenApiTest` | **18/18** |
| 前端 `typecheck` / `npm test` / `build` | 通过 / **446/446（56 文件）** / 通过 |
| Redocly | **0 error / 25 warning** |
| E2E | `admin` 11/11 + `experiences` 11/11 + `customer-service` 2/2 = **24/24 绿** |

## 5. 未签项

- **G2（VL）未签署，本记录不代签。**
