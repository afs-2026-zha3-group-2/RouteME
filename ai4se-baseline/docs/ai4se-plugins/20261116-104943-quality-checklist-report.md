# Quality Checklist Report: p3

**Date:** 2026-11-16 (timezone: +0800)
**Root:** D:\zha_training\RouteME\ai4se-baseline
**Stages:** p3
**Focus:** full-stage

## Summary

### p3

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P3-1 | yes | Pass | `openspec/changes/add-user-logout/atdd-design.md`（10 Scenario → E1–E10；7 个 E2E 用例；API 回归门禁；NFR 记录为 out of scope） |
| P3-2 | yes | Pass | `openspec/changes/add-user-logout/design.md`（D1–D7 取舍、结构契约、风险）+ `tasks.md`（T1–T5） |
| P3-3 | yes | Pass | `tasks.md` §对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD，10/10 场景覆盖，RV-1–RV-5，无静默扩张） |
| P3-4 | yes | Pass | `tasks.md` T1–T5：每层一条、含 checkbox / Owner / 验证命令 / 覆盖场景；最后一条为验证回归 |

**Stage Overall:** Pass（4/4）

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages (p3) | Pass | ATDD 先于实现；设计决策与 Delta 对齐；无阻塞缺口 |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| advisory | NFR（性能 / 可观测性）未纳入 | — | 本 change 无运行时性能或监控面；已记录 deferred，如需再补 |
| advisory | E2E 依赖本机后端 `8080` + 前端 `5173` | AO（Jay） | P4 执行前确认两端已启动；若 CI 只跑既有 spec，需把 `auth.spec.ts` 加入流水线 |
| advisory | 设计预览 `preview/identity-menu.html` 是评审辅助页，不在构建内 | AO（Jay） | 用户确认 A/B/C 方案后再定稿 `styles.css`；当前默认方案 B |
| advisory | 归档 `add-user-auth` 的旧表述（T6 / design / summary）仍写「演示身份不显示退出」 | BA | P5 / G3 在 `summary.md` 记录已被取代，不改写归档正文 |
| advisory | `openspec validate --all --strict` 仍有并发 change 失败（`add-trip-publish` / `add-user-profile`） | 各自 Owner | 与本 change 无关；单 change 校验通过 |

## Notes

- P3 scope only：未写生产代码、E2E 代码或 UT 套件；实现属 P4 `/sdd:atdd-apply`。
- 设计预览与 `design.md` D4 一致：默认方案 B（分隔线 + 危险色菜单行）；A/C 可在预览页切换对比。
- 面板语义由 `listbox` 改为 `dialog` + 内层 `listbox`，解决退出按钮被读屏当成选项的问题。
- G1 条件已落到任务：入口全身份（T2）、失败提示文案（T3）、自动化测试（T1/T5）、lint L-02/L-03（D3/T5）。
- This report is not a Gate decision.