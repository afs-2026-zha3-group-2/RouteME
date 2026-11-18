# Skill 使用记录 — sdd-worktree-ops

- **性质：** skill 使用记录（非工件评审报告，不适用 `@rule:artifact-review-gate` 签署矩阵）
- **Skill：** [`sdd-worktree-ops`](../../.agents/skills/sdd-worktree-ops/SKILL.md)
- **使用日期：** 2026-11-18
- **触发场景：** ① 用户指示「合并完了分支就清理掉」；② skill 生效验证时经发起人 AskUserQuestion 批准的 worktree 创建/移除演练
- **执行者：** AI agent 会话

## 实际使用一：合并后分支清理（§Branch cleanup after merge）

| 步骤 | 命令 | 结果 |
|---|---|---|
| 快照 | `git fetch origin --prune` + `branch -vv` + `worktree list` | 本地仅 main；无 sibling worktree |
| 祖先校验 | 逐个 `git merge-base --is-ancestor origin/<feature> main` | 6 个分支全部 MERGED |
| 删除 | `git push origin --delete`（6 分支一次提交） | 6 × `[deleted]`（沙箱拦截一次，经授权沙箱外执行成功） |
| 复核 | `git fetch --prune` + `branch -r` | 远端仅剩 `origin/main` |

证据：[合并记录 §7](../sdd/20261118-merge-all-branches.md)。队友在途分支不在清理范围（当时已全部并入）。

## 实际使用二：worktree 创建 → 快照 → 安全移除演练（§Snapshot / §Remove）

发起人经 AskUserQuestion 批准「做演练」后执行，全程可逆、未触碰并发会话 WIP：

```
git fetch origin; git worktree list            # 快照：仅主工作区（main@6ef62a2a）
git worktree add --detach .worktrees/skill-drill-tmp HEAD
                                               # 3391 文件检出，detached HEAD 6ef62a2a
git -C .worktrees/skill-drill-tmp status --short   # 干净，无 WIP
git -C .worktrees/skill-drill-tmp log --oneline -1 # 6ef62a2a (HEAD, main)
git worktree remove .worktrees/skill-drill-tmp     # EXIT=0（无进程占用，无需停进程步骤）
git worktree list                              # 仅剩主工作区
Test-Path .worktrees/skill-drill-tmp           # False，目录无残留
```

演练覆盖了 skill 的「快照先行 → 确认无 WIP/无占用 → remove → 复核」主路径；「进程占用时按 trace.log PID + 端口反查精确停进程」分支本次未触发（演练 worktree 未起任何服务），该分支的历史实战证据见既往 mapfix worktree 清理（PID 19768 / 端口 8095 精确停用）。

## 结论

**已生效。** 分支清理与 worktree 生命周期两条路径均有当日真实执行证据；破坏性步骤前快照、批准后执行、执行后复核的规程全程遵循。