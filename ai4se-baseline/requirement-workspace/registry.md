# Requirement registry

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World Home Page | verified | bootstrap-hello-world | 脚手架验收：SQLite + Flyway + Spring Boot 4.1.2 + React 19；接口返回 Hello World，首页展示（已归档，Living Spec `openspec/specs/hello-world/`） |
| REQ-002 | 旅行灵感浏览与行程发布 | in-progress | add-trip-plans | P1–P3 完成（业务提案 + `trip-plans` spec、delta-craft、G1、ATDD、design/tasks）；P4 实现完成（V3/V4、5 个接口、前端列表/发布/详情、e2e 5 例），待 verify/archive |
| REQ-003 | 同行匹配、申请与旅行前沟通 | drafted | add-trip-companions | P1 完成；capability `trip-companions`（ADDED）+ 触发 `trip-plans` 状态人数联动；迭代 2–3；场景偏多，建议内部两阶段；交 dev 进 P2 |
| REQ-004 | 游后体验分享与参考此行程发布 | drafted | add-trip-experiences | P1 完成；capability `trip-experiences`（ADDED）+ 复用 `trip-plans` 展示位；迭代 3；依赖 REQ-002/003；交 dev 进 P2 |
