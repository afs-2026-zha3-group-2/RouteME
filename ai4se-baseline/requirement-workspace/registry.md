# Requirement registry

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World Home Page | verified | bootstrap-hello-world | 脚手架验收：SQLite + Flyway + Spring Boot 4.1.2 + React 19；接口返回 Hello World，首页展示（已归档，Living Spec `openspec/specs/hello-world/`） |
| REQ-002 | 旅行灵感浏览与行程发布 | verified | add-trip-plans | 已归档（`openspec/changes/archive/2026-11-15-add-trip-plans/`），Living Spec `openspec/specs/trip-plans/`；契约 0.2.0；后端 32 / 前端 25 / E2E 5 测试通过；G1–G3 Pass |
| REQ-003 | 同行匹配、申请与旅行前沟通 | drafted | add-trip-companions | P1 完成；capability `trip-companions`（ADDED）+ 触发 `trip-plans` 状态人数联动；迭代 2–3；场景偏多，建议内部两阶段；交 dev 进 P2 |
| REQ-004 | 游后体验分享与参考此行程发布 | drafted | add-trip-experiences | P1 完成；capability `trip-experiences`（ADDED）+ 复用 `trip-plans` 展示位；迭代 3；依赖 REQ-002/003；交 dev 进 P2 |
