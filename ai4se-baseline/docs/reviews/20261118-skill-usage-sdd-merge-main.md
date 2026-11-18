# Skill 使用记录 — sdd-merge-main

- **性质：** skill 使用记录（非工件评审报告，不适用 `@rule:artifact-review-gate` 签署矩阵）
- **Skill：** [`sdd-merge-main`](../../.agents/skills/sdd-merge-main/SKILL.md)
- **使用日期：** 2026-11-18
- **触发场景：** 用户指示「把所有分支的内容都合并到 main 中，解决冲突」
- **执行者：** AI agent 会话（发起人当次会话全程在线裁决）

## 规程遵循对照

| SKILL 步骤 | 实际执行 | 证据 |
|---|---|---|
| §1 快照先行 | 每轮合并前 `git fetch` + `worktree list` + `status` + `log origin/main`；发现并发会话两次推进（growth 第五次顺延、origin/main 两个 fix）均先核对实际内容再二次合并 | [合并记录 §1/§6](../sdd/20261118-merge-all-branches.md) |
| §2 撞号预检 | 每轮合并前后跑 `check-id-collisions.mjs`；撞号按「后到者顺延」裁决 | 同上 §2；编号 lint PASS（3 baseline） |
| §3 冲突 playbook | openapi.yaml 取更高 minor 0.31.0 + 路径并集；OpenApiTest 版本断言统一常量；types.ts 并集；registry/index 双行保留；短冲突块用 node 脚本结构化重建后全树扫描 0 标记 | 同上 §3 |
| §4 全量重验 | 后端 780/780、前端 572/572 + build、openspec gate 44 pass / 1 baseline / 0 new、redocly 0 error / 28 warning | verify-merge-sc2.log / verify-merge-g2.log / frontend-merge-final-*.log |
| §5 收口 | push 前 fetch + ahead-behind 复核（11 ahead / 0 behind）→ push `bff9856e..33443990`；已合并分支按祖先校验后清理；未执行 P5 归档 | 合并记录 §1/§7 |

## 额外验证（语义合并错位修复）

auto-merge 把 `notifyServiceClosed` 钩子错放进 `resolve`（标记完成≠结束）且测试调用已删除的 `close(admin)` 导致编译失败——按 playbook「重验必须全绿」暴露后，钩子移至语义正确的 `closeByUser`，测试改走 resolve→closeByUser 全链路，重验 780/780 绿。教训已沉淀为 pitfall 记忆。

## 结论

**已生效。** 本次 6 分支全量合并（提交链 d0f1f3f3 → 4bd390c3 → 337e377e → 5a6e9a58 → 32807965 → 33443990）完整走通 skill 五步规程，全部冲突解决且重验全绿后推送。