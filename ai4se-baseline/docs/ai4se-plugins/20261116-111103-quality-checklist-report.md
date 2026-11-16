# Quality Checklist Report: p3

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:\zha_training\RouteME\ai4se-baseline
**Stages:** p3
**Change:** `add-user-profile`（REQ-007）
**Focus:** full-stage

## Summary

### p3

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P3-1 | yes | Pass | `openspec/changes/add-user-profile/atdd-design.md`（`user-profile` 24 场景 → E1–E24 + `user-auth` 6 场景 → A1–A6；10 个 E2E 用例；11 个 API 用例；前端 2 个 UT 文件 + 后端 rules UT；NFR deferred 并给出理由） |
| P3-2 | yes | Pass | `openspec/changes/add-user-profile/design.md`（D1–D12 取舍、8 列迁移、0.7.0 契约、校验矩阵、头像存储、权限模型、结构契约、风险）+ `tasks.md`（T1–T8） |
| P3-3 | yes | Pass | `tasks.md` §对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD；24/24 + 6/6 覆盖；RV-1–RV-7；G1 条件 2–8 落点；无静默扩张） |
| P3-4 | yes | Pass | `tasks.md` T1–T8：每层一条、含 checkbox / Owner / 验证命令 / 覆盖场景；T1 先写 red；T8 为验证回归 |

**Stage Overall:** Pass（4/4）

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages (p3) | Pass | ATDD 先于实现；契约（0.7.0）与迁移（V10）先于后端；设计决策与 Delta 对齐；无阻塞缺口 |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| advisory | `OpenApiTest` 当前断言 version `0.6.0` 且注册必填含 `school` / `interests`，契约升级后必然失败 | AO（Jay） | T2 同一提交更新版本与必填断言；不要把失败留给 T8 |
| advisory | Spring Boot 默认 multipart 上限 1 MB，低于业务 2 MB | AO（Jay） | T4 同步 `application.yaml` 并在 `GlobalExceptionHandler` 处理超限 → 400；用超限文件用例验证 |
| advisory | E2E 依赖本机后端 `8080` + 前端 `5173` | AO（Jay） | T8 执行前确认两端已启动；若 CI 只跑既有 spec，需把 `profile.spec.ts` 加入流水线 |
| advisory | 迁移把 8 列加到既有 `app_users`；演示账号与迁移前账号全为 NULL | AO（Jay）+ SA | T3 迁移测试覆盖「演示账号可读 / 新列为 NULL / 旧 school 文案保留」；`ProfileRules.complete` 把 NULL / 空串视为缺失 |
| advisory | 发布者入口、身份面板摘要与头像会改 `trip-plans` / `trip-experiences` 的可观察输出，但本 change 未为两者写 Delta（lint L-01） | SA + AO | T7 只消费资料展示；T8 核对卡片仍展示昵称、匹配分数 / 理由不变；归档时由 SA 确认无需补 MODIFIED |
| advisory | `AppShell.tsx`、`styles.css`、`tripMessages.ts`、`e2e/tests/auth.spec.ts` 可能正被并行会话修改 | AO（Jay） | T7 只改必要行；合并时保留并行内容；不回退他人未提交文件 |
| advisory | 本 change 未产出 UI 预览页（与 `add-user-logout` 不同） | AO（Jay） | 结构以 `design.md` §7 为准；若评审需要视觉稿，在 T7 前补 `preview/profile-pages.html`，不改变验收 |
| advisory | 演示账号 `school` 仍是「研一 · 地理科学」合并文案，资料页会把它当学校展示 | BA + SA | 不迁移演示数据（已裁决）；如需拆分另开 change |
| advisory | NFR（性能 / 容量 / 可观测性）未指定目标 | — | 只对头像做硬限制（≤2 MB、单文件、随机文件名）；其余记录为 deferred |
| gate condition | 双 capability（`user-profile` ADDED + `user-auth` MODIFIED）需 SA 具名追认 | SA（Jacky、Karena） | 归档前完成，写入归档摘要；与 REQ-005 同口径 |

## Notes

- P3 scope only：未写生产代码、E2E / API / UT 代码、契约与迁移；实现属 P4 `/sdd:atdd-apply`（从 T1 的 red 用例开始）。
- 设计将契约升级定为 **0.7.0**：`DemoUser` 增量扩展、`school` 改可空、注册请求收窄、`Error` 增加可选 `fields`；全部为加法或收窄，旧客户端带旧字段仍 201。
- 资料状态派生、年龄 / 星座派生、发布者摘要回退都在 `design.md` 写成可测规则；前端与后端各有一份校验，但共享字段名与原因码（D12）。
- 头像方案：落盘 `../SqlLite/uploads/avatars`、随机文件名、魔数嗅探、`GET /api/users/{id}/avatar` 只读图片端点；替换时换 `v=` 缓存键。
- 注册后只在 `handleAuthenticated` 跳一次完善页，不做全局守卫，避免破坏既有深链与并行 `auth.spec.ts`。
- 兴趣预设以「规范值 + 展示名」对齐行程标签，不改匹配算法（lint L-05）。
- G1 条件已落到任务：展示契约（D10 / T7）、昵称唯一（D2 / T4）、契约 0.7.0（D7 / T2）、迁移空值（D3 / T3）、兴趣词表（D8 / T6）、头像存储（D5 / T4）、归档核对（T8）。
- 本报告不是 Gate 决策。