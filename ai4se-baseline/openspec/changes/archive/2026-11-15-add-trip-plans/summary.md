# Change summary — add-trip-plans

## Intent

REQ-002：让用户能选择演示身份、浏览并按条件筛选公开行程、发布自己的旅行计划、查看详情并结束自己的行程，为 REQ-003（同行匹配）与 REQ-004（游后分享）提供行程池与状态锚点。

## What shipped

- **契约**：`openapi.yaml` 升至 `0.2.0`，新增 `/users`、`/trips`、`/trips/{id}`、`/trips/{id}/complete` 与 `DemoUser`、`TripPlan`、`TripDetail`、`TripCreateRequest` schema；新增 `redocly.yaml` 作为契约 lint 配置。
- **数据**：`V3__create_demo_users.sql`（3 个演示账户）、`V4__seed_demo_trips.sql`（6 条行程：2 已结束 / 3 招募中 / 1 已满员）；状态由 `completed_at` 与人数投影，不单独存储。
- **后端**：`DemoUserController`、`TripController`、`TripPlanService`、`TripPlanQueryService`、`UserRepository`/`TripPlanRepository` 与行对象；统一异常映射 400/401/403/404/409；`Clock` 注入。
- **前端**：身份门与顶栏切换、灵感首页（搜索 / 目的地 / 日期区间 / 兴趣标签 / 排序 / 空状态 / 骨架）、发布表单（与契约同源的字段校验）、详情页（状态、同行者、申请入口可见性、结束行程、体验占位）；首页保留 hello-world 问候语展示。
- **测试**：后端 32（API + 查询 + SQLite 迁移）、前端 25（请求层 / 路由 / 筛选 / 表单）、Playwright 5（端到端与反向 Non-goals）。
- **知识库**：architecture / interfaces / domain / operations 登记 RouteME 行程能力与命令；`registry.md` 更新 REQ-002 状态。

## Verify highlights

- 本地验证报告：`docs/ai4se-plugins/20261115-160141-local-verify-report.md`（Redocly 0 error；后端 32、前端 25、E2E 5 全过）。
- CI：run #31（`c2cd88a`）全绿 —— backend `./mvnw -B verify` + frontend `npm run build && npm test`。
- G1 `g1-decision.md`（Pass，IO Wanye / SA Jacky、Karena）；G2 `g2-decision.md`（Pass，VL Neal）。

## Residual risks

| 风险 | 处理 |
|---|---|
| 演示身份 `X-User-Id` 可伪造 | 生产化 change 替换为真实认证 |
| Playwright 不进 CI | 本地门禁；需要浏览器回归门禁时再评估 |
| 同行者列表仅发布者 | REQ-003 补「参加过」与同行关系 |
| E2E 在开发库累积数据 | 唯一标题、断言不依赖总数；后续做测试库隔离 |
| 规划/实现分步提交与「两次提交」规则不一致 | `design.md` §9 已记录例外；后续 change 恢复两次提交 |

## Links

- Spec：`openspec/changes/add-trip-plans/specs/trip-plans/spec.md`
- Design / Tasks / ATDD：同目录 `design.md`、`tasks.md`、`atdd-design.md`
- AC/DoV：同目录 `dov-ac-review.md`
- Gates：同目录 `g1-decision.md`、`g2-decision.md`
- Verify：`docs/ai4se-plugins/20261115-160141-local-verify-report.md`
- CI：https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43695174258