# Skill 使用记录 — sdd-id-allocate

- **性质：** skill 使用记录（非工件评审报告，不适用 `@rule:artifact-review-gate` 签署矩阵）
- **Skill：** [`sdd-id-allocate`](../../.agents/skills/sdd-id-allocate/SKILL.md)
- **使用日期：** 2026-11-18
- **触发场景：** 全分支合并中的编号撞号裁决（「编号 / 顺延 / Flyway / 契约版本冲突」触发词命中）
- **执行者：** AI agent 会话（顺延裁决经发起人确认口径）

## 实际使用一：合并期撞号顺延（权威源核对）

按 skill 的权威源（registry.md + 各 active change 的 allocation.md + migration 目录 + openapi.yaml `info.version`）核对占用，执行「后到者顺延、只改后到者自己的工件」：

| change | 原分配 | 被占用方 | 顺延结果 |
|---|---|---|---|
| add-growth-level | REQ-029 / S30 起 | 多个在途分支依次抢占 | 经 REQ-029/S30 → 030/S31 → 031/S32 → 032/S33 第五次顺延至 **REQ-033 / S34 / V35 / 契约 0.31.0**（V34/0.30.0 被 student-verification 占） |
| refine-service-close | REQ-028 / S29 / V30 | add-travel-finance | **REQ-034 / S35 / V36**；契约口径随 main 升 0.31.0 |

证据：[docs/sdd/README.md 变更索引](../sdd/README.md)（add-growth-level 行顺延链 / add-route-completion 行）、[合并记录 §2](../sdd/20261118-merge-all-branches.md)、add-growth-level proposal 首部编号注记与 refine-service-close proposal banner（历史快照保留原号）。

## 实际使用二：门禁正向 + 负向探针（2026-11-18 验证）

| 步骤 | 命令 / 操作 | 结果 |
|---|---|---|
| 正向 | `node ai4se-baseline/scripts/check-id-collisions.mjs --root .` | PASS（3 baseline）；REQ next=REQ-035、S next=S36、Flyway next=V37、契约 next-minor=0.32.0 |
| 负向探针 | 临时放入重复迁移 `V36__probe_collision.sql` 后重跑 | **FAIL: 1 new collision(s)，exit 1** |
| 恢复 | 删除探针文件后重跑 | PASS，exit 0，工作区无残留 |

## 结论

**已生效。** 顺延规则在真实撞号场景（两个 change、五次顺延）中落地，且配套门禁经负向探针证明「该拦时拦得住」。CI `spec-lint` job 在每次 push/PR 强制执行同一脚本。