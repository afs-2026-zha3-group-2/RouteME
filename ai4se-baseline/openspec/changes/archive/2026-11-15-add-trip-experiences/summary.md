# Change summary — add-trip-experiences

## Intent

REQ-004：收口「灵感 → 发布 → 同行 → 旅行 → 分享 → 新灵感」闭环。让完成旅行的用户对「已结束且自己参加过」的行程发布文字体验（真实感受、路线强度、一条建议），展示在原计划详情页与灵感首页的「旅行体验」视图，并让其他用户「参考此行程发布」把体验转化为新计划。

## What shipped

- **契约**：`openapi.yaml` 升至 `0.4.0`，新增 `GET /experiences`、`GET /trips/{tripId}/experiences`、`POST /trips/{tripId}/experiences`、`GET /me/experiences` 与 `Experience`、`ExperienceWriteRequest` schema；错误码新增 `EXPERIENCE_NOT_ALLOWED`(403)。
- **数据**：`V8__create_trip_experiences.sql`，`UNIQUE(trip_id, author_id)`；2 条种子对齐原型（trip 1 → user 2 `MODERATE`，trip 2 → user 3 `TIRING`）。
- **后端**：`TripExperience`/`ExperienceIntensity`（trim、10–400、建议 1–120、三档强度）、`TripExperienceRepository` 与行对象、`ExperienceService`（复用 `ApplicationService.participants` 判资格、`(trip, author)` upsert、关键词/目的地/标签筛选、`updated_at` 倒序）、`ExperienceController` 四端点（首次 201 / 更新 200）。
- **前端**：`ShareExperiencePage`（感受、强度、建议、隐私提示、无资格提示）、`experienceForm` 校验纯函数、首页「旅行计划 / 旅行体验」视图切换与体验卡（内置封面、强度、摘要、建议、参考发布）、详情页游后体验区与发表/修改入口、`TripCreatePage` 的 `?from=` 预填（清空标题/日期/人数/集合/说明）、我的旅行「已完成」已分享标记与入口。
- **测试**：后端 132（API/领域/服务/SQLite 迁移）、前端 34、Playwright 11（experiences 3 + companions 3 + trips 5）。
- **知识库**：domain 补体验词汇与不变量；interfaces 升级到 v0.4.0 并补 4 个端点；architecture 补 V8 与模块职责；`_LOG` 与 `registry.md` 更新 REQ-004。

## Verify highlights

- 本地验证报告：`docs/ai4se-plugins/20261115-180200-local-verify-report.md`（Redocly 0 error；后端 132、前端 34、E2E 11 全过）。
- CI：run #60/#61（实现）Success；#62 因误提交空 `logback-spring.xml` 失败；#63 删除后复验 Success。
- G1 `g1-decision.md`（Pass，IO Wanye / SA Jacky、Karena）；G2 `g2-decision.md`（Pass，VL Neal）。

## Residual risks

| 风险 | 处理 |
|---|---|
| 演示身份 `X-User-Id` 可伪造 | 生产化 change 替换为真实认证 |
| Playwright 不进 CI | 本地门禁；需要浏览器回归门禁时再评估 |
| 契约 6 条 warning（含故意非法示例） | 保留以说明 400 行为；接入更严格 lint 时处理 |
| E2E 在开发库累积行程与体验 | 唯一标题/内容、断言不依赖总数；后续做测试库隔离 |
| 参考发布人数按需求清空（原型复制） | 原型 `draftFromSource` 记为待修；实现与 E2E 已覆盖清空 |
| 体验无审核/举报目标 | 本迭代只记录；后续可扩展 `/reports` 的 `target_type` |
| 误提交空 `logback-spring.xml` 致 CI #62 失败 | 已删除并复验；提交前用 `git status` 检查未跟踪产物 |

## Links

- Spec：`openspec/changes/add-trip-experiences/specs/trip-experiences/spec.md`
- Design / Tasks / ATDD：同目录 `design.md`、`tasks.md`、`atdd-design.md`
- AC/DoV：同目录 `dov-ac-review.md`
- Gates：同目录 `g1-decision.md`、`g2-decision.md`、`g3-decision.md`
- Verify：`docs/ai4se-plugins/20261115-180200-local-verify-report.md`
- CI：#60 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43701442749 ｜ #61 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43701875651 ｜ #63 https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43702117112