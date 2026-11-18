# Skill 使用记录 — sdd-e2e-debt-baseline

- **性质：** skill 使用记录（非工件评审报告，不适用 `@rule:artifact-review-gate` 签署矩阵）
- **Skill：** [`sdd-e2e-debt-baseline`](../../.agents/skills/sdd-e2e-debt-baseline/SKILL.md)
- **使用日期：** 2026-11-18
- **触发场景：** skill 生效验证——此前 baseline 文件与 diff 工具已就位但从未实跑；经发起人 AskUserQuestion 批准「最小 smoke 跑一遍」补齐真实使用证据（全量 E2E 仍按指示顺延）
- **执行者：** AI agent 会话

## 实际执行一：fresh-DB smoke 实跑（私有栈）

```
node ai4se-baseline/scripts/e2e-shard.mjs --shards 1 --run-id skillverify \
  --json-dir ai4se-baseline/RouteME/e2e/.tmp-e2e/skill-verify-report \
  -- --grep "<smoke.json 16 条用例标题>"
```

- 环境：`e2e-db.mjs` 模板库复制为全新运行库（杜绝污染库假红）、独立后端/前端端口、Vite JS 入口直启——符合 skill「polluted dev DB invalidates the whole run」要求。
- 用例集：`e2e/smoke.json` 16 条核心用户流（auth / trips / companions / weather / experiences / mine / profile / credit / ai-planner）。
- 结果：**passed=15 failed=1**；JSON 报告落 `.tmp-e2e/skill-verify-report/shard1.json`。

## 实际执行二：debt-diff 失败归因

```
node ai4se-baseline/scripts/e2e-debt-diff.mjs --report <shard1.json> --root .
→ passed=15 failed=1 skipped=0 (baseline=0 new=1)
→ NEW: experiences.spec.ts :: shares an experience and reuses it to publish a new plan
→ exit 1
```

归因核对（不把未归因的红当债务）：

1. 该红**已记录在 `e2e/known-failures.json` 的 `pending` 区**（recordedAt=2026-11-18，ownerChange=「unscheduled: spec drift after the 2026-11-18 growth/notifications merge」，由并发会话当日较早的全量跑观察记录）——非本次合并或本次验证新引入。
2. 单例复跑（run-id=skillrerun，同样 fresh DB）：**0 passed / 1 failed，稳定复现**，排除 flaky；失败点为发布页预填集合点 chip `.place-chip-name`（香洲港集合）5s 超时未出现，与 pending 记录的 spec drift 归因一致。
3. 当前已提交版 diff 工具只比对 `entries`（空），`pending` 区识别是并发会话在途 WIP 的增强项——故工具口径报 NEW、台账口径属已观察待修债务，两处口径差异如实记录。

## 边界遵循

- 未向 `entries` 添加任何条目（skill：无真实归因不得入库）；该红保留在 `pending`，修复排期待用户决定。
- 按 skill 报告口径：本次 smoke = **15 / 1（0 baseline / 1 new-against-entries，属 pending 已观察债务）**，不报 clean。

## 结论

**已生效。** 「fresh DB 实跑 → JSON 报告 → 机械 diff 归因 → 复跑核实」全链路当日真实走通；NEW 红拦截语义（exit 1）与 pending 台账交叉核对均按规程执行。