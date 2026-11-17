# Quality Checklist Report: p4

**Date:** 2026-11-17 (timezone: +08:00)
**Root:** d:\Training\routeMe\RouteME\ai4se-baseline
**Stages:** p4
**Focus:** full-stage

## Summary

### p4

| Check id | Required? | Status | Evidence |
|----------|-----------|--------|----------|
| P4-1 Contract 0.15.0 matches implementation | yes | Pass | Redocly valid / 0 error；`OpenApiTest` 10/10（0.15.0、`LeavePreview` / `LeaveResult`、`TripDetail.cancel_reason` 系统值） |
| P4-2 Migration V21 on both engines | yes | Pass | `CreditEnforcementMigrationSqliteTest`（空库 / V20 升级）+ H2 `verify`；`active_flag` 唯一索引两端允许多 NULL |
| P4-3 Exit penalties, tiers and review | yes | Pass | `CreditExitCalculatorTest` + `CreditExitApiTest`（48h -5、7d 0、24h -5、12h -8、旅行中 -15、翻倍、待核实、集合时间优先） |
| P4-4 Restriction lifecycle | yes | Pass | `CreditRestrictionApiTest`（65→55 触发、只读 403、系统清退无账本、+10 自动解除、不恢复关系、60/59 边界） |
| P4-5 Three exit entries + five display surfaces | yes | Pass | 前端 293 tests；E2E `credit-exit` 4/4、`credit-restriction` 2/2、`credit-cancel-reason` 1/1；相关回归 23/23；1440/768/390 × 浅/深色 8 组走查无横向溢出（`preview/p4-*.png`） |
| P4-6 Regression and debt evidence | yes | Pass with debt | 后端 337 / 前端 293 / 契约 0 error / openspec valid；全量 E2E 99/123，24 条失败有干净库 A/B 归因（地图 17 + 共享库顺序 7） |
| P4-7 Scope and compliance | yes | Pass | 无管理员 / 明细 / 恢复 / 通知；无测试写分接口；仅新增 `credit-enforcement` ADDED，不改未归档 Delta |

| **Stage Overall** | — | **Pass with documented debt** | 6 项 Pass + 1 项文档化债务 |

### Roll-up

| Scope | Overall | Notes |
|-------|---------|-------|
| selected stages | **Pass with documented debt** | p4 单项评估；债务均为既有 E2E 地图渲染与共享库累积，不属于本 change |

## Gaps

| Check id | Gap | Owner (if known) | Suggested next |
|----------|-----|------------------|----------------|
| — | 无必需项缺口 | — | — |
| （跟踪项） | 全量 E2E 24 条既有失败 | 地图 owner / E2E owner | 地图债务随 REQ-016 处理；共享库顺序建议独立库或分片 |
| （跟踪项） | G2 未签 | VL=Neal | 按 §4 证据签署 `g2-decision.md` |
| （跟踪项） | 待核实事件无管理端 | 产品 | 按用户裁决 D3 另开 change |

## Notes

- 本报告不是 Gate 结论，不替代 G2。
- 打包脚本（`init-checkpoint-log.sh` / `probe-stage.sh` / `write-report.sh`）依赖 bash，本机无 bash；按 `references/` 模板手工产出等价的 checkpoint（`20261117-181500-quality-checklist-checkpoints.md`）与本报告。
- 本地验证明细见 `docs/ai4se-plugins/20261117-181500-local-verify-report.md`；阶段记录见 `docs/sdd/add-credit-exit-restriction/p4-verify.md`。
- 契约 / 迁移号已落 0.15.0 + V21；在途 `add-ai-itinerary` 按后到者顺延 0.16.0 + V22。
