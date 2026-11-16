# Requirement registry

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World Home Page | verified | bootstrap-hello-world | 脚手架验收：SQLite + Flyway + Spring Boot 4.1.2 + React 19；接口返回 Hello World，首页展示（已归档，Living Spec `openspec/specs/hello-world/`） |
| REQ-002 | 旅行灵感浏览与行程发布 | verified | add-trip-plans | 已归档（`openspec/changes/archive/2026-11-15-add-trip-plans/`），Living Spec `openspec/specs/trip-plans/`；契约 0.2.0；后端 32 / 前端 25 / E2E 5 测试通过；G1–G3 Pass |
| REQ-003 | 同行匹配、申请与旅行前沟通 | verified | add-trip-companions | 已归档（`openspec/changes/archive/2026-11-15-add-trip-companions/`），Living Spec `openspec/specs/trip-companions/`；契约 0.3.0；后端 103 / 前端 27 / E2E 8 测试通过；G1–G3 Pass；CI #54/#55 全绿 |
| REQ-004 | 游后体验分享与参考此行程发布 | verified | add-trip-experiences | 已归档（`openspec/changes/archive/2026-11-15-add-trip-experiences/`），Living Spec `openspec/specs/trip-experiences/`；契约 0.4.0；后端 132 / 前端 34 / E2E 11 测试通过；G1–G3 Pass；CI #60/#61/#63 全绿 |
| REQ-005 | 灵感首页招募中行程与旅行体验双视图（S03） | in-progress | refine-inspiration-home | 迭代 1 / 3 点；页面级垂直切片；MODIFIED `trip-plans` + `trip-experiences`；P1 已拆；P2 G1 Pass（2026-11-16）；P3 Pass（2026-11-16，`atdd-design.md` / `design.md` D1–D8 / `tasks.md` T1–T6，质量报告 `docs/ai4se-plugins/20261116-100821-quality-checklist-report.md`），待 P4；归档前待 SA 追认双 capability 例外 |
